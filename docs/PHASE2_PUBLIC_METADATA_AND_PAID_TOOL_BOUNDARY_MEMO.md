# Phase 2 Public Metadata and Paid Tool Boundary Memo

## 1. Purpose of Phase 2

Phase 2 is an architecture decision phase, not automatically a paid-tool implementation phase.

The purpose is to decide the next safe expansion boundary after the validated Phase 1 local stdio public-resource server. Phase 2 should determine whether the MCP server should next:

- expand public metadata resources,
- prepare paid-tool architecture without exposing paid runtime tools,
- expose read-only API-key authenticated tools later,
- defer paid tools until additional controls are ready,
- or revalidate excluded and candidate public intelligence resources.

The controlling boundary remains:

Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents

The MCP server remains a thin adapter over the front-facing Stock Trends API. It must not become a second source of truth, direct database client, control-plane client, paid-boundary bypass, or parallel reasoning layer.

## 2. Phase 1 Baseline

Phase 1 is complete, implemented, validated, and documented as a conservative public-resource-only MCP server.

Validated Phase 1 state:

- Local stdio transport only.
- Public resources only.
- Five resources currently exposed:
  - `stocktrends://api/openapi`
  - `stocktrends://ai/context`
  - `stocktrends://ai/tools`
  - `stocktrends://workflows`
  - `stocktrends://methodology/stim`
- Zero MCP tools.
- Zero MCP prompts.
- No API key required.
- No x402 behavior.
- No paid endpoints exposed.
- No remote transport.
- No database or control-plane dependency.

The excluded public-candidate intelligence resources remain outside the Phase 1 registry because no-key checks returned `503 application/json` on 2026-07-07:

- `GET /v1/intelligence/discovery`
- `GET /v1/intelligence/editorial/latest/preview`

The Phase 1 validation report also recorded a follow-up: the live `/v1/ai/tools` manifest listed `GET /v1/ai/proof/market-edge` as `ai_proof_market_edge`, but Phase 1 did not expose it and did not dynamically register manifest-derived tools.

## 3. Phase 2 Candidate Paths

### A. Public Metadata Expansion Only

This is the lowest-risk next boundary. It preserves the Phase 1 posture: stdio only, public resources only, zero tools, zero prompts, no API key, no paid endpoints, no x402, no remote transport, no database access, and no control-plane access.

Candidate resources:

| Endpoint | Likely public? | Belongs as MCP resource? | Safety risks | Phase decision | Verification and fail-closed behavior |
| --- | --- | --- | --- | --- | --- |
| `GET /v1/meta/indicators` | Likely public metadata per architecture docs, but not Phase 1 verified. | Yes, if no-key verification succeeds. It is methodology metadata, not symbol data. | Agents may over-trust indicator terms unless descriptions preserve interpretation limits. | Phase 2 include candidate. | Require no-key `200 application/json`; fail closed on `401`, `402`, `403`, malformed JSON, schema mismatch, redirect, or non-Stock-Trends host. |
| `GET /v1/meta/inference` | Likely public metadata per architecture docs, but not Phase 1 verified. | Yes, if no-key verification succeeds. It is provider-agnostic inference context. | Could be mistaken for a model instruction layer unless returned as API-authored data. | Phase 2 include candidate. | Require no-key `200 application/json`; fail closed on `401`, `402`, `403`, malformed JSON, schema mismatch, redirect, or non-Stock-Trends host. |
| `GET /v1/pricing/catalog` | Unknown until confirmed as an existing public front-facing endpoint. | Yes only if it exists and is public; otherwise no. It is planning metadata for future paid calls. | Stale or invented pricing metadata could bypass API pricing authority. | Defer from the next public metadata implementation unless independently confirmed. | Confirm front-facing route, no-key access, and schema. Fail closed on any auth, payment, unknown pricing, or route mismatch. |
| `GET /v1/ai/proof/market-edge` | Unknown. It appeared in the live tools manifest but is not yet classified by binding docs. | Maybe later, if confirmed as public proof metadata and not conclusion-generating. | Name and payload may invite agents to treat proof text as investment authority or to auto-register manifest entries. | Defer pending classification. | Confirm route status, auth/payment status, payload semantics, public no-key access, and safe resource description. Fail closed on unknown status. |
| `GET /v1/intelligence/discovery` | Public/free in the capability audit, but Phase 1 no-key check returned `503`. | Yes if recheck succeeds. It is discovery metadata for API-published artifacts. | 503 may indicate transient availability, deployment mismatch, or route instability. | Phase 2 recheck candidate. | Require no-key `200 application/json` before inclusion; exclude on `503` or any auth/payment response; no fallback to paid artifact routes. |
| `GET /v1/intelligence/editorial/latest/preview` | Public/free in the capability audit, but Phase 1 no-key check returned `503`. | Yes if recheck succeeds. It is a public preview resource, not generated prose. | Latest-only preview can be overread as complete guidance; payload text is data, not server instruction. | Phase 2 recheck candidate. | Require no-key `200 application/json` before inclusion; exclude on `503` or any auth/payment response; no generated expansion. |

