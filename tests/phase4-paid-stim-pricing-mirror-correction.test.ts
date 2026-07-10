import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.js";
import {
  createPaidPricingReconciliationState,
  INDICATORS_PRICING_RULE_IDS,
  reconcileStaticPricingWithCatalog,
  resolveStaticEndpointPricing,
  STIM_PRICING_RULE_IDS
} from "../src/paidPricing.js";
import { StockTrendsClient, type FetchLike } from "../src/stocktrendsClient.js";
import { jsonResponse } from "./helpers.js";

// Direct, unit-level coverage of the corrected static ST-IM pricing mirror
// (src/paidPricing.ts). Complements the end-to-end MCP tool coverage in
// phase4-paid-stim-live-execution.test.ts. All HTTP is mocked; no live network
// calls occur.

function catalogRule(pricingRuleId: string, endpointPattern: string, stcCost: number): Record<string, unknown> {
  return { pricing_rule_id: pricingRuleId, endpoint_pattern: endpointPattern, stc_cost: stcCost, unit: "STC" };
}

function correctedCatalogBody(): Record<string, unknown> {
  return {
    rules: [catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025), catalogRule("stim_history_paid", "/v1/stim/history", 0.0075)]
  };
}

function staleCatalogBody(): Record<string, unknown> {
  return {
    rules: [catalogRule("stim_latest_paid", "/v1/stim/latest", 0.25), catalogRule("stim_history_paid", "/v1/stim/history", 0.5)]
  };
}

// A catalog rule with an explicit unit field name/value, so unit enforcement can
// be exercised for both the verified `cost_unit` field and the legacy `unit`.
function catalogRuleWith(
  pricingRuleId: string,
  endpointPattern: string,
  stcCost: number,
  unitFields: Record<string, unknown>
): Record<string, unknown> {
  return { pricing_rule_id: pricingRuleId, endpoint_pattern: endpointPattern, stc_cost: stcCost, ...unitFields };
}

function indicatorsCatalogRule(pricingRuleId: string, endpointPattern: string, stcCost: number): Record<string, unknown> {
  return catalogRule(pricingRuleId, endpointPattern, stcCost);
}

function correctedIndicatorsCatalogBody(): Record<string, unknown> {
  return {
    rules: [
      indicatorsCatalogRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035),
      indicatorsCatalogRule("indicators_history_paid", "/v1/indicators/history", 0.01)
    ]
  };
}

function buildClient(fetchFn: FetchLike): StockTrendsClient {
  return new StockTrendsClient(parseConfig({ STOCKTRENDS_ENABLE_PAID_TOOLS: "true", STOCKTRENDS_API_KEY: "unit-test-secret" }), fetchFn);
}

describe("Phase 4 paid ST-IM pricing mirror correction — static values", () => {
  it("resolves the corrected static amount for stim_latest_paid (0.0025 STC)", () => {
    const estimate = resolveStaticEndpointPricing("stim_latest_paid");

    expect(estimate).toMatchObject({
      amount: 0.0025,
      unit: "STC",
      authoritative: true,
      pricingSource: "pricing_catalog",
      pricingRuleId: "stim_latest_paid"
    });
  });

  it("resolves the corrected static amount for stim_history_paid (0.0075 STC)", () => {
    const estimate = resolveStaticEndpointPricing("stim_history_paid");

    expect(estimate).toMatchObject({
      amount: 0.0075,
      unit: "STC",
      authoritative: true,
      pricingSource: "pricing_catalog",
      pricingRuleId: "stim_history_paid"
    });
  });

  it("returns null for an unknown pricing rule id", () => {
    expect(resolveStaticEndpointPricing("not_a_real_rule")).toBeNull();
  });
});

