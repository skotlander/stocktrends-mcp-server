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
  STATIC_PRICING_POLICY_VERSION,
  type PaidPricingReconciliationState,
  type PricingReconciliationResult
} from "../paidPricing.js";
import type { PaidEndpointResponse, StockTrendsClient } from "../stocktrendsClient.js";

// --- Confirmed contract constants (see PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md) ---

export const STIM_LATEST_TOOL_NAME = "stocktrends_get_stim_latest";
export const STIM_HISTORY_TOOL_NAME = "stocktrends_get_stim_history";

export const STIM_LATEST_ENDPOINT_PATH = "/v1/stim/latest";
export const STIM_HISTORY_ENDPOINT_PATH = "/v1/stim/history";

export const STIM_HTTP_METHOD: PaidHttpMethod = "GET";

// Confirmed API `VALID_EXCHANGES`. Local static mirror; fail closed on anything else.
export const VALID_STIM_EXCHANGES = ["N", "Q", "A", "B", "T", "I"] as const;

// Confirmed API history `limit` bounds: Query(default=260, ge=1, le=2600).
// MCP enforces the API min/max locally and never sends a `limit` above 2600.
export const STIM_HISTORY_LIMIT_MIN = 1;
export const STIM_HISTORY_LIMIT_MAX = 2600;

// Strict, deterministic identity patterns. Uppercase canonical symbols only;
// exchange suffix must be one of the confirmed single-letter exchange codes.
// Trimming whitespace is the only normalization applied (no silent rewriting).
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}$/;
const SYMBOL_EXCHANGE_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface PaidStimToolDefinition {
  name: typeof STIM_LATEST_TOOL_NAME | typeof STIM_HISTORY_TOOL_NAME;
  endpointPath: typeof STIM_LATEST_ENDPOINT_PATH | typeof STIM_HISTORY_ENDPOINT_PATH;
  httpMethod: typeof STIM_HTTP_METHOD;
  access: "paid";
  pairedWith: typeof STIM_LATEST_TOOL_NAME | typeof STIM_HISTORY_TOOL_NAME;
  paidExecutionAuthorized: false;
}

// The two paired paid ST-IM tools. `latest` must never ship without `history`
// (history-beside-latest rule); they are registered together or not at all.
export const PAID_STIM_TOOL_DEFINITIONS: readonly PaidStimToolDefinition[] = Object.freeze([
  {
    name: STIM_LATEST_TOOL_NAME,
    endpointPath: STIM_LATEST_ENDPOINT_PATH,
    httpMethod: STIM_HTTP_METHOD,
    access: "paid",
    pairedWith: STIM_HISTORY_TOOL_NAME,
    paidExecutionAuthorized: false
  },
  {
    name: STIM_HISTORY_TOOL_NAME,
    endpointPath: STIM_HISTORY_ENDPOINT_PATH,
    httpMethod: STIM_HTTP_METHOD,
    access: "paid",
    pairedWith: STIM_LATEST_TOOL_NAME,
    paidExecutionAuthorized: false
  }
]);

export const PAID_STIM_TOOL_NAMES: readonly string[] = Object.freeze(PAID_STIM_TOOL_DEFINITIONS.map((tool) => tool.name));

// --- Input schemas (strict; single-field constraints validated at the SDK boundary) ---
//
// Cross-field rules (symbol-identity presence/precedence and start<=end) are
// enforced in the handler *before* any preflight/network step, and surface a
// deterministic `invalid_tool_input` error code.

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

const exchangeField = z.enum(VALID_STIM_EXCHANGES).optional();

export const stimLatestInputSchema = z
  .object({
    symbol_exchange: symbolExchangeField,
    symbol: symbolField,
    exchange: exchangeField
  })
  .strict();

export const stimHistoryInputSchema = z
  .object({
    symbol_exchange: symbolExchangeField,
    symbol: symbolField,
    exchange: exchangeField,
    start: z.string().regex(DATE_PATTERN, "start must be a YYYY-MM-DD date.").optional(),
    end: z.string().regex(DATE_PATTERN, "end must be a YYYY-MM-DD date.").optional(),
    limit: z.number().int().min(STIM_HISTORY_LIMIT_MIN).max(STIM_HISTORY_LIMIT_MAX).optional(),
    include_gaps: z.boolean().optional()
  })
  .strict();