Public metadata expansion should not add tools, prompts, API keys, paid calls, pricing execution, or manifest-derived dynamic registration.

### B. API-Key Authenticated Paid Tools Preparation

Phase 2 should design paid tools before implementing them. Paid tools should not be registered until API-key handling, endpoint allowlisting, pricing preflight, spend limits, rate controls, provenance preservation, and tests are implemented.

Candidate future paid tools:

| Future tool | Paid/public status | Agent value | Misuse risk | Input schema requirements | Output/provenance requirements | Dependencies and recommendation |
| --- | --- | --- | --- | --- | --- | --- |
| `stocktrends_get_stim_latest` | Paid/protected. | High current ST-IM value. | Latest-only forecast misuse. | Require canonical `symbol_exchange` or strict `symbol` plus `exchange`; reject broad batches. | Preserve API ST-IM fields, endpoint, fetched-at, request id, pricing metadata if returned, and methodology warnings. | Needs symbol resolution first or strict canonical input. Expose only beside `stocktrends_get_stim_history`. Requires pricing preflight, explicit enablement, per-tool caps, and spend caps. |
| `stocktrends_get_stim_history` | Paid/protected. | Critical for longitudinal ST-IM context. | Large windows, looped calls, and broad symbol sweeps. | Require canonical symbol input, safe date window, default limit, max limit, optional `include_gaps`. | Preserve ordered series, missing-data/gap metadata, endpoint, request id, pricing metadata, and schema version. | Should be first-class if any ST-IM latest tool ships. Requires pricing preflight, explicit enablement, per-session caps, and spend caps. |
| `stocktrends_get_indicators_latest` | Paid/protected. | High current indicator context. | Current-state overinterpretation without persistence/history. | Require canonical symbol input; define `cs_only` default explicitly. | Preserve indicator row, trend-state fields, endpoint, request id, and metadata disclaimers. | Needs symbol resolution first or strict canonical input. Expose only beside `stocktrends_get_indicators_history`. Requires pricing preflight, explicit enablement, caps. |
| `stocktrends_get_indicators_history` | Paid/protected. | Critical for trend-state transitions and persistence. | Excessive date windows and repeated paid calls. | Require canonical symbol input, safe date window, default limit, max limit, `cs_only` behavior. | Preserve weekly series, missing-data metadata, endpoint, request id, pricing metadata, and schema version. | Should ship before or alongside indicators latest. Requires pricing preflight, explicit enablement, caps. |
| `stocktrends_get_selections_latest` | Paid/protected. | Useful for current base selection universe. | Confusing base selections with published STIM Select; broad sweeps. | Require bounded filters, explicit `limit`, max limit, and clear `include_data`/`include_mast` behavior. | Preserve API ranking fields and selection definitions without re-ranking or threshold invention. | Do not expose before selection-history policy and published-vs-base wording are settled. Requires pricing preflight, explicit enablement, and caps. |
| `stocktrends_get_guidance_latest` | Paid/protected artifact. | Retrieves canonical API-served guidance. | Agents may treat latest guidance as generated on demand or advice. | No input, but tool must be paid and explicitly enabled. | Preserve artifact id, manifest/provenance fields, endpoint, content hash if present, and API-authored envelope. | Defer until discovery/public preview and artifact provenance are stable. Requires pricing preflight, explicit enablement, caps. |
| `stocktrends_get_research_latest` | Paid/protected artifact. | Retrieves canonical API-served research. | Agents may summarize beyond provenance or treat it as live model output. | No input, but tool must be paid and explicitly enabled. | Preserve artifact id, manifest/provenance fields, endpoint, content hash if present, and API-authored envelope. | Defer until discovery/public preview and artifact provenance are stable. Requires pricing preflight, explicit enablement, caps. |

