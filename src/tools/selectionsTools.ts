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
  reconcileStaticPricingWithCatalog,
  resolveStaticEndpointPricing,
  SELECTIONS_PRICING_RULE_IDS,
  STATIC_PRICING_POLICY_VERSION,
  type PaidPricingReconciliationState,
  type PricingReconciliationResult
} from "../paidPricing.js";
import type { JsonObject, PaidEndpointResponse, StockTrendsClient } from "../stocktrendsClient.js";

// --- Confirmed contract constants (see PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md) ---

export const SELECTIONS_LATEST_TOOL_NAME = "stocktrends_get_selections_latest";
export const SELECTIONS_LATEST_ENDPOINT_PATH = "/v1/selections/latest";
export const SELECTIONS_HTTP_METHOD: PaidHttpMethod = "GET";
export const SELECTIONS_LATEST_PRICING_RULE_ID = "selections_latest_paid";

// The published STIM Select list is a SEPARATE endpoint that applies published
// thresholds; this tool never forwards to it and never applies those thresholds
// locally. Recorded in metadata so agents cannot conflate the two surfaces.
export const SELECTIONS_PUBLISHED_LATEST_ENDPOINT_PATH = "/v1/selections/published/latest";

// Confirmed API `VALID_EXCHANGES`. Selections `exchange` is an optional scope;
// the MCP validates it conservatively against the known single-letter exchange
// codes and fails closed on anything else.
export const VALID_SELECTIONS_EXCHANGES = ["N", "Q", "A", "B", "T", "I"] as const;

// List-shaped broad-sweep / limit-safety policy (PHASE5C memo §9). These are
// MCP-side caps FAR tighter than the API's own default (2000) and hard max
// (20000). The MCP always sends an explicit `limit`, never omits it, and never
// permits an "all rows" sweep.
export const SELECTIONS_DEFAULT_LIMIT = 50;
export const SELECTIONS_MAX_LIMIT = 250;
export const SELECTIONS_MIN_LIMIT = 1;

export interface PaidSelectionsToolDefinition {
  name: typeof SELECTIONS_LATEST_TOOL_NAME;
  endpointPath: typeof SELECTIONS_LATEST_ENDPOINT_PATH;
  httpMethod: typeof SELECTIONS_HTTP_METHOD;
  access: "paid";
}

// Single base-selections tool this increment. No `history` sibling (the
// history-beside-latest pairing rule is a single-symbol convenience; for a
// universe/list family history multiplies the broad-sweep surface and is
// deferred — memo §3, §8). `selections/latest` is not symbol-keyed, so shipping
// it alone creates no latest-only interpretation gap.
export const PAID_SELECTIONS_TOOL_DEFINITIONS: readonly PaidSelectionsToolDefinition[] = Object.freeze([
  {
    name: SELECTIONS_LATEST_TOOL_NAME,
    endpointPath: SELECTIONS_LATEST_ENDPOINT_PATH,
    httpMethod: SELECTIONS_HTTP_METHOD,
    access: "paid"
  }
]);

export const PAID_SELECTIONS_TOOL_NAMES: readonly string[] = Object.freeze(
  PAID_SELECTIONS_TOOL_DEFINITIONS.map((tool) => tool.name)
);

// --- Input schema (strict; list-shaped limit bounds validated at the SDK boundary) ---
//
// `limit` is bounded to the inclusive MCP range 1..250 as an integer. Values
// above 250, below 1, non-integers, arrays, and sentinels are rejected at the
// strict schema boundary BEFORE any pricing/auth/fetch. Unknown keys are
// rejected by `.strict()`. None of these filters is applied locally to the rows;
// `min_prob13wk`/`exchange`/`cs_only`/`include_*` are passed through to the API
// only.
const exchangeField = z.enum(VALID_SELECTIONS_EXCHANGES).optional();

