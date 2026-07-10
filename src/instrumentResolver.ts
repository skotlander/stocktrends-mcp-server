import type { JsonObject, StockTrendsClient } from "./stocktrendsClient.js";

// --- Internal, credential-free instrument identity resolver ---
//
// This module resolves a caller-supplied instrument identity to exactly one safe
// canonical `symbol_exchange` BEFORE any paid boundary is entered. It is an
// INTERNAL helper only — it adds no public MCP tool and no MCP resource. Every
// request it makes is credential-free (no `X-API-Key`, no Authorization, no
// payment header) and reaches only the public instrument-discovery endpoints.
//
// Critical resolver requirement (PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO
// §6.3): `/v1/instruments/resolve` defaults `prefer_exchange=N`, so a bare raw
// symbol would let the API silently auto-select the US listing. This resolver
// therefore NEVER relies on that default for a bare symbol: it detects ambiguity
// itself via `/v1/instruments/lookup` (`count`) and fails closed with candidate
// matches. `/v1/instruments/resolve` is used only for an explicit
// `symbol`+`exchange` pair, and only with an explicit `prefer_exchange` equal to
// the caller's stated exchange (never the default `N`).

export const INSTRUMENTS_LOOKUP_ENDPOINT_PATH = "/v1/instruments/lookup";
export const INSTRUMENTS_RESOLVE_ENDPOINT_PATH = "/v1/instruments/resolve";

// Confirmed API `VALID_EXCHANGES` (live 400 body: ['A','B','I','N','Q','T']).
export const VALID_EXCHANGES = ["N", "Q", "A", "B", "T", "I"] as const;
export type ExchangeCode = (typeof VALID_EXCHANGES)[number];

const VALID_EXCHANGE_SET = new Set<string>(VALID_EXCHANGES);

const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}$/;
const SYMBOL_EXCHANGE_UNDERSCORE_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/;
const SYMBOL_EXCHANGE_HYPHEN_PATTERN = /^([A-Z0-9][A-Z0-9.-]{0,31})-([NQABTI])$/;

export type InstrumentIdentitySource = "symbol_exchange" | "symbol_and_exchange" | "resolved_symbol";
export type InstrumentResolutionSource = "instruments_lookup" | "instruments_resolve";

export interface InstrumentIdentity {
  symbol: string;
  exchange: ExchangeCode;
  // MCP-facing canonical identity (underscore form, e.g. AAPL_Q). Never sent to
  // the API as a query parameter.
  symbol_exchange: string;
  // API-valid hyphen form actually sent to the Stock Trends API (e.g. AAPL-Q).
  api_symbol_exchange: string;
  identity_source: InstrumentIdentitySource;
}

export interface InstrumentResolutionMetadata {
  // True only when a credential-free discovery call was actually made to derive
  // the canonical identity (bare symbol, or explicit symbol+exchange verified via
  // resolve). False for a directly-supplied canonical `symbol_exchange`.
  resolution_used: boolean;
  resolution_source: InstrumentResolutionSource | null;
  resolved_symbol_exchange: string | null;
}

export type InstrumentResolutionFailureReason =
  | "invalid_identity"
  | "identity_conflict"
  | "ambiguous_symbol"
  | "symbol_not_found"
  | "resolution_unavailable";

export interface InstrumentResolutionSuccess {
  ok: true;
  identity: InstrumentIdentity;
  resolution: InstrumentResolutionMetadata;
}

export interface InstrumentResolutionFailure {
  ok: false;
  reason: InstrumentResolutionFailureReason;
  detail: string;
  resolutionSource: InstrumentResolutionSource | null;
  // Candidate canonical matches (API hyphen form) surfaced on ambiguity so the
  // caller can re-invoke with an explicit identity. Empty otherwise.
  candidateMatches: string[];
}

export type InstrumentResolutionOutcome = InstrumentResolutionSuccess | InstrumentResolutionFailure;

