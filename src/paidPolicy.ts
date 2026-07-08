import { StockTrendsMcpError } from "./errors.js";

export type PaidModeStatus = "disabled" | "blocked_missing_api_key" | "configured_no_tools_registered";
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
export const PHASE4_PAID_EXECUTION_ENABLED = false;

export const DEFAULT_PAID_SPEND_POLICY: PaidSpendPolicy = Object.freeze({
  pricingPreflightRequired: true,
  maxPaidCallsPerSession: 0,
  maxPaidCallsPerTool: 0,
  maxStcPerSession: null,
  maxUsdPerSession: null,
  automaticPaidRetries: false,
  paidCallsAuthorizedInThisBuild: false
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
}): PaidToolsConfig {
  const config: PaidToolsConfig = {
    requested: input.requested,
    apiKeyConfigured: Boolean(input.apiKey),
    status: input.status,
    runtimeToolsRegistered: PHASE3_PAID_TOOLS_REGISTERED,
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

  if (!hasValidEstimatedCost(input.costEstimate)) {
    return deny(baseDecision, "missing_pricing");
  }

  if (!isAuthoritativeCostForPolicy(input.costEstimate, policy)) {
    return deny(baseDecision, "non_authoritative_pricing");
  }

  if (capWouldBeExceeded(capState)) {
    return deny(baseDecision, "cap_exceeded");
  }

  if (!config.paidTools.spendPolicy.paidCallsAuthorizedInThisBuild || !PHASE4_PAID_EXECUTION_ENABLED) {
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
