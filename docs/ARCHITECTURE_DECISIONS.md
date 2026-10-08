# Architecture Decisions

This log records accepted architecture decisions that constrain the Stock Trends MCP Server design. It is documentation only and does not implement runtime behavior.

## ADR-001: Repository and Source Authority

Status: accepted

Decision: the private Stock Trends API backend is the inspected local reference for the front-facing Stock Trends API implementation. The private API control plane is out of scope for MCP v1 route contract design. MCP v1 must be designed against the external/front-facing API surface, not the control plane, database, or internal admin workflows.

Rationale: The MCP server adapts the customer-facing API. Control-plane or database behavior can create hidden coupling and route assumptions that external MCP clients cannot rely on.

Affected docs/implementation implications: Route canonicality must come from the front-facing API contract. The MCP server must not import, query, or depend on control-plane or database internals.

## ADR-002: MCP Authority Boundary

Status: accepted

Decision: The MCP server is a thin adapter over the front-facing Stock Trends API. The authority chain is: Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents. The MCP server must not become a second source of truth, direct database client, control-plane client, or parallel reasoning layer.

Rationale: Stock Trends API responses and API-served Intelligence Agent artifacts remain authoritative. The MCP layer exists to translate protocol surfaces, not to recompute or reinterpret Stock Trends outputs.

Affected docs/implementation implications: Runtime code must forward to public API routes, preserve API-authored semantics, and avoid recomputation, mutation, generated guidance, or independent reasoning logic.

## ADR-003: Intelligence Artifact Route Canonicality

Status: accepted

Decision: Do not add or assume `/v1/intelligence/guidance/latest/by_id` or `/v1/intelligence/research/latest/by_id` as required API routes for MCP v1. Use the confirmed observed canonical artifact-id routes as HTTP backing routes where applicable, such as guidance/research routes that use `{artifact_id}`. If `/latest/by_id` aliases are later added to the API, they should be justified by front-facing API product needs, not created only because MCP exists.

Rationale: MCP should adapt the canonical API contract instead of pressuring the API to add MCP-only aliases.

Affected docs/implementation implications: Later paid artifact tools should wrap canonical `{artifact_id}` routes. Documentation should not present `/latest/by_id` aliases as required or planned MCP v1 dependencies.

## ADR-004: MCP By-Id Tool Names

Status: accepted

Decision: MCP tool names may remain semantic and agent-readable even when the backing HTTP route uses a different REST shape. Planned semantic tool names such as `stocktrends_get_guidance_by_id` and `stocktrends_get_research_by_id` may wrap canonical `{artifact_id}` HTTP routes. Tool names do not need to mirror HTTP paths.

Rationale: MCP tool names are an adapter-facing interface for agents. They should describe user intent while preserving canonical HTTP route usage internally.

Affected docs/implementation implications: Future paid-phase tool metadata should name semantic tools and separately document their backing HTTP routes.

## ADR-005: Phase 1 Scope

Status: accepted

Decision: Phase 1 is local stdio only and public-resource only. It excludes paid API tools, API-key-required calls, x402, wallet handling, hosted remote MCP, OAuth, direct database access, control-plane access, Intelligence Agent recomputation, prompts that generate investment conclusions, and any parallel reasoning logic.

Rationale: Phase 1 should prove safe local MCP resource exposure before introducing credentials, paid calls, payment flows, hosted surfaces, or model-authored interpretation.

Affected docs/implementation implications: Phase 1 acceptance criteria must assert that no paid, auth, x402, wallet, remote, prompt, database, control-plane, or reasoning surface is registered or exposed.

## Streamable HTTP public-foundation decision

Decision: preserve stdio as the default transport and add explicit, stateless Streamable HTTP at `/mcp` using the MCP SDK v2 per-request factory. The remote surface is limited to ten credential-free resources, one workflow-cost planning tool, and zero prompts. It refuses current API-key, paid, x402, challenge, live-challenge, and proof-forwarding configuration before listener creation.

