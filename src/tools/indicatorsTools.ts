import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { StockTrendsMcpConfig } from "../config.js";
import { StockTrendsMcpError } from "../errors.js";
import {
  resolveInstrumentIdentity,
  VALID_EXCHANGES,
  type InstrumentIdentity,
  type InstrumentResolutionFailure,
  type InstrumentResolutionMetadata
} from "../instrumentResolver.js";
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
  INDICATORS_PRICING_RULE_IDS,
  reconcileStaticPricingWithCatalog,
  resolveStaticEndpointPricing,
  STATIC_PRICING_POLICY_VERSION,
  type PaidPricingReconciliationState,
  type PricingReconciliationResult
} from "../paidPricing.js";
import type { PaidEndpointResponse, StockTrendsClient } from "../stocktrendsClient.js";

// --- Confirmed contract constants (see PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md) ---

export const INDICATORS_LATEST_TOOL_NAME = "stocktrends_get_indicators_latest";
export const INDICATORS_HISTORY_TOOL_NAME = "stocktrends_get_indicators_history";

export const INDICATORS_LATEST_ENDPOINT_PATH = "/v1/indicators/latest";
export const INDICATORS_HISTORY_ENDPOINT_PATH = "/v1/indicators/history";

export const INDICATORS_HTTP_METHOD: PaidHttpMethod = "GET";

export const INDICATORS_LATEST_PRICING_RULE_ID = "indicators_latest_paid";
export const INDICATORS_HISTORY_PRICING_RULE_ID = "indicators_history_paid";

// Confirmed API indicators history `limit` bounds: Query(default=260, ge=1, le=2600).
// MCP enforces the API min/max locally and never sends a `limit` above 2600.
export const INDICATORS_HISTORY_LIMIT_MIN = 1;
export const INDICATORS_HISTORY_LIMIT_MAX = 2600;

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}$/;
const SYMBOL_EXCHANGE_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface PaidIndicatorsToolDefinition {
  name: typeof INDICATORS_LATEST_TOOL_NAME | typeof INDICATORS_HISTORY_TOOL_NAME;
  endpointPath: typeof INDICATORS_LATEST_ENDPOINT_PATH | typeof INDICATORS_HISTORY_ENDPOINT_PATH;
  httpMethod: typeof INDICATORS_HTTP_METHOD;
  access: "paid";
  pairedWith: typeof INDICATORS_LATEST_TOOL_NAME | typeof INDICATORS_HISTORY_TOOL_NAME;
}

// The two paired paid indicators tools. `latest` must never ship without
// `history` (history-beside-latest rule); they register together or not at all.
export const PAID_INDICATORS_TOOL_DEFINITIONS: readonly PaidIndicatorsToolDefinition[] = Object.freeze([
  {
    name: INDICATORS_LATEST_TOOL_NAME,
    endpointPath: INDICATORS_LATEST_ENDPOINT_PATH,
    httpMethod: INDICATORS_HTTP_METHOD,
    access: "paid",
    pairedWith: INDICATORS_HISTORY_TOOL_NAME
  },
  {
    name: INDICATORS_HISTORY_TOOL_NAME,
    endpointPath: INDICATORS_HISTORY_ENDPOINT_PATH,
    httpMethod: INDICATORS_HTTP_METHOD,
    access: "paid",
    pairedWith: INDICATORS_LATEST_TOOL_NAME
  }
]);

export const PAID_INDICATORS_TOOL_NAMES: readonly string[] = Object.freeze(
  PAID_INDICATORS_TOOL_DEFINITIONS.map((tool) => tool.name)
);

// --- Input schemas (strict; single-field constraints validated at the SDK boundary) ---

const symbolExchangeField = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(SYMBOL_EXCHANGE_PATTERN, "symbol_exchange must be canonical uppercase SYMBOL_EXCHANGE (exchange one of N,Q,A,B,T,I).")
  .optional();

const symbolField = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(SYMBOL_PATTERN, "symbol must be canonical uppercase alphanumeric.")
  .optional();

const exchangeField = z.enum(VALID_EXCHANGES).optional();

