import { describe, expect, it, vi } from "vitest";
import { parseConfig, type Env } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";
import {
  AUTH_CAPABLE_PAID_ENDPOINT_POLICIES,
  assertPaidEndpointAllowed,
  buildPaidAuthHeaders,
  evaluatePaidInvocationPreflight,
  evaluatePaidPreflight,
  getPaidEndpointPolicy,
  PAID_ENDPOINT_POLICIES,
  type PaidAuthConfig,
  type PaidCostEstimate,
  type PaidPreflightEvaluationInput
} from "../src/paidPolicy.js";
import { PHASE1_PROMPT_DEFINITIONS } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { COST_ESTIMATE_TOOL_NAME } from "../src/tools/index.js";
import { STIM_HISTORY_TOOL_NAME, STIM_LATEST_TOOL_NAME } from "../src/tools/stimTools.js";
import { INDICATORS_HISTORY_TOOL_NAME, INDICATORS_LATEST_TOOL_NAME } from "../src/tools/indicatorsTools.js";
import { SELECTIONS_LATEST_TOOL_NAME } from "../src/tools/selectionsTools.js";
import { connectMcp, jsonResponse, textResponse } from "./helpers.js";

const MOCK_KEY = "mock-live-secret-must-never-be-sent-in-plaintext";
const PUBLIC_HEADERS = { Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" };

// Execution fully enabled: paid tools + key + execution flag + nonzero caps.
const EXEC_ENV: Env = {
  STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
  STOCKTRENDS_API_KEY: MOCK_KEY,
  STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
  STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
  STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5",
  STOCKTRENDS_MAX_STC_PER_SESSION: "10",
  STOCKTRENDS_MAX_USD_PER_SESSION: "10"
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
  "stocktrends://proof/market-edge"
];

const STIM_HEADERS = {
  "x-stocktrends-pricing-rule": "stim_latest_paid",
  "x-stocktrends-payment-required": "false",
  "x-stocktrends-accepted-payment-methods": "subscription",
  "x-stocktrends-quota-limit": "1000",
  "x-stocktrends-quota-period": "monthly"
};

describe("Phase 4 paid ST-IM live execution — tool surface & execution matrix", () => {
  it("exposes exactly 6 tools, 9 resources, 0 prompts with the execution flag set", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();
    const resources = await client.listResources();

    expect(toolNames).toEqual(
      [
        COST_ESTIMATE_TOOL_NAME,
        STIM_HISTORY_TOOL_NAME,
        STIM_LATEST_TOOL_NAME,
        INDICATORS_HISTORY_TOOL_NAME,
        INDICATORS_LATEST_TOOL_NAME,
        SELECTIONS_LATEST_TOOL_NAME
      ].sort()
    );
    expect(resources.resources.map((resource) => resource.uri)).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("exposes only the planning tool when the execution flag is set without the paid-tools flag", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY
    });

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    expect(toolNames).toEqual([COST_ESTIMATE_TOOL_NAME]);

    await client.close();
    await server.close();
  });

  it("denies execution (no fetch of any kind) when tools are exposed but the execution flag is unset", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5",
      STOCKTRENDS_MAX_STC_PER_SESSION: "10"
    });

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.error.error_code).toBe("paid_execution_disabled");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.payment_header_sent).toBe(false);
    // Denied before pricing/reconciliation: no catalog read and no stim fetch.
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("denies execution (no fetch of any kind) when the execution flag is set but no caps are configured", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true"
    });

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.error.error_code).toBe("spend_cap_exceeded");
    // Cap denial happens before reconciliation: no catalog read, no stim fetch.
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("denies execution when call caps are set but no budget cap covers the nonzero cost", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5"
    });

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.error.error_code).toBe("spend_cap_exceeded");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("fails closed when the pricing-preflight posture is disabled below required", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      ...EXEC_ENV,
      STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT: "false"
    });

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.error.error_code).toBe("pricing_preflight_unavailable");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM live execution — catalog reconciliation gate (blocker)", () => {
  it.each([
    {
      label: "catalog unavailable",
      routes: { catalog: () => jsonResponse({ detail: "down" }, 503) }
    },
    {
      label: "catalog malformed (no rules array)",
      routes: { catalog: () => jsonResponse({ unexpected: true }) }
    },
    {
      label: "stim_latest_paid missing",
      routes: { catalog: () => jsonResponse({ rules: [catalogRule("stim_history_paid", "/v1/stim/history", 0.0075)] }) }
    },
    {
      label: "stim_history_paid missing",
      routes: { catalog: () => jsonResponse({ rules: [catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025)] }) }
    },
    {
      label: "catalog cost differs from static mirror",
      routes: {
        catalog: () =>
          jsonResponse({
            rules: [catalogRule("stim_latest_paid", "/v1/stim/latest", 0.99), catalogRule("stim_history_paid", "/v1/stim/history", 0.0075)]
          })
      }
    },
    {
      label: "catalog endpoint/path differs",
      routes: {
        catalog: () =>
          jsonResponse({
            rules: [catalogRule("stim_latest_paid", "/v1/stim/latest-wrong", 0.0025), catalogRule("stim_history_paid", "/v1/stim/history", 0.0075)]
          })
      }
    },
    {
      label: "catalog pricing rule id conflicts on the endpoint",
      routes: {
        catalog: () =>
          jsonResponse({
            rules: [
              catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025),
              catalogRule("stim_history_paid", "/v1/stim/history", 0.0075),
              catalogRule("stim_latest_legacy", "/v1/stim/latest", 0.0025)
            ]
          })
      }
    }
  ])("denies before auth/fetch when $label", async ({ routes }) => {
    const fetchFn = routedFetch(routes);
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.payment_header_sent).toBe(false);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("failed");
    // The catalog read may have occurred (credential-free), but no ST-IM paid
    // fetch and no auth header ever happened.
    expect(stimCalls(fetchFn)).toHaveLength(0);
    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
    }

    await client.close();
    await server.close();
  });

  it("proceeds to a mock ST-IM fetch only when catalog reconciliation passes", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.paid_execution_authorized).toBe(true);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("reconciled");
    expect(body.mcp_metadata.pricing_reconciliation.source).toBe("pricing_catalog");
    expect(catalogCalls(fetchFn)).toHaveLength(1);
    expect(stimCalls(fetchFn)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it("reconciles credential-free: no X-API-Key is sent to /v1/pricing/catalog", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } });

    const catalog = catalogCalls(fetchFn);
    expect(catalog).toHaveLength(1);
    expect(catalog[0][1].headers).toEqual(PUBLIC_HEADERS);
    expect(hasApiKey(catalog[0][1])).toBe(false);

    await client.close();
    await server.close();
  });

  it("does not fabricate observed_cost from catalog data on success", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.mcp_metadata.response_metadata.observed_cost).toBeNull();
    expect(body.mcp_metadata.observed_cost).toBeNull();
    // The static/catalog cost may appear only as an estimated/static cost.
    expect(body.mcp_metadata.preflight_decision_summary.estimated_cost).toEqual({ amount: 0.0025, unit: "STC" });

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM live execution — successful latest", () => {
  it("performs exactly one authorized fetch and wraps the API response", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } });
    const body = structured(result);

    expect(result.isError).not.toBe(true);
    expect(body.paid_execution_authorized).toBe(true);
    expect(body.paid_execution_occurred).toBe(true);
    expect(body.api_request_sent).toBe(true);
    expect(body.auth_header_sent).toBe(true);
    expect(body.payment_header_sent).toBe(false);
    // Exactly one credential-bearing ST-IM fetch (the catalog read is separate).
    expect(stimCalls(fetchFn)).toHaveLength(1);

    expect(body.api_data.symbol_exchange).toBe("AAPL-Q");
    expect(body.api_data.request_id).toBe("req-latest-1");

    const meta = body.mcp_metadata.response_metadata;
    expect(meta.request_id).toBe("req-latest-1");
    expect(meta.pricing_rule).toBe("stim_latest_paid");
    expect(meta.payment_required).toBe("false");
    expect(meta.accepted_payment_methods).toBe("subscription");
    expect(meta.quota_limit).toBe("1000");
    expect(meta.quota_period).toBe("monthly");
    expect(meta.observed_cost).toBeNull();
    expect(meta.payment_status).toBeNull();

    expect(body.mcp_metadata.preflight_decision_summary.local_authorization_decision).toBe("allow");
    expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);
    expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_tool).toBe(1);

    await client.close();
    await server.close();
  });

  it("sends X-API-Key only, to the approved endpoint, with hyphen identity and no Authorization/payment header", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } });

    const [url, init] = stimCalls(fetchFn)[0];
    expect(url.origin).toBe("https://api.stocktrends.com");
    expect(url.pathname).toBe("/v1/stim/latest");
    expect(url.searchParams.get("symbol_exchange")).toBe("AAPL-Q");
    expect(url.toString()).not.toContain("AAPL_Q");

    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe(MOCK_KEY);
    const headerKeys = Object.keys(headers).map((key) => key.toLowerCase());
    expect(headerKeys).not.toContain("authorization");
    expect(headerKeys).not.toContain("payment-signature");
    expect(headerKeys).not.toContain("x-payment");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();

    await client.close();
    await server.close();
  });

  it("accepts decomposed symbol + exchange and still sends hyphen identity", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol: "AAPL", exchange: "Q" } });

    const [url] = stimCalls(fetchFn)[0];
    expect(url.searchParams.get("symbol_exchange")).toBe("AAPL-Q");

    await client.close();
    await server.close();
  });

  it("never leaks the API key into the returned wrapper", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));
    const serialized = JSON.stringify(body).toLowerCase();

    expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
    expect(serialized).not.toContain("x-api-key");

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM live execution — successful history", () => {
  it("forwards supplied params (hyphen identity) and preserves the API history payload", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(
      await client.callTool({
        name: STIM_HISTORY_TOOL_NAME,
        arguments: { symbol_exchange: "AAPL_Q", start: "2026-01-01", end: "2026-02-01", limit: 100, include_gaps: true }
      })
    );

    expect(body.paid_execution_authorized).toBe(true);
    expect(stimCalls(fetchFn)).toHaveLength(1);

    const [url] = stimCalls(fetchFn)[0];
    expect(url.pathname).toBe("/v1/stim/history");
    expect(url.searchParams.get("symbol_exchange")).toBe("AAPL-Q");
    expect(url.searchParams.get("start")).toBe("2026-01-01");
    expect(url.searchParams.get("end")).toBe("2026-02-01");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("include_gaps")).toBe("true");
    expect(url.toString()).not.toContain("AAPL_Q");

    expect(body.api_data.symbol_exchange).toBe("AAPL-Q");
    expect(body.mcp_metadata.response_metadata.pricing_rule).toBe("stim_history_paid");

    await client.close();
    await server.close();
  });

  it("omits limit and include_gaps when not supplied so API defaults apply", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: STIM_HISTORY_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } });

    const [url] = stimCalls(fetchFn)[0];
    expect(url.searchParams.get("symbol_exchange")).toBe("AAPL-Q");
    expect(url.searchParams.has("limit")).toBe(false);
    expect(url.searchParams.has("include_gaps")).toBe(false);
    expect(url.searchParams.has("start")).toBe(false);
    expect(url.searchParams.has("end")).toBe(false);

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM live execution — input validation before any fetch", () => {
  it.each([
    { label: "latest missing identity", tool: STIM_LATEST_TOOL_NAME, args: {} },
    { label: "history start after end", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", start: "2026-02-01", end: "2026-01-01" } },
    { label: "history invalid calendar date", tool: STIM_HISTORY_TOOL_NAME, args: { symbol_exchange: "AAPL_Q", start: "2026-13-40" } }
  ])("rejects $label before preflight/auth/fetch", async ({ tool, args }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: tool, arguments: args }));

    expect(body.error.error_code).toBe("invalid_tool_input");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM live execution — cap accounting", () => {
  it("increments in-memory usage and blocks once the per-tool cap is reached", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "1",
      STOCKTRENDS_MAX_STC_PER_SESSION: "10"
    });

    const first = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));
    expect(first.paid_execution_authorized).toBe(true);
    expect(first.mcp_metadata.local_budget_cap_status.paid_calls_this_tool).toBe(1);

    const second = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));
    expect(second.error.error_code).toBe("spend_cap_exceeded");
    // Only the first call reached the ST-IM endpoint; the denied call sent nothing.
    expect(stimCalls(fetchFn)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it("does not advance usage on a denied (invalid input) call", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: {} }); // invalid, no increment
    const ok = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(ok.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);
    expect(stimCalls(fetchFn)).toHaveLength(1);

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM live execution — deterministic fetch failures (no retries)", () => {
  it.each([
    {
      label: "network failure",
      route: () => {
        throw new Error("connection refused");
      },
      expected: "api_request_failed"
    },
    {
      label: "timeout",
      route: () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      },
      expected: "api_timeout"
    },
    { label: "402 payment required", route: () => jsonResponse({ detail: "payment required" }, 402), expected: "api_payment_required" },
    { label: "404 not found", route: () => jsonResponse({ detail: "stim_not_found" }, 404), expected: "api_not_found" },
    { label: "401 unauthorized", route: () => jsonResponse({ detail: "unauthorized" }, 401), expected: "api_auth_required" },
    { label: "malformed body", route: () => textResponse("not json", 200, { "content-type": "text/plain" }), expected: "malformed_api_response" }
  ])("maps $label to a deterministic error with exactly one ST-IM attempt", async ({ route, expected }) => {
    const fetchFn = routedFetch({ latest: route as () => Response });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.error.error_code).toBe(expected);
    expect(body.paid_execution_authorized).toBe(false);
    expect(body.api_request_sent).toBe(true);
    expect(body.auth_header_sent).toBe(true);
    expect(body.payment_header_sent).toBe(false);
    // Exactly one ST-IM attempt; no retry.
    expect(stimCalls(fetchFn)).toHaveLength(1);

    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
    expect(serialized).not.toContain("bearer ");

    await client.close();
    await server.close();
  });

  it("surfaces a 402 as safe metadata without any x402 payment or retry", async () => {
    const fetchFn = routedFetch({ latest: () => jsonResponse({ detail: "payment required" }, 402) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: STIM_LATEST_TOOL_NAME, arguments: { symbol_exchange: "AAPL_Q" } }));

    expect(body.error.error_code).toBe("api_payment_required");
    expect(body.payment_header_sent).toBe(false);
    expect(stimCalls(fetchFn)).toHaveLength(1);

    const [, init] = stimCalls(fetchFn)[0];
    const headerKeys = Object.keys(init.headers as Record<string, string>).map((key) => key.toLowerCase());
    expect(headerKeys).not.toContain("payment-signature");
    expect(headerKeys).not.toContain("x-payment");

    await client.close();
    await server.close();
  });
});

