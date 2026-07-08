# Phase 4 Pricing/Preflight Foundation Validation Report

## 1. Purpose

This report records validation of the merged Phase 4 pricing/preflight foundation for the Stock Trends MCP Server.

The report is documentation only. It does not implement runtime code, add MCP tools, add MCP prompts, call endpoints, use API keys, test x402 payments, inspect secrets, or change the visible MCP capability surface.

Phase 4 validated that internal pricing/preflight policy modeling, structured cost metadata, local policy decisions, spend caps, endpoint allowlist/auth coupling, and static paid endpoint policy metadata have been introduced without enabling paid execution.

## 2. Validated Architecture Boundary

The controlling authority boundary remains:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin adapter over the front-facing Stock Trends API and published Intelligence Agent artifacts. The Phase 4 pricing/preflight foundation does not make the MCP server any of the following:

- Direct database client.
- Control-plane client.
- Pricing authority.
- Payment authority.
- API recomputation layer.
- Intelligence Agent recomputation layer.
- Parallel reasoning engine.
- Paid execution engine.

The MCP adapter may hold local policy gates, future paid endpoint metadata, and transparent wrapper metadata. It must not recompute Stock Trends data, determine payment authority, bypass API pricing/auth rules, or generate independent market conclusions.

## 3. Current Merged Behavior

The merged behavior remains:

- Local stdio transport only.
- 9 public MCP resources.
- Zero MCP tools.
- Zero MCP prompts.
- Public resources are credential-free.
- No paid endpoint calls.
- No live endpoint calls.
- No `/v1/pricing/catalog` runtime calls for pricing/preflight execution.
- No `/v1/cost-estimate` runtime calls.
- No x402, wallet handling, OAuth, or remote MCP transport.
- No database access.
- No control-plane access.
- No dynamic MCP registration from `GET /v1/ai/tools`.

The public resource inventory remains:

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

## 4. Pricing/Preflight Foundation Behavior

Phase 4 added a structured internal paid preflight model for future paid calls. The model records:

- Tool name.
- Endpoint path.
- HTTP method.
- Estimated cost amount.
- Cost unit, currently `STC` or `USD`.
- Cost-authoritative flag.
- Pricing source metadata, currently `pricing_catalog`, `cost_estimate`, or `explicit_test_estimate`.
- `fetchedAt` or `estimatedAt` timestamp fields, depending on the estimate source.
- Local policy decision.
- Denial reason.
- Local cap state.

The evaluator accepts synthetic or future API-derived metadata only. It does not fetch pricing from the network. It deterministically fails closed when pricing, endpoint, host, paid-mode, cap, or build-authorization requirements are not satisfied.

Because this build keeps paid execution disabled, even otherwise valid mock pricing and cap states do not authorize a paid call.

## 5. Spend Cap Behavior

Phase 4 validates conservative local spend cap behavior:

- Per-session paid call cap.
- Per-tool paid call cap.
- STC budget cap.
- USD budget cap.
- Missing cost denial.
- Non-authoritative pricing denial.
- Cap-exceeded denial.
- Non-allowlisted endpoint denial.
- Non-approved host denial.
- Paid-execution-disabled denial.

Default behavior remains fail-closed. Per-session and per-tool paid call caps default to zero in this no-tools build. STC and USD budget caps default to unset. A future nonzero STC or USD estimate is denied when the corresponding budget cap is unset or would be exceeded.

No persistent accounting, daily cap, loop detector, broad symbol sweep support, automatic paid retries, or paid runtime execution was added.

## 6. Endpoint Allowlist/Auth Coupling

Auth header construction is coupled to the future paid execution boundary. Before a paid auth header can be constructed, the implementation must validate:

- Approved Stock Trends API host.
- Exact endpoint allowlist match.
- Tool name to endpoint policy match.
- Paid-mode and API-key configuration.
- Pricing/preflight decision.
- Spend cap decision.
- The hard paid-execution-enabled build gate.

The boundary checks endpoint path and method against static paid policy metadata and requires the target host to match the configured approved Stock Trends API origin.

This build keeps paid execution disabled. Therefore no runtime path can construct or send `X-API-Key` for paid execution, even when paid mode, a mock key, mock pricing, and caps are configured.

## 7. ST-IM Policy Metadata Status

`GET /v1/stim/latest` and `GET /v1/stim/history` may appear only as static paid policy metadata.

