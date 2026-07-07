#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseConfig, type Env, type StockTrendsMcpConfig } from "./config.js";
import { createLogger, safeErrorMessage } from "./logging.js";
import { registerPublicResources } from "./resources/index.js";
import { StockTrendsClient, type FetchLike } from "./stocktrendsClient.js";

export const SERVER_NAME = "stocktrends-mcp-server";
export const SERVER_VERSION = "1.0.0";

export interface StockTrendsServerRuntime {
  server: McpServer;
  client: StockTrendsClient;
  config: StockTrendsMcpConfig;
}

export interface CreateServerOptions {
  env?: Env;
  config?: StockTrendsMcpConfig;
  fetchFn?: FetchLike;
}

export function createStockTrendsMcpServer(options: CreateServerOptions = {}): StockTrendsServerRuntime {
  const config = options.config ?? parseConfig(options.env);
  const client = new StockTrendsClient(config, options.fetchFn);
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION
  });

  registerPublicResources(server, client);

  return {
    server,
    client,
    config
  };
}

export async function startStdioServer(env: Env = process.env): Promise<void> {
  const config = parseConfig(env);
  const runtime = createStockTrendsMcpServer({ config });

  if (config.transport !== "stdio") {
    throw new Error("Unsupported transport after configuration validation.");
  }

  await runtime.server.connect(new StdioServerTransport());
}

if (isDirectExecution()) {
  startStdioServer().catch((error) => {
    const logger = createLogger({ logLevel: "error" });
    logger.error(safeErrorMessage(error));
    process.exitCode = 1;
  });
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
}