Rationale: this permits remote discovery/planning without sharing paid-state counters, duplicate-call suppression, pricing reconciliation, credentials, or payment state between callers. A production hosted endpoint, remote authentication, remote paid execution, MPP, and transaction-complete x402 remain separate decisions.

## ADR-006: Phase 1 Tools Policy

Status: accepted

Decision: Phase 1 should be resources-first and ideally zero tools. Do not expose tools in Phase 1 unless implementation reveals that a public endpoint truly requires parameterized invocation and cannot be safely represented as a resource. Compatibility tools may be discussed only as later candidates, not as a Phase 1 default.

Rationale: The intended Phase 1 public discovery endpoints are unparameterized. Resources are the smaller and safer MCP primitive for public context exposure.

Affected docs/implementation implications: Tests should prove no tools are registered by default in Phase 1, especially no paid or auth-required tools.

## ADR-007: Phase 1 Prompts Policy

Status: accepted

Decision: Do not ship MCP prompts in Phase 1. Prompts may be reconsidered later only if they are safe, public, non-authoritative, and clearly instructional rather than conclusion-generating.

Rationale: Prompts can blur the line between API context and generated investment conclusions. Phase 1 should avoid that risk entirely.

Affected docs/implementation implications: Phase 1 implementation and tests should assert that no prompts are registered.

## ADR-008: Phase 1 API Base URL

Status: accepted

Decision: The default API base URL should be `https://api.stocktrends.com`. It must remain configurable via `STOCKTRENDS_API_BASE_URL`.

Rationale: A stable default improves local setup, while the environment variable keeps staging or alternate approved API origins possible.

Affected docs/implementation implications: Config parsing should default to `https://api.stocktrends.com`, enforce an approved Stock Trends origin, and reject arbitrary per-request host changes.

## ADR-009: `/v1/ai/context` Classification

Status: accepted

Decision: Treat `/v1/ai/context` as a public candidate requiring implementation-time no-key verification. Do not overstate that it is confirmed public unless the implementation task actually verifies it.

Rationale: Existing notes indicate public/payment-free behavior, but the exact classification label remains unresolved. The implementation should prove no-key access before exposing it as a Phase 1 resource.

Affected docs/implementation implications: Phase 1 docs should mark `/v1/ai/context` as a candidate resource pending no-key verification, and implementation should fail closed if it returns `401`, `402`, or `403`.

## ADR-010: `/v1/pricing/catalog`

Status: accepted

Decision: Do not include `/v1/pricing/catalog` in Phase 1 unless it is already a confirmed existing public front-facing endpoint. Do not invent a pricing catalog endpoint for MCP.

Rationale: Phase 1 exposes no paid tools, so pricing metadata is not needed to prove the public stdio resource adapter. Inventing a route would violate the API authority boundary.

Affected docs/implementation implications: Phase 1 resource lists should omit pricing by default. Later paid phases may include pricing only after confirming the front-facing API route.

## ADR-011: Cache and Startup Validation

Status: accepted

Decision: Phase 1 should not require startup-time API fetches. Resources should be fetched on request. The implementation should fail closed if the API is unavailable, returns malformed data, or unexpectedly returns `401`, `402`, or `403` for a supposedly public resource. Avoid caching in Phase 1 unless there is a narrow, documented reason.

Rationale: Fetch-on-request keeps startup deterministic and avoids hidden network behavior. No-cache-by-default keeps stale discovery data from becoming a secondary authority.

Affected docs/implementation implications: Startup should register resources without calling the API. Tests should cover fetch-on-request behavior and deterministic failure mapping.

## ADR-012: Paid Route Safety

Status: accepted

Decision: Paid routes, API-key routes, guidance/research paid artifact routes, and x402 handling are out of scope until later phases. Docs may describe them as future phases, but Phase 1 acceptance criteria must confirm they are not registered or exposed.

Rationale: Paid and authenticated surfaces require separate spend controls, credential handling, and payment design.

Affected docs/implementation implications: Phase 1 implementation must not register paid resources, tools, prompts, x402 flows, API-key behavior, or wallet handling. Later phases need separate review before enabling them.
