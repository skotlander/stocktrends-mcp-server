# Phase 4 Cost Estimate Planning Tool Validation Report

## 1. Purpose

This report records validation of the first implemented MCP tool for the Stock Trends MCP Server: `stocktrends_estimate_workflow_cost`.

The tool was designed in [`docs/PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md`](PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md), implemented per [`docs/PHASE4_COST_ESTIMATE_PLANNING_TOOL_IMPLEMENTATION_NOTES.md`](PHASE4_COST_ESTIMATE_PLANNING_TOOL_IMPLEMENTATION_NOTES.md), and merged to `main`. This report is documentation only. It does not implement runtime code, modify `src/`, modify `tests/`, modify `package.json`, call endpoints, use API keys, inspect secrets, test x402 payments, add wallet handling, add OAuth, add remote MCP transport, add database access, or add control-plane access.

## 2. Validated Architecture Boundary

The controlling authority boundary remains unchanged by this tool:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

`stocktrends_estimate_workflow_cost` is implemented as a thin pass-through over `GET /v1/cost-estimate`. Reading [`src/tools/index.ts`](../src/tools/index.ts), the handler forwards a validated query, preserves the API response verbatim under `api_data`, and adds only local metadata (`mcp_metadata`) that annotates provenance and planning status. Validation confirms the tool does not become:

- a direct database client (no database driver, connection string, or query code exists anywhere in `src/`);
- a control-plane client (no control-plane endpoint is called or referenced);
- a pricing authority (STC/USD totals are read from the API response, not computed locally; the only local numeric work is inequality comparison against a caller-supplied budget);
- a payment authority (`paid_execution_authorized` and `payment_authorized` are hardcoded `false` in every response and error path);
- a paid execution engine (no paid endpoint is ever called; `PAID_RUNTIME_TOOL_DEFINITIONS` is a frozen empty array);
- an API recomputation layer (workflow totals, step costs, and rail assignment are taken as-is from the API `api_data` payload);
- an Intelligence Agent recomputation layer (the tool never touches ST-IM, indicator, price, selection, or research data); or
- a parallel reasoning engine (no local pricing rules, workflow logic, or entitlement logic is implemented; unrecognized or malformed API shapes fail closed instead of being inferred or reconstructed locally).

## 3. Current Merged MCP Surface

Confirmed directly from [`src/server.ts`](../src/server.ts), [`src/resources/index.ts`](../src/resources/index.ts), and [`src/tools/index.ts`](../src/tools/index.ts):

- **Transport**: local stdio only. `parseConfig` in [`src/config.ts`](../src/config.ts) throws `unsupported_transport` for any value other than `stdio`.
- **Public resources**: 9, registered by `registerPublicResources` from the static `PUBLIC_RESOURCES` array. Unchanged from Phase 2/3.
- **MCP tools**: exactly 1. `registerPublicPlanningTools` registers only `COST_ESTIMATE_TOOL_NAME`. `PAID_RUNTIME_TOOL_DEFINITIONS` is `readonly []`.
- **Tool name**: `stocktrends_estimate_workflow_cost`.
- **MCP prompts**: 0. `MCP_PROMPT_DEFINITIONS` is `readonly []`, and `server.ts` never calls a prompt-registration function.
- **Paid ST-IM tools**: none. No `stocktrends_get_stim_latest` or `stocktrends_get_stim_history` tool exists.
- **Dynamic registration**: none. No code path calls `/v1/ai/tools` or `/v1/workflows` at startup or registers MCP primitives from their responses; `stocktrends://ai/tools` and `stocktrends://workflows` remain static, fetch-on-request resources with fixed URIs.

Test [`tests/costEstimateTool.test.ts:34-59`](../tests/costEstimateTool.test.ts) asserts this surface directly: exactly 1 tool named `stocktrends_estimate_workflow_cost`, `PAID_RUNTIME_TOOL_DEFINITIONS` equal to `[]`, server capabilities reporting no `prompts` capability, and the resource list equal to the 9 expected URIs — all without any fetch call occurring during registration.

## 4. Tool Contract Validation

The Zod input schema in [`src/tools/index.ts:41-49`](../src/tools/index.ts) is `.strict()` and validated as follows:

