# Phase 4 Paid ST-IM Controlled Live Validation Report

## 0. Validation status

> **CONTROLLED LIVE VALIDATION COMPLETED — PASSED WITH ONE MINOR DEVIATION.**
>
> A single operator-authorized, operator-supervised controlled live validation
> run has been performed against the real Stock Trends API, per
> [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md).
> The run consisted of exactly two bounded, operator-authorized paid calls,
> issued through a supervised MCP Inspector session: one
> `stocktrends_get_stim_latest` call and one `stocktrends_get_stim_history`
> call. Results are recorded below exactly as reported by the operator, with
> one documented, assessed-non-blocking minor deviation (§12).
>
> **This report does not declare paid ST-IM MCP execution production-ready.**
> Per plan §13, production-readiness requires independent review of this
> completed report, which has not yet occurred. See §11.
>
> No fabricated outputs, fabricated costs, fabricated API responses, or
> fabricated `observed_cost` values appear in this report. No API key, auth
> header value, or raw API payload is recorded anywhere below — only
> non-sensitive wrapper metadata, per plan §10.

This report builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15 — the reconfirmed security model
  for paid ST-IM live execution.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved design and gate policy.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md)
  — what was actually implemented.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md)
  §19 — which recommended this validation as the next step.
- [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md)
  — the process, checklists, and assertions this report records results against.
- [`PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md`](PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md)
  — the corrected static pricing mirror in effect for this run's pricing
  reconciliation.

## 1. Commit and environment

| Field | Value |
| --- | --- |
| Commit SHA | `9ceb2b8af79f352bcd7d1a819fc6bc107feb8d75` |
| Branch | `ops/phase4-paid-stim-controlled-live-validation-report-final` |
| Date/time (UTC) | 2026-07-09 (exact UTC timestamp not separately logged by the operator; see per-call `fetched_at` in the original tool wrappers, not reproduced here) |
| Operator | Skot Kortje / Stock Trends |
| Execution mechanism | Supervised MCP client/agent session (MCP Inspector) under explicit, contemporaneous operator authorization |
| Local transport mode | `stdio` |
| Paid tools enabled/disabled | `true` during the run; set `false` after (see §10) |
| Paid execution enabled/disabled | `true` during the run; set `false` after (see §10) |

## 2. Secret-handling confirmation

- API key handled entirely outside the repository (set in operator's own
  local shell/session only, never written to any repository file):
  **confirmed**
- No secrets committed to this repository at any point (this report, the
  plan, any fixture, cassette, or log file): **confirmed**
- No secrets pasted into chat, into any agent session, or into this document
  at any point before, during, or after validation: **confirmed**
- No secrets included in logs, screenshots, or this report (only variable
  *names*, never values, per §10 of the plan): **confirmed**

## 3. Configuration checklist

None of the following values are recorded here as literal secret values — only
as `set` / `not set` / `true` / `false`, consistent with §10 of the plan.

| Variable | Value used | Notes |
| --- | --- | --- |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | `true` (during run); `false` after | disabled post-run per §10 |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | `true` (during run); `false` after | disabled post-run per §10 |
| `STOCKTRENDS_API_KEY` | `set outside repo` (during run); removed after | value never recorded, inspected, printed, or logged by Claude |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | default `true` (not overridden) | consistent with plan §4 requirement |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | not disclosed as a literal cap value; enforced behavior consistent with exactly 2 paid calls made this session (`paid_calls_this_session: 2`) | no cap breach observed |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | not disclosed as a literal cap value; enforced behavior consistent with exactly 1 paid call per tool this session (`paid_calls_this_tool: 1` on the history call) | no cap breach observed |
| `STOCKTRENDS_MAX_STC_PER_SESSION` / `STOCKTRENDS_MAX_USD_PER_SESSION` | not disclosed as a literal cap value; consumption observed as `stc_spent_this_session: 0.01` STC across both calls | no cap breach observed |
| `STOCKTRENDS_API_BASE_URL` | real Stock Trends API HTTPS origin (value not recorded here) | approved-origin gate confirmed in effect |
| `STOCKTRENDS_MCP_TRANSPORT` | `stdio` (default) | confirmed |
| `STOCKTRENDS_MCP_LOG_LEVEL` | operator's choice (not recorded) | does not affect gating |
| Any other `STOCKTRENDS_*` variable set | none reported beyond the above | consistent with plan §4 minimal-configuration intent |