Preparation work should also decide whether instrument lookup/resolve tools must precede any paid symbol-specific tools. A paid tool that accepts ambiguous symbols without resolution increases spend and interpretation risk.

### C. x402-Aware Paid Mode

x402 is strategically important for Stock Trends because it can support machine-readable payment requirements, agent-native paid API access, and future usage patterns where clients can reason about cost before execution.

Phase 2 should not implement wallet or payment handling yet. The unresolved design questions are larger than a safe next increment:

- Which API responses are authoritative for x402 payment requirements?
- Should the MCP adapter merely surface 402 previews, or should it ever authorize payments?
- What does explicit user approval look like in local MCP hosts?
- How are per-session and per-payment caps enforced before signing?
- How are payment challenges validated?
- How are replay protection, failed payments, idempotency, and no-charge retries handled?
- How are wallet material, signing clients, and payment headers isolated from logs and artifacts?

x402 design can proceed in parallel with API-key paid-tool architecture, but x402 runtime should follow a dedicated security and UX review. The safest order is:

1. Public metadata expansion.
2. API-key paid-tool auth/spend foundation with mocked paid calls only.
3. Separate x402-aware planning mode that can surface 402 previews without wallet custody.
4. Wallet/payment authorization only after explicit approval boundaries, caps, signing isolation, and tests exist.

Required safety controls before any wallet/payment authorization:

- No automatic payment retries.
- No automatic signing.
- Explicit local opt-in for x402 mode.
- Explicit per-payment or bounded-session approval.
- Hard STC/USD caps.
- Payment endpoint allowlist.
- Challenge validation and replay protection.
- Redacted logs and errors.
- Deterministic handling of 402, failed payment, and unknown charge state.

### D. Remote MCP Server

Remote MCP is a separate product and security surface. It should be deferred.

A hosted remote MCP server would broker paid API calls for external clients and would require separate design for:

- client authentication,
- authorization and tenant isolation,
- CORS and origin controls,
- TLS and request replay protection,
- rate limits and abuse detection,
- audit logs and retention,
- hosted secret storage,
- per-user credentials,
- spend caps,
- incident response and key revocation.

Local stdio should remain the only transport until remote MCP receives a separate architecture and security review.

## 4. Public Metadata Recommendation

Recommendation: the next implementation increment should expand only verified public metadata resources. It should keep the Phase 1 safety posture: stdio only, resources only, zero tools, zero prompts, no API key, no paid endpoints, no x402, no remote transport, no database access, and no control-plane access.

