import { createHash } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { ProductionX402ApiTransport, X402ApiTransportFailure, X402_STIM_LATEST_PATH, X402_STIM_LATEST_RESOURCE } from "../x402ApiTransport.js";
import type { JsonObject } from "../stocktrendsClient.js";
import { STIM_HTTP_METHOD, STIM_LATEST_TOOL_NAME } from "./stimTools.js";

const MAX_PAYMENT_BYTES = 64 * 1024;
const CHALLENGE_TTL_MS = 60_000;
const MAX_STATE_ENTRIES = 256;

const inputSchema = z.object({
  symbol_exchange: z.string().trim().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/)
}).strict();

type PaymentRequired = JsonObject & { x402Version: 2; resource: JsonObject; accepts: JsonObject[] };
interface Challenge { requirements: PaymentRequired; expiresAt: number; consumed: boolean; }
export interface RemoteX402StimState {
  challenges: Map<string, Challenge>;
  consumedDigests: Map<string, number>;
}

/** A bounded, process-level adapter guard, not a payment ledger. */
export function createRemoteX402StimState(): RemoteX402StimState {
  return { challenges: new Map(), consumedDigests: new Map() };
}

export interface RemoteX402StimOptions {
  transport?: ProductionX402ApiTransport;
  state: RemoteX402StimState;
  now?: () => number;
}

/** Registers the one explicitly enabled Remote-MCP payment vertical slice. */
export function registerRemoteX402StimTool(server: McpServer, options: RemoteX402StimOptions): void {
  const transport = options.transport ?? new ProductionX402ApiTransport();
  const now = options.now ?? Date.now;
  server.registerTool(STIM_LATEST_TOOL_NAME, {
    title: "Get Latest Stock Trends ST-IM Record",
    description: "Purchase the latest ST-IM record with an x402 payment authorization.",
    inputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    _meta: { access: "paid", endpointPath: X402_STIM_LATEST_PATH, method: STIM_HTTP_METHOD, x402: "v2" }
  }, async (input, ctx) => {
    const time = now();
    cleanup(options.state, time);
    const key = bindingKey(input.symbol_exchange);
    const payment = ctx.mcpReq._meta?.["x402/payment"];
    if (payment === undefined) {
      const current = options.state.challenges.get(key);
      if (current && !current.consumed && current.expiresAt > time) return paymentRequired(current.requirements);
      try {
        const challenge = await transport.requestAnonymousChallenge({ endpointPath: X402_STIM_LATEST_PATH, method: "GET", symbolExchange: input.symbol_exchange });
        const requirements = challenge.body.payment_required as PaymentRequired | undefined;
        if (!validRequirements(requirements)) return error("x402_invalid_payment_requirements");
        putChallenge(options.state, key, { requirements, expiresAt: time + CHALLENGE_TTL_MS, consumed: false });
        return paymentRequired(requirements);
      } catch { return error("x402_challenge_unavailable"); }
    }
    const challenge = options.state.challenges.get(key);
    if (!challenge || challenge.expiresAt <= time) return error("x402_challenge_missing_or_expired");
    if (challenge.consumed) return paymentFailure(challenge.requirements, "Payment authorization has already been used; do not retry payment automatically.");
    const proof = validPayment(payment, challenge.requirements);
    if (!proof) return paymentFailure(challenge.requirements, "Payment authorization rejected before forwarding.");
    const digest = createHash("sha256").update(stable(proof), "utf8").digest("hex");
    if (options.state.consumedDigests.has(digest)) return paymentFailure(challenge.requirements, "Payment authorization has already been used; do not retry payment automatically.");
    // Mark before I/O. This atomically prevents concurrent reuse and makes a
    // post-forwarding timeout non-retryable at this boundary.
    challenge.consumed = true;
    options.state.consumedDigests.set(digest, challenge.expiresAt);
    try {
      const result = await transport.requestWithPayment({ endpointPath: X402_STIM_LATEST_PATH, method: "GET", symbolExchange: input.symbol_exchange, paymentSignature: Buffer.from(JSON.stringify(proof), "utf8").toString("base64") });
      const settlement = successfulSettlement(result.paymentResponse);
      if (!settlement) return paymentFailure(challenge.requirements, "Payment outcome unknown after forwarding; do not retry payment automatically.");
      return { structuredContent: result.body, content: [{ type: "text", text: JSON.stringify(result.body) }], _meta: { "x402/payment-response": settlement } };
    } catch (cause) {
      const rejected = cause instanceof X402ApiTransportFailure && cause.code === "x402_transport_payment_rejected";
      return paymentFailure(challenge.requirements, rejected ? "Payment authorization rejected by API." : "Payment outcome unknown after forwarding; do not retry payment automatically.");
    }
  });
}

function validRequirements(value: unknown): value is PaymentRequired {
  return isObject(value) && value.x402Version === 2 && isObject(value.resource) && value.resource.url === X402_STIM_LATEST_RESOURCE && Array.isArray(value.accepts) && value.accepts.length > 0 && value.accepts.every((accepted) => isObject(accepted) && isObject(accepted.extra) && stable(accepted.extra.resource) === stable(value.resource));
}
function validPayment(value: unknown, requirements: PaymentRequired): JsonObject | null {
  const serialized = safeStringify(value);
  if (!isObject(value) || serialized === null || Buffer.byteLength(serialized, "utf8") > MAX_PAYMENT_BYTES || value.x402Version !== 2 || !isObject(value.resource) || !isObject(value.accepted) || !isObject(value.payload)) return null;
  if (stable(value.resource) !== stable(requirements.resource) || !requirements.accepts.some((accepted) => stable(accepted) === stable(value.accepted))) return null;
  const signature = value.payload.signature;
  if (typeof signature !== "string" || !signature.trim() || !isObject(value.payload.authorization)) return null;
  return value;
}
function successfulSettlement(value: JsonObject): JsonObject | null {
  const explicitFailure = value.success === false || value.settled === false;
  const confirmed = value.success === true || value.settled === true || typeof value.transaction === "string" || typeof value.txHash === "string";
  return !explicitFailure && confirmed ? { ...value, success: true } : null;
}
function paymentRequired(value: PaymentRequired) { return { isError: true, structuredContent: value, content: [{ type: "text" as const, text: JSON.stringify(value) }] }; }
function paymentFailure(value: PaymentRequired, message: string) { return { isError: true, structuredContent: { ...value, error: message }, content: [{ type: "text" as const, text: JSON.stringify({ ...value, error: message }) }] }; }
function error(code: string) { return { isError: true, structuredContent: { error: code }, content: [{ type: "text" as const, text: JSON.stringify({ error: code }) }] }; }
function bindingKey(symbol: string) { return `${STIM_LATEST_TOOL_NAME}\u0000${X402_STIM_LATEST_PATH}\u0000GET\u0000${symbol}`; }
function cleanup(state: RemoteX402StimState, time: number) { for (const [key, value] of state.challenges) if (value.expiresAt <= time) state.challenges.delete(key); for (const [key, expires] of state.consumedDigests) if (expires <= time) state.consumedDigests.delete(key); }
function putChallenge(state: RemoteX402StimState, key: string, value: Challenge) { if (state.challenges.size >= MAX_STATE_ENTRIES) state.challenges.delete(state.challenges.keys().next().value!); state.challenges.set(key, value); }
function safeStringify(value: unknown): string | null { try { const text = JSON.stringify(value); return typeof text === "string" ? text : null; } catch { return null; } }
function isObject(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`; return JSON.stringify(value); }
