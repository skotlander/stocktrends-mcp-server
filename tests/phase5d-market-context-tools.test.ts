import { describe, expect, it, vi } from "vitest";
import { type Env } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";
import { assertPaidEndpointAllowed, AUTH_CAPABLE_PAID_ENDPOINT_POLICIES } from "../src/paidPolicy.js";
import {
  BREADTH_PRICING_RULE_IDS,
  LEADERSHIP_PRICING_RULE_IDS,
  MARKET_PRICING_RULE_IDS,
  resolveStaticEndpointPricing
} from "../src/paidPricing.js";
import { PHASE1_PROMPT_DEFINITIONS, PROHIBITED_RESOURCE_ENDPOINTS, PUBLIC_RESOURCES } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { COST_ESTIMATE_TOOL_NAME } from "../src/tools/index.js";
import { INDICATORS_HISTORY_TOOL_NAME, INDICATORS_LATEST_TOOL_NAME } from "../src/tools/indicatorsTools.js";
import { SELECTIONS_LATEST_TOOL_NAME } from "../src/tools/selectionsTools.js";
import { STIM_HISTORY_TOOL_NAME, STIM_LATEST_TOOL_NAME } from "../src/tools/stimTools.js";
import {
  BREADTH_SECTOR_DEFAULT_LIMIT,
  BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
  BREADTH_SECTOR_LATEST_TOOL_NAME,
  BREADTH_SECTOR_MAX_LIMIT,
  DEFERRED_MARKET_CONTEXT_ENDPOINT_PATHS,
  LEADERSHIP_DEFAULT_LIMIT_BUCKET,
  LEADERSHIP_DEFAULT_LIMIT_OVERALL,
  LEADERSHIP_MAX_LIMIT_BUCKET,
  LEADERSHIP_MAX_LIMIT_OVERALL,
  LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
  LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
  MARKET_REGIME_HISTORY_DEFAULT_LIMIT,
  MARKET_REGIME_HISTORY_ENDPOINT_PATH,
  MARKET_REGIME_HISTORY_MAX_LIMIT,
  MARKET_REGIME_HISTORY_TOOL_NAME,
  MARKET_REGIME_LATEST_ENDPOINT_PATH,
  MARKET_REGIME_LATEST_TOOL_NAME,
  PAID_MARKET_CONTEXT_TOOL_NAMES
} from "../src/tools/marketContextTools.js";
import { connectMcp, jsonResponse } from "./helpers.js";

const MOCK_KEY = "mock-market-context-secret-must-never-be-sent";
const PUBLIC_HEADERS = { Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" };

const LEADERSHIP_DEFINITIONS_RESOURCE_URI = "stocktrends://leadership/definitions";
const LEADERSHIP_DEFINITIONS_ENDPOINT_PATH = "/v1/leadership/definitions";

const TEN_PAID_TOOLS = [
  COST_ESTIMATE_TOOL_NAME, "stocktrends_lookup_instruments", "stocktrends_resolve_instrument",
  STIM_LATEST_TOOL_NAME,
  STIM_HISTORY_TOOL_NAME,
  INDICATORS_LATEST_TOOL_NAME,
  INDICATORS_HISTORY_TOOL_NAME,
  SELECTIONS_LATEST_TOOL_NAME,
  MARKET_REGIME_LATEST_TOOL_NAME,
  MARKET_REGIME_HISTORY_TOOL_NAME,
  BREADTH_SECTOR_LATEST_TOOL_NAME,
  LEADERSHIP_SUMMARY_LATEST_TOOL_NAME
].sort();

const MARKET_CONTEXT_TOOLS = [
  { tool: MARKET_REGIME_LATEST_TOOL_NAME, endpoint: MARKET_REGIME_LATEST_ENDPOINT_PATH, rule: "market_regime_latest", cost: 0.15 },
  { tool: MARKET_REGIME_HISTORY_TOOL_NAME, endpoint: MARKET_REGIME_HISTORY_ENDPOINT_PATH, rule: "market_regime_history", cost: 0.25 },
  { tool: BREADTH_SECTOR_LATEST_TOOL_NAME, endpoint: BREADTH_SECTOR_LATEST_ENDPOINT_PATH, rule: "breadth_sector_latest_paid", cost: 0.1 },
  {
    tool: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
    endpoint: LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
    rule: "leadership_summary_latest_paid",
    cost: 0.25
  }
] as const;

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
  LEADERSHIP_DEFINITIONS_RESOURCE_URI
];

// Paid tools + key + execution flag + nonzero caps + covering budget cap.
const EXEC_ENV: Env = {
  STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
  STOCKTRENDS_API_KEY: MOCK_KEY,
  STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
  STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "10",
  STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5",
  STOCKTRENDS_MAX_STC_PER_SESSION: "10",
  STOCKTRENDS_MAX_USD_PER_SESSION: "10"
};

// Paid tools + key, but execution NOT enabled (exposure only).
const EXPOSURE_ENV: Env = {
  STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
  STOCKTRENDS_API_KEY: MOCK_KEY
};

describe("Phase 5D market context — tool surface", () => {
  it("default/free mode exposes exactly one tool and no market-context tools", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {});

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    expect(toolNames).toEqual([COST_ESTIMATE_TOOL_NAME, "stocktrends_lookup_instruments", "stocktrends_resolve_instrument"]);
    for (const { tool } of MARKET_CONTEXT_TOOLS) {
      expect(toolNames).not.toContain(tool);
    }
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("paid-exposed mode exposes exactly ten tools (adds the four market-context tools)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();
    expect(toolNames).toEqual(TEN_PAID_TOOLS);
    expect(toolNames).toHaveLength(12);
    expect(PAID_MARKET_CONTEXT_TOOL_NAMES).toEqual([
      MARKET_REGIME_LATEST_TOOL_NAME,
      MARKET_REGIME_HISTORY_TOOL_NAME,
      BREADTH_SECTOR_LATEST_TOOL_NAME,
      LEADERSHIP_SUMMARY_LATEST_TOOL_NAME
    ]);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "no env", env: {}, expectPaid: false },
    { label: "API key alone", env: { STOCKTRENDS_API_KEY: MOCK_KEY }, expectPaid: false },
    { label: "paid flag alone (no key)", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "true" }, expectPaid: false },
    { label: "paid flag + key", env: EXPOSURE_ENV, expectPaid: true }
  ])("exposes the market-context tools only when the paid flag AND API key are both set ($label)", async ({ env, expectPaid }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, env);
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);

    for (const { tool } of MARKET_CONTEXT_TOOLS) {
      expect(toolNames.includes(tool)).toBe(expectPaid);
    }

    await client.close();
    await server.close();
  });

  it("keeps the tool count identical between exposure-only and execution-enabled (flag changes behavior, not count)", async () => {
    const exposureFetch = routedFetch();
    const exposure = await connectMcp(exposureFetch, EXPOSURE_ENV);
    const execFetch = routedFetch();
    const exec = await connectMcp(execFetch, EXEC_ENV);

    const exposureTools = (await exposure.client.listTools()).tools.map((tool) => tool.name).sort();
    const execTools = (await exec.client.listTools()).tools.map((tool) => tool.name).sort();

    expect(exposureTools).toEqual(execTools);
    expect(execTools).toEqual(TEN_PAID_TOOLS);

    await exposure.client.close();
    await exposure.server.close();
    await exec.client.close();
    await exec.server.close();
  });

  it("does not register any deferred market-context tool (forecast, breadth history, rotation history)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);

    expect(toolNames.some((name) => name.includes("forecast"))).toBe(false);
    expect(toolNames.some((name) => name.includes("breadth_sector_history"))).toBe(false);
    expect(toolNames.some((name) => name.includes("rotation"))).toBe(false);

    await client.close();
    await server.close();
  });

  it("registers zero MCP prompts in every mode", async () => {
    for (const env of [{}, EXPOSURE_ENV, EXEC_ENV]) {
      const fetchFn = routedFetch();
      const { client, server } = await connectMcp(fetchFn, env);

      expect(client.getServerCapabilities()?.prompts).toBeUndefined();
      expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);

      await client.close();
      await server.close();
    }
  });

  it("describes every market-context tool as context, not advice/recommendations/picks", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);
    const tools = (await client.listTools()).tools;

    const regimeLatest = tools.find((t) => t.name === MARKET_REGIME_LATEST_TOOL_NAME)?.description ?? "";
    expect(regimeLatest).toContain("market context");
    expect(regimeLatest).toContain("NOT a trading recommendation");

    const regimeHistory = tools.find((t) => t.name === MARKET_REGIME_HISTORY_TOOL_NAME)?.description ?? "";
    expect(regimeHistory).toContain("market context");
    expect(regimeHistory).toContain("NOT a trading signal");

    const breadth = tools.find((t) => t.name === BREADTH_SECTOR_LATEST_TOOL_NAME)?.description ?? "";
    expect(breadth).toContain("participation context");
    expect(breadth).toContain("NOT a confirmation signal");

    const leadership = tools.find((t) => t.name === LEADERSHIP_SUMMARY_LATEST_TOOL_NAME)?.description ?? "";
    expect(leadership).toContain("rotation context");
    expect(leadership).toContain("NOT stock picks");

    await client.close();
    await server.close();
  });
});

