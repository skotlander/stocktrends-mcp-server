# Phase 1 Stdio Public Resources Implementation Memo

## 1. Purpose of Phase 1

Phase 1 proves that the Stock Trends MCP Server can expose public Stock Trends API context through a local stdio MCP server without introducing paid-call, x402, wallet, auth, or remote-server risk.

This phase is intentionally narrow. The MCP server remains a thin adapter over the front-facing Stock Trends API:

Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents

The MCP adapter must not become a second source of truth. It must not recompute Stock Trends indicators, ST-IM, selections, rankings, guidance, research, editorial conclusions, or any Intelligence Agent artifact. It may only translate confirmed public API responses into MCP resources, and only add transparent MCP envelope metadata required by the protocol.

The implementation goal for a later session is not "usable Stock Trends analysis." It is "safe local MCP connectivity to public API context." Paid tools, authenticated workflows, x402 behavior, wallet handling, and remote transport all remain future phases.

Accepted architecture decisions for this phase are recorded in `docs/ARCHITECTURE_DECISIONS.md`.

## 2. Scope

Phase 1 includes only local stdio transport and public, read-only, discovery-oriented API surfaces.

### Confirmed public endpoints for Phase 1

These endpoints are confirmed public by the existing architecture and capability audit in this repository. They are appropriate Phase 1 resource candidates, subject to a final public-contract check immediately before implementation.

| Endpoint | Current status in repo docs | Phase 1 status | Notes |
| --- | --- | --- | --- |
| `GET /v1/openapi.json` | Public/non-metered OpenAPI contract. | Definitely in scope. | Primary schema and route authority. |
| `GET /v1/ai/tools` | Public/non-metered machine-readable tools manifest. | Definitely in scope. | Primary discovery authority for agents. |
| `GET /v1/workflows` | Public/non-metered workflow registry. | Definitely in scope. | Planning metadata only; no workflow execution. |
| `GET /v1/meta/stim` | Public/non-metered ST-IM planning metadata. | Definitely in scope. | Methodology context only; no ST-IM data retrieval. |
| `GET /v1/intelligence/discovery` | Public/free intelligence discovery envelope. | Definitely in scope if still public at implementation time. | Publishes metadata for already-produced Intelligence Agent artifacts. |
| `GET /v1/intelligence/editorial/latest/preview` | Public/free editorial preview envelope. | Definitely in scope if still public at implementation time. | Public preview only; not guidance or research generation. |

### Public candidate requiring implementation-time no-key verification

| Endpoint | Current status in repo docs | Phase 1 status | Required confirmation |
| --- | --- | --- | --- |
| `GET /v1/ai/context` | Runtime appears public and payment-free, but exact classification should not be overstated before implementation verification. | Candidate Phase 1 resource. Include only after no-key verification. | Verify it can be fetched without `STOCKTRENDS_API_KEY`; fail closed and exclude it if it returns `401`, `402`, or `403`. |

### Candidate public metadata endpoints requiring explicit Phase 1 approval

These endpoints may be public and useful, but they are not required for the narrow Phase 1 surface requested here. They should not be included unless the implementation prompt explicitly authorizes them after confirming they are public and safe.

| Endpoint | Why it is a candidate | Default Phase 1 decision |
| --- | --- | --- |
| `GET /v1/pricing/catalog` | Useful for future paid-call planning only if already confirmed as an existing public front-facing endpoint. | Exclude from Phase 1 by default. Do not invent this endpoint for MCP. |
| `GET /v1/meta/indicators` | Public indicator methodology metadata in the broader architecture. | Defer unless public metadata breadth is explicitly expanded. |
| `GET /v1/meta/inference` | Public inference-contract metadata in the broader architecture. | Defer unless public metadata breadth is explicitly expanded. |

## 3. Explicit Non-Scope

Phase 1 excludes every capability that could imply paid access, authentication, payment handling, wallet custody, data recomputation, or a second intelligence layer.

Explicitly out of scope:

- `GET /v1/stim/latest` if paid or auth-required.
- `GET /v1/indicators/latest` if paid or auth-required.
- `GET /v1/stim/history` if paid or auth-required.
- `GET /v1/indicators/history` if paid or auth-required.
- `GET /v1/selections/latest` if paid or auth-required.
- `GET /v1/selections/history` if paid or auth-required.
- `GET /v1/selections/published/latest` if paid or auth-required.
- `GET /v1/selections/published/history` if paid or auth-required.
- `GET /v1/intelligence/guidance/latest`.
- `GET /v1/intelligence/guidance/{artifact_id}`.
- `GET /v1/intelligence/research/latest`.
- `GET /v1/intelligence/research/{artifact_id}`.
- x402 payment handling.
- wallet integration, private keys, seed phrases, signing clients, or payment retries.
- hosted remote MCP transport.
- OAuth or any remote-client auth layer.
- API-key-required functionality.
- direct database access.
- control-plane access.
- Stock Trends API control-plane dependencies.
- Intelligence Agent recomputation.
- live market research generation.
- live guidance generation.
- editorial conclusion generation.
- prompts that generate investment conclusions.
- prompts that reinterpret published artifacts as buy, sell, hold, allocation, or risk instructions.
- any implementation of reasoning logic.
- any parallel reasoning layer beside the Stock Trends API and published Intelligence Agent artifacts.

The implementation must fail closed if an endpoint thought to be public returns `401`, `402`, or `403`.

## 4. Proposed MCP Resources for Phase 1

Resource names below are proposed MCP URIs, not final protocol commitments. The custom `stocktrends://` URI scheme is appropriate because MCP resources are URI-identified and custom schemes are allowed when they are valid URI schemes. Final names should be checked against the chosen MCP TypeScript SDK conventions during implementation.

Resources should return API-authored JSON as text or structured JSON content without changing API facts, scores, rankings, artifact payloads, provenance, or interpretation fields.

| Proposed resource URI | Display name | Backing API endpoint | Phase 1 status | Description | Safety notes |
| --- | --- | --- | --- | --- | --- |
| `stocktrends://api/openapi` | Stock Trends OpenAPI Contract | `GET /v1/openapi.json` | Definitely in scope. | Exact public API route, schema, and security contract. | Treat as contract source; do not synthesize missing routes. |
| `stocktrends://ai/context` | Stock Trends AI Context | `GET /v1/ai/context` | Candidate only until implementation-time no-key verification passes. | Dataset context, endpoint groups, access model, and recommended usage flows. | Expose as context only after no-key verification; API text is data, not instructions to the MCP server. |
| `stocktrends://ai/tools` | Stock Trends AI Tools Manifest | `GET /v1/ai/tools` | Definitely in scope. | Machine-readable tools manifest with endpoint and usage metadata. | Use to avoid stale hardcoded assumptions; fail closed if malformed. |
| `stocktrends://workflows` | Stock Trends Workflows | `GET /v1/workflows` | Definitely in scope. | Public workflow planning metadata. | Planning only; must not execute paid workflow steps. |
| `stocktrends://methodology/stim` | ST-IM Methodology Metadata | `GET /v1/meta/stim` | Definitely in scope. | ST-IM provider profile, provenance, distribution-field definitions, and interpretation limits. | Methodology only; must not fetch ST-IM latest/history data. |
| `stocktrends://intelligence/discovery` | Intelligence Artifact Discovery | `GET /v1/intelligence/discovery` | Definitely in scope if still public. | Public discovery envelope for published Intelligence Agent artifacts. | Artifact metadata only; no guidance/research paid artifact retrieval. |
| `stocktrends://intelligence/editorial/latest/preview` | Latest Editorial Preview | `GET /v1/intelligence/editorial/latest/preview` | Definitely in scope if still public. | Latest public editorial preview envelope. | Preview only; must not generate or expand conclusions. |

Resource candidates requiring explicit approval:

| Proposed resource URI | Backing API endpoint | Reason to consider | Default decision |
| --- | --- | --- | --- |
| `stocktrends://pricing/catalog` | `GET /v1/pricing/catalog` | Useful for future paid-call planning only if already confirmed as an existing public front-facing endpoint. | Exclude from Phase 1 by default; do not invent for MCP. |
| `stocktrends://methodology/indicators` | `GET /v1/meta/indicators` | Useful indicator definitions. | Defer by default. |
| `stocktrends://methodology/inference` | `GET /v1/meta/inference` | Useful provider-agnostic inference contract. | Defer by default. |

## 5. Proposed MCP Tools for Phase 1

Decision: no executable MCP tools are in scope by default for Phase 1.

