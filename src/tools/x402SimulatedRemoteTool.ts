import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { createHash } from "node:crypto";
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
  /** Explicitly supplied only by tests that need state across HTTP requests. */
  state?: SimulatedX402RemoteState;
}

const API_RESOURCE = "https://api.stocktrends.com/v1/stim/latest";
const DEFAULT_CHALLENGE_TTL_MS = 60_000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_PAYMENT_HEADER_BYTES = 64 * 1024;
const MAX_PAYMENT_PAYLOAD_BYTES = 64 * 1024;

const inputSchema = z.object({
  symbol_exchange: z.string().trim().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/)
}).strict();

interface ChallengeRecord {
  symbolExchange: string;
  requirements: PaymentRequired;
  expiresAt: number;
  consumed: boolean;
  consumedAt?: number;
}

export interface SimulatedX402RemoteState {
  readonly challenges: Map<string, ChallengeRecord>;
  /**
   * SHA-256 digests only; payment authorization material is never retained.
   * A structurally plausible forged proof can consume this anonymous, shared
   * test state. This is not a production replay or caller-isolation guarantee.
   */
  readonly consumedPaymentDigests: Map<string, number>;
}

export function createSimulatedX402RemoteState(): SimulatedX402RemoteState {
  return { challenges: new Map<string, ChallengeRecord>(), consumedPaymentDigests: new Map<string, number>() };
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
  const state = options.state ?? createSimulatedX402RemoteState();
  // Simulation-only process-local replay guard. It intentionally makes no
  // cross-process or durable idempotency claim.
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
      cleanupState(state, now());
      const payment = ctx.mcpReq._meta?.["x402/payment"];
      const key = bindingKey(input.symbol_exchange);
      const current = state.challenges.get(key);

      if (payment === undefined) {
        if (current && !current.consumed && current.expiresAt > now()) return paymentRequiredResult(current.requirements);
        let response: Response;
        try {
          response = await options.transport.request({ url: apiUrl(input.symbol_exchange), method: "GET", symbolExchange: input.symbol_exchange });
        } catch { return errorResult("x402_api_transport_failed"); }
        if (response.status !== 402) return errorResult("x402_unexpected_unpaid_response");
        const requirements = await parseRequirements(response);
        if (!requirements) return errorResult("x402_invalid_payment_requirements");
        state.challenges.set(key, { symbolExchange: input.symbol_exchange, requirements, expiresAt: now() + ttl, consumed: false });
        return paymentRequiredResult(requirements);
      }

      if (!current || current.expiresAt <= now()) return errorResult("x402_challenge_missing_or_expired");
      if (current.consumed) return paymentFailureResult(current.requirements, "Payment authorization has already been used; do not retry payment automatically.");
      const proof = validatePaymentPayload(payment, current.requirements);
      if (!proof) return paymentFailureResult(current.requirements, "Payment authorization rejected before forwarding.");
      const proofDigest = digestPaymentPayload(proof);
      if (state.consumedPaymentDigests.has(proofDigest)) return paymentFailureResult(current.requirements, "Payment authorization has already been used; do not retry payment automatically.");

      // Consume before sending the proof: no automatic retry can spend it twice.
      current.consumed = true;
      current.consumedAt = now();
      state.consumedPaymentDigests.set(proofDigest, current.expiresAt);
      let response: Response;
      try {
        response = await options.transport.request({ url: apiUrl(input.symbol_exchange), method: "GET", symbolExchange: input.symbol_exchange, paymentSignature: encodePaymentSignature(proof) });
      } catch { return paymentFailureResult(current.requirements, "Payment outcome unknown after forwarding; do not retry payment automatically."); }
      if (response.status === 402) return paymentFailureResult(current.requirements, "Payment authorization rejected by API.");
      if (response.redirected || response.status >= 300 || !response.ok) return paymentFailureResult(current.requirements, "Payment outcome unknown after forwarding; do not retry payment automatically.");
      const settlement = parseSettlement(response.headers.get("payment-response"));
      if (settlement?.kind === "explicit_failure") return paymentFailureResult(current.requirements, "Payment settlement failed.");
      if (!settlement || settlement.kind !== "success") return paymentFailureResult(current.requirements, "Payment outcome unknown after forwarding; do not retry payment automatically.");
      const data = await readJsonBounded(response);
      if (!data) return paymentFailureResult(current.requirements, "Payment settlement may have occurred but paid output was unavailable; do not retry payment automatically.");
      return {
        structuredContent: data,
        content: [{ type: "text", text: JSON.stringify(data) }],
        _meta: { "x402/payment-response": settlement.value }
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
  const value = body?.payment_required;
  const header = decodePaymentRequiredHeader(response.headers.get("payment-required"));
  if (!isRecord(value) || !header || stableJson(value) !== stableJson(header)) return null;
  if (!isRecord(value) || value.x402Version !== 2 || !isRecord(value.resource) || value.resource.url !== API_RESOURCE || !Array.isArray(value.accepts) || !value.accepts.length) return null;
  if (!value.accepts.every(isRecord)) return null;
  if (!value.accepts.every((accepted) => isRecord(accepted.extra) && stableJson(accepted.extra.resource) === stableJson(value.resource))) return null;
  return value as unknown as PaymentRequired;
}

function validatePaymentPayload(value: unknown, requirements: PaymentRequired): Record<string, unknown> | null {
  if (!hasBoundedJsonSize(value, MAX_PAYMENT_PAYLOAD_BYTES) || !isRecord(value) || value.x402Version !== 2 || !isRecord(value.resource) || value.resource.url !== API_RESOURCE || !isRecord(value.accepted) || !isRecord(value.payload)) return null;
  if (stableJson(value.resource) !== stableJson(requirements.resource)) return null;
  if (!requirements.accepts.some((accepted) => stableJson(accepted) === stableJson(value.accepted))) return null;
  if (typeof value.payload.signature !== "string" || !value.payload.signature.trim() || !isRecord(value.payload.authorization) || !Object.values(value.payload.authorization).some((part) => typeof part === "string" && Boolean(part.trim()))) return null;
  return value as Record<string, unknown>;
}

function digestPaymentPayload(payment: Record<string, unknown>): string {
  return createHash("sha256").update(stableJson(payment), "utf8").digest("hex");
}

function encodePaymentSignature(payment: Record<string, unknown>): string {
  // The API accepts base64-encoded JSON PaymentPayload in PAYMENT-SIGNATURE.
  return Buffer.from(JSON.stringify(payment), "utf8").toString("base64");
}

function decodePaymentRequiredHeader(value: string | null): Record<string, unknown> | null {
  if (!value || value.length > MAX_PAYMENT_HEADER_BYTES || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    return isRecord(parsed) ? parsed : null;
  } catch { return null; }
}

function parseSettlement(value: string | null): { kind: "success"; value: Record<string, unknown> } | { kind: "explicit_failure" } | null {
  if (!value || value.length > MAX_RESPONSE_BYTES) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    if (!isRecord(decoded)) return null;
    const txConfirmed = (typeof decoded.txHash === "string" && Boolean(decoded.txHash.trim())) || (typeof decoded.transaction === "string" && Boolean(decoded.transaction.trim()));
    const positivelySettled = decoded.success === true || decoded.settled === true || txConfirmed;
    const explicitlyFailed = decoded.success === false || decoded.settled === false;
    if (positivelySettled && explicitlyFailed) return null;
    if (explicitlyFailed) return { kind: "explicit_failure" };
    if (positivelySettled) return { kind: "success", value: { ...decoded, success: true } };
    return { kind: "explicit_failure" };
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

function paymentFailureResult(requirements: PaymentRequired, reason: string): CallToolResult {
  const output = { ...requirements, error: reason.slice(0, 256) };
  return { isError: true, structuredContent: output, content: [{ type: "text", text: JSON.stringify(output) }] };
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

function cleanupState(state: SimulatedX402RemoteState, currentTime: number): void {
  for (const [key, challenge] of state.challenges) if (challenge.expiresAt <= currentTime) state.challenges.delete(key);
  for (const [digest, expiresAt] of state.consumedPaymentDigests) if (expiresAt <= currentTime) state.consumedPaymentDigests.delete(digest);
}

function hasBoundedJsonSize(value: unknown, maxBytes: number): boolean {
  let size = 0;
  const count = (text: string) => (size += new TextEncoder().encode(text).byteLength) <= maxBytes;
  const visit = (entry: unknown, depth: number): boolean => {
    if (depth > 32) return false;
    if (entry === null || typeof entry === "boolean") return count(String(entry));
    if (typeof entry === "number") return Number.isFinite(entry) && count(String(entry));
    if (typeof entry === "string") return count(entry) && count("\"\"");
    if (Array.isArray(entry)) return count("[]") && entry.every((item) => visit(item, depth + 1));
    if (!isRecord(entry)) return false;
    return count("{}") && Object.entries(entry).every(([key, item]) => count(key) && count("\":") && visit(item, depth + 1));
  };
  return visit(value, 0);
}
