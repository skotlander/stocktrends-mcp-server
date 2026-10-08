import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import type { StockTrendsMcpConfig } from "../config.js";
import { AUTH_CAPABLE_PAID_ENDPOINT_POLICIES } from "../paidPolicy.js";
import type { StockTrendsClient } from "../stocktrendsClient.js";
import {
  buildPublicMockX402ChallengeRelayResult,
  createX402LiveChallengeSessionState,
  createX402ChallengeSessionState,
  executePublicLiveX402ChallengeRelay,
  X402_CHALLENGE_HEADER_NAMES,
  type X402LiveChallengeSessionState,
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
  BREADTH_DEFAULT_GROUP_LEVEL,
  BREADTH_SECTOR_DEFAULT_LIMIT,
  LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
  LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
  LEADERSHIP_DEFAULT_LIMIT_BUCKET,
  LEADERSHIP_DEFAULT_LIMIT_OVERALL,
  MARKET_CONTEXT_HTTP_METHOD,
  MARKET_REGIME_HISTORY_ENDPOINT_PATH,
  MARKET_REGIME_HISTORY_DEFAULT_LIMIT,
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
  SELECTIONS_DEFAULT_LIMIT,
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

export const X402_PUBLIC_LIVE_TOOL_DEFINITIONS = Object.freeze(
  AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) =>
    Object.freeze({
      name: policy.toolName,
      endpointPath: policy.endpointPath,
      httpMethod: policy.httpMethod,
      access: "paid" as const,
      relayMode: "live_no_key_challenge" as const
    })
  )
);

export function registerX402PublicTools(
  server: McpServer,
  client: StockTrendsClient,
  config: StockTrendsMcpConfig
): void {
  if (config.x402Relay.liveChallengeEnabled) {
    registerX402PublicLiveTools(server, client, config);
    return;
  }

  registerX402PublicMockTools(server, config);
}

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

