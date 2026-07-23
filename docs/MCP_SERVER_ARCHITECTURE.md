# Stock Trends MCP Server Architecture

## 1. Purpose

The Stock Trends MCP Server will provide agent-native access to the canonical Stock Trends API through the Model Context Protocol (MCP). Its purpose is to make Stock Trends discovery, metadata, historical indicators, ST-IM distributions, selections, pricing, workflow planning, and published intelligence artifacts easier for agents to discover and call safely.

The MCP server is a protocol adapter. It must forward requests to the Stock Trends API, preserve API-provided semantics, and return API-authored data or published Intelligence Agent artifacts without creating a second reasoning system.

Repository authority for this architecture:

- The private Stock Trends API backend is the inspected local reference for the front-facing Stock Trends API implementation.
- The private API control plane is not relevant to the MCP v1 front-facing API contract.
- The MCP server must be designed against the external/public API surface, not against the control plane, database, internal admin workflows, or deployment machinery.

Accepted architecture decisions are recorded in `docs/ARCHITECTURE_DECISIONS.md`.

## 2. Non-Goals

- Do not query any Stock Trends database directly.
- Do not recompute ST-IM, Stock Trends indicators, selections, rankings, breadth, leadership, portfolio scores, or intelligence conclusions.
- Do not generate new market research, investment guidance, or editorial conclusions.
- Do not bypass Stock Trends API authentication, authorization, pricing, metering, subscription rules, x402, MPP, or public/paid boundaries.
- Do not create a parallel intelligence layer or cache that becomes authoritative over the API.
- Do not implement x402 wallet signing in v1.
- Do not expose remote MCP transport before a separate security review.

## 3. Authority Chain

1. The external/public Stock Trends API surface is the canonical authority for endpoint contracts, authentication, pricing, metering, payment handling, data provenance, and output semantics.
2. `/v1/ai/tools`, `/v1/openapi.json`, `/v1/workflows`, and confirmed public metadata routes are the primary machine-readable discovery and planning authorities for agents. `/v1/ai/context` is a Phase 1 public candidate requiring implementation-time no-key verification. `/v1/pricing/catalog` must not be invented for MCP and belongs in the surface only if it is confirmed as an existing public front-facing API endpoint.
3. Published Stock Trends Intelligence Agent artifacts are authoritative only when served by the Stock Trends API through the public intelligence artifact endpoints.
4. The MCP adapter is authoritative only for MCP protocol presentation, local input validation, safe call planning, and client-facing documentation.
5. MCP prompts are procedural helpers. They must not override API metadata, invent conclusions, or turn Stock Trends outputs into buy/sell instructions.
6. The API control plane, database, internal admin workflows, and deployment operations are out of scope for MCP v1 route design.

## 4. System Separation

| System | Owns | Must Not Own |
| --- | --- | --- |
| Stock Trends API | REST routes, schemas, OpenAPI, auth, pricing, metering, payment rails, database access, data computation, published artifact serving. | MCP protocol framing. |
| Stock Trends API control plane | Internal operational control, configuration, and administrative workflows outside the external/public API contract. | MCP v1 route contracts, MCP tool naming, front-facing endpoint discovery, or client-accessible semantics. |
| Stock Trends Intelligence Agent | Producing research, guidance, editorial previews, and discovery artifacts that are later published. | Live MCP requests, API auth, API pricing, or direct MCP behavior. |
| MCP adapter | MCP tools/resources/prompts, local configuration, request forwarding, response passthrough, guardrails, documentation. | Data computation, hidden data access, intelligence generation, payment bypass, or artifact mutation. |

The adapter may add transparent envelope metadata such as MCP resource URIs, fetched-at timestamps for public discovery resources, and warnings about paid calls. It must not modify API facts, rankings, probabilities, artifact payloads, or provenance fields.

## 5. Recommended v1 MCP Capability Surface

v1 should be conservative. Phase 1 is the narrowest subset:

- Local stdio MCP server only.
- Read-only, idempotent API access only.
- Public discovery and metadata exposed as MCP resources.
- Resources-first, ideally zero tools.
- No prompts in Phase 1.
- No API-key-required calls in Phase 1.
- No paid data endpoints in Phase 1.
- No x402, wallet, OAuth, remote transport, database access, control-plane access, or Intelligence Agent recomputation in Phase 1.
- Fetch resources on request; do not require startup-time API fetches.
- Avoid caching in Phase 1 unless a narrow reason is documented.

The accepted Phase 2 recommendation is public metadata resource expansion first. The next implementation increment should remain local stdio only, public-resource only, zero tools, zero prompts, no API key, no auth headers, no paid endpoints, no x402, no wallet handling, no OAuth, no remote MCP, and no database or control-plane dependency.

Paid tools remain deferred. Before any paid tool is exposed, API-key handling, pricing/cost preflight, paid endpoint allowlisting, spend/rate caps, and history-beside-latest policy must be designed and tested. Later paid phases must include history endpoints alongside latest endpoints so clients do not overfit to current snapshots.

Recommended v1 categories:

- Discovery: tools manifest, context candidate after no-key verification, OpenAPI, workflows, and pricing catalog only if confirmed as an existing public front-facing endpoint.
- Metadata: indicator definitions, inference contract, ST-IM provider profile.
- Instrument resolution: lookup and resolve helpers.
- Market data intelligence: indicators latest/history, ST-IM latest/history, selections latest/history.
- Published intelligence artifacts: discovery, editorial preview, guidance, research.
- Planning controls in later paid phases: cost estimate and explicit paid-call confirmation metadata.

## 6. Proposed MCP Tools

Tool names are proposed and should be finalized during implementation after confirming the MCP SDK naming conventions. This table describes the broader planned MCP surface. Phase 1 should expose no tools by default unless implementation proves that a public endpoint truly requires parameterized invocation and cannot be safely represented as a resource.

Route canonicality rules:

- Confirmed observed API routes are the HTTP paths the MCP adapter should call.
- Requested or planned endpoint aliases are not canonical until the front-facing API exposes them for front-facing product reasons.
- Do not add or assume `/v1/intelligence/guidance/latest/by_id` or `/v1/intelligence/research/latest/by_id` as required MCP v1 API routes.
- MCP tool names are adapter-facing names. They may remain semantic and agent-readable even when they wrap canonical API routes with different REST shapes.
- Any unknown route status must fail closed during implementation.