type StimLatestInput = z.infer<typeof stimLatestInputSchema>;
type StimHistoryInput = z.infer<typeof stimHistoryInputSchema>;

// --- Error taxonomy (tool-facing, deterministic, secret-free) ---

export type StimToolErrorCode =
  | "paid_tools_disabled"
  | "paid_auth_blocked_missing_api_key"
  | "invalid_tool_input"
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

const DENIAL_REASON_TO_ERROR_CODE: Record<PaidInvocationDenialReason, StimToolErrorCode> = {
  paid_tools_disabled: "paid_tools_disabled",
  paid_auth_blocked_missing_api_key: "paid_auth_blocked_missing_api_key",
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "tool_endpoint_mismatch",
  host_not_approved: "host_not_approved",
  paid_execution_disabled: "paid_execution_disabled"
};

// Map full-preflight denial reasons (pricing/cap) to tool-facing error codes.
const PREFLIGHT_DENIAL_TO_ERROR_CODE: Record<string, StimToolErrorCode> = {
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "tool_endpoint_mismatch",
  host_not_approved: "host_not_approved",
  paid_auth_unavailable: "paid_tools_disabled",
  missing_pricing: "pricing_preflight_unavailable",
  non_authoritative_pricing: "pricing_preflight_unavailable",
  cap_exceeded: "spend_cap_exceeded",
  paid_execution_disabled: "paid_execution_disabled"
};

class StimToolInputError extends Error {
  constructor(readonly errorCode: "invalid_tool_input", message: string) {
    super(message);
    this.name = "StimToolInputError";
  }
}

// --- Output wrapper scaffolding for later (separately reviewed) execution ---
//
// These shapes describe what an authorized paid ST-IM response wrapper will look
// like once execution is enabled. No success path is reachable in this build;
// the types exist so the future execution branch has a stable contract.

export interface PaidStimPreflightSummary {
  endpoint_allowlisted: boolean;
  tool_allowlisted: boolean;
  host_approved: boolean;
  paid_mode_configured: boolean;
  pricing_source: string | null;
  pricing_rule: string | null;
  estimated_cost: { amount: number; unit: string } | null;
  hard_execution_gate_enabled: boolean;
  local_authorization_decision: "allow" | "deny";
  denial_reason: StimToolErrorCode | null;
}

