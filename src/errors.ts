import { ProtocolError, ProtocolErrorCode } from "@modelcontextprotocol/server";

export type StockTrendsErrorCode =
  | "invalid_config"
  | "unsupported_transport"
  | "remote_transport_incompatible_config"
  | "invalid_resource_request"
  | "api_unavailable"
  | "timeout"
  | "malformed_api_response"
  | "unexpected_auth_required"
  | "unexpected_paid_endpoint"
  | "unexpected_forbidden"
  | "api_not_found"
  | "api_rate_limited"
  | "api_unapproved_redirect"
  | "api_unexpected_status"
  | "paid_auth_unavailable"
  | "paid_policy_denied"
  | "paid_pricing_missing"
  | "paid_pricing_non_authoritative"
  | "paid_spend_cap_exceeded"
  | "paid_execution_disabled"
  | "unapproved_auth_host"
  | "unapproved_paid_endpoint";

export interface SafeErrorData {
  errorCode: StockTrendsErrorCode;
  resourceUri?: string;
  endpointPath?: string;
  status?: number;
  upstreamRequestId?: string;
  toolName?: string;
  httpMethod?: string;
  denialReason?: string;
  pricingSource?: string;
  detail?: string;
}

const ERROR_MESSAGES: Record<StockTrendsErrorCode, string> = {
  invalid_config: "Invalid Stock Trends MCP configuration.",
  unsupported_transport: "Unsupported Stock Trends MCP transport.",
  remote_transport_incompatible_config: "streamable-http cannot start with paid, credential-bearing, or x402 configuration.",
  invalid_resource_request: "Unknown or unsupported public resource request.",
  api_unavailable: "Stock Trends API is unavailable for this public resource.",
  timeout: "Timed out fetching Stock Trends public resource.",
  malformed_api_response: "Stock Trends API returned malformed JSON for this public resource.",
  unexpected_auth_required: "Public Stock Trends resource unexpectedly requires authentication.",
  unexpected_paid_endpoint: "Public Stock Trends resource unexpectedly requires payment.",
  unexpected_forbidden: "Public Stock Trends resource unexpectedly returned forbidden.",
  api_not_found: "Stock Trends public resource endpoint was not found.",
  api_rate_limited: "Stock Trends API rate limited this public resource request.",
  api_unapproved_redirect: "Stock Trends API returned a redirect for this public resource.",
  api_unexpected_status: "Stock Trends API returned an unexpected status for this public resource.",
  paid_auth_unavailable: "Paid Stock Trends authentication is not available.",
  paid_policy_denied: "Paid Stock Trends call is not authorized by local policy.",
  paid_pricing_missing: "Paid Stock Trends call is missing required pricing preflight.",
  paid_pricing_non_authoritative: "Paid Stock Trends pricing preflight is not authoritative enough for execution.",
  paid_spend_cap_exceeded: "Paid Stock Trends call would exceed local spend policy.",
  paid_execution_disabled: "Paid Stock Trends execution is disabled in this build.",
  unapproved_auth_host: "Refusing to create auth headers for an unapproved Stock Trends API host.",
  unapproved_paid_endpoint: "Refusing to authorize an unapproved Stock Trends paid endpoint."
};

export class StockTrendsMcpError extends Error {
  readonly errorCode: StockTrendsErrorCode;
  readonly safeData: Omit<SafeErrorData, "errorCode">;

  constructor(errorCode: StockTrendsErrorCode, safeData: Omit<SafeErrorData, "errorCode"> = {}) {
    super(ERROR_MESSAGES[errorCode]);
    this.name = "StockTrendsMcpError";
    this.errorCode = errorCode;
    this.safeData = safeData;
  }

  toSafeData(): SafeErrorData {
    return {
      errorCode: this.errorCode,
      ...this.safeData
    };
  }

  toMcpError(): ProtocolError {
    return new ProtocolError(toJsonRpcErrorCode(this.errorCode), this.message, this.toSafeData());
  }
}

export function toMcpError(error: unknown): ProtocolError {
  if (error instanceof ProtocolError) {
    return error;
  }

  if (error instanceof StockTrendsMcpError) {
    return error.toMcpError();
  }

  return new StockTrendsMcpError("api_unavailable").toMcpError();
}

export function errorFromHttpStatus(status: number, safeData: Omit<SafeErrorData, "errorCode">): StockTrendsMcpError {
  if (status === 401) {
    return new StockTrendsMcpError("unexpected_auth_required", safeData);
  }

  if (status === 402) {
    return new StockTrendsMcpError("unexpected_paid_endpoint", safeData);
  }

  if (status === 403) {
    return new StockTrendsMcpError("unexpected_forbidden", safeData);
  }

  if (status === 404) {
    return new StockTrendsMcpError("api_not_found", safeData);
  }

  if (status === 429) {
    return new StockTrendsMcpError("api_rate_limited", safeData);
  }

  if (status >= 500) {
    return new StockTrendsMcpError("api_unavailable", safeData);
  }

  return new StockTrendsMcpError("api_unexpected_status", safeData);
}

function toJsonRpcErrorCode(errorCode: StockTrendsErrorCode): ProtocolErrorCode {
  if (
    errorCode === "invalid_config" ||
    errorCode === "unsupported_transport" ||
    errorCode === "remote_transport_incompatible_config" ||
    errorCode === "invalid_resource_request" ||
    errorCode === "unapproved_auth_host" ||
    errorCode === "unapproved_paid_endpoint"
  ) {
    return ProtocolErrorCode.InvalidParams;
  }

  return ProtocolErrorCode.InternalError;
}
