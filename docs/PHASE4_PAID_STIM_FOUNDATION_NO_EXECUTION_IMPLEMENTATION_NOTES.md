# Phase 4 Paid ST-IM Foundation (No Execution) Implementation Notes

Implementation date: 2026-07-08

Branch: `implementation/phase4-paid-stim-foundation-no-execution`

## Scope

This branch implements the paired paid ST-IM MCP tool *foundation* only. It registers the two approved paid ST-IM tool definitions under strict paid-mode exposure conditions, wires input validation and an internal invocation preflight, and defines the future output-wrapper scaffolding. It does **not** enable live paid execution.

The hard paid-execution-disabled gate remains active. No real paid ST-IM API call can execute, and no real `X-API-Key` (or any auth/payment header) can be sent in this build.

This directly implements the recommended next branch from [`PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md`](PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md) §14–§17.

## What Was Added

- `src/tools/stimTools.ts`:
  - Tool constants for `stocktrends_get_stim_latest` (`GET /v1/stim/latest`) and `stocktrends_get_stim_history` (`GET /v1/stim/history`).
  - Strict Zod input schemas (`.strict()`, unknown keys rejected) with single-field constraints, plus handler-level cross-field validation.
  - `registerPaidStimTools(server, client, config)`, which exposes the paired tools only when paid mode is enabled with an API key.
  - Fail-closed handlers that terminate at the hard paid-execution-disabled gate, sending no request and constructing no auth header.
  - Output-wrapper scaffolding types (`PaidStimToolMetadata`, `PaidStimSuccessWrapper`, `PaidStimDenialWrapper`, `PaidStimPreflightSummary`, `PaidStimLocalCapStatus`, `PaidStimSymbolIdentity`) describing the future authorized-execution shape and the current denial shape.
  - A deterministic, secret-free tool error taxonomy (`StimToolErrorCode`).
- `src/paidPolicy.ts`:
  - `PHASE4_PAID_STIM_FOUNDATION_TOOLS_REGISTERED = true` (foundation tool definitions exist; distinct from execution being enabled).
  - `evaluatePaidInvocationPreflight(config, input)` — the structural invocation preflight used by the handlers (endpoint/tool/host/paid-mode gate results plus a deterministic denial reason). It never constructs an auth header and never returns an authorized decision.
  - `isPaidExecutionEnabledInBuild(config)`, `getPaidEndpointPolicy(...)`, `isApprovedPaidAuthTarget(...)` helpers.
- `src/server.ts`: calls `registerPaidStimTools(server, client, config)` after the public planning tool.
- `src/config.ts` / `src/paidPolicy.ts`: renamed the paid-mode status `configured_no_tools_registered` → `configured_foundation_no_execution` to truthfully reflect that foundation tool definitions are now registered while execution stays disabled.
- Tests: `tests/phase4-paid-stim-foundation.test.ts` (new); updates to `tests/config.test.ts` and `tests/phase3-paid-foundation.test.ts` for the renamed status and the new conditional tool surface.
- Docs: this file; README updates.

## Tool Surface Behavior By Environment

