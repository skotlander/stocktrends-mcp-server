# Phase 5D Market-Context Controlled Validation Report

> **CONTROLLED LIVE VALIDATION COMPLETED — PASS WITH DEVIATIONS.**
>
> A single operator-authorized, operator-supervised controlled live validation
> was performed against the real Stock Trends API, per
> [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_PLAN.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_PLAN.md).
> The session proceeded in two stages. **Stage 1 (no-spend):** at the initial
> authorization checkpoint the exact plan §4 phrase had **not** been supplied,
> so — exactly as §4 requires — no paid execution was enabled with a real key
> and the validation ran only the no-spend phases (§5, §6, §9, §10), all of
> which passed; an interim instruction to "perform the authorized live phase"
> that did **not** contain the phrase was likewise refused at the checkpoint.
> **Stage 2 (authorized live):** the operator then supplied the exact §4
> phrase verbatim as a separate line in this same session, and the live paid
> phase was performed under it: **exactly four bounded paid calls — one per
> approved market-context tool — totalling `0.75 STC` under the configured
> `4` / `1` / `0.80 STC` caps, with no retries and no repeats.** All four
> succeeded. Results below are recorded exactly as observed; deviations are
> documented in §12 and are assessed non-blocking.
>
> This report does not declare paid market-context MCP execution
> production-ready. Per plan §16, production-readiness requires independent
> review of this completed report and a separate signoff PR (#54), which have
> not yet occurred.
>
> No API key value, no populated `X-API-Key`/`Authorization` header value, and
> no raw secret appears anywhere in this report or in any artifact produced by
> this validation. Every secret-shaped placeholder is `REDACTED`. The real
> `STOCKTRENDS_API_KEY` value was never read for inspection, printed, logged,
> or stored: it was forwarded by environment-variable reference to exactly one
> child server process (the single authorized live session), all harness
> output was scrubbed, and every other check was boolean presence only (see
> §2 and §11).

- **Date/time (UTC):** no-spend phases completed and initial report written
  2026-07-11T22:01:27Z; §4 authorization phrase received, live phase run
  2026-07-11T22:14:21Z–22:14:24Z, and this report updated in place
  immediately after, all in the same session
- **Operator:** Skot Kortje / Stock Trends (skortje@stocktrends.com)
- **Commit validated:** `f97ad18f6e1b8f635bfb4fa69f37c995c9a4da79` (`f97ad18
  Add market context controlled validation plan (#52)`)
- **Branch:** `claude/pr53-market-context-validation-report` (not `main`;
  based on `main` including the merged PR #51 implementation `21e66cd` and the
  merged PR #52 plan `f97ad18`)
- **Environment:** Windows 11; Node.js `v22.12.0`; transport `stdio` (local
  only); API origin `https://api.stocktrends.com` (default approved origin);
  `@modelcontextprotocol/sdk` `1.29.0`
- **Execution mechanism:** the compiled stdio server (`dist/server.js`) driven
  over **local stdio** by throwaway MCP client harnesses built on the
  project's own MCP SDK (`Client` + `StdioClientTransport`) — the same
  faithful, non-interactive equivalent of the documented MCP Inspector
  procedure used by the accepted Phase 5B and Phase 5C reports: one harness
  for the no-spend phases, and a second for the single authorized
  execution-enabled live session plus its rollback restart. Both harnesses
  live outside the repository (session scratchpad) and changed no repository
  file. No MCP Inspector session was run. See §12 (Deviations).

## 1. Status and authorization

| Item | Result |
| --- | --- |
| Exact §4 authorization phrase received verbatim in this session | **Yes.** The operator supplied, as a separate line: *"AUTHORIZED: run Phase 5D market-context controlled validation for at most one call per approved paid tool under the configured caps"* — received **after** the no-spend phases completed (see sequence note below), and **before** any paid execution flag was enabled with a real key or any paid tool was invoked |
| Live paid validation performed | **Yes.** Exactly **4** paid calls (one per approved tool), `0.75 STC` total, all successful, within the `4` / `1` / `0.80 STC` caps; no retries; no repeats |
| No-spend phases (§5 preflight, §5 default/free, §6 execution-disabled, §9 negative probes, §10 public resource) | **Performed first — all passed** |
| Production-readiness claim | **None.** PR #54 signoff remains a separate later step |

Authorization sequence note: at the initial checkpoint the phrase was absent,
so the validation stopped at the no-spend boundary and recorded that fact. A
subsequent instruction to perform "the authorized live phase" that did **not**
itself contain the phrase was checked against plan §4 and refused — an
instruction or inferred intent is not the phrase, and the pre-provisioned
parent-shell variables (§2) never substitute for it. The live phase ran only
after the operator then supplied the exact phrase verbatim as its own line in
this same session. This staged sequence is recorded as a process note in §12.

## 2. Environment / caps (redacted)

- **OS / Node / transport:** Windows 11; Node.js `v22.12.0`; local `stdio`
  only. No remote MCP transport exists or was used.
- **Live-execution configuration (single authorized session only, created
  after the §4 phrase was received; process-local child env only):**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true`;
  `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`;
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION=4`;
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL=1`;
  `STOCKTRENDS_MAX_STC_PER_SESSION=0.80`;
  `STOCKTRENDS_API_KEY=<REDACTED>` (present; forwarded by reference; value
  never inspected); `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` left at its
  default (`true` — mandatory preflight not weakened). No USD cap was set:
  all four market-context rules are STC-denominated. **All four live paid
  calls ran within this one server session**, so the in-memory caps genuinely
  bounded the whole phase; the child exited at the end of the phase.
- **No-spend session configurations (per ephemeral child server; placeholder
  key only, plan §6):**
  - default/free: no `STOCKTRENDS_*` variables at all;
  - flag-without-key: `STOCKTRENDS_ENABLE_PAID_TOOLS=true` only;
  - key-without-flag: `STOCKTRENDS_API_KEY=<REDACTED placeholder — not a real
    key>` only;
  - paid-exposed execution-disabled: `STOCKTRENDS_ENABLE_PAID_TOOLS=true` +
    placeholder key; `STOCKTRENDS_ENABLE_PAID_EXECUTION` unset; caps left at
    their default-deny values (`0` / `0` / unset);
  - cap-denial probe (disclosed, §5 of this report):
    `STOCKTRENDS_ENABLE_PAID_TOOLS=true` + placeholder key +
    `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`; caps deliberately left at
    `0` / `0` / unset so the cap gate denies before any auth/fetch.
- **API key:** during the no-spend phases the real key was **never provisioned
  to, read by, or forwarded into any validation process** — the only
  credential-shaped value used was a non-secret placeholder, shown here as
  `<REDACTED placeholder>`. During the authorized live phase the real key was
  forwarded **by environment-variable reference only** into exactly one child
  server process (the single execution-enabled session above); its value was
  never inspected, printed, logged, or stored, all harness output passed
  through a scrubber that redacts any occurrence of the value, and only
  boolean presence was ever checked. The rollback restart child received no
  key of any kind.
- **Parent-shell observation (boolean presence only; values never read):** the
  operator's parent shell environment was found to already contain
  `STOCKTRENDS_API_KEY`, `STOCKTRENDS_ENABLE_PAID_TOOLS`,
  `STOCKTRENDS_ENABLE_PAID_EXECUTION`, `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, and `STOCKTRENDS_MAX_STC_PER_SESSION`
  (presence checked as booleans only). **None of these was forwarded to any
  child server:** every child environment was built from the MCP SDK's safe
  default allowlist (`getDefaultEnvironment()` — no `STOCKTRENDS_*` variable
  is on it) plus only the explicit per-phase placeholder values above, with a
  belt-and-suspenders guard stripping any `STOCKTRENDS_*` key not explicitly
  set. Each session's child `STOCKTRENDS_*` key list was recorded and matched
  the intended configuration exactly. See §11 for the operator hygiene
  recommendation this observation triggers.

## 3. Preflight results (plan §5)

Run on `f97ad18`, working tree clean before edits:

| Check | Result |
| --- | --- |
| `git rev-parse --show-toplevel` | `C:/Users/skort/Projects/stocktrends-mcp-server` |
| `git branch --show-current` | `claude/pr53-market-context-validation-report` (not `main`) |
| `git status --short --branch` | clean; HEAD includes `f97ad18 Add market context controlled validation plan (#52)` |
| Checkout contents | `README.md`, `package.json`, `src/`, `tests/`, `docs/` all present |
| `npm run typecheck` (`tsc --noEmit`) | **PASS** — no errors |
| `npm test` (`vitest run`) | **PASS** — 15 test files, 448 tests passed (matches the PR #51 implementation notes exactly) |
| `npm run build` (`tsc -p tsconfig.build.json`) | **PASS** — `dist/server.js` produced |
| `git diff --check` | clean (no whitespace/conflict errors) |
| `package.json` / `package-lock.json` | untouched before, during, and after validation |

## 4. Default/free surface evidence (plan §5, §9)

Server started over stdio with **no** `STOCKTRENDS_*` variables (child
`STOCKTRENDS_*` env key list recorded as empty):

| Item | Observed |
| --- | --- |
| Visible tool count | **1** |
| Visible tool names | `stocktrends_estimate_workflow_cost` only |
| Public resources visible | **10** — `stocktrends://api/openapi`, `ai/context`, `ai/tools`, `workflows`, `methodology/stim`, `methodology/indicators`, `methodology/inference`, `pricing/catalog`, `proof/market-edge`, **`leadership/definitions`** |
| Prompts | **0** (`prompts/list` → `-32601 Method not found`: no prompts capability registered) |
| Paid tools absent | confirmed — none of the nine paid tools present, including all four market-context tools |
| Definitions resource | listed **and** read credential-free in this mode (see §7) |
| Spend possible | **no** — only the credential-free planning tool exists; the child saw no key of any kind |

Exposure matrix cross-checks (plan §6, "neither alone exposes anything"):

| Configuration | Tool count | Resources / prompts |
| --- | --- | --- |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true`, **no key** (`blocked_missing_api_key` posture) | **1** (planning tool only) | 10 / 0 (`-32601`) |
| Placeholder key, **no paid-tools flag** | **1** (planning tool only) | 10 / 0 (`-32601`) |

## 5. Paid-exposed, execution-disabled evidence (plan §6)

Server started with `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and a **placeholder**
`STOCKTRENDS_API_KEY=<REDACTED placeholder — not a real key>`; execution flag
unset; caps at default-deny. Startup warning observed on stderr: *"Paid ST-IM,
indicators, base selections, and market-context tools are exposed but paid
execution is NOT enabled (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true);
every invocation fails closed with no request."*

| Item | Observed |
| --- | --- |
| Visible tool count | **10** |
| Visible tool names | `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`, `stocktrends_get_selections_latest`, `stocktrends_get_market_regime_latest`, `stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`, `stocktrends_get_leadership_summary_latest` |
| Public resources / prompts | **10** resources (identical list, including `stocktrends://leadership/definitions`); **0** prompts (`-32601`) |

Each of the four market-context tools was invoked once with its exact minimal
valid input (the same inputs the future authorized live phase would use). All
four **failed closed identically**:

| Assertion | `market_regime_latest` `{}` | `market_regime_history` `{"limit":1}` | `breadth_sector_latest` `{"limit":1}` | `leadership_summary_latest` `{"limit_overall":1,"limit_bucket":1}` |
| --- | --- | --- | --- | --- |
| `error_code` / `denial_reason` | `paid_execution_disabled` | `paid_execution_disabled` | `paid_execution_disabled` | `paid_execution_disabled` |
| `paid_execution_authorized` / `paid_execution_occurred` | `false` / `false` | `false` / `false` | `false` / `false` | `false` / `false` |
| `api_request_sent` | `false` | `false` | `false` | `false` |
| `auth_header_sent` / `payment_header_sent` | `false` / `false` | `false` / `false` | `false` / `false` | `false` / `false` |
| `pricing_reconciliation.status` | `not_evaluated` (no catalog read) | `not_evaluated` | `not_evaluated` | `not_evaluated` |
| Cap debit (`paid_calls_this_session` / `stc_spent_this_session`) | `0` / `0` | `0` / `0` | `0` / `0` | `0` / `0` |
| `automatic_paid_retries` | `false` | `false` | `false` | `false` |
| Endpoint in denial metadata | `/v1/market/regime/latest` | `/v1/market/regime/history` | `/v1/breadth/sector/latest` | `/v1/leadership/summary/latest` |
| `effective_limits` echoed | `{}` (snapshot; no limit exists) | `{ limit: 1 }` | `{ limit: 1 }` | `{ limit_overall: 1, limit_bucket: 1 }` |
| `provenance.context_not_advice` | `true` | `true` | `true` | `true` |
| `observed_cost` / `payment_status` | `null` / `null` | `null` / `null` | `null` / `null` | `null` / `null` |

The context-not-advice framing strings were present and family-correct on
every denial (regime = market context, not a trading recommendation; regime
history = longitudinal context, not advice; breadth = participation context,
not confirmation signals; leadership = rotation context, not picks).

## 6. Negative / limit-safety evidence (plan §9)

### 6.1 Invalid-input strict-schema rejections (no-spend; execution-disabled placeholder session)

Every invalid input below was rejected with an MCP `-32602 Input validation
error` **before the tool handler ran** — no wrapper metadata was produced, so
no endpoint selection, pricing preflight, catalog read, auth header, or fetch
was reached. Nothing was silently clamped.

| Tool | Invalid input | Rejection detail observed |
| --- | --- | --- |
| `market_regime_latest` | `{"foo": 1}` | `-32602`, `unrecognized_keys` (strict empty schema) |
| `market_regime_history` | `{"limit": 0}` | `-32602`, number below minimum `1` |
| `market_regime_history` | `{"limit": 53}` | `-32602`, number above maximum `52` |
| `market_regime_history` | `{"limit": 1.5}` | `-32602`, expected `int` |
| `market_regime_history` | `{"limit": [1]}` | `-32602`, expected `number`, received array |
| `market_regime_history` | `{"limit": "all"}` | `-32602`, expected `number`, received string (sentinel rejected) |
| `market_regime_history` | `{"start_date": "2026/07/11"}` | `-32602`, string fails `YYYY-MM-DD` format |
| `breadth_sector_latest` | `{"limit": 0}` | `-32602`, below minimum `1` |
| `breadth_sector_latest` | `{"limit": 251}` | `-32602`, above hard max `250` |
| `breadth_sector_latest` | `{"group_level": "continent"}` | `-32602`, `invalid_value` (enum `sector`/`industry_group`/`industry`) |
| `breadth_sector_latest` | `{"weekdate": "2026-07-10"}` | `-32602`, `unrecognized_keys` (snapshot time-travel not exposed) |
| `breadth_sector_latest` | `{"vol_scale": 100}` | `-32602`, `unrecognized_keys` (unbounded legacy multiplier not exposed) |
| `leadership_summary_latest` | `{"limit_overall": 0}` | `-32602`, below minimum `1` |
| `leadership_summary_latest` | `{"limit_overall": 201}` | `-32602`, above hard max `200` |
| `leadership_summary_latest` | `{"limit_bucket": 0}` | `-32602`, below minimum `1` |
| `leadership_summary_latest` | `{"limit_bucket": 51}` | `-32602`, above hard max `50` |
| `leadership_summary_latest` | `{"min_rsi": 501}` | `-32602`, above maximum `500` |
| `leadership_summary_latest` | `{"weekdate": "2026-07-10"}` | `-32602`, `unrecognized_keys` |
| `leadership_summary_latest` | `{"type": "CS"}` | `-32602`, `unrecognized_keys` (no verified enum; not exposed) |

No live invalid-input **paid** call was made (all rejections occurred in the
execution-disabled placeholder session, and every one was rejected before any
paid boundary).

Always-sent-defaults coverage (regime history `limit` default `12`; breadth
`limit` default `50` with `group_level` default `sector`; leadership
`limit_overall`/`limit_bucket` defaults `50`/`20`) is validated by the merged
mock-only suite (`tests/phase5d-market-context-tools.test.ts`, part of the 448
passing tests); the denial-path `effective_limits` echoes in §5 additionally
confirm caller-supplied limits are carried exactly. No omitted-limit live
paid request was performed in the authorized live phase: the live probes
intentionally used the plan's exact minimal inputs. Omitted-default behavior
remains covered by the merged mock-only suite, while the live evidence in §8
confirms caller-supplied limits are serialized exactly and breadth's default
`group_level=sector` is sent explicitly.

### 6.2 Cap-denial no-spend probe (plan §9 — optional, disclosed)

A **separate throwaway session** was started with the placeholder key,
`STOCKTRENDS_ENABLE_PAID_TOOLS=true`, `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`,
and caps deliberately left at their defaults (`0` calls/session, `0`
calls/tool, no STC budget). One invocation of
`stocktrends_get_market_regime_latest` `{}` was issued:

| Assertion | Observed |
| --- | --- |
| `error_code` / `denial_reason` | `spend_cap_exceeded` |
| Denied before auth/fetch | confirmed — `api_request_sent: false`, `auth_header_sent: false`, `payment_header_sent: false` |
| `pricing_reconciliation.status` | `not_evaluated` (cap gate denies before any catalog read) |
| Static preflight visible in denial | `pricing_rule: market_regime_latest`, `estimated_cost: 0.15 STC` (static mirror only; no network) |
| Configured caps echoed | `max_paid_calls_per_session: 0`, `max_paid_calls_per_tool: 0`, `max_stc_per_session: null` |
| Cap debit | `0` calls / `0` STC (counters unchanged) |
| `automatic_paid_retries` | `false` |

This is the §9-permitted "live-adjacent" no-spend probe: it demonstrates that
even with the execution flag on, default-deny caps fail closed
(`spend_cap_exceeded`) with **no request, no auth header, and no spend**. It
sent no network traffic of any kind.

### 6.3 Duplicate-call denial (mock-only, per plan §9)

No live duplicate probe was issued (plan §9 forbids issuing one "to see it
fire"). The `repeated_identical_market_context_call` posture is validated by
the merged mock-only suite (`tests/phase5d-market-context-tools.test.ts`):
sequential duplicates, **concurrent** duplicates (second call fails closed
before auth/fetch/cap debit), reservation release on pre-billable failure,
executed-persistence after a billable attempt, and the constant zero-parameter
regime-latest signature — all part of the 448 passing tests. Cap-denial
coverage beyond §6.2 (including nonzero call caps with no covering STC budget)
is likewise covered by the same suite.

### 6.4 Not exercised (by design)

- **No deferred route was called** — no `/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, `/v1/leadership/rotation/history`, no
  decision/portfolio route, no `selections/history`, no
  `selections/published/*`, no Intelligence Agent artifact route.
  (`endpoint_not_allowlisted` denial for non-promoted routes is validated by
  the mock-only suite and policy-helper tests, not by live probing.)
- **No retries** — no call was retried; `automatic_paid_retries` was `false`
  on every observed result.
- **No live invalid-input paid calls, no live duplicate paid calls, no live
  cap-failure calls that could spend** — all such cases were mock-only or
  execution-disabled/no-paid-boundary, as the plan requires.

## 7. Public resource evidence (plan §10)

`stocktrends://leadership/definitions` (backing
`GET /v1/leadership/definitions`):

| Check | Observed |
| --- | --- |
| Listed in every mode | confirmed — present in the identical 10-resource list in default/free, flag-without-key, key-without-flag, paid-exposed, and rollback sessions |
| Credential-free read (default/free session — **no key of any kind configured**) | **succeeded**; `application/json` definitions document returned |
| Credential-free read (paid-exposed session — placeholder key configured) | **succeeded** — a key-checked route would have rejected the placeholder, confirming the read is credential-free; the public-resource path never constructs an auth header under any configuration |
| Fetch-on-request | confirmed — the resource content was fetched at read time; startup performed no API call (fetch-on-request registration validated by the mock-only suite) |
| No paid path / no reconciliation | confirmed — the read used the public resource path only; no pricing preflight, no catalog reconciliation, no cap interaction (`leadership_definitions_public` is `access_type: public`, zero cost, `cost_unit: request`, never a paid STC mirror) |
| Response shape (summary only; no payload reproduced) | resource wrapper keys: `resourceUri`, `source` (`apiBaseUrl`, `endpointPath`, `status`, `upstreamRequestId`), `fetchedAt`, `data`; `data` keys: `concept` (string), `indicators` (object of 5: `rsi`, `trend`, `trend_cnt`, `mt_cnt`, `rsi_updn`), `taxonomy_source` (string), `taxonomy_levels` (array of 3), `notes` (object of 3) — exactly the shape recorded credential-free by the design memo §3 |
| Spend | catalog-verified public/zero-cost route. Spend for this public-resource check was zero. The definitions reads were the only network activity for this credential-free public-resource check; the later authorized live paid calls and credential-free pricing-catalog reconciliation reads are recorded separately in §§8–10 |

## 8. Live paid call results (plan §8) — PERFORMED UNDER THE §4 PHRASE

Single execution-enabled server session (§2 configuration), started only
after the operator supplied the exact §4 phrase. Startup warning observed on
stderr confirmed the live-execution ENABLED banner (secret-free; "No API key
is logged" posture unchanged). The live session listed **exactly 10 tools**
(the execution flag changes behavior, never count). The four approved calls
were issued once each, in the planned order, with the exact minimal inputs —
**no retries, no repeats, no other paid invocation of any kind**.

| # | Tool | Input | Endpoint (observed) | Outcome | pricing_rule / estimated_cost | auth_header_sent | payment_header_sent | request_id | returned_row_count | observed_cost / payment_status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `stocktrends_get_market_regime_latest` | `{}` | `GET /v1/market/regime/latest` only | **Success** | `market_regime_latest` / `0.15 STC` | `true` | `false` | `e7d6bc9e-ae87-4dfb-acc9-4bea360b755e` | `null` (snapshot object; no list container — not derivable, correctly not fabricated) | `null` / `null` |
| 2 | `stocktrends_get_market_regime_history` | `{ "limit": 1 }` | `GET /v1/market/regime/history` only | **Success** | `market_regime_history` / `0.25 STC` | `true` | `false` | `026fc93b-9352-4463-93f8-b7766412b0ff` | `1` | `null` / `null` |
| 3 | `stocktrends_get_breadth_sector_latest` | `{ "limit": 1 }` | `GET /v1/breadth/sector/latest` only | **Success** | `breadth_sector_latest_paid` / `0.1 STC` | `true` | `false` | `cb6d976c-1021-4912-a465-20f95de48d2e` | `1` | `null` / `null` |
| 4 | `stocktrends_get_leadership_summary_latest` | `{ "limit_overall": 1, "limit_bucket": 1 }` | `GET /v1/leadership/summary/latest` only | **Success** | `leadership_summary_latest_paid` / `0.25 STC` | `true` | `false` | `2d646d2e-ce1f-4329-86f1-16db82aed260` | `null` (bucketed payload uses non-standard container keys; per-bucket counts recorded below — not fabricated) | `null` / `null` |

Per-call detail (all values from secret-free wrapper metadata, recorded as
observed):

- **Call 1 — regime latest.** `paid_execution_authorized/occurred: true/true`;
  `api_request_sent: true`; reconciliation `reconciled`
  (`source: pricing_catalog`, family `market`) **before** auth/fetch;
  `effective_limits: {}` and `api_request_parameters: {}` (snapshot route; no
  limit parameter exists); `api_reported_weekdate: 2026-07-10` (captured from
  the payload, not fabricated); `automatic_paid_retries: false`;
  `context_not_advice: true`. `api_data` shape (keys only): `regime`,
  `confidence`, `regime_score`, `bullish_pct`, `bearish_pct`, `avg_rsi`,
  `avg_mt_cnt`, `weekdate`, `signal_count` — a single API-authored snapshot
  object, preserved verbatim.
- **Call 2 — regime history (`limit 1`).** Reconciliation `reconciled`
  (`source: pricing_catalog`; shared `market`-family state from call 1);
  `effective_limits: { limit: 1 }` and `api_request_parameters: { limit: 1 }`
  — the limit was **sent explicitly**, no `start_date` supplied;
  `returned_row_count: 1`; top-level `api_reported_weekdate: null` (the
  payload carries weekdates per row, and nothing was fabricated). `api_data`
  shape: top-level `history` (array of 1), `count`, `limit`, `start_date`;
  first row keys `weekdate`, `regime`, `confidence`, `regime_score`,
  `bullish_pct`, `bearish_pct`, `avg_rsi`, `avg_mt_cnt`, `signal_count`.
- **Call 3 — breadth sector latest (`limit 1`).** Fresh `breadth`-family
  reconciliation `reconciled` (`source: pricing_catalog`) before auth/fetch;
  `effective_limits: { limit: 1 }` with
  `api_request_parameters: { group_level: "sector", limit: 1 }` — **both
  always-sent parameters went out explicitly** (`group_level=sector` sent even
  though the caller did not supply it, so the API's `5000` default could never
  apply); `returned_row_count: 1`; `api_reported_weekdate: 2026-07-10`.
  `api_data` shape: top-level `request_id`, `group_level`, `exchange`,
  `weekdate`, `cs_only`, `include_unknown`, `count`, `data` (array of 1),
  `hint`; first row is a 28-key sector-breadth row (`weekdate`, `sector_code`,
  `sector_name`, `total`, bullish/bearish/neutral counts and percentages,
  trend/mt/rsi aggregates, `net_breadth`, young/mature bullish fields) —
  returned verbatim with no local re-aggregation.
- **Call 4 — leadership summary latest (`limit_overall 1, limit_bucket 1`).**
  Fresh `leadership`-family reconciliation `reconciled`
  (`source: pricing_catalog`) before auth/fetch;
  `effective_limits: { limit_overall: 1, limit_bucket: 1 }` equal to
  `api_request_parameters` — both limits sent explicitly;
  `api_reported_weekdate: 2026-07-10`. `api_data` shape: top-level
  `request_id`, `weekdate`, `exchange`, `filters` (object of 3),
  `overall_leaders` (array of 1 — honoring `limit_overall=1`),
  `sector_leaders` (array of 11 — one top leader per sector bucket, honoring
  `limit_bucket=1` across 11 API-defined sector buckets),
  `industry_group_leaders` (array of 52 — one per industry-group bucket),
  `note`. The API ranked and bucketed; the adapter re-ranked nothing.
  `returned_row_count` is `null` because the bucketed payload uses container
  keys outside the derivation list — recorded as not derivable rather than
  fabricated, with the per-bucket counts above serving as the §11 row-count
  transparency evidence.

Assertions across all four calls:

- **Exactly one `GET` per tool, four paid calls total, in the planned order** —
  the harness issued no other paid invocation, and the per-tool cap (`1`)
  plus the constant regime-latest signature would have failed any repeat
  closed.
- **Endpoints observed were exactly the four promoted routes** — no deferred
  route, no other family, no unexpected path.
- **Family-scoped reconciliation preceded every auth/fetch**
  (`status: reconciled`, `source: pricing_catalog` on each call; the market
  family reconciled once and covered both regime calls; breadth and
  leadership reconciled independently).
- **`X-API-Key` only** (`auth_header_sent: true` on exactly these four calls);
  **no `Authorization: Bearer`**, **no payment header**
  (`payment_header_sent: false` on all four), no x402/wallet/OAuth.
- **No retry** (`automatic_paid_retries: false` on every call).
- **`api_data` preserved verbatim** (shape summaries above; no local
  recomputation — provenance flags `false`, `context_not_advice: true` with
  the family framing on every call).
- **`observed_cost` / `payment_status` remained `null`** on all four calls
  (the API returned neither; nothing was fabricated).
- **`request_id`s** are non-secret correlation UUIDs, recorded per the prior
  Phase 5B/5C precedent.

## 9. Total spend / call count

- **Paid calls attempted: exactly 4 of the at-most-4 authorized** — one per
  approved tool, none repeated, none retried, none outside the four approved
  tools.
- **Actual expected STC exposure: `0.75 STC` of the `0.80 STC` session
  budget** (`0.15 + 0.25 + 0.10 + 0.25`), exactly the plan §8 worst case.
  Session counters observed after each call: `0.15` → `0.40` → `0.50` →
  `0.75 STC` and `1` → `2` → `3` → `4` calls; per-tool counter `1` for each
  tool. The session call cap (`4`) and per-tool cap (`1`) are now exhausted
  for that session (in-memory; the session ended at phase close).
- **`observed_cost` / `payment_status`:** remained `null` on every call
  (subscription mode returned no per-call charge metadata; nothing was
  fabricated). The `0.75 STC` figure is the preflight/catalog-reconciled
  estimate, exactly as the plan budgets it.
- **Within cap: yes** — no counter ever exceeded its configured cap, and no
  call was attempted after the fourth. The earlier no-spend sessions all
  finished at `0` calls / `0 STC` under default-deny caps.

## 10. Auth-boundary observations

- **`X-API-Key` was sent only to the four approved promoted routes, once
  each, only after every gate passed** — `auth_header_sent: true` on exactly
  the four §8 live calls (`/v1/market/regime/latest`,
  `/v1/market/regime/history`, `/v1/breadth/sector/latest`,
  `/v1/leadership/summary/latest`) and nowhere else, described entirely via
  wrapper metadata; the key value is never shown. In the no-spend phases no
  real key existed in any child and every paid-boundary invocation was denied
  before auth-header construction (`auth_header_sent: false` on all five
  observed denials — four execution-disabled and one cap-denial probe; the
  three list-only sessions invoked nothing paid).
- **No key to public surfaces:** the pricing-catalog reconciliation reads in
  the live session use the credential-free public path (never keyed); the
  definitions resource reads, resource listings, and planning-tool surface
  are credential-free in every configuration (the public path sends `Accept`
  + `User-Agent` only). The rollback child received no key of any kind.
- **No `Authorization: Bearer`** anywhere, under any configuration, including
  all four live calls.
- **No payment header** (`payment_header_sent: false` on every observed
  result, including all four live successes); no x402, no wallet, no OAuth;
  no `402` handling was triggered.
- **No remote MCP** — local stdio children only.
- **No raw API bypass** — every API interaction in this validation went
  through the MCP server's gated surfaces: the credential-free
  public-resource reads of `/v1/leadership/definitions`, the server's own
  credential-free catalog reconciliation reads, and the four gated paid
  calls. No direct keyed HTTP call was made to anything, and no deferred
  route was touched.
- **No retry** — `automatic_paid_retries: false` on every observed result;
  no call was reissued under any outcome.
- **No secret in any output:** server stderr banners are secret-free by
  design ("No API key is logged"); harness output was additionally scrubbed
  against the forwarded key value and uses `REDACTED` placeholders; no
  populated auth-header value appears anywhere in any artifact.

## 11. Rollback evidence (plan §12)

- **Server-side:** every validation server was an ephemeral child spawned with
  an explicitly curated environment; all children exited at session close. The
  execution-enabled live child (the only process ever holding the forwarded
  key reference) exited at the end of the live phase, so no paid server and no
  forwarded key persists server-side, and its in-memory caps/loop state ended
  with it.
- **Post-live rollback restart** (immediately after the live phase, **no**
  `STOCKTRENDS_*` variables at all; recorded child `STOCKTRENDS_*` key list
  empty — key, paid flags, and all three caps absent):
  - exactly **1** tool (`stocktrends_estimate_workflow_cost`); none of the
    nine paid tools visible, including all four market-context tools;
  - all **10** public resources listed credential-free, including
    `stocktrends://leadership/definitions`;
  - **0** prompts (`-32601`);
  - no key in any session output (boolean presence checks only; values never
    printed).
  An identical rollback restart at the end of the earlier no-spend stage
  showed the same free surface.
- **No generated secret/log artifacts:** no repository file, log, fixture, or
  artifact containing a key, populated auth header, or raw secret was created.
  The only repository changes are this report and one README
  documentation-index link (`git status` confirms `src/`, `tests/`,
  `package.json`, and `package-lock.json` untouched). The throwaway harness
  and its secret-free results JSON live in the session scratchpad outside the
  repository.
- **Harness-side variable state:** the harness set paid variables only inside
  per-child process environments, which ended with those processes; nothing
  was exported to any shell profile or persisted configuration by this
  validation.
- **Operator-side action required (now due):** the parent shell environment
  was observed (boolean presence only) to already contain
  `STOCKTRENDS_API_KEY` and the five paid flag/cap variables **before this
  validation began** (§2). During the no-spend stage none of that state was
  used. During the authorized live phase, exactly one element was used:
  `STOCKTRENDS_API_KEY` was forwarded **by reference** into the single live
  child (§2); the parent-shell flag/cap values were never used (the harness
  set its own explicit §7 values). **The authorized run is now complete, so
  plan §4/§12 hygiene ("unset immediately after") is due:** the operator
  should now unset from their shell/profile —
  `STOCKTRENDS_API_KEY`, `STOCKTRENDS_ENABLE_PAID_TOOLS`,
  `STOCKTRENDS_ENABLE_PAID_EXECUTION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, `STOCKTRENDS_MAX_STC_PER_SESSION`.
  Per the Phase 5B/5C precedent this operator-side shell cleanup is the
  operator's own step; server-side rollback is confirmed above, and the
  operator-side step is recorded as open at the time of writing.

## 12. Deviations

1. **Staged authorization within one session (process note, non-blocking).**
   At the initial checkpoint the §4 phrase was absent, so the validation
   stopped at the no-spend phases and this report was first written recording
   "not authorized / not performed". A subsequent instruction to perform "the
   authorized live phase" that did not contain the phrase was refused at the
   checkpoint (plan §4: an instruction or inferred intent is not the phrase).
   The operator then supplied the exact phrase verbatim as its own line in
   this same session, the live phase was performed under it, and this report
   was updated in place (preserving the no-spend evidence unchanged) rather
   than written in a single pass. The phrase preceded every paid-execution
   configuration and every paid call, as §4 requires.
2. **Execution mechanism (procedural, non-blocking; same as Phase 5B/5C).**
   The documented mechanism names the interactive MCP Inspector UI. This
   session is non-interactive, so an equivalent local-stdio MCP client harness
   (built on the project's own MCP SDK) drove the same compiled
   `dist/server.js` over stdio, exercising the identical
   tool/resource/prompt listing, tool-invocation, and resource-read surface.
   The harness lives in the session scratchpad outside the repository and
   changed no repository file.
3. **Cap-denial no-spend probe performed (disclosed, permitted).** Plan §9
   permits an optional cap-denial probe in a separate throwaway session with a
   placeholder key. It was performed (§6.2), denied `spend_cap_exceeded`
   before any auth/fetch, sent no request, and created no spend.
4. **Pre-provisioned paid variables observed in the parent shell (boolean
   presence only).** Not part of the plan's expected state at no-spend time;
   handled by strict child-environment isolation (§2) and recorded with an
   operator recommendation (§11). During the no-spend stage no value was
   read, printed, logged, stored, or forwarded and no live call resulted.
   After the §4 phrase arrived, `STOCKTRENDS_API_KEY` alone was forwarded by
   reference into the single authorized live child; the parent-shell flag/cap
   values were still never used (the harness set its own explicit §7 values),
   and no value was ever printed or inspected. Operator-side unset is now due
   (§11).
5. **Schema-rejection surfacing detail (observation, non-blocking).** The
   `-32602 Input validation error` rejections surfaced to the MCP client as
   in-band `isError` tool results carrying the `MCP error -32602: Input
   validation error: Invalid arguments for tool …` text (SDK surfacing
   behavior), rather than thrown protocol errors. The substance is identical
   to the Phase 5C precedent: the rejection carries `-32602`, occurs before
   the handler, and produces no wrapper metadata — so no
   endpoint/pricing/auth/fetch was reached.
6. **Three credential-free definitions reads total** (default/free session,
   paid-exposed session, and one shape-capture read). All are catalog-verified
   public/zero-cost reads through the MCP public-resource path, explicitly
   non-paid under plan §9/§10; disclosed for completeness.
7. **Real STC spend incurred (expected).** The four authorized calls consumed
   `0.75 STC` of real subscription usage — the expected, authorized outcome of
   a controlled live paid validation, recorded here for the audit trail.
8. **No cap-denied or duplicate probe in the execution-enabled session
   (deliberate).** The live session issued exactly the four authorized calls
   and nothing else; cap-denial evidence comes from the earlier disclosed
   no-spend probe (§6.2) and the mock-only suite, and duplicate-denial
   evidence remains mock-only (§6.3), per plan §9.

## 13. No-secrets confirmation

No API key value, no populated `X-API-Key`/`Authorization` header value, no
bearer token, no wallet/private key, no `.env` contents (none exists in this
repository), and no raw secret-bearing command output appear in this report,
in the repository, or in any artifact this validation produced. The real key
was never read for inspection, printed, logged, or stored: outside the single
authorized live session only boolean presence was ever checked, and for that
one session the key was forwarded by environment-variable reference with all
harness output scrubbed against the value, per plan §4. The placeholder value
used in the no-spend phases is non-secret and is nonetheless shown only as
`REDACTED`. No large API payload is reproduced — only counts, booleans, key
names, and shape summaries (the recorded `request_id`s are non-secret
correlation UUIDs, per the Phase 5B/5C precedent). No investment advice is
present anywhere in this report.

## 14. Conclusion

**PASS WITH DEVIATIONS.**

Every phase of the merged PR #52 plan — no-spend and authorized live —
passed exactly as specified on `f97ad18`.

No-spend evidence: the preflight gates all held (typecheck, 448/448 mock-only
tests, build, clean tree, packages untouched); the default/free surface is
exactly one credential-free tool with ten public resources and zero prompts;
neither the paid-tools flag nor a key alone exposes anything; the
paid-exposed surface is exactly ten tools with the execution flag changing
behavior, never count; all four market-context tools fail closed
`paid_execution_disabled` with no request, no auth header, no cap debit, and
reconciliation `not_evaluated`; nineteen invalid-input cases — including the
deliberately unexposed `weekdate`, `vol_scale`, and `type` keys — were
rejected at the strict schema boundary (`-32602`) before any
pricing/auth/fetch and never clamped; the disclosed cap-denial probe failed
closed `spend_cap_exceeded` before any auth/fetch with zero spend;
duplicate-call and remaining cap coverage is carried by the merged mock-only
suite; and the credential-free `stocktrends://leadership/definitions`
resource is listed in every mode and readable with no credential, through the
public path only, with zero cost.

Authorized live evidence: under the operator's exact §4 phrase, exactly four
bounded paid calls — one per approved tool, exact minimal inputs, fixed
order — ran in a single execution-enabled session under the §7 caps
(`4` / `1` / `0.80 STC`). All four succeeded against only their promoted
endpoints, each behind a passing family-scoped credential-free catalog
reconciliation, with `X-API-Key` only (no Bearer, no payment header, no
retry), always-sent limits visible on the outbound parameters
(`group_level=sector` sent explicitly even when defaulted), `api_data`
preserved verbatim with context-not-advice provenance,
`observed_cost`/`payment_status` `null` throughout, and total spend exactly
`0.75 STC` of the `0.80` budget with every counter honored. The rollback
restart restored the default one-tool free surface with ten credential-free
resources and zero prompts. The deviations in §12 are procedural, disclosed,
and non-blocking.

**This report makes no production-readiness claim.** Per plan §16,
production-readiness requires independent review of this completed report and
a separate narrow signoff PR (#54), scoped to controlled local stdio operator
use exactly as in Phases 4/5B/5C. That signoff remains a separate later step
and is not unlocked by this report alone.
