# Phase 3 Paid Tools Auth and Spend Design Memo

## 1. Purpose of Phase 3

Phase 3 is an architecture boundary phase. It does not implement paid MCP tools, API-key forwarding, x402 payments, wallet behavior, remote MCP transport, or new runtime code.

The purpose of this phase is to define the controls required before the Stock Trends MCP Server may expose API-key authenticated paid tools. It answers which paid surfaces are safe candidates, what must remain blocked, how credentials should be handled, how paid tools should be explicitly enabled, how pricing and spend controls should work, how latest/history sequencing should be enforced, and what tests are required before any paid runtime exposure.

The controlling authority boundary remains:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a thin adapter over the front-facing Stock Trends API. It must not become a database client, control-plane client, pricing authority, payment authority, parallel reasoning layer, Intelligence Agent recomputation layer, or source of investment conclusions independent of the API.

## 2. Validated Baseline

Phase 1 and Phase 2 are complete, implemented, validated, merged, and documented.

The validated current MCP server behavior is:

- Local stdio transport only.
- Public resources only.
- 9 MCP resources.
- Zero MCP tools.
- Zero MCP prompts.
- No API key required.
- No API key read, logged, sent, or forwarded.
- No `Authorization` header.
- No `X-API-Key` header.
- No paid endpoints.
- No x402 behavior.
- No wallet handling.
- No OAuth.
- No remote MCP transport.
- No database access.
- No control-plane access.
- No dynamic MCP registration from `GET /v1/ai/tools`.

The current resources are:

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

The following candidates remain excluded because Phase 1 and Phase 2 no-key checks returned `503 application/json`:

| Excluded candidate resource | Backing endpoint |
| --- | --- |
| `stocktrends://intelligence/discovery` | `GET /v1/intelligence/discovery` |
| `stocktrends://intelligence/editorial/latest/preview` | `GET /v1/intelligence/editorial/latest/preview` |

These excluded resources must not be replaced with paid artifact calls, generated summaries, API-key fallback, x402 payment, or Intelligence Agent recomputation.

## 3. Paid-Tool Architectural Principle

Paid tools may only be thin, explicit, user-enabled wrappers over canonical front-facing Stock Trends API endpoints.

Paid tools must not:

- Infer conclusions not returned by the API.
- Recompute Stock Trends indicators, ST-IM distributions, selections, rankings, guidance, research, or editorial outputs.
- Synthesize investment advice.
- Generate buy, sell, hold, allocation, or risk instructions.
- Batch-sweep symbols by default.
- Hide cost, pricing, metering, auth, payment, or plan behavior.
- Automatically retry paid calls.
- Treat latest-only data as sufficient where history is needed.
- Dynamically register from `GET /v1/ai/tools`.
- Use database, control-plane, or Intelligence Agent internals.

The MCP adapter may validate inputs, enforce local policy, call approved API endpoints, preserve API-authored payloads, and add transparent MCP wrapper metadata such as endpoint path, fetched-at timestamp, pricing/preflight metadata, local cap state, and limitation notes.

## 4. Candidate Paid Tools

The following table evaluates the candidate paid tools named for future design. Public/paid status remains an implementation-time contract check, but the current architecture and capability audit classify these endpoints as paid/protected.

