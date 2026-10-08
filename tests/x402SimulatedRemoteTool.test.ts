import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { createStockTrendsMcpServer } from "../src/server.js";
import type { SimulatedX402RemoteTransport } from "../src/tools/x402SimulatedRemoteTool.js";

const resource = { url: "https://api.stocktrends.com/v1/stim/latest", description: "Latest ST-IM", mimeType: "application/json" };
const accepted = { scheme: "exact", network: "eip155:84532", amount: "100", asset: "USDC", payTo: "0xrecipient", maxTimeoutSeconds: 60 };
const requirements = { x402Version: 2, error: "Payment required to access this resource", resource, accepts: [accepted] };
const payment = { x402Version: 2, resource, accepted, payload: { signature: "synthetic-proof", authorization: { nonce: "synthetic-nonce" } } };

async function connect(transport: SimulatedX402RemoteTransport, now?: () => number, challengeTtlMs?: number) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const runtime = createStockTrendsMcpServer({ simulatedRemoteX402: { transport, now, challengeTtlMs } });
  const client = new Client({ name: "x402-simulation", version: "1.0" });
  await runtime.server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

async function call(client: Client, symbol_exchange: string, meta?: unknown): Promise<any> {
  return client.request(
    { method: "tools/call", params: { name: "stocktrends_get_stim_latest", arguments: { symbol_exchange }, ...(meta === undefined ? {} : { _meta: { "x402/payment": meta } }) } } as any,
    undefined as any
  );
}

function encodedSettlement(value: unknown = { success: true, transaction: "simulated-tx", network: "eip155:84532", payer: "simulated-payer" }): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

describe("simulated Remote MCP x402 ST-IM bridge", () => {
  it("discovers one paid tool and completes an injected, simulated x402 transaction", async () => {
    const requests: Array<{ paymentSignature?: string; symbolExchange: string }> = [];
    const client = await connect({
      async request(request) {
        requests.push({ paymentSignature: request.paymentSignature, symbolExchange: request.symbolExchange });
        if (!request.paymentSignature) return json(requirements, 402);
        expect(JSON.parse(Buffer.from(request.paymentSignature, "base64").toString("utf8"))).toEqual(payment);
        return json({ symbol_exchange: "AAPL-Q", stim: 88 }, 200, { "payment-response": encodedSettlement() });
      }
    });
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toContain("stocktrends_get_stim_latest");

    const challenge = await call(client, "AAPL_Q");
    expect(challenge.isError).toBe(true);
    expect(challenge.structuredContent).toEqual(requirements);
    expect(JSON.parse(challenge.content[0].text)).toEqual(requirements);

    const result = await call(client, "AAPL_Q", payment);
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ symbol_exchange: "AAPL-Q", stim: 88 });
    expect(result._meta["x402/payment-response"]).toEqual({ success: true, transaction: "simulated-tx", network: "eip155:84532", payer: "simulated-payer" });
    expect(requests).toHaveLength(2);
    expect(requests[0].paymentSignature).toBeUndefined();
    expect(requests[1].paymentSignature).toBeDefined();
  });

  it.each([
    ["missing", undefined, "x402_challenge_missing_or_expired"],
    ["malformed", { nope: true }, "x402_invalid_payment_payload"],
    ["wrong resource", { ...payment, resource: { ...resource, url: "https://api.stocktrends.com/v1/stim/history" } }, "x402_invalid_payment_payload"],
    ["wrong accepted requirements", { ...payment, accepted: { ...accepted, amount: "101" } }, "x402_invalid_payment_payload"]
  ])("fails closed for %s payment metadata", async (_name, invalid, expected) => {
    let calls = 0;
    const client = await connect({ async request() { calls++; return json(requirements, 402); } });
    await call(client, "AAPL_Q");
    const result = await call(client, "AAPL_Q", invalid);
    expect(result.structuredContent).toEqual({ error: expected });
    expect(calls).toBe(1);
  });

  it("binds a proof to canonical tool arguments, expires it, and consumes it before forwarding", async () => {
    let time = 1000;
    let paidCalls = 0;
    const client = await connect({
      async request(request) {
        if (!request.paymentSignature) return json(requirements, 402);
        paidCalls++; return json({ ok: true }, 200, { "payment-response": encodedSettlement() });
      }
    }, () => time, 10);
    await call(client, "AAPL_Q");
    expect((await call(client, "MSFT_Q", payment)).structuredContent).toEqual({ error: "x402_challenge_missing_or_expired" });
    time += 11;
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual({ error: "x402_challenge_missing_or_expired" });
    await call(client, "AAPL_Q");
    await call(client, "AAPL_Q", payment);
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual({ error: "x402_payment_replay" });
    expect(paidCalls).toBe(1);
  });

  it.each([
    ["api rejects proof", () => json(requirements, 402), "x402_api_rejected_payment"],
    ["missing settlement", () => json({ paid: true }, 200), "x402_settlement_response_invalid"],
    ["settlement failure", () => json({ paid: true }, 200, { "payment-response": encodedSettlement({ success: false }) }), "x402_settlement_response_invalid"],
    ["oversized paid output", () => json({ payload: "x".repeat(70_000) }, 200, { "payment-response": encodedSettlement() }), "x402_paid_response_invalid"],
    ["redirect", () => new Response("", { status: 302, headers: { location: "https://bad.example" } }), "x402_api_redirect_or_unexpected_status"]
  ])("does not release paid output for %s", async (_name, paidResponse, expected) => {
    const client = await connect({ async request(request) { return request.paymentSignature ? paidResponse() : json(requirements, 402); } });
    await call(client, "AAPL_Q");
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual({ error: expected });
  });

  it("fails closed once on a simulated timeout and never attempts an API-key fallback or retry", async () => {
    let calls = 0;
    const client = await connect({
      async request(request) {
        calls++;
        if (!request.paymentSignature) return json(requirements, 402);
        throw new Error("simulated timeout");
      }
    });
    await call(client, "AAPL_Q");
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual({ error: "x402_api_transport_failed" });
    expect(calls).toBe(2);
  });

  it("keeps concurrent simulated callers independently bound", async () => {
    const client = await connect({
      async request(request) { return request.paymentSignature ? json({ symbol: request.symbolExchange }, 200, { "payment-response": encodedSettlement() }) : json(requirements, 402); }
    });
    await Promise.all([call(client, "AAPL_Q"), call(client, "MSFT_Q")]);
    const [aapl, msft] = await Promise.all([call(client, "AAPL_Q", payment), call(client, "MSFT_Q", payment)]);
    expect(aapl.structuredContent).toEqual({ symbol: "AAPL_Q" });
    expect(msft.structuredContent).toEqual({ symbol: "MSFT_Q" });
  });
});

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
