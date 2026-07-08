#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseConfig, type Env, type StockTrendsMcpConfig } from "./config.js";
import { createLogger, safeErrorMessage } from "./logging.js";
import { registerPublicResources } from "./resources/index.js";
import { StockTrendsClient, type FetchLike } from "./stocktrendsClient.js";
import { registerPublicPlanningTools } from "./tools/index.js";
import { registerPaidStimTools } from "./tools/stimTools.js";

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
  registerPublicPlanningTools(server, client);
  // Paired paid ST-IM tool foundation. These register only when paid mode is
  // explicitly enabled with an API key; even then, every invocation fails
  // closed at the hard paid-execution-disabled gate (no live paid call).
  registerPaidStimTools(server, client, config);

  return {
    server,
    client,
    config
  };
}

export async function startStdioServer(env: Env = process.env): Promise<void> {
  const config = parseConfig(env);
  const logger = createLogger({ logLevel: config.logLevel });
  const runtime = createStockTrendsMcpServer({ config });

  if (config.transport !== "stdio") {
    throw new Error("Unsupported transport after configuration validation.");
  }

  if (config.paidTools.status === "blocked_missing_api_key") {
    logger.warn("STOCKTRENDS_ENABLE_PAID_TOOLS=true but no API key is configured; paid mode is blocked and no paid tools are registered.");
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
