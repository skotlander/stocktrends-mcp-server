# Phase 5B Indicators and Instrument Resolver Implementation Notes

Implementation date: 2026-07-10

Status: **Mock-only implementation foundation.** This PR implements the internal
credential-free instrument resolver and the paired paid indicators tools defined
in
[`PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md`](PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md)
(PR 37) and unblocked by
[`PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md`](PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md)
(PR 38). It is **mock-only**: every test mocks HTTP; **no live API call, no paid
validation, and no MCP Inspector session were performed**, and **no real API key
or secret was used, requested, inspected, printed, logged, or stored**. This PR
does not modify `package.json` or `package-lock.json`.

## 1. What was implemented

- **Internal credential-free instrument resolver** (`src/instrumentResolver.ts`)
  — `resolveInstrumentIdentity(client, input)` resolves a caller identity to
  exactly one safe canonical `symbol_exchange` **before any paid boundary**. It
  is an internal helper only: it adds **no public MCP tool** and **no MCP
  resource**. Every call it makes is credential-free (Accept + User-Agent only;
  never `X-API-Key`, `Authorization`, or a payment header).
- **Credential-free discovery client method** (`src/stocktrendsClient.ts` →
  `fetchPublicDiscovery`) — a public, no-key GET that surfaces the resolver's
  expected `200`/`400`/`404`/`409` statuses with their JSON body (so ambiguity
  matches can be returned) while still throwing on redirect/timeout/network. It
  is distinct from `fetchPaid` and can never attach a credential.
- **Paired paid indicators tools** (`src/tools/indicatorsTools.ts`) —
  `stocktrends_get_indicators_latest` (`GET /v1/indicators/latest`) and
  `stocktrends_get_indicators_history` (`GET /v1/indicators/history`), registered
  **together** behind the identical exposure gate as the ST-IM pair
  (`STOCKTRENDS_ENABLE_PAID_TOOLS=true` + configured `STOCKTRENDS_API_KEY`). They
  reuse the proven Phase 4 gated-adapter (structural gate → pricing/cap preflight
  → catalog reconciliation → coupled auth+fetch), with a resolution stage
  inserted ahead of the paid boundary.
- **Family-specific static pricing mirror** (`src/paidPricing.ts`) —
  `indicators_latest_paid` `0.0035 STC` and `indicators_history_paid` `0.01 STC`,
  added alongside the ST-IM mirror. Reconciliation is now **family-scoped**:
  `reconcileStaticPricingWithCatalog(client, state, pricingRuleIds)` reconciles
  only the requested family's rules and caches success per rule-id group, so one
  family's catalog state never gates or satisfies another.
- **Mandatory catalog unit enforcement** (`src/paidPricing.ts`) — reconciliation
  normalizes the catalog unit from the actual catalog shape (`cost_unit` or the
  legacy `unit` field) and requires the verified `STC` unit. A missing unit, an
  unsupported unit (e.g. `USD`), or conflicting `cost_unit`/`unit` fields fail
  closed (`unsupported_unit`); a matching numeric cost is never accepted without a
  confirmed unit. This applies identically to ST-IM and indicators.
- **Auth-capable allowlist promotion** (`src/paidPolicy.ts`) — the two indicators
  routes are promoted into `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` so they are
  executable behind the same gates. The public instrument-discovery routes are
  deliberately never on this list.
- **Registration wiring** (`src/server.ts`) — `registerPaidIndicatorsTools` is
  wired with the shared in-memory usage tracker and per-server reconciliation
  state, and the operator startup warnings now name the indicators endpoints.

## 2. Resolver behavior (honors the §6.3 `prefer_exchange` caveat)

The contract-verification memo §6.3 found that `/v1/instruments/resolve` defaults
`prefer_exchange=N`, so a bare ambiguous symbol would let the API silently
auto-select the US listing. The resolver therefore:

- **Canonical `symbol_exchange`** (e.g. `IBM_N`) — trusted directly, **no
  discovery call**; validated and converted to the API hyphen form (`IBM-N`). A
  conflicting `symbol`/`exchange` fails closed (`identity_conflict`).
- **Explicit `symbol` + `exchange`** — verified via `GET /v1/instruments/resolve`
  with an **explicit `prefer_exchange` equal to the supplied exchange** (never the
  default `N`). A `409` fails closed with candidate matches; a `404` fails closed;
  a resolved instrument inconsistent with the request fails closed.
- **Bare raw `symbol`** — disambiguated via `GET /v1/instruments/lookup` using a
  **required, valid integer `count`**: it resolves only when `count === 1` **and**
  the body carries exactly one usable canonical match. A missing / non-integer /
  negative `count`, a `count` inconsistent with the returned rows (zero or
  multiple usable matches), `count > 1`, or no match all **fail closed** (`count
  > 1` returns the candidate `symbol_exchange` matches). The resolver **never
  substitutes the parsed row-count for a missing/invalid `count`**, and the
  bare-symbol path **never calls `/v1/instruments/resolve`** and **never sends any
  `prefer_exchange`**, so the default-`N` auto-pick can never occur.

