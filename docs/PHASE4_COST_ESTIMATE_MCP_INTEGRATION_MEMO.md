# Phase 4 Cost Estimate MCP Integration Memo

## 1. Purpose

This memo defines how the Stock Trends MCP Server should safely integrate the confirmed `GET /v1/cost-estimate` preflight budgeting endpoint before exposing paid ST-IM tools.

This is an architecture and planning memo only. It does not implement runtime code, register MCP tools, register MCP prompts, modify `src/`, modify `tests/`, modify `package.json`, call endpoints, use API keys, inspect secrets, test x402 payments, add wallet handling, add OAuth, add remote MCP transport, access a database, access the API control plane, or dynamically register anything from `GET /v1/ai/tools`.

The controlling authority boundary remains:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin adapter over the front-facing Stock Trends API. The adapter may expose API-authored planning data and apply local policy gates, but it must not become a pricing authority, payment authority, entitlement authority, database client, control-plane client, API recomputation layer, Intelligence Agent recomputation layer, or parallel reasoning system.

## 2. Confirmed API Role

`GET /v1/cost-estimate` is now treated as a confirmed workflow-level preflight budgeting surface.

Confirmed role:

- Workflow-level preflight budgeting surface.
- Public/helper planning endpoint.
- API cost-estimate source for workflow planning and future local MCP policy evaluation.
- Not a payment authorization endpoint.
- Not sufficient by itself to execute paid tools.

Confirmed contract facts from the front-facing API code and discovery surfaces:

| Contract item | Confirmed fact |
| --- | --- |
| Route | `GET /v1/cost-estimate`. The implementation is mounted from the workflows router path `/cost-estimate` under the `/v1` API prefix. |
| Method | `GET`. |
| API key requirement | Public, non-metered, no API key required. API tests assert no-key access returns `200` and no payment-required headers for `/v1/cost-estimate?workflow_id=portfolio_build`. |
| Required query params | `workflow_id` is required. |
| Optional query params | `quota_remaining` and `rail_preference`. |
| `workflow_id` behavior | Must match a workflow in `WORKFLOW_REGISTRY`; unknown workflow IDs return `404`. The OpenAPI/discovery enum currently lists `regime_analysis`, `symbol_decision`, `stim_forecast_review`, `portfolio_build`, and `portfolio_compare_review`. |
| `quota_remaining` behavior | Optional integer, minimum `0`. It is caller-supplied in v1 and used only for illustrative subscription/x402 assignment. It is not server-side entitlement or quota verification. |
| `rail_preference` behavior | Optional string. Defaults to `auto` after trimming/lowercasing. Valid values are `subscription`, `x402`, `mpp`, and `auto`. Invalid values return `422`. A non-`auto` rail must be supported by the selected workflow or the API returns `422`. |
| Cost source | Workflow step costs are resolved at request time from live pricing rules in the API pricing engine. The workflow registry stores pricing rule IDs, not hardcoded STC costs. |
| Response fields | `workflow_id`, `rail`, `total_stc_cost`, `total_usd_cost`, `quota_remaining_supplied`, `quota_sufficient`, `steps`, and `notes`. |
| Step fields | Each step includes `step_id`, `method`, `path`, `pricing_rule_id`, `stc_cost`, `usd_cost`, `assigned_rail`, `quota_impact`, `purpose`, and `safe_example_request`. |
| Estimate scope | Workflow-level total plus per-step estimates for the selected workflow. It is not an arbitrary endpoint-level estimator for any MCP tool call. |
| Error behavior | Invalid rail returns `422`; unknown workflow returns `404`; pricing data unavailable or workflow pricing-rule drift returns `500`. |

Important limitation: even though the endpoint returns per-step entries, those entries are scoped to the selected workflow. The endpoint does not currently accept an arbitrary endpoint path, MCP tool name, symbol, date range, or paid-call input payload and return a caller-specific authorization decision.

## 3. Architectural Decision

The preferred integration shape is option D: expose a public MCP planning tool and design its normalized result so later paid-tool preflight can consume the same cost-estimate evidence.

Options evaluated:

| Option | Assessment | Decision |
| --- | --- | --- |
| A. Public MCP planning tool: `stocktrends_estimate_workflow_cost` | Good fit. The API endpoint is public, free/non-metered, parameterized, and useful to agents before paid execution. A tool is the right MCP primitive because the call requires validated inputs. Main risk is false confidence, mitigated by explicit output metadata saying the estimate is not payment authorization. | Recommended. |
| B. Internal preflight helper only | Safest visible surface, but too hidden. It would prevent agents from planning costs before asking for paid work and would not use the confirmed public planning affordance. It should still exist later as part of paid-tool execution gates. | Insufficient alone. |
| C. Public MCP resource | Poor fit for v1. Existing resources are low-risk, mostly unparameterized public discovery surfaces. Cost estimate requires `workflow_id` and optional rail/quota inputs, and stale or cached resource semantics would be easy to misuse. | Rejected for now. |
| D. Both public planning tool and internal preflight helper | Best fit if sequenced carefully. The public tool gives agents safe workflow budgeting, while the same validated API estimate can later feed internal paid-tool policy. The next implementation branch must still register no paid ST-IM tools. | Recommended architecture. |

Recommendation:

- Implement `stocktrends_estimate_workflow_cost` as a safe public/free MCP planning tool in the next implementation branch.
- Keep existing 9 public resources unchanged.
- Keep prompts at zero.
- Do not expose paid ST-IM tools in the same branch.
- Allow the normalized cost-estimate result shape to become an input to later internal preflight, but keep paid execution blocked until a separate paid-tool branch explicitly combines API estimate, local policy gates, endpoint allowlist, approved-host validation, explicit paid enablement, auth behavior, and caps.

## 4. Tool Contract Proposal

Recommended MCP tool name:

```text
stocktrends_estimate_workflow_cost
```

Purpose:

Estimate workflow-level Stock Trends API cost before paid execution.

Recommended input schema:

| Input | Required | Source | Notes |
| --- | --- | --- | --- |
| `workflow_id` | Yes | Sent to API query | Must be one of the confirmed workflow IDs. Unknown IDs fail closed locally before any API call. |
| `rail_preference` | No | Sent to API query | Enum: `auto`, `subscription`, `x402`, `mpp`. Default `auto`. MCP must not treat `x402` or `mpp` planning as permission to sign, pay, or retry. |
| `quota_remaining` | No | Sent to API query | Non-negative integer. Caller-supplied and illustrative only. It must not be treated as verified quota or entitlement. |
| `max_budget_stc` | No | Local MCP comparison only | Non-negative number. Not sent to the API. Produces a planning cap comparison, not paid authorization. |
| `max_budget_usd` | No | Local MCP comparison only | Non-negative number. Not sent to the API. Produces a planning cap comparison, not paid authorization. |
| `include_raw_response` | No | Local MCP output choice | Default should be true or equivalent pass-through under `api_data`; public data is not secret, and preserving API-authored JSON protects provenance. |

Inputs not recommended for the first implementation:

- No user-facing `currency` or `unit` selector. The API returns STC and USD fields.
- No user-facing `include_steps` flag. The API returns steps and MCP should preserve them.
- No user-facing `strict` flag. Strict validation and fail-closed behavior should be the default.
- No arbitrary endpoint path, MCP tool name, symbol, date range, or paid-call payload. The confirmed endpoint is workflow-level.

Recommended output wrapper:

```json
{
  "api_data": {
    "workflow_id": "stim_forecast_review",
    "rail": "subscription",
    "total_stc_cost": 0,
    "total_usd_cost": 0,
    "quota_remaining_supplied": null,
    "quota_sufficient": null,
    "steps": [],
    "notes": []
  },
  "mcp_metadata": {
    "tool_name": "stocktrends_estimate_workflow_cost",
    "source": "cost_estimate",
    "endpoint_path": "/v1/cost-estimate",
    "http_method": "GET",
    "workflow_id": "stim_forecast_review",
    "rail_preference": "auto",
    "fetched_at": "ISO-8601 timestamp",
    "authoritative_for": [
      "workflow budgeting",
      "planning",
      "local MCP policy evidence"
    ],
    "not_authoritative_for": [
      "payment authorization",
      "API-key entitlement",
      "subscription quota verification",
      "x402 challenge amount",
      "paid execution approval"
    ],
    "local_budget_comparison": {
      "max_budget_stc": null,
      "max_budget_usd": null,
      "stc_within_budget": null,
      "usd_within_budget": null,
      "planning_decision": "not_evaluated"
    },
    "warnings": []
  }
}
```

Output requirements:

- Preserve the API response under `api_data`.
- Include request identity and provenance in `mcp_metadata`.
- Include the endpoint used, method, `workflow_id`, effective rail, totals, unit/currency fields, step estimates, source, and fetched timestamp.
- State that the estimate is authoritative for budgeting/planning only.
- State that it is not authoritative for payment authorization or paid execution.
- Include local cap comparison only when caller-provided planning caps are supplied.
- If cost is under a caller-provided budget, return a within-budget planning status only. Do not return paid execution authorization.
- If cost exceeds a caller-provided budget, return a deterministic planning block/warning without calling any paid endpoint.
- Include warnings for caller-supplied `quota_remaining`, `rail_preference` involving x402/MPP, missing steps, unexpected response shape, stale estimate policy, and workflow-vs-endpoint scope limitations.

## 5. Internal Preflight Role

Future paid execution requires both API-provided estimate evidence and local MCP policy authorization. Neither side replaces the other.

Required distinction:

| Concept | Owner | Meaning |
| --- | --- | --- |
| API-provided estimate | Stock Trends API | Workflow-level cost and rail estimate returned by `GET /v1/cost-estimate`. |
| MCP local authorization | MCP adapter | Local decision using explicit paid enablement, API-key behavior, endpoint allowlist, approved host, pricing/preflight policy, per-session cap, per-tool cap, STC cap, USD cap, and paid-execution build gate. |
| Actual payment challenge/402 amount | Stock Trends API/payment rail | Execution-time payment requirement or challenge. MCP must not sign, pay, or retry in the current design. |
| Observed paid execution cost | Stock Trends API/metering | Actual result of an authorized paid call. This remains distinct from the preflight estimate. |

Future workflow-level paid tools must call `GET /v1/cost-estimate` before paid execution and compare the estimate to local caps. Future single-endpoint paid tools must still determine cost before execution; if they cannot map the intended operation to a confirmed workflow estimate or exact endpoint-level pricing metadata, they must fail closed.

Future paid tools must:

- Validate explicit paid enablement before any paid execution.
- Validate API-key behavior without logging or returning secrets.
- Validate endpoint allowlist and approved host before auth headers can be constructed.
- Call cost-estimate for workflow-level execution, or use a reviewed endpoint-level pricing/preflight source for single-endpoint execution.
- Compare the API estimate or endpoint-level cost source to local per-session, per-tool, STC, and USD caps.
- Still validate any execution-time `402` challenge amount before any future payment flow.
- Block if estimate is missing, malformed, stale, non-authoritative for the intended scope, or ambiguous.
- Block if the returned `workflow_id` does not exactly match the intended workflow.
- Block if the returned source is not `cost_estimate` when cost-estimate is required.
- Block if units/currencies are missing, unsupported, or mismatch the configured local cap.
- Block if API estimate metadata and endpoint policy metadata conflict.
- Block if the estimate covers a broader or different workflow than the paid operation being attempted.
- Preserve the hard paid-execution-disabled gate until paid tools are explicitly implemented and reviewed.

The architecture must not require clients to call the planning tool manually before every paid call. Public planning is useful, but internal paid-tool preflight must run inside the paid execution boundary so it cannot be skipped by a client or model.

## 6. Workflow ID And Scope

Confirmed workflow IDs:

- `regime_analysis`
- `symbol_decision`
- `stim_forecast_review`
- `portfolio_build`
- `portfolio_compare_review`

Workflow handling decision:

- The MCP planning tool should use a static, reviewed allowlist matching the confirmed API enum for the implementation branch.
- Unknown `workflow_id` values must fail closed locally before any API call.
- The implementation must not dynamically register MCP tools, prompts, resources, or workflow-specific callable surfaces from `GET /v1/workflows`.
- The existing `stocktrends://workflows` resource may remain the discovery surface for humans and agents, but it must not mutate the MCP registry at runtime.
- If the API adds new workflow IDs, MCP should adopt them only through a reviewed follow-up branch that updates the tool schema/tests.

ST-IM scope decision:

