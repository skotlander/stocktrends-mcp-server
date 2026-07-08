#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseConfig, type Env, type StockTrendsMcpConfig } from "./config.js";
import { createLogger, safeErrorMessage } from "./logging.js";
import { createPaidUsageTracker } from "./paidPolicy.js";
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

  // Per-server in-memory paid usage accounting. Lives for this server instance
  // only and resets on restart (no persistence). Shared by the paired paid
  // ST-IM tools so caps are enforced across both.
  const paidUsage = createPaidUsageTracker();

  registerPublicResources(server, client);
  registerPublicPlanningTools(server, client);
  // Paired paid ST-IM tools. These register only when paid mode is explicitly
  // enabled with an API key. Live subscription/API-key execution runs only when
  // the execution flag, authoritative static pricing/preflight, and nonzero
  // local caps additionally pass; otherwise every invocation fails closed.
  registerPaidStimTools(server, client, config, paidUsage);

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

  if (config.paidTools.status === "configured_execution_enabled") {
    logger.warn(
      "Paid ST-IM live execution is ENABLED (STOCKTRENDS_ENABLE_PAID_EXECUTION=true with an API key). Live subscription/API-key calls to GET /v1/stim/latest and /v1/stim/history can occur when static pricing/preflight and nonzero local caps pass. No API key is logged."
    );
  } else if (config.paidTools.status === "configured_foundation_no_execution") {
    logger.warn(
      "Paid ST-IM tools are exposed but paid execution is NOT enabled (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true); every invocation fails closed with no request."
    );
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
