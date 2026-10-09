import { createHash } from "node:crypto";
import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { MAX_X402_PAYMENT_SIGNATURE_BYTES, ProductionX402ApiTransport, X402ApiTransportFailure, X402_AGENT_SCREENER_TOP_PATH, X402_AGENT_SCREENER_TOP_RESOURCE, X402_BREADTH_SECTOR_LATEST_PATH, X402_BREADTH_SECTOR_LATEST_RESOURCE, X402_INDICATORS_HISTORY_PATH, X402_INDICATORS_HISTORY_RESOURCE, X402_INDICATORS_LATEST_PATH, X402_INDICATORS_LATEST_RESOURCE, X402_LEADERSHIP_SUMMARY_LATEST_PATH, X402_LEADERSHIP_SUMMARY_LATEST_RESOURCE, X402_MARKET_EPOCH_HISTORY_PATH, X402_MARKET_EPOCH_HISTORY_RESOURCE, X402_MARKET_EPOCH_LATEST_PATH, X402_MARKET_EPOCH_LATEST_RESOURCE, X402_MARKET_REGIME_HISTORY_PATH, X402_MARKET_REGIME_HISTORY_RESOURCE, X402_MARKET_REGIME_LATEST_PATH, X402_MARKET_REGIME_LATEST_RESOURCE, X402_SELECTIONS_LATEST_PATH, X402_SELECTIONS_LATEST_RESOURCE, X402_STIM_HISTORY_PATH, X402_STIM_HISTORY_RESOURCE, X402_STIM_LATEST_PATH, X402_STIM_LATEST_RESOURCE } from "../x402ApiTransport.js";
import type { JsonObject } from "../stocktrendsClient.js";
import { STIM_LATEST_TOOL_NAME } from "./stimTools.js";
import { STIM_HISTORY_TOOL_NAME } from "./stimTools.js";
import { INDICATORS_HISTORY_TOOL_NAME, INDICATORS_LATEST_TOOL_NAME } from "./indicatorsTools.js";
import { SELECTIONS_LATEST_TOOL_NAME } from "./selectionsTools.js";
import { BREADTH_SECTOR_LATEST_TOOL_NAME, LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, MARKET_REGIME_HISTORY_TOOL_NAME, MARKET_REGIME_LATEST_TOOL_NAME } from "./marketContextTools.js";

export const MAX_PAYMENT_SIGNATURE_BYTES = MAX_X402_PAYMENT_SIGNATURE_BYTES;
const MAX_PAYMENT_JSON_BYTES = Math.floor((MAX_PAYMENT_SIGNATURE_BYTES / 4) * 3);
const CHALLENGE_TTL_MS = 60_000;
const MAX_STATE_ENTRIES = 256;
export const MAX_CONSUMED_PAYMENT_DIGESTS = 256;
export const MARKET_EPOCH_LATEST_TOOL_NAME = "stocktrends_get_market_epoch_latest";
export const MARKET_EPOCH_HISTORY_TOOL_NAME = "stocktrends_get_market_epoch_history";

