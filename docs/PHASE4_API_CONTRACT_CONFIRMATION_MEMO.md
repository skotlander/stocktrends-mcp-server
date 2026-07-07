# Phase 4 API Contract Confirmation Memo

## 1. Purpose

This memo confirms API contracts for the first possible paid MCP tool increment. It is documentation only. It does not implement paid tools, register MCP tools, register MCP prompts, change runtime code, call paid endpoints, use API keys, test x402 payments, call a database, or alter the visible MCP surface.

The question answered here is whether the current front-facing Stock Trends API contract is confirmed enough to implement the conditional first paid MCP pair:

- `stocktrends_get_stim_latest`
- `stocktrends_get_stim_history`

Authority boundary: Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents.

Conclusion: ST-IM route, auth, parameter, and response contracts are confirmed from the front-facing API source. Pricing/catalog and workflow cost-estimate surfaces are confirmed as public planning surfaces, but executable per-call cost authorization/preflight remains unresolved for MCP paid execution. First paid-tool implementation is therefore still blocked by pricing/preflight policy. The recommended next branch is `implementation/phase4-pricing-preflight-foundation`.

## 2. Validated MCP baseline

The current MCP baseline remains:

- Local stdio transport only.
- 9 public MCP resources.
- Zero MCP tools.
- Zero MCP prompts.
- Phase 3 paid-auth foundation exists.
- Paid execution remains blocked.
- Public resources remain credential-free and send no `Authorization`, `X-API-Key`, payment, wallet, or secret headers.
- No x402, wallet, OAuth, remote MCP, database, control-plane, or dynamic MCP registration behavior is exposed.

Current public resources:

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

Source references: `README.md:14`, `README.md:86`, `docs/PHASE3_PAID_AUTH_FOUNDATION_VALIDATION_REPORT.md:38`, `docs/PHASE3_PAID_AUTH_FOUNDATION_VALIDATION_REPORT.md:76`, `docs/PHASE3_PAID_AUTH_FOUNDATION_VALIDATION_REPORT.md:183`, `docs/PHASE4_FIRST_PAID_TOOL_CONTRACT_MEMO.md:59`.

## 3. Sources inspected

MCP repo files inspected:

- `README.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/MCP_SERVER_ARCHITECTURE.md`
- `docs/API_CAPABILITY_COVERAGE_AUDIT.md`
- `docs/SECURITY_MODEL.md`
- `docs/PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md`
- `docs/PHASE3_PAID_AUTH_FOUNDATION_IMPLEMENTATION_NOTES.md`
- `docs/PHASE3_PAID_AUTH_FOUNDATION_VALIDATION_REPORT.md`
- `docs/PHASE4_FIRST_PAID_TOOL_CONTRACT_MEMO.md`

Front-facing API repo files inspected read-only from `C:\Users\skort\Projects\stocktrends_api`:

- `README.md`
- `examples/README.md`
- `main.py`
- `middleware/api_key.py`
- `middleware/metering.py`
- `routers/stim.py`
- `routers/indicators.py`
- `routers/selections.py`
- `routers/intelligence.py`
- `routers/pricing.py`
- `routers/workflows.py`
- `routers/ai.py`
- `payments/policy_provider.py`
- `payments/x402.py`
- `payments/enforcement.py`
- `pricing/classifier.py`
- `pricing_engine.py`
- `discovery/endpoint_metadata.py`
- `discovery/preview.py`
- `services/intelligence_artifact_store.py`
- `contracts/intelligence/public_artifact_envelope.v1.schema.json`
- `static/tools.json`
- `static/llms.txt`
- `tests/test_ai_tools.py`
- `tests/test_discovery_entrypoints.py`
- `tests/test_pricing_catalog.py`
- `tests/test_planning_surfaces.py`
- `tests/test_route_access_classification.py`
- `tests/test_classifier_anon_rail.py`
- `tests/test_payment_policy_runtime.py`
- `tests/test_intelligence_artifacts.py`