export const selectionsLatestInputSchema = z
  .object({
    exchange: exchangeField,
    min_prob13wk: z.number().finite().min(0).max(1).optional(),
    limit: z.number().int().min(SELECTIONS_MIN_LIMIT).max(SELECTIONS_MAX_LIMIT).optional(),
    include_data: z.boolean().optional(),
    include_mast: z.boolean().optional(),
    cs_only: z.boolean().optional()
  })
  .strict();

type SelectionsLatestInput = z.infer<typeof selectionsLatestInputSchema>;

// --- Error taxonomy (tool-facing, deterministic, secret-free) ---

export type SelectionsToolErrorCode =
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
  | "repeated_identical_selection_call"
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

const DENIAL_REASON_TO_ERROR_CODE: Record<PaidInvocationDenialReason, SelectionsToolErrorCode> = {
  paid_tools_disabled: "paid_tools_disabled",
  paid_auth_blocked_missing_api_key: "paid_auth_blocked_missing_api_key",
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "tool_endpoint_mismatch",
  host_not_approved: "host_not_approved",
  paid_execution_disabled: "paid_execution_disabled"
};

const PREFLIGHT_DENIAL_TO_ERROR_CODE: Record<string, SelectionsToolErrorCode> = {
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

export interface PaidSelectionsPreflightSummary {
  endpoint_allowlisted: boolean;
  tool_allowlisted: boolean;
  host_approved: boolean;
  paid_mode_configured: boolean;
  pricing_source: string | null;
  pricing_rule: string | null;
  estimated_cost: { amount: number; unit: string } | null;
  hard_execution_gate_enabled: boolean;
  local_authorization_decision: "allow" | "deny";
  denial_reason: SelectionsToolErrorCode | null;
}

export interface PaidSelectionsLocalCapStatus {
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

// Effective, normalized selection parameters. `effective_limit` is the limit
// actually sent to the API (never absent). The remaining fields echo the
// caller's supplied values (null when not supplied); none is applied locally.
export interface PaidSelectionsParameters {
  exchange: string | null;
  min_prob13wk: number | null;
  effective_limit: number;
  limit_is_caller_supplied: boolean;
  include_data: boolean | null;
  include_mast: boolean | null;
  cs_only: boolean | null;
}

// Base-vs-published provenance (memo §7). This tool surfaces the BASE ST-IM
// selection universe, never the published STIM Select list, and never applies
// the published thresholds locally.
export interface PaidSelectionsProvenance {
  selection_universe: "base_stim_selection_universe";
  is_published_stim_select_list: false;
  published_list_endpoint: typeof SELECTIONS_PUBLISHED_LATEST_ENDPOINT_PATH;
  locally_ranked: false;
  locally_thresholded: false;
  locally_scored: false;
  locally_filtered: false;
}

export interface PaidSelectionsPricingReconciliation {
  required: true;
  status: "reconciled" | "failed" | "not_evaluated";
  source: "pricing_catalog" | null;
  detail: string | null;
}

export interface PaidSelectionsResponseMetadata {
  request_id: string | null;
  pricing_rule: string | null;
  payment_required: string | null;
  accepted_payment_methods: string | null;
  quota_limit: string | null;
  quota_period: string | null;
  observed_cost: null;
  payment_status: null;
}

export interface PaidSelectionsToolMetadata {
  tool_name: string;
  endpoint_path: string;
  http_method: typeof SELECTIONS_HTTP_METHOD;
  source: "stocktrends_api";
  selection_parameters: PaidSelectionsParameters;
  provenance: PaidSelectionsProvenance;
  request_parameters: Record<string, unknown>;
  api_request_parameters: Record<string, unknown>;
  preflight_decision_summary: PaidSelectionsPreflightSummary;
  pricing_reconciliation: PaidSelectionsPricingReconciliation;
  local_budget_cap_status: PaidSelectionsLocalCapStatus;
  response_metadata: PaidSelectionsResponseMetadata;
  request_id: string | null;
  pricing_rule: string | null;
  observed_cost: null;
  payment_status: null;
  // Row-count transparency (memo §9.8). Metadata only, never a second ranking
  // or thresholding pass. `null` when the returned shape has no derivable count.
  effective_limit: number;
  returned_row_count: number | null;
  pricing_policy_version: string;
  authoritative_for: string;
  not_authoritative_for: string[];
  fetched_at: string | null;
  paid_execution_authorized: boolean;
  warnings: string[];
  limitations: string[];
}

// --- Per-server repeated-identical-call loop state (memo §9.7) ---
//
// Repeated identical selection calls (same normalized exchange / min_prob13wk /
// effective limit / include_data / include_mast / cs_only) within a server
// session are the runaway-loop surface of SECURITY_MODEL §7. A signature is
// recorded ONLY when an authorized billable call is actually attempted; a
// subsequent identical call fails closed deterministically
// (`repeated_identical_selection_call`) BEFORE any pricing/auth/fetch/cap debit,
// rather than silently re-billing. In-memory only; resets on server restart.
export interface SelectionsLoopState {
  executedSignatures: Set<string>;
}

export function createSelectionsLoopState(): SelectionsLoopState {
  return { executedSignatures: new Set<string>() };
}

// --- Registration ---

export function registerPaidSelectionsTools(
  server: McpServer,
  client: StockTrendsClient,
  config: StockTrendsMcpConfig,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState
): void {
  // Same exposure gate as the ST-IM / indicators pairs: the base-selections tool
  // definition is exposed only when paid mode is explicitly enabled AND an API
  // key is configured. Exposure is independent of the execution flag. Registering
  // this single tool brings the paid-exposed surface to exactly six tools; the
  // default/free surface stays at exactly one.
  if (!shouldExposePaidSelectionsTools(config)) {
    return;
  }

  // Per-server loop state, captured by the handler closure. Lives for this
  // server instance only and resets on restart (no persistence).
  const loopState = createSelectionsLoopState();

  server.registerTool(
    SELECTIONS_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Base ST-IM Selection Universe (paid)",
      description:
        "Paid selections tool for GET /v1/selections/latest. Returns the BASE ST-IM selection universe (ranked by prob13wk) exactly as the Stock Trends API returns it — this is NOT the strict published STIM Select list, which is a separate endpoint (/v1/selections/published/latest) that applies published thresholds. This tool never applies those published thresholds and never ranks, thresholds, scores, or filters rows locally. It is exchange-scoped, not symbol-keyed. Broad-sweep safe: an explicit limit is always sent (default 50, hard max 250), exactly one GET per invocation, no pagination/bulk/auto-iteration/retry, and repeated identical calls fail closed. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, selections-family catalog reconciliation, and nonzero local caps (plus a covering STC budget) all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: selectionsLatestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: SELECTIONS_LATEST_ENDPOINT_PATH,
        method: SELECTIONS_HTTP_METHOD,
        source: "selections_latest"
      }
    },
    async (input) => handleSelectionsLatestTool(config, client, usage, reconciliation, loopState, input as SelectionsLatestInput)
  );
}

