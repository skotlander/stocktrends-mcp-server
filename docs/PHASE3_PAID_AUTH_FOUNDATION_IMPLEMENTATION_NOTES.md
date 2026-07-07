# Phase 3 Paid Auth Foundation Implementation Notes

Implementation date: 2026-07-07

## Scope

This branch implements the Phase 3 paid-auth and spend-control foundation only. It does not expose paid MCP runtime tools.

The validated visible MCP surface remains:

- 9 public resources.
- Zero MCP tools.
- Zero MCP prompts.
- Local stdio transport only.
- No paid endpoint calls.
- No x402, wallet, OAuth, remote MCP, database, or control-plane behavior.

## What Was Added

- `STOCKTRENDS_ENABLE_PAID_TOOLS` parsing with a default of false.
- `STOCKTRENDS_API_KEY` parsing only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.
- Internal paid-mode config states:
  - `disabled`
  - `blocked_missing_api_key`
  - `configured_no_tools_registered`
- A future paid auth helper that can construct `X-API-Key` headers only for the configured Stock Trends API origin.
- Static paid endpoint policy metadata for the first likely paid data pair candidates:
  - `/v1/stim/latest`
  - `/v1/stim/history`
  - `/v1/indicators/latest`
  - `/v1/indicators/history`
- History-beside-latest metadata for ST-IM and indicators latest tools.
- Local spend policy scaffolding:
  - per-session paid-call cap
  - per-tool paid-call cap
  - optional STC cap placeholder
  - optional USD cap placeholder
  - no automatic paid retries
  - `paidCallsAuthorizedInThisBuild=false`
- Secret redaction for API-key, auth-header, payment-header, wallet-key, and environment-like text shapes.
- Safe startup diagnostic for the paid-flag-true/missing-key case.

## What Was Intentionally Not Added

- No MCP tools.
- No MCP prompts.
- No paid resources.
- No calls to paid endpoints.
- No calls to x402 endpoints.
- No wallet handling, private-key handling, signing, payment retry, or payment authorization.
- No OAuth.
- No remote HTTP/SSE/Streamable HTTP MCP transport.
- No database access.
- No control-plane access.
- No dynamic MCP registration from `/v1/ai/tools`.
- No executable pricing or cost preflight call.
- No API-key forwarding from public resource reads.

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

Public resource reads still use only:

- `Accept: application/json`
- `User-Agent: stocktrends-mcp-server/1.0`

They never send `Authorization`, `X-API-Key`, or other secret/auth headers.

## API Key Behavior

`STOCKTRENDS_API_KEY` is ignored unless `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.

When paid mode is disabled, API key values are not read into paid config. API key alone does not enable tools, prompts, auth headers, or paid runtime behavior.

When paid mode is enabled and the API key is missing or blank, paid-mode state becomes `blocked_missing_api_key`. Public resources remain registered and readable.

When paid mode is enabled and the API key is present, paid-mode state becomes `configured_no_tools_registered`. The key is kept process-local for future internal auth helper use. No current runtime path sends it because this branch registers no paid tools.

## Paid Enablement Flag Behavior

| Configuration | Behavior |
| --- | --- |
| Flag absent | Paid mode disabled. No paid tools. Public resources available. |
| Flag false, `0`, `no`, or `off` | Paid mode disabled. No paid tools. Public resources available. |
| API key present but flag absent or false | API key ignored. No paid tools. No auth headers. |
| Flag true but API key missing | Paid mode blocked. No paid tools. Public resources available. |
| Flag true and API key present | Paid config available for future use. No paid tools in this branch. |

Invalid paid flag or cap values fail configuration validation rather than enabling paid behavior silently.

## Host Enforcement

The future paid auth helper enforces:

- HTTPS only.
- Exact origin match to validated `STOCKTRENDS_API_BASE_URL`.
- No URL credentials.
- No fragments.
- No auth header construction for arbitrary external URLs, redirect targets, user-supplied hosts, prompt-supplied hosts, or API-payload hosts.

The public resource client does not call this helper and remains credential-free.

## Spend and Rate Foundation

The spend/rate foundation is configuration and policy scaffolding only.

- Per-session and per-tool cap variables are parsed only for explicit paid mode.
- Default caps are `0` in this no-tools build.
- Optional STC and USD cap placeholders are parsed when provided.
- Automatic paid retries are disabled.
- `paidCallsAuthorizedInThisBuild=false` prevents the policy helper from authorizing paid execution in this branch.

No persistent accounting, daily cap, loop detector, broad symbol sweep support, or paid runtime execution was added.

## Pricing and Preflight Foundation

No pricing or cost preflight endpoint is called.

The internal policy requires pricing preflight before future paid execution, but this branch does not implement executable preflight. The preserved rule is:

No future paid call may execute unless pricing/cost can be determined and local policy authorizes it.

## Tests Added or Updated

- Paid env matrix tests prove resources remain unchanged and tools/prompts remain zero when:
  - paid flag is absent
  - paid flag is false
  - paid flag is true
  - API key is present
  - API key is absent
- Public resource tests prove auth headers are not sent even when paid mode and API key are configured.
- Config tests prove API key is read only for explicit paid mode.
- Config tests prove paid flag true with missing key becomes a blocked paid-mode state without breaking public config.
- Auth helper tests prove non-approved hosts fail closed and errors do not include secrets.
- Redaction/logging tests prove API-key, auth-header, payment-header, and known secret text is redacted.
- Paid endpoint policy tests prove the static paid policy is not registered as public resources.
- Spend/preflight policy tests prove paid execution remains blocked in this branch.

## Validation Results

Validation commands run after implementation:

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed, 6 test files and 64 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed with normal CRLF working-copy warnings |

## Deviations From The Phase 3 Memo

No intentional deviation.

This branch implements only the recommended no-tools foundation and keeps paid tools blocked for a later branch.