OpenAPI/spec files inspected:

- No static `openapi.json` or OpenAPI YAML file was found in the API repo.
- Generated OpenAPI behavior was inspected in `main.py`, including security schemes and v1 router mounting.
- The static discovery manifest `static/tools.json`, agent text surface `static/llms.txt`, and `contracts/intelligence/public_artifact_envelope.v1.schema.json` were inspected.

Explicitly not inspected or not performed:

- `.env`, secret, credential, private key, wallet, or database credential files were not inspected.
- No live API endpoints were called.
- No paid endpoints were called.
- No API keys were used.
- No x402 payment flow was tested.
- No database was called.
- No migrations were run.
- No servers were started.
- No packages were installed.
- `stocktrends-api-control` was not inspected.
- No sibling repository was modified.

## 4. ST-IM latest contract

Status: confirmed for route/auth/parameters/response class; blocked for executable MCP paid execution by pricing/preflight authorization.

| Contract item | Confirmation |
| --- | --- |
| Exact endpoint path | `GET /v1/stim/latest`. The API router prefix is `/stim`, the app mounts routers under `/v1`, and `stim_latest` is registered at `/latest`. |
| HTTP method | `GET`. |
| Auth requirement | Protected/premium. API-key subscription auth is supported; agent-pay rails are also configured for x402/MPP. |
| API-key header name/format | Preferred `X-API-Key: <key>`; `Authorization: Bearer <key>` is also extracted by middleware and advertised in OpenAPI. MCP should prefer `X-API-Key`. |
| Query/path parameters | Query parameters: either `symbol_exchange` or `symbol` plus `exchange`. No path parameters. |
| Symbol/exchange requirements | `symbol_exchange` is parsed through `parse_symbol_exchange`; otherwise both `symbol` and `exchange` are required. Exchange is normalized uppercase and must be in `VALID_EXCHANGES`. |
| Response shape/class | No Pydantic response model. Returns API-authored object/dict with `weekdate`, `exchange`, `symbol`, ST-IM fields `x4wk1`, `x4wk2`, `x4wk`, `x4wksd`, `x13wk1`, `x13wk2`, `x13wk`, `x13wksd`, `x40wk1`, `x40wk2`, `x40wk`, `x40wksd`, `symbol_exchange`, `request_id`, `latest_data_weekdate`, `is_stale`, `missing_reason`, and `missing_weekdate`. |
| Paid/public status | Paid/protected. Discovery metadata and tests classify ST-IM tools as auth-required/metered with pricing rule `stim_latest_paid`. |
| Pricing/preflight requirement | Cost metadata is discoverable from `/v1/pricing/catalog` and x402 previews, but MCP executable preflight/cost authorization is unresolved. |
| x402 requirement | Not required when using valid subscription API-key auth. x402 is available for agent-pay/per-request access and can produce 402 challenges. MCP v1 should not implement x402/wallet behavior in the first paid-tool branch. |

Relevant source references:

- API route: `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:11`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:78`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:95`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:97`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:113`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:156`.
- v1 mount and router registration: `C:\Users\skort\Projects\stocktrends_api\main.py:403`, `C:\Users\skort\Projects\stocktrends_api\main.py:424`.
- Auth headers/OpenAPI: `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:36`, `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:37`, `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:41`, `C:\Users\skort\Projects\stocktrends_api\main.py:179`, `C:\Users\skort\Projects\stocktrends_api\main.py:185`.
- Paid policy: `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:334`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:335`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:337`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:338`.
- Discovery/tests: `C:\Users\skort\Projects\stocktrends_api\discovery\endpoint_metadata.py:575`, `C:\Users\skort\Projects\stocktrends_api\discovery\endpoint_metadata.py:581`, `C:\Users\skort\Projects\stocktrends_api\tests\test_ai_tools.py:245`, `C:\Users\skort\Projects\stocktrends_api\tests\test_ai_tools.py:754`.

