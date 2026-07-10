import { describe, expect, it, vi } from "vitest";
import { type Env } from "../src/config.js";
import { resolveStaticEndpointPricing } from "../src/paidPricing.js";
import { PHASE1_PROMPT_DEFINITIONS } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { COST_ESTIMATE_TOOL_NAME } from "../src/tools/index.js";
import { STIM_HISTORY_TOOL_NAME, STIM_LATEST_TOOL_NAME } from "../src/tools/stimTools.js";
import {
  INDICATORS_HISTORY_ENDPOINT_PATH,
  INDICATORS_HISTORY_TOOL_NAME,
  INDICATORS_LATEST_ENDPOINT_PATH,
  INDICATORS_LATEST_TOOL_NAME,
  PAID_INDICATORS_TOOL_NAMES
} from "../src/tools/indicatorsTools.js";
import { SELECTIONS_LATEST_TOOL_NAME } from "../src/tools/selectionsTools.js";
import { connectMcp, jsonResponse, textResponse } from "./helpers.js";

const MOCK_KEY = "mock-indicators-secret-must-never-be-sent";
const PUBLIC_HEADERS = { Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" };

// Paid-exposed surface after PR 45 adds the base selections tool: six tools.
const SIX_PAID_TOOLS = [
  COST_ESTIMATE_TOOL_NAME,
  STIM_LATEST_TOOL_NAME,
  STIM_HISTORY_TOOL_NAME,
  INDICATORS_LATEST_TOOL_NAME,
  INDICATORS_HISTORY_TOOL_NAME,
  SELECTIONS_LATEST_TOOL_NAME
].sort();

// Paid tools + key + execution flag + nonzero caps + budget cap.
const EXEC_ENV: Env = {
  STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
  STOCKTRENDS_API_KEY: MOCK_KEY,
  STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
  STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
  STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5",
  STOCKTRENDS_MAX_STC_PER_SESSION: "10",
  STOCKTRENDS_MAX_USD_PER_SESSION: "10"
};

// Paid tools + key, but execution NOT enabled (exposure only).
const EXPOSURE_ENV: Env = {
  STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
  STOCKTRENDS_API_KEY: MOCK_KEY
};

const INDICATORS_HEADERS = {
  "x-stocktrends-pricing-rule": "indicators_latest_paid",
  "x-stocktrends-payment-required": "false",
  "x-stocktrends-accepted-payment-methods": "subscription",
  "x-stocktrends-quota-limit": "1000",
  "x-stocktrends-quota-period": "monthly"
};

describe("Phase 5B indicators — tool surface", () => {
  it("default/free mode exposes exactly one tool", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {});

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    expect(toolNames).toEqual([COST_ESTIMATE_TOOL_NAME]);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("paid-exposed mode exposes exactly six tools", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();
    expect(toolNames).toEqual(SIX_PAID_TOOLS);
    expect(toolNames).toHaveLength(6);

    await client.close();
    await server.close();
  });

  it("registers indicators latest/history as a coupled pair (never one without the other)", async () => {
    expect(PAID_INDICATORS_TOOL_NAMES).toEqual([INDICATORS_LATEST_TOOL_NAME, INDICATORS_HISTORY_TOOL_NAME]);

    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);

    const hasLatest = toolNames.includes(INDICATORS_LATEST_TOOL_NAME);
    const hasHistory = toolNames.includes(INDICATORS_HISTORY_TOOL_NAME);
    expect(hasLatest).toBe(true);
    expect(hasHistory).toBe(true);
    expect(hasLatest).toBe(hasHistory);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "no env", env: {}, expectPaid: false },
    { label: "API key alone", env: { STOCKTRENDS_API_KEY: MOCK_KEY }, expectPaid: false },
    { label: "paid flag alone (no key)", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "true" }, expectPaid: false },
    { label: "paid flag + key", env: EXPOSURE_ENV, expectPaid: true }
  ])("exposes indicators tools only when the paid flag AND API key are both set ($label)", async ({ env, expectPaid }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, env);
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);

    expect(toolNames.includes(INDICATORS_LATEST_TOOL_NAME)).toBe(expectPaid);
    expect(toolNames.includes(INDICATORS_HISTORY_TOOL_NAME)).toBe(expectPaid);

    await client.close();
    await server.close();
  });

  it("registers zero MCP prompts", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — static pricing mirror", () => {
  it("uses the indicators family static values (0.0035 / 0.01 STC), not the ST-IM values", () => {
    expect(resolveStaticEndpointPricing("indicators_latest_paid")).toMatchObject({ amount: 0.0035, unit: "STC", pricingRuleId: "indicators_latest_paid" });
    expect(resolveStaticEndpointPricing("indicators_history_paid")).toMatchObject({ amount: 0.01, unit: "STC", pricingRuleId: "indicators_history_paid" });
    // The ST-IM mirror is unrelated and must not transfer.
    expect(resolveStaticEndpointPricing("indicators_latest_paid")?.amount).not.toBe(0.0025);
    expect(resolveStaticEndpointPricing("indicators_history_paid")?.amount).not.toBe(0.0075);
  });

  it("surfaces the indicators static cost (not an ST-IM cost) in the preflight summary on success", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const latest = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } }));
    expect(latest.mcp_metadata.preflight_decision_summary.estimated_cost).toEqual({ amount: 0.0035, unit: "STC" });

    const history = structured(await client.callTool({ name: INDICATORS_HISTORY_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } }));
    expect(history.mcp_metadata.preflight_decision_summary.estimated_cost).toEqual({ amount: 0.01, unit: "STC" });

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — execution gating", () => {
  it("fails closed with no request and no auth header when the execution flag is unset (exposure only)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } }));

    expect(body.error.error_code).toBe("paid_execution_disabled");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.payment_header_sent).toBe(false);
    // Canonical identity needs no resolution; nothing at all is fetched.
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("fails closed when the execution flag is set but no caps are configured", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true"
    });

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } }));

    expect(body.error.error_code).toBe("spend_cap_exceeded");
    // Cap denial happens before reconciliation: no catalog read, no indicators fetch.
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — successful execution (mock)", () => {
  it("sends exactly one GET to /v1/indicators/latest with X-API-Key only after all gates pass", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N", cs_only: true } });
    const body = structured(result);

    expect(result.isError).not.toBe(true);
    expect(body.paid_execution_authorized).toBe(true);
    expect(body.api_request_sent).toBe(true);
    expect(body.auth_header_sent).toBe(true);
    expect(body.payment_header_sent).toBe(false);

    const latestCalls = pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH);
    expect(latestCalls).toHaveLength(1);

    const [url, init] = latestCalls[0];
    expect(url.origin).toBe("https://api.stocktrends.com");
    expect(url.searchParams.get("symbol_exchange")).toBe("IBM-N");
    expect(url.searchParams.get("cs_only")).toBe("true");
    expect(url.toString()).not.toContain("IBM_N");

    const headers = init.headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe(MOCK_KEY);
    const headerKeys = Object.keys(headers).map((key) => key.toLowerCase());
    expect(headerKeys).not.toContain("authorization");
    expect(headerKeys).not.toContain("payment-signature");
    expect(headerKeys).not.toContain("x-payment");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();

    // Canonical identity: no lookup/resolve was needed.
    expect(pathCalls(fetchFn, "/v1/instruments/lookup")).toHaveLength(0);
    expect(pathCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);

    expect(body.mcp_metadata.response_metadata.pricing_rule).toBe("indicators_latest_paid");
    expect(body.mcp_metadata.response_metadata.observed_cost).toBeNull();
    expect(body.mcp_metadata.response_metadata.payment_status).toBeNull();
    expect(body.api_data.symbol_exchange).toBe("IBM-N");

    await client.close();
    await server.close();
  });

  it("sends exactly one GET to /v1/indicators/history with X-API-Key and forwards supplied params", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(
      await client.callTool({
        name: INDICATORS_HISTORY_TOOL_NAME,
        arguments: { symbol_exchange: "IBM_N", start: "2026-01-01", end: "2026-02-01", limit: 100, cs_only: false }
      })
    );

    expect(body.paid_execution_authorized).toBe(true);

    const historyCalls = pathCalls(fetchFn, INDICATORS_HISTORY_ENDPOINT_PATH);
    expect(historyCalls).toHaveLength(1);

    const [url, init] = historyCalls[0];
    expect(url.searchParams.get("symbol_exchange")).toBe("IBM-N");
    expect(url.searchParams.get("start")).toBe("2026-01-01");
    expect(url.searchParams.get("end")).toBe("2026-02-01");
    expect(url.searchParams.get("limit")).toBe("100");
    expect(url.searchParams.get("cs_only")).toBe("false");
    expect(url.toString()).not.toContain("IBM_N");
    expect((init.headers as Record<string, string>)["X-API-Key"]).toBe(MOCK_KEY);
    expect(body.mcp_metadata.response_metadata.pricing_rule).toBe("indicators_history_paid");

    await client.close();
    await server.close();
  });

  it("omits limit and cs_only when not supplied so API defaults apply", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: INDICATORS_HISTORY_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } });

    const [url] = pathCalls(fetchFn, INDICATORS_HISTORY_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("symbol_exchange")).toBe("IBM-N");
    expect(url.searchParams.has("limit")).toBe(false);
    expect(url.searchParams.has("cs_only")).toBe(false);
    expect(url.searchParams.has("start")).toBe(false);
    expect(url.searchParams.has("end")).toBe(false);

    await client.close();
    await server.close();
  });

  it("never leaks the API key into the returned wrapper", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } }));
    const serialized = JSON.stringify(body).toLowerCase();

    expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
    expect(serialized).not.toContain("x-api-key");

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — input validation before any preflight/network", () => {
  it.each([
    { label: "invalid exchange", tool: INDICATORS_LATEST_TOOL_NAME, args: { symbol: "IBM", exchange: "X" } },
    { label: "history limit below min", tool: INDICATORS_HISTORY_TOOL_NAME, args: { symbol_exchange: "IBM_N", limit: 0 } },
    { label: "history limit above max", tool: INDICATORS_HISTORY_TOOL_NAME, args: { symbol_exchange: "IBM_N", limit: 2601 } },
    { label: "unknown key", tool: INDICATORS_LATEST_TOOL_NAME, args: { symbol_exchange: "IBM_N", surprise: true } }
  ])("rejects $label at the strict schema boundary with no fetch", async ({ tool, args }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: tool, arguments: args });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Invalid arguments");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("accepts the maximum history limit (2600) and forwards it", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: INDICATORS_HISTORY_TOOL_NAME, arguments: { symbol_exchange: "IBM_N", limit: 2600 } });
    const [url] = pathCalls(fetchFn, INDICATORS_HISTORY_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit")).toBe("2600");

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — catalog reconciliation gate", () => {
  it.each([
    { label: "catalog unavailable", catalog: () => jsonResponse({ detail: "down" }, 503) },
    { label: "indicators cost differs from static mirror", catalog: () => jsonResponse({ rules: [catalogRule("indicators_latest_paid", "/v1/indicators/latest", 0.99), catalogRule("indicators_history_paid", "/v1/indicators/history", 0.01)] }) },
    { label: "indicators rule missing", catalog: () => jsonResponse({ rules: [catalogRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035)] }) },
    {
      label: "indicators unit is USD with matching cost",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "indicators_latest_paid", endpoint_pattern: "/v1/indicators/latest", stc_cost: 0.0035, cost_unit: "USD" },
            catalogRule("indicators_history_paid", "/v1/indicators/history", 0.01)
          ]
        })
    },
    {
      label: "indicators unit field is absent",
      catalog: () =>
        jsonResponse({
          rules: [
            { pricing_rule_id: "indicators_latest_paid", endpoint_pattern: "/v1/indicators/latest", stc_cost: 0.0035 },
            catalogRule("indicators_history_paid", "/v1/indicators/history", 0.01)
          ]
        })
    }
  ])("denies before auth/fetch when $label", async ({ catalog }) => {
    const fetchFn = routedFetch({ catalog });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("failed");
    expect(pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)).toHaveLength(0);
    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
    }

    await client.close();
    await server.close();
  });

  it("reconciles the indicators family credential-free (no X-API-Key on the catalog read)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } });

    const catalog = pathCalls(fetchFn, "/v1/pricing/catalog");
    expect(catalog).toHaveLength(1);
    expect(catalog[0][1].headers).toEqual(PUBLIC_HEADERS);

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — credential-free resolution before paid gates", () => {
  it("resolves a bare symbol via lookup (count==1) credential-free, then executes the paid call", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse(lookupBody("IBM", ["IBM-N"])) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol: "IBM" } }));

    expect(body.paid_execution_authorized).toBe(true);
    expect(body.mcp_metadata.instrument_resolution).toMatchObject({
      resolution_used: true,
      resolution_source: "instruments_lookup",
      resolved_symbol_exchange: "IBM-N",
      resolution_ambiguous: false
    });

    // Lookup was credential-free and preceded the paid indicators fetch.
    const lookup = pathCalls(fetchFn, "/v1/instruments/lookup");
    expect(lookup).toHaveLength(1);
    expect(hasApiKey(lookup[0][1])).toBe(false);
    expect(pathCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);

    const [indicatorsUrl, indicatorsInit] = pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)[0];
    expect(indicatorsUrl.searchParams.get("symbol_exchange")).toBe("IBM-N");
    expect((indicatorsInit.headers as Record<string, string>)["X-API-Key"]).toBe(MOCK_KEY);

    await client.close();
    await server.close();
  });

  it("fails closed with candidate matches on an ambiguous bare symbol — no pricing, auth, fetch, or cap debit", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse(lookupBody("TD", ["TD-N", "TD-T"])) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol: "TD" } }));

    expect(body.error.error_code).toBe("instrument_symbol_ambiguous");
    expect(body.mcp_metadata.instrument_resolution.resolution_ambiguous).toBe(true);
    expect(body.mcp_metadata.instrument_resolution.candidate_matches).toEqual(["TD-N", "TD-T"]);
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);

    // No paid boundary was entered: no catalog read, no indicators fetch, no cap debit.
    expect(pathCalls(fetchFn, "/v1/pricing/catalog")).toHaveLength(0);
    expect(pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)).toHaveLength(0);
    expect(pathCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);
    expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(0);
    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
    }

    await client.close();
    await server.close();
  });

  it("does not send prefer_exchange=N for a bare raw symbol (uses lookup, not resolve)", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse(lookupBody("IBM", ["IBM-N"])) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol: "IBM" } });

    expect(pathCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);
    for (const [url] of fetchFn.mock.calls) {
      expect(url.searchParams.has("prefer_exchange")).toBe(false);
    }

    await client.close();
    await server.close();
  });

  it("treats explicit symbol+exchange as an explicit identity (resolve with prefer_exchange=E), then executes", async () => {
    const fetchFn = routedFetch({ resolve: (url) => jsonResponse(resolveSuccessBody("TD", url.searchParams.get("prefer_exchange") ?? "N")) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol: "TD", exchange: "T" } }));

    expect(body.paid_execution_authorized).toBe(true);
    expect(body.mcp_metadata.symbol_identity.identity_source).toBe("symbol_and_exchange");
    expect(body.mcp_metadata.symbol_identity.api_symbol_exchange).toBe("TD-T");

    const resolve = pathCalls(fetchFn, "/v1/instruments/resolve");
    expect(resolve).toHaveLength(1);
    expect(resolve[0][0].searchParams.get("prefer_exchange")).toBe("T");
    expect(hasApiKey(resolve[0][1])).toBe(false);
    expect(pathCalls(fetchFn, "/v1/instruments/lookup")).toHaveLength(0);
    expect(pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)[0][0].searchParams.get("symbol_exchange")).toBe("TD-T");

    await client.close();
    await server.close();
  });

  it("fails closed with matches on a resolve 409 ambiguity — no paid request", async () => {
    const fetchFn = routedFetch({ resolve: () => jsonResponse(resolve409Body("TD", ["TD-N", "TD-T"]), 409) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol: "TD", exchange: "Q" } }));

    expect(body.error.error_code).toBe("instrument_symbol_ambiguous");
    expect(body.mcp_metadata.instrument_resolution.candidate_matches).toEqual(["TD-N", "TD-T"]);
    expect(body.api_request_sent).toBe(false);
    expect(pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)).toHaveLength(0);

    await client.close();
    await server.close();
  });

  it("fails closed on a no-match bare symbol (lookup 404)", async () => {
    const fetchFn = routedFetch({ lookup: () => jsonResponse({ detail: { error: "not_found" } }, 404) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol: "ZZZZQ" } }));

    expect(body.error.error_code).toBe("instrument_symbol_not_found");
    expect(body.api_request_sent).toBe(false);
    expect(pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)).toHaveLength(0);

    await client.close();
    await server.close();
  });

  it("does not enter pricing/cap/auth/fetch when the bare-symbol lookup body is malformed (single row, no valid count)", async () => {
    // A single usable row but no valid integer count must NOT resolve.
    const fetchFn = routedFetch({ lookup: () => jsonResponse({ request_id: "r", symbol: "IBM", data: [{ symbol_exchange: "IBM-N" }] }) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol: "IBM" } }));

    expect(body.error.error_code).toBe("instrument_resolution_unavailable");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);

    // No paid boundary: no catalog read, no indicators fetch, no resolve call, no cap debit, no key anywhere.
    expect(pathCalls(fetchFn, "/v1/pricing/catalog")).toHaveLength(0);
    expect(pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)).toHaveLength(0);
    expect(pathCalls(fetchFn, "/v1/instruments/resolve")).toHaveLength(0);
    expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(0);
    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
    }

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — no payment rails, no retries, secret-free failures", () => {
  it("surfaces a 402 as safe metadata with exactly one attempt and no payment header", async () => {
    const fetchFn = routedFetch({ latest: () => jsonResponse({ detail: "payment required" }, 402) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: INDICATORS_LATEST_TOOL_NAME, arguments: { symbol_exchange: "IBM_N" } }));

    expect(body.error.error_code).toBe("api_payment_required");
    expect(body.payment_header_sent).toBe(false);
    expect(pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    const [, init] = pathCalls(fetchFn, INDICATORS_LATEST_ENDPOINT_PATH)[0];
    const headerKeys = Object.keys(init.headers as Record<string, string>).map((key) => key.toLowerCase());
    expect(headerKeys).not.toContain("authorization");
    expect(headerKeys).not.toContain("payment-signature");
    expect(headerKeys).not.toContain("x-payment");

    const serialized = JSON.stringify(body).toLowerCase();
    expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
    expect(serialized).not.toContain("bearer ");

    await client.close();
    await server.close();
  });
});

