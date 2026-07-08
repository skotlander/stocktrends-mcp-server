# Stock Trends MCP Server

Local Model Context Protocol (MCP) adapter for public Stock Trends API resources.

## Current Status

Phase 4 implements a conservative local stdio MCP server for public-resource access, one public/free workflow cost-estimate planning tool, an internal auth/spend-control/pricing-preflight foundation, and the paired paid ST-IM tool *foundation* with paid execution hard-disabled.

Included:

- Local stdio transport only.
- Public Stock Trends API resources and public/free planning tool only.
- Fetch-on-request behavior; no startup API fetch is required.
- One public/free MCP planning tool: `stocktrends_estimate_workflow_cost`.
- Conditional paired paid ST-IM tool *definitions* (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`) that are exposed only when paid mode is explicitly enabled with an API key, and whose every invocation fails closed at the hard paid-execution-disabled gate (no live paid call, no auth header). See the [Conditional Paid ST-IM Tool Foundation](#conditional-paid-st-im-tool-foundation-no-execution) section.
- Zero MCP prompts.
- No API key requirement for the default/public surface.
- Internal paid-mode configuration, host enforcement, endpoint allowlist/auth coupling, redaction, paid endpoint policy metadata, spend caps, and mock-only pricing/preflight policy scaffolding for a future branch.

Excluded:

- Live paid execution (the hard paid-execution-disabled gate remains active).
- Paid endpoints.
- API-key-required calls or API-key forwarding.
- x402, wallets, payment retries, and OAuth.
- Remote HTTP/SSE/Streamable HTTP hosting.
- Database or control-plane access.
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
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | No | `false` | When `true` with a configured API key, exposes the paired paid ST-IM tool *definitions* only. Paid execution stays hard-disabled: every invocation fails closed and sends no request. |
| `STOCKTRENDS_API_KEY` | No | None | Read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`; kept process-local and never sent — not for public resources, not for the cost-estimate planning tool, and not for the paid ST-IM foundation tools (execution is disabled). |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | No | `0` | Future local paid-call cap scaffold only; no paid calls are authorized in this build. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | No | `0` | Future per-tool paid-call cap scaffold only; no paid tools are registered in this build. |
| `STOCKTRENDS_MAX_STC_PER_SESSION` | No | None | Future STC budget cap scaffold only; no pricing/preflight network calls or paid execution are authorized in this build. |
| `STOCKTRENDS_MAX_USD_PER_SESSION` | No | None | Future USD budget cap scaffold only; no pricing/preflight network calls or paid execution are authorized in this build. |

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

## Conditional Paid ST-IM Tool Foundation (no execution)

When `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and `STOCKTRENDS_API_KEY` is configured, the server additionally registers the paired paid ST-IM tool *definitions* (total tools become 3). Otherwise only the public planning tool is registered.

| MCP tool | Intended endpoint | Status in this build |
| --- | --- | --- |
| `stocktrends_get_stim_latest` | `GET /v1/stim/latest` | Foundation only; invocation fails closed at the hard paid-execution-disabled gate. |
| `stocktrends_get_stim_history` | `GET /v1/stim/history` | Foundation only; invocation fails closed at the hard paid-execution-disabled gate. |

These two tools are always registered together (history-beside-latest rule). Invocation validates input strictly (symbol identity with `symbol_exchange` precedence, exchange in `N,Q,A,B,T,I`, history date/limit bounds) before any preflight, then returns a deterministic fail-closed response that makes explicit: `paid_execution_authorized: false`, no API request was sent, and no auth or payment header was constructed. No real `X-API-Key` can be sent in this build. See the [Phase 4 Paid ST-IM Foundation (No Execution) Implementation Notes](docs/PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md).

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