| Tool | API mapping | Inputs | Output value | Notes |
| --- | --- | --- | --- | --- |
| `stocktrends_get_ai_tools` | `GET /v1/ai/tools` | None | Machine-readable API tools manifest. | Public discovery; cacheable. |
| `stocktrends_get_ai_context` | `GET /v1/ai/context` after implementation-time no-key verification. | None | Dataset context, endpoint groups, recommended flows. | Public candidate; future compatibility tool only, not Phase 1 default. |
| `stocktrends_get_openapi` | `GET /v1/openapi.json` | None | Exact route schemas and security metadata. | Public contract source. |
| `stocktrends_get_workflows` | `GET /v1/workflows` | None | Workflow registry with step costs and sequencing. | Public planning surface. |
| `stocktrends_get_pricing_catalog` | `GET /v1/pricing/catalog`, only if confirmed as an existing public front-facing endpoint. | None | Live STC pricing rules. | Later paid-phase planning surface; do not invent this endpoint for MCP. |
| `stocktrends_estimate_cost` | `GET /v1/cost-estimate` | `workflow_id`, optional count/step parameters as defined by API. | Deterministic workflow cost estimate. | Must be called before multi-step paid plans. |
| `stocktrends_lookup_instruments` | `GET /v1/instruments/lookup` | Symbol and API-defined filters. | Candidate instruments and exchange context. | Public planning helper. |
| `stocktrends_resolve_instrument` | `GET /v1/instruments/resolve` | `symbol_exchange` or symbol/exchange fields. | Canonical instrument resolution. | Public planning helper. |
| `stocktrends_get_meta_indicators` | `GET /v1/meta/indicators` | None | Indicator definitions and interpretation constraints. | Public metadata. |
| `stocktrends_get_meta_inference` | `GET /v1/meta/inference` | None | Provider-agnostic inference contract. | Public metadata. |
| `stocktrends_get_meta_stim` | `GET /v1/meta/stim` | None | ST-IM provider profile, provenance, distribution semantics. | Public metadata; required before ST-IM interpretation. |
| `stocktrends_get_stim_latest` | `GET /v1/stim/latest` | `symbol_exchange` or `symbol` plus `exchange`. | Latest ST-IM return distributions. | Paid; no recomputation. |
| `stocktrends_get_stim_history` | `GET /v1/stim/history` | `symbol_exchange` or `symbol` plus `exchange`, optional `start`, `end`, `limit`, `include_gaps`. | Historical ST-IM distribution series. | Paid; important for longitudinal analysis. |
| `stocktrends_get_indicators_latest` | `GET /v1/indicators/latest` | `symbol_exchange` or `symbol` plus `exchange`, optional `cs_only`. | Latest weekly Stock Trends indicator row. | Paid. |
| `stocktrends_get_indicators_history` | `GET /v1/indicators/history` | `symbol_exchange` or `symbol` plus `exchange`, optional `cs_only`, `start`, `end`, `limit`. | Historical indicator series. | Paid; important for state transitions. |
| `stocktrends_get_selections_latest` | `GET /v1/selections/latest` | Optional `exchange`, `min_prob13wk`, `limit`, `include_data`, `include_mast`, `cs_only`. | Latest base ST-IM selection universe. | Paid; not identical to published STIM Select. |
| `stocktrends_get_selections_history` | `GET /v1/selections/history` | Optional symbol/date/filter parameters and `limit`. | Historical base selection records. | Paid; prevents latest-only bias. |
| `stocktrends_get_published_selections_latest` | `GET /v1/selections/published/latest` | Published-threshold filters, optional exchange/context fields. | Latest published STIM Select list. | Paid; canonical published-filter list. |
| `stocktrends_get_published_selections_history` | `GET /v1/selections/published/history` | Symbol/date/filter parameters and published thresholds. | Historical published STIM Select records. | Paid. |
| `stocktrends_get_intelligence_discovery` | `GET /v1/intelligence/discovery` | None | Public discovery metadata envelope for published intelligence artifacts. | Public/free. |
| `stocktrends_get_editorial_preview` | `GET /v1/intelligence/editorial/latest/preview` | None | Latest public editorial preview artifact envelope. | Public/free. |
| `stocktrends_get_guidance_latest` | `GET /v1/intelligence/guidance/latest` | None | Latest market guidance artifact envelope. | Paid; API-served artifact only. |
| `stocktrends_get_guidance_by_id` | Confirmed observed API route: `GET /v1/intelligence/guidance/{artifact_id}`. | `artifact_id`. | Market guidance artifact by manifest id. | Paid; future semantic MCP by-id tool may wrap the canonical route. `/latest/by_id` is not required for MCP v1. |
| `stocktrends_get_research_latest` | `GET /v1/intelligence/research/latest` | None | Latest market research artifact envelope. | Paid; API-served artifact only. |
| `stocktrends_get_research_by_id` | Confirmed observed API route: `GET /v1/intelligence/research/{artifact_id}`. | `artifact_id`. | Market research artifact by manifest id. | Paid; future semantic MCP by-id tool may wrap the canonical route. `/latest/by_id` is not required for MCP v1. |

Implementation rule: a tool must declare whether it is public, paid, or unknown before it can be called. Unknown status should fail closed.

## 7. Proposed MCP Resources