export const indicatorsLatestInputSchema = z
  .object({
    symbol_exchange: symbolExchangeField,
    symbol: symbolField,
    exchange: exchangeField,
    cs_only: z.boolean().optional()
  })
  .strict();

export const indicatorsHistoryInputSchema = z
  .object({
    symbol_exchange: symbolExchangeField,
    symbol: symbolField,
    exchange: exchangeField,
    cs_only: z.boolean().optional(),
    start: z.string().regex(DATE_PATTERN, "start must be a YYYY-MM-DD date.").optional(),
    end: z.string().regex(DATE_PATTERN, "end must be a YYYY-MM-DD date.").optional(),
    limit: z.number().int().min(INDICATORS_HISTORY_LIMIT_MIN).max(INDICATORS_HISTORY_LIMIT_MAX).optional()
  })
  .strict();

type IndicatorsLatestInput = z.infer<typeof indicatorsLatestInputSchema>;
type IndicatorsHistoryInput = z.infer<typeof indicatorsHistoryInputSchema>;

// --- Error taxonomy (tool-facing, deterministic, secret-free) ---

export type IndicatorsToolErrorCode =
  | "invalid_tool_input"
  | "instrument_identity_conflict"
  | "instrument_symbol_ambiguous"
  | "instrument_symbol_not_found"
  | "instrument_resolution_unavailable"
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

const DENIAL_REASON_TO_ERROR_CODE: Record<PaidInvocationDenialReason, IndicatorsToolErrorCode> = {
  paid_tools_disabled: "paid_tools_disabled",
  paid_auth_blocked_missing_api_key: "paid_auth_blocked_missing_api_key",
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "tool_endpoint_mismatch",
  host_not_approved: "host_not_approved",
  paid_execution_disabled: "paid_execution_disabled"
};

const PREFLIGHT_DENIAL_TO_ERROR_CODE: Record<string, IndicatorsToolErrorCode> = {
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "tool_endpoint_mismatch",
  host_not_approved: "host_not_approved",
  paid_auth_unavailable: "paid_tools_disabled",
  missing_pricing: "pricing_preflight_unavailable",
  non_authoritative_pricing: "pricing_preflight_unavailable",
  cap_exceeded: "spend_cap_exceeded",
  paid_execution_disabled: "paid_execution_disabled"
};

// Map internal resolver failure reasons to tool-facing codes.
const RESOLUTION_REASON_TO_ERROR_CODE: Record<InstrumentResolutionFailure["reason"], IndicatorsToolErrorCode> = {
  invalid_identity: "invalid_tool_input",
  identity_conflict: "instrument_identity_conflict",
  ambiguous_symbol: "instrument_symbol_ambiguous",
  symbol_not_found: "instrument_symbol_not_found",
  resolution_unavailable: "instrument_resolution_unavailable"
};

class IndicatorsToolInputError extends Error {
  constructor(readonly errorCode: "invalid_tool_input", message: string) {
    super(message);
    this.name = "IndicatorsToolInputError";
  }
}

// --- Wrapper metadata shapes ---

export interface PaidIndicatorsPreflightSummary {
  endpoint_allowlisted: boolean;
  tool_allowlisted: boolean;
  host_approved: boolean;
  paid_mode_configured: boolean;
  pricing_source: string | null;
  pricing_rule: string | null;
  estimated_cost: { amount: number; unit: string } | null;
  hard_execution_gate_enabled: boolean;
  local_authorization_decision: "allow" | "deny";
  denial_reason: IndicatorsToolErrorCode | null;
}

