# Phase 4 Paid ST-IM Controlled Live Validation Report

## 0. Validation status

> **NOT YET EXECUTED.**
>
> This document is a **scaffold/template only**. No live validation run has
> occurred as a result of, or prior to, the creation of this file. No live paid
> endpoint has been called, no real API key has been used, requested, inspected,
> printed, or stored, and no live response has been observed.
>
> **Operator authorization required before any live call.** Per
> [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md)
> §2, no live call may occur without an explicit, contemporaneous operator
> decision made at validation time. Merging this scaffold does not authorize any
> call, now or later. This scaffold must not be filled in speculatively, and no
> section below may be marked as passed, confirmed, or completed until an actual
> operator-authorized run has taken place.
>
> Every field in this document is a placeholder (`TBD`, `NOT RUN`,
> `PASS/FAIL TBD`, or equivalent) until replaced with the result of a real,
> operator-performed run, following the process defined in
> [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md).
> This report must never contain fabricated outputs, fabricated costs,
> fabricated API responses, or fabricated `observed_cost` values.

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

## 1. Commit and environment

| Field | Value |
| --- | --- |
| Commit SHA | TBD |
| Branch | TBD |
| Date/time (UTC) | TBD |
| Operator | TBD |
| Execution mechanism | TBD (`operator-direct` / `supervised MCP client/agent session`) |
| Local transport mode | TBD (expected: `stdio`) |
| Paid tools enabled/disabled | TBD (`STOCKTRENDS_ENABLE_PAID_TOOLS`) |
| Paid execution enabled/disabled | TBD (`STOCKTRENDS_ENABLE_PAID_EXECUTION`) |

## 2. Secret-handling confirmation

- API key handled entirely outside the repository (set in operator's local
  shell/session only, never written to any repository file): **TBD**
- No secrets committed to this repository at any point (this report, the plan,
  any fixture, cassette, or log file): **TBD**
- No secrets pasted into chat, into any agent session, or into this document at
  any point before, during, or after validation: **TBD**
- No secrets included in logs, screenshots, or this report (only variable
  *names*, never values, per §10 of the plan): **TBD**

## 3. Configuration checklist

None of the following values are recorded here as literal secret values — only
as `set` / `not set` / `true` / `false`, consistent with §10 of the plan.

| Variable | Value used | Notes |
| --- | --- | --- |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | TBD | expected `true` for this validation |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | TBD | expected `true` for this validation |
| `STOCKTRENDS_API_KEY` | TBD (`set outside repo` / `not set`) | never record the value |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | TBD | must remain default `true` or explicit `true`; must **not** be `false` |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | TBD | per-session cap |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | TBD | per-tool cap |
| `STOCKTRENDS_MAX_STC_PER_SESSION` / `STOCKTRENDS_MAX_USD_PER_SESSION` | TBD | STC/USD budget cap; at least one required |
| `STOCKTRENDS_API_BASE_URL` | TBD | real Stock Trends API HTTPS origin |
| `STOCKTRENDS_MCP_TRANSPORT` | TBD | expected `stdio` (default) |
| `STOCKTRENDS_MCP_LOG_LEVEL` | TBD | operator's choice; does not affect gating |
| Any other `STOCKTRENDS_*` variable set | TBD | should remain unset per plan §4; list any exception |

## 4. Catalog reconciliation result

- Credential-free `GET /v1/pricing/catalog` reconciliation
  (`reconcileStaticPricingWithCatalog`) observed to succeed before any
  `X-API-Key` header was constructed or any ST-IM fetch occurred: **TBD**
- No `X-API-Key` sent to `/v1/pricing/catalog`: **TBD**
- Fail-closed result, if reconciliation was unavailable, malformed, ambiguous,
  missing the required rule id, had a missing/mismatched cost, an unsupported
  unit, or a mismatched endpoint/rule id (record `N/A` if reconciliation
  succeeded cleanly and no fail-closed path was exercised): **TBD / N/A**
- Notes: **TBD**

## 5. Controlled latest call result (`stocktrends_get_stim_latest`)

| Field | Value |
| --- | --- |
| Tool name | `stocktrends_get_stim_latest` |
| Endpoint | `GET /v1/stim/latest` |
| Symbol input (as supplied to the MCP tool) | TBD |
| Outbound symbol/exchange format confirmed hyphen form (e.g. `AAPL-Q`), not underscore | TBD |
| Response wrapper metadata present and accurate (`tool_name`, `endpoint_path`, `http_method`, `symbol_identity`, `request_parameters`, `source`, `authoritative_for`, `not_authoritative_for`, `fetched_at`) | TBD |
| `api_data.symbol_exchange` preserved verbatim in hyphen form | TBD |
| `observed_cost` behavior (`null` unless API itself returned an observed/charged cost; never derived/computed locally) | TBD |
| Outcome | NOT RUN |
| Pass/Fail | PASS/FAIL TBD |
| Notes | TBD |

## 6. Controlled history call result (`stocktrends_get_stim_history`)

| Field | Value |
| --- | --- |
| Tool name | `stocktrends_get_stim_history` |
| Endpoint | `GET /v1/stim/history` |
| Symbol input (same test symbol as §5) | TBD |
| `limit` used | TBD (expected small, e.g. `5`-`10`) |
| Date/window (if applicable) | TBD |
| Outbound symbol/exchange format confirmed hyphen form | TBD |
| Response wrapper metadata present and accurate | TBD |
| `api_data.symbol_exchange` preserved verbatim in hyphen form | TBD |
| `observed_cost` behavior (`null` unless API itself returned an observed/charged cost) | TBD |
| Outcome | NOT RUN |
| Pass/Fail | PASS/FAIL TBD |
| Notes | TBD |

