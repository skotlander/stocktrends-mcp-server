import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { StockTrendsMcpConfig } from "../config.js";
import { StockTrendsMcpError } from "../errors.js";
import {
  buildPaidAuthHeaders,
  evaluatePaidInvocationPreflight,
  evaluatePaidPreflight,
  recordPaidCallAttempt,
  snapshotPaidUsage,
  type PaidAuthConfig,
  type PaidCostEstimate,
  type PaidHttpMethod,
  type PaidInvocationDenialReason,
  type PaidPreflightDecision,
  type PaidPreflightEvaluationInput,
  type PaidSpendPolicy,
  type PaidUsageTracker
} from "../paidPolicy.js";
import {
  BREADTH_PRICING_RULE_IDS,
  LEADERSHIP_PRICING_RULE_IDS,
  MARKET_PRICING_RULE_IDS,
  reconcileStaticPricingWithCatalog,
  resolveStaticEndpointPricing,
  STATIC_PRICING_POLICY_VERSION,
  type PaidPricingReconciliationState,
  type PricingReconciliationResult
} from "../paidPricing.js";
import type { JsonObject, PaidEndpointResponse, StockTrendsClient } from "../stocktrendsClient.js";

// --- Confirmed contract constants (see PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md) ---

export const MARKET_REGIME_LATEST_TOOL_NAME = "stocktrends_get_market_regime_latest";
export const MARKET_REGIME_LATEST_ENDPOINT_PATH = "/v1/market/regime/latest";
export const MARKET_REGIME_LATEST_PRICING_RULE_ID = "market_regime_latest";

export const MARKET_REGIME_HISTORY_TOOL_NAME = "stocktrends_get_market_regime_history";
export const MARKET_REGIME_HISTORY_ENDPOINT_PATH = "/v1/market/regime/history";
export const MARKET_REGIME_HISTORY_PRICING_RULE_ID = "market_regime_history";

export const BREADTH_SECTOR_LATEST_TOOL_NAME = "stocktrends_get_breadth_sector_latest";
export const BREADTH_SECTOR_LATEST_ENDPOINT_PATH = "/v1/breadth/sector/latest";
export const BREADTH_SECTOR_LATEST_PRICING_RULE_ID = "breadth_sector_latest_paid";

export const LEADERSHIP_SUMMARY_LATEST_TOOL_NAME = "stocktrends_get_leadership_summary_latest";
export const LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH = "/v1/leadership/summary/latest";
export const LEADERSHIP_SUMMARY_LATEST_PRICING_RULE_ID = "leadership_summary_latest_paid";

export const MARKET_CONTEXT_HTTP_METHOD: PaidHttpMethod = "GET";

// Deferred routes (memo §6). No code path in this module reaches them; each
// remains denied `endpoint_not_allowlisted` before any auth header or fetch
// until its own reviewed design and promotion.
export const DEFERRED_MARKET_CONTEXT_ENDPOINT_PATHS: readonly string[] = Object.freeze([
  "/v1/market/regime/forecast",
  "/v1/breadth/sector/history",
  "/v1/leadership/rotation/history"
]);

// Confirmed API `VALID_EXCHANGES`, identical to the selections family. The
// exchange filter is a single validated passthrough value, never looped.
export const VALID_MARKET_CONTEXT_EXCHANGES = ["N", "Q", "A", "B", "T", "I"] as const;

// Verified breadth grouping levels (memo §4.D). API default `sector`.
export const BREADTH_GROUP_LEVELS = ["sector", "industry_group", "industry"] as const;

// Per-route MCP limit policy (memo §9). Every limit parameter is ALWAYS sent
// explicitly, so an API default — present or future — can never silently apply
// (the breadth API default alone is 5000).
export const MARKET_REGIME_HISTORY_DEFAULT_LIMIT = 12;
export const MARKET_REGIME_HISTORY_MAX_LIMIT = 52;
export const MARKET_REGIME_HISTORY_MIN_LIMIT = 1;

export const BREADTH_SECTOR_DEFAULT_LIMIT = 50;
export const BREADTH_SECTOR_MAX_LIMIT = 250;
export const BREADTH_SECTOR_MIN_LIMIT = 1;
export const BREADTH_DEFAULT_GROUP_LEVEL = "sector";

export const LEADERSHIP_DEFAULT_LIMIT_OVERALL = 50;
export const LEADERSHIP_MAX_LIMIT_OVERALL = 200;
export const LEADERSHIP_MIN_LIMIT_OVERALL = 1;
export const LEADERSHIP_DEFAULT_LIMIT_BUCKET = 20;
export const LEADERSHIP_MAX_LIMIT_BUCKET = 50;
export const LEADERSHIP_MIN_LIMIT_BUCKET = 1;

export type MarketContextKind = "market_regime" | "market_breadth" | "market_leadership";

export interface PaidMarketContextToolDefinition {
  name: string;
  endpointPath: string;
  httpMethod: typeof MARKET_CONTEXT_HTTP_METHOD;
  access: "paid";
  pricingRuleId: string;
  // Family-scoped reconciliation group for this tool (memo §7). A market call
  // reconciles only the market rules, breadth only breadth, leadership only
  // leadership; no other family can gate or satisfy it.
  pricingRuleIds: readonly string[];
  contextKind: MarketContextKind;
}

export const PAID_MARKET_CONTEXT_TOOL_DEFINITIONS: readonly PaidMarketContextToolDefinition[] = Object.freeze([
  {
    name: MARKET_REGIME_LATEST_TOOL_NAME,
    endpointPath: MARKET_REGIME_LATEST_ENDPOINT_PATH,
    httpMethod: MARKET_CONTEXT_HTTP_METHOD,
    access: "paid",
    pricingRuleId: MARKET_REGIME_LATEST_PRICING_RULE_ID,
    pricingRuleIds: MARKET_PRICING_RULE_IDS,
    contextKind: "market_regime"
  },
  {
    name: MARKET_REGIME_HISTORY_TOOL_NAME,
    endpointPath: MARKET_REGIME_HISTORY_ENDPOINT_PATH,
    httpMethod: MARKET_CONTEXT_HTTP_METHOD,
    access: "paid",
    pricingRuleId: MARKET_REGIME_HISTORY_PRICING_RULE_ID,
    pricingRuleIds: MARKET_PRICING_RULE_IDS,
    contextKind: "market_regime"
  },
  {
    name: BREADTH_SECTOR_LATEST_TOOL_NAME,
    endpointPath: BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
    httpMethod: MARKET_CONTEXT_HTTP_METHOD,
    access: "paid",
    pricingRuleId: BREADTH_SECTOR_LATEST_PRICING_RULE_ID,
    pricingRuleIds: BREADTH_PRICING_RULE_IDS,
    contextKind: "market_breadth"
  },
  {
    name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
    endpointPath: LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
    httpMethod: MARKET_CONTEXT_HTTP_METHOD,
    access: "paid",
    pricingRuleId: LEADERSHIP_SUMMARY_LATEST_PRICING_RULE_ID,
    pricingRuleIds: LEADERSHIP_PRICING_RULE_IDS,
    contextKind: "market_leadership"
  }
]);

export const PAID_MARKET_CONTEXT_TOOL_NAMES: readonly string[] = Object.freeze(
  PAID_MARKET_CONTEXT_TOOL_DEFINITIONS.map((tool) => tool.name)
);

