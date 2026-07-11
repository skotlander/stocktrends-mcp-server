# Phase 5C Selections/Latest Controlled Validation Plan

Plan date: 2026-07-10

Status: **Documentation/operations plan only. No live validation has occurred as a
result of this document.** No runtime code, no `src/` changes, no `tests/` changes,
no `package.json`/`package-lock.json` changes, no new scripts, no MCP tools added,
no MCP prompts added, no tool-registration changes, no x402/wallet/OAuth/Bearer
fallback, no payment header, no remote MCP, no database/control-plane, and no
dynamic-registration work. This plan does not itself call any live endpoint (paid
or credential-free), does not use, request, inspect, print, log, or store any real
API key, does not run an MCP Inspector session, and does not record the outcome of
any run — it defines the operator-controlled process that must be followed, at a
later time, to perform and document a single controlled live validation of the
Phase 5C paid `selections/latest` tool.

This plan is the selections-family counterpart to the ST-IM and indicators plans
and reports and does not supersede them. It builds on and reuses the same doctrine:

- [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) §5, §7, §8 (paid-call safety,
  runaway-loop and broad-sweep controls, rate/spend control), §15 (paid ST-IM and
  indicators live execution), §15.7 (narrowed credential-bearing allowlist), and
  the new selections limit-safety subsection — the reconfirmed paid-mode security
  model.
- [`docs/PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md)
  — the controlled-live-validation doctrine this plan mirrors for selections.
- [`docs/PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md)
  — the completed indicators controlled-live report, as precedent for how a single
  supervised paid run is authorized, documented, and rolled back.
- [`docs/PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the operator-facing preconditions and secret-safety scan.
- [`docs/PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md)
  — the approved design and the publicly verified API contract (endpoint, auth,
  `0.05 STC` pricing, request parameters, limit-safety design §9, and the
  base-vs-published distinction §7).
- [`docs/PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md`](PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md)
  — what PR #45 actually implemented (mock-only).

## 1. Purpose and scope

- This is a **controlled validation plan only** for the merged Phase 5C paid
  selections tool `stocktrends_get_selections_latest`, backed by
  `GET /v1/selections/latest` (the **base ST-IM selection universe**, not the
  published STIM Select list).
- It is a **documentation/operations plan**: process, checklists, assertions, and a
  report template. It contains no executable validation code.
- **No live validation is performed by this PR, by this document, or as part of
  producing it.** No live API call is made. No paid execution occurs. No API key is
  used, requested, inspected, printed, logged, or stored. No MCP Inspector session
  is run. No source, runtime, test, or package files are changed.
- The controlled run described in §8 is a **one-off, operator-authorized,
  operator-supervised** validation performed **later**, using the operator's own
  locally-supplied credentials, and **only when live validation is separately
  authorized**. This plan does not authorize unattended, scheduled, recurring,
  autonomous, CI, or background validation of any kind.
- Scope is **exactly one tool / one endpoint**: `stocktrends_get_selections_latest`
  → `GET /v1/selections/latest`. It does **not** cover `selections/history`,
  `selections/published/latest`, `selections/published/history`, or any public
  selections resource — those remain deferred (design memo §8) and are out of scope
  here.
- Architecture boundary reaffirmed (unchanged by this plan):

  ```text
  Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
  ```

  The MCP server remains a thin local stdio adapter over the front-facing Stock
  Trends API. Nothing here turns it into a database client, control-plane client,
  pricing authority, payment authority, x402/wallet engine, ranking/scoring engine,
  or investment-advice generator.

## 2. Preconditions

All of the following must hold **before** an operator begins any part of the
validation described in this plan:

- [ ] **PR #45 is merged to `main`** (`Add selections latest paid tool foundation
      (#45)`), and the checkout under validation is at that commit or a descendant
      that does not alter the `selections/latest` behavior.
- [ ] **`main` is clean before branch creation** — no uncommitted changes in the
      working tree used for validation.
- [ ] **`npm run typecheck` passes.**
- [ ] **`npm test` passes** (the full mock-only suite, including the Phase 5C
      selections-tool tests).
- [ ] **`npm run build` passes.**
- [ ] The operator has an **authorized Stock Trends API key available outside the
      repository**, held only in their own shell/session (never written to any repo
      file, never pasted into chat or an agent session) — and only when live
      validation is **separately authorized**. Absent that separate authorization,
      no key is provisioned at all.
- [ ] The operator understands the distinction between **free exposure** (which
      tools are listed) and **paid execution** (whether a chargeable call may
      actually be sent) — the two are governed by separate flags.
- [ ] The operator understands the tool-count contract: **default/free mode =
      exactly one tool** (`stocktrends_estimate_workflow_cost`); **paid-exposed mode
      = exactly six tools** (planning tool + the paired ST-IM tools + the paired
      indicators tools + `stocktrends_get_selections_latest`).
- [ ] The operator understands that **`selections/latest` returns a list/universe**,
      so the central new control is **limit / broad-sweep safety** (§7), not
      instrument resolution — the family is exchange-scoped, not symbol-keyed, and
      the §15.8 resolver does not gate it.
- [ ] The operator understands that **live validation may create real paid usage**
      (chargeable API calls / STC debits) once execution is deliberately enabled.
- [ ] The **rollback / return-to-default-free-mode steps (§11) are read and ready**
      before any live run, so the operator can return to the one-tool surface
      immediately after the run regardless of outcome.

If any precondition is not satisfied at run time, the operator must stop and not
proceed, rather than relaxing a control to complete the run.

## 3. Validation boundaries

Reaffirmed for this validation (unchanged from ST-IM/indicators doctrine):

- **Local stdio transport only.** `STOCKTRENDS_MCP_TRANSPORT=stdio`; any other value
  is rejected at config parse time.
- **No remote MCP.**
- **No x402, no wallet, no OAuth, no `Authorization: Bearer`.** Paid auth is the
  single `X-API-Key` header only, even though the route advertises `BearerAuth`.
- **No payment header** is constructed or sent under any configuration; the
  `StockTrendsPayment*` headers are never sent.
- **No automatic retries** — exactly one attempt per authorized call; a single
  deterministic failure is a complete observation.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **Zero MCP prompts** in any mode.
- **No investment advice** — the tool must not produce buy/sell/hold/allocation/risk
  conclusions.
- **No unattended, scheduled, recurring, autonomous, CI, or background live
  validation.** The controlled run is manual, supervised, and one-off.
- **Scope limited to `selections/latest`.** No `selections/history`, no
  `selections/published/latest`, no `selections/published/history`, and no public
  selections resource is exercised — those routes remain denied
  `endpoint_not_allowlisted` and out of scope.

## 4. Secrets handling

- **No key in the repo.** The `STOCKTRENDS_API_KEY` value lives entirely in the
  operator's own shell/session, set immediately before the run and unset immediately
  after (§11). It is never committed — not in this plan, the later report, a fixture,
  a cassette, or a log.
- **No key in chats, screenshots, logs, issues, PR comments, or agent sessions.** If
  a terminal pane where the key was typed is captured, the operator redacts it before
  saving/sharing, or does not capture that pane.
- **Key set only process-local** — never exported to a shared profile, CI secret
  store, or persisted config for this validation, and only when live validation is
  separately authorized.
- **Do not show a populated `X-API-Key` header** anywhere. The header value sent on
  the wire is treated as a secret and redacted identically to the key.
- **The later validation report (§12) uses `REDACTED` placeholders only** — example
  syntax such as `STOCKTRENDS_API_KEY=<REDACTED>` or `X-API-Key: <REDACTED>`, never a
  real or realistic-looking value. The only secret-shaped placeholders permitted in
  any artifact are `REDACTED` and `<process-local-api-key>`.
- **Rotate/revoke the key if it is exposed** in any capture, transcript, or file.
- Consistent with [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §2: never read `.env`,
  credential, private-key, wallet, deployment-secret, or database-credential files as
  part of this process. An agent/client acting under operator authorization may check
  only whether `STOCKTRENDS_API_KEY` is set as a boolean — it may not read, print,
  log, or otherwise inspect the value.

## 5. Default/free validation

Purpose: confirm the default surface is unchanged by the Phase 5C addition. This
step requires **no API key and no paid flags** and cannot cause any spend.

Plan to verify:

- [ ] **No API key set** in the shell/session.
- [ ] **No paid flags set** (`STOCKTRENDS_ENABLE_PAID_TOOLS` and
      `STOCKTRENDS_ENABLE_PAID_EXECUTION` unset or falsy).
- [ ] **Exactly one tool is visible:** `stocktrends_estimate_workflow_cost`.
- [ ] **Public resources are visible** (the credential-free resource surface, per the
      figures already validated for default mode).
- [ ] **Zero prompts.**
- [ ] **No paid tools visible** — none of `stocktrends_get_stim_latest`,
      `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`,
      `stocktrends_get_indicators_history`, or `stocktrends_get_selections_latest`
      appears.
- [ ] **No spend** — no paid or credential-bearing call is possible in this mode.

## 6. Paid-exposed, execution-disabled validation

Purpose: confirm the paid *exposure* surface (six tools) and that
`stocktrends_get_selections_latest` **fails closed** when invoked with execution
disabled — all **without any spend**. Configuration:
`STOCKTRENDS_ENABLE_PAID_TOOLS=true` with a configured `STOCKTRENDS_API_KEY`, but
**without** `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` and without nonzero caps.

Plan to verify:

- [ ] **Paid tools enabled** by the exposure flag plus a configured key (which may be
      a placeholder for this no-spend phase, so the real key stays untouched).
- [ ] **API key present only process-local** (or an explicit placeholder), never in a
      repo file.
- [ ] **Execution disabled** (execution flag unset/false).
- [ ] **Exactly six tools are visible:**
      - `stocktrends_estimate_workflow_cost`
      - `stocktrends_get_stim_latest`
      - `stocktrends_get_stim_history`
      - `stocktrends_get_indicators_latest`
      - `stocktrends_get_indicators_history`
      - `stocktrends_get_selections_latest`
- [ ] **Zero prompts.**
- [ ] **The selections tool fails closed when invoked with execution disabled** — a
      deterministic denial (e.g. `paid_execution_disabled`, or an earlier
      deterministic denial) with `paid_execution_authorized: false`.
- [ ] **No request to `/v1/selections/latest`** on the denial
      (`api_request_sent: false`).
- [ ] **No `X-API-Key` sent** on the denial (`auth_header_sent: false`,
      `payment_header_sent: false`).
- [ ] **No cap debit** — the usage tracker records no paid call for the denied
      invocation (`paid_calls_this_session` / `stc_spent` remain `0`).

## 7. Selections input and limit-safety validation

Purpose: confirm the §9 limit-safety design of the design memo behaves as
implemented, entirely **before** any paid boundary. Every rejection below occurs at
the strict input schema **before** pricing preflight, catalog reconciliation, auth
header construction, or fetch — no request, no auth header, no cap debit. These
cases can be exercised under the Phase 6 (execution-disabled) configuration, or —
for the accepted-input cases only — observed in the metadata of the single §8 live
call; they never justify additional paid calls.

Plan cases:

- [ ] **Omitted `limit` sends effective `limit=50`.** The adapter always sends an
      explicit `limit` and never omits it, so the API's own `2000` default can never
      apply.
- [ ] **Explicit `limit=1` accepted** (inclusive lower bound).
- [ ] **Explicit `limit=250` accepted** (inclusive hard maximum; ~1.25% of the API's
      `20000` max).
- [ ] **`limit=251` rejected before pricing/auth/fetch** — fails closed, no request
      (never silently clamped).
- [ ] **`limit=0` rejected before pricing/auth/fetch.**
- [ ] **Non-integer `limit` rejected before pricing/auth/fetch** (e.g. a float or
      string).
- [ ] **Array `limit` rejected before pricing/auth/fetch.**
- [ ] **Sentinel / unbounded values rejected before pricing/auth/fetch** (e.g.
      `-1`, `0`, "all", or any value above the hard max) — there is no "all rows"
      mode and no universe-sweep path.
- [ ] **`limit` is always sent** on the outbound call.
- [ ] **No pagination** — no offset walking, no page loop.
- [ ] **No bulk request** — no assembling the universe from multiple bounded calls.
- [ ] **No exchange auto-iteration** — no sweeping across exchanges.
- [ ] **No retry** — exactly one `GET` per invocation; a `429`/`5xx` fails closed.
- [ ] **Repeated identical call posture denies duplicate before re-billing** — a
      second call with the same normalized signature
      (`exchange`/`min_prob13wk`/`limit`/flags) fails closed
      (`repeated_identical_selection_call`) before pricing/auth/fetch/cap debit,
      sequentially and concurrently. A pre-billable failure releases the reservation;
      an authorized billable attempt promotes the signature to executed (no re-bill).
- [ ] **`effective_limit` metadata checked** — `mcp_metadata` records the effective
      `limit` actually sent (metadata only, never a second ranking/thresholding pass).
- [ ] **Returned row-count metadata checked where available** — the recorded row
      count confirms the call was bounded.

The `min_prob13wk`, `exchange`, `include_data`, `include_mast`, and `cs_only` inputs
are validated and **passed through to the API**; none is applied locally.

## 8. Controlled live paid selections validation

**Plan only. Do not perform as part of this PR.** The steps below are performed
later, only after **explicit, contemporaneous operator authorization** and only once
§2–§7 are satisfied. Before any live paid step, the operator must supply the exact
authorization phrase:

> `AUTHORIZED: run at most one selections latest call under the configured caps`

Absent that exact phrase, no paid execution flag is set and no paid call is issued.
The operator authorizes, configures caps, supervises, and approves the run; the
single tool call may be issued through the MCP server by a supervised MCP
client/agent session under that authorization, or directly by the operator — either
way the bounds below apply without exception.

> The command-shaped lines in this section are **placeholders / illustrations only**
> and are **not to be run until separately authorized**. Prefer the checklist and
> assertion format over executable command blocks; nothing here should be
> copy-pasted to trigger a real paid call.

Exact assertions for the later operator-supervised run:

- [ ] **Enable paid execution deliberately** — knowingly set
      `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` (placeholder; *do not run until
      separately authorized*), understanding it permits real chargeable calls.
- [ ] **Set explicit caps and budget for `0.05 STC` plus a modest buffer** — explicit
      nonzero per-session and per-tool call caps
      (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`, e.g. `1`;
      `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, e.g. `1`) and a covering STC budget
      (`STOCKTRENDS_MAX_STC_PER_SESSION`, e.g. `0.06`, covering the `0.05 STC` cost
      with a modest buffer). Defaults are `0` (deny) and an unset budget denies every
      nonzero-cost call; both must be explicitly raised.
- [ ] **Mandatory pricing preflight remains enabled** —
      `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` stays at its default `true` (setting it
      `false` does not skip preflight; it makes execution fail closed).
- [ ] **Perform at most one `stocktrends_get_selections_latest` call** — no sweeps,
      no repeats, no exceeding the configured caps, no second paid call unless
      separately authorized.
- [ ] **Use a bounded `limit`, preferably `50` or smaller**, well within the
      `1`–`250` range.
- [ ] **The call goes only to `GET /v1/selections/latest`** — no other endpoint.
- [ ] **`X-API-Key` is sent only to the approved `/v1/selections/latest` endpoint
      after all gates** — never to the catalog read, the cost-estimate planning tool,
      any public resource, or any deferred selections route.
- [ ] **No `Authorization: Bearer` header** on any request, success or failure.
- [ ] **No payment header** is constructed or sent; a `402`, if ever returned, is
      treated as safe metadata only with no payment attempt.
- [ ] **No retry** on any failure.
- [ ] **The API payload is preserved verbatim in `api_data`** — the adapter does not
      rewrite, reformat, or strip API-returned rows.
- [ ] **No local ranking, no local thresholding, no local scoring, no local
      recomputation** — rows are forwarded as returned; the published thresholds are
      never applied.
- [ ] **Base-vs-published distinction is clear** — the response is the **base ST-IM
      selection universe** and is clearly distinguished from the **published STIM
      Select list** (`/v1/selections/published/latest`); `mcp_metadata` carries the
      base-universe provenance note.
- [ ] **`observed_cost` / `payment_status` remain `null`/absent** unless the API
      itself returns them; they are never fabricated from static or catalog prices.
- [ ] **Optional cap/duplicate probe only if explicitly documented as
      no-paid-request / no-spend** — a deliberately cap-denied or duplicate-denied
      invocation may be recorded to demonstrate fail-closed behavior, provided it
      sends no paid request and incurs no spend, and is disclosed as such.

## 9. Cost and cap expectations

- **`selections_latest_paid` = `0.05 STC`** per request (`cost_per_request`,
  `stc_cost`, and `estimated_usd_cost` all `0.05`).
- **Catalog reconciliation must match the live catalog before auth/fetch** — the
  family-scoped, **credential-free** reconciliation of the `selections` static
  pricing mirror against `GET /v1/pricing/catalog` (including the mandatory `STC`
  unit check and the `endpoint_family: selections` check) must succeed **before** any
  `X-API-Key` header is built or any selections fetch occurs. An ST-IM, indicators,
  or `selections_published` reconciliation does **not** authorize a base-selections
  call.
- **`STC` unit is required** — a missing, unsupported, or conflicting unit fails
  closed (`pricing_catalog_reconciliation_failed`).
- **`endpoint_family` must be `selections`** — a catalog row with the correct rule
  id/path/cost/unit but the wrong family (e.g. `selections_published`) fails closed
  and can never reconcile.
- **Cap/budget denial is expected** if per-session, per-tool, or STC budget caps are
  missing or set too low to cover the nonzero `0.05 STC` cost — this is correct
  fail-closed behavior, recorded as the run's result.
- **No automatic retry on failure** — a single deterministic denial or error is a
  complete observation.
- **Do not raise caps casually**, and **stop on any unexpected cost or endpoint.**

## 10. Failure handling

For any of the following outcomes — **tool-count mismatch**, an unexpected **prompt**
appearing, **catalog unavailable**, **catalog family mismatch**, **cost mismatch**,
**unit mismatch**, **cap/budget denial**, `401`/`403` **auth error**, `402`
**payment required**, `429` **rate limit**, `5xx` server error, an **unexpected
endpoint**, a **duplicate-loop denial**, a **response-shape surprise**, **missing
metadata**, or any **unexpected spend** — the operator must:

- [ ] **Fail closed and stop.** Treat the deterministic denial/error as the run's
      result; do not continue to "get a clean run."
- [ ] **Do not raise caps casually** or retry to force a call through.
- [ ] **Do not switch auth schemes.** Never fall back to `Authorization: Bearer`,
      x402, or a wallet; never add a payment header.
- [ ] **Do not retry the paid call.**
- [ ] **Record the result secret-free** in the §12 report, using redacted
      placeholders only.

A `402` is treated as safe metadata only (no payment attempt, no retry). A
duplicate-loop denial (`repeated_identical_selection_call`), a cap denial
(`spend_cap_exceeded`), and a reconciliation failure
(`pricing_catalog_reconciliation_failed`) must each show they failed closed
**before** any paid boundary, with no `X-API-Key` header and no cap debit.

## 11. Rollback checklist

Performed by the operator immediately after any controlled run, regardless of
pass/fail:

- [ ] **Unset the API key** — remove `STOCKTRENDS_API_KEY` from the shell/session
      (e.g. `Remove-Item Env:STOCKTRENDS_API_KEY` / `unset STOCKTRENDS_API_KEY`).
      Close/restart the shell if there is any doubt about residual state.
- [ ] **Disable paid tools** — unset/falsy `STOCKTRENDS_ENABLE_PAID_TOOLS`.
- [ ] **Disable paid execution** — unset/falsy `STOCKTRENDS_ENABLE_PAID_EXECUTION`.
- [ ] **Clear caps/budgets** — unset the per-session, per-tool, and STC/USD budget
      cap variables used for the run.
- [ ] **Restart the server** with no `STOCKTRENDS_*` paid-related variables set.
- [ ] **Confirm the default/free one-tool surface** — exactly one tool,
      `stocktrends_estimate_workflow_cost`.
- [ ] **Confirm zero prompts.**
- [ ] **Confirm public resources are still visible** (credential-free resource
      surface intact).
- [ ] **Confirm no paid tools are visible in free/default mode** — none of the five
      paid tools, including `stocktrends_get_selections_latest`, appears.
- [ ] **Record the rollback result secret-free** in the §12 report.

## 12. Validation report template

For the **later** report (a separate future document produced only after an actual
operator-authorized run). Reproduced here as a template only — filling it in is out
of scope for this plan and must not be done speculatively or with "expected" values
presented as real results. Use `REDACTED` placeholders for anything secret-shaped.

```markdown
# Phase 5C Selections/Latest Controlled Validation Report

- Date/time (UTC):
- Operator:
- Execution mechanism: (operator-direct / supervised MCP client/agent session)
- Commit hash:
- Environment: (OS, Node version, transport = stdio, API base URL origin)

## Default/free results (§5)
- Exactly one tool (stocktrends_estimate_workflow_cost): [confirmed/not confirmed]
- Public resources visible: [confirmed/not confirmed]
- Zero prompts: [confirmed/not confirmed]
- No paid tools visible / no spend: [confirmed/not confirmed]

## Paid-exposed, execution-disabled results (§6)
- Exactly six tools visible: [confirmed/not confirmed]
- Zero prompts: [confirmed/not confirmed]
- Selections tool fails closed with execution disabled: [confirmed/not confirmed]
- No request to /v1/selections/latest / no X-API-Key / no cap debit on denial:
  [confirmed/not confirmed]

## Limit-safety cases (§7)
- Omitted limit sends effective limit 50: [confirmed/not confirmed]
- limit 1 accepted / limit 250 accepted: [confirmed/not confirmed]
- limit 251, limit 0, non-integer, array, sentinel rejected before
  pricing/auth/fetch: [confirmed/not confirmed]
- limit always sent; no pagination/bulk/exchange auto-iteration/retry:
  [confirmed/not confirmed]
- Repeated identical call denies duplicate before re-billing: [confirmed/not confirmed]
- effective_limit / returned row-count metadata present: [confirmed/not confirmed]

## Controlled live result (§8) — only if separately authorized and performed
- Authorization phrase received verbatim: [yes / no — not authorized]
- Performed: [yes / no — not authorized]
- Outcome: [success / deterministic denial / deterministic error]
- Endpoint confirmed /v1/selections/latest only: [confirmed/not confirmed]
- limit used (≤ 250, preferably ≤ 50):
- X-API-Key only to approved endpoint; no Bearer/payment header/retry:
  [confirmed/not confirmed]
- api_data preserved verbatim; no local ranking/thresholding/scoring/recomputation:
  [confirmed/not confirmed]
- Base universe distinguished from published STIM Select list: [confirmed/not confirmed]
- observed_cost/payment_status null unless API-returned: [confirmed/not confirmed]

## Cost / cap observations (§9)
- selections_latest_paid observed as 0.05 STC in preflight/estimate:
  [confirmed/not confirmed]
- Catalog reconciliation succeeded before auth/fetch (STC unit, selections family):
  [confirmed/not confirmed]
- Caps/budget configured / consumed:

## Rollback result (§11)
- API key unset / paid tools disabled / execution disabled / caps cleared:
  [confirmed]
- Default one-tool surface / zero prompts / public resources visible / no paid tools
  visible: [confirmed]

## No-secrets confirmation (§4, §10)
- No secret present in this report or any saved artifact: [confirmed]

## Deviations / follow-ups
- (list any deviation from this plan, however small, and any follow-up action)

## Overall result
- [PASS / FAIL / PASS WITH DEVIATIONS]
```

## 13. Non-goals

- **No implementation in this PR** — this document defines process only; `src/` is
  unmodified.
- **No live validation in this PR** — no live call, no paid execution, no MCP
  Inspector session, no API key used, requested, inspected, logged, or stored.
- **No `selections/history`** — deferred; out of scope.
- **No `selections/published/latest`** — deferred; out of scope.
- **No `selections/published/history`** — deferred; out of scope.
- **No bulk scans** — one `GET` per invocation; no pagination, offset walking, or
  multi-call assembly.
- **No universe sweeps** — `limit` always present and `≤ 250`; no "all rows" mode.
- **No remote MCP** — local stdio only.
- **No x402, wallet, OAuth, or `Authorization: Bearer`** behavior.
- **No payment header.**
- **No investment advice** generation, and no MCP-side ranking, thresholding,
  scoring, or recomputation.
- **No CI, scheduled, autonomous, recurring, unattended, or background validation** —
  the controlled run is manual, supervised, and one-off.

## 14. Final recommendation

- After this plan is merged, the **next PR may be a completed controlled validation
  report only if** an operator-supervised live validation is **separately authorized
  and actually performed** under this plan (with the exact §8 authorization phrase),
  with its results recorded using the §12 template and reviewed independently before
  any production-readiness sign-off.
- **Otherwise, stop at the mock-only implementation.** Absent a separately authorized,
  operator-supervised live run, `stocktrends_get_selections_latest` remains validated
  by the mock-only suite plus this plan's documented inspection.
- **Do not claim production readiness from this plan alone.** This is a plan-only PR;
  it performs no validation and asserts none.