## 5. ST-IM history contract

Status: confirmed for route/auth/parameters/response class; blocked for executable MCP paid execution by pricing/preflight authorization.

| Contract item | Confirmation |
| --- | --- |
| Exact endpoint path | `GET /v1/stim/history`. The API router prefix is `/stim`, the app mounts under `/v1`, and `stim_history` is registered at `/history`. |
| HTTP method | `GET`. |
| Auth requirement | Protected/premium, same family as ST-IM latest. |
| API-key header name/format | Preferred `X-API-Key: <key>`; `Authorization: Bearer <key>` also accepted by middleware. |
| Query/path parameters | Query parameters: either `symbol_exchange` or `symbol` plus `exchange`; optional `start`, `end`, `limit`, `include_gaps`. No path parameters. |
| Date range/lookback/limit model | Explicit `start` and `end` date query strings are inclusive. No separate lookback parameter exists in the route code. `limit` defaults to `260`, min `1`, max `2600`. |
| Max/default range | Default row cap is `260`; max row cap is `2600`. No max calendar range is enforced beyond optional date filters and row cap. |
| Response shape/class | No Pydantic response model. Returns object/dict: `request_id`, `symbol_exchange`, `start`, `end`, `count`, `data`, `include_gaps`, and `gaps`. `data` is ascending by `weekdate` after query reversal and each item includes the same ST-IM distribution fields as latest plus `symbol_exchange`. |
| Paid/public status | Paid/protected. Discovery metadata and policy classify it under pricing rule `stim_history_paid`. |
| Pricing/preflight requirement | Cost metadata exists, but executable preflight/cost authorization remains unresolved for MCP paid execution. |
| x402 requirement | Not required for valid subscription API-key auth. x402 is available for agent-pay flows and should remain deferred for MCP. |

Relevant source references:

- API route: `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:171`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:186`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:188`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:193`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:194`, `C:\Users\skort\Projects\stocktrends_api\routers\stim.py:302`.
- Paid policy: `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:341`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:342`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:344`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:345`.
- Discovery/tests: `C:\Users\skort\Projects\stocktrends_api\discovery\endpoint_metadata.py:623`, `C:\Users\skort\Projects\stocktrends_api\discovery\endpoint_metadata.py:629`, `C:\Users\skort\Projects\stocktrends_api\tests\test_discovery_entrypoints.py:164`, `C:\Users\skort\Projects\stocktrends_api\tests\test_ai_tools.py:346`.

## 6. Indicators latest/history contract

Status: confirmed; should remain second after ST-IM unless pricing/preflight foundation changes the sequencing.

| Contract item | Latest | History |
| --- | --- | --- |
| Exact endpoint | `GET /v1/indicators/latest` | `GET /v1/indicators/history` |
| Method | `GET` | `GET` |
| Auth | Protected/premium; supports subscription API key and configured machine-payment rails. | Same. |
| Required inputs | Either `symbol_exchange` or `symbol` plus `exchange`. Optional `cs_only` defaults true. | Either `symbol_exchange` or `symbol` plus `exchange`; optional `cs_only`, `start`, `end`, `limit`. |
| Response class | No Pydantic response model. Returns latest indicator row dict with fields such as `weekdate`, `exchange`, `symbol`, `type`, `currency_code`, `trend`, `trend_cnt`, `mt_cnt`, `rsi`, `vol_tag`, `rvol`, price/change fields, `symbol_exchange`, and `request_id`. | No Pydantic response model. Returns envelope with `request_id`, `symbol_exchange`, `cs_only`, `start`, `end`, `count`, and `data` rows. |
| Paid/public status | Paid/protected; pricing rule `indicators_latest_paid`. | Paid/protected; pricing rule `indicators_history_paid`. |
| Should remain second after ST-IM? | Yes. Indicators are confirmed and useful, but the Phase 4 selection principle still prefers ST-IM latest/history as the first distinctive paid data pair once preflight is safe. |

Relevant source references: `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:11`, `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:63`, `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:64`, `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:66`, `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:69`, `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:149`, `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:150`, `C:\Users\skort\Projects\stocktrends_api\routers\indicators.py:158`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:349`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:356`.

## 7. Selections latest contract

Status: confirmed route contract; deferred for first paid MCP implementation.

| Contract item | Confirmation |
| --- | --- |
| Exact endpoint | `GET /v1/selections/latest`. |
| Method | `GET`. |
| Auth | Protected/premium; configured payment policy supports subscription, x402, and MPP. |
| Required inputs | No required query inputs. Optional `exchange`, `min_prob13wk`, `limit`, `include_data`, `include_mast`, `cs_only`. |
| Paid/public status | Paid/protected; pricing rule `selections_latest_paid`. |
| Why deferred | The endpoint returns the latest base ST-IM selection universe, not necessarily the strict published STIM Select list. It has high misuse/broad-sweep risk, a large default/max limit, and should wait until selection history plus base-vs-published semantics are designed for MCP. |

Relevant source references: `C:\Users\skort\Projects\stocktrends_api\routers\selections.py:657`, `C:\Users\skort\Projects\stocktrends_api\routers\selections.py:672`, `C:\Users\skort\Projects\stocktrends_api\routers\selections.py:674`, `C:\Users\skort\Projects\stocktrends_api\routers\selections.py:675`, `C:\Users\skort\Projects\stocktrends_api\routers\selections.py:676`, `C:\Users\skort\Projects\stocktrends_api\routers\selections.py:787`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:379`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:380`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:383`.

