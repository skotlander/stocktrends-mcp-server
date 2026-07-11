# Phase 5C Selections/Latest Controlled Validation Report

> **CONTROLLED LIVE VALIDATION COMPLETED — PASS WITH DEVIATIONS.**
>
> A single operator-authorized, operator-supervised controlled live validation
> was performed against the real Stock Trends API, per
> [`PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md).
> The live paid portion consisted of **exactly one** bounded, operator-authorized
> paid call to `stocktrends_get_selections_latest` (`limit=1`). No cap-denied or
> duplicate probe was issued in the execution-enabled session, honoring the
> operator's "at most one call" bound. Results below are recorded exactly as
> observed. Deviations are documented in §9 and are assessed non-blocking.
>
> This report does not declare paid selections MCP execution production-ready.
> Per plan §14, production-readiness requires independent review of this completed
> report and a separate signoff PR, which have not yet occurred (see §10).
>
> No API key value, no populated `X-API-Key` header value, and no raw secret
> appears anywhere in this report. Only non-sensitive wrapper metadata is
> recorded, and every secret-shaped placeholder is `REDACTED`.

- **Date/time (UTC):** 2026-07-11T03:02:25Z (operator local date 2026-07-10; live run and rollback performed the same session, immediately prior to writing this report)
- **Operator:** Skot Kortje / Stock Trends (skortje@stocktrends.com)
- **Commit validated:** `e8163f519259806edf9e904848d60c6eb4137aa1` (`e8163f5`)
- **Branch:** `claude/pr47-selections-validation-report` (not `main`; based on `main` including `e8163f5 Add selections latest controlled validation plan (#46)`)
- **Environment:** Windows 11; Node.js `v22.12.0`; transport `stdio`; API origin `https://api.stocktrends.com` (default approved origin); `@modelcontextprotocol/sdk` `1.29.0`
- **Execution mechanism:** the compiled stdio server (`dist/server.js`) driven over **local stdio** by a throwaway MCP client harness built on the project's own MCP SDK (`@modelcontextprotocol/sdk` `Client` + `StdioClientTransport`). This is a faithful, non-interactive equivalent of the documented MCP Inspector procedure ([`README.md`](../README.md) / [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)) — same compiled server, same stdio transport, same tool/resource/prompt listing and tool-invocation surface. The harness lives outside the repository (session scratchpad) and changed no repository file. See §9.
- **API key handling:**
  - Key present only as a process-local environment variable supplied by the operator's own shell; forwarded to the child server process **only** for the single live-execution session (§6), and only by reference (never read, printed, logged, or inspected).
  - The default/free, paid-exposed, and limit-safety phases (§3–§5) ran with a **non-secret placeholder** key so the real key stayed untouched during exposure/denial testing; the child never received the real key in those phases (the harness supplies only a curated safe environment plus the variables it sets explicitly).
  - The harness scrubbed any occurrence of the key value from all output. This report uses `REDACTED` placeholders only (e.g. `STOCKTRENDS_API_KEY=<REDACTED>`, `X-API-Key: <REDACTED>`).

## 1. Scope

This is the completed **one-off controlled validation report** for the Phase 5C
paid base-selections tool (`stocktrends_get_selections_latest` →
`GET /v1/selections/latest`, the **base ST-IM selection universe**). It records a
single operator-authorized, operator-supervised live validation under the merged
validation plan (PR #46), covering: baseline preconditions, the default/free
surface, the paid-exposed execution-disabled surface, limit-safety cases, the
controlled live paid call, cost/cap and catalog-reconciliation observations, and
rollback. This PR creates this report file and adds one README
documentation-index link; it does not modify `src/`, `tests/`, `package.json`, or
`package-lock.json`. Scope is **exactly one tool / one
endpoint** — no `selections/history`, no `selections/published/*`, and no public
selections resource is exercised.

## 2. Preconditions

Run on `e8163f5`, working tree clean before edits:

| Check | Result |
| --- | --- |
| `git rev-parse --show-toplevel` | `C:/Users/skort/Projects/stocktrends-mcp-server` |
| `git branch --show-current` | `claude/pr47-selections-validation-report` (not `main`) |
| `git status --short --branch` | clean; HEAD includes `e8163f5 Add selections latest controlled validation plan (#46)` |
| Checkout contents | `README.md`, `package.json`, `src/`, `tests/`, `docs/` all present |
| `npm run typecheck` (`tsc --noEmit`) | **PASS** — no errors |
| `npm test` (`vitest run`) | **PASS** — 14 test files, 311 tests passed |
| `npm run build` (`tsc -p tsconfig.build.json`) | **PASS** — `dist/server.js` produced |

All preconditions held; live validation proceeded.

## 3. Default/free results (§5)

Server started over stdio with **no** `STOCKTRENDS_*` variables (no key, no paid
flags, no caps):

| Item | Observed |
| --- | --- |
| Visible tool count | **1** |
| Visible tool names | `stocktrends_estimate_workflow_cost` only |
| Public resources visible | **9** (`stocktrends://api/openapi`, `ai/context`, `ai/tools`, `workflows`, `methodology/stim`, `methodology/indicators`, `methodology/inference`, `pricing/catalog`, `proof/market-edge`) |
| Prompts | **0** (`prompts/list` → `-32601 Method not found`: no prompts capability registered) |
| Paid tools absent | confirmed — none of the five paid tools present, including `stocktrends_get_selections_latest` |
| Spend possible | **no** — only the credential-free planning tool exists; child saw no key |

- Exactly one tool (`stocktrends_estimate_workflow_cost`): **confirmed**
- Public resources visible: **confirmed**
- Zero prompts: **confirmed**
- No paid tools visible / no spend: **confirmed**

## 4. Paid-exposed, execution-disabled results (§6)

Server started with `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and a **placeholder**
`STOCKTRENDS_API_KEY=<REDACTED placeholder — not a real key>`; execution flag
unset; no caps.

| Item | Observed |
| --- | --- |
| Visible tool count | **6** |
| Visible tool names | `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`, `stocktrends_get_selections_latest` |
| Public resources / prompts | 9 resources; **0** prompts |

Selections execution-disabled denial (invoked `stocktrends_get_selections_latest`, `limit=1`):

| Assertion | Observed |
| --- | --- |
| `error_code` / `denial_reason` | `paid_execution_disabled` |
| `paid_execution_authorized` / `paid_execution_occurred` | `false` / `false` |
| `api_request_sent` | `false` |
| `auth_header_sent` | `false` |
| `payment_header_sent` | `false` |
| `pricing_reconciliation.status` | `not_evaluated` (no catalog read) |
| Cap debit (`paid_calls_this_session` / `stc_spent_this_session`) | `0` / `0` |
| `automatic_paid_retries` | `false` |
| Endpoint in metadata | `/v1/selections/latest` |

- Exactly six tools visible: **confirmed**
- Zero prompts: **confirmed**
- Selections tool fails closed with execution disabled: **confirmed**
- No request to `/v1/selections/latest` / no `X-API-Key` / no cap debit on denial: **confirmed**

## 5. Limit-safety results (§7)

Exercised under the §4 execution-disabled configuration (placeholder key). Accepted
inputs reach the handler (visible in wrapper metadata) and then fail closed at
`paid_execution_disabled`; invalid inputs are rejected at the strict MCP input
schema **before** the handler runs (a `-32602 Input validation error`), so no
endpoint/pricing/auth/fetch is reached and no metadata is produced.

| Case | Observed | Assessment |
| --- | --- | --- |
| Omitted `limit` | reached handler; `effective_limit=50`, `api_request_parameters.limit=50`, `limit_is_caller_supplied=false` | effective limit 50 sent — **confirmed** |
| `limit=1` | reached handler; `effective_limit=1`, `limit` sent `=1` | accepted — **confirmed** |
| `limit=250` | reached handler; `effective_limit=250`, `limit` sent `=250` | accepted — **confirmed** |
| `limit=251` | `-32602`; `too_big` (`<=250`); no handler metadata | rejected before pricing/auth/fetch — **confirmed** |
| `limit=0` | `-32602`; `too_small` (`>=1`); no handler metadata | rejected before pricing/auth/fetch — **confirmed** |
| non-integer `limit=1.5` | `-32602`; `invalid_type` (expected int); no handler metadata | rejected before pricing/auth/fetch — **confirmed** |
| array `limit=[1]` | `-32602`; `invalid_type` (expected number, received array); no handler metadata | rejected before pricing/auth/fetch — **confirmed** |
| sentinel `limit=-1` | `-32602`; `too_small` (`>=1`); no handler metadata | rejected before pricing/auth/fetch — **confirmed** |
| sentinel `limit="all"` | `-32602`; `invalid_type` (expected number, received string); no handler metadata | rejected before pricing/auth/fetch — **confirmed** |
| unknown key `foo` | `-32602`; `unrecognized_keys`; no handler metadata | strict schema rejects unknown keys — **confirmed** |

- Omitted limit sends effective `limit 50`: **confirmed**
- `limit 1` accepted / `limit 250` accepted: **confirmed**
- `limit 251`, `limit 0`, non-integer, array, sentinel rejected before pricing/auth/fetch: **confirmed** (never silently clamped)
- `limit` is always sent when execution would proceed: **confirmed** (present in `api_request_parameters` for every accepted case)
- No pagination / no bulk / no exchange auto-iteration / no retry: **confirmed** by code (one `fetchPaid` `GET` per invocation; `automatic_paid_retries: false`) and by the mock-only suite
- Repeated identical call denies duplicate before re-billing: **confirmed via the mock-only suite + code inspection** — see §9. (Under execution-disabled the structural gate denies first, so the loop gate is not reachable there; a live duplicate probe was deliberately not issued to honor the "at most one call" bound.)
- `effective_limit` metadata checked: **confirmed** (recorded for every handler-reaching case)
- Returned row-count metadata checked where available: **confirmed** (`returned_row_count: 1` on the live success; `null` on denials, as expected)

## 6. Controlled live paid result (§8)

- **Explicit authorization received:** **Yes.** The operator supplied the exact
  plan §8 phrase in this session: *"AUTHORIZED: run at most one selections latest
  call under the configured caps"* before any paid execution was enabled or any
  paid tool invoked.
- **Configuration (redacted, summarized; process-local child env only, single server session):**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true`; `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`;
  `STOCKTRENDS_API_KEY=<REDACTED>` (present; value never inspected);
  `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT=true` (mandatory preflight left enabled,
  not disabled); `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION=1`;
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL=1`; `STOCKTRENDS_MAX_STC_PER_SESSION=0.06`
  (covers the `0.05 STC` cost with a modest buffer). No USD cap was set because the
  selections rule has no USD cost.
- **Exactly one paid selections call was attempted and completed.** No second paid
  call, no cap-denied probe, and no duplicate probe was issued in this session.

**Live result (`stocktrends_get_selections_latest`, `limit=1`):**

| Field | Value |
| --- | --- |
| Outcome | **Success** — one live paid call completed |
| Endpoint | `GET /v1/selections/latest` only |
| `effective_limit` / outbound `limit` | `1` / `1` (caller-supplied) |
| `paid_execution_authorized` / `paid_execution_occurred` | `true` / `true` |
| `api_request_sent` / `auth_header_sent` / `payment_header_sent` | `true` / `true` / `false` |
| `pricing_rule` / `estimated_cost` | `selections_latest_paid` / `0.05 STC` |
| `pricing_reconciliation` | `reconciled` (source `pricing_catalog`) — before any auth header/fetch |
| Caps after call | `paid_calls_this_session: 1`, `paid_calls_this_tool: 1`, `stc_spent_this_session: 0.05` |
| `observed_cost` / `payment_status` | `null` / `null` (not returned by API; not fabricated) |
| `automatic_paid_retries` | `false` |
| `returned_row_count` | `1` |
| Provenance | `selection_universe: base_stim_selection_universe`, `is_published_stim_select_list: false`, `published_list_endpoint: /v1/selections/published/latest`, `locally_ranked/thresholded/scored/filtered: false` |
| `api_data` preserved | yes — top-level keys `request_id`, `weekdate`, `exchange`, `min_prob13wk`, `include_data`, `include_mast`, `cs_only`, `count`, `data`; first row keys `weekdate`, `exchange`, `symbol`, `prob13wk`, `symbol_exchange` |

Assertions:

- **Exact number of paid selections calls attempted: 1.** One `GET` to
  `/v1/selections/latest`; the caps (`1`/`1`) and the single-invocation design
  prevented any further paid call.
- **Endpoint observed:** `GET /v1/selections/latest` only (no other endpoint; no
  deferred selections route).
- **`X-API-Key` restricted to the approved endpoint:** `auth_header_sent: true`
  only on the paid `/v1/selections/latest` call. The credential-free catalog
  reconciliation read (`/v1/pricing/catalog`) and the planning tool / public
  resources never receive the key (enforced by `buildPaidAuthHeaders` +
  `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`; the catalog read uses the credential-free
  `fetchJson` path). The key value is never shown.
- **No `Authorization: Bearer`** on any request (auth is `X-API-Key` only).
- **No payment header** constructed or sent (`payment_header_sent: false`); no
  `402` handling was triggered.
- **No retry** (`automatic_paid_retries: false`).
- **`api_data` preserved verbatim**; no local ranking, thresholding, scoring,
  filtering, or recomputation (provenance flags all `false`).
- **Base-vs-published distinction:** the response is the **base ST-IM selection
  universe** and is explicitly marked not the published STIM Select list; the
  metadata carries the base-universe provenance and the separate published
  endpoint path.
- **`observed_cost` / `payment_status` remained `null`** (never fabricated from
  static/catalog prices).

## 7. Cost / cap observations (§9)

- `selections_latest_paid` = **`0.05 STC`** — confirmed as the preflight
  `estimated_cost` and the `pricing_rule` on the live call.
- **Catalog reconciliation passed:** the family-scoped, credential-free
  reconciliation of the base `selections` static mirror against the live
  `GET /v1/pricing/catalog` (rule `selections_latest_paid`, endpoint
  `/v1/selections/latest`, `endpoint_family: selections`, `cost_unit: STC`,
  `amount 0.05`) **succeeded before any `X-API-Key` header was built or any
  selections fetch occurred** (`status: reconciled`, `source: pricing_catalog`).
  An ST-IM / indicators / `selections_published` mirror can never satisfy it.
- **Catalog reconciliation checklist (all verified):** rule
  `selections_latest_paid` ✓; endpoint `/v1/selections/latest` ✓; `endpoint_family`
  `selections` ✓; unit/cost_unit `STC` ✓; amount `0.05 STC` ✓.
- **Cap/budget consumption:** one paid call consumed `0.05 STC` of the `0.06 STC`
  session budget; per-tool cap `1` and per-session cap `1` were both honored and
  are now exhausted for the session.
- **No automatic retry** on the call.
- No unexpected cost, endpoint, unit, or family was observed; no fail-closed stop
  condition was triggered.

## 8. Rollback result (§11)

- **Server-side:** all validation server processes were ephemeral children spawned
  with an explicitly controlled env; the paid child exited at the end of the live
  phase, so no paid server or forwarded key persists server-side.
- **Rollback restart** used **no** `STOCKTRENDS_*` variables at all:
  - **Default/free one-tool surface confirmed:** exactly **1** tool
    (`stocktrends_estimate_workflow_cost`); paid tools no longer visible.
  - **Zero prompts confirmed.**
  - **Public resources visible:** all **9** credential-free resources listed.
  - **No paid tools visible in free/default mode:** confirmed (none of the five
    paid tools, including `stocktrends_get_selections_latest`).
- **API key / paid flags / caps:** never written to any repo file and never set by
  this process; they existed only as the operator's process-local shell
  environment (real key) or as harness-supplied per-child variables (placeholder
  key + the single live session's forwarded reference). Operator-side removal of
  the process-local `STOCKTRENDS_API_KEY` and any paid variables from the
  operator's own shell is the operator's step (plan §11); server-side rollback to
  the default one-tool surface is confirmed above.

- API key unset / paid tools disabled / execution disabled / caps cleared (server-side; operator-side shell cleanup is the operator's step): **confirmed**
- Default one-tool surface / zero prompts / public resources visible / no paid tools visible: **confirmed**

## 9. Deviations / follow-ups

- **Execution mechanism (procedural, non-blocking).** The documented mechanism
  names the interactive MCP Inspector UI. This session is non-interactive, so an
  equivalent local-stdio MCP client harness (built on the project's own MCP SDK)
  drove the same compiled `dist/server.js` over stdio, exercising the identical
  tool/resource/prompt listing and tool-invocation surface. The harness lives in
  the session scratchpad outside the repository and changed no repository file, no
  `src/`, `tests/`, `package.json`, or `package-lock.json`.
- **Repeated-identical-call loop posture and cap-denial validated without a live
  probe (deliberate).** The operator bound the live session to "at most one call,"
  so no duplicate or cap-denied probe was issued in the execution-enabled session
  (plan §8 permits an optional disclosed no-spend probe; the stricter "at most one
  call" bound was honored instead). The `repeated_identical_selection_call` and
  `spend_cap_exceeded` fail-closed behaviors are validated by the mock-only suite
  (`tests/phase5c-selections-tools.test.ts`, part of the 311 passing tests,
  including the sequential and concurrent repeat cases and the
  release-on-pre-billable-failure / executed-persists-on-API-error cases) and by
  code inspection of `src/tools/selectionsTools.ts` (the loop gate and cap
  preflight both run before any auth/fetch/cap debit). Under the execution-disabled
  configuration the structural gate denies first, so the loop gate is not
  reachable there.
- **Real STC spend incurred (expected).** The one authorized call consumed
  `0.05 STC` of real subscription usage. This is the expected, authorized outcome
  of a controlled live paid validation, recorded here for the audit trail.
- **Follow-up:** complete independent review of this report, then a separate Phase
  5C production-readiness signoff PR, before any production-readiness declaration
  (plan §14). Base `selections/history` and the `selections_published` pair remain
  candidate follow-on increments (design memo §8).

## 10. No-secrets confirmation (§4, §10)

- No API key value, no populated `X-API-Key`/`Authorization` header value, no
  bearer token, no wallet/private key, no `.env` contents, and no raw
  secret-bearing command output appear in this report or any saved repository
  artifact. The harness scrubbed the key value from all output and only ever
  checked boolean presence. This report uses `REDACTED` placeholders only. No large
  API payload is reproduced — only non-sensitive top-level and first-row key names.
- No investment advice is present, and no production-readiness claim is made (that
  requires a separate later signoff PR).

## 11. Overall result

**PASS WITH DEVIATIONS.**

The Phase 5C paid base-selections tool behaved exactly as specified across all
phases: the default/free one-tool surface and the paid-exposed six-tool surface
are correct with zero prompts and nine credential-free resources; the selections
tool fails closed with execution disabled (no request/auth/cap debit); every
limit-safety case behaved as designed (omitted → effective `50`, `1`–`250`
accepted, out-of-range/non-integer/array/sentinel/unknown-key rejected at the
schema boundary before pricing/auth/fetch, `limit` always sent); and the single
authorized live paid call went only to `GET /v1/selections/latest` with
`X-API-Key` only (no Bearer, no payment header, no retry), reconciled the base
`selections`-family pricing against the live catalog before auth, preserved
`api_data` verbatim as the base ST-IM selection universe (distinct from the
published STIM Select list), kept `observed_cost`/`payment_status` `null`, and was
bounded to exactly one paid call (`0.05 STC`) with caps exhausted. Rollback
restored the default one-tool free surface with zero prompts and no paid tools.
The deviations in §9 are procedural/deliberate and non-blocking. Production
readiness remains pending independent review of this report and a separate signoff
PR (plan §14).