export function shouldExposePaidSelectionsTools(config: StockTrendsMcpConfig): boolean {
  return config.paidTools.requested && config.paidTools.apiKeyConfigured;
}

export function listPaidSelectionsToolNames(): string[] {
  return [...PAID_SELECTIONS_TOOL_NAMES];
}

// --- Handler ---

async function handleSelectionsLatestTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  loopState: SelectionsLoopState,
  input: SelectionsLatestInput
): Promise<CallToolResult> {
  const effectiveLimit = input.limit ?? SELECTIONS_DEFAULT_LIMIT;
  const parameters = buildSelectionParameters(input, effectiveLimit);
  const requestParameters = buildRequestParameters(input, effectiveLimit);
  const signature = buildCallSignature(input, effectiveLimit);

  return executePaidSelections(config, client, usage, reconciliation, loopState, {
    toolName: SELECTIONS_LATEST_TOOL_NAME,
    endpointPath: SELECTIONS_LATEST_ENDPOINT_PATH,
    pricingRuleId: SELECTIONS_LATEST_PRICING_RULE_ID,
    parameters,
    requestParameters,
    // The API request parameters are identical to the echoed request parameters
    // for this exchange-scoped tool (no symbol hyphen/underscore rewrite).
    apiRequestParameters: requestParameters,
    signature,
    effectiveLimit,
    extraWarnings: [
      "This is the BASE ST-IM selection universe, not the published STIM Select list; the published list is a separate endpoint (/v1/selections/published/latest) applying published thresholds. Rows are returned verbatim and are not ranked, thresholded, scored, or filtered locally."
    ]
  });
}