## 7. Header/auth assertions

- `X-API-Key` sent only to the two approved ST-IM endpoints
  (`GET /v1/stim/latest`, `GET /v1/stim/history`): **TBD**
- No `X-API-Key` (or any credential) sent to any public resource, to
  `stocktrends_estimate_workflow_cost` (`GET /v1/cost-estimate`), to
  `GET /v1/pricing/catalog`, or to any other unapproved endpoint: **TBD**
- No `Authorization: Bearer` header observed on any request, success or
  failure: **TBD**
- No x402 or wallet behavior observed (no payment header constructed or sent,
  no signing, no payment attempt on `402`, no retry): **TBD**
- No OAuth behavior observed (no redirect, token exchange, or OAuth header of
  any kind): **TBD**

## 8. Bounded-execution assertions

- Exactly one controlled latest call made: **TBD**
- Exactly one controlled history call made: **TBD**
- No bulk validation performed (no symbol sweep, no repeated calls beyond the
  two above): **TBD**
- No automatic retries performed on failure: **TBD**
- Validation stopped immediately on any unexpected behavior (auth header to a
  non-approved endpoint, `Bearer`/payment header, fabricated `observed_cost`,
  tool count not exactly 3, auth header on a public resource or the planning
  tool, or a cap not enforced), if applicable: **TBD / N/A**

## 9. Logging/redaction confirmation

- No log line, terminal capture, or saved output contains the literal
  `STOCKTRENDS_API_KEY` value: **TBD**
- No log line or capture contains the literal `X-API-Key` header value sent on
  the wire: **TBD**
- Sensitive env values redacted — only variable *names* recorded, never
  values: **TBD**
- Only non-sensitive metadata retained in this report (tool name, endpoint
  path, HTTP method, status code, request id, latency, paid/free
  classification, pricing rule id, cap configuration values, redacted wrapper
  fields per plan §10): **TBD**

## 10. Rollback/disable confirmation

- Paid execution disabled (`STOCKTRENDS_ENABLE_PAID_EXECUTION` unset or
  falsy) after the run: **TBD**
- Paid tools disabled if no longer needed
  (`STOCKTRENDS_ENABLE_PAID_TOOLS` unset or falsy): **TBD**
- `STOCKTRENDS_API_KEY` removed from the operator's shell/session: **TBD**
- Default mode confirmed to expose only `stocktrends_estimate_workflow_cost`
  (1 tool / 9 resources / 0 prompts) after rollback: **TBD**

## 11. Production-readiness assessment

> **PENDING.** This section must remain marked pending until live validation is
> actually executed and the resulting report is independently reviewed, per
> [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md)
> §13.

| Criterion | Status |
| --- | --- |
| Documented operator validation performed and passed, no unresolved deviations | DEFERRED |
| No secret leakage anywhere in the process | DEFERRED |
| No unauthorized endpoint received an auth header | DEFERRED |
| Catalog reconciliation against live `/v1/pricing/catalog` confirmed | DEFERRED |
| Per-session, per-tool, and budget caps confirmed enforced | DEFERRED |
| Fail-closed behavior confirmed for key/execution/cap gaps | DEFERRED |
| Response wrapper metadata confirmed accurate against real API responses | DEFERRED |
| `observed_cost` behavior confirmed (`null` unless live API returned it) | DEFERRED |
| Rollback performed and confirmed (1 tool / 9 resources / 0 prompts) | DEFERRED |
| Independent review of this completed report performed | DEFERRED |

**Overall production-readiness: PASS/FAIL/DEFERRED — DEFERRED** (live
validation not yet executed).

## 12. Deviations and follow-up actions

### Deviations

- TBD (list any deviation from
  [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md),
  however small, once a run has occurred; `N/A` if no run has occurred yet)

### Follow-up actions

- TBD (e.g. schedule the actual operator-authorized run, production-readiness
  sign-off, further review, configuration fix)

## 13. Final operator attestation

> To be completed and signed by the operator **only after** an actual
> operator-authorized live validation run, not before.

- I explicitly authorized, configured caps for, supervised, and approved the
  controlled live validation run described in
  [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md),
  using my own locally-supplied credentials. The two bounded tool calls were made
  either by me directly or through the MCP server by a supervised MCP client/agent
  session acting under my explicit, contemporaneous authorization — in either case,
  with no unattended automation, no autonomous recurring execution, no bulk
  validation, and no automatic retries: **TBD**
- I confirm no secret value appears anywhere in this report or in any artifact
  produced during the run: **TBD**
- I confirm the results recorded above reflect actual observed behavior, not
  expected, assumed, or fabricated behavior: **TBD**

| Field | Value |
| --- | --- |
| Operator name/handle | TBD |
| Date of attestation | TBD |
| Signature/confirmation | TBD |

---

**Reminder:** This file must not be edited to mark any section as passed,
confirmed, or completed except as the direct, contemporaneous record of an
actual operator-authorized live validation run. If this file is found with
placeholders still marked `TBD`/`NOT RUN` but §0 has been changed to claim
validation occurred, that is itself a deviation and must be corrected.
