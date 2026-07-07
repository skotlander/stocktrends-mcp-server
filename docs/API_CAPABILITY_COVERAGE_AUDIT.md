# API Capability Coverage Audit

This audit prepares the first MCP surface for the Stock Trends API. It is documentation only and does not implement tools, resources, prompts, tests, or runtime code.

## Source Notes

- API contract evidence was inspected read-only from `C:\Users\skort\Projects\stocktrends_api`, the local reference for the front-facing Stock Trends API implementation.
- `C:\Users\skort\Projects\stocktrends-api-control` is the API control plane. It is not relevant to the MCP v1 front-facing API contract and is not a source of route canonicality for this audit.
- The MCP server must be designed against the external/public Stock Trends API surface, not against the control plane, database, internal admin workflows, or deployment machinery.
- Public live paid endpoints were not called. x402 payment behavior was not tested.
- Public/paid status below is based on route descriptions, public-path allowlists, pricing classifier code, and tests in the API repository.

## Route Canonicality Terms

- Confirmed observed API route: a route observed in the front-facing `stocktrends_api` implementation, OpenAPI configuration, route tests, or public discovery metadata. These are the canonical HTTP paths the MCP adapter should call unless the API changes.
- Requested or planned endpoint alias: an endpoint name requested for coverage planning or MCP discoverability that may not exist as a front-facing API route yet.
- MCP tool name: a stable MCP-facing wrapper name. It may wrap a confirmed observed API route while also documenting requested aliases for user familiarity.
- Open question: a route, alias, naming, or exposure decision that must be confirmed before implementation.

## Audit Matrix