describe("Phase 5D market context — static pricing mirrors", () => {
  it("mirrors exactly the four verified rules with verified families, costs, and rule-id groups", () => {
    expect(resolveStaticEndpointPricing("market_regime_latest")).toMatchObject({ amount: 0.15, unit: "STC", pricingRuleId: "market_regime_latest" });
    expect(resolveStaticEndpointPricing("market_regime_history")).toMatchObject({ amount: 0.25, unit: "STC", pricingRuleId: "market_regime_history" });
    expect(resolveStaticEndpointPricing("breadth_sector_latest_paid")).toMatchObject({ amount: 0.1, unit: "STC", pricingRuleId: "breadth_sector_latest_paid" });
    expect(resolveStaticEndpointPricing("leadership_summary_latest_paid")).toMatchObject({ amount: 0.25, unit: "STC", pricingRuleId: "leadership_summary_latest_paid" });

    expect(MARKET_PRICING_RULE_IDS).toEqual(["market_regime_latest", "market_regime_history"]);
    expect(BREADTH_PRICING_RULE_IDS).toEqual(["breadth_sector_latest_paid"]);
    expect(LEADERSHIP_PRICING_RULE_IDS).toEqual(["leadership_summary_latest_paid"]);
  });

  it("does not mirror deferred-route rules or the public leadership definitions rule as paid STC mirrors", () => {
    expect(resolveStaticEndpointPricing("market_regime_forecast")).toBeNull();
    expect(resolveStaticEndpointPricing("breadth_sector_history_paid")).toBeNull();
    expect(resolveStaticEndpointPricing("leadership_rotation_history_paid")).toBeNull();
    expect(resolveStaticEndpointPricing("leadership_definitions_public")).toBeNull();

    const allGroups = [...MARKET_PRICING_RULE_IDS, ...BREADTH_PRICING_RULE_IDS, ...LEADERSHIP_PRICING_RULE_IDS];
    for (const deferred of ["market_regime_forecast", "breadth_sector_history_paid", "leadership_rotation_history_paid", "leadership_definitions_public"]) {
      expect(allGroups).not.toContain(deferred);
    }
  });

  it.each(MARKET_CONTEXT_TOOLS)("surfaces the $rule static cost in the preflight summary on success ($tool)", async ({ tool, cost }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: tool, arguments: {} }));
    expect(body.mcp_metadata.preflight_decision_summary.estimated_cost).toEqual({ amount: cost, unit: "STC" });

    await client.close();
    await server.close();
  });
});

describe("Phase 5D market context — auth-capable allowlist", () => {
  it("promotes exactly the four market-context routes and couples each to its tool", () => {
    for (const { tool, endpoint, rule } of MARKET_CONTEXT_TOOLS) {
      const policy = AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.find((entry) => entry.endpointPath === endpoint);
      expect(policy).toMatchObject({ toolName: tool, pricingRuleId: rule, httpMethod: "GET", access: "paid" });
    }

    expect(AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.find((entry) => entry.endpointPath === MARKET_REGIME_LATEST_ENDPOINT_PATH)?.requiredHistoryPair).toBe(
      MARKET_REGIME_HISTORY_TOOL_NAME
    );
    expect(
      AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.find((entry) => entry.endpointPath === MARKET_REGIME_HISTORY_ENDPOINT_PATH)?.supportsLongitudinalAnalysis
    ).toBe(true);
  });

  it.each([
    { label: "regime forecast", endpoint: "/v1/market/regime/forecast" },
    { label: "breadth history", endpoint: "/v1/breadth/sector/history" },
    { label: "leadership rotation history", endpoint: "/v1/leadership/rotation/history" },
    { label: "leadership definitions (public, never keyed)", endpoint: LEADERSHIP_DEFINITIONS_ENDPOINT_PATH }
  ])("denies the non-promoted $label route endpoint_not_allowlisted via the policy helpers", ({ endpoint }) => {
    expect(AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.some((entry) => entry.endpointPath === endpoint)).toBe(false);

    try {
      assertPaidEndpointAllowed(endpoint);
      throw new Error(`Expected ${endpoint} to be denied.`);
    } catch (error) {
      expect(error).toBeInstanceOf(StockTrendsMcpError);
      expect((error as StockTrendsMcpError).toSafeData()).toMatchObject({ denialReason: "endpoint_not_allowlisted" });
    }
  });
});

