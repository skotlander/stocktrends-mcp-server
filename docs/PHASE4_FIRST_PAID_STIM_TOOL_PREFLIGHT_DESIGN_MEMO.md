# Phase 4 First Paid ST-IM Tool Preflight Design Memo

Design date: 2026-07-08

Status: Architecture/design only. No runtime code, no `src/` changes, no `tests/` changes, no `package.json` changes, no MCP tools added, no MCP prompts added, no endpoint calls, no API keys, no secret inspection, no x402/wallet/OAuth/remote/database/control-plane work.

## 1. Purpose

This memo defines the architecture for the first paid ST-IM MCP tools in the Stock Trends MCP Server and the mandatory preflight and execution gates that must exist before any of them can call a paid endpoint.

It builds on and does not supersede:

- [`docs/PHASE4_FIRST_PAID_TOOL_CONTRACT_MEMO.md`](PHASE4_FIRST_PAID_TOOL_CONTRACT_MEMO.md) — first paid-tool selection and contract principles.
- [`docs/PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md) — confirmed ST-IM route/auth/parameter/response facts.
- [`docs/PHASE4_PRICING_PREFLIGHT_FOUNDATION_IMPLEMENTATION_NOTES.md`](PHASE4_PRICING_PREFLIGHT_FOUNDATION_IMPLEMENTATION_NOTES.md) and [`docs/PHASE4_PRICING_PREFLIGHT_FOUNDATION_VALIDATION_REPORT.md`](PHASE4_PRICING_PREFLIGHT_FOUNDATION_VALIDATION_REPORT.md) — the internal, mock-only pricing/preflight model and spend caps.
- [`docs/PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md`](PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md), [`docs/PHASE4_COST_ESTIMATE_PLANNING_TOOL_IMPLEMENTATION_NOTES.md`](PHASE4_COST_ESTIMATE_PLANNING_TOOL_IMPLEMENTATION_NOTES.md), and [`docs/PHASE4_COST_ESTIMATE_PLANNING_TOOL_VALIDATION_REPORT.md`](PHASE4_COST_ESTIMATE_PLANNING_TOOL_VALIDATION_REPORT.md) — the merged public/free `stocktrends_estimate_workflow_cost` planning tool.
- [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) — the conservative security baseline for brokering paid access.

This memo does not authorize paid execution. It defines what a later, separately reviewed branch must satisfy, and recommends the single next branch that makes forward progress without turning paid execution on.

## 2. Architecture boundary

The controlling authority boundary is unchanged:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin adapter over the front-facing Stock Trends API only. The first paid ST-IM tools must not turn the MCP server into any of the following:

- A direct database client.
- A control-plane client.
- A pricing authority.
- A payment authority.
- An x402 wallet/payment engine.
- An API recomputation layer.
- An Intelligence Agent recomputation layer.
- A parallel reasoning engine.
- An investment-advice generator.

The adapter may validate inputs, enforce local policy gates, call an allowlisted paid endpoint after all gates pass, preserve the API-authored payload verbatim, and attach transparent MCP wrapper metadata. It must not compute or reinterpret ST-IM distributions, derive buy/sell/hold/allocation conclusions, decide pricing, or approve payment.

## 3. Current MCP surface

The merged, validated surface (confirmed in [`docs/PHASE4_COST_ESTIMATE_PLANNING_TOOL_VALIDATION_REPORT.md`](PHASE4_COST_ESTIMATE_PLANNING_TOOL_VALIDATION_REPORT.md)) is:

- Local stdio transport only.
- 9 public resources (unchanged since Phase 1/2):

| MCP resource URI | Backing endpoint |
| --- | --- |
| `stocktrends://api/openapi` | `GET /v1/openapi.json` |
| `stocktrends://ai/context` | `GET /v1/ai/context` |
| `stocktrends://ai/tools` | `GET /v1/ai/tools` |
| `stocktrends://workflows` | `GET /v1/workflows` |
| `stocktrends://methodology/stim` | `GET /v1/meta/stim` |
| `stocktrends://methodology/indicators` | `GET /v1/meta/indicators` |
| `stocktrends://methodology/inference` | `GET /v1/meta/inference` |
| `stocktrends://pricing/catalog` | `GET /v1/pricing/catalog` |
| `stocktrends://proof/market-edge` | `GET /v1/ai/proof/market-edge` |

- Exactly 1 public/free MCP planning tool: `stocktrends_estimate_workflow_cost` (backs `GET /v1/cost-estimate`, workflow-level only, credential-free, `paid_execution_authorized` always `false`).
- Zero MCP prompts.
- No paid tools currently registered (`PAID_RUNTIME_TOOL_DEFINITIONS` is a frozen empty array).
- No remote MCP (only `stdio` accepted).
- No x402, wallet, or OAuth.
- No database or control-plane access.
- No dynamic registration from `/v1/ai/tools` or `/v1/workflows`.

Public resources and the public planning tool are credential-free and never send `Authorization`, `X-API-Key`, payment, or wallet headers.

## 4. Candidate paid tools

Two candidates are in scope:

- **A. `stocktrends_get_stim_latest`** → `GET /v1/stim/latest`
- **B. `stocktrends_get_stim_history`** → `GET /v1/stim/history`

### 4.1 Comparative surface

| Dimension | `stocktrends_get_stim_latest` | `stocktrends_get_stim_history` |
| --- | --- | --- |
| Endpoint | `GET /v1/stim/latest` | `GET /v1/stim/history` |
| Input surface | `symbol_exchange` **or** `symbol` + `exchange` only | Same identity, plus `start`, `end`, `limit`, `include_gaps` |
| Cost/row surface | One point-in-time record | Up to `2600` rows (API max), default `260` |
| Validation burden | Symbol identity only | Symbol identity + date range + limit + `include_gaps` |
| Standalone misuse risk | **High** — a single "latest" reading is easily overread as a forecast/instruction | Lower per-reading (longitudinal), higher spend/loop risk if unbounded |
| Interpretation safety | Weak alone; needs historical context beside it | Strong context; the safer longitudinal surface |

### 4.2 The four sequencing options

1. **Latest only first.** Rejected. This directly violates the standing history-beside-latest rule (Phase 4 First Paid Tool Contract Memo §8: "`stocktrends_get_stim_latest` should not ship unless `stocktrends_get_stim_history` ships in the same increment or already exists with equivalent controls"). Latest-only ST-IM is the single highest-overinterpretation surface and must not be the first paid exposure without history beside it.
2. **History only first.** Not recommended as the goal, but *safer than latest-only* if a split were forced: history is the longitudinal, less-overread surface. It is, however, the larger parameter/cost surface, so shipping it in isolation front-loads the most complex validation without delivering the "current snapshot" agents most often ask for.
3. **Latest and history together.** **Recommended.** They share one symbol-identity model, one auth path, one allowlist coupling, one wrapper, and one preflight boundary. Pairing satisfies the history-beside-latest rule directly and adds only a bounded, already-confirmed history parameter surface (`start`/`end`/`limit`/`include_gaps`).
4. **Latest first, defer history for its larger surface.** Rejected. This is option 1 re-described. The "larger parameter/cost surface" of history is real but tractable and already contract-confirmed; it does not justify shipping the higher-risk latest surface alone.

### 4.3 Recommendation and challenge to the "pair together" assumption

**Recommendation: implement `stocktrends_get_stim_latest` and `stocktrends_get_stim_history` together, as one paired increment, and do not split them.**

The task explicitly invited challenging the "pair together" assumption in favour of latest-only-first if safer sequencing suggested it. It does not. The challenge resolves *against* latest-only-first for two independent reasons:

- **Safety direction is inverted.** If any single tool were to ship alone for safety, it would be *history*, not *latest* — history is the lower-overinterpretation surface. "Latest-only-first" is the least safe split, not the safest.
- **The larger-surface argument is weak.** History's extra parameters (`start`, `end`, `limit`, `include_gaps`) are fully confirmed from the API (see §6) and locally boundable well below the API max. The incremental validation is small relative to the shared machinery both tools need anyway.

Therefore the pairing assumption stands. The genuinely conservative move is not to split the pair — it is to keep the *paired* tools behind the hard paid-execution gate for one more foundation branch (see §14), so the full machinery is built and mock-tested before any real `X-API-Key` is ever sent.

## 5. Tool contract: `stocktrends_get_stim_latest`

Approved for the paired increment (behind the hard gate first; see §14).

- **Purpose.** Return the latest API-authored ST-IM forward-return distribution record for one symbol, verbatim, with provenance and limitation metadata. It is a point-in-time snapshot, not a forecast or instruction.
- **Exact endpoint mapping.** `GET /v1/stim/latest` (router prefix `/stim`, mounted under `/v1`). Method `GET`.
- **Inputs.** One symbol per call. Preferred MCP schema: separate `symbol` and `exchange` string fields (clearer for MCP clients), from which the adapter constructs the API query. Optionally, a strict single `symbol_exchange` field may be accepted instead — but the first implementation should expose exactly one identity model, not both, unless a reviewed compatibility reason requires it.
- **Validation rules.** `.strict()` schema; reject unknown keys, arrays, multi-symbol input, and free-text query fields. Trim but do not silently rewrite semantic input. All validation runs *before* preflight and before any network call. No `as_of_date`; the API has no as-of parameter for latest.
- **symbol_exchange vs symbol + exchange precedence.** The API resolves identity in this order (confirmed in `routers/stim.py`): if `symbol_exchange` is supplied it is parsed via `parse_symbol_exchange` and wins; otherwise **both** `symbol` and `exchange` are required. The MCP adapter must mirror this precedence exactly and never send a partial identity.
- **Allowed exchange format.** Exchange is normalized to uppercase and must be a member of the API `VALID_EXCHANGES` set (documented codes: `N`, `Q`, `A`, `B`, `T`, `I`). The adapter should validate against a reviewed static mirror of that set and fail closed locally on anything else rather than forwarding an invalid exchange.
- **Required/optional parameters.** Required: symbol identity (per precedence above). Optional: none.
- **Output wrapper.** Per §11. `api_data` preserves the API record verbatim (`weekdate`, `exchange`, `symbol`, `x4wk1`, `x4wk2`, `x4wk`, `x4wksd`, `x13wk1`, `x13wk2`, `x13wk`, `x13wksd`, `x40wk1`, `x40wk2`, `x40wk`, `x40wksd`, `symbol_exchange`, `request_id`, `latest_data_weekdate`, `is_stale`, `missing_reason`, `missing_weekdate`).
- **Authority limitations.** Not authoritative for investment advice, payment authorization, or future performance. The latest record is a point-in-time snapshot; the wrapper must recommend ST-IM history for longitudinal context and must not auto-call it.
- **Error taxonomy.** Per §12, preserving API status semantics including the API's own `400` symbol/exchange errors (`invalid_symbol_exchange`, `missing_required_param`, invalid-exchange), `404 stim_not_found`, and `500 db_query_failed`.
- **Paid authorization behavior.** Paid tool. Registered only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`, an API key is configured, local policy allows registration, and (for real execution) the hard paid-execution build gate is enabled. `X-API-Key` is constructed only inside the coupled paid-execution boundary after every gate passes.
- **Preflight behavior.** Mandatory internal preflight (per §7) before any call: endpoint/host/tool allowlist, static pricing rule resolution (`stim_latest_paid`), cap checks, deterministic denial on any failure.
- **Budget/cap behavior.** Subject to per-session cap, per-tool cap, and STC/USD budget caps (per §7/§10). Nonzero-cost calls are denied when the matching budget cap is unset or would be exceeded.

## 6. Tool contract: `stocktrends_get_stim_history`

Approved for the paired increment (behind the hard gate first; see §14). No separate deferral — history ships *with* latest.

- **Purpose.** Return an API-authored historical series of ST-IM distribution records for one symbol, ascending by `weekdate`, verbatim, with provenance and limitation metadata. This is the longitudinal context surface.
- **Exact endpoint mapping.** `GET /v1/stim/history` (router prefix `/stim`, mounted under `/v1`). Method `GET`.
- **Inputs.** Symbol identity (same model/precedence as latest), plus optional `start`, `end`, `limit`, `include_gaps`.
- **Validation rules.** `.strict()` schema; reject unknown keys, arrays, and multi-symbol input. All validation before preflight and network.
- **symbol_exchange vs symbol + exchange precedence.** Identical to §5: `symbol_exchange` wins if present; otherwise both `symbol` and `exchange` required. Mirror API precedence exactly.
- **start/end behavior.** `start` and `end` are inclusive `YYYY-MM-DD` date strings (confirmed in `routers/stim.py`). Both are optional at the API. MCP local rules: if provided, validate `YYYY-MM-DD` format locally; `end` must not precede `start`; reject future dates unless the API explicitly defines future as-of behavior (it does not today). The adapter must not invent a lookback parameter — the API has no lookback field.
- **limit behavior.** API `limit` is an integer with `default 260`, `min 1`, `max 2600` (confirmed: `Query(default=260, ge=1, le=2600)`). It caps returned rows.
- **include_gaps behavior.** API `include_gaps` is a boolean, `default false`. When true, the API adds absent-weekdate gap detection (documented as potentially slower). The adapter forwards it as-is and preserves the API `gaps` field verbatim; it must not compute gaps locally.
- **default limit.** MCP should default *lower* than the API max to bound spend. Recommended MCP default: `260` (matching the API default) or a smaller reviewed value; the MCP default must never exceed the API default silently.
- **max limit.** MCP hard cap should be **≤ API max of `2600`**, and ideally lower by MCP policy (a reviewed first cap such as `520` weekly observations, or `2600` only with explicit review). The adapter must reject a requested `limit` above its own cap locally, before preflight.
- **date validation.** Local format and ordering validation (`YYYY-MM-DD`, `end >= start`, no future dates) runs before preflight and before any paid call. No unbounded historical export; no multi-symbol export.
- **output wrapper.** Per §11. `api_data` preserves the API envelope verbatim (`request_id`, `symbol_exchange`, `start`, `end`, `count`, `data`, `include_gaps`, `gaps`), where each `data` row carries the same ST-IM distribution fields as latest plus `symbol_exchange`.
- **authority limitations.** Same as §5: not authoritative for advice, payment, or future performance.
- **error taxonomy.** Per §12, preserving API status semantics including `400` symbol/exchange/date errors, `404`, and `500 db_query_failed`.
- **paid authorization behavior.** Same registration and boundary rules as §5.
- **preflight behavior.** Mandatory internal preflight before any call, resolving pricing rule `stim_history_paid`; deterministic denial on any gate failure.
- **budget/cap behavior.** Per-session, per-tool, STC, and USD caps apply. Because history has a larger row/cost surface, the row cap and budget caps are the primary spend controls and must be enforced before the call.

**Nothing is deferred between latest and history.** The only thing gated is *real paid execution of both*, which stays behind the hard build gate until the branch in §14 completes and a subsequent reviewed branch flips execution on.

## 7. Preflight model

The mandatory preflight sequence before any paid ST-IM call. Every step must pass, in order; any failure is a deterministic denial and **no `X-API-Key` (or any auth header) is constructed until all gates pass**.

1. **Explicit paid tools enabled flag.** `STOCKTRENDS_ENABLE_PAID_TOOLS=true`. If false/absent → deny (`paid_tools_disabled`), no paid tools registered.
2. **API key present only when paid mode enabled.** `STOCKTRENDS_API_KEY` is read only under paid mode. Missing/blank key under paid mode → `blocked_missing_api_key`, fail closed. API key alone never enables paid behavior.
3. **Approved host validation.** Target origin must exactly match the validated `STOCKTRENDS_API_BASE_URL` (HTTPS only, exact origin, no URL credentials, no fragments, no redirect/user/model/payload-supplied hosts).
4. **Static endpoint allowlist.** Exact `path` + `method` must match static paid policy metadata (`GET /v1/stim/latest`, `GET /v1/stim/history`). Canonical path+method matching, not substring.
5. **Static tool allowlist.** Tool name must map to that endpoint policy entry (`stocktrends_get_stim_latest` → `/v1/stim/latest`; `stocktrends_get_stim_history` → `/v1/stim/history`).
6. **Input validation before preflight.** Schema validation, symbol precedence, exchange membership, and history date/limit bounds must already have passed before cost is determined.
7. **Cost estimate / workflow planning evidence where applicable.** Determine cost from an API-authoritative source. For standalone endpoint calls this is the static pricing rule (`stim_latest_paid` / `stim_history_paid`) resolved through the pricing/preflight foundation; workflow-level `GET /v1/cost-estimate` evidence may be attached as advisory context but is not the endpoint-level authority (see §8).
8. **Local policy decision.** The preflight evaluator returns an authoritative cost, a source, a decision, and a denial reason if any. Missing, non-authoritative, malformed, stale, ambiguous, or rule-id-less cost → deny.
9. **Per-session cap.** Projected per-session paid calls must not exceed the configured cap (default `0` → deny until configured).
10. **Per-tool cap.** Projected per-tool paid calls must not exceed the configured cap (default `0` → deny until configured).
11. **STC budget cap if applicable.** A nonzero STC estimate is denied when `STOCKTRENDS_MAX_STC_PER_SESSION` is unset or would be exceeded.
12. **USD budget cap if applicable.** A nonzero USD estimate is denied when `STOCKTRENDS_MAX_USD_PER_SESSION` is unset or would be exceeded.
13. **No automatic paid retries.** No paid call is retried automatically, and no alternate paid endpoint is used as fallback.
14. **Deterministic denial if any gate fails.** Denials are structured, secret-free, and never downgrade to public data.
15. **No auth header constructed until all gates pass.** Auth construction lives only inside the coupled boundary, after 1–14 succeed and the hard paid-execution build gate is enabled.

Preserved: `GET /v1/cost-estimate` helps with workflow-level budgeting/planning but does not authorize paid execution by itself.

## 8. Relationship to `stocktrends_estimate_workflow_cost`

`stocktrends_estimate_workflow_cost` is the merged public/free planning tool over workflow-level `GET /v1/cost-estimate`. Its relationship to the future paid ST-IM tools:

- **Do not require the client/model to call the planning tool first.** Preflight must be *internal* and non-skippable, inside the paid-execution boundary, so a client or model cannot bypass it. A visible planning tool that could be skipped must never be the authorization path.
- **Do not internally call `/v1/cost-estimate` as the endpoint-level authorization for the first implementation.** It is workflow-level and takes caller-supplied `quota_remaining`; it does not return a caller-specific, endpoint-level authorization decision for a standalone `stim/latest` or `stim/history` call.
- **Optionally accept a prior estimate object as advisory context only.** A tool may accept an optional, caller-supplied normalized estimate to echo into wrapper metadata for transparency. It must never be treated as authorization or as a substitute for internal preflight.
- **Use local static cost policy for the first implementation.** Authorization derives from the internal pricing/preflight foundation resolving the static pricing rule for the exact endpoint (`stim_latest_paid` / `stim_history_paid`) plus local caps and the explicit paid-enablement/host/allowlist gates.
- **Combined stance.** Internal static-policy preflight is authoritative; `/v1/cost-estimate` (via the public planning tool or an optional advisory estimate object) is planning evidence only.

**On `workflow_id=stim_forecast_review` sufficiency:** it is **not** sufficient to authorize standalone paid `stim/latest` or `stim/history` execution. `stim_forecast_review` is a broader workflow that bundles public methodology steps, ST-IM latest, indicators latest, prices latest, and optional history steps; its total does not equal the cost of one standalone endpoint call. For the first paid ST-IM tools, **exact endpoint-level cost metadata from pricing policy (`stim_latest_paid`, `stim_history_paid`) is required**, not the workflow-level estimate. Do not overclaim endpoint-level authorization from a workflow-level estimate.

## 9. Pricing and cost authority

Four distinct concepts, kept strictly separate:

| Source | Role | Required for subscription/API-key execution? |
| --- | --- | --- |
| `GET /v1/pricing/catalog` | Catalog/metadata: `pricing_rule_id`, `endpoint_pattern`, `cost_per_request`, `stc_cost`, `estimated_usd_cost`, `requires_subscription`, `requires_payment`, `supported_rails`. | **Required as the endpoint cost source**, consumed through the internal pricing/preflight foundation tied to exact rule IDs. Not by itself an execution authorization (it does not check the caller's entitlement/quota/balance immediately before the call). |
| `GET /v1/cost-estimate` | Workflow-level budgeting/planning. | **Not required** and not sufficient for endpoint-level authorization. Optional advisory planning evidence only. |
| Local MCP policy | Local authorization gate: explicit paid enablement, API-key behavior, endpoint/host allowlist, static pricing/preflight decision, per-session/per-tool/STC/USD caps, no-retry, hard build gate. | **Required.** This is the authorization gate. |
| Actual paid API response headers | Observed cost evidence *after* an authorized execution (e.g., pricing rule / cost / request id if returned). | Recorded in the wrapper when returned; not a pre-authorization input. |
| x402 `402` challenge amount | Future payment-specific verification. | **Deferred.** Not used; if a `402` is returned it is surfaced as safe metadata only and never acted on. |

For subscription/API-key ST-IM execution, the required set is: **pricing-catalog-derived static rule cost (via the preflight foundation) + local MCP policy authorization**. Everything else is advisory, post-hoc, or deferred.

## 10. API-key paid execution model

The first paid ST-IM tools use subscription/API-key auth only. Constraints:

- **API key is read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.** Under any other state the key is not read into paid config.
- **API key alone does not enable paid tools.** A key without the paid flag (and without local policy allowing registration) registers nothing and sends nothing.
- **Public resources and the public planning tool never send the API key.** They use only `Accept: application/json` and `User-Agent: stocktrends-mcp-server/1.0`.
- **Paid ST-IM tools may send `X-API-Key` only after all gates pass.** The header value is the raw API key in `X-API-Key` (the API's preferred programmatic header; `extract_api_key` reads `x-api-key` first, then `Authorization: Bearer`). It is constructed only inside the coupled paid-execution boundary, only for the approved origin and allowlisted endpoint.
- **Bearer fallback remains deferred.** The API accepts `Authorization: Bearer <key>` as a fallback, but MCP should send only `X-API-Key` for the first implementation unless a reviewed reason requires bearer. Fewer credential-bearing code paths is safer.
- **Errors/logs never expose the key.** Redaction covers API-key, auth-header, payment-header, wallet-like, and environment-like text in logs, errors, snapshots, and returned data.
- **No auth header is constructed for a non-allowlisted endpoint**, and **no auth header is constructed before preflight succeeds.** The hard paid-execution build gate (`PHASE4_PAID_EXECUTION_ENABLED` / `paidCallsAuthorizedInThisBuild`) must be enabled before any real send; while it is off, no runtime path can construct or send `X-API-Key`.

## 11. Tool output wrapper for paid ST-IM

Both paid ST-IM tools return a wrapper that preserves the API as the authority and separates API payload from MCP metadata. Required fields:

- `mcp_metadata.tool_name` — e.g. `stocktrends_get_stim_latest`.
- `mcp_metadata.endpoint_path` — e.g. `/v1/stim/latest`.
- `mcp_metadata.http_method` — `GET`.
- `mcp_metadata.symbol_identity` — resolved `symbol`, `exchange`, and canonical `symbol_exchange` actually requested.
- `mcp_metadata.request_parameters` — the validated inputs forwarded (for history: `start`, `end`, `limit`, `include_gaps` when supplied).
- `mcp_metadata.preflight_decision_summary` — endpoint/host/tool allowlist results, pricing rule id, pricing source, estimated cost + unit, and the local authorization decision.
- `mcp_metadata.local_budget_cap_status` — per-session, per-tool, STC, and USD cap state at execution time.
- `api_data` — the API response data, preserved verbatim.
- `mcp_metadata.request_id` — upstream request id if returned (the API returns `request_id`).
- `mcp_metadata.pricing_rule` — pricing rule id if returned/known (`stim_latest_paid` / `stim_history_paid`).
- `mcp_metadata.observed_cost` — actual cost from response metadata/headers if returned; otherwise `null`.
- `mcp_metadata.payment_status` — payment/settlement status if surfaced (e.g., a safe `402` summary); otherwise `null`.
- `mcp_metadata.source` — `stocktrends_api`.
- `mcp_metadata.authoritative_for` — `"ST-IM API data returned by Stock Trends API"`.
- `mcp_metadata.not_authoritative_for` — `["investment advice", "payment authorization", "future performance guarantee"]`.
- `mcp_metadata.fetched_at` — ISO-8601 timestamp captured at response time.
- `mcp_metadata.paid_execution_authorized` — `true` only if an actual paid execution occurred through the approved gate; otherwise `false`.
- `mcp_metadata.warnings` / `mcp_metadata.limitations` — including, for latest, the point-in-time/limitation note recommending history for context.

Rules: preserve API-authored JSON; never rewrite output into advice or buy/sell/hold/allocation language; never make an MCP-authored summary the primary output; never hide provenance; never include secrets; never downgrade a paid error into a public-data summary.

## 12. Error taxonomy

Deterministic, fail-closed, secret-free errors. No error implies paid execution occurred unless it did.

| Condition | Deterministic error |
| --- | --- |
| Paid tools disabled | `paid_tools_disabled` |
| API key missing (paid mode on) | `paid_auth_blocked_missing_api_key` |
| Invalid input (schema, symbol precedence, exchange membership, date format/order, limit bounds) | `invalid_tool_input` (Zod/local, before any network) |
| Endpoint not allowlisted | `endpoint_not_allowlisted` |
| Host not approved | `host_not_approved` |
| Pricing/preflight unavailable | `pricing_preflight_unavailable` |
| Cost estimate unavailable (when required) | `cost_estimate_unavailable` |
| Estimate mismatch (rule id / scope / workflow mismatch) | `cost_estimate_mismatch` |
| Cap exceeded (session/tool/STC/USD) | `spend_cap_exceeded` |
| Unsupported unit/currency | `unsupported_cost_unit` |
| API request failed (network/timeout) | `public_api_network_failure` / `public_api_timeout` |
| Malformed API response | `malformed_api_response` |
| Paid execution denied (hard build gate off, or any gate denies) | `paid_execution_denied` (includes `paid_execution_disabled` for the build gate) |
| Unexpected auth attempt (auth would be built for a non-allowlisted endpoint/host or before preflight) | `unexpected_auth_attempt` (must be impossible by construction; test-enforced) |
| Paid execution response missing required metadata (if required by policy) | `paid_response_missing_required_metadata` |

Upstream HTTP statuses map 1:1 and preserve API semantics: `400` (API symbol/exchange/date errors) → `invalid_upstream_request`; `401` → `public_api_auth_required` (no retry, no header switch, no downgrade); `402` → `public_api_payment_required` (surface safe metadata; do not sign/pay/retry/x402); `403` → `public_api_forbidden`; `404` → `public_api_not_found` (including `stim_not_found`; do not invent endpoints); `429` → `public_api_rate_limited` (safe retry-after metadata; no automatic retry); `5xx` → `public_api_unexpected_status` / upstream failure (including `db_query_failed`; fail closed on charge ambiguity).

No error may include API keys, bearer tokens, auth/payment headers, wallet data, full request headers, environment dumps, or raw exception text containing secrets.

## 13. Tests required for future implementation

All tests use mocks/local fixtures. No production paid calls, no real API keys, no x402/payment, no DB. Required coverage:

- Tool count matches the approved surface (e.g., planning tool + the two paired ST-IM tools only when enabled).
- Prompt count remains zero.
- Public resources unchanged (same 9 URIs/endpoints).
- Public resources still credential-free (no auth/payment headers).
- Public planning tool still credential-free.
- Paid tools unavailable when paid flag false.
- API key alone does not expose or enable paid tools (policy).
- Paid flag true without key fails closed (public resources still work).
- Paid flag true with key exposes only the approved paid ST-IM tools (and only when local policy + build gate allow).
- Invalid inputs fail before preflight/network (symbol precedence, exchange membership, date format/order, limit bounds, unknown keys, arrays/multi-symbol).
- Endpoint allowlist enforced (auth construction fails for non-allowlisted paths).
- Host allowlist enforced (auth construction fails for non-approved hosts).
- No auth before preflight success.
- No auth for non-allowlisted endpoints.
- Preflight missing/failed blocks execution.
- Cost over cap blocks.
- Per-session cap blocks.
- Per-tool cap blocks.
- No automatic retries (exactly one attempt; no fallback paid endpoint).
- Successful mock paid call sends `X-API-Key` only to the approved origin + allowlisted endpoint.
- Public calls never send `X-API-Key`.
- API errors deterministic (`401`/`402`/`403`/`404`/`429`/`5xx`, and API `400`).
- Malformed response deterministic.
- Secret redaction (keys, tokens, auth/payment headers, wallet-like, env-like text) in logs/errors/snapshots/returned data.
- No x402/wallet/OAuth/remote/DB/control-plane behavior.
- ST-IM tools are not registered as public resources.
- No dynamic registration from `/v1/ai/tools` or `/v1/workflows`.
- Latest/history pairing enforced: `stocktrends_get_stim_latest` unavailable unless `stocktrends_get_stim_history` is registered with equivalent controls.
- Output wrapper separates `api_data` from `mcp_metadata`, includes provenance, and sets `paid_execution_authorized` correctly (true only on actual authorized execution; false otherwise).

## 14. Implementation sequencing decision

Options considered:

- `implementation/phase4-stim-latest-paid-tool` — rejected: ships latest execution, violates history-beside-latest.
- `implementation/phase4-stim-paid-tools-subscription` — premature: flips real paid execution on before the paired tool machinery has been built and mock-validated behind the gate.
- `architecture/phase4-stim-history-contract-tightening` — unnecessary: the history contract (`start`/`end` inclusive, `limit` default `260`/max `2600`, `include_gaps` default `false`, response envelope) is already confirmed; MCP-side caps are a policy choice, not an open contract question.
- **`implementation/phase4-paid-stim-foundation-no-execution` — recommended (safest forward step).**

**Recommendation: `implementation/phase4-paid-stim-foundation-no-execution`.**

Scope (narrow):

- Register the paired paid ST-IM tools `stocktrends_get_stim_latest` and `stocktrends_get_stim_history` behind explicit paid enablement **only in a gated/test configuration**, wired to the internal pricing/preflight foundation, endpoint/host allowlist, coupled auth boundary, spend caps, and the output wrapper.
- Keep the **hard paid-execution build gate OFF** so no real `X-API-Key` is ever sent; every "paid" path terminates in `paid_execution_disabled` for real endpoints.
- Resolve static pricing rules `stim_latest_paid` / `stim_history_paid` through the preflight foundation from catalog/fixture data.
- Enforce the full latest/history pairing rule and all §13 tests with mocks/fixtures.
- No paid endpoint calls, no real keys, no x402/wallet/OAuth/remote/DB/control-plane, no prompts, no dynamic registration. Public resources and the public planning tool unchanged.

This delivers the entire paired paid ST-IM surface and its gates, fully mock-tested, without turning execution on. A subsequent, separately reviewed branch (e.g. `implementation/phase4-stim-paid-tools-subscription`) then flips the hard gate and adds explicitly authorized live validation.

## 15. Known limitations

- x402 deferred.
- Wallet handling deferred.
- Remote MCP deferred.
- Endpoint-level cost estimate remains reliant on `/v1/pricing/catalog` static rule IDs; `/v1/cost-estimate` is workflow-level only and does not authorize endpoint-level execution. If catalog rule IDs drift or are missing, the tools must fail closed.
- Actual payment-challenge (`402`) amount comparison is deferred to a future x402/payment branch.
- Investment-advice boundaries remain: no buy/sell/hold/allocation/risk conclusions are generated.
- Paid response metadata requirements (which fields, if any, are *required* in the wrapper vs. best-effort) may require confirmation before the execution branch enforces `paid_response_missing_required_metadata`.
- Live API validation is not part of implementation tests unless explicitly authorized; all tests use mocks/fixtures.

## 16. Decision

- **Paid ST-IM live execution is NOT approved for the next branch.** It remains blocked behind the hard paid-execution build gate.
- **The paired paid ST-IM tool foundation (registration, preflight wiring, allowlist coupling, caps, wrapper, mock tests) IS approved for the next branch**, under these limits: no real paid endpoint calls, no real API keys, hard execution gate off, both tools paired (never latest-only), MCP history caps ≤ API max, credential-free public surface unchanged, zero prompts, no x402/wallet/OAuth/remote/DB/control-plane, no dynamic registration.
- The first *live* paid execution requires a separate, explicitly reviewed branch after this foundation is validated.

## 17. Recommended next branch

```text
implementation/phase4-paid-stim-foundation-no-execution
```

---

### Appendix A — Confirmed ST-IM facts (verified read-only against `<private-stocktrends-api>`)

Verified directly in this task (not only inherited):

- `GET /v1/stim/latest` and `GET /v1/stim/history` — router prefix `/stim` mounted under `/v1` (`routers/stim.py`).
- Symbol precedence: `symbol_exchange` parsed via `parse_symbol_exchange` and wins if present; otherwise both `symbol` and `exchange` required (`_resolve_symbol_exchange`).
- Exchange normalized uppercase; must be in `VALID_EXCHANGES`; documented codes `N`, `Q`, `A`, `B`, `T`, `I`; invalid exchange → `400`.
- Latest errors: `404 stim_not_found`; `500 db_query_failed`. Identity errors: `400 invalid_symbol_exchange`, `400 missing_required_param`.
- History params: `start`/`end` inclusive `YYYY-MM-DD`; `limit` = `Query(default=260, ge=1, le=2600)`; `include_gaps` boolean default `false`.
- History response envelope: `request_id`, `symbol_exchange`, `start`, `end`, `count`, `data` (ascending by `weekdate`), `include_gaps`, `gaps`.
- Latest response fields: `weekdate`, `exchange`, `symbol`, `x4wk1/x4wk2/x4wk/x4wksd`, `x13wk1/x13wk2/x13wk/x13wksd`, `x40wk1/x40wk2/x40wk/x40wksd`, `symbol_exchange`, `request_id`, `latest_data_weekdate`, `is_stale`, `missing_reason`, `missing_weekdate`.
- Auth header extraction: `x-api-key` preferred, `Authorization: Bearer` fallback (`middleware/api_key.py: extract_api_key`).
- Pricing rules: `stim_latest_paid`, `stim_history_paid` (inherited from the confirmed API contract memo).
- API-key subscription access can execute without x402 (inherited from the confirmed API contract memo).