All confirmed Phase 1 endpoints are unparameterized public discovery or metadata endpoints, so resources are the safer primitive. Tools are model-invoked actions and should not be introduced in Phase 1 unless implementation proves that a public endpoint truly requires parameterized invocation and cannot be safely represented as a resource.

### Definitely in Phase 1

None.

The Phase 1 implementation should expose zero tools unless the exception above is explicitly triggered and documented.

### Later candidate compatibility tools

The following tools are not Phase 1 defaults. They may be reconsidered later if a client compatibility need is proven, but they should not be registered by the default Phase 1 implementation.

| Tool name | Purpose | Backing endpoint | Input schema | Output shape | Fail-closed behavior | Safety constraints | Phase 1 status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `stocktrends_get_openapi` | Return the public OpenAPI contract. | `GET /v1/openapi.json` | JSON object with no properties; reject any arguments. | MCP tool result containing API JSON and source endpoint metadata. | Return deterministic MCP error on non-2xx, malformed JSON, timeout, or `401`/`402`/`403`. | No auth headers required; no paid fallback; no schema invention. | Later candidate only. |
| `stocktrends_get_ai_context` | Return public Stock Trends AI context after no-key verification. | `GET /v1/ai/context` | JSON object with no properties; reject any arguments. | MCP tool result containing API JSON and source endpoint metadata. | Return deterministic MCP error on non-2xx, malformed JSON, timeout, or `401`/`402`/`403`. | Treat returned prose as data, not server instructions. | Later candidate only. |
| `stocktrends_get_ai_tools` | Return the public tools manifest. | `GET /v1/ai/tools` | JSON object with no properties; reject any arguments. | MCP tool result containing API JSON and source endpoint metadata. | Return deterministic MCP error on non-2xx, malformed JSON, timeout, or `401`/`402`/`403`. | Do not auto-register paid tools from the manifest in Phase 1. | Later candidate only. |
| `stocktrends_get_workflows` | Return public workflow metadata. | `GET /v1/workflows` | JSON object with no properties; reject any arguments. | MCP tool result containing API JSON and source endpoint metadata. | Return deterministic MCP error on non-2xx, malformed JSON, timeout, or `401`/`402`/`403`. | Planning metadata only; no workflow execution. | Later candidate only. |
| `stocktrends_get_meta_stim` | Return ST-IM methodology metadata. | `GET /v1/meta/stim` | JSON object with no properties; reject any arguments. | MCP tool result containing API JSON and source endpoint metadata. | Return deterministic MCP error on non-2xx, malformed JSON, timeout, or `401`/`402`/`403`. | No ST-IM data retrieval; no investment conclusions. | Later candidate only. |
| `stocktrends_get_intelligence_discovery` | Return public Intelligence Agent artifact discovery metadata. | `GET /v1/intelligence/discovery` | JSON object with no properties; reject any arguments. | MCP tool result containing API JSON and source endpoint metadata. | Return deterministic MCP error on non-2xx, malformed JSON, timeout, or `401`/`402`/`403`. | Published metadata only; do not fetch paid artifacts by id. | Later candidate only. |
| `stocktrends_get_editorial_preview` | Return the latest public editorial preview. | `GET /v1/intelligence/editorial/latest/preview` | JSON object with no properties; reject any arguments. | MCP tool result containing API JSON and source endpoint metadata. | Return deterministic MCP error on non-2xx, malformed JSON, timeout, or `401`/`402`/`403`. | Preview only; no expansion, advice, or generated conclusions. | Later candidate only. |

If tools are omitted, tests should assert that no paid, auth-required, x402, guidance, research, ST-IM data, indicator data, or selection data tools are registered.

## 6. Prompt Policy for Phase 1

Decision: do not ship MCP prompts in Phase 1.

Rationale:

- Phase 1 should prove transport, resource registration, public endpoint fetching, error mapping, and stdout safety before adding prompt behavior.
- Prompts can blur the boundary between API context and model-generated interpretation.
- Stock Trends methodology and published artifacts must remain authoritative; an MCP prompt must not become a parallel reasoning layer.

If prompts are reconsidered after Phase 1, they must be limited to safe, non-authoritative usage help. A permissible future prompt would only explain how to start with public resources such as `stocktrends://ai/tools`, `stocktrends://ai/context`, and `stocktrends://api/openapi`. It must not generate market conclusions, investment recommendations, ranking logic, guidance, research, or editorial prose.

