import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.js";
import { resolveInstrumentIdentity } from "../src/instrumentResolver.js";
import { StockTrendsClient, type FetchLike } from "../src/stocktrendsClient.js";
import { jsonResponse, textResponse } from "./helpers.js";

// Mock-only coverage of the internal credential-free instrument resolver
// (src/instrumentResolver.ts). No live network calls; no API key is used.

const MOCK_KEY = "resolver-secret-must-never-be-sent";

interface DiscoveryRoutes {
  lookup?: (url: URL) => Response | Promise<Response>;
  resolve?: (url: URL) => Response | Promise<Response>;
}

function routedFetch(routes: DiscoveryRoutes = {}): ReturnType<typeof vi.fn<FetchLike>> {
  return vi.fn<FetchLike>(async (url) => {
    switch (url.pathname) {
      case "/v1/instruments/lookup":
        return (routes.lookup ?? (() => jsonResponse(lookupBody("IBM", ["IBM-N"]))))(url);
      case "/v1/instruments/resolve":
        return (routes.resolve ?? (() => jsonResponse(resolveSuccessBody("IBM-N"))))(url);
      default:
        return jsonResponse({ ok: true });
    }
  });
}

function buildClient(fetchFn: FetchLike): StockTrendsClient {
  // A configured API key on the client must never reach the credential-free
  // discovery path; the resolver only ever calls fetchPublicDiscovery.
  return new StockTrendsClient(parseConfig({ STOCKTRENDS_ENABLE_PAID_TOOLS: "true", STOCKTRENDS_API_KEY: MOCK_KEY }), fetchFn);
}

function lookupBody(symbol: string, symbolExchanges: string[]): Record<string, unknown> {
  return {
    request_id: "req-lookup-1",
    symbol,
    cs_only: true,
    details: false,
    count: symbolExchanges.length,
    data: symbolExchanges.map((symbolExchange) => {
      const [sym, exchange] = symbolExchange.split("-");
      return { symbol: sym, exchange, type: "CS", currency: "USD", name: `${sym} Inc`, symbol_exchange: symbolExchange };
    }),
    hint: "Use symbol_exchange (e.g. IBM-N) or symbol+exchange."
  };
}

function resolveSuccessBody(symbolExchange: string): Record<string, unknown> {
  const [symbol, exchange] = symbolExchange.split("-");
  return {
    request_id: "req-resolve-1",
    symbol,
    exchange,
    symbol_exchange: symbolExchange,
    resolved_by: "prefer_exchange",
    prefer_exchange: exchange
  };
}

function resolve409Body(symbol: string, matches: string[]): Record<string, unknown> {
  return {
    detail: {
      request_id: "req-resolve-409",
      error: "ambiguous_symbol",
      symbol,
      matches,
      hint: "Supply a canonical symbol_exchange."
    }
  };
}

function discoveryCalls(fetchFn: ReturnType<typeof vi.fn<FetchLike>>, pathname: string): URL[] {
  return fetchFn.mock.calls.map(([url]) => url).filter((url) => url.pathname === pathname);
}

function hasApiKeyAnywhere(fetchFn: ReturnType<typeof vi.fn<FetchLike>>): boolean {
  return fetchFn.mock.calls.some(([, init]) =>
    Object.keys((init.headers as Record<string, string>) ?? {}).some((key) => key.toLowerCase() === "x-api-key")
  );
}