describe("Phase 5D market context — execution gating", () => {
  it.each(MARKET_CONTEXT_TOOLS)(
    "fails closed with no request, no auth header, no cap debit, and no reconciliation when execution is unset ($tool)",
    async ({ tool }) => {
      const fetchFn = routedFetch();
      const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);

      const body = structured(await client.callTool({ name: tool, arguments: {} }));

      expect(body.error.error_code).toBe("paid_execution_disabled");
      expect(body.api_request_sent).toBe(false);
      expect(body.auth_header_sent).toBe(false);
      expect(body.payment_header_sent).toBe(false);
      expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(0);
      expect(body.mcp_metadata.pricing_reconciliation.status).toBe("not_evaluated");
      // Nothing at all is fetched — no catalog read, no paid fetch.
      expect(fetchFn).not.toHaveBeenCalled();

      await client.close();
      await server.close();
    }
  );

  it.each(MARKET_CONTEXT_TOOLS)("fails closed (spend_cap_exceeded) before auth/fetch when no caps are configured ($tool)", async ({ tool }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true"
    });

    const body = structured(await client.callTool({ name: tool, arguments: {} }));

    expect(body.error.error_code).toBe("spend_cap_exceeded");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("fails closed (spend_cap_exceeded) when call caps are set but no covering STC budget is configured", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5"
    });

    const body = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("spend_cap_exceeded");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 5D market context — successful execution (mock)", () => {
  it.each(MARKET_CONTEXT_TOOLS)(
    "sends exactly one GET to $endpoint with X-API-Key only after all gates pass ($tool)",
    async ({ tool, endpoint, rule, cost }) => {
      const fetchFn = routedFetch();
      const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

      const result = await client.callTool({ name: tool, arguments: {} });
      const body = structured(result);

      expect(result.isError).not.toBe(true);
      expect(body.paid_execution_authorized).toBe(true);
      expect(body.api_request_sent).toBe(true);
      expect(body.auth_header_sent).toBe(true);
      expect(body.payment_header_sent).toBe(false);

      const calls = pathCalls(fetchFn, endpoint);
      expect(calls).toHaveLength(1);

      const [url, init] = calls[0];
      expect(url.origin).toBe("https://api.stocktrends.com");
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();

      const headers = init.headers as Record<string, string>;
      expect(headers["X-API-Key"]).toBe(MOCK_KEY);
      const headerKeys = Object.keys(headers).map((key) => key.toLowerCase());
      expect(headerKeys).not.toContain("authorization");
      expect(headerKeys).not.toContain("payment-signature");
      expect(headerKeys).not.toContain("x-payment");

      // The key goes ONLY to the promoted paid route: never to the catalog or
      // any other path.
      for (const [callUrl, callInit] of fetchFn.mock.calls) {
        if (callUrl.pathname !== endpoint) {
          expect(hasApiKey(callInit)).toBe(false);
        }
      }

      // Per-tool/session cap accounting debits exactly once for this tool.
      expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);
      expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_tool).toBe(1);
      expect(body.mcp_metadata.local_budget_cap_status.stc_spent_this_session).toBe(cost);
      expect(body.mcp_metadata.pricing_reconciliation.status).toBe("reconciled");
      expect(body.mcp_metadata.pricing_rule).toBe(rule);

      await client.close();
      await server.close();
    }
  );

  it("reconciles each family credential-free (no X-API-Key on the catalog read)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} });
    await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: {} });
    await client.callTool({ name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, arguments: {} });

    // Three families, three credential-free catalog reads (market, breadth,
    // leadership are independently reconciled and independently cached).
    const catalog = pathCalls(fetchFn, "/v1/pricing/catalog");
    expect(catalog).toHaveLength(3);
    for (const [, init] of catalog) {
      expect(init.headers).toEqual(PUBLIC_HEADERS);
    }

    await client.close();
    await server.close();
  });

  it("caches market-family reconciliation across the regime pair (one catalog read for both tools)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} });
    await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: {} });

    expect(pathCalls(fetchFn, "/v1/pricing/catalog")).toHaveLength(1);
    expect(pathCalls(fetchFn, MARKET_REGIME_LATEST_ENDPOINT_PATH)).toHaveLength(1);
    expect(pathCalls(fetchFn, MARKET_REGIME_HISTORY_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it("preserves the API payload verbatim in api_data and never re-ranks/re-buckets/re-aggregates locally", async () => {
    // Rows deliberately NOT sorted; the adapter must not reorder them.
    const breadth = breadthBody([
      { group: "Energy", advancing: 12, declining: 30 },
      { group: "Technology", advancing: 55, declining: 5 },
      { group: "Utilities", advancing: 20, declining: 20 }
    ]);
    const fetchFn = routedFetch({ breadthLatest: () => jsonResponse(breadth) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.api_data).toEqual(breadth);
    expect(body.api_data.data.map((row: { group: string }) => row.group)).toEqual(["Energy", "Technology", "Utilities"]);

    expect(body.mcp_metadata.provenance).toMatchObject({
      context_kind: "market_breadth",
      api_authored_context: true,
      context_not_advice: true,
      locally_computed: false,
      locally_ranked: false,
      locally_scored: false,
      locally_bucketed: false,
      locally_aggregated: false,
      locally_thresholded: false,
      locally_filtered: false
    });
    expect(body.mcp_metadata.not_authoritative_for).toContain("investment advice");
    // Row-count transparency is metadata only.
    expect(body.mcp_metadata.returned_row_count).toBe(3);

    await client.close();
    await server.close();
  });

  it("captures the API-reported weekdate only when the payload provides one and never fabricates it", async () => {
    const withWeekdate = routedFetch({ regimeLatest: () => jsonResponse({ request_id: "req-1", weekdate: "2026-07-10", regime: "bull" }) });
    const first = await connectMcp(withWeekdate, EXEC_ENV);
    const bodyWith = structured(await first.client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));
    expect(bodyWith.mcp_metadata.api_reported_weekdate).toBe("2026-07-10");
    expect(bodyWith.mcp_metadata.request_id).toBe("req-1");
    await first.client.close();
    await first.server.close();

    const withoutWeekdate = routedFetch({ regimeLatest: () => jsonResponse({ regime: "bull" }) });
    const second = await connectMcp(withoutWeekdate, EXEC_ENV);
    const bodyWithout = structured(await second.client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));
    expect(bodyWithout.mcp_metadata.api_reported_weekdate).toBeNull();
    await second.client.close();
    await second.server.close();
  });

  it("does not fabricate observed_cost or payment_status", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));
    expect(body.mcp_metadata.observed_cost).toBeNull();
    expect(body.mcp_metadata.payment_status).toBeNull();
    expect(body.mcp_metadata.response_metadata.observed_cost).toBeNull();
    expect(body.mcp_metadata.response_metadata.payment_status).toBeNull();

    await client.close();
    await server.close();
  });

  it("never leaks the API key into the returned wrapper", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    for (const { tool } of MARKET_CONTEXT_TOOLS) {
      const body = structured(await client.callTool({ name: tool, arguments: {} }));
      const serialized = JSON.stringify(body).toLowerCase();

      expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
      expect(serialized).not.toContain("x-api-key");
    }

    await client.close();
    await server.close();
  });
});

