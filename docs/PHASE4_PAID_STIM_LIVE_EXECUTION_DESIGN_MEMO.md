# Phase 4 Paid ST-IM Live Execution Design Memo

Design date: 2026-07-08

Status: Architecture/design only. No runtime code, no `src/` changes, no `tests/` changes, no `package.json` changes, no MCP tools added, no MCP prompts added, no endpoint calls, no API keys, no secret inspection, no x402/wallet/OAuth/remote/database/control-plane work. This memo does not turn paid execution on; it defines whether and how a future, separately reviewed implementation branch may do so.

This memo builds on and does not supersede:

- [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) — conservative security baseline for brokering paid access.
- [`docs/PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md`](PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md) — paid auth/spend-control design.
- [`docs/PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md) — confirmed ST-IM route/auth/parameter/response facts.
- [`docs/PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md`](PHASE4_COST_ESTIMATE_MCP_INTEGRATION_MEMO.md) — workflow-level `/v1/cost-estimate` role.
- [`docs/PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md`](PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md) — the preflight and gate blueprint.
- [`docs/PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md`](PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_IMPLEMENTATION_NOTES.md) and [`docs/PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_VALIDATION_REPORT.md) — the merged foundation this memo advances.

## 1. Purpose

This memo decides **whether and how** the Stock Trends MCP Server may safely enable **live subscription/API-key execution** for the two already-registered paid ST-IM tool *foundations*:

- `stocktrends_get_stim_latest` → `GET /v1/stim/latest`
- `stocktrends_get_stim_history` → `GET /v1/stim/history`

The paired foundation exists today, is strictly validated, and fails closed at the hard paid-execution-disabled gate; no real `X-API-Key` can be sent. This memo defines the exact conditions, gates, caps, auth construction, fetch behavior, response-metadata handling, output wrapper, error taxonomy, and tests that a future implementation branch must satisfy before any live paid ST-IM call may occur, and recommends the single safest next branch.

The decision is scoped to **subscription/API-key execution only**. x402, wallets, OAuth, remote MCP, Bearer fallback, database, and control-plane all remain deferred.

## 2. Architecture boundary

The controlling authority boundary is unchanged:

```text
Stock Trends dataset -> Stock Trends API -> published Intelligence Agent artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a **thin adapter over the front-facing Stock Trends API only**. Enabling live execution must not turn the adapter into any of the following:

- a direct database client;
- a control-plane client;
- a pricing authority;
- a payment authority;
- an x402 wallet/payment engine;
- an API recomputation layer;
- an Intelligence Agent recomputation layer;
- a parallel reasoning engine;
- an investment-advice generator.

The adapter may validate inputs, enforce local policy gates, construct an `X-API-Key` header only for the approved origin + allowlisted endpoint after every gate passes, call the paid endpoint exactly once, preserve the API-authored payload verbatim, and attach transparent MCP wrapper metadata. It must not compute or reinterpret ST-IM distributions, derive buy/sell/hold/allocation conclusions, decide pricing, or approve payment. The API and its published artifacts remain the sole authority for ST-IM data.

## 3. Current validated state

Confirmed from `README.md` and the merged foundation validation report:

- Local **stdio transport only** (`parseConfig` rejects any non-`stdio` transport).
- **9 public resources** (unchanged since Phase 1/2), all credential-free.
- **Exactly 1 public/free planning tool** in default mode: `stocktrends_estimate_workflow_cost` (workflow-level `GET /v1/cost-estimate`, credential-free, `paid_execution_authorized` always `false`).
- **Exactly 3 tools** when `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** `STOCKTRENDS_API_KEY` is configured: the planning tool plus the paired `stocktrends_get_stim_latest` and `stocktrends_get_stim_history` foundations. All other env combinations expose only the 1 planning tool.
- **Zero MCP prompts** (`MCP_PROMPT_DEFINITIONS` is `readonly []`).
- ST-IM tools are **foundation-only**: every invocation fails closed.
- **No live paid execution** today; **no `X-API-Key` transmission** today.
- Hard execution-disabled gate active: `PHASE4_PAID_EXECUTION_ENABLED = false`, `paidCallsAuthorizedInThisBuild = false`; handlers terminate at `paid_execution_disabled`, never call `fetch`, and never call `buildPaidAuthHeaders`.
- **No x402/wallet/OAuth/remote MCP**; **no database/control-plane access**; **no dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.