| Endpoint | Proposed resource URI | Status | Reason | Required verification |
| --- | --- | --- | --- | --- |
| `GET /v1/meta/indicators` | `stocktrends://methodology/indicators` | include | Indicator definitions reduce misinterpretation before any future indicator data tools. | Confirm existing front-facing route and no-key `200 application/json`; schema guard; fail closed on `401`, `402`, `403`, malformed JSON, or unknown host. |
| `GET /v1/meta/inference` | `stocktrends://methodology/inference` | include | Inference-contract metadata supports safe interpretation of ST-IM and future provider outputs. | Confirm existing front-facing route and no-key `200 application/json`; schema guard; fail closed on `401`, `402`, `403`, malformed JSON, or unknown host. |
| `GET /v1/pricing/catalog` | `stocktrends://pricing/catalog` | defer | Useful for paid-call planning, but binding decisions say not to invent it and to include it only if confirmed public. | Confirm route exists, is public, and is the API pricing authority before inclusion. Until then, do not register it. |
| `GET /v1/ai/proof/market-edge` | `stocktrends://ai/proof/market-edge` | defer | The route appeared in the live manifest as a future safety follow-up, but its public status and resource semantics are not yet classified. | Confirm route, no-key public status, payload shape, and whether it is metadata/proof rather than paid intelligence. Do not dynamically register from manifest. |
| `GET /v1/intelligence/discovery` | `stocktrends://intelligence/discovery` | candidate | Public/free in audit, valuable for artifact discovery, but Phase 1 no-key verification returned `503`. | Recheck no-key `200 application/json`; if still `503`, exclude and document. Fail closed on auth/payment responses. |
| `GET /v1/intelligence/editorial/latest/preview` | `stocktrends://intelligence/editorial/latest/preview` | candidate | Public/free in audit, useful preview surface, but Phase 1 no-key verification returned `503`. | Recheck no-key `200 application/json`; if still `503`, exclude and document. Fail closed on auth/payment responses. |

This recommendation intentionally avoids API-key, paid, x402, wallet, remote, control-plane, and runtime reasoning work.

## 5. Paid Tool Boundary Recommendation

Paid tools should remain out of scope for the next implementation increment. Phase 2 should prepare the paid-tool boundary, but the next code branch should not register paid tools.

Direct answers:

- Should paid tools remain out of scope for the next implementation increment? Yes.
- If paid tools are next after public metadata, they should start with symbol resolution policy plus ST-IM latest/history and indicators latest/history as paired categories, not with selections or paid intelligence artifacts.
- History should be exposed before or alongside latest for ST-IM, indicators, and selections. Latest-only symbol tools should be blocked because they encourage snapshot bias.
- Paid tools should require an explicit environment flag such as `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.
- API key handling must be designed and tested before any paid endpoint is registered.
- Pricing or cost preflight should be required before paid calls.
- Per-session request caps, per-tool caps, and spend caps should be required before exposure.

Paid intelligence artifacts such as guidance and research should come later than public discovery, editorial preview revalidation, API-key handling, pricing preflight, and provenance-preservation tests.

## 6. API Key/Auth Architecture

This section designs future architecture only. It does not implement auth.

Future environment variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `STOCKTRENDS_API_KEY` | Local API key for authenticated Stock Trends API calls. | unset |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | Explicit local opt-in for registering paid tools. | `false` |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | Require pricing/cost check before paid calls. | `true` |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | Maximum paid calls in one MCP server session. | unset or conservative reviewed default |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | Maximum paid calls per tool in one session. | unset or conservative reviewed default |
| `STOCKTRENDS_MAX_STC_PER_SESSION` | Optional STC-denominated budget cap. | unset until API contract confirms STC estimates |
| `STOCKTRENDS_MAX_USD_PER_SESSION` | Optional USD-denominated budget cap if API provides USD conversion. | unset |

Preferred header strategy, pending API contract confirmation:

- Use `X-API-Key: <value>` if the front-facing API contract confirms that header.
- Support `Authorization: Bearer <token>` only if the API contract explicitly prefers or accepts bearer tokens.
- Never send both unless the API contract requires it.

Rules:

- Public resources must never require `STOCKTRENDS_API_KEY`.
- Public resource reads must not opportunistically send API keys.
- API keys must only be sent to the allowlisted Stock Trends API origin derived from `STOCKTRENDS_API_BASE_URL`.
- API keys must never be sent to non-Stock-Trends hosts, redirected hosts, user-provided URLs, prompt-provided URLs, or API-payload-provided URLs.
- Setting `STOCKTRENDS_API_KEY` must not automatically enable paid tools.
- Paid tools require both valid credential configuration and explicit local enablement.
- Secrets must never appear in MCP resources, prompts, tool outputs, errors, snapshots, test fixtures, or logs.

Logging and redaction requirements:

- Redact API keys, bearer tokens, request headers, payment signatures, wallet material, and environment dumps.
- Log only safe operational metadata: method, endpoint path, status, request id, latency, paid/free classification, pricing rule id, and estimated cost when returned and non-sensitive.
- Do not log full paid artifact payloads by default.

Required tests before merge of any auth-capable runtime:

- Public resources work without `STOCKTRENDS_API_KEY`.
- Public resources do not send auth headers even when `STOCKTRENDS_API_KEY` is set.
- Paid tools are not registered unless `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.
- Auth headers are sent only to allowlisted Stock Trends hosts.
- Redirects to unapproved hosts fail closed without forwarding credentials.
- Secrets are redacted from logs, errors, snapshots, and diagnostics.
- 401, 402, 403, 429, and 5xx handling is deterministic.

