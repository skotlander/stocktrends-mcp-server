import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";
import { createStockTrendsMcpServer } from "../src/server.js";
import { createRemoteX402StimState } from "../src/tools/remoteX402StimTool.js";

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
});

function b64(value: unknown) { return Buffer.from(JSON.stringify(value), "utf8").toString("base64"); }
function json(value: unknown, status: number, headers: Record<string, string>) { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", ...headers } }); }
function call(client: Client, paymentValue: unknown) { return client.request({ method: "tools/call", params: { name: "stocktrends_get_stim_latest", arguments: { symbol_exchange: "IBM_N" }, ...(paymentValue === undefined ? {} : { _meta: { "x402/payment": paymentValue } }) } } as any, undefined as any); }
