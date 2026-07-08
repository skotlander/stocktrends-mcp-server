# Phase 4 Paid ST-IM Foundation (No Execution) Validation Report

## 1. Purpose

This report records validation of the Phase 4 paid ST-IM foundation-no-execution implementation for the Stock Trends MCP Server. It confirms that the two paired paid ST-IM tool *definitions* — `stocktrends_get_stim_latest` and `stocktrends_get_stim_history` — have been added as MCP tools under strict paid-mode exposure conditions, that their handlers fail closed at the hard paid-execution-disabled gate, and that no live paid execution, real `X-API-Key` transmission, or paid endpoint fetch is possible in this build.

The implementation was designed in [`docs/PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md`](PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md), implemented per [`docs/PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md`](PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md), reviewed, and merged to `main`.

This report is documentation only. It does not implement runtime code, modify `src/`, modify `tests/`, modify `package.json`, add MCP tools, add MCP prompts, call endpoints, use API keys, inspect secrets, test x402 payments, add wallet handling, add OAuth, add remote MCP transport, add database access, or add control-plane access. All statements below were verified by reading the merged source under `src/` and the associated tests and binding documents.

## 2. Validated Architecture Boundary

The controlling authority boundary remains unchanged by this implementation:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin adapter over the front-facing Stock Trends API only. Reading [`src/tools/stimTools.ts`](../src/tools/stimTools.ts) and [`src/paidPolicy.ts`](../src/paidPolicy.ts), the paid ST-IM foundation adds tool *definitions* and structural preflight bookkeeping only; it does not call the API, does not compute pricing, and does not authorize payment. Validation confirms the adapter does not become:

- **a direct database client** — no database driver, connection string, or query code exists anywhere in `src/`;
- **a control-plane client** — no control-plane endpoint is called or referenced by any ST-IM code path;
- **a pricing authority** — `estimated_cost` and `pricing_source` in the denial metadata are hardcoded `null`; no STC/USD amount is computed for ST-IM;
- **a payment authority** — `paid_execution_authorized`, `paid_execution_occurred`, `payment_header_sent`, and `payment_status` are hardcoded `false`/`null` in every ST-IM response;
- **an x402 wallet/payment engine** — no wallet, payment signature, or x402 challenge handling exists; the denial wrapper asserts `payment_header_sent: false`;
- **a paid execution engine** — every invocation terminates at the hard paid-execution-disabled gate and sends no request;
- **an API recomputation layer** — the handlers never fetch ST-IM data and never synthesize ST-IM values; `observed_cost` and `fetched_at` are `null`;
- **an Intelligence Agent recomputation layer** — no ST-IM, indicator, price, selection, or research reasoning is performed locally;
- **a parallel reasoning engine** — the only local work is strict input validation, symbol-identity resolution, and structural allowlist bookkeeping; and
- **an investment advice generator** — the metadata records `not_authoritative_for: ["investment advice", "payment authorization", "future performance guarantee"]` and adds explicit non-forecast warnings.

## 3. Current Merged MCP Surface

Confirmed directly from [`src/server.ts`](../src/server.ts), [`src/resources/index.ts`](../src/resources/index.ts), [`src/tools/index.ts`](../src/tools/index.ts), and [`src/tools/stimTools.ts`](../src/tools/stimTools.ts):

- **Transport**: local stdio only. `parseConfig` in [`src/config.ts`](../src/config.ts) throws `unsupported_transport` for any value other than `stdio`; `startStdioServer` connects a `StdioServerTransport`.
- **Public resources**: 9, registered by `registerPublicResources` from the static `PUBLIC_RESOURCES` array. Unchanged from Phase 1/2/3.
- **Default MCP tools**: exactly 1 — `stocktrends_estimate_workflow_cost` (the public/free planning tool). `registerPaidStimTools` returns early when paid mode is not fully configured.
- **Paid-mode MCP tools**: exactly 3 when `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** an API key is configured — `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`. The two ST-IM tools register together or not at all (history-beside-latest rule).
- **All other environment combinations**: expose only the public planning tool (1 tool).
- **MCP prompts**: 0. `MCP_PROMPT_DEFINITIONS` is `readonly []`, and `server.ts` never calls a prompt-registration function.
- **Dynamic registration**: none. No code path calls `/v1/ai/tools` or `/v1/workflows` at startup or registers MCP primitives from their responses. `PAID_STIM_TOOL_DEFINITIONS` and `PAID_ENDPOINT_POLICIES` are static, frozen arrays.
- **Paid execution**: none. Even when the ST-IM tools are exposed, every invocation fails closed.

## 4. Tool Surface by Environment

The exposure rule is `shouldExposePaidStimTools(config) = config.paidTools.requested && config.paidTools.apiKeyConfigured` ([`src/tools/stimTools.ts:288-290`](../src/tools/stimTools.ts)). `config.paidTools.requested` is set only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`, and `apiKeyConfigured` is set only when a non-empty `STOCKTRENDS_API_KEY` is present under that flag ([`src/config.ts:106-133`](../src/config.ts)).