export interface InstrumentResolverInput {
  symbol_exchange?: string;
  symbol?: string;
  exchange?: string;
}

// Resolve a caller-supplied identity to exactly one safe canonical identity,
// credential-free. Never enters any paid boundary; callers must treat any
// `ok: false` outcome as a hard fail-closed denial (no pricing preflight, no cap
// debit, no auth header, no paid fetch).
export async function resolveInstrumentIdentity(
  client: StockTrendsClient,
  input: InstrumentResolverInput
): Promise<InstrumentResolutionOutcome> {
  const symbolExchange = normalizeOptional(input.symbol_exchange);
  const symbol = normalizeOptional(input.symbol);
  const exchange = normalizeOptional(input.exchange);

  // 1. Canonical `symbol_exchange` — the trusted primary key. No network call
  //    (mirrors the paid ST-IM tools). Only a conflict with an also-supplied
  //    `symbol`/`exchange` fails closed.
  if (symbolExchange !== undefined) {
    return resolveFromCanonical(symbolExchange, symbol, exchange);
  }

  // 2. Explicit `symbol` + `exchange` — treated as an explicit identity, not a
  //    guess. Verified credential-free via resolve with an explicit
  //    `prefer_exchange` (never the default N).
  if (symbol !== undefined && exchange !== undefined) {
    return resolveFromSymbolAndExchange(client, symbol, exchange);
  }

  // 3. Bare raw `symbol` — ambiguity detected via lookup `count`, never via
  //    resolve's default `prefer_exchange=N` auto-pick.
  if (symbol !== undefined) {
    return resolveFromBareSymbol(client, symbol);
  }

  return failure("invalid_identity", "Provide either symbol_exchange, symbol + exchange, or a bare symbol.", null);
}

function resolveFromCanonical(symbolExchange: string, symbol: string | undefined, exchange: string | undefined): InstrumentResolutionOutcome {
  if (!SYMBOL_EXCHANGE_UNDERSCORE_PATTERN.test(symbolExchange)) {
    return failure(
      "invalid_identity",
      "symbol_exchange must be canonical uppercase SYMBOL_EXCHANGE with an exchange in {N,Q,A,B,T,I}.",
      null
    );
  }

  const [canonicalSymbol, canonicalExchange] = splitUnderscore(symbolExchange);

  // A supplied raw symbol/exchange that contradicts the canonical key is a
  // conflict — never silently prefer one over a contradictory other.
  if (symbol !== undefined && symbol !== canonicalSymbol) {
    return failure("identity_conflict", "symbol conflicts with the symbol implied by symbol_exchange.", null);
  }

  if (exchange !== undefined && exchange !== canonicalExchange) {
    return failure("identity_conflict", "exchange conflicts with the exchange implied by symbol_exchange.", null);
  }

  return success(
    {
      symbol: canonicalSymbol,
      exchange: canonicalExchange as ExchangeCode,
      symbol_exchange: symbolExchange,
      api_symbol_exchange: `${canonicalSymbol}-${canonicalExchange}`,
      identity_source: "symbol_exchange"
    },
    { resolution_used: false, resolution_source: null, resolved_symbol_exchange: null }
  );
}