const canonicalSymbolExchangeSchema = z.string().trim().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}-[NQABTI]$/, "Use canonical SYMBOL-EXCHANGE form, for example IBM-N.");
const legacySymbolExchangeSchema = z.string().trim().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/, "Use canonical SYMBOL-EXCHANGE form, for example IBM-N.");
const stimInputSchema = z.object({ symbol_exchange: z.union([canonicalSymbolExchangeSchema, legacySymbolExchangeSchema]).describe("Canonical Stock Trends instrument identifier, for example IBM-N. Legacy IBM_N is accepted temporarily.") }).strict();
const emptyInputSchema = z.object({}).strict();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be an ISO YYYY-MM-DD date.").refine(isCalendarDate, "Must be a valid calendar date.");
const epochHistoryInputSchema = z.object({
  limit: z.number().int().min(1).max(2600).default(52).describe("Number of persisted weekly Epoch snapshots, from 1 through 2600. Defaults to 52."),
  start_date: isoDateSchema.optional().describe("Optional inclusive earliest weekdate (YYYY-MM-DD)."),
  end_date: isoDateSchema.optional().describe("Optional inclusive latest weekdate (YYYY-MM-DD).")
}).strict().refine((value) => !value.start_date || !value.end_date || value.start_date <= value.end_date, { message: "start_date must be before or equal to end_date.", path: ["end_date"] });
const symbolHistorySchema = z.object({ symbol_exchange: z.union([canonicalSymbolExchangeSchema, legacySymbolExchangeSchema]), start: isoDateSchema.optional(), end: isoDateSchema.optional(), limit: z.number().int().min(1).max(2600).default(260), include_gaps: z.boolean().optional() }).strict().refine((value) => !value.start || !value.end || value.start <= value.end, { message: "start must be before or equal to end.", path: ["end"] });
const indicatorLatestSchema = z.object({ symbol_exchange: z.union([canonicalSymbolExchangeSchema, legacySymbolExchangeSchema]), cs_only: z.boolean().optional() }).strict();
const indicatorHistorySchema = z.object({ symbol_exchange: z.union([canonicalSymbolExchangeSchema, legacySymbolExchangeSchema]), cs_only: z.boolean().optional(), start: isoDateSchema.optional(), end: isoDateSchema.optional(), limit: z.number().int().min(1).max(2600).default(260) }).strict().refine((value) => !value.start || !value.end || value.start <= value.end, { message: "start must be before or equal to end.", path: ["end"] });
const selectionsSchema = z.object({ exchange: z.enum(["N", "Q", "A", "B", "T", "I"]).optional(), min_prob13wk: z.number().finite().min(0).max(1).optional(), limit: z.number().int().min(1).max(250).default(50), include_data: z.boolean().optional(), include_mast: z.boolean().optional(), cs_only: z.boolean().optional() }).strict();
const regimeHistorySchema = z.object({ limit: z.number().int().min(1).max(52).default(12), start_date: isoDateSchema.optional() }).strict();
const breadthSchema = z.object({ exchange: z.enum(["N", "Q", "A", "B", "T", "I"]).optional(), cs_only: z.boolean().optional(), include_unknown: z.boolean().optional(), min_price: z.number().finite().nonnegative().optional(), min_volume: z.number().int().nonnegative().optional(), group_level: z.enum(["sector", "industry_group", "industry"]).default("sector"), limit: z.number().int().min(1).max(250).default(50) }).strict();
const leadershipSchema = z.object({ min_rsi: z.number().int().min(0).max(500).optional(), min_mt_cnt: z.number().int().min(0).max(500).optional(), limit_overall: z.number().int().min(1).max(200).default(50), limit_bucket: z.number().int().min(1).max(50).default(20) }).strict();
const screenerSchema = z.object({ exchange: z.enum(["N", "Q", "A", "B", "T", "I"]).optional(), trend: z.string().trim().min(1).max(64).optional(), min_rsi: z.number().int().min(0).max(500).default(100), min_mt_cnt: z.number().int().min(0).max(500).default(1), min_trend_cnt: z.number().int().min(0).max(500).default(1), sort: z.enum(["rsi", "mt_cnt"]).default("rsi"), limit: z.number().int().min(1).max(100).default(25), weekdate: isoDateSchema.optional() }).strict();

type PaymentRequired = JsonObject & { x402Version: 2; resource: JsonObject; accepts: JsonObject[] };
interface Challenge { requirements: PaymentRequired; expiresAt: number; }
export interface RemoteX402StimState { challenges: Map<string, Challenge>; consumedDigests: Map<string, number>; }
export function createRemoteX402StimState(): RemoteX402StimState { return { challenges: new Map(), consumedDigests: new Map() }; }
export interface RemoteX402StimOptions { transport?: ProductionX402ApiTransport; state: RemoteX402StimState; now?: () => number; }