| Input | Required | Validated behavior |
| --- | --- | --- |
| `workflow_id` | Yes | Static enum: `regime_analysis`, `symbol_decision`, `stim_forecast_review`, `portfolio_build`, `portfolio_compare_review`. Any other value fails schema validation before the handler runs. |
| `rail_preference` | No | Static enum: `subscription`, `x402`, `mpp`, `auto`. Omitted input is reported in output as effective `auto`; invalid values fail schema validation. |
| `quota_remaining` | No | `z.number().finite().int().nonnegative()`. Negative, non-integer, or non-finite values fail schema validation. |
| `max_budget_usd` | No | `z.number().finite().nonnegative()`. Negative or non-finite values fail schema validation. |
| `max_budget_stc` | No | `z.number().finite().nonnegative()`. Negative or non-finite values fail schema validation. |

Because the schema is `.strict()`, any unrecognized key is rejected by Zod at parse time, before the tool handler executes.

Test coverage in `costEstimateTool.test.ts` confirms fail-closed behavior before any network activity:

- `it.each(COST_ESTIMATE_WORKFLOW_IDS)` (lines 61-78) confirms each valid `workflow_id` is accepted and triggers exactly one fetch.
- "rejects unknown `workflow_id` before any API call" (lines 80-98) confirms `fetchFn` is never called for an invalid value.
- `it.each(COST_ESTIMATE_RAIL_PREFERENCES)` (lines 100-118) confirms each valid `rail_preference` is accepted and forwarded.
- A parameterized case (lines 120-139) confirms invalid `rail_preference`, negative `quota_remaining`, negative `max_budget_usd`, and negative `max_budget_stc` are all rejected with `fetchFn` never called.
- "rejects unknown extra input keys before any API call or paid behavior" (lines 141-163) confirms `.strict()` schema rejection and that the error text contains neither `authorization` nor `payment-signature`.

This directly satisfies the requirement that invalid inputs fail before any network or client call.

## 5. Public API Call Behavior

Confirmed from [`src/tools/index.ts`](../src/tools/index.ts) and [`src/stocktrendsClient.ts`](../src/stocktrendsClient.ts):

- The tool calls only `GET /v1/cost-estimate` (`COST_ESTIMATE_ENDPOINT_PATH`), via `buildCostEstimateEndpointPath`, which appends only `workflow_id` and, when supplied, `rail_preference` and `quota_remaining` as query parameters. `max_budget_usd` and `max_budget_stc` are never added to the query string.
- The call is routed through the same `StockTrendsClient.fetchJson` public client path used by all public resources — there is no separate paid or authenticated client code path.
- The fixed request headers sent by `StockTrendsClient.fetchJson` are only `Accept: application/json` and `User-Agent: stocktrends-mcp-server/1.0` ([`src/stocktrendsClient.ts:63-71`](../src/stocktrendsClient.ts)). No `Authorization`, `X-API-Key`, or payment header is ever constructed anywhere in the client.
- `STOCKTRENDS_API_KEY` is never read by the tool handler or the client's `fetchJson` method; it is only read by `parsePaidToolsConfig` in `config.ts` to populate an unused `PaidToolsConfig` object.
- Tool availability and behavior do not branch on `STOCKTRENDS_ENABLE_PAID_TOOLS`. `server.ts` calls `registerPublicPlanningTools` unconditionally.
- No paid endpoint is called; no `/v1/pricing/catalog` call occurs (the pricing catalog is a separate, unrelated public resource); no `/v1/workflows` call occurs automatically; no x402, wallet, or OAuth code exists in the tool or client.