// --- Input schemas (strict; validated at the SDK boundary BEFORE any pricing/auth/fetch) ---
//
// Every schema is `.strict()`: unknown keys — including the deliberately
// unexposed `weekdate` (no snapshot time-travel through a latest tool),
// `vol_scale` (unbounded legacy multiplier), and `type` (no verified enum) —
// are rejected with no request. Out-of-range, non-integer, array, and sentinel
// limit values fail closed the same way and are never silently clamped.

const exchangeField = z.enum(VALID_MARKET_CONTEXT_EXCHANGES).optional();

// Snapshot-shaped route with no parameters at all: a strict EMPTY object.
export const marketRegimeLatestInputSchema = z.object({}).strict();

// `start_date` is a validated optional passthrough refinement only (it can only
// narrow the window); the adapter never walks it to assemble a longer series.
export const marketRegimeHistoryInputSchema = z
  .object({
    limit: z.number().int().min(MARKET_REGIME_HISTORY_MIN_LIMIT).max(MARKET_REGIME_HISTORY_MAX_LIMIT).optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "start_date must be a YYYY-MM-DD date string")
      .optional()
  })
  .strict();

export const breadthSectorLatestInputSchema = z
  .object({
    group_level: z.enum(BREADTH_GROUP_LEVELS).optional(),
    exchange: exchangeField,
    cs_only: z.boolean().optional(),
    include_unknown: z.boolean().optional(),
    min_price: z.number().finite().min(0).optional(),
    min_volume: z.number().int().min(0).optional(),
    limit: z.number().int().min(BREADTH_SECTOR_MIN_LIMIT).max(BREADTH_SECTOR_MAX_LIMIT).optional()
  })
  .strict();

export const leadershipSummaryLatestInputSchema = z
  .object({
    exchange: exchangeField,
    min_rsi: z.number().int().min(0).max(500).optional(),
    min_mt_cnt: z.number().int().min(0).max(500).optional(),
    limit_overall: z.number().int().min(LEADERSHIP_MIN_LIMIT_OVERALL).max(LEADERSHIP_MAX_LIMIT_OVERALL).optional(),
    limit_bucket: z.number().int().min(LEADERSHIP_MIN_LIMIT_BUCKET).max(LEADERSHIP_MAX_LIMIT_BUCKET).optional()
  })
  .strict();

type MarketRegimeLatestInput = z.infer<typeof marketRegimeLatestInputSchema>;
type MarketRegimeHistoryInput = z.infer<typeof marketRegimeHistoryInputSchema>;
type BreadthSectorLatestInput = z.infer<typeof breadthSectorLatestInputSchema>;
type LeadershipSummaryLatestInput = z.infer<typeof leadershipSummaryLatestInputSchema>;

// --- Error taxonomy (tool-facing, deterministic, secret-free) ---

export type MarketContextToolErrorCode =
  | "paid_tools_disabled"
  | "paid_auth_blocked_missing_api_key"
  | "endpoint_not_allowlisted"
  | "tool_endpoint_mismatch"
  | "host_not_approved"
  | "pricing_preflight_unavailable"
  | "pricing_catalog_reconciliation_failed"
  | "cost_unavailable"
  | "unsupported_cost_unit"
  | "spend_cap_exceeded"
  | "paid_execution_disabled"
  | "repeated_identical_market_context_call"
  | "unexpected_auth_attempt"
  | "api_request_failed"
  | "api_timeout"
  | "api_auth_required"
  | "api_payment_required"
  | "api_forbidden"
  | "api_not_found"
  | "api_rate_limited"
  | "api_unapproved_redirect"
  | "api_unexpected_status"
  | "malformed_api_response";

const DENIAL_REASON_TO_ERROR_CODE: Record<PaidInvocationDenialReason, MarketContextToolErrorCode> = {
  paid_tools_disabled: "paid_tools_disabled",
  paid_auth_blocked_missing_api_key: "paid_auth_blocked_missing_api_key",
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "tool_endpoint_mismatch",
  host_not_approved: "host_not_approved",
  paid_execution_disabled: "paid_execution_disabled"
};

const PREFLIGHT_DENIAL_TO_ERROR_CODE: Record<string, MarketContextToolErrorCode> = {
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "tool_endpoint_mismatch",
  host_not_approved: "host_not_approved",
  paid_auth_unavailable: "paid_tools_disabled",
  missing_pricing: "pricing_preflight_unavailable",
  non_authoritative_pricing: "pricing_preflight_unavailable",
  cap_exceeded: "spend_cap_exceeded",
  paid_execution_disabled: "paid_execution_disabled"
};

// --- Wrapper metadata shapes ---

export interface PaidMarketContextPreflightSummary {
  endpoint_allowlisted: boolean;
  tool_allowlisted: boolean;
  host_approved: boolean;
  paid_mode_configured: boolean;
  pricing_source: string | null;
  pricing_rule: string | null;
  estimated_cost: { amount: number; unit: string } | null;
  hard_execution_gate_enabled: boolean;
  local_authorization_decision: "allow" | "deny";
  denial_reason: MarketContextToolErrorCode | null;
}

export interface PaidMarketContextLocalCapStatus {
  max_paid_calls_per_session: number;
  max_paid_calls_per_tool: number;
  max_stc_per_session: number | null;
  max_usd_per_session: number | null;
  paid_calls_this_session: number;
  paid_calls_this_tool: number;
  stc_spent_this_session: number;
  usd_spent_this_session: number;
  automatic_paid_retries: false;
}

// Context-not-advice provenance (memo §10). All four tools forward API-authored
// market context verbatim; the adapter never recomputes any of it and never
// turns any of it into a recommendation.
export interface PaidMarketContextProvenance {
  context_kind: MarketContextKind;
  api_authored_context: true;
  context_not_advice: true;
  framing: string;
  locally_computed: false;
  locally_ranked: false;
  locally_scored: false;
  locally_bucketed: false;
  locally_aggregated: false;
  locally_thresholded: false;
  locally_filtered: false;
}

export interface PaidMarketContextPricingReconciliation {
  required: true;
  status: "reconciled" | "failed" | "not_evaluated";
  source: "pricing_catalog" | null;
  detail: string | null;
}

export interface PaidMarketContextResponseMetadata {
  request_id: string | null;
  pricing_rule: string | null;
  payment_required: string | null;
  accepted_payment_methods: string | null;
  quota_limit: string | null;
  quota_period: string | null;
  observed_cost: null;
  payment_status: null;
}

export interface PaidMarketContextToolMetadata {
  tool_name: string;
  endpoint_path: string;
  http_method: typeof MARKET_CONTEXT_HTTP_METHOD;
  source: "stocktrends_api";
  // Effective, normalized parameters for this invocation (nulls for omitted
  // passthrough filters; effective values for always-sent parameters). None is
  // applied locally.
  market_context_parameters: Record<string, unknown>;
  provenance: PaidMarketContextProvenance;
  request_parameters: Record<string, unknown>;
  api_request_parameters: Record<string, unknown>;
  preflight_decision_summary: PaidMarketContextPreflightSummary;
  pricing_reconciliation: PaidMarketContextPricingReconciliation;
  local_budget_cap_status: PaidMarketContextLocalCapStatus;
  response_metadata: PaidMarketContextResponseMetadata;
  request_id: string | null;
  pricing_rule: string | null;
  observed_cost: null;
  payment_status: null;
  // Every limit parameter actually sent to the API (empty for the
  // zero-parameter regime-latest snapshot). Metadata only.
  effective_limits: Record<string, number>;
  // Row-count transparency (memo §9). Metadata only, never a second
  // ranking/filtering pass. `null` when the returned shape has no derivable count.
  returned_row_count: number | null;
  // Freshness capture-if-present (memo §10): the API-reported weekdate string
  // when the unconstrained payload carries one at the top level; never fabricated.
  api_reported_weekdate: string | null;
  pricing_policy_version: string;
  authoritative_for: string;
  not_authoritative_for: string[];
  fetched_at: string | null;
  paid_execution_authorized: boolean;
  warnings: string[];
  limitations: string[];
}

