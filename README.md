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

Public resources and the default/free mode described below are credential-free: no API key, subscription, or payment credential is required to install, inspect, or use them. The conditional paid ST-IM execution path is a separate, explicitly gated surface that is disabled by default (see [Conditional Paid ST-IM Tools](#conditional-paid-st-im-tools-subscriptionapi-key-execution)). An additional default-off x402 posture can expose the same paid semantic tool names. Relay plus challenge flags preserve the local mock-only behavior; a distinct third live flag may enable a capped, one-request no-key challenge path. Neither x402 mode accepts or forwards proof, sends a payment header, returns paid data, pays, or spends.

**New here?** Start with the [Default / Free Mode Quickstart](#default--free-mode-quickstart) below to install and run the server credential-free, then [Connect a local stdio MCP client](#connect-a-local-stdio-mcp-client) to wire it into an MCP client, and read [Paid Mode Configuration](#paid-mode-configuration) and the [Security Model](docs/SECURITY_MODEL.md) before setting any paid variable.

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

This `git clone` + `npm install` + `npm run build` sequence, followed by local stdio execution of the compiled `dist/server.js`, is the only supported install channel for this phase. There is no npm package, no registry publication, and no hosted MCP endpoint — packaging and publication are explicitly deferred, not omitted (see the [Phase 5E Launch/Distribution Readiness Design Memo](docs/PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md)).

No environment variables or `.env` file are required for this path. Do not set `STOCKTRENDS_ENABLE_PAID_TOOLS`, `STOCKTRENDS_API_KEY`, or `STOCKTRENDS_ENABLE_PAID_EXECUTION` while testing default/free mode.

Optional: `npm start` starts the local stdio server process directly and is mainly useful as a manual smoke check (it will sit waiting for JSON-RPC input on stdin). Stop it with Ctrl+C before launching the server via MCP Inspector below.

### Inspect with MCP Inspector (no API key)

After building (`npm run build`), point the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) at the compiled stdio server, with no paid-mode environment variables set:

```sh
npx @modelcontextprotocol/inspector node dist/server.js
```

In the Inspector UI, confirm:

- The tool list contains exactly `stocktrends_estimate_workflow_cost`, and the paid tools (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`, `stocktrends_get_selections_latest`, `stocktrends_get_market_regime_latest`, `stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`, `stocktrends_get_leadership_summary_latest`) are not visible.
- The prompts list is empty, if the client exposes a prompts panel.
- Public resources (for example `stocktrends://api/openapi`, `stocktrends://ai/context`) are listed and readable without any credential configured.

This check confirms the free/default boundary without requiring or triggering any paid execution.

For a fuller step-by-step Inspector procedure — default/free listing, paid-*exposed* listing without execution, and a rollback checklist — see the [Phase 5A MCP Inspector Validation Runbook](docs/PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md) (its paid-exposed surface and resource counts were correct when written for the Phase 4-era three-tool surface; current counts are documented in this README).

### Secret Safety (free mode)

Free/default mode needs no API key, so nothing secret is involved in this quickstart. Always test and demonstrate default mode without a key. The full credential-handling rules — placeholders only, never commit or paste a real key — are consolidated in the top-level [Secret Safety](#secret-safety) section.

## Connect a local stdio MCP client

This section wires the compiled server into an MCP client over local stdio. Build first (`npm run build`); every example below launches the compiled entry point with `command: "node"` and `args: ["<absolute-path-to-checkout>/dist/server.js"]`, where `<absolute-path-to-checkout>` is the absolute path to this repository on your machine. Every **primary** example in this section is free mode: no `STOCKTRENDS_*` variable is set, no API key is configured, and no spend is possible. Read [Secret Safety](#secret-safety) before adding any paid variable to a client configuration file.

### A. Claude Desktop

Free-mode `mcpServers` entry (no `env` block — credential-free by default):

```json
{
  "mcpServers": {
    "stocktrends": {
      "command": "node",
      "args": ["<absolute-path-to-checkout>/dist/server.js"]
    }
  }
}
```

Windows JSON paths must use either double backslashes (`"C:\\Users\\you\\stocktrends-mcp-server\\dist\\server.js"`) or forward slashes (`"C:/Users/you/stocktrends-mcp-server/dist/server.js"`) — a single backslash is not valid JSON.

The Claude Desktop configuration file location is client-version dependent; at the time of writing it is:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Verify these paths against your installed Claude Desktop version's current documentation before relying on them, since client versions can change file locations and schema.

**Optional paid-exposure variant (exposure only — not execution).** This adds the paid tool *definitions* to the client's tool list; it does not authorize or perform any paid API call:

```json
{
  "mcpServers": {
    "stocktrends": {
      "command": "node",
      "args": ["<absolute-path-to-checkout>/dist/server.js"],
      "env": {
        "STOCKTRENDS_ENABLE_PAID_TOOLS": "true",
        "STOCKTRENDS_API_KEY": "<your-api-key>"
      }
    }
  }
}
```

Exposure (`STOCKTRENDS_ENABLE_PAID_TOOLS` + a key) and execution (the separate `STOCKTRENDS_ENABLE_PAID_EXECUTION` flag, plus mandatory pricing preflight, nonzero caps, and a covering budget — see [Paid Mode Configuration](#paid-mode-configuration)) are two separate gates: this variant leaves execution unset, so exposure alone can never send a request or spend. See the [Phase 5A Operator Safety and Release Checklist](docs/PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md) §4 for the paid-execution *eligibility* checklist — it is not a live-execution runbook.

**Persisted-config credential warning.** A Claude Desktop config file is plaintext and persists on disk across restarts. If you place a real API key here for a deliberate, operator-supervised session, remove it again immediately afterward and restore the free-mode entry above — do not leave a real key sitting in a client configuration file.

### B. Claude Code

**Boundary note:** Claude Code is an agentic client, and Phase 5D approval does not extend to autonomous agent paid execution. The documented Claude Code path is therefore **free mode only**, where the only tool is credential-free and no spend is possible. Paid exposure/execution remains a separate, operator-shell, operator-supervised procedure under [Paid Mode Configuration](#paid-mode-configuration) and the eligibility checklist referenced above, and is deliberately not given a Claude Code recipe.

Register the server locally with the Claude Code CLI:

```sh
claude mcp add --transport stdio stocktrends -- node <absolute-path-to-checkout>/dist/server.js
```

This registers a free-mode stdio server with no `env` entries. Equivalently, a project-scoped `.mcp.json` entry has the same shape (an entry with `command` and `args` and no `type`/`url` field is read as a stdio server):

```json
{
  "mcpServers": {
    "stocktrends": {
      "command": "node",
      "args": ["<absolute-path-to-checkout>/dist/server.js"]
    }
  }
}
```

### C. Generic MCP stdio client

Any MCP client that supports local stdio servers can use this client-agnostic shape:

```json
{
  "command": "node",
  "args": ["<absolute-path-to-checkout>/dist/server.js"],
  "env": {}
}
```

**Optional paid-exposure variant** (same rules as Claude Desktop above — exposure only, execution flag absent):

```json
{
  "command": "node",
  "args": ["<absolute-path-to-checkout>/dist/server.js"],
  "env": {
    "STOCKTRENDS_ENABLE_PAID_TOOLS": "true",
    "STOCKTRENDS_API_KEY": "<your-api-key>"
  }
}
```

Exposure is not execution: no request and no spend occurs until `STOCKTRENDS_ENABLE_PAID_EXECUTION` is additionally set to `true` **and** the mandatory pricing preflight, nonzero local caps, and a covering budget cap all pass (see [Paid Mode Configuration](#paid-mode-configuration)). Paid execution is not documented here as a casual runbook; treat it as an eligibility checklist, not a copy-paste recipe.

### D. MCP Inspector as diagnostic reference

[MCP Inspector](https://github.com/modelcontextprotocol/inspector) remains a useful diagnostic/operator tool for confirming the server's tool, resource, and prompt surface — see [Inspect with MCP Inspector](#inspect-with-mcp-inspector-no-api-key) above — but it is **not the only, or the primary, installation path**. For everyday use, connect one of the clients in A–C above. The [Phase 5A MCP Inspector Validation Runbook](docs/PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md) documents a fuller Inspector procedure; its paid-exposed surface and resource counts were correct when written for the Phase 4-era three-tool surface and remain accurate history, but the current counts are documented in this README.

## Paid Mode Configuration

Paid tools are **disabled by default**. Nothing in this section is required to install, inspect, or use the server in default/free mode. This section explains how the paid ST-IM tools are *exposed* and, separately, how paid *execution* is gated. Read it before configuring any paid variable. Paid-mode posture is governed by [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) and [`docs/PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md`](docs/PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md).

**Paid tool exposure and paid execution are two separate gates.** Enabling exposure never, by itself, performs a paid call.

**Paid flag parsing is strict:** only the literal string `true` enables `STOCKTRENDS_ENABLE_PAID_TOOLS` or `STOCKTRENDS_ENABLE_PAID_EXECUTION`. The values `false`, `0`, `no`, and `off` disable them. Other values such as `1`, `yes`, or `on` fail startup with `invalid_config`. The execution flag is named `STOCKTRENDS_ENABLE_PAID_EXECUTION`; `STOCKTRENDS_ALLOW_PAID_EXECUTION` is not a recognized variable and setting it does nothing.

**Paid tool exposure requires both of:**

- `STOCKTRENDS_ENABLE_PAID_TOOLS=true`
- `STOCKTRENDS_API_KEY` configured

With both set, the server additionally registers the two paired paid ST-IM tool *definitions*, the two paired paid indicators tool *definitions*, the base selections tool *definition*, and the four market-context tool *definitions*, so the exposed tool set becomes exactly ten:

- `stocktrends_estimate_workflow_cost` — the credential-free planning tool (always present)
- `stocktrends_get_stim_latest` — paid ST-IM tool definition
- `stocktrends_get_stim_history` — paid ST-IM tool definition
- `stocktrends_get_indicators_latest` — paid indicators tool definition
- `stocktrends_get_indicators_history` — paid indicators tool definition
- `stocktrends_get_selections_latest` — paid base ST-IM selection universe tool definition
- `stocktrends_get_market_regime_latest` — paid market-context tool definition (regime)
- `stocktrends_get_market_regime_history` — paid market-context tool definition (regime)
- `stocktrends_get_breadth_sector_latest` — paid market-context tool definition (breadth)
- `stocktrends_get_leadership_summary_latest` — paid market-context tool definition (leadership)

Exposure does not change what the free planning tool does, and it does not send any API key. It only makes the nine paid tool definitions visible to the MCP client. The internal instrument resolver adds **no** public tool: it is a credential-free helper used before the paid boundary, so the default/free surface stays at exactly one tool.

**Paid execution additionally requires all of:**

- `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` — a distinct runtime flag from the exposure flag.
- The mandatory pricing preflight resolving (`STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` stays `true`).
- Explicit **nonzero** local caps (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` and `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`).
- A budget cap that covers the nonzero cost (`STOCKTRENDS_MAX_STC_PER_SESSION`, plus `STOCKTRENDS_MAX_USD_PER_SESSION` where a USD cost applies).

Enabling execution changes **call behavior, not tool count**. When execution is enabled and every gate passes, invoking a paid ST-IM, indicators, selections, or market-context tool may send one authorized request; when it is not enabled, or any resolution/limit/cap/preflight gate fails, the same tool fails closed with no request and no auth header.

The paid surface remains exactly ten tools in every configuration — `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`, `stocktrends_get_selections_latest`, `stocktrends_get_market_regime_latest`, `stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`, and `stocktrends_get_leadership_summary_latest`. The exposure and execution flags change visibility and behavior, never the tool count.

### Exposure vs Execution

| Concept | Meaning |
| --- | --- |
| **Exposure** | The nine paid tool *definitions* (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`, `stocktrends_get_selections_latest`, `stocktrends_get_market_regime_latest`, `stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`, `stocktrends_get_leadership_summary_latest`) are **visible** to the MCP client. |
| **Execution** | An actual authorized API request **may be sent** to the approved ST-IM, indicators, base-selections, or market-context endpoint when a paid tool is invoked and its gates pass (ST-IM/indicators additionally require a resolved canonical instrument identity; selections and market-context additionally enforce bounded always-sent limits). |

- The **execution gate is intentionally stricter** than the exposure gate. Making a tool definition visible is deliberately easier than authorizing a real, billable call.
- If execution is not enabled, or the caps / pricing preflight fail, the paid tools **fail closed**: no request is sent, no `X-API-Key` is attached, and a deterministic secret-free denial is returned.
- **Public resources and `stocktrends_estimate_workflow_cost` remain credential-free** in every mode. They never send an API key and are unaffected by the exposure or execution flags.

### Enable paid tool exposure (exposure only — no execution)

The example below exposes the paid tool *definitions* so an operator can confirm the ten-tool surface. It is for **tool exposure only**: it does **not** enable paid execution and must not be used to perform a live paid call.

```sh
# Exposure only: makes the nine paid ST-IM, indicators, base-selections, and
# market-context tool definitions visible.
# This does NOT authorize or perform any paid API call.
export STOCKTRENDS_ENABLE_PAID_TOOLS=true
export STOCKTRENDS_API_KEY="<your-api-key>"        # placeholder — never paste a real key
# Execution stays disabled (its default). Do not set this to true just to test exposure.
export STOCKTRENDS_ENABLE_PAID_EXECUTION=false
```

PowerShell equivalent (Windows):

```powershell
# Exposure only: makes the nine paid ST-IM, indicators, base-selections, and
# market-context tool definitions visible.
# This does NOT authorize or perform any paid API call.
$env:STOCKTRENDS_ENABLE_PAID_TOOLS = "true"
$env:STOCKTRENDS_API_KEY = "<your-api-key>"        # placeholder — never paste a real key
# Execution stays disabled (its default). Do not set this to true just to test exposure.
$env:STOCKTRENDS_ENABLE_PAID_EXECUTION = "false"
```

When the session is over, clear these variables rather than leaving them set:

```sh
# POSIX
unset STOCKTRENDS_ENABLE_PAID_TOOLS STOCKTRENDS_API_KEY STOCKTRENDS_ENABLE_PAID_EXECUTION
```

```powershell
# PowerShell
Remove-Item Env:STOCKTRENDS_ENABLE_PAID_TOOLS -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_ENABLE_PAID_EXECUTION -ErrorAction SilentlyContinue
```

To confirm no `STOCKTRENDS_*` variable remains set in the parent shell, without ever printing a value (names only):

```powershell
# PowerShell — names only, never values
Get-ChildItem Env: | Where-Object { $_.Name -like 'STOCKTRENDS_*' } | Select-Object -ExpandProperty Name
```

```sh
# POSIX — names only, never values
env | grep '^STOCKTRENDS_' | cut -d= -f1
```

**Never use `setx` or a system/user persistent environment variable for any paid variable, especially `STOCKTRENDS_API_KEY`.** `setx` writes to the Windows registry and persists across every future shell and reboot, defeating per-session credential hygiene; prefer the per-session `$env:`/`export` forms above and clear them when the session ends.

With this configuration the MCP client lists exactly ten tools. No paid request is sent, because the execution flag is `false` and no nonzero caps or budget cap are configured. This is enough to verify the paid *exposure* surface without any spend. A step-by-step procedure for confirming the paid-exposed surface under MCP Inspector — still without any live paid execution — is documented in the [Phase 5A MCP Inspector Validation Runbook](docs/PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md) (its counts reflect the Phase 4-era three-tool surface; current counts are documented in this README).

Paid *execution* requires the additional gates described above (execution flag, mandatory preflight, explicit nonzero caps, and a covering budget cap). A step-by-step live-execution runbook is intentionally **not** included here. For the operator-facing *preconditions* that must hold before any separately authorized live run — framed conceptually, with no live call commands — see the [Phase 5A Operator Safety and Release Checklist](docs/PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md). Do not enable paid execution merely to test installation — installation and tool-listing verification are fully demonstrable in free mode and in paid-exposed mode without execution.

### x402 challenge relay flags

PR #69 wires the PR #66 mock challenge helper through the existing nine paid
semantic tool names. The x402 relay remains default-off and mock-only. It adds
no new tool names, prompts, or resources; sends no network or resolver request;
uses no API key; accepts or forwards no proof; constructs no payment header;
returns no paid API data; and creates no payment or spend.

With `STOCKTRENDS_ENABLE_X402_RELAY=true`, the server lists the same ten-tool
shape as API-key paid exposure: the public planning tool plus the existing nine
paid semantic tools. When the challenge-execution flag is absent/off, those
nine invocations fail closed locally with `x402_challenge_unavailable`. When
both relay and challenge execution are literal `true`, each paid semantic tool
returns deterministic local, shape-only `payment_required` metadata. The four
symbol-dependent tools require canonical `symbol_exchange` in this mode so no
instrument lookup or resolve path can run. An identical repeated challenge call
in one server session fails closed with `x402_repeated_challenge_call`.

The x402 flags are `STOCKTRENDS_ENABLE_X402_RELAY`,
`STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION`, and
`STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY`, plus the unsupported
`STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING`. All default to off. Only literal
`true` enables the first two flags; `false`, `0`, `no`, and `off` disable them;
ambiguous truthy values such as `1`, `yes`, or `on` fail startup with
`invalid_config`. Proof forwarding is not supported in this build:
setting `STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING=true` fails closed. Active
x402 relay configuration cannot be combined with
`STOCKTRENDS_ENABLE_PAID_TOOLS`; mixed mode fails startup before any API-key
read. There is no fallback between x402 and API-key mode.

The live flag also uses strict literal-`true` parsing and requires both relay
and challenge flags to be literal `true`; otherwise startup fails with
`invalid_config` / `x402_live_challenge_not_enabled`. When all three gates are
true, an allowlisted semantic tool invocation may make exactly one no-key
`GET` to its corresponding Stock Trends API route after canonical-input,
proof, repeat, per-tool, and per-session gates pass. The request uses the
reviewed API origin, manual redirects, omitted credentials, no body, and only
safe `Accept`/`User-Agent` headers. It sends no API key, authorization header,
payment header, proof, or cookie and performs no resolver, catalog, resource,
retry, or fallback call.

Live results return approved status/route/method, header-name, top-level-key,
and field-category metadata only. Conditional challenge values, including the
`x-request-id` value, are omitted from both `structuredContent` and text. The
session reserves at most one live challenge per tool and three total; a
reservation remains consumed after network, status, or shape failure to prevent
retry loops. State is in-memory and resets on server restart.

See the [Phase 5F x402 Public Mock Wiring Implementation Notes](docs/PHASE5F_X402_PUBLIC_MOCK_WIRING_IMPLEMENTATION_NOTES.md) and [Phase 5F x402 Live No-Key Challenge Implementation Notes](docs/PHASE5F_X402_LIVE_NO_KEY_CHALLENGE_IMPLEMENTATION_NOTES.md).

## Secret Safety

These rules apply to every example, screenshot, recording, and shared artifact involving this server.

- **Never commit API keys.** No key belongs in this repository, a checked-in config, or any committed file.
- **Never paste a real API key** into README examples, screenshots, terminal recordings, shared chats, or issue reports. Use placeholders only (for example `<your-api-key>`).
- **Free/default mode needs no key.** It is fully functional with no API key, and the quickstart must be demonstrated without one.
- **Public resources and the `stocktrends_estimate_workflow_cost` planning tool never send an API key.** They are credential-free regardless of paid configuration.
- **Prefer per-session shell environment variables** (for example `export STOCKTRENDS_API_KEY=<your-api-key>` in a single shell) over writing a key into a persistent, machine-wide, or committed location for local inspection.
- **The API key, when paid tools are enabled, is sent only as the `X-API-Key` header** to the approved paid ST-IM, indicators, base `selections/latest`, and market-context (`market/regime/latest`, `market/regime/history`, `breadth/sector/latest`, `leadership/summary/latest`) endpoints, and only after every gate passes. The credential-free instrument resolver (`/v1/instruments/lookup`, `/v1/instruments/resolve`), the pricing catalog, and the `stocktrends://leadership/definitions` public resource never receive it. There is **no `Authorization: Bearer` fallback**.
- The key is never logged and never appears in errors, denials, or returned data.

Before a release, run the manual secret-safety scan in the [Phase 5A Operator Safety and Release Checklist](docs/PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md) to confirm no real key, populated auth header, or secret-bearing artifact was committed. Placeholders like `<your-api-key>` are allowed; real-looking secrets are not.

## Current Status

This repository implements a conservative local stdio MCP server for public-resource access, one public/free workflow cost-estimate planning tool, an internal auth/spend-control/pricing-preflight foundation, and the paired paid ST-IM tools with gated live subscription/API-key execution.

Included:

- Local stdio transport only.
- Public Stock Trends API resources and public/free planning tool.
- Fetch-on-request behavior; no startup API fetch is required.
- One public/free MCP planning tool: `stocktrends_estimate_workflow_cost`.
- Conditional paired paid ST-IM tools (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`), paired paid indicators tools (`stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`), the base ST-IM selection-universe tool (`stocktrends_get_selections_latest`), and the four market-context tools (`stocktrends_get_market_regime_latest`, `stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`, `stocktrends_get_leadership_summary_latest`), exposed only when paid mode is explicitly enabled with an API key (paid-exposed surface = ten tools). Live subscription/API-key execution (`X-API-Key` only) runs **only** behind the two-gate policy — the paid-tools flag, an API key, the distinct `STOCKTRENDS_ENABLE_PAID_EXECUTION` runtime flag, authoritative static pricing/preflight, family-scoped catalog reconciliation, and nonzero local caps (plus a covering budget) — and, for indicators, only after a bare/raw symbol has resolved credential-free to a single canonical identity, and, for selections and market-context, under list-shaped broad-sweep/limit-safety controls (always-sent bounded limits, one fetch, no bulk/retry, repeated-identical-call loop denial); otherwise it fails closed with no request and no auth/payment header. See the [Conditional Paid ST-IM Tools](#conditional-paid-st-im-tools-subscriptionapi-key-execution), [Conditional Paid Indicators Tools](#conditional-paid-indicators-tools-subscriptionapi-key-execution), [Conditional Paid Selections Tool](#conditional-paid-selections-tool-subscriptionapi-key-execution), and [Conditional Paid Market-Context Tools](#conditional-paid-market-context-tools-subscriptionapi-key-execution) sections.
- Zero MCP prompts.
- No API key requirement for the default/public surface.
- Default-off public mock x402 wiring through the existing nine paid semantic
  tool names, with local shape-only challenge results, canonical-symbol
  enforcement, repeated-identical-call denial, and no network/proof/payment/
  spend path.
- Default-off live no-key x402 challenge relay through those same nine semantic
  tools, enabled only by its distinct third flag and both prerequisite flags.
  It is capped at one request per tool and three per server session, relays
  shape metadata only, and has no API key, proof, payment header, payment,
  spend, paid output, resolver, retry, or fallback path.
- Internal paid-mode configuration, host enforcement, endpoint/tool allowlist coupling, `X-API-Key`-only auth construction, redaction, static endpoint pricing policy, in-memory per-session spend caps, single-attempt fetch with no retries, and mock-only validation.

Excluded:

- Live API validation in automated tests (execution paths exist in code but are exercised mock-only; live validation requires separate operator authorization after merge).
- x402 proof forwarding, paid fulfillment, payments, wallets, payment retries,
  payment headers, and OAuth. Live x402 support in this build is challenge-only,
  no-key, no-proof, no-payment, no-spend, and shape-metadata-only.
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
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | Paid tool exposure | `false` | Exposure flag. When `true` with a configured API key, exposes the two paired paid ST-IM tool *definitions*, the two paired paid indicators tool *definitions*, the base selections tool *definition*, and the four market-context tool *definitions* (total tools become 10; the internal instrument resolver adds no public tool). Never executes on its own — execution additionally requires `STOCKTRENDS_ENABLE_PAID_EXECUTION`. Not a secret. |
| `STOCKTRENDS_API_KEY` | Paid exposure + execution | None | **Secret — use a placeholder (`<your-api-key>`) in all docs, examples, screenshots, and shared artifacts; never commit or paste a real value.** Read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`; kept process-local. Sent **only** as the `X-API-Key` header to the approved origin + allowlisted paid ST-IM, indicators, base `selections/latest`, and market-context endpoints after every gate passes (no `Authorization: Bearer` fallback). Never sent for public resources (including `stocktrends://leadership/definitions`), the cost-estimate planning tool, the pricing catalog, or the credential-free instrument resolver; never logged or exposed in errors/denials/returned data. |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | Paid execution | `false` | Execution flag, distinct from the exposure flag. Live subscription/API-key calls to `GET /v1/stim/latest`, `GET /v1/stim/history`, `GET /v1/indicators/latest`, `GET /v1/indicators/history`, `GET /v1/selections/latest`, `GET /v1/market/regime/latest`, `GET /v1/market/regime/history`, `GET /v1/breadth/sector/latest`, and `GET /v1/leadership/summary/latest` require this to be `true` **and** the paid-tools flag, an API key, authoritative static pricing/preflight, family-scoped catalog reconciliation, and ≥1 nonzero call cap plus a budget cap covering the nonzero cost (indicators additionally require a safe resolved canonical identity; selections and market-context additionally enforce bounded always-sent limits and repeated-identical-call loop safety). The flag alone (no tools flag / no key) exposes and executes nothing. Not a secret. |
| `STOCKTRENDS_ENABLE_X402_RELAY` | x402 tool exposure | `false` | Only literal `true` exposes the existing nine paid semantic tool names without an API key (ten tools total with the planning tool). `false`, `0`, `no`, and `off` disable it; ambiguous truthy values fail startup. Invocations fail closed unless the challenge flag is also enabled. Cannot be mixed with `STOCKTRENDS_ENABLE_PAID_TOOLS`. Not a secret. |
| `STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION` | x402 challenge behavior | `false` | Only usable with `STOCKTRENDS_ENABLE_X402_RELAY=true`. Literal `true` preserves deterministic local PR #64 shape-only mock results unless the distinct live flag is also true. It performs no resolver lookup, auth, proof, payment, or spend. Not a secret. |
| `STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY` | Live no-key challenge request | `false` | Only literal `true` enables; requires both relay and challenge flags to be literal `true`, otherwise startup fails `x402_live_challenge_not_enabled`. Allows at most one no-key `GET` to the exact allowlisted route per accepted invocation, capped at one per tool and three total per server session. Manual redirects, omitted credentials, no body, no API key/auth/payment/proof header, no resolver/catalog/resource side call, no retry/fallback, no paid data, payment, or spend. Conditional challenge values are omitted. Not a secret. |
| `STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING` | Unsupported x402 proof forwarding | `false` | Proof forwarding remains unsupported. Off values are accepted; `true` fails startup with `invalid_config` / proof-forwarding-not-enabled posture. No proof schema, storage, forwarding, payment header, or verification is added. Not a secret. |
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
| `stocktrends://leadership/definitions` | `GET /v1/leadership/definitions` |

All ten resources are credential-free in every mode (fetch-on-request, no API key ever). `stocktrends://leadership/definitions` serves the leadership indicator and taxonomy definitions (verified public/zero-cost by a credential-free read) and is the interpretive companion to the paid leadership summary tool; it is never keyed, never on the paid allowlist, and never mirrored as a paid pricing rule.

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

When `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and `STOCKTRENDS_API_KEY` is configured, the server additionally registers the paired paid ST-IM tool *definitions*, the paired paid indicators tool *definitions*, the base selections tool *definition*, and the four market-context tool *definitions* (total tools become 10; see [Paid Mode Configuration](#paid-mode-configuration)). Otherwise only the public planning tool is registered. Exposure is independent of the execution flag.

| MCP tool | Endpoint | Execution |
| --- | --- | --- |
| `stocktrends_get_stim_latest` | `GET /v1/stim/latest` | Live subscription/API-key call only when all gates pass; otherwise fails closed. |
| `stocktrends_get_stim_history` | `GET /v1/stim/history` | Live subscription/API-key call only when all gates pass; otherwise fails closed. |

These two tools are always registered together (history-beside-latest rule). Every invocation validates input strictly (symbol identity with `symbol_exchange` precedence, exchange in `N,Q,A,B,T,I`, history date/`limit` bounds `1`–`2600`) **before** any preflight, auth, or fetch. A live call occurs **only** when `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, an API key is configured, authoritative static pricing/preflight resolves, the static pricing mirror is reconciled against the live `/v1/pricing/catalog` metadata (a **credential-free** read; static pricing alone cannot authorize a call, and a mismatch/unavailability fails closed), and nonzero local caps (plus a budget cap covering the nonzero cost) pass — then exactly one `GET` is sent with `X-API-Key` only (no `Authorization: Bearer`, no payment header, no automatic retries, no x402). The credential-bearing boundary is narrowed to the nine approved paid endpoints only (`/v1/stim/latest`, `/v1/stim/history`, `/v1/indicators/latest`, `/v1/indicators/history`, `/v1/selections/latest`, `/v1/market/regime/latest`, `/v1/market/regime/history`, `/v1/breadth/sector/latest`, `/v1/leadership/summary/latest`); the public instrument-discovery routes (`/v1/instruments/lookup`, `/v1/instruments/resolve`), the credential-free `/v1/leadership/definitions` resource route, the deferred selections routes (`/v1/selections/history`, `/v1/selections/published/*`), the deferred market-context routes (`/v1/market/regime/forecast`, `/v1/breadth/sector/history`, `/v1/leadership/rotation/history`), and any other non-promoted endpoint can never receive an `X-API-Key`. The symbol identity is sent to the API in hyphen form (`SYMBOL-EXCHANGE`); the underscore canonical form is never forwarded. Successful responses are wrapped with transparent MCP metadata (`paid_execution_authorized: true`, `api_request_sent: true`, `auth_header_sent: true`, `payment_header_sent: false`, `observed_cost: null`, `payment_status: null`) and preserve the API payload verbatim in `api_data`. Any gate failure returns a deterministic, secret-free denial with `paid_execution_authorized: false` and no request/auth/payment header. Automated validation is **mock-only**; no live API call runs in tests. See the [Phase 4 Paid ST-IM Live Execution (Subscription) Implementation Notes](docs/PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md) and [`docs/SECURITY_MODEL.md` §15](docs/SECURITY_MODEL.md).

## Conditional Paid Indicators Tools (subscription/API-key execution)

When paid tools are enabled with an API key, the server also registers the paired paid indicators tool *definitions* alongside the ST-IM pair (contributing to the exactly-ten-tool paid-exposed surface described in [Paid Mode Configuration](#paid-mode-configuration)). They are always registered together (history-beside-latest rule) and behave exactly like the ST-IM pair, with one addition: an **internal, credential-free instrument resolver** runs before any paid boundary.

| MCP tool | Endpoint | Execution |
| --- | --- | --- |
| `stocktrends_get_indicators_latest` | `GET /v1/indicators/latest` | Live subscription/API-key call only when a safe canonical identity resolves and all gates pass; otherwise fails closed. |
| `stocktrends_get_indicators_history` | `GET /v1/indicators/history` | Live subscription/API-key call only when a safe canonical identity resolves and all gates pass; otherwise fails closed. |

Inputs accept a canonical `symbol_exchange` (underscore form, e.g. `IBM_N`), an explicit `symbol` + `exchange` (exchange in `N,Q,A,B,T,I`), or a bare raw `symbol`, plus optional `cs_only` and — for history — `start`/`end` and `limit` (`1`–`2600`, API default `260` when omitted). Identity is resolved **credential-free before any paid boundary**:

- A canonical `symbol_exchange` is trusted directly (no discovery call) and sent to the API in hyphen form (`IBM-N`).
- An explicit `symbol` + `exchange` is verified via `GET /v1/instruments/resolve` using an explicit `prefer_exchange` equal to the supplied exchange — never the default `N`.
- A bare raw `symbol` is disambiguated via `GET /v1/instruments/lookup`: exactly one match resolves credential-free; **more than one match fails closed with the candidate `symbol_exchange` matches** and makes no paid call. The resolver deliberately does **not** rely on `/v1/instruments/resolve`'s default `prefer_exchange=N` for bare symbols, so the server never silently picks an exchange on your behalf.

Only after a single safe canonical identity exists does the tool run the same paid gates as ST-IM — authoritative static pricing (family-specific mirror: `indicators_latest_paid` `0.0035 STC`, `indicators_history_paid` `0.01 STC`), a **credential-free** reconciliation of that mirror against the live `/v1/pricing/catalog` metadata (static pricing alone never authorizes a call; a mismatch/unavailability fails closed), nonzero local caps, and the execution flag — then sends exactly one `GET` with `X-API-Key` only (no `Authorization: Bearer`, no payment header, no automatic retries, no x402). The instrument-discovery and catalog reads never receive the API key. The instrument resolver is **internal-only**: it adds no public MCP tool, so the default/free surface stays at exactly one tool. Successful responses preserve the API payload verbatim in `api_data` and add `mcp_metadata` including `instrument_resolution` (and, on ambiguity, `candidate_matches`); `observed_cost`/`payment_status` remain `null` and are never fabricated. Automated validation is **mock-only**; no live API call runs in tests. See the [Phase 5B Indicators Implementation Notes](docs/PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md).

## Conditional Paid Selections Tool (subscription/API-key execution)

When paid tools are enabled with an API key, the server also registers a single base ST-IM selection-universe tool alongside the ST-IM and indicators pairs (contributing to the exactly-ten-tool paid-exposed surface described in [Paid Mode Configuration](#paid-mode-configuration)). It behaves like the other paid tools with the same gate policy, plus **list-shaped broad-sweep/limit-safety controls** because it returns a universe/list rather than a single row. It is **exchange-scoped, not symbol-keyed**, so it uses no instrument resolver.

| MCP tool | Endpoint | Execution |
| --- | --- | --- |
| `stocktrends_get_selections_latest` | `GET /v1/selections/latest` | Live subscription/API-key call only when all gates pass and the limit is bounded; otherwise fails closed. |

This tool surfaces the **base ST-IM selection universe** (ranked by `prob13wk` by the API). It is **not** the strict published STIM Select list — that is a separate endpoint (`/v1/selections/published/latest`) that applies published thresholds. This tool never presents base rows as the published list, never applies published thresholds locally, and never ranks, thresholds, scores, filters, or otherwise recomputes rows locally; `mcp_metadata` carries base-universe provenance so the two surfaces cannot be conflated. No `selections/history`, `selections/published/*`, or public selections resource is added this increment.

Inputs (all optional, strict schema, unknown keys rejected): `exchange` (one of `N,Q,A,B,T,I`), `min_prob13wk` (`0`–`1`), `limit` (integer `1`–`250`, default `50`), `include_data` (default `false`), `include_mast` (default `false`), and `cs_only` (default `true`). `min_prob13wk`, `exchange`, `cs_only`, and the `include_*` flags are passed through to the API only and never applied locally.

Broad-sweep / limit safety (far tighter than the API's own `2000` default / `20000` max):

- An explicit `limit` is **always sent** (default `50`); the API's `2000` default can never apply. The hard maximum is `250`; a `limit` above `250`, below `1`, non-integer, an array, or any sentinel **fails closed before any pricing/auth/fetch** — never silently clamped. There is no all-rows/universe-sweep mode.
- **Exactly one `GET` per invocation** — no pagination, offset walking, auto-iteration across exchanges, bulk assembly, background refresh, or automatic retry on `429`/`5xx` (fail closed).
- Call caps default-deny and a covering `STOCKTRENDS_MAX_STC_PER_SESSION` is required for the `0.05 STC` cost. Repeated identical base selection calls within a session **fail closed** (`repeated_identical_selection_call`) rather than silently re-billing.

Pricing is a fresh, `selections`-family static mirror (`selections_latest_paid` `0.05 STC`) reconciled **credential-free** and **family-scoped** against the live `/v1/pricing/catalog` metadata (missing/duplicate rule, cost mismatch, or missing/unsupported/conflicting `STC` unit fails closed; an ST-IM/indicators/published mirror never satisfies it). When every gate passes, exactly one `GET` is sent with `X-API-Key` only (no `Authorization: Bearer`, no payment header, no x402, no retries). Successful responses preserve the API payload verbatim in `api_data` and add `mcp_metadata` including base-vs-published provenance, `effective_limit`, and the returned row count; `observed_cost`/`payment_status` remain `null` and are never fabricated. Automated validation is **mock-only**; no live API call runs in tests. See the [Phase 5C Selections/Latest Implementation Notes](docs/PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md).

## Conditional Paid Market-Context Tools (subscription/API-key execution)

When paid tools are enabled with an API key, the server also registers the four Phase 5D market-context tools alongside the prior families, bringing the paid-exposed surface to exactly ten tools. They behave like the other paid tools with the same gate policy, plus market-context limit-safety controls because the data is weekly-cadence and market-scoped. None of them is symbol-keyed, so no instrument resolver is involved.

| MCP tool | Endpoint | Cost | Limits (always sent) |
| --- | --- | --- | --- |
| `stocktrends_get_market_regime_latest` | `GET /v1/market/regime/latest` | `0.15 STC` | — (snapshot; strict empty input, unknown keys rejected) |
| `stocktrends_get_market_regime_history` | `GET /v1/market/regime/history` | `0.25 STC` | `limit` default `12`, hard max `52` (the API's own max); optional `start_date` (`YYYY-MM-DD`) passthrough |
| `stocktrends_get_breadth_sector_latest` | `GET /v1/breadth/sector/latest` | `0.1 STC` | `limit` default `50`, hard max `250`; `group_level` default `sector` always sent |
| `stocktrends_get_leadership_summary_latest` | `GET /v1/leadership/summary/latest` | `0.25 STC` | `limit_overall` default `50`, hard max `200`; `limit_bucket` default `20`, hard max `50` |

**Context, not advice.** These tools forward Stock Trends API-authored market context verbatim and never turn it into a recommendation: a regime label is **market context, not a trading recommendation**; breadth rows are **participation context, not confirmation signals to act on**; leadership tables are **rotation context, not picks**. The adapter performs no local regime calculation, breadth re-aggregation, or leadership re-ranking/re-bucketing/thresholding, and produces no buy/sell/hold/allocation or suitability output.

Additional input policy: `exchange` (one of `N,Q,A,B,T,I`), breadth's `cs_only`/`include_unknown`/`min_price`/`min_volume`, and leadership's `min_rsi`/`min_mt_cnt` (`0`–`500`) are validated passthroughs sent only when supplied so API defaults apply; none is applied locally. `weekdate` is deliberately **not exposed** on either latest tool (no snapshot time-travel that would reconstruct history through a latest route), and `vol_scale` (unbounded legacy multiplier) and `type` (no verified enum) are not exposed; all are rejected as unknown keys. Invalid/out-of-range/array/sentinel limits fail closed before any pricing/auth/fetch and are never clamped. Exactly one `GET` per invocation — no pagination, date-range sweeping, exchange iteration, bulk assembly, or automatic retry — and repeated identical calls (same tool + normalized parameters; the zero-parameter regime-latest signature is constant) fail closed (`repeated_identical_market_context_call`) rather than re-billing weekly data.

Pricing uses three fresh family-scoped static mirrors (`market_regime_latest` `0.15 STC` and `market_regime_history` `0.25 STC` in family `market` — the verified rule ids carry no `_paid` suffix; `breadth_sector_latest_paid` `0.1 STC` in family `breadth`; `leadership_summary_latest_paid` `0.25 STC` in family `leadership`), each reconciled **credential-free** against the live `/v1/pricing/catalog` metadata with the same fail-closed checks (missing/duplicate rule, endpoint/family/cost/unit mismatch, non-`paid` classification). The deferred routes `/v1/market/regime/forecast`, `/v1/breadth/sector/history` (API default/max `200000`/`500000` — never reachable through this adapter), and `/v1/leadership/rotation/history` are not implemented, not promoted, and denied `endpoint_not_allowlisted`. Successful responses preserve the API payload verbatim in `api_data` and add `mcp_metadata` with context-not-advice provenance, `effective_limits`, the returned row count where derivable, and the API-reported weekdate only when present; `observed_cost`/`payment_status` remain `null` and are never fabricated. Automated validation is **mock-only**; no live API call runs in tests. See the [Phase 5D Market-Context Implementation Notes](docs/PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md) and [`docs/SECURITY_MODEL.md` §17](docs/SECURITY_MODEL.md).

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
- [Phase 5A Operator Safety and Release Checklist](docs/PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
- [Phase 5B Indicators and Instrument Resolution Design Memo](docs/PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md)
- [Phase 5B Indicators Contract Verification Memo](docs/PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md)
- [Phase 5B Indicators Implementation Notes](docs/PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md)
- [Phase 5B Indicators Controlled Validation Plan](docs/PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md)
- [Phase 5B Indicators Production Readiness Signoff](docs/PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
- [Phase 5C Next Capability Selection Memo](docs/PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md)
- [Phase 5C Selections/Latest Design and Contract Verification Memo](docs/PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md)
- [Phase 5C Selections/Latest Implementation Notes](docs/PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md)
- [Phase 5C Selections/Latest Controlled Validation Plan](docs/PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md)
- [Phase 5C Selections/Latest Controlled Validation Report](docs/PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md)
- [Phase 5C Selections/Latest Production Readiness Signoff](docs/PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md)
- [Phase 5D MCP Launch Capability Roadmap and Available Endpoint Selection Memo](docs/PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md)
- [Phase 5D Market-Context Layer Design and Contract Verification Memo](docs/PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md)
- [Phase 5D Market-Context Implementation Notes](docs/PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md)
- [Phase 5D Market-Context Controlled Validation Plan](docs/PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_PLAN.md)
- [Phase 5D Market-Context Controlled Validation Report](docs/PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
- [Phase 5D Market-Context Production Readiness Signoff](docs/PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md)
- [Phase 5E Next Capability Selection Memo](docs/PHASE5E_NEXT_CAPABILITY_SELECTION_MEMO.md)
- [Phase 5E Launch/Distribution Readiness Design Memo](docs/PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md)
- [Phase 5E Operator Smoke-Test Runbook](docs/PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md)
- [Phase 5E Launch Release Checklist](docs/PHASE5E_LAUNCH_RELEASE_CHECKLIST.md)
- [Phase 5E Directory/Marketplace Metadata Readiness](docs/PHASE5E_DIRECTORY_METADATA_READINESS.md)
- [Phase 5E Controlled Local Client Validation Report](docs/PHASE5E_CONTROLLED_LOCAL_CLIENT_VALIDATION_REPORT.md)
- [Phase 5E Local Stdio Launch Readiness Signoff](docs/PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md)
- [Phase 5F x402 Relay Architecture Memo](docs/PHASE5F_X402_RELAY_ARCHITECTURE_MEMO.md)
- [Phase 5F x402 Contract Verification Plan](docs/PHASE5F_X402_CONTRACT_VERIFICATION_PLAN.md)
- [Phase 5F x402 Contract Verification Report](docs/PHASE5F_X402_CONTRACT_VERIFICATION_REPORT.md)
- [Phase 5F x402 Relay Implementation Design Memo](docs/PHASE5F_X402_RELAY_IMPLEMENTATION_DESIGN_MEMO.md)
- [Phase 5F x402 Challenge Relay Mock Implementation Notes](docs/PHASE5F_X402_CHALLENGE_RELAY_MOCK_IMPLEMENTATION_NOTES.md)
- [Phase 5F x402 Mock Validation Report](docs/PHASE5F_X402_MOCK_VALIDATION_REPORT.md)
- [Phase 5F x402 Public Challenge Relay Wiring Design Memo](docs/PHASE5F_X402_PUBLIC_CHALLENGE_RELAY_WIRING_DESIGN_MEMO.md)
- [Phase 5F x402 Public Mock Wiring Implementation Notes](docs/PHASE5F_X402_PUBLIC_MOCK_WIRING_IMPLEMENTATION_NOTES.md)
- [Phase 5F x402 Public Mock Wiring Validation Report](docs/PHASE5F_X402_PUBLIC_MOCK_WIRING_VALIDATION_REPORT.md)
- [Phase 5F x402 Live No-Key Challenge Relay Plan](docs/PHASE5F_X402_LIVE_NO_KEY_CHALLENGE_RELAY_PLAN.md)
- [Phase 5F x402 Live No-Key Challenge Implementation Notes](docs/PHASE5F_X402_LIVE_NO_KEY_CHALLENGE_IMPLEMENTATION_NOTES.md)
- [Phase 5F x402 Live No-Key Challenge Relay Validation Report](docs/PHASE5F_X402_LIVE_NO_KEY_CHALLENGE_RELAY_VALIDATION_REPORT.md)
- [Phase 5F x402 Live Challenge Contract-Drift Diagnosis](docs/PHASE5F_X402_LIVE_CHALLENGE_CONTRACT_DRIFT_DIAGNOSIS.md)
- [Phase 5F x402 API Challenge Contract Confirmation](docs/PHASE5F_X402_API_CHALLENGE_CONTRACT_CONFIRMATION.md)
- [Phase 5F x402 v2 Validator Reconciliation Implementation Notes](docs/PHASE5F_X402_V2_VALIDATOR_RECONCILIATION_IMPLEMENTATION_NOTES.md)
- [Phase 5F x402 Live Challenge Revalidation Report](docs/PHASE5F_X402_LIVE_CHALLENGE_REVALIDATION_REPORT.md)
- [Phase 5F x402 Value-Policy Mismatch Investigation](docs/PHASE5F_X402_VALUE_POLICY_MISMATCH_INVESTIGATION.md)