| Future MCP tool | Backing endpoint known from docs | Expected input schema | Expected output class | Paid/public status assumption | Agent value | Misuse risk | Symbol input? | Portfolio/selection identifier input? | Requires history beside latest? | Candidate decision | Required guardrails |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `stocktrends_get_stim_latest` | `GET /v1/stim/latest` | Strict object with either `symbol_exchange` or `symbol` plus `exchange`; no arrays or free-text search. | Latest ST-IM expected return distributions and standard deviations across API-defined horizons, with staleness and missing-data metadata where returned. | Paid/protected. | High: gives current symbol-level probabilistic context. | High: latest snapshot can be misread as a standalone forecast, price target, or instruction. | Yes. | No. | Yes. Must not ship alone. | Later candidate; only acceptable in the first paid data increment if `stocktrends_get_stim_history` ships in the same increment and the auth/spend/pricing foundation is complete. | Explicit paid opt-in, API key, approved-host auth, pricing preflight, per-session and per-tool caps, no automatic retry, endpoint allowlist, metadata-first descriptions, latest limitation note. |
| `stocktrends_get_stim_history` | `GET /v1/stim/history` | Strict object with canonical symbol input, bounded `start`/`end`, `limit`, optional `include_gaps`; reviewed default and max lookback. | Historical ST-IM distribution series ordered by API chronology. | Paid/protected. | Critical: exposes longitudinal stability, gaps, and regime changes. | High: broad windows and repeated calls can spend quickly; series can still be overinterpreted. | Yes. | No. | It is the history pair for latest. | Later candidate; strongest first paid data candidate when paired with ST-IM latest after the foundation increment. | Same paid controls as latest, plus max rows, max lookback, deterministic date validation, no symbol batches, gap/staleness warnings. |
| `stocktrends_get_indicators_latest` | `GET /v1/indicators/latest` | Strict object with either `symbol_exchange` or `symbol` plus `exchange`; optional `cs_only` with explicit default. | Latest weekly Stock Trends indicator row and trend-state fields returned by API. | Paid/protected. | High: gives current indicator context for a symbol. | High: current state can be overread without persistence and transition history. | Yes. | No. | Yes. Must not ship alone. | Later candidate; viable first paid data pair only if `stocktrends_get_indicators_history` ships alongside it and controls are complete. | Explicit paid opt-in, pricing preflight, caps, no auto retry, metadata resource guidance, latest limitation note, indicator-definition provenance. |
| `stocktrends_get_indicators_history` | `GET /v1/indicators/history` | Strict object with canonical symbol input, optional `cs_only`, bounded `start`/`end`, `limit`; reviewed defaults and max lookback. | Historical indicator series, including persistence and trend-state transitions where returned. | Paid/protected. | Critical: prevents snapshot-only indicator interpretation. | High: excessive date windows, repeated calls, and ungrounded trend narratives. | Yes. | No. | It is the history pair for latest. | Later candidate; should be paired with indicators latest in the first indicators increment. | Date/window bounds, max rows, pricing preflight, caps, no symbol batches, no generated conclusion language. |
| `stocktrends_get_selections_latest` | `GET /v1/selections/latest` | Strict object with bounded filters such as `exchange`, `min_prob13wk`, `limit`, `include_data`, `include_mast`, `cs_only`; no unconstrained bulk fetch. | Latest base ST-IM selection universe or ranked candidate list as returned by API. | Paid/protected. | Medium-high: useful for current candidate discovery. | Very high: can be confused with published STIM Select; can become broad sweep behavior. | No required symbol; may accept optional filters only. | No portfolio or selection id required by the documented latest endpoint. | Yes. Selection-history policy must be settled before latest exposure. | Later candidate; exclude from first paid increment unless history/published-selection semantics and caps are separately designed. | Low default limit, hard max limit, published-vs-base wording, no bulk sweeps, pricing preflight, caps, endpoint allowlist, no re-ranking. |
| `stocktrends_get_guidance_latest` | `GET /v1/intelligence/guidance/latest` | Empty strict object; no free-text prompt. Future by-id tool should use `artifact_id` from canonical discovery/manifest data and wrap `GET /v1/intelligence/guidance/{artifact_id}`. | Latest API-served market guidance artifact envelope. | Paid/protected. | High: retrieves canonical published guidance artifact. | High: agents may treat latest guidance as live generated advice or complete portfolio instruction. | No. | No portfolio or selection id. Future by-id form would require `artifact_id`. | Different policy: published reasoning artifact, not market data series. Latest should still prefer discovery/by-id provenance when available. | Later candidate; not first paid increment until artifact discovery, provenance, and by-id/latest policy are stable. | Preserve artifact envelope, artifact id, content hash/provenance if returned, no generated advice, pricing preflight, caps, no silent downgrade to preview. |
| `stocktrends_get_research_latest` | `GET /v1/intelligence/research/latest` | Empty strict object; no free-text prompt. Future by-id tool should use `artifact_id` from canonical discovery/manifest data and wrap `GET /v1/intelligence/research/{artifact_id}`. | Latest API-served market research artifact envelope. | Paid/protected. | High: retrieves canonical published research artifact. | High: agents may summarize beyond source grounding or treat artifact as generated on demand. | No. | No portfolio or selection id. Future by-id form would require `artifact_id`. | Different policy: published reasoning artifact, not market data series. Latest should still prefer discovery/by-id provenance when available. | Later candidate; not first paid increment until artifact discovery, provenance, and by-id/latest policy are stable. | Preserve API-authored JSON and artifact provenance, no buy/sell/hold wrapper, pricing preflight, caps, no generated replacement research. |

