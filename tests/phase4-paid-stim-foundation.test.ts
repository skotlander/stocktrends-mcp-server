import { describe, expect, it, vi } from "vitest";
import { parseConfig, type Env } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";
import {
  assertPaidPreflightAuthorized,
  buildPaidAuthHeaders,
  evaluatePaidInvocationPreflight,
  evaluatePaidPreflight,
  isPaidExecutionEnabledInBuild,
  isPaidExecutionRuntimeEnabled,
  PHASE4_PAID_EXECUTION_ENABLED,
  PHASE4_PAID_STIM_FOUNDATION_TOOLS_REGISTERED,
  type PaidAuthConfig,
  type PaidCostEstimate,
  type PaidPreflightEvaluationInput
} from "../src/paidPolicy.js";
import { PHASE1_PROMPT_DEFINITIONS } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { COST_ESTIMATE_TOOL_NAME } from "../src/tools/index.js";
import {
  PAID_STIM_TOOL_NAMES,
  STIM_HISTORY_ENDPOINT_PATH,
  STIM_HISTORY_TOOL_NAME,
  STIM_LATEST_ENDPOINT_PATH,
  STIM_LATEST_TOOL_NAME
} from "../src/tools/stimTools.js";
import { INDICATORS_HISTORY_TOOL_NAME, INDICATORS_LATEST_TOOL_NAME } from "../src/tools/indicatorsTools.js";
import { SELECTIONS_LATEST_TOOL_NAME } from "../src/tools/selectionsTools.js";
import { connectMcp, jsonResponse } from "./helpers.js";

const MOCK_KEY = "mock-stim-secret-must-not-be-sent";
const PAID_ENABLED_ENV: Env = {
  STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
  STOCKTRENDS_API_KEY: MOCK_KEY
};

const EXPECTED_PUBLIC_RESOURCE_URIS = [
  "stocktrends://api/openapi",
  "stocktrends://ai/context",
  "stocktrends://ai/tools",
  "stocktrends://workflows",
  "stocktrends://methodology/stim",
  "stocktrends://methodology/indicators",
  "stocktrends://methodology/inference",
  "stocktrends://pricing/catalog",
  "stocktrends://proof/market-edge",
  "stocktrends://leadership/definitions"
];

describe("Phase 4 paid ST-IM foundation — tool surface", () => {
  it("exposes exactly one public planning tool and no paid ST-IM tools by default", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn);

    const tools = await client.listTools();
    const resources = await client.listResources();

    expect(tools.tools.map((tool) => tool.name)).toEqual([COST_ESTIMATE_TOOL_NAME]);
    expect(resources.resources.map((resource) => resource.uri)).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it.each([
    { label: "no env", env: {}, expectPaid: false },
    { label: "API key alone", env: { STOCKTRENDS_API_KEY: MOCK_KEY }, expectPaid: false },
    { label: "paid flag false", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "false", STOCKTRENDS_API_KEY: MOCK_KEY }, expectPaid: false },
    { label: "paid flag true, no key", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "true" }, expectPaid: false },
    { label: "paid flag true, mock key", env: PAID_ENABLED_ENV, expectPaid: true }
  ])("registers paid ST-IM tools only when paid mode is enabled with a key ($label)", async ({ env, expectPaid }) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, env);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();

    if (expectPaid) {
      // Paid-exposed surface is exactly ten tools: the planning tool plus the
      // paired paid ST-IM and paired paid indicators families, the base
      // selections tool, and the four market-context tools.
      expect(toolNames).toEqual(
        [
          COST_ESTIMATE_TOOL_NAME,
          STIM_HISTORY_TOOL_NAME,
          STIM_LATEST_TOOL_NAME,
          INDICATORS_HISTORY_TOOL_NAME,
          INDICATORS_LATEST_TOOL_NAME,
          SELECTIONS_LATEST_TOOL_NAME,
          "stocktrends_get_market_regime_latest",
          "stocktrends_get_market_regime_history",
          "stocktrends_get_breadth_sector_latest",
          "stocktrends_get_leadership_summary_latest"
        ].sort()
      );
      expect(toolNames).toHaveLength(10);
    } else {
      expect(toolNames).toEqual([COST_ESTIMATE_TOOL_NAME]);
      expect(toolNames).not.toContain(STIM_LATEST_TOOL_NAME);
      expect(toolNames).not.toContain(STIM_HISTORY_TOOL_NAME);
    }

    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("keeps the latest/history pair coupled and marks the build execution-capable", () => {
    expect(PAID_STIM_TOOL_NAMES).toEqual([STIM_LATEST_TOOL_NAME, STIM_HISTORY_TOOL_NAME]);
    expect(PHASE4_PAID_STIM_FOUNDATION_TOOLS_REGISTERED).toBe(true);
    // The build now contains the live execution path; runtime env gates still
    // control whether any call actually executes.
    expect(PHASE4_PAID_EXECUTION_ENABLED).toBe(true);
  });
});

