import { createHash } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { JsonObject } from "../stocktrendsClient.js";
import {
  MAX_X402_PAYMENT_SIGNATURE_BYTES,
  MAX_X402_POST_BODY_BYTES,
  ProductionX402ApiTransport,
  X402ApiTransportFailure,
  X402_DECISION_EVALUATE_SYMBOL_PATH,
  X402_DECISION_EVALUATE_SYMBOL_RESOURCE,
  X402_PORTFOLIO_COMPARE_PATH,
  X402_PORTFOLIO_COMPARE_RESOURCE,
  X402_PORTFOLIO_CONSTRUCT_PATH,
  X402_PORTFOLIO_CONSTRUCT_RESOURCE,
  X402_PORTFOLIO_EVALUATE_PATH,
  X402_PORTFOLIO_EVALUATE_RESOURCE
} from "../x402ApiTransport.js";
import { MAX_CONSUMED_PAYMENT_DIGESTS, type RemoteX402StimState } from "./remoteX402StimTool.js";

export const EVALUATE_SYMBOL_TOOL_NAME = "stocktrends_evaluate_symbol";
export const CONSTRUCT_PORTFOLIO_TOOL_NAME = "stocktrends_construct_portfolio";
export const EVALUATE_PORTFOLIO_TOOL_NAME = "stocktrends_evaluate_portfolio";
export const COMPARE_PORTFOLIOS_TOOL_NAME = "stocktrends_compare_portfolios";
const CHALLENGE_TTL_MS = 60_000;
const MAX_STATE_ENTRIES = 256;
const MAX_PAYMENT_JSON_BYTES = Math.floor((MAX_X402_PAYMENT_SIGNATURE_BYTES / 4) * 3);
const exchange = z.enum(["N", "Q", "A", "B", "T", "I"]);
const symbolExchange = z.string().trim().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}-[NQABTI]$/, "Use canonical SYMBOL-EXCHANGE form, for example IBM-N.");
const symbol = z.string().trim().min(1).max(32).regex(/^[A-Z0-9][A-Z0-9.-]*$/, "Use an uppercase Stock Trends symbol.");
const position = z.object({ symbol_exchange: symbolExchange, weight: z.number().finite().positive() }).strict();
const positions = z.array(position).min(1).max(25).superRefine((items, ctx) => {
  const seen = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (seen.has(item.symbol_exchange)) ctx.addIssue({ code: "custom", path: [index, "symbol_exchange"], message: "Duplicate portfolio instruments are not allowed." });
    seen.add(item.symbol_exchange);
  }
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  if (total < 0.99 || total > 1.01) ctx.addIssue({ code: "custom", message: "Portfolio weights must sum to 1.0 (±0.01)." });
});

export const evaluateSymbolInputSchema = z.object({ symbol_exchange: symbolExchange.optional(), symbol: symbol.optional(), exchange: exchange.optional() }).strict().superRefine((value, ctx) => {
  if (!value.symbol_exchange && !value.symbol) ctx.addIssue({ code: "custom", message: "Provide symbol_exchange or symbol plus exchange." });
  if (!value.symbol_exchange && value.symbol && !value.exchange) ctx.addIssue({ code: "custom", path: ["exchange"], message: "Provide exchange alongside symbol." });
});
export const constructPortfolioInputSchema = z.object({ universe: z.literal("top").default("top"), count: z.number().int().min(1).max(10).default(5), bias: z.enum(["auto", "bullish", "bearish"]).default("auto"), exchange: exchange.optional() }).strict();
export const evaluatePortfolioInputSchema = z.object({ positions }).strict();
export const comparePortfoliosInputSchema = z.object({ left: positions, right: positions }).strict();

