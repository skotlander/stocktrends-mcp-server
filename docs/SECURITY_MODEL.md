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

## 15. Paid ST-IM and Indicators Live Execution (Subscription/API-Key)

This section is the reconfirmation required by
[`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
§17.1 (consistent with the Phase 3 paid-tool process requirement) before live
subscription/API-key execution of the paired paid ST-IM tools
(`stocktrends_get_stim_latest` → `GET /v1/stim/latest`,
`stocktrends_get_stim_history` → `GET /v1/stim/history`) and the paired paid
indicators tools (`stocktrends_get_indicators_latest` →
`GET /v1/indicators/latest`, `stocktrends_get_indicators_history` →
`GET /v1/indicators/history`) is implemented and enabled. It updates and does not
relax sections 2–13. Everything in this section is validated **mock-only**; no
live API call runs in the automated test suite.

The indicators tools apply the **identical** gate policy as the ST-IM tools, with
one addition: an **internal, credential-free instrument resolver** (§15.8) must
resolve a caller identity to exactly one safe canonical `symbol_exchange` before
any paid boundary is entered. Indicators are **no longer denied-before-auth as a
class**; they are authorized only behind the same gates as ST-IM.

### 15.1 Final paid enablement flags (exposure vs. execution split)

Exposure and execution are separate. Both build-level and runtime indicators
must agree before any call:

- **Build-level (compile-time) kill switch.** `PHASE4_PAID_EXECUTION_ENABLED`
  and the mirrored spend-policy `paidCallsAuthorizedInThisBuild` are `true` in
  this build, meaning the build *contains* the execution path. This is a
  cross-build kill switch only: an older, non-execution build (constant `false`)
  can never execute regardless of environment. Flipping the constants does not
  by itself authorize any call.
- **`STOCKTRENDS_ENABLE_PAID_TOOLS` (exposure).** When `true` with a configured
  `STOCKTRENDS_API_KEY`, registers the paired paid ST-IM tool *definitions* and
  the paired paid indicators tool *definitions* (total tools become 5; the
  default/free surface remains exactly 1). This flag, or the API key, alone never
  exposes or executes anything. The internal instrument resolver adds **no**
  public tool.
- **`STOCKTRENDS_ENABLE_PAID_EXECUTION` (execution).** A distinct runtime flag.
  Live execution additionally requires it to be `true`. Exposure is independent
  of it: the tools appear whether or not it is set; only execution is gated.
- **Fail-closed matrix (enforced and tested):**

  | Configuration | Exposure | Execution |
  | --- | --- | --- |
  | API key only | none (1 planning tool) | none |
  | Paid-tools flag only (no key) | none (1 planning tool) | none |
  | Execution flag only (no tools flag / no key) | none (1 planning tool) | none |
  | Paid-tools flag + key, no execution flag | 5 tools | none (`paid_execution_disabled`) |
  | Paid-tools flag + key + execution flag, no caps | 5 tools | none (`spend_cap_exceeded`) |
  | Paid-tools flag + key + execution flag + ≥1 nonzero call cap + a budget cap covering the nonzero cost | 5 tools | permitted after full preflight (indicators additionally require a safe resolved identity) |

  There is no dry-run flag in this build; a not-yet-enabled configuration simply
  fails closed with `paid_execution_disabled` and sends no request.

### 15.2 API-key handling

- **`X-API-Key` only.** No `Authorization: Bearer` header is ever sent; Bearer
  fallback remains deferred. No payment header is ever sent.
- The key is read only under paid mode, kept process-local (non-enumerable), and
  **never logged and never exposed** in errors, denials, snapshots, or returned
  data. Redaction (§2, §9) remains in force; tests assert the key never appears.
- The `X-API-Key` header is constructed **only** inside the coupled paid
  boundary (`buildPaidAuthHeaders`), **only after every preflight gate passes**,
  and **only** for the approved origin + a **narrow auth-capable allowlist**
  (`/v1/stim/latest`, `/v1/stim/history`, `/v1/indicators/latest`,
  `/v1/indicators/history` — see §15.7). Public resources, the
  `stocktrends_estimate_workflow_cost` planning tool, the pricing catalog read,
  and the internal instrument-resolver reads (`/v1/instruments/lookup`,
  `/v1/instruments/resolve`) stay **credential-free** and can never receive the
  API key.

### 15.3 Pricing/preflight contract

- Preflight is **mandatory and non-skippable**. Endpoint cost is resolved from a
  **static, in-repo endpoint pricing policy** mirroring the catalog rule ids
  (`stim_latest_paid`, `stim_history_paid`, `indicators_latest_paid` `0.0035 STC`,
  `indicators_history_paid` `0.01 STC`); the ST-IM and indicators mirrors are
  family-specific and do not transfer to one another. `/v1/cost-estimate` and the
  `stocktrends_estimate_workflow_cost` planning tool remain **workflow-level
  planning only** and are **not** endpoint-level authorization inputs.
- **Static pricing alone cannot authorize a paid call.** Before any auth header
  is constructed or any ST-IM fetch occurs, the static mirror must pass a
  **fail-closed reconciliation** against the live `GET /v1/pricing/catalog`
  metadata (`reconcileStaticPricingWithCatalog`). The catalog is read via the
  **credential-free** public path (no `X-API-Key`) and is treated as **metadata
  reconciliation only, never authorization by itself**. Reconciliation fails
  closed (`pricing_catalog_reconciliation_failed`, no auth/fetch) when the
  catalog is unavailable, malformed, ambiguous (duplicate rule), missing a
  required rule id, missing/mismatched cost, has a **missing, unsupported, or
  conflicting unit** (the verified `STC` unit is mandatory; a matching numeric
  cost is never accepted without a confirmed unit, read from the catalog's
  `cost_unit`/`unit` field), or has a mismatched endpoint/rule id. Reconciliation
  is **family-scoped**: a paid ST-IM call reconciles only the ST-IM rule group and
  a paid indicators call reconciles only the indicators rule group, so one
  family's catalog state (or success) never gates or satisfies the other. A
  successful reconciliation is cached **per rule-id group** for the server
  session; failures are not cached. Catalog-derived cost is used only as an
  estimated/static cost, **never** as `observed_cost`.
- Static pricing policy **+** catalog reconciliation **+** local caps are all
  required together before auth/fetch.
- Consistent with `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` (default `true`): live
  execution **fails closed** (`pricing_preflight_unavailable`) whenever the
  required pricing/preflight determination is unavailable, ambiguous, malformed,
  or disabled below the required posture. Setting
  `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT=false` denies execution; it never
  weakens the requirement for these tools.
- The static amounts are a conservative **local mirror**; they are nonzero, so a
  budget cap is effectively mandatory (there is no zero-cost path for ST-IM), and
  they cannot authorize a call until the catalog confirms them (above).

### 15.4 Cap defaults and accounting

- **Per-session call cap** (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`) and
  **per-tool call cap** (`STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`): default `0`,
  which **denies** all paid calls. Live execution requires explicit nonzero
  values.