No candidate above should be exposed in Phase 3 as a paid runtime tool. Latest-only standalone exposure is explicitly excluded.

## 5. Recommended First Paid-Tool Increment

Recommendation for the first-increment alternatives above: choose A, API-key foundation only, with no tools registered.

The first implementation branch after this memo should be:

```text
implementation/phase3-paid-auth-foundation-no-tools
```

This branch should introduce only the configuration, policy, host enforcement, redaction, and tests needed to make future paid tools possible. It should keep the visible MCP surface unchanged: 9 public resources, zero tools, zero prompts, no paid endpoint calls, no x402, no wallet, and no remote transport.

Rationale:

- Paid tools are not safe to implement until API-key handling, explicit opt-in, approved-host auth forwarding, secret redaction, paid endpoint allowlisting, pricing/preflight behavior, spend caps, and fail-closed status handling are implemented and tested.
- The pricing catalog is currently a passive public resource. It is useful planning metadata, but it is not by itself sufficient authorization to execute paid calls.
- Latest-only risk remains significant for ST-IM, indicators, and selections. The first paid data increment must ship history beside latest.
- The exact API key header contract, pricing/preflight contract, default cap values, and artifact route policy remain open questions.

Paid data tools can become safe only after the no-tools foundation is complete and a subsequent implementation prompt explicitly includes the paired latest/history tools and their tests.

## 6. API Key Architecture

Future API-key behavior should use the following environment variable names:

| Variable | Purpose | Default |
| --- | --- | --- |
| `STOCKTRENDS_API_KEY` | Local credential for authenticated Stock Trends API calls. | unset |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | Explicit local opt-in for registering paid MCP tools. | `false` |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | Require pricing or cost determination before paid execution. | `true` |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | Optional maximum paid calls in one MCP server session. | reviewed conservative value or unset until decided |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | Optional maximum paid calls per tool in one session. | reviewed conservative value or unset until decided |
| `STOCKTRENDS_MAX_STC_PER_SESSION` | Optional STC-denominated spend cap. | unset until cost contract is confirmed |
| `STOCKTRENDS_MAX_USD_PER_SESSION` | Optional USD-denominated spend cap. | unset until conversion/cost contract is confirmed |

Preferred credential rule:

- Public resources never require `STOCKTRENDS_API_KEY`.
- Public resource reads must not send an API key, even when `STOCKTRENDS_API_KEY` is present.
- `STOCKTRENDS_API_KEY` is read only when `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.
- API key alone is insufficient to register paid tools.
- Paid tools require both explicit enablement and valid credential configuration.
- The implementation should default to `X-API-Key` only if the front-facing API contract confirms that header. Bearer auth should be supported only if the API contract explicitly requires or accepts it.

Approved-host rule:

- Auth headers may be sent only to the approved Stock Trends API base URL host derived from `STOCKTRENDS_API_BASE_URL`.
- Auth headers must never be sent to arbitrary user-supplied URLs, prompt-supplied URLs, API-payload URLs, redirect targets, non-HTTPS origins, or non-Stock-Trends hosts.
- Redirects to unapproved hosts must fail closed before forwarding credentials.

Secret handling:

- Never log `STOCKTRENDS_API_KEY`, bearer tokens, auth headers, payment headers, wallet data, environment dumps, or raw request headers.
- Redact secrets from errors, diagnostics, snapshots, exceptions, and tests.
- Never expose credentials through MCP resources, tools, prompts, or startup summaries.

Missing key behavior:

- If `STOCKTRENDS_ENABLE_PAID_TOOLS` is absent or false, missing key is normal and public resources remain available.
- If `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and `STOCKTRENDS_API_KEY` is missing or blank, paid tools must fail closed. Preferred local stdio behavior is to register no paid tools and emit a safe stderr diagnostic, preserving public resources.

Invalid key behavior:

- Do not validate keys by calling paid endpoints at startup.
- When paid tools exist in a later phase, an upstream `401` must return a clear MCP auth error with no secret leakage, no retry, and no silent downgrade to public data.

