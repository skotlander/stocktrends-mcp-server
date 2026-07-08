import { StockTrendsMcpError } from "./errors.js";

export type PaidModeStatus =
  | "disabled"
  | "blocked_missing_api_key"
  | "configured_foundation_no_execution"
  | "configured_execution_enabled";
export type PaidHttpMethod = "GET";
export type PaidPricingSource = "pricing_catalog" | "cost_estimate" | "explicit_test_estimate";
export type PaidCostUnit = "STC" | "USD";
export type PaidLocalPolicyDecision = "allow" | "deny";
export type PaidPreflightDenialReason =
  | "endpoint_not_allowlisted"
  | "tool_endpoint_mismatch"
  | "host_not_approved"
  | "paid_auth_unavailable"
  | "missing_pricing"
  | "non_authoritative_pricing"
  | "cap_exceeded"
  | "paid_execution_disabled";

export interface PaidSpendPolicy {
  pricingPreflightRequired: true;
  maxPaidCallsPerSession: number;
  maxPaidCallsPerTool: number;
  maxStcPerSession: number | null;
  maxUsdPerSession: number | null;
  automaticPaidRetries: false;
  paidCallsAuthorizedInThisBuild: boolean;
}

export interface PaidToolsConfig {
  requested: boolean;
  apiKeyConfigured: boolean;
  status: PaidModeStatus;
  runtimeToolsRegistered: false;
  // Runtime paid-execution flag (STOCKTRENDS_ENABLE_PAID_EXECUTION). Only ever
  // `true` when paid mode is requested with a configured API key AND the
  // operator explicitly enabled execution. Never enabled by the paid-tools
  // flag or the API key alone.
  executionEnabled: boolean;
  // Runtime pricing/preflight posture (STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT).
  // Defaults to `true`; live paid ST-IM execution fails closed when this is
  // below the required posture.
  requirePricingPreflight: boolean;
  spendPolicy: PaidSpendPolicy;
  readonly apiKey?: string;
}

export interface PaidEndpointPolicy {
  toolName: string;
  endpointPath: string;
  httpMethod: PaidHttpMethod;
  access: "paid";
  pricingRuleId: string;
  requiresPricingPreflight: true;
  supportsLongitudinalAnalysis: boolean;
  requiredHistoryPair?: string;
}

export interface PaidAuthConfig {
  apiBaseUrl: URL;
  paidTools: PaidToolsConfig;
}

export interface PaidCallPolicyInput {
  endpointPath: string;
  toolName: string;
  httpMethod?: PaidHttpMethod;
  targetUrl?: URL;
  pricingDetermined: boolean;
  localPolicyAuthorized: boolean;
}

export interface PaidCostEstimate {
  amount: number;
  unit: PaidCostUnit;
  authoritative: boolean;
  pricingSource: PaidPricingSource;
  pricingRuleId?: string;
  fetchedAt?: string;
  estimatedAt?: string;
}

export interface PaidUsageSnapshot {
  paidCallsThisSession?: number;
  paidCallsByTool?: Readonly<Record<string, number | undefined>>;
  stcSpentThisSession?: number;
  usdSpentThisSession?: number;
}

export interface PaidCallCapState {
  limit: number;
  current: number;
  projected: number;
  wouldExceed: boolean;
}

export interface PaidBudgetCapState {
  limit: number | null;
  current: number;
  projected: number;
  wouldExceed: boolean;
  configured: boolean;
}

export interface PaidCapState {
  perSessionPaidCallCap: PaidCallCapState;
  perToolPaidCallCap: PaidCallCapState;
  stcBudgetCap: PaidBudgetCapState;
  usdBudgetCap: PaidBudgetCapState;
  automaticPaidRetries: false;
}

export interface PaidPreflightEvaluationInput {
  toolName: string;
  endpointPath: string;
  httpMethod: PaidHttpMethod;
  targetUrl: URL;
  costEstimate?: PaidCostEstimate | null;
  usage?: PaidUsageSnapshot;
}

