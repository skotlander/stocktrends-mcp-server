#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
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
import { registerX402PublicTools } from "./tools/x402Tools.js";
import { registerSimulatedRemoteX402StimTool, type SimulatedX402RemoteOptions } from "./tools/x402SimulatedRemoteTool.js";
import { startStreamableHttpServer } from "./httpServer.js";

export const SERVER_NAME = "stocktrends-mcp-server";
export const SERVER_VERSION = "1.0.1";

export interface StockTrendsServerRuntime {
  server: McpServer;
  client: StockTrendsClient;
  config: StockTrendsMcpConfig;
}

export interface CreateServerOptions {
  env?: Env;
  config?: StockTrendsMcpConfig;
  fetchFn?: FetchLike;
  /** Test-only injection seam. Never supplied by environment or startup code. */
  simulatedRemoteX402?: SimulatedX402RemoteOptions;
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
  if (!options.simulatedRemoteX402) registerPaidStimTools(server, client, config, paidUsage, paidReconciliation);
  // Paired paid indicators tools. Same exposure gate as the ST-IM pair (paid
  // mode enabled with an API key). A raw symbol is resolved credential-free to a
  // single canonical identity before any paid boundary; ambiguity fails closed
  // with candidate matches. They share the same in-memory caps and per-server
  // reconciliation state (reconciled per family), and execution behavior is
  // governed by the same gates as every other paid family (see the final total
  // below).
  if (!options.simulatedRemoteX402) registerPaidIndicatorsTools(server, client, config, paidUsage, paidReconciliation);
  // Base ST-IM selection-universe tool (`stocktrends_get_selections_latest`).
  // Same exposure gate as the ST-IM / indicators pairs (paid mode enabled with
  // an API key). Execution is governed by the same gates plus list-shaped
  // broad-sweep/limit-safety controls (default limit 50, hard max 250,
  // always-present limit, one fetch per invocation, no bulk/retry,
  // repeated-identical-call loop denial). It shares the same in-memory caps and
  // per-server reconciliation state (reconciled per family, base `selections`
  // only; see the final total below).
  if (!options.simulatedRemoteX402) registerPaidSelectionsTools(server, client, config, paidUsage, paidReconciliation);
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
  if (!options.simulatedRemoteX402) registerPaidMarketContextTools(server, client, config, paidUsage, paidReconciliation);
  // Explicit x402 relay posture reuses the same nine paid semantic tool names
  // and their existing strict schemas. Mixed API-key/x402 configuration is
  // rejected before API-key parsing, so these registrations can never overlap
  // with the API-key paid registrations above. Mock mode remains local-only;
  // the distinct live flag selects the capped, no-key, one-GET challenge path.
  if (options.simulatedRemoteX402) {
    // This isolated harness intentionally replaces every paid registration with
    // one simulated tool. It cannot be enabled by runtime configuration.
    registerSimulatedRemoteX402StimTool(server, options.simulatedRemoteX402);
  } else {
    registerX402PublicTools(server, client, config);
  }

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

  if (config.x402Relay.relayEnabled) {
    logger.warn(
      config.x402Relay.liveChallengeEnabled
        ? "Live no-key x402 challenge relay is ENABLED. An invocation of an allowlisted paid semantic tool may make one external no-key GET after canonical-input, proof, repeat, per-tool, and per-session gates pass. No API key, resolver, proof forwarding, payment header, automatic retry, paid output, payment, or spend path is enabled."
        : config.x402Relay.challengeExecutionEnabled
        ? "Mock-only x402 challenge mode is enabled. The existing nine paid semantic tools are exposed, but every challenge result is local and shape-only: no network, resolver, API key, proof, payment header, paid output, or spend path is enabled."
        : "x402 relay exposure is enabled with challenge behavior disabled. The existing nine paid semantic tools are exposed, but every invocation fails closed locally with no request, resolver, API key, proof, payment header, paid output, or spend."
    );
  }

  await runtime.server.connect(new StdioServerTransport());
}

export { startStreamableHttpServer };

// Testing seam: the default implementations of the three path primitives
// isDirectExecution needs. Tests inject a partial override (e.g. a
// realpathNative that throws only for one specific input) to exercise
// individual failure branches without constructing real broken filesystem
// state.
export interface DirectExecutionDeps {
  fileURLToPath: (url: string | URL) => string;
  resolvePath: (...pathSegments: string[]) => string;
  realpathNative: (path: string) => string;
}

export const defaultDirectExecutionDeps: DirectExecutionDeps = {
  fileURLToPath,
  resolvePath: resolve,
  realpathNative: realpathSync.native
};

function toCanonicalPath(pathLike: string, deps: DirectExecutionDeps): string {
  return deps.realpathNative(pathLike);
}

// True iff the executing entry-point path and this module resolve to the
// same canonical filesystem object. Canonicalizing both sides (rather than
// comparing raw URL/path strings) makes the comparison transparent to a
// POSIX npm-bin symlink while leaving every other supported invocation shape
// unaffected. Any conversion, resolution, or realpath exception fails closed
// to false -- the safer default is "did not detect direct execution".
export function isDirectExecution(
  moduleUrl: string = import.meta.url,
  entrypoint: string | undefined = process.argv[1],
  deps: DirectExecutionDeps = defaultDirectExecutionDeps
): boolean {
  if (!entrypoint) return false;
  try {
    const modulePath = toCanonicalPath(deps.fileURLToPath(moduleUrl), deps);
    const entryPath = toCanonicalPath(deps.resolvePath(entrypoint), deps);
    return modulePath === entryPath;
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  const transport = process.env.STOCKTRENDS_MCP_TRANSPORT?.trim().toLowerCase() ?? "stdio";
  const startup = transport === "streamable-http" ? startStreamableHttpServer() : startStdioServer();
  startup.catch((error) => {
    const logger = createLogger({ logLevel: "error" });
    logger.error(safeErrorMessage(error));
    process.exitCode = 1;
  });
}