They are not:

- MCP tools.
- Public MCP resources.
- Runtime-fetched endpoints.
- Paid execution paths.

The first paid ST-IM implementation remains blocked pending safe pricing/preflight integration. ST-IM latest/history should not be exposed until the future implementation can combine safe cost-estimate handling, local caps, endpoint allowlist checks, explicit paid enablement, and approved-host auth rules.

## 8. `/v1/cost-estimate` Status

`GET /v1/cost-estimate` is now treated as a confirmed workflow-level preflight budgeting surface.

Current Phase 4 behavior:

- This branch does not call `/v1/cost-estimate`.
- This branch does not integrate `/v1/cost-estimate`.
- `/v1/cost-estimate` does not by itself authorize paid calls.
- Future work should define safe MCP integration before paid ST-IM execution.
- Local policy gates, caps, endpoint allowlist, explicit paid enablement, and auth rules still apply.

The next design phase should decide whether `/v1/cost-estimate` is a public MCP planning tool, an internal preflight-only step, or both.

## 9. Public Resource Safety

All 9 public resources remain unchanged.

Public resource reads never send:

- `Authorization`.
- `X-API-Key`.
- Secret headers.
- Auth headers.
- Payment headers.
- Wallet headers.

Public behavior is independent of paid policy scaffolding. The public resource registry and public fetch behavior remain credential-free with no paid policy side effects.

## 10. Paid-Tool Exposure Status

Phase 4 exposes no paid runtime behavior.

Validated exposure status:

- Zero MCP tools.
- Zero MCP prompts.
- No paid endpoint calls.
- No paid execution.
- No pricing/preflight network calls.
- No x402 behavior.
- No wallet handling.
- No OAuth behavior.
- No remote MCP transport.

Static paid endpoint metadata and mock-only preflight evaluation are internal foundation pieces only. They do not register tools, fetch paid data, authorize paid execution, or create a payment flow.

## 11. Automated Validation

Implementation validation recorded the following passing checks:

- `npm run typecheck` passed.
- `npm test` passed, 7 test files and 76 tests.
- `npm run build` passed.
- `git diff --check` passed with normal CRLF working-copy warnings only.

These checks validate the Phase 4 pricing/preflight foundation without broadening the runtime capability boundary beyond local stdio, 9 public resources, zero tools, zero prompts, and internal no-execution paid policy scaffolding.

## 12. Known Limitations

Known limitations after Phase 4:

- No paid tools are implemented yet.
- No paid endpoint has been called.
- `/v1/cost-estimate` is not integrated yet.
- `/v1/pricing/catalog` is not used as execution preflight.
- API-key paid execution remains blocked.
- x402 remains deferred.
- Remote MCP remains deferred.
- Wallet handling remains deferred.
- OAuth remains deferred.
- No persistent spend accounting or daily cap exists.
- No paid ST-IM latest/history runtime path exists.

These limitations are intentional and preserve the current safety boundary.

## 13. Decision

Phase 4 pricing/preflight foundation is validated and complete.

The merged server is validated as a local stdio MCP server exposing 9 public resources, zero tools, zero prompts, no paid endpoint calls, no live endpoint calls, no pricing/preflight network calls, no x402, no wallet handling, no OAuth, no remote transport, no database access, no control-plane access, and no dynamic registration from `GET /v1/ai/tools`.

The pricing/preflight foundation is validated as internal scaffolding only. It does not activate paid execution in this build.

## 14. Recommended Next Step

Recommended next phase:

```text
architecture/phase4-cost-estimate-mcp-integration
```

The next phase should design how MCP safely exposes or uses `/v1/cost-estimate` before paid ST-IM execution.

It should decide:

- Whether `/v1/cost-estimate` becomes a public MCP planning tool.
- Whether `/v1/cost-estimate` remains internal preflight only.
- `workflow_id` schema and allowed values.
- `rail_preference` schema.
- Output/provenance wrapper.
- Whether cost-estimate requires an API key or remains public.
- How to combine the API estimate with local caps.
- Whether cost-estimate integration should be implemented before ST-IM latest/history paid tools.

Paid ST-IM latest/history execution should remain blocked until cost-estimate integration is paired with local policy gates, cap checks, endpoint allowlist validation, explicit paid enablement, and approved-host auth rules.