export interface PaidPreflightDecision {
  toolName: string;
  endpointPath: string;
  httpMethod: PaidHttpMethod;
  estimatedCost: PaidCostEstimate | null;
  costEstimateAuthoritative: boolean;
  pricingSource: PaidPricingSource | null;
  fetchedAt?: string;
  estimatedAt?: string;
  localPolicyDecision: PaidLocalPolicyDecision;
  denialReason: PaidPreflightDenialReason | null;
  capState: PaidCapState;
}

export const PHASE3_PAID_TOOLS_REGISTERED = false;

// Compile-time / build-level paid-execution capability. This build CONTAINS the
// live subscription/API-key execution path for the paired paid ST-IM tools, so
// the constant is `true`. Flipping it on does NOT by itself authorize any call:
// every live call additionally requires the runtime execution flag
// (STOCKTRENDS_ENABLE_PAID_EXECUTION=true), the paid-tools flag, an API key,
// authoritative static pricing/preflight, and at least one satisfied nonzero
// cap. Its operative role is a cross-build kill switch: an older, non-execution
// build (constant `false`) can never execute regardless of environment.
export const PHASE4_PAID_EXECUTION_ENABLED = true;

// The paired paid ST-IM tool *definitions* are registered as MCP tools when
// paid mode is enabled with an API key. Execution occurs only when every gate
// in `evaluatePaidPreflight` passes; otherwise every invocation fails closed.
export const PHASE4_PAID_STIM_FOUNDATION_TOOLS_REGISTERED = true;

// The build-level authorization constant mirrored into the default spend
// policy. `paidCallsAuthorizedInThisBuild` reflects the execution-capable state
// of the build (equal to PHASE4_PAID_EXECUTION_ENABLED); it is one of the two
// build-level indicators that must agree with the runtime gates before a call.
export const PAID_CALLS_AUTHORIZED_IN_THIS_BUILD = PHASE4_PAID_EXECUTION_ENABLED;

export const DEFAULT_PAID_SPEND_POLICY: PaidSpendPolicy = Object.freeze({
  pricingPreflightRequired: true,
  maxPaidCallsPerSession: 0,
  maxPaidCallsPerTool: 0,
  maxStcPerSession: null,
  maxUsdPerSession: null,
  automaticPaidRetries: false,
  paidCallsAuthorizedInThisBuild: PAID_CALLS_AUTHORIZED_IN_THIS_BUILD
});

export const PAID_ENDPOINT_POLICIES: readonly PaidEndpointPolicy[] = Object.freeze([
  {
    toolName: "stocktrends_get_stim_latest",
    endpointPath: "/v1/stim/latest",
    httpMethod: "GET",
    access: "paid",
    pricingRuleId: "stim_latest_paid",
    requiresPricingPreflight: true,
    supportsLongitudinalAnalysis: false,
    requiredHistoryPair: "stocktrends_get_stim_history"
  },
  {
    toolName: "stocktrends_get_stim_history",
    endpointPath: "/v1/stim/history",
    httpMethod: "GET",
    access: "paid",
    pricingRuleId: "stim_history_paid",
    requiresPricingPreflight: true,
    supportsLongitudinalAnalysis: true
  },
  {
    toolName: "stocktrends_get_indicators_latest",
    endpointPath: "/v1/indicators/latest",
    httpMethod: "GET",
    access: "paid",
    pricingRuleId: "indicators_latest_paid",
    requiresPricingPreflight: true,
    supportsLongitudinalAnalysis: false,
    requiredHistoryPair: "stocktrends_get_indicators_history"
  },
  {
    toolName: "stocktrends_get_indicators_history",
    endpointPath: "/v1/indicators/history",
    httpMethod: "GET",
    access: "paid",
    pricingRuleId: "indicators_history_paid",
    requiresPricingPreflight: true,
    supportsLongitudinalAnalysis: true
  }
]);