| Environment | Paid mode status | Tools exposed | Count | Prompts | Public resources |
| --- | --- | --- | --- | --- | --- |
| No env vars | `disabled` | `stocktrends_estimate_workflow_cost` | 1 | 0 | 9 |
| `STOCKTRENDS_API_KEY` present only (no paid flag) | `disabled` (key ignored) | `stocktrends_estimate_workflow_cost` | 1 | 0 | 9 |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=false` | `disabled` | `stocktrends_estimate_workflow_cost` | 1 | 0 | 9 |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true`, no key | `blocked_missing_api_key` | `stocktrends_estimate_workflow_cost` | 1 | 0 | 9 |
| `STOCKTRENDS_ENABLE_PAID_TOOLS=true` + (mock) API key | `configured_foundation_no_execution` | `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history` | 3 | 0 | 9 |

In the paid-mode row, all three tools are exposed but the two ST-IM tools still fail closed on every invocation. The mock key case is the only case that exposes the ST-IM tools; the API key alone (without the enable flag) never does.

## 5. ST-IM Latest Foundation Validation

- **Tool name**: `stocktrends_get_stim_latest` (`STIM_LATEST_TOOL_NAME`).
- **Endpoint mapping**: `GET /v1/stim/latest` (`STIM_LATEST_ENDPOINT_PATH`, `STIM_HTTP_METHOD`).
- **Foundation-only status**: `paidExecutionAuthorized: false` in the tool definition and `_meta`; the tool title/description explicitly state paid execution is DISABLED.
- **Strict input validation**: `stimLatestInputSchema` is a `z.object({...}).strict()` — unknown keys are rejected at the SDK boundary.
- **`symbol_exchange` support**: optional strict string, regex `^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$`, canonical uppercase `SYMBOL_EXCHANGE`.
- **`symbol` + `exchange` support**: optional `symbol` (canonical uppercase alphanumeric) plus optional `exchange` (`z.enum` of the allowlist).
- **`symbol_exchange` precedence**: `resolveSymbolIdentity` uses `symbol_exchange` when present and only falls back to `symbol` + `exchange`; identity source is recorded as `symbol_exchange` vs `symbol_and_exchange`.
- **Exchange allowlist**: `VALID_STIM_EXCHANGES = ["N", "Q", "A", "B", "T", "I"]`, enforced by both the `symbol_exchange` regex suffix and the `exchange` enum. Anything else fails closed.
- **Unknown keys rejected**: `.strict()` schema.
- **Invalid input fails before preflight/network**: cross-field identity failures throw `StimToolInputError("invalid_tool_input", ...)` inside the handler `try` block, before `denyStimInvocation`/preflight runs.
- **Invocation fails closed before fetch**: valid input reaches `denyStimInvocation`, which returns a denial without any `fetch`.
- **No API request sent**: `api_request_sent: false`.
- **No auth header sent**: `auth_header_sent: false`; no `buildPaidAuthHeaders` call occurs.
- **`paid_execution_authorized` false**: asserted in both the wrapper root and `mcp_metadata`.

## 6. ST-IM History Foundation Validation

