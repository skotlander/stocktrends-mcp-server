# Phase 4 Paid ST-IM Live Execution Subscription/API-Key Validation Report

## 1. Purpose

This report records validation of the **merged** state of the Phase 4 paid ST-IM live execution
subscription/API-key implementation, as landed by [PR #22 "Implement Phase 4 paid ST-IM live
execution subscription"](../../../pull/22) (merge commit `10b8913`, merged 2026-07-08T22:54:09Z).
It documents what the server actually exposes and does on `main` today, cross-checked against the
source in `src/`, the test suite in `tests/`, and the design/implementation docs already in
`docs/`. It supersedes no prior report; it validates the implementation notes
([`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md))
and design memo ([`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md))
against the code that actually merged, and records the Codex security review outcome that gated
the merge.

This report is documentation only. No runtime code, tests, or `package.json` were changed to
produce it. No endpoints were called, no API keys were used, and no secrets or `.env` files were
inspected.

## 2. Architecture boundary

The authority boundary confirmed by this validation is unchanged from Phase 1–3 and remains:

```
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The merged code confirms the MCP server does **not** become any of the following:

- **Direct database client** — no database driver, connection string, or ORM appears anywhere in
  `src/`; every data path is an HTTPS `fetch` to `config.apiBaseUrl` ([`src/stocktrendsClient.ts`](../src/stocktrendsClient.ts)).
- **Control-plane client** — no admin, provisioning, or control-plane endpoint is referenced by any
  resource, tool, or allowlist.
- **Pricing authority** — `resolveStaticEndpointPricing` in [`src/paidPricing.ts`](../src/paidPricing.ts)
  is explicitly documented as a non-authoritative local mirror that must reconcile against the live
  `/v1/pricing/catalog` before it can gate anything (§6).
- **Payment authority** — the server never signs, submits, or settles a payment; `payment_header_sent`
  is hardcoded `false` on every code path in [`src/tools/stimTools.ts`](../src/tools/stimTools.ts).
- **x402 wallet/payment engine** — no wallet, signing key, or x402 client library is present.
- **API recomputation layer** — ST-IM tool handlers pass through `api_data` from the Stock Trends API
  unmodified; no distribution, score, or rank is recomputed locally.
- **Intelligence Agent recomputation layer** — no guidance/research/selection endpoint is reachable
  by any resource or tool (see the `PROHIBITED_RESOURCE_ENDPOINTS` list in
  [`src/resources/index.ts`](../src/resources/index.ts)).
- **Parallel reasoning engine** — the server does not synthesize forecasts, rankings, or narratives;
  it forwards published API metadata/data.
- **Investment advice generator** — every paid ST-IM wrapper declares `not_authoritative_for:
  ["investment advice", ...]` (`buildToolMetadata` in `stimTools.ts`).

## 3. Current merged MCP surface

Verified directly against `src/server.ts`, `src/resources/index.ts`, `src/tools/index.ts`,
`src/tools/stimTools.ts`, and `tests/phase4-paid-stim-live-execution.test.ts`:

| Property | Value | Evidence |
|---|---|---|
| Transport | Local stdio only (`StdioServerTransport`) | [`src/server.ts:4,85`](../src/server.ts) |
| Public resources | 9 | `PUBLIC_RESOURCES` array, [`src/resources/index.ts:27-109`](../src/resources/index.ts) |
| Default tool count | 1 (`stocktrends_estimate_workflow_cost`) | [`src/tools/index.ts:28-36`](../src/tools/index.ts) |
| Paid-mode tool count (paid-tools flag + API key, execution flag unset or false) | 3 | `shouldExposePaidStimTools`, [`src/tools/stimTools.ts:375-377`](../src/tools/stimTools.ts) |
| Execution-enabled tool count (paid-tools flag + key + execution flag) | 3 (same 3 tools; execution flag changes *behavior*, not the tool count) | `tests/phase4-paid-stim-live-execution.test.ts:57` |
| MCP prompts | 0 | `MCP_PROMPT_DEFINITIONS: readonly [] = []`, [`src/tools/index.ts:39`](../src/tools/index.ts); `PHASE1_PROMPT_DEFINITIONS: readonly [] = []`, [`src/resources/index.ts:133`](../src/resources/index.ts) |
| Public resources credential-free | Yes | `registerPublicResources` builds no auth header, [`src/resources/index.ts:166-225`](../src/resources/index.ts) |
| Cost-estimate tool credential-free | Yes | `handleCostEstimateTool` calls `client.fetchJson` with no auth headers, [`src/tools/index.ts:128-131`](../src/tools/index.ts) |
| Dynamic tool/resource registration | None | All tools/resources are statically enumerated arrays (`PUBLIC_RESOURCES`, `PUBLIC_PLANNING_TOOL_DEFINITIONS`, `PAID_STIM_TOOL_DEFINITIONS`); nothing is derived from `/v1/ai/tools` or `/v1/workflows` responses |

The 3-tool paid-mode figure and the 1-tool default figure are further corroborated by the explicit
regression test `tests/phase4-paid-stim-live-execution.test.ts:57` ("exposes exactly 3 tools, 9
resources, 0 prompts with the execution flag set") and `:74` ("exposes only the planning tool when
the execution flag is set without the paid-tools flag").

## 4. Environment/tool exposure matrix

Derived from `parsePaidToolsConfig` ([`src/config.ts:106-141`](../src/config.ts)) and
`shouldExposePaidStimTools` ([`src/tools/stimTools.ts:375-377`](../src/tools/stimTools.ts)):

| Environment | Tools exposed | Paid execution possible? |
|---|---|---|
| No env vars | 1 (planning tool only) | No |
| `STOCKTRENDS_API_KEY` only (no `STOCKTRENDS_ENABLE_PAID_TOOLS`) | 1 | No — API key alone never registers paid tools (`paidToolsRequested` is false) |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=false` | 1 | No |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true` without key | 1 (`status: blocked_missing_api_key`) | No — blocked; key never read for registration decision beyond presence check |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true` with key | 3 (`status: configured_foundation_no_execution`) | No — every invocation denies with `paid_execution_disabled`, no request sent |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true` + key + `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, no caps configured | 3 (`status: configured_execution_enabled`) | No — `maxPaidCallsPerSession`/`maxPaidCallsPerTool` default to `0`; `capWouldBeExceeded` denies with `spend_cap_exceeded` before any auth header/fetch |
| Full execution env (paid-tools flag + key + execution flag + nonzero per-session/per-tool caps + nonzero STC or USD budget cap) + successful `/v1/pricing/catalog` reconciliation | 3 | Yes — a single authorized `GET` to `/v1/stim/latest` or `/v1/stim/history` can occur |

"All other non-paid combinations expose only the planning tool" is confirmed: `shouldExposePaidStimTools`
requires both `config.paidTools.requested` and `config.paidTools.apiKeyConfigured`; any combination
missing either leaves only `registerPublicPlanningTools`' single tool registered.

## 5. Live execution gate validation

`executePaidStim` in [`src/tools/stimTools.ts:455-569`](../src/tools/stimTools.ts) and
`evaluatePaidPreflight`/`evaluatePaidInvocationPreflight` in
[`src/paidPolicy.ts`](../src/paidPolicy.ts) confirm every one of the following must pass, in order,
before an authorized fetch:

1. **Build-level execution capability** — `PHASE4_PAID_EXECUTION_ENABLED = true` (compile-time
   constant, [`src/paidPolicy.ts:148`](../src/paidPolicy.ts)), mirrored into
   `paidCallsAuthorizedInThisBuild`.
2. **`STOCKTRENDS_ENABLE_PAID_EXECUTION=true`** — `config.paidTools.executionEnabled`, only ever
   `true` when paid mode is requested with a key (`createPaidToolsConfig`,
   [`src/paidPolicy.ts:239`](../src/paidPolicy.ts)).
3. **`STOCKTRENDS_ENABLE_PAID_TOOLS=true`** — `config.paidTools.requested`.
4. **API key configured** — `config.paidTools.apiKeyConfigured`.
5. **Pricing/preflight required and available** — `requirePricingPreflight` defaults `true`;
   disabling it (`STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT=false`) fails closed with `missing_pricing`
   rather than skipping the check ([`src/paidPolicy.ts:346-348`](../src/paidPolicy.ts)).
6. **Catalog reconciliation succeeds before auth/fetch** — `reconcileStaticPricingWithCatalog` runs
   after the local pricing/cap preflight passes but strictly before `buildPaidAuthHeaders`
   ([`src/tools/stimTools.ts:524-550`](../src/tools/stimTools.ts)).
7. **Endpoint/tool/host allowlists pass** — `evaluatePaidInvocationPreflight` structural gate
   ([`src/paidPolicy.ts:623-654`](../src/paidPolicy.ts)).
8. **Auth-capable endpoint allowlist narrowed to ST-IM latest/history** — see §7.
9. **Local per-session cap configured and not exceeded** — `perSessionPaidCallCap`.
10. **Local per-tool cap configured and not exceeded** — `perToolPaidCallCap`.
11. **STC/USD budget cap configured and not exceeded for nonzero paid rules** — `stcBudgetCap`/
    `usdBudgetCap`; both ST-IM rules are nonzero (§6), so a `null` (unset) budget cap combined with
    a nonzero delta never passes (`buildBudgetCapState`, [`src/paidPolicy.ts:537-546`](../src/paidPolicy.ts)).
12. **No automatic retries** — `fetchPaid` performs exactly one `fetch` call with no retry loop
    ([`src/stocktrendsClient.ts:153-223`](../src/stocktrendsClient.ts)); `automaticPaidRetries: false`
    is a literal type-level constant (`PaidSpendPolicy.automaticPaidRetries: false`).

`buildPaidAuthHeaders` is only ever invoked after `evaluatePaidPreflight` returns `allow` **and**
after the catalog reconciliation gate returns `ok: true` — confirmed by the call order in
`executePaidStim` (`decision` computed at line 506, reconciliation at 529, `buildPaidAuthHeaders` at
550). No auth header is constructed and no fetch occurs on any denial path (`denyStimInvocation`
returns before either).

## 6. Static pricing / catalog reconciliation validation

Source: [`src/paidPricing.ts`](../src/paidPricing.ts).

- **Static pricing alone cannot authorize live paid calls.** `resolveStaticEndpointPricing` only
  produces a `PaidCostEstimate`; nothing in `evaluatePaidPreflight` treats that estimate as
  sufficient — `executePaidStim` unconditionally calls `reconcileStaticPricingWithCatalog` after the
  local preflight passes, before any auth header (lines 524–544).
- **`/v1/pricing/catalog` reconciliation occurs before auth/fetch** — confirmed by code order (§5)
  and by test `tests/phase4-paid-stim-live-execution.test.ts:236` ("proceeds to a mock ST-IM fetch
  only when catalog reconciliation passes").
- **Catalog call is credential-free; no `X-API-Key` sent to catalog** — `reconcileStaticPricingWithCatalog`
  calls `client.fetchJson` (the public, unauthenticated path), not `client.fetchPaid`
  ([`src/paidPricing.ts:131-135`](../src/paidPricing.ts)). Confirmed by test
  `tests/phase4-paid-stim-live-execution.test.ts:252` ("reconciles credential-free: no X-API-Key is
  sent to /v1/pricing/catalog").
- **Catalog is metadata reconciliation only, not authorization by itself** — explicitly documented in
  the module header comment (`paidPricing.ts:1-24`) and in the wrapper `limitations` array emitted by
  every paid ST-IM response ("Static local pricing cannot authorize a paid call by itself; it must
  reconcile against the live `/v1/pricing/catalog`... The catalog is metadata reconciliation only,
  never authorization by itself.", [`src/tools/stimTools.ts:813`](../src/tools/stimTools.ts)).
- **`/v1/cost-estimate` remains workflow-level planning only** — `COST_ESTIMATE_ENDPOINT_PATH` is
  registered only on the public planning tool ([`src/tools/index.ts:8`](../src/tools/index.ts)); it
  is never referenced by `paidPolicy.ts` or `stimTools.ts`, and its response wrapper declares
  `paid_execution_authorized: false` unconditionally.
- **`stocktrends_estimate_workflow_cost` is advisory only** — every output path sets
  `paid_execution_authorized: false`, `payment_authorized: false`, and
  `future_payment_challenge_amount_known: false` ([`src/tools/index.ts:175-178`](../src/tools/index.ts)).
- **Missing/unavailable/malformed/ambiguous/mismatched catalog data fails closed** — every
  `PricingReconciliationFailureReason` (`catalog_unavailable`, `catalog_malformed`, `rule_missing`,
  `rule_ambiguous`, `cost_missing`, `unsupported_unit`, `cost_mismatch`, `endpoint_mismatch`,
  `rule_id_mismatch`) returns `ok: false`, which `executePaidStim` maps to
  `pricing_catalog_reconciliation_failed` and denies before auth/fetch
  ([`src/paidPricing.ts:76-233`](../src/paidPricing.ts)).
- **`observed_cost` is not fabricated from static or catalog pricing** — `observed_cost` is a literal
  `null` type (`PaidStimResponseMetadata.observed_cost: null`) on every wrapper, populated only if
  the live API response itself were to supply it (it currently is not read from any response field);
  confirmed by test `tests/phase4-paid-stim-live-execution.test.ts:267` ("does not fabricate
  observed_cost from catalog data on success").

## 7. Auth-capable endpoint allowlist validation

Source: [`src/paidPolicy.ts:171-227`](../src/paidPolicy.ts).

- The credential-bearing live execution allowlist (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`) is narrowed
  to exactly:
  - `GET /v1/stim/latest` (`stocktrends_get_stim_latest`)
  - `GET /v1/stim/history` (`stocktrends_get_stim_history`)
- **Indicator endpoints are descriptive/future metadata only.** `/v1/indicators/latest` and
  `/v1/indicators/history` exist only in the broader `PAID_ENDPOINT_POLICIES` array (`...
  AUTH_CAPABLE_PAID_ENDPOINT_POLICIES, { indicators_latest_paid... }, { indicators_history_paid... }`),
  which is explicitly commented as "NON-auth-capable future paid endpoint metadata... deliberately
  NOT reachable by the credential-bearing auth/fetch path" (lines 200-205). No tool registers a
  handler for either indicator endpoint anywhere in `src/tools/`.
- **Indicators cannot pass auth-capable preflight.** `findPaidEndpointPolicy` — used by every
  auth-adjacent function (`evaluatePaidPreflight`, `evaluatePaidInvocationPreflight`,
  `buildPaidAuthHeaders`, `assertPaidEndpointAllowed`, `getPaidEndpointPolicy`) — resolves policies
  only from `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` ([`src/paidPolicy.ts:475-479`](../src/paidPolicy.ts)),
  so an indicator endpoint path returns `undefined` and denies `endpoint_not_allowlisted` before any
  auth header or fetch.
- **Indicators cannot receive `X-API-Key`.** `buildPaidAuthHeaders` calls `evaluatePaidPreflight` and
  `assertPaidPreflightAuthorized` first ([`src/paidPolicy.ts:262-263`](../src/paidPolicy.ts)); since
  `evaluatePaidPreflight` denies indicator paths at the allowlist step, `assertPaidPreflightAuthorized`
  throws before the `X-API-Key` header is ever constructed.
- Confirmed by regression test `tests/phase4-paid-stim-live-execution.test.ts:554` ("narrows the
  auth-capable allowlist to ST-IM latest/history only, keeping broad metadata separate") and `:595`
  ("still allows the ST-IM endpoints through the auth-capable allowlist check").

This is the narrowed allowlist that resulted from the first Codex review's second finding (§15).

## 8. ST-IM latest execution validation

Source: [`src/tools/stimTools.ts:389-414`](../src/tools/stimTools.ts) and `paidPolicy.ts`.

| Property | Value |
|---|---|
| Tool name | `stocktrends_get_stim_latest` |
| Endpoint path | `GET /v1/stim/latest` |
| Strict validation | `stimLatestInputSchema` is a Zod `.strict()` object; unknown keys rejected |
| `symbol_exchange` precedence | `resolveSymbolIdentity` checks `input.symbol_exchange !== undefined` before falling back to `symbol` + `exchange` (lines 872-891) |
| Exchange allowlist | `exchangeField = z.enum(VALID_STIM_EXCHANGES)` = `["N","Q","A","B","T","I"]` (line 41, 109) |
| Hyphen outbound identity | `api_symbol_exchange: \`${symbol}-${exchange}\`` is what is sent; the underscore `symbol_exchange` is echoed back but never placed in `apiRequestParameters` |
| One GET after all gates | `executePaidStim` calls `client.fetchPaid` exactly once, only after structural + pricing/cap + reconciliation gates all pass |
| No Bearer | `fetchPaid` sends only `Accept`, `User-Agent`, and the caller-supplied `authHeaders` (`X-API-Key`); no `Authorization` header is ever set |
| No payment header | `payment_header_sent: false` is a literal type on both `PaidStimSuccessWrapper` and the error wrapper |
| No retries | Single `try { await client.fetchFn(...) }`, no loop, no retry-after handling |
| Response wrapper behavior | Success wraps `response.data` verbatim as `api_data`; errors wrap a deterministic `error` object with `api_request_sent: true`, `paid_execution_authorized: false` |

## 9. ST-IM history execution validation

Source: [`src/tools/stimTools.ts:416-439, 904-949`](../src/tools/stimTools.ts).

| Property | Value |
|---|---|
| Tool name | `stocktrends_get_stim_history` |
| Endpoint path | `GET /v1/stim/history` |
| Strict validation | `stimHistoryInputSchema` is `.strict()` |
| `symbol_exchange` precedence | Same `resolveSymbolIdentity` as latest |
| Exchange allowlist | Same `VALID_STIM_EXCHANGES` |
| `start`/`end` validation | `DATE_PATTERN` regex plus `isRealCalendarDate` (rejects e.g. `2026-02-30`); `start must be on or before end` enforced in `buildHistoryRequestParameters` before any network step |
| `limit` bounds | `z.number().int().min(1).max(2600)` — matches confirmed API `Query(default=260, ge=1, le=2600)` |
| `include_gaps` handling | Optional boolean, forwarded only if supplied |
| `limit`/`include_gaps` omitted when unsupplied | `buildHistoryRequestParameters` only sets `parameters.limit`/`parameters.include_gaps` when `input.limit !== undefined` / `input.include_gaps !== undefined` (lines 940-946), so the API's own defaults (`limit=260`, `include_gaps=false`) apply |
| Hyphen outbound identity | `apiRequestParameters` built with `identity.api_symbol_exchange` (hyphen form) |
| One GET after all gates | Same `executePaidStim` path as latest |
| No Bearer / no payment header / no retries | Same as §8 |
| Response wrapper behavior | Same success/error wrapper shape as §8; confirmed by test `tests/phase4-paid-stim-live-execution.test.ts:375` ("forwards supplied params (hyphen identity) and preserves the API history payload") and `:405` ("omits limit and include_gaps when not supplied so API defaults apply") |

## 10. Symbol identity reconciliation validation

Source: [`src/tools/stimTools.ts:220-230, 867-902`](../src/tools/stimTools.ts).

- **MCP accepts underscore canonical form** — `symbol_exchange` input is validated against
  `SYMBOL_EXCHANGE_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/` (underscore separator), matching
  the MCP-facing form documented in the design memo and confirmed as the chosen MCP input form.
- **Outbound API query uses hyphen form.** `resolveSymbolIdentity` always derives
  `api_symbol_exchange: \`${symbol}-${exchange}\`` regardless of whether the caller supplied
  `symbol_exchange` (split on the last `_`) or decomposed `symbol` + `exchange` (joined with `-`).
- **Underscore form is never forwarded as `symbol_exchange` to the API.** `apiRequestParameters`
  (used to build `client.fetchPaid`'s `searchParams`) always uses `identity.api_symbol_exchange`
  (hyphen), never `identity.symbol_exchange` (underscore) — see `handleStimLatestTool` line 399 and
  `buildHistoryRequestParameters` invocation at line 426.
- **API-returned hyphen `symbol_exchange` is preserved in `api_data`.** The success wrapper's
  `api_data` field is `response.data` verbatim (`successResult`, line 684) — no field is rewritten,
  stripped, or reformatted, so whatever identity form the Stock Trends API returns is passed through
  unchanged.
- Confirmed by test `tests/phase4-paid-stim-live-execution.test.ts:321` ("sends X-API-Key only, to the
  approved endpoint, with hyphen identity and no Authorization/payment header") and `:346` ("accepts
  decomposed symbol + exchange and still sends hyphen identity").

## 11. Cap accounting validation

Source: [`src/paidPolicy.ts:695-742`](../src/paidPolicy.ts).

- **Per-session cap** (`maxPaidCallsPerSession`) and **per-tool cap** (`maxPaidCallsPerTool`) are
  evaluated in `buildCapState`/`capWouldBeExceeded` before every call.
- **STC/USD budget cap behavior** — `buildBudgetCapState` treats an unset (`null`) limit combined
  with a nonzero delta as `wouldExceed: true` (`delta > 0 && (limit === null || projected > limit)`,
  line 544), so an unset budget cap always denies a nonzero-cost call.
- **Default 0/unset denies nonzero paid execution** — `DEFAULT_PAID_SPEND_POLICY` sets
  `maxPaidCallsPerSession: 0`, `maxPaidCallsPerTool: 0`, `maxStcPerSession: null`,
  `maxUsdPerSession: null` (lines 161-169); with both ST-IM pricing rules nonzero (§6), the default
  policy denies every call until an operator explicitly raises the caps.
- **Counters are in-memory, per MCP server session.** `PaidUsageTracker` is created once per
  `createStockTrendsMcpServer` call (`paidUsage = createPaidUsageTracker()`, `src/server.ts:40`) and
  held in a closure; there is no file, database, or external store.
- **Reset on restart, no persistence** — confirmed by the absence of any read/write to disk or an
  external store in `paidPolicy.ts`, and explicitly documented in the wrapper `limitations` array
  ("local spend caps are in-memory only and reset on server restart").
- **Denied validation/preflight/cap calls do not increment.** `recordPaidCallAttempt` is called
  exactly once, at `executePaidStim` line 551 — strictly after the structural gate, the pricing/cap
  preflight (`decision.localPolicyDecision === "allow"`), and the catalog reconciliation all pass.
  Every `denyStimInvocation` return path exits before that line.
- **Authorized failed fetch attempts do increment.** `recordPaidCallAttempt` runs before
  `client.fetchPaid` is called (line 551 vs. 558), so a call that is authorized but fails at the
  network/API layer (timeout, 5xx, 402, malformed JSON) still counts against the caps — this is
  intentional (an authorized request was actually sent).
- Confirmed by test `tests/phase4-paid-stim-live-execution.test.ts:445` ("increments in-memory usage
  and blocks once the per-tool cap is reached") and `:469` ("does not advance usage on a denied
  (invalid input) call").

## 12. Auth safety validation

- **`X-API-Key` only** — `buildPaidAuthHeaders` returns `{ "X-API-Key": config.paidTools.apiKey }`
  exclusively ([`src/paidPolicy.ts:275-277`](../src/paidPolicy.ts)).
- **No `Authorization`/Bearer header** — not present anywhere in `stocktrendsClient.ts` or
  `paidPolicy.ts`.
- **No payment header** — no `X-Payment`/`Payment-Signature` header is ever constructed or sent;
  `payment_header_sent` is hardcoded `false`.
- **API key read only under paid mode** — `parsePaidToolsConfig` only reads
  `env.STOCKTRENDS_API_KEY` inside the `if (paidToolsRequested)` branch ([`src/config.ts:106-141`](../src/config.ts)).
- **API key never logged or returned** — `apiKey` is defined as a non-enumerable property on the
  frozen config object (`Object.defineProperty(config, "apiKey", { value: input.apiKey, enumerable:
  false })`, [`src/paidPolicy.ts:251-256`](../src/paidPolicy.ts)), and no tool wrapper field ever
  echoes `config.paidTools.apiKey`.
- **No auth for public resources** — `registerPublicResources` never references `paidTools` or
  `apiKey` ([`src/resources/index.ts:166-225`](../src/resources/index.ts)).
- **No auth for the cost-estimate planning tool** — `handleCostEstimateTool` calls `client.fetchJson`
  (public path) with no auth headers.
- **No auth for validation errors** — `toolInputError` returns before `executePaidStim` is ever
  called ([`src/tools/stimTools.ts:1076-1095`](../src/tools/stimTools.ts)).
- **No auth for failed preflight** — every `denyStimInvocation` path returns before
  `buildPaidAuthHeaders` is reached.
- **No auth for cap denial** — cap denial is one of the `evaluatePaidPreflight` deny paths
  (`cap_exceeded`), which returns before reconciliation and before `buildPaidAuthHeaders`.
- **No auth for catalog reconciliation** — confirmed in §6; `reconcileStaticPricingWithCatalog` uses
  `client.fetchJson`, the credential-free path.
- **Secret redaction remains covered** — [`src/redaction.ts`](../src/redaction.ts) still matches
  `STOCKTRENDS_API_KEY`, `X-API-KEY`, `AUTHORIZATION`, `BEARER_TOKEN`, `PAYMENT_SIGNATURE`,
  `X-PAYMENT`, `WALLET_PRIVATE_KEY`, `DATABASE_URL`, and related patterns; unchanged by this PR (no
  diff to `redaction.ts` in commit `d696c90` or the merged PR).

## 13. Fetch/error behavior validation

Source: [`src/stocktrendsClient.ts:153-223`](../src/stocktrendsClient.ts).

- **GET only** — `fetchPaid` hardcodes `method: "GET"`.
- **No request body** — no `body` field is set in the `RequestInit` passed to `fetchFn`.
- **Approved origin only** — `buildUrl` throws `invalid_resource_request` if the constructed URL's
  origin does not match `this.apiBaseOrigin` (lines 65-81), and `isApprovedAuthTarget` in
  `paidPolicy.ts` independently re-checks `targetUrl.origin === apiBaseUrl.origin` plus protocol/
  credential/hash checks before preflight can allow.
- **Exact allowlisted paths only** — `context.endpointPath` is always one of the two literal
  constants `STIM_LATEST_ENDPOINT_PATH` / `STIM_HISTORY_ENDPOINT_PATH`; never caller-supplied.
- **Query params from validated inputs only** — `toSearchParams(context.apiRequestParameters)` is
  built exclusively from the Zod-validated, handler-resolved identity/date/limit fields; no raw
  passthrough of arbitrary input.
- **Exactly one fetch** — single `await this.fetchFn(url, init)` call per `fetchPaid` invocation, no
  loop.
- **No automatic retry** — confirmed by code inspection (no retry/backoff logic) and by the explicit
  `automaticPaidRetries: false` type-level constant plus wrapper messaging ("Exactly one attempt was
  made; no automatic retry occurred").
- **Deterministic network/timeout/non-2xx/402/malformed errors** — `AbortController` timeout maps to
  `StockTrendsMcpError("timeout", ...)`; network failure maps to `api_unavailable`; 3xx maps to
  `api_unapproved_redirect` (redirects are never followed — `redirect: "manual"`); non-`response.ok`
  maps via `errorFromHttpStatus` (see [`src/errors.ts`](../src/errors.ts)); non-JSON content-type or
  JSON parse failure maps to `malformed_api_response`.
- **402 has no x402 fallback** — `errorFromHttpStatus` maps HTTP 402 to `unexpected_paid_endpoint`,
  which `mapClientErrorToStimCode` maps to `api_payment_required`; `apiErrorWarning` states "This
  adapter does not implement x402/wallet payment: nothing was signed, paid, or retried, and no
  alternate endpoint or auth was attempted." Confirmed by test
  `tests/phase4-paid-stim-live-execution.test.ts:528` ("surfaces a 402 as safe metadata without any
  x402 payment or retry").
- **No fallback to Bearer** — no code path constructs an `Authorization` header under any
  circumstance, success or failure.
- **No fallback to alternate endpoint** — `context.endpointPath` is fixed per tool for the lifetime
  of the call; no retry-with-different-path logic exists.

## 14. Response wrapper validation

Source: [`src/tools/stimTools.ts:239-305, 642-756`](../src/tools/stimTools.ts).

| Field | Confirmed behavior |
|---|---|
| `paid_execution_authorized` | `true` only in `successResult` (after an approved fetch actually returns 2xx JSON); `false` on every denial and every `apiErrorResult` path |
| `api_request_sent` | `true` only if `client.fetchPaid` was actually invoked (`successResult` and `apiErrorResult`); `false` on every `denyStimInvocation` path |
| `auth_header_sent` | `true` only if `buildPaidAuthHeaders` executed, i.e. only on `successResult`/`apiErrorResult`; `false` on denial |
| `payment_header_sent` | `false` unconditionally, all paths (literal type) |
| `api_data` | Raw API JSON (`response.data`), unmodified, present only on `successResult` |
| `request_id` | Preserved from `response.requestId` (body `request_id` field, else `x-request-id`/`x-correlation-id` header); `null` when absent |
| `pricing_rule` header | Preserved from `x-stocktrends-pricing-rule` response header when present, else `null` |
| `payment_required` header | Preserved from `x-stocktrends-payment-required` when present, else `null` |
| Accepted methods | Preserved from `x-stocktrends-accepted-payment-methods` when present, else `null` |
| Quota limit/period | Preserved from `x-stocktrends-quota-limit` / `x-stocktrends-quota-period` when present, else `null` |
| Missing optional metadata | `null` (never omitted, never fabricated) — `PaidResponseHeaders` fields are all `string \| null` |
| `observed_cost` | `null` unless actually returned by the API (currently always `null`; not read from any response field, see §6) |
| `payment_status` | `null` in subscription mode — literal `null` type on `PaidStimResponseMetadata.payment_status` |
| `source` | `"stocktrends_api"` (literal, `buildToolMetadata` line 782) |
| `authoritative_for` | `"ST-IM API data returned by Stock Trends API"` (literal) |
| `not_authoritative_for` | `["investment advice", "payment authorization", "future performance guarantee"]` (literal) |
| `fetched_at` | `new Date().toISOString()` set at successful fetch or API-error time; `null` on denial (no fetch occurred) |
| `warnings`/`limitations` | Populated per code path (`denialWarning`, `apiErrorWarning`, or `context.extraWarnings`); `limitations` array always includes the catalog-reconciliation and no-fabrication notices from §6 |

Confirmed end-to-end by test `tests/phase4-paid-stim-live-execution.test.ts:284` ("performs exactly
one authorized fetch and wraps the API response") and `:359` ("never leaks the API key into the
returned wrapper").

## 15. Codex review summary

- **First Codex review requested changes.** Two findings were raised against the initial PR #22
  implementation:
  1. **Static pricing blocker** — the static local pricing mirror (`resolveStaticEndpointPricing`)
     could authorize real paid calls before any reconciliation against live catalog data, meaning a
     stale or incorrect local mirror could gate a real charge.
  2. **Broad endpoint allowlist finding** — the auth-capable paid endpoint allowlist was broader than
     ST-IM and included the indicator endpoints (`/v1/indicators/latest`, `/v1/indicators/history`),
     which had not been separately reviewed for live execution.
- **Fixes applied** (commit `d696c90`, "Address paid ST-IM live execution security review findings",
  squashed into merge commit `10b8913`):
  1. Added a fail-closed, credential-free `/v1/pricing/catalog` reconciliation gate
     (`reconcileStaticPricingWithCatalog`) that must pass before any auth header is constructed or
     any fetch occurs — see §6.
  2. Narrowed the auth-capable endpoint allowlist to `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`,
     containing only ST-IM latest/history; indicator entries were moved to the broader, non-auth-
     capable `PAID_ENDPOINT_POLICIES` metadata list — see §7.
  - This fix commit also expanded `tests/phase4-paid-stim-live-execution.test.ts` by 355 lines and
    updated `docs/SECURITY_MODEL.md` (§15) and the implementation notes accordingly.
- **Follow-up Codex review approved PR head `d696c90`** with **no blockers and no important
  findings**. Codex recommended merge from a security-gating standpoint, subject to CI/validation in
  an environment with dependencies installed. Any remaining notes were optional improvements only.
- **PR #22 was merged** into `main` at commit `10b8913` after this approval.

## 16. Automated validation

Recorded from the pre-merge implementation notes
([`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md))
and corroborated by the file structure of the merged `tests/` directory (exactly 10 test files
present on `main` at commit `10b8913`, confirmed by directory listing during this validation):

| Check | Result |
|---|---|
| `npm run typecheck` | Passed |
| `npm test` | Passed — 178 tests, 10 files |
| `npm run build` | Passed |
| `git diff --check` | Passed |

No live endpoint validation was performed for the merged implementation or for this report. No real
API keys were used. No secrets were inspected. This report itself introduces no new automated
validation; per its scope (documentation only), `npm run typecheck`/`npm test`/`npm run build` were
not re-run to produce it — see §17 for the residual verification gap this leaves.

## 17. Known limitations

- Live endpoint validation has not been performed against the real Stock Trends API for this
  implementation.
- The first operator live validation still requires explicit authorization and must be performed
  outside this branch (see §19).
- Catalog reconciliation depends on the public `/v1/pricing/catalog` response continuing to expose a
  `rules`/`pricing_rules`/`catalog` array with `pricing_rule_id`, `endpoint_pattern`/`endpoint_path`,
  and `stc_cost`/`cost_stc` fields shaped as `reconcileRule` expects; an unannounced catalog shape
  change would correctly fail closed but would also block all live execution until the local mirror
  or reconciliation logic is updated.
- The static pricing mirror (`STATIC_ENDPOINT_PRICING`, version `2026-07-08`) must continue to match
  the live catalog's `stim_latest_paid`/`stim_history_paid` cost and unit; the reconciliation gate
  will fail closed on drift, but the mirror is not automatically kept in sync.
- In-memory per-session/per-tool/budget caps reset on every server restart; there is no persisted
  cross-session spend ledger.
- No x402 payment protocol is implemented.
- No wallet integration is implemented.
- No OAuth flow is implemented.
- No remote MCP transport (HTTP/SSE/Streamable HTTP) is implemented; stdio only.
- No `Authorization: Bearer` fallback exists anywhere in the auth path.
- No dynamic tool/resource registration from `/v1/ai/tools` or `/v1/workflows` exists; all
  tools/resources are statically enumerated in source.
- No direct database or control-plane access exists.
- No investment advice is generated; every paid wrapper explicitly disclaims this.
- No observed per-call subscription cost is reported unless the Stock Trends API itself returns one
  in a future response field this adapter is updated to read; `observed_cost` remains `null` today.

## 18. Decision

The Phase 4 paid ST-IM live execution subscription/API-key implementation, as merged via PR #22
(commit `10b8913`), is **validated and complete** against the confirmed contract: the merged code
matches the documented tool-exposure matrix (§3–4), enforces every live-execution gate in the
documented order with no gate bypass (§5), performs fail-closed catalog reconciliation before any
credential-bearing call (§6), narrows the auth-capable endpoint allowlist to ST-IM latest/history
only (§7), implements deterministic strict-validation and single-attempt-fetch behavior for both
paid tools (§8–9), preserves correct hyphen/underscore symbol identity translation (§10), accounts
in-memory spend caps correctly (§11), never constructs unauthorized auth/payment headers (§12–13),
and returns a response wrapper with no fabricated fields (§14). The Codex security review history
that gated this merge (§15) found and required fixing exactly two issues, both of which were
addressed and re-reviewed with no remaining blockers.

## 19. Recommended next step

Recommended next branch: **`ops/phase4-paid-stim-controlled-live-validation-plan`**

This should be a documentation/operations-only branch (no code changes) that defines how to perform
the first manual live validation of the merged implementation, with:

- Explicit user/operator authorization obtained and recorded before any live call.
- A real API key handled entirely outside the repository (environment variable at invocation time
  only; never committed, logged, or pasted into the plan document).
- Minimal caps configured for the validation run (e.g. `maxPaidCallsPerSession=2`,
  `maxPaidCallsPerTool=1`, and a small nonzero STC or USD budget cap covering exactly the two
  planned calls).
- A dry run / configuration inspection step first, if the server/tooling supports one, to confirm the
  exposed tool count and gate status without sending a live request.
- Exactly one live `stocktrends_get_stim_latest` call.
- Exactly one live `stocktrends_get_stim_history` call.
- Confirmation that catalog reconciliation actually passes against the live `/v1/pricing/catalog`
  during the run (not just mocked).
- Confirmation that no x402, wallet, or Bearer-header behavior is observed in the actual request/
  response traffic.
- Confirmation that the response wrapper metadata (§14 of this report) matches observed behavior
  against the real API.
- No committed secrets or raw logs from the validation run; any captured output must be redacted
  before being added to the repository, if captured at all.

Live validation itself must not be performed in this branch.