export function createPaidToolsConfig(input: {
  requested: boolean;
  apiKey?: string;
  status: PaidModeStatus;
  spendPolicy?: PaidSpendPolicy;
  executionEnabled?: boolean;
  requirePricingPreflight?: boolean;
}): PaidToolsConfig {
  // Execution can only be enabled when paid mode is fully configured (requested
  // + API key). The flag alone, or with a missing key, must never enable it.
  const executionEnabled = Boolean(input.executionEnabled && input.requested && input.apiKey);

  const config: PaidToolsConfig = {
    requested: input.requested,
    apiKeyConfigured: Boolean(input.apiKey),
    status: input.status,
    runtimeToolsRegistered: PHASE3_PAID_TOOLS_REGISTERED,
    executionEnabled,
    requirePricingPreflight: input.requirePricingPreflight ?? true,
    spendPolicy: input.spendPolicy ?? DEFAULT_PAID_SPEND_POLICY
  };

  if (input.apiKey) {
    Object.defineProperty(config, "apiKey", {
      value: input.apiKey,
      enumerable: false
    });
  }

  return Object.freeze(config);
}

export function buildPaidAuthHeaders(config: PaidAuthConfig, input: PaidPreflightEvaluationInput): Record<string, string> {
  const decision = evaluatePaidPreflight(config, input);
  assertPaidPreflightAuthorized(decision);

  if (!config.paidTools.requested || !config.paidTools.apiKey) {
    throw new StockTrendsMcpError("paid_auth_unavailable", {
      endpointPath: input.endpointPath,
      toolName: input.toolName,
      httpMethod: input.httpMethod,
      denialReason: "paid_auth_unavailable",
      detail: "Paid mode is not configured with an API key."
    });
  }

  return {
    "X-API-Key": config.paidTools.apiKey
  };
}

export function assertApprovedAuthTarget(apiBaseUrl: URL, targetUrl: URL): void {
  if (!isApprovedAuthTarget(apiBaseUrl, targetUrl)) {
    throw new StockTrendsMcpError("unapproved_auth_host", {
      detail: "Auth headers may only be created for the configured Stock Trends API origin."
    });
  }
}

export function assertPaidEndpointAllowed(endpointPath: string, httpMethod: PaidHttpMethod = "GET", toolName?: string): void {
  const policy = findPaidEndpointPolicy(endpointPath, httpMethod);

  if (!policy || (toolName && policy.toolName !== toolName)) {
    throw new StockTrendsMcpError("unapproved_paid_endpoint", {
      endpointPath,
      toolName,
      httpMethod,
      denialReason: policy ? "tool_endpoint_mismatch" : "endpoint_not_allowlisted"
    });
  }
}

export function assertPaidCallPolicySatisfied(config: PaidAuthConfig, input: PaidCallPolicyInput): void {
  const decision = evaluatePaidPreflight(config, {
    endpointPath: input.endpointPath,
    toolName: input.toolName,
    httpMethod: input.httpMethod ?? "GET",
    targetUrl: input.targetUrl ?? new URL(input.endpointPath, config.apiBaseUrl),
    costEstimate: input.pricingDetermined
      ? {
          amount: 0,
          unit: "STC",
          authoritative: input.localPolicyAuthorized,
          pricingSource: "explicit_test_estimate",
          estimatedAt: "1970-01-01T00:00:00.000Z"
        }
      : null
  });

  assertPaidPreflightAuthorized(decision);
}