## 7. Spend/Rate Safety Architecture

Minimum controls required before any paid tool is exposed:

- Per-session paid call cap.
- Per-tool paid call cap.
- Optional STC budget cap once the API cost contract is confirmed.
- Optional USD budget cap if the API returns USD estimates or a trusted conversion.
- No automatic paid retries.
- No hidden background refresh of paid endpoints.
- No broad symbol sweeps by default.
- Strict max limits for history and selection responses.
- Deterministic handling of 401, 402, 403, and 429.
- Paid endpoint allowlist.
- Explicit local opt-in through `STOCKTRENDS_ENABLE_PAID_TOOLS=true`.
- Pricing or cost preflight before paid execution.
- Budget-exceeded errors that do not trigger retries.
- Loop detection for repeated identical paid calls.
- No downgrade from paid API errors to public fallback data.

Future x402 payment approval boundary:

- A 402 response may be surfaced as data for client/user approval.
- The MCP adapter must not sign, pay, or retry automatically.
- Any future payment authorization must be explicit, auditable, bounded by caps, and isolated from logs and resources.

## 8. Agent Input Coverage Risk

The API capability audit identifies latest-only exposure as the largest MCP design risk.

Exposing only latest paid endpoints would weaken Stock Trends value because it would hide the longitudinal evidence that makes the dataset distinctive. Agents could treat the latest ST-IM distribution as a standalone forecast, miss missing-data or staleness behavior, ignore indicator persistence, and overstate current selections without understanding historical behavior.

ST-IM history and indicator history matter because:

- ST-IM distributions are best interpreted across weeks, not as single-point predictions.
- Indicator rows gain meaning from persistence and state transitions.
- Selection quality and published thresholds need historical context.
- Missing estimates, gaps, and regime changes are visible only across time.

Paid latest endpoints should be blocked until their paired history endpoint is available or until an explicit architecture exception is approved. The default rule should be: no ST-IM latest without ST-IM history, no indicators latest without indicators history, and no selections latest without a selection-history policy.

MCP tool descriptions should guide agents toward longitudinal context by:

- marking whether a tool supports history,
- placing latest and history tools in the same category,
- recommending metadata resources before paid interpretation,
- describing safe default windows and limits,
- warning that latest outputs are snapshots, not final conclusions.

## 9. Prompt Policy for Phase 2

Prompts should remain excluded in the next implementation increment.

Future prompts may be considered only if they are purely instructional, non-authoritative, and scoped to safe API usage planning. They must not generate investment conclusions, rankings, guidance, research, editorial prose, buy/sell/hold language, allocation advice, or replacement interpretations of Stock Trends artifacts.