type PaymentRequired = JsonObject & { x402Version: 2; resource: JsonObject; accepts: JsonObject[] };
interface Challenge { requirements: PaymentRequired; expiresAt: number; }
interface Descriptor<Input> { toolName: string; title: string; description: string; endpointPath: string; resource: string; inputSchema: z.ZodType<Input>; body: (input: Input) => JsonObject; }
const descriptors: readonly Descriptor<any>[] = [
  { toolName: EVALUATE_SYMBOL_TOOL_NAME, title: "Evaluate a Stock Trends Symbol", description: "Purchase API-authored analytical decision context for one instrument. This is research context, not investment advice or a trade instruction.", endpointPath: X402_DECISION_EVALUATE_SYMBOL_PATH, resource: X402_DECISION_EVALUATE_SYMBOL_RESOURCE, inputSchema: evaluateSymbolInputSchema, body: (input) => defined(input) },
  { toolName: CONSTRUCT_PORTFOLIO_TOOL_NAME, title: "Construct a Stock Trends Portfolio", description: "Purchase an API-authored equal-weight analytical allocation proposal. It does not execute trades or manage assets.", endpointPath: X402_PORTFOLIO_CONSTRUCT_PATH, resource: X402_PORTFOLIO_CONSTRUCT_RESOURCE, inputSchema: constructPortfolioInputSchema, body: (input) => defined(input) },
  { toolName: EVALUATE_PORTFOLIO_TOOL_NAME, title: "Evaluate a Stock Trends Portfolio", description: "Purchase the API's analytical assessment of supplied positions. It does not execute trades or manage assets.", endpointPath: X402_PORTFOLIO_EVALUATE_PATH, resource: X402_PORTFOLIO_EVALUATE_RESOURCE, inputSchema: evaluatePortfolioInputSchema, body: (input) => defined(input) },
  { toolName: COMPARE_PORTFOLIOS_TOOL_NAME, title: "Compare Stock Trends Portfolios", description: "Purchase the API's analytical comparison of two supplied portfolios. It does not execute trades or manage assets.", endpointPath: X402_PORTFOLIO_COMPARE_PATH, resource: X402_PORTFOLIO_COMPARE_RESOURCE, inputSchema: comparePortfoliosInputSchema, body: (input) => defined(input) }
];

export interface RemoteX402PostOptions { state: RemoteX402StimState; transport?: ProductionX402ApiTransport; now?: () => number; }
export function registerRemoteX402PaidPostTools(server: McpServer, options: RemoteX402PostOptions): void {
  const transport = options.transport ?? new ProductionX402ApiTransport(); const now = options.now ?? Date.now;
  for (const descriptor of descriptors) server.registerTool(descriptor.toolName, { title: descriptor.title, description: descriptor.description, inputSchema: descriptor.inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false }, _meta: { access: "paid", endpointPath: descriptor.endpointPath, method: "POST", x402: "v2" } }, async (input, ctx) => execute(descriptor, input, ctx.mcpReq._meta?.["x402/payment"], options.state, transport, now));
}

async function execute<Input>(descriptor: Descriptor<Input>, input: Input, payment: unknown, state: RemoteX402StimState, transport: ProductionX402ApiTransport, now: () => number) {
  const time = now(); cleanup(state, time);
  const bodyText = stable(descriptor.body(input));
  if (Buffer.byteLength(bodyText, "utf8") > MAX_X402_POST_BODY_BYTES) return error("x402_request_body_too_large");
  const key = `${descriptor.toolName}\u0000${descriptor.endpointPath}\u0000POST\u0000${createHash("sha256").update(bodyText, "utf8").digest("hex")}`;
  if (payment === undefined) {
    const existing = state.challenges.get(key) as Challenge | undefined;
    if (existing?.expiresAt && existing.expiresAt > time) return paymentRequired(existing.requirements);
    try {
      const challenge = await transport.requestAnonymousChallengeForPost({ endpointPath: descriptor.endpointPath, method: "POST", bodyText });
      const requirements = challenge.body.payment_required as PaymentRequired | undefined;
      if (!validRequirements(requirements, descriptor.resource)) return error("x402_invalid_payment_requirements");
      putChallenge(state, key, { requirements, expiresAt: time + CHALLENGE_TTL_MS }); return paymentRequired(requirements);
    } catch { return error("x402_challenge_unavailable"); }
  }
  const challenge = state.challenges.get(key) as Challenge | undefined;
  if (!challenge || challenge.expiresAt <= time) return error("x402_challenge_missing_or_expired");
  const proof = validPayment(payment, challenge.requirements);
  if (!proof) return paymentFailure(challenge.requirements, "Payment authorization rejected before forwarding.");
  const digest = createHash("sha256").update(stable(proof), "utf8").digest("hex");
  if (state.consumedDigests.has(digest)) return paymentFailure(challenge.requirements, "Payment authorization has already been used; do not retry payment automatically.");
  const paymentSignature = Buffer.from(JSON.stringify(proof), "utf8").toString("base64");
  if (paymentSignature.length > MAX_X402_PAYMENT_SIGNATURE_BYTES) return paymentFailure(challenge.requirements, "Payment authorization is too large to forward.");
  if (state.consumedDigests.size >= MAX_CONSUMED_PAYMENT_DIGESTS) return paymentFailure(challenge.requirements, "Payment authorization was not forwarded because local replay protection capacity is temporarily exhausted.");
  state.consumedDigests.set(digest, challenge.expiresAt);
  try {
    const result = await transport.requestWithPaymentForPost({ endpointPath: descriptor.endpointPath, method: "POST", bodyText, paymentSignature });
    const settlement = successfulSettlement(result.paymentResponse);
    if (settlement.kind === "explicit_failure") return paymentFailure(challenge.requirements, "Payment settlement failed.");
    if (settlement.kind !== "success") return paymentFailure(challenge.requirements, "Payment outcome unknown after forwarding; do not retry payment automatically.");
    if (result.status !== 200) {
      return {
        isError: true,
        structuredContent: result.body,
        content: [{ type: "text" as const, text: `Payment settled successfully, but the Stock Trends API returned HTTP ${result.status}. ${JSON.stringify(result.body)}` }],
        _meta: { "x402/payment-response": settlement.value, "x402/http-status": result.status }
      };
    }
    return { structuredContent: result.body, content: [{ type: "text" as const, text: JSON.stringify(result.body) }], _meta: { "x402/payment-response": settlement.value } };
  } catch (cause) { return paymentFailure(challenge.requirements, cause instanceof X402ApiTransportFailure && cause.code === "x402_transport_payment_rejected" ? "Payment authorization rejected by API." : "Payment outcome unknown after forwarding; do not retry payment automatically."); }
}