Test "calls GET /v1/cost-estimate through the public client path with only supplied query parameters and no auth headers" (lines 165-206) directly asserts the pathname, query parameters, fixed headers, and absence of `authorization`, `api-key`, and `secret` substrings in the request headers — even when `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and an API key is configured. Test "omits `rail_preference` and `quota_remaining` when they are not supplied" (lines 208-227) confirms the effective-`auto` default behavior.

## 6. Output Wrapper Validation

Confirmed from `handleCostEstimateTool` ([`src/tools/index.ts:124-193`](../src/tools/index.ts)) and test "wraps the API estimate with source, authority limits, fetched_at, steps, notes, and execution authorization set false" (lines 229-282), the output wrapper includes:

- `mcp_metadata.tool_name`: `stocktrends_estimate_workflow_cost`.
- `mcp_metadata.endpoint_path`: `/v1/cost-estimate`.
- `mcp_metadata.http_method`: `GET`.
- `mcp_metadata.workflow_id` (requested) and `mcp_metadata.api_workflow_id` (API-confirmed).
- `mcp_metadata.rail_preference` (effective, defaulting to `auto`).
- `mcp_metadata.quota_remaining` when supplied, plus `quota_remaining_is_caller_supplied` and `quota.verified_by_mcp: false`.
- `mcp_metadata.source`: `cost_estimate`.
- `mcp_metadata.fetched_at`: ISO-8601 timestamp captured at response time.
- `api_data`: the API estimate response, preserved verbatim (`workflow_id`, `rail`, `total_stc_cost`, `total_usd_cost`, `quota_remaining_supplied`, `quota_sufficient`, `steps`, `notes`).
- `mcp_metadata` normalized fields: `estimated_total.stc` / `estimated_total.usd`, `step_estimates`, `notes`.
- `mcp_metadata.authoritative_for`: `["workflow-level budgeting/planning"]`.
- `mcp_metadata.not_authoritative_for`: `["paid execution authorization", "payment authorization", "endpoint-level pricing authorization unless API explicitly provides it"]`.
- `mcp_metadata.paid_execution_authorized`: `false` (always).
- `mcp_metadata.payment_authorized`: `false` (always).
- `mcp_metadata.future_payment_challenge_amount_known`: `false`, and `future_payment_challenge_amount`: `null`.
- `mcp_metadata.local_budget_comparison`: present in every response (an explicit `not_evaluated` object when no budget is supplied, matching the memo's `local_budget_comparison` field-always-present design).
- `mcp_metadata.warnings` and `mcp_metadata.limitations`: distinguishing API estimate evidence from local planning comparison and from unknown future payment challenge amounts (e.g., "Cost estimate is workflow-level planning evidence only and does not authorize paid execution.").

This matches the output contract proposed in the integration memo and confirmed in the implementation notes.

## 7. Budget Comparison Validation

Confirmed from `compareLocalBudgets` ([`src/tools/index.ts:308-343`](../src/tools/index.ts)):

- `max_budget_usd` is compared only against `api_data.total_usd_cost`, and only when the API-reported currency is `USD` (or unlabeled, which normalizes to `USD`). If the API reports a non-`USD` currency (e.g., `USDC`), the comparison is not attempted and `usd_within_budget` is `null` — no FX conversion is performed.
- `max_budget_stc` is compared only against `api_data.total_stc_cost`, in STC units only. No STC/USD/USDC conversion is attempted for the STC comparison either.
- Planning statuses returned in `mcp_metadata.local_budget_comparison.planning_status`:
  - `not_evaluated`: no `max_budget_usd` or `max_budget_stc` was supplied.
  - `within_budget`: all supplied comparisons are within budget. `paid_execution_authorized` remains `false` in the comparison object itself.
  - `over_budget`: at least one supplied comparison exceeds budget. No paid endpoint is called as a result.
  - `unable_to_compare`: a supplied budget's unit/currency could not be safely compared (e.g., `max_budget_usd` supplied against a non-USD API currency).
- Test "returns within-budget local planning status without authorizing execution" (lines 284-311) and "returns over-budget local planning warning without attempting paid execution" (lines 313-340) confirm both statuses never set `paid_execution_authorized` to anything but `false`, and confirm exactly one fetch call occurs regardless of the planning outcome — no retry or escalation to a paid path.
- Test "reports unable-to-compare when the dollar-side response unit is not supported for local USD comparison" (lines 342-366) confirms the `unable_to_compare` fail-closed path for currency mismatch, with a warning containing "Unable to compare" and no conversion attempted.
- Missing estimated totals needed for comparison are handled by `readRequiredNumber`, which raises `missing_estimated_total` specifically when the missing/invalid field was needed for a caller-requested budget comparison (see Section 8), producing a deterministic tool error rather than a silent `unable_to_compare` result.

## 8. Error Behavior Validation

Confirmed from `mapCostEstimateToolError`, `CostEstimatePlanningError`, and the client error mapping in [`src/errors.ts`](../src/errors.ts):

| Condition | Error code | Mechanism |
| --- | --- | --- |
| Invalid `workflow_id` | Zod schema rejection ("Invalid arguments") | Fails before handler execution; no fetch. |
| Invalid `rail_preference` | Zod schema rejection | Fails before handler execution; no fetch. |
| Invalid `quota_remaining` / budget values | Zod schema rejection | Fails before handler execution; no fetch. |
| Unknown extra input key | Zod `.strict()` rejection | Fails before handler execution; no fetch. |
| Public API network failure | `public_api_network_failure` | Caught in `handleCostEstimateTool`; non-`StockTrendsMcpError`/non-planning errors map here. |
| Timeout | `public_api_timeout` | Mapped from client `timeout` error code (10s `AbortController` timeout in `StockTrendsClient`). |
| Malformed cost-estimate response (non-JSON, non-object body, or missing required string/rail/array fields) | `malformed_cost_estimate_response` | Raised by `normalizeCostEstimateResponse`, `readRequiredString`, `readRequiredArray`, or mapped from client `malformed_api_response`. |
| Missing estimated total needed for a requested budget comparison | `missing_estimated_total` | Raised by `readRequiredNumber` specifically when `max_budget_usd`/`max_budget_stc` was supplied and the corresponding total field is missing/invalid. |
| Unsupported unit/currency for comparison | `unsupported_budget_comparison_unit` | Raised by `readOptionalCurrency`/`readOptionalStcUnit` when the API reports a currency/unit outside the supported set. |
| Upstream 401/402/403/404/429/5xx/unexpected status | `public_api_auth_required` / `public_api_payment_required` / `public_api_forbidden` / `public_api_not_found` / `public_api_rate_limited` / `public_api_unexpected_status` | Mapped 1:1 from `StockTrendsMcpError` codes produced by `errorFromHttpStatus`. |

Test "returns deterministic network, malformed, missing-total, and unsupported-unit failures" (lines 368-405) exercises `public_api_network_failure`, two distinct `malformed_cost_estimate_response` paths (non-JSON-object body and unparseable JSON text), `missing_estimated_total` (triggered only when `max_budget_usd` was requested against a response missing `total_usd_cost`), and `unsupported_budget_comparison_unit` (triggered only when `max_budget_stc` was requested against a response with an unsupported `unit`) — confirming the taxonomy is precise rather than collapsing distinct failure modes into one generic code.

Every error path is verified to:

- never leak secrets: the shared `expectToolError` helper (lines 466-500) asserts `JSON.stringify(body)` never contains `secret`, and that outgoing request headers (when a request was made) never contain `authorization`, `api-key`, or `payment`;
- never imply paid execution occurred: every error response includes top-level `paid_execution_authorized: false` and `payment_authorized: false` (`toolError`, lines 394-411); and
- never call a paid or unrelated endpoint even on failure: when a request occurred, its pathname is asserted to equal `/v1/cost-estimate` and to differ from `/v1/pricing/catalog` and `/v1/workflows`.

## 9. Environment Matrix Validation

Confirmed via the `PAID_ENV_MATRIX`-driven test ("is available in environment mode... and never calls paid, pricing, workflow-registration, x402, wallet, OAuth, DB, or control-plane paths", lines 407-434), which runs the tool under all five environment states and asserts identical safe behavior in each:

| Environment | Tool available | API key sent | Paid/pricing/workflow-registration/x402/wallet/OAuth/DB/control-plane behavior observed |
| --- | --- | --- | --- |
| No env vars | Yes | No | None |
| `STOCKTRENDS_API_KEY` present only | Yes | No | None |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=false` | Yes | No | None |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true` (no key) | Yes | No | None |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true` with mock key | Yes | No | None |

