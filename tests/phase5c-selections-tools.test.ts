import { describe, expect, it, vi } from "vitest";
import { type Env } from "../src/config.js";
import { resolveStaticEndpointPricing, SELECTIONS_PRICING_RULE_IDS } from "../src/paidPricing.js";
import { PHASE1_PROMPT_DEFINITIONS } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { COST_ESTIMATE_TOOL_NAME } from "../src/tools/index.js";
import { INDICATORS_HISTORY_TOOL_NAME, INDICATORS_LATEST_TOOL_NAME } from "../src/tools/indicatorsTools.js";
import { STIM_HISTORY_TOOL_NAME, STIM_LATEST_TOOL_NAME } from "../src/tools/stimTools.js";
import {
  PAID_SELECTIONS_TOOL_NAMES,
  SELECTIONS_DEFAULT_LIMIT,
  SELECTIONS_LATEST_ENDPOINT_PATH,
  SELECTIONS_LATEST_TOOL_NAME,
  SELECTIONS_MAX_LIMIT
} from "../src/tools/selectionsTools.js";
import { connectMcp, jsonResponse } from "./helpers.js";

const MOCK_KEY = "mock-selections-secret-must-never-be-sent";
const PUBLIC_HEADERS = { Accept: "application/json", "User-Agent": "stocktrends-mcp-server/1.0" };

const TEN_PAID_TOOLS = [
  COST_ESTIMATE_TOOL_NAME,
  STIM_LATEST_TOOL_NAME,
  STIM_HISTORY_TOOL_NAME,
  INDICATORS_LATEST_TOOL_NAME,
  INDICATORS_HISTORY_TOOL_NAME,
  SELECTIONS_LATEST_TOOL_NAME,
  "stocktrends_get_market_regime_latest",
  "stocktrends_get_market_regime_history",
  "stocktrends_get_breadth_sector_latest",
  "stocktrends_get_leadership_summary_latest"
].sort();

// Paid tools + key + execution flag + nonzero caps + covering budget cap.
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

const SELECTIONS_HEADERS = {
  "x-stocktrends-pricing-rule": "selections_latest_paid",
  "x-stocktrends-payment-required": "false",
  "x-stocktrends-accepted-payment-methods": "subscription",
  "x-stocktrends-quota-limit": "1000",
  "x-stocktrends-quota-period": "monthly"
};

describe("Phase 5C selections — tool surface", () => {
  it("default/free mode exposes exactly one tool", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {});

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    expect(toolNames).toEqual([COST_ESTIMATE_TOOL_NAME, "stocktrends_lookup_instruments", "stocktrends_resolve_instrument"]);
    expect(toolNames).not.toContain(SELECTIONS_LATEST_TOOL_NAME);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("paid-exposed mode exposes exactly ten tools (including selections_latest)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();
    expect(toolNames).toEqual(TEN_PAID_TOOLS);
    expect(toolNames).toHaveLength(10);
    expect(toolNames).toContain(SELECTIONS_LATEST_TOOL_NAME);
    expect(PAID_SELECTIONS_TOOL_NAMES).toEqual([SELECTIONS_LATEST_TOOL_NAME]);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "no env", env: {}, expectPaid: false },
    { label: "API key alone", env: { STOCKTRENDS_API_KEY: MOCK_KEY }, expectPaid: false },
    { label: "paid flag alone (no key)", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "true" }, expectPaid: false },
    { label: "paid flag + key", env: EXPOSURE_ENV, expectPaid: true }
  ])("exposes the selections tool only when the paid flag AND API key are both set ($label)", async ({ env, expectPaid }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, env);
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);

    expect(toolNames.includes(SELECTIONS_LATEST_TOOL_NAME)).toBe(expectPaid);

    await client.close();
    await server.close();
  });

  it("does not register selections history or any published selections tool", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);
    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);

    expect(toolNames.some((name) => name.includes("selections_history"))).toBe(false);
    expect(toolNames.some((name) => name.includes("published"))).toBe(false);

    await client.close();
    await server.close();
  });

  it("describes the tool as the base ST-IM selection universe, not the published STIM Select list", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);

    const tool = (await client.listTools()).tools.find((t) => t.name === SELECTIONS_LATEST_TOOL_NAME);
    const description = tool?.description ?? "";
    expect(description).toContain("BASE ST-IM selection universe");
    expect(description).toContain("NOT the strict published STIM Select list");
    expect(description).toContain("/v1/selections/published/latest");

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

