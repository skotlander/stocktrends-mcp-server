import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";
import { createStockTrendsMcpServer } from "../src/server.js";
import { createRemoteX402StimState, MAX_CONSUMED_PAYMENT_DIGESTS, MAX_PAYMENT_SIGNATURE_BYTES } from "../src/tools/remoteX402StimTool.js";
import { startStreamableHttpServer } from "../src/httpServer.js";

const resource = { url: "https://api.stocktrends.com/v1/stim/latest", description: "Latest ST-IM", mimeType: "application/json" };
const accepted = { scheme: "exact", network: "eip155:84532", amount: "100", asset: "USDC", payTo: "0xrecipient", extra: { resource } };
const requirements = { x402Version: 2, resource, accepts: [accepted] };
const payment = { x402Version: 2, resource, accepted, payload: { signature: "synthetic", authorization: { nonce: "n" } } };

describe("guarded Remote MCP x402 ST-IM tool", () => {
  it("is disabled by default and enabled only by the isolated Streamable HTTP flag", () => {
    expect(parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http" }).remoteX402StimEnabled).toBe(false);
    expect(parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http", STOCKTRENDS_ENABLE_REMOTE_X402_STIM: "true" }).remoteX402StimEnabled).toBe(true);
  });

  it("returns API-authored requirements then forwards one bounded payment payload", async () => {
    let calls = 0;
    const config = parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http", STOCKTRENDS_ENABLE_REMOTE_X402_STIM: "true" });
    const runtime = createStockTrendsMcpServer({ config, remoteX402StimState: createRemoteX402StimState(), fetchFn: async (_url, init) => {
      calls++;
      if (calls === 1) return json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) });
      expect(init?.headers).toMatchObject({ "PAYMENT-SIGNATURE": b64(payment) });
      return json({ symbol_exchange: "IBM-N", score: 7 }, 200, { "payment-response": b64({ success: true, transaction: "test" }) });
    } });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "1" });
    await runtime.server.connect(serverTransport); await client.connect(clientTransport);
    const challenge: any = await call(client, undefined);
    expect(challenge.isError).toBe(true); expect(challenge.structuredContent).toEqual(requirements);
    const result: any = await call(client, payment);
    expect(result.structuredContent).toEqual({ symbol_exchange: "IBM-N", score: 7 });
    expect(result._meta["x402/payment-response"]).toEqual({ success: true, transaction: "test" });
    expect(calls).toBe(2);
    await client.close();
  });

  it.each([
    ["empty transaction", { transaction: "" }, "Payment outcome unknown after forwarding; do not retry payment automatically."],
    ["whitespace txHash", { txHash: "  " }, "Payment outcome unknown after forwarding; do not retry payment automatically."],
    ["explicit failure", { success: false }, "Payment settlement failed."],
    ["contradictory", { success: true, settled: false }, "Payment outcome unknown after forwarding; do not retry payment automatically."],
    ["missing evidence", {}, "Payment outcome unknown after forwarding; do not retry payment automatically."]
  ])("does not release intelligence for %s settlement", async (_name, settlement, message) => {
    const result = await exchange({ settlement });
    expect(result.structuredContent).toEqual({ ...requirements, error: message });
  });

  it.each([{ transaction: "tx" }, { txHash: "0xtx" }, { success: true }, { settled: true }])("releases intelligence only for confirmed settlement", async (settlement) => {
    const result = await exchange({ settlement });
    expect(result.structuredContent).toEqual({ symbol_exchange: "IBM-N", score: 7 });
    expect(result._meta["x402/payment-response"]).toEqual(settlement);
  });

  it("allows distinct authorizations for the same challenge but never forwards an exact duplicate", async () => {
    let calls = 0;
    const state = createRemoteX402StimState();
    const client = await connected(state, async (_url: URL, init: RequestInit) => {
      calls++;
      return calls === 1 ? json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) }) : json({ ok: true }, 200, { "payment-response": b64({ transaction: "tx" }) });
    });
    await call(client, undefined);
    const a: any = await call(client, payment);
    const b: any = await call(client, { ...payment, payload: { signature: "synthetic-b", authorization: { nonce: "b" } } });
    const duplicate: any = await call(client, payment);
    expect(a.structuredContent).toEqual({ ok: true }); expect(b.structuredContent).toEqual({ ok: true });
    expect(duplicate.structuredContent.error).toMatch(/already been used/); expect(calls).toBe(3);
    await client.close();
  });

  it("rejects an encoded-oversized authorization before consuming replay capacity", async () => {
    let calls = 0;
    const client = await connected(createRemoteX402StimState(), async () => {
      calls++; return calls === 1 ? json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) }) : json({ ok: true }, 200, { "payment-response": b64({ transaction: "tx" }) });
    });
    await call(client, undefined);
    const large = { ...payment, payload: { signature: "x".repeat(MAX_PAYMENT_SIGNATURE_BYTES), authorization: { nonce: "large" } } };
    expect((await call(client, large) as any).structuredContent.error).toMatch(/too large|rejected/);
    expect((await call(client, payment) as any).structuredContent).toEqual({ ok: true });
    expect(calls).toBe(2); await client.close();
  });

  it("fails closed at the consumed-digest cap and recovers after expiry", async () => {
    let time = 0; let calls = 0; const state = createRemoteX402StimState();
    for (let index = 0; index < MAX_CONSUMED_PAYMENT_DIGESTS; index++) state.consumedDigests.set(`d${index}`, 10);
    const client = await connected(state, async () => { calls++; return calls === 1 ? json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) }) : json({ ok: true }, 200, { "payment-response": b64({ transaction: "tx" }) }); }, () => time);
    await call(client, undefined);
    expect((await call(client, payment) as any).structuredContent.error).toMatch(/capacity/); expect(calls).toBe(1);
    time = 11;
    expect((await call(client, payment) as any).structuredContent).toEqual({ ok: true }); expect(calls).toBe(2); await client.close();
  });

  it("completes the production-shaped exchange over Streamable HTTP for two clients", async () => {
    let upstream = 0; const state = createRemoteX402StimState();
    const config = parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http", STOCKTRENDS_ENABLE_REMOTE_X402_STIM: "true" });
    const server = await startStreamableHttpServer({ config: { ...config, http: { ...config.http!, port: 0 } }, remoteX402StimState: state, fetchFn: async (_url, init) => {
      upstream++;
      if (!(init.headers && "PAYMENT-SIGNATURE" in init.headers)) return json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) });
      return json({ symbol_exchange: "IBM-N", score: 7 }, 200, { "payment-response": b64({ transaction: "tx" }) });
    } });
    try {
      const first = await httpClient(server.port, "first"); const second = await httpClient(server.port, "second");
      expect((await first.listTools()).tools.map((tool) => tool.name)).toContain("stocktrends_get_stim_latest");
      await call(first, undefined); await call(second, undefined);
      expect((await call(first, payment) as any).structuredContent).toEqual({ symbol_exchange: "IBM-N", score: 7 });
      const secondPayment = { ...payment, payload: { signature: "second", authorization: { nonce: "second" } } };
      expect((await call(second, secondPayment) as any).structuredContent).toEqual({ symbol_exchange: "IBM-N", score: 7 });
      expect((await call(first, payment) as any).structuredContent.error).toMatch(/already been used/);
      expect(upstream).toBe(3);
      await first.close(); await second.close();
    } finally { await server.close(); }
  });
});