describe("Phase 4 paid ST-IM pricing mirror correction — catalog reconciliation", () => {
  it("reconciles successfully when the corrected static mirror matches catalog-shaped mock metadata for both rules", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(correctedCatalogBody()));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    const result = await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS);

    expect(result).toMatchObject({ ok: true, reason: null, source: "pricing_catalog", cached: false });
    expect(state.reconciledGroups.size).toBe(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    // Reconciliation is credential-free: no auth header is ever attached to the
    // catalog read itself.
    const [, init] = fetchFn.mock.calls[0];
    const headerKeys = Object.keys((init.headers as Record<string, string>) ?? {}).map((key) => key.toLowerCase());
    expect(headerKeys).not.toContain("x-api-key");
  });

  it("still fails closed on a cost mismatch after the correction (gate is exercised, not bypassed)", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(staleCatalogBody()));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    const result = await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS);

    expect(result).toMatchObject({ ok: false, reason: "cost_mismatch", source: "pricing_catalog", cached: false });
    expect(state.reconciledGroups.size).toBe(0);
  });

  it("performs no auth-capable fetch when reconciliation fails — only the credential-free catalog read occurs", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(staleCatalogBody()));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS);

    // Exactly one call (the catalog read); nothing was ever sent to the
    // auth-capable ST-IM endpoints, and no X-API-Key was constructed or sent.
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url.pathname).toBe("/v1/pricing/catalog");
    const headerKeys = Object.keys((init.headers as Record<string, string>) ?? {}).map((key) => key.toLowerCase());
    expect(headerKeys).not.toContain("x-api-key");
    expect(headerKeys).not.toContain("authorization");
  });

  it("caches a successful reconciliation for the session, allowing later calls to proceed without re-fetching", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(correctedCatalogBody()));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    const first = await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS);
    const second = await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS);

    expect(first.cached).toBe(false);
    expect(second).toMatchObject({ ok: true, cached: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed reconciliation, so a later successful catalog read can still pass", async () => {
    const state = createPaidPricingReconciliationState();
    const failingClient = buildClient(vi.fn<FetchLike>(async () => jsonResponse(staleCatalogBody())));
    const failed = await reconcileStaticPricingWithCatalog(failingClient, state, STIM_PRICING_RULE_IDS);

    expect(failed.ok).toBe(false);
    expect(state.reconciledGroups.size).toBe(0);

    const succeedingClient = buildClient(vi.fn<FetchLike>(async () => jsonResponse(correctedCatalogBody())));
    const passed = await reconcileStaticPricingWithCatalog(succeedingClient, state, STIM_PRICING_RULE_IDS);

    expect(passed).toMatchObject({ ok: true, cached: false });
    expect(state.reconciledGroups.size).toBe(1);
  });
});