describe("Phase 5C selections — static pricing mirror", () => {
  it("uses the selections family static value (0.05 STC), distinct from ST-IM/indicators", () => {
    expect(resolveStaticEndpointPricing("selections_latest_paid")).toMatchObject({
      amount: 0.05,
      unit: "STC",
      pricingRuleId: "selections_latest_paid"
    });
    expect(SELECTIONS_PRICING_RULE_IDS).toEqual(["selections_latest_paid"]);
    // The ST-IM / indicators mirrors are unrelated and must not equal it.
    expect(resolveStaticEndpointPricing("selections_latest_paid")?.amount).not.toBe(0.0025);
    expect(resolveStaticEndpointPricing("selections_latest_paid")?.amount).not.toBe(0.0035);
  });

  it("surfaces the 0.05 STC static cost in the preflight summary on success", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));
    expect(body.mcp_metadata.preflight_decision_summary.estimated_cost).toEqual({ amount: 0.05, unit: "STC" });

    await client.close();
    await server.close();
  });
});

describe("Phase 5C selections — execution gating", () => {
  it("fails closed with no request, no auth header, and no cap debit when execution is unset (exposure only)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXPOSURE_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("paid_execution_disabled");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.payment_header_sent).toBe(false);
    expect(body.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(0);
    // Nothing at all is fetched — no catalog read, no selections fetch.
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("fails closed (spend_cap_exceeded) before auth/fetch when execution is enabled but no caps are configured", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: MOCK_KEY,
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true"
    });

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("spend_cap_exceeded");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    // Cap denial precedes reconciliation: no catalog read, no selections fetch, no key anywhere.
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

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("spend_cap_exceeded");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 5C selections — successful execution (mock)", () => {
  it("sends exactly one GET to /v1/selections/latest with X-API-Key only after all gates pass", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} });
    const body = structured(result);

    expect(result.isError).not.toBe(true);
    expect(body.paid_execution_authorized).toBe(true);
    expect(body.api_request_sent).toBe(true);
    expect(body.auth_header_sent).toBe(true);
    expect(body.payment_header_sent).toBe(false);

    const calls = pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH);
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

    // Only two fetches total: the credential-free catalog reconciliation + one paid GET.
    const selectionsWithKey = calls.filter(([, i]) => hasApiKey(i));
    expect(selectionsWithKey).toHaveLength(1);
    for (const [callUrl, callInit] of fetchFn.mock.calls) {
      if (callUrl.pathname !== SELECTIONS_LATEST_ENDPOINT_PATH) {
        expect(hasApiKey(callInit)).toBe(false);
      }
    }

    expect(body.mcp_metadata.response_metadata.pricing_rule).toBe("selections_latest_paid");
    expect(body.mcp_metadata.response_metadata.observed_cost).toBeNull();
    expect(body.mcp_metadata.response_metadata.payment_status).toBeNull();

    await client.close();
    await server.close();
  });

  it("reconciles the selections family credential-free (no X-API-Key on the catalog read)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} });

    const catalog = pathCalls(fetchFn, "/v1/pricing/catalog");
    expect(catalog).toHaveLength(1);
    expect(catalog[0][1].headers).toEqual(PUBLIC_HEADERS);

    await client.close();
    await server.close();
  });

  it("preserves the API rows verbatim in api_data and never ranks/thresholds/scores/relabels locally", async () => {
    // Rows deliberately NOT sorted by prob13wk; the adapter must not reorder them.
    const universe = selectionsBody([
      { symbol_exchange: "BBB-N", prob13wk: 0.42 },
      { symbol_exchange: "AAA-N", prob13wk: 0.91 },
      { symbol_exchange: "CCC-Q", prob13wk: 0.66 }
    ]);
    const fetchFn = routedFetch({ latest: () => jsonResponse(universe, 200, SELECTIONS_HEADERS) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.api_data).toEqual(universe);
    expect(body.api_data.data.map((row: { symbol_exchange: string }) => row.symbol_exchange)).toEqual(["BBB-N", "AAA-N", "CCC-Q"]);

    expect(body.mcp_metadata.provenance).toMatchObject({
      selection_universe: "base_stim_selection_universe",
      is_published_stim_select_list: false,
      published_list_endpoint: "/v1/selections/published/latest",
      locally_ranked: false,
      locally_thresholded: false,
      locally_scored: false,
      locally_filtered: false
    });
    expect(body.mcp_metadata.not_authoritative_for).toContain("the published STIM Select list");
    // Row-count transparency is metadata only.
    expect(body.mcp_metadata.returned_row_count).toBe(3);

    await client.close();
    await server.close();
  });

  it("does not fabricate observed_cost or payment_status", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));
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

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));
    const serialized = JSON.stringify(body).toLowerCase();

    expect(serialized).not.toContain(MOCK_KEY.toLowerCase());
    expect(serialized).not.toContain("x-api-key");

    await client.close();
    await server.close();
  });
});

