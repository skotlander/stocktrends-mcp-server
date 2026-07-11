# Phase 5D Market-Context Implementation Notes (PR #51)

Implementation date: 2026-07-11

Status: **Mock-only implementation of the approved PR #51 market-context
subset.** This PR implements exactly the scope recommended by
[`PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md)
(PR #50) §5/§15 and adopts its §7 pricing mirrors, §8 promotions, §9
limit-safety design, §10 authority boundary, §11 SECURITY_MODEL/README
updates, and §12 test surface. **No live API call was made, no real API key
was used, requested, inspected, printed, logged, or stored, no MCP Inspector
session was run, and no paid validation was performed.** All validation is
mock-only (injected fetch). Controlled validation remains a separate,
separately authorized step (PR #52/#53), followed by a narrow signoff
(PR #54); nothing here claims production readiness.

## 1. Scope implemented

**Four paid tools** (registered in `src/tools/marketContextTools.ts`, exposed
only behind the existing gate: paid-tools flag + configured API key; execution
additionally gated exactly as for every prior family):

| Tool | Endpoint | Pricing rule / family | Cost |
| --- | --- | --- | --- |
| `stocktrends_get_market_regime_latest` | `GET /v1/market/regime/latest` | `market_regime_latest` / `market` | `0.15 STC` |
| `stocktrends_get_market_regime_history` | `GET /v1/market/regime/history` | `market_regime_history` / `market` | `0.25 STC` |
| `stocktrends_get_breadth_sector_latest` | `GET /v1/breadth/sector/latest` | `breadth_sector_latest_paid` / `breadth` | `0.1 STC` |
| `stocktrends_get_leadership_summary_latest` | `GET /v1/leadership/summary/latest` | `leadership_summary_latest_paid` / `leadership` | `0.25 STC` |

**One credential-free public resource:**
`stocktrends://leadership/definitions` backing
`GET /v1/leadership/definitions` (verified public/zero-cost in the design memo
§3), registered in `PUBLIC_RESOURCES` with the standard fetch-on-request
pattern. It never receives an `X-API-Key`, never uses the paid client path,
never joins the auth-capable allowlist, and is never mirrored as a paid STC
pricing rule.

**Surface after this PR:** default/free mode stays exactly **1 tool**
(`stocktrends_estimate_workflow_cost`); paid-exposed mode becomes exactly
**10 tools**; public resources become exactly **10** in every mode; MCP
prompts remain **0** in every mode; the execution flag changes behavior, never
tool count.

**Deferred (not implemented, not promoted, denied
`endpoint_not_allowlisted`):** `/v1/market/regime/forecast`,
`/v1/breadth/sector/history` (API default/max `200000`/`500000` — never
reachable through the MCP), `/v1/leadership/rotation/history`, every
decision/portfolio route, `selections/history`, `selections/published/*`, and
all Intelligence Agent artifact routes.

## 2. Files changed

- `src/tools/marketContextTools.ts` (new) — the four tools: strict zod
  schemas, coupled paid-execution path (structural gate → loop gate → pricing
  and cap preflight → family-scoped catalog reconciliation → auth header →
  single fetch), context-not-advice metadata, and the shared
  repeated-identical-call loop state.
- `src/paidPolicy.ts` — four new `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`
  promotions (regime latest with `requiredHistoryPair`, regime history with
  `supportsLongitudinalAnalysis`, breadth latest, leadership summary latest).
- `src/paidPricing.ts` — four static mirrors and the three family rule-id
  groups (`MARKET_PRICING_RULE_IDS`, `BREADTH_PRICING_RULE_IDS`,
  `LEADERSHIP_PRICING_RULE_IDS`); static policy version bumped to
  `2026-07-11`. The existing `reconcileStaticPricingWithCatalog` machinery is
  reused unchanged.
- `src/resources/index.ts` — the `stocktrends://leadership/definitions`
  public resource; `PROHIBITED_RESOURCE_ENDPOINTS` gains the two **paid**
  leadership routes (`/v1/leadership/summary/latest`,
  `/v1/leadership/rotation/history`) while `/v1/leadership/definitions` stays
  deliberately off the list.
- `src/server.ts` — registration wiring and startup log wording.
- `docs/SECURITY_MODEL.md` — new §17 (surface counts, promotions,
  family-scoped pricing, limit-safety table, authority boundary,
  prohibited-list correction, local-stdio scope).
- `README.md` — counts 6 → 10 / 9 → 10, the tenth public-resource row, the
  Conditional Paid Market-Context Tools section, and the extended
  environment-variable descriptions.
- Tests: new `tests/phase5d-market-context-tools.test.ts` (137 mock-only
  tests) plus count/list updates in the existing suites.
- **Not changed:** `package.json`, `package-lock.json`, `.env` (none exists),
  and no new dependency, prompt, dynamic registration, or remote-transport
  code.

## 3. Key behaviors (memo §9/§10 controls)

- **Limits always sent, never clamped:** regime history `limit` default `12`
  hard max `52`; breadth `limit` default `50` hard max `250` with
  `group_level` (default `sector`) always sent; leadership `limit_overall`
  default `50` hard max `200` and `limit_bucket` default `20` hard max `50`.
  Out-of-range/non-integer/array/sentinel values and unknown keys fail closed
  at the strict schema boundary before any pricing/auth/fetch.
- **No snapshot time-travel:** `weekdate` is not exposed on either latest
  tool; `vol_scale` and `type` are not exposed; all are rejected as unknown
  keys.
- **Single fetch, no sweeps:** exactly one `GET` per invocation; no
  pagination, `start_date` walking, date-range sweeping, exchange iteration,
  bulk assembly, background refresh, or automatic retry on `429`/`5xx`/`402`.
- **Repeated-identical-call posture (all four tools):** normalized signature
  (tool name + normalized effective params) reserved synchronously before the
  first `await`, so sequential **and concurrent** duplicates fail closed
  (`repeated_identical_market_context_call`) before pricing/auth/fetch/cap
  debit; pre-billable failures release the reservation; a billable attempt
  persists as executed for the session even on an API error; the
  zero-parameter regime-latest signature is constant, so a second executed
  call per session fails closed. In-memory only; resets on restart.
- **Authority boundary:** API payload verbatim in `api_data`; no local
  regime/breadth/leadership recomputation of any kind; context-not-advice
  framing in every description and `mcp_metadata` (regime = market context,
  not a trading recommendation; breadth = participation context, not a
  confirmation signal; leadership = rotation context, not picks);
  `effective_limits`, returned row count where derivable, `request_id`
  preserved where present, API-reported weekdate captured only when present;
  `observed_cost`/`payment_status` stay `null` and are never fabricated.
- **Auth:** `X-API-Key` only, built only after every gate passes, only for
  the four promoted routes; no Bearer, no payment header, no x402/wallet/
  OAuth, no raw API bypass, no remote MCP, no retry; the definitions
  resource, pricing catalog, planning tool, and all public resources stay
  credential-free.

## 4. Tests

`tests/phase5d-market-context-tools.test.ts` (137 tests, mock-only) covers:
surface counts (1/10 tools, 10 resources, 0 prompts, exposure matrix,
execution flag changes behavior not count); execution-disabled fail-closed
(no request/auth/cap debit/reconciliation) for all four tools; caps/budget
default-deny and covering-STC-budget requirements; per-family reconciliation
success and the full fail-closed matrix (missing/duplicate rule, endpoint and
rule-id mismatch, missing/wrong `endpoint_family`, missing/USD/conflicting
unit, cost mismatch, non-`paid` `access_type`, `requires_payment: false`,
catalog unavailable/malformed) plus family isolation from ST-IM, indicators,
selections, the other market-context families, deferred-route rules, and the
public definitions rule; auth boundary (key only to the promoted route, never
to catalog/definitions/public resources, no Bearer/payment headers, secret-free
wrappers, non-promoted routes denied via policy helpers); limit safety
(defaults sent, inclusive bounds, fail-closed invalid inputs,
`weekdate`/`vol_scale`/`type` rejection, exchange enum validation); single
fetch and no retry on 429/500/402; the repeated-identical-call posture
(sequential, concurrent, reservation release, executed persistence, constant
regime-latest signature, at most one key send and one cap debit); the
credential-free definitions resource (listing in every mode, fetch-on-request,
public headers only, data preserved, no catalog read, prohibited-list
correction); and authority metadata (verbatim `api_data`, provenance flags,
row counts, weekdate capture-if-present, no fabricated cost/status).

Existing suites were updated for the new counts (6 → 10 tools, 9 → 10
resources, 5 → 9 allowlisted routes); the full suite passes: **448 tests, 15
files** (`npm run typecheck`, `npm test`, `npm run build` all clean).

## 5. Validation path

Unchanged from the memo §13: PR #52 controlled validation plan (at most one
authorized live call per paid tool, worst case `0.75 STC`), PR #53 report if
separately authorized, PR #54 narrow signoff. No production-readiness claim is
made here.