| API capability | Public/paid status where known | Likely MCP mapping | Expected input parameters | Expected output value to agents | Longitudinal/historical support | Risk if omitted from MCP | Preparation needed before implementation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/v1/meta/stim` | Public/non-metered planning metadata. | Resource and tool. | None. | ST-IM provider profile, provenance, base-period context, distribution-field definitions, interpretation limits. | Indirect. It explains historical base-period semantics but does not return a time series. | High: agents may misread ST-IM outputs as forecasts, price targets, or commands. | Cache policy; resource URI; startup preload recommendation; schema snapshot from OpenAPI. |
| `/v1/ai/context` | Public discovery/context endpoint. Runtime appears public; exact free-vs-free-metered logging semantics should be confirmed. | Resource and tool. | None. | Dataset overview, endpoint groups, access model, recommended flows, usage guidance. | Indirect. It points agents to history endpoints and weekly-update context. | High: agents may flatten endpoints into generic calls and miss Stock Trends doctrine. | Cache policy; expose prominently in README and startup output. |
| `/v1/ai/tools` | Public/non-metered primary machine-readable manifest. | Resource and tool. | None. | Tool catalog with endpoint, auth, metering, pricing, input schema, output summary, rails, workflow role. | Indirect. It lists latest/history routes and workflow roles. | Critical: agents lose machine-readable discovery and may hardcode stale route assumptions. | Startup fetch option; manifest schema snapshot; diff alert when manifest changes. |
| `/v1/workflows` | Public/non-metered workflow registry; live costs resolved from pricing engine. | Resource and tool. | None. | Strategy-level workflows, ordered steps, pricing_rule_id, STC costs, example requests, decision guidance. | Indirect. Workflows may include history steps. | High: agents may call paid endpoints out of order or without budgeting. | Resource cache TTL; pair with pricing catalog and cost estimate; fail closed if pricing unavailable. |
| `/v1/openapi.json` | Public/non-metered OpenAPI contract. | Resource and tool. | None. | Exact route paths, parameters, security schemes, schema extensions. | Indirect. It enumerates history endpoints and parameters. | Critical: MCP schemas can drift from API contracts. | Build generator from OpenAPI; snapshot tests; compatibility check at startup. |
| `/v1/stim/latest` | Paid/protected. Manifest tests require metered status and pricing rule. Supports subscription plus machine-payment rails where API policy allows. | Paid tool. | `symbol_exchange` or `symbol` plus `exchange`. | Latest ST-IM expected return distributions and standard deviations across 4, 13, and 40-week horizons, with staleness/missing-data metadata. | No, latest snapshot only. | High: agents cannot inspect symbol-level probabilistic context. | Require `/v1/meta/stim` guidance; input validation; paid-call confirmation; pricing preflight. |
| `/v1/indicators/latest` | Paid/protected. | Paid tool. | `symbol_exchange` or `symbol` plus `exchange`; optional `cs_only`. | Latest weekly Stock Trends indicator row including trend-state context. | No, latest snapshot only. | High: symbol workflows lack current Stock Trends classification context. | Resolve symbol first; include `cs_only` default; pricing preflight; schema snapshot. |
| `/v1/stim/history` | Paid/protected. Manifest tests require metered status and pricing rule. | Paid tool. | `symbol_exchange` or `symbol` plus `exchange`; optional `start`, `end`, `limit`, `include_gaps`. | Historical ST-IM distribution series ordered by weekdate. | Yes. Core longitudinal endpoint. | Critical: agents overemphasize latest ST-IM and miss stability, gaps, and regime transitions. | Prominent tool description; safe default limits; date-window guidance; include-gap warning. |
| `/v1/selections/latest` | Paid/protected. | Paid tool. | Optional `exchange`, `min_prob13wk`, `limit`, `include_data`, `include_mast`, `cs_only`. | Latest base ST-IM selection universe ranked by `prob13wk`; not identical to strict published STIM Select unless thresholds are applied or published endpoint is used. | No, latest snapshot only. | Medium-high: agents cannot inspect current base selection candidates, but misuse risk is high if exposed without distinction from published lists. | Tool warning distinguishing base selections from published STIM Select; limit caps; pricing preflight. |
| `/v1/intelligence/discovery` | Public/free. Exact public intelligence path. | Resource and tool. | None. | Latest discovery metadata envelope for published Intelligence Agent artifacts. | Indirect. It can point to available artifacts and ids, but is not itself a history API. | High: agents cannot safely discover canonical published artifacts by manifest metadata. | Resource URI; envelope schema validation; cache policy. |
| `/v1/intelligence/editorial/latest/preview` | Public/free. Exact public intelligence path. | Resource and tool. | None. | Latest public editorial preview artifact envelope. | No, latest preview only. | Medium: agents lose a free preview surface and may jump to paid artifacts too early. | Resource URI; artifact-envelope schema snapshot; clarify preview is not generated on request. |
| `/v1/intelligence/guidance/latest` | Paid/protected. | Paid tool. | None. | Latest published or product-grade market guidance artifact envelope served by API. | No, latest artifact only. | High: MCP cannot retrieve canonical paid guidance artifact. | Paid-call confirmation; artifact envelope schema; pricing preflight; provenance preservation. |
| Requested/planned alias: `/v1/intelligence/guidance/latest/by_id`; confirmed observed API route: `/v1/intelligence/guidance/{artifact_id}` | Paid/protected by-id guidance when called through the observed route. The requested alias is not confirmed as an API route. | MCP tool such as `stocktrends_get_guidance_by_id` should wrap the confirmed observed route; a planned alias can be documented only after confirmation. | `artifact_id` from manifest/discovery. | Specific market guidance artifact envelope by manifest id. | Artifact-id retrieval may support older artifacts if retained, but not a time-series endpoint. | Medium-high: agents may be unable to fetch a referenced guidance artifact deterministically if MCP exposes only latest retrieval. | Confirm whether the API will add a `latest/by_id` alias, whether MCP should expose an alias name, and whether docs should present only the canonical `{artifact_id}` route. |
| `/v1/intelligence/research/latest` | Paid/protected. | Paid tool. | None. | Latest published or product-grade market research report artifact envelope served by API. | No, latest artifact only. | High: MCP cannot retrieve canonical paid research artifact. | Paid-call confirmation; artifact envelope schema; pricing preflight; provenance preservation. |
| Requested/planned alias: `/v1/intelligence/research/latest/by_id`; confirmed observed API route: `/v1/intelligence/research/{artifact_id}` | Paid/protected by-id research when called through the observed route. The requested alias is not confirmed as an API route. | MCP tool such as `stocktrends_get_research_by_id` should wrap the confirmed observed route; a planned alias can be documented only after confirmation. | `artifact_id` from manifest/discovery. | Specific market research artifact envelope by manifest id. | Artifact-id retrieval may support older artifacts if retained, but not a time-series endpoint. | Medium-high: agents may be unable to fetch a cited research report deterministically if MCP exposes only latest retrieval. | Confirm whether the API will add a `latest/by_id` alias, whether MCP should expose an alias name, and ensure by-id lookup validates artifact type and preserves 404 semantics. |

## Additional v1 Candidates

These are not required for the initial matrix but appear important for a usable v1 MCP surface:

| API capability | Why it matters |
| --- | --- |
| `/v1/pricing/catalog` | Live STC pricing source for paid-call planning. |
| `/v1/cost-estimate` | Deterministic workflow budget estimates before paid calls. |
| `/v1/instruments/lookup` | Avoids symbol ambiguity before paid symbol calls. |
| `/v1/instruments/resolve` | Produces canonical `symbol_exchange` inputs. |
| `/v1/meta/indicators` | Prevents indicator-field misinterpretation. |
| `/v1/meta/inference` | Provider-agnostic inference contract for ST-IM and future providers. |
| `/v1/selections/history` | Historical base selection universe; important complement to latest selections. |
| `/v1/selections/published/latest` | Canonical latest published STIM Select list. |
| `/v1/selections/published/history` | Historical published STIM Select records. |

## Agent Input Coverage Risks

The largest MCP design risk is a latest-only tool surface. If clients see convenient `latest` tools but do not see equally prominent `history` tools, they may underuse the multi-decade longitudinal depth that makes Stock Trends distinctive.

Specific risks:

- Agents may treat the latest ST-IM distribution as a standalone forecast instead of a current point in a historical series.
- Agents may miss staleness, missing estimates, or confidence-interval behavior that only becomes visible across weeks.
- Agents may ignore indicator persistence fields and trend-state transitions if they only request the latest indicator row.
- Agents may overstate selection quality by looking only at current candidates instead of historical selection behavior and published threshold definitions.
- Agents may request paid current artifacts before using free discovery, metadata, and pricing surfaces.

Mitigations for MCP implementation:

- Expose `history` tools beside `latest` tools in the same category and documentation block.
- Add prompt templates that require date-window selection for longitudinal research.
- Include `supports_longitudinal_analysis` metadata in MCP tool descriptions.
- Require `/v1/meta/stim`, `/v1/meta/inference`, and `/v1/meta/indicators` in recommended workflows before paid interpretation.
- Provide safe default `limit` values and date-window guidance instead of hiding history behind advanced options.
- Encourage agents to call `/v1/workflows` and `/v1/cost-estimate` before multi-endpoint paid plans.

## Open Questions

- Confirm whether requested `guidance/latest/by_id` and `research/latest/by_id` aliases should become front-facing API routes, MCP-only aliases, or be dropped in favor of the confirmed observed `{artifact_id}` routes.
- Confirm MCP by-id tool names independently from HTTP route names; current candidate names are `stocktrends_get_guidance_by_id` and `stocktrends_get_research_by_id`.
- Confirm whether `/v1/ai/context` should be documented as non-metered or free-metered in the MCP surface; observed behavior is public and payment-free.
- Confirm whether production `/v1/ai/tools` should be fetched at MCP startup or only when the client requests the resource.
- Confirm whether the first implementation should expose paid intelligence artifacts or defer them behind a narrower allowlist.
- Confirm cache TTLs for discovery, OpenAPI, pricing, and artifact discovery resources.
- Confirm maximum default limits for history endpoints in MCP wrappers.
