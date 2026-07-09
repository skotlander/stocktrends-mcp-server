import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.js";
import {
  createPaidPricingReconciliationState,
  reconcileStaticPricingWithCatalog,
  resolveStaticEndpointPricing
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

    const result = await reconcileStaticPricingWithCatalog(client, state);

    expect(result).toMatchObject({ ok: true, reason: null, source: "pricing_catalog", cached: false });
    expect(state.reconciled).toBe(true);
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

    const result = await reconcileStaticPricingWithCatalog(client, state);

    expect(result).toMatchObject({ ok: false, reason: "cost_mismatch", source: "pricing_catalog", cached: false });
    expect(state.reconciled).toBe(false);
  });

  it("performs no auth-capable fetch when reconciliation fails — only the credential-free catalog read occurs", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(staleCatalogBody()));
    const client = buildClient(fetchFn);
    const state = createPaidPricingReconciliationState();

    await reconcileStaticPricingWithCatalog(client, state);

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

    const first = await reconcileStaticPricingWithCatalog(client, state);
    const second = await reconcileStaticPricingWithCatalog(client, state);

    expect(first.cached).toBe(false);
    expect(second).toMatchObject({ ok: true, cached: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed reconciliation, so a later successful catalog read can still pass", async () => {
    const state = createPaidPricingReconciliationState();
    const failingClient = buildClient(vi.fn<FetchLike>(async () => jsonResponse(staleCatalogBody())));
    const failed = await reconcileStaticPricingWithCatalog(failingClient, state);

    expect(failed.ok).toBe(false);
    expect(state.reconciled).toBe(false);

    const succeedingClient = buildClient(vi.fn<FetchLike>(async () => jsonResponse(correctedCatalogBody())));
    const passed = await reconcileStaticPricingWithCatalog(succeedingClient, state);

    expect(passed).toMatchObject({ ok: true, cached: false });
    expect(state.reconciled).toBe(true);
  });
});