Resources should represent low-risk, mostly static or discovery-oriented API outputs. Phase 1 registers only reviewed public resources, fetches them on request, and avoids caching unless a narrow reason is documented. The Phase 2 public metadata increment may add only verified no-key public resources and should remain zero-tool, zero-prompt, no-auth, and no-paid-endpoint. Suggested URIs for the broader resource plan:

- `stocktrends://api/ai-tools` -> `/v1/ai/tools`
- `stocktrends://api/context` -> `/v1/ai/context` after implementation-time no-key verification
- `stocktrends://api/openapi` -> `/v1/openapi.json`
- `stocktrends://api/workflows` -> `/v1/workflows`
- `stocktrends://api/pricing/catalog` -> `/v1/pricing/catalog` only if confirmed as an existing public front-facing endpoint in a later phase
- `stocktrends://api/meta/indicators` -> `/v1/meta/indicators`
- `stocktrends://api/meta/inference` -> `/v1/meta/inference`
- `stocktrends://api/meta/stim` -> `/v1/meta/stim`
- `stocktrends://api/intelligence/discovery` -> `/v1/intelligence/discovery`
- `stocktrends://api/intelligence/editorial/latest/preview` -> `/v1/intelligence/editorial/latest/preview`

Paid, parameterized, symbol-specific, or high-cardinality responses should usually remain tools rather than resources in v1. Resource templates can be considered later for clients that handle parameterized resources well.

## 8. Future MCP Prompts

Phase 1 should ship no MCP prompts. Prompts may be reconsidered later only if they are safe, public, non-authoritative, and clearly instructional rather than conclusion-generating. Future prompts should produce safe API usage plans, not market conclusions.

| Prompt | Purpose | Required discipline |
| --- | --- | --- |
| `stocktrends_discovery_start` | Guide an agent through `/v1/ai/tools`, `/v1/ai/context`, OpenAPI, pricing, and workflows. | Must prefer API discovery over hardcoded endpoint assumptions. |
| `stocktrends_symbol_review_plan` | Plan a single-symbol review using instrument resolution, indicators, ST-IM, and optional history. | Must include metadata endpoints before interpretation. |
| `stocktrends_longitudinal_analysis_plan` | Encourage historical windows for ST-IM, indicators, and selections. | Must call out latest-only risk. |
| `stocktrends_cost_guarded_workflow_plan` | Build a workflow with pricing and cost-estimate checks before paid calls. | Must stop before paid execution unless client policy permits. |
| `stocktrends_intelligence_artifact_review_plan` | Retrieve discovery metadata, editorial preview, and paid artifacts by latest/id as authorized. | Must treat API-served artifacts as authoritative and not generate replacements. |

## 9. Transport Strategy

Start with local stdio. This keeps the first implementation inside the user's local MCP host process, avoids exposing an unaudited network listener, and lets credentials remain local to the user's environment.

Remote HTTP/SSE should be deferred until after a security review covers authentication, authorization, tenant separation, CORS, rate limiting, request replay, logging, and spend controls. A remote MCP server would become an internet-facing broker for paid API calls and should be treated as a separate product surface.

## 10. Authentication Strategy

Phase 1 requires no API key and must not expose API-key-required calls. Later paid phases should use API-key or bearer-token access only after separate design and tests:

- Load credentials from local environment variables or an MCP host secret mechanism.
- Never store secrets in repository files, docs examples, snapshots, logs, or test fixtures.
- Forward credentials only to `api.stocktrends.com` or an explicitly configured Stock Trends API base URL.
- Keep public endpoints callable without credentials.
- Require explicit local configuration before paid tools are enabled.

x402-aware mode should be a later phase. The future mode may inspect API 402 previews and present payment metadata to the MCP client, but wallet signing, payment authorization, and retry behavior need a dedicated security and UX design.

## 11. Versioning Strategy

- Version this MCP server independently with semantic versioning.
- Treat the Stock Trends API `/v1` path and `/v1/openapi.json` as the external contract baseline.
- Include the API base URL, API version, MCP server version, and tools manifest version in diagnostics where available, but Phase 1 must not require startup-time API fetches.
- Keep MCP tool names stable once released; add new tools instead of changing behavior in place where possible.
- Record compatibility notes whenever `/v1/ai/tools`, `/v1/openapi.json`, or pricing metadata changes.
- Fail closed when the API reports a route, pricing rule, or schema shape that the adapter does not understand.

