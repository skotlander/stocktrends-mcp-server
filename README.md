# Stock Trends MCP Server

Local Model Context Protocol (MCP) adapter for public Stock Trends API resources.

## Architecture Boundary (What This Server Is)

This repository is a thin local stdio adapter over the front-facing Stock Trends API. It has no independent analytical authority of its own.

Authority flows in one direction only:

```
Stock Trends dataset
  -> Stock Trends API
  -> published Stock Trends API responses/artifacts
  -> MCP adapter (this repository)
  -> external MCP clients/agents
```

The MCP adapter:

- Does not recompute Stock Trends data, ST-IM, or indicators.
- Does not access the Stock Trends database or control plane directly.
- Does not generate investment advice, research, or trading guidance.
- Only translates reviewed, published Stock Trends API responses into MCP resource and tool responses.

Public resources and the default/free mode described below are credential-free: no API key, subscription, or payment credential is required to install, inspect, or use them. The conditional paid ST-IM execution path is a separate, explicitly gated surface that is disabled by default (see [Conditional Paid ST-IM Tools](#conditional-paid-st-im-tools-subscriptionapi-key-execution)).

## Default / Free Mode Quickstart

This is the recommended first path for installing or inspecting the server. In default mode, the server:

- Requires no API key.
- Performs no paid execution and creates no spend.
- Exposes exactly one MCP tool: `stocktrends_estimate_workflow_cost`.
- Makes all public resources available credential-free.
- Registers zero MCP prompts.

### Setup

Using only the existing project scripts:

```sh
git clone <repository-url>
cd stocktrends-mcp-server
npm install
npm run build
```

No environment variables or `.env` file are required for this path. Do not set `STOCKTRENDS_ENABLE_PAID_TOOLS`, `STOCKTRENDS_API_KEY`, or `STOCKTRENDS_ENABLE_PAID_EXECUTION` while testing default/free mode.

Optional: `npm start` starts the local stdio server process directly and is mainly useful as a manual smoke check (it will sit waiting for JSON-RPC input on stdin). Stop it with Ctrl+C before launching the server via MCP Inspector below.

### Inspect with MCP Inspector (no API key)

After building (`npm run build`), point the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) at the compiled stdio server, with no paid-mode environment variables set:

```sh
npx @modelcontextprotocol/inspector node dist/server.js
```

In the Inspector UI, confirm:

- The tool list contains exactly `stocktrends_estimate_workflow_cost`, and the paid tools (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`) are not visible.
- The prompts list is empty, if the client exposes a prompts panel.
- Public resources (for example `stocktrends://api/openapi`, `stocktrends://ai/context`) are listed and readable without any credential configured.

This check confirms the free/default boundary without requiring or triggering any paid execution.

For a fuller step-by-step Inspector procedure — default/free listing, paid-*exposed* listing without execution, and a rollback checklist — see the [Phase 5A MCP Inspector Validation Runbook](docs/PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md).

### Secret Safety (free mode)

Free/default mode needs no API key, so nothing secret is involved in this quickstart. Always test and demonstrate default mode without a key. The full credential-handling rules — placeholders only, never commit or paste a real key — are consolidated in the top-level [Secret Safety](#secret-safety) section.

## Paid Mode Configuration

Paid tools are **disabled by default**. Nothing in this section is required to install, inspect, or use the server in default/free mode. This section explains how the paid ST-IM tools are *exposed* and, separately, how paid *execution* is gated. Read it before configuring any paid variable. Paid-mode posture is governed by [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) and [`docs/PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md`](docs/PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md).

**Paid tool exposure and paid execution are two separate gates.** Enabling exposure never, by itself, performs a paid call.

**Paid tool exposure requires both of:**

- `STOCKTRENDS_ENABLE_PAID_TOOLS=true`
- `STOCKTRENDS_API_KEY` configured

With both set, the server additionally registers the two paired paid ST-IM tool *definitions*, so the exposed tool set becomes exactly three:

- `stocktrends_estimate_workflow_cost` — the credential-free planning tool (always present)
- `stocktrends_get_stim_latest` — paid ST-IM tool definition
- `stocktrends_get_stim_history` — paid ST-IM tool definition

Exposure does not change what the free planning tool does, and it does not send any API key. It only makes the two paid tool definitions visible to the MCP client.

**Paid execution additionally requires all of:**

- `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` — a distinct runtime flag from the exposure flag.
- The mandatory pricing preflight resolving (`STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` stays `true`).
- Explicit **nonzero** local caps (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` and `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`).
- A budget cap that covers the nonzero cost (`STOCKTRENDS_MAX_STC_PER_SESSION`, plus `STOCKTRENDS_MAX_USD_PER_SESSION` where a USD cost applies).

Enabling execution changes **call behavior, not tool count**. When execution is enabled and every gate passes, invoking a paid ST-IM tool may send one authorized request; when it is not enabled, or any cap/preflight gate fails, the same tool fails closed with no request and no auth header.

The paid surface remains exactly three tools in every configuration — `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, and `stocktrends_get_stim_history`. The exposure and execution flags change visibility and behavior, never the tool count. No additional paid tools are introduced.

### Exposure vs Execution

| Concept | Meaning |
| --- | --- |
| **Exposure** | The two paid ST-IM tool *definitions* (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`) are **visible** to the MCP client. |
| **Execution** | An actual authorized API request **may be sent** to the approved ST-IM endpoint when a paid tool is invoked. |

- The **execution gate is intentionally stricter** than the exposure gate. Making a tool definition visible is deliberately easier than authorizing a real, billable call.
- If execution is not enabled, or the caps / pricing preflight fail, the paid tools **fail closed**: no request is sent, no `X-API-Key` is attached, and a deterministic secret-free denial is returned.
- **Public resources and `stocktrends_estimate_workflow_cost` remain credential-free** in every mode. They never send an API key and are unaffected by the exposure or execution flags.

### Enable paid tool exposure (exposure only — no execution)

The example below exposes the paid tool *definitions* so an operator can confirm the three-tool surface. It is for **tool exposure only**: it does **not** enable paid execution and must not be used to perform a live paid call.

```sh
# Exposure only: makes the two paid ST-IM tool definitions visible.
# This does NOT authorize or perform any paid API call.
export STOCKTRENDS_ENABLE_PAID_TOOLS=true
export STOCKTRENDS_API_KEY="<your-api-key>"        # placeholder — never paste a real key
# Execution stays disabled (its default). Do not set this to true just to test exposure.
export STOCKTRENDS_ENABLE_PAID_EXECUTION=false
```

With this configuration the MCP client lists exactly three tools. No paid request is sent, because the execution flag is `false` and no nonzero caps or budget cap are configured. This is enough to verify the paid *exposure* surface without any spend. A step-by-step procedure for confirming this three-tool paid-exposed surface under MCP Inspector — still without any live paid execution — is documented in the [Phase 5A MCP Inspector Validation Runbook](docs/PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md).

Paid *execution* requires the additional gates described above (execution flag, mandatory preflight, explicit nonzero caps, and a covering budget cap). A step-by-step live-execution runbook and the paid-execution safety checklist are intentionally **not** included here; they are separate, later Phase 5A deliverables. Do not enable paid execution merely to test installation — installation and tool-listing verification are fully demonstrable in free mode and in paid-exposed mode without execution.

## Secret Safety

These rules apply to every example, screenshot, recording, and shared artifact involving this server.

- **Never commit API keys.** No key belongs in this repository, a checked-in config, or any committed file.
- **Never paste a real API key** into README examples, screenshots, terminal recordings, shared chats, or issue reports. Use placeholders only (for example `<your-api-key>`).
- **Free/default mode needs no key.** It is fully functional with no API key, and the quickstart must be demonstrated without one.
- **Public resources and the `stocktrends_estimate_workflow_cost` planning tool never send an API key.** They are credential-free regardless of paid configuration.
- **Prefer per-session shell environment variables** (for example `export STOCKTRENDS_API_KEY=<your-api-key>` in a single shell) over writing a key into a persistent, machine-wide, or committed location for local inspection.
- **The API key, when paid tools are enabled, is sent only as the `X-API-Key` header** to the approved paid ST-IM endpoints, and only after every gate passes. There is **no `Authorization: Bearer` fallback**.
- The key is never logged and never appears in errors, denials, or returned data.

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

All variables are optional; defaults keep the server in free mode. The **Affects** column shows whether a variable applies to all modes, to paid tool *exposure*, or to paid *execution* (see [Paid Mode Configuration](#paid-mode-configuration)). Only `STOCKTRENDS_API_KEY` is a secret.

| Variable | Affects | Default | Behavior & secret-safety notes |
| --- | --- | --- | --- |
| `STOCKTRENDS_API_BASE_URL` | All modes | `https://api.stocktrends.com` | Must be an approved Stock Trends HTTPS origin. Not a secret. |
| `STOCKTRENDS_MCP_TRANSPORT` | All modes | `stdio` | Only `stdio` is supported. Not a secret. |
| `STOCKTRENDS_MCP_LOG_LEVEL` | All modes | `warn` | Normal logs go to stderr, never stdout. Not a secret. |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | Paid tool exposure | `false` | Exposure flag. When `true` with a configured API key, exposes the two paired paid ST-IM tool *definitions* (total tools become 3). Never executes on its own — execution additionally requires `STOCKTRENDS_ENABLE_PAID_EXECUTION`. Not a secret. |
| `STOCKTRENDS_API_KEY` | Paid exposure + execution | None | **Secret — use a placeholder (`<your-api-key>`) in all docs, examples, screenshots, and shared artifacts; never commit or paste a real value.** Read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`; kept process-local. Sent **only** as the `X-API-Key` header to the approved origin + allowlisted paid ST-IM endpoint after every gate passes (no `Authorization: Bearer` fallback). Never sent for public resources or the cost-estimate planning tool; never logged or exposed in errors/denials/returned data. |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | Paid execution | `false` | Execution flag, distinct from the exposure flag. Live subscription/API-key calls to `GET /v1/stim/latest` and `GET /v1/stim/history` require this to be `true` **and** the paid-tools flag, an API key, authoritative static pricing/preflight, and ≥1 nonzero call cap plus a budget cap covering the nonzero cost. The flag alone (no tools flag / no key) exposes and executes nothing. Not a secret. |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | Paid execution | `true` | Pricing/preflight posture. Preflight is mandatory; setting this `false` denies paid execution (fail closed) rather than weakening the requirement. Not a secret. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | Paid execution | `0` | Per-session paid-call cap. `0` denies all paid calls; live execution requires an explicit nonzero value. In-memory per session; resets on restart. Not a secret. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | Paid execution | `0` | Per-tool paid-call cap. `0` denies; requires an explicit nonzero value. In-memory per session; resets on restart. Not a secret. |
| `STOCKTRENDS_MAX_STC_PER_SESSION` | Paid execution | None | STC budget cap. A nonzero STC cost with no STC cap is denied. Because ST-IM rules are nonzero, a budget cap is effectively mandatory. Not a secret. |
| `STOCKTRENDS_MAX_USD_PER_SESSION` | Paid execution | None | USD budget cap. A nonzero USD cost with no USD cap is denied. Not a secret. |

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
- [Phase 5A MCP Inspector Validation Runbook](docs/PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
