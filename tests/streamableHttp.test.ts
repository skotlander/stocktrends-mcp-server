import { afterEach, describe, expect, it } from "vitest";
import { request } from "node:http";
import { createConnection } from "node:net";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { parseConfig } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";
import { createStreamableHttpMcpHandler, startStreamableHttpServer, type RunningStreamableHttpServer } from "../src/httpServer.js";
import { PUBLIC_RESOURCES } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { jsonResponse, textResponse } from "./helpers.js";

const running: RunningStreamableHttpServer[] = [];

afterEach(async () => {
  await Promise.all(running.splice(0).map((server) => server.close()));
});

function remoteConfig(env: Record<string, string | undefined> = {}) {
  const config = parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http", ...env });
  return { ...config, http: { ...config.http!, port: 0 } };
}

function programmaticRemoteConfig(env: Record<string, string | undefined>) {
  const localConfig = parseConfig(env);
  return { ...localConfig, transport: "streamable-http" as const, http: remoteConfig().http };
}

async function start(fetchFn: FetchLike = async () => jsonResponse({ ok: true })) {
  const server = await startStreamableHttpServer({ config: remoteConfig(), fetchFn });
  running.push(server);
  return server;
}

function endpoint(server: RunningStreamableHttpServer): string {
  return `http://127.0.0.1:${server.port}/mcp`;
}

function rawGet(port: number, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({ host: "127.0.0.1", port, path: "/healthz", headers }, (response) => {
      response.resume();
      response.on("end", () => resolve(response.statusCode ?? 0));
    });
    req.on("error", reject);
    req.end();
  });
}

function rawRequest(port: number, target: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    const chunks: Buffer[] = [];
    socket.on("connect", () => socket.end(`GET ${target} HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`));
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.on("error", reject);
    socket.on("end", () => {
      const response = Buffer.concat(chunks).toString("utf8");
      const separator = response.indexOf("\r\n\r\n");
      const status = Number(/^HTTP\/1\.1 (\d{3})/.exec(response)?.[1] ?? 0);
      resolve({ status, body: separator >= 0 ? response.slice(separator + 4) : "" });
    });
  });
}