- `workflow_id=stim_forecast_review` is sufficient for planning the broader ST-IM forecast review workflow. That workflow includes public methodology steps, ST-IM latest, indicators latest, prices latest, and optional ST-IM/indicator/price history steps.
- `workflow_id=stim_forecast_review` is not sufficient by itself as exact endpoint-level budgeting for standalone `stocktrends_get_stim_latest` or `stocktrends_get_stim_history` tool execution. It may include additional steps and optional steps that do not exactly match the intended single paid call.
- Before implementing first paid ST-IM latest/history tools, MCP still needs either exact endpoint-level budgeting through the pricing/preflight foundation or a reviewed decision that the paid operation is explicitly workflow-level rather than standalone endpoint-level.
- No new workflow ID is required for the public planning tool. A new workflow ID may be needed later if product/API owners want exact budgeting for a narrower first paid MCP operation than `stim_forecast_review`.

## 7. Relationship To `/v1/pricing/catalog`

`GET /v1/pricing/catalog` and `GET /v1/cost-estimate` are complementary planning surfaces.

| Surface | Role | MCP treatment |
| --- | --- | --- |
| `/v1/pricing/catalog` | Cost metadata/catalog surface with pricing rule IDs, endpoint patterns, STC/USD costs, subscription/payment requirements, and supported rails. | Existing public resource remains passive metadata. It can support endpoint-level local preflight only through a reviewed, deterministic, fail-closed policy tied to exact rule IDs. |
| `/v1/cost-estimate` | Workflow-level planning/preflight budgeting surface that resolves workflow step costs and rail assignment. | Recommended public planning tool and future internal workflow-level preflight evidence source. |

Neither surface authorizes paid execution by itself.

Future paid calls require:

- Explicit local paid enablement.
- API key behavior or later separately designed payment behavior.
- Endpoint allowlist match.
- Approved host validation.
- Pricing/preflight policy decision.
- Per-session cap.
- Per-tool cap.
- STC budget cap.
- USD budget cap.
- No automatic paid retries.
- Execution-time API status and payment/challenge validation.

## 8. Public Resource Impact

Existing 9 public resources should remain unchanged:

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

`GET /v1/cost-estimate` should not become a public resource in the next branch.

Reason:

- It is parameterized by `workflow_id`, `rail_preference`, and optional caller-supplied `quota_remaining`.
- It returns planning output whose meaning depends on request inputs and fetch time.
- A resource would invite caching/staleness and blur the parameterized planning action.
- Existing resources are already sufficient for static discovery: `stocktrends://workflows` and `stocktrends://pricing/catalog`.

Decision: expose it as one public MCP planning tool, not a resource. Resource templates can be reconsidered later only if MCP client compatibility and caching semantics are separately reviewed.

## 9. Paid Tools Sequencing

Recommended sequence:

1. Implement `stocktrends_estimate_workflow_cost` as one public/free planning tool with mocked network tests.
2. Validate that no paid ST-IM tools are registered.
3. Validate prompts remain zero.
4. Validate public resources remain unchanged and credential-free.
5. Then architect first paid ST-IM latest/history tools using cost-estimate evidence, endpoint-level pricing metadata where needed, local caps, auth/preflight foundation, and the hard paid-execution gate.
6. Implement first paid ST-IM tools only after architecture approval for the exact paid-tool branch.