// --- Per-server repeated-identical-call loop state (memo §9) ---
//
// Market-context data is weekly-cadence: an identical call within one server
// session re-bills identical data, so this posture is deliberately stricter
// than the ST-IM/indicators one and extends the selections normalized-signature
// posture to all four market-context tools. The signature covers the tool name
// plus the normalized effective input parameters; for the zero-parameter
// regime-latest tool the signature is constant, so a second executed call in
// the same server session fails closed.
//
// Two sets guard against both sequential AND concurrent repeats:
//
// - `inFlightSignatures` holds signatures RESERVED synchronously before the
//   first async boundary (catalog reconciliation). Because the reservation
//   happens before any `await` that can yield, a second identical call that
//   arrives while the first is still awaiting sees the reservation and fails
//   closed before pricing/auth/fetch/cap debit. The reservation is RELEASED if
//   the call fails before an authorized billable attempt, so a later
//   operator-supervised retry is not permanently blocked.
// - `executedSignatures` holds signatures that reached an authorized billable
//   attempt. Once promoted, a signature stays executed for the session even if
//   the API returns a deterministic error, so the server never silently
//   re-bills an identical market-context request.
//
// In-memory only; both reset on server restart.
export interface MarketContextLoopState {
  executedSignatures: Set<string>;
  inFlightSignatures: Set<string>;
}

export function createMarketContextLoopState(): MarketContextLoopState {
  return { executedSignatures: new Set<string>(), inFlightSignatures: new Set<string>() };
}

// --- Registration ---

export function registerPaidMarketContextTools(
  server: McpServer,
  client: StockTrendsClient,
  config: StockTrendsMcpConfig,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState
): void {
  // Same exposure gate as every prior paid family: the four market-context tool
  // definitions are exposed only when paid mode is explicitly enabled AND an API
  // key is configured — neither the flag nor the key alone exposes anything.
  // Exposure is independent of the execution flag. Registering these four tools
  // brings the paid-exposed surface to exactly ten tools; the default/free
  // surface stays at exactly one.
  if (!shouldExposePaidMarketContextTools(config)) {
    return;
  }

  // Per-server loop state shared by the four tools (signatures embed the tool
  // name, so families never collide). Lives for this server instance only and
  // resets on restart (no persistence).
  const loopState = createMarketContextLoopState();

  server.registerTool(
    MARKET_REGIME_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Market Regime Classification (paid)",
      description:
        "Paid market-context tool for GET /v1/market/regime/latest. Returns the Stock Trends API-authored current weekly market regime classification exactly as the API returns it. The regime label is API-authored market context, NOT a trading recommendation: this tool produces no buy/sell/hold/allocation output and never computes, smooths, reclassifies, or reinterprets the regime locally. Snapshot-shaped: the input is a strict empty object (unknown keys rejected), no query parameters exist, and exactly one GET is sent per invocation with no pagination/bulk/retry. Because the input is constant, a second executed call in the same server session fails closed rather than re-billing identical weekly data. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, market-family catalog reconciliation, and nonzero local caps (plus a covering STC budget for the 0.15 STC cost) all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: marketRegimeLatestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: MARKET_REGIME_LATEST_ENDPOINT_PATH,
        method: MARKET_CONTEXT_HTTP_METHOD,
        source: "market_regime_latest"
      }
    },
    async (input) => handleMarketRegimeLatestTool(config, client, usage, reconciliation, loopState, input as MarketRegimeLatestInput)
  );

  server.registerTool(
    MARKET_REGIME_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends Market Regime History (paid)",
      description:
        "Paid market-context tool for GET /v1/market/regime/history. Returns the Stock Trends API-authored historical weekly market regime classifications exactly as the API returns them. Regime history is API-authored market context, NOT a trading signal or recommendation: this tool never computes, smooths, blends, reclassifies, or forecasts regimes locally. Broad-sweep safe: an explicit limit is always sent (default 12, hard max 52 — the API's own maximum, about one year of weekly labels), start_date is an optional validated YYYY-MM-DD passthrough that can only narrow the window (never walked to assemble a longer series), exactly one GET per invocation, no pagination/bulk/date-sweeping/retry, and repeated identical calls fail closed. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, market-family catalog reconciliation, and nonzero local caps (plus a covering STC budget for the 0.25 STC cost) all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: marketRegimeHistoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: MARKET_REGIME_HISTORY_ENDPOINT_PATH,
        method: MARKET_CONTEXT_HTTP_METHOD,
        source: "market_regime_history"
      }
    },
    async (input) => handleMarketRegimeHistoryTool(config, client, usage, reconciliation, loopState, input as MarketRegimeHistoryInput)
  );

  server.registerTool(
    BREADTH_SECTOR_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Sector Breadth (paid)",
      description:
        "Paid market-context tool for GET /v1/breadth/sector/latest. Returns the Stock Trends API-authored latest sector/industry-group/industry participation breadth table exactly as the API returns it. Breadth rows are API-authored participation context, NOT a confirmation signal to act on and NOT a trading recommendation: this tool never re-aggregates, re-groups, or recomputes participation math or percentages locally. Broad-sweep safe: explicit limit (default 50, hard max 250 — far below the API's 5000 default / 50000 max) and group_level (default sector) are always sent; exchange/cs_only/include_unknown/min_price/min_volume are validated passthroughs sent only when supplied so API defaults apply; weekdate is deliberately NOT exposed (no snapshot time-travel through a latest tool) and vol_scale is NOT exposed (unbounded legacy multiplier); exactly one GET per invocation, no pagination/bulk/exchange-iteration/retry, and repeated identical calls fail closed. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, breadth-family catalog reconciliation, and nonzero local caps (plus a covering STC budget for the 0.1 STC cost) all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: breadthSectorLatestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
        method: MARKET_CONTEXT_HTTP_METHOD,
        source: "breadth_sector_latest"
      }
    },
    async (input) => handleBreadthSectorLatestTool(config, client, usage, reconciliation, loopState, input as BreadthSectorLatestInput)
  );

  server.registerTool(
    LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Leadership Summary (paid)",
      description:
        "Paid market-context tool for GET /v1/leadership/summary/latest. Returns the Stock Trends API-ranked, API-bucketed latest leadership summary exactly as the API returns it. Leadership tables are API-authored rotation context, NOT stock picks and NOT a trading recommendation: this tool never ranks, re-scores, re-buckets, merges buckets, or applies thresholds locally — min_rsi/min_mt_cnt are validated passthroughs sent only when supplied so the API defaults apply otherwise, never a second local filtering pass. Broad-sweep safe: explicit limits are always sent (limit_overall default 50, hard max 200; limit_bucket default 20, hard max 50); weekdate is deliberately NOT exposed (no snapshot time-travel through a latest tool) and type is NOT exposed (no verified enum; the API default CS applies); exactly one GET per invocation, no pagination/bulk/exchange-iteration/retry, and repeated identical calls fail closed. The companion credential-free public resource stocktrends://leadership/definitions defines the indicators and taxonomy this summary buckets by. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, leadership-family catalog reconciliation, and nonzero local caps (plus a covering STC budget for the 0.25 STC cost) all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: leadershipSummaryLatestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
        method: MARKET_CONTEXT_HTTP_METHOD,
        source: "leadership_summary_latest"
      }
    },
    async (input) =>
      handleLeadershipSummaryLatestTool(config, client, usage, reconciliation, loopState, input as LeadershipSummaryLatestInput)
  );
}