async function connect(server: RunningStreamableHttpServer): Promise<Client> {
  const client = new Client({ name: "stocktrends-http-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint(server))));
  return client;
}

describe("streamable HTTP transport", () => {
  it("keeps stdio as the default and parses only the explicit supported remote transport", () => {
    expect(parseConfig({}).transport).toBe("stdio");
    expect(parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "streamable-http" }).transport).toBe("streamable-http");
    expect(() => parseConfig({ STOCKTRENDS_MCP_TRANSPORT: "sse" })).toThrow(StockTrendsMcpError);
  });

  it("serves exactly the free remote MCP surface", async () => {
    const server = await start();
    const client = await connect(server);
    const [tools, resources, prompts] = await Promise.all([client.listTools(), client.listResources(), client.listPrompts()]);

    expect(tools.tools.map((tool) => tool.name)).toEqual(["stocktrends_estimate_workflow_cost"]);
    expect(resources.resources).toHaveLength(10);
    expect(resources.resources.map((resource) => resource.uri).sort()).toEqual(PUBLIC_RESOURCES.map((resource) => resource.uri).sort());
    expect(prompts.prompts).toEqual([]);
    await client.close();
  });

  it("reads public resources and plans workflow cost without customer credentials or payment material", async () => {
    const seen: RequestInit[] = [];
    const server = await start(async (url, init) => {
      seen.push(init);
      if (url.pathname === "/v1/cost-estimate") {
        return jsonResponse({ workflow_id: "portfolio_build", rail: "subscription", total_stc_cost: 0, total_usd_cost: 0, steps: [], notes: [] });
      }
      return jsonResponse({ source: "public" });
    });
    const client = await connect(server);
    const resource = await client.readResource({ uri: PUBLIC_RESOURCES[0].uri });
    const estimate = await client.callTool({ name: "stocktrends_estimate_workflow_cost", arguments: { workflow_id: "portfolio_build" } });

    expect(resource.contents).toHaveLength(1);
    expect(estimate.isError).not.toBe(true);
    for (const request of seen) {
      const headers = new Headers(request.headers);
      expect(headers.has("x-api-key")).toBe(false);
      expect(headers.has("authorization")).toBe(false);
      expect(headers.has("payment-signature")).toBe(false);
      expect(headers.has("payment-proof")).toBe(false);
    }
    await client.close();
  });

  it.each([
    { STOCKTRENDS_API_KEY: "secret" },
    { STOCKTRENDS_ENABLE_PAID_TOOLS: "true", STOCKTRENDS_API_KEY: "secret" },
    { STOCKTRENDS_ENABLE_PAID_EXECUTION: "true" },
    { STOCKTRENDS_ENABLE_X402_RELAY: "true" },
    { STOCKTRENDS_ENABLE_X402_RELAY: "true", STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true" },
    { STOCKTRENDS_ENABLE_X402_RELAY: "true", STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true", STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY: "true" },
    { STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING: "true" }
  ])("refuses incompatible paid or x402 remote configuration %#", (env) => {
    expect(() => remoteConfig(env)).toThrow();
  });

  it("rejects hostile Host and Origin headers while accepting server-to-server requests without Origin", async () => {
    const server = await start();
    const base = `http://127.0.0.1:${server.port}`;
    const hostileHost = await rawGet(server.port, { Host: "attacker.example" });
    const hostileOrigin = await fetch(`${base}/healthz`, { headers: { Origin: "https://attacker.example" } });
    const noOrigin = await fetch(`${base}/healthz`);

    expect(hostileHost).toBe(403);
    expect(hostileOrigin.status).toBe(403);
    expect(noOrigin.status).toBe(200);
  });

  it("safely rejects malformed request targets without destabilizing the listener", async () => {
    const server = await start();
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      for (const target of ["//", "http://"]) {
        const response = await rawRequest(server.port, target);
        expect(response.status).toBe(400);
        expect(response.body).toContain(JSON.stringify({ error: "invalid_request_target" }));
      }
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(unhandled).toEqual([]);
      expect(server.server.listening).toBe(true);
      expect((await fetch(`http://127.0.0.1:${server.port}/healthz`)).status).toBe(200);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  it("handles malformed MCP input and body limits without constructing an upstream request", async () => {
    const server = await start(async () => {
      throw new Error("upstream must not be called");
    });
    const malformed = await fetch(endpoint(server), { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    const handler = createStreamableHttpMcpHandler({ config: remoteConfig() });
    const large = await handler.fetch(new Request(endpoint(server), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "x".repeat(4 * 1024 * 1024 + 1)
    }));

    expect([400, 406]).toContain(malformed.status);
    expect(large.status).toBe(413);
  });

  it("maps upstream resource failures and gives concurrent callers isolated server instances", async () => {
    let calls = 0;
    const server = await start(async () => {
      calls += 1;
      return calls === 1 ? textResponse("unavailable", 503) : jsonResponse({ public: true });
    });
    const [first, second] = await Promise.all([connect(server), connect(server)]);
    const failed = first.readResource({ uri: PUBLIC_RESOURCES[0].uri });
    const succeeded = second.readResource({ uri: PUBLIC_RESOURCES[1].uri });

    await expect(failed).rejects.toThrow("Stock Trends API is unavailable");
    expect((await succeeded).contents).toHaveLength(1);
    await first.close();
    await second.close();
  });

  it("maps an upstream abort to the existing timeout-safe resource failure", async () => {
    const server = await start(async () => {
      const error = new Error("network timeout");
      error.name = "AbortError";
      throw error;
    });
    const client = await connect(server);

    await expect(client.readResource({ uri: PUBLIC_RESOURCES[0].uri })).rejects.toThrow("Timed out fetching Stock Trends public resource");
    await client.close();
  });

  it("fails startup before listening when given a non-HTTP configuration", async () => {
    await expect(startStreamableHttpServer({ config: parseConfig({}) })).rejects.toThrow("Streamable HTTP startup requires validated streamable-http configuration");
  });

  it.each([
    ["paid tools", { STOCKTRENDS_ENABLE_PAID_TOOLS: "true" }],
    ["API key", { STOCKTRENDS_ENABLE_PAID_TOOLS: "true", STOCKTRENDS_API_KEY: "programmatic-test-key" }],
    ["paid execution", { STOCKTRENDS_ENABLE_PAID_TOOLS: "true", STOCKTRENDS_API_KEY: "programmatic-test-key", STOCKTRENDS_ENABLE_PAID_EXECUTION: "true" }],
    ["x402 relay", { STOCKTRENDS_ENABLE_X402_RELAY: "true" }],
    ["x402 challenge execution", { STOCKTRENDS_ENABLE_X402_RELAY: "true", STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true" }],
    ["x402 live challenge", { STOCKTRENDS_ENABLE_X402_RELAY: "true", STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true", STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY: "true" }]
  ])("fails closed before listening for programmatic %s configuration", async (_name, env) => {
    const config = programmaticRemoteConfig(env);
    await expect(startStreamableHttpServer({ config })).rejects.toMatchObject({ errorCode: "remote_transport_incompatible_config" });
  });

  it("reports health/readiness and becomes unavailable during graceful shutdown", async () => {
    const server = await start();
    const base = `http://127.0.0.1:${server.port}`;
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
    expect((await fetch(`${base}/readyz`)).status).toBe(200);
    await server.close();
    expect(server.server.listening).toBe(false);
  });
});