async function resolveFromSymbolAndExchange(
  client: StockTrendsClient,
  symbol: string,
  exchange: string
): Promise<InstrumentResolutionOutcome> {
  if (!SYMBOL_PATTERN.test(symbol)) {
    return failure("invalid_identity", "symbol must be canonical uppercase alphanumeric.", null);
  }

  if (!VALID_EXCHANGE_SET.has(exchange)) {
    return failure("invalid_identity", "exchange must be one of {N,Q,A,B,T,I}.", null);
  }

  // Explicit identity: resolve with prefer_exchange = the caller's stated
  // exchange, never the default N, so no exchange is guessed on the caller's
  // behalf. A 409 (exchange not among candidates) or 404 (no such instrument)
  // fails closed.
  const params = new URLSearchParams({ symbol, prefer_exchange: exchange });
  let result;

  try {
    result = await client.fetchPublicDiscovery({ endpointPath: INSTRUMENTS_RESOLVE_ENDPOINT_PATH, searchParams: params });
  } catch {
    return failure("resolution_unavailable", "Instrument resolve is unavailable; failing closed before any paid boundary.", "instruments_resolve");
  }

  if (result.status === 409) {
    return failure(
      "ambiguous_symbol",
      "Instrument resolve returned an ambiguous match set for the supplied symbol and exchange.",
      "instruments_resolve",
      extractResolveMatches(result.data)
    );
  }

  if (result.status === 404) {
    return failure("symbol_not_found", "No instrument matched the supplied symbol and exchange.", "instruments_resolve");
  }

  if (result.status !== 200 || result.data === null) {
    return failure("resolution_unavailable", "Instrument resolve returned an unusable response; failing closed.", "instruments_resolve");
  }

  const resolvedHyphen = readString(result.data.symbol_exchange);
  const parsed = resolvedHyphen ? parseHyphenSymbolExchange(resolvedHyphen) : null;

  if (!parsed) {
    return failure("resolution_unavailable", "Instrument resolve returned no usable canonical symbol_exchange.", "instruments_resolve");
  }

  // Defensive consistency check: the resolved identity must match what the
  // caller explicitly asked for. Any drift fails closed rather than silently
  // querying a different instrument.
  if (parsed.symbol !== symbol || parsed.exchange !== exchange) {
    return failure("identity_conflict", "Resolved instrument did not match the supplied symbol and exchange.", "instruments_resolve");
  }

  return success(
    {
      symbol: parsed.symbol,
      exchange: parsed.exchange,
      symbol_exchange: `${parsed.symbol}_${parsed.exchange}`,
      api_symbol_exchange: `${parsed.symbol}-${parsed.exchange}`,
      identity_source: "symbol_and_exchange"
    },
    { resolution_used: true, resolution_source: "instruments_resolve", resolved_symbol_exchange: `${parsed.symbol}-${parsed.exchange}` }
  );
}

async function resolveFromBareSymbol(client: StockTrendsClient, symbol: string): Promise<InstrumentResolutionOutcome> {
  if (!SYMBOL_PATTERN.test(symbol)) {
    return failure("invalid_identity", "symbol must be canonical uppercase alphanumeric.", null);
  }

  // Ambiguity oracle: lookup surfaces the full cross-exchange match set. We do
  // NOT call resolve here, precisely so the default prefer_exchange=N can never
  // auto-select an exchange for a bare ambiguous symbol.
  const params = new URLSearchParams({ symbol });
  let result;

  try {
    result = await client.fetchPublicDiscovery({ endpointPath: INSTRUMENTS_LOOKUP_ENDPOINT_PATH, searchParams: params });
  } catch {
    return failure("resolution_unavailable", "Instrument lookup is unavailable; failing closed before any paid boundary.", "instruments_lookup");
  }

  if (result.status === 404) {
    return failure("symbol_not_found", "No instrument matched the supplied symbol.", "instruments_lookup");
  }

  if (result.status !== 200 || result.data === null) {
    return failure("resolution_unavailable", "Instrument lookup returned an unusable response; failing closed.", "instruments_lookup");
  }

  // A valid, API-reported integer `count` is REQUIRED. We never substitute the
  // parsed match-set length for a missing/invalid count: proceeding only when the
  // API itself reports exactly one match is what keeps a malformed lookup body
  // (e.g. a single row with no `count`, or a `count` inconsistent with the data)
  // from silently entering the paid boundary. Fail closed otherwise.
  const reportedCount = result.data.count;

  if (typeof reportedCount !== "number" || !Number.isInteger(reportedCount) || reportedCount < 0) {
    return failure("resolution_unavailable", "Instrument lookup returned no usable integer count; failing closed.", "instruments_lookup");
  }

  const matches = extractLookupMatches(result.data);

  if (reportedCount === 0) {
    return failure("symbol_not_found", "Instrument lookup returned no matches for the supplied symbol.", "instruments_lookup");
  }

  if (reportedCount > 1) {
    return failure(
      "ambiguous_symbol",
      "The supplied symbol is ambiguous across exchanges; supply a canonical symbol_exchange to disambiguate.",
      "instruments_lookup",
      matches
    );
  }

  // reportedCount === 1: require the data to contain exactly one usable canonical
  // match so a count that disagrees with the body (zero or multiple usable rows)
  // fails closed rather than resolving.
  if (matches.length !== 1) {
    return failure(
      "resolution_unavailable",
      "Instrument lookup reported count 1 but did not contain exactly one usable canonical symbol_exchange; failing closed.",
      "instruments_lookup"
    );
  }

  const parsed = parseHyphenSymbolExchange(matches[0]);

  if (!parsed) {
    return failure("resolution_unavailable", "Instrument lookup returned no usable canonical symbol_exchange.", "instruments_lookup");
  }

  return success(
    {
      symbol: parsed.symbol,
      exchange: parsed.exchange,
      symbol_exchange: `${parsed.symbol}_${parsed.exchange}`,
      api_symbol_exchange: `${parsed.symbol}-${parsed.exchange}`,
      identity_source: "resolved_symbol"
    },
    { resolution_used: true, resolution_source: "instruments_lookup", resolved_symbol_exchange: `${parsed.symbol}-${parsed.exchange}` }
  );
}