## 8. Guidance/research artifact contract

Status: confirmed route/class contract; deferred for later authenticated artifact design.

| Contract item | Guidance | Research |
| --- | --- | --- |
| Latest endpoint | `GET /v1/intelligence/guidance/latest` | `GET /v1/intelligence/research/latest` |
| By-id endpoint | `GET /v1/intelligence/guidance/{artifact_id}` | `GET /v1/intelligence/research/{artifact_id}` |
| Route naming | Canonical by-id routes use `{artifact_id}` directly under `guidance` or `research`. No `/latest/by_id` alias is needed for MCP. | Same. |
| Auth/payment status | Latest and by-id guidance/research are paid intelligence products. Public/free intelligence routes are `GET /v1/intelligence/discovery` and `GET /v1/intelligence/editorial/latest/preview`. |
| Response class | `PublicArtifactEnvelope`. Schema requires fields including `schema_version`, `artifact_id`, `artifact_type`, publication metadata, payload, and `content_hash`. |
| Tool or authenticated resource later? | Defer. These may be tools if explicit paid execution/cost gates are required, or authenticated resources only after separate review of resource semantics, caching, and paid access. They must not be public resources. |
| Should by-id come before latest? | Prefer discovery/by-id before or alongside latest. Latest-only artifact access can overfit to the newest artifact and hide provenance; by-id retrieval gives deterministic artifact access from manifest/discovery data. |