Future prompt acceptance rule: no prompt may answer "what should I buy/sell/hold," "what is the conclusion," or "generate guidance/research." A future prompt may only direct the client back to public API context.

## 7. Package and SDK Recommendation

TypeScript remains the recommended Phase 1 implementation language.

Reasons:

- The repository is already an npm package scaffold.
- The official MCP TypeScript SDK supports Node-based MCP servers and stdio transport.
- Node's built-in `fetch` can call public API endpoints without an extra HTTP client dependency if the project targets a current Node runtime.
- TypeScript gives strict input, output, configuration, and error typing while keeping the Phase 1 adapter small.

Expected dependencies by name only, not to be installed during this architecture task:

Runtime dependencies:

- `@modelcontextprotocol/sdk`
- `zod`, if the selected SDK registration path or local validation design uses Zod schemas.

Development dependencies:

- `typescript`
- `@types/node`
- `tsx` or `ts-node` equivalent for local development, if the implementation chooses direct TypeScript execution before build output.
- `vitest` or Node's built-in test runner, depending on the project preference selected during implementation.
- `eslint` if linting is adopted.
- `prettier` if formatting is adopted.

Implementation should add package metadata, scripts, `tsconfig.json`, and dependency versions only in the later implementation task. This memo does not modify `package.json`.

## 8. Proposed File Structure for Phase 1

Proposed minimal structure for a later implementation:

```text
src/
  server.ts
  config.ts
  stocktrendsClient.ts
  errors.ts
  logging.ts
  resources/
    index.ts
    publicResources.ts
  tools/
    index.ts
  schemas/
    publicResourceSchemas.ts
tests/
  config.test.ts
  stocktrendsClient.test.ts
  resources.test.ts
  tools-phase1-safety.test.ts
  errors.test.ts
  logging.test.ts
```

Design notes:

- `src/server.ts` should construct the MCP server, register Phase 1 resources, and attach `StdioServerTransport`.
- `src/config.ts` should parse non-secret environment variables and reject unsupported transports.
- `src/stocktrendsClient.ts` should build URLs against the allowlisted Stock Trends API base URL and fetch JSON with timeouts.
- `src/resources/publicResources.ts` should define the static Phase 1 resource registry and read handlers.
- `src/tools/index.ts` should register no tools in the default Phase 1 implementation.
- `src/schemas/publicResourceSchemas.ts` should contain lightweight response-shape guards where practical.
- `src/errors.ts` should map upstream failures to deterministic MCP errors.
- `src/logging.ts` should ensure normal logs go to stderr or an explicitly configured file, never stdout.
- `tests/` should use mocked HTTP responses only; no paid endpoints or API keys.

No source files should be created until implementation is explicitly approved.

## 9. Configuration Plan

Phase 1 should require no secrets.

The default API base URL is `https://api.stocktrends.com`, and it must remain configurable through `STOCKTRENDS_API_BASE_URL`.

Expected environment variables:

| Variable | Required | Default | Phase 1 behavior |
| --- | --- | --- | --- |
| `STOCKTRENDS_API_BASE_URL` | Optional. | `https://api.stocktrends.com` | Must resolve to an allowlisted Stock Trends API origin. Must not be user-controlled per request. |
| `STOCKTRENDS_MCP_TRANSPORT` | Optional. | `stdio` | Only `stdio` is allowed in Phase 1. Any other value fails startup. |
| `STOCKTRENDS_MCP_LOG_LEVEL` | Optional. | `warn` or `info`, to be selected during implementation. | Controls stderr/file logging verbosity only. |

Variables explicitly not required in Phase 1:

- `STOCKTRENDS_API_KEY`
- bearer tokens
- x402 payment headers
- wallet private keys
- wallet addresses
- database URLs
- control-plane URLs

If `STOCKTRENDS_API_KEY` exists in the environment during Phase 1, the server should not require it, should not expose it, and should not enable paid tools because of it. The cleanest Phase 1 behavior is to ignore API-key configuration entirely until paid-tool phases.

## 10. Error-Handling Policy

Phase 1 must have deterministic, fail-closed error behavior.

Startup should register MCP resources without fetching the API. Public resources should be fetched on request. Phase 1 should avoid caching unless a narrow implementation reason is documented before merge.