describe("instrument resolver — canonical symbol_exchange (no network)", () => {
  it("accepts a canonical underscore identity and converts it to the API hyphen form", async () => {
    const fetchFn = routedFetch();
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol_exchange: "IBM_N" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.identity).toMatchObject({
      symbol: "IBM",
      exchange: "N",
      symbol_exchange: "IBM_N",
      api_symbol_exchange: "IBM-N",
      identity_source: "symbol_exchange"
    });
    expect(outcome.resolution).toMatchObject({ resolution_used: false, resolution_source: null });
    // Canonical identity is trusted: no lookup and no resolve call at all.
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails closed when a supplied symbol conflicts with the canonical symbol_exchange", async () => {
    const fetchFn = routedFetch();
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol_exchange: "IBM_N", symbol: "MSFT" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("identity_conflict");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails closed when a supplied exchange conflicts with the canonical symbol_exchange", async () => {
    const fetchFn = routedFetch();
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol_exchange: "IBM_N", exchange: "Q" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("identity_conflict");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe("instrument resolver — bare raw symbol (lookup-first ambiguity)", () => {
  it("resolves a unique bare symbol via lookup count==1, credential-free, without touching resolve", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse(lookupBody("IBM", ["IBM-N"])) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.identity).toMatchObject({
      symbol: "IBM",
      exchange: "N",
      symbol_exchange: "IBM_N",
      api_symbol_exchange: "IBM-N",
      identity_source: "resolved_symbol"
    });
    expect(outcome.resolution).toMatchObject({ resolution_used: true, resolution_source: "instruments_lookup", resolved_symbol_exchange: "IBM-N" });

    // Lookup only — resolve is never called for a bare symbol.
    expect(discoveryCalls(fetchFn, "/v1/instruments/lookup")).toHaveLength(1);
    expect(discoveryCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);
    expect(hasApiKeyAnywhere(fetchFn)).toBe(false);
  });

  it("does NOT trust resolve's default prefer_exchange=N for a bare ambiguous symbol; fails closed via lookup count>1", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse(lookupBody("TD", ["TD-N", "TD-T"])) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "TD" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("ambiguous_symbol");
    expect(outcome.candidateMatches).toEqual(["TD-N", "TD-T"]);
    expect(outcome.resolutionSource).toBe("instruments_lookup");

    // The critical §6.3 guarantee: the bare-symbol path uses lookup, never
    // resolve, and never sends any prefer_exchange parameter.
    expect(discoveryCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);
    const lookupCall = discoveryCalls(fetchFn, "/v1/instruments/lookup")[0];
    expect(lookupCall.searchParams.has("prefer_exchange")).toBe(false);
    expect([...fetchFn.mock.calls].every(([url]) => !url.searchParams.has("prefer_exchange"))).toBe(true);
  });

  it("fails closed on a lookup 404 (no-match) for a bare symbol", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse({ detail: { error: "not_found" } }, 404) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "ZZZZQ" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("symbol_not_found");
    expect(discoveryCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);
  });

  it("fails closed on a lookup count==0 body for a bare symbol", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse(lookupBody("ZZZZQ", [])) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "ZZZZQ" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("symbol_not_found");
  });

  it("fails closed when lookup is unavailable (non-JSON / malformed)", async () => {
    const fetchFn = routedFetch({ lookup: () => textResponse("gateway down", 200, { "content-type": "text/plain" }) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("resolution_unavailable");
  });
});

describe("instrument resolver — malformed lookup count must fail closed (never resolve from data length)", () => {
  it("fails closed when the lookup body has no count field, even with a single usable match", async () => {
    const fetchFn = routedFetch({
      lookup: () => jsonResponse({ request_id: "r", symbol: "IBM", data: [{ symbol_exchange: "IBM-N" }] })
    });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("resolution_unavailable");
    // Never fell back to matches.length; resolve is never attempted.
    expect(discoveryCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);
  });

  it("fails closed when the lookup count is non-integer, even with a single usable match", async () => {
    const fetchFn = routedFetch({
      lookup: () => jsonResponse({ request_id: "r", symbol: "IBM", count: 1.5, data: [{ symbol_exchange: "IBM-N" }] })
    });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("resolution_unavailable");
  });

  it("fails closed when the lookup count is a stringified number, even with a single usable match", async () => {
    const fetchFn = routedFetch({
      lookup: () => jsonResponse({ request_id: "r", symbol: "IBM", count: "1", data: [{ symbol_exchange: "IBM-N" }] })
    });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("resolution_unavailable");
  });

  it("fails closed when the lookup count is negative", async () => {
    const fetchFn = routedFetch({
      lookup: () => jsonResponse({ request_id: "r", symbol: "IBM", count: -1, data: [{ symbol_exchange: "IBM-N" }] })
    });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("resolution_unavailable");
  });

  it("fails closed when count==1 but the body contains zero usable matches", async () => {
    const fetchFn = routedFetch({
      lookup: () => jsonResponse({ request_id: "r", symbol: "IBM", count: 1, data: [{ symbol_exchange: "not-a-valid-key" }] })
    });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("resolution_unavailable");
  });

  it("fails closed when count==1 but the body contains multiple usable matches (count/data inconsistency)", async () => {
    const fetchFn = routedFetch({
      lookup: () => jsonResponse({ request_id: "r", symbol: "IBM", count: 1, data: [{ symbol_exchange: "IBM-N" }, { symbol_exchange: "IBM-Q" }] })
    });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "IBM" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("resolution_unavailable");
  });
});