Required foundation test:

- With `STOCKTRENDS_API_KEY` set and `STOCKTRENDS_ENABLE_PAID_TOOLS` absent or false, startup and public resources must behave exactly like public mode: no paid tools registered and no auth headers sent.

## 7. Paid-Tool Enablement Flag

The explicit local opt-in flag should be:

```text
STOCKTRENDS_ENABLE_PAID_TOOLS=true
```

Required behavior:

| Configuration | Required behavior |
| --- | --- |
| Flag absent | Default false. No paid tools registered. Public resources remain available. |
| Flag set to false-like value | No paid tools registered. Public resources remain available. |
| `STOCKTRENDS_API_KEY` present but flag absent | No paid tools registered. API key ignored. No auth headers sent. Public resources remain available. |
| Flag true but API key missing/blank | Fail closed for paid mode. Preferred behavior: register no paid tools and emit a safe diagnostic; public resources remain available. |
| Flag true and API key present | Paid tools may be registered only after the paid endpoint allowlist, pricing/preflight policy, spend caps, and tests exist. In the recommended next branch, tools remain zero even in this configuration. |

The enablement flag is local policy. It does not override API authentication, API authorization, pricing, payment, plan restrictions, rate limits, or endpoint availability.

## 8. Pricing/Cost Preflight Architecture

The existing `stocktrends://pricing/catalog` resource is useful public planning metadata, but it is not automatically sufficient to authorize paid calls.

Pricing rules:

- No paid call should execute if cost cannot be determined and authorized by local policy.
- Every paid tool call should perform pricing/cost preflight before execution unless a reviewed API contract proves a deterministic zero-cost path.
- Preflight should be API-authoritative. The preferred model is a front-facing pricing or cost-estimate endpoint, such as `/v1/cost-estimate`, or an API-confirmed per-endpoint pricing contract.
- The MCP adapter must not become a pricing authority. If it uses the public pricing catalog to compute an estimate, that computation must be narrow, deterministic, tested, and tied to API-provided rule IDs.
- Pricing preflight failure must block the paid call.
- Unknown pricing, unknown paid/free status, missing pricing rule, unsupported currency, malformed preflight response, or network ambiguity must fail closed.
- Preflight itself should ideally be public/free or explicitly classified. If preflight can incur cost, that cost must also be preflighted or otherwise authorized by local policy before execution.

How to expose estimated cost:

- Paid tool descriptions should declare that calls are paid and require pricing preflight.
- Tool results should include non-sensitive pricing metadata when available: pricing rule id, estimated STC/USD cost, preflight endpoint or pricing source, local cap state, and whether the estimate was API-provided.
- If MCP clients support structured confirmation or annotations in a future SDK path, paid calls should surface cost metadata before execution. Until that exists, local policy must decide authorization without relying on model-visible prose alone.

Separate tool or internal step:

- For the first paid data tools, pricing preflight should be an internal mandatory step so a client cannot bypass it.
- A separate future planning tool such as `stocktrends_estimate_cost` may be useful only if it is public/free or otherwise covered by the same spend controls. It must not be required as a separate client call before every paid tool because clients can forget to call it.

## 9. Spend and Rate Safety Architecture

Minimum controls before any paid tool is exposed:

- Per-session paid call cap.
- Per-tool paid call cap.
- Optional daily cap after persistence is designed.
- Optional STC budget cap once API cost estimates are confirmed.
- Optional USD budget cap if API returns USD estimates or an authoritative conversion.
- No automatic paid retries.
- No hidden background refresh of paid endpoints.
- No broad symbol sweeps by default.
- No multi-symbol bulk endpoint unless explicitly designed, capped, priced, and tested.
- Strict max limits for history and selection responses.
- Deterministic `401`, `402`, `403`, `429`, and `5xx` handling.
- Fail-closed behavior on network ambiguity, timeout, redirect, unknown charge state, or malformed pricing response.
- Paid endpoint allowlist.
- Local-only accounting for Phase 3.
- Future persistent accounting only after separate review.
- Budget-exceeded errors that do not trigger retries.
- Optional loop detection for repeated identical paid calls.

