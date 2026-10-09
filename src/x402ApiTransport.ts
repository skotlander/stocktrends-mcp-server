import { MAX_X402_CHALLENGE_RESPONSE_BYTES, MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES, type FetchLike, type JsonObject } from "./stocktrendsClient.js";

/**
 * Narrow production-shaped x402 upstream boundary.  It deliberately owns one
 * canonical resource only; it is not a general-purpose HTTP client and is not
 * constructed by normal MCP startup. Payment forwarding is reachable only
 * through the separate Remote-MCP activation boundary.
 */
export const X402_STIM_LATEST_RESOURCE = "https://api.stocktrends.com/v1/stim/latest";
export const X402_STIM_LATEST_PATH = "/v1/stim/latest";
export const X402_MARKET_EPOCH_LATEST_RESOURCE = "https://api.stocktrends.com/v1/market/epoch/latest";
export const X402_MARKET_EPOCH_LATEST_PATH = "/v1/market/epoch/latest";
export const X402_MARKET_EPOCH_HISTORY_RESOURCE = "https://api.stocktrends.com/v1/market/epoch/history";
export const X402_MARKET_EPOCH_HISTORY_PATH = "/v1/market/epoch/history";
export const X402_STIM_HISTORY_PATH = "/v1/stim/history";
export const X402_STIM_HISTORY_RESOURCE = "https://api.stocktrends.com/v1/stim/history";
export const X402_INDICATORS_LATEST_PATH = "/v1/indicators/latest";
export const X402_INDICATORS_LATEST_RESOURCE = "https://api.stocktrends.com/v1/indicators/latest";
export const X402_INDICATORS_HISTORY_PATH = "/v1/indicators/history";
export const X402_INDICATORS_HISTORY_RESOURCE = "https://api.stocktrends.com/v1/indicators/history";
export const X402_SELECTIONS_LATEST_PATH = "/v1/selections/latest";
export const X402_SELECTIONS_LATEST_RESOURCE = "https://api.stocktrends.com/v1/selections/latest";
export const X402_MARKET_REGIME_LATEST_PATH = "/v1/market/regime/latest";
export const X402_MARKET_REGIME_LATEST_RESOURCE = "https://api.stocktrends.com/v1/market/regime/latest";
export const X402_MARKET_REGIME_HISTORY_PATH = "/v1/market/regime/history";
export const X402_MARKET_REGIME_HISTORY_RESOURCE = "https://api.stocktrends.com/v1/market/regime/history";
export const X402_BREADTH_SECTOR_LATEST_PATH = "/v1/breadth/sector/latest";
export const X402_BREADTH_SECTOR_LATEST_RESOURCE = "https://api.stocktrends.com/v1/breadth/sector/latest";
export const X402_LEADERSHIP_SUMMARY_LATEST_PATH = "/v1/leadership/summary/latest";
export const X402_LEADERSHIP_SUMMARY_LATEST_RESOURCE = "https://api.stocktrends.com/v1/leadership/summary/latest";
export const X402_AGENT_SCREENER_TOP_PATH = "/v1/agent/screener/top";
export const X402_AGENT_SCREENER_TOP_RESOURCE = "https://api.stocktrends.com/v1/agent/screener/top";
export const X402_TRANSPORT_TIMEOUT_MS = 10_000;
export const MAX_X402_PAYMENT_SIGNATURE_BYTES = MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES;

export type X402ApiTransportError =
  | "x402_transport_target_rejected"
  | "x402_transport_payment_forwarding_disabled"
  | "x402_transport_timeout"
  | "x402_transport_unavailable"
  | "x402_transport_redirect_rejected"
  | "x402_transport_payment_rejected"
  | "x402_transport_unexpected_status"
  | "x402_transport_malformed_response";

export class X402ApiTransportFailure extends Error {
  constructor(readonly code: X402ApiTransportError) {
    super(code);
    this.name = "X402ApiTransportFailure";
  }
}

export interface X402AnonymousChallengeRequest {
  endpointPath: string;
  method: "GET";
  symbolExchange: string;
}

