import { StockTrendsMcpError } from "./errors.js";

export type PaidModeStatus = "disabled" | "blocked_missing_api_key" | "configured_no_tools_registered";

export interface PaidSpendPolicy {
  pricingPreflightRequired: true;
  maxPaidCallsPerSession: number;
  maxPaidCallsPerTool: number;
  maxStcPerSession: number | null;
  maxUsdPerSession: number | null;
  automaticPaidRetries: false;
  paidCallsAuthorizedInThisBuild: false;
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
  access: "paid";
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
  pricingDetermined: boolean;
  localPolicyAuthorized: boolean;
}

export const PHASE3_PAID_TOOLS_REGISTERED = false;

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
    access: "paid",
    requiresPricingPreflight: true,
    supportsLongitudinalAnalysis: false,
    requiredHistoryPair: "stocktrends_get_stim_history"
  },
  {
    toolName: "stocktrends_get_stim_history",
    endpointPath: "/v1/stim/history",
    access: "paid",
    requiresPricingPreflight: true,
    supportsLongitudinalAnalysis: true
  },
  {
    toolName: "stocktrends_get_indicators_latest",
    endpointPath: "/v1/indicators/latest",
    access: "paid",
    requiresPricingPreflight: true,
    supportsLongitudinalAnalysis: false,
    requiredHistoryPair: "stocktrends_get_indicators_history"
  },
  {
    toolName: "stocktrends_get_indicators_history",
    endpointPath: "/v1/indicators/history",
    access: "paid",
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

export function buildPaidAuthHeaders(config: PaidAuthConfig, targetUrl: URL): Record<string, string> {
  assertApprovedAuthTarget(config.apiBaseUrl, targetUrl);

  if (!config.paidTools.requested || !config.paidTools.apiKey) {
    throw new StockTrendsMcpError("paid_auth_unavailable", {
      detail: "Paid mode is not configured with an API key."
    });
  }

  return {
    "X-API-Key": config.paidTools.apiKey
  };
}

export function assertApprovedAuthTarget(apiBaseUrl: URL, targetUrl: URL): void {
  if (targetUrl.protocol !== "https:" || targetUrl.username || targetUrl.password || targetUrl.hash || targetUrl.origin !== apiBaseUrl.origin) {
    throw new StockTrendsMcpError("unapproved_auth_host", {
      detail: "Auth headers may only be created for the configured Stock Trends API origin."
    });
  }
}

export function assertPaidEndpointAllowed(endpointPath: string): void {
  if (!PAID_ENDPOINT_POLICIES.some((policy) => policy.endpointPath === endpointPath)) {
    throw new StockTrendsMcpError("unapproved_paid_endpoint", {
      endpointPath
    });
  }
}

export function assertPaidCallPolicySatisfied(config: PaidAuthConfig, input: PaidCallPolicyInput): void {
  assertPaidEndpointAllowed(input.endpointPath);

  if (!config.paidTools.requested || !config.paidTools.apiKeyConfigured) {
    throw new StockTrendsMcpError("paid_auth_unavailable", {
      endpointPath: input.endpointPath,
      detail: "Paid mode is not configured."
    });
  }

  if (!input.pricingDetermined || !input.localPolicyAuthorized || !config.paidTools.spendPolicy.paidCallsAuthorizedInThisBuild) {
    throw new StockTrendsMcpError("paid_policy_denied", {
      endpointPath: input.endpointPath,
      detail: "Pricing preflight and local spend policy must authorize the paid call."
    });
  }
}