export function evaluatePaidPreflight(config: PaidAuthConfig, input: PaidPreflightEvaluationInput): PaidPreflightDecision {
  const policy = findPaidEndpointPolicy(input.endpointPath, input.httpMethod);
  const capState = buildCapState(config.paidTools.spendPolicy, input.toolName, input.costEstimate ?? null, input.usage);
  const baseDecision = buildBaseDecision(input, input.costEstimate ?? null, capState);

  if (!policy) {
    return deny(baseDecision, "endpoint_not_allowlisted");
  }

  if (policy.toolName !== input.toolName) {
    return deny(baseDecision, "tool_endpoint_mismatch");
  }

  if (!isApprovedAuthTarget(config.apiBaseUrl, input.targetUrl) || input.targetUrl.pathname !== input.endpointPath) {
    return deny(baseDecision, "host_not_approved");
  }

  if (!config.paidTools.requested || !config.paidTools.apiKeyConfigured) {
    return deny(baseDecision, "paid_auth_unavailable");
  }

  // Pricing/preflight posture must remain at (or above) its required default.
  // If an operator disables it (STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT=false),
  // live paid ST-IM execution fails closed rather than proceeding without a
  // mandatory preflight.
  if (!config.paidTools.requirePricingPreflight) {
    return deny(baseDecision, "missing_pricing");
  }

  if (!hasValidEstimatedCost(input.costEstimate)) {
    return deny(baseDecision, "missing_pricing");
  }

  if (!isAuthoritativeCostForPolicy(input.costEstimate, policy)) {
    return deny(baseDecision, "non_authoritative_pricing");
  }

  if (capWouldBeExceeded(capState)) {
    return deny(baseDecision, "cap_exceeded");
  }

  // Terminal execution gate: both build-level indicators AND the runtime
  // execution flag must agree. The runtime flag is deliberately evaluated here,
  // after pricing/cap gates, so a denied decision still carries authoritative
  // cost and cap-state metadata; ordering never weakens fail-closed behavior
  // because no auth header or fetch happens on any denial.
  if (
    !config.paidTools.executionEnabled ||
    !config.paidTools.spendPolicy.paidCallsAuthorizedInThisBuild ||
    !PHASE4_PAID_EXECUTION_ENABLED
  ) {
    return deny(baseDecision, "paid_execution_disabled");
  }

  return Object.freeze({
    ...baseDecision,
    localPolicyDecision: "allow",
    denialReason: null
  });
}

export function assertPaidPreflightAuthorized(decision: PaidPreflightDecision): void {
  if (decision.localPolicyDecision === "allow") {
    return;
  }

  throw errorForPreflightDenial(decision);
}

function buildBaseDecision(
  input: PaidPreflightEvaluationInput,
  estimatedCost: PaidCostEstimate | null,
  capState: PaidCapState
): PaidPreflightDecision {
  return Object.freeze({
    toolName: input.toolName,
    endpointPath: input.endpointPath,
    httpMethod: input.httpMethod,
    estimatedCost,
    costEstimateAuthoritative: Boolean(estimatedCost?.authoritative),
    pricingSource: estimatedCost?.pricingSource ?? null,
    fetchedAt: estimatedCost?.fetchedAt,
    estimatedAt: estimatedCost?.estimatedAt,
    localPolicyDecision: "deny",
    denialReason: null,
    capState
  });
}

function deny(decision: PaidPreflightDecision, denialReason: PaidPreflightDenialReason): PaidPreflightDecision {
  return Object.freeze({
    ...decision,
    localPolicyDecision: "deny",
    denialReason
  });
}

function errorForPreflightDenial(decision: PaidPreflightDecision): StockTrendsMcpError {
  const safeData = {
    endpointPath: decision.endpointPath,
    toolName: decision.toolName,
    httpMethod: decision.httpMethod,
    denialReason: decision.denialReason ?? "paid_policy_denied",
    pricingSource: decision.pricingSource ?? undefined
  };

  if (decision.denialReason === "endpoint_not_allowlisted" || decision.denialReason === "tool_endpoint_mismatch") {
    return new StockTrendsMcpError("unapproved_paid_endpoint", safeData);
  }

  if (decision.denialReason === "host_not_approved") {
    return new StockTrendsMcpError("unapproved_auth_host", safeData);
  }

  if (decision.denialReason === "paid_auth_unavailable") {
    return new StockTrendsMcpError("paid_auth_unavailable", {
      ...safeData,
      detail: "Paid mode is not configured."
    });
  }

  if (decision.denialReason === "missing_pricing") {
    return new StockTrendsMcpError("paid_pricing_missing", safeData);
  }

  if (decision.denialReason === "non_authoritative_pricing") {
    return new StockTrendsMcpError("paid_pricing_non_authoritative", safeData);
  }

  if (decision.denialReason === "cap_exceeded") {
    return new StockTrendsMcpError("paid_spend_cap_exceeded", safeData);
  }

  if (decision.denialReason === "paid_execution_disabled") {
    return new StockTrendsMcpError("paid_execution_disabled", safeData);
  }

  return new StockTrendsMcpError("paid_policy_denied", safeData);
}