If a future prompt is approved, it should direct clients to public resources, metadata, pricing, cost preflight, and history-aware workflows. It must not become a parallel reasoning layer.

## 10. Tool Policy for Phase 2

The zero-tool default remains appropriate if Phase 2 is public metadata expansion.

If Phase 2 prepares paid tools, they should remain unregistered until all of the following are implemented and tested:

- API-key handling.
- Explicit paid-tool enablement.
- Paid endpoint allowlist.
- Pricing/cost preflight.
- Per-session and per-tool caps.
- Spend caps.
- Deterministic auth/payment/rate-limit errors.
- Secret redaction.
- Mocked paid tests.
- History-beside-latest coverage.

Public metadata resources do not require tools because they are unparameterized, read-only, and discovery-oriented.

## 11. Security Model Updates Required

No immediate edit to `docs/SECURITY_MODEL.md` is required for this memo.

Before paid tools are implemented, the security model should be updated or confirmed to cover:

- final API key header contract,
- exact paid-tool enablement variable,
- default per-session and per-tool caps,
- default spend cap behavior,
- pricing/cost preflight contract,
- paid endpoint allowlist,
- history endpoint default/max limits,
- public-resource behavior when API keys are present,
- no-auth-header rule for public resources,
- x402 preview versus authorization boundary,
- remote MCP exclusion until separate review.

## 12. Proposed Next Implementation Increment

Recommended branch:

`implementation/phase2-public-metadata-resources`

Choose option A.

Scope:

- Add only verified public metadata resources.
- Keep stdio only.
- Keep zero tools.
- Keep zero prompts.
- Require no API key.
- Expose no paid endpoints.
- Implement no x402 behavior.
- Preserve fetch-on-request behavior.
- Preserve fail-closed public endpoint handling.

Justification: this path advances useful agent context while avoiding the auth, spend, pricing, x402, wallet, remote, and latest-only risks that paid tools introduce. It also gives the implementation a clean place to recheck the two excluded intelligence resources and classify the `market-edge` proof route without dynamically trusting the live manifest.

## 13. Acceptance Criteria for Next Implementation Increment

If the next branch is `implementation/phase2-public-metadata-resources`, acceptance criteria are:

- Dedicated non-main branch.
- Local stdio only.
- Public resources only.
- No MCP tools.
- No MCP prompts.
- No resource templates unless separately authorized.
- No API key requirement.
- No auth headers sent.
- No paid endpoints registered.
- No x402, wallet, OAuth, remote transport, database access, or control-plane dependency.
- Add only resources whose front-facing public no-key verification succeeds.
- Include `GET /v1/meta/indicators` and `GET /v1/meta/inference` only after no-key verification.
- Recheck `GET /v1/intelligence/discovery` and `GET /v1/intelligence/editorial/latest/preview`; include only on no-key `200 application/json`, otherwise keep excluded and document.
- Do not include `GET /v1/pricing/catalog` unless the route is confirmed existing, public, and separately authorized for the public metadata branch.
- Do not include `GET /v1/ai/proof/market-edge` unless its public status and safe resource semantics are confirmed and separately authorized.
- Fetch resources on request.
- Fail closed on `401`, `402`, `403`, `429`, malformed JSON, unexpected redirects, schema mismatch, and upstream failures.
- Tests updated for new resource registration, public no-key behavior via mocks, no-tool default, no-prompt default, no paid/auth endpoint registration, no API-key requirement, and error mapping.
- MCP Inspector validation required after implementation.
- Phase 2 validation report or implementation notes should record which candidate resources were included or excluded and why.

## 14. Open Questions

