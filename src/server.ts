#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { parseConfig, type Env, type StockTrendsMcpConfig } from "./config.js";
import { createLogger, safeErrorMessage } from "./logging.js";
import { createPaidUsageTracker } from "./paidPolicy.js";
import { createPaidPricingReconciliationState } from "./paidPricing.js";
import { registerPublicResources } from "./resources/index.js";
import { StockTrendsClient, type FetchLike } from "./stocktrendsClient.js";
import { registerPublicPlanningTools } from "./tools/index.js";
import { registerPaidIndicatorsTools } from "./tools/indicatorsTools.js";
import { registerPaidMarketContextTools } from "./tools/marketContextTools.js";
import { registerPaidSelectionsTools } from "./tools/selectionsTools.js";
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
  // Per-server pricing-catalog reconciliation state. A successful reconciliation
  // is cached for the server lifetime; failures fail the call closed and are not
  // cached. Resets on restart.
  const paidReconciliation = createPaidPricingReconciliationState();

  registerPublicResources(server, client);
  registerPublicPlanningTools(server, client);
  // Paired paid ST-IM tools. These register only when paid mode is explicitly
  // enabled with an API key. Live subscription/API-key execution runs only when
  // the execution flag, authoritative static pricing/preflight, a passing
  // credential-free catalog reconciliation, and nonzero local caps additionally
  // pass; otherwise every invocation fails closed.
  registerPaidStimTools(server, client, config, paidUsage, paidReconciliation);
  // Paired paid indicators tools. Same exposure gate as the ST-IM pair (paid
  // mode enabled with an API key). A raw symbol is resolved credential-free to a
  // single canonical identity before any paid boundary; ambiguity fails closed
  // with candidate matches. They share the same in-memory caps and per-server
  // reconciliation state (reconciled per family), and execution behavior is
  // governed by the same gates as every other paid family (see the final total
  // below).
  registerPaidIndicatorsTools(server, client, config, paidUsage, paidReconciliation);
  // Base ST-IM selection-universe tool (`stocktrends_get_selections_latest`).
  // Same exposure gate as the ST-IM / indicators pairs (paid mode enabled with
  // an API key). Execution is governed by the same gates plus list-shaped
  // broad-sweep/limit-safety controls (default limit 50, hard max 250,
  // always-present limit, one fetch per invocation, no bulk/retry,
  // repeated-identical-call loop denial). It shares the same in-memory caps and
  // per-server reconciliation state (reconciled per family, base `selections`
  // only; see the final total below).
  registerPaidSelectionsTools(server, client, config, paidUsage, paidReconciliation);
  // Phase 5D market-context tools (`stocktrends_get_market_regime_latest`,
  // `stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`,
  // `stocktrends_get_leadership_summary_latest`). Same exposure gate as every
  // prior paid family (paid mode enabled with an API key), so registering them
  // brings the paid-exposed surface to exactly ten tools while the default/free
  // surface stays at exactly one. Execution is governed by the same gates plus
  // market-context limit-safety controls (always-sent limits, no weekdate
  // snapshot time-travel, one fetch per invocation, no bulk/retry, and a
  // repeated-identical-call denial covering all four tools). They share the same
  // in-memory caps and per-server reconciliation state (reconciled per family:
  // market, breadth, leadership). The credential-free leadership-definitions
  // public resource is registered with the other public resources above.
  registerPaidMarketContextTools(server, client, config, paidUsage, paidReconciliation);

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
      "Paid ST-IM, indicators, base selections, and market-context live execution is ENABLED (STOCKTRENDS_ENABLE_PAID_EXECUTION=true with an API key). Live subscription/API-key calls to GET /v1/stim/latest, /v1/stim/history, /v1/indicators/latest, /v1/indicators/history, /v1/selections/latest, /v1/market/regime/latest, /v1/market/regime/history, /v1/breadth/sector/latest, and /v1/leadership/summary/latest can occur when static pricing/preflight, family-scoped catalog reconciliation, and nonzero local caps pass (ST-IM/indicators additionally require a safe canonical instrument identity; selections and market-context additionally enforce bounded always-sent limits and repeated-identical-call loop safety). No API key is logged."
    );
  } else if (config.paidTools.status === "configured_foundation_no_execution") {
    logger.warn(
      "Paid ST-IM, indicators, base selections, and market-context tools are exposed but paid execution is NOT enabled (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true); every invocation fails closed with no request."
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