interface RemoteGetDescriptor<Input> { toolName: string; title: string; description: string; endpointPath: string; resource: string; inputSchema: any; toQuery: (input: Input) => Record<string, string>; }
const descriptors: readonly RemoteGetDescriptor<any>[] = [
  { toolName: STIM_LATEST_TOOL_NAME, title: "Get Latest Stock Trends ST-IM Record", description: "Purchase the latest API-authored ST-IM record with an x402 payment authorization. symbol_exchange uses canonical IBM-N form; legacy IBM_N is accepted temporarily.", endpointPath: X402_STIM_LATEST_PATH, resource: X402_STIM_LATEST_RESOURCE, inputSchema: stimInputSchema, toQuery: (input: z.infer<typeof stimInputSchema>) => ({ symbol_exchange: normalizeSymbolExchange(input.symbol_exchange) }) },
  { toolName: STIM_HISTORY_TOOL_NAME, title: "Get Stock Trends ST-IM History", description: "Purchase bounded API-authored ST-IM history with an x402 payment authorization. The API data is probabilistic context, not a forecast or recommendation.", endpointPath: X402_STIM_HISTORY_PATH, resource: X402_STIM_HISTORY_RESOURCE, inputSchema: symbolHistorySchema, toQuery: (input: z.infer<typeof symbolHistorySchema>) => query({ ...input, symbol_exchange: normalizeSymbolExchange(input.symbol_exchange) }) },
  { toolName: INDICATORS_LATEST_TOOL_NAME, title: "Get Latest Stock Trends Indicators", description: "Purchase the latest API-authored instrument classification with an x402 payment authorization.", endpointPath: X402_INDICATORS_LATEST_PATH, resource: X402_INDICATORS_LATEST_RESOURCE, inputSchema: indicatorLatestSchema, toQuery: (input: z.infer<typeof indicatorLatestSchema>) => query({ ...input, symbol_exchange: normalizeSymbolExchange(input.symbol_exchange) }) },
  { toolName: INDICATORS_HISTORY_TOOL_NAME, title: "Get Stock Trends Indicators History", description: "Purchase bounded API-authored instrument classification history with an x402 payment authorization.", endpointPath: X402_INDICATORS_HISTORY_PATH, resource: X402_INDICATORS_HISTORY_RESOURCE, inputSchema: indicatorHistorySchema, toQuery: (input: z.infer<typeof indicatorHistorySchema>) => query({ ...input, symbol_exchange: normalizeSymbolExchange(input.symbol_exchange) }) },
  { toolName: SELECTIONS_LATEST_TOOL_NAME, title: "Get Latest Stock Trends Base Selection Universe", description: "Purchase the API-authored base ST-IM selection universe with an x402 payment authorization. This is not the separately thresholded published STIM Select list.", endpointPath: X402_SELECTIONS_LATEST_PATH, resource: X402_SELECTIONS_LATEST_RESOURCE, inputSchema: selectionsSchema, toQuery: query },
  { toolName: MARKET_REGIME_LATEST_TOOL_NAME, title: "Get Latest Stock Trends Market Regime", description: "Purchase the latest API-authored market regime classification with an x402 payment authorization. Regime is market context, not a trading recommendation.", endpointPath: X402_MARKET_REGIME_LATEST_PATH, resource: X402_MARKET_REGIME_LATEST_RESOURCE, inputSchema: emptyInputSchema, toQuery: () => ({}) },
  { toolName: MARKET_REGIME_HISTORY_TOOL_NAME, title: "Get Stock Trends Market Regime History", description: "Purchase bounded API-authored market regime history with an x402 payment authorization. Regime is market context, not a forecast or recommendation.", endpointPath: X402_MARKET_REGIME_HISTORY_PATH, resource: X402_MARKET_REGIME_HISTORY_RESOURCE, inputSchema: regimeHistorySchema, toQuery: query },
  { toolName: BREADTH_SECTOR_LATEST_TOOL_NAME, title: "Get Latest Stock Trends Sector Breadth", description: "Purchase the API-authored sector breadth snapshot with an x402 payment authorization. Breadth is participation context, not a trading recommendation.", endpointPath: X402_BREADTH_SECTOR_LATEST_PATH, resource: X402_BREADTH_SECTOR_LATEST_RESOURCE, inputSchema: breadthSchema, toQuery: query },
  { toolName: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, title: "Get Latest Stock Trends Leadership Summary", description: "Purchase the API-authored leadership summary with an x402 payment authorization. Leadership is rotation context, not stock picks.", endpointPath: X402_LEADERSHIP_SUMMARY_LATEST_PATH, resource: X402_LEADERSHIP_SUMMARY_LATEST_RESOURCE, inputSchema: leadershipSchema, toQuery: query },
  { toolName: "stocktrends_get_screener_top", title: "Get Top Stock Trends Screener Results", description: "Purchase the API-authored ranked screener output with an x402 payment authorization. Results are research context, not a buy or sell recommendation.", endpointPath: X402_AGENT_SCREENER_TOP_PATH, resource: X402_AGENT_SCREENER_TOP_RESOURCE, inputSchema: screenerSchema, toQuery: query },
  { toolName: MARKET_EPOCH_LATEST_TOOL_NAME, title: "Get Latest Market Epoch", description: "Purchase the latest persisted Market Epoch v1 structural market-state context. Epoch is descriptive context, not a trade signal, forward-return forecast, probability forecast, or trading recommendation.", endpointPath: X402_MARKET_EPOCH_LATEST_PATH, resource: X402_MARKET_EPOCH_LATEST_RESOURCE, inputSchema: emptyInputSchema, toQuery: () => ({}) },
  { toolName: MARKET_EPOCH_HISTORY_TOOL_NAME, title: "Get Market Epoch History", description: "Purchase bounded persisted Market Epoch v1 history. Epoch is descriptive context, not a trade signal, forward-return forecast, probability forecast, or trading recommendation. This tool preserves API-authored snapshots and performs no local Epoch calculation or interpretation.", endpointPath: X402_MARKET_EPOCH_HISTORY_PATH, resource: X402_MARKET_EPOCH_HISTORY_RESOURCE, inputSchema: epochHistoryInputSchema, toQuery: (input: z.infer<typeof epochHistoryInputSchema>) => ({ limit: String(input.limit), ...(input.start_date ? { start_date: input.start_date } : {}), ...(input.end_date ? { end_date: input.end_date } : {}) }) }
];

