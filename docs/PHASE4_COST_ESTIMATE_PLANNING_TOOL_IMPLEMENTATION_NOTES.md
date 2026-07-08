# Phase 4 Cost Estimate Planning Tool Implementation Notes

Implementation date: 2026-07-08

## Scope

This branch implements exactly one public/free MCP planning tool:

- `stocktrends_estimate_workflow_cost`

The tool calls the public `GET /v1/cost-estimate` endpoint through the existing Stock Trends public API client path. It is workflow-level planning only and does not authorize paid execution, payment, x402, wallet behavior, OAuth, remote MCP transport, database access, control-plane access, or dynamic registration.

## Input Contract

The tool input schema is strict:

| Input | Required | Behavior |
| --- | --- | --- |
| `workflow_id` | Yes | Static enum: `regime_analysis`, `symbol_decision`, `stim_forecast_review`, `portfolio_build`, `portfolio_compare_review`. |
| `rail_preference` | No | Static enum: `subscription`, `x402`, `mpp`, `auto`. Omitted input uses the API default/effective MCP default of `auto`. |
| `quota_remaining` | No | Non-negative integer. Sent to the API only when supplied and labeled as caller-supplied planning context. |
| `max_budget_usd` | No | Non-negative number for local MCP planning comparison only. Not sent to the API. |
| `max_budget_stc` | No | Non-negative number for local MCP planning comparison only. Not sent to the API. |

Unknown workflows, invalid rails, negative quota, and negative budgets fail closed before any API call.

## Output Contract

The tool returns a structured wrapper with:

- `api_data`: the preserved API-authored cost-estimate response.
- `mcp_metadata.tool_name`: `stocktrends_estimate_workflow_cost`.
- `mcp_metadata.source`: `cost_estimate`.
- `mcp_metadata.endpoint_path`: `/v1/cost-estimate`.
- `mcp_metadata.http_method`: `GET`.
- requested workflow, effective rail preference, API rail, supplied quota when present, upstream request id when present, and `fetched_at`.
- normalized totals for STC and USD-denominated fields when the API response is valid.
- step estimates and notes from the API response.
- `authoritative_for`: workflow-level budgeting/planning.
- `not_authoritative_for`: paid execution authorization, payment authorization, and endpoint-level pricing authorization unless the API explicitly provides it.
- `paid_execution_authorized=false`, `payment_authorized=false`, and `future_payment_challenge_amount_known=false`.
- warnings and limitations that distinguish API estimate evidence from MCP local planning comparison and future payment challenge amounts.

Malformed responses, mismatched workflow IDs, missing required totals, missing steps/notes, unsupported rails, and unsupported budget-comparison units return deterministic tool errors without paid execution.

## Budget Comparison Behavior

`max_budget_usd` compares only against the API `total_usd_cost` field when the response is USD-labeled or unlabeled. No STC-to-USD conversion is attempted.

`max_budget_stc` compares only against the API `total_stc_cost` field. This is safe because the existing Phase 4 paid policy already models STC-denominated caps.

Budget results are planning statuses only:

- `within_budget`: estimate is within caller-provided local planning budget, but paid execution is still not authorized.
- `over_budget`: estimate exceeds at least one caller-provided local planning budget; no paid endpoint is called.
- `unable_to_compare`: units/currency are not safe for local comparison; no conversion is attempted.
- `not_evaluated`: no local budget was supplied.

## Public And Auth Behavior

`stocktrends_estimate_workflow_cost` is public/non-metered planning behavior. It:

- sends no `Authorization` header.
- sends no `X-API-Key` header.
- sends no secret, payment, or wallet header.
- does not require `STOCKTRENDS_API_KEY`.
- is available regardless of `STOCKTRENDS_ENABLE_PAID_TOOLS`.
- ignores API-key configuration for its public request path.

## Unchanged Public Resources

The existing 9 public resources remain unchanged:

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

Public resource reads remain credential-free.

## Paid Surface Status

This branch does not add:

- paid ST-IM tools.
- `stocktrends_get_stim_latest`.
- `stocktrends_get_stim_history`.
- paid endpoint execution.
- `/v1/pricing/catalog` runtime calls for paid execution.
- `/v1/workflows` dynamic registration.
- x402, wallet handling, payment signing, payment retry, or payment authorization.
- OAuth.
- remote MCP transport.
- database or control-plane access.
- MCP prompts.

Paid ST-IM latest/history remain blocked as static paid policy metadata only.

## Validation Results

Validation commands run for this implementation:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 8 test files and 103 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed with normal CRLF working-copy warnings only |

## Recommended Next Step

After this planning tool is validated, the next phase should remain architecture-first for paid ST-IM latest/history. Paid execution should not proceed until a separate reviewed branch explicitly combines cost-estimate evidence, endpoint-level pricing/preflight where needed, local caps, endpoint allowlist checks, explicit paid enablement, approved-host auth rules, and execution-time API/payment validation.
