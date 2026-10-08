import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { STIM_HTTP_METHOD, STIM_LATEST_ENDPOINT_PATH, STIM_LATEST_TOOL_NAME } from "./stimTools.js";

/**
 * Deliberately test-only x402 Remote MCP seam. This is not read from runtime
 * configuration and cannot be reached from the stdio or HTTP startup paths.
 */
export interface SimulatedX402RemoteTransport {
  request(request: {
    url: URL;
    method: "GET";
    symbolExchange: string;
    paymentSignature?: string;
  }): Promise<Response>;
}

export interface SimulatedX402RemoteOptions {
  transport: SimulatedX402RemoteTransport;
  now?: () => number;
  challengeTtlMs?: number;
}

const API_RESOURCE = "https://api.stocktrends.com/v1/stim/latest";
const DEFAULT_CHALLENGE_TTL_MS = 60_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

const inputSchema = z.object({
  symbol_exchange: z.string().trim().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/)
}).strict();

interface ChallengeRecord {
  symbolExchange: string;
  requirements: PaymentRequired;
  expiresAt: number;
  consumed: boolean;
}

interface PaymentRequired {
  x402Version: 2;
  error: string;
  resource: { url: string; description?: string; mimeType?: string };
  accepts: Array<Record<string, unknown>>;
  extensions?: Record<string, unknown>;
}

/** Registers exactly one semantic tool, only on an injected test server. */
export function registerSimulatedRemoteX402StimTool(server: McpServer, options: SimulatedX402RemoteOptions): void {
  const state = new Map<string, ChallengeRecord>();
  const now = options.now ?? Date.now;
  const ttl = options.challengeTtlMs ?? DEFAULT_CHALLENGE_TTL_MS;

  server.registerTool(
    STIM_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends ST-IM Record (simulated x402 Remote MCP)",
      description: "Test-only, injected simulated x402 bridge for GET /v1/stim/latest. It is never registered by production startup.",
      inputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      _meta: { access: "paid", endpointPath: STIM_LATEST_ENDPOINT_PATH, method: STIM_HTTP_METHOD, x402Relay: "simulated_test_only" }
    },
    async (input, ctx) => {
      const payment = ctx.mcpReq._meta?.["x402/payment"];
      const key = bindingKey(input.symbol_exchange);
      const current = state.get(key);

      if (payment === undefined) {
        let response: Response;
        try {
          response = await options.transport.request({ url: apiUrl(input.symbol_exchange), method: "GET", symbolExchange: input.symbol_exchange });
        } catch { return errorResult("x402_api_transport_failed"); }
        if (response.status !== 402) return errorResult("x402_unexpected_unpaid_response");
        const requirements = await parseRequirements(response);
        if (!requirements) return errorResult("x402_invalid_payment_requirements");
        state.set(key, { symbolExchange: input.symbol_exchange, requirements, expiresAt: now() + ttl, consumed: false });
        return paymentRequiredResult(requirements);
      }

      if (!current || current.expiresAt <= now()) return errorResult("x402_challenge_missing_or_expired");
      if (current.consumed) return errorResult("x402_payment_replay");
      const proof = validatePaymentPayload(payment, current.requirements);
      if (!proof) return errorResult("x402_invalid_payment_payload");

      // Consume before sending the proof: no automatic retry can spend it twice.
      current.consumed = true;
      let response: Response;
      try {
        response = await options.transport.request({ url: apiUrl(input.symbol_exchange), method: "GET", symbolExchange: input.symbol_exchange, paymentSignature: encodePaymentSignature(proof) });
      } catch { return errorResult("x402_api_transport_failed"); }
      if (response.status === 402) return errorResult("x402_api_rejected_payment");
      if (response.redirected || response.status >= 300) return errorResult("x402_api_redirect_or_unexpected_status");
      if (!response.ok) return errorResult("x402_api_payment_execution_failed");
      const settlement = parseSettlement(response.headers.get("payment-response"));
      if (!settlement) return errorResult("x402_settlement_response_invalid");
      const data = await readJsonBounded(response);
      if (!data) return errorResult("x402_paid_response_invalid");
      return {
        structuredContent: data,
        content: [{ type: "text", text: JSON.stringify(data) }],
        _meta: { "x402/payment-response": settlement }
      };
    }
  );
}

function apiUrl(symbolExchange: string): URL {
  const url = new URL(API_RESOURCE);
  url.searchParams.set("symbol_exchange", symbolExchange.replace(/_([NQABTI])$/, "-$1"));
  return url;
}

function bindingKey(symbolExchange: string): string {
  return `${STIM_LATEST_TOOL_NAME}\u0000${STIM_LATEST_ENDPOINT_PATH}\u0000GET\u0000${symbolExchange}`;
}

async function parseRequirements(response: Response): Promise<PaymentRequired | null> {
  const body = await readJsonBounded(response);
  const value = body?.paymentRequired ?? body;
  if (!isRecord(value) || value.x402Version !== 2 || !isRecord(value.resource) || value.resource.url !== API_RESOURCE || !Array.isArray(value.accepts) || !value.accepts.length) return null;
  if (!value.accepts.every(isRecord)) return null;
  return value as unknown as PaymentRequired;
}

function validatePaymentPayload(value: unknown, requirements: PaymentRequired): Record<string, unknown> | null {
  if (!isRecord(value) || value.x402Version !== 2 || !isRecord(value.resource) || value.resource.url !== API_RESOURCE || !isRecord(value.accepted) || !isRecord(value.payload)) return null;
  if (stableJson(value.resource) !== stableJson(requirements.resource)) return null;
  if (!requirements.accepts.some((accepted) => stableJson(accepted) === stableJson(value.accepted))) return null;
  return value as Record<string, unknown>;
}

function encodePaymentSignature(payment: Record<string, unknown>): string {
  // The API accepts base64-encoded JSON PaymentPayload in PAYMENT-SIGNATURE.
  return Buffer.from(JSON.stringify(payment), "utf8").toString("base64");
}

function parseSettlement(value: string | null): Record<string, unknown> | null {
  if (!value || value.length > MAX_RESPONSE_BYTES) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    return isRecord(decoded) && decoded.success === true ? decoded : null;
  } catch { return null; }
}

async function readJsonBounded(response: Response): Promise<Record<string, unknown> | null> {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || (length += value.byteLength) > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return isRecord(parsed) ? parsed : null;
  } catch { return null; } finally { reader.releaseLock(); }
}

function paymentRequiredResult(requirements: PaymentRequired): CallToolResult {
  return { isError: true, structuredContent: requirements, content: [{ type: "text", text: JSON.stringify(requirements) }] };
}

function errorResult(code: string): CallToolResult {
  return { isError: true, structuredContent: { error: code }, content: [{ type: "text", text: JSON.stringify({ error: code }) }] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isRecord(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