// --- Parsing helpers (API-authored discovery bodies; no recomputation) ---

function extractLookupMatches(data: JsonObject): string[] {
  const rows = Array.isArray(data.data) ? data.data : [];
  const matches: string[] = [];

  for (const row of rows) {
    if (isJsonObject(row)) {
      const symbolExchange = readString(row.symbol_exchange);

      if (symbolExchange && SYMBOL_EXCHANGE_HYPHEN_PATTERN.test(symbolExchange)) {
        matches.push(symbolExchange);
      }
    }
  }

  return matches;
}

function extractResolveMatches(data: JsonObject | null): string[] {
  if (!data) {
    return [];
  }

  // The 409 ambiguity body nests matches under `detail`.
  const detail = isJsonObject(data.detail) ? data.detail : data;
  const rawMatches = Array.isArray(detail.matches) ? detail.matches : [];
  const matches: string[] = [];

  for (const entry of rawMatches) {
    const symbolExchange = typeof entry === "string" ? entry : isJsonObject(entry) ? readString(entry.symbol_exchange) : undefined;

    if (symbolExchange && SYMBOL_EXCHANGE_HYPHEN_PATTERN.test(symbolExchange)) {
      matches.push(symbolExchange);
    }
  }

  return matches;
}

function parseHyphenSymbolExchange(value: string): { symbol: string; exchange: ExchangeCode } | null {
  const match = SYMBOL_EXCHANGE_HYPHEN_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  return { symbol: match[1], exchange: match[2] as ExchangeCode };
}

function splitUnderscore(symbolExchange: string): [string, string] {
  const separatorIndex = symbolExchange.lastIndexOf("_");
  return [symbolExchange.slice(0, separatorIndex), symbolExchange.slice(separatorIndex + 1)];
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function success(identity: InstrumentIdentity, resolution: InstrumentResolutionMetadata): InstrumentResolutionSuccess {
  return { ok: true, identity, resolution };
}

function failure(
  reason: InstrumentResolutionFailureReason,
  detail: string,
  resolutionSource: InstrumentResolutionSource | null,
  candidateMatches: string[] = []
): InstrumentResolutionFailure {
  return { ok: false, reason, detail, resolutionSource, candidateMatches };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