function isApprovedAuthTarget(apiBaseUrl: URL, targetUrl: URL): boolean {
  return (
    targetUrl.protocol === "https:" &&
    !targetUrl.username &&
    !targetUrl.password &&
    !targetUrl.hash &&
    targetUrl.origin === apiBaseUrl.origin
  );
}

function findPaidEndpointPolicy(endpointPath: string, httpMethod: PaidHttpMethod): PaidEndpointPolicy | undefined {
  return PAID_ENDPOINT_POLICIES.find((policy) => policy.endpointPath === endpointPath && policy.httpMethod === httpMethod);
}

function hasValidEstimatedCost(costEstimate: PaidCostEstimate | null | undefined): costEstimate is PaidCostEstimate {
  return Boolean(
    costEstimate &&
      Number.isFinite(costEstimate.amount) &&
      costEstimate.amount >= 0 &&
      (costEstimate.unit === "STC" || costEstimate.unit === "USD") &&
      (costEstimate.pricingSource === "pricing_catalog" ||
        costEstimate.pricingSource === "cost_estimate" ||
        costEstimate.pricingSource === "explicit_test_estimate")
  );
}

function isAuthoritativeCostForPolicy(costEstimate: PaidCostEstimate, policy: PaidEndpointPolicy): boolean {
  if (!costEstimate.authoritative) {
    return false;
  }

  if (costEstimate.pricingSource === "pricing_catalog") {
    return costEstimate.pricingRuleId === policy.pricingRuleId;
  }

  return true;
}

function buildCapState(
  spendPolicy: PaidSpendPolicy,
  toolName: string,
  costEstimate: PaidCostEstimate | null,
  usage: PaidUsageSnapshot = {}
): PaidCapState {
  const paidCallsThisSession = nonNegative(usage.paidCallsThisSession);
  const paidCallsForTool = nonNegative(usage.paidCallsByTool?.[toolName]);
  const stcSpentThisSession = nonNegative(usage.stcSpentThisSession);
  const usdSpentThisSession = nonNegative(usage.usdSpentThisSession);
  const stcDelta = costEstimate?.unit === "STC" ? costEstimate.amount : 0;
  const usdDelta = costEstimate?.unit === "USD" ? costEstimate.amount : 0;

  return Object.freeze({
    perSessionPaidCallCap: Object.freeze({
      limit: spendPolicy.maxPaidCallsPerSession,
      current: paidCallsThisSession,
      projected: paidCallsThisSession + 1,
      wouldExceed: paidCallsThisSession + 1 > spendPolicy.maxPaidCallsPerSession
    }),
    perToolPaidCallCap: Object.freeze({
      limit: spendPolicy.maxPaidCallsPerTool,
      current: paidCallsForTool,
      projected: paidCallsForTool + 1,
      wouldExceed: paidCallsForTool + 1 > spendPolicy.maxPaidCallsPerTool
    }),
    stcBudgetCap: buildBudgetCapState(spendPolicy.maxStcPerSession, stcSpentThisSession, stcDelta),
    usdBudgetCap: buildBudgetCapState(spendPolicy.maxUsdPerSession, usdSpentThisSession, usdDelta),
    automaticPaidRetries: spendPolicy.automaticPaidRetries
  });
}