For each of the five states, the test calls the tool with `rail_preference: "x402"` (the most payment-adjacent input value) and asserts: exactly one fetch to `/v1/cost-estimate`; the fetched path is never `/v1/pricing/catalog` or `/v1/workflows` or `/v1/stim/*`; outgoing headers never contain `api-key`; and the serialized response never contains `oauth`, `database`, `control-plane`, `private_key`, or `payment-signature`. This confirms the planning tool remains public and credential-free across the full documented environment matrix, independent of paid-mode configuration.

## 10. Public Resource Safety

Confirmed unchanged in [`src/resources/index.ts`](../src/resources/index.ts) — all 9 public resources remain registered with identical URIs and backing endpoints:

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

`registerPublicResources` sends no `Authorization`, `X-API-Key`, or payment header (the resource handler uses the same `StockTrendsClient.fetchJson` path documented in Section 5). Test `costEstimateTool.test.ts:34-59` cross-checks the live resource list against this exact URI set as part of validating the new tool's registration, confirming the addition of the planning tool did not alter public resource behavior.

## 11. Paid Surface Safety

Confirmed by direct source inspection and test assertions across `costEstimateTool.test.ts` and `phase3-paid-foundation.test.ts`/`phase4-pricing-preflight-foundation.test.ts`:

- No `stocktrends_get_stim_latest` tool exists.
- No `stocktrends_get_stim_history` tool exists.
- No paid MCP tools of any kind are registered (`PAID_RUNTIME_TOOL_DEFINITIONS` is a frozen empty array).
- No paid endpoint is ever called by the cost-estimate tool or any resource.
- No x402 code exists (no payment-challenge construction, no 402-response signing logic).
- No wallet handling exists (no private key material, no wallet address logic).
- No OAuth exists (no OAuth client, token exchange, or redirect flow).
- No remote MCP transport exists (`parseTransport` only accepts `stdio`).
- No database access exists (no database driver or connection code in `src/`).
- No control-plane access exists (no control-plane endpoint is referenced anywhere in `src/`).
- ST-IM latest/history remain static paid policy metadata only, scoped to the Phase 3/4 paid-policy foundation (`src/paidPolicy.ts`), which defines spend caps and endpoint allowlist data but registers no callable tool and performs no network I/O.

