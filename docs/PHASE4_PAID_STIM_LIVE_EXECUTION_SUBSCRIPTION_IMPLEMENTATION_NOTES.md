# Phase 4 Paid ST-IM Live Execution (Subscription/API-Key) Implementation Notes

Implementation date: 2026-07-08

Branch: `implementation/phase4-paid-stim-live-execution-subscription`

## Scope

This branch implements **live subscription/API-key execution** for the two
already-paired paid ST-IM tools, behind an explicit two-gate policy:

- `stocktrends_get_stim_latest` → `GET /v1/stim/latest`
- `stocktrends_get_stim_history` → `GET /v1/stim/history`

It advances [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
(Option A + D) and reconfirms [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15.

**Validation is mock-only.** No live endpoint call, no real API key, no secret
inspection, no `.env` inspection, no x402/payment, no DB/control-plane, and no
dynamic registration were performed. Live API validation is deferred to a
separate, explicitly authorized post-merge step.

## What Changed

- **Execution gating (two independent gates + explicit config).**
  - Build-level: `PHASE4_PAID_EXECUTION_ENABLED = true` and the mirrored
    `paidCallsAuthorizedInThisBuild = true` (`src/paidPolicy.ts`) — the build now
    *contains* the execution path. These are a cross-build kill switch, not a
    per-call authorization.
  - Runtime: new `STOCKTRENDS_ENABLE_PAID_EXECUTION` flag parsed in
    `src/config.ts` into `PaidToolsConfig.executionEnabled`. Only ever `true`
    when paid tools are requested **and** an API key is configured. Status
    becomes `configured_execution_enabled` in that case.
  - New `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` flag (default `true`) →
    `PaidToolsConfig.requirePricingPreflight`.
  - `evaluatePaidPreflight` gates, in order: endpoint allowlist → tool allowlist
    → approved host → paid mode configured → pricing-preflight posture →
    authoritative static pricing present → cost authoritative for the rule →
    caps → terminal execution gate (runtime flag **and** both build indicators).
    Ordering never weakens fail-closed behavior because no auth header or fetch
    happens on any denial.
  - The structural invocation preflight (`evaluatePaidInvocationPreflight`) now
    gates on the runtime execution flag and returns `structurallyAuthorized`
    (no longer always denies). Handlers use it as the first, side-effect-free
    gate before pricing/caps. **Note on denial metadata:** when the execution
    flag is off (or a structural gate fails), the handler denies at this
    structural stage with `paid_execution_disabled`, so its wrapper carries the
    cap **limits** but a `null` estimated cost and `pricing_reconciliation.status
    = not_evaluated` — the authoritative cost/cap-projection metadata is
    populated only for denials that reach the full `evaluatePaidPreflight`
    pricing/cap stage (e.g. `spend_cap_exceeded`). No denial constructs an auth
    header or sends a paid request.
- **Static endpoint pricing policy** (`src/paidPricing.ts`): a local, in-repo
  mirror of the catalog rule costs (`stim_latest_paid` = 0.25 STC, `/v1/stim/latest`;
  `stim_history_paid` = 0.5 STC, `/v1/stim/history`), resolved with no network
  access. **Static pricing alone cannot authorize a paid call** (see the catalog
  reconciliation gate below).
- **Catalog reconciliation gate** (`src/paidPricing.ts`
  `reconcileStaticPricingWithCatalog`, `src/tools/stimTools.ts`): before any
  auth header or ST-IM fetch, the static mirror is reconciled against the live
  `GET /v1/pricing/catalog` metadata via the **credential-free** public fetch
  path (no `X-API-Key`). It fails closed (`pricing_catalog_reconciliation_failed`)
  when the catalog is unavailable, malformed, ambiguous (duplicate rule),
  missing a required rule id, missing/mismatched cost, has an unsupported unit,
  or has a mismatched endpoint/rule id. The catalog is **metadata reconciliation
  only, never authorization by itself** — local caps and the full preflight
  still gate the call. A successful reconciliation is cached per server session;
  failures are not cached. Catalog-derived cost is only ever used as an
  estimated/static cost, never as `observed_cost`.
- **Narrowed credential-bearing allowlist** (`src/paidPolicy.ts`): the
  auth-capable boundary (`findPaidEndpointPolicy` →
  `evaluatePaidPreflight`/`evaluatePaidInvocationPreflight`/`buildPaidAuthHeaders`/
  `assertPaidEndpointAllowed`/`getPaidEndpointPolicy`) now resolves policies ONLY
  from `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` = `/v1/stim/latest` and
  `/v1/stim/history`. The broader `PAID_ENDPOINT_POLICIES` (which still lists the
  indicators endpoints) is descriptive future metadata only and is **not**
  reachable by the credential-bearing path; indicator endpoints are denied
  `endpoint_not_allowlisted` before any auth/fetch.
- **Gated paid fetch** (`src/stocktrendsClient.ts` `fetchPaid`): `GET`-only,
  single attempt, no retries, `redirect: "manual"`, existing timeout,
  `X-API-Key` merged over public headers, captures optional ST response headers
  and body `request_id`.
- **Live handlers** (`src/tools/stimTools.ts`): validate → resolve identity →
  structural gate → full pricing/cap preflight → (on approval) build
  `X-API-Key` via the coupled boundary → record the attempt against in-memory
  caps → exactly one `fetch` → wrap. Denial/API-error/success wrappers added.
- **In-memory usage accounting** (`src/paidPolicy.ts`): per-server
  `PaidUsageTracker` created in `src/server.ts`; counters increment only on an
  authorized fetch attempt; reset on restart; no persistence.
- **Docs**: `SECURITY_MODEL.md` §15 reconfirmation, README env table + tool
  section, and these notes.

## Exact Env Flags

| Flag | Default | Role |
| --- | --- | --- |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | `false` | Exposure. `true` + key registers the 3-tool surface. |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | `false` | Execution. Required (with all other gates) for any live call. New in this branch. |
| `STOCKTRENDS_API_KEY` | none | Read only under paid mode; sent only as `X-API-Key` after all gates pass. |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | `true` | Pricing/preflight posture; `false` fails closed. New in this branch. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | `0` | Per-session call cap; `0` denies. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | `0` | Per-tool call cap; `0` denies. |
| `STOCKTRENDS_MAX_STC_PER_SESSION` | none | STC budget cap; nonzero cost without it is denied. |
| `STOCKTRENDS_MAX_USD_PER_SESSION` | none | USD budget cap. |

## Default Denied State and Execution Gate Matrix

| Configuration | Tools exposed | Execution |
| --- | --- | --- |
| default env | 1 | none |
| API key only | 1 | none |
| paid-tools false | 1 | none |
| paid-tools true, no key | 1 | none |
| execution flag only (no tools flag / no key) | 1 | none |
| paid-tools true + key | 3 | none (`paid_execution_disabled`) |
| paid-tools true + key + execution flag | 3 | none (`spend_cap_exceeded` until caps set) |
| paid-tools true + key + execution flag + call caps, no budget cap | 3 | none (`spend_cap_exceeded`, nonzero cost) |
| paid-tools true + key + execution flag + call caps + budget cap | 3 | permitted after full preflight |

Prompts: always **0**. Public resources: always **9**.

## Cap Defaults and Behavior

- Per-session and per-tool call caps default `0` (deny). Budget caps unset by
  default; a nonzero cost with no matching budget cap is denied. Because ST-IM
  rules are nonzero, a budget cap is effectively mandatory.
- Accounting is in-memory per MCP server session. Counters increment only when
  an authorized call is actually attempted (after the header is built,
  immediately before the single fetch). Denied/invalid calls never advance
  usage. State resets on server restart; no persistence.
- History `limit` remains bounded `1`–`2600`; `limit`/`include_gaps` are omitted
  when unsupplied so the API default (`260`) applies.

## Cost/Budget Model

Authorization basis is **static endpoint pricing policy + a fail-closed catalog
reconciliation + local MCP caps** — all three are required before auth/fetch.
Static pricing **cannot authorize a call by itself**: it must reconcile against
the live `GET /v1/pricing/catalog` metadata (credential-free read) before any
auth header or fetch. `/v1/pricing/catalog` is treated as **metadata
reconciliation only, never authorization by itself**. `/v1/cost-estimate` and
`stocktrends_estimate_workflow_cost` remain **workflow-level planning only** and
are **not** on the authorization path. Pricing resolves from the static mirror;
if a rule cannot be resolved authoritatively, execution fails closed
(`pricing_preflight_unavailable`), and if the catalog disagrees with (or cannot
confirm) the mirror, execution fails closed
(`pricing_catalog_reconciliation_failed`). Catalog-derived cost is used only as
an estimated/static cost, never as `observed_cost`.

## Auth Behavior

`X-API-Key` only, constructed inside the coupled boundary
(`buildPaidAuthHeaders`, which re-asserts the full preflight) **after** every
gate passes, and only for the approved origin + allowlisted endpoint. No
`Authorization: Bearer`, no payment header. The key is never logged and never
appears in errors, denials, snapshots, or returned data (asserted by tests). No
auth is built on validation errors, failed preflight, cap denial, or for public
resources / the cost-estimate tool.

## Auth-Capable Endpoint Allowlist

The credential-bearing execution path can only ever authorize `GET /v1/stim/latest`
and `GET /v1/stim/history`. `findPaidEndpointPolicy` (the single resolver used by
`evaluatePaidPreflight`, `evaluatePaidInvocationPreflight`, `buildPaidAuthHeaders`,
`assertPaidEndpointAllowed`, and `getPaidEndpointPolicy`) reads only
`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`. The broader `PAID_ENDPOINT_POLICIES`
(indicators + future) is descriptive metadata that is never reachable by the
auth path. Indicator endpoints are denied `endpoint_not_allowlisted` before any
auth header or fetch — tests assert `getPaidEndpointPolicy`, the structural and
full preflights, and `buildPaidAuthHeaders` all refuse them.

## Fetch Behavior

Exactly one credential-bearing `GET`, no request body, approved origin + exact
allowlisted path, query from validated inputs only, `redirect: "manual"`,
existing timeout, no automatic retries, no alternate endpoint, no auth-switch.
(The catalog reconciliation read is a separate, credential-free public `GET` and
is not the paid request: on a reconciliation failure `api_request_sent` /
`auth_header_sent` remain `false`.) Deterministic errors for network failure,
timeout, non-2xx (status-mapped), `402` (surfaced as safe metadata, no x402),
and malformed/non-JSON responses.

## Response Wrapper Behavior

Successful responses return `api_data` (verbatim API payload) plus
`mcp_metadata` with: tool name, endpoint path, method, symbol identity
(underscore canonical **and** hyphen `api_symbol_exchange` as sent),
`request_parameters` / `api_request_parameters`, preflight decision summary
(allowlists, pricing source/rule, estimated cost, decision), local cap status
(limits + current usage), `response_metadata` (`request_id`, `pricing_rule`,
`payment_required`, accepted methods, quota limit/period when present;
`observed_cost` and `payment_status` `null`), `pricing_policy_version`,
`authoritative_for` / `not_authoritative_for`, `fetched_at`, warnings, and
limitations. Top-level flags: `paid_execution_authorized: true`,
`api_request_sent: true`, `auth_header_sent: true`, `payment_header_sent:
false`. `observed_cost` and `payment_status` are **never fabricated**.

## Symbol_Exchange Hyphen Reconciliation

MCP accepts the underscore canonical form (`AAPL_Q`). The outbound API query is
built in **hyphen** form (`AAPL-Q`) via `symbol_identity.api_symbol_exchange`;
the underscore form is never forwarded. The API-returned hyphen `symbol_exchange`
is preserved verbatim in `api_data`. Tests assert the outbound query uses the
hyphen form, that the underscore form never appears in the URL, and that the
returned hyphen form is preserved.

## Error Taxonomy

Deterministic, fail-closed, secret-free, and explicit about whether fetch/auth
occurred: `paid_tools_disabled`, `paid_auth_blocked_missing_api_key`,
`invalid_tool_input`, `endpoint_not_allowlisted`, `tool_endpoint_mismatch`,
`host_not_approved`, `pricing_preflight_unavailable`,
`pricing_catalog_reconciliation_failed`, `cost_unavailable`,
`unsupported_cost_unit`, `spend_cap_exceeded`, `paid_execution_disabled`,
`unexpected_auth_attempt` (impossible by construction), and API-phase codes
`api_request_failed`, `api_timeout`, `api_auth_required`, `api_payment_required`,
`api_forbidden`, `api_not_found`, `api_rate_limited`, `api_unapproved_redirect`,
`api_unexpected_status`, `malformed_api_response`.

## Tests Added/Updated

- `tests/phase4-paid-stim-live-execution.test.ts` (40 tests, mock-only, path-aware
  fetch routing that serves the credential-free catalog read and the
  credential-bearing ST-IM fetch separately):
  - Tool-surface and execution-flag matrix; successful latest/history;
    hyphen-identity contract; X-API-Key-only / no-Bearer / no-payment;
    cap accounting; one-attempt/no-retry deterministic failures (network,
    timeout, 402 with no x402, 401, 404, malformed); pricing-preflight-disabled
    fail-closed; secret redaction; public/planning credential-free regression.
  - **Catalog reconciliation gate:** denied before auth/fetch when the catalog
    is unavailable, malformed, missing `stim_latest_paid`, missing
    `stim_history_paid`, cost-mismatched, endpoint-mismatched, or rule-id-
    conflicted; proceeds to a mock ST-IM fetch only when reconciliation passes;
    reconciliation call is credential-free (no `X-API-Key` to
    `/v1/pricing/catalog`); `observed_cost` not fabricated from catalog data.
  - **Credential-bearing allowlist:** `/v1/indicators/latest` and
    `/v1/indicators/history` cannot pass `getPaidEndpointPolicy`,
    `assertPaidEndpointAllowed`, the structural preflight, the full preflight, or
    `buildPaidAuthHeaders`; ST-IM latest/history still pass the allowlist check.
- Updated `tests/config.test.ts`, `tests/phase3-paid-foundation.test.ts`,
  `tests/phase4-pricing-preflight-foundation.test.ts`, and
  `tests/phase4-paid-stim-foundation.test.ts` for the execution-capable build and
  runtime gate.

## Validation Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed (10 files, 178 tests) |
| `npm run build` | Passed |
| `git diff --check` | Passed |

No live API validation was performed. No live credentials were used.

## Mock-Only Validation Posture

All tests use `vi.fn` fetch mocks and local fixtures. No production paid call,
no real key, no x402/payment, no DB, and no live call run in CI. Live API
validation requires separate explicit operator authorization after merge, with
the operator's own key and explicit nonzero caps, and must never commit
credentials.

## Deferrals (unchanged)

No x402, no wallet, no OAuth, no remote MCP, no `Authorization: Bearer` fallback,
no payment header, no database/control-plane access, no dynamic registration, and
no MCP prompts. Local caps are in-memory only and reset on restart.

## Known Limitations

- Static pricing amounts are a local mirror; they can no longer authorize a call
  on their own — the fail-closed catalog reconciliation gate requires the live
  `/v1/pricing/catalog` to confirm the same rule id, endpoint, cost, and unit
  before any auth/fetch. The expected catalog shape
  (`rules[].pricing_rule_id` / `endpoint_pattern` (or `endpoint_path`) /
  `stc_cost` / optional `unit`) is a documented assumption; if the live catalog
  uses a different shape, reconciliation fails closed (execution stays blocked)
  until the parser is reconciled in a follow-up. Live execution is exercised
  mock-only until then.
- Reconciliation success is cached per server session (no time-based staleness
  check); it resets on restart. In-memory caps also do not persist across
  restarts.
- The catalog read is a separate credential-free public `GET`; it is metadata
  reconciliation only, never authorization by itself.
- Subscription mode returns no observed per-call cost and no payment settlement;
  the wrapper never fabricates them (catalog cost is only an estimated/static
  cost, never `observed_cost`).

## Recommended Next Step

After merge, perform a separately authorized, operator-run live validation: set
an API key, `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, and small explicit caps;
confirm the reconciliation gate passes against the operator's live
`/v1/pricing/catalog` (adjusting the documented catalog-shape parser if the real
response differs, and reconciling the static mirror amounts to the catalog), then
confirm one live `GET /v1/stim/latest` and one `GET /v1/stim/history` return the
expected wrapper. Record results in a follow-up validation report; do not commit
credentials.