export interface PaidStimLocalCapStatus {
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

export interface PaidStimSymbolIdentity {
  symbol: string | null;
  exchange: string | null;
  // MCP-facing canonical identity (underscore form, e.g. AAPL_Q). Never sent to
  // the API as a query parameter.
  symbol_exchange: string;
  // The API-valid hyphen form actually sent to the Stock Trends API (e.g.
  // AAPL-Q). This is what appears in the outbound query.
  api_symbol_exchange: string;
  identity_source: "symbol_exchange" | "symbol_and_exchange";
}

export interface PaidStimPricingReconciliation {
  required: true;
  status: "reconciled" | "failed" | "not_evaluated";
  source: "pricing_catalog" | null;
  detail: string | null;
}

export interface PaidStimResponseMetadata {
  request_id: string | null;
  pricing_rule: string | null;
  payment_required: string | null;
  accepted_payment_methods: string | null;
  quota_limit: string | null;
  quota_period: string | null;
  // Subscription/API-key mode returns no observed per-call charge and no payment
  // settlement; these are always null here and are never fabricated.
  observed_cost: null;
  payment_status: null;
}

export interface PaidStimToolMetadata {
  tool_name: string;
  endpoint_path: string;
  http_method: typeof STIM_HTTP_METHOD;
  source: "stocktrends_api";
  symbol_identity: PaidStimSymbolIdentity;
  request_parameters: Record<string, unknown>;
  api_request_parameters: Record<string, unknown>;
  preflight_decision_summary: PaidStimPreflightSummary;
  pricing_reconciliation: PaidStimPricingReconciliation;
  local_budget_cap_status: PaidStimLocalCapStatus;
  response_metadata: PaidStimResponseMetadata;
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

// Authorized-execution wrapper, returned only after a successful approved call.
export interface PaidStimSuccessWrapper {
  api_data: Record<string, unknown>;
  mcp_metadata: PaidStimToolMetadata & { paid_execution_authorized: true };
  paid_execution_authorized: true;
  paid_execution_occurred: true;
  api_request_sent: true;
  auth_header_sent: true;
  payment_header_sent: false;
}

// Denial wrapper returned when a gate fails before any request/auth occurs.
export interface PaidStimDenialWrapper {
  error: {
    error_code: StimToolErrorCode;
    message: string;
    tool_name: string;
    endpoint_path: string;
    http_method: typeof STIM_HTTP_METHOD;
    denial_reason: StimToolErrorCode;
  };
  mcp_metadata: PaidStimToolMetadata;
  paid_execution_authorized: false;
  paid_execution_occurred: false;
  api_request_sent: false;
  auth_header_sent: false;
  payment_header_sent: false;
}

// --- Registration ---

export function registerPaidStimTools(
  server: McpServer,
  client: StockTrendsClient,
  config: StockTrendsMcpConfig,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState
): void {
  // Paired paid ST-IM tool *definitions* are only exposed when paid mode is
  // explicitly enabled AND an API key is configured (Phase 3/4 paid-mode
  // policy). API key alone, paid flag alone, or a blocked/missing-key state
  // exposes nothing. Both tools register together or neither does. Exposure is
  // independent of the execution flag: the tools appear whether or not
  // STOCKTRENDS_ENABLE_PAID_EXECUTION is set; only execution is additionally
  // gated.
  if (!shouldExposePaidStimTools(config)) {
    return;
  }

  server.registerTool(
    STIM_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends ST-IM Record (paid)",
      description:
        "Paid ST-IM tool for GET /v1/stim/latest. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, and nonzero local caps all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: stimLatestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: STIM_LATEST_ENDPOINT_PATH,
        method: STIM_HTTP_METHOD,
        source: "stim_latest",
        pairedWith: STIM_HISTORY_TOOL_NAME
      }
    },
    async (input) => handleStimLatestTool(config, client, usage, reconciliation, input as StimLatestInput)
  );

  server.registerTool(
    STIM_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends ST-IM History (paid)",
      description:
        "Paid ST-IM tool for GET /v1/stim/history. Live subscription/API-key execution runs ONLY when paid tools, an API key, the paid-execution flag, authoritative static pricing/preflight, and nonzero local caps all pass; otherwise it fails closed with no request and no auth/payment header. X-API-Key only; no Bearer, no payment header, no x402, no automatic retries. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: stimHistoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: STIM_HISTORY_ENDPOINT_PATH,
        method: STIM_HTTP_METHOD,
        source: "stim_history",
        pairedWith: STIM_LATEST_TOOL_NAME
      }
    },
    async (input) => handleStimHistoryTool(config, client, usage, reconciliation, input as StimHistoryInput)
  );
}

export function shouldExposePaidStimTools(config: StockTrendsMcpConfig): boolean {
  return config.paidTools.requested && config.paidTools.apiKeyConfigured;
}

export function listPaidStimToolNames(): string[] {
  return [...PAID_STIM_TOOL_NAMES];
}

// --- Handlers ---
//
// Each handler validates strictly, resolves symbol identity, then routes through
// `executePaidStim`. No auth header is built and no fetch occurs until every
// gate in `evaluatePaidPreflight` passes.

async function handleStimLatestTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  input: StimLatestInput
): Promise<CallToolResult> {
  try {
    const identity = resolveSymbolIdentity(input);
    const requestParameters = { symbol_exchange: identity.symbol_exchange };
    const apiRequestParameters = { symbol_exchange: identity.api_symbol_exchange };
    return await executePaidStim(config, client, usage, reconciliation, {
      toolName: STIM_LATEST_TOOL_NAME,
      endpointPath: STIM_LATEST_ENDPOINT_PATH,
      pricingRuleId: "stim_latest_paid",
      identity,
      requestParameters,
      apiRequestParameters,
      extraWarnings: [
        "A single latest ST-IM record is a point-in-time snapshot, not a forecast or instruction; use stocktrends_get_stim_history for longitudinal context."
      ]
    });
  } catch (error) {
    return toolInputError(error, STIM_LATEST_TOOL_NAME, STIM_LATEST_ENDPOINT_PATH);
  }
}

