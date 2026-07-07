# Stock Trends MCP Server Architecture

## 1. Purpose

The Stock Trends MCP Server will provide agent-native access to the canonical Stock Trends API through the Model Context Protocol (MCP). Its purpose is to make Stock Trends discovery, metadata, historical indicators, ST-IM distributions, selections, pricing, workflow planning, and published intelligence artifacts easier for agents to discover and call safely.

The MCP server is a protocol adapter. It must forward requests to the Stock Trends API, preserve API-provided semantics, and return API-authored data or published Intelligence Agent artifacts without creating a second reasoning system.

Repository authority for this architecture:

- `C:\Users\skort\Projects\stocktrends_api` is the inspected local reference for the front-facing Stock Trends API implementation.
- `C:\Users\skort\Projects\stocktrends-api-control` is the API control plane and is not relevant to the MCP v1 front-facing API contract.
- The MCP server must be designed against the external/public API surface, not against the control plane, database, internal admin workflows, or deployment machinery.

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
2. `/v1/ai/tools`, `/v1/ai/context`, `/v1/openapi.json`, `/v1/workflows`, and `/v1/pricing/catalog` are the primary machine-readable discovery and planning authorities for agents.
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

The adapter may add transparent envelope metadata such as MCP resource URIs, cached-at timestamps for public discovery resources, and warnings about paid calls. It must not modify API facts, rankings, probabilities, artifact payloads, or provenance fields.

## 5. Recommended v1 MCP Capability Surface

v1 should be conservative:

- Local stdio MCP server only.
- Read-only, idempotent API access only.
- API-key authentication supplied through local runtime configuration.
- Public discovery and metadata exposed as MCP resources.
- Paid data endpoints exposed as tools only when the caller provides credentials and the server can enforce per-call spend/rate safeguards.
- Historical endpoints included alongside latest endpoints so clients do not overfit to current snapshots.
- Prompts limited to workflow planning and interpretation discipline, not answer generation.

Recommended v1 categories:

- Discovery: tools manifest, context, OpenAPI, workflows, pricing catalog.
- Metadata: indicator definitions, inference contract, ST-IM provider profile.
- Instrument resolution: lookup and resolve helpers.
- Market data intelligence: indicators latest/history, ST-IM latest/history, selections latest/history.
- Published intelligence artifacts: discovery, editorial preview, guidance, research.
- Planning controls: cost estimate and explicit paid-call confirmation metadata.

## 6. Proposed MCP Tools

Tool names are proposed and should be finalized during implementation after confirming the MCP SDK naming conventions.

Route canonicality rules:

- Confirmed observed API routes are the HTTP paths the MCP adapter should call.
- Requested or planned endpoint aliases are not canonical until the front-facing API exposes them or product guidance explicitly approves MCP-only aliasing.
- MCP tool names are adapter-facing names. They may wrap canonical API routes while documenting requested aliases separately.
- Any unknown route or alias status must remain an open question and fail closed during implementation.

| Tool | API mapping | Inputs | Output value | Notes |
| --- | --- | --- | --- | --- |
| `stocktrends_get_ai_tools` | `GET /v1/ai/tools` | None | Machine-readable API tools manifest. | Public discovery; cacheable. |
| `stocktrends_get_ai_context` | `GET /v1/ai/context` | None | Dataset context, endpoint groups, recommended flows. | Public explanatory context. |
| `stocktrends_get_openapi` | `GET /v1/openapi.json` | None | Exact route schemas and security metadata. | Public contract source. |
| `stocktrends_get_workflows` | `GET /v1/workflows` | None | Workflow registry with step costs and sequencing. | Public planning surface. |
| `stocktrends_get_pricing_catalog` | `GET /v1/pricing/catalog` | None | Live STC pricing rules. | Public planning surface; still treat as pricing authority. |
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
| `stocktrends_get_guidance_by_id` | Confirmed observed API route: `GET /v1/intelligence/guidance/{artifact_id}`. Requested/planned alias needing confirmation: `/v1/intelligence/guidance/latest/by_id`. | `artifact_id`. | Market guidance artifact by manifest id. | Paid; MCP tool may wrap the canonical route, but must not claim the alias is an API route until confirmed. |
| `stocktrends_get_research_latest` | `GET /v1/intelligence/research/latest` | None | Latest market research artifact envelope. | Paid; API-served artifact only. |
| `stocktrends_get_research_by_id` | Confirmed observed API route: `GET /v1/intelligence/research/{artifact_id}`. Requested/planned alias needing confirmation: `/v1/intelligence/research/latest/by_id`. | `artifact_id`. | Market research artifact by manifest id. | Paid; MCP tool may wrap the canonical route, but must not claim the alias is an API route until confirmed. |

Implementation rule: a tool must declare whether it is public, paid, or unknown before it can be called. Unknown status should fail closed.