interface SelectionsExecutionContext {
  toolName: string;
  endpointPath: string;
  pricingRuleId: string;
  parameters: PaidSelectionsParameters;
  requestParameters: Record<string, unknown>;
  apiRequestParameters: Record<string, unknown>;
  signature: string;
  effectiveLimit: number;
  extraWarnings: string[];
}

// The single coupled paid-execution path (identical gate ordering to the ST-IM /
// indicators tools, plus list-shaped loop detection): structural gate, then the
// repeated-identical-call loop gate, then the full pricing/cap preflight, then
// the fail-closed selections-family catalog reconciliation gate, then — only on
// approval — build the X-API-Key header, record the attempt (and the loop
// signature), perform exactly one fetch, and wrap the result.
async function executePaidSelections(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  loopState: SelectionsLoopState,
  context: SelectionsExecutionContext
): Promise<CallToolResult> {
  const paidAuthConfig: PaidAuthConfig = { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
  const targetUrl = new URL(context.endpointPath, config.apiBaseUrl);

  const structural = evaluatePaidInvocationPreflight(paidAuthConfig, {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: SELECTIONS_HTTP_METHOD,
    targetUrl
  });

  if (!structural.structurallyAuthorized) {
    const errorCode = DENIAL_REASON_TO_ERROR_CODE[structural.denialReason ?? "paid_execution_disabled"];
    return denySelectionsInvocation(config, context, errorCode, {
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

  // Repeated-identical-call loop gate. Fails closed BEFORE pricing/auth/fetch and
  // never debits a cap, so a runaway agent re-issuing the same broad-sweep call
  // is not silently re-billed.
  if (loopState.executedSignatures.has(context.signature)) {
    return denySelectionsInvocation(config, context, "repeated_identical_selection_call", {
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

  const estimatedCost = resolveStaticEndpointPricing(context.pricingRuleId);
  const usageSnapshot = snapshotPaidUsage(usage);
  const preflightInput: PaidPreflightEvaluationInput = {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: SELECTIONS_HTTP_METHOD,
    targetUrl,
    costEstimate: estimatedCost,
    usage: usageSnapshot
  };
  const decision = evaluatePaidPreflight(paidAuthConfig, preflightInput);

  if (decision.localPolicyDecision === "deny") {
    const errorCode = PREFLIGHT_DENIAL_TO_ERROR_CODE[decision.denialReason ?? "paid_execution_disabled"] ?? "paid_execution_disabled";
    return denySelectionsInvocation(config, context, errorCode, {
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

  // Selections-family catalog reconciliation gate (credential-free, fail-closed).
  // Reconciles ONLY the base `selections` pricing rules against the live catalog
  // before any auth header or fetch. A `selections_published`/ST-IM/indicators
  // mirror can never satisfy it.
  const reconciliationResult = await reconcileStaticPricingWithCatalog(client, reconciliation, SELECTIONS_PRICING_RULE_IDS);

  if (!reconciliationResult.ok) {
    return denySelectionsInvocation(config, context, "pricing_catalog_reconciliation_failed", {
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
  // re-runs and re-asserts the full preflight as defense in depth), record the
  // attempt against in-memory caps AND the loop signature, then perform exactly
  // one fetch.
  const authHeaders = buildPaidAuthHeaders(paidAuthConfig, preflightInput);
  recordPaidCallAttempt(usage, context.toolName, estimatedCost);
  loopState.executedSignatures.add(context.signature);
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
}

function reconciliationNotEvaluated(): PaidSelectionsPricingReconciliation {
  return { required: true, status: "not_evaluated", source: null, detail: null };
}

function reconciliationFromResult(result: PricingReconciliationResult): PaidSelectionsPricingReconciliation {
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
  reconciliation: PaidSelectionsPricingReconciliation;
}

function denySelectionsInvocation(
  config: StockTrendsMcpConfig,
  context: SelectionsExecutionContext,
  errorCode: SelectionsToolErrorCode,
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
      http_method: SELECTIONS_HTTP_METHOD,
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
  context: SelectionsExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidSelectionsPricingReconciliation,
  response: PaidEndpointResponse
): CallToolResult {
  const responseMetadata: PaidSelectionsResponseMetadata = {
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
    fetchedAt: new Date().toISOString(),
    paidExecutionAuthorized: true,
    extraWarnings: context.extraWarnings
  });

  const wrapper = {
    // API rows preserved verbatim; never reshaped, ranked, thresholded, or
    // scored locally.
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
  context: SelectionsExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidSelectionsPricingReconciliation,
  error: unknown
): CallToolResult {
  const errorCode = mapClientErrorToSelectionsCode(error);
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
      http_method: SELECTIONS_HTTP_METHOD,
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
  denialReason: SelectionsToolErrorCode | null;
  endpointAllowlisted: boolean;
  toolAllowlisted: boolean;
  hostApproved: boolean;
  paidModeConfigured: boolean;
  hardExecutionGateEnabled: boolean;
  estimatedCost: PaidCostEstimate | null;
  pricingSource: string | null;
  pricingRule: string | null;
  capUsage: ReturnType<typeof snapshotPaidUsage>;
  reconciliation: PaidSelectionsPricingReconciliation;
  responseMetadata: PaidSelectionsResponseMetadata;
  returnedRowCount: number | null;
  fetchedAt: string | null;
  paidExecutionAuthorized: boolean;
  extraWarnings: string[];
}

function buildToolMetadata(
  spendPolicy: PaidSpendPolicy,
  context: SelectionsExecutionContext,
  facts: ToolMetadataFacts
): PaidSelectionsToolMetadata {
  return {
    tool_name: context.toolName,
    endpoint_path: context.endpointPath,
    http_method: SELECTIONS_HTTP_METHOD,
    source: "stocktrends_api",
    selection_parameters: context.parameters,
    provenance: {
      selection_universe: "base_stim_selection_universe",
      is_published_stim_select_list: false,
      published_list_endpoint: SELECTIONS_PUBLISHED_LATEST_ENDPOINT_PATH,
      locally_ranked: false,
      locally_thresholded: false,
      locally_scored: false,
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
    effective_limit: context.effectiveLimit,
    returned_row_count: facts.returnedRowCount,
    pricing_policy_version: STATIC_PRICING_POLICY_VERSION,
    authoritative_for: "Stock Trends API base ST-IM selection universe data returned by the Stock Trends API",
    not_authoritative_for: [
      "investment advice",
      "payment authorization",
      "future performance guarantee",
      "the published STIM Select list"
    ],
    fetched_at: facts.fetchedAt,
    paid_execution_authorized: facts.paidExecutionAuthorized,
    warnings: facts.extraWarnings,
    limitations: selectionsLimitations()
  };
}

function selectionsLimitations(): string[] {
  return [
    "This tool returns the Stock Trends API-authored BASE ST-IM selection universe; it does not rank, threshold, score, filter, or otherwise recompute rows locally, and does not produce buy/sell/hold/allocation conclusions.",
    "This is NOT the published STIM Select list. The published list is a separate endpoint (/v1/selections/published/latest) that applies published thresholds; those thresholds are never applied here.",
    "Broad-sweep safe: an explicit limit is always sent (default 50, hard max 250); there is no all-rows/universe-sweep mode, exactly one GET per invocation, and no pagination, bulk automation, auto-iteration, or automatic retry. Repeated identical calls fail closed rather than re-billing.",
    "Static local pricing cannot authorize a paid call by itself; it must reconcile against the live /v1/pricing/catalog metadata (credential-free, selections-family-scoped) before any auth header or fetch. The catalog is metadata reconciliation only, never authorization by itself.",
    "Subscription/API-key mode returns no observed per-call cost and no payment settlement; observed_cost and payment_status are null and never fabricated.",
    "x402, wallets, OAuth, remote MCP, and Bearer-header fallback remain deferred; local spend caps are in-memory only and reset on server restart."
  ];
}

function buildCapStatus(
  spendPolicy: PaidSpendPolicy,
  toolName: string,
  capUsage: ReturnType<typeof snapshotPaidUsage>
): PaidSelectionsLocalCapStatus {
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

function emptyResponseMetadata(): PaidSelectionsResponseMetadata {
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

// --- Parameter / signature builders ---

function buildSelectionParameters(input: SelectionsLatestInput, effectiveLimit: number): PaidSelectionsParameters {
  return {
    exchange: input.exchange ?? null,
    min_prob13wk: input.min_prob13wk ?? null,
    effective_limit: effectiveLimit,
    limit_is_caller_supplied: input.limit !== undefined,
    include_data: input.include_data ?? null,
    include_mast: input.include_mast ?? null,
    cs_only: input.cs_only ?? null
  };
}

// Build the outbound query. `limit` is ALWAYS present (default 50 when omitted).
// Every other supplied filter is forwarded to the API only; none is applied
// locally. Omitted booleans/threshold/exchange are not sent so the API applies
// its documented defaults.
function buildRequestParameters(input: SelectionsLatestInput, effectiveLimit: number): Record<string, unknown> {
  const parameters: Record<string, unknown> = { limit: effectiveLimit };

  if (input.exchange !== undefined) {
    parameters.exchange = input.exchange;
  }

  if (input.min_prob13wk !== undefined) {
    parameters.min_prob13wk = input.min_prob13wk;
  }

  if (input.include_data !== undefined) {
    parameters.include_data = input.include_data;
  }

  if (input.include_mast !== undefined) {
    parameters.include_mast = input.include_mast;
  }

  if (input.cs_only !== undefined) {
    parameters.cs_only = input.cs_only;
  }

  return parameters;
}

// A deterministic signature over the NORMALIZED, effective selection parameters
// (effective limit, and effective boolean/threshold/exchange values). Two calls
// that resolve to the same effective request share a signature even if one
// supplied a default explicitly and the other omitted it.
function buildCallSignature(input: SelectionsLatestInput, effectiveLimit: number): string {
  return JSON.stringify({
    exchange: input.exchange ?? null,
    min_prob13wk: input.min_prob13wk ?? null,
    limit: effectiveLimit,
    include_data: input.include_data ?? false,
    include_mast: input.include_mast ?? false,
    cs_only: input.cs_only ?? true
  });
}

// Row-count transparency only. Look for the first array-valued field among the
// likely container keys of the unconstrained selections payload. Returns `null`
// when no such array exists (never a second ranking/thresholding pass).
function deriveReturnedRowCount(data: JsonObject): number | null {
  for (const key of ["data", "selections", "rows", "results", "items"]) {
    const value = data[key];
    if (Array.isArray(value)) {
      return value.length;
    }
  }

  return null;
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

function denialMessage(errorCode: SelectionsToolErrorCode): string {
  switch (errorCode) {
    case "paid_execution_disabled":
      return "Paid selections execution is not enabled. No API request was sent and no auth header was constructed.";
    case "paid_tools_disabled":
      return "Paid selections tools are disabled. No API request was sent.";
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
      return "Static selections pricing could not be reconciled against the live pricing catalog. Live paid execution fails closed; no auth header was constructed and no API request was sent.";
    case "cost_unavailable":
      return "The endpoint cost could not be determined. No API request was sent.";
    case "unsupported_cost_unit":
      return "The resolved cost unit is not supported for local budgeting. No API request was sent.";
    case "spend_cap_exceeded":
      return "The call would exceed a local paid spend cap (or a required cap is unset). No API request was sent.";
    case "repeated_identical_selection_call":
      return "An identical base selection call was already executed in this session. The call fails closed rather than re-billing; no API request was sent and no auth header was constructed.";
    case "unexpected_auth_attempt":
      return "An auth header was requested before all gates passed and was refused. No API request was sent.";
    default:
      return "Paid selections execution was denied by local policy. No API request was sent.";
  }
}

function denialWarning(errorCode: SelectionsToolErrorCode): string {
  if (errorCode === "spend_cap_exceeded") {
    return "Paid selections execution was denied by a local spend cap (per-session/per-tool call cap or STC/USD budget cap). Because the base selection call costs 0.05 STC, a covering STC budget cap plus nonzero call caps are required; no request was sent.";
  }

  if (errorCode === "paid_execution_disabled") {
    return "Paid selections execution is not enabled (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true, or the build is not execution-capable). No API request was sent and no auth or payment header was constructed.";
  }

  if (errorCode === "pricing_catalog_reconciliation_failed") {
    return "Static local selections pricing did not reconcile against the live /v1/pricing/catalog metadata (unavailable, malformed, ambiguous, or mismatched rule id/endpoint/cost/unit). Reconciliation is selections-family-scoped; an ST-IM/indicators/published mirror cannot satisfy it. Static pricing alone cannot authorize a paid call; execution fails closed before any auth header or fetch.";
  }

  if (errorCode === "repeated_identical_selection_call") {
    return "A repeated identical base selection call was detected within this session (same exchange/min_prob13wk/limit/flags). Broad-sweep loop safety fails the repeat closed rather than silently re-billing; vary the parameters or start a new session to make a distinct call.";
  }

  return "Paid selections execution was denied before any request; no API request was sent and no auth or payment header was constructed.";
}

function mapClientErrorToSelectionsCode(error: unknown): SelectionsToolErrorCode {
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

function apiErrorMessage(errorCode: SelectionsToolErrorCode): string {
  switch (errorCode) {
    case "api_timeout":
      return "The Stock Trends paid selections request timed out. Exactly one attempt was made; no automatic retry occurred.";
    case "api_payment_required":
      return "The Stock Trends API returned 402 Payment Required. No x402 payment was signed, sent, or retried; the response is surfaced as safe metadata only.";
    case "api_auth_required":
      return "The Stock Trends API returned 401 Unauthorized. No retry, no header switch, and no downgrade to public data occurred.";
    case "api_forbidden":
      return "The Stock Trends API returned 403 Forbidden. No retry occurred.";
    case "api_not_found":
      return "The Stock Trends API returned 404 Not Found for the requested selections universe. No retry occurred.";
    case "api_rate_limited":
      return "The Stock Trends API returned 429 Too Many Requests. No automatic retry occurred.";
    case "api_unapproved_redirect":
      return "The Stock Trends API returned an unapproved redirect. The request was not followed.";
    case "malformed_api_response":
      return "The Stock Trends API returned a malformed or non-JSON selections response.";
    case "api_unexpected_status":
      return "The Stock Trends API returned an unexpected status for the selections request.";
    default:
      return "The Stock Trends paid selections request failed. Exactly one attempt was made; no automatic retry occurred.";
  }
}

function apiErrorWarning(errorCode: SelectionsToolErrorCode): string {
  if (errorCode === "api_payment_required") {
    return "A 402 Payment Required was returned. This adapter does not implement x402/wallet payment: nothing was signed, paid, or retried, and no alternate endpoint or auth was attempted.";
  }

  return "The authorized paid selections call was sent (X-API-Key only) but did not complete successfully. Exactly one attempt was made with no automatic retry and no fallback to Bearer, an alternate endpoint, or public data.";
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
