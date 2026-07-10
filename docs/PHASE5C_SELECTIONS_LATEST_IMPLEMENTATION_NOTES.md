# Phase 5C `selections/latest` Implementation Notes (Mock-Only Foundation)

Implementation date: 2026-07-10

Status: **Mock-only implementation foundation (PR #45).** This PR implements the
single selected route from the
[`PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md)
(PR #44): the paid base ST-IM selection-universe tool
`stocktrends_get_selections_latest` → `GET /v1/selections/latest`. It adopts the
memo's §9 limit-safety design, §7 base-vs-published contract, §11 SECURITY_MODEL
changes, §5 pricing/reconciliation requirements, and §12 test surface.

**No live API call, no real API key, no MCP Inspector session, and no paid
validation** is performed by this PR. All validation is mock-only. No
`selections/history`, no `selections/published/*`, no public selections resource,
and no MCP prompt is added.

## What was added

- **Tool.** `stocktrends_get_selections_latest` (`src/tools/selectionsTools.ts`),
  registered from `src/server.ts` behind the same exposure gate as the ST-IM /
  indicators families (paid-tools flag + configured API key). Registering it
  brings the **paid-exposed surface to exactly six tools**; the **default/free
  surface stays at exactly one** (`stocktrends_estimate_workflow_cost`) and there
  are **zero prompts** in every mode. Execution changes call behavior, not tool
  count.
- **Allowlist promotion.** `GET /v1/selections/latest` is promoted into
  `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` (`src/paidPolicy.ts`) so it can receive an
  `X-API-Key` only after every gate passes. The deferred selections routes
  (`/v1/selections/history`, `/v1/selections/published/latest`,
  `/v1/selections/published/history`) are **not** promoted and remain denied
  `endpoint_not_allowlisted`.
- **Pricing mirror.** A fresh `selections`-family static mirror
  `selections_latest_paid = 0.05 STC` (`src/paidPricing.ts`,
  `SELECTIONS_PRICING_RULE_IDS`). It reconciles credential-free and
  **family-scoped** against the live `/v1/pricing/catalog`; missing/duplicate
  rule, cost mismatch, or missing/unsupported/**conflicting** `STC` unit fails
  closed (`pricing_catalog_reconciliation_failed`). An
  ST-IM/indicators/`selections_published` mirror can never satisfy it.

## Behavior

- **Exchange-scoped, not symbol-keyed.** No instrument resolver is involved (the
  §15.8 resolver does not gate this family).
- **Inputs (strict, unknown keys rejected):** `exchange` (`N,Q,A,B,T,I`),
  `min_prob13wk` (`0`–`1`), `limit` (integer `1`–`250`, default `50`),
  `include_data` (default `false`), `include_mast` (default `false`), `cs_only`
  (default `true`). `min_prob13wk`, `exchange`, `cs_only`, and the `include_*`
  flags are passed through to the API only; none is applied locally.
- **Limit safety.** An explicit `limit` is **always sent** (default `50`, hard max
  `250`); out-of-range/non-integer/array/sentinel limits fail closed at the strict
  schema boundary before any pricing/auth/fetch and are never silently clamped.
  There is no universe-sweep mode. Exactly one `GET` per invocation — no
  pagination, auto-iteration, bulk assembly, or automatic retry.
- **Caps/budget.** Call caps default-deny; the `0.05 STC` nonzero cost requires a
  covering `STOCKTRENDS_MAX_STC_PER_SESSION` or the call is denied
  `spend_cap_exceeded` before auth/fetch.
- **Repeated-identical-call loop posture.** A per-server signature over the
  normalized parameters is recorded only when an authorized billable call is
  attempted; a subsequent identical call fails closed
  (`repeated_identical_selection_call`) before pricing/auth/fetch/cap debit,
  rather than silently re-billing. In-memory only; resets on restart.
- **Verbatim forwarding / authority.** API rows are preserved verbatim in
  `api_data`; no local ranking, thresholding, scoring, filtering, or
  base-vs-published relabeling. `mcp_metadata` records base-universe provenance,
  `effective_limit`, and the returned row count (metadata only).
  `observed_cost`/`payment_status` remain `null` and are never fabricated.
- **Base vs published.** The tool description and metadata state plainly that this
  is the base ST-IM selection universe, not the published STIM Select list
  (`/v1/selections/published/latest`), and the published thresholds are never
  applied locally.

## Tests

Mock-only tests in `tests/phase5c-selections-tools.test.ts` cover: the
free/default one-tool and paid-exposed six-tool surfaces; hidden-unless-paid;
execution-disabled fail-closed with no request/auth/cap debit; a successful
mocked execution sending exactly one `GET` to `/v1/selections/latest` with
`X-API-Key` only after all gates; the `0.05 STC` static price; catalog
reconciliation success/failure (including wrong/missing/conflicting unit and
duplicate rule); family-scoped reconciliation isolation from ST-IM, indicators,
and `selections_published`; default `limit=50`; accepted `1..250`; invalid limits
failing before pricing/auth/fetch; always-present `limit`; single fetch / no
retry; caps/budget denial before auth/fetch; the repeated-identical-call loop
posture; verbatim `api_data`; no local ranking/thresholding/scoring/conflation;
un-fabricated `observed_cost`/`payment_status`; and zero prompts. Existing
five-tool surface and non-allowlist placeholder tests were updated for the new
six-tool surface and the `selections/latest` promotion.

## Still deferred / out of scope (unchanged)

No live paid call, no real API key, no MCP Inspector, no paid validation, no
x402/wallet/OAuth, no `Authorization: Bearer`, no payment header, no remote MCP,
no dynamic registration, no database/control-plane access, and no MCP-side
ranking/thresholding/scoring/recomputation. Base `selections/history` and the
`selections_published` pair remain candidate follow-on increments. A separate
security review and, only under separate explicit operator authorization, any
controlled live validation follow this PR.