| Environment | Tools registered | Prompts | Public resources |
| --- | --- | --- | --- |
| Default / no env | `stocktrends_estimate_workflow_cost` (1) | 0 | 9 |
| `STOCKTRENDS_API_KEY` only (no paid flag) | 1 (key ignored) | 0 | 9 |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=false` | 1 | 0 | 9 |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true`, no key | 1 (paid mode blocked, fail closed) | 0 | 9 |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true` + API key | 3: `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history` | 0 | 9 |

The paired ST-IM tools are registered together or not at all (history-beside-latest rule). Even when exposed, every ST-IM invocation fails closed.

## ST-IM Latest Contract (`stocktrends_get_stim_latest`)

- Endpoint mapping: `GET /v1/stim/latest`.
- Inputs: `symbol_exchange` (optional string), `symbol` (optional string), `exchange` (optional string).
- Validation (all before preflight/network):
  - Caller must provide either `symbol_exchange`, or both `symbol` and `exchange`.
  - `symbol_exchange` takes precedence over `symbol` + `exchange`.
  - `symbol_exchange` format is strict/deterministic: canonical uppercase `SYMBOL_EXCHANGE` where the exchange suffix is one of `N,Q,A,B,T,I` (regex-enforced).
  - `exchange` must be one of `N,Q,A,B,T,I` (`z.enum`).
  - Unknown keys rejected (`.strict()`).

## ST-IM History Contract (`stocktrends_get_stim_history`)

- Endpoint mapping: `GET /v1/stim/history`.
- Inputs: `symbol_exchange`, `symbol`, `exchange`, `start` (`YYYY-MM-DD`), `end` (`YYYY-MM-DD`), `limit` (integer), `include_gaps` (boolean).
- Validation (all before preflight/network):
  - Same symbol identity model and precedence as latest.
  - `exchange` in `N,Q,A,B,T,I`.
  - `start`/`end`, if supplied, must be valid `YYYY-MM-DD` calendar dates; if both supplied, `start <= end`.
  - `limit`: min `1`, max `2600` (matching the confirmed API `Query(default=260, ge=1, le=2600)` bounds).
  - Unknown keys rejected.

### `limit` and `include_gaps` default decision

**Decision: omit when not supplied and let the API apply its documented defaults** (`limit=260`, `include_gaps=false`). The MCP adapter enforces the API min/max (`1`–`2600`) locally and never sends a `limit` above `2600`, but it does not inject a default `limit` or `include_gaps` value. Rationale: forwarding only caller-supplied parameters keeps the adapter a thin pass-through, avoids silently exceeding the API default, and honors the design memo's rule that the MCP default must never exceed the API default. (No parameter is actually sent in this build, since execution is disabled; this is the scaffolded behavior for the future execution branch.)

## Preflight / No-Execution Gate Behavior

Each ST-IM tool handler:

1. Validates input (strict Zod at the SDK boundary; cross-field identity/date rules in the handler). Invalid input returns a deterministic error before any preflight/network step.
2. Resolves the symbol identity (with `symbol_exchange` precedence) and builds the intended request parameters.
3. Runs `evaluatePaidInvocationPreflight`, which records the structural gates — endpoint allowlisted, tool allowlisted, host approved, paid-mode configured — and the hard-execution-gate state.
4. Because the hard paid-execution-disabled gate is OFF, the invocation fails closed with denial reason `paid_execution_disabled`. **No pricing is fetched, no cap accounting runs against the network, no auth header is constructed, and no `fetch` occurs.**

The hard gate is the definitive blocker: even in the mock preflight evaluator (`evaluatePaidPreflight`) where endpoint/tool/host/pricing/caps all pass with synthetic authoritative pricing and configured caps, the decision still denies with `paid_execution_disabled` and `buildPaidAuthHeaders` still throws (tested for both `/v1/stim/latest` and `/v1/stim/history`).

The fail-closed response makes explicit: `paid_execution_authorized: false`, `paid_execution_occurred: false`, `api_request_sent: false`, `auth_header_sent: false`, `payment_header_sent: false`, the denial reason, the tool name, the intended endpoint, and the method.

### Error taxonomy

Tool-facing, deterministic, secret-free `StimToolErrorCode` values: `paid_tools_disabled`, `paid_auth_blocked_missing_api_key`, `invalid_tool_input`, `endpoint_not_allowlisted`, `host_not_approved`, `pricing_preflight_unavailable`, `spend_cap_exceeded`, `paid_execution_disabled`, `unexpected_auth_attempt`. In this build, live handler invocations reach only `invalid_tool_input` (bad cross-field input) and `paid_execution_disabled` (all valid invocations); the remaining structural reasons are covered at the policy level via `evaluatePaidInvocationPreflight`. Lower-level `StockTrendsMcpError` codes (`paid_execution_disabled`, `unapproved_paid_endpoint`, `unapproved_auth_host`, `paid_spend_cap_exceeded`, etc.) remain the authority for the mock preflight/auth path.

## Auth Behavior

- `X-API-Key` is the preferred future subscription auth header; Bearer fallback remains deferred (not implemented).
- API key alone never enables paid behavior: it is read only under `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and is kept process-local (non-enumerable, redacted).
- Public resources and `stocktrends_estimate_workflow_cost` never send the API key (only `Accept` and `User-Agent`).
- The paid ST-IM foundation tools never construct or send an auth header, because paid execution is disabled and the handler fails closed before any auth-construction path.
- Errors and logs never expose the API key (existing redaction covers key/auth-header/payment-header/wallet/env shapes; tests assert the mock key never appears in denial output or thrown errors).

