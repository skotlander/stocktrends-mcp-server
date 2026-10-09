import { describe, expect, it, vi } from "vitest";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { connectMcp, jsonResponse } from "./helpers.js";

describe("public instrument discovery tools", () => {
  it("uses fixed credential-free paths, preserves API data, and does not retry", async () => {
    const fetchFn = vi.fn<FetchLike>(async (url, init) => {
      expect(init?.headers).toEqual({ Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" });
      if (url.pathname === "/v1/instruments/lookup") return jsonResponse({ count: 1, data: [{ symbol_exchange: "IBM-N" }] });
      if (url.pathname === "/v1/instruments/resolve") return jsonResponse({ symbol_exchange: "IBM-N", name: "IBM" });
      throw new Error(`unexpected path ${url.pathname}`);
    });
    const { client, server } = await connectMcp(fetchFn);
    const lookup = await client.callTool({ name: "stocktrends_lookup_instruments", arguments: { symbol: "IBM" } });
    const resolved = await client.callTool({ name: "stocktrends_resolve_instrument", arguments: { symbol_exchange: "IBM-N" } });
    expect(JSON.stringify(lookup)).toContain("IBM-N");
    expect(JSON.stringify(resolved)).toContain("IBM-N");
    expect(fetchFn.mock.calls.map(([url]) => url.pathname)).toEqual(["/v1/instruments/lookup", "/v1/instruments/resolve"]);
    await client.close(); await server.close();
  });

  it("rejects malformed input before an upstream request and preserves ambiguity", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ matches: [{ symbol_exchange: "TD-N" }, { symbol_exchange: "TD-T" }] }, 409));
    const { client, server } = await connectMcp(fetchFn);
    const invalid = await client.callTool({ name: "stocktrends_lookup_instruments", arguments: { symbol: "bad symbol" } });
    expect(invalid.isError).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
    const ambiguous = await client.callTool({ name: "stocktrends_resolve_instrument", arguments: { symbol: "TD" } });
    expect(ambiguous.isError).toBe(true);
    expect(JSON.stringify(ambiguous)).toContain("TD-T");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await client.close(); await server.close();
  });
});
