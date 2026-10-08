import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStockTrendsMcpServer } from "../src/server.js";
import { ProductionX402ApiTransport, X402ApiTransportFailure, X402_STIM_LATEST_RESOURCE } from "../src/x402ApiTransport.js";

const resource = { url: X402_STIM_LATEST_RESOURCE, description: "Latest ST-IM", mimeType: "application/json" };
const accepted = { scheme: "exact", network: "eip155:84532", amount: "100", asset: "USDC", payTo: "0xrecipient", extra: { resource } };
const requirements = { x402Version: 2, resource, accepts: [accepted] };
const encodedRequirements = Buffer.from(JSON.stringify(requirements), "utf8").toString("base64");

function challenge(): Response {
  return new Response(JSON.stringify({ error: "payment_required", payment_required: requirements }), {
    status: 402,
    headers: { "content-type": "application/json", "payment-required": encodedRequirements }
  });
}

afterEach(() => vi.useRealTimers());

describe("production-shaped x402 API transport", () => {
  it("sends exactly one anonymous, fixed-target challenge request without credential or payment fallback", async () => {
    let calls = 0;
    const transport = new ProductionX402ApiTransport({ fetchFn: async (url, init) => {
      calls++;
      expect(url.toString()).toBe("https://api.stocktrends.com/v1/stim/latest?symbol_exchange=AAPL-Q");
      expect(init).toMatchObject({ method: "GET", credentials: "omit", redirect: "manual" });
      expect(init?.headers).toEqual({ Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" });
      return challenge();
    } });
    const result = await transport.requestAnonymousChallenge({ endpointPath: "/v1/stim/latest", method: "GET", symbolExchange: "AAPL_Q" });
    expect(result.body.payment_required).toEqual(requirements);
    expect(result.paymentRequiredHeader).toBe(encodedRequirements);
    expect(calls).toBe(1);
  });

  it("preserves the API-authored challenge for standard MCP PaymentRequired signaling", async () => {
    const upstream = new ProductionX402ApiTransport({ fetchFn: async () => challenge() });
    const runtime = createStockTrendsMcpServer({ simulatedRemoteX402: { transport: {
      async request(request) {
        if (request.paymentSignature) throw new Error("payment forwarding intentionally disabled");
        const result = await upstream.requestAnonymousChallenge({ endpointPath: "/v1/stim/latest", method: "GET", symbolExchange: request.symbolExchange });
        return new Response(JSON.stringify(result.body), { status: result.status, headers: { "content-type": "application/json", "payment-required": result.paymentRequiredHeader } });
      }
    } } });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "transport-test", version: "1" });
    await runtime.server.connect(serverTransport);
    await client.connect(clientTransport);
    const result = await client.request({ method: "tools/call", params: { name: "stocktrends_get_stim_latest", arguments: { symbol_exchange: "AAPL_Q" } } } as any, undefined as any) as any;
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual(requirements);
    await client.close();
  });

  it.each([
    ["redirect", async () => new Response(null, { status: 302, headers: { location: "https://elsewhere.example" } }), "x402_transport_redirect_rejected"],
    ["wrong status", async () => new Response("{}", { status: 200, headers: { "content-type": "application/json" } }), "x402_transport_unexpected_status"],
    ["malformed body", async () => new Response("not json", { status: 402, headers: { "content-type": "application/json", "payment-required": encodedRequirements } }), "x402_transport_malformed_response"],
    ["oversized header", async () => new Response(JSON.stringify({ payment_required: requirements }), { status: 402, headers: { "content-type": "application/json", "payment-required": "A".repeat(65536) } }), "x402_transport_malformed_response"],
    ["oversized body", async () => new Response(JSON.stringify({ payment_required: requirements, pad: "x".repeat(65536) }), { status: 402, headers: { "content-type": "application/json", "payment-required": encodedRequirements } }), "x402_transport_malformed_response"]
  ])("rejects %s without retry", async (_name, response, expected) => {
    let calls = 0;
    const transport = new ProductionX402ApiTransport({ fetchFn: async () => { calls++; return response(); } });
    await expect(transport.requestAnonymousChallenge({ endpointPath: "/v1/stim/latest", method: "GET", symbolExchange: "AAPL_Q" })).rejects.toMatchObject({ code: expected });
    expect(calls).toBe(1);
  });

  it("rejects non-canonical targets before fetch and rejects all payment forwarding", async () => {
    let calls = 0;
    const transport = new ProductionX402ApiTransport({ fetchFn: async () => { calls++; return challenge(); } });
    await expect(transport.requestAnonymousChallenge({ endpointPath: "/v1/stim/history", method: "GET", symbolExchange: "AAPL_Q" })).rejects.toBeInstanceOf(X402ApiTransportFailure);
    await expect(transport.requestWithPayment({ endpointPath: "/v1/stim/latest", method: "GET", symbolExchange: "AAPL_Q", paymentSignature: "secret" })).rejects.toMatchObject({ code: "x402_transport_payment_forwarding_disabled" });
    expect(calls).toBe(0);
  });

  it("honors cancellation timeout with a deterministic aborting fetch", async () => {
    const transport = new ProductionX402ApiTransport({ timeoutMs: 1, fetchFn: async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    }) });
    await expect(transport.requestAnonymousChallenge({ endpointPath: "/v1/stim/latest", method: "GET", symbolExchange: "AAPL_Q" })).rejects.toMatchObject({ code: "x402_transport_timeout" });
  });

  it("keeps the timeout active while a valid 402 response body stalls, without retrying", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const transport = new ProductionX402ApiTransport({ timeoutMs: 10, fetchFn: async (_url, init) => {
      calls++;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('{"payment_required":'));
          init?.signal?.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")));
        }
      });
      return new Response(body, { status: 402, headers: { "content-type": "application/json", "payment-required": encodedRequirements } });
    } });
    const result = transport.requestAnonymousChallenge({ endpointPath: "/v1/stim/latest", method: "GET", symbolExchange: "AAPL_Q" });
    const timeoutExpectation = expect(result).rejects.toMatchObject({ code: "x402_transport_timeout" });
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(10);
    await timeoutExpectation;
    expect(calls).toBe(1);
  });
});
