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
export const MAX_X402_CHALLENGE_RESPONSE_BYTES = 64 * 1024;

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

export interface PublicDiscoveryRequest {
  endpointPath: string;
  // Only validated, caller-supplied query parameters (e.g. symbol, prefer_exchange).
  searchParams: URLSearchParams;
  resourceUri?: string;
  toolName?: string;
}

// Result of a credential-free public instrument-discovery read. Unlike
// `fetchJson`, this deliberately surfaces the HTTP status and body for the
// resolver's expected 4xx outcomes (400 invalid input, 404 no match, 409
// ambiguity) instead of throwing, so the internal resolver can fail closed with
// candidate matches. Network/timeout/redirect/malformed responses still throw.
export interface PublicDiscoveryResult {
  status: number;
  data: JsonObject | null;
}

export interface NoKeyX402ChallengeRequest {
  endpointPath: string;
  toolName: string;
  searchParams: URLSearchParams;
  approvedHeaderNames: readonly string[];
}

export interface NoKeyX402ChallengeResponse {
  status: number;
  approvedHeaderNamesPresent: string[];
  body: JsonObject | null;
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

  // Credential-free public instrument-discovery GET path used by the internal
  // resolver before any paid boundary. It sends the SAME public headers as
  // `fetchJson` (Accept + User-Agent) and NEVER an `X-API-Key`, Authorization,
  // or payment header. It performs exactly one attempt, never retries, and never
  // follows redirects. Expected discovery statuses (200, plus 400/404/409) are
  // returned to the caller with their parsed JSON body so the resolver can fail
  // closed with candidate matches; redirects, timeouts, and network failures
  // throw. This method is deliberately distinct from `fetchPaid` and can never
  // attach a credential.
  async fetchPublicDiscovery(request: PublicDiscoveryRequest): Promise<PublicDiscoveryResult> {
    const url = this.buildUrl(request.endpointPath);

    for (const [key, value] of request.searchParams) {
      url.searchParams.append(key, value);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    const safeData = { endpointPath: request.endpointPath, resourceUri: request.resourceUri, toolName: request.toolName };

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
        throw new StockTrendsMcpError("timeout", safeData);
      }

      throw new StockTrendsMcpError("api_unavailable", safeData);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      throw new StockTrendsMcpError("api_unapproved_redirect", { ...safeData, status: response.status });
    }

    // Best-effort JSON parse. A JSON body is expected for the resolver's success
    // and documented 4xx cases; a non-JSON body yields `data: null` and the
    // resolver treats it as an unusable response (fail closed).
    let data: JsonObject | null = null;

    if (isJsonResponse(response)) {
      try {
        const parsed = await response.json();
        data = isJsonObject(parsed) ? parsed : null;
      } catch {
        data = null;
      }
    }

    return {
      status: response.status,
      data
    };
  }

  // Dedicated live no-key x402 challenge path. It is deliberately separate
  // from both public-resource/discovery reads and the API-key paid path: one
  // GET attempt, no credentials, no auth/payment/proof header, no body, no
  // redirect following, and no retry. Only approved header NAMES are observed;
  // header values (including x-request-id) are never read or returned.
  async fetchNoKeyX402Challenge(request: NoKeyX402ChallengeRequest): Promise<NoKeyX402ChallengeResponse> {
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
          "User-Agent": "stocktrends-mcp-server/1.0"
        },
        credentials: "omit",
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

    const approvedHeaderNamesPresent = request.approvedHeaderNames
      .map((name) => name.toLowerCase())
      .filter((name) => response.headers.has(name));
    let body: JsonObject | null = null;
    const declaredLengthApproved = hasApprovedX402ChallengeContentLength(response);

    if (!declaredLengthApproved) {
      controller.abort();
      await cancelResponseBody(response);
    } else if (isJsonResponse(response)) {
      try {
        const rawBody = await readBoundedX402ChallengeBody(response, () => controller.abort());
        if (rawBody !== null) {
          const parsed: unknown = JSON.parse(rawBody);
          body = isJsonObject(parsed) ? parsed : null;
        }
      } catch {
        body = null;
      }
    }

    return {
      status: response.status,
      approvedHeaderNamesPresent,
      body
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

function hasApprovedX402ChallengeContentLength(response: Response): boolean {
  const rawLength = response.headers.get("content-length");
  if (rawLength === null) {
    return true;
  }

  if (!/^(?:0|[1-9]\d*)$/.test(rawLength)) {
    return false;
  }

  const declaredLength = Number(rawLength);
  return (
    Number.isSafeInteger(declaredLength) &&
    declaredLength >= 0 &&
    declaredLength <= MAX_X402_CHALLENGE_RESPONSE_BYTES
  );
}

async function readBoundedX402ChallengeBody(
  response: Response,
  abortRequest: () => void
): Promise<string | null> {
  if (!response.body) {
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (!(value instanceof Uint8Array)) {
        abortRequest();
        await reader.cancel();
        return null;
      }

      totalBytes += value.byteLength;
      if (totalBytes > MAX_X402_CHALLENGE_RESPONSE_BYTES) {
        abortRequest();
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    abortRequest();
    try {
      await reader.cancel();
    } catch {
      // The stream may already be aborted or closed. Keep failure local.
    }
    return null;
  } finally {
    reader.releaseLock();
  }
}

async function cancelResponseBody(response: Response): Promise<void> {
  if (!response.body) {
    return;
  }

  try {
    await response.body.cancel();
  } catch {
    // The body may already be aborted or locked. No body data is observed.
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
