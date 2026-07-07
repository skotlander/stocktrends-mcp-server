# Phase 3 Paid Auth Foundation Validation Report

Validation date: 2026-07-07

## 1. Purpose

This report records validation of the merged Phase 3 paid-auth foundation for the Stock Trends MCP Server.

Phase 3 validates that paid-mode configuration, credential gating, approved-host auth scaffolding, secret redaction, static paid endpoint policy metadata, and spend/preflight policy scaffolding have been introduced without changing the visible MCP capability surface.

This report is documentation only. It does not implement runtime code, add tests, add MCP tools, add MCP prompts, call endpoints, use API keys, test x402 payments, inspect secrets, or change the server capability surface.

## 2. Validated Architecture Boundary

The controlling authority boundary remains:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin adapter over the front-facing Stock Trends API. The Phase 3 foundation does not make the MCP server any of the following:

- Direct database client.
- Control-plane client.
- Pricing authority.
- Payment authority.
- API recomputation layer.
- Intelligence Agent recomputation layer.
- Parallel reasoning engine.

Published Stock Trends API responses and API-served Intelligence Agent artifacts remain authoritative. The MCP adapter may expose reviewed public API-authored metadata and may prepare local policy gates for future paid calls, but it must not compute indicators, ST-IM, selections, rankings, pricing, guidance, research, editorial conclusions, payment authorization, or investment advice.

## 3. Current Merged Behavior

The current merged MCP server behavior is:

- Local stdio transport only.
- 9 public MCP resources.
- Zero MCP tools.
- Zero MCP prompts.
- No paid endpoint calls.
- No x402 behavior.
- No wallet handling.
- No OAuth.
- No remote MCP transport.
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

## 4. Phase 3 Foundation Behavior

Phase 3 added explicit paid-mode foundation behavior:

- `STOCKTRENDS_ENABLE_PAID_TOOLS` is the local paid-mode opt-in flag and defaults to disabled.
- `STOCKTRENDS_API_KEY` is read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.
- API key presence alone does not enable paid mode, register tools, register prompts, send auth headers, or authorize paid calls.
- `STOCKTRENDS_ENABLE_PAID_TOOLS=true` with a missing or blank API key fails closed for paid-mode state as `blocked_missing_api_key`.
- The missing-key paid-mode state does not break public resource registration or public resource reads.
- `STOCKTRENDS_ENABLE_PAID_TOOLS=true` with an API key reaches a configured foundation state, but this build still registers no paid tools.
- Public resources remain available without an API key.

The visible MCP surface remains unchanged in all Phase 3 paid-mode configurations: 9 public resources, zero tools, and zero prompts.

## 5. Public Resource Safety

All 9 public resources remain unchanged from the validated Phase 2 public resource surface.

Public resource reads remain credential-free. They send only public fetch headers such as `Accept: application/json` and `User-Agent: stocktrends-mcp-server/1.0`.

Public resource reads never send:

- `Authorization`.
- `X-API-Key`.
- Secret headers.
- Auth headers.
- Payment headers.
- Wallet headers.

Public resource behavior remains independent of paid-mode configuration. Public resources still work when no API key is configured, when an API key is present without the paid flag, when the paid flag is true but the key is missing, and when the paid flag is true with a key.

## 6. Paid-Tool Exposure Status

Phase 3 exposes no paid runtime behavior.

Validated exposure status:

- Zero MCP tools.
- Zero MCP prompts.
- No paid endpoint calls.
- No pricing preflight execution.
- No x402 behavior.
- No wallet handling.
- No OAuth behavior.
- No paid behavior activated in this build.

The static paid endpoint metadata is not an MCP tool registry. It does not dynamically register tools, does not make paid calls, and does not authorize paid execution.

## 7. Host and Secret Safety

Phase 3 added an approved-host auth helper for future paid calls.

The helper is constrained as follows:

- It derives the approved auth target from the validated `STOCKTRENDS_API_BASE_URL`.
- It requires HTTPS.
- It requires exact origin match with the configured Stock Trends API origin.
- It refuses non-approved hosts.
- It refuses URL credential and fragment-bearing targets.
- It is not used by public resource reads.
- It does not leak secrets in errors.

Secret redaction is present for API-key, auth-header, bearer-token, payment-header, wallet-key, private-key, database URL, and environment-like secret text shapes. Logs and safe error messages redact sensitive values before output.

The logger remains stderr-only. It does not write normal logs to stdout, preserving stdout for MCP JSON-RPC messages.

## 8. Spend/Preflight Foundation

Phase 3 added spend and preflight policy scaffolding only. It does not add executable paid-call policy.

The foundation includes:

- Static paid policy metadata for likely future ST-IM and indicator latest/history tool pairs.
- Per-session paid-call cap scaffolding.
- Per-tool paid-call cap scaffolding.
- STC placeholder budget policy.
- USD placeholder budget policy.
- Required-pricing-preflight policy metadata.
- No automatic paid retries.

Default caps do not authorize paid calls. In this no-tools build, `paidCallsAuthorizedInThisBuild=false` remains the hard blocker that prevents paid execution.

The pricing/preflight gate denies execution unless a future policy both determines pricing and authorizes local spend. No executable pricing endpoint, cost-estimate endpoint, paid endpoint, x402 endpoint, or payment endpoint call exists in this build.

The existing `stocktrends://pricing/catalog` public resource remains passive planning metadata only. It is not a pricing authority for execution and does not authorize paid calls.

## 9. Automated Validation

Implementation validation recorded the following passing checks:

- `npm run typecheck` passed.
- `npm test` passed, 6 test files and 64 tests.
- `npm run build` passed.
- `git diff --check` passed with normal CRLF working-copy warnings only.

These checks support the Phase 3 validation result but do not broaden the validated capability boundary beyond local stdio, public resources, zero tools, zero prompts, and internal no-tools paid-auth foundation scaffolding.

## 10. Known Limitations

Known limitations after Phase 3:

- No paid tools are implemented yet.
- No paid endpoint has been called.
- API key header contract still requires confirmation before paid calls execute.
- Pricing/preflight authority still requires confirmation.
- Spend cap defaults still require final policy decision.
- x402 remains deferred.
- Remote MCP remains deferred.
- Wallet handling remains deferred.
- OAuth remains deferred.
- No executable pricing/preflight endpoint calls exist.
- No paid-call persistence, daily budget accounting, or hosted/tenant spend model exists.

These limitations are intentional. They preserve the current safety boundary and prevent a no-tools foundation branch from silently becoming paid runtime exposure.

## 11. Decision

Phase 3 paid-auth foundation is validated and complete.

The merged server is validated as a local stdio MCP server exposing 9 public resources, zero tools, zero prompts, no paid endpoint calls, no x402, no wallet handling, no OAuth, no remote transport, no database access, no control-plane access, and no dynamic registration from `GET /v1/ai/tools`.

The paid-auth foundation is validated as internal scaffolding only. It does not activate paid behavior in this build.

## 12. Recommended Next Step

The recommended next phase is architecture:

```text
architecture/phase4-first-paid-tool-contract
```

Do not proceed directly to broad paid-tool implementation.

The next phase should define the first actual paid tool contract before runtime exposure. It should settle, at minimum:

- Exact route names.
- Exact auth header contract.
- Pricing/preflight contract.
- Endpoint allowlist coupling.
- Latest/history pairing.
- Output/provenance contract.
- Spend cap defaults.
- Tests required before paid calls execute.

The conservative path is to design one tightly scoped first paid-tool contract, including its paired history/latest policy where applicable, before registering any paid MCP tool or executing any paid API call.