export interface X402PaymentBearingRequest extends X402AnonymousChallengeRequest {
  /** Reserved for a separately approved live-payment activation only. */
  paymentSignature: string;
}

/** A deliberately closed set of Remote-MCP x402 GET targets. */
export interface X402RemoteGetRoute {
  endpointPath: string;
  resource: string;
  allowedQueryKeys: readonly string[];
}

export const X402_REMOTE_GET_ROUTES: readonly X402RemoteGetRoute[] = Object.freeze([
  { endpointPath: X402_STIM_LATEST_PATH, resource: X402_STIM_LATEST_RESOURCE, allowedQueryKeys: ["symbol_exchange"] },
  { endpointPath: X402_STIM_HISTORY_PATH, resource: X402_STIM_HISTORY_RESOURCE, allowedQueryKeys: ["symbol_exchange", "start", "end", "limit", "include_gaps"] },
  { endpointPath: X402_INDICATORS_LATEST_PATH, resource: X402_INDICATORS_LATEST_RESOURCE, allowedQueryKeys: ["symbol_exchange", "cs_only"] },
  { endpointPath: X402_INDICATORS_HISTORY_PATH, resource: X402_INDICATORS_HISTORY_RESOURCE, allowedQueryKeys: ["symbol_exchange", "cs_only", "start", "end", "limit"] },
  { endpointPath: X402_SELECTIONS_LATEST_PATH, resource: X402_SELECTIONS_LATEST_RESOURCE, allowedQueryKeys: ["exchange", "min_prob13wk", "limit", "include_data", "include_mast", "cs_only"] },
  { endpointPath: X402_MARKET_REGIME_LATEST_PATH, resource: X402_MARKET_REGIME_LATEST_RESOURCE, allowedQueryKeys: [] },
  { endpointPath: X402_MARKET_REGIME_HISTORY_PATH, resource: X402_MARKET_REGIME_HISTORY_RESOURCE, allowedQueryKeys: ["limit", "start_date"] },
  { endpointPath: X402_BREADTH_SECTOR_LATEST_PATH, resource: X402_BREADTH_SECTOR_LATEST_RESOURCE, allowedQueryKeys: ["exchange", "cs_only", "include_unknown", "min_price", "min_volume", "group_level", "limit"] },
  { endpointPath: X402_LEADERSHIP_SUMMARY_LATEST_PATH, resource: X402_LEADERSHIP_SUMMARY_LATEST_RESOURCE, allowedQueryKeys: ["min_rsi", "min_mt_cnt", "limit_overall", "limit_bucket"] },
  { endpointPath: X402_AGENT_SCREENER_TOP_PATH, resource: X402_AGENT_SCREENER_TOP_RESOURCE, allowedQueryKeys: ["exchange", "trend", "min_rsi", "min_mt_cnt", "min_trend_cnt", "sort", "limit", "weekdate"] },
  { endpointPath: X402_MARKET_EPOCH_LATEST_PATH, resource: X402_MARKET_EPOCH_LATEST_RESOURCE, allowedQueryKeys: [] },
  { endpointPath: X402_MARKET_EPOCH_HISTORY_PATH, resource: X402_MARKET_EPOCH_HISTORY_RESOURCE, allowedQueryKeys: ["limit", "start_date", "end_date"] }
]);

export interface X402RemoteGetRequest {
  endpointPath: string;
  method: "GET";
  query: Readonly<Record<string, string>>;
}

export interface X402RemoteGetPaymentRequest extends X402RemoteGetRequest {
  paymentSignature: string;
}

export interface X402ApiChallenge {
  status: 402;
  paymentRequiredHeader: string;
  body: JsonObject;
}

export interface X402PaidApiResponse {
  status: 200;
  body: JsonObject;
  paymentResponse: JsonObject;
}

/**
 * Both methods remain constrained to the one fixed API resource.
 */
export interface X402PaymentBearingTransport {
  requestAnonymousChallenge(request: X402AnonymousChallengeRequest): Promise<X402ApiChallenge>;
  requestWithPayment(request: X402PaymentBearingRequest): Promise<X402PaidApiResponse>;
}

export class ProductionX402ApiTransport implements X402PaymentBearingTransport {
  private readonly fetchFn: FetchLike;
  private readonly timeoutMs: number;