describe("Phase 4 paid ST-IM foundation — input validation (before preflight/network)", () => {
  it.each([
    { label: "latest symbol_exchange", tool: STIM_LATEST_TOOL_NAME, args: { symbol_exchange: "AAPL_Q" }, expectedIdentity: "symbol_exchange" },
    { label: "latest symbol + exchange", tool: STIM_LATEST_TOOL_NAME, args: { symbol: "AAPL", exchange: "Q" }, expectedIdentity: "symbol_and_exchange" },
    { label: "history symbol_exchange", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q" }, expectedIdentity: "symbol_exchange" },
    { label: "history symbol + exchange", tool: STIM_HISTORY_TOOL_NAME, args: { symbol: "AAPL", exchange: "Q" }, expectedIdentity: "symbol_and_exchange" }
  ])("accepts valid identity through validation then fails closed ($label)", async ({ tool, args, expectedIdentity }) => {
    const { result, fetchFn, client, server } = await callPaidTool(tool, args);
    const body = structured(result);

    // Validation passed (no invalid_tool_input); the tool then fails closed.
    expect(body.error.error_code).toBe("paid_execution_disabled");
    expect(body.mcp_metadata.symbol_identity.identity_source).toBe(expectedIdentity);
    expect(body.mcp_metadata.symbol_identity.symbol_exchange).toBe("AAPL_Q");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("gives symbol_exchange precedence over symbol + exchange", async () => {
    const { result, client, server } = await callPaidTool(STIM_LATEST_TOOL_NAME, {
      symbol_exchange: "MSFT_N",
      symbol: "AAPL",
      exchange: "Q"
    });
    const identity = structured(result).mcp_metadata.symbol_identity;

    expect(identity.identity_source).toBe("symbol_exchange");
    expect(identity.symbol_exchange).toBe("MSFT_N");
    expect(identity.symbol).toBe("MSFT");
    expect(identity.exchange).toBe("N");

    await client.close();
    await server.close();
  });

  it.each([
    { label: "latest invalid exchange", tool: STIM_LATEST_TOOL_NAME, args: { symbol: "AAPL", exchange: "X" }, schemaLevel: true },
    { label: "latest missing identity", tool: STIM_LATEST_TOOL_NAME, args: {}, schemaLevel: false },
    { label: "latest partial identity (symbol only)", tool: STIM_LATEST_TOOL_NAME, args: { symbol: "AAPL" }, schemaLevel: false },
    { label: "latest unknown key", tool: STIM_LATEST_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", surprise: true }, schemaLevel: true },
    { label: "history invalid date format", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", start: "2026/01/01" }, schemaLevel: true },
    { label: "history invalid calendar date", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", start: "2026-13-40" }, schemaLevel: false },
    { label: "history start after end", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", start: "2026-02-01", end: "2026-01-01" }, schemaLevel: false },
    { label: "history limit below min", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", limit: 0 }, schemaLevel: true },
    { label: "history limit above max", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", limit: 2601 }, schemaLevel: true },
    { label: "history unknown key", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", lookback: 10 }, schemaLevel: true }
  ])("rejects $label before any preflight or network", async ({ tool, args, schemaLevel }) => {
    const { result, fetchFn, client, server } = await callPaidTool(tool, args);

    expect(result.isError).toBe(true);
    if (schemaLevel) {
      // Rejected at the strict Zod boundary by the MCP SDK (no structured body).
      expect(text(result)).toContain("Invalid arguments");
    } else {
      // Rejected by handler cross-field validation, deterministic error code.
      const body = structured(result);
      expect(body.error.error_code).toBe("invalid_tool_input");
      expect(body.paid_execution_authorized).toBe(false);
      expect(body.api_request_sent).toBe(false);
    }
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM foundation — no-execution safety", () => {
  it.each([
    { tool: STIM_LATEST_TOOL_NAME, endpoint: STIM_LATEST_ENDPOINT_PATH },
    { tool: STIM_HISTORY_TOOL_NAME, endpoint: STIM_HISTORY_ENDPOINT_PATH }
  ])("fails closed with no request and no auth/payment header ($tool)", async ({ tool, endpoint }) => {
    const { result, fetchFn, client, server } = await callPaidTool(tool, { symbol_exchange: "AAPL_Q" });
    const body = structured(result);

    expect(result.isError).toBe(true);
    expect(body.error.error_code).toBe("paid_execution_disabled");
    expect(body.error.tool_name).toBe(tool);
    expect(body.error.endpoint_path).toBe(endpoint);
    expect(body.error.http_method).toBe("GET");
    expect(body.paid_execution_authorized).toBe(false);
    expect(body.paid_execution_occurred).toBe(false);
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.payment_header_sent).toBe(false);
    expect(body.mcp_metadata.preflight_decision_summary.hard_execution_gate_enabled).toBe(false);
    expect(body.mcp_metadata.preflight_decision_summary.local_authorization_decision).toBe("deny");

    // No network call of any kind (no stim, pricing, cost-estimate, workflows):
    // therefore no X-API-Key, Authorization, or payment header could have been sent.
    expect(fetchFn).not.toHaveBeenCalled();

    // The API key value and auth/payment header names never appear in the response.
    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
    expect(serialized).not.toContain("x-api-key");
    expect(serialized).not.toContain("payment-signature");
    expect(serialized).not.toContain("bearer ");

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM foundation — preflight and caps", () => {
  const paidAuthConfig = (): PaidAuthConfig => {
    const config = parseConfig(PAID_ENABLED_ENV);
    return { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
  };

  it("is execution-capable in the build but not runtime-enabled without the execution flag", () => {
    // Build capability is on; the effective runtime gate stays off because this
    // config (paid tools + key, no execution flag) never sets executionEnabled.
    expect(isPaidExecutionEnabledInBuild(paidAuthConfig())).toBe(true);
    expect(isPaidExecutionRuntimeEnabled(paidAuthConfig())).toBe(false);
  });

  it.each([STIM_LATEST_ENDPOINT_PATH, STIM_HISTORY_ENDPOINT_PATH])(
    "denies with paid_execution_disabled when all structural gates pass (%s)",
    (endpointPath) => {
      const toolName = endpointPath === STIM_LATEST_ENDPOINT_PATH ? STIM_LATEST_TOOL_NAME : STIM_HISTORY_TOOL_NAME;
      const decision = evaluatePaidInvocationPreflight(paidAuthConfig(), {
        toolName,
        endpointPath,
        httpMethod: "GET",
        targetUrl: new URL(`https://api.stocktrends.com${endpointPath}`)
      });

      expect(decision.endpointAllowlisted).toBe(true);
      expect(decision.toolAllowlisted).toBe(true);
      expect(decision.hostApproved).toBe(true);
      expect(decision.paidModeConfigured).toBe(true);
      expect(decision.structurallyAuthorized).toBe(false);
      expect(decision.denialReason).toBe("paid_execution_disabled");
    }
  );

  it("enforces endpoint, tool, and host allowlists in the invocation preflight", () => {
    const config = paidAuthConfig();

    expect(
      evaluatePaidInvocationPreflight(config, {
        toolName: STIM_LATEST_TOOL_NAME,
        endpointPath: "/v1/selections/history",
        httpMethod: "GET",
        targetUrl: new URL("https://api.stocktrends.com/v1/selections/history")
      }).denialReason
    ).toBe("endpoint_not_allowlisted");

    expect(
      evaluatePaidInvocationPreflight(config, {
        toolName: "stocktrends_get_stim_history",
        endpointPath: STIM_LATEST_ENDPOINT_PATH,
        httpMethod: "GET",
        targetUrl: new URL(`https://api.stocktrends.com${STIM_LATEST_ENDPOINT_PATH}`)
      }).denialReason
    ).toBe("tool_endpoint_mismatch");

    expect(
      evaluatePaidInvocationPreflight(config, {
        toolName: STIM_LATEST_TOOL_NAME,
        endpointPath: STIM_LATEST_ENDPOINT_PATH,
        httpMethod: "GET",
        targetUrl: new URL(`https://example.com${STIM_LATEST_ENDPOINT_PATH}`)
      }).denialReason
    ).toBe("host_not_approved");
  });

  it("blocks the history tool at the hard gate even when caps and pricing would pass, and refuses auth headers", () => {
    const config = parseConfig({
      ...PAID_ENABLED_ENV,
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5",
      STOCKTRENDS_MAX_STC_PER_SESSION: "100"
    });
    const authConfig: PaidAuthConfig = { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
    const input: PaidPreflightEvaluationInput = {
      toolName: STIM_HISTORY_TOOL_NAME,
      endpointPath: STIM_HISTORY_ENDPOINT_PATH,
      httpMethod: "GET",
      targetUrl: new URL(`https://api.stocktrends.com${STIM_HISTORY_ENDPOINT_PATH}`),
      costEstimate: historyCost()
    };
    const decision = evaluatePaidPreflight(authConfig, input);

    expect(decision.capState.stcBudgetCap.wouldExceed).toBe(false);
    expect(decision.denialReason).toBe("paid_execution_disabled");
    expect(() => assertPaidPreflightAuthorized(decision)).toThrow(StockTrendsMcpError);
    expect(() => buildPaidAuthHeaders(authConfig, input)).toThrow(StockTrendsMcpError);

    try {
      buildPaidAuthHeaders(authConfig, input);
    } catch (error) {
      expect(error).toMatchObject({ errorCode: "paid_execution_disabled" });
      expect(serializedSafeError(error)).not.toContain(MOCK_KEY);
    }
  });
});

describe("Phase 4 paid ST-IM foundation — public safety regression", () => {
  it("keeps public resources credential-free even when paid mode is enabled with a key", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, PAID_ENABLED_ENV);

    await client.readResource({ uri: "stocktrends://api/openapi" });

    expect(fetchFn.mock.calls[0]?.[1].headers).toEqual({
      Accept: "application/json",
      "User-Agent": "stocktrends-mcp-server/1.0"
    });

    await client.close();
    await server.close();
  });

  it("keeps stocktrends_estimate_workflow_cost credential-free under paid mode", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse()));
    const { client, server } = await connectMcp(fetchFn, PAID_ENABLED_ENV);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: { workflow_id: "stim_forecast_review" }
    });

    expect(result.isError).not.toBe(true);
    const headers = JSON.stringify(fetchFn.mock.calls[0]?.[1].headers).toLowerCase();
    expect(headers).not.toContain("api-key");
    expect(headers).not.toContain("authorization");
    expect(headers).not.toContain(MOCK_KEY.toLowerCase());

    await client.close();
    await server.close();
  });

  it("keeps prompt count at zero with paid tools exposed", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, PAID_ENABLED_ENV);

    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);

    await client.close();
    await server.close();
  });
});

async function callPaidTool(name: string, args: Record<string, unknown>) {
  const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
  const { client, server } = await connectMcp(fetchFn, PAID_ENABLED_ENV);
  const result = await client.callTool({ name, arguments: args });
  return { result, fetchFn, client, server };
}

function historyCost(overrides: Partial<PaidCostEstimate> = {}): PaidCostEstimate {
  return {
    amount: 0.5,
    unit: "STC",
    authoritative: true,
    pricingSource: "pricing_catalog",
    pricingRuleId: "stim_history_paid",
    fetchedAt: "2026-07-08T00:00:00.000Z",
    ...overrides
  };
}

function costEstimateResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    workflow_id: "stim_forecast_review",
    rail: "auto",
    total_stc_cost: 2,
    total_usd_cost: 0.4,
    quota_remaining_supplied: null,
    quota_sufficient: null,
    steps: [],
    notes: ["Mock estimate."],
    ...overrides
  };
}

function serializedSafeError(error: unknown): string {
  if (error instanceof StockTrendsMcpError) {
    return `${error.message} ${JSON.stringify(error.toSafeData())}`;
  }

  return String(error);
}

function structured(result: Awaited<ReturnType<import("@modelcontextprotocol/sdk/client/index.js").Client["callTool"]>>): Record<string, any> {
  if (!("structuredContent" in result) || !result.structuredContent) {
    throw new Error(`Expected structured tool content, got ${JSON.stringify(result)}`);
  }

  return result.structuredContent as Record<string, any>;
}

function text(result: Awaited<ReturnType<import("@modelcontextprotocol/sdk/client/index.js").Client["callTool"]>>): string {
  if (!("content" in result) || !Array.isArray(result.content)) {
    return "";
  }

  return result.content.map((item) => ("text" in item ? item.text : "")).join("\n");
}