- **Budget caps** (`STOCKTRENDS_MAX_STC_PER_SESSION` /
  `STOCKTRENDS_MAX_USD_PER_SESSION`): unset by default. A nonzero cost with no
  matching budget cap is **denied** (`spend_cap_exceeded`); because ST-IM rules
  are nonzero, a budget cap is effectively mandatory.
- **Accounting is in-memory per MCP server session** only. Counters increment
  **only when an authorized paid call is actually attempted** (after all gates
  pass and the header is built, immediately before the single fetch); denied or
  invalid invocations never advance usage. **No persistence**; state **resets on
  server restart**. History `limit` remains bounded `1`–`2600` and is omitted
  when unsupplied so the API default (`260`) applies.

### 15.5 Live execution constraints

- **Exactly one fetch** per authorized call. **No automatic retries**, no
  fallback paid endpoint, no auth-switch retry, no fallback to Bearer or public
  data. `GET` only, no request body, approved origin + exact allowlisted path
  only, query params only from validated inputs.
- **Symbol identity** is sent to the API in **hyphen form** (`SYMBOL-EXCHANGE`,
  e.g. `AAPL-Q`); the MCP underscore canonical form is never forwarded. The
  API-returned hyphen `symbol_exchange` is preserved verbatim in `api_data`.
