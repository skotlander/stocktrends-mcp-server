import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport, type McpServer } from "@modelcontextprotocol/server";
import { parseConfig, type Env } from "../src/config.js";
import { createStockTrendsMcpServer } from "../src/server.js";
import type { FetchLike } from "../src/stocktrendsClient.js";

export function jsonResponse(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}

export function textResponse(body: string, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers
  });
}

export async function connectMcp(fetchFn: FetchLike, env: Env = {}): Promise<{ client: Client; server: McpServer }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const runtime = createStockTrendsMcpServer({
    config: parseConfig(env),
    fetchFn
  });
  const client = new Client({
    name: "stocktrends-test-client",
    version: "1.0.0"
  });

  await runtime.server.connect(serverTransport);
  await client.connect(clientTransport);

  return {
    client,
    server: runtime.server
  };
}