- Confirmed public status of `/v1/meta/indicators`.
- Confirmed public status of `/v1/meta/inference`.
- Confirmed public status and route contract for `/v1/pricing/catalog`.
- Status and intended semantics of `/v1/ai/proof/market-edge`.
- Whether `/v1/intelligence/discovery` returning `503` on 2026-07-07 was transient.
- Whether `/v1/intelligence/editorial/latest/preview` returning `503` on 2026-07-07 was transient.
- API key header contract: `X-API-Key`, bearer token, or another scheme.
- Pricing/cost-estimate contract for single paid calls and multi-step workflows.
- Exact paid tool enablement flag name and whether `STOCKTRENDS_ENABLE_PAID_TOOLS=true` is accepted.
- Default per-session and per-tool paid call caps.
- Default STC/USD spend cap behavior.
- Whether symbol resolution must be implemented before any paid symbol-specific tool.
- Whether ST-IM and indicator history must be mandatory before latest paid tools are registered.
- Whether guidance/research by-id tools should ship before or after latest paid artifact tools.
- Whether x402 should follow API-key paid tools or proceed as a parallel architecture track.
- Whether remote MCP is a future hosted product surface or should remain out of scope indefinitely.

## 15. Draft Future Implementation Prompt

DRAFT ONLY — DO NOT EXECUTE IN THIS TASK

You are implementing the next safe Phase 2 increment for the Stock Trends MCP Server.

Repository:

`stocktrends-mcp-server`

Branch:

Create and work in a dedicated branch named:

`implementation/phase2-public-metadata-resources`

Do not modify `main` directly.

Task type:

Implementation of public metadata resources only, based on `docs/PHASE2_PUBLIC_METADATA_AND_PAID_TOOL_BOUNDARY_MEMO.md`.

Hard constraints:

- Implement local stdio MCP behavior only.
- Add only verified public metadata resources.
- Keep zero MCP tools.
- Keep zero MCP prompts.
- Do not add paid tools.
- Do not add paid resources.
- Do not require `STOCKTRENDS_API_KEY`.
- Do not send auth headers.
- Do not implement x402.
- Do not add wallet handling.
- Do not implement OAuth.
- Do not implement remote HTTP/SSE/Streamable HTTP transport.
- Do not add database access.
- Do not access the Stock Trends API control plane.
- Do not recompute indicators, ST-IM, selections, rankings, guidance, research, editorial conclusions, or any Intelligence Agent artifact.
- Do not call paid endpoints.
- Do not use API keys.
- Do not inspect secrets.
- Do not dynamically register tools or resources from `/v1/ai/tools`.
- Do not include `/v1/pricing/catalog` unless it is confirmed existing, public, and separately authorized.
- Do not include `/v1/ai/proof/market-edge` unless it is confirmed public, safe as a resource, and separately authorized.

Candidate public resources:

- `stocktrends://methodology/indicators` -> `GET /v1/meta/indicators`
- `stocktrends://methodology/inference` -> `GET /v1/meta/inference`
- `stocktrends://intelligence/discovery` -> `GET /v1/intelligence/discovery`, only if no-key recheck succeeds
- `stocktrends://intelligence/editorial/latest/preview` -> `GET /v1/intelligence/editorial/latest/preview`, only if no-key recheck succeeds

Before adding each resource, confirm no-key public access against the front-facing Stock Trends API contract. If a candidate returns `401`, `402`, `403`, `429`, `503`, malformed JSON, or unknown schema, do not include it. Document the exclusion.

Tests required:

- Resource registration for each included resource.
- Fetch-on-request behavior.
- Mocked public resource reads.
- Fail-closed handling for `401`, `402`, `403`, `429`, malformed JSON, redirects, and 5xx.
- No tools registered.
- No prompts registered.
- No paid/auth endpoint registration.
- No API key required.
- Public resources do not send auth headers.
- stdout remains reserved for MCP JSON-RPC.

Manual validation required:

- Run typecheck, tests, and build.
- Run MCP Inspector over stdio.
- Confirm listed resources.
- Confirm no tools.
- Confirm no prompts.
- Confirm no API key is needed.
- Confirm no paid/auth/x402/wallet/remote/control-plane paths are visible.

Do not broaden scope. If paid/auth/x402/wallet/control-plane behavior appears necessary, stop and report it as a later-phase requirement.
