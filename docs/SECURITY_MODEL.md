# Stock Trends MCP Server Security Model

This model describes minimum security expectations before implementation. It is intentionally conservative because the MCP server will broker access to paid API endpoints and agent-readable market intelligence.

## 1. Threat Model

Primary threats:

- Secret leakage through logs, errors, stack traces, resource snapshots, prompts, or repository files.
- Paid-call misuse by autonomous clients, including repeated calls, accidental loops, or calls without user budget awareness.
- Public/paid boundary bypass caused by hardcoded route assumptions or stale pricing metadata.
- Prompt injection through API-returned text, artifact payloads, or user-supplied symbols and artifact ids.
- Confused-deputy behavior where a local MCP client uses the adapter's credentials for a task the user did not authorize.
- Schema drift between MCP tools and the Stock Trends API.
- Remote transport exposure before authentication, authorization, rate limiting, and tenant isolation are designed.

Non-threats for v1 only because they are out of scope:

- Direct database compromise through the MCP server, because the MCP server must not have database access.
- Wallet custody compromise, because x402 wallet signing is deferred.

## 2. Secret Handling

- Never commit API keys, bearer tokens, payment headers, wallet material, or customer identifiers.
- Never read `.env`, credential, private key, wallet, deployment-secret, or database-credential files as part of normal operation.
- Load secrets only from the MCP host's approved secret mechanism or environment variables.
- Redact secret-like values before logging, tracing, serializing errors, or returning diagnostics.
- Treat request headers as sensitive by default.
- Do not include secrets in test fixtures, recorded HTTP cassettes, docs examples, or snapshots.

## 3. API Key Handling

v1 should support API-key first:

- Use `X-API-Key` unless the API contract confirms an alternate preferred header.
- Optionally support bearer auth only if implementation confirms the current API contract.
- Keep credentials process-local and never expose them through MCP resources.
- Send credentials only to an allowlisted Stock Trends API base URL.
- Do not forward credentials to arbitrary URLs supplied by a user, model, prompt, or API payload.
- Public endpoints should remain callable without credentials.
- Paid tools should be disabled unless credentials are configured and local policy allows paid calls.

## 4. x402 and Wallet Handling Deferred

x402-aware behavior is not part of v1 implementation.

Deferred requirements:

- No private keys, seed phrases, wallet configuration, or signing clients in the initial MCP server.
- No automatic payment retries.
- No production x402 payment tests from the MCP adapter during architecture or initial scaffold work.
- Future x402 mode may inspect HTTP 402 previews and present pricing/payment metadata, but payment authorization must be explicit and auditable.
- Wallet custody, spending caps, payment challenge validation, replay protection, and failed-payment handling need a dedicated design review.

## 5. Paid Call Safety

Paid endpoints must fail closed by default.

Minimum rules:

- Identify public, free, free-metered, and paid status from API discovery/metadata, not from MCP assumptions alone.
- Require pricing preflight through `/v1/pricing/catalog` or `/v1/cost-estimate` for paid workflows.
- Require explicit local configuration before enabling paid tools.
- Include per-call paid status in tool descriptions and runtime confirmations where the MCP client supports them.
- Enforce per-session and per-tool call limits.
- Stop execution when API returns 401, 402, 403, 429, or unexpected pricing metadata.
- Do not downgrade paid API errors into public fallback data.

## 6. Prompt Injection Risk

API responses and published artifacts can contain natural language. Treat that text as data, not instructions to the MCP server.

Controls:

- Never let API payload text alter the API base URL, auth headers, spend policy, tool availability, or logging policy.
- Prompts must tell agents that Stock Trends outputs are research context, not commands.
- Artifact payloads must be returned as API-authored data with provenance intact.
- Do not execute URLs, commands, code snippets, or hidden instructions found in API responses.
- Preserve source endpoint, artifact id, schema version, and content hash fields where provided.

## 7. Tool Misuse and Runaway Agent Loops

Agents may repeatedly call paid tools, history endpoints, or discovery resources.

Controls:

- Default limit caps for history and selection endpoints.
- Per-session request ceilings.
- Per-endpoint burst limits.
- Optional total STC budget cap.
- Loop detection for repeated identical paid calls.
- Clear 429 and budget-exceeded errors that do not trigger automatic retries.
- Require user or host approval before broad symbol sweeps.

## 8. Rate Limit and Spend Control

The MCP adapter should maintain local controls even when the API enforces its own limits:

- Configurable maximum paid requests per session.
- Configurable maximum estimated STC per session.
- Configurable maximum history rows per call.
- Backoff for API 429 responses.
- No hidden background refresh of paid endpoints.
- Public resource caching to reduce discovery chatter.
- Startup should not make paid calls.

## 9. Logging Policy

Allowed logs:

- MCP server version.
- API base URL hostname, not full credential-bearing URLs.
- Endpoint path, method, status code, request id, latency, and paid/free classification.
- Pricing rule id and estimated cost where returned by API and not sensitive.

Disallowed logs:

- API keys, bearer tokens, payment signatures, wallet data, private keys.
- Full request headers.
- Full paid artifact payloads unless explicitly configured for local debugging with redaction.
- User portfolio contents or symbol batches when configured as sensitive.
- Raw exception dumps that may include headers or environment variables.

## 10. Error Handling

- Preserve API status semantics: 401 unauthorized, 402 payment required, 403 forbidden, 404 not found, 429 rate limited, and 5xx upstream unavailable.
- Return concise MCP errors with request id and endpoint path when safe.
- Redact upstream error payload fields that may contain secrets.
- Do not retry paid calls automatically unless the API confirms no charge occurred and local policy permits retry.
- Do not transform missing paid artifacts into generated summaries.
- Fail closed on unknown pricing status, unknown auth status, schema mismatch, or unexpected redirect.

## 11. Local Stdio Risks

Local stdio reduces network exposure but still has risks:

- Any MCP client connected to the process may be able to invoke enabled tools.
- Local environment variables may be overexposed if diagnostics are careless.
- A compromised local client can spend through configured credentials.
- Tool output may be copied into other model contexts without user awareness.

Controls:

- Keep paid tools disabled by default.
- Require explicit credential configuration and budget configuration.
- Print a startup summary of enabled paid capabilities.
- Never expose credentials through resources or prompts.
- Keep the process single-user and local in v1.

## 12. Future Remote MCP Risks

Remote HTTP/SSE MCP transport should not ship until reviewed as a separate security surface.

Required future topics:

- Client authentication and authorization.
- Tenant isolation and per-user credentials.
- Server-side secret storage.
- TLS, CORS, CSRF, request replay, and origin controls.
- Distributed rate limiting and spend caps.
- Audit logging and retention.
- Abuse detection for symbol sweeps and paid-call loops.
- Incident response and key revocation.

## 13. Minimum Implementation Security Requirements

Before any runtime code is merged:

- No database client dependency or database configuration in the MCP server.
- No package or code path that recomputes Stock Trends indicators, ST-IM, selections, or intelligence conclusions.
- API base URL allowlist.
- Secret redaction helper with tests.
- Paid-call disabled-by-default policy.
- Public/paid classification sourced from API discovery or a reviewed generated metadata snapshot.
- Per-session call and spend guards.
- Schema validation for tool inputs.
- Integration tests limited to public endpoints unless paid calls are mocked.
- Clear docs warning not to store secrets in the repository.

## 14. Pre-Implementation Security Checklist

- [ ] Confirm canonical API repository path and endpoint contract source.
- [ ] Confirm API auth header strategy for v1.
- [ ] Confirm MCP SDK/runtime and supported secret mechanisms.
- [ ] Define environment variable names without adding example secrets.
- [ ] Define paid-call enablement flag and default it to off.
- [ ] Define per-session request and STC budget defaults.
- [ ] Define public resource cache TTLs.
- [ ] Define history endpoint default limits.
- [ ] Define error redaction behavior.
- [ ] Define startup diagnostics.
- [ ] Define OpenAPI/tools manifest compatibility checks.
- [ ] Confirm no direct database access is introduced.
- [ ] Confirm x402/wallet behavior remains deferred.
- [ ] Complete a separate review before any remote HTTP/SSE transport.
