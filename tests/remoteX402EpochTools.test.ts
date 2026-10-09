import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { parseConfig } from "../src/config.js";
import { createStockTrendsMcpServer } from "../src/server.js";
import { createRemoteX402StimState } from "../src/tools/remoteX402StimTool.js";
import type { FetchLike } from "../src/stocktrendsClient.js";

const resources = {
  "stocktrends_get_stim_latest": "https://api.stocktrends.com/v1/stim/latest",
  "stocktrends_get_market_epoch_latest": "https://api.stocktrends.com/v1/market/epoch/latest",
  "stocktrends_get_market_epoch_history": "https://api.stocktrends.com/v1/market/epoch/history"
} as const;

describe("Remote x402 Epoch GET tools", () => {
  it.each([
    ["stocktrends_get_stim_history", { symbol_exchange: "IBM-N" }, "/v1/stim/history", "?limit=260&symbol_exchange=IBM-N"],
    ["stocktrends_get_indicators_latest", { symbol_exchange: "IBM-N" }, "/v1/indicators/latest", "?symbol_exchange=IBM-N"],
    ["stocktrends_get_indicators_history", { symbol_exchange: "IBM-N" }, "/v1/indicators/history", "?limit=260&symbol_exchange=IBM-N"],
    ["stocktrends_get_selections_latest", {}, "/v1/selections/latest", "?limit=50"],
    ["stocktrends_get_market_regime_latest", {}, "/v1/market/regime/latest", ""],
    ["stocktrends_get_market_regime_history", {}, "/v1/market/regime/history", "?limit=12"],
    ["stocktrends_get_breadth_sector_latest", {}, "/v1/breadth/sector/latest", "?group_level=sector&limit=50"],
    ["stocktrends_get_leadership_summary_latest", {}, "/v1/leadership/summary/latest", "?limit_bucket=20&limit_overall=50"],
    ["stocktrends_get_screener_top", {}, "/v1/agent/screener/top", "?limit=25&min_mt_cnt=1&min_rsi=100&min_trend_cnt=1&sort=rsi"]
  ])("binds %s challenge to its fixed canonical request", async (name, arguments_, path, search) => {
    let calls = 0;
    const client = await connected(async (url, init) => { calls++; expect(init?.method).toBe("GET"); expect(init?.headers).not.toHaveProperty("PAYMENT-SIGNATURE"); expect(url.pathname).toBe(path); expect(url.search).toBe(search); return challengeFor(url); });
    const result = await call(client, name, arguments_ as Record<string, unknown>);
    expect((result as any).isError).toBe(true); expect(calls).toBe(1);
    await client.close();
  });

  it.each([
    ["stocktrends_get_stim_history", { symbol_exchange: "IBM-N", limit: 2601 }], ["stocktrends_get_stim_history", { symbol_exchange: "IBM-N", start: "2026-02-01", end: "2026-01-01" }],
    ["stocktrends_get_selections_latest", { limit: 251 }], ["stocktrends_get_market_regime_history", { limit: 53 }],
    ["stocktrends_get_leadership_summary_latest", { min_rsi: 100.5 }], ["stocktrends_get_leadership_summary_latest", { min_mt_cnt: 501 }],
    ["stocktrends_get_breadth_sector_latest", { min_volume: 1.5 }], ["stocktrends_get_screener_top", { sort: "x" }], ["stocktrends_get_screener_top", { limit: 101 }]
  ])("rejects invalid %s input before a challenge", async (name, arguments_) => {
    let calls = 0; const client = await connected(async (url) => { calls++; return challengeFor(url); });
    const result = await call(client, name, arguments_ as Record<string, unknown>);
    expect((result as any).isError).toBe(true); expect(calls).toBe(0); await client.close();
  });
  it.each([
    ["stocktrends_get_stim_history", { symbol_exchange: "IBM-N" }, "/v1/stim/history"], ["stocktrends_get_indicators_latest", { symbol_exchange: "IBM-N" }, "/v1/indicators/latest"],
    ["stocktrends_get_indicators_history", { symbol_exchange: "IBM-N" }, "/v1/indicators/history"], ["stocktrends_get_selections_latest", {}, "/v1/selections/latest"],
    ["stocktrends_get_market_regime_latest", {}, "/v1/market/regime/latest"], ["stocktrends_get_market_regime_history", {}, "/v1/market/regime/history"],
    ["stocktrends_get_breadth_sector_latest", {}, "/v1/breadth/sector/latest"], ["stocktrends_get_leadership_summary_latest", {}, "/v1/leadership/summary/latest"],
    ["stocktrends_get_screener_top", {}, "/v1/agent/screener/top"]
  ])("forwards one settled synthetic payment for %s", async (name, arguments_, path) => {
    const requests: Array<{ path: string; search: string; payment: string | undefined }> = [];
    const client = await connected(async (url, init) => {
      const payment = (init?.headers as Record<string, string>)?.["PAYMENT-SIGNATURE"];
      requests.push({ path: url.pathname, search: url.search, payment });
      return payment ? json({ api_authored: name }, 200, { "payment-response": b64({ success: true, transaction: "synthetic" }) }) : challengeFor(url);
    });
    await call(client, name, arguments_ as Record<string, unknown>);
    const result = await call(client, name, arguments_ as Record<string, unknown>, paymentFor(`https://api.stocktrends.com${path}`));
    expect(requests).toHaveLength(2); expect(requests[1]).toMatchObject({ path, search: requests[0].search }); expect(requests[1].payment).toBeTruthy();
    expect(JSON.stringify(result)).toContain(name); expect(JSON.stringify(result)).toContain("synthetic"); await client.close();
  });

  it.each([
    ["stocktrends_get_stim_history", { symbol_exchange: "IBM-N" }, "/v1/stim/history"], ["stocktrends_get_indicators_latest", { symbol_exchange: "IBM-N" }, "/v1/indicators/latest"],
    ["stocktrends_get_indicators_history", { symbol_exchange: "IBM-N" }, "/v1/indicators/history"], ["stocktrends_get_selections_latest", {}, "/v1/selections/latest"],
    ["stocktrends_get_market_regime_latest", {}, "/v1/market/regime/latest"], ["stocktrends_get_market_regime_history", {}, "/v1/market/regime/history"],
    ["stocktrends_get_breadth_sector_latest", {}, "/v1/breadth/sector/latest"], ["stocktrends_get_leadership_summary_latest", {}, "/v1/leadership/summary/latest"],
    ["stocktrends_get_screener_top", {}, "/v1/agent/screener/top"]
  ])("rejects wrong-resource payment for %s before forwarding", async (name, arguments_, path) => {
    let paymentRequests = 0; const client = await connected(async (url, init) => { if ((init?.headers as Record<string, string>)?.["PAYMENT-SIGNATURE"]) paymentRequests++; return challengeFor(url); });
    await call(client, name, arguments_ as Record<string, unknown>);
    const result = await call(client, name, arguments_ as Record<string, unknown>, paymentFor(`https://api.stocktrends.com${path === "/v1/stim/history" ? "/v1/indicators/latest" : "/v1/stim/history"}`));
    expect((result as any).isError).toBe(true); expect(paymentRequests).toBe(0); await client.close();
  });
  it("registers both Epoch tools without changing public resources", async () => {
    const client = await connected(async (url) => challengeFor(url));
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual([
      "stocktrends_estimate_workflow_cost", "stocktrends_get_breadth_sector_latest", "stocktrends_get_indicators_history",
      "stocktrends_get_indicators_latest", "stocktrends_get_leadership_summary_latest", "stocktrends_get_market_epoch_history",
      "stocktrends_get_market_epoch_latest", "stocktrends_get_market_regime_history", "stocktrends_get_market_regime_latest",
      "stocktrends_get_screener_top", "stocktrends_get_selections_latest", "stocktrends_get_stim_history", "stocktrends_get_stim_latest",
      "stocktrends_lookup_instruments", "stocktrends_resolve_instrument"
    ]);
    const resourcesResult = await client.listResources();
    expect(resourcesResult.resources).toHaveLength(10);
    await client.close();
  });

  it("normalizes IBM_N and IBM-N to one challenge identity and upstream query", async () => {
    let calls = 0;
    const client = await connected(async (url) => { calls++; expect(url.searchParams.get("symbol_exchange")).toBe("IBM-N"); return challengeFor(url); });
    await call(client, "stocktrends_get_stim_latest", { symbol_exchange: "IBM_N" });
    await call(client, "stocktrends_get_stim_latest", { symbol_exchange: "IBM-N" });
    expect(calls).toBe(1);
    await client.close();
  });

  it("binds Epoch history challenge to its exact canonical effective parameters", async () => {
    let calls = 0;
    const client = await connected(async (url) => { calls++; expect(url.pathname).toBe("/v1/market/epoch/history"); expect(url.search).toBe("?end_date=2026-10-09&limit=52&start_date=2026-01-01"); return challengeFor(url); });
    await call(client, "stocktrends_get_market_epoch_history", { start_date: "2026-01-01", end_date: "2026-10-09" });
    const wrongParameters = await call(client, "stocktrends_get_market_epoch_history", { limit: 51, start_date: "2026-01-01", end_date: "2026-10-09" }, paymentFor(resources.stocktrends_get_market_epoch_history));
    expect((wrongParameters as any).structuredContent.error).toBe("x402_challenge_missing_or_expired");
    expect(calls).toBe(1);
    await client.close();
  });

  it.each([{ limit: 0 }, { limit: 2601 }, { start_date: "2026-02-30" }, { start_date: "2026-02-01", end_date: "2026-01-01" }])("rejects invalid Epoch history input before challenge: %o", async (arguments_) => {
    let calls = 0;
    const client = await connected(async (url) => { calls++; return challengeFor(url); });
    const result = await call(client, "stocktrends_get_market_epoch_history", arguments_);
    expect((result as any).isError).toBe(true);
    expect(JSON.stringify(result)).toContain("Input validation error");
    expect(calls).toBe(0);
    await client.close();
  });
});

