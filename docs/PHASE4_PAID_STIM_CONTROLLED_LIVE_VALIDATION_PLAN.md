# Phase 4 Paid ST-IM Controlled Live Validation Plan

Plan date: 2026-07-08

Status: **Documentation/operations plan only. No live validation has occurred as a
result of this document.** No runtime code, no `src/` changes, no `tests/` changes,
no `package.json`/`package-lock.json` changes, no new scripts, no MCP tools added,
no MCP prompts added, no tool registration changes, no x402/wallet/OAuth/Bearer
fallback/remote MCP/database/control-plane work. This plan does not itself call any
live paid endpoint, does not use or inspect any real API key, and does not record
the outcome of a live run — it defines the operator-controlled process that a human
operator must follow, at a later time, entirely outside of any automated or agent
session, to perform and document the first controlled live validation.

This plan builds on and does not supersede:

- [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) §15 — the reconfirmed security
  model for paid ST-IM live execution.
- [`docs/PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved design and gate policy.
- [`docs/PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_IMPLEMENTATION_NOTES.md)
  — what was actually implemented.
- [`docs/PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md)
  §19 — which recommended this exact branch as the next step, with this scope.

## 1. Purpose and scope

- This is the plan for the **first controlled live validation** of the merged paid
  ST-IM MCP tools (`stocktrends_get_stim_latest` → `GET /v1/stim/latest`,
  `stocktrends_get_stim_history` → `GET /v1/stim/history`) against the real Stock
  Trends API.
- It is a **documentation/operations plan only**. It defines process, checklists,
  assertions, and a report template. It contains no executable validation code.
- **No live execution occurs in this branch, by this document, or as part of
  producing it.** The controlled live run described in §7 is a manual operator
  action performed later, outside of any automated pipeline, using the operator's
  own credentials.
- Architecture boundary reaffirmed (unchanged by this plan):

  ```text
  Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
  ```

  The MCP server remains a thin local stdio adapter over the front-facing Stock
  Trends API only. Nothing in this plan authorizes turning the adapter into a
  database client, control-plane client, pricing authority, payment authority,
  x402/wallet engine, or investment-advice generator.

## 2. Explicit operator authorization requirement

- **No live call may occur without an explicit, contemporaneous operator decision
  made at validation time.** Merging this plan does not authorize any call, now or
  later.
- The operator must **knowingly** set `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` in
  their own local shell/session immediately before the validation run, understanding
  that this enables real, chargeable API calls.
- The operator must **confirm the configured caps** (§4, §9) immediately before
  each live validation run — not rely on caps configured at some earlier time that
  may have since drifted or been left in an unexpected state.
- If any prerequisite in this plan is not satisfied at run time, the operator must
  stop and not proceed, rather than relaxing a control to "get the run done."
- This plan does not grant, request, or assume authorization for any specific date,
  environment, or operator. Authorization is scoped to a single, deliberate,
  documented run.

## 3. Secret handling rules

- The `STOCKTRENDS_API_KEY` value is handled **entirely outside the repository**:
  set as a local environment variable in the operator's own shell/session
  immediately before the run, and unset immediately after (§11).
- **No secrets are committed** to this repository at any point — not in this plan,
  not in the later validation report, not in any fixture, cassette, or log file.
- **No API keys appear in docs, chat transcripts, agent sessions, logs, reports,
  screenshots, shell history examples, or validation artifacts.** If a screenshot or
  terminal capture is taken during validation, the operator must redact the key
  before it is saved or shared, or simply not capture the pane where it was typed.
- Any example command in this plan uses **placeholder syntax only** —
  `STOCKTRENDS_API_KEY=<REDACTED>` or `STOCKTRENDS_API_KEY=***` — never a real or
  realistic-looking key value.
- This plan does not ask the operator to paste a key into chat, into an agent
  session, or into this document at any point, before, during, or after validation.
- Consistent with [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §2: never read `.env`,
  credential, private-key, wallet, deployment-secret, or database-credential files
  as part of this process.

## 4. Minimal configuration checklist

The operator sets the following in their own shell/session only — none of these
values are written to any repository file:

| Variable | Required value for this validation | Intent |
| --- | --- | --- |
| `STOCKTRENDS_ENABLE_PAID_TOOLS` | `true` | Exposes the 3-tool paid surface (planning tool + the two ST-IM tools). Exposure only; does not by itself permit execution. |
| `STOCKTRENDS_ENABLE_PAID_EXECUTION` | `true` | The distinct runtime execution flag. Required in addition to the exposure flag before any auth header can be built. |
| `STOCKTRENDS_API_KEY` | set outside the repo, operator's own key | Read only under paid mode; never logged, never echoed in any wrapper field. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` | small explicit nonzero value (e.g. `2`) | Per-session paid call cap. Default `0` denies all paid calls, so this must be explicitly raised. |
| `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` | small explicit nonzero value (e.g. `1`) | Per-tool paid call cap, applied independently to each of the two tools. |
| `STOCKTRENDS_MAX_STC_PER_SESSION` and/or `STOCKTRENDS_MAX_USD_PER_SESSION` | small explicit nonzero value covering exactly the two planned calls | At least one budget cap is effectively mandatory: both ST-IM pricing rules are nonzero, and an unset budget cap denies every nonzero-cost call. |
| `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` | leave at default (`true`), or set explicitly to `true` | Must **not** be set to `false`. Setting it `false` does not skip preflight — it makes live execution fail closed (`pricing_preflight_unavailable`). It must remain at its default-`true` posture. |
| `STOCKTRENDS_API_BASE_URL` | the real Stock Trends API HTTPS origin | Approved-origin gate; auth is only ever sent to this exact origin. |
| `STOCKTRENDS_MCP_TRANSPORT` | `stdio` (default) | Confirms local stdio transport only; any other value is rejected at config parse time. |
| `STOCKTRENDS_MCP_LOG_LEVEL` | operator's choice (e.g. `info`) | Controls local log verbosity only; does not affect gating. Redaction (§10) applies regardless of level. |

Any other environment variable not listed here should remain unset for this
validation, to keep the configuration surface minimal and match the exact
conditions already validated in
[`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md)
§4.

## 5. Preflight / dry-run / config inspection

Per [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15.1: **there is no dry-run flag in
this build.** A not-yet-fully-enabled configuration simply fails closed with
`paid_execution_disabled` (or an earlier deterministic denial) and sends no
request — there is no separate `STOCKTRENDS_PAID_EXECUTION_DRY_RUN`-style mode to
invoke.

This plan does not add one. No new scripts or code are introduced to simulate a
dry run. Instead, validation must rely on:

1. **Documented config inspection.** Before enabling execution, the operator
   reviews the checklist in §4 against the actual exported environment variables in
   their shell (e.g. by listing the relevant `STOCKTRENDS_*` variable names — never
   their values — to confirm which are set), and against
   [`src/config.ts`](../src/config.ts) and
   [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15.1's fail-closed matrix, to predict
   the expected tool-exposure and execution state for that configuration before
   starting the server.
2. **Controlled runtime observation with execution still disabled.** The operator
   may first start the server (`npm run build && npm start`, or `npm run dev`)
   with `STOCKTRENDS_ENABLE_PAID_TOOLS=true` and a configured `STOCKTRENDS_API_KEY`
   but **without** `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, connect an MCP client,
   and confirm exactly 3 tools are listed and that invoking either ST-IM tool
   denies deterministically with `paid_execution_disabled` and sends no request.
   This step alone requires no execution flag and cannot cause a live call.
3. Only after step 2 is confirmed does the operator proceed to §7 by additionally
   setting `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` and the caps from §4.

## 6. Catalog reconciliation confirmation

- The implementation performs a **credential-free** `GET /v1/pricing/catalog`
  reconciliation (`reconcileStaticPricingWithCatalog`) that must succeed **before**
  any `X-API-Key` header is constructed or any ST-IM fetch occurs. No `X-API-Key`
  is sent to `/v1/pricing/catalog` under any configuration.
- The operator must confirm, from the observed tool response wrapper of the
  controlled calls in §7, that this reconciliation was actually exercised (its
  outcome is reflected in the wrapper's `limitations`/pricing metadata) rather than
  assuming it from source code alone.
- **Validation must fail closed** if catalog reconciliation is unavailable,
  malformed, ambiguous (duplicate rule), missing the required rule id, has a
  missing/mismatched cost, has an unsupported unit, or has a mismatched
  endpoint/rule id. In every such case the correct and expected behavior is a
  denial (`pricing_catalog_reconciliation_failed`) with **no** auth header built
  and **no** ST-IM fetch attempted. If this occurs during the controlled run, the
  operator records it as the run's result (§12) rather than retrying with a
  weakened configuration.
- The operator must not interpret a successful static-pricing-policy match alone as
  sufficient; only a successful *catalog* reconciliation, followed by the full
  remaining preflight, permits the live call.

## 7. Controlled live call sequence

To be performed manually by the operator, later, outside of any automated
pipeline, only after §2–§6 are satisfied:

1. **One controlled latest call.** Invoke `stocktrends_get_stim_latest` (→
   `GET /v1/stim/latest`) exactly once, using a minimal, deterministic, low-risk
   test symbol (a single, liquid, well-known equity symbol the operator selects at
   run time — not a batch, not a sweep). Supply the symbol using the canonical MCP
   input form (`symbol_exchange` in underscore form, e.g. `AAPL_Q`, or decomposed
   `symbol` + `exchange`).
2. **Confirm outbound identity translation.** Before treating the call as valid,
   confirm from the returned wrapper's `mcp_metadata.symbol_identity` (or
   equivalent request-parameters field) that the identity actually sent to the API
   used the **hyphen** form (`AAPL-Q`) or decomposed `symbol`/`exchange` query
   parameters — never the underscore form — consistent with
   [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15.5.
3. **One controlled history call.** Invoke `stocktrends_get_stim_history` (→
   `GET /v1/stim/history`) exactly once, for the same test symbol, with an explicit
   small `limit` (e.g. `5`–`10`) to keep the response minimal. Confirm the same
   hyphen-form identity translation.
4. **No bulk validation.** Do not sweep symbols, do not call either tool more than
   once each, and do not exceed the caps configured in §4.
5. **No retries.** If a call fails (timeout, non-2xx, malformed response, `402`),
   the operator does not retry it. A single deterministic failure is itself a valid
   and complete observation for the report (§12).
6. **Stop immediately on unexpected behavior.** Any of the following is grounds to
   stop the validation run immediately and record it as a failure/deviation rather
   than continuing: an auth header appears to have been sent to a non-approved
   endpoint or origin; a `Bearer`/`Authorization` header appears; a payment header
   appears; `observed_cost` is populated with a value not actually returned by the
   API; the tool count is not exactly 3; a public resource or the planning tool
   appears to receive an auth header; or any cap appears not to have been enforced.

## 8. Header and auth assertions

The operator must confirm, from directly observed request/response behavior during
§7 (not from source-code inspection alone):

- `X-API-Key` is sent **only** to the two approved ST-IM endpoints
  (`GET /v1/stim/latest`, `GET /v1/stim/history`) and only after every preflight
  gate in [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15.3–§15.4 has passed.
- **No** `X-API-Key` (or any credential) is sent to any of the 9 public resources,
  to `stocktrends_estimate_workflow_cost` (`GET /v1/cost-estimate`), to
  `GET /v1/pricing/catalog`, or to any endpoint outside the narrowed
  auth-capable allowlist (§15.7 of `SECURITY_MODEL.md`), including the
  descriptive-only indicator endpoints.
- **No `Authorization: Bearer` header** is present on any request, success or
  failure.
- **No x402 or wallet behavior** is observed: no payment header is constructed or
  sent, no signing occurs, and if a `402` were returned it is treated as safe
  metadata only, with no payment attempt and no retry.
- **No OAuth behavior** is observed: no redirect, token exchange, or OAuth header
  of any kind.

## 9. Response assertions

The operator must confirm, from the actual response wrapper returned by each
controlled call:

- `mcp_metadata` wrapper fields are present and accurate: `tool_name`,
  `endpoint_path`, `http_method`, `symbol_identity`, `request_parameters`,
  `source` = `"stocktrends_api"`, `authoritative_for`, `not_authoritative_for`, and
  `fetched_at` is a plausible ISO-8601 timestamp captured at response time.
  `paid_execution_authorized`, `api_request_sent`, and `auth_header_sent` are `true`
  only for the specific call(s) that actually reached a successful fetch;
  `payment_header_sent` is `false` on every response.
- `api_data` preserves the API-returned `symbol_exchange` in its original
  **hyphen** form (e.g. `AAPL-Q`) verbatim — the adapter must not rewrite,
  reformat, or strip it.
- `observed_cost` remains `null` in the response **unless the API itself actually
  returns an observed/charged cost value** in that response. If `observed_cost` is
  non-null, the operator must confirm it was read directly from an API-returned
  field, not derived or computed locally.
- Catalog-derived or static-policy prices are **not** treated as, or substituted
  for, `observed_cost`. Any cost figure sourced from `/v1/pricing/catalog` or the
  static local pricing mirror must appear only in estimate/preflight-summary
  fields, never in the `observed_cost` field.
- Optional response metadata (`request_id`, `pricing_rule`, `payment_required`,
  accepted payment methods, quota limit/period) is captured when present in the
  actual API response and `null` when absent — never fabricated either way.

## 10. Logging and redaction rules

- **Redact API keys.** No log line, terminal capture, or saved output may contain
  the literal `STOCKTRENDS_API_KEY` value.
- **Redact auth headers.** No log line or capture may contain the literal
  `X-API-Key` header value sent on the wire.
- **Redact sensitive env values.** Only variable *names* may be recorded (e.g. "
  `STOCKTRENDS_API_KEY` was set") — never their values. This applies to the
  existing redaction coverage in [`src/redaction.ts`](../src/redaction.ts), which
  already matches `STOCKTRENDS_API_KEY`, `X-API-KEY`, `AUTHORIZATION`,
  `BEARER_TOKEN`, `PAYMENT_SIGNATURE`, `X-PAYMENT`, `WALLET_PRIVATE_KEY`,
  `DATABASE_URL`, and related patterns.
- **Permit non-sensitive metadata only** in anything saved or shared: tool name,
  endpoint path, HTTP method, status code, request id, latency, paid/free
  classification, pricing rule id (when returned and non-sensitive), cap
  configuration (values, not keys), and the response-wrapper fields described in
  §9 with any credential-shaped substrings removed.
- **What may be included in the later validation report (§12):** date/time,
  operator identity (name or handle, not credentials), commit SHA, branch,
  environment-mode summary (which flags were set, not their secret values), cap
  values used, pass/fail per assertion, deviation notes, and redacted excerpts of
  non-sensitive wrapper fields (e.g. `tool_name`, `endpoint_path`,
  `paid_execution_authorized`, `auth_header_sent`, `payment_header_sent`,
  `observed_cost`, redacted `symbol_identity`). Raw request/response payloads must
  not be pasted verbatim unless first reviewed line-by-line for secret-shaped
  content; when in doubt, summarize rather than paste.

## 11. Rollback / disable steps

To be performed by the operator immediately after the controlled run, regardless of
pass/fail outcome:

1. **Disable paid execution.** Unset or set `STOCKTRENDS_ENABLE_PAID_EXECUTION` to
   a falsy value (or simply unset it) in the operator's shell/session.
2. **Disable paid tools if needed.** Unset or set `STOCKTRENDS_ENABLE_PAID_TOOLS`
   to a falsy value if the operator does not need the paid tool surface exposed
   afterward.
3. **Remove the API key from the shell/session.** Unset `STOCKTRENDS_API_KEY`
   (e.g. `unset STOCKTRENDS_API_KEY` / `Remove-Item Env:STOCKTRENDS_API_KEY`) so it
   does not persist in the shell environment beyond the validation run. Close or
   restart the shell/session if there is any doubt about residual environment
   state.
4. **Return to free/default mode.** Restart the MCP server process with no
   `STOCKTRENDS_*` paid-related variables set.
5. **Confirm only `stocktrends_estimate_workflow_cost` is exposed** in default
   mode by connecting an MCP client and listing tools — exactly 1 tool, 9
   resources, 0 prompts, consistent with the default-mode figures already
   validated in
   [`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md)
   §3.

## 12. Validation report template

The following template is for the **later** live validation report (a separate,
future document produced only after an actual operator-authorized run). It is
reproduced here as a template only — filling it in is out of scope for this plan
and must not be done speculatively or with placeholder "expected" values presented
as real results.

```markdown
# Phase 4 Paid ST-IM Controlled Live Validation Report

- Date/time (UTC):
- Operator:
- Commit SHA:
- Branch:
- Environment mode: (e.g. paid-tools + execution + caps, per §4)

## Config checklist confirmed (§4)
- STOCKTRENDS_ENABLE_PAID_TOOLS: [true/false]
- STOCKTRENDS_ENABLE_PAID_EXECUTION: [true/false]
- STOCKTRENDS_API_KEY: [set outside repo / not set] (never record the value)
- STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION:
- STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL:
- STOCKTRENDS_MAX_STC_PER_SESSION / STOCKTRENDS_MAX_USD_PER_SESSION:
- STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT: [default true / explicit true]
- STOCKTRENDS_API_BASE_URL:

## Caps used
- Per-session cap configured / calls actually made:
- Per-tool cap configured / calls actually made:
- Budget cap configured / estimated cost consumed:

## Latest call result (stocktrends_get_stim_latest)
- Outcome: [success / deterministic denial / deterministic error]
- Symbol tested (redacted if sensitive, otherwise plain, e.g. AAPL_Q):
- Outbound identity form confirmed hyphen (§7.2): [yes/no]
- Notes:

## History call result (stocktrends_get_stim_history)
- Outcome: [success / deterministic denial / deterministic error]
- Symbol / limit tested:
- Outbound identity form confirmed hyphen: [yes/no]
- Notes:

## Catalog reconciliation result (§6)
- Reconciliation observed to succeed before auth/fetch: [yes/no]
- No X-API-Key sent to /v1/pricing/catalog: [confirmed/not confirmed]

## Auth/header assertions (§8)
- X-API-Key sent only to approved ST-IM endpoints: [confirmed/not confirmed]
- No auth sent to public resources / cost-estimate / catalog: [confirmed/not confirmed]
- No Authorization/Bearer header observed: [confirmed/not confirmed]
- No x402/wallet behavior observed: [confirmed/not confirmed]
- No OAuth behavior observed: [confirmed/not confirmed]

## Response/observed_cost assertions (§9)
- Wrapper metadata present and accurate: [confirmed/not confirmed]
- api_data preserves hyphen symbol_exchange: [confirmed/not confirmed]
- observed_cost null unless API-returned: [confirmed/not confirmed]
- Catalog/static price not treated as observed_cost: [confirmed/not confirmed]

## Redaction confirmation (§10)
- No secrets present in this report or any saved artifact: [confirmed]

## Rollback confirmation (§11)
- Execution disabled: [confirmed]
- Paid tools disabled (if applicable): [confirmed]
- API key removed from shell/session: [confirmed]
- Default mode confirmed (1 tool / 9 resources / 0 prompts): [confirmed]

## Pass/fail result
- Overall: [PASS / FAIL / PASS WITH DEVIATIONS]

## Deviations
- (list any deviation from this plan, however small)

## Follow-up actions
- (e.g. production-readiness sign-off, further review, config fix)
```

## 13. Production-readiness criteria

Paid ST-IM MCP execution should not be declared production-ready until **all** of
the following are true:

- [ ] A documented operator validation (§7, using the §12 template) has been
      performed and passed, with no unresolved deviations.
- [ ] No secret leakage occurred anywhere in the process (chat, logs, reports,
      screenshots, shell history, repository) — confirmed per §10.
- [ ] No unauthorized endpoint received an auth header — confirmed per §8, i.e. the
      auth-capable allowlist stayed exactly `{GET /v1/stim/latest,
      GET /v1/stim/history}`.
- [ ] Catalog reconciliation against the **live** `/v1/pricing/catalog` was
      confirmed to run and pass before any auth/fetch, and fail-closed behavior on
      reconciliation failure was understood (and, ideally, separately observed at
      least once in a denial scenario).
- [ ] Per-session, per-tool, and budget caps were confirmed to be enforced as
      configured, with no call exceeding them.
- [ ] Fail-closed behavior was confirmed for at least the configurations already
      covered by the mock test suite (missing key, missing execution flag, unset
      caps) — either by direct observation during this validation or by continued
      reliance on the existing mock-only automated tests plus this plan's config
      inspection (§5).
- [ ] Response wrapper metadata (§9) was confirmed accurate against real API
      responses, not only against mocks.
- [ ] `observed_cost` behavior was confirmed: `null` unless the live API actually
      returned an observed cost, with no fabrication from static or catalog prices.
- [ ] Rollback (§11) was performed and confirmed to return the server to default
      mode (1 tool / 9 resources / 0 prompts).
- [ ] **Independent review of the completed §12 validation report is completed
      before any related change is merged or paid ST-IM MCP execution is declared
      production-ready**, unconditionally — not only when the outcome is judged
      security-sensitive — consistent with the review process already used for the
      live-execution implementation itself
      ([`PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_SUBSCRIPTION_VALIDATION_REPORT.md)
      §15).

## 14. Explicit non-goals

- **No live validation occurs in this branch.** This document defines the process;
  it does not execute it.
- **No source or runtime changes.** `src/` is unmodified.
- **No tests or package changes.** `tests/`, `package.json`, and
  `package-lock.json` are unmodified.
- **No new paid tools.** The scope remains exactly the two already-implemented
  ST-IM tools.
- **No remote MCP.** Transport remains local stdio only.
- **No x402, wallet, OAuth, or Bearer-fallback behavior.** All remain deferred, as
  reconfirmed in [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15.6.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No investment advice generation.** This plan does not introduce, and the
  validated tools must not produce, buy/sell/hold/allocation/risk conclusions.