describe("paid pricing catalog reconciliation — mandatory unit enforcement (both families)", () => {
  it("reconciles when the catalog uses the verified cost_unit=STC field", async () => {
    const body = {
      rules: [
        catalogRuleWith("indicators_latest_paid", "/v1/indicators/latest", 0.0035, { cost_unit: "STC" }),
        catalogRuleWith("indicators_history_paid", "/v1/indicators/history", 0.01, { cost_unit: "STC" })
      ]
    };
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(body));
    const state = createPaidPricingReconciliationState();

    const result = await reconcileStaticPricingWithCatalog(buildClient(fetchFn), state, INDICATORS_PRICING_RULE_IDS);
    expect(result.ok).toBe(true);
  });

  it("fails closed when an indicators catalog row declares cost_unit=USD with a matching numeric cost", async () => {
    const body = {
      rules: [
        catalogRuleWith("indicators_latest_paid", "/v1/indicators/latest", 0.0035, { cost_unit: "USD" }),
        catalogRuleWith("indicators_history_paid", "/v1/indicators/history", 0.01, { cost_unit: "STC" })
      ]
    };
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(body));
    const state = createPaidPricingReconciliationState();

    const result = await reconcileStaticPricingWithCatalog(buildClient(fetchFn), state, INDICATORS_PRICING_RULE_IDS);
    expect(result).toMatchObject({ ok: false, reason: "unsupported_unit" });
    expect(state.reconciledGroups.size).toBe(0);
  });

  it("fails closed when an indicators catalog row is missing any unit field", async () => {
    const body = {
      rules: [
        catalogRuleWith("indicators_latest_paid", "/v1/indicators/latest", 0.0035, {}),
        catalogRuleWith("indicators_history_paid", "/v1/indicators/history", 0.01, { cost_unit: "STC" })
      ]
    };
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(body));
    const state = createPaidPricingReconciliationState();

    const result = await reconcileStaticPricingWithCatalog(buildClient(fetchFn), state, INDICATORS_PRICING_RULE_IDS);
    expect(result).toMatchObject({ ok: false, reason: "unsupported_unit" });
  });

  it("fails closed when a catalog row has conflicting unit and cost_unit fields", async () => {
    const body = {
      rules: [
        catalogRuleWith("indicators_latest_paid", "/v1/indicators/latest", 0.0035, { unit: "STC", cost_unit: "USD" }),
        catalogRuleWith("indicators_history_paid", "/v1/indicators/history", 0.01, { cost_unit: "STC" })
      ]
    };
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(body));
    const state = createPaidPricingReconciliationState();

    const result = await reconcileStaticPricingWithCatalog(buildClient(fetchFn), state, INDICATORS_PRICING_RULE_IDS);
    expect(result).toMatchObject({ ok: false, reason: "unsupported_unit" });
  });

  it("fails closed when an ST-IM catalog row is missing its unit, even with a matching cost", async () => {
    const body = {
      rules: [
        catalogRuleWith("stim_latest_paid", "/v1/stim/latest", 0.0025, {}),
        catalogRuleWith("stim_history_paid", "/v1/stim/history", 0.0075, { unit: "STC" })
      ]
    };
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(body));
    const state = createPaidPricingReconciliationState();

    const result = await reconcileStaticPricingWithCatalog(buildClient(fetchFn), state, STIM_PRICING_RULE_IDS);
    expect(result).toMatchObject({ ok: false, reason: "unsupported_unit" });
  });
});

describe("paid pricing catalog reconciliation — family-scoped isolation (cross-family regression)", () => {
  it("a successful ST-IM reconciliation does NOT authorize indicators when indicators rules are missing", async () => {
    // Catalog contains only the ST-IM rules; indicators rules are absent.
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(correctedCatalogBody()));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    const stim = await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS);
    expect(stim.ok).toBe(true);

    // The indicators family must independently reconcile and fail closed — the
    // ST-IM success does not satisfy the indicators rule group.
    const indicators = await reconcileStaticPricingWithCatalog(client, state, INDICATORS_PRICING_RULE_IDS);
    expect(indicators).toMatchObject({ ok: false, reason: "rule_missing" });
    expect(state.reconciledGroups.size).toBe(1);
  });

  it("a successful indicators reconciliation does NOT authorize ST-IM when ST-IM rules are missing", async () => {
    // Catalog contains only the indicators rules; ST-IM rules are absent.
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(correctedIndicatorsCatalogBody()));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    const indicators = await reconcileStaticPricingWithCatalog(client, state, INDICATORS_PRICING_RULE_IDS);
    expect(indicators.ok).toBe(true);

    const stim = await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS);
    expect(stim).toMatchObject({ ok: false, reason: "rule_missing" });
    expect(state.reconciledGroups.size).toBe(1);
  });

  it("reconciles each family independently when the catalog carries both rule groups", async () => {
    const body = {
      rules: [
        catalogRule("stim_latest_paid", "/v1/stim/latest", 0.0025),
        catalogRule("stim_history_paid", "/v1/stim/history", 0.0075),
        catalogRule("indicators_latest_paid", "/v1/indicators/latest", 0.0035),
        catalogRule("indicators_history_paid", "/v1/indicators/history", 0.01)
      ]
    };
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(body));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    expect((await reconcileStaticPricingWithCatalog(client, state, STIM_PRICING_RULE_IDS)).ok).toBe(true);
    expect((await reconcileStaticPricingWithCatalog(client, state, INDICATORS_PRICING_RULE_IDS)).ok).toBe(true);
    expect(state.reconciledGroups.size).toBe(2);
  });
});