function buildBudgetCapState(limit: number | null, current: number, delta: number): PaidBudgetCapState {
  const projected = current + delta;

  return Object.freeze({
    limit,
    current,
    projected,
    wouldExceed: delta > 0 && (limit === null || projected > limit),
    configured: limit !== null
  });
}

function capWouldBeExceeded(capState: PaidCapState): boolean {
  return (
    capState.perSessionPaidCallCap.wouldExceed ||
    capState.perToolPaidCallCap.wouldExceed ||
    capState.stcBudgetCap.wouldExceed ||
    capState.usdBudgetCap.wouldExceed
  );
}

function nonNegative(value: number | undefined): number {
  return Number.isFinite(value) && value && value > 0 ? value : 0;
}

// --- Paid ST-IM invocation preflight (foundation, no execution) ---
//
// This is the structural preflight the registered ST-IM tool handlers use. It
// records the endpoint/tool/host/paid-mode gate results for transparent wrapper
// metadata and returns a deterministic denial reason. It never constructs an
// auth header and never returns an authorized decision: in this build every
// path terminates at the hard paid-execution-disabled gate. A future,
// separately reviewed execution branch is what flips the hard gate on and adds
// the pricing/cap/auth/fetch path; until then this function fails closed.

export type PaidInvocationDenialReason =
  | "paid_tools_disabled"
  | "paid_auth_blocked_missing_api_key"
  | "endpoint_not_allowlisted"
  | "tool_endpoint_mismatch"
  | "host_not_approved"
  | "paid_execution_disabled";

export interface PaidInvocationPreflightInput {
  toolName: string;
  endpointPath: string;
  httpMethod: PaidHttpMethod;
  targetUrl: URL;
}

export interface PaidInvocationPreflightResult {
  toolName: string;
  endpointPath: string;
  httpMethod: PaidHttpMethod;
  endpointAllowlisted: boolean;
  toolAllowlisted: boolean;
  hostApproved: boolean;
  paidModeConfigured: boolean;
  executionRuntimeEnabled: boolean;
  hardExecutionGateEnabled: boolean;
  // `true` only when every structural gate passes (endpoint/tool/host allowlist,
  // paid mode configured, API key present, runtime execution flag). It does NOT
  // authorize a call: pricing/cap gates in `evaluatePaidPreflight` still apply.
  structurallyAuthorized: boolean;
  denialReason: PaidInvocationDenialReason | null;
}

// Build-level execution capability only (both compile-time indicators).
export function isPaidExecutionEnabledInBuild(config: PaidAuthConfig): boolean {
  return PHASE4_PAID_EXECUTION_ENABLED && config.paidTools.spendPolicy.paidCallsAuthorizedInThisBuild;
}

// Effective execution gate: build capability AND the runtime execution flag.
// Still not a per-call authorization — pricing/caps are enforced separately.
export function isPaidExecutionRuntimeEnabled(config: PaidAuthConfig): boolean {
  return isPaidExecutionEnabledInBuild(config) && config.paidTools.executionEnabled;
}

export function getPaidEndpointPolicy(endpointPath: string, httpMethod: PaidHttpMethod = "GET"): PaidEndpointPolicy | undefined {
  return findPaidEndpointPolicy(endpointPath, httpMethod);
}

export function isApprovedPaidAuthTarget(apiBaseUrl: URL, targetUrl: URL): boolean {
  return isApprovedAuthTarget(apiBaseUrl, targetUrl);
}