| Condition | Required behavior |
| --- | --- |
| API unavailable | Return a concise MCP error when the resource is requested, identifying the resource and endpoint path without retry storms. Do not return stale fabricated data. |
| DNS/network failure | Return upstream unavailable error with safe metadata only. |
| Timeout | Abort the request and return a timeout-specific MCP error. Timeout value should be fixed/configured, not infinite. |
| Malformed response | Return schema/malformed-response error. Do not pass partial or guessed data as authoritative. |
| Non-JSON response where JSON is expected | Return malformed-response error including endpoint path and status, not raw body if body may contain sensitive content. |
| Endpoint not public | Treat `401`, `402`, or `403` from a Phase 1 endpoint as implementation-blocking or configuration-drift failure. Do not ask for credentials or payment. |
| Unexpected paid/auth response | Fail closed, log safe endpoint/status metadata to stderr/file, and do not register paid fallbacks. |
| Public endpoint returning `402` | Fail closed as `unexpected_paid_endpoint`. Do not perform x402 flow, wallet signing, or payment retry. |
| Public endpoint returning `401` | Fail closed as `unexpected_auth_required`. Do not request or use API keys. |
| Public endpoint returning `403` | Fail closed as `unexpected_forbidden`. Do not bypass with alternate routes. |
| Invalid tool input | Reject before any API call. In default Phase 1 there should be no tool inputs because no tools are definitely in scope. |
| Unknown resource URI | Return MCP resource-not-found error. |
| Redirect to unapproved host | Reject and fail closed. |
| API returns unknown schema version | Return compatibility error unless the response passes a reviewed tolerant schema guard. |

Error payloads should be stable enough for tests. They should include safe fields such as `resourceUri`, `endpointPath`, `status`, `errorCode`, and optional upstream request id if returned by the API. They must not include secrets, full request headers, wallet data, or raw exception dumps.

## 11. Logging Policy

Stdio MCP servers must not write normal logs to stdout because stdout is reserved for JSON-RPC communication. A single accidental `console.log` can corrupt the MCP stream.

Phase 1 logging rules:

- JSON-RPC protocol messages use stdout through the MCP stdio transport only.
- Human-readable logs go to stderr or an explicitly configured local file.
- TypeScript implementation should use `console.error` only for minimal stderr diagnostics or a logger configured for stderr/file output.
- Do not log API keys, bearer tokens, payment headers, wallet material, environment dumps, request headers, or full upstream payloads.
- Log only safe operational metadata: server version, transport, configured API hostname, endpoint path, status code, latency, and deterministic error code.
- Startup diagnostics must not fetch API endpoints, must not fetch paid endpoints, and must not include secrets.
- Tests must prove resource reads and server startup do not write normal logs to stdout.

## 12. Test Plan for Phase 1

Implementation should add focused tests before merge. Tests should use mocks and fixtures, not production paid calls.

Required test categories:

- Resource registration tests proving the exact Phase 1 resource URIs are listed with descriptions, backing endpoints, and safe MIME/content metadata.
- Public resource read tests using mocked responses for `/v1/openapi.json`, `/v1/ai/tools`, `/v1/workflows`, `/v1/meta/stim`, `/v1/intelligence/discovery`, and `/v1/intelligence/editorial/latest/preview`.
- `/v1/ai/context` tests only if implementation-time no-key verification keeps it in the Phase 1 resource set.
- Fetch-on-request tests proving startup registers resources without making API calls.
- No paid endpoint registration tests proving no ST-IM latest/history, indicators latest/history, selections, guidance, research, x402, wallet, or auth-required endpoints are registered as resources or tools.
- No tool registration tests proving Phase 1 exposes zero tools by default.
- No prompt registration tests proving Phase 1 exposes zero prompts.
- No API key required tests proving startup and public resource reads work without `STOCKTRENDS_API_KEY`.
- Config validation tests for `STOCKTRENDS_API_BASE_URL`, `STOCKTRENDS_MCP_TRANSPORT=stdio`, rejected non-stdio transports, and log-level parsing.
- API client URL construction tests proving paths are joined safely under the configured API base URL and cannot be redirected to arbitrary hosts.
- Default base URL tests proving `https://api.stocktrends.com` is used when `STOCKTRENDS_API_BASE_URL` is unset.
- Deterministic error mapping tests for network failure, timeout, malformed JSON, schema mismatch, `401`, `402`, `403`, `404`, `429`, and `5xx`.
- Unexpected paid/auth response tests proving `401`, `402`, and `403` on public resources fail closed without asking for credentials or attempting payment.
- No stdout logging tests proving startup, resource registration, resource read, and error handling do not write normal logs to stdout.
- Snapshot or schema tests for MCP resource metadata where appropriate.
- Candidate-tool exclusion tests proving no compatibility tools are present unless explicitly enabled by implementation scope.