Local-only accounting is acceptable for the first paid-tool design because the server is local stdio and single-user. Persistent daily budgets, shared caps, cross-process accounting, and hosted billing attribution should be deferred until separate review.

## 10. History-Beside-Latest Policy

The API capability audit identifies latest-only exposure as the largest MCP design risk.

Policy:

- Latest endpoints must not be presented as complete analytical context.
- History endpoints should be available before or alongside latest where longitudinal interpretation matters.
- Tool descriptions should guide agents to request historical context when forming conclusions.
- Latest-only outputs should carry a limitation note or provenance metadata saying they are snapshots, not complete analysis.
- Metadata resources such as `stocktrends://methodology/stim`, `stocktrends://methodology/indicators`, and `stocktrends://methodology/inference` should be recommended before paid interpretation.

Direct answers:

- `stocktrends_get_stim_latest` should be blocked until `stocktrends_get_stim_history` is available in the same implementation increment or already registered with equivalent controls.
- `stocktrends_get_indicators_latest` should be blocked until `stocktrends_get_indicators_history` is available in the same implementation increment or already registered with equivalent controls.
- Guidance and research artifacts should be treated differently because they are published reasoning artifacts, not raw market data series. They may have latest retrieval without a paired history series, but they must preserve artifact provenance, avoid generated advice, and preferably support discovery/by-id retrieval so clients can fetch a specific published artifact rather than overfit to whichever artifact is latest.

Selections require separate caution. `stocktrends_get_selections_latest` should remain blocked until selection-history policy and base-vs-published selection wording are settled.

## 11. Tool Schema Principles

Common schema rules for paid tools:

- Strict input validation before any API call.
- Reject unknown fields unless a specific compatibility reason is reviewed.
- Require canonical `symbol_exchange` or strict `symbol` plus `exchange` for symbol-specific tools.
- Validate symbol and exchange formats locally before paid calls.
- No unconstrained free-text query that could become broad search.
- No arrays or multi-symbol inputs unless a bulk design is separately reviewed.
- Bounded date ranges for history.
- Reviewed max lookback and default lookback for history.
- Reviewed default and maximum `limit`.
- No default bulk sweeps.
- Deterministic local validation errors.
- Deterministic upstream error mapping.
- Provenance fields in output.
- Endpoint path used in output.
- `fetched_at` timestamp in output.
- Pricing/preflight metadata in output when available.
- Limitation notes for latest-only outputs.
- Explicit `paid: true` or equivalent wrapper metadata when appropriate.

Inputs must not be able to alter API base URL, auth headers, pricing policy, spend caps, logging policy, transport, or endpoint allowlist.

## 12. Output/Provenance Requirements

Paid tool output should preserve the API as the authority.

Output standards:

- Raw API-authored JSON should remain available or be faithfully passed through.
- The MCP wrapper may add transparent transport/provenance metadata.
- The MCP wrapper must not rewrite API results into advice.
- The MCP wrapper must not generate buy, sell, hold, allocation, or risk instructions.
- The MCP wrapper must not make ungrounded summaries the primary output.
- API data, published intelligence artifacts, and MCP wrapper metadata must be distinguishable.
- API endpoint path, method, fetched-at timestamp, API base host, request id if returned, and schema/version fields if returned should be preserved where safe.
- Pricing/preflight metadata should be included when available and non-sensitive.
- Limitation notes should explain latest snapshots, missing-data fields, date windows, and cost policy without changing API facts.

Recommended wrapper shape:

```json
{
  "api_data": {},
  "mcp_metadata": {
    "endpoint_path": "/v1/example",
    "fetched_at": "ISO-8601 timestamp",
    "paid": true,
    "pricing": {},
    "limitations": []
  }
}
```

The exact schema should be finalized in the implementation branch, but the authority split should not change.

## 13. 401/402/403/429 Behavior

Paid tools must fail closed and preserve upstream status semantics.