## 4. Catalog reconciliation result

- Credential-free `GET /v1/pricing/catalog` reconciliation
  (`reconcileStaticPricingWithCatalog`) observed to succeed before any
  `X-API-Key` header was constructed or any ST-IM fetch occurred:
  **confirmed** (`pricing_reconciliation.status: reconciled` on both calls)
- No `X-API-Key` sent to `/v1/pricing/catalog`: **confirmed**
- Fail-closed result, if reconciliation was unavailable, malformed, ambiguous,
  missing the required rule id, had a missing/mismatched cost, an unsupported
  unit, or a mismatched endpoint/rule id: **N/A** — reconciliation succeeded
  cleanly on both calls; no fail-closed path was exercised in this run.
- Notes: reconciliation used the corrected static pricing mirror from
  [`PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md`](PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md)
  (`pricing_policy_version: 2026-07-09`), consistent on both calls.

## 5. Controlled latest call result (`stocktrends_get_stim_latest`)

| Field | Value |
| --- | --- |
| Tool name | `stocktrends_get_stim_latest` |
| Endpoint | `GET /v1/stim/latest` |
| Symbol input (as supplied to the MCP tool) | `symbol_exchange = IBM_N` (canonical underscore form) |
| Outbound symbol/exchange format confirmed hyphen form, not underscore | confirmed — `api_request_parameters.symbol_exchange = IBM-N` |
| Response wrapper metadata present and accurate | confirmed |
| `api_data.symbol_exchange` preserved verbatim in hyphen form | confirmed — `IBM-N` |
| `pricing_rule` | `stim_latest_paid` |
| `estimated_cost` | `0.0025` STC |
| `pricing_reconciliation.status` | `reconciled` |
| `paid_execution_authorized` | `true` |
| `paid_execution_occurred` | `true` |
| `api_request_sent` | `true` |
| `auth_header_sent` | `true` |
| `payment_header_sent` | `false` |
| `observed_cost` | `null` (not returned by the API; not derived or fabricated) |
| `payment_status` | `null` |
| `pricing_policy_version` | `2026-07-09` |
| `request_id` | not recorded in this report |
| Investment advice generated | none |
| Outcome | Success — one live paid call completed |
| Pass/Fail | **PASS** |
| Notes | No deviation from plan §7.1–§7.2 on this call. |

## 6. Controlled history call result (`stocktrends_get_stim_history`)

| Field | Value |
| --- | --- |
| Tool name | `stocktrends_get_stim_history` |
| Endpoint | `GET /v1/stim/history` |
| Symbol input (same test symbol as §5) | `symbol_exchange = IBM_N` (canonical underscore form) |
| Window used | `start = 2026-01-01`, `end = 2026-07-03` (date-range window; see deviation note below and §12) |
| Rows returned | 25 |
| Outbound symbol/exchange format confirmed hyphen form | confirmed — `api_request_parameters.symbol_exchange = IBM-N` |
| Response wrapper metadata present and accurate | confirmed |
| `api_data.symbol_exchange` preserved verbatim in hyphen form | confirmed — `IBM-N` |
| `pricing_rule` | `stim_history_paid` |
| `estimated_cost` | `0.0075` STC |
| `pricing_reconciliation.status` | `reconciled` |
| `paid_execution_authorized` | `true` |
| `paid_execution_occurred` | `true` |
| `api_request_sent` | `true` |
| `auth_header_sent` | `true` |
| `payment_header_sent` | `false` |
| `observed_cost` | `null` (not returned by the API; not derived or fabricated) |
| `payment_status` | `null` |
| `pricing_policy_version` | `2026-07-09` |
| `paid_calls_this_session` (as of this call) | 2 |
| `paid_calls_this_tool` (as of this call) | 1 |
| `stc_spent_this_session` (as of this call) | 0.01 STC |
| Automatic paid retries | `false` — none occurred |
| Investment advice generated | none |
| Outcome | Success — one live paid call completed |
| Pass/Fail | **PASS (with one minor, non-blocking deviation — see below and §12)** |
| Notes | **Minor deviation:** the plan's preferred minimal call shape (§7.3) is a small explicit `limit`, specifically `limit: 1` in the operator run instructions. The executed call instead used an explicit `start`/`end` date window (`2026-01-01` to `2026-07-03`), returning 25 rows. This was still exactly one history call — not a symbol sweep, not a repeated call, and not bulk validation — with no retry and no additional call made. Assessed as a minor deviation from the plan's preferred minimal-shape guidance, not a violation of the bounded-execution rules in plan §7.4–§7.5. |

