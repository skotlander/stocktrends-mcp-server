import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import { createStockTrendsMcpServer } from "../src/server.js";
import { createSimulatedX402RemoteState, type SimulatedX402RemoteState, type SimulatedX402RemoteTransport } from "../src/tools/x402SimulatedRemoteTool.js";

const resource = { url: "https://api.stocktrends.com/v1/stim/latest", description: "Latest ST-IM", mimeType: "application/json", serviceName: "Stock Trends API", tags: ["stim"], iconUrl: "https://api.stocktrends.com/icon.png" };
const accepted = { scheme: "exact", network: "eip155:84532", amount: "100", asset: "USDC", payTo: "0xrecipient", maxTimeoutSeconds: 300, extra: { name: "USDC", version: "2", resource } };
const requirements = { x402Version: 2, resource, accepts: [accepted], extensions: { bazaar: { version: "1" } } };
const payment = { x402Version: 2, resource, accepted, payload: { signature: "synthetic-proof", authorization: { nonce: "synthetic-nonce" } } };

async function connect(transport: SimulatedX402RemoteTransport, now?: () => number, challengeTtlMs?: number, state?: SimulatedX402RemoteState) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const runtime = createStockTrendsMcpServer({ simulatedRemoteX402: { transport, now, challengeTtlMs, state } });
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

function challengeResponse(bodyRequirements: unknown = requirements, headerRequirements: unknown = requirements): Response {
  return json(
    { error: "payment_required", detail: "Payment is required to access this endpoint.", protocol: "x402", resource: resource.url, pricing: { amount_usd: "0.100000", unit: "request", network: "eip155:84532", token: "USDC", scheme: "exact" }, accepted_payment_methods: ["x402"], payment_required: bodyRequirements },
    402,
    { "payment-required": Buffer.from(JSON.stringify(headerRequirements), "utf8").toString("base64") }
  );
}

function paymentFailure(reason: string) { return { ...requirements, error: reason }; }