  constructor(options: { fetchFn?: FetchLike; timeoutMs?: number } = {}) {
    if (!options.fetchFn && typeof globalThis.fetch !== "function") {
      throw new X402ApiTransportFailure("x402_transport_unavailable");
    }
    this.fetchFn = options.fetchFn ?? ((input, init) => globalThis.fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? X402_TRANSPORT_TIMEOUT_MS;
  }

  async requestAnonymousChallenge(request: X402AnonymousChallengeRequest): Promise<X402ApiChallenge> {
    return this.requestAnonymousChallengeForGet({
      endpointPath: request.endpointPath,
      method: request.method,
      query: { symbol_exchange: normalizeLegacyStimSymbol(request.symbolExchange) }
    });
  }

  async requestAnonymousChallengeForGet(request: X402RemoteGetRequest): Promise<X402ApiChallenge> {
    const url = buildCanonicalRemoteGetUrl(request);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" },
        credentials: "omit",
        redirect: "manual",
        signal: controller.signal
      });
      if (response.redirected || (response.status >= 300 && response.status < 400)) {
        await cancelBody(response);
        throw new X402ApiTransportFailure("x402_transport_redirect_rejected");
      }
      if (response.status !== 402) {
        await cancelBody(response);
        throw new X402ApiTransportFailure("x402_transport_unexpected_status");
      }
      if (!isJson(response)) {
        await cancelBody(response);
        throw new X402ApiTransportFailure("x402_transport_malformed_response");
      }
      const paymentRequiredHeader = response.headers.get("payment-required");
      if (!isBoundedBase64(paymentRequiredHeader, MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES)) {
        await cancelBody(response);
        throw new X402ApiTransportFailure("x402_transport_malformed_response");
      }
      const headerValue = decodeJsonObject(paymentRequiredHeader);
      const body = await readBoundedJsonObject(response);
      // Fetch implementations report aborts from body readers differently. The
      // controller is deliberately still alive here, so normalize every such
      // body-stage timeout to the same fail-closed timeout taxonomy.
      if (controller.signal.aborted) throw new X402ApiTransportFailure("x402_transport_timeout");
      if (!headerValue || !body || !isSameJson(headerValue, body.payment_required) || !isApprovedRequirements(headerValue)) {
        throw new X402ApiTransportFailure("x402_transport_malformed_response");
      }
      // Values are returned exactly as API-authored JSON values; no pricing,
      // resource, network, recipient, or expiry field is synthesized or changed.
      return { status: 402, paymentRequiredHeader, body };
    } catch (error) {
      if (error instanceof X402ApiTransportFailure) throw error;
      if (controller.signal.aborted || isAbortError(error)) throw new X402ApiTransportFailure("x402_transport_timeout");
      throw new X402ApiTransportFailure("x402_transport_unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  async requestWithPayment(request: X402PaymentBearingRequest): Promise<X402PaidApiResponse> {
    return this.requestWithPaymentForGet({
      endpointPath: request.endpointPath,
      method: request.method,
      query: { symbol_exchange: normalizeLegacyStimSymbol(request.symbolExchange) },
      paymentSignature: request.paymentSignature
    });
  }

  async requestWithPaymentForGet(request: X402RemoteGetPaymentRequest): Promise<X402PaidApiResponse> {
    const url = buildCanonicalRemoteGetUrl(request);
    if (!isBoundedBase64(request.paymentSignature, MAX_X402_PAYMENT_SIGNATURE_BYTES)) {
      throw new X402ApiTransportFailure("x402_transport_target_rejected");
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "stocktrends-mcp-server/1.0",
          "PAYMENT-SIGNATURE": request.paymentSignature
        },
        credentials: "omit",
        redirect: "manual",
        signal: controller.signal
      });
      if (response.redirected || (response.status >= 300 && response.status < 400)) {
        await cancelBody(response);
        throw new X402ApiTransportFailure("x402_transport_redirect_rejected");
      }
      // An explicit 402 is a definitive authorization rejection. Every other
      // non-success status is deliberately left as an opaque fail-closed error
      // to the tool, which reports an uncertain outcome rather than guessing.
      if (response.status === 402) {
        await cancelBody(response);
        throw new X402ApiTransportFailure("x402_transport_payment_rejected");
      }
      if (response.status !== 200 || !isJson(response)) {
        await cancelBody(response);
        throw new X402ApiTransportFailure("x402_transport_unexpected_status");
      }
      const paymentResponseHeader = response.headers.get("payment-response");
      const paymentResponse = isBoundedBase64(paymentResponseHeader, MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES)
        ? decodeJsonObject(paymentResponseHeader)
        : null;
      const body = await readBoundedJsonObject(response);
      if (controller.signal.aborted) throw new X402ApiTransportFailure("x402_transport_timeout");
      if (!paymentResponse || !body) throw new X402ApiTransportFailure("x402_transport_malformed_response");
      return { status: 200, body, paymentResponse };
    } catch (error) {
      if (error instanceof X402ApiTransportFailure) throw error;
      if (controller.signal.aborted || isAbortError(error)) throw new X402ApiTransportFailure("x402_transport_timeout");
      throw new X402ApiTransportFailure("x402_transport_unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeLegacyStimSymbol(value: string): string {
  if (!/^[A-Z0-9][A-Z0-9.-]{0,31}[-_][NQABTI]$/.test(value)) {
    throw new X402ApiTransportFailure("x402_transport_target_rejected");
  }
  return value.replace(/_([NQABTI])$/, "-$1");
}

function buildCanonicalRemoteGetUrl(request: X402RemoteGetRequest): URL {
  const route = X402_REMOTE_GET_ROUTES.find((candidate) => candidate.endpointPath === request.endpointPath);
  if (!route || request.method !== "GET") {
    throw new X402ApiTransportFailure("x402_transport_target_rejected");
  }
  const queryKeys = Object.keys(request.query).sort();
  if (queryKeys.some((key) => !route.allowedQueryKeys.includes(key)) || queryKeys.some((key) => typeof request.query[key] !== "string" || !request.query[key])) {
    throw new X402ApiTransportFailure("x402_transport_target_rejected");
  }
  const url = new URL(route.resource);
  for (const key of queryKeys) url.searchParams.set(key, request.query[key]);
  return url;
}

function isJson(response: Response): boolean {
  return response.headers.get("content-type")?.toLowerCase().includes("application/json") ?? false;
}

async function readBoundedJsonObject(response: Response): Promise<JsonObject | null> {
  const declared = response.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > MAX_X402_CHALLENGE_RESPONSE_BYTES)) {
    await cancelBody(response);
    return null;
  }
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array) || (size += value.byteLength) > MAX_X402_CHALLENGE_RESPONSE_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    return isObject(parsed) ? parsed : null;
  } catch { return null; } finally { reader.releaseLock(); }
}