## 7. Header/auth assertions

- `X-API-Key` sent only to the two approved ST-IM endpoints
  (`GET /v1/stim/latest`, `GET /v1/stim/history`): **confirmed**
  (`auth_header_sent: true` on both, and only both, calls)
- No `X-API-Key` (or any credential) sent to any public resource, to
  `stocktrends_estimate_workflow_cost` (`GET /v1/cost-estimate`), to
  `GET /v1/pricing/catalog`, or to any other unapproved endpoint:
  **confirmed**
- No `Authorization: Bearer` header observed on any request, success or
  failure: **confirmed**
- No x402 or wallet behavior observed (no payment header constructed or
  sent, no signing, no payment attempt on `402`, no retry): **confirmed**
  (`payment_header_sent: false` and `payment_status: null` on both calls)
- No OAuth behavior observed (no redirect, token exchange, or OAuth header
  of any kind): **confirmed**

## 8. Bounded-execution assertions

- Exactly one controlled latest call made: **confirmed**
- Exactly one controlled history call made: **confirmed**
- No bulk validation performed (no symbol sweep, no repeated calls beyond
  the two above): **confirmed** — the history call's date-range shape (§6,
  §12) still constituted exactly one call, not a sweep or repeated
  invocation.
- No automatic retries performed on failure: **confirmed**
  (`automatic_paid_retries: false`; no failure occurred on either call)
- Validation stopped immediately on any unexpected behavior: **N/A** — no
  unexpected behavior (auth header to a non-approved endpoint,
  `Bearer`/payment header, fabricated `observed_cost`, tool count
  mismatch, auth header on a public resource or the planning tool, or an
  unenforced cap) was observed on either call.
- This validation involved no database or control-plane access, no dynamic
  registration (e.g. from `/v1/ai/tools` or `/v1/workflows`), and no remote
  MCP behavior — the MCP server operated only as the local `stdio` adapter
  over the front-facing Stock Trends API described in plan §1, unchanged
  from the architecture boundary reaffirmed there.

## 9. Logging/redaction confirmation

- No log line, terminal capture, or saved output contains the literal
  `STOCKTRENDS_API_KEY` value: **confirmed**
- No log line or capture contains the literal `X-API-Key` header value sent
  on the wire: **confirmed**
- Sensitive env values redacted — only variable *names* recorded, never
  values: **confirmed**
- Only non-sensitive metadata retained in this report (tool name, endpoint
  path, HTTP method, request id, paid/free classification, pricing rule id,
  cap-usage counters, redacted wrapper fields per plan §10): **confirmed**

## 10. Rollback/disable confirmation

- Paid execution disabled (`STOCKTRENDS_ENABLE_PAID_EXECUTION` unset or
  falsy) after the run: **confirmed**
- Paid tools disabled (`STOCKTRENDS_ENABLE_PAID_TOOLS` unset or falsy)
  after the run: **confirmed**
- `STOCKTRENDS_API_KEY` removed from the operator's shell/session:
  **confirmed**
- MCP Inspector session stopped/restarted: **confirmed** — the operator
  reported stopping and restarting the MCP Inspector session as part of
  rollback.
- Default/free mode confirmed to expose only
  `stocktrends_estimate_workflow_cost` after rollback: **confirmed** — the
  operator reported that the default/free-mode tool listing showed only the
  public/free tool `stocktrends_estimate_workflow_cost`, and that the paid
  ST-IM tools (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`)
  were no longer visible. The exact resource/prompt counts (`9 resources / 0
  prompts`) were not separately re-reported in this confirmation; they are
  not re-asserted here beyond the tool-surface confirmation above, and are
  otherwise consistent with the previously validated default-mode figures in
  [`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md)
  §3.

## 11. Production-readiness assessment

