import type { PaidCostEstimate } from "./paidPolicy.js";
import type { JsonObject, StockTrendsClient } from "./stocktrendsClient.js";

// --- Static endpoint pricing policy (local catalog mirror) ---
//
// Live paid ST-IM execution authorizes on a STATIC, in-repo endpoint pricing
// policy PLUS a fail-closed reconciliation of that mirror against the live
// `/v1/pricing/catalog` metadata PLUS local caps (see
// PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md §8 and SECURITY_MODEL.md §15).
// This module resolves the static cost basis (no network) and, separately,
// reconciles it against the catalog (credential-free network read).
//
// IMPORTANT — the numeric amounts below are a conservative LOCAL STATIC MIRROR.
// They are NOT sufficient to authorize a paid call on their own: before any
// live auth header is built or any ST-IM fetch occurs, they must be reconciled
// against the live pricing catalog by `reconcileStaticPricingWithCatalog`. If
// the catalog is unavailable, malformed, ambiguous, or disagrees with the
// mirror (missing rule id, missing/mismatched cost, unsupported unit, mismatched
// endpoint/rule id), execution fails closed. The amounts are intentionally
// nonzero, which makes a configured budget cap effectively mandatory for these
// tools (there is no zero-cost path). The unit is STC.
//
// The version date lets the wrapper/notes record which static-policy snapshot
// was used, without implying a fetch occurred for the static resolution.
// Bumped to 2026-07-10 when the base `selections_latest_paid` mirror was added.
export const STATIC_PRICING_POLICY_VERSION = "2026-07-10";

// The public catalog resource path. Read credential-free (no X-API-Key) for
// metadata reconciliation only — never as an authorization source by itself.
export const PRICING_CATALOG_ENDPOINT_PATH = "/v1/pricing/catalog";
export const PRICING_CATALOG_RESOURCE_URI = "stocktrends://pricing/catalog";

export interface StaticEndpointPricingEntry {
  pricingRuleId: string;
  endpointPath: string;
  // Expected catalog `endpoint_family` for this rule. Reconciliation fails closed
  // if the catalog row's family is missing or not exactly this value, so a
  // catalog row with a correct rule id/path/cost/unit but the wrong family (e.g.
  // `selections_published` for the base `selections` rule) cannot reconcile.
  endpointFamily: string;
  amount: number;
  unit: "STC";
}

// Keyed by the catalog pricing rule id. Each entry also records the endpoint it
// prices, so reconciliation can verify the catalog assigns the same rule id to
// the same endpoint at the same cost/unit.
//
// The indicators values are a FRESH, family-specific static mirror confirmed
// against the live credential-free catalog in
// PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO §4 (`indicators_latest_paid`
// 0.0035 STC, `indicators_history_paid` 0.01 STC). The ST-IM values do NOT
// transfer to indicators and vice versa; each family carries its own mirror.
//
// The `selections_latest_paid` value is a FRESH, `selections`-family-specific
// static mirror confirmed against the live credential-free catalog in
// PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO §5 (`selections_latest_paid`
// 0.05 STC, `endpoint_family: selections`). It does NOT transfer to/from the
// ST-IM, indicators, or `selections_published` families; only the base
// `selections/latest` route is mirrored this increment (the published pair and
// base history remain deferred, per the memo §8).
const STATIC_ENDPOINT_PRICING: Readonly<Record<string, StaticEndpointPricingEntry>> = Object.freeze({
  stim_latest_paid: Object.freeze({ pricingRuleId: "stim_latest_paid", endpointPath: "/v1/stim/latest", endpointFamily: "stim", amount: 0.0025, unit: "STC" }),
  stim_history_paid: Object.freeze({ pricingRuleId: "stim_history_paid", endpointPath: "/v1/stim/history", endpointFamily: "stim", amount: 0.0075, unit: "STC" }),
  indicators_latest_paid: Object.freeze({ pricingRuleId: "indicators_latest_paid", endpointPath: "/v1/indicators/latest", endpointFamily: "indicators", amount: 0.0035, unit: "STC" }),
  indicators_history_paid: Object.freeze({ pricingRuleId: "indicators_history_paid", endpointPath: "/v1/indicators/history", endpointFamily: "indicators", amount: 0.01, unit: "STC" }),
  selections_latest_paid: Object.freeze({ pricingRuleId: "selections_latest_paid", endpointPath: "/v1/selections/latest", endpointFamily: "selections", amount: 0.05, unit: "STC" })
});

// The static rule-id groups a caller may ask to reconcile. Reconciliation is
// FAMILY-SCOPED: a paid ST-IM call reconciles only the ST-IM rules, a paid
// indicators call reconciles only the indicators rules, and a paid base
// selections call reconciles only the base `selections` rules, so one family's
// catalog state never gates the other.
export const STIM_PRICING_RULE_IDS: readonly string[] = Object.freeze(["stim_latest_paid", "stim_history_paid"]);
export const INDICATORS_PRICING_RULE_IDS: readonly string[] = Object.freeze(["indicators_latest_paid", "indicators_history_paid"]);
// Base `selections` family only. The `selections_published` family
// (`selections_published_latest_paid`, `selections_published_history_paid`) and
// base `selections_history_paid` are intentionally NOT included; a
// `selections_published`/ST-IM/indicators mirror can never satisfy base
// selections reconciliation.
export const SELECTIONS_PRICING_RULE_IDS: readonly string[] = Object.freeze(["selections_latest_paid"]);