## 12. Testing Strategy

Documentation-only status means there is no runtime test suite yet. Future implementation should add:

- Contract tests against mocked API responses generated from `/v1/openapi.json`.
- Snapshot tests for MCP tool/resource/prompt metadata.
- Public-endpoint integration tests limited to non-paid discovery endpoints.
- Phase 1 tests proving resources are fetched on request, no tools are registered by default, no prompts are registered, no API key is required, and no normal logs are written to stdout.
- Paid-endpoint tests using mocks or local fixtures only, not production paid calls.
- Security tests proving secrets are redacted from logs, errors, snapshots, and exceptions.
- Spend-control tests for per-call confirmation, per-session caps, and loop prevention.
- Historical coverage tests proving history tools are discoverable beside latest tools.
- Failure-mode tests for API 401, 402, 403, 404, 429, and 5xx responses.

## 13. Documentation and Discoverability Strategy

The README should remain the human entry point. The MCP server should also expose:

- Clear docs links to this architecture, the capability audit, and the security model.
- Tool descriptions that include public/paid status, expected auth, pricing-rule metadata when known, and historical-analysis relevance.
- Resource descriptions that identify the API endpoint and cache policy.
- Future prompt descriptions that state they produce API call plans, not investment advice.
- A startup message that points agents to `stocktrends://api/ai-tools`, `stocktrends://api/context`, and `stocktrends://api/openapi`.

Implementation documentation should teach agents to start with the machine-readable tools manifest and to call cost/pricing surfaces before paid workflows.

## 14. Future Phases

| Phase | Scope |
| --- | --- |
| Phase 0 | Architecture scaffold, capability audit, security model, README status. |
| Phase 1 | Local stdio MCP server with public resources only, resources-first/zero-tools default, no prompts, no API key requirement, fetch-on-request behavior, no paid/x402/wallet/remote/control-plane/database/reasoning surface. |
| Phase 2 | Public metadata resource expansion only: local stdio, public resources, zero tools, zero prompts, no API key, no auth headers, no paid endpoints, no x402, no wallet handling, no OAuth, no remote MCP, no database access, and no control-plane access. |
| Phase 3 | Paid-tool auth and spend foundation: design and test API-key handling, pricing/cost preflight, paid endpoint allowlisting, per-session and per-tool caps, optional spend caps, and history-beside-latest policy before any paid tool is exposed. |
| Phase 4 | Read-only paid tool exposure only after Phase 3 controls are implemented and tested, with history endpoints presented beside latest endpoints and paid calls covered by mocked tests. |
| Phase 5 | x402-aware planning mode that can surface 402 previews without wallet custody. Wallet signing and payment authorization require a separate design review. |
| Phase 6 | Remote HTTP/SSE transport only after separate security review and production controls. |

## 15. Explicit Open Questions

- Confirm the exact implementation runtime, MCP SDK version, and SDK registration conventions before tool/resource naming is finalized.
- During Phase 2 public metadata implementation, verify `/v1/meta/indicators` and `/v1/meta/inference` can be read without an API key before exposing them.
- During Phase 2 public metadata implementation, recheck that `/v1/intelligence/discovery` and `/v1/intelligence/editorial/latest/preview` remain public/free before exposing them.
- Confirm whether `/v1/pricing/catalog` is an existing public front-facing endpoint before considering it for any MCP resource.
- Confirm the status and safe MCP classification of `/v1/ai/proof/market-edge` before considering it for any MCP resource or tool.
- Confirm schema-tolerance behavior for public resources when `/v1/openapi.json` changes shape but endpoints still respond.
- For later paid phases, confirm default spend caps, per-session request caps, paid-call confirmation UX, and bearer-token support.