describe("Phase 4 paid ST-IM live execution — credential-bearing endpoint allowlist", () => {
  const authConfig = (): PaidAuthConfig => {
    const config = parseConfig({ ...EXEC_ENV });
    return { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
  };

  it("scopes the auth-capable allowlist to ST-IM, indicators, and base selections/latest only (PR 39 + PR 45 promotions)", () => {
    // PR 39 promoted the paired paid indicators routes and PR 45 promoted the
    // base /v1/selections/latest route into the auth-capable allowlist so they
    // are executable behind the same gate policy. The public instrument-discovery
    // routes and the deferred (published/base-history) selections routes are
    // deliberately never on this list.
    expect(AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath)).toEqual([
      "/v1/stim/latest",
      "/v1/stim/history",
      "/v1/indicators/latest",
      "/v1/indicators/history",
      "/v1/selections/latest"
    ]);
    expect(PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath)).not.toContain("/v1/selections/history");
    expect(PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath)).not.toContain("/v1/selections/published/latest");
    expect(PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath)).not.toContain("/v1/instruments/lookup");
    expect(PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath)).not.toContain("/v1/instruments/resolve");
  });

  it.each(["/v1/indicators/latest", "/v1/indicators/history"])("allows indicator endpoint %s on the auth-capable boundary (structural gates pass)", (endpointPath) => {
    const config = authConfig();
    const toolName = endpointPath.endsWith("latest") ? "stocktrends_get_indicators_latest" : "stocktrends_get_indicators_history";
    const targetUrl = new URL(`https://api.stocktrends.com${endpointPath}`);

    // Resolvable as an auth-capable policy after promotion.
    expect(getPaidEndpointPolicy(endpointPath)?.pricingRuleId).toBe(
      endpointPath.endsWith("latest") ? "indicators_latest_paid" : "indicators_history_paid"
    );
    expect(() => assertPaidEndpointAllowed(endpointPath)).not.toThrow();

    // Structural invocation preflight now authorizes (execution flag + key set).
    expect(evaluatePaidInvocationPreflight(config, { toolName, endpointPath, httpMethod: "GET", targetUrl }).denialReason).toBeNull();

    // Full preflight allows with the authoritative indicators cost estimate.
    const input: PaidPreflightEvaluationInput = {
      toolName,
      endpointPath,
      httpMethod: "GET",
      targetUrl,
      costEstimate: indicatorCost(endpointPath.endsWith("latest") ? "indicators_latest_paid" : "indicators_history_paid")
    };
    expect(evaluatePaidPreflight(config, input).localPolicyDecision).toBe("allow");

    // buildPaidAuthHeaders now constructs the X-API-Key header for indicators.
    expect(buildPaidAuthHeaders(config, input)).toEqual({ "X-API-Key": MOCK_KEY });
  });

  it("still allows the ST-IM endpoints through the auth-capable allowlist check", () => {
    expect(getPaidEndpointPolicy("/v1/stim/latest")?.pricingRuleId).toBe("stim_latest_paid");
    expect(getPaidEndpointPolicy("/v1/stim/history")?.pricingRuleId).toBe("stim_history_paid");
    expect(() => assertPaidEndpointAllowed("/v1/stim/latest")).not.toThrow();
    expect(() => assertPaidEndpointAllowed("/v1/stim/history")).not.toThrow();
  });
});