### Why no real `X-API-Key` is sent

Auth-header construction lives only inside the coupled paid-execution boundary (`buildPaidAuthHeaders`), which runs the full preflight and asserts authorization first. The hard build gate (`PHASE4_PAID_EXECUTION_ENABLED = false` and `paidCallsAuthorizedInThisBuild = false`) forces that assertion to fail with `paid_execution_disabled`, so no code path can reach header construction. The ST-IM handlers additionally never call `buildPaidAuthHeaders` at all — they fail closed via `evaluatePaidInvocationPreflight`, which cannot return an authorized decision.

### Why no paid endpoint is called

The handlers never invoke the HTTP client for ST-IM. They construct a target URL only for host/endpoint allowlist evaluation (never fetched) and return a denial. No `/v1/stim/latest`, `/v1/stim/history`, `/v1/pricing/catalog`, `/v1/cost-estimate`, or `/v1/workflows` request is made during ST-IM invocation. Tests assert the mock `fetch` is never called.

## Tests Added/Updated

New `tests/phase4-paid-stim-foundation.test.ts` covers:

- **Tool surface:** default = 1 tool, 0 prompts, 9 resources; env matrix (no env / key-only / paid=false / paid=true no key → 1 tool; paid=true + key → 3 tools); latest/history pairing and foundation/execution constants.
- **Input validation:** valid latest/history `symbol_exchange` and `symbol`+`exchange` accepted through validation then fail closed; `symbol_exchange` precedence; invalid exchange; missing/partial identity; unknown keys; invalid date format; invalid calendar date; start-after-end; limit below 1; limit above 2600 — all reject before any network call.
- **No-execution safety:** invoking latest and history fails closed before `fetch`; response asserts `paid_execution_authorized/occurred = false`, `api_request_sent/auth_header_sent/payment_header_sent = false`, hard gate off; the mock key and `x-api-key`/`payment-signature`/`bearer ` header forms never appear; `fetch` never called (so no stim/pricing/cost-estimate/workflows call, and no auth/payment header could be sent).
- **Preflight/caps:** endpoint, tool, and host allowlists enforced via `evaluatePaidInvocationPreflight`; hard gate blocks even when structural gates pass; hard gate blocks the history tool in the mock preflight even when caps/pricing pass, and `buildPaidAuthHeaders` still throws without leaking the key; `isPaidExecutionEnabledInBuild` is `false`.
- **Public safety regression:** public resources credential-free under paid mode; cost-estimate tool credential-free under paid mode; prompt count zero.

Updated:

- `tests/config.test.ts`: paid+key status is now `configured_foundation_no_execution`.
- `tests/phase3-paid-foundation.test.ts`: the paid env matrix now expects the 3-tool surface when paid mode is enabled with a key (and 1 tool otherwise), reflecting the new conditional foundation registration.

## Validation Results

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed — 9 test files, 136 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed (exit 0) |

## Known Limitations

- Live paid execution is not implemented; the hard build gate stays off. No pricing (`/v1/pricing/catalog`) or cost-estimate resolution runs during ST-IM invocation.
- x402, wallet handling, OAuth, remote MCP transport, database access, and control-plane access remain deferred/not implemented.
- Bearer fallback auth remains deferred; only `X-API-Key` is the intended future header.
- The output-wrapper success shape (`PaidStimSuccessWrapper`) is scaffolding only; no success path is reachable, so `observed_cost`/`payment_status`/`request_id` population and any `paid_response_missing_required_metadata` enforcement are deferred to the execution branch.
- Symbol identity is intentionally strict (canonical uppercase); the adapter does not silently rewrite input beyond trimming whitespace, mirroring but not performing the API's normalization.
- No dynamic registration from `/v1/ai/tools` or `/v1/workflows`; tool definitions are static.

## Recommended Next Step

Proceed to a separate, explicitly reviewed execution branch (e.g. `implementation/phase4-stim-paid-tools-subscription`) that flips the hard paid-execution gate on and adds: pricing-catalog-derived static rule cost resolution through the preflight foundation, real cap accounting, the coupled `X-API-Key` auth send for the approved origin + allowlisted endpoint, the authorized success wrapper, and explicitly authorized live validation. That branch must keep x402/wallet/OAuth/remote/DB/control-plane deferred and preserve the credential-free public surface.
