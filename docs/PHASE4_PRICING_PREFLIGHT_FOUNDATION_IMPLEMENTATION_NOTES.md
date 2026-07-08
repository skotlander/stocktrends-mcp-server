# Phase 4 Pricing/Preflight Foundation Implementation Notes

Implementation date: 2026-07-07

## Scope

This branch implements the Phase 4 pricing/preflight foundation only. It does not expose paid MCP runtime tools.

The visible MCP surface remains:

- 9 public resources.
- Zero MCP tools.
- Zero MCP prompts.
- Local stdio transport only.
- No paid endpoint calls.
- No pricing or preflight network calls.
- No x402, wallet, OAuth, remote MCP, database, or control-plane behavior.

## What Was Added

- A structured internal paid preflight model with:
  - tool name
  - endpoint path
  - HTTP method
  - estimated cost amount
  - cost unit, currently `STC` or `USD`
  - cost-authoritative flag
  - pricing source, currently `pricing_catalog`, `cost_estimate`, or `explicit_test_estimate`
  - `fetchedAt` or `estimatedAt` timestamp fields
  - local policy decision
  - denial reason
  - local cap state
- Static paid endpoint policy metadata now includes HTTP method and expected pricing rule id.
- A mock-only preflight evaluator for future paid calls.
- Distinct fail-closed denial reasons for:
  - missing pricing
  - non-authoritative pricing
  - cap exceeded
  - endpoint not allowlisted
  - host not approved
  - paid execution disabled in this build
- A coupled auth-header boundary that evaluates endpoint allowlist, approved host, paid-mode state, pricing/preflight, and spend caps before auth headers can be constructed.
- Phase 4 mock-only tests for pricing/preflight, cap denial, endpoint denial, host denial, and disabled paid execution.

## What Was Intentionally Not Added

- No MCP tools.
- No MCP prompts.
- No paid resources.
- No ST-IM latest or history tool registration.
- No paid endpoint calls.
- No live endpoint calls.
- No API key validation call.
- No `/v1/pricing/catalog` network preflight.
- No `/v1/cost-estimate` call.
- No executable paid-call authorization.
- No x402, wallet, payment signing, payment retry, or payment authorization.
- No OAuth.
- No remote HTTP/SSE/Streamable HTTP MCP transport.
- No database access.
- No control-plane access.
- No dynamic MCP registration from `/v1/ai/tools`.

## Why Paid Tools Remain Blocked

The Phase 4 API contract memo confirms ST-IM latest/history route, auth, and schema facts. Follow-up user/API-discovery evidence now treats `GET /v1/cost-estimate` as a confirmed workflow-level preflight budgeting surface.

`/v1/pricing/catalog` is live cost metadata and may identify endpoint pricing rule ids, but it does not by itself prove a caller's current entitlement, quota, balance, or no-charge status immediately before a paid call. `GET /v1/cost-estimate` is intended for workflow-level preflight budgeting, but it still does not by itself authorize paid execution. Local policy gates, explicit paid enablement, endpoint allowlist checks, approved-host auth rules, and spend caps still apply before any future paid call.

Therefore this build keeps `PHASE4_PAID_EXECUTION_ENABLED=false` and `paidCallsAuthorizedInThisBuild=false`. Even when mock pricing and caps are satisfied, paid execution remains denied with `paid_execution_disabled`.

## Pricing/Preflight Policy Behavior

The internal preflight evaluator accepts synthetic or future API-derived metadata only. It never fetches pricing from the network.

The evaluator denies when:

- the endpoint/method/tool is not in static paid policy metadata
- the target URL is not the configured approved Stock Trends API origin
- paid mode or API-key configuration is unavailable
- estimated cost is missing or malformed
- estimated cost is not authoritative enough
- a catalog estimate lacks the expected endpoint pricing rule id
- any local cap would be exceeded
- paid execution is disabled in this build

The model records the selected pricing source, estimate timestamp, local decision, denial reason, and cap state for future paid-tool wrappers.

This branch does not integrate `GET /v1/cost-estimate` at runtime. A future branch should define safe MCP integration for that confirmed workflow-level budgeting surface, likely as a public planning/preflight tool or equivalent internal preflight step, before paid ST-IM latest/history execution is exposed.

## Spend Cap Behavior

Local spend policy remains conservative:

- per-session paid call cap defaults to `0`
- per-tool paid call cap defaults to `0`
- STC budget cap defaults to unset
- USD budget cap defaults to unset
- automatic paid retries remain disabled

A future paid call is denied when projected per-session or per-tool calls exceed configured caps. A nonzero STC or USD estimate is denied when the matching budget cap is unset or would be exceeded. No persistent or daily cap accounting was added.

## Endpoint Allowlist/Auth Coupling

Auth header construction is now coupled to the future paid execution boundary:

1. exact endpoint path and method must match static paid policy metadata
2. tool name must match that endpoint policy
3. target host must match the configured approved Stock Trends API origin
4. paid mode and API key must be configured
5. pricing/preflight must determine authoritative cost
6. local call and budget caps must pass
7. this build must authorize paid execution

Because step 7 is disabled in this branch, no runtime path can construct or send `X-API-Key`.

## Public Resources

The public resource registry is unchanged:

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

Public resource reads still use only public fetch headers and never send `Authorization`, `X-API-Key`, payment headers, or wallet headers.

## Tools And Prompts

The MCP server still registers:

- zero tools
- zero prompts

This remains true with no environment variables, with `STOCKTRENDS_API_KEY` alone, with `STOCKTRENDS_ENABLE_PAID_TOOLS=false`, with `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and no key, and with `STOCKTRENDS_ENABLE_PAID_TOOLS=true` plus a mock key.

## Validation Results

Validation commands run after implementation:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 7 test files and 76 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed |

## Deviations From The Phase 4 API Contract Memo

No intentional deviation.

This branch implements the recommended pricing/preflight foundation without registering ST-IM latest/history tools, without calling pricing/preflight endpoints, and without authorizing paid execution.

## Next Recommended Step

Proceed to a safe MCP integration design for `GET /v1/cost-estimate` before `implementation/phase4-first-paid-tool-stim-latest-history`. That future branch should define whether cost-estimate is exposed as a public planning/preflight tool, used as an internal preflight step, or both. Paid ST-IM execution should remain blocked until cost-estimate integration is paired with local policy gates, caps, endpoint allowlist, explicit paid enablement, and auth rules.
