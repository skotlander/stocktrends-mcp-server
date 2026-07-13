import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { StockTrendsMcpConfig } from "../config.js";
import { AUTH_CAPABLE_PAID_ENDPOINT_POLICIES } from "../paidPolicy.js";
import {
  buildPublicMockX402ChallengeRelayResult,
  createX402ChallengeSessionState,
  type X402ChallengeSessionState
} from "../x402Relay.js";
import {
  INDICATORS_HISTORY_ENDPOINT_PATH,
  INDICATORS_HISTORY_TOOL_NAME,
  INDICATORS_HTTP_METHOD,
  INDICATORS_LATEST_ENDPOINT_PATH,
  INDICATORS_LATEST_TOOL_NAME,
  indicatorsHistoryInputSchema,
  indicatorsLatestInputSchema
} from "./indicatorsTools.js";
import {
  BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
  BREADTH_SECTOR_LATEST_TOOL_NAME,
  LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
  LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
  MARKET_CONTEXT_HTTP_METHOD,
  MARKET_REGIME_HISTORY_ENDPOINT_PATH,
  MARKET_REGIME_HISTORY_TOOL_NAME,
  MARKET_REGIME_LATEST_ENDPOINT_PATH,
  MARKET_REGIME_LATEST_TOOL_NAME,
  breadthSectorLatestInputSchema,
  leadershipSummaryLatestInputSchema,
  marketRegimeHistoryInputSchema,
  marketRegimeLatestInputSchema
} from "./marketContextTools.js";
import {
  SELECTIONS_HTTP_METHOD,
  SELECTIONS_LATEST_ENDPOINT_PATH,
  SELECTIONS_LATEST_TOOL_NAME,
  selectionsLatestInputSchema
} from "./selectionsTools.js";
import {
  STIM_HISTORY_ENDPOINT_PATH,
  STIM_HISTORY_TOOL_NAME,
  STIM_HTTP_METHOD,
  STIM_LATEST_ENDPOINT_PATH,
  STIM_LATEST_TOOL_NAME,
  stimHistoryInputSchema,
  stimLatestInputSchema
} from "./stimTools.js";

export const X402_PUBLIC_MOCK_TOOL_DEFINITIONS = Object.freeze(
  AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) =>
    Object.freeze({
      name: policy.toolName,
      endpointPath: policy.endpointPath,
      httpMethod: policy.httpMethod,
      access: "paid" as const,
      relayMode: "mock_only" as const
    })
  )
);

export function registerX402PublicMockTools(server: McpServer, config: StockTrendsMcpConfig): void {
  if (!config.x402Relay.relayEnabled) {
    return;
  }

  const state = createX402ChallengeSessionState();
  const description =
    "Existing paid semantic tool exposed through explicit mock-only x402 relay configuration. It sends no request, performs no resolver lookup, uses no API key, accepts or forwards no proof, constructs no payment header, creates no spend, and returns no paid API data. With the challenge gate off it fails closed locally; with the challenge gate on it returns deterministic shape-only payment_required metadata.";

  server.registerTool(
    STIM_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends ST-IM Record (mock-only x402 challenge)",
      description: `${description} Canonical symbol_exchange is required in this mode.`,
      inputSchema: stimLatestInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(STIM_LATEST_ENDPOINT_PATH, STIM_HTTP_METHOD)
    },
    async (input) => handleX402Tool(config, state, STIM_LATEST_TOOL_NAME, STIM_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    STIM_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends ST-IM History (mock-only x402 challenge)",
      description: `${description} Canonical symbol_exchange is required in this mode.`,
      inputSchema: stimHistoryInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(STIM_HISTORY_ENDPOINT_PATH, STIM_HTTP_METHOD)
    },
    async (input) => handleX402Tool(config, state, STIM_HISTORY_TOOL_NAME, STIM_HISTORY_ENDPOINT_PATH, input)
  );

  server.registerTool(
    INDICATORS_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Indicators Record (mock-only x402 challenge)",
      description: `${description} Canonical symbol_exchange is required; raw-symbol resolver paths fail closed locally.`,
      inputSchema: indicatorsLatestInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(INDICATORS_LATEST_ENDPOINT_PATH, INDICATORS_HTTP_METHOD)
    },
    async (input) => handleX402Tool(config, state, INDICATORS_LATEST_TOOL_NAME, INDICATORS_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    INDICATORS_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends Indicators History (mock-only x402 challenge)",
      description: `${description} Canonical symbol_exchange is required; raw-symbol resolver paths fail closed locally.`,
      inputSchema: indicatorsHistoryInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(INDICATORS_HISTORY_ENDPOINT_PATH, INDICATORS_HTTP_METHOD)
    },
    async (input) => handleX402Tool(config, state, INDICATORS_HISTORY_TOOL_NAME, INDICATORS_HISTORY_ENDPOINT_PATH, input)
  );

  server.registerTool(
    SELECTIONS_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Base ST-IM Selection Universe (mock-only x402 challenge)",
      description,
      inputSchema: selectionsLatestInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(SELECTIONS_LATEST_ENDPOINT_PATH, SELECTIONS_HTTP_METHOD)
    },
    async (input) => handleX402Tool(config, state, SELECTIONS_LATEST_TOOL_NAME, SELECTIONS_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    MARKET_REGIME_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Market Regime Classification (mock-only x402 challenge)",
      description,
      inputSchema: marketRegimeLatestInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(MARKET_REGIME_LATEST_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleX402Tool(config, state, MARKET_REGIME_LATEST_TOOL_NAME, MARKET_REGIME_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    MARKET_REGIME_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends Market Regime History (mock-only x402 challenge)",
      description,
      inputSchema: marketRegimeHistoryInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(MARKET_REGIME_HISTORY_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleX402Tool(config, state, MARKET_REGIME_HISTORY_TOOL_NAME, MARKET_REGIME_HISTORY_ENDPOINT_PATH, input)
  );

  server.registerTool(
    BREADTH_SECTOR_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Sector Breadth (mock-only x402 challenge)",
      description,
      inputSchema: breadthSectorLatestInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(BREADTH_SECTOR_LATEST_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleX402Tool(config, state, BREADTH_SECTOR_LATEST_TOOL_NAME, BREADTH_SECTOR_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Leadership Summary (mock-only x402 challenge)",
      description,
      inputSchema: leadershipSummaryLatestInputSchema,
      annotations: safeAnnotations(),
      _meta: x402Metadata(LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleX402Tool(
        config,
        state,
        LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
        LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
        input
      )
  );
}

function handleX402Tool(
  config: StockTrendsMcpConfig,
  state: X402ChallengeSessionState,
  toolName: string,
  endpointPath: string,
  input: unknown
): CallToolResult {
  const result = buildPublicMockX402ChallengeRelayResult(
    config.x402Relay,
    { toolName, endpointPath, httpMethod: "GET" },
    input,
    state
  );
  const output = result as unknown as Record<string, unknown>;

  return {
    structuredContent: output,
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
    ...(result.status === "error" ? { isError: true } : {})
  };
}

function safeAnnotations(): {
  readOnlyHint: true;
  destructiveHint: false;
  idempotentHint: true;
  openWorldHint: false;
} {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false
  };
}

function x402Metadata(endpointPath: string, method: "GET"): Record<string, unknown> {
  return {
    access: "paid",
    endpointPath,
    method,
    x402Relay: "mock_only",
    apiRequestSent: false,
    paidExecutionAuthorized: false
  };
}