- **No observed-cost fabrication.** Subscription mode returns no per-call charge
  and no payment settlement; `observed_cost` and `payment_status` stay `null`.
  Optional response metadata (`request_id`, pricing-rule, payment-required,
  accepted methods, quota limit/period) is captured only when present.
- **402 / x402 deferral.** A `402` is surfaced as safe metadata
  (`api_payment_required`); nothing is signed, paid, or retried.
- Errors are deterministic, fail-closed, and secret-free, and clearly indicate
  whether a fetch/auth occurred.

### 15.6 Explicitly still deferred / out of scope

Unchanged from the conservative baseline and reconfirmed: **no x402, no wallet,
no OAuth, no remote MCP transport, no `Authorization: Bearer` fallback, no
payment header, no database access, no control-plane access, and no dynamic
registration** from `/v1/ai/tools` or `/v1/workflows`. The MCP server remains a
thin adapter over the front-facing Stock Trends API and never computes or
reinterprets ST-IM data or produces investment advice. **Live API validation is
performed only under separate, explicit operator authorization after merge —
never inside the automated test suite, and never with credentials committed to
the repository.**

### 15.7 Narrowed credential-bearing endpoint allowlist

The credential-bearing execution boundary can authorize an `X-API-Key` header
and a fetch for **only** the four approved paid routes: `GET /v1/stim/latest`,
`GET /v1/stim/history`, `GET /v1/indicators/latest`, and
`GET /v1/indicators/history`. The single policy resolver used by the auth-capable
path (`findPaidEndpointPolicy`, feeding `evaluatePaidPreflight`,
`evaluatePaidInvocationPreflight`, `buildPaidAuthHeaders`,
`assertPaidEndpointAllowed`, and `getPaidEndpointPolicy`) reads only
`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`. PR 39 promoted the paired paid indicators
routes into that allowlist so they are executable behind the identical gate
policy as ST-IM. The **public instrument-discovery routes**
(`/v1/instruments/lookup`, `/v1/instruments/resolve`) and any future non-promoted
paid route are **not** on the auth-capable allowlist and are denied
`endpoint_not_allowlisted` before any auth header or fetch — they can never
receive an `X-API-Key`. Making a future endpoint executable requires an explicit,
separately reviewed promotion into the auth-capable allowlist.

### 15.8 Internal credential-free instrument resolver

Indicators (and any future stock-specific paid family) resolve a caller identity
to exactly one safe canonical `symbol_exchange` **before** any paid boundary. The
resolver is an **internal helper only** — it adds **no public MCP tool** and no
MCP resource, so the default/free surface stays at exactly one tool — and every
call it makes is **credential-free** (Accept + User-Agent only; never
`X-API-Key`, `Authorization`, or a payment header).

- **Canonical `symbol_exchange`** (e.g. `IBM_N`) is trusted directly with no
  discovery call and converted to the API hyphen form (`IBM-N`); a conflicting
  `symbol`/`exchange` fails closed.
- **Explicit `symbol` + `exchange`** is verified via `GET /v1/instruments/resolve`
  with an explicit `prefer_exchange` equal to the supplied exchange — **never the
  default `N`**. A `409`, `404`, or an inconsistent result fails closed.
- **Bare raw `symbol`** is disambiguated via `GET /v1/instruments/lookup` using a
  **required, valid integer `count`**: it proceeds only when `count === 1` and the
  body carries exactly one usable canonical match. A missing/non-integer/negative
  `count`, a `count` inconsistent with the returned rows, `count > 1`, or no match
  all **fail closed** (ambiguity returns the candidate matches). The resolver never
  substitutes the parsed row count for a missing/invalid `count`, and the
  bare-symbol path never calls resolve and never sends `prefer_exchange`, so the
  default-`N` auto-pick can never occur.

On any non-success outcome the tool fails closed **before** any pricing preflight,
cap debit, auth-header construction, or paid fetch. An ambiguous or unresolved
symbol never triggers a paid call under any configuration.