Do not implement `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, x402, wallet behavior, OAuth, remote MCP, database access, control-plane access, or dynamic registration in the cost-estimate planning-tool branch.

## 10. Safety Requirements For Implementation Branch

The next implementation branch must preserve these constraints:

- Documentation-approved scope only: public cost-estimate planning tool, no paid data tools.
- Tool count may become 1 only if `stocktrends_estimate_workflow_cost` is approved.
- Prompts remain zero.
- Existing 9 public resources remain unchanged.
- Public resources remain credential-free and send no `Authorization`, `X-API-Key`, payment, wallet, or secret headers.
- No API key is required for `stocktrends_estimate_workflow_cost` because the API confirms public/non-metered access.
- No paid endpoint calls.
- No `/v1/pricing/catalog` runtime preflight calls unless separately approved for the implementation branch; mocked client tests are sufficient.
- No x402, wallet, payment signing, payment retry, payment authorization, OAuth, or remote MCP transport.
- No database or control-plane access.
- No dynamic MCP registration from `/v1/ai/tools` or `/v1/workflows`.
- Deterministic local input errors for invalid `workflow_id`, invalid `rail_preference`, invalid `quota_remaining`, and invalid local budget caps.
- Deterministic upstream/network errors.
- Fail closed on malformed or incomplete API responses.
- Redacted logging and safe errors.
- Mock tests for all network behavior unless live verification is explicitly approved.
- If live verification is deferred, implementation must use mocked client tests only.

Paid execution must remain blocked by the existing hard gate until a later paid-tool branch explicitly changes that gate under review.

## 11. Testing Requirements

Future implementation tests should cover:

- Tool registration count becomes exactly 1 only when the public planning tool is implemented and no paid tools are registered.
- Prompt count remains zero.
- Existing public resource count and URIs remain unchanged.
- `workflow_id` validation accepts only the confirmed allowlist.
- Unknown `workflow_id` fails closed locally.
- `rail_preference` validation accepts only `auto`, `subscription`, `x402`, and `mpp`.
- Invalid `rail_preference` fails closed locally.
- `quota_remaining` validation rejects negative and non-integer values.
- Local `max_budget_stc` and `max_budget_usd` validation rejects negative and nonnumeric values.
- API/network failure produces a deterministic MCP error.
- Upstream `404`, `422`, and `500` responses map deterministically.
- Malformed cost-estimate response fails closed.
- Missing `workflow_id`, `rail`, `total_stc_cost`, `total_usd_cost`, or `steps` fails closed.
- Stale estimate handling is deterministic if a TTL/freshness policy is added.
- Unit/currency mismatch handling fails closed.
- Cost over a user-provided max budget returns a blocked planning warning, not paid execution authorization.
- Cost under budget returns within-budget planning status only, not paid execution authorization.
- `quota_remaining` output is labeled caller-supplied/illustrative and never verified.
- `rail_preference=x402` or `mpp` does not trigger wallet, payment, signing, retry, or challenge behavior.
- No API key is sent to the public cost-estimate endpoint.
- Public resources still send no auth headers.
- No paid endpoint is called.
- No x402, wallet, OAuth, or remote MCP behavior exists.
- No dynamic tool registration from `/v1/ai/tools`.
- No dynamic workflow registration from `/v1/workflows`.
- Secret redaction covers API keys, bearer tokens, auth headers, payment headers, wallet-like material, and environment-like secret text.

All tests should use mocks or local fixtures unless live public endpoint verification is explicitly approved. No tests should use real API keys, paid endpoints, x402 payment flows, secrets, databases, migrations, or server startup against production.

## 12. Known Limitations

- Exact endpoint-level ST-IM estimate remains unresolved unless confirmed by a later API or MCP pricing/preflight decision.
- `GET /v1/cost-estimate` is workflow-level rather than arbitrary endpoint-level.
- `workflow_id=stim_forecast_review` is useful for workflow planning but not exact proof for standalone ST-IM latest/history paid tool execution.
- `quota_remaining` is caller-supplied in API v1 and is illustrative, not server-verified quota.
- Actual `402` challenge amount may still need execution-time comparison in a future x402 branch.
- API-key subscription execution semantics remain distinct from x402 execution semantics.
- `/v1/pricing/catalog` remains metadata/catalog and does not authorize execution by itself.
- Remote MCP remains deferred.
- Wallet handling remains deferred.
- OAuth remains deferred.
- Paid ST-IM tools remain blocked.

## 13. Decision

`GET /v1/cost-estimate` integration is approved for the next implementation branch only in this limited form:

- Add one public/free MCP planning tool named `stocktrends_estimate_workflow_cost`.
- Keep existing 9 public resources unchanged.
- Keep prompts at zero.
- Do not add paid ST-IM tools.
- Do not add paid resources.
- Do not call paid endpoints.
- Do not call x402 or payment flows.
- Do not require or send an API key for the public cost-estimate endpoint.
- Preserve the hard paid-execution-disabled gate.

This decision approves workflow budgeting exposure and future internal preflight evidence wiring. It does not approve paid execution.

## 14. Recommended Next Branch

Recommended next branch:

```text
implementation/phase4-cost-estimate-planning-tool
```

Branch scope:

- Implement `stocktrends_estimate_workflow_cost` as the only new MCP tool.
- Use mocked network tests unless live public verification is explicitly approved.
- Preserve 9 public resources, zero prompts, no paid tools, no paid calls, no API keys, no x402/wallet/OAuth/remote MCP, no database/control-plane access, and no dynamic registration.

Paid ST-IM latest/history should remain blocked until a later architecture-approved branch explicitly combines cost-estimate integration, endpoint-level pricing/preflight where needed, local caps, endpoint allowlist, explicit paid enablement, approved-host auth rules, and execution-time API/payment validation.