## 12. Automated Validation

The following validation commands were run as part of the implementation branch that introduced this tool and are recorded here for traceability:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 8 test files / 104 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed with normal CRLF working-copy warnings only |

This documentation-only branch does not modify `src/`, `tests/`, or `package.json`, so these commands were not re-run for this report. `git diff --check` was re-run against this documentation change (see Section "Validation" note in the accompanying task summary).

## 13. Known Limitations

- `stocktrends_estimate_workflow_cost` is workflow-level only; it is scoped to the five confirmed `workflow_id` values and does not provide arbitrary endpoint-level cost estimation.
- It is not arbitrary endpoint-level authorization for any MCP tool call.
- It is not paid execution authorization — `paid_execution_authorized` is always `false`.
- It is not payment authorization — `payment_authorized` is always `false`.
- No paid ST-IM tools (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, or any other paid tool) are implemented yet.
- No x402 flow is implemented; `rail_preference=x402` is accepted as a planning input only and triggers no payment behavior.
- No remote MCP transport is implemented; the server remains local stdio only.
- Live endpoint validation against the deployed Stock Trends API was not performed in the automated test suite; all tests use a mocked `fetchFn` and local fixtures.
- Actual `402` payment-challenge amount comparison against the cost-estimate remains future work, to be addressed only when a paid-tool execution path is designed.
- API-key subscription paid execution (calling a paid endpoint with `STOCKTRENDS_API_KEY`) remains future work; no such code path exists in this build.

## 14. Decision

The Phase 4 cost-estimate planning tool (`stocktrends_estimate_workflow_cost`) is **validated and complete**. It satisfies the architecture and safety requirements set out in [`docs/PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md`](PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md): it is public, free, credential-free, workflow-level-only, fail-closed on invalid input and malformed responses, and does not authorize paid execution or payment under any tested environment configuration. The MCP server's authority boundary, resource surface, and paid-tool boundary remain exactly as documented prior to this tool's implementation.

## 15. Recommended Next Step

Recommended next branch:

```text
architecture/phase4-first-paid-stim-tool-preflight-design
```

The next phase should be an architecture-and-design memo — not an implementation branch — that designs the first paid ST-IM MCP tool(s) using:

- the cost-estimate planning tool validated in this report as workflow-level evidence;
- the local pricing/preflight foundation from [`docs/PHASE4_PRICING_PREFLIGHT_FOUNDATION_IMPLEMENTATION_NOTES.md`](PHASE4_PRICING_PREFLIGHT_FOUNDATION_IMPLEMENTATION_NOTES.md) and [`docs/PHASE4_PRICING_PREFLIGHT_FOUNDATION_VALIDATION_REPORT.md`](PHASE4_PRICING_PREFLIGHT_FOUNDATION_VALIDATION_REPORT.md);
- the endpoint allowlist and approved-host validation established in the Phase 3 paid-auth foundation;
- explicit, reviewed API-key behavior for paid execution;
- local per-session, per-tool, STC, and USD caps; and
- execution-time authority boundaries that distinguish preflight estimate evidence from an actual payment challenge and from an authorized paid call.

Implementation of paid ST-IM tools should not proceed until that architecture memo is written and separately approved. This report does not itself approve, imply, or authorize any paid execution, payment, x402, wallet, OAuth, remote MCP, database, or control-plane work.
