# Phase 4 First Paid Tool Contract Memo

## 1. Purpose of Phase 4

Phase 4 is a paid-tool contract design phase. It does not implement runtime code, register MCP tools, register MCP prompts, call paid endpoints, inspect secrets, use API keys, test x402 payments, or change the visible MCP surface.

The purpose of this phase is to decide the first paid-tool contract before runtime exposure. It defines the preferred first paid increment, the required latest/history policy, input and output contracts, auth and spend controls, endpoint allowlist coupling, tests, manual validation, unresolved API contract questions, and the recommended next branch.

The controlling authority boundary remains:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin adapter over the front-facing Stock Trends API only. It must not become a direct database client, control-plane client, pricing authority, payment authority, API recomputation layer, Intelligence Agent recomputation layer, parallel reasoning engine, or investment-advice generator.

## 2. Validated Baseline

Phase 1, Phase 2, and Phase 3 are complete, implemented, validated, merged, and documented.

The current validated MCP behavior is:

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

The validated public resources are:

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

Phase 3 added internal paid-auth foundation behavior:

- `STOCKTRENDS_ENABLE_PAID_TOOLS` handling with default disabled behavior.
- Lazy `STOCKTRENDS_API_KEY` reading only when paid mode is explicitly enabled.
- Approved-host auth helper scaffolding for future paid calls.
- Secret redaction.
- Static paid endpoint policy metadata for ST-IM and indicators latest/history candidates.
- Spend and preflight policy scaffolding.

Paid execution remains blocked. Paid tools remain zero. Public resources remain credential-free and send no `Authorization` or `X-API-Key` header.

## 3. Paid-Tool Selection Principle

The first paid tool must be selected by the narrowest safe adapter principle:

- Wrap canonical front-facing Stock Trends API routes only.
- Preserve API-authored response semantics.
- Do not recompute ST-IM, indicators, selections, rankings, guidance, research, editorial conclusions, pricing, or payment state.
- Do not generate investment advice, buy/sell/hold language, allocation guidance, or model-authored market conclusions.
- Do not perform hidden paid calls.
- Do not perform broad symbol sweeps.
- Do not dynamically register tools from `GET /v1/ai/tools`.
- Do not expose a latest-only analytical surface where historical context is required.
- Include explicit provenance, paid-call, endpoint, cost/preflight, and limitation metadata.
- Fail closed on route, auth, pricing, spend, schema, or host ambiguity.

The MCP adapter may validate inputs, enforce local policy, call an allowlisted API endpoint, preserve the API payload, and add transparent MCP wrapper metadata. It must not become the authority for market meaning, payment approval, or pricing.

## 4. Candidate First Paid Tools

### A. ST-IM Latest And ST-IM History Together

Possible tool names:

- `stocktrends_get_stim_latest`
- `stocktrends_get_stim_history`

Assessment:

- Endpoint certainty from existing docs: Strongest among paid data candidates. Existing architecture and capability docs name `GET /v1/stim/latest` and `GET /v1/stim/history`; Phase 3 static paid policy metadata includes both paths. This task did not reconfirm live API contracts, so implementation still requires current route confirmation.
- Auth contract certainty: Partial. Phase 3 scaffolds future `X-API-Key` header construction for the approved Stock Trends origin, but the exact API key header name and value format remain open before paid execution.
- Pricing/preflight certainty: Insufficient for execution. `stocktrends://pricing/catalog` is validated as a public passive resource, but executable preflight authority is unresolved.
- Agent value: High to critical. ST-IM is Stock Trends-specific, symbol-level, and core to the product's distinctive probabilistic context.
- Misuse risk: High if latest is framed as a standalone forecast or instruction.
- Latest-only risk: High. Latest ST-IM must not ship without history available beside it.
- Input schema complexity: Moderate. Symbol-specific strict validation is tractable.
- Spend-risk profile: Moderate if constrained to one symbol and bounded history; high if ranges or loops are unbounded.
- Suitable as first runtime paid tool: Yes, but only conditionally after route, auth, and pricing/preflight contracts are confirmed.
- Pairing requirement: Latest and history should be implemented in the same increment.
- Implementation timing: Wait. This is the recommended eventual first paid data pair, but not safe to implement until API contract confirmation is complete.

### B. Indicators Latest And Indicators History Together

Possible tool names:

- `stocktrends_get_indicators_latest`
- `stocktrends_get_indicators_history`

Assessment:

- Endpoint certainty from existing docs: Strong. Existing docs name `GET /v1/indicators/latest` and `GET /v1/indicators/history`; Phase 3 static paid policy metadata includes both paths. Current route contract should still be reconfirmed before implementation.
- Auth contract certainty: Partial for the same reason as ST-IM.
- Pricing/preflight certainty: Insufficient for execution for the same reason as ST-IM.
- Agent value: High. Indicators are important for current trend-state context and historical transitions.
- Misuse risk: High if current indicator state is turned into investment advice or read without persistence/history.
- Latest-only risk: High. Latest indicators must not ship without history available beside them.
- Input schema complexity: Moderate. Optional `cs_only` adds a small schema decision.
- Spend-risk profile: Moderate if one symbol and bounded history; high if bulk ranges or repeated calls are allowed.
- Suitable as first runtime paid tool: Viable after contract confirmation, but slightly less preferred than ST-IM because ST-IM is the more distinctive first Stock Trends paid data surface and has a direct methodology resource already validated.
- Pairing requirement: Latest and history should be implemented in the same increment.
- Implementation timing: Wait until after contract confirmation. Prefer as the second paid market-data pair unless API confirmation makes indicators materially clearer than ST-IM.

### C. Selections Latest Only

Possible tool name:

- `stocktrends_get_selections_latest`

Assessment:

- Endpoint certainty from existing docs: Moderate. Existing docs name `GET /v1/selections/latest`, but selection-history and published-selection semantics require more policy clarity before first exposure.
- Auth contract certainty: Partial.
- Pricing/preflight certainty: Insufficient for execution.
- Agent value: Medium-high for candidate discovery.
- Misuse risk: Very high. Selection outputs can be confused with published STIM Select, rankings, recommendations, or an endorsed list.
- Latest-only risk: Very high. Latest-only selections invite broad sweeps and current-list overinterpretation.
- Input schema complexity: Higher than symbol tools because filters, limits, base-vs-published semantics, and include flags need caps and wording.
- Spend-risk profile: High. A selections tool can naturally become broad universe access if not tightly limited.
- Suitable as first runtime paid tool: No.
- Pairing requirement: Should wait for selections history and published-selection policy. Latest-only should not be the first paid exposure.
- Implementation timing: Defer.

### D. Published Intelligence Artifacts

Possible tool names:

- `stocktrends_get_guidance_latest`
- `stocktrends_get_research_latest`
- `stocktrends_get_guidance_by_id`
- `stocktrends_get_research_by_id`

Assessment:

- Endpoint certainty from existing docs: Mixed. Docs name `GET /v1/intelligence/guidance/latest` and `GET /v1/intelligence/research/latest`; by-id tools may wrap confirmed observed canonical routes such as `GET /v1/intelligence/guidance/{artifact_id}` and `GET /v1/intelligence/research/{artifact_id}`. Public discovery and editorial preview candidates remained excluded after `503 application/json` no-key checks, so the discovery path for selecting artifact ids remains unsettled.
- Auth contract certainty: Partial.
- Pricing/preflight certainty: Insufficient for execution.
- Agent value: High once artifact discovery, auth, provenance, and cost are settled.
- Misuse risk: High. Agents may treat artifacts as generated on demand, fresh investment advice, or complete decision instructions.
- Latest-only risk: High for latest artifacts unless by-id/discovery provenance is available. The risk differs from market-data history, but latest-only artifact access is still easy to overread.
- Input schema complexity: Low for latest, moderate for by-id because artifact id source and validation must be strict.
- Spend-risk profile: Moderate per call, but high if clients repeatedly fetch paid artifacts.
- Suitable as first runtime paid tool: No, unless route/auth/cost/artifact provenance contracts are clearer than current docs show. They are not the conservative first choice.
- Pairing requirement: Latest should eventually be paired with by-id or discovery-backed retrieval, not necessarily history.
- Implementation timing: Defer.

### E. Pricing/Cost Preflight Tool Only

Possible tool name:

- `stocktrends_estimate_paid_call_cost`

Assessment:

- Endpoint certainty from existing docs: Partial. `GET /v1/pricing/catalog` is validated as a public passive resource. Docs also discuss a possible `GET /v1/cost-estimate`, but executable cost-estimate authority is not confirmed by the current MCP repo docs as a settled runtime preflight contract.
- Auth contract certainty: Unknown until the preflight endpoint is classified as public/free, free-metered, paid, or authenticated.
- Pricing/preflight certainty: This is the unresolved issue. A public pricing catalog may not be enough to authorize execution, and the MCP adapter must not become the pricing authority.
- Agent value: High for planning, but only if API-authoritative and clearly classified.
- Misuse risk: Medium. The main risk is false confidence: a model-visible estimate tool can be skipped or treated as authorization when policy enforcement must be internal.
- Latest-only risk: Not applicable.
- Input schema complexity: Depends on API contract. Estimating one known tool call is simpler than estimating workflows.
- Spend-risk profile: Low if preflight is public/free; unresolved if preflight can itself incur cost.
- Suitable as first runtime paid tool: Not as the first data tool. Mandatory internal preflight is required before any paid data execution. A separate MCP estimate tool is optional only after its endpoint and cost status are confirmed.
- Pairing requirement: No latest/history pairing, but it must be coupled to every paid execution path.
- Implementation timing: Wait for preflight contract confirmation. If confirmed, implement internal pricing preflight before or in the same branch as the first paid data pair.