In every non-success outcome the tool fails closed **before** any pricing
preflight, cap debit, auth-header construction, or paid fetch — an ambiguous or
unresolved symbol never triggers a paid call under any configuration.

## 3. Tool-count summary

- **Default/free mode remains exactly one tool**: `stocktrends_estimate_workflow_cost`.
- **Paid-exposed mode is now exactly five tools** (3 → 5): the planning tool, the
  paired paid ST-IM tools, and the paired paid indicators tools.
- **The instrument resolver adds no public tool** (PR 37 §8 option A,
  internal-only first), so the default/free count is unchanged.
- Execution-enabled paid mode changes **behavior, not tool count**.
- **Zero MCP prompts**; **no dynamic registration**; public resources remain
  credential-free in every mode.

## 4. Mock-only validation

All coverage is mocked HTTP via the in-memory MCP transport and a stubbed
`fetch`. New tests:

- `tests/phase5b-instrument-resolver.test.ts` — resolver unit/integration:
  canonical (no network) + conflicts; bare symbol lookup `count==1`/`count>1`/
  no-match/unavailable; explicit `symbol`+`exchange` via resolve with explicit
  `prefer_exchange`, `409` ambiguity, `404`, inconsistency; the bare-symbol path
  never calls resolve and never sends `prefer_exchange`; credential-free posture.
- `tests/phase5b-indicators-tools.test.ts` — end-to-end tool surface and
  execution: free = 1 tool; paid-exposed = 5; latest/history paired; exposure
  gated by flag + key; execution-disabled fail-closed with no request/auth;
  successful mocked latest/history each send exactly one `GET` with `X-API-Key`
  after all gates; static mirror `0.0035`/`0.01 STC` (not ST-IM); catalog
  mismatch/unavailable fail closed before auth/fetch; history `limit` `1..2600`;
  canonical `IBM_N` → API `IBM-N`; invalid exchange rejected before
  pricing/auth/fetch; bare-symbol lookup `count==1` resolves before paid gates;
  `count>1` fails closed with matches and no pricing/auth/fetch/cap debit;
  resolve `409` fails closed with matches and no paid request; no-match fails
  closed; no API key to discovery/catalog/public resources; no
  `Authorization: Bearer`/payment header/x402/retry; API key never in
  errors/denials/data; public resources and the planning tool stay
  credential-free; zero prompts.

Hardening coverage (added after review):

- Resolver malformed-`count` fail-closed: lookup body missing `count`, non-integer
  `count`, stringified `count`, negative `count`, and `count == 1` with zero or
  multiple usable matches all fail closed; a tool-level test proves a malformed
  lookup body triggers no catalog read, no cap debit, no auth header, and no paid
  fetch.
- Catalog unit enforcement (`tests/phase4-paid-stim-pricing-mirror-correction.test.ts`):
  indicators/ST-IM rows with `cost_unit: USD` (matching cost), missing unit, or
  conflicting `unit`/`cost_unit` fail closed; `cost_unit: STC` still reconciles;
  a tool-level indicators USD/missing-unit case fails closed before auth/fetch.
- Cross-family reconciliation isolation: a successful ST-IM reconciliation does
  not authorize indicators when indicators catalog rules are missing (and the
  reverse); a both-family catalog reconciles each group independently.

`docs/SECURITY_MODEL.md` §15 was updated to the PR 39 reality (paid-exposed = 5,
indicators promoted into the auth-capable allowlist, mandatory unit enforcement,
family-scoped reconciliation, and the internal credential-free resolver in a new
§15.8). Existing Phase 3/4 tests that encoded the pre-promotion boundary
(paid-exposed = 3, indicators non-auth-capable, global reconciliation signature)
were updated to the new five-tool / family-scoped reality; all other existing
tests are unchanged. Full suite: `npm run typecheck`, `npm test`, and `npm run
build` all pass; `git diff --check` is clean.

## 5. Explicitly out of scope / unchanged invariants

- **No public instrument tools** — `/v1/instruments/lookup` and
  `/v1/instruments/resolve` are used only by the internal resolver; option B
  (public discovery tools) remains a separate, unapproved decision.
- **No live paid validation** — deferred to a later, separately approved,
  operator-supervised step (mirrors the ST-IM live-validation policy).
- **No x402 / wallet / OAuth / `Authorization: Bearer` fallback / remote MCP /
  database / control-plane / investment advice** behavior anywhere.
- **No fabricated `observed_cost` / `payment_status`** — they remain `null`/absent
  unless the API returns them (subscription mode does not).
- **No automatic retries** — exactly one attempt per authorized call.
- **Static pricing alone never authorizes a call** — live-catalog reconciliation
  remains mandatory and fails closed on missing/ambiguous rule, cost mismatch,
  unsupported unit, or catalog unavailability.
