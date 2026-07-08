# Stock Trends MCP Server

Local Model Context Protocol (MCP) adapter for public Stock Trends API resources.

## Current Status

Phase 4 implements a conservative local stdio MCP server for public-resource access, one public/free workflow cost-estimate planning tool, an internal auth/spend-control/pricing-preflight foundation, and the paired paid ST-IM tools with gated live subscription/API-key execution.

Included:

- Local stdio transport only.
- Public Stock Trends API resources and public/free planning tool.
- Fetch-on-request behavior; no startup API fetch is required.
- One public/free MCP planning tool: `stocktrends_estimate_workflow_cost`.
- Conditional paired paid ST-IM tools (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`), exposed only when paid mode is explicitly enabled with an API key. Live subscription/API-key execution (`X-API-Key` only) runs **only** behind the two-gate policy — the paid-tools flag, an API key, the distinct `STOCKTRENDS_ENABLE_PAID_EXECUTION` runtime flag, authoritative static pricing/preflight, and nonzero local caps — and otherwise fails closed with no request and no auth/payment header. See the [Conditional Paid ST-IM Tools](#conditional-paid-st-im-tools-subscriptionapi-key-execution) section.
- Zero MCP prompts.
- No API key requirement for the default/public surface.
- Internal paid-mode configuration, host enforcement, endpoint/tool allowlist coupling, `X-API-Key`-only auth construction, redaction, static endpoint pricing policy, in-memory per-session spend caps, single-attempt fetch with no retries, and mock-only validation.

Excluded:

- Live API validation in automated tests (execution paths exist in code but are exercised mock-only; live validation requires separate operator authorization after merge).
- x402, wallets, payment retries, payment headers, and OAuth.
- `Authorization: Bearer` fallback.
- Remote HTTP/SSE/Streamable HTTP hosting.
- Database or control-plane access.
- Dynamic MCP registration from `/v1/ai/tools` or `/v1/workflows`.
- Intelligence Agent recomputation, generated guidance, generated research, or a parallel reasoning layer.

## Authority Boundary

The future server must be a thin adapter over the canonical Stock Trends API. It must not query Stock Trends databases directly, recompute ST-IM or indicators, create selections or rankings, generate research or guidance, bypass API authentication/pricing/metering/payment rules, or create a parallel intelligence layer.

Published Stock Trends API responses and API-served Intelligence Agent artifacts remain authoritative. The MCP adapter only translates reviewed public API resources into MCP resource responses.

## Local Development

Work in a dedicated branch or worktree. Do not modify `main` directly.

Never store API keys, bearer tokens, payment headers, wallet material, database credentials, or other secrets in this repository.

Install dependencies:

```sh
npm install
```

Run validation:

```sh
npm run typecheck
npm test
npm run build
```

Start the built stdio MCP server:

```sh
npm run build
npm start
```

For local TypeScript execution during development:

```sh
npm run dev
```

Do not run the stdio server directly in a terminal expecting human-readable output. stdout is reserved for MCP JSON-RPC messages.

## Environment Variables

| Variable | Required | Default | Current behavior |
| --- | --- | --- | --- |
| `STOCKTRENDS_API_BASE_URL` | No | `https://api.stocktrends.com` | Must be an approved Stock Trends HTTPS origin. |
| `STOCKTRENDS_MCP_TRANSPORT` | No | `stdio` | Only `stdio` is supported. |
| `STOCKTRENDS_MCP_LOG_LEVEL` | No | `warn` | Normal logs go to stderr, never stdout. |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | No | `false` | Exposure flag. When `true` with a configured API key, exposes the paired paid ST-IM tool *definitions* (total tools become 3). Never executes on its own — execution additionally requires `STOCKTRENDS_ENABLE_PAID_EXECUTION`. |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | No | `false` | Execution flag. Live subscription/API-key calls to `GET /v1/stim/latest` and `GET /v1/stim/history` require this to be `true` **and** the paid-tools flag, an API key, authoritative static pricing/preflight, and ≥1 nonzero call cap plus a budget cap covering the nonzero cost. The flag alone (no tools flag / no key) exposes and executes nothing. |
| `STOCKTRENDS_API_KEY` | No | None | Read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`; kept process-local. Sent **only** as `X-API-Key` to the approved origin + allowlisted paid ST-IM endpoint after every gate passes. Never sent for public resources or the cost-estimate planning tool; never logged or exposed in errors/denials/returned data. |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | No | `true` | Pricing/preflight posture. Preflight is mandatory; setting this `false` denies paid execution (fail closed) rather than weakening the requirement. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | No | `0` | Per-session paid-call cap. `0` denies all paid calls; live execution requires an explicit nonzero value. In-memory per session; resets on restart. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | No | `0` | Per-tool paid-call cap. `0` denies; requires an explicit nonzero value. In-memory per session; resets on restart. |
| `STOCKTRENDS_MAX_STC_PER_SESSION` | No | None | STC budget cap. A nonzero STC cost with no STC cap is denied. Because ST-IM rules are nonzero, a budget cap is effectively mandatory. |
| `STOCKTRENDS_MAX_USD_PER_SESSION` | No | None | USD budget cap. A nonzero USD cost with no USD cap is denied. |

## Public Resources

The server registers these resources:

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

Candidate intelligence resources remain excluded until no-key public verification succeeds:

| Excluded candidate endpoint | Reason |
| --- | --- |
| `GET /v1/intelligence/discovery` | No-key verification returned `503 application/json` during Phase 1 and Phase 2 checks on 2026-07-07. |
| `GET /v1/intelligence/editorial/latest/preview` | No-key verification returned `503 application/json` during Phase 1 and Phase 2 checks on 2026-07-07. |

## Public Planning Tools

The server registers one public/free MCP planning tool:

| MCP tool | Backing endpoint | Purpose |
| --- | --- | --- |
| `stocktrends_estimate_workflow_cost` | `GET /v1/cost-estimate` | Estimate workflow-level cost for budgeting/planning before paid execution. |

This tool sends no API key or auth header, does not call paid endpoints, does not call `/v1/pricing/catalog`, does not authorize paid execution or payment, and does not implement x402, wallet, OAuth, remote MCP, database, or control-plane behavior.

## Conditional Paid ST-IM Tools (subscription/API-key execution)

When `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and `STOCKTRENDS_API_KEY` is configured, the server additionally registers the paired paid ST-IM tool *definitions* (total tools become 3). Otherwise only the public planning tool is registered. Exposure is independent of the execution flag.

| MCP tool | Endpoint | Execution |
| --- | --- | --- |
| `stocktrends_get_stim_latest` | `GET /v1/stim/latest` | Live subscription/API-key call only when all gates pass; otherwise fails closed. |
| `stocktrends_get_stim_history` | `GET /v1/stim/history` | Live subscription/API-key call only when all gates pass; otherwise fails closed. |

These two tools are always registered together (history-beside-latest rule). Every invocation validates input strictly (symbol identity with `symbol_exchange` precedence, exchange in `N,Q,A,B,T,I`, history date/`limit` bounds `1`–`2600`) **before** any preflight, auth, or fetch. A live call occurs **only** when `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, an API key is configured, authoritative static pricing/preflight resolves, the static pricing mirror is reconciled against the live `/v1/pricing/catalog` metadata (a **credential-free** read; static pricing alone cannot authorize a call, and a mismatch/unavailability fails closed), and nonzero local caps (plus a budget cap covering the nonzero cost) pass — then exactly one `GET` is sent with `X-API-Key` only (no `Authorization: Bearer`, no payment header, no automatic retries, no x402). The credential-bearing boundary is narrowed to `/v1/stim/latest` and `/v1/stim/history` only; indicator and any other endpoints can never receive an `X-API-Key`. The symbol identity is sent to the API in hyphen form (`SYMBOL-EXCHANGE`); the underscore canonical form is never forwarded. Successful responses are wrapped with transparent MCP metadata (`paid_execution_authorized: true`, `api_request_sent: true`, `auth_header_sent: true`, `payment_header_sent: false`, `observed_cost: null`, `payment_status: null`) and preserve the API payload verbatim in `api_data`. Any gate failure returns a deterministic, secret-free denial with `paid_execution_authorized: false` and no request/auth/payment header. Automated validation is **mock-only**; no live API call runs in tests. See the [Phase 4 Paid ST-IM Live Execution (Subscription) Implementation Notes](docs/PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md) and [`docs/SECURITY_MODEL.md` §15](docs/SECURITY_MODEL.md).

## Documentation

- [Architecture Decisions](docs/ARCHITECTURE_DECISIONS.md)
- [MCP Server Architecture](docs/MCP_SERVER_ARCHITECTURE.md)
- [API Capability Coverage Audit](docs/API_CAPABILITY_COVERAGE_AUDIT.md)
- [Security Model](docs/SECURITY_MODEL.md)
- [Phase 1 Implementation Memo](docs/PHASE1_STDIO_PUBLIC_RESOURCES_IMPLEMENTATION_MEMO.md)
- [Phase 1 Validation Report](docs/PHASE1_VALIDATION_REPORT.md)
- [Phase 1 Implementation Notes](docs/PHASE1_IMPLEMENTATION_NOTES.md)
- [Phase 2 Public Metadata and Paid Tool Boundary Memo](docs/PHASE2_PUBLIC_METADATA_AND_PAID_TOOL_BOUNDARY_MEMO.md)
- [Phase 2 Public Metadata Implementation Notes](docs/PHASE2_PUBLIC_METADATA_IMPLEMENTATION_NOTES.md)
- [Phase 3 Paid Tools Auth and Spend Design Memo](docs/PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md)
- [Phase 3 Paid Auth Foundation Implementation Notes](docs/PHASE3_PAID_AUTH_FOUNDATION_IMPLEMENTATION_NOTES.md)
- [Phase 4 First Paid Tool Contract Memo](docs/PHASE4_FIRST_PAID_TOOL_CONTRACT_MEMO.md)
- [Phase 4 API Contract Confirmation Memo](docs/PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
- [Phase 4 Pricing/Preflight Foundation Implementation Notes](docs/PHASE4_PRICING_PREFLIGHT_FOUNDATION_IMPLEMENTATION_NOTES.md)
- [Phase 4 Pricing/Preflight Foundation Validation Report](docs/PHASE4_PRICING_PREFLIGHT_FOUNDATION_VALIDATION_REPORT.md)
- [Phase 4 Cost Estimate MCP Integration Memo](docs/PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md)
- [Phase 4 Cost Estimate Planning Tool Implementation Notes](docs/PHASE4_COST_ESTIMATE_PLANNING_TOOL_IMPLEMENTATION_NOTES.md)
- [Phase 4 Cost Estimate Planning Tool Validation Report](docs/PHASE4_COST_ESTIMATE_PLANNING_TOOL_VALIDATION_REPORT.md)
- [Phase 4 First Paid ST-IM Tool Preflight Design Memo](docs/PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md)
- [Phase 4 Paid ST-IM Foundation (No Execution) Implementation Notes](docs/PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md)
- [Phase 4 Paid ST-IM Foundation (No Execution) Validation Report](docs/PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_VALIDATION_REPORT.md)
- [Phase 4 Paid ST-IM Live Execution Design Memo](docs/PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
- [Phase 4 Paid ST-IM Live Execution (Subscription) Implementation Notes](docs/PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md)
- [Phase 4 Paid ST-IM Live Execution (Subscription) Validation Report](docs/PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md)