describe("Phase 4 paid ST-IM live execution — public safety regression", () => {
  it("keeps public resources and the cost-estimate tool credential-free under execution mode", async () => {
    const fetchFn = routedFetch({ other: (url) => (url.pathname === "/v1/cost-estimate" ? jsonResponse(costEstimateBody()) : jsonResponse({ ok: true })) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.readResource({ uri: "stocktrends://api/openapi" });
    const openapiCall = fetchFn.mock.calls.find(([url]) => url.pathname === "/v1/openapi.json");
    expect(openapiCall?.[1].headers).toEqual(PUBLIC_HEADERS);

    await client.callTool({ name: COST_ESTIMATE_TOOL_NAME, arguments: { workflow_id: "stim_forecast_review" } });
    const costCall = fetchFn.mock.calls.find(([url]) => url.pathname === "/v1/cost-estimate");
    const planningHeaders = JSON.stringify(costCall?.[1].headers).toLowerCase();
    expect(planningHeaders).not.toContain("api-key");
    expect(planningHeaders).not.toContain("authorization");
    expect(planningHeaders).not.toContain(MOCK_KEY.toLowerCase());

    await client.close();
    await server.close();
  });

  it("keeps prompt count at zero", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);

    await client.close();
    await server.close();
  });
});

// --- Fetch routing (catalog reconciliation read + credential-bearing ST-IM fetch) ---