export function shouldExposePaidMarketContextTools(config: StockTrendsMcpConfig): boolean {
  return config.paidTools.requested && config.paidTools.apiKeyConfigured;
}

export function listPaidMarketContextToolNames(): string[] {
  return [...PAID_MARKET_CONTEXT_TOOL_NAMES];
}

// --- Handlers ---

async function handleMarketRegimeLatestTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  loopState: MarketContextLoopState,
  _input: MarketRegimeLatestInput
): Promise<CallToolResult> {
  // No query parameters exist on this snapshot route; the normalized signature
  // is constant, so a second executed call this session fails closed.
  return executePaidMarketContext(config, client, usage, reconciliation, loopState, {
    toolName: MARKET_REGIME_LATEST_TOOL_NAME,
    endpointPath: MARKET_REGIME_LATEST_ENDPOINT_PATH,
    pricingRuleId: MARKET_REGIME_LATEST_PRICING_RULE_ID,
    pricingRuleIds: MARKET_PRICING_RULE_IDS,
    contextKind: "market_regime",
    framing:
      "The regime classification is API-authored market context, not a trading recommendation; no buy/sell/hold/allocation output is produced.",
    parameters: {},
    requestParameters: {},
    apiRequestParameters: {},
    signature: JSON.stringify({ tool: MARKET_REGIME_LATEST_TOOL_NAME }),
    effectiveLimits: {},
    extraWarnings: [
      "The regime label is API-authored market context, not a trading recommendation. The adapter performs no local regime calculation, smoothing, reclassification, or reinterpretation."
    ]
  });
}

async function handleMarketRegimeHistoryTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  loopState: MarketContextLoopState,
  input: MarketRegimeHistoryInput
): Promise<CallToolResult> {
  const effectiveLimit = input.limit ?? MARKET_REGIME_HISTORY_DEFAULT_LIMIT;
  // `limit` is ALWAYS present; `start_date` is a validated passthrough sent only
  // when supplied (never walked).
  const requestParameters: Record<string, unknown> = { limit: effectiveLimit };

  if (input.start_date !== undefined) {
    requestParameters.start_date = input.start_date;
  }

  return executePaidMarketContext(config, client, usage, reconciliation, loopState, {
    toolName: MARKET_REGIME_HISTORY_TOOL_NAME,
    endpointPath: MARKET_REGIME_HISTORY_ENDPOINT_PATH,
    pricingRuleId: MARKET_REGIME_HISTORY_PRICING_RULE_ID,
    pricingRuleIds: MARKET_PRICING_RULE_IDS,
    contextKind: "market_regime",
    framing:
      "Historical regime labels are API-authored market context, not a trading signal; regime transitions are longitudinal context, not advice.",
    parameters: {
      effective_limit: effectiveLimit,
      limit_is_caller_supplied: input.limit !== undefined,
      start_date: input.start_date ?? null
    },
    requestParameters,
    apiRequestParameters: requestParameters,
    signature: JSON.stringify({
      tool: MARKET_REGIME_HISTORY_TOOL_NAME,
      limit: effectiveLimit,
      start_date: input.start_date ?? null
    }),
    effectiveLimits: { limit: effectiveLimit },
    extraWarnings: [
      "Regime history rows are returned verbatim; the adapter never blends history into a trend, forecasts, or recomputes regimes, and never walks start_date or paginates to assemble a longer series."
    ]
  });
}

async function handleBreadthSectorLatestTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  loopState: MarketContextLoopState,
  input: BreadthSectorLatestInput
): Promise<CallToolResult> {
  const effectiveLimit = input.limit ?? BREADTH_SECTOR_DEFAULT_LIMIT;
  const effectiveGroupLevel = input.group_level ?? BREADTH_DEFAULT_GROUP_LEVEL;
  // `limit` and `group_level` are ALWAYS present. The boolean/threshold filters
  // follow the repo's passthrough pattern: sent only when supplied so the API's
  // documented defaults (cs_only true, include_unknown false) apply; the
  // effective values are recorded in metadata either way. `weekdate` and
  // `vol_scale` have no code path here at all.
  const requestParameters: Record<string, unknown> = { group_level: effectiveGroupLevel, limit: effectiveLimit };

  if (input.exchange !== undefined) {
    requestParameters.exchange = input.exchange;
  }

  if (input.cs_only !== undefined) {
    requestParameters.cs_only = input.cs_only;
  }

  if (input.include_unknown !== undefined) {
    requestParameters.include_unknown = input.include_unknown;
  }

  if (input.min_price !== undefined) {
    requestParameters.min_price = input.min_price;
  }

  if (input.min_volume !== undefined) {
    requestParameters.min_volume = input.min_volume;
  }

  return executePaidMarketContext(config, client, usage, reconciliation, loopState, {
    toolName: BREADTH_SECTOR_LATEST_TOOL_NAME,
    endpointPath: BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
    pricingRuleId: BREADTH_SECTOR_LATEST_PRICING_RULE_ID,
    pricingRuleIds: BREADTH_PRICING_RULE_IDS,
    contextKind: "market_breadth",
    framing:
      "Breadth rows are API-authored participation context, not confirmation signals to act on; no local breadth calculation or re-aggregation occurs.",
    parameters: {
      group_level: effectiveGroupLevel,
      group_level_is_caller_supplied: input.group_level !== undefined,
      exchange: input.exchange ?? null,
      cs_only_effective: input.cs_only ?? true,
      cs_only_is_caller_supplied: input.cs_only !== undefined,
      include_unknown_effective: input.include_unknown ?? false,
      include_unknown_is_caller_supplied: input.include_unknown !== undefined,
      min_price: input.min_price ?? null,
      min_volume: input.min_volume ?? null,
      effective_limit: effectiveLimit,
      limit_is_caller_supplied: input.limit !== undefined
    },
    requestParameters,
    apiRequestParameters: requestParameters,
    signature: JSON.stringify({
      tool: BREADTH_SECTOR_LATEST_TOOL_NAME,
      group_level: effectiveGroupLevel,
      exchange: input.exchange ?? null,
      cs_only: input.cs_only ?? true,
      include_unknown: input.include_unknown ?? false,
      min_price: input.min_price ?? null,
      min_volume: input.min_volume ?? null,
      limit: effectiveLimit
    }),
    effectiveLimits: { limit: effectiveLimit },
    extraWarnings: [
      "Breadth rows are participation context, not confirmation signals to act on. Rows are returned verbatim: no re-aggregation, re-grouping, participation math, or percentage recomputation occurs locally. weekdate (snapshot time-travel) and vol_scale are not exposed; an industry-level table may exceed the 250-row cap, in which case truncation is visible via returned_row_count rather than raised caps."
    ]
  });
}

async function handleLeadershipSummaryLatestTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  loopState: MarketContextLoopState,
  input: LeadershipSummaryLatestInput
): Promise<CallToolResult> {
  const effectiveLimitOverall = input.limit_overall ?? LEADERSHIP_DEFAULT_LIMIT_OVERALL;
  const effectiveLimitBucket = input.limit_bucket ?? LEADERSHIP_DEFAULT_LIMIT_BUCKET;
  // Both limits are ALWAYS present. min_rsi/min_mt_cnt/exchange are validated
  // passthroughs sent only when supplied so the API defaults (110/4) apply
  // otherwise; none is ever applied locally. `weekdate` and `type` have no code
  // path here at all.
  const requestParameters: Record<string, unknown> = {
    limit_overall: effectiveLimitOverall,
    limit_bucket: effectiveLimitBucket
  };

  if (input.exchange !== undefined) {
    requestParameters.exchange = input.exchange;
  }

  if (input.min_rsi !== undefined) {
    requestParameters.min_rsi = input.min_rsi;
  }

  if (input.min_mt_cnt !== undefined) {
    requestParameters.min_mt_cnt = input.min_mt_cnt;
  }

  return executePaidMarketContext(config, client, usage, reconciliation, loopState, {
    toolName: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
    endpointPath: LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
    pricingRuleId: LEADERSHIP_SUMMARY_LATEST_PRICING_RULE_ID,
    pricingRuleIds: LEADERSHIP_PRICING_RULE_IDS,
    contextKind: "market_leadership",
    framing:
      "Leadership tables are API-authored rotation context, not stock picks; the API ranks and buckets, the adapter never re-ranks, re-scores, re-buckets, or thresholds locally.",
    parameters: {
      exchange: input.exchange ?? null,
      min_rsi: input.min_rsi ?? null,
      min_mt_cnt: input.min_mt_cnt ?? null,
      effective_limit_overall: effectiveLimitOverall,
      limit_overall_is_caller_supplied: input.limit_overall !== undefined,
      effective_limit_bucket: effectiveLimitBucket,
      limit_bucket_is_caller_supplied: input.limit_bucket !== undefined
    },
    requestParameters,
    apiRequestParameters: requestParameters,
    signature: JSON.stringify({
      tool: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
      exchange: input.exchange ?? null,
      min_rsi: input.min_rsi ?? null,
      min_mt_cnt: input.min_mt_cnt ?? null,
      limit_overall: effectiveLimitOverall,
      limit_bucket: effectiveLimitBucket
    }),
    effectiveLimits: { limit_overall: effectiveLimitOverall, limit_bucket: effectiveLimitBucket },
    extraWarnings: [
      "Leadership tables are rotation context, not picks. Rows are API-ranked and API-bucketed and returned verbatim: no local ranking, re-scoring, re-bucketing, thresholding, or bucket merging occurs. weekdate (snapshot time-travel) and type (no verified enum) are not exposed. The credential-free resource stocktrends://leadership/definitions defines the indicators and taxonomy used."
    ]
  });
}

interface MarketContextExecutionContext {
  toolName: string;
  endpointPath: string;
  pricingRuleId: string;
  pricingRuleIds: readonly string[];
  contextKind: MarketContextKind;
  framing: string;
  parameters: Record<string, unknown>;
  requestParameters: Record<string, unknown>;
  apiRequestParameters: Record<string, unknown>;
  signature: string;
  effectiveLimits: Record<string, number>;
  extraWarnings: string[];
}