Relevant source references: `C:\Users\skort\Projects\stocktrends_api\routers\intelligence.py:90`, `C:\Users\skort\Projects\stocktrends_api\routers\intelligence.py:106`, `C:\Users\skort\Projects\stocktrends_api\routers\intelligence.py:121`, `C:\Users\skort\Projects\stocktrends_api\routers\intelligence.py:143`, `C:\Users\skort\Projects\stocktrends_api\routers\intelligence.py:158`, `C:\Users\skort\Projects\stocktrends_api\routers\intelligence.py:180`, `C:\Users\skort\Projects\stocktrends_api\services\intelligence_artifact_store.py:76`, `C:\Users\skort\Projects\stocktrends_api\contracts\intelligence\public_artifact_envelope.v1.schema.json:2`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:454`, `C:\Users\skort\Projects\stocktrends_api\payments\policy_provider.py:475`.

## 9. API key auth contract

Status: confirmed enough for future subscription API-key execution; MCP should prefer `X-API-Key`.

| Contract item | Confirmation |
| --- | --- |
| Header name | `X-API-Key` is the preferred programmatic premium access header. |
| Header format | Raw API key value in `X-API-Key`. |
| Bearer vs X-API-Key vs other | Middleware also accepts `Authorization: Bearer <key>`. OpenAPI advertises both `ApiKeyAuth` and `BearerAuth`. Discovery text says agents should prefer `X-API-Key` for programmatic premium access. |
| Endpoint differences | Public paths do not require auth. Protected `/v1/*` paths require API key unless allowed through agent-pay/x402/MPP flow. `/v1/stim*` requires a research/pro/enterprise-level plan under subscription auth. |
| 401 behavior | Missing API key on protected routes returns `401` with `"Missing API key"`. Invalid key returns `401`. |
| 403 behavior | Inactive/revoked key, inactive subscription/plan, or disallowed plan returns `403`; ST-IM plan denial is explicitly handled as forbidden/not permitted. |
| Can API key auth be used without x402? | Yes. Valid paid-auth requests classify as subscription and do not require x402. x402 is an alternate agent-pay rail, not mandatory for subscription callers. |

Relevant source references: `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:36`, `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:37`, `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:41`, `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:329`, `C:\Users\skort\Projects\stocktrends_api\middleware\api_key.py:356`, `C:\Users\skort\Projects\stocktrends_api\main.py:179`, `C:\Users\skort\Projects\stocktrends_api\main.py:185`, `C:\Users\skort\Projects\stocktrends_api\static\llms.txt:354`, `C:\Users\skort\Projects\stocktrends_api\static\llms.txt:356`, `C:\Users\skort\Projects\stocktrends_api\tests\test_classifier_anon_rail.py:195`, `C:\Users\skort\Projects\stocktrends_api\tests\test_classifier_anon_rail.py:209`.

## 10. Pricing/preflight contract

Status: partially confirmed, but not sufficient for paid MCP execution.

| Contract item | Confirmation |
| --- | --- |
| Is `/v1/pricing/catalog` authoritative for paid-call preflight? | It is confirmed as the live public endpoint price map from active `api_pricing_rules`, with `pricing_rule_id`, `endpoint_pattern`, `cost_per_request`, `stc_cost`, `estimated_usd_cost`, `requires_subscription`, `requires_payment`, and `supported_rails`. It is authoritative for endpoint cost discovery, but not by itself sufficient as an MCP execution authorization gate because it does not validate the caller's current entitlement, quota, balance, or no-charge status immediately before a paid call. |
| Dedicated cost-estimate/preflight endpoint | `GET /v1/cost-estimate` exists, but it is a workflow-level cost estimate endpoint, not an endpoint-specific paid-call authorization preflight. It takes `workflow_id` and uses caller-supplied `quota_remaining` in v1. |
| Can cost be determined before execution? | Static endpoint cost can be determined from `/v1/pricing/catalog` when a stable `pricing_rule_id` exists. User-specific authorization, quota sufficiency, and x402 final payment preview are not fully determined until auth/metering/payment enforcement. |
| Does pricing/preflight itself cost anything? | `/v1/cost-estimate` is documented in code as public/non-metered. `/v1/pricing/catalog` is public/no-auth and used for planning; some manifest tests preserve metered/pricing metadata for it, so MCP should not treat catalog access alone as paid-execution authorization. |
| Insufficient balance/payment required behavior | For subscription/API-key paths, missing/invalid/disallowed credentials return `401`/`403`. For agent-pay/x402 paths, unpaid requests can return `402` with payment-required metadata. MCP must not sign, pay, or retry x402 in the first paid-tool implementation. |
| Is x402 required for some/all paid calls? | x402 is supported for agent-pay/per-request access and may be the response path for anonymous agent-pay attempts. It is not required for valid subscription API-key access. |

Relevant source references: `C:\Users\skort\Projects\stocktrends_api\routers\pricing.py:264`, `C:\Users\skort\Projects\stocktrends_api\routers\pricing.py:277`, `C:\Users\skort\Projects\stocktrends_api\routers\pricing.py:292`, `C:\Users\skort\Projects\stocktrends_api\routers\pricing.py:315`, `C:\Users\skort\Projects\stocktrends_api\routers\pricing.py:316`, `C:\Users\skort\Projects\stocktrends_api\routers\pricing.py:333`, `C:\Users\skort\Projects\stocktrends_api\routers\workflows.py:599`, `C:\Users\skort\Projects\stocktrends_api\routers\workflows.py:606`, `C:\Users\skort\Projects\stocktrends_api\routers\workflows.py:618`, `C:\Users\skort\Projects\stocktrends_api\routers\workflows.py:733`, `C:\Users\skort\Projects\stocktrends_api\routers\workflows.py:791`, `C:\Users\skort\Projects\stocktrends_api\tests\test_route_access_classification.py:195`, `C:\Users\skort\Projects\stocktrends_api\tests\test_route_access_classification.py:202`, `C:\Users\skort\Projects\stocktrends_api\tests\test_route_access_classification.py:205`.

## 11. Endpoint allowlist recommendation

Do not expand the runtime paid endpoint allowlist yet.

Although the first conditional entries are now route/auth/schema-confirmed, the required pricing/preflight execution contract remains unresolved. The MCP server should therefore preserve the current no-paid-execution state and make no runtime allowlist expansion in this branch.

Conditional future allowlist entries after pricing/preflight foundation is implemented and validated:

| Method | Path | Tool |
| --- | --- | --- |
| `GET` | `/v1/stim/latest` | `stocktrends_get_stim_latest` |
| `GET` | `/v1/stim/history` | `stocktrends_get_stim_history` |

These entries must remain coupled to paid-mode enablement, approved-host enforcement, auth-header construction, pricing/preflight, local spend caps, no-retry policy, and latest/history paired registration.

## 12. Latest/history implementation readiness

Outcome: partially ready but blocked by pricing/preflight.

The following are confirmed:

- `GET /v1/stim/latest`
- `GET /v1/stim/history`
- `GET` method for both.
- `symbol_exchange` or `symbol` plus `exchange` input model.
- ST-IM history `start`, `end`, `limit`, and `include_gaps` model.
- Latest/history response shapes.
- Preferred API-key header: `X-API-Key`.
- Bearer API-key fallback is accepted by API middleware.
- API-key subscription access can be used without x402.
- x402 is an alternate agent-pay rail and must remain deferred for MCP.

Still blocking first paid-tool implementation:

- No endpoint-specific MCP preflight contract exists that proves caller-specific cost authorization before execution.
- `/v1/cost-estimate` is workflow-level and uses caller-supplied quota state in v1.
- `/v1/pricing/catalog` confirms cost metadata, but does not alone prove entitlement, quota, balance, or no-charge status for a specific API key immediately before a call.
- MCP local spend-cap semantics need a concrete implementation contract tying catalog costs to per-session/per-tool/STC/USD caps.

Therefore the first paid ST-IM implementation is not safe now.

## 13. Required implementation changes if ready

Not ready. Before `implementation/phase4-first-paid-tool-stim-latest-history`, confirm or implement a pricing/preflight foundation that answers:

- Exact local preflight algorithm for one endpoint call using `/v1/pricing/catalog`.
- Whether catalog-derived cost is sufficient for MCP local authorization when no dedicated endpoint-specific preflight exists.
- Whether a new or existing API endpoint can estimate a single paid endpoint call with input parameters.
- How API-key subscription quota/entitlement should be checked before the paid data call, if at all.
- Whether nonzero-cost calls require explicit `STOCKTRENDS_MAX_STC_PER_SESSION` or `STOCKTRENDS_MAX_USD_PER_SESSION`.
- Default per-session and per-tool paid call caps.
- How to fail closed when catalog data is stale, missing, malformed, or lacks the expected pricing rule.
- How to expose preflight metadata in the MCP wrapper without claiming payment was authorized by the MCP server.

Once ready, the first paid-tool branch should implement exactly:

- Tool names: `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`.
- Endpoint paths: `GET /v1/stim/latest`, `GET /v1/stim/history`.
- Input schemas: one symbol per call; either strict `symbol_exchange` or a reviewed MCP schema that constructs `symbol_exchange` from `symbol` plus `exchange`; no arrays; no free-text; no unknown fields; history `limit` capped no higher than API max and ideally lower by MCP policy.
- Output/provenance wrapper: preserve raw `api_data`; add `mcp_metadata` with tool name, endpoint path, method, fetched-at timestamp, paid flag, pricing/preflight metadata, local cap state, and latest/history limitation notes.
- Auth handling: send `X-API-Key` only through a coupled paid execution boundary to approved Stock Trends origin and allowlisted endpoint.
- Pricing/preflight gate: mandatory before paid call; fail closed on missing/ambiguous cost.
- Spend cap defaults: default to no paid execution unless explicit nonzero caps and cost budget are configured.
- Tests: all mocked; no production paid calls, no real API keys, no x402 payment, no DB.
- Manual validation: local stdio only; public resources unchanged; paid tools absent unless explicit paid mode and policy gates are configured; no paid validation call unless separately authorized.

## 14. Security constraints

Any future implementation must preserve:

- Public resources credential-free.
- Zero prompts.
- No dynamic registration.
- No broad sweeps.
- No auto retries.
- No secret leakage.
- No x402/wallet unless separately designed.
- No remote MCP.
- No database/control-plane.
- No API recomputation, ST-IM recomputation, indicator recomputation, selection recomputation, guidance generation, research generation, or investment-advice generation.
- Auth headers only for approved Stock Trends API origin and allowlisted paid execution paths.
- Public resource code paths must never receive `Authorization`, `X-API-Key`, payment headers, or wallet headers.

## 15. Recommended next branch

Recommended branch: B. `implementation/phase4-pricing-preflight-foundation`

Reason: ST-IM route/auth/history contracts are now confirmed, but pricing/preflight and cost-authorization remain unresolved for MCP paid execution. The next branch should implement or formalize the pricing/preflight foundation without registering paid data tools.

Do not recommend:

- A. `implementation/phase4-first-paid-tool-stim-latest-history`: premature until preflight/cost authorization is safe.
- C. `architecture/phase4-api-contract-followup`: unnecessary for route/auth/schema, unless the user wants API-side product confirmation of preflight semantics before any implementation.
- D. `architecture/phase5-x402-payment-design`: useful later, but not required for subscription API-key ST-IM access and should remain separate.

## 16. Open questions

- Is `/v1/pricing/catalog` officially sufficient as the API-authoritative source for endpoint-level MCP preflight when paired with local spend caps?
- Should the API expose an endpoint-specific cost/preflight route beyond workflow-level `GET /v1/cost-estimate`?
- If no endpoint-specific preflight exists, should MCP block all paid calls unless catalog has exact rule IDs and explicit local caps are configured?
- How should MCP verify subscription quota, entitlement, or balance before execution without making the paid data call?
- Should `STOCKTRENDS_MAX_STC_PER_SESSION` be required for all nonzero-cost paid calls?
- Should `STOCKTRENDS_MAX_USD_PER_SESSION` be required, or is STC enough?
- What should the first validation cap values be for local manual testing?
- Should MCP accept only `symbol_exchange`, or expose `symbol` plus `exchange` and construct the API query?
- What MCP default history limit should be lower than the API max: 104, 260, or another value?
- Should bearer auth remain supported in MCP, or should MCP only send `X-API-Key` despite API support for both?
- Should x402 402 preview inspection be a future MCP planning feature, or remain entirely outside MCP until Phase 5?

## 17. Draft future prompt

DRAFT ONLY — DO NOT EXECUTE IN THIS TASK

You are implementing the Phase 4 pricing/preflight foundation for the Stock Trends MCP Server.

Repository:

```text
stocktrends-mcp-server
```

Branch/worktree:

Create and work in a dedicated branch/worktree named:

```text
implementation/phase4-pricing-preflight-foundation
```

Do not modify `main` directly.

Task type:

Pricing/preflight foundation only. Do not register paid data tools.

Binding documents to read first:

- `README.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/MCP_SERVER_ARCHITECTURE.md`
- `docs/API_CAPABILITY_COVERAGE_AUDIT.md`
- `docs/SECURITY_MODEL.md`
- `docs/PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md`
- `docs/PHASE3_PAID_AUTH_FOUNDATION_IMPLEMENTATION_NOTES.md`
- `docs/PHASE3_PAID_AUTH_FOUNDATION_VALIDATION_REPORT.md`
- `docs/PHASE4_FIRST_PAID_TOOL_CONTRACT_MEMO.md`
- `docs/PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`

Hard constraints:

- Preserve local stdio transport only.
- Preserve the existing 9 public resources.
- Keep zero MCP tools.
- Keep zero MCP prompts.
- Do not add `stocktrends_get_stim_latest`.
- Do not add `stocktrends_get_stim_history`.
- Do not call paid endpoints.
- Do not use real API keys.
- Do not inspect secrets.
- Do not test x402 payments.
- Do not add wallet handling.
- Do not add OAuth.
- Do not add remote MCP transport.
- Do not call a database.
- Do not touch `stocktrends-api-control`.
- Do not install packages unless explicitly authorized.
- Do not commit unless explicitly asked.

Implement only the internal pricing/preflight foundation required before paid data tools:

- A reviewed internal pricing catalog client or fixture-backed abstraction that can resolve exact pricing rules for allowlisted paid endpoints without registering tools.
- Fail-closed validation that `/v1/stim/latest` resolves to `stim_latest_paid` and `/v1/stim/history` resolves to `stim_history_paid` in mocked/catalog fixtures.
- Local preflight policy that refuses paid execution when catalog data is missing, stale, malformed, ambiguous, or lacks required rule IDs.
- Local cap checks for per-session calls, per-tool calls, STC budget, and USD budget, with defaults that authorize zero paid execution unless explicitly configured.
- A structured preflight result object for future tools, including endpoint path, method, pricing rule id, estimated STC/USD cost, catalog source, cap state, and authorization decision.
- Tests using mocks or local fixtures only.
- Tests proving public resources never send auth headers and visible MCP surface remains 9 resources, zero tools, zero prompts.
- Tests proving preflight failure blocks paid execution authorization.
- Tests proving no x402, wallet, remote MCP, database, control-plane, paid endpoint, or real API-key behavior is introduced.

Acceptance criteria:

- No paid tools registered.
- No prompts registered.
- Public resources unchanged and credential-free.
- Pricing/preflight foundation can be unit-tested without live API calls.
- Paid execution remains blocked unless a future paid-tool branch explicitly uses the preflight foundation.
- The next branch after this may be `implementation/phase4-first-paid-tool-stim-latest-history` only if preflight semantics are fully validated.

Do not broaden scope. If implementing the pricing/preflight foundation requires a live API contract change or API-side preflight endpoint, stop and report that the next step should be an API contract/product decision rather than MCP runtime implementation.
