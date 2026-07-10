# Phase 5B Indicators Controlled Validation Report

> **CONTROLLED LIVE VALIDATION COMPLETED — PASS WITH DEVIATIONS.**
>
> A single operator-authorized, operator-supervised controlled live validation
> was performed against the real Stock Trends API, per
> [`PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md).
> The live paid portion consisted of exactly **two** bounded, operator-authorized
> paid calls — one `stocktrends_get_indicators_latest` and one
> `stocktrends_get_indicators_history` — plus one deliberately cap-denied probe
> that sent **no** paid request. Results below are recorded exactly as observed.
> Deviations are documented in §9 and are assessed non-blocking.
>
> This report does not declare paid indicators MCP execution production-ready.
> Per plan §14, production-readiness requires independent review of this
> completed report, which has not yet occurred (see §10).
>
> No API key value, no populated `X-API-Key` header value, and no raw secret
> appears anywhere in this report. Only non-sensitive wrapper metadata is
> recorded.

- **Date/time UTC:** 2026-07-10T14:20:29Z (live run and rollback performed same session, immediately prior)
- **Operator:** Skot Kortje / Stock Trends (skortje@stocktrends.com)
- **Commit hash:** `38a8a349e675a20fcb916b14deaf3fddda5c7b9a`
- **Branch:** `claude/phase5b-indicators-validation-1303c4` (not `main`; based on `main` including `38a8a34 Add indicators controlled validation plan (#40)`)
- **Environment:** Windows 11; Node.js `v22.12.0`; transport `stdio`; API origin `https://api.stocktrends.com` (default approved origin)
- **Execution mechanism:** the compiled stdio server (`dist/server.js`) driven over **local stdio** by a throwaway MCP client harness built on the project's own MCP SDK (`@modelcontextprotocol/sdk` client + `StdioClientTransport`). This is a faithful, non-interactive equivalent of the documented MCP Inspector procedure ([`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md) / [`README.md`](../README.md)) — same compiled server, same stdio transport, same tool/resource listing and tool-invocation surface. The harness lives outside the repository (session scratchpad) and changed no repository file. See §9.
- **API key handling:**
  - Key present only as a process-local environment variable, supplied by the operator's own shell.
  - Value never printed, logged, stored, inspected, or committed. The harness forwarded the variable to the child server process without reading it, checked only its boolean presence, and scrubbed any accidental match of the key value from all output.
  - This report uses `REDACTED` placeholders only (e.g. `STOCKTRENDS_API_KEY=<REDACTED>`, `X-API-Key: <REDACTED>`).

## 1. Scope

This is the completed **one-off controlled validation report** for the Phase 5B
paid indicators tools (`stocktrends_get_indicators_latest` →
`GET /v1/indicators/latest`; `stocktrends_get_indicators_history` →
`GET /v1/indicators/history`) and the **internal credential-free instrument
resolver** (`resolveInstrumentIdentity`). It records the results of a single
operator-authorized, operator-supervised live validation performed under the
merged validation plan (PR #40), covering: baseline preconditions (Phase 0),
the default/free surface (Phase 1), the paid-exposed execution-disabled surface
(Phase 2), the resolver cases (Phase 3), the controlled live paid calls
(Phase 4), and rollback (Phase 5). It does not modify `src/`, `tests/`,
`README.md`, `package.json`, or `package-lock.json`; the only file created is
this report.

## 2. Preconditions (Phase 0)

Run on `38a8a34`, working tree clean before edits:

| Check | Result |
| --- | --- |
| `git status --short --branch` | clean; on `claude/phase5b-indicators-validation-1303c4` |
| `npm run typecheck` (`tsc --noEmit`) | **PASS** — no errors |
| `npm test` (`vitest run`) | **PASS** — 13 test files, 250 tests passed |
| `npm run build` (`tsc -p tsconfig.build.json`) | **PASS** — `dist/server.js` produced |
| `git diff --check` | clean (no whitespace/conflict errors) |

All Phase 0 preconditions held; live validation proceeded.

## 3. Default/free validation (Phase 1)

Server started over stdio with **no** `STOCKTRENDS_*` variables (no key, no paid
flags, no caps):

| Item | Observed |
| --- | --- |
| Visible tool count | **1** |
| Visible tool names | `stocktrends_estimate_workflow_cost` only |
| Public resources visible | **9** (`stocktrends://api/openapi`, `ai/context`, `ai/tools`, `workflows`, `methodology/stim`, `methodology/indicators`, `methodology/inference`, `pricing/catalog`, `proof/market-edge`) |
| Prompts | **0** (`prompts/list` → `-32601 Method not found`: no prompts capability registered) |
| Paid tools absent | confirmed — none of the four paid tools present |
| Spend possible | **no** — only the credential-free planning tool exists; child saw no key |

## 4. Paid-exposed, execution-disabled validation (Phase 2)

Server started with `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and a **placeholder**
`STOCKTRENDS_API_KEY=<REDACTED placeholder — not a real key>`; execution flag
unset; no caps. (A placeholder was deliberately used so the real key stayed
untouched during exposure/denial testing.)

| Item | Observed |
| --- | --- |
| Visible tool count | **5** |
| Visible tool names | `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history` |
| Public resources / prompts | 9 resources; **0** prompts |
| Startup warning (stderr) | "Paid ST-IM and indicators tools are exposed but paid execution is NOT enabled … every invocation fails closed with no request." |

Indicators execution-disabled denial (invoked with canonical `IBM_N`, so no
discovery call and no network was required to reach the deterministic denial):

| Assertion | `indicators_latest` | `indicators_history` (limit 5) |
| --- | --- | --- |
| `error_code` | `paid_execution_disabled` | `paid_execution_disabled` |
| `paid_execution_authorized` | `false` | `false` |
| `api_request_sent` | `false` | `false` |
| `auth_header_sent` | `false` | `false` |
| `payment_header_sent` | `false` | `false` |
| `pricing_reconciliation.status` | `not_evaluated` (no catalog read) | `not_evaluated` |
| Cap debit (`paid_calls_this_session` / `stc_spent`) | `0` / `0` | `0` / `0` |
| `automatic_paid_retries` | `false` | `false` |
| Outbound identity in metadata | `IBM-N` (hyphen) | `IBM-N` (hyphen) |

Both indicators tools **fail closed** with execution disabled: no paid request,
no auth header, no payment header, no cap debit.

## 5. Resolver validation (Phase 3)

Exercised through the exposed indicators tool under the Phase 2 configuration
(exposure + placeholder key + execution disabled), so the resolver ran ahead of
the paid boundary and its outcome is observable in the tool's wrapper metadata.
Live credential-free discovery calls (`/v1/instruments/lookup`,
`/v1/instruments/resolve`) were made only where the case required them, and never
with an API key header.

| Case | Input | Observed outcome |
| --- | --- | --- |
| **Canonical `symbol_exchange`** | `IBM_N` | `identity_source: symbol_exchange`; `resolution_used: false` (no discovery call); outbound `IBM-N`; **proceeds to paid gates** (execution-disabled denial). Conflicting `symbol`/`exchange` → see next row. |
| **Canonical conflict** | `IBM_N` + `symbol=AAPL` | `instrument_identity_conflict`; fails closed; no network; no request/auth/cap debit. |
| **Bare unambiguous symbol** | `GOOGL` | `resolution_source: instruments_lookup`; `count==1`; resolved `GOOGL-Q`; `identity_source: resolved_symbol`; **proceeds to paid gates**. (`KO` → `KO-N` likewise.) |
| **Ambiguous symbol (live-confirmed)** | `IBM` | Ambiguity confirmed by credential-free `instruments_lookup`: `candidate_matches: [IBM-N, IBM-T]`; `instrument_symbol_ambiguous`; **fails closed before paid gates**; no paid call. (Also currently ambiguous at run time: `AAPL`[AAPL-Q,AAPL-T], `MSFT`, `TD`[TD-N,TD-T], `RY`, `BNS`, `ENB`, `SHOP`, `NVDA`.) |
| **Explicit `symbol` + `exchange`** | `symbol=IBM`, `exchange=N` | `resolution_source: instruments_resolve` with an **explicit `prefer_exchange=N`** (equal to the supplied exchange, not a default); resolved `IBM-N`; **proceeds to paid gates**. |
| **Invalid exchange** | `symbol=IBM`, `exchange=Z` | Rejected at the MCP input schema (`z.enum` → `-32602 Input validation error`) **before** the handler; fails closed; no resolution, network, or paid boundary. |
| **No-match symbol** | `ZZZZQQ` | `resolution_source: instruments_lookup`; `instrument_symbol_not_found`; fails closed. |
| **No `prefer_exchange=N` default reliance** | `IBM` (bare) | The bare-symbol path uses `instruments_lookup` only and **never** `instruments/resolve`; `IBM` (dual-listed N/T) **fails closed with both candidates** rather than silently auto-picking `IBM-N`. The default-`N` auto-pick could not occur. |
| **No key to lookup/resolve** | all discovery cases | Discovery returned correct `200`/`404`/`409` outcomes with only a **placeholder** key configured — a key-checked route would have rejected the placeholder — confirming the resolver's discovery calls are credential-free (`fetchPublicDiscovery` sends `Accept` + `User-Agent` only). |
| **No paid boundary on failures** | all failure cases | Every non-success case showed `api_request_sent: false`, `paid_calls_this_session: 0`, `stc_spent: 0` — no cap debit, no paid call. |

## 6. Controlled live paid indicators validation (Phase 4)

- **Explicit authorization received:** **Yes.** The operator supplied the exact
  phrase in this session: *"AUTHORIZED: run at most one indicators latest call
  and one indicators history call under the configured caps"* before any paid
  execution was enabled or any paid tool invoked.
- **Configuration (redacted, summarized; process-local child env only):**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true`; `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`;
  `STOCKTRENDS_API_KEY=<REDACTED>` (present; value never inspected);
  `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT=true` (mandatory preflight left enabled,
  not disabled); `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION=2`;
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL=1`; `STOCKTRENDS_MAX_STC_PER_SESSION=0.02`
  (covers `0.0035 + 0.01 = 0.0135 STC` with a modest buffer). All three calls
  ran in a **single server session** so the in-memory per-session cap was
  genuinely exercised across calls.
- **Startup warning (stderr):** confirmed live execution ENABLED banner; "No API
  key is logged."

**Latest result (`stocktrends_get_indicators_latest`, `symbol_exchange=IBM_N`):**

| Field | Value |
| --- | --- |
| Outcome | **Success** — one live paid call completed |
| Endpoint | `GET /v1/indicators/latest` only |
| Outbound identity | `IBM-N` (hyphen); `api_data.symbol_exchange` preserved verbatim as `IBM-N` |
| `identity_source` | `symbol_exchange` (canonical; no discovery call) |
| `paid_execution_authorized` / `paid_execution_occurred` | `true` / `true` |
| `api_request_sent` / `auth_header_sent` / `payment_header_sent` | `true` / `true` / `false` |
| `pricing_rule` / `estimated_cost` | `indicators_latest_paid` / `0.0035 STC` |
| `pricing_reconciliation` | `reconciled` (source `pricing_catalog`) — before any auth header/fetch |
| Caps after call | `paid_calls_this_session: 1`, `paid_calls_this_tool: 1`, `stc_spent_this_session: 0.0035` |
| `observed_cost` / `payment_status` | `null` / `null` (not returned by API; not fabricated) |
| `automatic_paid_retries` | `false` |
| `request_id` | `e504f848-d6c4-4b10-ac14-eee2aad120bd` (non-secret correlation id) |
| `api_data` preserved | yes (fields incl. `weekdate`, `exchange`, `symbol`, `trend`, `rsi`, …) |

**History result (`stocktrends_get_indicators_history`, `symbol_exchange=IBM_N`, `limit=5`):**

| Field | Value |
| --- | --- |
| Outcome | **Success** — one live paid call completed |
| Endpoint | `GET /v1/indicators/history` only |
| Outbound identity | `IBM-N` (hyphen); `api_data.symbol_exchange` = `IBM-N` |
| `paid_execution_authorized` / `paid_execution_occurred` | `true` / `true` |
| `api_request_sent` / `auth_header_sent` / `payment_header_sent` | `true` / `true` / `false` |
| `pricing_rule` / `estimated_cost` | `indicators_history_paid` / `0.01 STC` |
| `pricing_reconciliation` | `reconciled` (cached for the session from the latest call) |
| Caps after call | `paid_calls_this_session: 2`, `paid_calls_this_tool: 1`, `stc_spent_this_session: 0.0135` |
| `observed_cost` / `payment_status` | `null` / `null` |
| `automatic_paid_retries` | `false` |
| `request_id` | `06a1af9d-269f-4258-a698-c6b615b0f5a4` |
| `api_data` preserved | yes (keys: `request_id`, `symbol_exchange`, `cs_only`, `start`, `end`, `count`, `data`) |

**Endpoint / auth-header / bounded-execution assertions:**

- `X-API-Key` (`auth_header_sent: true`) was sent **only** on the two approved
  paid indicators endpoints (`/v1/indicators/latest`, `/v1/indicators/history`).
  Canonical `IBM_N` required no discovery, so no `lookup`/`resolve`/`catalog`
  call carried a key; the credential-free discovery posture was separately
  exercised in Phase 3. The planning tool and public resources are credential-free.
- **No `Authorization: Bearer`** on any request (auth is `X-API-Key` only).
- **No payment header** constructed or sent (`payment_header_sent: false`); no
  `402` handling was triggered.
- **No retry** (`automatic_paid_retries: false`).
- **`api_data` preserved verbatim**; `observed_cost`/`payment_status` remained
  `null` (never fabricated from static/catalog prices).
- **Cap-enforcement probe** (a 2nd `latest`, issued to confirm caps prevent a
  further paid call): denied with `spend_cap_exceeded`; `paid_execution_authorized:
  false`, `api_request_sent: false`, `auth_header_sent: false`;
  `pricing_reconciliation: not_evaluated`; session counters unchanged
  (`paid_calls_this_session: 2`, `stc_spent_this_session: 0.0135`) — **no paid
  request, no additional spend.**
- **Total paid calls: exactly 2.** Caps prevented any third paid call.

## 7. Cost / cap observations

- `indicators_latest_paid` = **`0.0035 STC`** — confirmed as the preflight
  `estimated_cost` for the latest call.
- `indicators_history_paid` = **`0.01 STC`** — confirmed as the preflight
  `estimated_cost` for the history call.
- **Catalog reconciliation:** the family-scoped, credential-free
  reconciliation of the indicators static mirror against the live
  `GET /v1/pricing/catalog` (including the `STC` unit check) **succeeded before
  any `X-API-Key` header was built or any indicators fetch occurred**
  (`status: reconciled`, `source: pricing_catalog` on the latest call; cached
  `reconciled` for the session on the history call).
- **Cap/budget consumption:** two paid calls consumed `0.0135 STC` of the
  `0.02 STC` session budget; per-tool cap `1` and per-session cap `2` were both
  honored. The third invocation was **cap-denied** (`spend_cap_exceeded`) with no
  spend — fail-closed cap enforcement confirmed.
- **No automatic retry** on any call or on the denial.

## 8. Rollback confirmation (Phase 5)

- **API key:** all validation server processes were ephemeral children spawned
  with an explicitly controlled env; the paid child exited at the end of Phase 4,
  so no paid server or forwarded key persists server-side.
- **Paid tools / execution / caps:** the rollback restart used **no**
  `STOCKTRENDS_*` variables at all.
- **Default/free one-tool surface confirmed on restart:** exactly **1** tool
  (`stocktrends_estimate_workflow_cost`); paid tools no longer visible.
- **Zero prompts confirmed.**
- **Public resources visible:** all **9** credential-free resources listed.
- **Operator-side shell cleanup completed:** after the run, the operator unset
  the paid variables from their PowerShell session — `STOCKTRENDS_API_KEY`,
  `STOCKTRENDS_ENABLE_PAID_TOOLS`, `STOCKTRENDS_ENABLE_PAID_EXECUTION`, the paid
  call caps (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`), the STC/USD budget caps
  (`STOCKTRENDS_MAX_STC_PER_SESSION`, `STOCKTRENDS_MAX_USD_PER_SESSION`), and
  `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT`. Boolean presence checks for these
  variables returned `false` (values were not printed), confirming plan §11 is
  complete operator-side.

## 9. Deviations / follow-ups

- **Execution mechanism (procedural, non-blocking).** The documented mechanism
  names the interactive MCP Inspector UI. This session is non-interactive, so an
  equivalent local-stdio MCP client harness (built on the project's own MCP SDK)
  drove the same compiled `dist/server.js` over stdio. It exercises the identical
  tool/resource listing and tool-invocation surface. The harness lives in the
  session scratchpad outside the repository and changed no repository file, no
  `src/`, `tests/`, `package.json`, or `package-lock.json`.
- **Extra cap-enforcement probe (disclosed, no spend).** Beyond the one latest
  and one history call, a **third** invocation (a 2nd latest) was issued solely
  to demonstrate cap enforcement. It was denied before the paid boundary
  (`spend_cap_exceeded`), sent no paid request, and incurred no spend, so it did
  not exceed the authorized "at most one latest and one history" **paid**-call
  bound. Disclosed here for completeness.
- **Operator-side shell rollback (completed).** Server-side rollback is confirmed
  (default/free surface on restart with no paid env), and operator-side rollback
  is now also complete: the operator unset the pre-provisioned `STOCKTRENDS_*`
  variables (API key, paid-tools and paid-execution flags, paid call caps,
  STC/USD budget caps, and the pricing-preflight variable) from their PowerShell
  session, with boolean presence checks returning `false` (no values printed).
  Plan §11 is fully satisfied on both sides. See §8.
- **Real STC spend incurred (expected).** The two authorized calls consumed
  `0.0135 STC` of real subscription usage. This is the expected, authorized
  outcome of a controlled live paid validation, recorded here for the audit
  trail.
- **Follow-up:** complete independent review of this report before any
  production-readiness declaration (plan §14).

## 10. Overall result

**PASS WITH DEVIATIONS.**

The Phase 5B paid indicators tools and the internal credential-free instrument
resolver behaved exactly as specified across all phases: the default/free
one-tool surface and the paid-exposed five-tool surface are correct with zero
prompts; execution-disabled invocations fail closed with no request/auth/cap
debit; the resolver reduces canonical, bare-unambiguous, and explicit identities
to a single safe canonical identity and fails closed (before any paid boundary)
on conflict, ambiguity, invalid exchange, and no-match, credential-free and with
no default-`N` auto-pick; and the two authorized live paid calls went only to the
approved indicators endpoints with `X-API-Key` only (no Bearer, no payment
header, no retry), preserved `api_data` verbatim in hyphen form, kept
`observed_cost`/`payment_status` `null`, reconciled pricing against the live
catalog before auth, and were bounded to exactly two paid calls with caps
preventing any further call. The deviations in §9 are procedural and
non-blocking. Production-readiness remains pending independent review of this
report (plan §14).