describe("Phase 5D market context — limit safety (broad-sweep controls)", () => {
  it("regime latest rejects unknown keys on its strict empty schema before any pricing/auth/fetch", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    for (const args of [{ weekdate: "2026-07-10" }, { limit: 5 }, { anything: true }]) {
      const result = await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: args });
      expect(result.isError).toBe(true);
      expect(text(result)).toContain("Invalid arguments");
    }

    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("regime history sends the explicit default limit=12 when the caller omits limit", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: {} }));

    const [url] = pathCalls(fetchFn, MARKET_REGIME_HISTORY_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit")).toBe(String(MARKET_REGIME_HISTORY_DEFAULT_LIMIT));
    expect(url.searchParams.get("limit")).toBe("12");
    expect(url.searchParams.has("start_date")).toBe(false);
    expect(body.mcp_metadata.effective_limits).toEqual({ limit: 12 });

    await client.close();
    await server.close();
  });

  it.each([
    { label: "min limit 1", limit: 1 },
    { label: "mid limit 26", limit: 26 },
    { label: "hard max limit 52", limit: MARKET_REGIME_HISTORY_MAX_LIMIT }
  ])("regime history accepts a caller limit within 1..52 and forwards it ($label)", async ({ limit }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: { limit } }));

    const [url] = pathCalls(fetchFn, MARKET_REGIME_HISTORY_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit")).toBe(String(limit));
    expect(body.mcp_metadata.effective_limits.limit).toBe(limit);

    await client.close();
    await server.close();
  });

  it("regime history forwards a valid start_date as passthrough while still sending limit", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: { start_date: "2026-01-02" } });

    const [url] = pathCalls(fetchFn, MARKET_REGIME_HISTORY_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("start_date")).toBe("2026-01-02");
    expect(url.searchParams.get("limit")).toBe("12");

    await client.close();
    await server.close();
  });

  it.each([
    { label: "limit above hard max (53)", args: { limit: 53 } },
    { label: "limit far above max (5000)", args: { limit: 5000 } },
    { label: "limit below min (0)", args: { limit: 0 } },
    { label: "negative sentinel (-1)", args: { limit: -1 } },
    { label: "non-integer limit (1.5)", args: { limit: 1.5 } },
    { label: "array limit", args: { limit: [12] } },
    { label: "string limit", args: { limit: "12" } },
    { label: "malformed start_date", args: { start_date: "07/10/2026" } },
    { label: "unknown key (weekdate)", args: { weekdate: "2026-07-10" } },
    { label: "unknown key (broad-sweep shape)", args: { all: true } }
  ])("regime history rejects $label at the strict schema boundary before any pricing/auth/fetch", async ({ args }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: args });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Invalid arguments");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("breadth latest always sends explicit limit=50 and group_level=sector when the caller omits them", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: {} }));

    const [url] = pathCalls(fetchFn, BREADTH_SECTOR_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit")).toBe(String(BREADTH_SECTOR_DEFAULT_LIMIT));
    expect(url.searchParams.get("limit")).toBe("50");
    expect(url.searchParams.get("group_level")).toBe("sector");
    // Passthrough filters are omitted so API defaults apply; effective values are
    // still recorded in metadata.
    expect(url.searchParams.has("cs_only")).toBe(false);
    expect(url.searchParams.has("include_unknown")).toBe(false);
    expect(url.searchParams.has("min_price")).toBe(false);
    expect(url.searchParams.has("min_volume")).toBe(false);
    expect(url.searchParams.has("exchange")).toBe(false);
    // The deliberately unexposed parameters never appear on the wire.
    expect(url.searchParams.has("weekdate")).toBe(false);
    expect(url.searchParams.has("vol_scale")).toBe(false);
    expect(body.mcp_metadata.effective_limits).toEqual({ limit: 50 });
    expect(body.mcp_metadata.market_context_parameters).toMatchObject({
      group_level: "sector",
      cs_only_effective: null,
      include_unknown_effective: false
    });

    await client.close();
    await server.close();
  });

  it("keeps omitted canonical equities distinct from explicit CS-only and legacy-all breadth requests", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const omitted = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: {} }));
    const csOnly = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: { cs_only: true } }));
    const legacyAll = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: { cs_only: false } }));
    const calls = pathCalls(fetchFn, BREADTH_SECTOR_LATEST_ENDPOINT_PATH);

    expect(calls).toHaveLength(3);
    expect(calls[0][0].searchParams.has("cs_only")).toBe(false);
    expect(calls[1][0].searchParams.get("cs_only")).toBe("true");
    expect(calls[2][0].searchParams.get("cs_only")).toBe("false");
    expect(omitted.mcp_metadata.market_context_parameters.cs_only_effective).toBeNull();
    expect(csOnly.mcp_metadata.market_context_parameters.cs_only_effective).toBe(true);
    expect(legacyAll.mcp_metadata.market_context_parameters.cs_only_effective).toBe(false);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "min limit 1", limit: 1 },
    { label: "mid limit 100", limit: 100 },
    { label: "hard max limit 250", limit: BREADTH_SECTOR_MAX_LIMIT }
  ])("breadth latest accepts a caller limit within 1..250 and forwards it ($label)", async ({ limit }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: { limit } }));

    const [url] = pathCalls(fetchFn, BREADTH_SECTOR_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit")).toBe(String(limit));
    expect(body.mcp_metadata.effective_limits.limit).toBe(limit);

    await client.close();
    await server.close();
  });

  it("breadth latest forwards supplied filters verbatim while always sending limit and group_level", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({
      name: BREADTH_SECTOR_LATEST_TOOL_NAME,
      arguments: { group_level: "industry", exchange: "Q", cs_only: false, include_unknown: true, min_price: 5, min_volume: 10000, limit: 75 }
    });

    const [url] = pathCalls(fetchFn, BREADTH_SECTOR_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("group_level")).toBe("industry");
    expect(url.searchParams.get("exchange")).toBe("Q");
    expect(url.searchParams.get("cs_only")).toBe("false");
    expect(url.searchParams.get("include_unknown")).toBe("true");
    expect(url.searchParams.get("min_price")).toBe("5");
    expect(url.searchParams.get("min_volume")).toBe("10000");
    expect(url.searchParams.get("limit")).toBe("75");

    await client.close();
    await server.close();
  });

  it.each([
    { label: "limit above hard max (251)", args: { limit: 251 } },
    { label: "limit at the API max (50000)", args: { limit: 50000 } },
    { label: "limit below min (0)", args: { limit: 0 } },
    { label: "negative sentinel (-1)", args: { limit: -1 } },
    { label: "non-integer limit (1.5)", args: { limit: 1.5 } },
    { label: "array limit", args: { limit: [50] } },
    { label: "string limit", args: { limit: "50" } },
    { label: "weekdate (snapshot time-travel)", args: { weekdate: "2026-07-10" } },
    { label: "vol_scale (unbounded legacy multiplier)", args: { vol_scale: 1000 } },
    { label: "invalid group_level", args: { group_level: "everything" } },
    { label: "unsafe exchange", args: { exchange: "ZZZ" } },
    { label: "negative min_price", args: { min_price: -1 } },
    { label: "non-integer min_volume", args: { min_volume: 10.5 } },
    { label: "unknown key (broad-sweep shape)", args: { all: true } }
  ])("breadth latest rejects $label at the strict schema boundary before any pricing/auth/fetch", async ({ args }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: args });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Invalid arguments");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("leadership summary always sends explicit limit_overall=50 and limit_bucket=20 when the caller omits them", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, arguments: {} }));

    const [url] = pathCalls(fetchFn, LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit_overall")).toBe(String(LEADERSHIP_DEFAULT_LIMIT_OVERALL));
    expect(url.searchParams.get("limit_overall")).toBe("50");
    expect(url.searchParams.get("limit_bucket")).toBe(String(LEADERSHIP_DEFAULT_LIMIT_BUCKET));
    expect(url.searchParams.get("limit_bucket")).toBe("20");
    // min_rsi/min_mt_cnt are omitted so the API defaults (110/4) apply.
    expect(url.searchParams.has("min_rsi")).toBe(false);
    expect(url.searchParams.has("min_mt_cnt")).toBe(false);
    expect(url.searchParams.has("exchange")).toBe(false);
    expect(url.searchParams.has("weekdate")).toBe(false);
    expect(url.searchParams.has("type")).toBe(false);
    expect(body.mcp_metadata.effective_limits).toEqual({ limit_overall: 50, limit_bucket: 20 });

    await client.close();
    await server.close();
  });

  it("leadership summary accepts the hard maxes (200/50) and forwards supplied thresholds verbatim", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(
      await client.callTool({
        name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
        arguments: {
          exchange: "N",
          min_rsi: 120,
          min_mt_cnt: 6,
          limit_overall: LEADERSHIP_MAX_LIMIT_OVERALL,
          limit_bucket: LEADERSHIP_MAX_LIMIT_BUCKET
        }
      })
    );

    const [url] = pathCalls(fetchFn, LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit_overall")).toBe("200");
    expect(url.searchParams.get("limit_bucket")).toBe("50");
    expect(url.searchParams.get("exchange")).toBe("N");
    expect(url.searchParams.get("min_rsi")).toBe("120");
    expect(url.searchParams.get("min_mt_cnt")).toBe("6");
    expect(body.mcp_metadata.effective_limits).toEqual({ limit_overall: 200, limit_bucket: 50 });

    await client.close();
    await server.close();
  });

  it.each([
    { label: "limit_overall above hard max (201)", args: { limit_overall: 201 } },
    { label: "limit_overall at the API max (1000)", args: { limit_overall: 1000 } },
    { label: "limit_overall sentinel (0)", args: { limit_overall: 0 } },
    { label: "limit_bucket above hard max (51)", args: { limit_bucket: 51 } },
    { label: "limit_bucket sentinel (-1)", args: { limit_bucket: -1 } },
    { label: "non-integer limit_overall", args: { limit_overall: 10.5 } },
    { label: "array limit_bucket", args: { limit_bucket: [20] } },
    { label: "min_rsi above 500", args: { min_rsi: 501 } },
    { label: "min_mt_cnt below 0", args: { min_mt_cnt: -1 } },
    { label: "weekdate (snapshot time-travel)", args: { weekdate: "2026-07-10" } },
    { label: "type (no verified enum)", args: { type: "CS" } },
    { label: "unsafe exchange", args: { exchange: "ZZZ" } },
    { label: "unknown key (broad-sweep shape)", args: { all: true } }
  ])("leadership summary rejects $label at the strict schema boundary before any pricing/auth/fetch", async ({ args }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, arguments: args });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Invalid arguments");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 5D market context — single fetch, no bulk, no retry", () => {
  it.each(MARKET_CONTEXT_TOOLS)("makes exactly one GET per invocation with no pagination or iteration ($tool)", async ({ tool, endpoint }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: tool, arguments: {} });
    expect(pathCalls(fetchFn, endpoint)).toHaveLength(1);
    // No other paid market-context route is ever touched (no exchange iteration,
    // no date sweeping, no bulk assembly, no deferred-route reachability).
    for (const deferred of DEFERRED_MARKET_CONTEXT_ENDPOINT_PATHS) {
      expect(pathCalls(fetchFn, deferred)).toHaveLength(0);
    }

    await client.close();
    await server.close();
  });

  it.each([
    { label: "429 rate limited", status: 429, code: "api_rate_limited" },
    { label: "500 upstream error", status: 500, code: "api_request_failed" }
  ])("does not auto-retry on $label — exactly one attempt, fail closed", async ({ status, code }) => {
    const fetchFn = routedFetch({ breadthLatest: () => jsonResponse({ detail: "boom" }, status) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe(code);
    expect(pathCalls(fetchFn, BREADTH_SECTOR_LATEST_ENDPOINT_PATH)).toHaveLength(1);
    expect(body.paid_execution_authorized).toBe(false);

    await client.close();
    await server.close();
  });

  it("surfaces a 402 as safe metadata with one attempt and no payment header", async () => {
    const fetchFn = routedFetch({ regimeLatest: () => jsonResponse({ detail: "payment required" }, 402) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("api_payment_required");
    expect(body.payment_header_sent).toBe(false);
    expect(pathCalls(fetchFn, MARKET_REGIME_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });
});

describe("Phase 5D market context — repeated-identical-call loop posture", () => {
  it("denies a second identical breadth call before pricing/auth/fetch and does not re-bill", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: { exchange: "Q", limit: 25 } }));
    expect(first.paid_execution_authorized).toBe(true);
    expect(first.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);

    const second = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: { exchange: "Q", limit: 25 } }));
    expect(second.error.error_code).toBe("repeated_identical_market_context_call");
    expect(second.api_request_sent).toBe(false);
    expect(second.auth_header_sent).toBe(false);

    expect(pathCalls(fetchFn, BREADTH_SECTOR_LATEST_ENDPOINT_PATH)).toHaveLength(1);
    expect(second.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);

    await client.close();
    await server.close();
  });

  it("blocks a second executed regime-latest call in the same session (constant signature)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));
    expect(first.paid_execution_authorized).toBe(true);

    const second = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));
    expect(second.error.error_code).toBe("repeated_identical_market_context_call");
    expect(second.api_request_sent).toBe(false);
    expect(pathCalls(fetchFn, MARKET_REGIME_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it("treats calls with different normalized parameters as distinct and permits them", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: { limit: 12 } }));
    expect(first.paid_execution_authorized).toBe(true);

    const second = structured(await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: { limit: 26 } }));
    expect(second.paid_execution_authorized).toBe(true);

    expect(pathCalls(fetchFn, MARKET_REGIME_HISTORY_ENDPOINT_PATH)).toHaveLength(2);
    expect(second.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(2);

    await client.close();
    await server.close();
  });

  it("does not cross-block distinct tools: a regime-latest call never blocks a breadth call", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));
    expect(first.paid_execution_authorized).toBe(true);

    const second = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: {} }));
    expect(second.paid_execution_authorized).toBe(true);

    await client.close();
    await server.close();
  });

  it("two concurrent identical calls cannot both fetch — the second fails closed before auth/fetch/cap debit", async () => {
    // Gate the (async) catalog reconciliation so the first call is suspended
    // AFTER reserving its signature but BEFORE it can reach auth/fetch. The
    // second concurrent identical call must then see the in-flight reservation.
    let reachedCatalog!: () => void;
    const reached = new Promise<void>((resolve) => {
      reachedCatalog = resolve;
    });
    let releaseCatalog!: () => void;
    const gate = new Promise<void>((resolve) => {
      releaseCatalog = resolve;
    });

    const fetchFn = routedFetch({
      catalog: async () => {
        reachedCatalog();
        await gate;
        return jsonResponse(validCatalogBody());
      }
    });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const firstPromise = client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} });

    await reached;
    const second = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));

    expect(second.error.error_code).toBe("repeated_identical_market_context_call");
    expect(second.api_request_sent).toBe(false);
    expect(second.auth_header_sent).toBe(false);
    expect(pathCalls(fetchFn, MARKET_REGIME_LATEST_ENDPOINT_PATH)).toHaveLength(0);

    releaseCatalog();
    const first = structured(await firstPromise);
    expect(first.paid_execution_authorized).toBe(true);

    // At most one paid fetch, exactly one X-API-Key send, one cap debit.
    const regimeCalls = pathCalls(fetchFn, MARKET_REGIME_LATEST_ENDPOINT_PATH);
    expect(regimeCalls).toHaveLength(1);
    expect(regimeCalls.filter(([, init]) => hasApiKey(init))).toHaveLength(1);
    expect(fetchFn.mock.calls.filter(([, init]) => hasApiKey(init))).toHaveLength(1);
    expect(first.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);

    await client.close();
    await server.close();
  });

  it("releases the in-flight reservation on a pre-billable failure so a later retry is not permanently blocked", async () => {
    let catalogCall = 0;
    const fetchFn = routedFetch({
      catalog: () => {
        catalogCall += 1;
        return catalogCall === 1 ? jsonResponse({ detail: "down" }, 503) : jsonResponse(validCatalogBody());
      }
    });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, arguments: {} }));
    expect(first.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(first.api_request_sent).toBe(false);

    const second = structured(await client.callTool({ name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, arguments: {} }));
    expect(second.error).toBeUndefined();
    expect(second.paid_execution_authorized).toBe(true);
    expect(pathCalls(fetchFn, LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it("keeps a signature executed after a deterministic API error so an identical retry is not re-billed", async () => {
    const fetchFn = routedFetch({ regimeHistory: () => jsonResponse({ detail: "boom" }, 500) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: { limit: 12 } }));
    expect(first.error.error_code).toBe("api_request_failed");
    expect(first.api_request_sent).toBe(true);

    const second = structured(await client.callTool({ name: MARKET_REGIME_HISTORY_TOOL_NAME, arguments: { limit: 12 } }));
    expect(second.error.error_code).toBe("repeated_identical_market_context_call");
    expect(second.api_request_sent).toBe(false);
    expect(pathCalls(fetchFn, MARKET_REGIME_HISTORY_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it("keeps the repeated-call denial secret-free", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} });
    const denial = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));

    const serialized = JSON.stringify(denial).toLowerCase();
    expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
    expect(serialized).not.toContain("x-api-key");

    await client.close();
    await server.close();
  });
});