### F. No Paid Tools Yet; Contract Confirmation Only

Assessment:

- Endpoint certainty from existing docs: ST-IM and indicators route names are documented, but current route freshness, exact query parameter names, status semantics, auth header format, and pricing/preflight authority still require confirmation.
- Auth contract certainty: Not sufficient for runtime execution.
- Pricing/preflight certainty: Not sufficient for runtime execution.
- Agent value: Indirect but high because it prevents a fragile or unsafe first paid surface.
- Misuse risk: Lowest. No paid runtime exposure is added.
- Latest-only risk: None at runtime.
- Input schema complexity: Documentation only.
- Spend-risk profile: None.
- Suitable as first runtime paid tool: This is not a runtime paid tool, but it is the safest immediate next step.
- Pairing requirement: Not applicable.
- Implementation timing: Recommended immediate next branch.

## 5. Recommended First Paid-Tool Increment

Clear recommendation:

- Do not implement a broad paid tool rollout.
- Do not implement selections latest first.
- Do not implement guidance or research artifacts first.
- Do not expose a pricing estimate tool as a substitute for internal paid-call policy enforcement.
- Treat ST-IM latest + ST-IM history as the recommended eventual first paid data pair, conditional on API contract confirmation.
- Recommend an architecture confirmation branch before runtime implementation because exact auth/header/pricing/preflight contracts remain unresolved.

Direct answers:

| Question | Answer |
| --- | --- |
| Should the first paid implementation be ST-IM latest + history? | Eventually yes, if route, auth, and pricing/preflight contracts are confirmed. It is the preferred first paid data pair. |
| Should indicators latest + history come first instead? | No by default. Indicators latest + history is a strong second candidate and could come first only if API contract confirmation shows indicators are materially clearer or safer than ST-IM. |
| Should selections latest be deferred? | Yes. Latest-only selections should be deferred until history, published-vs-base semantics, limits, and misuse wording are settled. |
| Should intelligence artifacts be deferred? | Yes. Guidance/research should wait until artifact discovery, by-id/latest sequencing, provenance, auth, and cost contracts are clear. |
| Should pricing/cost estimate be implemented before paid data tools? | Mandatory internal pricing/preflight must exist before paid data execution. A separate public MCP estimate tool should be implemented only if the API confirms an authoritative and safe endpoint. |
| Is implementation safe now, or still blocked pending API contract confirmation? | Runtime implementation is still blocked pending API contract confirmation. |

The recommended first paid-tool path is:

```text
architecture/phase4-api-contract-confirmation
then, if confirmed:
implementation/phase4-first-paid-tool-stim-latest-history
```

## 6. Exact Endpoint Contract

Because the recommended immediate next branch is contract confirmation, no paid endpoint should execute yet. The conditional first paid data pair is ST-IM latest + history.

Current endpoint contract status:

| Tool | Backing endpoint path | Method | Auth header | Parameters | Expected status codes | Response class | Paid? | Pricing preflight? | x402? | Route status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stocktrends_get_stim_latest` | `GET /v1/stim/latest` | `GET` | Unresolved. Phase 3 scaffolds future `X-API-Key`, but exact header name and format must be confirmed. | Existing docs describe `symbol_exchange` or `symbol` plus `exchange`. Exact query names and whether `symbol_exchange` is accepted must be confirmed. | Expected to preserve API semantics for `200`, validation errors, `401`, `402`, `403`, `404`, `429`, and `5xx`; exact response bodies and request id fields must be confirmed. | Latest ST-IM expected return distributions and standard deviations, including staleness/missing-data metadata if returned by API. | Yes, per current docs. | Yes, required before execution. Current executable preflight contract unresolved. | No for first implementation unless API contract explicitly requires x402. | Documented in repo docs and Phase 3 static policy metadata; implementation blocked until current API route/auth/pricing contract is confirmed. |
| `stocktrends_get_stim_history` | `GET /v1/stim/history` | `GET` | Same unresolved auth header requirement. | Existing docs describe `symbol_exchange` or `symbol` plus `exchange`, optional `start`, `end`, `limit`, and `include_gaps`. Exact field names, defaults, and bounds must be confirmed. | Expected to preserve API semantics for `200`, validation errors, `401`, `402`, `403`, `404`, `429`, and `5xx`; exact response bodies and request id fields must be confirmed. | Historical ST-IM distribution series ordered by API chronology. | Yes, per current docs. | Yes, required before execution. Current executable preflight contract unresolved. | No for first implementation unless API contract explicitly requires x402. | Documented in repo docs and Phase 3 static policy metadata; implementation blocked until current API route/auth/pricing contract is confirmed. |

Do not invent endpoint aliases. If `GET /v1/stim/latest` or `GET /v1/stim/history` cannot be confirmed from the current front-facing API contract, implementation must remain blocked.

## 7. Input Schema Contract

The first paid implementation should expose strict MCP input schemas only after the backing API parameter contract is confirmed.

Recommended common symbol validation:

- Require one symbol per call.
- Require `exchange` if the API does not accept an unambiguous canonical combined symbol.
- Prefer separate `symbol` and `exchange` fields for MCP clarity unless the API requires `symbol_exchange`.
- Reject unconstrained free-text query fields.
- Reject arrays and multi-symbol bulk inputs.
- Reject unknown fields.
- Trim but do not silently rewrite semantic input.
- Use deterministic local validation errors before any pricing preflight or paid call.
- Do not add `as_of_date` unless the API explicitly supports it.
- Do not provide default sweep behavior.

Proposed `stocktrends_get_stim_latest` MCP input schema:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["symbol", "exchange"],
  "properties": {
    "symbol": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._-]*$"
    },
    "exchange": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._-]*$"
    }
  }
}
```

If the API requires `symbol_exchange`, the contract-confirmation branch should either confirm a strict MCP `symbol_exchange` schema or confirm that the adapter may safely construct the API parameter from separate `symbol` and `exchange` fields. Do not accept both forms in the first implementation unless there is a tested compatibility reason.

Provisional `stocktrends_get_stim_history` MCP input schema, pending API contract confirmation:

The history window fields below are placeholders for the contract-confirmation branch, not a blindly copyable implementation schema. The first runtime implementation must choose the API-confirmed time-window model before shipping: either explicit date range fields or a bounded lookback field. `limit` should be included only if the API confirms it as a supported cap for the chosen model.

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["symbol", "exchange"],
  "properties": {
    "symbol": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._-]*$"
    },
    "exchange": {
      "type": "string",
      "minLength": 1,
      "maxLength": 16,
      "pattern": "^[A-Za-z0-9][A-Za-z0-9._-]*$"
    },
    "start_date": {
      "type": "string",
      "format": "date"
    },
    "end_date": {
      "type": "string",
      "format": "date"
    },
    "lookback_weeks": {
      "type": "integer",
      "minimum": 1,
      "maximum": 260
    },
    "include_gaps": {
      "type": "boolean",
      "default": false
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 260,
      "default": 104
    }
  }
}
```

History validation rules:

- The implementation must choose the API-confirmed time-window model before shipping. If the API supports `start` and `end`, require both `start_date` and `end_date`. If the API supports lookback instead, require bounded `lookback_weeks`. Do not expose both models in the first runtime tool unless a reviewed API compatibility reason requires it.
- If `limit` is API-supported, treat it as a cap on the chosen model, not as a third independent unbounded export mode.
- Recommended initial default is a bounded lookback equivalent to 104 weekly observations.
- Recommended first hard maximum is 260 weekly observations or 260 weeks, pending API/product confirmation.
- `end_date` must not precede `start_date`.
- Future dates must be rejected unless the API explicitly defines future as-of behavior.
- No unbounded historical export is allowed.
- No multi-symbol historical export is allowed.
- Date, range, and limit validation must occur before cost preflight and before the paid call.

## 8. Latest/History Policy

Final rule:

- Latest-only tools must not be framed as complete analytical context.
- History should be available alongside latest for ST-IM and indicators.
- Latest outputs must include limitation and provenance metadata.
- Agent-facing descriptions must encourage historical context before conclusions.
- The MCP server must not auto-create analysis from either latest or history responses.

Direct answers:

| Question | Answer |
| --- | --- |
| Should latest be blocked unless matching history tool is also implemented? | Yes for ST-IM and indicators. `stocktrends_get_stim_latest` should not ship unless `stocktrends_get_stim_history` ships in the same increment or already exists with equivalent controls. Same for indicators latest/history. |
| Should history be callable independently? | Yes. History is valuable as the safer longitudinal context and should be callable without requiring a latest call first. |
| Should a latest response recommend history but not call it automatically? | Yes. Latest responses should include a limitation warning and recommend history for context, but they should not trigger a hidden paid history call. |
| Should the MCP server ever auto-call history after latest? | No by default. Auto-calling history would create hidden paid calls and confuse cost authorization. |

## 9. Output/Provenance Contract

Paid tool output must preserve the Stock Trends API as the authority and distinguish API payload from MCP wrapper metadata.

Required wrapper metadata:

- `source`: `Stock Trends API`
- `endpoint_path`
- `http_method`
- `fetched_at`
- `tool_name`
- `input_parameters`
- `paid_call: true`
- `cost_preflight` or `estimated_cost` metadata when available
- `limitations`
- latest/history context warning where applicable
- upstream request id or response id if returned and safe

Recommended wrapper shape:

```json
{
  "api_data": {},
  "mcp_metadata": {
    "source": "Stock Trends API",
    "endpoint_path": "/v1/stim/latest",
    "http_method": "GET",
    "fetched_at": "2026-07-07T00:00:00.000Z",
    "tool_name": "stocktrends_get_stim_latest",
    "input_parameters": {
      "symbol": "EXAMPLE",
      "exchange": "EXAMPLE"
    },
    "paid_call": true,
    "cost_preflight": {
      "status": "confirmed",
      "pricing_source": "api-authoritative-preflight",
      "estimated_cost": null,
      "currency": null
    },
    "limitations": [
      "Latest ST-IM is a point-in-time API snapshot, not complete analytical context.",
      "Use ST-IM history for longitudinal context before drawing conclusions."
    ]
  }
}
```

Rules:

- Preserve API-authored JSON.
- Do not rewrite output into investment advice.
- Do not generate buy, sell, hold, allocation, risk, or portfolio instructions.
- Do not make a hidden MCP summary the primary output.
- Do not hide or replace API provenance.
- Do not include API keys, bearer tokens, auth headers, payment headers, wallet data, environment values, or other secrets.
- Do not downgrade upstream paid errors into public-data summaries.

## 10. Cost/Preflight Contract

No paid call may execute unless cost can be determined and local policy authorizes it.

Required pre-execution sequence:

1. Validate local paid mode is explicitly enabled.
2. Validate API key is configured without logging or returning it.
3. Validate endpoint is allowlisted for the exact paid tool.
4. Validate host/origin is approved.
5. Validate tool input.
6. Determine cost using API-authoritative pricing/preflight metadata.
7. Check local per-session, per-tool, and budget policy.
8. Execute the paid call only if every gate passes.

Pricing catalog status:

- `stocktrends://pricing/catalog` is validated as public passive planning metadata.
- It is not currently sufficient, by itself, to authorize paid execution.
- If future confirmation says the catalog is authoritative for specific endpoint rule ids, any local estimate derived from it must be deterministic, narrow, tested, and tied to API-provided pricing rule ids.

Dedicated preflight endpoint:

- A dedicated pricing/preflight or cost-estimate endpoint is preferred before first paid execution.
- If the API requires `GET /v1/cost-estimate` or another route, that exact route, input schema, auth requirement, paid/free status, and response schema must be confirmed first.
- If preflight itself can incur cost, that cost must be known and locally authorized before the preflight call.

Failure rules:

- If pricing cannot be determined, block the paid call.
- If pricing metadata is malformed, stale, ambiguous, or missing a rule id, block the paid call.
- If local cap would be exceeded, block the paid call.
- If an upstream `402` requires x402 or payment settlement, do not sign, pay, or retry in the first paid-tool implementation.

Current conclusion: first paid-tool implementation is blocked until the API pricing/preflight contract is confirmed.

## 11. Spend/Rate Policy Contract

First paid-tool limits should be fail-closed and local-only for local stdio.

Required limits:

- Per-session paid call cap.
- Per-tool paid call cap.
- Optional daily cap only after persistence is designed.
- Optional STC budget cap once API cost estimates are confirmed.
- Optional USD budget cap once API cost estimates or authoritative conversion are confirmed.
- No automatic paid retries.
- No broad sweeps.
- No bulk multi-symbol input in the first implementation.
- No hidden background refresh.
- Deterministic `429` handling.
- Fail closed on ambiguity.

Default values recommendation:

| Policy | Recommended default | First validation override |
| --- | --- | --- |
| Per-session paid call cap | `0` until explicitly configured | No more than `5` for controlled validation |
| Per-tool paid call cap | `0` until explicitly configured | No more than `3` for controlled validation |
| Daily cap | Not implemented in local-only first paid branch | Defer |
| STC budget cap | Unset means paid execution blocked for nonzero-cost calls | Set a small explicit validation cap only after cost contract is confirmed |
| USD budget cap | Unset means paid execution blocked for nonzero-cost calls when USD is the cost unit | Set a small explicit validation cap only after cost contract is confirmed |
| History rows/date range | Default 104 weekly observations, max 260 | Adjust only if API/product policy confirms another cap |
| Paid retries | `0` automatic retries | No override in first implementation |

The first implementation should require explicit nonzero local call caps and cost authorization before paid execution. API-side rate limits remain authoritative, but local policy must still prevent loops and broad sweeps.

`429` behavior:

- Return a deterministic MCP rate-limit error.
- Include safe retry-after metadata if returned by the API.
- Do not automatically retry.
- Do not call another paid endpoint as fallback.

## 12. Endpoint Allowlist Coupling

The paid endpoint allowlist and auth header construction must be coupled at the paid-call execution boundary.

Required coupling:

- There should be one internal paid execution boundary that checks endpoint allowlist, approved host, paid-mode state, input validation, pricing/preflight, and spend policy before constructing auth headers.
- No caller should be able to construct auth headers for a non-allowlisted paid endpoint.
- No caller should be able to call an allowlisted endpoint without passing policy checks.
- Public resource code paths must not use the paid auth helper.
- Redirects or alternate URLs must not receive auth headers unless they match the approved Stock Trends API origin and the original endpoint remains allowlisted.
- Endpoint matching should use canonical path and method, not loose substring matching.

Tests must prove:

- Auth header construction fails for non-allowlisted paid paths.
- Auth header construction fails for non-approved hosts.
- Allowlisted endpoint calls still fail if pricing or spend policy fails.
- Public resources never receive auth headers.

## 13. Error Behavior

All paid-tool errors must fail closed, avoid secret leakage, avoid automatic paid retry, avoid silent downgrade to public data, and return deterministic MCP errors.

| Case | Required behavior |
| --- | --- |
| Missing API key | If paid flag is false, no paid tools are registered and public resources work. If paid flag is true, paid mode fails closed; paid tools absent or unusable with safe diagnostic. |
| Invalid API key | Do not validate by startup paid call. On upstream `401`, return deterministic auth error with no secret leakage and no retry. |
| `401` | Authentication failure. Return MCP auth error. Do not retry, switch headers, or downgrade to public data. |
| `402` | Payment required or settlement needed. Return MCP payment-required error with safe metadata if available. Do not sign, pay, call x402, or retry. |
| `403` | Entitlement or policy denial. Return MCP forbidden/plan error. Do not retry with alternate auth. |
| `404` | Endpoint or resource not found. Return deterministic not-found error. Do not invent alternate endpoints. |
| `429` | Rate limited. Return deterministic rate-limit error. Do not automatically retry paid calls. |
| `5xx` | Upstream unavailable or ambiguous. Return upstream failure. Fail closed on charge ambiguity. |
| Pricing unavailable | Block before execution. Return deterministic pricing-unavailable error. |
| Spend cap exceeded | Block before execution. Return deterministic local-policy error. |
| Unapproved endpoint | Block before auth header construction. Return deterministic unapproved-endpoint error. |
| Non-approved host | Block before auth header construction. Return deterministic approved-host error. |

No error may include API keys, bearer tokens, auth headers, payment headers, wallet data, full request headers, environment dumps, or raw exception text containing secrets.

## 14. Security Requirements

Security constraints for the first paid-tool implementation:

- Public resources remain no-auth.
- `STOCKTRENDS_API_KEY` is read only when paid mode is explicitly enabled.
- API key is never logged.
- API key is never returned through MCP.
- Auth is sent only to the validated Stock Trends API origin.
- Auth is sent only through the coupled paid execution boundary.
- No auth headers for public resource reads.
- No wallet handling.
- No x402 payment execution.
- No OAuth.
- No remote MCP transport.
- No database access.
- No control-plane access.
- No dynamic registration from `/v1/ai/tools`.
- No prompts.
- No API recomputation or Intelligence Agent recomputation.
- No investment-advice generation.
- No secret data in docs examples, fixtures, snapshots, logs, diagnostics, or outputs.

## 15. Tests Required Before First Paid Tool Merge

Required automated tests before any paid tool merge:

- No tools unless paid flag is true, key is present, and local policy allows registration.
- Public resources remain credential-free.
- Paid tool not registered if key missing.
- Paid tool not registered if flag false.
- API key alone does not register paid tools.
- Paid flag true but missing key fails closed without breaking public resources.
- Auth header only for approved origin and allowlisted endpoint.
- No auth header for public resources even when key and paid flag are present.
- Pricing unavailable blocks call.
- Spend cap exceeded blocks call.
- Per-tool cap exceeded blocks call.
- Per-session cap exceeded blocks call.
- `401` fails closed.
- `402` fails closed without x402 signing, wallet use, or payment retry.
- `403` fails closed.
- `429` fails closed without automatic retry.
- `5xx` and network ambiguity fail closed.
- No automatic paid retry.
- No broad sweep input.
- No multi-symbol bulk input.
- Latest/history policy enforced.
- ST-IM latest unavailable unless ST-IM history is also registered with equivalent controls.
- Indicators latest unavailable unless indicators history is also registered with equivalent controls.
- Output provenance included.
- Output separates API payload from MCP metadata.
- No secret leakage in logs, errors, snapshots, or returned data.
- No dynamic registration from `/v1/ai/tools`.
- Zero prompts.
- No x402 or wallet behavior.
- No remote MCP transport.
- No database or control-plane access.

Paid tests must use mocks or local fixtures. They must not call paid production endpoints, use real API keys, inspect secrets, test x402 payments, or exercise wallet behavior.

## 16. Manual Validation Required

Manual validation before merge of any first paid-tool implementation:

- Local build passes.
- MCP Inspector over local stdio shows the expected 9 public resources.
- MCP Inspector shows zero prompts.
- Public resources remain readable without a key.
- Public resource reads send no `Authorization` header.
- Public resource reads send no `X-API-Key` header.
- Paid tools absent without paid flag.
- Paid tools absent with key only.
- Paid tools absent with flag true but missing key.
- Paid tools present only under explicit enabled test config if implementation reaches that point.
- MCP Inspector shows expected paid tools only when enabled and policy allows registration.
- No real paid endpoint calls unless explicitly authorized for validation.
- No x402 payment tests.
- No wallet setup.
- No remote MCP transport.

## 17. x402 Sequencing

x402 remains deferred.

The first paid tool should use API-key auth only, unless the front-facing API contract explicitly requires otherwise. If the API requires x402 before paid data can be returned, that is not a reason to smuggle wallet behavior into the first paid-tool branch. It means implementation remains blocked until x402 architecture is designed.

Rules:

- No wallet custody.
- No private keys.
- No payment signing.
- No automatic wallet spend.
- No automatic payment retries.
- No production x402 payment validation from the MCP adapter.
- Surface `402` metadata safely if returned, but do not act on it.

Wallet/payment approval boundaries require a separate architecture phase.

## 18. Remote MCP Sequencing

Remote MCP remains deferred.

Local stdio remains the only transport. Remote MCP would introduce a separate product and security surface, including:

- Hosted secrets.
- Tenant isolation.
- User authentication and authorization.
- Billing attribution.
- Audit logs.
- Abuse controls.
- Distributed rate limits.
- Spend controls across users and processes.
- TLS, CORS, CSRF, request replay, and origin concerns.
- Key revocation and incident response.

No first paid-tool implementation should add HTTP/SSE/Streamable HTTP transport.

## 19. Recommended Next Branch

Recommended next branch:

```text
architecture/phase4-api-contract-confirmation
```

This chooses option B.

Rationale:

- ST-IM latest + history is the recommended eventual first paid data pair.
- Existing repo docs name the likely ST-IM routes.
- Phase 3 foundation exists.
- However exact auth header, pricing/preflight, current route parameter, and executable cost-authorization contracts remain unresolved.
- The default conservative rule blocks paid execution until cost can be determined and local policy authorizes it.

Do not proceed to `implementation/phase4-first-paid-tool-stim-latest-history` until the confirmation branch closes the blocking API contract questions.

## 20. Acceptance Criteria For Recommended Next Branch

For `architecture/phase4-api-contract-confirmation`:

- No runtime code changes.
- No `src/` changes.
- No `tests/` changes.
- No `package.json` changes.
- No package installation.
- No API keys.
- No secret inspection.
- No paid endpoint calls unless explicitly authorized later.
- No x402 testing.
- No database access.
- No control-plane access.
- Confirm exact paid route names for ST-IM latest/history.
- Confirm exact paid route names for indicators latest/history.
- Confirm exact API key header name and format.
- Confirm whether paid calls can use API-key auth without x402.
- Confirm pricing/preflight contract.
- Confirm whether the pricing catalog is authoritative for execution or only planning metadata.
- Confirm whether a dedicated cost-estimate endpoint exists and whether it is public/free, authenticated/free, or paid.
- Confirm ST-IM latest/history request parameter names.
- Confirm ST-IM latest/history response classes and status code bodies.
- Confirm first implementation validation plan.
- Produce an implementation prompt only after confirmation.