describe("instrument resolver — explicit symbol + exchange (resolve, explicit prefer_exchange)", () => {
  it("treats symbol+exchange as an explicit identity and resolves via prefer_exchange=E (never default N)", async () => {
    const fetchFn = routedFetch({ resolve: () => jsonResponse(resolveSuccessBody("TD-T")) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "TD", exchange: "T" });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.identity).toMatchObject({
      symbol: "TD",
      exchange: "T",
      symbol_exchange: "TD_T",
      api_symbol_exchange: "TD-T",
      identity_source: "symbol_and_exchange"
    });
    expect(outcome.resolution).toMatchObject({ resolution_used: true, resolution_source: "instruments_resolve" });

    // Resolve is called with the caller's explicit exchange as prefer_exchange —
    // never the default N — and lookup is not used for this path.
    const resolveCall = discoveryCalls(fetchFn, "/v1/instruments/resolve")[0];
    expect(resolveCall.searchParams.get("symbol")).toBe("TD");
    expect(resolveCall.searchParams.get("prefer_exchange")).toBe("T");
    expect(discoveryCalls(fetchFn, "/v1/instruments/lookup")).toHaveLength(0);
    expect(hasApiKeyAnywhere(fetchFn)).toBe(false);
  });

  it("fails closed with candidate matches on a resolve 409 ambiguity", async () => {
    const fetchFn = routedFetch({ resolve: () => jsonResponse(resolve409Body("TD", ["TD-N", "TD-T"]), 409) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "TD", exchange: "Q" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("ambiguous_symbol");
    expect(outcome.candidateMatches).toEqual(["TD-N", "TD-T"]);
    expect(outcome.resolutionSource).toBe("instruments_resolve");
    // prefer_exchange is the explicit caller exchange, never the default N.
    expect(discoveryCalls(fetchFn, "/v1/instruments/resolve")[0].searchParams.get("prefer_exchange")).toBe("Q");
  });

  it("fails closed on a resolve 404 (no-match)", async () => {
    const fetchFn = routedFetch({ resolve: () => jsonResponse({ detail: { error: "not_found" } }, 404) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "ZZZZ", exchange: "N" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("symbol_not_found");
  });

  it("fails closed when the resolved instrument is inconsistent with the requested exchange", async () => {
    const fetchFn = routedFetch({ resolve: () => jsonResponse(resolveSuccessBody("TD-N")) });
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), { symbol: "TD", exchange: "T" });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("identity_conflict");
  });
});

describe("instrument resolver — no identity and credential-free posture", () => {
  it("fails closed when neither symbol_exchange nor symbol is provided", async () => {
    const fetchFn = routedFetch();
    const outcome = await resolveInstrumentIdentity(buildClient(fetchFn), {});

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("invalid_identity");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("never sends an API key to lookup or resolve, even with a key configured on the client", async () => {
    const PUBLIC_HEADERS = { Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" };

    const lookupFetch = routedFetch({ lookup: () => jsonResponse(lookupBody("IBM", ["IBM-N"])) });
    await resolveInstrumentIdentity(buildClient(lookupFetch), { symbol: "IBM" });
    expect(lookupFetch.mock.calls[0][1].headers).toEqual(PUBLIC_HEADERS);

    const resolveFetch = routedFetch({ resolve: () => jsonResponse(resolveSuccessBody("TD-T")) });
    await resolveInstrumentIdentity(buildClient(resolveFetch), { symbol: "TD", exchange: "T" });
    expect(resolveFetch.mock.calls[0][1].headers).toEqual(PUBLIC_HEADERS);
  });
});
