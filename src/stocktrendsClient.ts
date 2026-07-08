import type { StockTrendsMcpConfig } from "./config.js";
import { errorFromHttpStatus, StockTrendsMcpError } from "./errors.js";

export interface PublicEndpointRequest {
  endpointPath: string;
  resourceUri?: string;
  toolName?: string;
}

export interface PublicEndpointResponse {
  data: JsonObject;
  status: number;
  upstreamRequestId?: string;
}

export type JsonObject = Record<string, unknown>;
export type FetchLike = (input: URL, init: RequestInit) => Promise<Response>;

// Selected, non-secret ST-IM response metadata headers captured from a paid
// response. Every field is optional (the metering middleware only emits each
// when its decision includes it); absent values are `null`.
export interface PaidResponseHeaders {
  pricingRule: string | null;
  paymentRequired: string | null;
  acceptedPaymentMethods: string | null;
  quotaLimit: string | null;
  quotaPeriod: string | null;
}

export interface PaidEndpointRequest {
  endpointPath: string;
  toolName: string;
  // Only validated, caller-supplied query parameters. Constructed by the tool.
  searchParams: URLSearchParams;
  // Auth headers built solely inside the coupled paid boundary AFTER every gate
  // passes. Merged over the public headers. Never logged.
  authHeaders: Record<string, string>;
}

export interface PaidEndpointResponse {
  data: JsonObject;
  status: number;
  requestId: string | null;
  headers: PaidResponseHeaders;
}

export class StockTrendsClient {
  readonly apiBaseOrigin: string;
  private readonly fetchFn: FetchLike;

  constructor(
    private readonly config: StockTrendsMcpConfig,
    fetchFn?: FetchLike
  ) {
    if (!fetchFn && typeof globalThis.fetch !== "function") {
      throw new StockTrendsMcpError("invalid_config", {
        detail: "Global fetch is unavailable in this Node runtime."
      });
    }

    this.fetchFn = fetchFn ?? ((input, init) => globalThis.fetch(input, init));
    this.apiBaseOrigin = config.apiBaseUrl.origin;
  }

  buildUrl(endpointPath: string): URL {
    if (!endpointPath.startsWith("/") || endpointPath.startsWith("//") || endpointPath.includes("://")) {
      throw new StockTrendsMcpError("invalid_resource_request", {
        endpointPath
      });
    }

    const url = new URL(endpointPath, this.apiBaseOrigin);

    if (url.origin !== this.apiBaseOrigin) {
      throw new StockTrendsMcpError("invalid_resource_request", {
        endpointPath
      });
    }

    return url;
  }

  async fetchJson(request: PublicEndpointRequest): Promise<PublicEndpointResponse> {
    const url = this.buildUrl(request.endpointPath);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    let response: Response;

    try {
      response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "stocktrends-mcp-server/1.0"
        },
        redirect: "manual",
        signal: controller.signal
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        throw new StockTrendsMcpError("timeout", safeRequestData(request));
      }

      throw new StockTrendsMcpError("api_unavailable", safeRequestData(request));
    } finally {
      clearTimeout(timeout);
    }

    const upstreamRequestId = getUpstreamRequestId(response);
    const safeData = {
      ...safeRequestData(request),
      status: response.status,
      upstreamRequestId
    };

    if (response.status >= 300 && response.status < 400) {
      throw new StockTrendsMcpError("api_unapproved_redirect", safeData);
    }

    if (!response.ok) {
      throw errorFromHttpStatus(response.status, safeData);
    }

    if (!isJsonResponse(response)) {
      throw new StockTrendsMcpError("malformed_api_response", safeData);
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new StockTrendsMcpError("malformed_api_response", safeData);
    }

    if (!isJsonObject(data)) {
      throw new StockTrendsMcpError("malformed_api_response", safeData);
    }

    return {
      data,
      status: response.status,
      upstreamRequestId
    };
  }

  // Explicitly gated paid GET path. Reachable only from inside the coupled paid
  // execution boundary, AFTER every preflight gate has passed and the caller has
  // built the `X-API-Key` header. It performs exactly one attempt, never
  // retries, never follows redirects, and never sends a request body. The
  // credential-bearing headers are passed in by the caller and are never logged.
  async fetchPaid(request: PaidEndpointRequest): Promise<PaidEndpointResponse> {
    const url = this.buildUrl(request.endpointPath);

    for (const [key, value] of request.searchParams) {
      url.searchParams.append(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    const safeData = { endpointPath: request.endpointPath, toolName: request.toolName };

    let response: Response;

    try {
      response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "stocktrends-mcp-server/1.0",
          ...request.authHeaders
        },
        redirect: "manual",
        signal: controller.signal
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        throw new StockTrendsMcpError("timeout", safeData);
      }

      throw new StockTrendsMcpError("api_unavailable", safeData);
    } finally {
      clearTimeout(timeout);
    }

    const upstreamRequestId = getUpstreamRequestId(response);
    const statusData = { ...safeData, status: response.status, upstreamRequestId };

    // No retries, no alternate endpoint, no auth switch. Any redirect or non-2xx
    // is a deterministic error. A 402 maps to unexpected_paid_endpoint and is
    // surfaced as safe metadata by the tool — never signed, paid, or retried.
    if (response.status >= 300 && response.status < 400) {
      throw new StockTrendsMcpError("api_unapproved_redirect", statusData);
    }

    if (!response.ok) {
      throw errorFromHttpStatus(response.status, statusData);
    }

    if (!isJsonResponse(response)) {
      throw new StockTrendsMcpError("malformed_api_response", statusData);
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new StockTrendsMcpError("malformed_api_response", statusData);
    }

    if (!isJsonObject(data)) {
      throw new StockTrendsMcpError("malformed_api_response", statusData);
    }

    return {
      data,
      status: response.status,
      requestId: readRequestId(data, upstreamRequestId),
      headers: readPaidResponseHeaders(response)
    };
  }
}

function readRequestId(data: JsonObject, upstreamRequestId: string | undefined): string | null {
  const bodyRequestId = data.request_id;

  if (typeof bodyRequestId === "string" && bodyRequestId.trim()) {
    return bodyRequestId;
  }

  return upstreamRequestId ?? null;
}

function readPaidResponseHeaders(response: Response): PaidResponseHeaders {
  return {
    pricingRule: response.headers.get("x-stocktrends-pricing-rule"),
    paymentRequired: response.headers.get("x-stocktrends-payment-required"),
    acceptedPaymentMethods: response.headers.get("x-stocktrends-accepted-payment-methods"),
    quotaLimit: response.headers.get("x-stocktrends-quota-limit"),
    quotaPeriod: response.headers.get("x-stocktrends-quota-period")
  };
}

function safeRequestData(request: PublicEndpointRequest): { resourceUri?: string; endpointPath?: string; toolName?: string } {
  return {
    resourceUri: request.resourceUri,
    endpointPath: request.endpointPath,
    toolName: request.toolName
  };
}

function getUpstreamRequestId(response: Response): string | undefined {
  return response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? undefined;
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/json") || contentType.includes("+json");
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