Do not add tests during this architecture task.

## 13. Manual Validation Plan

After implementation, validate locally. Do not perform these steps during this memo task.

Suggested manual validation sequence:

1. Run `npm install` after package changes are intentionally made in the implementation branch.
2. Run the project build command selected by implementation.
3. Run the test suite.
4. Run MCP Inspector if appropriate for the chosen SDK and local environment.
5. Start the MCP server over stdio only.
6. Verify startup does not require an API fetch.
7. Configure Claude Desktop or another local MCP client with the local command.
8. Verify the client can list public resources.
9. Verify each public Phase 1 resource is fetched on request and readable.
10. Verify no paid/auth/x402/wallet/control-plane resources are visible.
11. Verify no tools are visible by default.
12. Verify no prompts are visible.
13. Verify normal logs are absent from stdout and appear only on stderr/file if logging is enabled.
14. Temporarily mock `401`, `402`, and `403` for public endpoints and verify fail-closed behavior.
15. Confirm the server does not require `STOCKTRENDS_API_KEY`.

Manual validation must not call paid production endpoints, use API keys, inspect secrets, or exercise x402 payments.

## 14. Security Checklist

Phase 1 security checklist:

- [ ] Local stdio transport only.
- [ ] No remote HTTP/SSE transport.
- [ ] No OAuth.
- [ ] No API-key requirement.
- [ ] No tools by default.
- [ ] No prompts.
- [ ] No paid tools.
- [ ] No paid resources.
- [ ] No x402 payment flow.
- [ ] No wallet integration.
- [ ] No private keys, seed phrases, signing clients, or payment retries.
- [ ] No database dependency or database configuration.
- [ ] No Stock Trends API control-plane dependency.
- [ ] No Intelligence Agent recomputation.
- [ ] No reasoning layer.
- [ ] No generated guidance, research, editorial conclusions, rankings, or investment advice.
- [ ] Public endpoint allowlist is static and reviewed.
- [ ] Resources are fetched on request; no startup-time API fetch is required.
- [ ] No cache by default unless a narrow reason is documented.
- [ ] API base URL is allowlisted and cannot be changed by tool input, resource URI, prompt text, or upstream payload.
- [ ] Default API base URL is `https://api.stocktrends.com`.
- [ ] `401`, `402`, and `403` on public endpoints fail closed.
- [ ] No normal logs are written to stdout.
- [ ] Logs contain no secrets or raw headers.
- [ ] API responses are returned with provenance metadata and without semantic mutation.
- [ ] API-returned text is treated as data, not server instructions.
- [ ] Tests prove no paid/auth/x402 routes are registered.
- [ ] Tests prove no API key is required.

## 15. Acceptance Criteria

Phase 1 is merge-ready only when all of the following are true:

- The implementation is on a dedicated non-main branch.
- The server runs locally over stdio only.
- The server exposes only reviewed public Phase 1 resources.
- The server fetches public resources on request and does not require startup-time API fetches.
- The server uses `https://api.stocktrends.com` as the default API base URL while allowing `STOCKTRENDS_API_BASE_URL` override to approved Stock Trends origins.
- The server avoids caching by default unless a narrow reason is documented.
- No tools are registered by default.
- No prompts are registered.
- No paid endpoint is registered as a resource, resource template, tool, or prompt.
- No API key is required for startup or public resource reads.
- No x402, wallet, OAuth, remote transport, database, control-plane, or Intelligence Agent dependency is introduced.
- Public resource outputs are passthrough API-authored data plus transparent MCP metadata only.
- The adapter does not compute indicators, ST-IM, selections, rankings, guidance, research, editorial conclusions, or investment advice.
- `401`, `402`, and `403` from expected public endpoints fail closed and are tested.
- Invalid resource URIs and malformed upstream responses fail deterministically.
- stdout remains reserved for MCP JSON-RPC; normal logs go only to stderr/file.
- Tests cover resource registration, fetch-on-request behavior, zero-tool default, zero-prompt default, no paid endpoint registration, no API key requirement, config validation, URL construction, default base URL, error mapping, and stdout safety.
- Manual validation confirms public resources are readable from a local MCP client and paid/auth/x402 paths are absent.