> **PENDING.** The controlled live validation run itself **passed**, with one
> documented, assessed-non-blocking minor deviation (§6, §12). Rollback and
> default-mode confirmation (§10) are now complete. However, per
> [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md)
> §13, production-readiness still requires **independent review of this
> completed report**, which has not occurred yet. **Paid ST-IM MCP execution
> is not declared production-ready by this report.**

| Criterion | Status |
| --- | --- |
| Documented operator validation performed and passed, no unresolved deviations | MET — one minor deviation documented (§12) and assessed as non-blocking |
| No secret leakage anywhere in the process | MET |
| No unauthorized endpoint received an auth header | MET |
| Catalog reconciliation against live `/v1/pricing/catalog` confirmed | MET |
| Per-session, per-tool, and budget caps confirmed enforced | PARTIALLY MET — cap accounting/counters observed (`paid_calls_this_session: 2`, `paid_calls_this_tool: 1`, `stc_spent_this_session: 0.01`); no cap breach observed; cap-denial enforcement was not separately exercised in this live run, consistent with the fail-closed row below |
| Fail-closed behavior confirmed for key/execution/cap gaps | NOT SEPARATELY OBSERVED — no denial scenario was exercised in this live run; continues to rely on existing mock-only automated test coverage plus the plan §5 config-inspection process |
| Response wrapper metadata confirmed accurate against real API responses | MET |
| `observed_cost` behavior confirmed (`null` unless live API returned it) | MET — `null` on both calls |
| Rollback performed and confirmed (default-mode tool surface) | MET — execution/tools/key rollback confirmed; MCP Inspector stopped/restarted; default-mode tool listing confirmed showing only `stocktrends_estimate_workflow_cost`, with paid ST-IM tools no longer visible (§10) |
| Independent review of this completed report performed | PENDING — not yet performed |

**Overall production-readiness: PENDING** (controlled live validation passed
and rollback/default-mode confirmation is now complete; independent review of
this report is the sole remaining requirement before production-readiness can
be declared).

## 12. Deviations and follow-up actions

### Deviations

- **History call shape (minor, non-blocking).** The plan's preferred minimal
  call shape for the controlled history call (§7.3) is a small explicit
  `limit`, specifically `limit: 1` in the operator run instructions. The
  executed call instead used an explicit `start`/`end` date window
  (`2026-01-01` to `2026-07-03`), returning 25 rows. This remained exactly
  one history call — not a symbol sweep, not a repeated call, and not bulk
  validation under plan §7.4 — and involved no retry (§7.5,
  `automatic_paid_retries: false`). Assessed as a minor
  deviation from the plan's preferred minimal-shape guidance only, not a
  violation of any bounded-execution, auth, or cap assertion.

### Follow-up actions

- Complete independent review of this completed validation report, per plan
  §13, before any production-readiness declaration. This is now the sole
  outstanding item — rollback and default-mode confirmation (§10) are
  complete.
- For any future controlled history validation, prefer the plan's minimal
  `limit`-based shape (§7.3) over a date-range window, to keep the response
  size minimal by construction.

## 13. Final operator attestation

- I explicitly authorized, configured caps for, supervised, and approved the
  controlled live validation run described in
  [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md),
  using my own locally-supplied credentials. The two bounded tool calls were
  made through the MCP server by a supervised MCP client/agent session
  (MCP Inspector) acting under my explicit, contemporaneous authorization,
  with no unattended automation, no autonomous recurring execution, no bulk
  validation, and no automatic retries: **confirmed**
- I confirm no secret value appears anywhere in this report or in any
  artifact produced during the run: **confirmed**
- I confirm the results recorded above reflect actual observed behavior, not
  expected, assumed, or fabricated behavior: **confirmed**

| Field | Value |
| --- | --- |
| Operator name/handle | Skot Kortje / Stock Trends |
| Date of attestation | 2026-07-09 |
| Signature/confirmation | Attested via operator-reported run results incorporated into this report; production-readiness sign-off is separate and still pending independent review (§11) |

---

**Reminder:** This file must not be edited to mark any section as passed,
confirmed, or completed except as the direct, contemporaneous record of an
actual operator-authorized live validation run. This report records exactly
one such run, with one documented minor deviation, and explicitly defers
production-readiness pending independent review, per §11.