export interface PaidIndicatorsLocalCapStatus {
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

export interface PaidIndicatorsSymbolIdentity {
  symbol: string | null;
  exchange: string | null;
  symbol_exchange: string | null;
  api_symbol_exchange: string | null;
  identity_source: InstrumentIdentity["identity_source"] | null;
}

export interface PaidIndicatorsResolutionMetadata {
  resolution_used: boolean;
  resolution_source: InstrumentResolutionMetadata["resolution_source"];
  resolved_symbol_exchange: string | null;
  resolution_ambiguous: boolean;
  candidate_matches: string[];
}

export interface PaidIndicatorsPricingReconciliation {
  required: true;
  status: "reconciled" | "failed" | "not_evaluated";
  source: "pricing_catalog" | null;
  detail: string | null;
}

export interface PaidIndicatorsResponseMetadata {
  request_id: string | null;
  pricing_rule: string | null;
  payment_required: string | null;
  accepted_payment_methods: string | null;
  quota_limit: string | null;
  quota_period: string | null;
  observed_cost: null;
  payment_status: null;
}

export interface PaidIndicatorsToolMetadata {
  tool_name: string;
  endpoint_path: string;
  http_method: typeof INDICATORS_HTTP_METHOD;
  source: "stocktrends_api";
  symbol_identity: PaidIndicatorsSymbolIdentity;
  instrument_resolution: PaidIndicatorsResolutionMetadata;
  request_parameters: Record<string, unknown>;
  api_request_parameters: Record<string, unknown>;
  preflight_decision_summary: PaidIndicatorsPreflightSummary;
  pricing_reconciliation: PaidIndicatorsPricingReconciliation;
  local_budget_cap_status: PaidIndicatorsLocalCapStatus;
  response_metadata: PaidIndicatorsResponseMetadata;
  request_id: string | null;
  pricing_rule: string | null;
  observed_cost: null;
  payment_status: null;
  pricing_policy_version: string;
  authoritative_for: string;
  not_authoritative_for: string[];
  fetched_at: string | null;
  paid_execution_authorized: boolean;
  warnings: string[];
  limitations: string[];
}

// --- Registration ---

export function registerPaidIndicatorsTools(
  server: McpServer,
  client: StockTrendsClient,
  config: StockTrendsMcpConfig,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState
): void {
  // Paired paid indicators tool definitions are exposed only when paid mode is
  // explicitly enabled AND an API key is configured — the identical exposure
  // gate as the paid ST-IM pair. Both tools register together or neither does.
  // Exposure is independent of the execution flag.
  if (!shouldExposePaidIndicatorsTools(config)) {
    return;
  }

  server.registerTool(
    INDICATORS_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Indicators Record (paid)",
      description:
        "Paid indicators tool for GET /v1/indicators/latest. A raw symbol is resolved credential-free to exactly one canonical symbol_exchange first, or fails closed with candidate matches; an ambiguous symbol never triggers a paid call. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, family-specific catalog reconciliation, and nonzero local caps all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: indicatorsLatestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: INDICATORS_LATEST_ENDPOINT_PATH,
        method: INDICATORS_HTTP_METHOD,
        source: "indicators_latest",
        pairedWith: INDICATORS_HISTORY_TOOL_NAME
      }
    },
    async (input) => handleIndicatorsLatestTool(config, client, usage, reconciliation, input as IndicatorsLatestInput)
  );

  server.registerTool(
    INDICATORS_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends Indicators History (paid)",
      description:
        "Paid indicators tool for GET /v1/indicators/history. A raw symbol is resolved credential-free to exactly one canonical symbol_exchange first, or fails closed with candidate matches; an ambiguous symbol never triggers a paid call. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, family-specific catalog reconciliation, and nonzero local caps all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: indicatorsHistoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: INDICATORS_HISTORY_ENDPOINT_PATH,
        method: INDICATORS_HTTP_METHOD,
        source: "indicators_history",
        pairedWith: INDICATORS_LATEST_TOOL_NAME
      }
    },
    async (input) => handleIndicatorsHistoryTool(config, client, usage, reconciliation, input as IndicatorsHistoryInput)
  );
}

export function shouldExposePaidIndicatorsTools(config: StockTrendsMcpConfig): boolean {
  return config.paidTools.requested && config.paidTools.apiKeyConfigured;
}

export function listPaidIndicatorsToolNames(): string[] {
  return [...PAID_INDICATORS_TOOL_NAMES];
}

// --- Handlers ---
//
// Each handler resolves the instrument identity credential-free BEFORE any paid
// boundary. Only on a safe single canonical identity does it route through
// `executePaidIndicators`; any resolution failure fails closed with no pricing,
// cap debit, auth header, or paid fetch.