describe("simulated Remote MCP x402 ST-IM bridge", () => {
  it("discovers one paid tool and completes an injected, simulated x402 transaction", async () => {
    const requests: Array<{ paymentSignature?: string; symbolExchange: string; url: string; method: string }> = [];
    const client = await connect({
      async request(request) {
        requests.push({ paymentSignature: request.paymentSignature, symbolExchange: request.symbolExchange, url: request.url.toString(), method: request.method });
        if (!request.paymentSignature) return challengeResponse();
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
    expect(requests.map((request) => ({ method: request.method, url: request.url }))).toEqual([
      { method: "GET", url: "https://api.stocktrends.com/v1/stim/latest?symbol_exchange=AAPL-Q" },
      { method: "GET", url: "https://api.stocktrends.com/v1/stim/latest?symbol_exchange=AAPL-Q" }
    ]);
    expect(requests[0].paymentSignature).toBeUndefined();
    expect(requests[1].paymentSignature).toBeDefined();
  });

  it("treats an ordinary invocation without payment metadata as an unpaid challenge", async () => {
    const client = await connect({ async request() { return challengeResponse(); } });
    const result = await call(client, "AAPL_Q");
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual(requirements);
  });

  it.each([
    ["malformed", { nope: true }],
    ["wrong resource", { ...payment, resource: { ...resource, url: "https://api.stocktrends.com/v1/stim/history" } }],
    ["wrong accepted requirements", { ...payment, accepted: { ...accepted, amount: "101" } }]
  ])("returns a recognizable payment failure for %s payment metadata", async (_name, invalid) => {
    let calls = 0;
    const client = await connect({ async request() { calls++; return challengeResponse(); } });
    await call(client, "AAPL_Q");
    const result = await call(client, "AAPL_Q", invalid);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual(paymentFailure("Payment authorization rejected before forwarding."));
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
    expect(calls).toBe(1);
  });

  it("rejects payment metadata when no matching challenge was issued", async () => {
    const client = await connect({ async request() { throw new Error("must not be called"); } });
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual({ error: "x402_challenge_missing_or_expired" });
  });

  it("does not consume or forward an obviously malformed proof before a valid retry", async () => {
    let paidCalls = 0;
    const client = await connect({
      async request(request) {
        if (!request.paymentSignature) return challengeResponse();
        paidCalls++;
        return json({ paid: true }, 200, { "payment-response": encodedSettlement() });
      }
    });
    await call(client, "AAPL_Q");
    expect((await call(client, "AAPL_Q", {})).structuredContent).toEqual(paymentFailure("Payment authorization rejected before forwarding."));
    expect(paidCalls).toBe(0);
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual({ paid: true });
    expect(paidCalls).toBe(1);
  });

  it("rejects oversized incoming payment metadata before digesting, consuming, or forwarding it", async () => {
    let calls = 0;
    const client = await connect({ async request() { calls++; return challengeResponse(); } });
    await call(client, "AAPL_Q");
    const oversized = { ...payment, payload: { signature: "x".repeat(70_000), authorization: { nonce: "synthetic-nonce" } } };
    expect((await call(client, "AAPL_Q", oversized)).structuredContent).toEqual(paymentFailure("Payment authorization rejected before forwarding."));
    expect(calls).toBe(1);
  });

  it("retains only expiring proof digests and removes expired simulated state", async () => {
    let time = 1_000;
    const state = createSimulatedX402RemoteState();
    const client = await connect({
      async request(request) { return request.paymentSignature ? json({ paid: true }, 200, { "payment-response": encodedSettlement() }) : challengeResponse(); }
    }, () => time, 10, state);
    await call(client, "AAPL_Q");
    await call(client, "AAPL_Q", payment);
    expect([...state.consumedPaymentDigests.keys()]).toHaveLength(1);
    expect([...state.consumedPaymentDigests.keys()][0]).toMatch(/^[a-f0-9]{64}$/);
    expect([...state.consumedPaymentDigests.keys()][0]).not.toContain("synthetic-proof");
    time += 11;
    await call(client, "MSFT_Q");
    expect(state.consumedPaymentDigests.size).toBe(0);
    expect([...state.challenges.values()].map((challenge) => challenge.symbolExchange)).toEqual(["MSFT_Q"]);
  });

  it("binds a proof to canonical tool arguments, expires it, and consumes it before forwarding", async () => {
    let time = 1000;
    let paidCalls = 0;
    const client = await connect({
      async request(request) {
        if (!request.paymentSignature) return challengeResponse();
        paidCalls++; return json({ ok: true }, 200, { "payment-response": encodedSettlement() });
      }
    }, () => time, 10);
    await call(client, "AAPL_Q");
    expect((await call(client, "MSFT_Q", payment)).structuredContent).toEqual({ error: "x402_challenge_missing_or_expired" });
    time += 11;
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual({ error: "x402_challenge_missing_or_expired" });
    await call(client, "AAPL_Q");
    await call(client, "AAPL_Q", payment);
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual(paymentFailure("Payment authorization has already been used; do not retry payment automatically."));
    expect(paidCalls).toBe(1);
  });

  it.each([
    ["api rejects proof", () => challengeResponse(), "Payment authorization rejected by API."],
    ["missing settlement", () => json({ paid: true }, 200), "Payment outcome unknown after forwarding; do not retry payment automatically."],
    ["settlement failure", () => json({ paid: true }, 200, { "payment-response": encodedSettlement({ success: false }) }), "Payment settlement failed."],
    ["oversized paid output", () => json({ payload: "x".repeat(70_000) }, 200, { "payment-response": encodedSettlement() }), "Payment settlement may have occurred but paid output was unavailable; do not retry payment automatically."],
    ["redirect", () => new Response("", { status: 302, headers: { location: "https://bad.example" } }), "Payment outcome unknown after forwarding; do not retry payment automatically."]
  ])("does not release paid output for %s", async (_name, paidResponse, expected) => {
    const client = await connect({ async request(request) { return request.paymentSignature ? paidResponse() : challengeResponse(); } });
    await call(client, "AAPL_Q");
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual(paymentFailure(expected));
  });

  it.each([
    ["settled", { settled: true, transaction: "simulated-tx" }],
    ["transaction", { transaction: "simulated-tx" }],
    ["txHash", { txHash: "0xsimulated" }]
  ])("normalizes API-confirmed %s settlement success into MCP SettlementResponse", async (_name, settlement) => {
    const client = await connect({ async request(request) { return request.paymentSignature ? json({ paid: true }, 200, { "payment-response": encodedSettlement(settlement) }) : challengeResponse(); } });
    await call(client, "AAPL_Q");
    const result = await call(client, "AAPL_Q", payment);
    expect(result.structuredContent).toEqual({ paid: true });
    expect(result._meta["x402/payment-response"]).toEqual({ ...settlement, success: true });
  });

  it("fails closed on contradictory settlement indicators without suggesting a new payment", async () => {
    const client = await connect({ async request(request) { return request.paymentSignature ? json({ paid: true }, 200, { "payment-response": encodedSettlement({ success: false, transaction: "simulated-tx" }) }) : challengeResponse(); } });
    await call(client, "AAPL_Q");
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual(paymentFailure("Payment outcome unknown after forwarding; do not retry payment automatically."));
  });

  it("fails closed once on a simulated timeout and never attempts an API-key fallback or retry", async () => {
    let calls = 0;
    const client = await connect({
      async request(request) {
        calls++;
        if (!request.paymentSignature) return challengeResponse();
        throw new Error("simulated timeout");
      }
    });
    await call(client, "AAPL_Q");
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual(paymentFailure("Payment outcome unknown after forwarding; do not retry payment automatically."));
    expect(calls).toBe(2);
  });

  it("binds concurrent simulated callers to their own arguments and rejects proof reuse", async () => {
    const client = await connect({
      async request(request) { return request.paymentSignature ? json({ symbol: request.symbolExchange }, 200, { "payment-response": encodedSettlement() }) : challengeResponse(); }
    });
    await Promise.all([call(client, "AAPL_Q"), call(client, "MSFT_Q")]);
    const msftPayment = { ...payment, payload: { signature: "synthetic-proof-msft", authorization: { nonce: "synthetic-nonce-msft" } } };
    const [aapl, msft] = await Promise.all([call(client, "AAPL_Q", payment), call(client, "MSFT_Q", msftPayment)]);
    expect(aapl.structuredContent).toEqual({ symbol: "AAPL_Q" });
    expect(msft.structuredContent).toEqual({ symbol: "MSFT_Q" });
    expect((await call(client, "MSFT_Q", payment)).structuredContent).toEqual(paymentFailure("Payment authorization has already been used; do not retry payment automatically."));
  });

  it("does not replace an active same-symbol challenge or claim client isolation", async () => {
    let calls = 0;
    const client = await connect({ async request() { calls++; return challengeResponse(); } });
    await call(client, "AAPL_Q");
    await call(client, "AAPL_Q");
    expect(calls).toBe(1);
    await call(client, "AAPL_Q", payment);
    expect((await call(client, "AAPL_Q", payment)).structuredContent).toEqual(paymentFailure("Payment authorization has already been used; do not retry payment automatically."));
  });

  it.each([
    ["missing PAYMENT-REQUIRED header", () => json({ payment_required: requirements }, 402), "x402_invalid_payment_requirements"],
    ["mismatched body and header", () => challengeResponse(requirements, { ...requirements, accepts: [{ ...accepted, amount: "101" }] }), "x402_invalid_payment_requirements"],
    ["wrong API resource", () => challengeResponse({ ...requirements, resource: { ...resource, url: "https://api.stocktrends.com/v1/stim/history" } }), "x402_invalid_payment_requirements"]
  ])("rejects an actual-API-shaped challenge with %s", async (_name, response, expected) => {
    const client = await connect({ async request() { return response(); } });
    expect((await call(client, "AAPL_Q")).structuredContent).toEqual({ error: expected });
  });
});

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
