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
  `STOCKTRENDS_API_KEY`, registers the paired paid ST-IM tool *definitions*, the
  paired paid indicators tool *definitions*, the base selections tool
  *definition* (§16), and the four market-context tool *definitions* (§17) —
  the current paid-exposed total is exactly 10 tools; the default/free surface
  remains exactly 1. This flag, or the API key, alone never exposes or executes
  anything. The internal instrument resolver adds **no** public tool.
- **`STOCKTRENDS_ENABLE_PAID_EXECUTION` (execution).** A distinct runtime flag.
  Live execution additionally requires it to be `true`. Exposure is independent
  of it: the tools appear whether or not it is set; only execution is gated.
- **Fail-closed matrix (enforced and tested):**

  | Configuration | Exposure | Execution |
  | --- | --- | --- |
  | API key only | none (1 planning tool) | none |
  | Paid-tools flag only (no key) | none (1 planning tool) | none |
  | Execution flag only (no tools flag / no key) | none (1 planning tool) | none |
  | Paid-tools flag + key, no execution flag | 10 tools | none (`paid_execution_disabled`) |
  | Paid-tools flag + key + execution flag, no caps | 10 tools | none (`spend_cap_exceeded`) |
  | Paid-tools flag + key + execution flag + ≥1 nonzero call cap + a budget cap covering the nonzero cost | 10 tools | permitted after full preflight (indicators additionally require a safe resolved identity; selections and market-context additionally require bounded always-sent limits) |

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
  and **only** for the approved origin + the **narrow auth-capable allowlist**
  (originally `/v1/stim/latest`, `/v1/stim/history`, `/v1/indicators/latest`,
  `/v1/indicators/history`; since extended by §16.2 and §17.2 to nine routes
  total — see §15.7 for the current full list). Public resources, the
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
and a fetch for **only** the nine currently approved paid routes:
`GET /v1/stim/latest`, `GET /v1/stim/history`, `GET /v1/indicators/latest`,
`GET /v1/indicators/history`, `GET /v1/selections/latest` (§16.2),
`GET /v1/market/regime/latest`, `GET /v1/market/regime/history`,
`GET /v1/breadth/sector/latest`, and `GET /v1/leadership/summary/latest`
(§17.2). The single policy resolver used by the auth-capable path
(`findPaidEndpointPolicy`, feeding `evaluatePaidPreflight`,
`evaluatePaidInvocationPreflight`, `buildPaidAuthHeaders`,
`assertPaidEndpointAllowed`, and `getPaidEndpointPolicy`) reads only
`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`. PR 39 promoted the paired paid indicators
routes into that allowlist so they are executable behind the identical gate
policy as ST-IM; PR 45 and PR 51 made the further promotions listed above under
the same identical gate policy. The **public instrument-discovery routes**
(`/v1/instruments/lookup`, `/v1/instruments/resolve`), the credential-free
`/v1/leadership/definitions` public-resource route, and any future
non-promoted paid route (including the deferred `/v1/market/regime/forecast`,
`/v1/breadth/sector/history`, and `/v1/leadership/rotation/history`) are
**not** on the auth-capable allowlist and are denied
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

## 16. Paid `selections/latest` Live Execution (Base ST-IM Selection Universe)

