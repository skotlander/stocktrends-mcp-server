import type { PaidCostEstimate } from "./paidPolicy.js";

// --- Static endpoint pricing policy (local catalog mirror) ---
//
// Live paid ST-IM execution authorizes on a STATIC, in-repo endpoint pricing
// policy plus local caps (see PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md
// §8). This module is the local mirror of the `/v1/pricing/catalog` rule costs
// for the two paid ST-IM rules. It performs NO network access: the cost basis
// is resolved entirely from these static entries.
//
// IMPORTANT — the numeric amounts below are a conservative LOCAL STATIC MIRROR
// and are NOT confirmed against the live pricing catalog. They exist so the
// pricing/preflight gate has an authoritative, deterministic cost basis for
// mock-only validation. Before any real live call, an operator must reconcile
// these against `/v1/pricing/catalog` (a drift check may be added later); until
// then live execution is exercised mock-only. The amounts are intentionally
// nonzero, which makes a configured budget cap effectively mandatory for these
// tools (there is no zero-cost path). The unit is STC.
//
// The version date lets the wrapper/notes record which static-policy snapshot
// authorized a decision without implying a network fetch occurred.
export const STATIC_PRICING_POLICY_VERSION = "2026-07-08";

export interface StaticEndpointPricingEntry {
  pricingRuleId: string;
  amount: number;
  unit: "STC";
}

// Keyed by the catalog pricing rule id used in PAID_ENDPOINT_POLICIES.
const STATIC_ENDPOINT_PRICING: Readonly<Record<string, StaticEndpointPricingEntry>> = Object.freeze({
  stim_latest_paid: Object.freeze({ pricingRuleId: "stim_latest_paid", amount: 0.25, unit: "STC" }),
  stim_history_paid: Object.freeze({ pricingRuleId: "stim_history_paid", amount: 0.5, unit: "STC" })
});

// Resolve the static, authoritative cost basis for a paid endpoint pricing rule.
// Returns `null` when no static rule exists (ambiguous/missing pricing), which
// the preflight treats as `missing_pricing` and fails closed. The estimate is
// marked `pricing_catalog`-sourced because it mirrors the catalog rule cost; it
// carries `estimatedAt` (the static-policy version) rather than a `fetchedAt`,
// since no network fetch occurs.
export function resolveStaticEndpointPricing(pricingRuleId: string): PaidCostEstimate | null {
  const entry = STATIC_ENDPOINT_PRICING[pricingRuleId];

  if (!entry) {
    return null;
  }

  return {
    amount: entry.amount,
    unit: entry.unit,
    authoritative: true,
    pricingSource: "pricing_catalog",
    pricingRuleId: entry.pricingRuleId,
    estimatedAt: `${STATIC_PRICING_POLICY_VERSION}T00:00:00.000Z`
  };
}