describe("Phase 5C selections — limit safety (broad-sweep controls)", () => {
  it("sends an explicit limit=50 when the caller omits limit", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    const [url] = pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit")).toBe(String(SELECTIONS_DEFAULT_LIMIT));
    expect(url.searchParams.get("limit")).toBe("50");
    expect(body.mcp_metadata.effective_limit).toBe(50);
    expect(body.mcp_metadata.selection_parameters.limit_is_caller_supplied).toBe(false);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "min limit 1", limit: 1 },
    { label: "mid limit 100", limit: 100 },
    { label: "max limit 250", limit: SELECTIONS_MAX_LIMIT }
  ])("accepts a caller limit within 1..250 and forwards it ($label)", async ({ limit }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { limit } }));

    const [url] = pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.get("limit")).toBe(String(limit));
    expect(body.mcp_metadata.effective_limit).toBe(limit);
    expect(body.mcp_metadata.selection_parameters.limit_is_caller_supplied).toBe(true);

    await client.close();
    await server.close();
  });

  it("always includes limit on the outbound call even when other filters are present", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({
      name: SELECTIONS_LATEST_TOOL_NAME,
      arguments: { exchange: "Q", min_prob13wk: 0.55, include_data: true, include_mast: true, cs_only: false }
    });

    const [url] = pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.has("limit")).toBe(true);
    expect(url.searchParams.get("limit")).toBe("50");
    // Filters are passed through to the API verbatim.
    expect(url.searchParams.get("exchange")).toBe("Q");
    expect(url.searchParams.get("min_prob13wk")).toBe("0.55");
    expect(url.searchParams.get("include_data")).toBe("true");
    expect(url.searchParams.get("include_mast")).toBe("true");
    expect(url.searchParams.get("cs_only")).toBe("false");

    await client.close();
    await server.close();
  });

  it("omits optional filters when not supplied so API defaults apply, but still sends limit", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} });

    const [url] = pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)[0];
    expect(url.searchParams.has("limit")).toBe(true);
    expect(url.searchParams.has("exchange")).toBe(false);
    expect(url.searchParams.has("min_prob13wk")).toBe(false);
    expect(url.searchParams.has("include_data")).toBe(false);
    expect(url.searchParams.has("include_mast")).toBe(false);
    expect(url.searchParams.has("cs_only")).toBe(false);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "limit above hard max (251)", args: { limit: 251 } },
    { label: "limit far above max (20000)", args: { limit: 20000 } },
    { label: "limit below min (0)", args: { limit: 0 } },
    { label: "negative sentinel (-1)", args: { limit: -1 } },
    { label: "non-integer limit (1.5)", args: { limit: 1.5 } },
    { label: "array limit", args: { limit: [5] } },
    { label: "string limit", args: { limit: "50" } },
    { label: "unknown key (broad-sweep shape)", args: { all: true } },
    { label: "min_prob13wk out of range", args: { min_prob13wk: 2 } },
    { label: "unsafe exchange", args: { exchange: "ZZZ" } }
  ])("rejects $label at the strict schema boundary before any pricing/auth/fetch", async ({ args }) => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const result = await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: args });
    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Invalid arguments");
    // No pricing/auth/fetch: nothing was called at all.
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 5C selections — single fetch, no bulk, no retry", () => {
  it("makes exactly one GET per invocation (no pagination/auto-iteration)", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} });
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "429 rate limited", status: 429, code: "api_rate_limited" },
    { label: "500 upstream error", status: 500, code: "api_request_failed" }
  ])("does not auto-retry on $label — exactly one attempt, fail closed", async ({ status, code }) => {
    const fetchFn = routedFetch({ latest: () => jsonResponse({ detail: "boom" }, status) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe(code);
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(1);
    expect(body.paid_execution_authorized).toBe(false);

    await client.close();
    await server.close();
  });

  it("surfaces a 402 as safe metadata with one attempt and no payment header", async () => {
    const fetchFn = routedFetch({ latest: () => jsonResponse({ detail: "payment required" }, 402) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("api_payment_required");
    expect(body.payment_header_sent).toBe(false);
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });
});

describe("Phase 5C selections — repeated-identical-call loop posture", () => {
  it("denies a second identical call before pricing/auth/fetch and does not re-bill", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { exchange: "Q", limit: 25 } }));
    expect(first.paid_execution_authorized).toBe(true);
    expect(first.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);

    const second = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { exchange: "Q", limit: 25 } }));
    expect(second.error.error_code).toBe("repeated_identical_selection_call");
    expect(second.api_request_sent).toBe(false);
    expect(second.auth_header_sent).toBe(false);

    // Only the first call reached the endpoint; no re-bill occurred.
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(1);
    expect(second.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);

    await client.close();
    await server.close();
  });

  it("treats a call with different parameters as distinct (not a loop) and permits it", async () => {
    const fetchFn = routedFetch();
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { limit: 25 } }));
    expect(first.paid_execution_authorized).toBe(true);

    const second = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { limit: 50 } }));
    expect(second.paid_execution_authorized).toBe(true);

    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(2);
    expect(second.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(2);

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

    const firstPromise = client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { exchange: "Q", limit: 25 } });

    // Wait until the first call has reserved its signature and is suspended at
    // the catalog read, then fire the identical concurrent call.
    await reached;
    const second = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { exchange: "Q", limit: 25 } }));

    // The concurrent duplicate fails closed with no request, no auth header, and
    // no second cap debit.
    expect(second.error.error_code).toBe("repeated_identical_selection_call");
    expect(second.api_request_sent).toBe(false);
    expect(second.auth_header_sent).toBe(false);
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(0);

    // Let the first call complete.
    releaseCatalog();
    const first = structured(await firstPromise);
    expect(first.paid_execution_authorized).toBe(true);

    // At most one paid endpoint fetch, exactly one X-API-Key send, one cap debit.
    const selectionsCalls = pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH);
    expect(selectionsCalls).toHaveLength(1);
    expect(selectionsCalls.filter(([, init]) => hasApiKey(init))).toHaveLength(1);
    expect(first.mcp_metadata.local_budget_cap_status.paid_calls_this_session).toBe(1);

    await client.close();
    await server.close();
  });

  it("releases the in-flight reservation on a pre-billable failure so a later retry is not permanently blocked", async () => {
    // First catalog read fails reconciliation; the second (identical) call must
    // NOT be blocked as a repeat, because the first never reached a billable
    // attempt and released its reservation.
    let catalogCall = 0;
    const fetchFn = routedFetch({
      catalog: () => {
        catalogCall += 1;
        return catalogCall === 1 ? jsonResponse({ detail: "down" }, 503) : jsonResponse(validCatalogBody());
      }
    });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { limit: 25 } }));
    expect(first.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(first.api_request_sent).toBe(false);

    const second = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { limit: 25 } }));
    expect(second.error).toBeUndefined();
    expect(second.paid_execution_authorized).toBe(true);
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });

  it("keeps a signature executed after a deterministic API error so an identical retry is not re-billed", async () => {
    const fetchFn = routedFetch({ latest: () => jsonResponse({ detail: "boom" }, 500) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const first = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { limit: 25 } }));
    expect(first.error.error_code).toBe("api_request_failed");
    expect(first.api_request_sent).toBe(true);

    const second = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: { limit: 25 } }));
    expect(second.error.error_code).toBe("repeated_identical_selection_call");
    expect(second.api_request_sent).toBe(false);
    // Only the first (failed) attempt reached the endpoint; the retry is not re-billed.
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(1);

    await client.close();
    await server.close();
  });
});