async function handleStimHistoryTool(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  input: StimHistoryInput
): Promise<CallToolResult> {
  try {
    const identity = resolveSymbolIdentity(input);
    const requestParameters = buildHistoryRequestParameters(identity, input, identity.symbol_exchange);
    const apiRequestParameters = buildHistoryRequestParameters(identity, input, identity.api_symbol_exchange);
    return await executePaidStim(config, client, usage, reconciliation, {
      toolName: STIM_HISTORY_TOOL_NAME,
      endpointPath: STIM_HISTORY_ENDPOINT_PATH,
      pricingRuleId: "stim_history_paid",
      identity,
      requestParameters,
      apiRequestParameters,
      extraWarnings: []
    });
  } catch (error) {
    return toolInputError(error, STIM_HISTORY_TOOL_NAME, STIM_HISTORY_ENDPOINT_PATH);
  }
}

interface StimExecutionContext {
  toolName: string;
  endpointPath: string;
  pricingRuleId: string;
  identity: PaidStimSymbolIdentity;
  requestParameters: Record<string, unknown>;
  apiRequestParameters: Record<string, unknown>;
  extraWarnings: string[];
}

// The single coupled paid-execution path. Runs the structural gate, then the
// full pricing/cap preflight, then the fail-closed catalog reconciliation gate,
// then — only on approval — builds the X-API-Key header, records the attempt,
// performs exactly one fetch, and wraps the result.
async function executePaidStim(
  config: StockTrendsMcpConfig,
  client: StockTrendsClient,
  usage: PaidUsageTracker,
  reconciliation: PaidPricingReconciliationState,
  context: StimExecutionContext
): Promise<CallToolResult> {
  const paidAuthConfig: PaidAuthConfig = { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
  // Target URL for host/endpoint allowlist evaluation. Query params are applied
  // separately by the client only if a fetch is authorized.
  const targetUrl = new URL(context.endpointPath, config.apiBaseUrl);

  // Structural gate: endpoint/tool/host allowlist, paid mode, API key, runtime
  // execution flag. No pricing is resolved and no side effects occur here. When
  // execution is not runtime-enabled (or a structural gate fails) we deny before
  // touching pricing/caps/reconciliation/auth.
  const structural = evaluatePaidInvocationPreflight(paidAuthConfig, {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: STIM_HTTP_METHOD,
    targetUrl
  });

  if (!structural.structurallyAuthorized) {
    const errorCode = DENIAL_REASON_TO_ERROR_CODE[structural.denialReason ?? "paid_execution_disabled"];
    return denyStimInvocation(config, context, errorCode, {
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

  // Execution is runtime-enabled. Resolve the static cost basis and run the full
  // pricing/cap preflight against current in-memory usage.
  const estimatedCost = resolveStaticEndpointPricing(context.pricingRuleId);
  const usageSnapshot = snapshotPaidUsage(usage);
  const preflightInput: PaidPreflightEvaluationInput = {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: STIM_HTTP_METHOD,
    targetUrl,
    costEstimate: estimatedCost,
    usage: usageSnapshot
  };
  const decision = evaluatePaidPreflight(paidAuthConfig, preflightInput);

  if (decision.localPolicyDecision === "deny") {
    const errorCode = PREFLIGHT_DENIAL_TO_ERROR_CODE[decision.denialReason ?? "paid_execution_disabled"] ?? "paid_execution_disabled";
    return denyStimInvocation(config, context, errorCode, {
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

  // Catalog reconciliation gate (credential-free, fail-closed). The static local
  // pricing mirror must be confirmed against the live `/v1/pricing/catalog`
  // metadata BEFORE any auth header is constructed or any ST-IM fetch occurs.
  // Static pricing alone can never authorize a paid call. This read sends no
  // X-API-Key and is not an authorization source by itself.
  const reconciliationResult = await reconcileStaticPricingWithCatalog(client, reconciliation);

  if (!reconciliationResult.ok) {
    return denyStimInvocation(config, context, "pricing_catalog_reconciliation_failed", {
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

  // APPROVED (local policy + catalog reconciliation). Construct the X-API-Key
  // header inside the coupled boundary (this re-runs and re-asserts the full
  // preflight as defense in depth), record the attempt against in-memory caps,
  // then perform exactly one fetch.
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

function reconciliationNotEvaluated(): PaidStimPricingReconciliation {
  return { required: true, status: "not_evaluated", source: null, detail: null };
}

function reconciliationFromResult(result: PricingReconciliationResult): PaidStimPricingReconciliation {
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
  reconciliation: PaidStimPricingReconciliation;
}

function denyStimInvocation(
  config: StockTrendsMcpConfig,
  context: StimExecutionContext,
  errorCode: StimToolErrorCode,
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

  const wrapper: PaidStimDenialWrapper = {
    error: {
      error_code: errorCode,
      message: denialMessage(errorCode),
      tool_name: context.toolName,
      endpoint_path: context.endpointPath,
      http_method: STIM_HTTP_METHOD,
      denial_reason: errorCode
    },
    mcp_metadata: metadata,
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false
  };

  return failClosed(wrapper);
}

function successResult(
  config: StockTrendsMcpConfig,
  context: StimExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidStimPricingReconciliation,
  response: PaidEndpointResponse
): CallToolResult {
  const responseMetadata: PaidStimResponseMetadata = {
    request_id: response.requestId,
    pricing_rule: response.headers.pricingRule,
    payment_required: response.headers.paymentRequired,
    accepted_payment_methods: response.headers.acceptedPaymentMethods,
    quota_limit: response.headers.quotaLimit,
    quota_period: response.headers.quotaPeriod,
    // Never fabricated: subscription mode returns no observed charge or
    // settlement.
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
  }) as PaidStimToolMetadata & { paid_execution_authorized: true };

  const wrapper: PaidStimSuccessWrapper = {
    api_data: response.data,
    mcp_metadata: metadata,
    paid_execution_authorized: true,
    paid_execution_occurred: true,
    api_request_sent: true,
    auth_header_sent: true,
    payment_header_sent: false
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
// retry, no downgrade to public data. `paid_execution_authorized` stays false
// because no successful execution completed.
function apiErrorResult(
  config: StockTrendsMcpConfig,
  context: StimExecutionContext,
  decision: PaidPreflightDecision,
  estimatedCost: PaidCostEstimate | null,
  capUsage: ReturnType<typeof snapshotPaidUsage>,
  reconciliation: PaidStimPricingReconciliation,
  error: unknown
): CallToolResult {
  const errorCode = mapClientErrorToStimCode(error);
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
      http_method: STIM_HTTP_METHOD,
      denial_reason: errorCode
    },
    mcp_metadata: metadata,
    paid_execution_authorized: false as const,
    paid_execution_occurred: false as const,
    // The call was authorized and sent, but did not complete successfully.
    api_request_sent: true as const,
    auth_header_sent: true as const,
    payment_header_sent: false as const
  };

  return failClosed(wrapper);
}

interface ToolMetadataFacts {
  decision: "allow" | "deny";
  denialReason: StimToolErrorCode | null;
  endpointAllowlisted: boolean;
  toolAllowlisted: boolean;
  hostApproved: boolean;
  paidModeConfigured: boolean;
  hardExecutionGateEnabled: boolean;
  estimatedCost: PaidCostEstimate | null;
  pricingSource: string | null;
  pricingRule: string | null;
  capUsage: ReturnType<typeof snapshotPaidUsage>;
  reconciliation: PaidStimPricingReconciliation;
  responseMetadata: PaidStimResponseMetadata;
  fetchedAt: string | null;
  paidExecutionAuthorized: boolean;
  extraWarnings: string[];
}

function buildToolMetadata(spendPolicy: PaidSpendPolicy, context: StimExecutionContext, facts: ToolMetadataFacts): PaidStimToolMetadata {
  return {
    tool_name: context.toolName,
    endpoint_path: context.endpointPath,
    http_method: STIM_HTTP_METHOD,
    source: "stocktrends_api",
    symbol_identity: context.identity,
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
    authoritative_for: "ST-IM API data returned by Stock Trends API",
    not_authoritative_for: ["investment advice", "payment authorization", "future performance guarantee"],
    fetched_at: facts.fetchedAt,
    paid_execution_authorized: facts.paidExecutionAuthorized,
    warnings: facts.extraWarnings,
    limitations: [
      "This tool returns Stock Trends API-authored ST-IM data; it does not compute or reinterpret ST-IM distributions or produce buy/sell/hold/allocation conclusions.",
      "Static local pricing cannot authorize a paid call by itself; it must reconcile against the live /v1/pricing/catalog metadata (credential-free) before any auth header or fetch. The catalog is metadata reconciliation only, never authorization by itself.",
      "Subscription/API-key mode returns no observed per-call cost and no payment settlement; observed_cost and payment_status are null and never fabricated.",
      "x402, wallets, OAuth, remote MCP, and Bearer-header fallback remain deferred; local spend caps are in-memory only and reset on server restart."
    ]
  };
}

function buildCapStatus(
  spendPolicy: PaidSpendPolicy,
  toolName: string,
  capUsage: ReturnType<typeof snapshotPaidUsage>
): PaidStimLocalCapStatus {
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

function emptyResponseMetadata(): PaidStimResponseMetadata {
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

// --- Input resolution and validation (before preflight/network) ---

function resolveSymbolIdentity(input: { symbol_exchange?: string; symbol?: string; exchange?: string }): PaidStimSymbolIdentity {
  // symbol_exchange takes precedence over symbol + exchange (mirrors the API).
  // The MCP-facing canonical form is underscore (SYMBOL_EXCHANGE); the outbound
  // API form is hyphen (SYMBOL-EXCHANGE), which is what `parse_symbol_exchange`
  // expects. The underscore form is NEVER sent to the API.
  if (input.symbol_exchange !== undefined) {
    const [symbol, exchange] = splitSymbolExchange(input.symbol_exchange);
    return {
      symbol,
      exchange,
      symbol_exchange: input.symbol_exchange,
      api_symbol_exchange: `${symbol}-${exchange}`,
      identity_source: "symbol_exchange"
    };
  }

  if (input.symbol !== undefined && input.exchange !== undefined) {
    return {
      symbol: input.symbol,
      exchange: input.exchange,
      symbol_exchange: `${input.symbol}_${input.exchange}`,
      api_symbol_exchange: `${input.symbol}-${input.exchange}`,
      identity_source: "symbol_and_exchange"
    };
  }

  throw new StimToolInputError(
    "invalid_tool_input",
    "Provide either symbol_exchange, or both symbol and exchange, to identify a single symbol."
  );
}

function splitSymbolExchange(symbolExchange: string): [string, string] {
  const separatorIndex = symbolExchange.lastIndexOf("_");
  return [symbolExchange.slice(0, separatorIndex), symbolExchange.slice(separatorIndex + 1)];
}

function buildHistoryRequestParameters(
  identity: PaidStimSymbolIdentity,
  input: StimHistoryInput,
  symbolExchangeValue: string
): Record<string, unknown> {
  const start = input.start;
  const end = input.end;

  if (start !== undefined && !isRealCalendarDate(start)) {
    throw new StimToolInputError("invalid_tool_input", "start must be a valid YYYY-MM-DD calendar date.");
  }

  if (end !== undefined && !isRealCalendarDate(end)) {
    throw new StimToolInputError("invalid_tool_input", "end must be a valid YYYY-MM-DD calendar date.");
  }

  if (start !== undefined && end !== undefined && start > end) {
    throw new StimToolInputError("invalid_tool_input", "start must be on or before end.");
  }

  // Only forward parameters the caller actually supplied. `limit` and
  // `include_gaps` are omitted when not supplied so the API applies its own
  // documented defaults (limit=260, include_gaps=false); MCP never sends a
  // limit above the API max of 2600. The `symbolExchangeValue` is the underscore
  // canonical form for the MCP-facing echo, or the hyphen API form for the
  // outbound query.
  const parameters: Record<string, unknown> = { symbol_exchange: symbolExchangeValue };

  if (start !== undefined) {
    parameters.start = start;
  }

  if (end !== undefined) {
    parameters.end = end;
  }

  if (input.limit !== undefined) {
    parameters.limit = input.limit;
  }

  if (input.include_gaps !== undefined) {
    parameters.include_gaps = input.include_gaps;
  }

  return parameters;
}

function isRealCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// --- Result builders ---

function denialMessage(errorCode: StimToolErrorCode): string {
  switch (errorCode) {
    case "paid_execution_disabled":
      return "Paid ST-IM execution is not enabled. No API request was sent and no auth header was constructed.";
    case "paid_tools_disabled":
      return "Paid ST-IM tools are disabled. No API request was sent.";
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
      return "Static pricing could not be reconciled against the live pricing catalog. Live paid execution fails closed; no auth header was constructed and no API request was sent.";
    case "cost_unavailable":
      return "The endpoint cost could not be determined. No API request was sent.";
    case "unsupported_cost_unit":
      return "The resolved cost unit is not supported for local budgeting. No API request was sent.";
    case "spend_cap_exceeded":
      return "The call would exceed a local paid spend cap (or a required cap is unset). No API request was sent.";
    case "unexpected_auth_attempt":
      return "An auth header was requested before all gates passed and was refused. No API request was sent.";
    default:
      return "Paid ST-IM execution was denied by local policy. No API request was sent.";
  }
}

function denialWarning(errorCode: StimToolErrorCode): string {
  if (errorCode === "spend_cap_exceeded") {
    return "Paid ST-IM execution was denied by a local spend cap (per-session/per-tool call cap or STC/USD budget cap). Configure nonzero caps to authorize a call; no request was sent.";
  }

  if (errorCode === "paid_execution_disabled") {
    return "Paid ST-IM execution is not enabled (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true, or the build is not execution-capable). No API request was sent and no auth or payment header was constructed.";
  }

  if (errorCode === "pricing_catalog_reconciliation_failed") {
    return "Static local pricing did not reconcile against the live /v1/pricing/catalog metadata (unavailable, malformed, ambiguous, or mismatched rule id/endpoint/cost/unit). Static pricing alone cannot authorize a paid call; execution fails closed before any auth header or fetch.";
  }

  return "Paid ST-IM execution was denied before any request; no API request was sent and no auth or payment header was constructed.";
}

// Deterministic mapping of client-thrown errors to tool-facing codes. Never
// includes secrets, headers, or raw exception text.
function mapClientErrorToStimCode(error: unknown): StimToolErrorCode {
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

function apiErrorMessage(errorCode: StimToolErrorCode): string {
  switch (errorCode) {
    case "api_timeout":
      return "The Stock Trends paid ST-IM request timed out. Exactly one attempt was made; no automatic retry occurred.";
    case "api_payment_required":
      return "The Stock Trends API returned 402 Payment Required. No x402 payment was signed, sent, or retried; the response is surfaced as safe metadata only.";
    case "api_auth_required":
      return "The Stock Trends API returned 401 Unauthorized. No retry, no header switch, and no downgrade to public data occurred.";
    case "api_forbidden":
      return "The Stock Trends API returned 403 Forbidden. No retry occurred.";
    case "api_not_found":
      return "The Stock Trends API returned 404 Not Found for the requested ST-IM record. No retry occurred.";
    case "api_rate_limited":
      return "The Stock Trends API returned 429 Too Many Requests. No automatic retry occurred.";
    case "api_unapproved_redirect":
      return "The Stock Trends API returned an unapproved redirect. The request was not followed.";
    case "malformed_api_response":
      return "The Stock Trends API returned a malformed or non-JSON ST-IM response.";
    case "api_unexpected_status":
      return "The Stock Trends API returned an unexpected status for the ST-IM request.";
    default:
      return "The Stock Trends paid ST-IM request failed. Exactly one attempt was made; no automatic retry occurred.";
  }
}

function apiErrorWarning(errorCode: StimToolErrorCode): string {
  if (errorCode === "api_payment_required") {
    return "A 402 Payment Required was returned. This adapter does not implement x402/wallet payment: nothing was signed, paid, or retried, and no alternate endpoint or auth was attempted.";
  }

  return "The authorized paid ST-IM call was sent (X-API-Key only) but did not complete successfully. Exactly one attempt was made with no automatic retry and no fallback to Bearer, an alternate endpoint, or public data.";
}

function toolInputError(error: unknown, toolName: string, endpointPath: string): CallToolResult {
  const message = error instanceof StimToolInputError ? error.message : "Invalid paid ST-IM tool input.";
  const wrapper = {
    error: {
      error_code: "invalid_tool_input" as const,
      message,
      tool_name: toolName,
      endpoint_path: endpointPath,
      http_method: STIM_HTTP_METHOD,
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