export function evaluatePaidInvocationPreflight(
  config: PaidAuthConfig,
  input: PaidInvocationPreflightInput
): PaidInvocationPreflightResult {
  const policy = findPaidEndpointPolicy(input.endpointPath, input.httpMethod);
  const endpointAllowlisted = Boolean(policy);
  const toolAllowlisted = Boolean(policy && policy.toolName === input.toolName);
  const hostApproved = isApprovedAuthTarget(config.apiBaseUrl, input.targetUrl) && input.targetUrl.pathname === input.endpointPath;
  const paidModeConfigured = config.paidTools.requested && config.paidTools.apiKeyConfigured;
  const executionRuntimeEnabled = isPaidExecutionRuntimeEnabled(config);
  const denialReason = resolveInvocationDenialReason({
    config,
    endpointAllowlisted,
    toolAllowlisted,
    hostApproved,
    executionRuntimeEnabled
  });

  return Object.freeze({
    toolName: input.toolName,
    endpointPath: input.endpointPath,
    httpMethod: input.httpMethod,
    endpointAllowlisted,
    toolAllowlisted,
    hostApproved,
    paidModeConfigured,
    executionRuntimeEnabled,
    hardExecutionGateEnabled: executionRuntimeEnabled,
    structurallyAuthorized: denialReason === null,
    denialReason
  });
}

function resolveInvocationDenialReason(args: {
  config: PaidAuthConfig;
  endpointAllowlisted: boolean;
  toolAllowlisted: boolean;
  hostApproved: boolean;
  executionRuntimeEnabled: boolean;
}): PaidInvocationDenialReason | null {
  if (!args.endpointAllowlisted) {
    return "endpoint_not_allowlisted";
  }

  if (!args.toolAllowlisted) {
    return "tool_endpoint_mismatch";
  }

  if (!args.hostApproved) {
    return "host_not_approved";
  }

  if (!args.config.paidTools.requested) {
    return "paid_tools_disabled";
  }

  if (!args.config.paidTools.apiKeyConfigured) {
    return "paid_auth_blocked_missing_api_key";
  }

  // Exposure without the runtime execution flag (or an execution-incapable
  // build): tools are visible but every call fails closed here — no pricing is
  // resolved and no auth header is built.
  if (!args.executionRuntimeEnabled) {
    return "paid_execution_disabled";
  }

  // Every structural gate passed and execution is runtime-enabled. Pricing and
  // cap gates in `evaluatePaidPreflight` still decide whether a call proceeds.
  return null;
}

// --- In-memory per-session paid usage accounting ---
//
// Counters live for the lifetime of a single MCP server instance (single-user,
// local stdio) and reset on restart. There is NO persistence. A counter is
// incremented only when an authorized paid call is actually attempted (i.e.
// after every gate passed and the auth header was built, immediately before the
// single fetch), so denied/invalid invocations never advance usage.

export interface PaidUsageTracker {
  paidCallsThisSession: number;
  paidCallsByTool: Record<string, number>;
  stcSpentThisSession: number;
  usdSpentThisSession: number;
}

export function createPaidUsageTracker(): PaidUsageTracker {
  return {
    paidCallsThisSession: 0,
    paidCallsByTool: {},
    stcSpentThisSession: 0,
    usdSpentThisSession: 0
  };
}

export function snapshotPaidUsage(tracker: PaidUsageTracker): PaidUsageSnapshot {
  return {
    paidCallsThisSession: tracker.paidCallsThisSession,
    paidCallsByTool: { ...tracker.paidCallsByTool },
    stcSpentThisSession: tracker.stcSpentThisSession,
    usdSpentThisSession: tracker.usdSpentThisSession
  };
}

// Record an attempted authorized paid call. Increments the per-session and
// per-tool call counters and the matching budget counter for the estimated
// cost. Call this exactly once per authorized fetch attempt, before `fetch`.
export function recordPaidCallAttempt(tracker: PaidUsageTracker, toolName: string, estimatedCost: PaidCostEstimate | null): void {
  tracker.paidCallsThisSession += 1;
  tracker.paidCallsByTool[toolName] = (tracker.paidCallsByTool[toolName] ?? 0) + 1;

  if (estimatedCost && Number.isFinite(estimatedCost.amount) && estimatedCost.amount > 0) {
    if (estimatedCost.unit === "STC") {
      tracker.stcSpentThisSession += estimatedCost.amount;
    } else if (estimatedCost.unit === "USD") {
      tracker.usdSpentThisSession += estimatedCost.amount;
    }
  }
}