describe("Phase 5C selections — catalog reconciliation gate", () => {
  it.each([
    { label: "catalog unavailable", catalog: () => jsonResponse({ detail: "down" }, 503) },
    {
      label: "selections cost differs from static mirror",
      catalog: () => jsonResponse({ rules: [catalogRule("selections_latest_paid", "/v1/selections/latest", 0.99)] })
    },
    { label: "selections rule missing", catalog: () => jsonResponse({ rules: [catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025)] }) },
    {
      label: "selections unit is USD with matching cost",
      catalog: () =>
        jsonResponse({
          rules: [{ pricing_rule_id: "selections_latest_paid", endpoint_pattern: "/v1/selections/latest", endpoint_family: "selections", stc_cost: 0.05, cost_unit: "USD" }]
        })
    },
    {
      label: "selections unit field is absent",
      catalog: () =>
        jsonResponse({ rules: [{ pricing_rule_id: "selections_latest_paid", endpoint_pattern: "/v1/selections/latest", endpoint_family: "selections", stc_cost: 0.05 }] })
    },
    {
      label: "selections unit fields conflict (cost_unit vs unit)",
      catalog: () =>
        jsonResponse({
          rules: [{ pricing_rule_id: "selections_latest_paid", endpoint_pattern: "/v1/selections/latest", endpoint_family: "selections", stc_cost: 0.05, cost_unit: "STC", unit: "USD" }]
        })
    },
    {
      label: "selections rule has the wrong endpoint_family",
      catalog: () =>
        jsonResponse({
          rules: [{ pricing_rule_id: "selections_latest_paid", endpoint_pattern: "/v1/selections/latest", endpoint_family: "selections_published", stc_cost: 0.05, unit: "STC" }]
        })
    },
    {
      label: "selections rule is missing endpoint_family",
      catalog: () =>
        jsonResponse({
          rules: [{ pricing_rule_id: "selections_latest_paid", endpoint_pattern: "/v1/selections/latest", stc_cost: 0.05, unit: "STC" }]
        })
    },
    {
      label: "selections rule access_type is not paid",
      catalog: () =>
        jsonResponse({
          rules: [{ pricing_rule_id: "selections_latest_paid", endpoint_pattern: "/v1/selections/latest", endpoint_family: "selections", access_type: "free", stc_cost: 0.05, unit: "STC" }]
        })
    },
    {
      label: "selections rule requires_payment is false",
      catalog: () =>
        jsonResponse({
          rules: [{ pricing_rule_id: "selections_latest_paid", endpoint_pattern: "/v1/selections/latest", endpoint_family: "selections", requires_payment: false, stc_cost: 0.05, unit: "STC" }]
        })
    },
    {
      label: "duplicate/ambiguous selections rule",
      catalog: () =>
        jsonResponse({
          rules: [catalogRule("selections_latest_paid", "/v1/selections/latest", 0.05), catalogRule("selections_latest_paid", "/v1/selections/latest", 0.05)]
        })
    }
  ])("denies before auth/fetch when $label", async ({ catalog }) => {
    const fetchFn = routedFetch({ catalog });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("failed");
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(0);
    for (const [, init] of fetchFn.mock.calls) {
      expect(hasApiKey(init)).toBe(false);
    }

    await client.close();
    await server.close();
  });

  it("succeeds when the catalog carries only the selections rule (family-scoped; other families are irrelevant)", async () => {
    const fetchFn = routedFetch({
      catalog: () => jsonResponse({ rules: [catalogRule("selections_latest_paid", "/v1/selections/latest", 0.05)] })
    });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.paid_execution_authorized).toBe(true);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("reconciled");

    await client.close();
    await server.close();
  });

  it("succeeds when the selections rule carries the correct endpoint_family and paid classification fields", async () => {
    const fetchFn = routedFetch({
      catalog: () =>
        jsonResponse({
          rules: [
            {
              pricing_rule_id: "selections_latest_paid",
              endpoint_pattern: "/v1/selections/latest",
              endpoint_family: "selections",
              access_type: "paid",
              requires_payment: true,
              stc_cost: 0.05,
              cost_unit: "STC"
            }
          ]
        })
    });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.paid_execution_authorized).toBe(true);
    expect(body.mcp_metadata.pricing_reconciliation.status).toBe("reconciled");

    await client.close();
    await server.close();
  });

  it.each([
    { label: "only ST-IM rules present", rules: [catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025), catalogRule("stim_history_paid", "/v1/stim/history", 0.0075)] },
    {
      label: "only indicators rules present",
      rules: [catalogRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035), catalogRule("indicators_history_paid", "/v1/indicators/history", 0.01)]
    },
    {
      label: "only published selections rules present",
      rules: [
        catalogRule("selections_published_latest_paid", "/v1/selections/published/latest", 0.075),
        catalogRule("selections_published_history_paid", "/v1/selections/published/history", 0.2)
      ]
    }
  ])("fails closed for base selections when the catalog has $label but not the base selections rule", async ({ rules }) => {
    const fetchFn = routedFetch({ catalog: () => jsonResponse({ rules }) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    const body = structured(await client.callTool({ name: SELECTIONS_LATEST_TOOL_NAME, arguments: {} }));

    expect(body.error.error_code).toBe("pricing_catalog_reconciliation_failed");
    expect(pathCalls(fetchFn, SELECTIONS_LATEST_ENDPOINT_PATH)).toHaveLength(0);

    await client.close();
    await server.close();
  });
});