/** Registers the fixed, Remote-MCP x402 GET allowlist. */
export function registerRemoteX402PaidGetTools(server: McpServer, options: RemoteX402StimOptions): void {
  const transport = options.transport ?? new ProductionX402ApiTransport();
  const now = options.now ?? Date.now;
  for (const descriptor of descriptors) server.registerTool(descriptor.toolName, { title: descriptor.title, description: descriptor.description, inputSchema: descriptor.inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false }, _meta: { access: "paid", endpointPath: descriptor.endpointPath, method: "GET", x402: "v2" } }, async (input, ctx) => executeRemoteGet(descriptor, input, ctx.mcpReq._meta?.["x402/payment"], options.state, transport, now));
}
/** Compatibility export retained for existing callers and tests. */
export const registerRemoteX402StimTool = registerRemoteX402PaidGetTools;

async function executeRemoteGet<Input>(descriptor: RemoteGetDescriptor<Input>, input: Input, payment: unknown, state: RemoteX402StimState, transport: ProductionX402ApiTransport, now: () => number) {
  const time = now(); cleanup(state, time);
  const query = descriptor.toQuery(input); const key = bindingKey(descriptor, query);
  if (payment === undefined) {
    const current = state.challenges.get(key); if (current && current.expiresAt > time) return paymentRequired(current.requirements);
    try {
      const challenge = await transport.requestAnonymousChallengeForGet({ endpointPath: descriptor.endpointPath, method: "GET", query });
      const requirements = challenge.body.payment_required as PaymentRequired | undefined;
      if (!validRequirements(requirements, descriptor.resource)) return error("x402_invalid_payment_requirements");
      putChallenge(state, key, { requirements, expiresAt: time + CHALLENGE_TTL_MS }); return paymentRequired(requirements);
    } catch { return error("x402_challenge_unavailable"); }
  }
  const challenge = state.challenges.get(key); if (!challenge || challenge.expiresAt <= time) return error("x402_challenge_missing_or_expired");
  const proof = validPayment(payment, challenge.requirements); if (!proof) return paymentFailure(challenge.requirements, "Payment authorization rejected before forwarding.");
  const digest = createHash("sha256").update(stable(proof), "utf8").digest("hex");
  if (state.consumedDigests.has(digest)) return paymentFailure(challenge.requirements, "Payment authorization has already been used; do not retry payment automatically.");
  const paymentSignature = Buffer.from(JSON.stringify(proof), "utf8").toString("base64");
  if (paymentSignature.length > MAX_PAYMENT_SIGNATURE_BYTES) return paymentFailure(challenge.requirements, "Payment authorization is too large to forward.");
  if (state.consumedDigests.size >= MAX_CONSUMED_PAYMENT_DIGESTS) return paymentFailure(challenge.requirements, "Payment authorization was not forwarded because local replay protection capacity is temporarily exhausted.");
  state.consumedDigests.set(digest, challenge.expiresAt);
  try {
    const result = await transport.requestWithPaymentForGet({ endpointPath: descriptor.endpointPath, method: "GET", query, paymentSignature });
    const settlement = successfulSettlement(result.paymentResponse);
    if (settlement.kind === "explicit_failure") return paymentFailure(challenge.requirements, "Payment settlement failed.");
    if (settlement.kind !== "success") return paymentFailure(challenge.requirements, "Payment outcome unknown after forwarding; do not retry payment automatically.");
    return { structuredContent: result.body, content: [{ type: "text" as const, text: JSON.stringify(result.body) }], _meta: { "x402/payment-response": settlement.value } };
  } catch (cause) { const rejected = cause instanceof X402ApiTransportFailure && cause.code === "x402_transport_payment_rejected"; return paymentFailure(challenge.requirements, rejected ? "Payment authorization rejected by API." : "Payment outcome unknown after forwarding; do not retry payment automatically."); }
}

