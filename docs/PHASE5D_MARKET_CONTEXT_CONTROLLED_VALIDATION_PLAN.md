# Phase 5D Market-Context Controlled Validation Plan

Plan date: 2026-07-11

Status: **Documentation/operations plan only (PR #52). No live validation has
occurred as a result of this document.** No runtime code, no `src/` changes, no
`tests/` changes, no `package.json`/`package-lock.json` changes, no new scripts,
no runtime artifacts, no logs, no validation output files, no MCP tools added,
no MCP resources added, no MCP prompts added, no tool-registration changes, no
route promotions, no pricing-mirror changes, no x402/wallet/OAuth/Bearer
fallback, no payment header, no remote MCP, no database/control-plane, and no
dynamic-registration work. This plan does not itself call any live endpoint
(paid or credential-free), does not use, request, inspect, print, log, or store
any real API key, does not run an MCP Inspector session, and does not record
the outcome of any run — it defines the operator-controlled process that must
be followed, at a later time and only under a separate explicit authorization
(§4), to perform and document a single controlled live validation of the four
Phase 5D paid market-context tools and the credential-free leadership
definitions resource implemented in PR #51.

**This plan authorizes no live run by itself.** Merging PR #52 changes nothing
about what may be executed: any future live validation (PR #53) additionally
requires the exact operator authorization phrase in §4, supplied
contemporaneously, before any paid execution flag is set or any paid tool is
invoked. **Codex review of this plan is required before it merges**, exactly as
for every prior plan in the Phase 4/5B/5C cadence. This plan claims no
production readiness for anything (§16).

This plan is the market-context counterpart to the ST-IM, indicators, and
selections plans and reports and does not supersede them. It builds on and
reuses the same doctrine:

- [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) §5/§7/§8 (paid-call safety,
  runaway-loop and broad-sweep controls, rate/spend control), §15 (paid ST-IM
  and indicators live execution), §15.7 (the narrowed credential-bearing
  allowlist, now nine routes), §16 (paid `selections/latest` live execution and
  list-shaped limit safety), and §17 (paid market-context live execution — the
  section PR #51 added and this plan validates against).
- [`docs/PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md)
  — the approved design and the credential-free-verified API contract
  (endpoints, `X-API-Key`-only auth, the four pricing rules and costs, limits,
  and the §13 validation path this plan discharges).
- [`docs/PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md`](PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md)
  — what PR #51 actually implemented (mock-only; 448 tests / 15 files passing).
- [`docs/PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md)
  and
  [`docs/PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md)
  — the proven plan → authorized bounded live run → secret-free report cadence
  and the list-shaped limit-safety validation pattern this plan extends.
- [`docs/PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md)
  and
  [`docs/PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md)
  — the multi-call bounded-session precedent (two paid calls under a shared
  session cap) that the four-call budget in §8 generalizes.
- [`docs/PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the operator-facing eligibility preconditions and the secret-safety scan.

Architecture boundary reaffirmed (unchanged by this plan):

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin local stdio adapter over the front-facing Stock
Trends API. Nothing here turns it into a database client, control-plane client,
pricing authority, payment authority, x402/wallet engine, regime/breadth/
leadership calculator, or investment-advice generator.

## 1. Status

- **Docs-only validation plan.** This PR creates this document and one README
  documentation-index link; nothing else changes.
- **No live validation is performed** by this PR, by this document, or as part
  of producing it — no live endpoint (paid or credential-free) is called.
- **No API key is used**, requested, inspected, printed, logged, or stored.
- **No paid call is made** and no spend or usage is created.
- **No MCP Inspector session is run.**
- **No implementation changes** — no `src/`, `tests/`, `package.json`, or
  `package-lock.json` change; no tool, resource, prompt, promotion, or
  pricing-mirror change; no runtime behavior change of any kind.
- **No production-readiness claim is made.** Readiness remains exactly where
  the Phase 5D implementation notes left it: implemented and mock-validated,
  pending this plan's later authorized execution (PR #53) and a separate narrow
  signoff (PR #54).

## 2. Current implemented surface (validated against source at `21e66cd`)

The surface this plan validates is the one PR #51 merged:

- **Default/free mode: exactly 1 tool** — `stocktrends_estimate_workflow_cost`
  (credential-free planning tool). No market-context tool is ever visible in
  free mode.
- **Paid-exposed mode: exactly 10 tools** — the planning tool, the paired paid
  ST-IM tools, the paired paid indicators tools, the base selections tool, and
  the four Phase 5D market-context tools. Exposure requires **both**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** a configured
  `STOCKTRENDS_API_KEY`; neither alone exposes anything. The execution flag
  changes call behavior, never tool count.
- **Public resources: exactly 10 in every mode**, all credential-free and
  fetch-on-request, including the new
  `stocktrends://leadership/definitions` (backing
  `GET /v1/leadership/definitions`), which is never keyed, never on the
  auth-capable allowlist, and never mirrored as a paid pricing rule.
- **MCP prompts: exactly 0 in every mode** (`prompts/list` returns `-32601
  Method not found`; no prompts capability is registered).
- **The four approved paid market-context tools** (each `GET`-only, strict
  input schema, always-sent limits, single fetch, no retry):

  | Tool | Endpoint | Pricing rule / family | Cost |
  | --- | --- | --- | --- |
  | `stocktrends_get_market_regime_latest` | `GET /v1/market/regime/latest` | `market_regime_latest` / `market` | `0.15 STC` |
  | `stocktrends_get_market_regime_history` | `GET /v1/market/regime/history` | `market_regime_history` / `market` | `0.25 STC` |
  | `stocktrends_get_breadth_sector_latest` | `GET /v1/breadth/sector/latest` | `breadth_sector_latest_paid` / `breadth` | `0.1 STC` |
  | `stocktrends_get_leadership_summary_latest` | `GET /v1/leadership/summary/latest` | `leadership_summary_latest_paid` / `leadership` | `0.25 STC` |

- **The credential-free public resource** `stocktrends://leadership/definitions`
  — the interpretive companion to the leadership summary tool (indicator and
  taxonomy definitions), verified public/zero-cost by the design memo §3.
- **Deferred routes remain denied and not promoted** (fail
  `endpoint_not_allowlisted` before any auth header or fetch):
  `/v1/market/regime/forecast`, `/v1/breadth/sector/history` (API default/max
  `200000`/`500000` — never reachable through this adapter), and
  `/v1/leadership/rotation/history`; likewise every decision/portfolio route,
  `selections/history`, `selections/published/*`, and all Intelligence Agent
  artifact routes. `/v1/leadership/definitions` is permanently non-promoted
  and never auth-capable (public-resource path only).

## 3. Validation objective

The later authorized run (PR #53) must prove, for **controlled local stdio
operator use only**:

- **Controlled operator behavior of the four paid market-context tools and the
  definitions resource** over local stdio — correct listing, correct gating,
  and (if authorized) at most one bounded live call per approved paid tool.
- **Default/free rollback behavior** — after the run, a restart with no
  `STOCKTRENDS_*` variables returns the exactly-one-tool free surface.
- **Paid-exposed execution-disabled behavior** — with exposure but no
  execution flag, each of the four tools fails closed
  (`paid_execution_disabled`) with no request, no auth header, and no cap
  debit.
- **Strict limit safety** — MCP defaults are always sent explicitly
  (regime history `limit` default `12`; breadth `limit` default `50` with
  `group_level` default `sector`; leadership `limit_overall` default `50` and
  `limit_bucket` default `20`); hard maxes are `52`/`250`/`200`/`50`;
  out-of-range, non-integer, array, sentinel, and unknown-key inputs
  (including the deliberately unexposed `weekdate`, `vol_scale`, and `type`)
  are rejected at the strict schema boundary before any pricing/auth/fetch and
  never silently clamped.
- **Auth boundary** — `X-API-Key` only, built only after every gate passes,
  sent only to the four promoted market-context routes; never to the pricing
  catalog, the planning tool, the definitions resource, or any public
  resource; the key never appears in logs, errors, denials, or returned data.
- **No `Authorization: Bearer`, no payment header, no x402, no wallet, no
  OAuth, no remote MCP behavior** under any configuration or outcome.
- **Context-not-advice / verbatim-response metadata where observable** —
  `api_data` preserved verbatim; `mcp_metadata` carries
  `context_not_advice: true` and the family framing (regime = market context,
  not a trading recommendation; breadth = participation context, not
  confirmation signals; leadership = rotation context, not picks),
  `effective_limits`, `returned_row_count` where derivable,
  `api_reported_weekdate` and `request_id` only when the API returns them, and
  `observed_cost`/`payment_status` remaining `null` (never fabricated).

## 4. Authorization boundary

- **Exact authorization phrase.** The live validation phase in PR #53 may
  proceed **only** if the operator explicitly and contemporaneously provides
  this exact phrase:

  > `AUTHORIZED: run Phase 5D market-context controlled validation for at most one call per approved paid tool under the configured caps`

- **Any missing, altered, partial, or ambiguous authorization phrase means no
  live paid call may be run.** A paraphrase, a truncation, a different tool
  list, a prior-session authorization, or an inferred intent does not count.
  Absent the exact phrase, no paid execution flag is set, no cap is raised,
  and no paid tool is invoked — the validation stops at the no-spend phases
  (§5, §6, §9, §10).
- **No live validation without it.** The phrase authorizes at most the §8
  budget (at most one live call per approved paid tool, at most four paid
  calls total); it does not authorize repeats, retries, sweeps, deferred
  routes, or any second run. A later re-run requires a fresh explicit phrase.
- **No API key in chat, docs, commits, logs, or screenshots.** The real
  `STOCKTRENDS_API_KEY` value must never be pasted into a chat or agent
  session, committed to any repository file, written into this plan or the
  later report, captured in a log, or shown in a screenshot or recording.
- **Secrets are set only in the operator's local shell/session** — set
  immediately before the authorized run, unset immediately after (§12), never
  exported to a shared profile, CI secret store, or persisted config — and are
  **redacted from any report** using `REDACTED` placeholders only (e.g.
  `STOCKTRENDS_API_KEY=<REDACTED>`, `X-API-Key: <REDACTED>`). An agent/client
  acting under operator authorization may check only whether
  `STOCKTRENDS_API_KEY` is set as a boolean — it may not read, print, log, or
  otherwise inspect the value. Consistent with
  [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §2, no `.env`, credential,
  private-key, wallet, deployment-secret, or database-credential file is read
  as part of this process.
- **PR #52 itself does not authorize PR #53 execution.** Merging this plan
  creates process, not permission. The §4 phrase is a separate, later,
  explicit operator act.

## 5. Environment and preflight checklist (future PR #53)

All of the following must hold **before** the PR #53 operator begins any part
of the validation, and before any paid variable is set:

- [ ] **On the correct branch for PR #53** — a dedicated validation-report
      branch based on `main` **including the merged PR #51 implementation and
      this merged PR #52 plan**; never `main` itself. Confirm with
      `git rev-parse --show-toplevel`, `git branch --show-current`, and
      `git status --short --branch`.
- [ ] **Clean working tree** before any edits.
- [ ] **Dependencies installed** (`npm install` completes cleanly).
- [ ] **`npm run typecheck` passes** (`tsc --noEmit`).
- [ ] **`npm test` passes** — the full mock-only suite, including
      `tests/phase5d-market-context-tools.test.ts` (448 tests / 15 files at
      the time this plan was written).
- [ ] **`npm run build` passes** (`dist/server.js` produced).
- [ ] **No package changes** — `package.json` and `package-lock.json` are
      untouched before, during, and after the validation.
- [ ] **Default/free one-tool surface confirmed before any paid
      configuration** — a stdio session with no `STOCKTRENDS_*` variables
      lists exactly one tool (`stocktrends_estimate_workflow_cost`), and none
      of the nine paid tools appears.
- [ ] **Public resources count 10 and the definitions resource visible
      credential-free** — `stocktrends://leadership/definitions` is listed and
      readable with no key configured, alongside the nine prior resources.
- [ ] **Zero prompts** — `prompts/list` shows no prompts capability
      (`-32601`), in every configuration checked.
- [ ] The operator has an **authorized Stock Trends API key available outside
      the repository**, held only in their own shell/session — and only once
      the §4 phrase has been given. Absent that phrase, no key is provisioned
      at all.
- [ ] The operator understands **exposure vs execution** (separate flags), the
      **1 free / 10 paid-exposed tool-count contract**, that **live validation
      may create real paid usage** (up to `0.75 STC`, §8), and that the
      **rollback steps (§12) are read and ready before any live run**.

If any precondition is not satisfied at run time, the operator must stop and
not proceed, rather than relaxing a control to complete the run.

## 6. Paid-exposed, execution-disabled checks (no spend)

Purpose: confirm the paid *exposure* surface and the fail-closed execution
gate for all four market-context tools without any spend. Configuration:
`STOCKTRENDS_ENABLE_PAID_TOOLS=true` plus a configured `STOCKTRENDS_API_KEY`
(**a non-secret placeholder is recommended for this phase**, so the real key
stays untouched during exposure/denial testing), with
`STOCKTRENDS_ENABLE_PAID_EXECUTION` unset/false and no caps.

Plan to verify:

- [ ] **Paid tools are visible only with the paid-tools flag + a configured
      key.** Flag without key (`blocked_missing_api_key`) and key without flag
      each leave the free one-tool surface; both together expose the ten-tool
      surface.
- [ ] **Tool count remains exactly 10** in paid-exposed mode — the execution
      flag changes behavior, never tool count.
- [ ] **Zero prompts; 10 public resources** still visible.
- [ ] **With the execution flag absent/false, each of the four market-context
      tools fails closed `paid_execution_disabled`** when invoked with a valid
      minimal input (`paid_execution_authorized: false`).
- [ ] **No request** is sent on the denial (`api_request_sent: false`).
- [ ] **No auth header** is constructed (`auth_header_sent: false`,
      `payment_header_sent: false`).
- [ ] **No cap debit** — session counters stay `0` calls / `0 STC`.
- [ ] **No catalog reconciliation is evaluated** on the structural denial
      (`pricing_reconciliation.status: not_evaluated` — the current expected
      behavior: the structural gate denies before the loop gate, pricing
      preflight, and any catalog read).

## 7. Live paid validation configuration (future PR #53)

Recommended local environment for the single authorized execution-enabled
server session — set process-locally in the operator's shell only after the
§4 phrase is given, and unset immediately after (§12):

| Variable | Recommended value | Note |
| --- | --- | --- |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | `true` | Exposure flag. The config parser accepts only `true` as truthy for this flag (`1` is rejected as `invalid_config`). |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | `true` | Execution flag (this is the variable's exact name in `src/config.ts`; there is no `STOCKTRENDS_ALLOW_PAID_EXECUTION`). Same `true`-only parsing. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | `4` | Covers at most the four planned calls; nothing more. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | `1` | At most one call per tool, enforced in-process. |
| `STOCKTRENDS_MAX_STC_PER_SESSION` | `0.80` | Covers the `0.75 STC` worst case with a small buffer. |
| `STOCKTRENDS_API_KEY` | set locally only | **Secret.** Never printed, logged, committed, pasted, or screenshotted; value never inspected. |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | leave at default `true` | Setting it `false` denies execution; it never weakens preflight. |

- **Real values must not be committed, pasted, screenshotted, or logged.**
  Reports and transcripts show variable names and `REDACTED` placeholders
  only.
- No `STOCKTRENDS_MAX_USD_PER_SESSION` is required: all four market-context
  rules are STC-denominated (`cost_unit: STC`) and carry no separate USD cost.
- **All live paid calls must run within this single server session**, so the
  in-memory caps (`4`/`1`/`0.80`) genuinely bound the whole live phase. Caps
  are in-memory and reset on restart: if the server must be restarted
  mid-phase, the operator counts the paid calls already executed against the
  authorized total and lowers the new session's caps/budget to the remaining
  allowance before continuing (e.g. after two completed calls, at most
  `2` calls and the remaining tools' summed cost).

## 8. Planned live paid calls (at most four; budget and caps)

**Plan only. Do not perform as part of PR #52.** Performed later, only under
the §4 phrase, only once §5–§7 hold, and only within the §7 caps. Maximum live
paid validation exposure:

- **At most one live call to each of the four approved paid tools.**
- **At most four paid calls total.**
- **Expected maximum planned spend: `0.75 STC`**
  (`0.15 + 0.25 + 0.1 + 0.25`).
- **Recommended session STC cap: `0.80 STC`; session call cap: `4`; per-tool
  call cap: `1`** (§7).
- **The operator may choose to validate fewer than four paid tools** — the
  phrase authorizes "at most," never "at least." Skipped tools are recorded as
  not exercised, and remain covered by the mock-only suite.
- **Never retry a failed paid call**, and **never repeat an identical paid
  call** — the adapter itself fails closed on identical repeats
  (`repeated_identical_market_context_call`), and the operator must not
  attempt them either.
- **No paid call may be made outside the four approved tools** — no deferred
  route, no other family, no raw keyed API call that bypasses the MCP gates.

The four planned calls, in recommended order:

| # | Tool | Endpoint | Expected cost | Exact minimal input | Expected limit / effective-parameter behavior | Success criteria | Failure-stop behavior |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `stocktrends_get_market_regime_latest` | `GET /v1/market/regime/latest` | `0.15 STC` | `{}` | Strict empty input; no limit parameter exists; unknown keys rejected. | One `GET` to this endpoint only; `paid_execution_authorized: true`; `auth_header_sent: true`, `payment_header_sent: false`; reconciliation `reconciled` (family `market`) before auth/fetch; `api_data` verbatim; `observed_cost`/`payment_status` `null`; regime framing (market context, not a trading recommendation) in metadata. | On any denial/error: record it, no retry, no second regime-latest call (constant signature blocks it anyway); continue or stop per the rule below. |
| 2 | `stocktrends_get_market_regime_history` | `GET /v1/market/regime/history` | `0.25 STC` | `{ "limit": 1 }` | `effective_limits.limit = 1`, sent explicitly (`limit` is always sent; API default `12` can never apply); no `start_date` supplied in this first validation. | Same gate/auth/verbatim assertions; endpoint `/v1/market/regime/history` only; `returned_row_count` ≤ 1 where derivable; reconciliation shares the cached `market` family state from call 1 if present. | Record; no retry; no repeat; continue or stop per the rule below. |
| 3 | `stocktrends_get_breadth_sector_latest` | `GET /v1/breadth/sector/latest` | `0.1 STC` | `{ "limit": 1 }` | `effective_limits.limit = 1` and `group_level = sector` both sent explicitly (both are always sent; the API's `5000` default can never apply); no exchange/price/volume filters in this first validation. | Same assertions; endpoint `/v1/breadth/sector/latest` only; fresh `breadth`-family reconciliation before auth/fetch; breadth framing (participation context, not confirmation signals). | Record; no retry; no repeat; continue or stop per the rule below. |
| 4 | `stocktrends_get_leadership_summary_latest` | `GET /v1/leadership/summary/latest` | `0.25 STC` | `{ "limit_overall": 1, "limit_bucket": 1 }` | `effective_limits.limit_overall = 1` and `limit_bucket = 1` both sent explicitly; no `min_rsi`/`min_mt_cnt`/`exchange` supplied, so the API defaults apply server-side. | Same assertions; endpoint `/v1/leadership/summary/latest` only; fresh `leadership`-family reconciliation before auth/fetch; leadership framing (rotation context, not picks). | Record; no retry; no repeat; this is the last planned call — proceed to rollback (§12). |

**Minimal-input rule:** the live probes use exactly the inputs above. Do
**not** include `start_date`, `exchange`, `min_price`, `min_volume`,
`min_rsi`, `min_mt_cnt`, or any other filter in this first live validation —
optional passthroughs stay unexercised live and remain covered by the
mock-only suite.

**If one paid call fails:** the operator records the deterministic
denial/error exactly as observed and does **not** retry it. The operator may
continue to the **next different approved tool** only when all of the
following hold — this is the explicit continuing-is-safe rule this plan
provides:

1. the failure was fail-closed **before** the billable boundary (no request,
   no auth header, no cap debit), **or** it was a single clean billable
   attempt with no unexpected spend beyond that tool's listed cost;
2. the remaining session call cap and STC budget still cover the next planned
   call; and
3. the failure does not indicate an auth-boundary, routing, or secret problem
   (e.g. an unexpected endpoint, a key sent to a non-promoted route, any
   Bearer/payment header, or any secret appearing in output) — any of those is
   a §13 validation failure requiring an immediate full stop and rollback.

Otherwise the operator stops, performs §12 rollback, and reports the partial
run.

## 9. Required negative/safety probes (no-spend only)

All negative probes are **mock-only or execution-disabled/no-paid-boundary**
checks unless a step is clearly non-paid (credential-free public reads):

- [ ] **Default/free surface check** — no `STOCKTRENDS_*` variables: exactly
      1 tool, 10 public resources, 0 prompts, no paid tool visible (§5).
- [ ] **Public resource credential-free check** — the definitions resource
      read with no key (§10); clearly non-paid (catalog-verified zero-cost).
- [ ] **Prompts zero check** — `prompts/list` shows no prompts capability in
      every configuration exercised.
- [ ] **Execution-disabled fail-closed check** — all four tools deny
      `paid_execution_disabled` with no request/auth/cap debit/reconciliation
      (§6).
- [ ] **Invalid input schema checks before paid execution** — exercised under
      the §6 execution-disabled placeholder-key configuration, where every
      rejection occurs at the strict schema (`-32602 Input validation error`)
      before the handler, so no endpoint/pricing/auth/fetch is reached:
      regime latest `{"foo": 1}` (unknown key on the strict empty schema);
      regime history `limit` `0`, `53`, `1.5`, `[1]`, `"all"`, and a
      malformed `start_date`; breadth `limit` `0`/`251`, an invalid
      `group_level`, and `weekdate`/`vol_scale` rejected as unknown keys;
      leadership `limit_overall` `0`/`201`, `limit_bucket` `0`/`51`,
      `min_rsi` `501`, and `weekdate`/`type` rejected as unknown keys. Never
      silently clamped.
- [ ] **Cap-denial check before auth/fetch** — primarily validated by the
      merged mock-only suite. An optional live-adjacent probe is permitted
      only in a **separate throwaway session with a placeholder key**
      (execution flag `true`, caps left at `0`/unset): the invocation must
      deny `spend_cap_exceeded` before any auth/fetch with no request and no
      spend, and must be disclosed in the report.
- [ ] **Duplicate-call denial check** — **preferably mock-only**
      (`repeated_identical_market_context_call` is covered by the Phase 5D
      suite, sequential and concurrent, including reservation release and
      executed-persistence). In the live session the four calls have four
      distinct signatures and each tool is called at most once, so the loop
      gate is never triggered live; do not issue a live duplicate to "see it
      fire."

Explicitly **not** required and **not** permitted as live probes: live
invalid-input paid calls; live duplicate paid calls; live cap-failure calls
that could accidentally spend; any call to a deferred route
(`endpoint_not_allowlisted` denials are validated by the mock-only suite and
policy-helper tests, not by live probing).

## 10. Public resource validation (leadership definitions)

Plan to verify, in both the default/free and paid-exposed sessions:

- [ ] **`stocktrends://leadership/definitions` is visible in every mode** —
      the 10-resource surface is identical with and without paid
      configuration.
- [ ] **Fetch-on-request** — the resource is fetched when read, not at
      startup; no startup API call occurs.
- [ ] **No `X-API-Key`** — the read sends public headers only (`Accept` +
      `User-Agent`); the route is credential-free and never keyed, under any
      configuration including the execution-enabled session.
- [ ] **No paid pricing reconciliation** — reading the resource triggers no
      catalog reconciliation and no paid preflight
      (`leadership_definitions_public` is `access_type: public`, zero cost,
      `cost_unit: request`, and is never a paid STC mirror).
- [ ] **No paid path** — the read never enters the paid client/boundary; the
      route is not on, and can never join, the auth-capable allowlist.
- [ ] **Response preserved** — the API definitions document is returned as
      API-authored data; record only a top-level shape summary (e.g. key
      names: `concept`, `indicators`, `taxonomy_source`, `taxonomy_levels`,
      `notes`), not the full payload.
- [ ] **Route is credential-free** — a `200` without any credential; if the
      route instead returns `401`/`403`/`5xx` credential-free, record it as a
      §13 stop condition for the resource check (no key may be added to
      "fix" it).
- [ ] **No live paid spend** — this entire section is zero-cost.

## 11. Evidence to capture in the PR #53 report (secret-free only)

- **Command summaries, not raw secrets** — what was run and in which
  configuration, with every secret-shaped value shown as `REDACTED`.
- **Tool/resource counts** per mode (1 free / 10 paid-exposed; 10 resources).
- **Prompt count** (0) in every configuration.
- **Tool names** observed in each listing.
- **Resource URI** (`stocktrends://leadership/definitions`) and its
  credential-free read result.
- **Paid tool inputs** — the exact minimal inputs used (§8).
- **Expected vs observed STC estimates** — per-call `pricing_rule` and
  `estimated_cost` against the §8 table.
- **Actual paid call count** and **the configured capped maximum**
  (`n of 4`, per-tool `≤ 1`, budget `0.80 STC`).
- **Whether `X-API-Key` was sent only to approved paid routes**, described via
  wrapper metadata (`auth_header_sent` per call, credential-free catalog and
  resource reads), without revealing the key.
- **`request_id`** if the API returns one and it is non-secret (a correlation
  id, as in prior reports).
- **Row counts where derivable** (`returned_row_count`, per-bucket counts if
  derivable for leadership).
- **`api_data` shape summary, not large raw payload** — top-level (and
  first-row, where list-shaped) key names only. No full raw API payload is
  reproduced unless it is tiny and secret-free.
- **All secrets redacted as `REDACTED`** — no key value, no populated
  `X-API-Key`/`Authorization` header, no realistic-looking fake.
- **No screenshots containing secrets** — redact or do not capture panes
  where a key was typed.

## 12. Rollback procedure

Performed by the operator immediately after any controlled run (full, partial,
or abandoned), regardless of outcome:

- [ ] **Unset `STOCKTRENDS_API_KEY`** from the shell/session
      (`Remove-Item Env:STOCKTRENDS_API_KEY` / `unset STOCKTRENDS_API_KEY`);
      close/restart the shell if there is any doubt about residual state.
- [ ] **Unset/disable the paid flags** — `STOCKTRENDS_ENABLE_PAID_TOOLS`,
      `STOCKTRENDS_ENABLE_PAID_EXECUTION`, and clear the cap/budget variables
      (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
      `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`,
      `STOCKTRENDS_MAX_STC_PER_SESSION`, and any others set for the run).
- [ ] **Restart the MCP/server process** with no `STOCKTRENDS_*` paid-related
      variables set (ephemeral validation children must have exited).
- [ ] **Confirm the default/free one-tool surface** — exactly
      `stocktrends_estimate_workflow_cost`; none of the nine paid tools
      (including the four market-context tools) is visible.
- [ ] **Confirm resources are still credential-free** — all 10 public
      resources listed and readable with no key, including
      `stocktrends://leadership/definitions`.
- [ ] **Confirm zero prompts.**
- [ ] **Confirm no key remains in environment/session output** — boolean
      presence checks for the paid variables return false; values are never
      printed.
- [ ] **Confirm no generated secret/log artifacts** — no repository file, log,
      fixture, or scratch artifact containing a key, populated auth header, or
      raw secret was created; anything transient lived outside the repository
      and is deleted.
- [ ] **Record the rollback result secret-free** in the §14 report.

## 13. Failure handling

**Each of the following is a validation failure:** any request to an
unexpected route; any second paid call to the same tool; any retry of a paid
call; any auth header sent to a public/credential-free route (catalog,
definitions resource, any public resource, planning tool); any
`Authorization: Bearer` or payment header; any spend above the configured cap
or above the authorized `0.75 STC` maximum; a tool-count mismatch (≠ 1 free /
≠ 10 paid-exposed); a resource-count mismatch (≠ 10); a prompt-count mismatch
(≠ 0); or any secret exposure in any output, capture, or artifact.

**If a validation failure occurs:** stop immediately, perform the §12
rollback, document the failure exactly as observed (secret-free) in the §14
report, and **do not proceed to signoff** — PR #54 is blocked until the
failure is understood and resolved under its own reviewed follow-up.

**No manual workarounds that bypass MCP gates.** Never call the API directly
with the key to "finish" a failed validation, never raise caps casually to get
past a denial, never disable preflight, never switch auth schemes, and never
edit runtime code mid-validation. Expected fail-closed denials
(`paid_execution_disabled`, `spend_cap_exceeded`,
`pricing_catalog_reconciliation_failed`,
`repeated_identical_market_context_call`, `endpoint_not_allowlisted`, schema
rejections) are correct results to record, not obstacles to defeat; for a
`401`/`402`/`403`/`429`/`5xx` on an authorized call, the single deterministic
error is the complete observation (a `402` is safe metadata only — nothing is
signed, paid, or retried).

## 14. PR #53 report template

For the **later** report only. Filling it in is out of scope for this plan and
must not be done speculatively or with "expected" values presented as real
results. Use `REDACTED` placeholders for anything secret-shaped.

```markdown
# Phase 5D Market-Context Controlled Validation Report

- Date/time (UTC):
- Operator:
- Execution mechanism: (operator-supervised manual MCP invocation / supervised
  MCP client/agent session over local stdio)
- Commit hash / branch:
- Environment: (OS, Node version, transport = stdio, API base URL origin)

## Authorization
- Exact §4 authorization phrase received verbatim: [yes / no — not authorized]
- If no: live phase not performed; only no-spend phases below.

## Environment / caps (redacted)
- STOCKTRENDS_ENABLE_PAID_TOOLS / STOCKTRENDS_ENABLE_PAID_EXECUTION: [values]
- Caps: calls/session, calls/tool, STC budget: [values]
- STOCKTRENDS_API_KEY=<REDACTED> (present; value never inspected)

## Default/free surface evidence (§5)
- Exactly one tool / 10 resources / zero prompts / no paid tools: [confirmed?]

## Public resource evidence (§10)
- stocktrends://leadership/definitions listed in every mode: [confirmed?]
- Credential-free fetch-on-request read (no X-API-Key, no paid path,
  no reconciliation); shape summary only: [confirmed?]

## Paid-exposed, execution-disabled evidence (§6)
- Exactly ten tools / zero prompts: [confirmed?]
- Each of the four tools fails closed paid_execution_disabled with no
  request/auth header/cap debit; reconciliation not_evaluated: [confirmed?]

## Limit-safety / invalid-input evidence (§9)
- Defaults sent when omitted (12; 50 + sector; 50/20): [confirmed?]
- Out-of-range/non-integer/array/sentinel/unknown-key (incl. weekdate,
  vol_scale, type) rejected at -32602 before pricing/auth/fetch: [confirmed?]
- Cap-denial and duplicate-denial coverage (mock-only, or disclosed no-spend
  probe): [describe]

## Planned live paid calls (§8) — only if authorized and performed
| # | Tool | Input | Outcome | pricing_rule / estimated_cost | auth_header_sent | returned_row_count | request_id |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | market_regime_latest | {} | | | | | |
| 2 | market_regime_history | { "limit": 1 } | | | | | |
| 3 | breadth_sector_latest | { "limit": 1 } | | | | | |
| 4 | leadership_summary_latest | { "limit_overall": 1, "limit_bucket": 1 } | | | | | |

## Total spend / call count
- Paid calls attempted: [n of at most 4]; STC consumed: [x of 0.80 budget]
- observed_cost / payment_status remained null unless API-returned: [confirmed?]

## Auth-boundary observations
- X-API-Key only to the four promoted routes after all gates; catalog /
  definitions / public resources credential-free; no Bearer; no payment
  header; no retry: [confirmed?]

## Negative checks (§9)
- [list what was exercised and how each failed closed]

## Rollback evidence (§12)
- Key/flags/caps unset; restart shows 1 tool / 10 resources / 0 prompts; no
  key in session output; no secret/log artifacts: [confirmed?]

## Deviations
- (every deviation from the plan, however small)

## Conclusion
- [PASS / PASS WITH DEVIATIONS / FAIL]
- No production-readiness claim is made by this report; signoff is a separate
  PR (#54) after independent review.
```

## 15. Non-goals

- **No live validation in PR #52** — this plan performs no call, no paid
  execution, no spend, and uses no key.
- **No implementation changes** — no `src/`, `tests/`, or package changes; no
  tools, resources, prompts, promotions, or pricing-mirror changes.
- **No MCP Inspector** session in this PR (and none is required by PR #53,
  which may use an equivalent supervised local-stdio MCP client per the
  Phase 5B/5C precedent).
- **No remote MCP** — local stdio only.
- **No x402, wallet, OAuth, `Authorization: Bearer`, or payment-header
  behavior** — under any configuration or outcome.
- **No deferred routes** — no `/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, or `/v1/leadership/rotation/history`.
- **No decision/portfolio endpoints** — no `/v1/decision/evaluate-symbol`,
  `/v1/portfolio/evaluate`, `/v1/portfolio/compare`, or
  `/v1/portfolio/construct`; likewise no `/v1/selections/history` and no
  `/v1/selections/published/*`.
- **No Intelligence Agent artifacts** — no artifact endpoint is touched.
- **No advice** — no buy/sell/hold/allocation/risk/suitability output, and no
  MCP-side regime/breadth/leadership recomputation of any kind.
- **No signoff** — this plan neither is nor contains a production-readiness
  declaration.

## 16. Final recommendation

- **Recommend PR #52 proceed to Codex review.** This plan must be
  independently reviewed and merged before any validation activity begins.
- **After merge, PR #53 may perform the controlled validation only with the
  exact §4 authorization phrase**, supplied contemporaneously by the operator,
  under the §7 configuration and the §8 budget (at most one call per approved
  paid tool, at most four paid calls, at most `0.75 STC` expected spend), with
  results recorded secret-free using the §14 template. Absent that phrase, the
  capability remains validated by the mock-only suite plus this plan's
  no-spend inspections, and no live paid market-context validation may be
  claimed.
- **PR #54 (narrow production-readiness signoff) only if PR #53 passes** and
  the completed report is independently reviewed — scope limited to controlled
  local stdio operator use, exactly as the Phase 4/5B/5C signoffs.
- **No production-readiness claim exists before that signoff**, and this plan
  makes none.