describe("Phase 5B indicators — public safety regression", () => {
  it("keeps public resources and the cost-estimate tool credential-free while indicators are enabled", async () => {
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
});

// --- Fetch routing: catalog + instrument discovery + credential-bearing indicators fetch ---

interface FetchRoutes {
  catalog?: (url: URL) => Response | Promise<Response>;
  lookup?: (url: URL) => Response | Promise<Response>;
  resolve?: (url: URL) => Response | Promise<Response>;
  latest?: (url: URL) => Response | Promise<Response>;
  history?: (url: URL) => Response | Promise<Response>;
  other?: (url: URL) => Response | Promise<Response>;
}

function routedFetch(routes: FetchRoutes = {}): ReturnType<typeof vi.fn<FetchLike>> {
  return vi.fn<FetchLike>(async (url) => {
    switch (url.pathname) {
      case "/v1/pricing/catalog":
        return (routes.catalog ?? (() => jsonResponse(validCatalogBody())))(url);
      case "/v1/instruments/lookup":
        return (routes.lookup ?? ((u: URL) => jsonResponse(lookupBody(u.searchParams.get("symbol") ?? "IBM", [`${u.searchParams.get("symbol") ?? "IBM"}-N`]))))(url);
      case "/v1/instruments/resolve":
        return (routes.resolve ?? ((u: URL) => jsonResponse(resolveSuccessBody(u.searchParams.get("symbol") ?? "IBM", u.searchParams.get("prefer_exchange") ?? "N"))))(url);
      case "/v1/indicators/latest":
        return (routes.latest ?? ((u: URL) => jsonResponse(indicatorsBody(u), 200, INDICATORS_HEADERS)))(url);
      case "/v1/indicators/history":
        return (routes.history ?? ((u: URL) => jsonResponse(indicatorsHistoryBody(u), 200, { ...INDICATORS_HEADERS, "x-stocktrends-pricing-rule": "indicators_history_paid" })))(url);
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

function catalogRule(pricingRuleId: string, endpointPattern: string, stcCost: number): Record<string, unknown> {
  return { pricing_rule_id: pricingRuleId, endpoint_pattern: endpointPattern, stc_cost: stcCost, unit: "STC" };
}

function validCatalogBody(): Record<string, unknown> {
  return {
    rules: [
      catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025),
      catalogRule("stim_history_paid", "/v1/stim/history", 0.0075),
      catalogRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035),
      catalogRule("indicators_history_paid", "/v1/indicators/history", 0.01)
    ]
  };
}

function lookupBody(symbol: string, symbolExchanges: string[]): Record<string, unknown> {
  return {
    request_id: "req-lookup-1",
    symbol,
    cs_only: true,
    details: false,
    count: symbolExchanges.length,
    data: symbolExchanges.map((symbolExchange) => {
      const [sym, exchange] = symbolExchange.split("-");
      return { symbol: sym, exchange, type: "CS", currency: "USD", name: `${sym} Inc`, symbol_exchange: symbolExchange };
    }),
    hint: "Use symbol_exchange (e.g. IBM-N) or symbol+exchange."
  };
}

function resolveSuccessBody(symbol: string, exchange: string): Record<string, unknown> {
  return {
    request_id: "req-resolve-1",
    symbol,
    exchange,
    symbol_exchange: `${symbol}-${exchange}`,
    resolved_by: "prefer_exchange",
    prefer_exchange: exchange
  };
}

function resolve409Body(symbol: string, matches: string[]): Record<string, unknown> {
  return {
    detail: { request_id: "req-resolve-409", error: "ambiguous_symbol", symbol, matches, hint: "Supply a canonical symbol_exchange." }
  };
}

function indicatorsBody(url: URL): Record<string, unknown> {
  return {
    request_id: "req-ind-latest-1",
    symbol_exchange: url.searchParams.get("symbol_exchange") ?? "IBM-N",
    exchange: "N",
    symbol: "IBM",
    type: "CS",
    currency_code: "USD",
    weekdate: "2026-06-26",
    trend: "U",
    trend_cnt: 12,
    rsi: 55.2,
    vol_tag: "N"
  };
}

function indicatorsHistoryBody(url: URL): Record<string, unknown> {
  return {
    request_id: "req-ind-history-1",
    symbol_exchange: url.searchParams.get("symbol_exchange") ?? "IBM-N",
    cs_only: true,
    start: "2026-01-01",
    end: "2026-02-01",
    count: 2,
    data: [
      { weekdate: "2026-01-02", trend: "U", rsi: 51.1 },
      { weekdate: "2026-01-09", trend: "U", rsi: 52.3 }
    ]
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

function structured(result: Awaited<ReturnType<import("@modelcontextprotocol/sdk/client/index.js").Client["callTool"]>>): Record<string, any> {
  if (!("structuredContent" in result) || !result.structuredContent) {
    throw new Error(`Expected structured tool content, got ${JSON.stringify(result)}`);
  }

  return result.structuredContent as Record<string, any>;
}

function text(result: Awaited<ReturnType<import("@modelcontextprotocol/sdk/client/index.js").Client["callTool"]>>): string {
  const content = (result as { content?: Array<{ type: string; text?: string }> }).content ?? [];
  return content.map((entry) => entry.text ?? "").join("\n");
}