interface FetchRoutes {
  catalog?: (url: URL) => Response | Promise<Response>;
  latest?: (url: URL) => Response | Promise<Response>;
  history?: (url: URL) => Response | Promise<Response>;
  other?: (url: URL) => Response | Promise<Response>;
}

function routedFetch(routes: FetchRoutes = {}): ReturnType<typeof vi.fn<FetchLike>> {
  return vi.fn<FetchLike>(async (url) => {
    switch (url.pathname) {
      case "/v1/pricing/catalog":
        return (routes.catalog ?? (() => jsonResponse(validCatalogBody())))(url);
      case "/v1/stim/latest":
        return (routes.latest ?? (() => jsonResponse(latestBody(), 200, STIM_HEADERS)))(url);
      case "/v1/stim/history":
        return (routes.history ?? (() => jsonResponse(historyBody(), 200, { ...STIM_HEADERS, "x-stocktrends-pricing-rule": "stim_history_paid" })))(url);
      default:
        return (routes.other ?? (() => jsonResponse({ ok: true })))(url);
    }
  });
}

function stimCalls(fetchFn: ReturnType<typeof vi.fn<FetchLike>>): Array<[URL, RequestInit]> {
  return fetchFn.mock.calls.filter(([url]) => url.pathname.startsWith("/v1/stim/")) as Array<[URL, RequestInit]>;
}