The foundation validation report ([`PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_FOUNDATION_NO_EXECUTION_VALIDATION_REPORT.md) §16) explicitly recommended this architecture-only branch as the next step.

## 4. Decision question

**Central question:** Should the next implementation branch enable actual subscription/API-key calls to `GET /v1/stim/latest` and `GET /v1/stim/history` through the already-registered paired paid MCP tools?

Options evaluated:

| Option | Assessment | Verdict |
| --- | --- | --- |
| **A. Approve live subscription/API-key execution next** | The full paired machinery — registration, strict validation, preflight, endpoint/host allowlist coupling, spend caps, output wrapper, and the coupled auth boundary — is already built and mock-validated behind the hard gate. Route/auth/parameter/response contracts are confirmed. The remaining work is bounded: flip the gate under a new explicit env flag, add real cap accounting, construct the `X-API-Key` header inside the coupled boundary, perform one fetch, and populate the authorized wrapper. | **Recommended.** |
| B. Require another no-execution intermediate | Rejected. The foundation branch was that intermediate. Another no-execution branch adds no new safety; every gate is already mock-tested and fails closed. It would defer value without reducing risk. | Rejected. |
| C. Approve latest only first | Rejected. Violates the standing history-beside-latest rule. Latest-only ST-IM is the single highest-overinterpretation surface and must never be the first live exposure without history beside it. | Rejected. |
| D. Approve latest/history together | The pair shares one identity model, one auth path, one allowlist coupling, one wrapper, and one preflight. Pairing satisfies the history-beside-latest rule directly and adds only the already-confirmed, locally-bounded history parameter surface. | **Adopted** (this is the shape of A). |
| E. Defer pending API response-metadata confirmation | Considered, now resolved. This memo confirmed the ST-IM response-metadata contract directly against the API (see §12). No deferral is needed on that ground. | Not required. |

**Recommendation:** **Approve live subscription/API-key execution for the next implementation branch (Option A), with latest and history kept paired (Option D)**, under the gates and constraints in §5–§16, using **mock-only tests**, and subject to two bounded implementation preconditions surfaced by this memo's API inspection (§7.1, §12.1):

1. **Reconcile the `symbol_exchange` separator.** The API's `parse_symbol_exchange` accepts and the ST-IM responses emit the **hyphen** form `SYMBOL-EXCHANGE` (e.g. `IBM-N`), whereas the merged MCP foundation's canonical `symbol_exchange` regex uses the **underscore** form (`..._[NQABTI]`). The execution branch must send an API-valid identity — either forward decomposed `symbol` + `exchange`, or convert the canonical underscore form to the API hyphen form before the query is built — or the API will return `400 invalid_symbol_exchange`.
2. **Never fabricate observed cost.** Subscription/API-key responses do not return a per-call charged STC/USD amount (see §12.1). The wrapper's `observed_cost` must stay `null` unless a real cost value is present.

Neither precondition is a blocker; both are small, in-scope adjustments for the implementation branch.

## 5. Scope of approved live execution

Live execution, if implemented, is confined to the narrowest safe scope:

- **Subscription/API-key only.**
- **`X-API-Key` header only.** No Bearer fallback.
- **No x402.** No wallet. No OAuth. No remote MCP. No database. No control-plane.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`; tool/endpoint/pricing metadata stays static.
- **No paid tools beyond ST-IM latest/history.** Indicators, selections, and intelligence artifacts remain deferred.
- **No investment-advice generation**, no buy/sell/hold/allocation/risk conclusions, no local ST-IM recomputation.
- **No automatic retries** and **no background/startup calls**.
- **No live call unless the client/agent explicitly invokes the paid tool.** Preflight is internal and non-skippable; it is never triggered speculatively, and it never auto-calls the paired tool (latest must not auto-fetch history, or vice versa).
- **Public surface unchanged:** 9 credential-free resources, the credential-free planning tool, zero prompts.

## 6. Execution gate policy

The current hard gate is a compile-time constant pair (`PHASE4_PAID_EXECUTION_ENABLED = false`, `paidCallsAuthorizedInThisBuild = false`) that makes an authorized preflight decision unreachable, so `buildPaidAuthHeaders` always throws.

**Recommended future policy — two independent gates plus explicit configuration, fail-closed in every direction:**

1. **Separate tool exposure from execution.** Keep exposure gated as today: `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** a configured `STOCKTRENDS_API_KEY` register the paired tool *definitions*. This flag alone must **never** enable execution.
2. **Require a distinct execution flag.** Add `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` as a separate, operator-facing runtime flag. Live execution requires **all** of: paid-tools flag `true`, API key present, execution flag `true`, and at least one nonzero call cap configured (§9).
3. **Keep the compile-time constants as a defense-in-depth kill switch.** Today the build-level pair blocks execution outright: `PHASE4_PAID_EXECUTION_ENABLED = false` and `paidCallsAuthorizedInThisBuild = false` (or the equivalent build-level authorization constant) make an authorized preflight decision unreachable, so `buildPaidAuthHeaders` always throws. The future execution branch must **intentionally** change both relevant build-level indicators as appropriate — flip `PHASE4_PAID_EXECUTION_ENABLED` to `true` and set `paidCallsAuthorizedInThisBuild` (or its equivalent) to its execution-capable state — so that the build *contains* an execution path. Crucially, flipping these constants does **not** by itself authorize any call: the runtime env gates remain independently required. Because the constants are compile-time, once flipped they are `true` for every run of that build; their operative role is therefore a **cross-build kill switch** (an older, non-execution build can never execute regardless of environment), not a per-invocation gate. The operative per-run controls remain the runtime execution flag, the paid-tools flag, the API key, the configured caps, and the full preflight (§7). Both the build-level indicators and the runtime gates must agree before any live call.
4. **Fail-closed matrix (mandatory):**

   | Configuration | Exposure | Execution |
   | --- | --- | --- |
   | API key only | none | none |
   | Paid-tools flag only (no key) | none | none |
   | Paid-tools flag + key, no execution flag | 3 tools, fail closed | none |
   | Execution flag only (no tools flag / no key) | none | none (fail closed) |
   | Paid-tools flag + key + execution flag, **no caps** | 3 tools | none (denied: caps unset) |
   | Paid-tools flag + key + execution flag + ≥1 nonzero cap | 3 tools | permitted after full preflight |

5. **Dry-run mode (recommended).** Support an explicit dry-run posture (e.g. `STOCKTRENDS_PAID_EXECUTION_DRY_RUN=true`) that runs the entire preflight and reports the decision, resolved cost, and cap state **without** constructing an auth header or calling `fetch`. This lets an operator validate configuration and gate behavior before enabling real calls. Dry-run must set `api_request_sent=false`, `auth_header_sent=false`, `paid_execution_authorized=false`.

Rationale: separating exposure from execution, and requiring both a compile-time constant and a runtime env flag, means no single misconfiguration (a stray env var, an accidental rebuild) can produce an unintended paid call. This directly implements the memo blueprint (`PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md` §7, §16) and the security model's disabled-by-default requirement.

## 7. Mandatory preflight sequence

Every step must pass, in order. Any failure is a **deterministic denial**. **No auth header is constructed until every gate passes, and no `fetch` occurs until the auth header is constructed through the approved gate.**

1. **Schema validation.** Strict Zod (`.strict()`, unknown keys rejected) at the SDK boundary. Schema failures return before any handler logic.
2. **Symbol identity resolution.** `symbol_exchange` precedence over `symbol` + `exchange`; exchange ∈ `{N,Q,A,B,T,I}`; history date-format/order and `limit` bounds (`1`–`2600`) validated. All identity/cross-field validation completes **before** preflight and before any network/auth side effect.
3. **Endpoint construction.** Build the intended target URL and query for host/endpoint evaluation only (not yet fetched). Apply the §7.1 separator reconciliation so the identity sent is API-valid.
4. **Approved host validation.** Target origin must exactly match the validated `STOCKTRENDS_API_BASE_URL` (HTTPS only, exact origin, no URL credentials, no fragments, no redirect/user/model/payload-supplied hosts).
5. **Endpoint allowlist.** Exact `path` + `method` must match static paid policy metadata (`GET /v1/stim/latest`, `GET /v1/stim/history`). Canonical path+method match, not substring.
6. **Tool allowlist.** Tool name must map to that endpoint policy entry (`stocktrends_get_stim_latest` → `/v1/stim/latest`; `stocktrends_get_stim_history` → `/v1/stim/history`).
7. **Paid tools enabled.** `STOCKTRENDS_ENABLE_PAID_TOOLS=true`; else `paid_tools_disabled`.
8. **API key configured.** Non-empty `STOCKTRENDS_API_KEY` read only under the paid flag; else `paid_auth_blocked_missing_api_key`.
9. **Paid execution explicitly enabled.** `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` **and** the compile-time constant `true`; else `paid_execution_disabled`.
10. **Pricing policy exists for tool/endpoint.** Static endpoint pricing policy resolves the exact rule id (`stim_latest_paid` / `stim_history_paid`) with an authoritative cost + unit; missing/ambiguous/rule-id-less → `pricing_preflight_unavailable`.
11. **Cost basis available.** A local cost estimate (from static endpoint pricing policy) or explicit static endpoint cost metadata must be available; if cost cannot be determined, deny (`cost_unavailable`). Workflow-level `/v1/cost-estimate` evidence, if present, is advisory only and is **not** the endpoint-level authority (§8).
12. **Local per-session call cap.** Projected per-session paid calls must not exceed the configured cap (default `0` → deny).
13. **Local per-tool call cap.** Projected per-tool paid calls must not exceed the configured cap (default `0` → deny).
14. **USD/STC cap behavior (if supported).** A nonzero STC estimate is denied when `STOCKTRENDS_MAX_STC_PER_SESSION` is unset or would be exceeded; a nonzero USD estimate is denied when `STOCKTRENDS_MAX_USD_PER_SESSION` is unset or would be exceeded.
15. **No automatic retries.** Exactly one attempt; no alternate paid endpoint fallback; no retry with alternate auth.
16. **Deterministic denial if any gate fails.** Denials are structured, secret-free, and never downgrade to public data.
17. **No auth header until all gates pass.** Auth construction lives only inside the coupled boundary (`buildPaidAuthHeaders`), reachable only after 1–16 succeed.
18. **No `fetch` until the auth header is constructed through the approved gate.** The single fetch is performed only inside that boundary, for the approved origin + allowlisted endpoint.

**Consistency with `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT`.** Steps 10–11 (pricing policy exists, cost basis available) are the runtime expression of the existing `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` policy (Phase 3 auth/spend memo §6, default `true`). Mandatory pricing/preflight behavior for live ST-IM execution must remain consistent with that policy: preflight is non-skippable, and **live paid ST-IM execution must fail closed (`pricing_preflight_unavailable` / `cost_unavailable`) whenever the required pricing/preflight determination is unavailable, ambiguous, stale, or malformed.** The execution branch must not weaken `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` below its default-`true` posture for these tools.

### 7.1 Symbol identity separator reconciliation (implementation precondition)

Verified read-only against the API: `routers/signals.py:parse_symbol_exchange` expects the **hyphen** form (`"IBM-N"`, `rsplit("-", 1)`), and both ST-IM responses emit `symbol_exchange` as `f"{symbol}-{exchange}"`. The merged MCP foundation's canonical `symbol_exchange` regex uses the **underscore** suffix form. The execution branch must ensure the identity actually sent to the API is hyphen-form (or send decomposed `symbol` + `exchange`), and must preserve the API-returned hyphen `symbol_exchange` verbatim in `api_data`. The MCP-side canonical/echoed identity may remain whatever the reviewed schema chooses, but the outbound query must be API-valid. This is the one contract-alignment item that, if missed, turns every live call into a `400`.

## 8. Cost and budget authority

Six distinct concepts, kept strictly separate. Do **not** overclaim workflow-level estimates as endpoint-level authorization.

| Source | Role | Required for subscription/API-key ST-IM execution? |
| --- | --- | --- |
| `GET /v1/pricing/catalog` | Catalog/metadata: `pricing_rule_id`, `endpoint_pattern`, `cost_per_request`, `stc_cost`, `estimated_usd_cost`, `requires_subscription`, `requires_payment`, `supported_rails`. | **Endpoint cost source** (via static policy mirroring catalog rule ids). Not by itself an execution authorization — it does not check the caller's entitlement/quota/balance immediately before the call. |
| Static paid endpoint policy metadata in MCP | Local mirror of the exact rule ids (`stim_latest_paid`, `stim_history_paid`) and their cost/unit, resolved through the pricing/preflight foundation. | **Required** as the endpoint-level cost basis. |
| `GET /v1/cost-estimate` | Workflow-level budgeting/planning. Takes caller-supplied `quota_remaining`; scoped to a `workflow_id`. | **Not required and not sufficient** for endpoint-level authorization. Advisory planning evidence only. `stim_forecast_review` bundles more than one standalone call and does not equal a single endpoint's cost. |
| `stocktrends_estimate_workflow_cost` (public planning tool) | Client-facing workflow budgeting. | **Not on the authorization path.** A client must **not** be required to call it first; a visible, skippable tool must never be the authorization mechanism. |
| Local MCP policy | The local authorization gate: explicit paid enablement + execution flag, API-key behavior, endpoint/host allowlist, static pricing/preflight decision, per-session/per-tool/STC/USD caps, no-retry, two-gate build/env policy. | **Required. This is the authorization gate.** |
| Actual paid API response metadata | Observed post-execution evidence (pricing-rule header, payment-required header; see §12). | Recorded in the wrapper when present; **never a pre-authorization input**. |
| x402 `402` challenge amount | Future payment-specific verification. | **Deferred.** If a `402` is returned it is surfaced as safe metadata only and never acted on. |

**Recommendation for first live execution:** authorize on **static endpoint pricing policy (catalog-derived `stim_latest_paid` / `stim_history_paid` rule cost) + local MCP caps**. Do **not** make an internal `/v1/cost-estimate` call a precondition of endpoint-level authorization, and do **not** require a prior `stocktrends_estimate_workflow_cost` call. Optionally the branch may perform a single reviewed `/v1/pricing/catalog` read to confirm the rule id/cost matches the static mirror (fail closed on drift); a caller-supplied normalized estimate may be echoed as advisory context only. Everything except static-policy-cost + local-policy is advisory, post-hoc, or deferred.

## 9. Local cap policy

Required local safety caps for live execution, all conservative and fail-closed:

- **Per-session paid call cap** (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`): default `0`. A `0` cap denies all paid calls; live execution requires an explicit nonzero value.
- **Per-tool paid call cap** (`STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`): default `0`; same semantics per tool.
- **Max history limit:** already enforced (`1`–`2600` matching the API; MCP default omitted so the API default `260` applies; recommend an MCP hard cap ≤ `2600`, ideally lower by policy such as `520`). The adapter never sends a `limit` above its own cap.
- **Optional max budget (`STOCKTRENDS_MAX_STC_PER_SESSION` / `STOCKTRENDS_MAX_USD_PER_SESSION`):** unset by default.
- **When no budget cap is configured:** a **nonzero** cost estimate is **denied** (fail closed). Because `stim_latest_paid` and `stim_history_paid` are nonzero paid rules, a configured budget cap (STC and/or USD) is **effectively mandatory** for these tools — there is no zero-cost path for them, so live ST-IM execution cannot proceed on call caps alone. (The zero-cost-proceeds carve-out exists only for a hypothetical confirmed zero-cost rule, which ST-IM is not.)
- **When cost cannot be determined:** deny (`cost_unavailable`). Never guess.
- **When a cap would be exceeded:** deny (`spend_cap_exceeded`); never partially execute, never retry.
- **Tracking:** caps are tracked **in memory per MCP server session** (single-user, local stdio). Counters increment only on an actually-attempted authorized call.
- **Reset:** cap state resets on server restart. **No persistence** across restarts unless a future branch explicitly designs and reviews durable accounting. In-memory-only accounting is an accepted, documented limitation (§18).

**Recommended conservative defaults:** all call caps default `0` (deny), budget caps unset (nonzero cost denied), history limit default = API default (`260`) with an MCP cap no higher than `2600`. Live execution is impossible until an operator sets explicit nonzero call caps and at least one budget cap.

## 10. Auth construction policy

- **`X-API-Key` only.** The header value is the raw API key in `X-API-Key` (the API's preferred programmatic header; middleware reads `x-api-key` first, `Authorization: Bearer` second).
- **Bearer fallback deferred.** Not implemented unless a future reviewed reason requires it. Fewer credential-bearing code paths is safer.
- **API key read only when paid mode enabled** (`STOCKTRENDS_ENABLE_PAID_TOOLS=true`); kept process-local (non-enumerable), never enumerated.
- **API key never logged; never exposed in errors, denials, snapshots, or returned data.** Existing redaction (key/auth-header/payment-header/wallet/env shapes) remains in force; tests assert the key never appears.
- **Auth header constructed only after all §7 gates pass**, only inside the coupled boundary (`buildPaidAuthHeaders` + `assertPaidPreflightAuthorized`).
- **Auth header only for the approved host and allowlisted endpoint.** Never for a non-approved origin, never for a non-allowlisted path.
- **Public resources never receive auth.** The 9 resources send only `Accept` and `User-Agent`.
- **The cost-estimate planning tool never receives auth.** `stocktrends_estimate_workflow_cost` stays credential-free.
- **No auth for failed preflight, validation errors, or denied cap state.** Any denial path builds no header (`auth_header_sent=false`).

## 11. Live fetch policy

- **Use an explicitly gated branch of the existing client** (or a clearly separated paid client path) reachable only from inside the coupled paid-execution boundary. Public reads and the planning tool must not share the credential-bearing path.
- **Exact endpoint URL construction:** approved origin + the allowlisted path (`/v1/stim/latest` or `/v1/stim/history`), no path templating from payload text.
- **Query parameter construction:** only validated, caller-supplied parameters. `limit`/`include_gaps` omitted when unsupplied so API defaults apply; identity sent in an API-valid form (§7.1). No request body — both endpoints are `GET`.
- **Timeout:** apply the existing client timeout if supported; a timeout is a deterministic network error, not a retry trigger.
- **Status handling:** `2xx` → parse and wrap; any non-`2xx` → deterministic error preserving API status semantics (§14). 
- **No automatic retries.** Exactly one attempt. No fallback paid endpoint. No retry with Bearer or any alternate auth.
- **Deterministic network error** on connection/timeout failure; **deterministic non-2xx error**; **deterministic malformed-response error** if the body is not the expected JSON shape.
- **No fallback to x402 on `402`.** A `402` is surfaced as safe metadata only; the adapter never signs, pays, or retries.

## 12. Response metadata requirements

Verified read-only against `middleware/metering.py` and `routers/stim.py`, subscription/API-key mode returns:

- **Response body:** `request_id` (both endpoints) plus the ST-IM data fields; history adds `symbol_exchange`, `start`, `end`, `count`, `data`, `include_gaps`, `gaps`.
- **Response headers:** the metering middleware *may* set `X-StockTrends-Pricing-Rule` (pricing rule id), `X-StockTrends-Payment-Required: false`, `X-StockTrends-Accepted-Payment-Methods`, and — on metered subscription responses — `X-StockTrends-Quota-Limit` and `X-StockTrends-Quota-Period: monthly`. These are **emitted when the metering decision includes them** (e.g. the pricing-rule header only when a rule id is resolved; the quota headers only on metered subscription responses with a known quota limit), so the MCP wrapper must treat every one of them as **optional**.

What may be captured, each **only when present** in the response:

| Field | Source | Availability in subscription mode |
| --- | --- | --- |
| `request_id` | Response body | Present on ST-IM responses; captured when present. |
| `pricing_rule` | `X-StockTrends-Pricing-Rule` header | Emitted when the metering decision includes it; captured when present, otherwise `null`. |
| `payment_required` flag | `X-StockTrends-Payment-Required` header | Emitted when the metering decision includes it (`false` for subscription); captured when present, otherwise `null`. |
| accepted payment methods | `X-StockTrends-Accepted-Payment-Methods` header | Emitted when the metering decision includes it; captured when present, otherwise `null`. |
| quota limit / period | `X-StockTrends-Quota-Limit` / `X-StockTrends-Quota-Period` headers | Emitted only on metered subscription responses with a known quota limit; captured when present, otherwise `null`. |
| observed cost (charged STC/USD amount) | — | **Not returned.** Only the pricing-rule id may be exposed; the charged amount is not in the response. |
| payment status / settlement | `PAYMENT-RESPONSE` header | **x402/agent-pay only; not present in subscription mode.** |
| payer / transaction | `PAYMENT-RESPONSE` header | **x402 only; not returned in subscription mode.** |
| quota remaining / reset | — | **Deferred by the API** (only quota *limit*/*period* are returned today). |
| raw response data | Response body | Preserved verbatim in `api_data`. |
| `fetched_at` | MCP-generated | Captured at response time (ISO-8601). |

Because every captured header above is optional, **missing optional metadata must never fail execution** and must be represented as `null` — never fabricated (see §12.1).

### 12.1 Mandatory-metadata decision

**No response-metadata field is mandatory for a successful wrapper**, because subscription mode does not return an observed per-call cost or payment settlement. Requiring them would force false failures on otherwise-successful calls.

Therefore:

- Capture `request_id`, `pricing_rule` (from the header), `payment_required`, and accepted methods **when present**; leave them `null` when absent.
- **`observed_cost` must remain `null`** in subscription mode. The adapter must **not** fabricate an observed cost, and must **not** present the static/catalog estimate as if it were the charged amount. At most, the returned pricing-rule id may be mapped back to catalog cost and labeled a **derived estimate**, never an observed charge.
- `payment_status`, payer, and transaction stay `null` (x402-only).
- The `paid_response_missing_required_metadata` error (§14) applies only if a future policy declares a specific field mandatory; under this memo none is, so that error stays unreachable for subscription mode.

## 13. Paid output wrapper

The authorized-execution wrapper preserves the API as the authority and separates payload from MCP metadata. Required fields:

- `mcp_metadata.tool_name` — e.g. `stocktrends_get_stim_latest`.
- `mcp_metadata.endpoint_path` — `/v1/stim/latest` or `/v1/stim/history`.
- `mcp_metadata.http_method` — `GET`.
- `mcp_metadata.symbol_identity` — resolved `symbol`, `exchange`, and the canonical `symbol_exchange` actually requested (API hyphen form as sent).
- `mcp_metadata.request_parameters` — the validated inputs forwarded (history: `start`, `end`, `limit`, `include_gaps` when supplied).
- `mcp_metadata.preflight_decision_summary` — endpoint/host/tool allowlist results, pricing rule id, pricing source, estimated cost + unit, and the local authorization decision.
- `mcp_metadata.local_budget_cap_status` — per-session, per-tool, STC, and USD cap state at execution time.
- `paid_execution_authorized` — `true` **only after an actual approved execution occurred**; otherwise `false`.
- `api_request_sent` — `true` **only if `fetch` occurred**.
- `auth_header_sent` — `true` **only if `X-API-Key` was sent**.
- `payment_header_sent` — **`false`** for subscription/API-key mode (always, in this scope).
- `api_data` — the API response payload, preserved verbatim.
- `mcp_metadata.response_metadata` — `request_id`, `pricing_rule`, `payment_required`, accepted methods, quota limit/period **when present** (§12); `observed_cost`, `payment_status` = `null` in subscription mode.
- `mcp_metadata.source` — `stocktrends_api`.
- `mcp_metadata.authoritative_for` — `"ST-IM API data returned by Stock Trends API"`.
- `mcp_metadata.not_authoritative_for` — `["investment advice", "payment authorization", "future performance guarantee"]`.
- `mcp_metadata.fetched_at` — ISO-8601 timestamp captured at response time.
- `mcp_metadata.warnings` / `mcp_metadata.limitations` — including, for latest, the point-in-time note recommending history for context (without auto-calling it).

Rules: preserve API-authored JSON; never rewrite output into advice or buy/sell/hold/allocation language; never make an MCP-authored summary the primary output; never hide provenance; never include secrets; never downgrade a paid error into a public-data summary.

## 14. Error taxonomy

Deterministic, fail-closed, secret-free. No error implies paid execution occurred unless it did.

| Condition | Deterministic error |
| --- | --- |
| Paid tools disabled | `paid_tools_disabled` |
| Paid execution disabled (gate off / env flag unset / dry-run) | `paid_execution_disabled` |
| API key missing (paid mode on) | `paid_auth_blocked_missing_api_key` |
| Invalid input (schema, symbol precedence, exchange membership, date format/order, limit bounds, unknown keys, arrays/multi-symbol) | `invalid_tool_input` (before any network) |
| Endpoint not allowlisted | `endpoint_not_allowlisted` |
| Tool not allowlisted / tool↔endpoint mismatch | `tool_endpoint_mismatch` |
| Host not approved | `host_not_approved` |
| Pricing policy missing | `pricing_preflight_unavailable` |
| Cost estimate unavailable (when required) | `cost_estimate_unavailable` |
| Cost cannot be determined | `cost_unavailable` |
| Unsupported unit/currency | `unsupported_cost_unit` |
| Cap exceeded (session/tool/STC/USD) | `spend_cap_exceeded` |
| Unexpected auth attempt (auth would be built for non-allowlisted endpoint/host or before preflight) | `unexpected_auth_attempt` (must be impossible by construction; test-enforced) |
| API request failed (network/timeout) | `public_api_network_failure` / `public_api_timeout` |
| API non-2xx response | mapped by status (below) |
| API returned `402` payment required | `public_api_payment_required` (surface safe metadata; no sign/pay/retry/x402) |
| Malformed API response | `malformed_api_response` |
| Response missing required metadata (only if a field is declared mandatory; none is today) | `paid_response_missing_required_metadata` |
| Paid execution denied (any gate denies) | `paid_execution_denied` (includes `paid_execution_disabled`) |
| Secret redaction failure (defensive) | fail closed; emit a redacted error, never the raw value |

Upstream HTTP status mapping preserves API semantics: `400` (API symbol/exchange/date errors incl. `invalid_symbol_exchange`, `missing_required_param`) → `invalid_upstream_request`; `401` → `public_api_auth_required` (no retry, no header switch, no downgrade); `402` → `public_api_payment_required`; `403` → `public_api_forbidden`; `404` → `public_api_not_found` (incl. `stim_not_found`); `429` → `public_api_rate_limited` (safe retry-after metadata; no automatic retry); `5xx` → `public_api_unexpected_status` (incl. `db_query_failed`; fail closed on charge ambiguity). No error may include API keys, tokens, auth/payment headers, wallet data, full request headers, environment dumps, or raw exception text containing secrets.

## 15. Test requirements for future implementation

All tests use mocks/local fixtures. No production paid calls, no real API keys, no x402/payment, no DB, no live validation in CI. Required coverage:

- Default tool count remains **1**; paid+key tool count remains **3**; prompt count remains **0**; public resources remain **9**.
- Public resources credential-free; cost-estimate planning tool credential-free.
- **API key alone** does not expose or execute paid tools.
- **Paid-tools flag without key** fails closed.
- **Execution flag without tools flag** fails closed.
- **Paid-tools flag + key without execution flag** fails closed (tools exposed, execution denied).
- **Paid-tools flag + key + execution flag (+ caps)** permits a **mock** fetch only after all §7 gates pass.
- Validation errors occur **before** preflight/fetch.
- **No auth constructed before gate success**; `unexpected_auth_attempt` is unreachable.
- `X-API-Key` sent **only** to the approved origin + allowlisted endpoint.
- **No `Authorization`/Bearer header; no payment header.**
- Latest query construction; history query construction; `symbol_exchange` precedence; **hyphen-form identity actually sent to the API** (§7.1); date/limit validation.
- Endpoint allowlist enforced; tool allowlist enforced; host allowlist enforced.
- Pricing policy missing blocks; cap exceeded blocks; cost-unavailable blocks.
- **No automatic retries** (exactly one attempt; no fallback endpoint; no auth-switch retry).
- API network failure deterministic; API non-2xx deterministic; **API `402` deterministic with no x402 fallback**; malformed response deterministic.
- Successful **mock** response produces the authorized wrapper with `paid_execution_authorized/api_request_sent/auth_header_sent = true`, `payment_header_sent = false`.
- Response metadata (`request_id`, pricing-rule header, payment-required header, quota headers) **preserved when present**; **missing optional metadata (observed cost, payment status) not fabricated** (`null`).
- Dry-run mode runs full preflight with no fetch/auth.
- Secret redaction covers key/token/auth-header/payment-header/wallet/env text in logs/errors/snapshots/returned data.
- No x402/wallet/OAuth/remote/DB/control-plane behavior; no dynamic registration.

## 16. Live validation policy

Options considered: (a) no live validation, mock-only tests; (b) manual local validation only after merge; (c) a separate explicitly authorized live-validation branch; (d) one controlled live call with a user-provided API key and cost cap.

**Recommendation (default safe posture):**

- The **implementation branch remains mock-only.** No live API call runs in automated tests or CI.
- **Live API validation requires separate, explicit user authorization after merge**, performed manually by the operator with their own key and explicit nonzero caps — never inside the automated test suite.
- **Never include live credentials in tests or repository files.** No `.env`, no fixtures with real keys, no recorded cassettes containing secrets.
- If a single controlled live call is later authorized (option d), it must use an operator-provided key, a small explicit per-session cap, dry-run first, and must be documented in a follow-up validation report — not committed as a test.

## 17. Implementation sequencing decision

Options:

- `implementation/phase4-paid-stim-live-execution-subscription` — enables the paired live subscription/API-key execution behind the two-gate policy. **Recommended.**
- `implementation/phase4-paid-stim-execution-gate` — would add only the gate plumbing without execution; redundant, since the gate and the fetch are small and coupled, and the foundation already exists.
- `architecture/phase4-paid-stim-response-metadata-confirmation` — unnecessary; this memo already confirmed the response-metadata contract directly against the API (§12).
- `implementation/phase4-paid-stim-latest-live-only` — rejected; violates history-beside-latest.

**Recommendation: `implementation/phase4-paid-stim-live-execution-subscription`.**

Exact scope if approved:

- **Subscription/API-key only**, `X-API-Key` only.
- **Latest and history together** (paired; never latest-only).
- **Mock-only tests**; no live validation inside automated tests.
- Flip the compile-time constant on; require the runtime `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` flag **plus** paid-tools flag + key + ≥1 nonzero cap.
- Resolve endpoint cost from static pricing policy (`stim_latest_paid` / `stim_history_paid`); real cap accounting; coupled `X-API-Key` construction only after full preflight; single fetch; authorized wrapper; §12 metadata handling (no fabrication).
- Reconcile the `symbol_exchange` separator (§7.1).
- **Update or explicitly reconfirm [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) before live execution is implemented/enabled** (see §17.1).
- **No x402, no Bearer fallback, no remote MCP, no wallet, no OAuth, no DB/control-plane, no dynamic registration, no prompts.** Public surface unchanged and credential-free.

### 17.1 SECURITY_MODEL.md reconfirmation (process precondition)

Consistent with the Phase 3 paid-tool process requirement ([`PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md`](PHASE3_PAID_TOOLS_AUTH_SPEND_DESIGN_MEMO.md) §16), before live paid ST-IM execution is implemented or enabled, [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md) **must be updated or explicitly reconfirmed** to cover at least:

- **Final paid-enablement flags** — the `STOCKTRENDS_ENABLE_PAID_TOOLS` (exposure) and the new `STOCKTRENDS_ENABLE_PAID_EXECUTION` (execution) split, plus the build-level constants (§6) and any dry-run flag.
- **Pricing/preflight contract** — the mandatory, non-skippable preflight (§7), its consistency with `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` (default `true`), and fail-closed behavior when pricing/preflight is unavailable.
- **Cap defaults** — per-session and per-tool call caps (default `0` = deny), STC/USD budget caps, the effectively-mandatory budget cap for nonzero ST-IM rules (§9), in-memory-only accounting, and reset-on-restart.
- **Live execution constraints** — `X-API-Key`-only auth to the approved origin + allowlisted endpoint, no automatic retries, no auth before all gates pass, no observed-cost fabrication (§12/§12.1), `402`/x402 deferral, and the mock-only test / post-merge live-validation posture (§16).

This memo does not itself edit `SECURITY_MODEL.md`; the reconfirmation is a required step of the implementation branch (or a preceding documentation step), not of this architecture branch.

## 18. Known limitations

- **x402 deferred**; wallet deferred; remote MCP deferred; OAuth deferred; Bearer fallback deferred.
- **Actual x402 `402` challenge-amount comparison deferred**; a `402` is surfaced as safe metadata only.
- **Endpoint-level vs workflow-level cost precision:** authorization relies on static endpoint pricing policy (catalog rule ids). `/v1/cost-estimate` is workflow-level and does not authorize endpoint-level execution; if catalog rule ids drift or are missing, the tools fail closed.
- **API response metadata varies by mode:** subscription mode returns pricing-rule/payment/quota headers and `request_id` but **no observed per-call cost** and **no payment settlement**; quota-remaining/reset are API-deferred. The wrapper must not fabricate absent fields.
- **Local caps are in-memory only** and reset on restart; no persistence unless a future branch explicitly designs durable accounting.
- **No investment advice**, no ST-IM recomputation, no buy/sell/hold/allocation conclusions.
- **No persistence** of any kind unless separately approved.

## 19. Decision

- **Live subscription/API-key ST-IM execution is APPROVED for the next implementation branch**, under the constraints below.
- **Gates and constraints:** two independent gates (compile-time constant flipped on **plus** a distinct runtime `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` flag), and execution additionally requires `STOCKTRENDS_ENABLE_PAID_TOOLS=true` + a configured `STOCKTRENDS_API_KEY` + at least one nonzero call cap. Full §7 preflight must pass before any auth header is constructed; a single fetch; no automatic retries; `X-API-Key` only, to the approved origin + allowlisted endpoint; static-pricing-policy cost + local caps as the authorization basis; §12 metadata handling with no fabrication; mock-only tests; live validation only under separate explicit authorization after merge.
- **Latest and history remain paired.** Latest-only live execution is not approved.
- **`docs/SECURITY_MODEL.md` must be updated or explicitly reconfirmed** (per Phase 3 §16) before live execution is implemented/enabled, covering the final paid-enablement flags, the pricing/preflight contract, cap defaults, and the live execution constraints (§17.1).
- **x402 remains deferred** (as do wallet, OAuth, remote MCP, Bearer fallback, database, and control-plane).

## 20. Recommended next branch

```text
implementation/phase4-paid-stim-live-execution-subscription
```

---

### Appendix A — ST-IM facts confirmed read-only against `C:\Users\skort\Projects\stocktrends_api` (2026-07-08)

Verified directly in this task (not only inherited):

- Routes: `GET /v1/stim/latest` (`routers/stim.py:95`) and `GET /v1/stim/history` (`routers/stim.py:186`), method `GET`.
- Symbol precedence: `symbol_exchange` resolved via `_resolve_symbol_exchange`; otherwise both `symbol` and `exchange` required.
- **`symbol_exchange` separator is a hyphen:** `parse_symbol_exchange` (`routers/signals.py:10`) expects `"IBM-N"` (`rsplit("-", 1)`); query descriptions say `e.g., IBM-N`; responses emit `symbol_exchange = f"{s}-{ex}"` (`routers/stim.py`). This differs from the merged MCP foundation's underscore canonical form — see §7.1.
- Exchange allowlist: `VALID_EXCHANGES = {"N","Q","A","B","T","I"}` (`routers/signals.py:8`).
- History params: `start`/`end` inclusive `YYYY-MM-DD`; `limit = Query(default=260, ge=1, le=2600)`; `include_gaps` boolean default `false` (`routers/stim.py:186-200`).
- History response envelope: `request_id`, `symbol_exchange`, `start`, `end`, `count`, `data`, `include_gaps`, `gaps`.
- Latest response: ST-IM distribution fields (`x4wk*`, `x13wk*`, `x40wk*`), `symbol_exchange`, `request_id`, `latest_data_weekdate`, `is_stale`, `missing_reason`, `missing_weekdate`.
- Pricing rules: `stim_latest_paid`, `stim_history_paid` (`payments/policy_provider.py:334-345`).
- **Response metadata (subscription mode):** `middleware/metering.py` sets response **headers** `X-StockTrends-Pricing-Rule`, `X-StockTrends-Payment-Required` (`false` for subscription), `X-StockTrends-Accepted-Payment-Methods`, and metered-subscription `X-StockTrends-Quota-Limit` / `X-StockTrends-Quota-Period: monthly`. Quota-remaining/reset and `PAYMENT-RESPONSE` settlement are **not** returned in subscription mode; **no observed per-call cost amount is returned**. `request_id` is in the response body.
- Auth: `X-API-Key` preferred, `Authorization: Bearer` fallback accepted by middleware; subscription/API-key access executes without x402 (inherited + consistent with `middleware/api_key.py`).
