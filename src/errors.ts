import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";

export type StockTrendsErrorCode =
  | "invalid_config"
  | "unsupported_transport"
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
  | "unapproved_auth_host"
  | "unapproved_paid_endpoint";

export interface SafeErrorData {
  errorCode: StockTrendsErrorCode;
  resourceUri?: string;
  endpointPath?: string;
  status?: number;
  upstreamRequestId?: string;
  detail?: string;
}

const ERROR_MESSAGES: Record<StockTrendsErrorCode, string> = {
  invalid_config: "Invalid Stock Trends MCP configuration.",
  unsupported_transport: "Unsupported transport; only stdio is enabled.",
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

  toMcpError(): McpError {
    return new McpError(toJsonRpcErrorCode(this.errorCode), this.message, this.toSafeData());
  }
}

export function toMcpError(error: unknown): McpError {
  if (error instanceof McpError) {
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

function toJsonRpcErrorCode(errorCode: StockTrendsErrorCode): ErrorCode {
  if (
    errorCode === "invalid_config" ||
    errorCode === "unsupported_transport" ||
    errorCode === "invalid_resource_request" ||
    errorCode === "unapproved_auth_host" ||
    errorCode === "unapproved_paid_endpoint"
  ) {
    return ErrorCode.InvalidParams;
  }

  if (errorCode === "timeout") {
    return ErrorCode.RequestTimeout;
  }

  return ErrorCode.InternalError;
}
