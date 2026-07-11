# Phase 5C Selections/Latest Production Readiness Signoff

**Status: APPROVED for controlled local stdio operator use only — limited to
`stocktrends_get_selections_latest` backed by `GET /v1/selections/latest`.**

Signoff date: 2026-07-11

> **What this signoff is.** A narrow readiness declaration built on the
> already-merged, mock-validated, and once-controlled-live-validated Phase 5C
> selections/latest evidence chain (PRs #43–#47). It carries the base-selections
> capability from "implemented + mock-validated + controlled-live-validated" to
> "approved for **controlled local stdio operator use**," and nothing further. It
> is a documentation-only signoff: it weakens no boundary, adds no runtime
> behavior, and performs no validation of its own.
>
> **What this signoff is not.** It is **not** a new validation run, **not** a new
> implementation, and **not** a general production deployment procedure. It does
> **not** authorize remote MCP, public hosted MCP, autonomous or scheduled
> execution, autonomous agent execution, bulk/universe workflows, the
> `selections/history` or `selections/published/*` routes, public selections
> resources, or any x402/wallet/OAuth/Bearer/payment-header behavior. **No live
> API call is made by this document; no API key is used, requested, inspected,
> printed, logged, or stored; no MCP Inspector session is run; and no paid
> validation is performed to produce it.** Only `REDACTED` placeholders appear;
> no raw API payload and no secret-shaped value is reproduced.

This signoff builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §16 (paid `selections/latest` live
  execution), §15 (paid ST-IM and indicators live execution), §15.7 (the
  narrowed credential-bearing allowlist), and §5/§7/§8 (paid-call safety,
  runaway-loop and broad-sweep controls, rate/spend control) — the reconfirmed
  paid-mode security model.
- [`README.md`](../README.md) — the free/paid mode contract, the selections
  limit-safety summary, and the environment variable table.
- [`PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md)
  — the decision memo (PR #43) selecting `selections/latest`.
- [`PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md)
  — the design/contract verification memo (PR #44).
- [`PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md`](PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md)
  — the mock-only implementation foundation (PR #45).
- [`PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md)
  — the controlled validation plan (PR #46).
- [`PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md)
  — the completed controlled live validation report (PR #47), verdict **PASS
  WITH DEVIATIONS**.
- [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  — the twice-proven gated paid-adapter signoff pattern this one extends.
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the operator-facing preconditions and secret-safety scan.

## 1. Status

- **Phase 5C selections/latest is APPROVED for controlled local stdio operator
  use only.** It is ready for a manual, operator-initiated, operator-supervised
  run on the local stdio MCP server under the existing paid-mode gates and the
  selections limit-safety controls — and nothing broader.
- **Approval applies only to `stocktrends_get_selections_latest`** backed by
  `GET /v1/selections/latest` — the **base ST-IM selection universe**.
- **Approval does not apply to `selections/history`** or to any
  `selections/published/*` route (`/v1/selections/published/latest`,
  `/v1/selections/published/history`). Those remain deferred and denied
  `endpoint_not_allowlisted`.
- **Approval does not apply to remote MCP, public hosted MCP, autonomous or
  scheduled use, autonomous agent execution, or bulk/universe workflows.** Every
  gate, cap, credential rule, and fail-closed behavior in
  [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §16 (and §15) remains in force
  unchanged.

## 2. Evidence reviewed

The Phase 5C evidence chain is merged and consistent:

| PR | Contribution | State |
| --- | --- | --- |
| **#43** | Phase 5C next-capability selection memo — selected `selections/latest`; defined the §9 blockers a design/contract memo must clear. | Merged |
| **#44** | `selections/latest` design and contract verification memo — publicly (credential-free) verified endpoint/pairing, `X-API-Key`-only auth, the `selections_latest_paid = 0.05 STC` rule/unit, request parameters and hard limits, the base-vs-published contract, and the broad-sweep/limit-safety design. | Merged |
| **#45** | `selections/latest` mock-only implementation foundation — tool registration (paid-exposed surface 5 → 6), auth-capable allowlist promotion of `/v1/selections/latest` only, family-scoped `selections` pricing mirror, limit-safety controls, and the repeated-identical-call loop posture; mock-only tests. **No live call, no real key, no MCP Inspector.** | Merged |
| **#46** | Controlled validation plan — the one-off, operator-authorized, operator-supervised procedure, checklists, assertions, and report template. **No live run.** | Merged |
| **#47** | Completed controlled live validation report — a single operator-authorized live paid call, recorded exactly as observed. **Verdict: PASS WITH DEVIATIONS.** | Merged |

Supporting evidence:

- **SECURITY_MODEL.md updates.** §16 records the paid `selections/latest` live
  execution model: the paid-exposed six-tool surface (§16.1), the auth-capable
  allowlist promotion of the base route only (§16.2), the list-shaped
  broad-sweep/limit-safety controls (§16.3), the family-scoped `selections`
  pricing statement (§16.4), and the base-vs-published boundary (§16.5).
- **README operational guidance.** The README documents the free/default
  one-tool surface, the paid exposure-vs-execution split, the selections
  limit-safety summary (default `50`, hard max `250`, always-present `limit`,
  covering STC budget required, repeated-identical-call fail-closed), and the
  environment variable table.
- **Test suite status (from the PR #47 validation report §2 preconditions,
  recorded exactly as observed; not re-run here):** `npm run typecheck`
  **passed** (no errors); `npm test` **passed** — 14 test files, **311 tests
  passed**; `npm run build` **passed** (`dist/server.js` produced).
- **Validation report verdict: PASS WITH DEVIATIONS** (report §11). The
  deviations are procedural/deliberate and assessed non-blocking for controlled
  local stdio operator use (report §9; this signoff §4).

## 3. Validation result summary

Recorded from
[`PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md)
(PR #47) exactly as observed — **not re-run by this signoff**:

- **Default/free mode exposed exactly 1 tool** (`stocktrends_estimate_workflow_cost`).
- **Paid-exposed mode exposed exactly 6 tools** (planning + ST-IM pair +
  indicators pair + `stocktrends_get_selections_latest`).
- **Zero prompts** in every mode.
- **9 public resources visible** (credential-free) in every mode.
- **Execution-disabled selections call failed closed** (`paid_execution_disabled`;
  `paid_execution_authorized`/`paid_execution_occurred` both `false`;
  `api_request_sent`/`auth_header_sent`/`payment_header_sent` all `false`; no
  cap debit).
- **Invalid limits were rejected before pricing/auth/fetch** at the strict MCP
  input schema (`limit 251`, `limit 0`, non-integer, array, sentinel, unknown
  key) — never silently clamped.
- **Omitted `limit` sent an effective `50`** (`limit_is_caller_supplied=false`).
- **`limit=1` and `limit=250` were accepted** (inclusive bounds).
- **Exactly one live paid selections call** was attempted and completed — no
  second paid call, no cap-denied probe, no duplicate probe in the
  execution-enabled session.
- **The live call used `limit=1`** (caller-supplied).
- **Endpoint was `GET /v1/selections/latest` only** — no other endpoint, no
  deferred selections route.
- **Observed/expected spend: `0.05 STC`** (`selections_latest_paid`), consuming
  the `0.05 STC` cost of a `0.06 STC` session budget; per-tool and per-session
  caps (`1`/`1`) honored and exhausted.
- **Catalog reconciliation passed before auth/fetch** — family-scoped,
  credential-free reconciliation of the `selections` static mirror against the
  live `GET /v1/pricing/catalog` (`status: reconciled`, `source:
  pricing_catalog`) **before** any `X-API-Key` header was built.
- **`endpoint_family` was `selections`** (rule `selections_latest_paid`, endpoint
  `/v1/selections/latest`, `cost_unit STC`, amount `0.05`).
- **`X-API-Key` was sent only to the approved paid endpoint** after all gates;
  the catalog read, planning tool, and public resources never received the key.
- **No `Authorization: Bearer`** on any request.
- **No payment header** constructed or sent (`payment_header_sent: false`); no
  `402` handling triggered.
- **No retry** (`automatic_paid_retries: false`).
- **No second paid call.**
- **`api_data` preserved verbatim** — top-level and first-row key names recorded;
  no local ranking, thresholding, scoring, filtering, or recomputation
  (provenance flags all `false`).
- **Base ST-IM universe distinguished from the published STIM Select list** —
  `selection_universe: base_stim_selection_universe`,
  `is_published_stim_select_list: false`, with the separate published endpoint
  path carried in metadata.
- **Rollback restored the default/free one-tool surface** — restart with no
  `STOCKTRENDS_*` variables returned exactly 1 tool, zero prompts, 9 public
  resources, and no paid tools visible.
- **No secrets saved** — only `REDACTED` placeholders; no raw API payload
  reproduced.

## 4. Deviations and risk acceptance

The validation report's verdict is **PASS WITH DEVIATIONS** (report §11). The
deviations (report §9) are:

1. **Local stdio harness used instead of the interactive MCP Inspector UI.** The
   session was non-interactive, so an equivalent local-stdio MCP client harness
   built on the project's own MCP SDK drove the same compiled `dist/server.js`
   over stdio, exercising the identical tool/resource/prompt listing and
   tool-invocation surface. The harness lived in the session scratchpad outside
   the repository and changed no repository file.
2. **Duplicate and cap-denial live probes were not run**, to honor the operator's
   "at most one call" authorization. The `repeated_identical_selection_call` and
   `spend_cap_exceeded` fail-closed behaviors are validated by the mock-only
   suite (part of the 311 passing tests, including sequential and concurrent
   repeat cases and the release-on-pre-billable-failure /
   executed-persists-on-API-error cases) and by code inspection.
3. **Expected `0.05 STC` real spend was incurred** — the one authorized live
   call consumed `0.05 STC` of real subscription usage. This is the expected,
   authorized outcome of a controlled live paid validation.

**Why these deviations are accepted as non-blocking for controlled local stdio
operator use.** The approved scope is exactly the surface these deviations
exercised faithfully: (a) the local-stdio harness is transport- and
surface-equivalent to the Inspector for tool/resource/prompt listing and tool
invocation, so it validates the same behavior an operator would drive manually
over stdio; (b) the duplicate/cap-denial paths not exercised live are covered by
deterministic mock-only tests and code inspection, and honoring the one-call
bound is itself the conservative choice; and (c) the `0.05 STC` spend is the
intended, disclosed cost of exercising exactly one bounded live call and is
recorded in the audit trail. None of the three weakens a gate, cap, credential
rule, or fail-closed behavior.

**Why these deviations are NOT accepted as approval for remote/autonomous/bulk
operation.** A surface-equivalent stdio harness validates the *local stdio*
surface only — it says nothing about remote transport authentication, tenancy,
secret isolation, or rate limiting, none of which exist. Deferring the
duplicate/cap probes to keep the live run to one call is a reason to keep runs
bounded and supervised, not to authorize unattended, scheduled, or bulk calls.
And a single bounded call incurring `0.05 STC` is evidence for one supervised
call, not for the universe-sweep / multi-call / list-wide extraction patterns
this signoff explicitly excludes.

## 5. Security boundary confirmation

The controlling authority boundary is unchanged and is not weakened:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

Confirmed, all in force unchanged:

- **Default/free mode remains exactly one tool** (`stocktrends_estimate_workflow_cost`).
- **Paid tool exposure requires the paid-tools flag (`STOCKTRENDS_ENABLE_PAID_TOOLS=true`)
  plus a configured `STOCKTRENDS_API_KEY`** — neither alone exposes anything.
- **The execution flag changes call behavior, not tool count** — the six-tool
  surface is identical whether or not `STOCKTRENDS_ENABLE_PAID_EXECUTION` is set;
  only whether a live authorized fetch may occur changes.
- **Paid execution remains gated** — it additionally requires
  `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, mandatory pricing preflight, passing
  family-scoped catalog reconciliation, explicit nonzero call caps, and a
  covering STC budget.
- **Call caps default-deny** — `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` and
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` default `0` (deny).
- **A covering budget cap is required for any nonzero-STC call** — the
  `0.05 STC` cost with no covering `STOCKTRENDS_MAX_STC_PER_SESSION` is denied
  `spend_cap_exceeded` before any auth/fetch.
- **`X-API-Key` is restricted to approved paid endpoints after all gates** — for
  selections, only `/v1/selections/latest`; the catalog read, planning tool, and
  public resources can never receive the key.
- **Pricing catalog reconciliation is required before auth/fetch** — a missing,
  duplicate, cost-mismatched, or missing/unsupported/conflicting-unit rule fails
  closed (`pricing_catalog_reconciliation_failed`).
- **`endpoint_family` must be exactly `selections`** — a row with the correct
  rule id/path/cost/unit but the wrong family (e.g. `selections_published`) can
  never reconcile the base rule.
- **`observed_cost` / `payment_status` are not fabricated** — they remain `null`
  unless the API returns them; a static/catalog estimate is never presented as an
  observed charge.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **Zero MCP prompts** in every mode.
- **No database or control-plane access.**
- **No secret persistence** — the key is process-local only, never written to
  any repo file, and never appears in reports, logs, or returned data.
- **No investment advice** — API-authored selection rows are forwarded verbatim;
  no buy/sell/hold/allocation/risk output is produced.

## 6. Operational approval

Controlled operator use of `stocktrends_get_selections_latest` is approved
**only** under all of the following, which remain mandatory:

- **Local stdio only** — `STOCKTRENDS_MCP_TRANSPORT=stdio`; no remote MCP
  transport.
- **Operator-initiated and supervised** — a person owns the outcome; the run is
  manual and one-off.
- **Bounded `limit`** — always present, `1`–`250`, preferably `50` or smaller;
  no universe-sweep / "all rows" mode.
- **Explicit caps and budgets** — nonzero per-session and per-tool call caps and
  a covering `STOCKTRENDS_MAX_STC_PER_SESSION` sized to the `0.05 STC` cost.
- **No retries** — exactly one `GET` per authorized call; a `429`/`5xx`/`4xx`
  fails closed with no retry.
- **No repeated identical call re-billing** — a second identical normalized call
  fails closed (`repeated_identical_selection_call`) before pricing/auth/fetch/
  cap debit, sequentially and concurrently.
- **No raw API bypass** — the operator uses the gated MCP tool, never a direct
  keyed call to the endpoint that skips the gates.
- **No remote MCP.**
- **No unattended, scheduled, recurring, autonomous, CI, or background use.**
- **No bulk scans** — one `GET` per invocation; no pagination, offset walking,
  exchange auto-iteration, or multi-call universe assembly.
- **Rollback procedure remains required** — the operator returns to the
  default/free one-tool surface immediately after the run (plan §11), regardless
  of outcome.

## 7. Out-of-scope / blocked until a future PR

This signoff explicitly does **not** approve, and the following remain blocked
until their own separately reviewed design/contract and validation work:

- **`selections/history`** (`/v1/selections/history`).
- **`selections/published/latest`** (`/v1/selections/published/latest`).
- **`selections/published/history`** (`/v1/selections/published/history`).
- **Public selections resources** — none is added or approved.
- **Remote MCP** / public hosted / multi-user deployment.
- **x402 / wallet / OAuth / `Authorization: Bearer` / payment-header behavior.**
- **Autonomous agent execution** — unattended, scheduled, recurring, or
  background paid runs.
- **Hosted multi-user deployment.**
- **Bulk / list-wide data extraction.**
- **Pagination** / offset walking / multi-call assembly.
- **Exchange iteration** — sweeping across exchanges.
- **Local ranking, scoring, thresholding, filtering, or recomputation** of
  selections, ST-IM, indicators, portfolios, or intelligence conclusions.
- **Portfolio construction / investment advice** — no buy/sell/hold/allocation/
  risk output.

## 8. Follow-up recommendations

- **Optional future MCP Inspector UI validation** of the same surface, if an
  interactive session is later desired — a nicety, not a precondition for the
  approved local stdio scope (the PR #47 harness is Inspector-equivalent for this
  surface).
- **Optional future cap-denial / duplicate no-spend probe** to exercise
  `spend_cap_exceeded` and `repeated_identical_selection_call` live — **only if
  separately authorized** and only if it sends no paid request and incurs no
  spend (plan §8). Absent that authorization, those paths remain validated by the
  mock-only suite and code inspection.
- **Record any independent review** of the PR #47 report alongside this signoff
  as the report §9 recommends, so the audit trail is complete.
- **A separate design/contract memo is required before `selections/history` or
  any published selections route** — a distinct pricing family
  (`selections_published`) and larger broad-sweep surface (history `limit`
  defaults/maxes far above the base route) must be designed, not inherited.
- **A separate architecture-first review is required before remote MCP or
  x402/wallet behavior** — authentication, tenancy, secret isolation, rate
  limiting, and payment-rail machinery do not exist today and must not be bolted
  onto the subscription path.
- **Maintain the README and SECURITY_MODEL** if future selections surfaces
  change — keep the tool-count contract, limit-safety controls, allowlist, and
  base-vs-published boundary documented and current.

## 9. Final signoff

- **APPROVED for controlled local stdio operator use.**
- **NOT APPROVED for remote MCP, autonomous execution, bulk scans, history
  routes, published selections routes, or investment advice.**
- **Production-readiness is limited to the approved local stdio scope described
  in this signoff** — specifically `stocktrends_get_selections_latest` backed by
  `GET /v1/selections/latest`, run manually and supervised under the existing
  paid-mode gates and selections limit-safety controls. It implies no general
  public production deployment and no remote MCP readiness, and no additional
  live call is performed or claimed by this document.