async function handleIndicatorsLatestTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  input: IndicatorsLatestInput
): Promise<CallToolResult> {
  const resolution = await resolveInstrumentIdentity(client, input);

  if (!resolution.ok) {
    return resolutionDenial(config, usage, INDICATORS_LATEST_TOOL_NAME, INDICATORS_LATEST_ENDPOINT_PATH, input, resolution);
  }

  const identity = resolution.identity;
  const requestParameters = buildLatestRequestParameters(identity.symbol_exchange, input);
  const apiRequestParameters = buildLatestRequestParameters(identity.api_symbol_exchange, input);

  return executePaidIndicators(config, client, usage, reconciliation, {
    toolName: INDICATORS_LATEST_TOOL_NAME,
    endpointPath: INDICATORS_LATEST_ENDPOINT_PATH,
    pricingRuleId: INDICATORS_LATEST_PRICING_RULE_ID,
    identity,
    resolution: resolution.resolution,
    requestParameters,
    apiRequestParameters,
    extraWarnings: [
      "A single latest indicators record is a point-in-time snapshot, not a forecast or instruction; use stocktrends_get_indicators_history for longitudinal context."
    ]
  });
}

async function handleIndicatorsHistoryTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  input: IndicatorsHistoryInput
): Promise<CallToolResult> {
  // Validate the history window before any resolution/network step.
  try {
    assertValidHistoryWindow(input);
  } catch (error) {
    return toolInputError(error, INDICATORS_HISTORY_TOOL_NAME, INDICATORS_HISTORY_ENDPOINT_PATH);
  }

  const resolution = await resolveInstrumentIdentity(client, input);

  if (!resolution.ok) {
    return resolutionDenial(config, usage, INDICATORS_HISTORY_TOOL_NAME, INDICATORS_HISTORY_ENDPOINT_PATH, input, resolution);
  }

  const identity = resolution.identity;
  const requestParameters = buildHistoryRequestParameters(identity.symbol_exchange, input);
  const apiRequestParameters = buildHistoryRequestParameters(identity.api_symbol_exchange, input);

  return executePaidIndicators(config, client, usage, reconciliation, {
    toolName: INDICATORS_HISTORY_TOOL_NAME,
    endpointPath: INDICATORS_HISTORY_ENDPOINT_PATH,
    pricingRuleId: INDICATORS_HISTORY_PRICING_RULE_ID,
    identity,
    resolution: resolution.resolution,
    requestParameters,
    apiRequestParameters,
    extraWarnings: []
  });
}

interface IndicatorsExecutionContext {
  toolName: string;
  endpointPath: string;
  pricingRuleId: string;
  identity: InstrumentIdentity;
  resolution: InstrumentResolutionMetadata;
  requestParameters: Record<string, unknown>;
  apiRequestParameters: Record<string, unknown>;
  extraWarnings: string[];
}