function defined(value: Record<string, unknown>): JsonObject { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as JsonObject; }
function validRequirements(value: unknown, resource: string): value is PaymentRequired { return isObject(value) && value.x402Version === 2 && isObject(value.resource) && value.resource.url === resource && Array.isArray(value.accepts) && value.accepts.length > 0 && value.accepts.every((entry) => isObject(entry) && isObject(entry.extra) && stable(entry.extra.resource) === stable(value.resource)); }
function validPayment(value: unknown, requirements: PaymentRequired): JsonObject | null { const serialized = safeStringify(value); if (!isObject(value) || serialized === null || Buffer.byteLength(serialized, "utf8") > MAX_PAYMENT_JSON_BYTES || value.x402Version !== 2 || !isObject(value.resource) || !isObject(value.accepted) || !isObject(value.payload)) return null; if (stable(value.resource) !== stable(requirements.resource) || !requirements.accepts.some((entry) => stable(entry) === stable(value.accepted))) return null; return typeof value.payload.signature === "string" && !!value.payload.signature.trim() && isObject(value.payload.authorization) ? value : null; }
function successfulSettlement(value: JsonObject): { kind: "success"; value: JsonObject } | { kind: "explicit_failure" } | { kind: "unknown" } { const failed = value.success === false || value.settled === false; const positive = value.success === true || value.settled === true || (typeof value.transaction === "string" && !!value.transaction.trim()) || (typeof value.txHash === "string" && !!value.txHash.trim()); return positive && !failed ? { kind: "success", value } : failed && !positive ? { kind: "explicit_failure" } : { kind: "unknown" }; }
function paymentRequired(value: PaymentRequired) { return { isError: true, structuredContent: value, content: [{ type: "text" as const, text: JSON.stringify(value) }] }; }
function paymentFailure(value: PaymentRequired, message: string) { return { isError: true, structuredContent: { ...value, error: message }, content: [{ type: "text" as const, text: JSON.stringify({ ...value, error: message }) }] }; }
function error(code: string) { return { isError: true, structuredContent: { error: code }, content: [{ type: "text" as const, text: JSON.stringify({ error: code }) }] }; }
function cleanup(state: RemoteX402StimState, time: number) { for (const [key, value] of state.challenges) if ((value as Challenge).expiresAt <= time) state.challenges.delete(key); for (const [key, expires] of state.consumedDigests) if (expires <= time) state.consumedDigests.delete(key); }
function putChallenge(state: RemoteX402StimState, key: string, value: Challenge) { if (state.challenges.size >= MAX_STATE_ENTRIES) state.challenges.delete(state.challenges.keys().next().value!); state.challenges.set(key, value); }
function safeStringify(value: unknown): string | null { try { const result = JSON.stringify(value); return typeof result === "string" ? result : null; } catch { return null; } }
function isObject(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`; return JSON.stringify(value); }