- **Tool name**: `stocktrends_get_stim_history` (`STIM_HISTORY_TOOL_NAME`).
- **Endpoint mapping**: `GET /v1/stim/history` (`STIM_HISTORY_ENDPOINT_PATH`, `STIM_HTTP_METHOD`).
- **Foundation-only status**: `paidExecutionAuthorized: false` in the definition and `_meta`; title/description state execution is DISABLED.
- **Strict input validation**: `stimHistoryInputSchema` is `.strict()` — unknown keys rejected.
- **`symbol_exchange` support**, **`symbol` + `exchange` support**, and **`symbol_exchange` precedence**: identical model to latest, via the shared `resolveSymbolIdentity`.
- **Exchange allowlist**: same `["N", "Q", "A", "B", "T", "I"]` allowlist.
- **`start`/`end` date validation**: `start`/`end` must match `^\d{4}-\d{2}-\d{2}$` at the schema, and `buildHistoryRequestParameters` additionally rejects non-real calendar dates via `isRealCalendarDate` (UTC round-trip check).
- **`start <= end` rule**: enforced in `buildHistoryRequestParameters` (`start > end` throws `invalid_tool_input`).
- **`limit` min 1**: `STIM_HISTORY_LIMIT_MIN = 1`, enforced by `z.number().int().min(1)`.
- **`limit` max 2600**: `STIM_HISTORY_LIMIT_MAX = 2600`, enforced by `.max(2600)`, matching the confirmed API `Query(default=260, ge=1, le=2600)` bounds.
- **`include_gaps` handling**: optional boolean; forwarded only when supplied.
- **`limit`/`include_gaps` omitted when unsupplied**: `buildHistoryRequestParameters` only adds `limit`/`include_gaps` to the intended parameters when the caller supplies them, so the API's documented defaults (`limit=260`, `include_gaps=false`) apply. The adapter never injects a default and never sends a `limit` above 2600.
- **Unknown keys rejected**: `.strict()` schema.
- **Invalid input fails before preflight/network**: date/ordering failures throw before `denyStimInvocation`.
- **Invocation fails closed before fetch**; **no API request sent**; **no auth header sent**; **`paid_execution_authorized` false** — identical to latest, asserted in the denial wrapper.

## 7. No-Execution Gate Validation

- **`PHASE4_PAID_EXECUTION_ENABLED` false**: defined `= false` in [`src/paidPolicy.ts:126`](../src/paidPolicy.ts).
- **`paidCallsAuthorizedInThisBuild` false (or equivalent)**: `DEFAULT_PAID_SPEND_POLICY.paidCallsAuthorizedInThisBuild = false`; the config layer never overrides it to `true`.
- **Handlers terminate at `paid_execution_disabled`**: for every valid ST-IM invocation, `evaluatePaidInvocationPreflight` resolves to `paid_execution_disabled` once the structural gates pass (`resolveInvocationDenialReason`), and the mock preflight `evaluatePaidPreflight` also denies with `paid_execution_disabled` after all structural/pricing/cap gates (`src/paidPolicy.ts:302-304`).
- **No handler calls `fetch`**: neither `handleStimLatestTool` nor `handleStimHistoryTool` invokes the HTTP client; the only `new URL(...)` is for host/endpoint allowlist evaluation and is never fetched.
- **No handler calls a live paid client**: the `StockTrendsClient` is not used by any ST-IM code path.
- **No handler calls `buildPaidAuthHeaders`**: the handlers use only `evaluatePaidInvocationPreflight`, which cannot return an authorized decision.
- **No `/v1/stim/latest` request can occur** and **no `/v1/stim/history` request can occur**: no fetch is reachable.
- **No automatic retries**: `automatic_paid_retries: false` in the metadata; `automaticPaidRetries: false` in the spend policy.

The hard gate is definitive: even in the mock preflight where endpoint/tool/host/pricing/caps all pass with synthetic authoritative pricing, the decision still denies with `paid_execution_disabled` and `buildPaidAuthHeaders` still throws — so no code path can reach real header construction.

## 8. Auth Safety Validation