async function connected(fetchFn: FetchLike) {
  const config = parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http", STOCKTRENDS_ENABLE_REMOTE_X402_STIM: "true" });
  const runtime = createStockTrendsMcpServer({ config, remoteX402StimState: createRemoteX402StimState(), fetchFn: fetchFn as any });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1" });
  await runtime.server.connect(serverTransport); await client.connect(clientTransport); return client;
}
function call(client: Client, name: string, arguments_: Record<string, unknown>, paymentValue?: unknown) { return client.request({ method: "tools/call", params: { name, arguments: arguments_, ...(paymentValue === undefined ? {} : { _meta: { "x402/payment": paymentValue } }) } } as any, undefined as any); }
function challengeFor(url: URL) { const resource = `https://api.stocktrends.com${url.pathname}`; const requirements = { x402Version: 2, resource: { url: resource }, accepts: [{ scheme: "exact", network: "eip155:8453", extra: { resource: { url: resource } } }] }; return json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) }); }
function paymentFor(resource: string) { const accepted = { scheme: "exact", network: "eip155:8453", extra: { resource: { url: resource } } }; return { x402Version: 2, resource: { url: resource }, accepted, payload: { signature: "sig", authorization: {} } }; }
function json(value: unknown, status: number, headers: Record<string, string>) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } }); }
function b64(value: unknown) { return Buffer.from(JSON.stringify(value), "utf8").toString("base64"); }