function decodeJsonObject(value: string): JsonObject | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64").toString("utf8"));
    return isObject(parsed) ? parsed : null;
  } catch { return null; }
}

function isBoundedBase64(value: string | null, maxBytes: number): value is string {
  return Boolean(value && value.length <= maxBytes && value.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(value));
}

function isApprovedRequirements(value: JsonObject): boolean {
  const resource = value.resource;
  return (
    value.x402Version === 2 &&
    isObject(resource) &&
    typeof resource.url === "string" &&
    X402_REMOTE_GET_ROUTES.some((route) => route.resource === resource.url) &&
    Array.isArray(value.accepts) &&
    value.accepts.length > 0 &&
    value.accepts.every((accepted) => {
      if (!isObject(accepted) || !isObject(accepted.extra)) return false;
      return isSameJson(accepted.extra.resource, resource);
    })
  );
}

function isSameJson(left: unknown, right: unknown): boolean { return stableJson(left) === stableJson(right); }
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function isObject(value: unknown): value is JsonObject { return typeof value === "object" && value !== null && !Array.isArray(value); }
function isAbortError(error: unknown): boolean { return error instanceof Error && error.name === "AbortError"; }
async function cancelBody(response: Response): Promise<void> { try { await response.body?.cancel(); } catch { /* ignored */ } }