- **API key read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`**: `parsePaidToolsConfig` returns a `disabled` config (with no key) whenever the paid flag is not `true`; `STOCKTRENDS_API_KEY` is read only inside the enabled branch.
- **API key alone does not expose paid ST-IM tools**: `shouldExposePaidStimTools` requires `requested && apiKeyConfigured`; a key without the flag yields `requested === false`.
- **Public resources never send the key**: `registerPublicResources` and the client use only `Accept`/`User-Agent`; no key is attached.
- **`stocktrends_estimate_workflow_cost` never sends the key**: the public planning tool calls `client.fetchJson` on `/v1/cost-estimate` with no auth header.
- **ST-IM handlers never construct or send a real auth header**: the denial path builds no header; `auth_header_sent: false`.
- **`buildPaidAuthHeaders` remains blocked by the hard gate**: it runs the full preflight and `assertPaidPreflightAuthorized`, which throws `paid_execution_disabled` because the hard gate is off — it is unreachable in an authorized state and is not called by any handler.
- **`X-API-Key` is the future preferred subscription header**: `buildPaidAuthHeaders` returns `{ "X-API-Key": ... }` for the future execution branch only.
- **Bearer fallback remains deferred**: no Bearer header is implemented.
- **Errors/logs never expose the API key**: existing redaction covers key/auth-header/payment-header/wallet/env shapes; the config stores the key as a non-enumerable property.
- **Mock key is not exposed in denial output or errors**: the denial wrapper and thrown errors carry only tool/endpoint/method/denial-reason fields, never the key; the implementation tests assert the mock key never appears.

## 9. Preflight Validation

`evaluatePaidInvocationPreflight` and `evaluatePaidPreflight` in [`src/paidPolicy.ts`](../src/paidPolicy.ts) enforce, in order:

- **Tool allowlist enforced**: `toolAllowlisted` requires the endpoint policy's `toolName` to match; `tool_endpoint_mismatch` otherwise.
- **Endpoint allowlist enforced**: `endpointAllowlisted` requires a matching `PAID_ENDPOINT_POLICIES` entry; `endpoint_not_allowlisted` otherwise.
- **Host allowlist enforced**: `hostApproved` requires `isApprovedAuthTarget` (HTTPS, no credentials/hash, same origin as `apiBaseUrl`) and an exact pathname match; `host_not_approved` otherwise.
- **Input validation before preflight/network side effects**: handlers validate and resolve identity before calling the preflight; the preflight itself performs no network or auth side effects.
- **No auth before preflight success**: auth-header construction lives only inside `buildPaidAuthHeaders`, gated behind `assertPaidPreflightAuthorized`.
- **Hard execution-disabled gate blocks even when structural gates pass**: after endpoint/tool/host/paid-mode (and, in the mock evaluator, pricing/caps) succeed, the decision still denies with `paid_execution_disabled`.
- **Deterministic denial reason**: `resolveInvocationDenialReason` returns a single deterministic reason for a given config/target.
- **Cap behavior fail-closed where wired**: `DEFAULT_PAID_SPEND_POLICY` sets `maxPaidCallsPerSession`/`maxPaidCallsPerTool` to `0`, so `capWouldBeExceeded` is true for any first call in the mock evaluator; the ST-IM invocation preflight never reaches an allowed state regardless.
- **No automatic retries**: `automaticPaidRetries: false`.

## 10. Denial/Output Wrapper Validation

Every ST-IM invocation returns a fail-closed `CallToolResult` (`isError: true`) whose structured content asserts:

- **Paid execution did not occur**: `paid_execution_occurred: false`.
- **API request was not sent**: `api_request_sent: false`.
- **Auth header was not sent**: `auth_header_sent: false`.
- **Payment header was not sent**: `payment_header_sent: false`.
- **`paid_execution_authorized` false**: in both the wrapper root and `mcp_metadata`.
- **Tool name included**: `error.tool_name` and `mcp_metadata.tool_name`.
- **Intended endpoint/method included**: `error.endpoint_path`, `error.http_method`, and the metadata mirror.
- **Denial reason included**: `error.error_code` / `error.denial_reason` (e.g. `paid_execution_disabled`).
- **No fabricated ST-IM API data**: there is no `api_data` on the denial wrapper; `observed_cost`, `request_id`, `pricing_rule`, `fetched_at`, and `payment_status` are `null`. The `PaidStimSuccessWrapper` shape is scaffolding only and is unreachable in this build.

Note: schema-level MCP SDK validation errors (for example, a wrong-typed field caught by the strict Zod schema at the SDK boundary) may return a generic `Invalid arguments` error before the handler runs. This is still safe: when that happens no handler code executes, no `fetch` occurs, no auth or payment header is constructed, and no paid side effect happens. Handler-level cross-field failures instead return the deterministic `invalid_tool_input` fail-closed wrapper described above.

## 11. Public Safety Regression Validation

- **All 9 public resources remain unchanged and credential-free**: `PUBLIC_RESOURCES` is untouched; resources are served with `Accept`/`User-Agent` only.
- **`stocktrends_estimate_workflow_cost` remains credential-free**: the public planning tool still calls `/v1/cost-estimate` with no auth header and hardcodes `paid_execution_authorized: false`, `payment_authorized: false`.
- **No `/v1/pricing/catalog` paid preflight call**: no ST-IM code path fetches the pricing catalog.
- **No `/v1/cost-estimate` internal call from ST-IM tools**: the ST-IM handlers never call the cost-estimate endpoint.
- **No `/v1/workflows` call**: not invoked by ST-IM code.
- **No x402/wallet/OAuth behavior**: none implemented or referenced.
- **No remote MCP**: transport is stdio-only.
- **No DB/control-plane access**: none exists in `src/`.
- **Secret redaction remains covered**: existing redaction for key/auth/payment/wallet/env shapes is unchanged; tests assert the mock key never appears in ST-IM denial output or errors.

## 12. Automated Validation

Recorded from the implementation and review of this merged branch (see [`docs/PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md`](PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md)):

| Command | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | Passed — 9 test files, 136 tests |
| `npm run build` | Passed |
| `git diff --check` | Passed (exit 0) |

This validation report is documentation-only and does not re-run these commands; it records the results established at implementation and security-review time. `git diff --check` was re-run for the documentation change (see §Validation below).

## 13. Security Review Summary

- **No blockers.**
- **No important findings.**
- **Optional hardening items only** (see below).
- **Live paid execution remains impossible**: the hard gate (`PHASE4_PAID_EXECUTION_ENABLED = false`, `paidCallsAuthorizedInThisBuild = false`) forces every path to deny at `paid_execution_disabled`.
- **Real `X-API-Key` transmission remains impossible**: header construction is unreachable because no authorized preflight decision exists.
- **Paid ST-IM tools remain foundation-only.**

Optional hardening items (non-blocking):

- Schema-level MCP SDK validation errors are a distinct denial class and do not include the handler-level no-execution metadata (`paid_execution_authorized: false`, etc.); they are still safe because no handler, fetch, auth, or paid side effect occurs.
- The `unexpected_auth_attempt` taxonomy value exists in `StimToolErrorCode` but is not emitted today because auth construction is impossible by construction.
- The structural pass currently always resolves to `paid_execution_disabled` by design; this is intentional fail-closed behavior, not a latent allow path.
- The `client` parameter to `registerPaidStimTools` is intentionally unused by ST-IM registration/handlers in this no-execution branch (reserved for the future execution branch).

## 14. Known Limitations

- Live paid execution is not implemented; the hard build gate stays off.
- Actual ST-IM API responses are not fetched.
- x402 is deferred.
- Wallet handling is deferred.
- OAuth is deferred.
- Remote MCP transport is deferred.
- Bearer fallback auth is deferred; only `X-API-Key` is the intended future header.
- Actual 402 challenge comparison is deferred.
- API-key subscription execution remains future work.
- No live endpoint validation is performed.
- Paid response metadata validation (populating/validating `observed_cost`, `request_id`, `pricing_rule`, `payment_status`) remains future work.
- Investment advice boundaries remain: the tools are not authoritative for investment advice, payment, or future performance.

## 15. Decision

Phase 4 paid ST-IM foundation-no-execution is **validated and complete**. The two paired paid ST-IM tool definitions are correctly gated behind paid mode, validate input strictly, fail closed at the hard paid-execution-disabled gate, and cannot send any API request or auth/payment header. The public surface (9 resources, 1 planning tool, 0 prompts) is unchanged and remains credential-free.

## 16. Recommended Next Step

Proceed to an **architecture-only** memo:

```text
architecture/phase4-paid-stim-live-execution-design
```

The next phase should be architecture only — no execution implementation — and should decide whether and how to safely enable actual subscription/API-key ST-IM execution. It must address:

- whether to flip the hard execution gate (`PHASE4_PAID_EXECUTION_ENABLED` / `paidCallsAuthorizedInThisBuild`);
- the exact preflight requirements that must succeed before any auth-header construction;
- the exact cost/cap policy required (per-session and per-tool call caps, STC/USD budget caps, no automatic retries);
- whether `/v1/cost-estimate` is sufficient as workflow-level planning evidence for endpoint-level execution authorization;
- whether pricing-catalog metadata is required for endpoint-level pricing authority;
- response metadata requirements for the authorized success wrapper;
- request-id / pricing-rule / observed-cost handling and population rules;
- secret redaction requirements for any live auth/payment path;
- whether live API validation is allowed during that phase, and under what explicit authorization; and
- whether x402 remains deferred.

Do not recommend or begin live execution implementation until this architecture memo is written, reviewed, and approved.