// The single coupled paid-execution path (identical gate ordering to the ST-IM
// tools): structural gate, then full pricing/cap preflight, then the
// fail-closed family-specific catalog reconciliation gate, then — only on
// approval — build the X-API-Key header, record the attempt, perform exactly one
// fetch, and wrap the result.
async function executePaidIndicators(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  context: IndicatorsExecutionContext
): Promise<CallToolResult> {
  const paidAuthConfig: PaidAuthConfig = { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
  const targetUrl = new URL(context.endpointPath, config.apiBaseUrl);

  const structural = evaluatePaidInvocationPreflight(paidAuthConfig, {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: INDICATORS_HTTP_METHOD,
    targetUrl
  });

  if (!structural.structurallyAuthorized) {
    const errorCode = DENIAL_REASON_TO_ERROR_CODE[structural.denialReason ?? "paid_execution_disabled"];
    return denyIndicatorsInvocation(config, context, errorCode, {
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

  const estimatedCost = resolveStaticEndpointPricing(context.pricingRuleId);
  const usageSnapshot = snapshotPaidUsage(usage);
  const preflightInput: PaidPreflightEvaluationInput = {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: INDICATORS_HTTP_METHOD,
    targetUrl,
    costEstimate: estimatedCost,
    usage: usageSnapshot
  };
  const decision = evaluatePaidPreflight(paidAuthConfig, preflightInput);

  if (decision.localPolicyDecision === "deny") {
    const errorCode = PREFLIGHT_DENIAL_TO_ERROR_CODE[decision.denialReason ?? "paid_execution_disabled"] ?? "paid_execution_disabled";
    return denyIndicatorsInvocation(config, context, errorCode, {
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

  // Family-specific catalog reconciliation gate (credential-free, fail-closed).
  // Reconciles ONLY the indicators pricing rules against the live catalog before
  // any auth header or fetch. Static pricing alone can never authorize a call.
  const reconciliationResult = await reconcileStaticPricingWithCatalog(client, reconciliation, INDICATORS_PRICING_RULE_IDS);

  if (!reconciliationResult.ok) {
    return denyIndicatorsInvocation(config, context, "pricing_catalog_reconciliation_failed", {
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
  // attempt against in-memory caps, then perform exactly one fetch.
  const authHeaders = buildPaidAuthHeaders(paidAuthConfig, preflightInput);
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
}

function reconciliationNotEvaluated(): PaidIndicatorsPricingReconciliation {
  return { required: true, status: "not_evaluated", source: null, detail: null };
}

function reconciliationFromResult(result: PricingReconciliationResult): PaidIndicatorsPricingReconciliation {
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
  reconciliation: PaidIndicatorsPricingReconciliation;
}

function denyIndicatorsInvocation(
  config: StockTrendsMcpConfig,
  context: IndicatorsExecutionContext,
  errorCode: IndicatorsToolErrorCode,
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
      http_method: INDICATORS_HTTP_METHOD,
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

// Resolution failed BEFORE any paid boundary: no pricing preflight ran, no cap
// was debited, no auth header was constructed, and no paid fetch occurred. When
// the failure is ambiguity, the candidate matches are surfaced so the caller can
// re-invoke with an explicit canonical identity.
function resolutionDenial(
  config: StockTrendsMcpConfig,
  usage: PaidUsageTracker,
  toolName: string,
  endpointPath: string,
  input: { symbol_exchange?: string; symbol?: string; exchange?: string; cs_only?: boolean },
  resolution: InstrumentResolutionFailure
): CallToolResult {
  const errorCode = RESOLUTION_REASON_TO_ERROR_CODE[resolution.reason];
  const ambiguous = resolution.reason === "ambiguous_symbol";
  const requestParameters = echoRawInput(input);

  const metadata: PaidIndicatorsToolMetadata = {
    tool_name: toolName,
    endpoint_path: endpointPath,
    http_method: INDICATORS_HTTP_METHOD,
    source: "stocktrends_api",
    symbol_identity: {
      symbol: input.symbol ?? null,
      exchange: input.exchange ?? null,
      symbol_exchange: input.symbol_exchange ?? null,
      api_symbol_exchange: null,
      identity_source: null
    },
    instrument_resolution: {
      resolution_used: resolution.resolutionSource !== null,
      resolution_source: resolution.resolutionSource,
      resolved_symbol_exchange: null,
      resolution_ambiguous: ambiguous,
      candidate_matches: resolution.candidateMatches
    },
    request_parameters: requestParameters,
    api_request_parameters: {},
    preflight_decision_summary: {
      endpoint_allowlisted: false,
      tool_allowlisted: false,
      host_approved: false,
      paid_mode_configured: config.paidTools.requested && config.paidTools.apiKeyConfigured,
      pricing_source: null,
      pricing_rule: null,
      estimated_cost: null,
      hard_execution_gate_enabled: false,
      local_authorization_decision: "deny",
      denial_reason: errorCode
    },
    pricing_reconciliation: reconciliationNotEvaluated(),
    local_budget_cap_status: buildCapStatus(config.paidTools.spendPolicy, toolName, snapshotPaidUsage(usage)),
    response_metadata: emptyResponseMetadata(),
    request_id: null,
    pricing_rule: null,
    observed_cost: null,
    payment_status: null,
    pricing_policy_version: STATIC_PRICING_POLICY_VERSION,
    authoritative_for: "Stock Trends API indicators data returned by the Stock Trends API",
    not_authoritative_for: ["investment advice", "payment authorization", "future performance guarantee"],
    fetched_at: null,
    paid_execution_authorized: false,
    warnings: [resolutionWarning(resolution), ...(ambiguous ? [ambiguityWarning()] : [])],
    limitations: indicatorsLimitations()
  };

  const wrapper = {
    error: {
      error_code: errorCode,
      message: resolution.detail,
      tool_name: toolName,
      endpoint_path: endpointPath,
      http_method: INDICATORS_HTTP_METHOD,
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
  context: IndicatorsExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidIndicatorsPricingReconciliation,
  response: PaidEndpointResponse
): CallToolResult {
  const responseMetadata: PaidIndicatorsResponseMetadata = {
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
    fetchedAt: new Date().toISOString(),
    paidExecutionAuthorized: true,
    extraWarnings: context.extraWarnings
  });

  const wrapper = {
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
  context: IndicatorsExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidIndicatorsPricingReconciliation,
  error: unknown
): CallToolResult {
  const errorCode = mapClientErrorToIndicatorsCode(error);
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
      http_method: INDICATORS_HTTP_METHOD,
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
  denialReason: IndicatorsToolErrorCode | null;
  endpointAllowlisted: boolean;
  toolAllowlisted: boolean;
  hostApproved: boolean;
  paidModeConfigured: boolean;
  hardExecutionGateEnabled: boolean;
  estimatedCost: PaidCostEstimate | null;
  pricingSource: string | null;
  pricingRule: string | null;
  capUsage: ReturnType<typeof snapshotPaidUsage>;
  reconciliation: PaidIndicatorsPricingReconciliation;
  responseMetadata: PaidIndicatorsResponseMetadata;
  fetchedAt: string | null;
  paidExecutionAuthorized: boolean;
  extraWarnings: string[];
}

function buildToolMetadata(
  spendPolicy: PaidSpendPolicy,
  context: IndicatorsExecutionContext,
  facts: ToolMetadataFacts
): PaidIndicatorsToolMetadata {
  return {
    tool_name: context.toolName,
    endpoint_path: context.endpointPath,
    http_method: INDICATORS_HTTP_METHOD,
    source: "stocktrends_api",
    symbol_identity: {
      symbol: context.identity.symbol,
      exchange: context.identity.exchange,
      symbol_exchange: context.identity.symbol_exchange,
      api_symbol_exchange: context.identity.api_symbol_exchange,
      identity_source: context.identity.identity_source
    },
    instrument_resolution: {
      resolution_used: context.resolution.resolution_used,
      resolution_source: context.resolution.resolution_source,
      resolved_symbol_exchange: context.resolution.resolved_symbol_exchange,
      resolution_ambiguous: false,
      candidate_matches: []
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
    pricing_policy_version: STATIC_PRICING_POLICY_VERSION,
    authoritative_for: "Stock Trends API indicators data returned by the Stock Trends API",
    not_authoritative_for: ["investment advice", "payment authorization", "future performance guarantee"],
    fetched_at: facts.fetchedAt,
    paid_execution_authorized: facts.paidExecutionAuthorized,
    warnings: facts.extraWarnings,
    limitations: indicatorsLimitations()
  };
}

function indicatorsLimitations(): string[] {
  return [
    "This tool returns Stock Trends API-authored indicators data; it does not compute or reinterpret indicators or produce buy/sell/hold/allocation conclusions.",
    "Raw symbols are resolved credential-free to a single canonical symbol_exchange before any paid boundary; an ambiguous symbol fails closed with candidate matches and never triggers a paid call.",
    "Static local pricing cannot authorize a paid call by itself; it must reconcile against the live /v1/pricing/catalog metadata (credential-free) before any auth header or fetch. The catalog is metadata reconciliation only, never authorization by itself.",
    "Subscription/API-key mode returns no observed per-call cost and no payment settlement; observed_cost and payment_status are null and never fabricated.",
    "x402, wallets, OAuth, remote MCP, and Bearer-header fallback remain deferred; local spend caps are in-memory only and reset on server restart."
  ];
}

function buildCapStatus(
  spendPolicy: PaidSpendPolicy,
  toolName: string,
  capUsage: ReturnType<typeof snapshotPaidUsage>
): PaidIndicatorsLocalCapStatus {
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

function emptyResponseMetadata(): PaidIndicatorsResponseMetadata {
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

function echoRawInput(input: { symbol_exchange?: string; symbol?: string; exchange?: string; cs_only?: boolean }): Record<string, unknown> {
  const echo: Record<string, unknown> = {};

  if (input.symbol_exchange !== undefined) {
    echo.symbol_exchange = input.symbol_exchange;
  }

  if (input.symbol !== undefined) {
    echo.symbol = input.symbol;
  }

  if (input.exchange !== undefined) {
    echo.exchange = input.exchange;
  }

  if (input.cs_only !== undefined) {
    echo.cs_only = input.cs_only;
  }

  return echo;
}

// --- Request parameter builders ---

function buildLatestRequestParameters(symbolExchangeValue: string, input: IndicatorsLatestInput): Record<string, unknown> {
  const parameters: Record<string, unknown> = { symbol_exchange: symbolExchangeValue };

  if (input.cs_only !== undefined) {
    parameters.cs_only = input.cs_only;
  }

  return parameters;
}

function buildHistoryRequestParameters(symbolExchangeValue: string, input: IndicatorsHistoryInput): Record<string, unknown> {
  // Only forward parameters the caller actually supplied. `limit` is omitted when
  // not supplied so the API applies its documented default (260); MCP never sends
  // a limit above the API max of 2600. `cs_only` follows the API default (true)
  // when omitted.
  const parameters: Record<string, unknown> = { symbol_exchange: symbolExchangeValue };

  if (input.cs_only !== undefined) {
    parameters.cs_only = input.cs_only;
  }

  if (input.start !== undefined) {
    parameters.start = input.start;
  }

  if (input.end !== undefined) {
    parameters.end = input.end;
  }

  if (input.limit !== undefined) {
    parameters.limit = input.limit;
  }

  return parameters;
}

function assertValidHistoryWindow(input: IndicatorsHistoryInput): void {
  if (input.start !== undefined && !isRealCalendarDate(input.start)) {
    throw new IndicatorsToolInputError("invalid_tool_input", "start must be a valid YYYY-MM-DD calendar date.");
  }

  if (input.end !== undefined && !isRealCalendarDate(input.end)) {
    throw new IndicatorsToolInputError("invalid_tool_input", "end must be a valid YYYY-MM-DD calendar date.");
  }

  if (input.start !== undefined && input.end !== undefined && input.start > input.end) {
    throw new IndicatorsToolInputError("invalid_tool_input", "start must be on or before end.");
  }
}

function isRealCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// --- Message builders ---

function denialMessage(errorCode: IndicatorsToolErrorCode): string {
  switch (errorCode) {
    case "paid_execution_disabled":
      return "Paid indicators execution is not enabled. No API request was sent and no auth header was constructed.";
    case "paid_tools_disabled":
      return "Paid indicators tools are disabled. No API request was sent.";
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
      return "Static indicators pricing could not be reconciled against the live pricing catalog. Live paid execution fails closed; no auth header was constructed and no API request was sent.";
    case "cost_unavailable":
      return "The endpoint cost could not be determined. No API request was sent.";
    case "unsupported_cost_unit":
      return "The resolved cost unit is not supported for local budgeting. No API request was sent.";
    case "spend_cap_exceeded":
      return "The call would exceed a local paid spend cap (or a required cap is unset). No API request was sent.";
    case "unexpected_auth_attempt":
      return "An auth header was requested before all gates passed and was refused. No API request was sent.";
    default:
      return "Paid indicators execution was denied by local policy. No API request was sent.";
  }
}

function denialWarning(errorCode: IndicatorsToolErrorCode): string {
  if (errorCode === "spend_cap_exceeded") {
    return "Paid indicators execution was denied by a local spend cap (per-session/per-tool call cap or STC/USD budget cap). Configure nonzero caps to authorize a call; no request was sent.";
  }

  if (errorCode === "paid_execution_disabled") {
    return "Paid indicators execution is not enabled (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true, or the build is not execution-capable). No API request was sent and no auth or payment header was constructed.";
  }

  if (errorCode === "pricing_catalog_reconciliation_failed") {
    return "Static local indicators pricing did not reconcile against the live /v1/pricing/catalog metadata (unavailable, malformed, ambiguous, or mismatched rule id/endpoint/cost/unit). Static pricing alone cannot authorize a paid call; execution fails closed before any auth header or fetch.";
  }

  return "Paid indicators execution was denied before any request; no API request was sent and no auth or payment header was constructed.";
}

function resolutionWarning(resolution: InstrumentResolutionFailure): string {
  switch (resolution.reason) {
    case "ambiguous_symbol":
      return "The supplied raw symbol is ambiguous across exchanges; the call failed closed before any paid boundary. Re-invoke with an explicit canonical symbol_exchange (see candidate_matches).";
    case "symbol_not_found":
      return "No instrument matched the supplied identity; the call failed closed credential-free before any paid boundary.";
    case "identity_conflict":
      return "The supplied identity fields conflict (or the resolved instrument did not match); the call failed closed before any paid boundary.";
    case "resolution_unavailable":
      return "Credential-free instrument resolution was unavailable; the call failed closed before any paid boundary with no auth header and no paid request.";
    default:
      return "The supplied instrument identity was invalid; the call failed closed before any paid boundary.";
  }
}

function ambiguityWarning(): string {
  return "Ambiguity was detected credential-free (no API key, no auth header, no paid request, no cap debit). The server never chooses an exchange on your behalf.";
}

function mapClientErrorToIndicatorsCode(error: unknown): IndicatorsToolErrorCode {
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

function apiErrorMessage(errorCode: IndicatorsToolErrorCode): string {
  switch (errorCode) {
    case "api_timeout":
      return "The Stock Trends paid indicators request timed out. Exactly one attempt was made; no automatic retry occurred.";
    case "api_payment_required":
      return "The Stock Trends API returned 402 Payment Required. No x402 payment was signed, sent, or retried; the response is surfaced as safe metadata only.";
    case "api_auth_required":
      return "The Stock Trends API returned 401 Unauthorized. No retry, no header switch, and no downgrade to public data occurred.";
    case "api_forbidden":
      return "The Stock Trends API returned 403 Forbidden. No retry occurred.";
    case "api_not_found":
      return "The Stock Trends API returned 404 Not Found for the requested indicators record. No retry occurred.";
    case "api_rate_limited":
      return "The Stock Trends API returned 429 Too Many Requests. No automatic retry occurred.";
    case "api_unapproved_redirect":
      return "The Stock Trends API returned an unapproved redirect. The request was not followed.";
    case "malformed_api_response":
      return "The Stock Trends API returned a malformed or non-JSON indicators response.";
    case "api_unexpected_status":
      return "The Stock Trends API returned an unexpected status for the indicators request.";
    default:
      return "The Stock Trends paid indicators request failed. Exactly one attempt was made; no automatic retry occurred.";
  }
}

function apiErrorWarning(errorCode: IndicatorsToolErrorCode): string {
  if (errorCode === "api_payment_required") {
    return "A 402 Payment Required was returned. This adapter does not implement x402/wallet payment: nothing was signed, paid, or retried, and no alternate endpoint or auth was attempted.";
  }

  return "The authorized paid indicators call was sent (X-API-Key only) but did not complete successfully. Exactly one attempt was made with no automatic retry and no fallback to Bearer, an alternate endpoint, or public data.";
}

function toolInputError(error: unknown, toolName: string, endpointPath: string): CallToolResult {
  const message = error instanceof IndicatorsToolInputError ? error.message : "Invalid paid indicators tool input.";
  const wrapper = {
    error: {
      error_code: "invalid_tool_input" as const,
      message,
      tool_name: toolName,
      endpoint_path: endpointPath,
      http_method: INDICATORS_HTTP_METHOD,
      denial_reason: "invalid_tool_input" as const
    },
    paid_execution_authorized: false as const,
    paid_execution_occurred: false as const,
    api_request_sent: false as const,
    auth_header_sent: false as const,
    payment_header_sent: false as const
  };

  return failClosed(wrapper);
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
