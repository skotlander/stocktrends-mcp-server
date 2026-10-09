import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { connectMcp, jsonResponse } from "./helpers.js";

describe("public instrument discovery tools", () => {
  it("preserves API-authoritative U.S.-first bare resolution and explicit identity inputs", async () => {
    const fetchFn = vi.fn<FetchLike>(async (url, init) => {
      expect(init?.headers).toEqual({ Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" });
      if (url.pathname === "/v1/instruments/lookup") return jsonResponse({ count: 1, data: [{ symbol_exchange: "IBM-N" }] });
      if (url.pathname === "/v1/instruments/resolve") return jsonResponse({ symbol_exchange: url.searchParams.get("exchange") === "T" ? "TD-T" : url.searchParams.get("symbol") === "TD" ? "TD-N" : "IBM-N", name: "IBM" });
      throw new Error(`unexpected path ${url.pathname}`);
    });
    const { client, server } = await connectMcp(fetchFn);
    const lookup = await client.callTool({ name: "stocktrends_lookup_instruments", arguments: { symbol: "IBM" } });
    const bare = await client.callTool({ name: "stocktrends_resolve_instrument", arguments: { symbol: "TD" } });
    const explicit = await client.callTool({ name: "stocktrends_resolve_instrument", arguments: { symbol: "TD", exchange: "T", prefer_exchange: "T" } });
    const resolved = await client.callTool({ name: "stocktrends_resolve_instrument", arguments: { symbol_exchange: "IBM-N" } });
    expect(JSON.stringify(lookup)).toContain("IBM-N");
    expect(JSON.stringify(bare)).toContain("TD-N");
    expect(JSON.stringify(explicit)).toContain("TD-T");
    expect(JSON.stringify(resolved)).toContain("IBM-N");
    const requests = fetchFn.mock.calls.map(([url]) => url);
    expect(requests.map((url) => url.pathname)).toEqual(["/v1/instruments/lookup", "/v1/instruments/resolve", "/v1/instruments/resolve", "/v1/instruments/resolve"]);
    expect(requests[1].searchParams.get("exchange")).toBeNull();
    expect(requests[2].search).toContain("exchange=T");
    expect(requests[2].search).toContain("prefer_exchange=T");
    await client.close(); await server.close();
  });

  it("rejects malformed input before an upstream request and preserves 409 and 404", async () => {
    const fetchFn = vi.fn<FetchLike>(async (url) => url.searchParams.get("symbol") === "MISS" ? jsonResponse({ detail: "missing" }, 404) : jsonResponse({ matches: [{ symbol_exchange: "TD-N" }, { symbol_exchange: "TD-T" }] }, 409));
    const { client, server } = await connectMcp(fetchFn);
    const invalid = await client.callTool({ name: "stocktrends_lookup_instruments", arguments: { symbol: "bad symbol" } });
    expect(invalid.isError).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
    const ambiguous = await client.callTool({ name: "stocktrends_resolve_instrument", arguments: { symbol: "TD", prefer_exchange: "Q" } });
    expect(ambiguous.isError).toBe(true);
    expect(JSON.stringify(ambiguous)).toContain("TD-T");
    const missing = await client.callTool({ name: "stocktrends_resolve_instrument", arguments: { symbol: "MISS" } });
    expect(missing.isError).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    await client.close(); await server.close();
  });
});
