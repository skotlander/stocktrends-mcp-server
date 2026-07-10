# Phase 5B Indicators Controlled Validation Plan

Plan date: 2026-07-10

Status: **Documentation/operations plan only. No live validation has occurred as a
result of this document.** No runtime code, no `src/` changes, no `tests/` changes,
no `package.json`/`package-lock.json` changes, no new scripts, no MCP tools added,
no MCP prompts added, no tool-registration changes, no x402/wallet/OAuth/Bearer
fallback, no remote MCP, no database/control-plane, and no dynamic-registration
work. This plan does not itself call any live endpoint (paid or credential-free),
does not use, request, inspect, print, log, or store any real API key, does not run
an MCP Inspector session, and does not record the outcome of any run — it defines
the operator-controlled process that must be followed, at a later time, to perform
and document a single controlled live validation of the Phase 5B indicators tools
and the internal instrument resolver.

This plan is the indicators-family counterpart to the ST-IM plan and report and does
not supersede them. It builds on and reuses the same doctrine:

- [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) §15 (and §15.8, the internal
  credential-free resolver) — the reconfirmed paid-mode security model.
- [`docs/PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md)
  — the controlled-live-validation doctrine this plan mirrors for indicators.
- [`docs/PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
  — the completed ST-IM controlled-live report, as precedent.
- [`docs/PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the operator-facing preconditions and secret-safety scan.
- [`docs/PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md`](PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md)
  and [`docs/PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md`](PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md)
  — the approved design and the verified API contract (including the §6.3
  `prefer_exchange=N` caveat).
- [`docs/PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md`](PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md)
  — what PR #39 actually implemented (mock-only).

## 1. Purpose and scope

- This is a **controlled validation plan only** for the merged Phase 5B paid
  indicators tools (`stocktrends_get_indicators_latest` → `GET /v1/indicators/latest`,
  `stocktrends_get_indicators_history` → `GET /v1/indicators/history`) and the
  **internal credential-free instrument resolver** (`resolveInstrumentIdentity`,
  which adds no public MCP tool and no MCP resource).
- It is a **documentation/operations plan**: process, checklists, assertions, and a
  report template. It contains no executable validation code.
- **No live validation is performed by this PR, by this document, or as part of
  producing it.** No live API call is made. No paid execution occurs. No API key is
  used or inspected. No MCP Inspector session is run. No source, runtime, test, or
  package files are changed.
- The controlled run described in §8 is a **one-off, operator-authorized,
  operator-supervised** validation performed **later**, using the operator's own
  locally-supplied credentials. This plan does not authorize unattended, scheduled,
  recurring, autonomous, CI, or background validation of any kind.
- Architecture boundary reaffirmed (unchanged by this plan):

  ```text
  Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
  ```

  The MCP server remains a thin local stdio adapter over the front-facing Stock
  Trends API. Nothing here turns it into a database client, control-plane client,
  pricing authority, payment authority, x402/wallet engine, or investment-advice
  generator.

## 2. Preconditions

All of the following must hold **before** an operator begins any part of the
validation described in this plan:

- [ ] **PR #39 is merged to `main`** (`Add indicators tools and instrument
      resolver (#39)`), and the checkout under validation is at that commit or a
      descendant that does not alter the indicators/resolver behavior.
- [ ] **`main` is clean** — no uncommitted changes in the working tree used for
      validation.
- [ ] **`npm run typecheck` passes.**
- [ ] **`npm test` passes** (the full mock-only suite, including the Phase 5B
      resolver and indicators-tool tests).
- [ ] **`npm run build` passes.**
- [ ] The operator has an **authorized Stock Trends API key available outside the
      repository**, held only in their own shell/session (never written to any repo
      file, never pasted into chat or an agent session).
- [ ] The operator understands the distinction between **free exposure** (which
      tools are listed) and **paid execution** (whether a chargeable call may
      actually be sent) — the two are governed by separate flags.
- [ ] The operator understands the tool-count contract: **default/free mode = exactly
      one tool** (`stocktrends_estimate_workflow_cost`); **paid-exposed mode =
      exactly five tools** (planning tool + the paired ST-IM tools + the paired
      indicators tools).
- [ ] The operator understands that **no public instrument tools were added**:
      `/v1/instruments/lookup` and `/v1/instruments/resolve` are used only by the
      internal resolver and are never exposed as MCP tools or resources.
- [ ] The operator understands that **live validation may create real paid usage**
      (chargeable API calls / STC debits) once execution is deliberately enabled.
- [ ] The **rollback / return-to-default-free-mode steps (§11) are read and ready**
      before starting, so the operator can return to the one-tool surface
      immediately after the run regardless of outcome.

If any precondition is not satisfied at run time, the operator must stop and not
proceed, rather than relaxing a control to complete the run.

## 3. Validation boundaries

Reaffirmed for this validation (unchanged from ST-IM doctrine):

- **Local stdio transport only.** `STOCKTRENDS_MCP_TRANSPORT=stdio`; any other value
  is rejected at config parse time.
- **No remote MCP.**
- **No x402, no wallet, no OAuth, no `Authorization: Bearer`.** Paid auth is the
  single `X-API-Key` header only.
- **No payment header** is constructed or sent under any configuration.
- **No automatic retries** — exactly one attempt per authorized call; a single
  deterministic failure is a complete observation.
- **No database or control-plane** access.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **Zero MCP prompts** in any mode.
- **No investment advice** — the tools must not produce buy/sell/hold/allocation/risk
  conclusions.
- **No unattended, scheduled, recurring, autonomous, CI, or background live
  validation.** The controlled run is manual, supervised, and one-off.

## 4. Secrets handling

- **No key in the repo.** The `STOCKTRENDS_API_KEY` value lives entirely in the
  operator's own shell/session, set immediately before the run and unset immediately
  after (§11). It is never committed — not in this plan, the later report, a fixture,
  a cassette, or a log.
- **No key in screenshots, logs, chats, issues, agent sessions, or shell-history
  examples.** If a terminal pane where the key was typed is captured, the operator
  redacts it before saving/sharing, or does not capture that pane.
- **Key set only in a process-local shell/session** — never exported to a shared
  profile, CI secret store, or persisted config for this validation.
- **Do not paste a populated `X-API-Key` header** anywhere. The header value sent on
  the wire is treated as a secret and redacted identically to the key.
- **Redact any accidental secret** immediately if one appears in any artifact.
- **Rotate/revoke the key if it is exposed** in any capture, transcript, or file.
- **The later validation report (§12) uses `REDACTED` placeholders only** — example
  syntax such as `STOCKTRENDS_API_KEY=<REDACTED>` or `X-API-Key: <REDACTED>`, never a
  real or realistic-looking value.
- Consistent with [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §2: never read `.env`,
  credential, private-key, wallet, deployment-secret, or database-credential files as
  part of this process. An agent/client acting under operator authorization may check
  only whether `STOCKTRENDS_API_KEY` is set as a boolean — it may not read, print,
  log, or otherwise inspect the value.

## 5. Default/free mode validation

Purpose: confirm the default surface is unchanged by the Phase 5B additions. This
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
      `stocktrends_get_indicators_history` appears.
- [ ] **No spend** — no paid or credential-bearing call is possible in this mode.

## 6. Paid-exposed, execution-disabled validation

Purpose: confirm the paid *exposure* surface (five tools) and that the indicators
tools **fail closed** when invoked with execution disabled — all **without any
spend**. Configuration: `STOCKTRENDS_ENABLE_PAID_TOOLS=true` with a configured
`STOCKTRENDS_API_KEY`, but **without** `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` and
without nonzero caps.

Plan to verify:

- [ ] **Paid tools enabled** by the exposure flag plus a configured key.
- [ ] **Execution disabled** (execution flag unset/false).
- [ ] **Exactly five tools are visible:**
      - `stocktrends_estimate_workflow_cost`
      - `stocktrends_get_stim_latest`
      - `stocktrends_get_stim_history`
      - `stocktrends_get_indicators_latest`
      - `stocktrends_get_indicators_history`
- [ ] **Zero prompts.**
- [ ] **Indicators tools fail closed when invoked with execution disabled** — a
      deterministic denial (e.g. `paid_execution_disabled`, or an earlier
      deterministic denial) with `paid_execution_authorized: false`.
- [ ] **No paid request sent** on the denial.
- [ ] **No auth header sent** on the denial (`auth_header_sent: false`,
      `payment_header_sent: false`).
- [ ] **No cap debit** — the usage tracker records no paid call for the denied
      invocation.

## 7. Resolver validation cases

The internal resolver (`resolveInstrumentIdentity`) reduces a caller identity to
exactly one safe canonical `symbol_exchange` **before any paid boundary**. Every
resolver call is **credential-free** (Accept + User-Agent only; never `X-API-Key`,
`Authorization`, or a payment header) and uses the discovery routes
(`/v1/instruments/lookup`, `/v1/instruments/resolve`) which are internal-only.

Define these safe validation cases for later execution. In every non-success case,
the resolver **fails closed before** any pricing preflight, cap debit, auth-header
construction, or paid fetch:

- [ ] **Canonical `symbol_exchange`** (e.g. `IBM_N`) is trusted directly with **no
      discovery call**, validated, and converted to API hyphen form (`IBM-N`); it
      **proceeds to the paid gates**. A conflicting `symbol`/`exchange` fails closed
      (`identity_conflict`).
- [ ] **Bare raw symbol with exactly one lookup match** resolves via
      `GET /v1/instruments/lookup` (requiring a valid integer `count === 1` **and**
      exactly one usable canonical match in the body) and **proceeds to the paid
      gates**.
- [ ] **Ambiguous raw symbol** (see the caveat below) **fails closed with candidate
      `symbol_exchange` matches** returned, **before** the paid gates — no paid call.
- [ ] **Explicit `symbol` + `exchange`** is treated as an **explicit identity**:
      verified via `GET /v1/instruments/resolve` with an **explicit `prefer_exchange`
      equal to the supplied exchange** (never the default `N`).
- [ ] **Invalid exchange** fails closed (rejected before pricing/auth/fetch).
- [ ] **No-match symbol** fails closed (`404`/empty result → deterministic denial).
- [ ] **The resolver must not rely on `/v1/instruments/resolve`'s default
      `prefer_exchange=N` for bare symbols** — the bare-symbol path uses
      `/v1/instruments/lookup` only and **never** sends `prefer_exchange`, so the
      default-`N` silent US auto-pick can never occur (contract memo §6.3 caveat).
- [ ] **No key is sent** to lookup/resolve (credential-free posture confirmed on the
      wire).
- [ ] **No cap debit and no paid call** occurs on ambiguity, no-match, or invalid
      input.

> **Caveat on ambiguity — do not assume `TD` (or any symbol) stays ambiguous.**
> Ticker ambiguity depends on the live instrument universe and may change over time.
> Before using a symbol such as `TD` as the ambiguous case, the operator must
> **first confirm its current ambiguity with a credential-free lookup** (or otherwise
> **choose a symbol that the lookup results actually show is ambiguous** at run
> time). The assertion is about **fail-closed-on-ambiguity behavior**, not about any
> specific ticker remaining ambiguous.

## 8. Controlled live paid indicators validation

**Plan only. Do not perform as part of this PR.** The steps below are performed
later, only after **explicit, contemporaneous operator authorization** and only once
§2–§7 are satisfied. The operator authorizes, configures caps, supervises, and
approves the run; the two tool calls may be issued through the MCP server by a
supervised MCP client/agent session under that authorization, or directly by the
operator — either way the bounds below apply without exception.

> The command-shaped lines in this section are **placeholders / illustrations only**
> and are **not to be run until separately authorized**. Prefer the checklist and
> assertion format over executable command blocks; nothing here should be
> copy-pasted to trigger a real paid call.

Exact assertions for the later operator-supervised run:

- [ ] **Enable paid execution deliberately** — knowingly set
      `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` (placeholder;
      `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` — *do not run until separately
      authorized*), understanding it permits real chargeable calls.
- [ ] **Set explicit nonzero per-session and per-tool caps**
      (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`, e.g. `2`;
      `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, e.g. `1`). Default `0` denies all paid
      calls and must be explicitly raised.
- [ ] **Set an STC/USD budget cap covering the known indicators costs**
      (`STOCKTRENDS_MAX_STC_PER_SESSION` and/or `STOCKTRENDS_MAX_USD_PER_SESSION`)
      sized to exactly the two planned calls (§9). An unset budget cap denies every
      nonzero-cost call.
- [ ] **Mandatory pricing preflight remains enabled** —
      `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` stays at its default `true` (setting it
      `false` does not skip preflight; it makes execution fail closed
      `pricing_preflight_unavailable`).
- [ ] **Perform at most one latest call and one history call** — no sweeps, no
      repeats, no exceeding the configured caps.
- [ ] **Use a canonical `symbol_exchange`** (e.g. `IBM_N`) for the first live run, so
      identity is unambiguous and no discovery call is needed.
- [ ] **Optional raw-symbol validation only if prechecked** — either a bare symbol
      confirmed safe/unambiguous via credential-free lookup (§7), or an
      **intentionally ambiguous** symbol used to confirm **fail-closed, no-paid-call**
      behavior. Do not use an unprechecked raw symbol for a paid call.
- [ ] **Latest call goes only to `GET /v1/indicators/latest`.**
- [ ] **History call goes only to `GET /v1/indicators/history`** (with an explicit
      small `limit` within `1`–`2600`, e.g. `5`–`10`, to keep the response minimal).
- [ ] **`X-API-Key` is sent only to the approved paid indicators endpoints**
      (`/v1/indicators/latest`, `/v1/indicators/history`) — never to the discovery
      routes, the catalog read, the cost-estimate planning tool, or any public
      resource.
- [ ] **No `Authorization: Bearer` header** on any request, success or failure.
- [ ] **No payment header** is constructed or sent; a `402`, if ever returned, is
      treated as safe metadata only with no payment attempt.
- [ ] **No retry** on any failure.
- [ ] **`observed_cost` / `payment_status` remain `null`/absent** unless the API
      itself returns them (subscription mode does not); they are never fabricated from
      static or catalog prices.
- [ ] **The API payload is preserved verbatim in `api_data`** (the adapter does not
      rewrite, reformat, or strip the API-returned `symbol_exchange` hyphen form).
- [ ] **Resolution metadata is present when a raw symbol is used** —
      `mcp_metadata.instrument_resolution` records how the identity was resolved.
- [ ] **Ambiguity metadata is present when an ambiguous symbol fails closed** —
      `candidate_matches` accompanies the deterministic denial, with no paid request
      sent.

Confirm outbound identity translation: the identity actually sent to the API uses the
**hyphen** form (`IBM-N`) or decomposed `symbol`/`exchange` query parameters — never
the underscore canonical form.

## 9. Cost and cap expectations

- **`indicators_latest_paid` = `0.0035 STC`.**
- **`indicators_history_paid` = `0.01 STC`.**
- **ST-IM prices are different and must not be reused** — the indicators family has
  its own static pricing mirror; do not size caps or budgets from ST-IM figures.
- **Catalog reconciliation must match the live catalog before the call** — the
  family-scoped, **credential-free** `reconcileStaticPricingWithCatalog(...,
  pricingRuleIds)` reconciliation of the indicators rules against
  `GET /v1/pricing/catalog` (including the mandatory `STC` unit check) must succeed
  **before** any `X-API-Key` header is built or any indicators fetch occurs. A
  successful ST-IM reconciliation does not authorize indicators.
- **Cap/budget denial is expected** if per-session, per-tool, or STC/USD budget caps
  are missing or set too low to cover the nonzero indicators cost — this is correct
  fail-closed behavior, recorded as the run's result.
- **No automatic retry on failure** — a single deterministic denial or error is a
  complete observation.

## 10. Failure handling

For any of the following outcomes — pricing/catalog **mismatch**, **ambiguity**,
`401` **unauthorized**, `403` **forbidden**, `402` **payment required**, `429`
**rate limit**, `5xx` server error, **catalog unavailable**, or **cap/budget
denial** — the operator must:

- [ ] **Fail closed and stop.** Treat the deterministic denial/error as the run's
      result; do not continue to the next call to "get a clean run."
- [ ] **Do not raise caps or retry casually** to force a call through.
- [ ] **Do not switch auth schemes.** Never fall back to `Authorization: Bearer`,
      x402, or a wallet; never add a payment header.
- [ ] **Record the result secret-free** in the §12 report, using redacted
      placeholders only.

A `402` is treated as safe metadata only (no payment attempt, no retry). An ambiguous
or unresolved symbol must show it failed closed **before** any paid boundary, with no
auth header and no cap debit.

## 11. Rollback checklist

Performed by the operator immediately after the controlled run, regardless of
pass/fail:

- [ ] **Unset the API key** — remove `STOCKTRENDS_API_KEY` from the shell/session
      (e.g. `unset STOCKTRENDS_API_KEY` / `Remove-Item Env:STOCKTRENDS_API_KEY`).
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

## 12. Validation report template

For the **later** report (a separate future document produced only after an actual
operator-authorized run). Reproduced here as a template only — filling it in is out
of scope for this plan and must not be done speculatively or with "expected" values
presented as real results. Use `REDACTED` placeholders for anything secret-shaped.

```markdown
# Phase 5B Indicators Controlled Validation Report

- Date/time (UTC):
- Operator:
- Execution mechanism: (operator-direct / supervised MCP client/agent session)
- Commit hash:
- Environment: (OS, Node version, transport = stdio, API base URL origin)

## Commands / categories run (redacted)
- (list validation categories exercised; no secrets, no populated X-API-Key,
  API-key values shown only as STOCKTRENDS_API_KEY=<REDACTED>)

## Default/free results (§5)
- Exactly one tool (stocktrends_estimate_workflow_cost): [confirmed/not confirmed]
- Public resources visible: [confirmed/not confirmed]
- Zero prompts: [confirmed/not confirmed]
- No paid tools visible / no spend: [confirmed/not confirmed]

## Paid-exposed, execution-disabled results (§6)
- Exactly five tools visible: [confirmed/not confirmed]
- Zero prompts: [confirmed/not confirmed]
- Indicators tools fail closed with execution disabled: [confirmed/not confirmed]
- No paid request / no auth header / no cap debit on denial: [confirmed/not confirmed]

## Resolver cases (§7)
- Canonical symbol_exchange proceeds to paid gates: [confirmed/not confirmed]
- Bare unambiguous symbol resolves before paid gates: [confirmed/not confirmed]
- Ambiguous symbol fails closed with candidate matches (ambiguity pre-confirmed):
  [confirmed/not confirmed]
- Explicit symbol+exchange treated as explicit identity (explicit prefer_exchange):
  [confirmed/not confirmed]
- Invalid exchange / no-match fail closed: [confirmed/not confirmed]
- No key sent to lookup/resolve; no cap debit/paid call on failure:
  [confirmed/not confirmed]

## Controlled live latest result (§8) — only if separately authorized
- Performed: [yes / no — not authorized]
- Outcome: [success / deterministic denial / deterministic error]
- Symbol tested (redacted if sensitive):
- Endpoint confirmed /v1/indicators/latest only: [confirmed/not confirmed]
- Hyphen-form identity confirmed: [yes/no]
- X-API-Key only to approved endpoint; no Bearer/payment header/retry:
  [confirmed/not confirmed]
- observed_cost/payment_status null unless API-returned: [confirmed/not confirmed]
- api_data preserved verbatim: [confirmed/not confirmed]
- instrument_resolution metadata present (if raw symbol used): [n/a / confirmed]

## Controlled live history result (§8) — only if separately authorized
- Performed: [yes / no — not authorized]
- Outcome / symbol / limit:
- Endpoint confirmed /v1/indicators/history only: [confirmed/not confirmed]
- (same header/auth/cost/api_data assertions as latest)

## Cost / cap observations (§9)
- indicators_latest_paid observed as 0.0035 STC in preflight/estimate:
  [confirmed/not confirmed]
- indicators_history_paid observed as 0.01 STC in preflight/estimate:
  [confirmed/not confirmed]
- Catalog reconciliation succeeded before auth/fetch (STC unit): [confirmed/not confirmed]
- Caps/budget configured / consumed:

## Rollback confirmation (§11)
- API key unset / paid tools disabled / execution disabled / caps cleared:
  [confirmed]
- Default one-tool surface / zero prompts / public resources visible: [confirmed]

## No-secrets confirmation (§4, §10)
- No secret present in this report or any saved artifact: [confirmed]

## Overall result
- [PASS / FAIL / PASS WITH DEVIATIONS]

## Deviations / follow-ups
- (list any deviation from this plan, however small, and any follow-up action)
```

## 13. Non-goals

- **No implementation in this PR** — this document defines process only; `src/` is
  unmodified.
- **No live validation in this PR** — no live call, no paid execution, no MCP
  Inspector session, no API key used or inspected.
- **No CI, scheduled, autonomous, recurring, unattended, or background validation** —
  the controlled run is manual, supervised, and one-off.
- **No public instrument tools** — the resolver stays internal-only; the discovery
  routes are never exposed as MCP tools or resources.
- **No remote MCP** — local stdio only.
- **No x402, wallet, OAuth, or `Authorization: Bearer`** behavior.
- **No database or control-plane** access.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No investment advice** generation.

## 14. Final recommendation

- After this plan is merged, the **next PR may be a completed controlled validation
  report only if** an operator-supervised live validation is **separately authorized
  and actually performed** under this plan, with its results recorded using the §12
  template and reviewed independently before any production-readiness sign-off.
- **Otherwise, stop at the mock-only implementation.** Absent a separately authorized,
  operator-supervised live run, the indicators tools and internal resolver remain
  validated by the mock-only suite plus this plan's documented inspection — and no
  live paid indicators validation should be claimed.