## 7. Proposed MCP Resources

Resources should represent low-risk, mostly static or discovery-oriented API outputs. Suggested URIs:

- `stocktrends://api/ai-tools` -> `/v1/ai/tools`
- `stocktrends://api/context` -> `/v1/ai/context`
- `stocktrends://api/openapi` -> `/v1/openapi.json`
- `stocktrends://api/workflows` -> `/v1/workflows`
- `stocktrends://api/pricing/catalog` -> `/v1/pricing/catalog`
- `stocktrends://api/meta/indicators` -> `/v1/meta/indicators`
- `stocktrends://api/meta/inference` -> `/v1/meta/inference`
- `stocktrends://api/meta/stim` -> `/v1/meta/stim`
- `stocktrends://api/intelligence/discovery` -> `/v1/intelligence/discovery`
- `stocktrends://api/intelligence/editorial/latest/preview` -> `/v1/intelligence/editorial/latest/preview`

Paid, parameterized, symbol-specific, or high-cardinality responses should usually remain tools rather than resources in v1. Resource templates can be considered later for clients that handle parameterized resources well.

## 8. Proposed MCP Prompts

Prompts should produce safe API usage plans, not market conclusions.

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

v1 should use API-key or bearer-token access only:

- Load credentials from local environment variables or an MCP host secret mechanism.
- Never store secrets in repository files, docs examples, snapshots, logs, or test fixtures.
- Forward credentials only to `api.stocktrends.com` or an explicitly configured Stock Trends API base URL.
- Keep public endpoints callable without credentials.
- Require explicit local configuration before paid tools are enabled.

x402-aware mode should be a later phase. The future mode may inspect API 402 previews and present payment metadata to the MCP client, but wallet signing, payment authorization, and retry behavior need a dedicated security and UX design.

## 11. Versioning Strategy

- Version this MCP server independently with semantic versioning.
- Treat the Stock Trends API `/v1` path and `/v1/openapi.json` as the external contract baseline.
- Include the API base URL, API version, MCP server version, and tools manifest version in startup diagnostics.
- Keep MCP tool names stable once released; add new tools instead of changing behavior in place where possible.
- Record compatibility notes whenever `/v1/ai/tools`, `/v1/openapi.json`, or pricing metadata changes.
- Fail closed when the API reports a route, pricing rule, or schema shape that the adapter does not understand.

## 12. Testing Strategy

Documentation-only status means there is no runtime test suite yet. Future implementation should add:

- Contract tests against mocked API responses generated from `/v1/openapi.json`.
- Snapshot tests for MCP tool/resource/prompt metadata.
- Public-endpoint integration tests limited to non-paid discovery endpoints.
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
- Prompt descriptions that state they produce API call plans, not investment advice.
- A startup message that points agents to `stocktrends://api/ai-tools`, `stocktrends://api/context`, and `stocktrends://api/openapi`.

Implementation documentation should teach agents to start with the machine-readable tools manifest and to call cost/pricing surfaces before paid workflows.

## 14. Future Phases

| Phase | Scope |
| --- | --- |
| Phase 0 | Architecture scaffold, capability audit, security model, README status. |
| Phase 1 | Local stdio MCP server with public discovery resources and no paid tools enabled by default. |
| Phase 2 | API-key authenticated paid tools with explicit spend/rate controls and mocked paid tests. |
| Phase 3 | Broader historical and published-intelligence coverage, including artifact by-id helpers. |
| Phase 4 | x402-aware planning mode that can surface 402 previews without wallet custody. |
| Phase 5 | Remote HTTP/SSE transport only after separate security review and production controls. |

## 15. Explicit Open Questions

- Confirm the implementation runtime and MCP SDK target before tool/resource naming is finalized.
- Confirm whether v1 should expose all paid routes immediately or start with public resources plus a smaller paid allowlist.
- Confirm exact environment variable names for API base URL and API credentials.
- Confirm whether bearer auth should be supported in v1 alongside `X-API-Key`.
- Confirm whether MCP prompts should be packaged in v1 or deferred until tool/resource behavior is proven.
- Confirm whether requested artifact by-id aliases `/v1/intelligence/guidance/latest/by_id` and `/v1/intelligence/research/latest/by_id` should become front-facing API routes, MCP-only aliases, or be dropped in favor of the confirmed observed `{artifact_id}` routes.
- Confirm whether artifact by-id MCP tool names should use `guidance_by_id`/`research_by_id` even if any HTTP alias is later added.
- Confirm caching policy for public resources, especially `/v1/ai/tools`, `/v1/ai/context`, `/v1/openapi.json`, `/v1/workflows`, and `/v1/pricing/catalog`.
- Confirm default spend caps, per-session request caps, and paid-call confirmation UX.
- Confirm whether any live production endpoint verification is required before implementation; this pass avoided paid calls and did not test x402.