If these items cannot be confirmed from the available front-facing API contract, the branch should keep paid runtime implementation blocked.

## 21. Open Questions

Open questions before paid runtime implementation:

- What is the exact API key header name and format?
- Should paid API-key auth use `X-API-Key`, `Authorization: Bearer`, or another scheme?
- What are the exact route names for ST-IM latest/history?
- What are the exact request parameter names for ST-IM latest/history?
- What are the exact route names for indicators latest/history?
- What are the exact request parameter names for indicators latest/history?
- Is the pricing catalog authoritative for preflight execution, or only public planning metadata?
- Does a dedicated cost estimate endpoint exist?
- If a cost estimate endpoint exists, what is its exact path, method, input schema, auth requirement, cost status, and response schema?
- Can paid calls be safely made with API-key auth only, without x402?
- Can preflight itself incur cost?
- What are the default per-session paid call caps?
- What are the default per-tool paid call caps?
- Should STC budget caps, USD budget caps, or both be required before execution?
- What initial history lookback and row limits should ship?
- Should latest/history be paired in one PR?
- Should guidance/research be tools or authenticated resources later?
- For guidance/research, should by-id artifact routes or latest routes come first?
- Should artifact by-id tools require discovery metadata first?
- How should `GET /v1/intelligence/discovery` and `GET /v1/intelligence/editorial/latest/preview` be handled if they remain unavailable to no-key public reads?
- Should selections expose base selections, published selections, or neither before selection history is designed?
- Should symbol resolution be required before first symbol-specific paid tools?

## 22. Draft Future Prompt

DRAFT ONLY — DO NOT EXECUTE IN THIS TASK

You are acting as architecture author for the Stock Trends MCP Server.

Repository:

```text
stocktrends-mcp-server
```

Branch/worktree:

Create and work in a dedicated branch/worktree named:

```text
architecture/phase4-api-contract-confirmation
```

Do not modify `main` directly.

Task type:

Architecture/contract confirmation only.

Do not implement runtime code. Do not modify `src/`. Do not modify `tests/`. Do not modify `package.json`. Do not install packages. Do not add MCP tools. Do not add MCP prompts. Do not call paid endpoints. Do not use API keys. Do not inspect secrets. Do not test x402 payments. Do not call the database. Do not touch the private API control plane. Do not make live API calls unless explicitly asked later.

Binding documents to read first:

- `README.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/MCP_SERVER_ARCHITECTURE.md`
- `docs/API_CAPABILITY_COVERAGE_AUDIT.md`
- `docs/SECURITY_MODEL.md`
- `docs/PHASE1_VALIDATION_REPORT.md`
- `docs/PHASE2_VALIDATION_REPORT.md`
- `docs/PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md`
- `docs/PHASE3_PAID_AUTH_FOUNDATION_IMPLEMENTATION_NOTES.md`
- `docs/PHASE3_PAID_AUTH_FOUNDATION_VALIDATION_REPORT.md`
- `docs/PHASE4_FIRST_PAID_TOOL_CONTRACT_MEMO.md`

Primary deliverable:

Create a documentation-only contract confirmation memo, for example:

```text
docs/PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md
```

Optionally update `README.md` only to add a link to the new memo.

Purpose:

Confirm whether the first paid implementation can safely proceed as `implementation/phase4-first-paid-tool-stim-latest-history`.

Required decisions:

- Confirm exact ST-IM latest/history route names.
- Confirm exact ST-IM latest/history input parameter names.
- Confirm exact ST-IM latest/history response classes and status code behavior.
- Confirm exact API key header name and format.
- Confirm whether API-key paid calls can execute without x402.
- Confirm whether the pricing catalog is authoritative for execution preflight.
- Confirm whether a dedicated cost estimate endpoint exists.
- Confirm whether preflight is public/free, authenticated/free, or paid.
- Confirm required local cap defaults for first paid validation.
- Confirm whether ST-IM latest/history should be implemented in one PR.
- Confirm whether indicators latest/history should remain second.
- Confirm whether paid runtime implementation is safe now or still blocked.

Acceptance criteria:

- Documentation only.
- No code changes.
- No tests changed.
- No packages installed.
- No live API calls unless explicitly authorized.
- No paid calls.
- No API keys.
- No x402.
- No database.
- No control plane.
- Clear `APPROVE IMPLEMENTATION` or `BLOCK IMPLEMENTATION` conclusion.
- If implementation is approved, include a draft implementation prompt for the exact next branch.

Do not commit unless explicitly asked.