// The single coupled paid-execution path shared by the four market-context
// tools (identical gate ordering to the selections tool): structural gate, then
// the repeated-identical-call loop gate, then the full pricing/cap preflight,
// then the fail-closed family-scoped catalog reconciliation gate, then — only on
// approval — build the X-API-Key header, record the attempt (and the loop
// signature), perform exactly one fetch, and wrap the result.
async function executePaidMarketContext(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  loopState: MarketContextLoopState,
  context: MarketContextExecutionContext
): Promise<CallToolResult> {
  const paidAuthConfig: PaidAuthConfig = { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
  const targetUrl = new URL(context.endpointPath, config.apiBaseUrl);

  const structural = evaluatePaidInvocationPreflight(paidAuthConfig, {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: MARKET_CONTEXT_HTTP_METHOD,
    targetUrl
  });

  if (!structural.structurallyAuthorized) {
    const errorCode = DENIAL_REASON_TO_ERROR_CODE[structural.denialReason ?? "paid_execution_disabled"];
    return denyMarketContextInvocation(config, context, errorCode, {
      endpointAllowlisted: structural.endpointAllowlisted,
      toolAllowlisted: structural.toolAllowlisted,
      hostApproved: structural.hostApproved,
      paidModeConfigured: structural.paidModeConfigured,
      hardExecutionGateEnabled: structural.hardExecutionGateEnabled,
      estimatedCost: null,
      pricingSource: null,
      pricingRule: null,
      capUsage: snapshotPaidUsage(usage),
      reconciliation: reconciliationNotEvaluated()
    });
  }

  // Repeated-identical-call loop gate. Fails closed BEFORE pricing/auth/fetch
  // and never debits a cap when the signature is already executed OR already
  // in-flight (a concurrent identical call). This check runs synchronously and
  // does NOT reserve; the second caller returns here without disturbing the
  // first caller's reservation.
  if (loopState.executedSignatures.has(context.signature) || loopState.inFlightSignatures.has(context.signature)) {
    return denyMarketContextInvocation(config, context, "repeated_identical_market_context_call", {
      endpointAllowlisted: true,
      toolAllowlisted: true,
      hostApproved: true,
      paidModeConfigured: true,
      hardExecutionGateEnabled: structural.hardExecutionGateEnabled,
      estimatedCost: resolveStaticEndpointPricing(context.pricingRuleId),
      pricingSource: "pricing_catalog",
      pricingRule: context.pricingRuleId,
      capUsage: snapshotPaidUsage(usage),
      reconciliation: reconciliationNotEvaluated()
    });
  }

  // Reserve the signature SYNCHRONOUSLY, before the first async boundary
  // (catalog reconciliation) that can yield to a concurrent identical call. The
  // reservation is released in `finally` unless the call reaches an authorized
  // billable attempt (at which point the signature is promoted to executed and
  // stays there for the session).
  loopState.inFlightSignatures.add(context.signature);

  try {
    const estimatedCost = resolveStaticEndpointPricing(context.pricingRuleId);
    const usageSnapshot = snapshotPaidUsage(usage);
    const preflightInput: PaidPreflightEvaluationInput = {
      toolName: context.toolName,
      endpointPath: context.endpointPath,
      httpMethod: MARKET_CONTEXT_HTTP_METHOD,
      targetUrl,
      costEstimate: estimatedCost,
      usage: usageSnapshot
    };
    const decision = evaluatePaidPreflight(paidAuthConfig, preflightInput);

    if (decision.localPolicyDecision === "deny") {
      const errorCode = PREFLIGHT_DENIAL_TO_ERROR_CODE[decision.denialReason ?? "paid_execution_disabled"] ?? "paid_execution_disabled";
      return denyMarketContextInvocation(config, context, errorCode, {
        endpointAllowlisted: true,
        toolAllowlisted: true,
        hostApproved: true,
        paidModeConfigured: true,
        hardExecutionGateEnabled: structural.hardExecutionGateEnabled,
        estimatedCost: decision.estimatedCost,
        pricingSource: decision.pricingSource,
        pricingRule: decision.estimatedCost?.pricingRuleId ?? null,
        capUsage: usageSnapshot,
        reconciliation: reconciliationNotEvaluated()
      });
    }

    // Family-scoped catalog reconciliation gate (credential-free, fail-closed).
    // Reconciles ONLY this tool's family rule group (market, breadth, or
    // leadership) against the live catalog before any auth header or fetch. No
    // other family's mirror or state can satisfy it, and deferred-route rules
    // are not mirrored at all.
    const reconciliationResult = await reconcileStaticPricingWithCatalog(client, reconciliation, context.pricingRuleIds);

    if (!reconciliationResult.ok) {
      return denyMarketContextInvocation(config, context, "pricing_catalog_reconciliation_failed", {
        endpointAllowlisted: true,
        toolAllowlisted: true,
        hostApproved: true,
        paidModeConfigured: true,
        hardExecutionGateEnabled: structural.hardExecutionGateEnabled,
        estimatedCost: decision.estimatedCost,
        pricingSource: decision.pricingSource,
        pricingRule: decision.estimatedCost?.pricingRuleId ?? null,
        capUsage: usageSnapshot,
        reconciliation: reconciliationFromResult(reconciliationResult)
      });
    }

    // APPROVED. Construct the X-API-Key header inside the coupled boundary (this
    // re-runs and re-asserts the full preflight as defense in depth), then reach
    // the authorized billable attempt: promote the signature to executed (kept
    // for the session even on a deterministic API error), debit in-memory caps,
    // and perform exactly one fetch.
    const authHeaders = buildPaidAuthHeaders(paidAuthConfig, preflightInput);
    loopState.executedSignatures.add(context.signature);
    recordPaidCallAttempt(usage, context.toolName, estimatedCost);
    const capUsageAfter = snapshotPaidUsage(usage);
    const reconciliationSummary = reconciliationFromResult(reconciliationResult);

    let response: PaidEndpointResponse;

    try {
      response = await client.fetchPaid({
        endpointPath: context.endpointPath,
        toolName: context.toolName,
        searchParams: toSearchParams(context.apiRequestParameters),
        authHeaders
      });
    } catch (error) {
      return apiErrorResult(config, context, decision, estimatedCost, capUsageAfter, reconciliationSummary, error);
    }

    return successResult(config, context, decision, estimatedCost, capUsageAfter, reconciliationSummary, response);
  } finally {
    // Always clear the in-flight reservation on exit. On a pre-billable failure
    // the signature is NOT in `executedSignatures`, so a later retry is allowed;
    // once promoted to executed it stays blocked for the session regardless.
    loopState.inFlightSignatures.delete(context.signature);
  }
}

function reconciliationNotEvaluated(): PaidMarketContextPricingReconciliation {
  return { required: true, status: "not_evaluated", source: null, detail: null };
}

function reconciliationFromResult(result: PricingReconciliationResult): PaidMarketContextPricingReconciliation {
  return {
    required: true,
    status: result.ok ? "reconciled" : "failed",
    source: result.source,
    detail: result.detail
  };
}

interface DenialPreflightFacts {
  endpointAllowlisted: boolean;
  toolAllowlisted: boolean;
  hostApproved: boolean;
  paidModeConfigured: boolean;
  hardExecutionGateEnabled: boolean;
  estimatedCost: PaidCostEstimate | null;
  pricingSource: string | null;
  pricingRule: string | null;
  capUsage: ReturnType<typeof snapshotPaidUsage>;
  reconciliation: PaidMarketContextPricingReconciliation;
}

function denyMarketContextInvocation(
  config: StockTrendsMcpConfig,
  context: MarketContextExecutionContext,
  errorCode: MarketContextToolErrorCode,
  facts: DenialPreflightFacts
): CallToolResult {
  const metadata = buildToolMetadata(config.paidTools.spendPolicy, context, {
    decision: "deny",
    denialReason: errorCode,
    endpointAllowlisted: facts.endpointAllowlisted,
    toolAllowlisted: facts.toolAllowlisted,
    hostApproved: facts.hostApproved,
    paidModeConfigured: facts.paidModeConfigured,
    hardExecutionGateEnabled: facts.hardExecutionGateEnabled,
    estimatedCost: facts.estimatedCost,
    pricingSource: facts.pricingSource,
    pricingRule: facts.pricingRule,
    capUsage: facts.capUsage,
    reconciliation: facts.reconciliation,
    responseMetadata: emptyResponseMetadata(),
    returnedRowCount: null,
    apiReportedWeekdate: null,
    fetchedAt: null,
    paidExecutionAuthorized: false,
    extraWarnings: [denialWarning(errorCode), ...context.extraWarnings]
  });

  const wrapper = {
    error: {
      error_code: errorCode,
      message: denialMessage(errorCode),
      tool_name: context.toolName,
      endpoint_path: context.endpointPath,
      http_method: MARKET_CONTEXT_HTTP_METHOD,
      denial_reason: errorCode
    },
    mcp_metadata: metadata,
    paid_execution_authorized: false as const,
    paid_execution_occurred: false as const,
    api_request_sent: false as const,
    auth_header_sent: false as const,
    payment_header_sent: false as const
  };

  return failClosed(wrapper);
}

function successResult(
  config: StockTrendsMcpConfig,
  context: MarketContextExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidMarketContextPricingReconciliation,
  response: PaidEndpointResponse
): CallToolResult {
  const responseMetadata: PaidMarketContextResponseMetadata = {
    request_id: response.requestId,
    pricing_rule: response.headers.pricingRule,
    payment_required: response.headers.paymentRequired,
    accepted_payment_methods: response.headers.acceptedPaymentMethods,
    quota_limit: response.headers.quotaLimit,
    quota_period: response.headers.quotaPeriod,
    observed_cost: null,
    payment_status: null
  };

  const metadata = buildToolMetadata(config.paidTools.spendPolicy, context, {
    decision: "allow",
    denialReason: null,
    endpointAllowlisted: true,
    toolAllowlisted: true,
    hostApproved: true,
    paidModeConfigured: true,
    hardExecutionGateEnabled: true,
    estimatedCost,
    pricingSource: decision.pricingSource,
    pricingRule: response.headers.pricingRule ?? estimatedCost?.pricingRuleId ?? null,
    capUsage,
    reconciliation,
    responseMetadata,
    returnedRowCount: deriveReturnedRowCount(response.data),
    apiReportedWeekdate: deriveApiReportedWeekdate(response.data),
    fetchedAt: new Date().toISOString(),
    paidExecutionAuthorized: true,
    extraWarnings: context.extraWarnings
  });

  const wrapper = {
    // API payload preserved verbatim; never reshaped, ranked, re-bucketed,
    // re-aggregated, or recomputed locally.
    api_data: response.data,
    mcp_metadata: metadata,
    paid_execution_authorized: true as const,
    paid_execution_occurred: true as const,
    api_request_sent: true as const,
    auth_header_sent: true as const,
    payment_header_sent: false as const
  };

  return {
    structuredContent: wrapper as unknown as Record<string, unknown>,
    content: [
      {
        type: "text",
        text: JSON.stringify(wrapper, null, 2)
      }
    ]
  };
}

// An authorized call was sent (fetch occurred, X-API-Key sent) but the API
// returned an error/timeout/malformed response. Deterministic, secret-free, no
// retry, no downgrade to public data.
function apiErrorResult(
  config: StockTrendsMcpConfig,
  context: MarketContextExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidMarketContextPricingReconciliation,
  error: unknown
): CallToolResult {
  const errorCode = mapClientErrorToMarketContextCode(error);
  const metadata = buildToolMetadata(config.paidTools.spendPolicy, context, {
    decision: "allow",
    denialReason: null,
    endpointAllowlisted: true,
    toolAllowlisted: true,
    hostApproved: true,
    paidModeConfigured: true,
    hardExecutionGateEnabled: true,
    estimatedCost,
    pricingSource: decision.pricingSource,
    pricingRule: estimatedCost?.pricingRuleId ?? null,
    capUsage,
    reconciliation,
    responseMetadata: emptyResponseMetadata(),
    returnedRowCount: null,
    apiReportedWeekdate: null,
    fetchedAt: new Date().toISOString(),
    paidExecutionAuthorized: false,
    extraWarnings: [apiErrorWarning(errorCode), ...context.extraWarnings]
  });

  const wrapper = {
    error: {
      error_code: errorCode,
      message: apiErrorMessage(errorCode),
      tool_name: context.toolName,
      endpoint_path: context.endpointPath,
      http_method: MARKET_CONTEXT_HTTP_METHOD,
      denial_reason: errorCode
    },
    mcp_metadata: metadata,
    paid_execution_authorized: false as const,
    paid_execution_occurred: false as const,
    api_request_sent: true as const,
    auth_header_sent: true as const,
    payment_header_sent: false as const
  };

  return failClosed(wrapper);
}

interface ToolMetadataFacts {
  decision: "allow" | "deny";
  denialReason: MarketContextToolErrorCode | null;
  endpointAllowlisted: boolean;
  toolAllowlisted: boolean;
  hostApproved: boolean;
  paidModeConfigured: boolean;
  hardExecutionGateEnabled: boolean;
  estimatedCost: PaidCostEstimate | null;
  pricingSource: string | null;
  pricingRule: string | null;
  capUsage: ReturnType<typeof snapshotPaidUsage>;
  reconciliation: PaidMarketContextPricingReconciliation;
  responseMetadata: PaidMarketContextResponseMetadata;
  returnedRowCount: number | null;
  apiReportedWeekdate: string | null;
  fetchedAt: string | null;
  paidExecutionAuthorized: boolean;
  extraWarnings: string[];
}

function buildToolMetadata(
  spendPolicy: PaidSpendPolicy,
  context: MarketContextExecutionContext,
  facts: ToolMetadataFacts
): PaidMarketContextToolMetadata {
  return {
    tool_name: context.toolName,
    endpoint_path: context.endpointPath,
    http_method: MARKET_CONTEXT_HTTP_METHOD,
    source: "stocktrends_api",
    market_context_parameters: context.parameters,
    provenance: {
      context_kind: context.contextKind,
      api_authored_context: true,
      context_not_advice: true,
      framing: context.framing,
      locally_computed: false,
      locally_ranked: false,
      locally_scored: false,
      locally_bucketed: false,
      locally_aggregated: false,
      locally_thresholded: false,
      locally_filtered: false
    },
    request_parameters: context.requestParameters,
    api_request_parameters: context.apiRequestParameters,
    preflight_decision_summary: {
      endpoint_allowlisted: facts.endpointAllowlisted,
      tool_allowlisted: facts.toolAllowlisted,
      host_approved: facts.hostApproved,
      paid_mode_configured: facts.paidModeConfigured,
      pricing_source: facts.pricingSource,
      pricing_rule: facts.pricingRule,
      estimated_cost: facts.estimatedCost ? { amount: facts.estimatedCost.amount, unit: facts.estimatedCost.unit } : null,
      hard_execution_gate_enabled: facts.hardExecutionGateEnabled,
      local_authorization_decision: facts.decision,
      denial_reason: facts.denialReason
    },
    pricing_reconciliation: facts.reconciliation,
    local_budget_cap_status: buildCapStatus(spendPolicy, context.toolName, facts.capUsage),
    response_metadata: facts.responseMetadata,
    request_id: facts.responseMetadata.request_id,
    pricing_rule: facts.pricingRule,
    observed_cost: null,
    payment_status: null,
    effective_limits: context.effectiveLimits,
    returned_row_count: facts.returnedRowCount,
    api_reported_weekdate: facts.apiReportedWeekdate,
    pricing_policy_version: STATIC_PRICING_POLICY_VERSION,
    authoritative_for: "Stock Trends API-authored market-context data returned by the Stock Trends API",
    not_authoritative_for: [
      "investment advice",
      "trading recommendations or confirmation signals",
      "stock picks",
      "payment authorization",
      "future performance guarantee"
    ],
    fetched_at: facts.fetchedAt,
    paid_execution_authorized: facts.paidExecutionAuthorized,
    warnings: facts.extraWarnings,
    limitations: marketContextLimitations()
  };
}

function marketContextLimitations(): string[] {
  return [
    "This tool returns Stock Trends API-authored market context (regime, breadth, or leadership) verbatim; it does not recompute, re-rank, re-score, re-bucket, re-aggregate, threshold, summarize, rewrite, or filter any of it locally, and does not produce buy/sell/hold/allocation conclusions or suitability analysis.",
    "Regime labels are market context, not trading recommendations; breadth rows are participation context, not confirmation signals to act on; leadership tables are rotation context, not picks.",
    "Broad-sweep safe: every MCP limit parameter is always sent explicitly and hard-capped (regime history max 52; breadth max 250; leadership max 200/50); there is no all-rows mode, no weekdate snapshot time-travel, exactly one GET per invocation, and no pagination, date-range sweeping, exchange iteration, bulk assembly, background refresh, or automatic retry. Repeated identical calls fail closed rather than re-billing.",
    "Static local pricing cannot authorize a paid call by itself; it must reconcile against the live /v1/pricing/catalog metadata (credential-free, family-scoped to market/breadth/leadership) before any auth header or fetch. The catalog is metadata reconciliation only, never authorization by itself.",
    "Subscription/API-key mode returns no observed per-call cost and no payment settlement; observed_cost and payment_status are null and never fabricated. Freshness/weekdate fields are captured only when present in the API payload.",
    "The deferred routes /v1/market/regime/forecast, /v1/breadth/sector/history, and /v1/leadership/rotation/history are not reachable through this adapter. x402, wallets, OAuth, remote MCP, and Bearer-header fallback remain deferred; local spend caps are in-memory only and reset on server restart."
  ];
}

function buildCapStatus(
  spendPolicy: PaidSpendPolicy,
  toolName: string,
  capUsage: ReturnType<typeof snapshotPaidUsage>
): PaidMarketContextLocalCapStatus {
  return {
    max_paid_calls_per_session: spendPolicy.maxPaidCallsPerSession,
    max_paid_calls_per_tool: spendPolicy.maxPaidCallsPerTool,
    max_stc_per_session: spendPolicy.maxStcPerSession,
    max_usd_per_session: spendPolicy.maxUsdPerSession,
    paid_calls_this_session: capUsage.paidCallsThisSession ?? 0,
    paid_calls_this_tool: capUsage.paidCallsByTool?.[toolName] ?? 0,
    stc_spent_this_session: capUsage.stcSpentThisSession ?? 0,
    usd_spent_this_session: capUsage.usdSpentThisSession ?? 0,
    automatic_paid_retries: false
  };
}

function emptyResponseMetadata(): PaidMarketContextResponseMetadata {
  return {
    request_id: null,
    pricing_rule: null,
    payment_required: null,
    accepted_payment_methods: null,
    quota_limit: null,
    quota_period: null,
    observed_cost: null,
    payment_status: null
  };
}

// Row-count transparency only. Look for the first array-valued field among the
// likely container keys of the unconstrained market-context payloads. Returns
// `null` when no such array exists (never a second ranking/filtering pass).
function deriveReturnedRowCount(data: JsonObject): number | null {
  for (const key of ["data", "rows", "results", "items", "history", "regimes", "groups", "sectors", "buckets", "leaders"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return null;
}

// Freshness capture-if-present only: the top-level API-reported weekdate string
// when the unconstrained payload provides one. Never fabricated, never used to
// re-request other weeks.
function deriveApiReportedWeekdate(data: JsonObject): string | null {
  const value = data.weekdate;
  return typeof value === "string" && value.trim() ? value : null;
}

function toSearchParams(parameters: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined || value === null) {
      continue;
    }

    params.append(key, typeof value === "string" ? value : String(value));
  }

  return params;
}

// --- Message builders ---

function denialMessage(errorCode: MarketContextToolErrorCode): string {
  switch (errorCode) {
    case "paid_execution_disabled":
      return "Paid market-context execution is not enabled. No API request was sent and no auth header was constructed.";
    case "paid_tools_disabled":
      return "Paid market-context tools are disabled. No API request was sent.";
    case "paid_auth_blocked_missing_api_key":
      return "Paid mode is enabled but no API key is configured. No API request was sent.";
    case "endpoint_not_allowlisted":
      return "The requested endpoint is not on the paid endpoint allowlist. No API request was sent.";
    case "tool_endpoint_mismatch":
      return "The tool does not map to the requested paid endpoint. No API request was sent.";
    case "host_not_approved":
      return "The target host is not the approved Stock Trends API origin. No API request was sent.";
    case "pricing_preflight_unavailable":
      return "Required pricing/preflight could not be resolved authoritatively. No API request was sent.";
    case "pricing_catalog_reconciliation_failed":
      return "Static market-context pricing could not be reconciled against the live pricing catalog. Live paid execution fails closed; no auth header was constructed and no API request was sent.";
    case "cost_unavailable":
      return "The endpoint cost could not be determined. No API request was sent.";
    case "unsupported_cost_unit":
      return "The resolved cost unit is not supported for local budgeting. No API request was sent.";
    case "spend_cap_exceeded":
      return "The call would exceed a local paid spend cap (or a required cap is unset). No API request was sent.";
    case "repeated_identical_market_context_call":
      return "An identical market-context call was already executed or is in flight in this session. Market-context data is weekly; the call fails closed rather than re-billing. No API request was sent and no auth header was constructed.";
    case "unexpected_auth_attempt":
      return "An auth header was requested before all gates passed and was refused. No API request was sent.";
    default:
      return "Paid market-context execution was denied by local policy. No API request was sent.";
  }
}

function denialWarning(errorCode: MarketContextToolErrorCode): string {
  if (errorCode === "spend_cap_exceeded") {
    return "Paid market-context execution was denied by a local spend cap (per-session/per-tool call cap or STC/USD budget cap). Every market-context rule is nonzero STC, so a covering STC budget cap plus nonzero call caps are required; no request was sent.";
  }

  if (errorCode === "paid_execution_disabled") {
    return "Paid market-context execution is not enabled (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true, or the build is not execution-capable). No API request was sent and no auth or payment header was constructed.";
  }

  if (errorCode === "pricing_catalog_reconciliation_failed") {
    return "Static local market-context pricing did not reconcile against the live /v1/pricing/catalog metadata (unavailable, malformed, ambiguous, or mismatched rule id/endpoint/family/cost/unit). Reconciliation is family-scoped to exactly this tool's market/breadth/leadership rule group; no other family's mirror can satisfy it. Static pricing alone cannot authorize a paid call; execution fails closed before any auth header or fetch.";
  }

  if (errorCode === "repeated_identical_market_context_call") {
    return "A repeated identical market-context call was detected within this session (same tool and normalized parameters). Market-context data is weekly-cadence, so an identical repeat would re-bill identical data; the repeat fails closed before pricing/auth/fetch. Vary the parameters or start a new session to make a distinct call.";
  }

  return "Paid market-context execution was denied before any request; no API request was sent and no auth or payment header was constructed.";
}

function mapClientErrorToMarketContextCode(error: unknown): MarketContextToolErrorCode {
  if (!(error instanceof StockTrendsMcpError)) {
    return "api_request_failed";
  }

  switch (error.errorCode) {
    case "timeout":
      return "api_timeout";
    case "api_unavailable":
      return "api_request_failed";
    case "api_unapproved_redirect":
      return "api_unapproved_redirect";
    case "unexpected_auth_required":
      return "api_auth_required";
    case "unexpected_paid_endpoint":
      return "api_payment_required";
    case "unexpected_forbidden":
      return "api_forbidden";
    case "api_not_found":
      return "api_not_found";
    case "api_rate_limited":
      return "api_rate_limited";
    case "api_unexpected_status":
      return "api_unexpected_status";
    case "malformed_api_response":
      return "malformed_api_response";
    default:
      return "api_request_failed";
  }
}

function apiErrorMessage(errorCode: MarketContextToolErrorCode): string {
  switch (errorCode) {
    case "api_timeout":
      return "The Stock Trends paid market-context request timed out. Exactly one attempt was made; no automatic retry occurred.";
    case "api_payment_required":
      return "The Stock Trends API returned 402 Payment Required. No x402 payment was signed, sent, or retried; the response is surfaced as safe metadata only.";
    case "api_auth_required":
      return "The Stock Trends API returned 401 Unauthorized. No retry, no header switch, and no downgrade to public data occurred.";
    case "api_forbidden":
      return "The Stock Trends API returned 403 Forbidden. No retry occurred.";
    case "api_not_found":
      return "The Stock Trends API returned 404 Not Found for the requested market-context data. No retry occurred.";
    case "api_rate_limited":
      return "The Stock Trends API returned 429 Too Many Requests. No automatic retry occurred.";
    case "api_unapproved_redirect":
      return "The Stock Trends API returned an unapproved redirect. The request was not followed.";
    case "malformed_api_response":
      return "The Stock Trends API returned a malformed or non-JSON market-context response.";
    case "api_unexpected_status":
      return "The Stock Trends API returned an unexpected status for the market-context request.";
    default:
      return "The Stock Trends paid market-context request failed. Exactly one attempt was made; no automatic retry occurred.";
  }
}

function apiErrorWarning(errorCode: MarketContextToolErrorCode): string {
  if (errorCode === "api_payment_required") {
    return "A 402 Payment Required was returned. This adapter does not implement x402/wallet payment: nothing was signed, paid, or retried, and no alternate endpoint or auth was attempted.";
  }

  return "The authorized paid market-context call was sent (X-API-Key only) but did not complete successfully. Exactly one attempt was made with no automatic retry and no fallback to Bearer, an alternate endpoint, or public data.";
}

function failClosed(output: object): CallToolResult {
  return {
    structuredContent: output as Record<string, unknown>,
    content: [
      {
        type: "text",
        text: JSON.stringify(output, null, 2)
      }
    ],
    isError: true
  };
}