function registerX402PublicLiveTools(
  server: McpServer,
  client: StockTrendsClient,
  config: StockTrendsMcpConfig
): void {
  if (!config.x402Relay.relayEnabled || !config.x402Relay.liveChallengeEnabled) {
    return;
  }

  const state = createX402LiveChallengeSessionState();
  const description =
    "Existing paid semantic tool exposed through explicit live no-key x402 challenge configuration. After all gates and session caps pass, one external no-key GET request to the corresponding allowlisted Stock Trends API route may occur solely to obtain HTTP 402 shape metadata. No API key is used, no proof is accepted or forwarded, no payment header is sent, no payment or spend occurs, no paid API data is returned, and no automatic retry or fallback occurs.";

  server.registerTool(
    STIM_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends ST-IM Record (live no-key x402 challenge)",
      description: `${description} Canonical symbol_exchange is required; no resolver is used.`,
      inputSchema: stimLatestInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(STIM_LATEST_ENDPOINT_PATH, STIM_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(client, config, state, STIM_LATEST_TOOL_NAME, STIM_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    STIM_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends ST-IM History (live no-key x402 challenge)",
      description: `${description} Canonical symbol_exchange is required; no resolver is used.`,
      inputSchema: stimHistoryInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(STIM_HISTORY_ENDPOINT_PATH, STIM_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(client, config, state, STIM_HISTORY_TOOL_NAME, STIM_HISTORY_ENDPOINT_PATH, input)
  );

  server.registerTool(
    INDICATORS_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Indicators Record (live no-key x402 challenge)",
      description: `${description} Canonical symbol_exchange is required; raw-symbol resolver paths fail closed before network.`,
      inputSchema: indicatorsLatestInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(INDICATORS_LATEST_ENDPOINT_PATH, INDICATORS_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(client, config, state, INDICATORS_LATEST_TOOL_NAME, INDICATORS_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    INDICATORS_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends Indicators History (live no-key x402 challenge)",
      description: `${description} Canonical symbol_exchange is required; raw-symbol resolver paths fail closed before network.`,
      inputSchema: indicatorsHistoryInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(INDICATORS_HISTORY_ENDPOINT_PATH, INDICATORS_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(
        client,
        config,
        state,
        INDICATORS_HISTORY_TOOL_NAME,
        INDICATORS_HISTORY_ENDPOINT_PATH,
        input
      )
  );

  server.registerTool(
    SELECTIONS_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Base ST-IM Selection Universe (live no-key x402 challenge)",
      description,
      inputSchema: selectionsLatestInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(SELECTIONS_LATEST_ENDPOINT_PATH, SELECTIONS_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(client, config, state, SELECTIONS_LATEST_TOOL_NAME, SELECTIONS_LATEST_ENDPOINT_PATH, input)
  );

  server.registerTool(
    MARKET_REGIME_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Market Regime Classification (live no-key x402 challenge)",
      description,
      inputSchema: marketRegimeLatestInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(MARKET_REGIME_LATEST_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(
        client,
        config,
        state,
        MARKET_REGIME_LATEST_TOOL_NAME,
        MARKET_REGIME_LATEST_ENDPOINT_PATH,
        input
      )
  );

  server.registerTool(
    MARKET_REGIME_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends Market Regime History (live no-key x402 challenge)",
      description,
      inputSchema: marketRegimeHistoryInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(MARKET_REGIME_HISTORY_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(
        client,
        config,
        state,
        MARKET_REGIME_HISTORY_TOOL_NAME,
        MARKET_REGIME_HISTORY_ENDPOINT_PATH,
        input
      )
  );

  server.registerTool(
    BREADTH_SECTOR_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Sector Breadth (live no-key x402 challenge)",
      description,
      inputSchema: breadthSectorLatestInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(BREADTH_SECTOR_LATEST_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(
        client,
        config,
        state,
        BREADTH_SECTOR_LATEST_TOOL_NAME,
        BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
        input
      )
  );

  server.registerTool(
    LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends Leadership Summary (live no-key x402 challenge)",
      description,
      inputSchema: leadershipSummaryLatestInputSchema,
      annotations: liveAnnotations(),
      _meta: liveX402Metadata(LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH, MARKET_CONTEXT_HTTP_METHOD)
    },
    async (input) =>
      handleLiveX402Tool(
        client,
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

async function handleLiveX402Tool(
  client: StockTrendsClient,
  config: StockTrendsMcpConfig,
  state: X402LiveChallengeSessionState,
  toolName: string,
  endpointPath: string,
  input: unknown
): Promise<CallToolResult> {
  const searchParams = buildLiveChallengeSearchParams(endpointPath, input);
  const result = await executePublicLiveX402ChallengeRelay(
    config.x402Relay,
    { toolName, endpointPath, httpMethod: "GET" },
    input,
    state,
    async () =>
      client.fetchNoKeyX402Challenge({
        endpointPath,
        toolName,
        searchParams,
        approvedHeaderNames: X402_CHALLENGE_HEADER_NAMES
      })
  );
  const output = result as unknown as Record<string, unknown>;
  const text =
    result.status === "payment_required"
      ? "Stock Trends API returned an HTTP 402 payment-required challenge. Only approved shape metadata is present in structuredContent; all conditional challenge values are omitted. No API key, proof, payment header, paid data, payment, or spend is included."
      : `Live no-key x402 challenge relay failed closed with ${result.error.error_code}. See structuredContent for safe status and endpoint metadata; no conditional challenge value is included.`;

  return {
    structuredContent: output,
    content: [{ type: "text", text }],
    ...(result.status === "error" ? { isError: true } : {})
  };
}

export function buildLiveChallengeSearchParams(endpointPath: string, input: unknown): URLSearchParams {
  const source = isRecord(input) ? { ...input } : {};

  if (
    [
      STIM_LATEST_ENDPOINT_PATH,
      STIM_HISTORY_ENDPOINT_PATH,
      INDICATORS_LATEST_ENDPOINT_PATH,
      INDICATORS_HISTORY_ENDPOINT_PATH
    ].includes(endpointPath)
  ) {
    delete source.symbol;
    delete source.exchange;
  }

  if (typeof source.symbol_exchange === "string") {
    source.symbol_exchange = source.symbol_exchange.replace(/_([NQABTI])$/, "-$1");
  }

  if (endpointPath === SELECTIONS_LATEST_ENDPOINT_PATH) {
    source.limit ??= SELECTIONS_DEFAULT_LIMIT;
  }

  if (endpointPath === MARKET_REGIME_HISTORY_ENDPOINT_PATH) {
    source.limit ??= MARKET_REGIME_HISTORY_DEFAULT_LIMIT;
  }

  if (endpointPath === BREADTH_SECTOR_LATEST_ENDPOINT_PATH) {
    source.group_level ??= BREADTH_DEFAULT_GROUP_LEVEL;
    source.limit ??= BREADTH_SECTOR_DEFAULT_LIMIT;
  }

  if (endpointPath === LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH) {
    source.limit_overall ??= LEADERSHIP_DEFAULT_LIMIT_OVERALL;
    source.limit_bucket ??= LEADERSHIP_DEFAULT_LIMIT_BUCKET;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      continue;
    }

    params.set(key, String(value));
  }

  return params;
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

function liveAnnotations(): {
  readOnlyHint: true;
  destructiveHint: false;
  idempotentHint: false;
  openWorldHint: true;
} {
  return {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
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

function liveX402Metadata(endpointPath: string, method: "GET"): Record<string, unknown> {
  return {
    access: "paid",
    endpointPath,
    method,
    x402Relay: "live_no_key_challenge",
    apiRequestMayBeSent: true,
    maxApiRequestsPerInvocation: 1,
    apiKeyUsed: false,
    proofForwarded: false,
    paymentHeaderSent: false,
    paymentOrSpendOccurs: false,
    paidApiDataReturned: false,
    paidExecutionAuthorized: false
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
