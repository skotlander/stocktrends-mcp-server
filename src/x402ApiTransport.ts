import { MAX_X402_CHALLENGE_RESPONSE_BYTES, MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES, type FetchLike, type JsonObject } from "./stocktrendsClient.js";

/**
 * Narrow production-shaped x402 upstream boundary.  It deliberately owns one
 * canonical resource only; it is not a general-purpose HTTP client and is not
 * constructed by normal MCP startup.  Payment forwarding remains a separate,
 * future activation decision.
 */
export const X402_STIM_LATEST_RESOURCE = "https://api.stocktrends.com/v1/stim/latest";
export const X402_STIM_LATEST_PATH = "/v1/stim/latest";
export const X402_TRANSPORT_TIMEOUT_MS = 10_000;

export type X402ApiTransportError =
  | "x402_transport_target_rejected"
  | "x402_transport_payment_forwarding_disabled"
  | "x402_transport_timeout"
  | "x402_transport_unavailable"
  | "x402_transport_redirect_rejected"
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

export interface X402ApiChallenge {
  status: 402;
  paymentRequiredHeader: string;
  body: JsonObject;
}

/**
 * The interface intentionally includes the future payment-bearing operation,
 * while this implementation makes forwarding impossible on every path.
 */
export interface X402PaymentBearingTransport {
  requestAnonymousChallenge(request: X402AnonymousChallengeRequest): Promise<X402ApiChallenge>;
  requestWithPayment(request: X402PaymentBearingRequest): Promise<never>;
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
    const url = buildCanonicalStimUrl(request);
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
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error)) throw new X402ApiTransportFailure("x402_transport_timeout");
      throw new X402ApiTransportFailure("x402_transport_unavailable");
    } finally {
      clearTimeout(timeout);
    }

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
    if (!headerValue || !body || !isSameJson(headerValue, body.payment_required) || !isApprovedRequirements(headerValue)) {
      throw new X402ApiTransportFailure("x402_transport_malformed_response");
    }
    // Values are returned exactly as API-authored JSON values; no pricing,
    // resource, network, recipient, or expiry field is synthesized or changed.
    return { status: 402, paymentRequiredHeader, body };
  }

  async requestWithPayment(_request: X402PaymentBearingRequest): Promise<never> {
    // This must remain a terminal gate.  No configuration option exists that
    // reaches a fetch with PAYMENT-SIGNATURE, Authorization, or X-API-Key.
    throw new X402ApiTransportFailure("x402_transport_payment_forwarding_disabled");
  }
}

function buildCanonicalStimUrl(request: X402AnonymousChallengeRequest): URL {
  if (request.method !== "GET" || request.endpointPath !== X402_STIM_LATEST_PATH || !/^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/.test(request.symbolExchange)) {
    throw new X402ApiTransportFailure("x402_transport_target_rejected");
  }
  const url = new URL(X402_STIM_LATEST_RESOURCE);
  url.searchParams.set("symbol_exchange", request.symbolExchange.replace(/_([NQABTI])$/, "-$1"));
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
    resource.url === X402_STIM_LATEST_RESOURCE &&
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