| Status | Meaning | Required MCP behavior |
| --- | --- | --- |
| `401` | Missing, invalid, expired, or rejected authentication. | Return clear MCP auth error. Do not log or echo credential material. Do not retry. Do not ask the API through an alternate route. Do not downgrade to public data. |
| `402` | Payment required, insufficient balance, settlement required, or machine-payment challenge. | Return clear MCP payment-required error with safe payment metadata if returned. Do not sign, pay, or retry. Do not downgrade to public data. |
| `403` | Forbidden, plan restriction, entitlement restriction, or policy denial. | Return clear MCP forbidden/plan error. Do not retry with alternate auth. Do not downgrade to public data. |
| `429` | Rate limited. | Return clear MCP rate-limit error with safe retry-after metadata if returned. Do not automatically retry paid calls. Count no local retry as a new paid attempt. |
| `5xx` | Upstream unavailable or ambiguous failure. | Return upstream-unavailable error. Fail closed on charge ambiguity. Do not retry paid calls unless a future API contract proves no charge occurred and local policy allows it. |

All errors must avoid secret leakage, raw header leakage, wallet leakage, full environment dumps, and raw exception dumps.

## 14. x402 Sequencing

x402 should come after API-key paid-tool foundation, not before it.

Default recommendation:

- Do not implement x402 in the first paid-tool increment.
- Treat x402 as a separate architecture phase.
- The earliest safe x402 work is an architecture or planning mode that can surface API `402` payment metadata without wallet custody, signing, payment retries, or automatic spending.

Local MCP server versus clients/host:

- Wallet approval should remain at the user or MCP host boundary unless a separate design explicitly authorizes local MCP wallet integration.
- The MCP server may eventually surface payment challenge metadata, but it should not hold private keys, seed phrases, wallet config, or signing clients in the first paid phases.
- Automatic wallet spending must be prohibited.

Required wallet approval boundary before any future x402 runtime:

- Explicit local opt-in for x402 mode.
- Explicit per-payment approval or bounded-session approval.
- Hard STC/USD spend caps.
- Payment endpoint allowlist.
- Challenge validation.
- Replay protection.
- Clear failed-payment and unknown-charge handling.
- Secret and payment-header redaction.
- Tests using mocks only unless separately authorized.

Recommended future branch for x402 remains `architecture/phase4-x402-payment-design`, after API-key paid auth foundation is complete.

## 15. Remote MCP Sequencing

Remote MCP should remain deferred.

A hosted or remote MCP server would become an internet-facing broker for paid API calls. It needs separate design for:

- Tenant isolation.
- Hosted secrets.
- User authentication.
- OAuth or equivalent delegated auth.
- Audit logs and retention.
- Rate limits.
- Abuse controls.
- Billing attribution.
- CORS and origin concerns.
- TLS and request replay protection.
- Key revocation and incident response.
- Per-user spend caps and entitlement checks.

Local stdio should remain the only transport for now because it keeps credentials local to the user's environment and avoids introducing hosted secret custody, tenant separation, and public network attack surface before those controls are designed.

## 16. Security Model Updates Required

No edit to `docs/SECURITY_MODEL.md` is required in this Phase 3 memo task.

Before paid tools are implemented, `docs/SECURITY_MODEL.md` should be updated or explicitly reconfirmed to cover:

- Final API key header contract.
- Final paid enablement flag.
- Whether paid-mode missing key causes startup error or no paid tools with diagnostic.
- Approved Stock Trends host enforcement for auth headers.
- No-auth-header rule for public resources even when `STOCKTRENDS_API_KEY` is present.
- Secret redaction helper behavior.
- Paid endpoint allowlist.
- Pricing/cost preflight contract.
- Default per-session and per-tool caps.
- Default STC/USD spend cap behavior.
- History endpoint default/max limits.
- Selection endpoint max limits and base-vs-published wording.
- `401`, `402`, `403`, `429`, and `5xx` fail-closed behavior.
- x402 preview versus authorization boundary.
- No wallet behavior until a separate phase.
- Remote MCP exclusion until a separate security review.

## 17. Required Tests Before Paid Tools

Before any paid tools are merged, tests must prove:

- No tools when `STOCKTRENDS_ENABLE_PAID_TOOLS` is absent.
- No tools when `STOCKTRENDS_API_KEY` is present but paid flag is absent.
- Failure or no paid tools with safe diagnostic when paid flag is true but key is missing.
- Auth header sent only to approved Stock Trends host.
- No auth header for public resources.
- Public resources still work without an API key.
- Public resources still avoid auth headers when an API key is present.
- No secret logging in normal, error, snapshot, and diagnostic paths.
- Paid endpoint allowlist blocks unknown paid paths.
- Pricing preflight failure blocks paid call.
- Unknown pricing blocks paid call.
- Spend cap exceeded blocks paid call.
- Per-tool cap exceeded blocks paid call.
- Per-session cap exceeded blocks paid call.
- No automatic paid retries.
- `401` fails closed.
- `402` fails closed without wallet/signing/payment retry.
- `403` fails closed.
- `429` fails closed without automatic retry.
- `5xx` and network ambiguity fail closed.
- Latest/history policy enforcement blocks ST-IM latest without ST-IM history.
- Latest/history policy enforcement blocks indicators latest without indicators history.
- Selection latest remains blocked until selection-history policy is implemented.
- No dynamic registration from `GET /v1/ai/tools`.
- No x402 or wallet behavior unless explicitly enabled in a future phase.
- No remote MCP transport.
- No database or control-plane access.
- Output preserves API data separately from MCP wrapper metadata.
- Tool schemas reject broad free-text, arrays, unbounded history, and unknown endpoint selection.

Paid tests should use mocks or local fixtures only. They should not call paid production endpoints, use real API keys, inspect secrets, or exercise x402 payments.

## 18. Proposed Next Branch

Recommended next branch:

```text
implementation/phase3-paid-auth-foundation-no-tools
```

This is option B from the separate proposed-next-branch choices:

- A. `architecture/phase3-paid-tools-contract-and-policy`
- B. `implementation/phase3-paid-auth-foundation-no-tools`
- C. `implementation/phase3-first-paid-tools`
- D. `architecture/phase4-x402-payment-design`

The recommendation is conservative because it implements only the foundation needed for future paid tools while keeping the exposed MCP surface unchanged.

Paid-tool implementation remains blocked until this foundation exists and the open API contract questions are resolved.

## 19. Acceptance Criteria for Next Branch

If the next branch is `implementation/phase3-paid-auth-foundation-no-tools`, acceptance criteria are:

- Public resources unchanged.
- 9 public resources remain available.
- Paid tools still zero.
- Prompts still zero.
- API-key config may be introduced, but no paid tools are registered.
- `STOCKTRENDS_ENABLE_PAID_TOOLS` is defined and defaults to false.
- `STOCKTRENDS_API_KEY` is ignored unless paid mode is explicitly enabled.
- API key present but paid flag absent registers no paid tools and sends no auth headers.
- Paid flag true but missing key fails closed for paid mode while preserving public-resource behavior.
- Approved Stock Trends host enforcement exists before any auth header can be sent.
- Redirects to unapproved hosts do not receive auth headers.
- Secret redaction exists and is tested.
- Public resources send no auth headers.
- Tests cover flag/key behavior.
- Tests cover no-tools/no-prompts invariants.
- Tests cover approved-host enforcement.
- Tests cover secret redaction.
- No paid endpoint calls.
- No x402.
- No wallet.
- No OAuth.
- No remote MCP.
- No database access.
- No control-plane access.
- No dynamic registration from `GET /v1/ai/tools`.

This branch should not claim paid tools are live. It should only make future paid-tool registration safer to implement and review.

## 20. Open Questions

The following questions require user/API confirmation before paid runtime exposure:

- Exact API key header contract.
- Whether API-key auth should use `X-API-Key`, `Authorization: Bearer`, or another scheme.
- Exact paid endpoint list and current route names.
- Whether `/stim/latest` and `/stim/history` are paid with the same auth model.
- Whether `/indicators/latest` and `/indicators/history` are paid with the same auth model.
- Pricing/cost estimate contract.
- Whether pricing catalog is authoritative enough for preflight.
- Whether a specific `/v1/cost-estimate` or equivalent endpoint should be required for every paid call.
- Whether preflight itself can incur cost.
- Default spend cap values.
- Default per-session paid call cap.
- Default per-tool paid call cap.
- Whether cost cap should be STC, USD, or both.
- Whether symbol resolution must be implemented before any paid symbol-specific tool.
- Whether selection latest requires a history endpoint, published-selection endpoint, or both before exposure.
- Whether x402 should follow API-key mode or be prioritized earlier.
- Whether intelligence artifacts should be paid tools or authenticated resources once authenticated.
- Whether guidance/research should be fetched by id, latest, or both.
- Whether `GET /v1/intelligence/discovery` and `GET /v1/intelligence/editorial/latest/preview` will become healthy public no-key resources.
- Whether guidance/research by-id routes support older artifacts and what retention guarantees exist.
- Whether future remote MCP is a product goal or should remain out of scope indefinitely.