describe("Phase 5D market context — catalog reconciliation gate", () => {
  it.each([
    { label: "catalog unavailable", catalog: () => jsonResponse({ detail: "down" }, 503) },
    { label: "catalog malformed (no rules array)", catalog: () => jsonResponse({ rules: "not-an-array" }) },
    {
      label: "market cost differs from static mirror",
      catalog: () => jsonResponse({ rules: [mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.99, "market"), mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")] })
    },
    {
      label: "market latest rule missing (family group requires both market rules)",
      catalog: () => jsonResponse({ rules: [mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")] })
    },
    {
      label: "market history rule missing (family group requires both market rules)",
      catalog: () => jsonResponse({ rules: [mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market")] })
    },
    {
      label: "duplicate/ambiguous market rule",
      catalog: () =>
        jsonResponse({
          rules: [
            mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market"),
            mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market"),
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    },
    {
      label: "market rule endpoint mismatch",
      catalog: () => jsonResponse({ rules: [mkRule("market_regime_latest", "/v1/market/regime/forecast", 0.15, "market"), mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")] })
    },
    {
      label: "market rule has a suffixed id claiming the endpoint (rule-id mismatch)",
      catalog: () =>
        jsonResponse({
          rules: [
            mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market"),
            mkRule("market_regime_latest_paid", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market"),
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    },
    {
      label: "market rule has the wrong endpoint_family (market_regime)",
      catalog: () => jsonResponse({ rules: [mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market_regime"), mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")] })
    },
    {
      label: "market rule is missing endpoint_family",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "market_regime_latest", endpoint_pattern: MARKET_REGIME_LATEST_ENDPOINT_PATH, stc_cost: 0.15, cost_unit: "STC" },
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    },
    {
      label: "market unit is USD with matching cost",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "market_regime_latest", endpoint_pattern: MARKET_REGIME_LATEST_ENDPOINT_PATH, endpoint_family: "market", stc_cost: 0.15, cost_unit: "USD" },
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    },
    {
      label: "market unit field is absent",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "market_regime_latest", endpoint_pattern: MARKET_REGIME_LATEST_ENDPOINT_PATH, endpoint_family: "market", stc_cost: 0.15 },
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    },
    {
      label: "market unit fields conflict (cost_unit vs unit)",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "market_regime_latest", endpoint_pattern: MARKET_REGIME_LATEST_ENDPOINT_PATH, endpoint_family: "market", stc_cost: 0.15, cost_unit: "STC", unit: "USD" },
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    },
    {
      label: "market rule access_type is not paid",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "market_regime_latest", endpoint_pattern: MARKET_REGIME_LATEST_ENDPOINT_PATH, endpoint_family: "market", access_type: "public", stc_cost: 0.15, cost_unit: "STC" },
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    },
    {
      label: "market rule requires_payment is false",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "market_regime_latest", endpoint_pattern: MARKET_REGIME_LATEST_ENDPOINT_PATH, endpoint_family: "market", requires_payment: false, stc_cost: 0.15, cost_unit: "STC" },
            mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")
          ]
        })
    }
  ])("denies the market family before auth/fetch when $label", async ({ catalog }) => {
    const fetchFn = routedFetch({ catalog });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("failed");
    expect(pathCalls(fetchFn, MARKET_REGIME_LATEST_ENDPOINT_PATH)).toHaveLength(0);
    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
    }

    await client.close();
    await server.close();
  });

  it.each([
    {
      label: "breadth rule has the wrong endpoint_family",
      tool: BREADTH_SECTOR_LATEST_TOOL_NAME,
      endpoint: BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
      catalog: () => jsonResponse({ rules: [mkRule("breadth_sector_latest_paid", BREADTH_SECTOR_LATEST_ENDPOINT_PATH, 0.1, "market")] })
    },
    {
      label: "breadth cost mismatch",
      tool: BREADTH_SECTOR_LATEST_TOOL_NAME,
      endpoint: BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
      catalog: () => jsonResponse({ rules: [mkRule("breadth_sector_latest_paid", BREADTH_SECTOR_LATEST_ENDPOINT_PATH, 0.3, "breadth")] })
    },
    {
      label: "leadership rule has the wrong endpoint_family",
      tool: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
      endpoint: LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
      catalog: () => jsonResponse({ rules: [mkRule("leadership_summary_latest_paid", LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH, 0.25, "planning")] })
    },
    {
      label: "leadership rule requires_payment is false",
      tool: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
      endpoint: LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
      catalog: () =>
        jsonResponse({
          rules: [
            {
              pricing_rule_id: "leadership_summary_latest_paid",
              endpoint_pattern: LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH,
              endpoint_family: "leadership",
              requires_payment: false,
              stc_cost: 0.25,
              cost_unit: "STC"
            }
          ]
        })
    }
  ])("denies before auth/fetch when $label", async ({ tool, endpoint, catalog }) => {
    const fetchFn = routedFetch({ catalog });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: tool, arguments: {} }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(pathCalls(fetchFn, endpoint)).toHaveLength(0);
    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
    }

    await client.close();
    await server.close();
  });

  it.each([
    {
      label: "only ST-IM / indicators / selections rules present",
      rules: [
        mkRule("stim_latest_paid", "/v1/stim/latest", 0.0025, "stim"),
        mkRule("stim_history_paid", "/v1/stim/history", 0.0075, "stim"),
        mkRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035, "indicators"),
        mkRule("indicators_history_paid", "/v1/indicators/history", 0.01, "indicators"),
        mkRule("selections_latest_paid", "/v1/selections/latest", 0.05, "selections")
      ]
    },
    {
      label: "only breadth and leadership rules present (other market-context families)",
      rules: [
        mkRule("breadth_sector_latest_paid", BREADTH_SECTOR_LATEST_ENDPOINT_PATH, 0.1, "breadth"),
        mkRule("leadership_summary_latest_paid", LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH, 0.25, "leadership")
      ]
    },
    {
      label: "only deferred-route rules present",
      rules: [
        mkRule("market_regime_forecast", "/v1/market/regime/forecast", 0.35, "market"),
        mkRule("breadth_sector_history_paid", "/v1/breadth/sector/history", 0.3, "breadth"),
        mkRule("leadership_rotation_history_paid", "/v1/leadership/rotation/history", 0.3, "leadership")
      ]
    }
  ])("fails closed for the market family when the catalog has $label but not the market rules", async ({ rules }) => {
    const fetchFn = routedFetch({ catalog: () => jsonResponse({ rules }) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: MARKET_REGIME_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(pathCalls(fetchFn, MARKET_REGIME_LATEST_ENDPOINT_PATH)).toHaveLength(0);

    await client.close();
    await server.close();
  });

  it("never accepts the public leadership_definitions_public rule as the paid leadership mirror", async () => {
    const fetchFn = routedFetch({
      catalog: () =>
        jsonResponse({
          rules: [
            {
              pricing_rule_id: "leadership_definitions_public",
              endpoint_pattern: LEADERSHIP_DEFINITIONS_ENDPOINT_PATH,
              endpoint_family: "planning",
              access_type: "public",
              requires_payment: false,
              stc_cost: 0,
              cost_unit: "request"
            }
          ]
        })
    });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(pathCalls(fetchFn, LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH)).toHaveLength(0);

    await client.close();
    await server.close();
  });

  it.each([
    {
      label: "market rules only satisfy the market family",
      tool: MARKET_REGIME_LATEST_TOOL_NAME,
      rules: [mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market"), mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market")]
    },
    {
      label: "breadth rule only satisfies the breadth family",
      tool: BREADTH_SECTOR_LATEST_TOOL_NAME,
      rules: [mkRule("breadth_sector_latest_paid", BREADTH_SECTOR_LATEST_ENDPOINT_PATH, 0.1, "breadth")]
    },
    {
      label: "leadership rule only satisfies the leadership family",
      tool: LEADERSHIP_SUMMARY_LATEST_TOOL_NAME,
      rules: [mkRule("leadership_summary_latest_paid", LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH, 0.25, "leadership")]
    }
  ])("succeeds family-scoped when the catalog carries only that family's rules ($label)", async ({ tool, rules }) => {
    const fetchFn = routedFetch({ catalog: () => jsonResponse({ rules }) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: tool, arguments: {} }));

    expect(body.paid_execution_authorized).toBe(true);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("reconciled");

    await client.close();
    await server.close();
  });

  it("succeeds when each rule carries the full verified paid classification fields", async () => {
    const fetchFn = routedFetch({
      catalog: () =>
        jsonResponse({
          rules: [
            {
              pricing_rule_id: "breadth_sector_latest_paid",
              endpoint_pattern: BREADTH_SECTOR_LATEST_ENDPOINT_PATH,
              endpoint_family: "breadth",
              access_type: "paid",
              requires_payment: true,
              stc_cost: 0.1,
              cost_unit: "STC"
            }
          ]
        })
    });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: BREADTH_SECTOR_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.paid_execution_authorized).toBe(true);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("reconciled");

    await client.close();
    await server.close();
  });
});

describe("Phase 5D leadership definitions — credential-free public resource", () => {
  it("lists exactly ten public resources including leadership definitions in every mode", async () => {
    for (const env of [{}, EXPOSURE_ENV, EXEC_ENV]) {
      const fetchFn = routedFetch();
      const { client, server } = await connectMcp(fetchFn, env);

      const uris = (await client.listResources()).resources.map((resource) => resource.uri);
      expect(uris).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
      expect(uris).toHaveLength(10);
      expect(uris).toContain(LEADERSHIP_DEFINITIONS_RESOURCE_URI);
      // Listing never fetches (fetch-on-request only).
      expect(fetchFn).not.toHaveBeenCalled();

      await client.close();
      await server.close();
    }
  });

  it("fetches the definitions on request via the credential-free public path, preserving api data", async () => {
    const definitions = definitionsBody();
    const fetchFn = routedFetch({ definitions: () => jsonResponse(definitions, 200, { "x-request-id": "req-defs-1" }) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.readResource({ uri: LEADERSHIP_DEFINITIONS_RESOURCE_URI });
    const content = result.contents[0];

    if (!content || !("text" in content)) {
      throw new Error("Expected text resource content.");
    }

    const body = JSON.parse(content.text) as Record<string, any>;

    // Exactly one fetch, to the definitions endpoint, with the public headers
    // only — no X-API-Key, no Authorization, no payment header, no catalog
    // reconciliation, no paid client path.
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url.pathname).toBe(LEADERSHIP_DEFINITIONS_ENDPOINT_PATH);
    expect(init.headers).toEqual(PUBLIC_HEADERS);
    expect(pathCalls(fetchFn, "/v1/pricing/catalog")).toHaveLength(0);

    expect(body).toMatchObject({
      resourceUri: LEADERSHIP_DEFINITIONS_RESOURCE_URI,
      source: {
        apiBaseUrl: "https://api.stocktrends.com",
        endpointPath: LEADERSHIP_DEFINITIONS_ENDPOINT_PATH,
        status: 200,
        upstreamRequestId: "req-defs-1"
      },
      data: definitions
    });

    await client.close();
    await server.close();
  });

  it("keeps the definitions read credential-free even with full paid execution configured", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.readResource({ uri: LEADERSHIP_DEFINITIONS_RESOURCE_URI });

    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
      const headerKeys = Object.keys((init.headers as Record<string, string>) ?? {}).map((key) => key.toLowerCase());
      expect(headerKeys).not.toContain("authorization");
    }

    await client.close();
    await server.close();
  });

  it("keeps definitions off the prohibited list while the two paid leadership routes are on it", () => {
    expect(PROHIBITED_RESOURCE_ENDPOINTS).toContain("/v1/leadership/summary/latest");
    expect(PROHIBITED_RESOURCE_ENDPOINTS).toContain("/v1/leadership/rotation/history");
    expect(PROHIBITED_RESOURCE_ENDPOINTS).not.toContain(LEADERSHIP_DEFINITIONS_ENDPOINT_PATH);

    // Every prohibited endpoint stays unregistered as a resource.
    const registeredEndpoints = PUBLIC_RESOURCES.map((resource) => resource.endpointPath);
    for (const endpoint of PROHIBITED_RESOURCE_ENDPOINTS) {
      expect(registeredEndpoints).not.toContain(endpoint);
    }
    expect(registeredEndpoints).toContain(LEADERSHIP_DEFINITIONS_ENDPOINT_PATH);
  });

  it("registers no paid mirror and no paid tool for the definitions route", async () => {
    expect(resolveStaticEndpointPricing("leadership_definitions_public")).toBeNull();
    expect(AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.some((entry) => entry.endpointPath === LEADERSHIP_DEFINITIONS_ENDPOINT_PATH)).toBe(false);

    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    expect(toolNames.some((name) => name.includes("definitions"))).toBe(false);

    await client.close();
    await server.close();
  });
});

// --- Fetch routing: catalog + the four paid market-context routes + definitions ---

interface FetchRoutes {
  catalog?: (url: URL) => Response | Promise<Response>;
  regimeLatest?: (url: URL) => Response | Promise<Response>;
  regimeHistory?: (url: URL) => Response | Promise<Response>;
  breadthLatest?: (url: URL) => Response | Promise<Response>;
  leadershipSummary?: (url: URL) => Response | Promise<Response>;
  definitions?: (url: URL) => Response | Promise<Response>;
  other?: (url: URL) => Response | Promise<Response>;
}

function routedFetch(routes: FetchRoutes = {}): ReturnType<typeof vi.fn<FetchLike>> {
  return vi.fn<FetchLike>(async (url) => {
    switch (url.pathname) {
      case "/v1/pricing/catalog":
        return (routes.catalog ?? (() => jsonResponse(validCatalogBody())))(url);
      case MARKET_REGIME_LATEST_ENDPOINT_PATH:
        return (routes.regimeLatest ?? (() => jsonResponse(regimeLatestBody(), 200, marketContextHeaders("market_regime_latest"))))(url);
      case MARKET_REGIME_HISTORY_ENDPOINT_PATH:
        return (routes.regimeHistory ?? (() => jsonResponse(regimeHistoryBody(), 200, marketContextHeaders("market_regime_history"))))(url);
      case BREADTH_SECTOR_LATEST_ENDPOINT_PATH:
        return (routes.breadthLatest ?? (() => jsonResponse(breadthBody(), 200, marketContextHeaders("breadth_sector_latest_paid"))))(url);
      case LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH:
        return (routes.leadershipSummary ?? (() => jsonResponse(leadershipBody(), 200, marketContextHeaders("leadership_summary_latest_paid"))))(url);
      case LEADERSHIP_DEFINITIONS_ENDPOINT_PATH:
        return (routes.definitions ?? (() => jsonResponse(definitionsBody())))(url);
      default:
        return (routes.other ?? (() => jsonResponse({ ok: true })))(url);
    }
  });
}

function pathCalls(fetchFn: ReturnType<typeof vi.fn<FetchLike>>, pathname: string): Array<[URL, RequestInit]> {
  return fetchFn.mock.calls.filter(([url]) => url.pathname === pathname) as Array<[URL, RequestInit]>;
}

function hasApiKey(init: RequestInit): boolean {
  return Object.keys((init.headers as Record<string, string>) ?? {}).some((key) => key.toLowerCase() === "x-api-key");
}

function marketContextHeaders(pricingRule: string): Record<string, string> {
  return {
    "x-stocktrends-pricing-rule": pricingRule,
    "x-stocktrends-payment-required": "false",
    "x-stocktrends-accepted-payment-methods": "subscription",
    "x-stocktrends-quota-limit": "1000",
    "x-stocktrends-quota-period": "monthly"
  };
}

function mkRule(pricingRuleId: string, endpointPattern: string, stcCost: number, endpointFamily: string): Record<string, unknown> {
  return { pricing_rule_id: pricingRuleId, endpoint_pattern: endpointPattern, endpoint_family: endpointFamily, stc_cost: stcCost, cost_unit: "STC" };
}

// A realistic catalog carrying every mirrored family, the deferred market-context
// rules, and the public definitions rule — reconciliation must key on exactly the
// right rows and ignore the rest.
function validCatalogBody(): Record<string, unknown> {
  return {
    rules: [
      mkRule("stim_latest_paid", "/v1/stim/latest", 0.0025, "stim"),
      mkRule("stim_history_paid", "/v1/stim/history", 0.0075, "stim"),
      mkRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035, "indicators"),
      mkRule("indicators_history_paid", "/v1/indicators/history", 0.01, "indicators"),
      mkRule("selections_latest_paid", "/v1/selections/latest", 0.05, "selections"),
      mkRule("market_regime_latest", MARKET_REGIME_LATEST_ENDPOINT_PATH, 0.15, "market"),
      mkRule("market_regime_history", MARKET_REGIME_HISTORY_ENDPOINT_PATH, 0.25, "market"),
      mkRule("market_regime_forecast", "/v1/market/regime/forecast", 0.35, "market"),
      mkRule("breadth_sector_latest_paid", BREADTH_SECTOR_LATEST_ENDPOINT_PATH, 0.1, "breadth"),
      mkRule("breadth_sector_history_paid", "/v1/breadth/sector/history", 0.3, "breadth"),
      mkRule("leadership_summary_latest_paid", LEADERSHIP_SUMMARY_LATEST_ENDPOINT_PATH, 0.25, "leadership"),
      mkRule("leadership_rotation_history_paid", "/v1/leadership/rotation/history", 0.3, "leadership"),
      {
        pricing_rule_id: "leadership_definitions_public",
        endpoint_pattern: LEADERSHIP_DEFINITIONS_ENDPOINT_PATH,
        endpoint_family: "planning",
        access_type: "public",
        requires_payment: false,
        stc_cost: 0,
        cost_unit: "request"
      }
    ]
  };
}

function regimeLatestBody(): Record<string, unknown> {
  return {
    request_id: "req-regime-latest-1",
    weekdate: "2026-07-10",
    regime: "bull_confirmed",
    confidence: 0.8
  };
}

function regimeHistoryBody(): Record<string, unknown> {
  return {
    request_id: "req-regime-history-1",
    data: [
      { weekdate: "2026-07-10", regime: "bull_confirmed" },
      { weekdate: "2026-07-03", regime: "bull_watch" }
    ]
  };
}

function breadthBody(rows?: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    request_id: "req-breadth-latest-1",
    weekdate: "2026-07-10",
    count: rows?.length ?? 2,
    data: rows ?? [
      { group: "Technology", advancing: 55, declining: 5 },
      { group: "Energy", advancing: 12, declining: 30 }
    ]
  };
}

function leadershipBody(): Record<string, unknown> {
  return {
    request_id: "req-leadership-latest-1",
    weekdate: "2026-07-10",
    data: [
      { symbol_exchange: "AAA-N", rsi: 150, mt_cnt: 6 },
      { symbol_exchange: "BBB-Q", rsi: 140, mt_cnt: 5 }
    ]
  };
}

function definitionsBody(): Record<string, unknown> {
  return {
    concept: "leadership",
    indicators: { rsi: "…", trend: "…", trend_cnt: "…", mt_cnt: "…", rsi_updn: "…" },
    taxonomy_source: "stocktrends",
    taxonomy_levels: ["sector", "industry_group", "industry"],
    notes: { a: 1, b: 2, c: 3 }
  };
}

function structured(result: Awaited<ReturnType<import("@modelcontextprotocol/client").Client["callTool"]>>): Record<string, any> {
  if (!("structuredContent" in result) || !result.structuredContent) {
    throw new Error(`Expected structured tool content, got ${JSON.stringify(result)}`);
  }

  return result.structuredContent as Record<string, any>;
}

function text(result: Awaited<ReturnType<import("@modelcontextprotocol/client").Client["callTool"]>>): string {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  return content.map((entry) => entry.text ?? "").join("\n");
}
