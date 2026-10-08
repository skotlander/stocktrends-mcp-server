import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "vitest";
import { parseConfig } from "../src/config.js";
import { startStreamableHttpServer, type RunningStreamableHttpServer } from "../src/httpServer.js";
import { createSimulatedX402RemoteState } from "../src/tools/x402SimulatedRemoteTool.js";

const running: RunningStreamableHttpServer[] = [];
const resource = { url: "https://api.stocktrends.com/v1/stim/latest", description: "Latest ST-IM", mimeType: "application/json", serviceName: "Stock Trends API", tags: ["stim"], iconUrl: "https://api.stocktrends.com/icon.png" };
const accepted = { scheme: "exact", network: "eip155:84532", amount: "100", asset: "USDC", payTo: "0xrecipient", maxTimeoutSeconds: 300, extra: { name: "USDC", version: "2", resource } };
const requirements = { x402Version: 2, resource, accepts: [accepted], extensions: { bazaar: { version: "1" } } };
const payment = { x402Version: 2, resource, accepted, payload: { signature: "synthetic-proof", authorization: { nonce: "synthetic-nonce" } } };

afterEach(async () => { await Promise.all(running.splice(0).map((server) => server.close())); });

describe("simulated x402 Remote MCP over Streamable HTTP", () => {
  it("serves an anonymous x402 transaction only through the injected simulated transport", async () => {
    const config = parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http" });
    const server = await startStreamableHttpServer({
      config: { ...config, http: { ...config.http!, port: 0 } },
      simulatedRemoteX402: {
        state: createSimulatedX402RemoteState(),
        transport: {
          async request(request) {
            if (request.paymentSignature) {
              expect(JSON.parse(Buffer.from(request.paymentSignature, "base64").toString("utf8"))).toEqual(payment);
              return json({ symbol_exchange: "AAPL-Q", stim: 88 }, 200, { "payment-response": encode({ success: true, transaction: "simulated-tx" }) });
            }
            return json({ error: "payment_required", detail: "Payment is required to access this endpoint.", protocol: "x402", resource: resource.url, payment_required: requirements }, 402, { "payment-required": encode(requirements) });
          }
        }
      }
    });
    running.push(server);
    const client = new Client({ name: "x402-http-simulation", version: "1.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${server.port}/mcp`)));

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual(["stocktrends_estimate_workflow_cost", "stocktrends_get_stim_latest"]);
    const challenge = await client.request(
      { method: "tools/call", params: { name: "stocktrends_get_stim_latest", arguments: { symbol_exchange: "AAPL_Q" } } } as any,
      undefined as any
    ) as any;
    expect(challenge.isError).toBe(true);
    expect(challenge.structuredContent).toEqual(requirements);
    expect(JSON.parse(challenge.content[0].text)).toEqual(requirements);
    const paid = await client.request(
      { method: "tools/call", params: { name: "stocktrends_get_stim_latest", arguments: { symbol_exchange: "AAPL_Q" }, _meta: { "x402/payment": payment } } } as any,
      undefined as any
    ) as any;
    expect(paid.structuredContent).toEqual({ symbol_exchange: "AAPL-Q", stim: 88 });
    expect(paid.isError).not.toBe(true);
    expect(paid._meta["x402/payment-response"]).toEqual({ success: true, transaction: "simulated-tx" });
    await client.close();
  });
});

function encode(value: unknown): string { return Buffer.from(JSON.stringify(value), "utf8").toString("base64"); }
function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}