// Resolve the static, authoritative cost basis for a paid endpoint pricing rule.
// Returns `null` when no static rule exists (ambiguous/missing pricing), which
// the preflight treats as `missing_pricing` and fails closed. The estimate is
// marked `pricing_catalog`-sourced because it mirrors the catalog rule cost; it
// carries `estimatedAt` (the static-policy version) rather than a `fetchedAt`,
// since no network fetch occurs for the static resolution.
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

// --- Catalog reconciliation gate (credential-free, fail-closed) ---

export type PricingReconciliationFailureReason =
  | "catalog_unavailable"
  | "catalog_malformed"
  | "rule_missing"
  | "rule_ambiguous"
  | "cost_missing"
  | "unsupported_unit"
  | "cost_mismatch"
  | "endpoint_mismatch"
  | "rule_id_mismatch"
  | "family_missing"
  | "family_mismatch"
  | "access_type_invalid"
  | "requires_payment_invalid";

export interface PricingReconciliationResult {
  ok: boolean;
  reason: PricingReconciliationFailureReason | null;
  detail: string | null;
  source: "pricing_catalog" | null;
  cached: boolean;
}

// Per-server reconciliation state. A successful reconciliation is cached for the
// lifetime of the server instance (the catalog is stable metadata; no hidden
// background refresh) and is tracked PER rule-id group, so reconciling one paid
// family (e.g. ST-IM) never marks another family (e.g. indicators) reconciled.
// Failures are NOT cached, so a transient catalog outage fails the current call
// closed but does not permanently poison the session.
export interface PaidPricingReconciliationState {
  reconciledGroups: Set<string>;
}

export function createPaidPricingReconciliationState(): PaidPricingReconciliationState {
  return { reconciledGroups: new Set<string>() };
}

function reconciliationGroupKey(pricingRuleIds: readonly string[]): string {
  return [...pricingRuleIds].sort().join("|");
}

// Reconcile the static local pricing mirror for a specific family of pricing
// rules against the live `/v1/pricing/catalog` metadata. Runs a single
// credential-free public read (no X-API-Key) and fails closed on any
// discrepancy. This is metadata reconciliation only — the catalog is never
// treated as an authorization source by itself; local caps and the full
// preflight still gate the call, and the auth header is constructed only after
// this reconciliation passes. `pricingRuleIds` scopes reconciliation to exactly
// the family being invoked (fail closed if any requested rule id has no static
// mirror).
export async function reconcileStaticPricingWithCatalog(
  client: StockTrendsClient,
  state: PaidPricingReconciliationState,
  pricingRuleIds: readonly string[]
): Promise<PricingReconciliationResult> {
  const groupKey = reconciliationGroupKey(pricingRuleIds);

  if (state.reconciledGroups.has(groupKey)) {
    return {
      ok: true,
      reason: null,
      detail: "Static pricing already reconciled against the live pricing catalog for this session.",
      source: "pricing_catalog",
      cached: true
    };
  }

  const specs: StaticEndpointPricingEntry[] = [];

  for (const pricingRuleId of pricingRuleIds) {
    const entry = STATIC_ENDPOINT_PRICING[pricingRuleId];

    if (!entry) {
      return fail("rule_missing", `No static pricing mirror is defined for rule ${pricingRuleId}.`);
    }

    specs.push(entry);
  }

  let data: JsonObject;

  try {
    // Credential-free read via the public fetch path (Accept + User-Agent only).
    const response = await client.fetchJson({
      endpointPath: PRICING_CATALOG_ENDPOINT_PATH,
      resourceUri: PRICING_CATALOG_RESOURCE_URI
    });
    data = response.data;
  } catch {
    return fail("catalog_unavailable", "The pricing catalog could not be fetched; live paid execution fails closed.");
  }

  const rules = extractCatalogRules(data);

  if (!rules) {
    return fail("catalog_malformed", "The pricing catalog response did not contain a usable rules array.");
  }

  for (const spec of specs) {
    const ruleResult = reconcileRule(rules, spec);

    if (!ruleResult.ok) {
      return ruleResult;
    }
  }

  state.reconciledGroups.add(groupKey);
  return {
    ok: true,
    reason: null,
    detail: "Static pricing reconciled against the live pricing catalog.",
    source: "pricing_catalog",
    cached: false
  };
}

