import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";
import { createStockTrendsMcpServer } from "../src/server.js";
import { createRemoteX402StimState } from "../src/tools/remoteX402StimTool.js";
import type { FetchLike } from "../src/stocktrendsClient.js";

const routes = [
  ["stocktrends_evaluate_symbol", { symbol_exchange: "IBM-N" }, "/v1/decision/evaluate-symbol", '{"symbol_exchange":"IBM-N"}'],
  ["stocktrends_construct_portfolio", {}, "/v1/portfolio/construct", '{"bias":"auto","count":5,"universe":"top"}'],
  ["stocktrends_evaluate_portfolio", { positions: [{ symbol_exchange: "IBM-N", weight: 1 }] }, "/v1/portfolio/evaluate", '{"positions":[{"symbol_exchange":"IBM-N","weight":1}]}' ],
  ["stocktrends_compare_portfolios", { left: [{ symbol_exchange: "IBM-N", weight: 1 }], right: [{ symbol_exchange: "MSFT-Q", weight: 1 }] }, "/v1/portfolio/compare", '{"left":[{"symbol_exchange":"IBM-N","weight":1}],"right":[{"symbol_exchange":"MSFT-Q","weight":1}]}' ]
] as const;

describe("Remote x402 analytical POST tools", () => {
  it.each(routes)("registers and forwards %s using identical canonical JSON bytes", async (name, args, path, bodyText) => {
    const requests: Array<{ path: string; method: string; body: string; payment?: string }> = [];
    const client = await connected(async (url, init) => {
      const payment = (init?.headers as Record<string, string>)?.["PAYMENT-SIGNATURE"];
      requests.push({ path: url.pathname, method: init?.method ?? "", body: String(init?.body), payment });
      return payment ? json({ api_authored: name }, 200, { "payment-response": b64({ success: true, transaction: "synthetic" }) }) : challengeFor(url);
    });
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain(name);
    await call(client, name, args);
    const result = await call(client, name, args, paymentFor(`https://api.stocktrends.com${path}`));
    expect(result.structuredContent).toEqual({ api_authored: name });
    expect(requests).toEqual([
      { path, method: "POST", body: bodyText, payment: undefined },
      { path, method: "POST", body: bodyText, payment: expect.any(String) }
    ]);
    await client.close();
  });

  it.each([
    ["stocktrends_evaluate_symbol", {}],
    ["stocktrends_evaluate_symbol", { symbol: "IBM" }],
    ["stocktrends_construct_portfolio", { bias: "sideways" }],
    ["stocktrends_construct_portfolio", { exchange: "Z" }],
    ["stocktrends_evaluate_portfolio", { positions: [] }],
    ["stocktrends_evaluate_portfolio", { positions: [{ symbol_exchange: "IBM-N", weight: 0.4 }] }],
    ["stocktrends_evaluate_portfolio", { positions: [{ symbol_exchange: "IBM-N", weight: 0.5 }, { symbol_exchange: "IBM-N", weight: 0.5 }] }],
    ["stocktrends_compare_portfolios", { left: [{ symbol_exchange: "IBM-N", weight: 1 }], right: [] }]
  ])("rejects invalid %s input before challenge", async (name, args) => {
    let calls = 0; const client = await connected(async (url) => { calls++; return challengeFor(url); });
    const result = await call(client, name, args as Record<string, unknown>);
    expect(result.isError).toBe(true); expect(calls).toBe(0); await client.close();
  });

  it("rejects body B payment after a body A challenge without forwarding", async () => {
    let calls = 0; const client = await connected(async (url) => { calls++; return challengeFor(url); });
    await call(client, "stocktrends_evaluate_symbol", { symbol_exchange: "IBM-N" });
    const result = await call(client, "stocktrends_evaluate_symbol", { symbol_exchange: "MSFT-Q" }, paymentFor("https://api.stocktrends.com/v1/decision/evaluate-symbol"));
    expect(result.structuredContent).toEqual({ error: "x402_challenge_missing_or_expired" }); expect(calls).toBe(1); await client.close();
  });

  it("does not exchange challenges across tools and consumes a proof before a replay", async () => {
    let paid = 0; const client = await connected(async (url, init) => {
      if ((init?.headers as Record<string, string>)?.["PAYMENT-SIGNATURE"]) { paid++; return json({ ok: true }, 200, { "payment-response": b64({ settled: true, transaction: "synthetic" }) }); }
      return challengeFor(url);
    });
    const payment = paymentFor("https://api.stocktrends.com/v1/decision/evaluate-symbol");
    await call(client, "stocktrends_evaluate_symbol", { symbol_exchange: "IBM-N" });
    expect((await call(client, "stocktrends_construct_portfolio", {}, payment)).structuredContent).toEqual({ error: "x402_challenge_missing_or_expired" });
    expect((await call(client, "stocktrends_evaluate_symbol", { symbol_exchange: "IBM-N" }, payment)).structuredContent).toEqual({ ok: true });
    expect((await call(client, "stocktrends_evaluate_symbol", { symbol_exchange: "IBM-N" }, payment)).structuredContent.error).toContain("already been used");
    expect(paid).toBe(1); await client.close();
  });

  it("rejects a payment proof for another endpoint before forwarding", async () => {
    let paid = 0; const client = await connected(async (url, init) => {
      if ((init?.headers as Record<string, string>)?.["PAYMENT-SIGNATURE"]) paid++;
      return challengeFor(url);
    });
    await call(client, "stocktrends_evaluate_symbol", { symbol_exchange: "IBM-N" });
    const result = await call(client, "stocktrends_evaluate_symbol", { symbol_exchange: "IBM-N" }, paymentFor("https://api.stocktrends.com/v1/portfolio/evaluate"));
    expect(result.isError).toBe(true); expect(paid).toBe(0); await client.close();
  });
});

async function connected(fetchFn: FetchLike) {
  const config = parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http", STOCKTRENDS_ENABLE_REMOTE_X402_STIM: "true" });
  const runtime = createStockTrendsMcpServer({ config, remoteX402StimState: createRemoteX402StimState(), fetchFn: fetchFn as any });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(); const client = new Client({ name: "post-test", version: "1" });
  await runtime.server.connect(serverTransport); await client.connect(clientTransport); return client;
}
function call(client: Client, name: string, arguments_: Record<string, unknown>, paymentValue?: unknown): Promise<any> { return client.request({ method: "tools/call", params: { name, arguments: arguments_, ...(paymentValue === undefined ? {} : { _meta: { "x402/payment": paymentValue } }) } } as any, undefined as any) as Promise<any>; }
function challengeFor(url: URL) { const resource = { url: `https://api.stocktrends.com${url.pathname}` }; const requirements = { x402Version: 2, resource, accepts: [{ scheme: "exact", network: "eip155:8453", extra: { resource } }] }; return json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) }); }
function paymentFor(url: string) { const resource = { url }; const accepted = { scheme: "exact", network: "eip155:8453", extra: { resource } }; return { x402Version: 2, resource, accepted, payload: { signature: "synthetic", authorization: {} } }; }
function json(value: unknown, status: number, headers: Record<string, string>) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } }); }
function b64(value: unknown) { return Buffer.from(JSON.stringify(value), "utf8").toString("base64"); }