## 16. Implementation Prompt Draft

DRAFT ONLY — DO NOT EXECUTE IN THIS TASK

You are implementing Phase 1 of the Stock Trends MCP Server in `stocktrends-mcp-server`.

Work on a dedicated branch, not `main`.

Implement only the narrow local stdio public-resources MCP server described in `docs/PHASE1_STDIO_PUBLIC_RESOURCES_IMPLEMENTATION_MEMO.md`.

Hard constraints:

- Implement local stdio MCP transport only.
- Expose only confirmed public Phase 1 resources.
- Prefer resources over tools.
- Register zero tools by default.
- Register zero prompts.
- Do not implement paid API tools.
- Do not require `STOCKTRENDS_API_KEY`.
- Do not implement x402.
- Do not add wallet handling.
- Do not implement OAuth.
- Do not implement remote HTTP/SSE transport.
- Do not add database access.
- Do not access the Stock Trends API control plane.
- Do not recompute indicators, ST-IM, selections, rankings, guidance, research, editorial conclusions, or any Intelligence Agent artifact.
- Do not call paid endpoints.
- Do not use API keys.
- Do not inspect secrets.
- Do not include `/v1/pricing/catalog` unless it is already confirmed as an existing public front-facing endpoint and separately authorized.
- Do not perform startup-time API fetches.
- Do not add caching unless a narrow reason is documented before merge.

Implement:

- TypeScript MCP server using the selected MCP TypeScript SDK.
- `stdio` transport only.
- Config parsing for `STOCKTRENDS_API_BASE_URL`, `STOCKTRENDS_MCP_TRANSPORT`, and `STOCKTRENDS_MCP_LOG_LEVEL`.
- Default `STOCKTRENDS_API_BASE_URL` to `https://api.stocktrends.com`.
- Static allowlist of Phase 1 public resources:
  - `stocktrends://api/openapi` -> `GET /v1/openapi.json`
  - `stocktrends://ai/context` -> `GET /v1/ai/context`, only after implementation-time no-key verification
  - `stocktrends://ai/tools` -> `GET /v1/ai/tools`
  - `stocktrends://workflows` -> `GET /v1/workflows`
  - `stocktrends://methodology/stim` -> `GET /v1/meta/stim`
  - `stocktrends://intelligence/discovery` -> `GET /v1/intelligence/discovery`
  - `stocktrends://intelligence/editorial/latest/preview` -> `GET /v1/intelligence/editorial/latest/preview`
- API client with safe URL construction, timeout handling, JSON parsing, and deterministic error mapping.
- Fetch public resources on request.
- stderr/file-only logging; no normal stdout logging.
- Tests for resource registration, fetch-on-request behavior, public resource reads using mocks, zero-tool default, zero-prompt default, no paid endpoint registration, no API-key requirement, config validation, default base URL, URL construction, error mapping, and stdout safety.

Before implementation, re-confirm from the front-facing Stock Trends API contract that the intelligence discovery and editorial preview endpoints are still public/free and that `/v1/ai/context` remains public payment-free. If confirmation fails, exclude the endpoint and document the exclusion.

Do not broaden scope. If any paid/auth/x402/wallet/control-plane need appears, stop and report it as a Phase 2 or later requirement.

## 17. Remaining Open Questions

- During Phase 1 implementation, verify `/v1/ai/context` can be read without an API key before exposing it as a public resource.
- During Phase 1 implementation, recheck that `/v1/intelligence/discovery` and `/v1/intelligence/editorial/latest/preview` remain public/free before exposing them.
- Confirm whether `/v1/meta/indicators` and `/v1/meta/inference` belong in a later public-metadata phase.
- Confirm the Phase 1 test runner: Node's built-in test runner or `vitest`.
- Confirm the TypeScript execution path for local development: built JavaScript only, `tsx`, or another runner.
- Confirm compatibility behavior if `/v1/openapi.json` changes shape but existing public resource endpoints still respond.
- For later paid phases, confirm spend caps, paid-call confirmation UX, API-key/bearer-token behavior, x402 planning, and whether `/v1/pricing/catalog` is a confirmed existing public front-facing endpoint.