describe("Phase 5C selections — public safety regression", () => {
  it("keeps public resources credential-free while the selections tool is enabled", async () => {
    const fetchFn = routedFetch({ other: () => jsonResponse({ ok: true }) });
    const { client, server } = await connectMcp(fetchFn, EXEC_ENV);

    await client.readResource({ uri: "stocktrends://api/openapi" });
    const openapiCall = fetchFn.mock.calls.find(([url]) => url.pathname === "/v1/openapi.json");
    expect(openapiCall?.[1].headers).toEqual(PUBLIC_HEADERS);

    await client.close();
    await server.close();
  });
});

// --- Fetch routing: catalog + credential-bearing selections fetch ---

interface FetchRoutes {
  catalog?: (url: URL) => Response | Promise<Response>;
  latest?: (url: URL) => Response | Promise<Response>;
  other?: (url: URL) => Response | Promise<Response>;
}

function routedFetch(routes: FetchRoutes = {}): ReturnType<typeof vi.fn<FetchLike>> {
  return vi.fn<FetchLike>(async (url) => {
    switch (url.pathname) {
      case "/v1/pricing/catalog":
        return (routes.catalog ?? (() => jsonResponse(validCatalogBody())))(url);
      case "/v1/selections/latest":
        return (routes.latest ?? (() => jsonResponse(selectionsBody(), 200, SELECTIONS_HEADERS)))(url);
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

function endpointFamilyForRule(pricingRuleId: string): string {
  if (pricingRuleId.startsWith("indicators")) return "indicators";
  if (pricingRuleId.startsWith("selections_published")) return "selections_published";
  if (pricingRuleId.startsWith("selections")) return "selections";
  return "stim";
}

function catalogRule(pricingRuleId: string, endpointPattern: string, stcCost: number): Record<string, unknown> {
  return { pricing_rule_id: pricingRuleId, endpoint_pattern: endpointPattern, endpoint_family: endpointFamilyForRule(pricingRuleId), stc_cost: stcCost, unit: "STC" };
}

function validCatalogBody(): Record<string, unknown> {
  return {
    rules: [
      catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025),
      catalogRule("stim_history_paid", "/v1/stim/history", 0.0075),
      catalogRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035),
      catalogRule("indicators_history_paid", "/v1/indicators/history", 0.01),
      catalogRule("selections_latest_paid", "/v1/selections/latest", 0.05),
      catalogRule("selections_published_latest_paid", "/v1/selections/published/latest", 0.075),
      catalogRule("selections_published_history_paid", "/v1/selections/published/history", 0.2)
    ]
  };
}

function selectionsBody(rows?: Array<Record<string, unknown>>): Record<string, unknown> {
  return {
    request_id: "req-selections-latest-1",
    universe: "base_stim_selection",
    count: rows?.length ?? 2,
    data: rows ?? [
      { symbol_exchange: "IBM-N", prob13wk: 0.71 },
      { symbol_exchange: "AAPL-Q", prob13wk: 0.63 }
    ]
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