function catalogCalls(fetchFn: ReturnType<typeof vi.fn<FetchLike>>): Array<[URL, RequestInit]> {
  return fetchFn.mock.calls.filter(([url]) => url.pathname === "/v1/pricing/catalog") as Array<[URL, RequestInit]>;
}

function hasApiKey(init: RequestInit): boolean {
  return Object.keys((init.headers as Record<string, string>) ?? {}).some((key) => key.toLowerCase() === "x-api-key");
}

function catalogRule(pricingRuleId: string, endpointPattern: string, stcCost: number): Record<string, unknown> {
  return { pricing_rule_id: pricingRuleId, endpoint_pattern: endpointPattern, stc_cost: stcCost, unit: "STC" };
}

function validCatalogBody(): Record<string, unknown> {
  return {
    rules: [catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025), catalogRule("stim_history_paid", "/v1/stim/history", 0.0075)]
  };
}

function latestBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    request_id: "req-latest-1",
    symbol_exchange: "AAPL-Q",
    symbol: "AAPL",
    exchange: "Q",
    latest_data_weekdate: "2026-06-26",
    is_stale: false,
    x4wk1: 0.1,
    x4wk2: 0.2,
    x4wk: 0.15,
    ...overrides
  };
}

function historyBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    request_id: "req-history-1",
    symbol_exchange: "AAPL-Q",
    start: "2026-01-01",
    end: "2026-02-01",
    count: 2,
    include_gaps: true,
    gaps: [],
    data: [
      { weekdate: "2026-01-02", x4wk: 0.11 },
      { weekdate: "2026-01-09", x4wk: 0.12 }
    ],
    ...overrides
  };
}

function costEstimateBody(): Record<string, unknown> {
  return {
    workflow_id: "stim_forecast_review",
    rail: "auto",
    total_stc_cost: 2,
    total_usd_cost: 0.4,
    quota_remaining_supplied: null,
    quota_sufficient: null,
    steps: [],
    notes: ["Mock estimate."]
  };
}

function indicatorCost(pricingRuleId: "indicators_latest_paid" | "indicators_history_paid" = "indicators_latest_paid"): PaidCostEstimate {
  return {
    amount: 0.25,
    unit: "STC",
    authoritative: true,
    pricingSource: "pricing_catalog",
    pricingRuleId,
    fetchedAt: "2026-07-08T00:00:00.000Z"
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
