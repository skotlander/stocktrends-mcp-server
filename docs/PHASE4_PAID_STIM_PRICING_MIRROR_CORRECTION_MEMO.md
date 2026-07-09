# Phase 4 Paid ST-IM Pricing Mirror Correction Memo

## Status

**Documentation only.** This memo records a controlled live validation
preflight failure, explains why the failure is a safe fail-closed result, and
specifies the correction required in the implementation branch. No source,
test, or dependency files are changed by this memo. No live API call was made
or is authorized by this document.

This memo builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15 — the security model for paid
  ST-IM live execution.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved design and gate policy, including catalog reconciliation.
- [`PHASE4_PRICING_PREFLIGHT_FOUNDATION_IMPLEMENTATION_NOTES.md`](PHASE4_PRICING_PREFLIGHT_FOUNDATION_IMPLEMENTATION_NOTES.md)
  — how the static mirror and reconciliation gate were implemented.
- [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md)
  — the process this validation attempt followed.
- [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
  — the scaffold report this attempt was run against (remains a scaffold; see
  §7 below).

## 1. Purpose

During a supervised MCP Inspector controlled live validation session, the
paid ST-IM `latest` tool was exposed correctly by the server. The first
invocation of that tool, however, failed before any authenticated request was
built or sent, returning:

```
pricing_catalog_reconciliation_failed
```

This memo documents that failure, the evidence behind it, and why it is a
**safe fail-closed result** rather than a defect in the auth/spend gating
logic. The failure occurred entirely in the credential-free reconciliation
step that runs before auth-header construction and before any fetch to a
paid, auth-capable endpoint — no paid API request occurred as a result of
this attempt.

The root cause is a stale value in the local static pricing mirror, not a
flaw in the reconciliation or auth-gating design. This memo specifies the
correction required in a follow-up implementation branch; it does not apply
that correction itself.

## 2. Evidence

**Live public pricing catalog** (`GET /v1/pricing/catalog`, credential-free):

| Pricing rule id | Endpoint | Live catalog cost |
| --- | --- | --- |
| `stim_latest_paid` | `/v1/stim/latest` | `0.0025 STC` |
| `stim_history_paid` | `/v1/stim/history` | `0.0075 STC` |

**Local static pricing mirror** (currently in
[`src/paidPricing.ts`](../src/paidPricing.ts), `STATIC_ENDPOINT_PRICING`):

| Pricing rule id | Endpoint | Static mirror cost |
| --- | --- | --- |
| `stim_latest_paid` | `/v1/stim/latest` | `0.25 STC` (stale) |
| `stim_history_paid` | `/v1/stim/history` | `0.5 STC` (stale) |

**Reconciliation failure reason:** the static local pricing mirror did not
match the live pricing catalog cost for the `stim_latest_paid` rule
(`cost_mismatch`, per `PricingReconciliationFailureReason` in
[`src/paidPricing.ts`](../src/paidPricing.ts)). The static mirror amount is
100x the live catalog amount for both rules.

**MCP response confirmed the following, consistent with a preflight failure
before auth/fetch:**

- `paid_execution_authorized = false`
- `paid_execution_occurred = false`
- `api_request_sent = false`
- `auth_header_sent = false`
- `payment_header_sent = false`

No `X-API-Key` header was constructed. No request reached
`/v1/stim/latest` or `/v1/stim/history`. No payment/spend accounting occurred.

## 3. Architectural interpretation

- The live `/v1/pricing/catalog` is the **authoritative** source for pricing
  reconciliation. It is read credential-free, as metadata only.
- The local static pricing mirror (`STATIC_ENDPOINT_PRICING` in
  [`src/paidPricing.ts`](../src/paidPricing.ts)) is a **local safety mirror**,
  not an independent pricing authority. Its purpose is to provide a
  conservative, offline cost basis for local budget/cap checks — it must
  never be trusted on its own to authorize a paid call.
- By design, static pricing alone must never authorize a paid call. A paid
  ST-IM call is authorized only after the static mirror is reconciled against
  the live catalog (see `reconcileStaticPricingWithCatalog`).
- Any mismatch between the mirror and the catalog — missing rule, ambiguous
  rule, missing/mismatched cost, unsupported unit, or endpoint/rule-id
  mismatch — **must fail closed** before any `X-API-Key` auth header is
  constructed and before any fetch to an auth-capable endpoint occurs.
- The observed behavior in this validation attempt is exactly this design
  working as intended: a stale mirror value was detected via credential-free
  reconciliation, and execution failed closed before auth/fetch. **This
  validates the safety gate.** It is not evidence of a bug in the gating
  logic — it is evidence that the static mirror data itself is stale and
  needs correction.

## 4. Required implementation correction

The following correction is **specified here for a separate implementation
branch** and is **not applied by this memo**:

Update the static ST-IM paid pricing mirror
(`STATIC_ENDPOINT_PRICING` in [`src/paidPricing.ts`](../src/paidPricing.ts))
to match the live catalog:

| Pricing rule id | Corrected static amount |
| --- | --- |
| `stim_latest_paid` | `0.0025 STC` |
| `stim_history_paid` | `0.0075 STC` |

The following must be preserved exactly, unchanged:

- Pricing rule ids: `stim_latest_paid`, `stim_history_paid`.
- Endpoint mappings:
  - `stim_latest_paid` → `GET /v1/stim/latest`
  - `stim_history_paid` → `GET /v1/stim/history`
- Unit: `STC`.
- The reconciliation gate logic itself (`reconcileStaticPricingWithCatalog`,
  `reconcileRule`, and the associated failure reasons) — only the numeric
  static amounts are stale, not the mechanism that checks them.

## 5. Security boundaries to preserve

The implementation correction described in §4 must not, under any
circumstance, expand scope beyond a numeric pricing-value fix. Specifically:

- No broadening of auth-capable endpoints beyond the existing two.
- `X-API-Key` must continue to be sent only to:
  - `GET /v1/stim/latest`
  - `GET /v1/stim/history`
- Credential-free reconciliation against `/v1/pricing/catalog` remains
  mandatory before any paid auth/fetch — it must not be weakened, cached
  across server restarts, bypassed, or made optional.
- No x402, wallet, OAuth, Bearer-token, remote MCP, database, or
  control-plane behavior may be introduced.
- No automatic retries of failed reconciliation or failed paid calls.
- No fabrication of `observed_cost` values, in code, tests, or documentation.
- No investment advice generation, in code, tests, or documentation.

## 6. Test expectations for the later implementation branch

The implementation branch that applies the correction in §4 should:

- Update existing mock tests only as necessary to reflect the corrected
  static prices (`0.0025 STC` / `0.0075 STC`); it should not change test
  intent or coverage beyond what the corrected values require.
- Add or update tests proving:
  - The corrected static values match catalog-shaped mock metadata for both
    `stim_latest_paid` and `stim_history_paid` (successful reconciliation).
  - A mismatch between the static mirror and a mocked catalog still fails
    closed (`cost_mismatch`, or the applicable reason) after the correction
    is applied — i.e., the gate itself is still exercised and still works,
    not just bypassed by making the numbers agree.
  - No auth header is constructed and no fetch to `/v1/stim/latest` or
    `/v1/stim/history` occurs when reconciliation fails, mirroring the
    `paid_execution_authorized=false` / `api_request_sent=false` /
    `auth_header_sent=false` behavior observed in this validation attempt.
  - When reconciliation succeeds (mocked catalog agrees with the corrected
    mirror), execution proceeds to the next gate in the paid preflight chain
    (e.g., budget/cap checks), still fully mocked.
- All such tests must use mocked HTTP responses only. No live API calls are
  permitted in automated tests, consistent with the existing test suite's
  no-live-network policy.

## 7. Live validation implications

- The controlled live validation attempt referenced in this memo is
  **incomplete** — it stopped at the pricing reconciliation preflight and
  never reached auth/fetch for either the `latest` or `history` tool. The
  scaffold at
  [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
  remains unfilled and must not be marked as passed, confirmed, or completed
  on the basis of this attempt.
- Live validation must **not** be rerun until:
  1. The correction in §4 has been implemented on its own branch,
  2. That branch has been reviewed,
  3. It has been merged, and
  4. The MCP server has been rebuilt and restarted from the merged code.
- The next live validation attempt should restart from a clean session (no
  reuse of prior reconciliation state) and should perform **exactly one**
  `latest` call and **exactly one** `history` call, per the controlled
  validation plan's single-call-per-tool discipline.

## 8. Non-goals

This memo, and the branch it is committed on, explicitly do not:

- Make any source or runtime changes (`src/` is untouched).
- Make any test changes (`tests/` is untouched).
- Perform, simulate, or authorize any live validation or live API call.
- Redesign pricing policy, the reconciliation gate, or the paid preflight
  chain.
- Add any new tools.
- Add any additional paid endpoints.
- Introduce any x402, wallet, OAuth, Bearer-token, or remote MCP behavior.