## 21. Draft Future Implementation Prompt

DRAFT ONLY — DO NOT EXECUTE IN THIS TASK

You are implementing the next conservative Phase 3 foundation for the Stock Trends MCP Server.

Repository:

```text
stocktrends-mcp-server
```

Branch:

Create and work in a dedicated branch named:

```text
implementation/phase3-paid-auth-foundation-no-tools
```

Do not modify `main` directly.

Task type:

Implementation of API-key and paid-mode foundation only. Do not register paid tools.

Binding documents to read first:

- `README.md`
- `docs/ARCHITECTURE_DECISIONS.md`
- `docs/MCP_SERVER_ARCHITECTURE.md`
- `docs/API_CAPABILITY_COVERAGE_AUDIT.md`
- `docs/SECURITY_MODEL.md`
- `docs/PHASE1_STDIO_PUBLIC_RESOURCES_IMPLEMENTATION_MEMO.md`
- `docs/PHASE1_IMPLEMENTATION_NOTES.md`
- `docs/PHASE1_VALIDATION_REPORT.md`
- `docs/PHASE2_PUBLIC_METADATA_AND_PAID_TOOL_BOUNDARY_MEMO.md`
- `docs/PHASE2_PUBLIC_METADATA_IMPLEMENTATION_NOTES.md`
- `docs/PHASE2_VALIDATION_REPORT.md`
- `docs/PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md`

Hard constraints:

- Preserve local stdio transport only.
- Preserve existing public resources.
- Keep zero MCP tools.
- Keep zero MCP prompts.
- Do not add paid tools.
- Do not add paid resources.
- Do not call paid endpoints.
- Do not use real API keys.
- Do not inspect secrets.
- Do not test x402 payments.
- Do not modify `package.json`.
- Do not install packages.
- Do not commit unless explicitly asked.
- Do not add wallet handling.
- Do not implement OAuth.
- Do not implement remote HTTP/SSE/Streamable HTTP transport.
- Do not access a database.
- Do not access the Stock Trends API control plane.
- Do not touch sibling repositories.
- Do not recompute indicators, ST-IM, selections, rankings, guidance, research, editorial conclusions, or any Intelligence Agent artifact.
- Do not dynamically register tools or resources from `GET /v1/ai/tools`.

Implement only:

- Configuration parsing for `STOCKTRENDS_ENABLE_PAID_TOOLS`, default false.
- Configuration parsing for `STOCKTRENDS_API_KEY`, read only when paid tools are explicitly enabled.
- A paid-mode policy object that can be used by future tools but registers no tools in this branch.
- Approved Stock Trends API host enforcement before any future auth header can be attached.
- Redirect handling that prevents auth header leakage to unapproved hosts.
- Secret redaction helper for API keys, bearer tokens, auth headers, payment headers, and environment-like values.
- Safe diagnostics that never print secret values.
- Tests proving public resources work without keys and send no auth headers.
- Tests proving `STOCKTRENDS_API_KEY` is ignored when `STOCKTRENDS_ENABLE_PAID_TOOLS` is absent or false.
- Tests proving no tools and no prompts are registered in every config mode.
- Tests proving paid flag true but missing key fails closed for paid mode.
- Tests proving auth headers cannot be sent to unapproved hosts.
- Tests proving secrets are redacted from logs and errors.

Do not implement pricing preflight runtime calls yet unless separately authorized. Do not execute paid endpoint calls. Do not implement x402, wallet behavior, remote MCP, database access, control-plane access, or paid tool registration.

Acceptance criteria:

- Existing public resources unchanged.
- Paid tools still zero.
- Prompts still zero.
- API-key config introduced only as future paid-mode foundation.
- Public resources never send auth headers.
- API key alone does not enable paid tools.
- Paid enablement flag is explicit and default-off.
- Missing key in paid mode fails closed without leaking secrets.
- Approved host enforcement and redaction are tested.
- No paid endpoint calls.
- No x402.
- No wallet.
- No remote MCP.

Do not broaden scope. If paid tool registration becomes necessary, stop and report it as a separate follow-up branch.