This section records the security-model changes required by
[`PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md)
§11 before the base-selections tool (`stocktrends_get_selections_latest` →
`GET /v1/selections/latest`) is implemented and enabled. It updates and does not
relax sections 2–15. Everything here is validated **mock-only**; no live API call
runs in the automated test suite.

The base-selections tool applies the **identical** gate policy as the paid ST-IM
tools (build/runtime execution split, `X-API-Key`-only auth, mandatory
pricing/preflight, family-scoped catalog reconciliation, default-deny caps,
covering budget cap), with **list-shaped broad-sweep/limit-safety controls**
added because it returns a universe/list rather than a single row. It is
**exchange-scoped, not symbol-keyed**, so the §15.8 instrument resolver does not
gate it and adds no tool.

### 16.1 Paid-exposed six-tool surface

Registering `stocktrends_get_selections_latest` brings the paid-exposed surface
from five tools to **exactly six**: the planning tool
(`stocktrends_estimate_workflow_cost`), the paired paid ST-IM tools, the paired
paid indicators tools, and the single base-selections tool. The **default/free
surface remains exactly one tool**, and there are **zero MCP prompts** in every
mode. Exposure uses the same gate as the ST-IM/indicators families (paid-tools
flag + configured API key) and is independent of the execution flag. No
`selections/history`, no `selections/published/*`, and no public selections
resource is added this increment.

### 16.2 Auth-capable allowlist promotion

`GET /v1/selections/latest` is promoted into
`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` (§15.7) as an explicit, separately reviewed
promotion, so it can receive an `X-API-Key` **only after every gate passes**.
Only the base `selections/latest` route is promoted. `GET /v1/selections/history`,
`GET /v1/selections/published/latest`, and `GET /v1/selections/published/history`
are **not** promoted and remain denied `endpoint_not_allowlisted` before any auth
header or fetch. The public/base nature of the route does not exempt it: only the
promoted route becomes auth-capable. The pricing catalog read, the planning tool,
and the public resources stay **credential-free** and can never receive the key.
There is no `Authorization: Bearer`, no payment header, no x402/wallet/OAuth, no
remote MCP, and no dynamic registration.

### 16.3 Selections broad-sweep / limit-safety subsection (extends §7/§8/§15)

Selections cap semantics are **list-shaped** and do **not** inherit the
single-symbol semantics. The MCP enforces caps far tighter than the API's own
default (`2000`) and hard max (`20000`):

- **Safe default MCP `limit` = `50`.** When the caller omits `limit`, the adapter
  sends an explicit `limit=50`; it **never** omits `limit`, so the API's `2000`
  default can never apply.
- **Hard maximum MCP `limit` = `250`.** A caller `limit` is validated to the
  inclusive range `1`–`250` (integer) **before** preflight/auth/fetch. A value
  above `250`, below `1`, non-integer, an array, or any sentinel **fails closed**
  at the strict schema boundary with **no request** — it is never silently
  clamped. Unknown keys and unsafe shapes are rejected the same way.
- **No universe sweeps.** `limit` is always present and always `≤ 250`; there is
  no "all rows" mode, no `limit=0`/`limit=-1` sentinel, and no way to exceed the
  hard max.
- **One fetch per invocation / no bulk automation.** Exactly one `GET` per tool
  invocation. No pagination loop, no offset walking, no auto-iteration across
  exchanges, no background refresh, no assembly of the universe from multiple
  bounded calls, and **no automatic retry** on `429`/`5xx` (fail closed).
- **Call caps default-deny.** `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` and
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` default `0` (deny); execution requires
  explicit nonzero values.
- **Mandatory covering budget cap.** The `0.05 STC` nonzero cost with no covering
  `STOCKTRENDS_MAX_STC_PER_SESSION` is denied `spend_cap_exceeded` before any
  auth/fetch.
- **Repeated-identical-call loop posture (sequential and concurrent).** Repeated
  identical base selection calls (same normalized `exchange`/`min_prob13wk`/
  effective `limit`/`include_data`/`include_mast`/`cs_only`) within a server
  session are the runaway-loop surface of §7. The normalized signature is
  **reserved synchronously before the first async boundary** (catalog
  reconciliation), so a second identical call that arrives while the first is
  still in flight — sequentially **or concurrently** — **fails closed
  deterministically** (`repeated_identical_selection_call`) before any
  pricing/auth/fetch/cap debit, rather than silently re-billing. If a call fails
  before an authorized billable attempt, its reservation is **released** so a
  later operator-supervised retry is not permanently blocked; once a billable
  attempt is reached the signature is promoted to **executed** and stays blocked
  for the session even if the API returns a deterministic error (no re-bill of an
  identical broad-sweep request). State is in-memory and resets on restart.
- **Row-count transparency.** `mcp_metadata` records the `effective_limit` sent
  and the returned row count when derivable — metadata only, never a second
  ranking or thresholding pass.

### 16.4 Family-scoped selections pricing statement (extends §15.3)

Endpoint cost is resolved from a **fresh, `selections`-family-specific static
mirror** (`selections_latest_paid = 0.05 STC`, `endpoint_family: selections`,
`cost_unit: STC`) that must pass a fail-closed reconciliation against the live
`GET /v1/pricing/catalog` metadata (credential-free) before any auth header or
fetch. Reconciliation fails closed (`pricing_catalog_reconciliation_failed`, no
auth/fetch) on a missing rule, a duplicate/ambiguous rule, a cost mismatch, a
missing/unsupported/**conflicting** unit (the verified `STC` unit is mandatory; a
matching numeric cost is never accepted without a confirmed unit), an
endpoint/rule-id mismatch, or an unavailable/malformed catalog. It **also**
verifies the catalog row's `endpoint_family`: a missing family, or any family
other than exactly `selections`, fails closed — so a row with the correct rule
id/path/cost/unit but the wrong family (e.g. `selections_published`) can never
reconcile the base rule. Where the catalog exposes them, a paid rule's
`access_type` must be `paid` and `requires_payment` must be `true` (validated
conservatively: an explicit contradicting value fails closed; an absent field is
not fabricated into a pass). Reconciliation is scoped to the **base
`selections`** rule group only: the `selections_published` family, base
`selections_history`, ST-IM, and indicators state can never gate or satisfy a
base-selections call, and the base-selections mirror never transfers to them.
Each static mirror entry (ST-IM, indicators, base selections) now carries its
expected `endpoint_family` (`stim`, `indicators`, `selections`), so family
scoping is enforced for every paid family, not just selections.

### 16.5 Base-vs-published boundary (extends §6, prompt-injection/authority)

`selections/latest` forwards the **base ST-IM selection universe** verbatim in
`api_data`. It is **not** the published STIM Select list — that is a separate
endpoint (`/v1/selections/published/latest`, family `selections_published`) that
applies the published thresholds. The tool **never** presents base rows as the
published list, **never** applies the published thresholds locally, and **never**
ranks, thresholds, scores, filters, or otherwise recomputes selections locally
(ADR-002; MCP_SERVER_ARCHITECTURE no-recomputation rule). `min_prob13wk`,
`exchange`, `cs_only`, `include_data`, and `include_mast` are passed through to
the API only; none is applied as a second local pass. `mcp_metadata` carries
base-universe provenance so agents cannot conflate the two surfaces.
`observed_cost` and `payment_status` remain `null` unless the API returns them,
and are never fabricated.

## 17. Paid Market-Context Live Execution (Regime, Breadth, Leadership)

This section records the security-model changes required by
[`PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md)
§11 for the Phase 5D market-context subset (PR #51). It updates and does not
relax sections 2–16. Everything here is validated **mock-only**; no live API
call runs in the automated test suite, and any live run remains separately
authorized under a later controlled validation plan (PR #52).

The four market-context tools apply the **identical** gate policy as the prior
paid families (build/runtime execution split, `X-API-Key`-only auth, mandatory
pricing/preflight, family-scoped catalog reconciliation, default-deny caps,
covering budget cap), with market-context limit-safety controls added because
the data is weekly-cadence and market-scoped. Scope remains **controlled local
stdio, operator-controlled use only** — no autonomous, scheduled, remote, or
bulk use.

### 17.1 Surface counts (paid-exposed ten-tool surface, ten public resources)

Registering the four market-context tools brings the paid-exposed surface from
six tools to **exactly ten**: the planning tool
(`stocktrends_estimate_workflow_cost`), the paired paid ST-IM tools, the paired
paid indicators tools, the base-selections tool, and the four market-context
tools (`stocktrends_get_market_regime_latest`,
`stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`,
`stocktrends_get_leadership_summary_latest`). The **default/free surface remains
exactly one tool**, and there are **zero MCP prompts** in every mode. Exposure
uses the same gate as every prior family (paid-tools flag + configured API key —
neither alone exposes anything) and is independent of the execution flag, which
changes call behavior, never tool count. The **public resource count changes
from nine to ten** in every mode: `stocktrends://leadership/definitions`
(backing `GET /v1/leadership/definitions`) is registered as a credential-free
public resource — verified public/zero-cost by the credential-free `200` read
recorded in the design memo §3 — and is **never keyed** under any configuration.
No dynamic registration occurs.

### 17.2 Auth-capable allowlist promotions

Exactly four routes are promoted into `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`
(§15.7), each as an explicit, separately reviewed promotion coupled to its tool:
`GET /v1/market/regime/latest` (`market_regime_latest`),
`GET /v1/market/regime/history` (`market_regime_history`),
`GET /v1/breadth/sector/latest` (`breadth_sector_latest_paid`), and
`GET /v1/leadership/summary/latest` (`leadership_summary_latest_paid`). The
`X-API-Key` header is built only inside the coupled paid boundary
(`buildPaidAuthHeaders`), only after every gate passes, and only for the
approved origin + exact promoted path. **Not promoted** (denied
`endpoint_not_allowlisted` before any auth header or fetch):
`/v1/market/regime/forecast`, `/v1/breadth/sector/history`, and
`/v1/leadership/rotation/history` — each deferred behind its own reviewed
design pass. `/v1/leadership/definitions` is **permanently non-promoted and
never auth-capable**: it is read only via the credential-free public-resource
path. The pricing catalog, the planning tool, and all public resources stay
credential-free and can never receive the key. There is no
`Authorization: Bearer`, no payment header, no `X-StockTrends-Payment-*`
header, no x402/wallet/OAuth, no raw API bypass, no remote MCP, no automatic
retry, and no dynamic registration; the §15.5 `GET`-only/no-request-body
posture is unchanged.

### 17.3 Family-scoped market-context pricing statements (extends §15.3/§16.4)

Endpoint cost is resolved from **three fresh, family-specific static mirrors**:
`market_regime_latest` (`/v1/market/regime/latest`, family `market`,
`0.15 STC`) and `market_regime_history` (`/v1/market/regime/history`, family
`market`, `0.25 STC`) in the `MARKET_PRICING_RULE_IDS` group;
`breadth_sector_latest_paid` (`/v1/breadth/sector/latest`, family `breadth`,
`0.1 STC`) in `BREADTH_PRICING_RULE_IDS`; and `leadership_summary_latest_paid`
(`/v1/leadership/summary/latest`, family `leadership`, `0.25 STC`) in
`LEADERSHIP_PRICING_RULE_IDS`. The verified market rule ids deliberately carry
**no `_paid` suffix** and the verified family string is exactly `market` (not
`market_regime`); a suffixed id or a `market_regime`-style family fails
reconciliation. Each mirror must pass the same fail-closed reconciliation
against the live `GET /v1/pricing/catalog` metadata (credential-free) before
any auth header or fetch: missing rule, duplicate/ambiguous rule, endpoint or
rule-id mismatch, **missing or mismatched `endpoint_family`**, explicit
non-`paid` `access_type`, explicit `requires_payment: false`, cost mismatch,
missing/unsupported/**conflicting** unit (the verified `STC` `cost_unit` is
mandatory), and an unavailable/malformed catalog each fail closed
(`pricing_catalog_reconciliation_failed`). Reconciliation is family-scoped: no
group's state or success ever gates or satisfies another family — including
ST-IM, indicators, selections, and the other market-context families. The
deferred-route rules (`market_regime_forecast`, `breadth_sector_history_paid`,
`leadership_rotation_history_paid`) are **not mirrored**, and
`leadership_definitions_public` (access `public`, cost unit `request`, zero
cost) can never reconcile as a paid STC mirror. `observed_cost` and
`payment_status` remain `null` unless the API returns them and are never
fabricated from static or catalog estimates.

### 17.4 Market-context limit-safety (extends §7/§8/§16.3)

Per-route MCP limits, all **always sent explicitly** and validated at the
strict schema boundary **before** any pricing/auth/fetch:

| Tool | Parameter | API default / max | MCP default | MCP hard max |
| --- | --- | --- | --- | --- |
| `stocktrends_get_market_regime_latest` | — (snapshot; strict empty input) | — | — | — |
| `stocktrends_get_market_regime_history` | `limit` | `12` / `52` | `12` | `52` (API max is already tiny) |
| `stocktrends_get_breadth_sector_latest` | `limit` | `5000` / `50000` | `50` | `250` (0.5% of API max) |
| `stocktrends_get_leadership_summary_latest` | `limit_overall` | `50` / `1000` | `50` | `200` (20% of API max) |
| `stocktrends_get_leadership_summary_latest` | `limit_bucket` | `20` / `200` | `20` | `50` (25% of API max) |

- **Fail-closed invalid limits.** Out-of-range, non-integer, array, sentinel
  (`0`, `-1`, `"all"`), and unknown-key inputs fail closed with no request —
  never silently clamped. Strict schemas reject unknown keys on every tool,
  including the zero-parameter regime-latest tool.
- **No snapshot time-travel through latest tools.** The verified `weekdate`
  override parameters on `breadth/sector/latest` and
  `leadership/summary/latest` are **not exposed** — stepping `weekdate` would
  reconstruct history through a latest tool, bypassing the deferred history
  routes and their limits. `vol_scale` (unbounded legacy multiplier) and `type`
  (no verified enum) are likewise not exposed and are rejected as unknown keys.
- **No pagination, no `start_date` walking, no date-range sweeping, no exchange
  iteration** (the `exchange` filter is a single validated passthrough value,
  never looped), **no bulk assembly, no background refresh, and no automatic
  retry** on `429`/`5xx`/`402` — exactly one `GET` per invocation (§15.5).
- **Repeated-identical-call posture (all four tools; sequential and
  concurrent).** The normalized signature (tool name + normalized effective
  input parameters) is **reserved synchronously before the first async
  boundary** (catalog reconciliation), so a duplicate — sequential or
  concurrent — fails closed deterministically
  (`repeated_identical_market_context_call`) before any
  pricing/auth/fetch/cap debit, with a secret-free denial. A pre-billable
  failure releases the reservation so a later operator-supervised retry is not
  permanently blocked; reaching an authorized billable attempt promotes the
  signature to executed for the session even if the API returns an error. The
  zero-parameter regime-latest signature is constant, so a second executed
  regime-latest call in the same server session fails closed. State is
  in-memory only and resets on restart. This is deliberately stricter than the
  ST-IM/indicators posture, justified by the weekly cadence.
- **Call caps default-deny and a covering budget is mandatory.** The call caps
  default `0` (deny); every market-context rule is nonzero STC, so a covering
  `STOCKTRENDS_MAX_STC_PER_SESSION` is required or the call is denied before
  auth/fetch.
- **Row-count and limit transparency.** `mcp_metadata` records every effective
  limit sent (`effective_limits`) and the returned row count when derivable —
  metadata only, never a second ranking/filtering pass.
- **Breadth history is not reachable.** The API's verified
  `200000`/`500000` default/max never becomes reachable: PR #51 adds no code
  path for `/v1/breadth/sector/history`, the route stays non-promoted and on
  `PROHIBITED_RESOURCE_ENDPOINTS`, and any future inclusion requires its own
  reviewed memo adopting the design memo §4.E floor.

### 17.5 Market-context authority boundary (extends §6/§16.5)

All four routes return unconstrained JSON; the adapter preserves the API
payload **verbatim in `api_data`** and never synthesizes, reshapes, renames, or
drops fields. **No local regime calculation** (no computation, smoothing,
reclassification, blending into a trend, or forecasting), **no local breadth
calculation** (no re-aggregation, re-grouping, participation math, or
recomputed percentages), **no local leadership calculation** (no ranking,
re-scoring, re-bucketing, threshold changes, or bucket merging —
`min_rsi`/`min_mt_cnt` pass through to the API only), and no summarization,
rewriting, filtering, or recomputation of any API output. **No investment
advice and no suitability analysis:** every tool description and
`mcp_metadata` carry context-not-advice framing — a regime label is **market
context, not a trading recommendation**; breadth rows are **participation
context, not confirmation signals to act on**; leadership tables are
**rotation context, not picks**. `mcp_metadata` carries provenance (source
endpoint, tool name, pricing rule, effective parameters and limits sent,
no-local-recomputation flags) and preserves the API-returned `request_id`
where present; freshness/weekdate/staleness fields are captured **only when
present** in the API payload and never fabricated.

### 17.6 Prohibited-resource-list correction

`PROHIBITED_RESOURCE_ENDPOINTS` gains the two **paid** leadership routes
(`/v1/leadership/summary/latest`, `/v1/leadership/rotation/history`), closing
the gap recorded in the design memo §2 (the market-regime and breadth routes
were already listed). `/v1/leadership/definitions` is deliberately kept **off**
the prohibited list: it is the verified public/zero-cost route registered as
the credential-free `stocktrends://leadership/definitions` resource.
