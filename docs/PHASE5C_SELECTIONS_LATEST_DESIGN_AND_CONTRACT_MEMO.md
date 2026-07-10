# Phase 5C `selections/latest` Design and Contract Verification Memo

Design date: 2026-07-10

Status: **Design / contract verification memo only.** This memo verifies the
front-facing API contract for the next selected paid capability
(`selections/latest`) and designs the broad-sweep/limit-safety controls,
base-vs-published contract, tool-naming proposal, security-model changes, and
test surface a **later, separately reviewed** implementation PR must satisfy. It
authorizes **no implementation**. No `src/` change, no `tests/` change, no
`package.json` / `package-lock.json` change, no MCP tool added, no MCP resource
added, no MCP prompt added, no auth-capable allowlist promotion, no paid endpoint
call, no MCP Inspector session, and no API key used, requested, inspected,
printed, logged, or stored is performed or authorized by this memo. The only
non-`docs/` change is one optional documentation-index link in `README.md`, which
changes no runtime behavior.

The public metadata checks in §2 were performed **credential-free** (no
`X-API-Key`, no `Authorization`, no payment header) against the two
already-documented public endpoints `GET /v1/openapi.json` and
`GET /v1/pricing/catalog`. No paid selections endpoint was called; no key was
used.

This memo builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §5, §7, §8 (paid-call safety,
  runaway-loop and broad-sweep controls, rate/spend control), §15 (paid ST-IM and
  indicators live execution), §15.7 (narrowed credential-bearing allowlist), and
  §15.8 (internal credential-free resolver).