function b64(value: unknown) { return Buffer.from(JSON.stringify(value), "utf8").toString("base64"); }
function json(value: unknown, status: number, headers: Record<string, string>) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } }); }
function call(client: Client, paymentValue: unknown) { return client.request({ method: "tools/call", params: { name: "stocktrends_get_stim_latest", arguments: { symbol_exchange: "IBM_N" }, ...(paymentValue === undefined ? {} : { _meta: { "x402/payment": paymentValue } }) } } as any, undefined as any); }
async function connected(state: ReturnType<typeof createRemoteX402StimState>, fetchFn: any, now?: () => number) {
  const config = parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http", STOCKTRENDS_ENABLE_REMOTE_X402_STIM: "true" });
  const runtime = createStockTrendsMcpServer({ config, remoteX402StimState: state, fetchFn, remoteX402StimNow: now });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair(); const client = new Client({ name: "test", version: "1" });
  await runtime.server.connect(serverTransport); await client.connect(clientTransport); return client;
}
async function exchange({ settlement }: { settlement: unknown }): Promise<any> { const client = await connected(createRemoteX402StimState(), async (_url: URL, init: RequestInit) => init.headers && "PAYMENT-SIGNATURE" in init.headers ? json({ symbol_exchange: "IBM-N", score: 7 }, 200, { "payment-response": b64(settlement) }) : json({ payment_required: requirements }, 402, { "payment-required": b64(requirements) })); await call(client, undefined); const result = await call(client, payment); await client.close(); return result; }
async function httpClient(port: number, name: string) { const client = new Client({ name, version: "1" }); await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`))); return client; }
