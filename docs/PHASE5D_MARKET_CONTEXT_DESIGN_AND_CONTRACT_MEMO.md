# Phase 5D Market-Context Layer Design and Contract Verification Memo

Design date: 2026-07-11

Status: **Design / contract verification memo only (PR #50). Documentation-only.**
This memo verifies the front-facing API contract for the Phase 5D market-context
layer selected by the roadmap memo
([`PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md`](PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md),
PR #49) — market regime, breadth, and leadership — and designs the tool/resource
shape, pricing mirrors, limits, caps, auth promotions, SECURITY_MODEL changes,
and test surface a **later, separately reviewed** implementation PR (#51) must
satisfy. It authorizes **no implementation**. No `src/` change, no `tests/`
change, no `package.json` / `package-lock.json` change, no MCP tool added, no MCP
resource added, no MCP prompt added, no auth-capable allowlist promotion, no paid
endpoint payload call, no paid validation, no MCP Inspector session, and no API
key used, requested, inspected, printed, logged, or stored is performed or
authorized by this memo. The only non-`docs/` change is one documentation-index
link in `README.md`, which changes no runtime behavior.

The public checks in §3 were performed **credential-free** (no `X-API-Key`, no
`Authorization`, no payment header) against the two already-documented public
metadata endpoints (`GET /v1/openapi.json`, `GET /v1/pricing/catalog`) plus one
credential-free readability check of the single route the catalog itself marks
public/zero-cost (`GET /v1/leadership/definitions`). No paid payload route was
called; no key was used; no usage or spend was created.

This memo does not claim production readiness for anything, and it does not
authorize implementation by itself. **Codex review is required before this memo
merges**, and PR #51 remains a separate, reviewed step after that.

This memo builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §5/§7/§8 (paid-call safety,
  runaway-loop and broad-sweep controls, rate/spend control), §15 (paid ST-IM and
  indicators live execution), §15.7 (the narrowed credential-bearing allowlist),
  §15.8 (the internal credential-free resolver), and §16 (paid
  `selections/latest` live execution and list-shaped limit safety).
- [`PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md`](PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md)
  — the PR #49 selection of the market-context layer and the §9 contract
  verification requirements this memo discharges.
- [`PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md)
  and the completed Phase 5C evidence chain (PRs #43–#48) — the proven
  design → mock-only implementation → plan → report → signoff cadence and the
  list-shaped limit-safety pattern this layer reuses.
- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) and
  [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
  — the read-only capability audit and the Phase 4 contract baseline.
- [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  and
  [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the proven signoff pattern and operator preconditions.

## 0. Decision (read first)

**The market-context contract facts are verified credential-free, and the
recommended PR #51 implementation subset is: Option 1 plus
`/v1/market/regime/history`** — equivalently, **Option 2 minus
`/v1/leadership/rotation/history`**:

- **Implement now (PR #51):** `market/regime/latest`, `market/regime/history`,
  `breadth/sector/latest`, `leadership/summary/latest` as four new paid tools,
  plus `leadership/definitions` as one new credential-free public resource
  (its public/zero-cost status is now **verified by a credential-free `200`
  read**, §3).
- **Defer:** `market/regime/forecast` (forward-looking/advice-adjacent framing
  deserves its own subphase), `breadth/sector/history` (API default/max
  `200000`/`500000` — the largest broad-sweep surface observed anywhere), and
  `leadership/rotation/history` (**no `limit` parameter exists at all**, `top_k`
  is nullable with omit-means-all semantics, and the default date window is not
  determinable credential-free).

Rationale summary: regime history is the one history route whose sweep surface
the API itself already bounds tightly (`limit` 1–52, default 12 — smaller than a
single bounded selections call), so pairing it with regime latest preserves the
history-beside-latest doctrine at negligible marginal risk. The three deferred
routes each carry a verified, qualitatively larger risk that the proven
limit-safety machinery does not yet cover. §5 and §6 give the full justification.

No implementation is authorized by this memo; PR #51 remains a separate,
Codex-reviewed step that must adopt §7–§12 of this memo.

## 1. Status

- **PR #49 selected market regime + breadth + leadership** as the Phase 5D
  market-context design/contract target, deferring decision/evaluate-symbol
  (Phase 5E), portfolio evaluate/compare/construct (5F/5G), Intelligence Agent
  artifacts (until stable), and remote MCP / x402 / wallet / OAuth (separate
  architecture track).
- **This memo is design/contract only.** It verifies the eight candidate route
  contracts from public metadata, resolves the PR #49 §4.0 anomalies, and decides
  the recommended PR #51 subset.
- **No implementation is authorized.** No code, tool, resource, prompt,
  allowlist promotion, or runtime change is made or authorized here.
- **No paid validation was performed.** No paid payload route was called, no API
  key was used, no spend was created, and no MCP Inspector session was run.
- **No source/runtime changes.** The only repository changes are this document
  and one README documentation-index link.

## 2. Current MCP baseline

Confirmed from the merged Phase 5C evidence chain and re-confirmed against the
current source (`src/server.ts`, `src/paidPolicy.ts`, `src/paidPricing.ts`,
`src/tools/`, `src/resources/index.ts`) at HEAD `2c314c1`:

- **Default/free mode exposes exactly one tool:**
  `stocktrends_estimate_workflow_cost` (credential-free workflow planning).
- **Paid-exposed mode exposes exactly six tools:** the planning tool, the paired
  paid ST-IM tools (`stocktrends_get_stim_latest`, `stocktrends_get_stim_history`),
  the paired paid indicators tools (`stocktrends_get_indicators_latest`,
  `stocktrends_get_indicators_history`), and the base selections tool
  (`stocktrends_get_selections_latest`).
- **Zero MCP prompts** in every mode.
- **Nine credential-free public resources** in every mode
  (`stocktrends://api/openapi`, `ai/context`, `ai/tools`, `workflows`,
  `methodology/stim`, `methodology/indicators`, `methodology/inference`,
  `pricing/catalog`, `proof/market-edge`).
- **The auth-capable allowlist is exactly five routes**
  (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`, `src/paidPolicy.ts`):
  `/v1/stim/latest`, `/v1/stim/history`, `/v1/indicators/latest`,
  `/v1/indicators/history`, `/v1/selections/latest`. Every other route — all
  eight market-context candidates included — is denied
  `endpoint_not_allowlisted` before any auth header or fetch.
- **No market-context tool or resource exists yet.** No tool in `src/tools/`
  wraps any regime/breadth/leadership route and no resource is registered for
  them.
- **One baseline correction to PR #49 §2:** the roadmap stated that all
  candidate families appear on the server's prohibited-resource-endpoint list.
  Verified against `src/resources/index.ts`: the three market-regime routes and
  both breadth routes **do** appear in `PROHIBITED_RESOURCE_ENDPOINTS`, but the
  three **leadership routes do not** (the string `leadership` appears nowhere in
  `src/` or `tests/`). This has no runtime effect today — the list is a
  test-time guard asserting no public resource wraps those endpoints, leadership
  routes are equally unwrapped, and the auth-capable allowlist independently
  denies them — but PR #51 must close the gap (§11): add the two **paid**
  leadership routes to `PROHIBITED_RESOURCE_ENDPOINTS`, and deliberately keep
  `/v1/leadership/definitions` off it (it becomes a verified public resource).
- The Phase 5C signoff scope is unchanged: **controlled local stdio operator use
  only**; `selections/history` and `selections/published/*` remain deferred and
  denied.

## 3. Credential-free verification performed (2026-07-11)

Exactly three endpoints were read, all credential-free (request headers were
`Accept: application/json` and a `User-Agent` only — no `X-API-Key`, no
`Authorization`, no payment header). **No paid payload route was called, no API
key was used, requested, inspected, printed, logged, or stored, and no usage or
spend was created.**

| # | Check | Endpoint | Kind | Result |
| --- | --- | --- | --- | --- |
| 1 | OpenAPI contract | `GET /v1/openapi.json` | Metadata existence/contract check | `200 application/json`, `openapi: 3.1.0`, `info.version 1.0.0`, single server `url: /v1`, 61 paths. All eight candidate routes present, all `GET`-only. |
| 2 | Pricing catalog | `GET /v1/pricing/catalog` | Metadata existence/contract check | `200 application/json`, `planning_role` catalog, `count`/`rules` with 40 rules; rule fields observed: `pricing_rule_id`, `endpoint_pattern`, `endpoint_family`, `api_version`, `access_type`, `cost_per_request`, `stc_cost`, `estimated_usd_cost`, `cost_unit`, `requires_subscription`, `requires_payment`, `supported_rails`, `pricing_note`. Exactly one rule per candidate endpoint (no duplicates, no conflicting rule ids). |
| 3 | Leadership definitions readability | `GET /v1/leadership/definitions` | Credential-free availability/readability check of the one catalog-confirmed public/zero-cost candidate | `200 application/json`, credential-free. Small static definitions document; top-level shape only recorded: `concept` (string), `indicators` (object of 5 keys: `rsi`, `trend`, `trend_cnt`, `mt_cnt`, `rsi_updn`), `taxonomy_source` (string), `taxonomy_levels` (array of 3), `notes` (object of 3 keys). No payload is reproduced or stored beyond this shape summary. |

Distinctions and disclosures:

- **Checks 1–2 are metadata existence/contract checks, not payload validation.**
  They verify routes, parameters, security declarations, and pricing rules; they
  do not validate response payload behavior for any paid route.
- **Check 3 is the only payload read**, and it was performed only after checks
  1–2 confirmed the catalog marks `/v1/leadership/definitions`
  `access_type: public`, `requires_payment: false`, `stc_cost: 0` — i.e. it is a
  zero-cost/public candidate. The `200` credential-free result **resolves the
  PR #49 §4.0 catalog-vs-OpenAPI-security ambiguity empirically**: the OpenAPI
  security block still advertises `ApiKeyAuth`/`BearerAuth` on the route, but it
  is publicly readable without any credential, the same
  advertised-security-but-public pattern as the existing verified public
  surfaces.
- **Procedural note:** one preliminary request was mistakenly issued to the
  unprefixed path `/leadership/definitions` (missing the `/v1` server prefix)
  and returned the API's structured `404 application/json` helper document
  (fields `detail`, `requested_path`, `start_here`, `secondary`, `docs`,
  `openapi`). It hit no data route, used no credential, and created no spend;
  the check was repeated at the correct `/v1/leadership/definitions` path,
  producing the `200` above.
- **No live paid payload calls** were made to any of the seven paid candidate
  routes (`/v1/market/regime/latest|history|forecast`,
  `/v1/breadth/sector/latest|history`, `/v1/leadership/summary/latest`,
  `/v1/leadership/rotation/history`). Their payload behavior remains unverified
  until a separately authorized controlled validation (PR #52/#53).
- **No MCP Inspector session** was run and no `npm` build/test/typecheck was
  required for this docs-only PR.

## 4. Route-by-route contract verification (all eight candidates)

### 4.0 Identity, auth, and pricing facts (verified)

All eight routes: method **`GET`** (no `POST`, no request body — the §15.5
`GET`-only paid posture is preserved by every candidate), OpenAPI security block
`[{ApiKeyAuth}, {BearerAuth}]` (the MCP sends **`X-API-Key` only**, never
Bearer), and `200` response schema `{}` — **unconstrained JSON** with no
response model, so the adapter must preserve `api_data` verbatim exactly as for
ST-IM/indicators/selections. Routes with query parameters also declare the
standard `422 HTTPValidationError`. All routes except `leadership/definitions`
declare the shared optional agent/payment header parameters
(`X-StockTrends-Agent-*`, `X-StockTrends-Request-Purpose`,
`X-StockTrends-Session-Id`, `X-StockTrends-Payment-*`); the MCP sends **none**
of the payment headers and treats the agent headers as out of scope, exactly as
in Phase 5C. `leadership/definitions` declares **no parameters at all**.

Pricing catalog facts (verified 2026-07-11; exactly one rule per endpoint):

| Route | OpenAPI `operationId` / summary | Pricing rule id | `endpoint_family` | `access_type` | `requires_payment` | `requires_subscription` | `stc_cost` | `cost_unit` | `supported_rails` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `GET /v1/market/regime/latest` | `market_regime_latest_market_regime_latest_get` — "Current market regime classification" | `market_regime_latest` | `market` | `paid` | `true` | `false` | `0.15` | `STC` | subscription, x402, mpp |
| `GET /v1/market/regime/history` | `market_regime_history_market_regime_history_get` — "Historical weekly market regime classification" | `market_regime_history` | `market` | `paid` | `true` | `false` | `0.25` | `STC` | subscription, x402, mpp |
| `GET /v1/market/regime/forecast` | `market_regime_forecast_market_regime_forecast_get` — "Forward-looking market regime forecast" | `market_regime_forecast` | `market` | `paid` | `true` | `false` | `0.35` | `STC` | subscription, x402, mpp |
| `GET /v1/breadth/sector/latest` | `breadth_sector_latest_breadth_sector_latest_get` — "Breadth Sector Latest" | `breadth_sector_latest_paid` | `breadth` | `paid` | `true` | `false` | `0.1` | `STC` | subscription, x402, mpp |
| `GET /v1/breadth/sector/history` | `breadth_sector_history_breadth_sector_history_get` — "Breadth Sector History" | `breadth_sector_history_paid` | `breadth` | `paid` | `true` | `false` | `0.3` | `STC` | subscription, x402, mpp |
| `GET /v1/leadership/definitions` | `leadership_definitions_leadership_definitions_get` — "Leadership Definitions" | `leadership_definitions_public` | `planning` | `public` | `false` | `false` | `0.0` | `request` | (empty) |
| `GET /v1/leadership/summary/latest` | `leadership_summary_latest_leadership_summary_latest_get` — "Leadership Summary Latest" | `leadership_summary_latest_paid` | `leadership` | `paid` | `true` | `false` | `0.25` | `STC` | subscription, x402, mpp |
| `GET /v1/leadership/rotation/history` | `leadership_rotation_history_leadership_rotation_history_get` — "Leadership Rotation History" | `leadership_rotation_history_paid` | `leadership` | `paid` | `true` | `false` | `0.3` | `STC` | subscription, x402, mpp |

On every paid rule, `cost_per_request` and `estimated_usd_cost` numerically
equal `stc_cost`; the budgeting unit remains **STC** (`cost_unit: STC`), so — as
for every prior family — a covering `STOCKTRENDS_MAX_STC_PER_SESSION` is
effectively mandatory and no USD cost applies.

**PR #49 §4.0 anomalies, now resolved:**

1. **Market-regime rule ids drop the `_paid` suffix** (`market_regime_latest`,
   `market_regime_history`, `market_regime_forecast`) and use
   `endpoint_family: market` (not `market_regime`). Confirmed. Mirrors are keyed
   by exact rule id and family string, so this is a documentation fact, not an
   implementation obstacle — the PR #51 mirrors must use these exact strings.
2. **`leadership_definitions_public` is genuinely public.** Catalog:
   `access_type public`, `requires_payment false`, zero cost, `cost_unit:
   request`, empty rails, `endpoint_family: planning`. The credential-free `200`
   read (§3) resolves the OpenAPI-security ambiguity in favor of public
   readability. Its `request` cost unit also means it could never reconcile as a
   paid STC mirror — one more structural reason it must be a **public resource,
   never a paid tool** (§4.F).
3. **All eight routes are `GET`** — confirmed; no body-bearing route enters the
   MCP surface in Phase 5D.

### 4.A `/v1/market/regime/latest` — include in PR #51 (paid tool)

- **Parameters (verified):** none beyond the shared optional headers. This is a
  **snapshot-shaped** route — no `limit`, no filters — the smallest paid surface
  the MCP would ever have wrapped.
- **Include in PR #51? Yes.** Proposed tool name:
  **`stocktrends_get_market_regime_latest`**. Paid (`market_regime_latest`,
  `0.15 STC`, family `market`); pricing mirror per §7; allowlist promotion per
  §8.
- **Limits:** none needed (no list shape, no `limit` parameter exists). The MCP
  input schema is an empty strict object (unknown keys rejected). Call caps,
  covering STC budget, and the repeated-identical-call posture (§9) still apply.
- **Metadata requirements:** `mcp_metadata` carries provenance (source endpoint,
  tool name, pricing rule, effective parameters), captures
  weekdate/staleness/`request_id` fields **only if present** in the API payload,
  and states the advice boundary: **the regime classification is API-authored
  market context, not a trading recommendation** — no buy/sell/hold/allocation
  output.
- **No MCP-side regime computation, ever:** no local regime calculation,
  smoothing, reclassification, or reinterpretation; `api_data` verbatim.

### 4.B `/v1/market/regime/history` — include in PR #51 (paid tool)

- **Parameters (verified):** `limit` integer, **default `12`, min `1`, max
  `52`** ("Number of weekly periods to return"); `start_date` optional
  `YYYY-MM-DD` date ("Optional earliest weekdate to include"). No `end`
  parameter exists; none is invented.
- **Include in PR #51? Yes — this is the deliberate addition beyond Option 1.**
  Proposed tool name: **`stocktrends_get_market_regime_history`** (registered
  beside the latest tool, preserving the history-beside-latest doctrine for this
  family). Justification from verified facts: the API itself already caps the
  route at **52 weekly rows** — a full-max call returns about one year of weekly
  regime labels, smaller than a single bounded selections call — so the
  broad-sweep surface is inherently tiny, unlike every deferred history route.
  Cost `0.25 STC` (`market_regime_history`, family `market`) shares the market
  family mirror that regime latest already requires.
- **Safe MCP limits (§9):** MCP default `limit = 12` (mirroring the API
  default), **hard max `52`** (equal to the API max — acceptable here precisely
  because the API max is already small), **always sent explicitly** so the API
  default can never silently apply and API default drift cannot change MCP
  behavior. Out-of-range/non-integer/array/sentinel limits fail closed at the
  strict schema boundary before any pricing/auth/fetch. `start_date` is a
  validated optional passthrough refinement (it can only narrow the window).
- **No pagination loop, no bulk assembly, no `start_date` walking:** exactly one
  `GET` per invocation; the series is never assembled from multiple calls.

### 4.C `/v1/market/regime/forecast` — defer (later Phase 5D subphase)

- **Parameters (verified):** `lookback` integer, **default `5`, min `2`, max
  `13`** ("Number of recent weeks to analyze") — a backward analysis window
  feeding a forward-looking output.
- **Include in PR #51? No — defer.** The quantitative risk is *not* the issue
  (the parameter surface is tiny and bounded). The verified OpenAPI summary is
  literally **"Forward-looking market regime forecast"**: this is the most
  advice-adjacent route in the layer and the costliest market rule
  (`market_regime_forecast`, `0.35 STC`). Framing **can** plausibly be made safe
  — the API authors the forecast; the MCP would forward it verbatim as
  **API-authored forward-looking regime context, not a prediction, signal, or
  advice produced by the MCP** — but that framing, its tool description, and its
  validation assertions deserve a dedicated short design pass rather than riding
  along in the first descriptive increment.
- **Disposition:** defer to a **later Phase 5D subphase** with its own brief
  design memo (framing + description + tests), after the descriptive
  latest/history layer is implemented and signed off. Reserved tool name:
  `stocktrends_get_market_regime_forecast`. Until promoted it remains denied
  `endpoint_not_allowlisted`.

### 4.D `/v1/breadth/sector/latest` — include in PR #51 (paid tool)

- **Parameters (verified):** `group_level` string enum
  `sector | industry_group | industry`, default `sector`; `exchange` optional
  string ("N,Q,A,B,T,I; if omitted: all exchanges"); `weekdate` optional
  `YYYY-MM-DD` override ("default latest"); `cs_only` boolean default `true`;
  `include_unknown` boolean default `false`; `min_price` optional number;
  `min_volume` optional integer; `vol_scale` integer default `100` (**no
  declared bounds**; described as a legacy scaling multiplier); `limit` integer
  **default `5000`, min `1`, max `50000`** ("Safety limit on number of groups
  returned").
- **Include in PR #51? Yes.** Proposed tool name:
  **`stocktrends_get_breadth_sector_latest`**. Paid
  (`breadth_sector_latest_paid`, `0.1 STC`, family `breadth`); fresh
  breadth-family mirror per §7; allowlist promotion per §8. Shipped **without**
  its history sibling — the list-family precedent set by selections (§4.E is the
  deferral).
- **Safe MCP limits (§9):** MCP default `limit = 50`, **hard max `250`** (0.5%
  of the API's `50000` max; the numbers proven by the selections family). The
  API's `5000` default can never apply because the MCP **always sends** an
  explicit limit. A sector-level snapshot is a small taxonomy table; the
  `industry` grouping can exceed the MCP cap, in which case truncation is made
  visible via row-count metadata rather than raised caps.
- **Input policy:** `group_level` (enum-validated), `exchange` (one of
  `N,Q,A,B,T,I`), `cs_only` (default `true`), `include_unknown` (default
  `false`), `min_price`/`min_volume` (non-negative, validated) are passed
  through to the API only — never applied locally. Two verified parameters are
  deliberately **not exposed** in PR #51: **`weekdate`** (a latest tool must not
  offer per-week snapshot time-travel — stepping `weekdate` across weeks would
  reconstruct history at the latest price, bypassing the deferred, more
  expensive history route; §9) and **`vol_scale`** (an unbounded legacy
  multiplier with no contract bounds; the API default `100` applies).
- **Returned row count metadata:** `mcp_metadata` records the `effective_limit`
  sent and the returned row/group count when derivable, as in §16.3.
- **No MCP-side breadth calculation:** no re-aggregation, re-grouping,
  participation math, or percentage recomputation; rows verbatim in `api_data`.

### 4.E `/v1/breadth/sector/history` — defer (separate subphase or Phase 5E+, own design memo)

- **Parameters (verified):** `group_level` (same enum, default `sector`);
  `exchange` optional; `start`/`end` optional inclusive `YYYY-MM-DD` dates;
  `group_by_week` boolean default `true`; `cs_only` default `true`;
  `include_unknown` default `false`; `min_price`/`min_volume` optional;
  `vol_scale` default `100`; `limit` integer **default `200000`, min `1`, max
  `500000`** ("Safety limit across all rows returned").
- **Include in PR #51? No — defer, as PR #49 anticipated.** The verified
  default/max confirm the roadmap's observation: this is a broad-sweep surface
  **orders of magnitude beyond anything the MCP has ever exposed** (the API
  *default* alone is 800× the MCP's largest ever hard cap). An unbounded date
  range multiplied by group × week rows is exactly the §7/§8 sweep risk.
- **Safe MCP strategy if a future increment includes it** (recorded now so it is
  designed, not inherited): **always-send `limit`** with a **small default
  (≤ `100`)** and a **hard max ≤ `500`** (≤0.1% of the API max); a **mandatory
  bounded date window** (`start` and `end` both required, maximum span enforced
  MCP-side, e.g. ≤26 weeks); `group_by_week` fixed `true`; no `weekdate`/date
  stepping, **no pagination, no date-range sweeping, no exchange iteration, no
  bulk assembly**; the API's `200000` default must never be reachable through
  the MCP under any input.
- **Disposition:** deferred to a **separate design memo + subphase** (later
  Phase 5D subphase at the earliest, Phase 5E+ acceptable) once
  `breadth/sector/latest` limit-safety is implemented and validated. Reserved
  tool name: `stocktrends_get_breadth_sector_history`. Denied
  `endpoint_not_allowlisted` until then.

### 4.F `/v1/leadership/definitions` — include in PR #51 (public resource, not a tool)

- **Verified status:** the public-vs-auth ambiguity is **resolved
  credential-free** (§3): catalog `access_type: public`, `requires_payment:
  false`, `stc_cost 0.0`, `cost_unit: request`, empty rails; live
  credential-free `GET` returned `200 application/json` with a small static
  definitions document (concept, indicator definitions, taxonomy, notes). The
  OpenAPI security block advertising `ApiKeyAuth`/`BearerAuth` does not gate it
  in practice — the same advertised-but-public pattern as existing public
  surfaces.
- **Include in PR #51? Yes — as a credential-free public MCP resource**, not a
  tool. Proposed resource URI: **`stocktrends://leadership/definitions`**
  (name `stocktrends_leadership_definitions`), backing
  `GET /v1/leadership/definitions`, registered in `PUBLIC_RESOURCES` with the
  standard **fetch-on-request** pattern — the first public resource added since
  Phase 2, and the natural interpretive companion to the leadership summary tool
  (it defines `rsi`, `trend`, `trend_cnt`, `mt_cnt`, `rsi_updn`, and the
  taxonomy the summary buckets by).
- **Counts:** this changes the **public resource count from 9 to 10 in every
  mode** and changes **no tool count** in any mode.
- **Credential rules:** the resource is **credential-free forever** — it can
  never receive an `X-API-Key` (it is not on, and must never join, the
  auth-capable allowlist), exactly like the pricing catalog and the resolver
  routes. PR #51 must keep `/v1/leadership/definitions` **off**
  `PROHIBITED_RESOURCE_ENDPOINTS` while adding the two paid leadership routes to
  it (§2, §11). If the route's public readability regresses before PR #51
  merges (e.g. it starts returning `401`/`403`/`5xx` credential-free), PR #51
  must drop the resource and record the exclusion exactly as the intelligence
  candidates were excluded — it must remain credential-free-only in every
  outcome.

### 4.G `/v1/leadership/summary/latest` — include in PR #51 (paid tool)

- **Parameters (verified):** `exchange` optional string (`N,Q,A,B,T,I`);
  `weekdate` optional `YYYY-MM-DD` override ("default latest for
  exchange/type"); `type` string default `CS` (**no enum declared**); `min_rsi`
  integer default `110`, min `0`, max `500`; `min_mt_cnt` integer default `4`,
  min `0`, max `500`; `limit_overall` integer **default `50`, min `1`, max
  `1000`**; `limit_bucket` integer **default `20`, min `1`, max `200`**.
- **Include in PR #51? Yes.** Proposed tool name:
  **`stocktrends_get_leadership_summary_latest`**. Paid
  (`leadership_summary_latest_paid`, `0.25 STC`, family `leadership`); fresh
  leadership-family mirror per §7; allowlist promotion per §8.
- **Safe MCP limits (§9):** both limits **always sent**: `limit_overall`
  default `50` (API default), **hard max `200`** (20% of the API max);
  `limit_bucket` default `20` (API default), **hard max `50`** (25% of the API
  max). Out-of-range/non-integer/array/sentinel values fail closed at the strict
  schema boundary before pricing/auth/fetch — never silently clamped.
- **Input policy:** `exchange` (enum-validated), `min_rsi`, `min_mt_cnt`
  (integer, `0`–`500`, sent only when supplied so the API defaults `110`/`4`
  apply otherwise) are passed through to the API only — **never applied locally
  as a second filtering pass**. Deliberately **not exposed** in PR #51:
  **`weekdate`** (same no-snapshot-time-travel rule as §4.D) and **`type`** (no
  verified enum exists; the API default `CS` applies — exposing an unvalidated
  free-string instrument-type filter is not worth the surface).
- **No MCP-side ranking, re-scoring, or re-bucketing:** leadership tables are
  API-ranked and API-bucketed; the MCP never reorders, rescores, rebuckets,
  applies thresholds locally, or merges buckets; rows verbatim in `api_data`
  with row-count/limit metadata per §9.

### 4.H `/v1/leadership/rotation/history` — defer (later Phase 5D subphase, own design pass)

- **Parameters (verified):** `exchange` optional; `start`/`end` optional
  inclusive dates; `type` string default `CS`; **`top_k` integer min `1` max
  `50`, default `5`, nullable — "Top K sectors per week (omit for all)"**;
  `min_constituents` integer default `25`, min `1`, max `5000`; `group_by_week`
  boolean default `true`. **No `limit` parameter exists on this route.**
- **Include in PR #51? No — defer.** Three verified contract facts make this
  the wrong route to include in the first increment:
  1. **It has no row-cap parameter at all** — the first history surface the MCP
     has evaluated whose row count is bounded only by `top_k × weeks-in-range`.
     The proven limit-safety machinery is limit-parameter-shaped; bounding by
     date-window arithmetic is a **new control** that must be designed and
     tested on its own.
  2. **`top_k` is nullable with omit-means-all semantics** — an "all sectors per
     week" mode reachable by omission, the exact sentinel/sweep pattern §16.3
     exists to forbid.
  3. **The default date window is not determinable credential-free** — the
     OpenAPI declares `start`/`end` optional with no defaults, so an
     omitted-range call could span the full archive; verifying actual behavior
     would require a paid payload call this memo is not authorized to make.
- **Safe MCP strategy if a future increment includes it** (recorded now):
  **`top_k` always sent** (never omitted, never null; proposed default `5`,
  hard max `10`); **`start` and `end` both required** with an MCP-enforced
  maximum span (e.g. ≤26 weeks); `group_by_week` fixed `true`;
  `min_constituents` validated passthrough; **no pagination, no bulk, no
  exchange or window iteration; no local leadership ranking or recalculation**.
- **Disposition:** defer to a **later Phase 5D subphase** with its own design
  pass, after `leadership/summary/latest` is implemented and validated. Reserved
  tool name: `stocktrends_get_leadership_rotation_history`. Denied
  `endpoint_not_allowlisted` until then.

## 5. Recommended PR #51 implementation scope

**Recommended scope: Option 1 plus `/v1/market/regime/history` — equivalently,
Option 2 minus `/v1/leadership/rotation/history`.**

Why not plain Option 1: regime history is the one history route the API itself
already bounds to a trivial surface (`limit` 1–52, default 12 — at most ~one
year of weekly regime labels; a full-max response is smaller than one bounded
selections call). Pairing history beside latest is the repo's own doctrine for
exactly this situation (the audit's latest-only-misinterpretation risk: regime
*transitions* are the longitudinal value), and it costs no new pricing family —
`market_regime_history` shares the market mirror regime latest already needs.

Why not full Option 2: `/v1/leadership/rotation/history` fails contract-fact
safety in three independent ways (§4.H — no `limit` parameter, nullable
omit-means-all `top_k`, undeterminable default window). Including it would
require inventing and validating a new date-window bounding control inside the
same increment that introduces three new pricing families. It is deferred, not
rejected.

Why not Option 3: `breadth/sector/history` (§4.E) and `regime/forecast` (§4.C)
carry, respectively, the largest verified sweep surface ever observed
(`200000`/`500000`) and the highest advice-adjacency in the layer. Both are
exactly the routes the roadmap flagged for deferral, and nothing in the verified
contract facts argues otherwise.

**Exact proposed names (proposed only — nothing is registered by this memo):**

| Proposed MCP surface | Backing endpoint | Kind | Pricing rule / cost |
| --- | --- | --- | --- |
| `stocktrends_get_market_regime_latest` | `GET /v1/market/regime/latest` | Paid tool | `market_regime_latest` / `0.15 STC` |
| `stocktrends_get_market_regime_history` | `GET /v1/market/regime/history` | Paid tool | `market_regime_history` / `0.25 STC` |
| `stocktrends_get_breadth_sector_latest` | `GET /v1/breadth/sector/latest` | Paid tool | `breadth_sector_latest_paid` / `0.1 STC` |
| `stocktrends_get_leadership_summary_latest` | `GET /v1/leadership/summary/latest` | Paid tool | `leadership_summary_latest_paid` / `0.25 STC` |
| `stocktrends://leadership/definitions` | `GET /v1/leadership/definitions` | **Public resource** (credential-free) | `leadership_definitions_public` / zero cost — never keyed, never a paid mirror |

Reserved names for deferred routes (not proposed for implementation now):
`stocktrends_get_market_regime_forecast`, `stocktrends_get_breadth_sector_history`,
`stocktrends_get_leadership_rotation_history`.

**Exact before/after counts if PR #51 implements this scope:**

| Surface | Before (today) | After PR #51 |
| --- | --- | --- |
| Default/free mode tools | **1** (`stocktrends_estimate_workflow_cost`) | **1** (unchanged — no market-context tool is ever visible in free mode) |
| Paid-exposed mode tools | **6** | **10** (adds the four paid market-context tools behind the existing exposure gate: paid-tools flag + configured API key) |
| MCP prompts | **0** | **0** (every mode) |
| Credential-free public resources (every mode) | **9** | **10** (adds `stocktrends://leadership/definitions`) |
| Auth-capable allowlist routes | **5** | **9** (§8 — the four paid routes above; definitions is never on it) |

Four paid tools in one increment is the largest single addition yet; it is
acceptable because all four are `GET`-only, latest/bounded-history shaped,
reuse the three-times-proven gate machinery unchanged, and introduce no new
control *kind* except three new family mirrors — but PR #51 must implement the
full §12 test surface per family, and the controlled validation (PR #52/#53)
must bound live probing to at most one authorized call per paid tool (worst-case
`0.75 STC` if all four are probed once; the plan may authorize fewer).

## 6. Deferred routes and reasons

| Route | Deferred to | Reason (verified facts) |
| --- | --- | --- |
| `/v1/breadth/sector/history` | **Separate design memo + subphase** (later 5D subphase at the earliest; Phase 5E+ acceptable) | API `limit` default `200000` / max `500000` — the largest sweep surface observed anywhere; needs its own bounded-window + tiny-cap design (§4.E) after breadth latest is proven. |
| `/v1/market/regime/forecast` | **Later Phase 5D subphase**, own short design memo | Verified summary "Forward-looking market regime forecast": the most advice-adjacent route in the layer (and costliest market rule, `0.35 STC`). Parameter surface is small and bounded — the deferral is purely for dedicated forecast-framing design: API-authored forward-looking regime context, never MCP prediction/advice. |
| `/v1/market/regime/history` | **Not deferred — included in PR #51** | API-bounded to 52 weekly rows (default 12); the one history route whose sweep surface is already trivial (§4.B). |
| `/v1/leadership/rotation/history` | **Later Phase 5D subphase**, own design pass | No `limit` parameter exists; `top_k` nullable with omit-means-all semantics; default date window not determinable credential-free (§4.H). Requires a new date-window bounding control before it can be safe. |

All deferred routes remain denied `endpoint_not_allowlisted` before any auth
header or fetch, and each requires its own explicit, separately reviewed
design + promotion before implementation.

## 7. Pricing and reconciliation design (PR #51 requirements)

PR #51 must add **three fresh, family-scoped static mirrors** to
`src/paidPricing.ts`, each carrying its verified `endpoint_family`, and three
family rule-id groups; the existing `reconcileStaticPricingWithCatalog`
machinery (family/`access_type`/`requires_payment`/unit/cost/duplicate/conflict
checks) applies unchanged:

| Static mirror entry | Endpoint | `endpoint_family` | Amount | Unit | Rule-id group |
| --- | --- | --- | --- | --- | --- |
| `market_regime_latest` | `/v1/market/regime/latest` | `market` | `0.15` | `STC` | `MARKET_PRICING_RULE_IDS = [market_regime_latest, market_regime_history]` |
| `market_regime_history` | `/v1/market/regime/history` | `market` | `0.25` | `STC` | (same group) |
| `breadth_sector_latest_paid` | `/v1/breadth/sector/latest` | `breadth` | `0.1` | `STC` | `BREADTH_PRICING_RULE_IDS = [breadth_sector_latest_paid]` |
| `leadership_summary_latest_paid` | `/v1/leadership/summary/latest` | `leadership` | `0.25` | `STC` | `LEADERSHIP_PRICING_RULE_IDS = [leadership_summary_latest_paid]` |

Requirements, identical in kind to §15.3/§16.4 and not relaxed:

- **Exact ids and families.** The market mirrors use the verified
  no-`_paid`-suffix rule ids and family string `market` exactly; a
  `market_regime`-style family or a suffixed id must fail reconciliation.
- **Family-scoped reconciliation.** A market call reconciles only the market
  group, breadth only breadth, leadership only leadership; no group's state
  (or success) ever gates or satisfies another family — including ST-IM,
  indicators, selections, and `selections_published`. Deferred-route rules
  (`market_regime_forecast`, `breadth_sector_history_paid`,
  `leadership_rotation_history_paid`) are **not mirrored** and are not members
  of any group.
- **Fail-closed cases** (`pricing_catalog_reconciliation_failed`, no auth
  header, no fetch): catalog unavailable or malformed; required rule missing;
  duplicate/ambiguous rule; endpoint/rule-id mismatch (including another rule
  claiming the same endpoint); **missing or non-matching `endpoint_family`**;
  explicit `access_type` other than `paid`; explicit `requires_payment` other
  than `true`; missing/unsupported/**conflicting** unit (the verified `STC`
  unit is mandatory — a matching numeric cost is never accepted without it);
  cost mismatch against the static mirror. Absent optional fields are never
  fabricated into a pass.
- **Catalog reads are credential-free** (never an `X-API-Key`) and are metadata
  reconciliation only — the catalog is never an authorization source by itself;
  static mirror + reconciliation + caps + execution flag are all required
  together before auth/fetch. Successful reconciliation caches per rule-id
  group for the server session; failures are never cached.
- **`observed_cost` / `payment_status` are never fabricated.** Subscription
  mode returns no per-call charge; both stay `null` unless the API returns
  them. Static/catalog estimates are reported as estimates only.
- **`leadership_definitions_public` is never a paid mirror.** Its `request`
  cost unit and `public` access type would (correctly) fail STC reconciliation;
  it participates only as a credential-free public resource (§4.F).

## 8. Auth and allowlist design (PR #51 requirements)

PR #51 must promote **exactly four routes** into
`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` (§15.7), each as an explicit, separately
reviewed promotion coupled to its tool:

| Promoted route | Tool | Pricing rule | Notes |
| --- | --- | --- | --- |
| `GET /v1/market/regime/latest` | `stocktrends_get_market_regime_latest` | `market_regime_latest` | `requiredHistoryPair: stocktrends_get_market_regime_history` (registered together) |
| `GET /v1/market/regime/history` | `stocktrends_get_market_regime_history` | `market_regime_history` | `supportsLongitudinalAnalysis: true` |
| `GET /v1/breadth/sector/latest` | `stocktrends_get_breadth_sector_latest` | `breadth_sector_latest_paid` | No history pair this increment (list-family precedent, §4.E) |
| `GET /v1/leadership/summary/latest` | `stocktrends_get_leadership_summary_latest` | `leadership_summary_latest_paid` | No history pair this increment (§4.H) |

Rules, unchanged in kind from §15.2/§15.7/§16.2:

- **`X-API-Key` only, and only after every gate passes** — paid-tools flag +
  configured key (exposure), execution flag, mandatory pricing preflight,
  passing family-scoped catalog reconciliation, strict input validation,
  nonzero call caps, covering STC budget, and the repeated-identical-call gate
  (§9). The header is built only inside the coupled paid boundary
  (`buildPaidAuthHeaders`) for the approved origin + exact promoted path.
- **Not promoted** (denied `endpoint_not_allowlisted` before any auth/fetch):
  `/v1/market/regime/forecast`, `/v1/breadth/sector/history`,
  `/v1/leadership/rotation/history` — and, permanently as a paid route,
  `/v1/leadership/definitions`, which is **never auth-capable**: it is read
  only via the credential-free public-resource path.
- **No API key to public surfaces:** the definitions resource, the pricing
  catalog, all other public resources, and the planning tool never receive the
  key under any configuration.
- **No `Authorization: Bearer`** (despite the API advertising `BearerAuth`),
  **no payment header**, **no x402/wallet/OAuth**, **no `X-StockTrends-Payment-*`
  headers**, **no raw API bypass** (operators use the gated tools, never direct
  keyed calls that skip the gates), **no remote MCP**, and **no dynamic
  registration**. All eight candidate routes are `GET`; the §15.5
  `GET`-only/no-request-body posture is unchanged.

## 9. Limit and broad-sweep safety (PR #51 requirements)

Market-context data is **weekly-cadence and market-scoped**, so the central
sweep risks are list caps, snapshot time-travel, and identical-call re-billing.
Controls, extending §7/§8/§16.3 and never relaxing them:

**Per-route MCP limits (always sent; validated before any pricing/auth/fetch):**

| Tool | Parameter | API default / max | MCP default | MCP hard max |
| --- | --- | --- | --- | --- |
| `stocktrends_get_market_regime_latest` | — (snapshot; no list parameters) | — | — | — |
| `stocktrends_get_market_regime_history` | `limit` | `12` / `52` | `12` | `52` (API max is already tiny) |
| `stocktrends_get_breadth_sector_latest` | `limit` | `5000` / `50000` | `50` | `250` (0.5% of API max) |
| `stocktrends_get_leadership_summary_latest` | `limit_overall` | `50` / `1000` | `50` | `200` (20% of API max) |
| `stocktrends_get_leadership_summary_latest` | `limit_bucket` | `20` / `200` | `20` | `50` (25% of API max) |

- **Always send every limit parameter explicitly** (even where the MCP default
  equals the API default), so an API default — present or future — can never
  silently apply, and large API defaults (breadth `5000`) are unreachable.
- **Reject invalid limits before pricing/auth/fetch:** out-of-range,
  non-integer, array, sentinel (`0`, `-1`, `"all"`), and unknown keys fail
  closed at the strict schema boundary with no request — never silently
  clamped. Strict schemas reject unknown keys on every tool, including the
  zero-parameter regime-latest tool.
- **No snapshot time-travel through latest tools:** the verified `weekdate`
  override parameters on `breadth/sector/latest` and
  `leadership/summary/latest` are **not exposed** in PR #51 — stepping
  `weekdate` would reconstruct history through a latest tool at the latest
  price, bypassing the deferred history routes and their limits. Latest tools
  return the current week only.
- **No pagination loop, no offset walking, no date-range sweeping** (no
  `start_date` walking on regime history), **no exchange iteration** (the
  `exchange` filter is a single validated passthrough value, never looped),
  **no bulk assembly** of any series or universe from multiple bounded calls,
  **no background refresh**, and **no automatic retry** on `429`/`5xx` (fail
  closed; §15.5 single-fetch rule — exactly one `GET` per invocation).
- **Repeated-identical-call posture (all four paid tools).** Market-context
  data is weekly: an identical call within one server session re-bills
  identical data. PR #51 must extend the §16.3 normalized-signature posture to
  all four tools (full normalized input signature; for the zero-parameter
  regime-latest tool the signature is constant, so a second executed call in a
  session fails closed): reservation is taken synchronously before the first
  async boundary so sequential **and concurrent** duplicates fail closed
  (`repeated_identical_market_context_call` or per-family equivalent) before
  any pricing/auth/fetch/cap debit; a pre-billable failure releases the
  reservation; reaching a billable attempt promotes it to executed for the
  session. In-memory only; resets on restart. This is deliberately stricter
  than the ST-IM/indicators posture, justified by the weekly cadence.
- **Call caps default-deny and a covering budget is mandatory:**
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` / `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`
  default `0` (deny); every rule here is nonzero STC, so a covering
  `STOCKTRENDS_MAX_STC_PER_SESSION` is required or the call is denied
  `spend_cap_exceeded` before auth/fetch.
- **Row-count transparency:** `mcp_metadata` records every effective limit sent
  and the returned row count when derivable (per-bucket counts for the
  leadership summary where derivable) — metadata only, never a second
  ranking/filtering pass.
- **Breadth history, addressed specially even though deferred:** the verified
  API default/max (`200000`/`500000`) must never become reachable by accident.
  PR #51 adds no code path for it; the route stays non-promoted and on
  `PROHIBITED_RESOURCE_ENDPOINTS`; and any future inclusion must adopt §4.E's
  design floor (always-send limit, default ≤`100`, hard max ≤`500`, mandatory
  bounded `start`+`end` window, no sweeps) via its own reviewed memo.

## 10. Authority and response handling

The controlling boundary is unchanged:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

- **The API remains the authority.** All eight routes return unconstrained JSON
  (`{}` schema, verified); the adapter preserves the API payload **verbatim in
  `api_data`** and never synthesizes, reshapes, renames, or drops fields.
- **No local regime calculation** — no regime computation, smoothing,
  reclassification, blending of history into a trend, or forecasting.
- **No local breadth calculation** — no re-aggregation, re-grouping,
  participation math, or recomputed percentages.
- **No local leadership calculation** — no ranking, re-scoring, re-bucketing,
  threshold changes, or bucket merging; `min_rsi`/`min_mt_cnt` pass through to
  the API only.
- **No summarization, rewriting, or recomputation** of any API output, and no
  second local filtering pass for any passthrough parameter.
- **No investment advice.** No buy/sell/hold/allocation/risk/suitability
  output. Every tool description and `mcp_metadata` must carry
  context-not-advice framing: a regime label is **regime context, not a trading
  recommendation**; breadth rows are **participation context, not
  confirmation signals to act on**; leadership tables are **rotation context,
  not picks**.
- **Provenance metadata:** source endpoint, tool name, pricing rule, effective
  parameters sent, and the family framing note travel in `mcp_metadata`;
  API-returned `request_id` is preserved where present.
- **Freshness/staleness metadata:** weekdate/staleness fields are captured in
  metadata **only when present** in the API payload (the response schemas are
  unconstrained, so none can be promised) and are never fabricated;
  `observed_cost`/`payment_status` stay `null` unless the API returns them.

## 11. SECURITY_MODEL and README updates required for PR #51

Before or with the implementation, `docs/SECURITY_MODEL.md` must gain a
market-context section (a §17, mirroring §16's structure), recording:

1. **Surface counts:** paid-exposed tools 6 → **10**; default/free stays
   exactly **1**; **zero prompts**; public resources 9 → **10**
   (`stocktrends://leadership/definitions`, credential-free, never keyed).
2. **Auth-capable allowlist promotions:** exactly the four §8 routes;
   forecast/breadth-history/rotation-history and `/v1/leadership/definitions`
   explicitly not promoted; definitions never auth-capable.
3. **Family-scoped pricing statements:** the three §7 mirrors (`market` with
   its no-`_paid`-suffix rule ids, `breadth`, `leadership`), mandatory `STC`
   unit, `endpoint_family`/`access_type`/`requires_payment` verification, and
   no cross-family transfer.
4. **Market-context limit-safety subsection (extends §7/§8/§16.3):** the §9
   table and rules — always-send limits, per-route defaults/hard maxes,
   fail-closed invalid limits, **no `weekdate` snapshot time-travel on latest
   tools**, no pagination/date-sweeping/exchange-iteration/bulk/retry, the
   repeated-identical-call posture for all four tools, and the
   breadth-history-never-reachable statement.
5. **Market-context authority boundary (extends §6):** the §10 rules — no
   regime/breadth/leadership recomputation, context-not-advice framing,
   verbatim `api_data`, provenance/freshness capture-if-present.
6. **Scope statement:** local stdio, operator-controlled use only; no
   autonomous/scheduled/remote/bulk use; validation remains mock-only in CI
   with any live run separately authorized under a PR #52 plan.
7. **Prohibited-resource-list correction (§2):** add
   `/v1/leadership/summary/latest` and `/v1/leadership/rotation/history` to
   `PROHIBITED_RESOURCE_ENDPOINTS`; keep `/v1/leadership/definitions` off it as
   a verified public resource.

`README.md` must be updated to match: paid-exposed count 6 → 10 wherever
stated; the tenth row in the Public Resources table; a Conditional Paid
Market-Context Tools section (exposure/execution gates, per-tool limits table,
context-not-advice note); and the environment-variable table's execution-flag
description extended with the four new routes. No README change may alter the
free-mode one-tool contract or the zero-prompt contract.

## 12. Test requirements for PR #51 (all mock-only)

No live call, no real key, no MCP Inspector, no paid endpoint, no DB in CI.
Required proofs:

- **Surface:** default/free mode exactly **1** tool; paid-exposed mode exactly
  **10** tools; public resources exactly **10** and credential-free in every
  mode; **zero prompts** in every mode; the four market-context tools hidden
  unless paid-tools flag **and** key are both set (neither alone exposes).
- **Execution gate:** with exposure but no execution flag, each of the four
  tools fails closed `paid_execution_disabled` — no request, no auth header, no
  cap debit, reconciliation not evaluated.
- **Pricing reconciliation per family:** each §7 mirror reconciles against a
  mocked catalog; missing rule, duplicate rule, cost mismatch,
  missing/unsupported/conflicting unit, **missing/mismatched
  `endpoint_family`**, explicit non-`paid` `access_type`, and explicit
  `requires_payment: false` each fail closed with no auth/fetch; catalog
  unavailable/malformed fails closed; reconciliation is family-scoped (an
  ST-IM/indicators/selections/other-family mirror never satisfies a
  market/breadth/leadership call, and vice versa); market reconciliation covers
  both market rules while breadth/leadership groups stay independent.
- **Caps/budget:** call caps default `0` deny; each nonzero STC cost with no
  covering STC budget denies `spend_cap_exceeded` before auth/fetch.
- **Auth boundary:** `X-API-Key` only, built only after all gates, only for the
  four promoted routes; never `Authorization: Bearer`, never a payment header;
  the definitions resource, pricing catalog, planning tool, and all public
  resources never receive the key; the key never appears in logs, errors,
  denials, or returned data; non-promoted market-context routes
  (forecast, breadth history, rotation history) deny `endpoint_not_allowlisted`.
- **Limit safety per §9:** omitted limits send the explicit MCP defaults
  (`12`, `50`, `50`/`20`); bounds are inclusive (min and hard-max accepted);
  above-max/below-min/non-integer/array/sentinel/unknown-key inputs fail closed
  before pricing/auth/fetch and are never clamped; every limit parameter is
  present on every outbound request; `weekdate`, `vol_scale`, and `type` are
  rejected as unknown keys.
- **Single fetch / no bulk:** exactly one `GET` per invocation; no pagination,
  no iteration, no retry on `429`/`5xx` (fail closed).
- **Repeated-identical-call posture:** sequential and concurrent duplicate
  calls fail closed before pricing/auth/fetch/cap debit (at most one fetch, one
  auth header, one cap debit); a pre-billable failure releases the reservation;
  a billable attempt persists as executed even on an API error; the
  zero-parameter regime-latest tool blocks a second executed call per session.
- **Verbatim forwarding / authority:** mocked API payloads preserved byte-level
  in `api_data`; no local ranking/re-scoring/re-bucketing/re-aggregation/
  regime math (provenance flags false); `mcp_metadata` carries the
  context-not-advice framing, effective limits, and returned row counts;
  `observed_cost`/`payment_status` remain `null` and are never fabricated.
- **Definitions resource:** listed and readable credential-free in every mode;
  fetch-on-request; no auth header on its reads; resource count assertions
  updated 9 → 10; `PROHIBITED_RESOURCE_ENDPOINTS` gains the two paid leadership
  routes and still excludes every registered resource endpoint.

## 13. Validation path after PR #51

The proven cadence continues; nothing below is authorized by this memo:

- **PR #52 — controlled validation plan.** Operator-supervised, one-off
  procedure: default/free surface check, paid-exposed execution-disabled check,
  limit-safety cases, then **at most one authorized live call per paid tool**
  (worst case four calls / `0.75 STC`; the plan may authorize fewer), explicit
  caps/budget sized to the verified costs, rollback checklist, report template.
  No live run occurs in PR #52 itself.
- **PR #53 — controlled validation report**, only if a live validation is
  separately and explicitly operator-authorized and performed under the PR #52
  plan, followed by rollback to the default/free one-tool surface; recorded
  secret-free with `REDACTED` placeholders only.
- **PR #54 — narrow production-readiness signoff**, only if the report passes
  and independent review is complete; scope limited to controlled local stdio
  operator use, exactly as Phases 4/5B/5C.
- **No production-readiness claim exists before that signoff**, and this memo
  makes none.

## 14. Non-goals

This memo and the proposed PR #51 scope explicitly do **not** include:

- **No implementation in this memo** — design/contract verification only.
- **No decision/evaluate-symbol** (Phase 5E at the earliest; first body-bearing
  route, own security-model extension).
- **No portfolio endpoints** — evaluate/compare (5F) and construct (5G) remain
  deferred behind their own heavier reviews.
- **No Intelligence Agent artifacts** — deferred until artifact production is
  stable (free surfaces last returned `503` credential-free).
- **No `selections/history` and no `selections/published/*`** — unchanged from
  the Phase 5C signoff; still denied `endpoint_not_allowlisted`.
- **No remote MCP** — local stdio only; hosted transport stays a separate
  architecture/security track.
- **No x402 / wallet / OAuth / `Authorization: Bearer` / payment-header
  behavior** — subscription `X-API-Key` only, and only where promoted.
- **No prompts** — zero MCP prompts in every mode, unchanged.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No paid validation** — no live paid call is performed or authorized by this
  memo.
- **No advice** — no buy/sell/hold/allocation/risk/suitability output, and no
  MCP-side regime/breadth/leadership recomputation of any kind.

## 15. Final recommendation

- **Recommend PR #51 implement the selected market-context subset only:** the
  four paid tools `stocktrends_get_market_regime_latest`,
  `stocktrends_get_market_regime_history`,
  `stocktrends_get_breadth_sector_latest`,
  `stocktrends_get_leadership_summary_latest`, and the one credential-free
  public resource `stocktrends://leadership/definitions` — nothing more —
  adopting this memo's §7 pricing mirrors, §8 promotions, §9 limit-safety
  design, §10 authority boundary, §11 SECURITY_MODEL/README updates, and §12
  test surface in full.
- **Do not authorize implementation until this memo is reviewed.** This memo
  authorizes no code, no registration, no allowlist promotion, and no live
  validation; PR #51 proceeds only after this memo's review and remains a
  separate, reviewed step.
- **Require Codex review before merge** — of this memo (its limit and boundary
  design), of the PR #51 implementation, and of any later validation report, as
  in Phases 4, 5B, and 5C.
- **Require future implementation to preserve the thin-adapter and authority
  boundaries unchanged** — the API authors every regime, breadth, and
  leadership output; the MCP forwards verbatim, fails closed on every gate, and
  never recomputes, re-ranks, re-buckets, forecasts, or advises.
- **Defer the higher-risk routes as specified:** `market/regime/forecast`
  (forward-looking framing, own subphase), `breadth/sector/history`
  (`200000`/`500000` sweep surface, own design memo), and
  `leadership/rotation/history` (no row cap, nullable omit-means-all `top_k`,
  unverifiable default window — own subphase). Each stays denied
  `endpoint_not_allowlisted` until its own reviewed design and promotion.

Nothing in this memo declares any market-context route safe for use, exposed,
or production-ready. Readiness today is exactly this: the eight contracts are
verified credential-free to the §4 detail, the definitions route is verified
publicly readable, the safe subset and its controls are designed, and the
staged path (PR #51 mock-only implementation → PR #52 plan → PR #53 report →
PR #54 narrow signoff) is defined above.