- [`PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md)
  — the decision memo (PR #43) that selected `selections/latest` as the next
  capability and defined, in its §9, the blockers this memo must clear.
- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) — the
  read-only capability audit, including the base-vs-published distinction and the
  additional selections candidates.
- [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
  §7 — the recorded `/v1/selections/latest` route contract and deferral rationale.
- [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  — the completed, twice-proven gated paid-adapter pattern this family extends.

## 0. Decision (read first)

**The `selections/latest` contract is CLEARED by public verification.** Every
contract fact the Phase 5C decision memo §9 required — endpoint availability and
pairing, auth scheme, the exact pricing rule id / cost / unit, request parameters
with defaults and hard limits, and the base-vs-published distinction — is now
**publicly verified credential-free** (§2–§7 below).

`selections/latest` is therefore **implementation-ready at the contract level**,
but implementation remains **gated on non-contract prerequisites that are the
implementation PR's job, not this memo's**:

1. the SECURITY_MODEL changes in §11 (auth-capable allowlist promotion of the
   selected selections route, plus a new selections broad-sweep/limit-safety
   subsection), which must land **before or with** the implementation; and
2. adoption of the broad-sweep/limit-safety design in §9 and the base-vs-published
   framing in §7–§8.

No blocker in §13 is a *contract* blocker. The recommended next PR (§14) is the
**mock-only implementation foundation**, not another clarification memo.

This memo does **not** itself authorize that implementation; PR #45 remains a
separate, reviewed step.

## 1. Current Phase 5C decision context

- Phase 4 proved the first paid family (ST-IM latest/history); Phase 5B proved a
  second (indicators latest/history) plus the internal credential-free instrument
  resolver, and is signed off for controlled operator use (PR #42, `main`
  `9d89e2a`). `main` includes the Phase 5C decision memo (PR #43, `ddbd5b5`).
- **Default/free mode = exactly one tool** (`stocktrends_estimate_workflow_cost`);
  **paid-exposed mode = exactly five tools** (planning + ST-IM pair + indicators
  pair). Zero MCP prompts. Public resources credential-free in every mode.
- The credential-bearing allowlist (§15.7) is **exactly four routes**:
  `/v1/stim/latest`, `/v1/stim/history`, `/v1/indicators/latest`,
  `/v1/indicators/history`. Any selections route is denied
  `endpoint_not_allowlisted` until an explicit, separately reviewed promotion.
- The Phase 5C decision memo selected **candidate A — `selections/latest`** as the
  next paid family, explicitly because it is the next *confirmed* paid family and
  the smallest safe delta from the twice-proven pattern, but flagged two
  distinctive new risks to resolve **before any code**: (a) **broad-sweep / list
  misuse** (selections is the first list/universe-returning paid family), and
  (b) **base-vs-published ambiguity**. This memo resolves both.
- Selections is **exchange-scoped, not symbol-keyed on input** for the latest
  route, so the §15.8 instrument-resolution prerequisite does **not** gate it.
  The new prerequisite is **limit / broad-sweep safety**, designed in §9.

## 2. Public metadata checks performed (credential-free)

Both checks were credential-free reads of already-documented public endpoints and
returned `HTTP 200`. No key, no paid call, no Inspector.

| Check | Endpoint | Result |
| --- | --- | --- |
| OpenAPI contract | `GET /v1/openapi.json` | `200`, `openapi: 3.1.0`, `info.version 1.0.0`, single server `url: /v1`. All four selections routes present. |
| Pricing catalog | `GET /v1/pricing/catalog` | `200`, `planning_role` catalog with a `rules` array; all four selections pricing rules present with `cost_unit: "STC"`. |

The OpenAPI `servers` block is `[{ "url": "/v1" }]`, so the document's `/selections/*`
paths resolve to `/v1/selections/*` at call time. Response bodies were inspected
locally; no secret was involved and none is reproduced here.

## 3. Endpoint availability and pairing (verified)

All four selections routes exist as front-facing `v1` GET routes (OpenAPI
`paths`):

| Route (with `/v1` server prefix) | OpenAPI summary | Method |
| --- | --- | --- |
| `GET /v1/selections/latest` | "Latest base ST-IM selection universe" | `GET` |
| `GET /v1/selections/history` | "Historical base ST-IM selection universe records" | `GET` |
| `GET /v1/selections/published/latest` | "Latest published STIM Select list" | `GET` |
| `GET /v1/selections/published/history` | "Historical published STIM Select records" | `GET` |

- A fifth related route exists — `GET /v1/selections/stim-select/outcomes/summary`
  — and is **out of scope** for this family; it is not proposed here.
- **Pairing decision.** Ship **`selections/latest` alone first.** Although
  `selections/history` is now confirmed to exist (resolving the Phase 5C open
  question about whether history exists as a front-facing route), the
  history-beside-latest pairing rule used for ST-IM/indicators is a
  *single-symbol* convenience rule; for a **universe/list** family, adding history
  in the same increment **multiplies the broad-sweep surface** (history caps scale
  to `5200` rows; see §9) before the latest limit-safety design is proven in
  practice. History pairing should be a **follow-on** increment once the
  latest-only limit controls are validated. `selections/latest` is not
  symbol-keyed, so shipping it without its history sibling does not create the
  latest-only interpretation gap the audit warns about for single-symbol tools.
- **Published routes exist but are deferred** — see §8.

## 4. Auth requirement (verified)

- `GET /v1/selections/latest` advertises `security: [{ApiKeyAuth: []}, {BearerAuth: []}]`.
- **MCP uses `X-API-Key` only.** Consistent with SECURITY_MODEL §3 and §15.2, the
  adapter sends `X-API-Key` and **never** `Authorization: Bearer`, even though the
  API advertises `BearerAuth`. No payment header, no x402, no wallet.
- The pricing rule confirms `requires_payment: true`, `requires_subscription: false`,
  `supported_rails: [subscription, x402, mpp]`. The MCP path uses the
  **subscription** rail only (`X-API-Key`); x402 and mpp remain deferred.
- **Allowlist status: NOT yet promoted.** `/v1/selections/latest` is not on the
  auth-capable allowlist (§15.7), so today it fails closed
  `endpoint_not_allowlisted` with no header and no fetch. Promotion is an explicit
  implementation-PR step (§11), not authorized here.

## 5. Pricing rule, cost, and unit (verified from catalog)

From `GET /v1/pricing/catalog` (credential-free), the selections family rules are:

| `pricing_rule_id` | `endpoint_pattern` | `endpoint_family` | `access_type` | `stc_cost` | `cost_unit` | `requires_payment` |
| --- | --- | --- | --- | --- | --- | --- |
| **`selections_latest_paid`** | `/v1/selections/latest` | `selections` | `paid` | **`0.05`** | **`STC`** | `true` |
| `selections_history_paid` | `/v1/selections/history` | `selections` | `paid` | `0.15` | `STC` | `true` |
| `selections_published_latest_paid` | `/v1/selections/published/latest` | `selections_published` | `paid` | `0.075` | `STC` | `true` |
| `selections_published_history_paid` | `/v1/selections/published/history` | `selections_published` | `paid` | `0.2` | `STC` | `true` |

Verified facts for the selected route:

- **Rule id:** `selections_latest_paid`. **Cost:** `0.05 STC` per request
  (`cost_per_request`, `stc_cost`, and `estimated_usd_cost` all `0.05`).
  **Unit:** `STC` (`cost_unit` present and equal to the mandatory verified unit).
- The cost is **nonzero**, so — exactly as for ST-IM/indicators — a covering STC
  budget cap is effectively **mandatory**; there is no zero-cost path.
- **Family scoping is a real distinction in the catalog:** base selections rules
  carry `endpoint_family: "selections"`, published rules carry
  `endpoint_family: "selections_published"`. Reconciliation must be **scoped to the
  `selections` rule group**; ST-IM, indicators, and `selections_published` state
  must never gate or satisfy a base-selections call.
- The implementation must build a **fresh, family-specific static pricing mirror**
  for `selections_latest_paid = 0.05 STC` and fail closed
  (`pricing_catalog_reconciliation_failed`) on any missing/duplicate rule,
  cost mismatch, or missing/unsupported/conflicting unit — reusing the
  `reconcileStaticPricingWithCatalog` posture. The ST-IM and indicators mirrors do
  **not** transfer.

## 6. Request parameters, defaults, and hard limits (verified from OpenAPI)

`GET /v1/selections/latest` query parameters (all optional; no required input, no
path parameter):

| Parameter | Type | API default | API bounds | Notes |
| --- | --- | --- | --- | --- |
| `exchange` | string | none | — | Optional exchange scope. |
| `min_prob13wk` | number | none | — | API-side threshold filter; **passed to the API, never applied locally as a second ranking pass**. |
| `limit` | integer | **`2000`** | **min `1`, max `20000`** | Row ceiling. **This is the broad-sweep surface** (see §9). |
| `include_data` | boolean | `false` | — | Expands per-row data. |
| `include_mast` | boolean | `false` | — | Expands per-row master data. |
| `cs_only` | boolean | `true` | — | Common-shares-only filter. |

The route also declares shared header parameters via `$ref`
(`StockTrendsAgentId/Type/Vendor/Version`, `StockTrendsRequestPurpose`,
`StockTrendsSessionId`, and `StockTrendsPayment*`). The MCP adapter sends **none**
of the `StockTrendsPayment*` headers (no payment behavior) and treats the agent
headers as out of scope for this increment.

**Critical finding:** the API's own default `limit` is **`2000`** and its hard max
is **`20000`**. Omitting `limit` therefore requests a 2000-row universe slice by
default, and a caller may request up to 20000 rows. This is precisely the
broad-sweep exposure SECURITY_MODEL §7–§8 calls out, and it is why the MCP must
impose its own far tighter caps (§9) and **must never omit `limit`**.

## 7. Response schema and base-vs-published contract (verified)

- **Response schema.** The `200` response for `GET /v1/selections/latest` declares
  `content.application/json.schema: {}` — i.e. **no constraining response model**
  (an unconstrained JSON object), the same "no Pydantic response model" pattern
  confirmed for ST-IM and indicators. There is therefore no publicly enumerable
  field list to validate against; the adapter must **preserve the API payload
  verbatim** in `api_data` and must not synthesize or reshape rows. `422` returns
  the standard `HTTPValidationError`.
- **Base-vs-published (now definitively resolved by verification).** The two
  routes are distinct front-facing endpoints with distinct summaries and distinct
  pricing families:
  - `GET /v1/selections/latest` → **"Latest base ST-IM selection universe"**
    (`endpoint_family: selections`). It returns the **base** ST-IM selection
    universe ranked by `prob13wk`, **not** the strict published STIM Select list.
    Its `min_prob13wk` has **no default** (unfiltered unless the caller supplies
    one).
  - `GET /v1/selections/published/latest` → **"Latest published STIM Select list"**
    (`endpoint_family: selections_published`). Its OpenAPI defaults encode the
    **published STIM Select thresholds**: `min_prob13wk 0.55`, `min_x4wk1 0.0`,
    `min_x13wk1 2.19`, `min_x40wk1 6.45`. These threshold defaults are the concrete
    difference between the base universe and the published list.
- **Contract statement for the tool.** The `selections/latest` tool surfaces the
  **base ST-IM selection universe**. Its description **must** state plainly that
  this is the base universe, **not** the strict published STIM Select list, and
  that the published list is a **separate** endpoint (`/v1/selections/published/latest`)
  applying the thresholds above. The adapter must **not** present base rows as the
  published list and must **not** apply the published thresholds locally.

## 8. Published selections endpoints — exist; deferred this increment

Both `/v1/selections/published/latest` and `/v1/selections/published/history`
**exist** as confirmed paid routes with confirmed pricing rules
(`selections_published_latest_paid 0.075 STC`,
`selections_published_history_paid 0.2 STC`, family `selections_published`).

**Decision: defer the published routes to a later increment.** Rationale:

- They are a **distinct pricing family** (`selections_published`) requiring their
  own family-scoped static mirror and reconciliation — not satisfiable by the base
  `selections` mirror.
- The published-history route carries the largest broad-sweep surface in the whole
  family (`limit` default `5200`, **max `50000`**), and the published-latest route
  shares the base `20000` max. Introducing them alongside the base latest route
  before base limit-safety is proven multiplies the misuse surface.
- Deferring them keeps this increment the **smallest safe delta**: one route, one
  new pricing rule, one new allowlist entry. The base-vs-published *distinction*
  is fully documented now (§7) so agents are not misled in the interim.

The published pair (and base history) become candidate follow-on increments once
base `selections/latest` limit-safety is implemented, mock-tested, and validated.

## 9. Broad-sweep / limit-safety design (the central new control)

Because `selections/latest` returns a **list/universe** rather than a single row,
cap semantics differ from the single-symbol tools and must be **designed, not
inherited**. The following is the design the implementation PR must adopt; all
values are MCP-side policy far tighter than the API's own `2000`/`20000`.

1. **Safe default MCP `limit` = `50`.** When the caller omits `limit`, the adapter
   sends an explicit `limit=50` — it **never** omits `limit` and therefore never
   lets the API's `2000` default apply.
2. **Hard maximum MCP `limit` = `250`.** Any caller-supplied `limit` is validated
   to the inclusive range `1`–`250` **before** preflight/auth/fetch; a value above
   `250` **fails closed** (validation error, no request), rather than being
   silently clamped. `250` is ~1.25% of the API's `20000` max — a deliberately
   small, bounded slice.
3. **No universe sweeps.** The adapter must never issue a call intended to retrieve
   the entire universe: `limit` is always present and always `≤ 250`; there is no
   "all rows" mode, no `limit=0`/`limit=-1` sentinel, and no way to request more
   than the hard max.
4. **No multi-call / bulk automation.** Exactly **one** `GET` per tool invocation.
   No pagination loop, no offset walking, no auto-iteration across exchanges, no
   background refresh, no assembling the universe from multiple bounded calls, no
   automatic retry (SECURITY_MODEL §5, §8; §15.5 no-retry posture).
5. **Call caps default to deny.** `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` and
   `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` default `0` (deny); live execution
   requires explicit nonzero values.
6. **Covering budget cap is mandatory.** The `0.05 STC` nonzero cost with no
   covering `STOCKTRENDS_MAX_STC_PER_SESSION` is denied `spend_cap_exceeded`
   before any auth/fetch. A USD cap applies where a USD cost is configured.
7. **Loop-detection posture.** Repeated identical selection calls (same
   `exchange`/`min_prob13wk`/`limit`/flags) within a session are treated as the
   runaway-loop surface of SECURITY_MODEL §7; the implementation should surface a
   deterministic denial/telemetry for repeated identical paid selection calls
   rather than silently re-billing.
8. **Row-count transparency.** The `mcp_metadata` should record the effective
   `limit` sent and the returned row count so an operator can see the call was
   bounded; this is metadata only and never a second ranking/thresholding pass.

The `min_prob13wk`, `include_data`, `include_mast`, `cs_only`, and `exchange`
inputs are validated and **passed through to the API**; none is applied locally.
`include_data`/`include_mast` default `false` (smaller rows) to keep payloads
bounded unless the caller opts in.

## 10. MCP tool-naming proposal (no implementation authorization)

Proposed name, consistent with the `stocktrends_get_<family>_<scope>` convention:

| Proposed MCP tool | Backing endpoint | Status |
| --- | --- | --- |
| `stocktrends_get_selections_latest` | `GET /v1/selections/latest` | **Proposed only** — not registered, not authorized by this memo. |

Reserved names for later increments (not proposed for implementation now):
`stocktrends_get_selections_history` (`/v1/selections/history`),
`stocktrends_get_selections_published_latest` (`/v1/selections/published/latest`),
`stocktrends_get_selections_published_history` (`/v1/selections/published/history`).

Registering `stocktrends_get_selections_latest` would bring the paid-exposed
surface from five tools to **six**; the default/free surface stays at **exactly
one**. No tool is added by this memo.

## 11. Required SECURITY_MODEL changes before implementation

Before (or with) the implementation PR, `docs/SECURITY_MODEL.md` must be updated —
these are prerequisites, not optional:

1. **Auth-capable allowlist promotion (§15.7).** Add `GET /v1/selections/latest`
   to `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` as an explicit, separately reviewed
   promotion, so it can receive an `X-API-Key` after all gates. Until then it is
   correctly denied `endpoint_not_allowlisted`. The public/base nature of the
   route does not exempt it: only the promoted route becomes auth-capable.
2. **New selections limit-safety subsection (extending §7/§8/§15).** Record the
   §9 design: safe default `limit 50`, hard max `limit 250`, always-present
   `limit`, no universe sweeps, one fetch per invocation / no bulk automation, no
   retry, call caps default-deny, mandatory covering STC budget, and loop-detection
   posture for repeated identical selection calls. State that selections cap
   semantics are **list-shaped** and do not inherit the single-symbol semantics.
3. **Family-scoped selections pricing statement (extending §15.3).** Record the
   `selections_latest_paid = 0.05 STC` static mirror, mandatory `cost_unit: STC`
   enforcement, and `selections`-family-scoped reconciliation that never
   transfers to/from `selections`, `selections_published`, `stim`, or `indicators`.
4. **Base-vs-published boundary statement (extending §6, prompt-injection/authority).**
   Record that `selections/latest` forwards the **base** universe verbatim, never
   the published list, and never re-ranks/re-thresholds/scores rows (ADR-002;
   MCP_SERVER_ARCHITECTURE no-recomputation rule).

No SECURITY_MODEL edit is made by this memo; it specifies what the implementation
PR must add.

## 12. Required tests for a future mock-only implementation

All tests **mock-only**; **no** live call, **no** real key, **no** x402, **no**
paid endpoint, **no** DB in CI. The implementation PR must add tests proving:

- **Surface:** default/free mode still exactly one tool; paid-exposed mode becomes
  exactly six tools (adds `stocktrends_get_selections_latest`); zero prompts in
  every mode; public resources still credential-free.
- **Limit safety:** omitted `limit` sends explicit `limit=50`; `limit` in `1`–`250`
  passes; `limit > 250`, `limit < 1`, non-integer, and any sentinel fail closed
  with **no request**; `limit` is always present on the outbound call.
- **Single fetch / no bulk:** exactly one `GET` per invocation; no pagination,
  no auto-iteration, no retry on `429`/`5xx` (fail closed).
- **Caps/budget:** call caps default `0` deny; nonzero `0.05 STC` cost with no
  covering STC budget denies `spend_cap_exceeded` before auth/fetch; repeated
  identical calls exercise the loop-detection posture.
- **Pricing reconciliation:** static mirror `selections_latest_paid = 0.05 STC`
  reconciles against a mocked catalog; missing/duplicate rule, cost mismatch, and
  missing/unsupported/conflicting `cost_unit` each fail closed
  `pricing_catalog_reconciliation_failed` with no auth/fetch; reconciliation is
  `selections`-family-scoped (an ST-IM/indicators/`selections_published` mirror
  never satisfies it).
- **Auth boundary:** `X-API-Key` only, constructed only inside the paid boundary
  for the promoted route after all gates; never `Authorization: Bearer`, never a
  payment header; public resources / catalog / planning tool never receive the key;
  the key never appears in logs, errors, denials, or returned data.
- **Verbatim forwarding / authority:** API rows preserved verbatim in `api_data`;
  no local ranking, thresholding, scoring, or base-vs-published relabeling;
  `mcp_metadata` carries provenance, the base-universe limitation note, effective
  `limit`, and returned row count; `observed_cost`/`payment_status` remain `null`
  unless the API returns them (never fabricated).
- **Base-vs-published:** the tool description asserts base-universe semantics and
  does not expose or apply the published thresholds.

## 13. Remaining blockers

No **contract** blockers remain — §3–§7 verified every fact the Phase 5C decision
memo §9 required. The remaining items are ordinary **implementation-phase
prerequisites**, tracked here so nothing is lost:

| # | Item | Type | Clears at |
| --- | --- | --- | --- |
| 1 | Auth-capable allowlist promotion of `/v1/selections/latest` (§11.1) | Security-model / code | Implementation PR |
| 2 | New selections limit-safety subsection in SECURITY_MODEL (§11.2) | Security-model | Implementation PR (with/ before code) |
| 3 | Fresh `selections`-family static pricing mirror + reconciliation (§5, §11.3) | Code | Implementation PR |
| 4 | Broad-sweep caps: default `50` / hard-max `250`, mandatory budget, loop posture (§9) | Code | Implementation PR |
| 5 | Base-vs-published tool description that cannot be conflated (§7, §11.4) | Code / docs | Implementation PR |
| 6 | Mock-only test suite (§12) | Tests | Implementation PR |
| 7 | Codex GPT-5.5 Extra High security review | Review | Before implementation merge |
| 8 | Controlled, operator-supervised validation plan + one-off live run | Ops | Later PRs (46–47), separately authorized |

None of items 1–8 is a reason to re-open contract verification; all are the normal
gated build/validate steps the Phase 4 / 5B cadence already proved.

## 14. Recommended next PR

**Recommended next PR: PR #45 — `selections/latest` implementation foundation
(mock-only).** Because the contract is cleared at the public metadata level (§0), the correct
next step may be the mock-only implementation foundation, provided PR #45 adopts
this memo's limit-safety, base-vs-published, SECURITY_MODEL, pricing, and test
requirements.

PR #45 scope, gated on adopting §9/§11/§12 of this memo:

- Register `stocktrends_get_selections_latest` (paid-exposed surface 5 → 6;
  default/free stays 1).
- Promote `/v1/selections/latest` into the auth-capable allowlist (§11.1) and add
  the SECURITY_MODEL selections subsections (§11.2–§11.4).
- Build the `selections`-family static pricing mirror (`0.05 STC`) with
  family-scoped catalog reconciliation and mandatory `STC` unit enforcement.
- Implement the §9 limit-safety controls (default `50`, hard max `250`,
  always-present `limit`, single fetch, no bulk/retry, default-deny caps,
  mandatory covering budget, loop posture).
- Preserve API rows verbatim; add base-universe / base-vs-published provenance in
  `mcp_metadata`; no local ranking/thresholding/scoring.
- Mock-only tests per §12. **No live validation, no real API key, no x402, no paid
  endpoint call, no MCP Inspector in this PR.**
- Codex GPT-5.5 Extra High security review before merge.

Then, per the Phase 5C cadence: PR #46 controlled validation plan, PR #47
completed controlled validation report (only if a one-off operator-authorized,
operator-supervised live run is separately approved, followed by rollback to
default free mode), PR #48 production-readiness signoff. Base `selections/history`
and the `selections_published` pair remain candidate follow-on increments (§8).

**No implementation is authorized by this memo.** PR #45 remains a separate,
reviewed step.

## 15. Boundaries reaffirmed (unchanged)

This memo reaffirms and does not relax: **no code implementation authorized; no
auth-capable allowlist promotion performed here; no live paid call; no API key; no
x402 / wallet / OAuth / `Authorization: Bearer` / payment header; no remote MCP; no
dynamic registration** from `/v1/ai/tools` or `/v1/workflows`; **zero prompts; no
investment advice; and no MCP-side ranking, thresholding, portfolio construction,
scoring, or recomputation** of selections, ST-IM, indicators, or intelligence
conclusions. The MCP server remains a thin local stdio adapter over the
front-facing Stock Trends API (ADR-002).