function normalizeSymbolExchange(value: string): string { return value.replace(/_([NQABTI])$/, "-$1"); }
function query(input: Record<string, string | number | boolean | undefined>): Record<string, string> { return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)])); }
function isCalendarDate(value: string): boolean { const [year, month, day] = value.split("-").map(Number); const parsed = new Date(Date.UTC(year, month - 1, day)); return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day; }
function validRequirements(value: unknown, resourceUrl: string): value is PaymentRequired { return isObject(value) && value.x402Version === 2 && isObject(value.resource) && value.resource.url === resourceUrl && Array.isArray(value.accepts) && value.accepts.length > 0 && value.accepts.every((accepted) => isObject(accepted) && isObject(accepted.extra) && stable(accepted.extra.resource) === stable(value.resource)); }
function validPayment(value: unknown, requirements: PaymentRequired): JsonObject | null { const serialized = safeStringify(value); if (!isObject(value) || serialized === null || Buffer.byteLength(serialized, "utf8") > MAX_PAYMENT_JSON_BYTES || value.x402Version !== 2 || !isObject(value.resource) || !isObject(value.accepted) || !isObject(value.payload)) return null; if (stable(value.resource) !== stable(requirements.resource) || !requirements.accepts.some((accepted) => stable(accepted) === stable(value.accepted))) return null; const signature = value.payload.signature; return typeof signature === "string" && !!signature.trim() && isObject(value.payload.authorization) ? value : null; }
type Settlement = { kind: "success"; value: JsonObject } | { kind: "explicit_failure" } | { kind: "unknown" };
function successfulSettlement(value: JsonObject): Settlement { const explicitFailure = value.success === false || value.settled === false; const confirmedTransaction = (typeof value.transaction === "string" && Boolean(value.transaction.trim())) || (typeof value.txHash === "string" && Boolean(value.txHash.trim())); const positive = value.success === true || value.settled === true || confirmedTransaction; if (positive && explicitFailure) return { kind: "unknown" }; if (explicitFailure) return { kind: "explicit_failure" }; return positive ? { kind: "success", value } : { kind: "unknown" }; }
function paymentRequired(value: PaymentRequired) { return { isError: true, structuredContent: value, content: [{ type: "text" as const, text: JSON.stringify(value) }] }; }
function paymentFailure(value: PaymentRequired, message: string) { return { isError: true, structuredContent: { ...value, error: message }, content: [{ type: "text" as const, text: JSON.stringify({ ...value, error: message }) }] }; }
function error(code: string) { return { isError: true, structuredContent: { error: code }, content: [{ type: "text" as const, text: JSON.stringify({ error: code }) }] }; }
function bindingKey(descriptor: Pick<RemoteGetDescriptor<unknown>, "toolName" | "endpointPath">, query: Readonly<Record<string, string>>) { return `${descriptor.toolName}\u0000${descriptor.endpointPath}\u0000GET\u0000${canonicalQuery(query)}`; }
function canonicalQuery(query: Readonly<Record<string, string>>) { return Object.keys(query).sort().map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`).join("&"); }
function cleanup(state: RemoteX402StimState, time: number) { for (const [key, value] of state.challenges) if (value.expiresAt <= time) state.challenges.delete(key); for (const [key, expires] of state.consumedDigests) if (expires <= time) state.consumedDigests.delete(key); }
function putChallenge(state: RemoteX402StimState, key: string, value: Challenge) { if (state.challenges.size >= MAX_STATE_ENTRIES) state.challenges.delete(state.challenges.keys().next().value!); state.challenges.set(key, value); }
function safeStringify(value: unknown): string | null { try { const text = JSON.stringify(value); return typeof text === "string" ? text : null; } catch { return null; } }
function isObject(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
function stable(value: unknown): string { if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`; if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`; return JSON.stringify(value); }