function reconcileRule(rules: readonly unknown[], spec: StaticEndpointPricingEntry): PricingReconciliationResult {
  const entries = rules.filter((rule): rule is JsonObject => isJsonObject(rule) && rule.pricing_rule_id === spec.pricingRuleId);

  if (entries.length === 0) {
    return fail("rule_missing", `Pricing catalog is missing required rule ${spec.pricingRuleId}.`);
  }

  if (entries.length > 1) {
    return fail("rule_ambiguous", `Pricing catalog has ambiguous duplicate entries for rule ${spec.pricingRuleId}.`);
  }

  const entry = entries[0];
  const endpoint = readString(entry.endpoint_pattern) ?? readString(entry.endpoint_path);

  if (endpoint !== spec.endpointPath) {
    return fail("endpoint_mismatch", `Pricing catalog rule ${spec.pricingRuleId} endpoint did not match ${spec.endpointPath}.`);
  }

  // Any catalog entry that claims this endpoint but assigns a different rule id
  // is a rule-id/endpoint conflict — fail closed.
  const conflicting = rules.filter(
    (rule) =>
      isJsonObject(rule) &&
      (readString(rule.endpoint_pattern) === spec.endpointPath || readString(rule.endpoint_path) === spec.endpointPath) &&
      rule.pricing_rule_id !== spec.pricingRuleId
  );

  if (conflicting.length > 0) {
    return fail("rule_id_mismatch", `Pricing catalog assigns a different rule id to endpoint ${spec.endpointPath}.`);
  }

  // The catalog `endpoint_family` is mandatory and must be exactly the expected
  // family for this rule. A row with a correct rule id/path/cost/unit but a
  // missing or different family (e.g. `selections_published` for the base
  // `selections` rule) fails closed, so family scoping cannot be bypassed by a
  // mislabeled catalog row.
  const family = readString(entry.endpoint_family);

  if (family === undefined) {
    return fail("family_missing", `Pricing catalog rule ${spec.pricingRuleId} is missing the required endpoint_family (${spec.endpointFamily}).`);
  }

  if (family !== spec.endpointFamily) {
    return fail("family_mismatch", `Pricing catalog rule ${spec.pricingRuleId} endpoint_family ${family} did not match the required ${spec.endpointFamily}.`);
  }

  // Conservative paid-classification checks: only enforced when the catalog
  // actually exposes the field (documented for the paid rules in the contract
  // memos). An explicitly non-paid classification for a paid rule fails closed;
  // an absent field is not fabricated into a pass.
  const accessType = readString(entry.access_type);

  if (accessType !== undefined && accessType.toLowerCase() !== "paid") {
    return fail("access_type_invalid", `Pricing catalog rule ${spec.pricingRuleId} access_type ${accessType} is not the required paid classification.`);
  }

  if (typeof entry.requires_payment === "boolean" && entry.requires_payment !== true) {
    return fail("requires_payment_invalid", `Pricing catalog rule ${spec.pricingRuleId} requires_payment is not true.`);
  }

  // The catalog unit is mandatory and must be the verified STC unit. A missing
  // unit, an unsupported unit (e.g. USD), or conflicting `cost_unit`/`unit`
  // fields all fail closed — a matching numeric cost is never accepted without a
  // confirmed unit. This applies identically to every family (ST-IM, indicators).
  const unit = normalizeCatalogUnit(entry);

  if (unit === null) {
    return fail("unsupported_unit", `Pricing catalog rule ${spec.pricingRuleId} has a missing or conflicting unit; the verified ${spec.unit} unit is required.`);
  }

  if (unit !== spec.unit) {
    return fail("unsupported_unit", `Pricing catalog rule ${spec.pricingRuleId} unit ${unit} is not the supported ${spec.unit} unit for local budgeting.`);
  }

  const cost = readCatalogStcCost(entry);

  if (cost === null) {
    return fail("cost_missing", `Pricing catalog rule ${spec.pricingRuleId} is missing a non-negative numeric STC cost.`);
  }

  if (Math.abs(cost - spec.amount) > 1e-9) {
    return fail("cost_mismatch", `Pricing catalog rule ${spec.pricingRuleId} cost did not match the static local mirror.`);
  }

  return { ok: true, reason: null, detail: null, source: "pricing_catalog", cached: false };
}

function extractCatalogRules(data: JsonObject): readonly unknown[] | null {
  const candidate = data.rules ?? data.pricing_rules ?? data.catalog;
  return Array.isArray(candidate) ? candidate : null;
}

function readCatalogStcCost(entry: JsonObject): number | null {
  const value = entry.stc_cost ?? entry.cost_stc;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

// Normalize the catalog unit from the actual catalog shape, reading both the
// verified `cost_unit` field and the legacy `unit` field. Returns the
// upper-cased unit, or `null` when the unit is absent from both fields or the
// two fields disagree (a conflict that must fail closed).
function normalizeCatalogUnit(entry: JsonObject): string | null {
  const costUnit = readString(entry.cost_unit)?.toUpperCase();
  const unit = readString(entry.unit)?.toUpperCase();

  if (costUnit !== undefined && unit !== undefined && costUnit !== unit) {
    return null;
  }

  return costUnit ?? unit ?? null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(reason: PricingReconciliationFailureReason, detail: string): PricingReconciliationResult {
  return { ok: false, reason, detail, source: "pricing_catalog", cached: false };
}
