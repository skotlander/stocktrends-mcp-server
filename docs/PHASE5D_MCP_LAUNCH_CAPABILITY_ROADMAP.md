# Phase 5D MCP Launch Capability Roadmap and Available Endpoint Selection Memo

Design date: 2026-07-11

Status: **Selection / roadmap memo only. Documentation-only.** This memo uses the
completed Phase 5C evidence chain and the repository's governance documentation to
choose the next launch-focused MCP capability path and to define the staged
roadmap that completes the first launch-quality MCP surface. It authorizes **no
implementation**. No `src/` change, no `tests/` change, no `package.json` /
`package-lock.json` change, no MCP tool added, no MCP resource added, no MCP
prompt added, no auth-capable allowlist promotion, no paid endpoint call, no paid
validation, no MCP Inspector session, and no API key used, requested, inspected,
printed, logged, or stored is performed or authorized by this memo. The only
non-`docs/` change is one documentation-index link in `README.md`, which changes
no runtime behavior.

The public metadata checks in §4.0 were performed **credential-free** (no
`X-API-Key`, no `Authorization`, no payment header) against the two
already-documented public endpoints `GET /v1/openapi.json` and
`GET /v1/pricing/catalog`. No paid endpoint payload route was called; no key was
used; no usage or spend was created.

This memo builds on and does not supersede:

- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) and
  [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) — the thin-adapter
  authority boundary and the explicit no-recomputation rule for ST-IM,
  indicators, selections, rankings, **breadth**, **leadership**, **portfolio
  scores**, and intelligence conclusions.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §5/§7/§8 (paid-call safety,
  runaway-loop and broad-sweep controls, rate/spend control), §15 (paid ST-IM and
  indicators live execution), §15.7 (the narrowed credential-bearing allowlist),
  §15.8 (the internal credential-free instrument resolver), and §16 (paid
  `selections/latest` live execution and list-shaped limit safety).
- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) and
  [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
  — the read-only capability audit and the confirmed Phase 4 contracts.
- [`PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5C_NEXT_CAPABILITY_SELECTION_MEMO.md)
  — the Phase 5C selection memo whose evaluation method this memo reuses.
- The completed Phase 5C selections/latest document set (PRs #43–#48):
  [`PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5C_SELECTIONS_LATEST_DESIGN_AND_CONTRACT_MEMO.md),
  [`PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md`](PHASE5C_SELECTIONS_LATEST_IMPLEMENTATION_NOTES.md),
  [`PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_PLAN.md),
  [`PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md`](PHASE5C_SELECTIONS_LATEST_CONTROLLED_VALIDATION_REPORT.md),
  and
  [`PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md).
- [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  and
  [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the twice-proven signoff pattern and the operator-facing preconditions.

## 1. Status

- **Phase 5C selections/latest is complete through narrow production-readiness
  signoff.** The full Phase 5C evidence chain (PRs #43–#48) is merged: selection
  memo, design/contract verification, mock-only implementation, controlled
  validation plan, completed controlled live validation report (verdict **PASS
  WITH DEVIATIONS**), and production-readiness signoff. The signoff scope is
  narrow: **controlled local stdio operator use only**, for
  `stocktrends_get_selections_latest` backed by `GET /v1/selections/latest`.
- **Phase 5D is now selecting the next launch-focused capability roadmap.** With
  three paid families proven (ST-IM, indicators, base selections), the question is
  no longer "can the gated paid-adapter pattern work" — it is "which available
  endpoint families complete a first launch-quality MCP surface, and in what
  order."
- **This memo is selection/roadmap-only and docs-only.** It chooses a staged
  launch path, assesses every available high-value candidate family, and defines
  the next design/contract memo — nothing more.
- **No implementation is authorized by this memo.** A later, separately reviewed
  design/contract memo (PR #50, §6) must precede any code, tool registration,
  allowlist promotion, or live validation, exactly as in Phases 5B and 5C.

## 2. Current completed MCP surface

Confirmed from the merged Phase 5C evidence chain and re-confirmed against the
current source (`src/server.ts`, `src/paidPolicy.ts`, `src/paidPricing.ts`,
`src/tools/`, `src/resources/index.ts`):

- **Default/free mode exposes exactly one tool:**
  `stocktrends_estimate_workflow_cost` (workflow-level `GET /v1/cost-estimate`,
  credential-free, never authorizes paid execution).
- **Paid-exposed mode exposes exactly six tools:**
  - `stocktrends_estimate_workflow_cost`
  - `stocktrends_get_stim_latest`
  - `stocktrends_get_stim_history`
  - `stocktrends_get_indicators_latest`
  - `stocktrends_get_indicators_history`
  - `stocktrends_get_selections_latest`
- **Zero MCP prompts** in every mode.
- **Nine public resources remain credential-free in every mode**
  (`stocktrends://api/openapi`, `stocktrends://ai/context`,
  `stocktrends://ai/tools`, `stocktrends://workflows`,
  `stocktrends://methodology/stim`, `stocktrends://methodology/indicators`,
  `stocktrends://methodology/inference`, `stocktrends://pricing/catalog`,
  `stocktrends://proof/market-edge`).
- **The credential-bearing allowlist is exactly five routes**
  (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`, `src/paidPolicy.ts`):
  `/v1/stim/latest`, `/v1/stim/history`, `/v1/indicators/latest`,
  `/v1/indicators/history`, `/v1/selections/latest`. Any new paid route requires
  an explicit, separately reviewed promotion.
- **No dynamic registration, no remote MCP, no
  x402/wallet/OAuth/Bearer/payment-header behavior.** Paid execution remains
  local stdio, operator-controlled only, behind the exposure/execution gate
  split, mandatory pricing preflight, family-scoped catalog reconciliation,
  default-deny caps, and covering budget requirements.
- **The Phase 5C selections/latest signoff is narrow:** controlled local stdio
  operator use only; no autonomous, scheduled, remote, or bulk use;
  `selections/history` and `selections/published/*` remain deferred and denied
  `endpoint_not_allowlisted`.

**Explicit confirmation of what is NOT yet implemented.** None of the following
endpoint families exists as a dedicated MCP tool or MCP resource today. All of
them appear on the server's own prohibited-resource-endpoint list
(`PROHIBITED_RESOURCE_ENDPOINTS`, `src/resources/index.ts`), none is on the
auth-capable allowlist, and no tool in `src/tools/` wraps any of them:

- **Market regime** (`/v1/market/regime/latest`, `/v1/market/regime/history`,
  `/v1/market/regime/forecast`)
- **Breadth** (`/v1/breadth/sector/latest`, `/v1/breadth/sector/history`)
- **Leadership** (`/v1/leadership/definitions`, `/v1/leadership/summary/latest`,
  `/v1/leadership/rotation/history`)
- **Decision** (`/v1/decision/evaluate-symbol`)
- **Portfolio evaluate** (`/v1/portfolio/evaluate`)
- **Portfolio compare** (`/v1/portfolio/compare`)
- **Portfolio construct** (`/v1/portfolio/construct`)
- **Intelligence Agent artifacts** (guidance/research/editorial/discovery paths;
  the free discovery/editorial-preview candidates remain excluded after
  credential-free checks returned `503` on 2026-07-07)

## 3. Launch objective

The Phase 5D objective is to **complete and launch the MCP as soon as possible
with currently available high-value Stock Trends endpoints**:

- **Do not wait for Intelligence Agent editorial artifacts.** Those artifacts are
  not yet stable/available as intended (the public discovery and editorial
  preview endpoints returned `503` at the last credential-free checks), and the
  paid guidance/research artifact surface depends on Intelligence Agent artifact
  production that is still maturing. Launch must not be gated on them.
- **Prioritize endpoints that directly express Stock Trends' unique value to
  retail trading agents.** The thesis is that Stock Trends gives agents *market
  context* — regime, participation, leadership, trend doctrine, probabilistic
  expectations — so their strategies do not operate in a silo. The strongest
  launch surface is the one that delivers that context, not the one that waits
  for editorial products.
- **Preserve governance and the thin-adapter architecture while moving quickly.**
  Every addition continues to follow the proven cadence — selection memo →
  design/contract memo → mock-only implementation → controlled validation plan →
  controlled validation report → narrow signoff — and never weakens the authority
  boundary, the credential rules, the fail-closed gates, or the tool-count
  contract.

A launch-quality first surface therefore looks like: the existing planning tool +
symbol-level families (ST-IM, indicators) + universe family (base selections) +
**a market-context layer (regime, breadth, leadership)** — with decision and
portfolio capabilities following in later, separately reviewed subphases.

## 4. Candidate family assessment

### 4.0 Credential-free public metadata checks performed (2026-07-11)

Both checks were credential-free reads of the two already-documented public
metadata endpoints. No API key was used; no paid payload route was called; no
usage or spend was created. Only non-secret facts are recorded here.

| Check | Endpoint | Result |
| --- | --- | --- |
| OpenAPI contract | `GET /v1/openapi.json` | `200 application/json`, `openapi: 3.1.0`, `info.version 1.0.0`, single server `url: /v1`, 61 paths. |
| Pricing catalog | `GET /v1/pricing/catalog` | `200 application/json`, `planning_role` catalog with 40 rules; rule fields include `pricing_rule_id`, `endpoint_pattern`, `endpoint_family`, `stc_cost`, `cost_per_request`, `cost_unit`, `access_type`, `requires_payment`, `requires_subscription`. |

Facts observed for the candidate families (existence and catalog metadata only —
**this is not contract verification to the PR #44/#50 standard**; §9 defines what
PR #50 must still verify):

| Route (with `/v1` server prefix) | Method | Catalog rule id | `endpoint_family` | `stc_cost` | `cost_unit` | `access_type` |
| --- | --- | --- | --- | --- | --- | --- |
| `/v1/market/regime/latest` | `GET` | `market_regime_latest` | `market` | `0.15` | `STC` | `paid` |
| `/v1/market/regime/history` | `GET` | `market_regime_history` | `market` | `0.25` | `STC` | `paid` |
| `/v1/market/regime/forecast` | `GET` | `market_regime_forecast` | `market` | `0.35` | `STC` | `paid` |
| `/v1/breadth/sector/latest` | `GET` | `breadth_sector_latest_paid` | `breadth` | `0.1` | `STC` | `paid` |
| `/v1/breadth/sector/history` | `GET` | `breadth_sector_history_paid` | `breadth` | `0.3` | `STC` | `paid` |
| `/v1/leadership/definitions` | `GET` | `leadership_definitions_public` | `planning` | `0.0` | `request` | `public` |
| `/v1/leadership/summary/latest` | `GET` | `leadership_summary_latest_paid` | `leadership` | `0.25` | `STC` | `paid` |
| `/v1/leadership/rotation/history` | `GET` | `leadership_rotation_history_paid` | `leadership` | `0.3` | `STC` | `paid` |
| `/v1/decision/evaluate-symbol` | `POST` | `evaluate_symbol` | `decision` | `0.5` | `STC` | `paid` |
| `/v1/portfolio/evaluate` | `POST` | `portfolio_evaluate` | `portfolio` | `0.75` | `STC` | `paid` |
| `/v1/portfolio/compare` | `POST` | `portfolio_compare` | `portfolio` | `1.25` | `STC` | `paid` |
| `/v1/portfolio/construct` | `POST` | `portfolio_construct` | `portfolio` | `1.0` | `STC` | `paid` |

Additional non-secret observations PR #50 must re-verify (not overstated here):

- **The market-context routes are `GET`; the decision and portfolio routes are
  `POST` with request bodies.** Every paid route the MCP executes today is `GET`
  with no request body (SECURITY_MODEL §15.5). Decision/portfolio would be the
  first body-bearing paid tools — a genuine security-model extension, which
  reinforces sequencing them after the market-context layer.
- **Observed API `limit` scales differ enormously by family** (partial parameter
  extraction from the OpenAPI document; the full parameter sets must be
  re-verified by PR #50): market regime history `limit` default `12`, max `52`;
  regime forecast `lookback` default `5`, range `2`–`13`; breadth sector latest
  `limit` default `5000`, max `50000`; **breadth sector history `limit` default
  `200000`, max `500000`** — a broad-sweep surface orders of magnitude beyond the
  selections case, making MCP-side safe defaults / hard maxes (or history
  deferral) a central PR #50 design question; leadership summary
  `limit_overall` default `50`, max `1000`, `limit_bucket` default `20`, max
  `200`; leadership rotation history `top_k` default `5`, max `50`.
- **Anomalies to resolve in PR #50:** the market regime rules use
  `endpoint_family: market` (not `market_regime`) and drop the `_paid` suffix, as
  does `evaluate_symbol`; `leadership_definitions_public` is `access_type:
  public` with `endpoint_family: planning` and `cost_unit: request`, yet the
  OpenAPI security block still lists `ApiKeyAuth`/`BearerAuth` on the route, so
  its credential-free readability must be explicitly verified before it is
  treated as a public/static resource candidate.

### 4.A Market regime (`/v1/market/regime/latest`, `/history`, `/forecast`)

- **Value.** Very high for trading agents. Regime classification is the
  foundational "what kind of market am I in" context that conditions every other
  Stock Trends signal (ST-IM expectations, indicator states, selection breadth).
  It is the clearest expression of the context-not-silo thesis.
- **Availability now.** All three routes exist in the public OpenAPI with catalog
  pricing rules (§4.0). Available immediately, pending PR #50 contract
  verification.
- **Risk.** Low-moderate. `latest` is a small snapshot; `history` is tightly
  bounded by the API itself (observed max `52`); `forecast` is the most
  advice-adjacent of the three (forward-looking output) and needs careful
  framing plus a decision in PR #50 on whether it ships in the first subset.
  Latest-vs-history split follows the proven pattern.
- **Authority-boundary impact.** Low if framed correctly: the API authors the
  regime classification; the MCP forwards it verbatim. **No MCP-side regime
  calculation, smoothing, or reinterpretation, ever.** The regime/advice boundary
  must be explicit: a regime label is market context, not a buy/sell signal.
- **Implementation complexity.** Low. `GET`-only, small parameter surface,
  latest/history pairing already proven twice, no instrument resolver needed
  (market-scoped, not symbol-keyed).
- **Validation burden.** Low-moderate: the standard controlled one-call
  validation per family, plus the forecast-framing check if forecast ships.
- **Discoverability impact.** High — "what regime are we in" is a natural first
  agent question and an obvious demo.
- **Recommended timing: IMMEDIATE (Phase 5D).**

### 4.B Breadth (`/v1/breadth/sector/latest`, `/history`)

- **Value.** High. Sector breadth is market-participation / confirmation context:
  it tells an agent whether a regime or rally is broad or narrow. Strong
  complement to regime and leadership; distinctive Stock Trends data.
- **Availability now.** Both routes exist with catalog rules (§4.0). Available
  immediately, pending PR #50 verification.
- **Risk.** Moderate, concentrated in **grouping/limit/history scale**: the
  observed API defaults (`5000` latest / `200000` history) are far beyond
  anything the MCP has exposed; the selections lesson (always-sent explicit
  limit, hard MCP max, fail-closed on out-of-range, no sweep mode) applies
  directly but the numbers must be designed fresh. PR #50 must set safe default
  limits and decide whether **history ships in the first subset or is deferred**
  (the latest-first, history-deferred option is legitimate here, unlike the
  single-symbol families where pairing was cheap).
- **Authority-boundary impact.** Low if framed as **context, not
  recommendation**: breadth rows are API-authored aggregates. **No MCP-side
  breadth calculation, re-aggregation, or re-grouping.**
- **Implementation complexity.** Low-moderate: `GET`-only, list-shaped (reuses
  the §16 limit-safety machinery), more parameters than regime.
- **Validation burden.** Moderate: limit-safety cases dominate, as in Phase 5C.
- **Discoverability impact.** High as confirmation context beside regime.
- **Recommended timing: IMMEDIATE (Phase 5D).**

### 4.C Leadership (`/v1/leadership/definitions`, `/summary/latest`, `/rotation/history`)

- **Value.** High. Sector/industry/market leadership rotation is the third leg of
  market context: where strength is concentrated and how it is rotating.
  Definitions make the summary/rotation outputs interpretable.
- **Availability now.** All three routes exist; the catalog marks `definitions`
  public/zero-cost and the other two paid (§4.0). Available immediately, pending
  PR #50 verification.
- **Risk.** Moderate. The latest-vs-history split is standard. The distinctive
  questions are (a) whether **`definitions` should be a credential-free public
  resource** (catalog says public; the OpenAPI security block ambiguity in §4.0
  must be resolved credential-free first) — which would be the first public
  resource added since Phase 2 and must not change the paid tool count; and
  (b) bounded list shapes (`limit_overall`/`limit_bucket`/`top_k`) needing the
  §16-style treatment.
- **Authority-boundary impact.** Low if framed as **context, not advice**:
  leadership tables are API-ranked. **No MCP-side ranking, re-scoring,
  re-bucketing, or threshold changes** — `min_rsi`/`min_mt_cnt` style parameters
  pass through to the API only.
- **Implementation complexity.** Low-moderate: `GET`-only; possible
  resource+tool mix is new but small.
- **Validation burden.** Moderate: limit cases plus the public-resource check if
  definitions ships as a resource.
- **Discoverability impact.** High — rotation is a distinctive Stock Trends
  story agents cannot get from generic price feeds.
- **Recommended timing: IMMEDIATE (Phase 5D).**

### 4.D Decision / evaluate symbol (`POST /v1/decision/evaluate-symbol`)

- **Value.** Very high for agents — a synthesized, API-authored symbol-level
  decision evaluation is the natural next step after context.
- **Availability now.** Route and catalog rule exist (§4.0).
- **Risk.** **Higher decision/advice-language risk than any family shipped so
  far.** An endpoint whose output is decision-shaped sits closest to the
  advice line; tool description, provenance framing, and disclaimers need
  dedicated design. It is also the **first `POST` + request-body paid route**,
  requiring a security-model extension beyond §15.5's `GET`-only posture, and it
  is symbol-scoped, so it needs the §15.8 instrument-resolution gating (or an
  equally strict input contract) before any paid boundary.
- **Authority-boundary impact.** High-sensitivity: the API authors the
  evaluation; **no MCP-side score calculation, adjustment, or summarization.**
- **Implementation complexity.** Moderate: body-bearing request machinery,
  instrument validation, decision-language framing.
- **Validation burden.** Moderate-high: everything above plus advice-boundary
  assertions.
- **Discoverability impact.** Very high, but only safe after the context layer
  exists — a decision endpoint without regime/breadth/leadership context invites
  exactly the siloed usage the thesis warns against.
- **Recommended timing: NEXT (Phase 5E), after market-context signoff.**

### 4.E Portfolio evaluate and compare (`POST /v1/portfolio/evaluate`, `/compare`)

- **Value.** High: evaluating and comparing **user-supplied** portfolios is a
  distinctive agent workflow (agents bring holdings; Stock Trends scores them).
- **Availability now.** Routes and catalog rules exist (§4.0; note compare
  `1.25 STC` is the most expensive observed rule).
- **Risk.** High. Portfolio-level outputs carry **portfolio/advice interpretation
  risk** (easily read as allocation guidance); they take user-supplied position
  lists, so **input validation and a bounded position count** are mandatory new
  controls; both are `POST` body-bearing routes; costs are the highest yet.
  **No portfolio construction by the MCP, no suitability analysis, no
  individualized advice** — the MCP forwards API-authored evaluations verbatim.
- **Authority-boundary impact.** High-sensitivity; the Phase 5C memo already
  classified portfolio surfaces as the most authority-sensitive data option.
- **Implementation complexity.** Moderate-high: body schemas, position-count
  caps, user-data logging posture (SECURITY_MODEL §9 flags portfolio contents as
  sensitive).
- **Validation burden.** High: dedicated design/security memo required.
- **Discoverability impact.** High for agent workflows.
- **Recommended timing: LATER (Phase 5F), after decision/evaluate-symbol proves
  the body-bearing + advice-framing machinery.**

### 4.F Portfolio construct (`POST /v1/portfolio/construct`)

- **Value.** Potentially the highest demo value of any candidate ("construct me a
  portfolio from Stock Trends signals").
- **Availability now.** Route and catalog rule exist (§4.0).
- **Risk.** **Highest governance/advice risk of any available family.** It
  *constructs positions* — the closest possible output to individualized
  investment advice. It must be delayed until the evaluation and decision
  boundaries are designed, implemented, and signed off. It likely requires the
  heaviest design review of any data family: strict disclaimers, hard caps, a
  bounded candidate universe, explicit non-advice framing, and possibly
  **Fable-level escalation again** (the Phase 5C memo reserved Fable 5 for
  portfolio/outcome authority-boundary design).
- **Authority-boundary impact.** Maximum among data families.
- **Implementation complexity / validation burden.** High / highest.
- **Discoverability impact.** Very high — which is precisely why it must not
  lead: a launch headlined by construction would misrepresent the MCP as an
  advice engine rather than a context adapter.
- **Recommended timing: LATER (Phase 5G), only if still desired after the
  heavier review — despite its launch appeal, it must not be the immediate next
  implementation.**

### 4.G Intelligence Agent artifacts (discovery / editorial / guidance / research)

- **Value.** Strategically important later: editorial and research artifacts are
  a differentiated product surface.
- **Availability now.** **Not reliably available as intended.** The free
  discovery/editorial-preview routes returned `503` at the last credential-free
  checks (2026-07-07) and remain excluded from the public resources; the paid
  guidance/research artifact surface depends on Intelligence Agent artifact
  production that has not yet stabilized.
- **Risk / boundary.** Artifact provenance and authority framing are designed
  (envelope schema, content hashes), but building tools against an unstable
  artifact pipeline would burn launch time on a surface that may change.
- **Recommended timing: DEFERRED — until the Stock Trends Intelligence Agent
  produces stable API artifacts.** This is the strategic correction of this
  memo: Intelligence Agent editorial artifacts are **not** the immediate next
  MCP implementation path.

### 4.H Remote MCP / hosted MCP / x402 / wallet / OAuth

- **Value.** Strategically important later: hosted reach and machine-pay rails.
- **Risk.** Highest architecture/security boundary available — multi-tenant
  auth, secret isolation, rate limiting, payment-header construction, signing,
  replay protection. Explicitly deferred by SECURITY_MODEL §4/§12/§15.6.
- **Recommended timing: SEPARATE ARCHITECTURE TRACK.** Not a Phase 5D
  implementation capability. Requires its own architecture-first review (and
  Fable-level design), independent of the data-capability roadmap.

### Assessment summary

| Candidate | Value | Available now | Risk | Boundary impact | Complexity | Validation burden | Timing |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Market regime | Very high | Yes | Low-moderate | Low (context framing) | Low | Low-moderate | **Immediate (5D)** |
| B. Breadth | High | Yes | Moderate (limits) | Low (context framing) | Low-moderate | Moderate | **Immediate (5D)** |
| C. Leadership | High | Yes | Moderate | Low (context framing) | Low-moderate | Moderate | **Immediate (5D)** |
| D. Decision/evaluate-symbol | Very high | Yes | High (advice language, first POST) | High-sensitivity | Moderate | Moderate-high | **Next (5E)** |
| E. Portfolio evaluate/compare | High | Yes | High (portfolio inputs) | High-sensitivity | Moderate-high | High | **Later (5F)** |
| F. Portfolio construct | Highest demo | Yes | Highest | Maximum | High | Highest | **Later (5G, if still desired)** |
| G. Intelligence Agent artifacts | High (later) | **No (unstable)** | N/A now | Designed, pipeline unstable | N/A | N/A | **Deferred until artifacts stable** |
| H. Remote MCP / x402 / wallet / OAuth | High (later) | No | Highest boundary | New surface entirely | High | High | **Separate architecture track** |

## 5. Recommended immediate Phase 5D selection

**Recommended immediate Phase 5D implementation target: the market-context
layer — market regime, breadth, and leadership (candidates A + B + C).**

Why this layer should precede the decision and portfolio endpoints:

- **Context before decision.** The whole point of Stock Trends for agents is
  market context that keeps strategies out of a silo. Regime ("what market is
  this"), breadth ("how broad is participation"), and leadership ("where is
  strength rotating") are the context that make decision- and portfolio-level
  outputs interpretable. Shipping decision tools first would invert the doctrine
  the repo's own metadata resources teach.
- **Lower advice risk.** All three families are descriptive market context, not
  symbol- or portfolio-level recommendations. They are the lowest
  advice-language risk of the available paid candidates — clearly below
  decision/evaluate-symbol and far below portfolio construction.
- **Stronger market-environment foundation.** The layer completes a coherent
  launch story: planning tool → market context (regime/breadth/leadership) →
  symbol context (ST-IM, indicators) → universe context (selections). That is a
  launch-quality surface on its own.
- **Available now.** All eight routes exist in the public OpenAPI with catalog
  pricing rules, verified credential-free in §4.0 — no dependency on Intelligence
  Agent artifact stability.
- **High launch value.** Regime/breadth/leadership are distinctive Stock Trends
  data that generic feeds do not provide, and they demo naturally.
- **Natural complement to the proven families.** They are `GET`-shaped,
  latest/history-split, list-bounded surfaces — the smallest safe delta from the
  three-times-proven gated paid-adapter pattern (ST-IM, indicators, selections),
  reusing family-scoped pricing mirrors, catalog reconciliation, caps, preflight,
  no-retry, and the §16 list-shaped limit-safety machinery. The `POST`-shaped
  decision/portfolio families would each require a security-model extension that
  this layer does not need.

This selection is a **recommendation to proceed to a design/contract memo**
(PR #50) — not an implementation authorization.

## 6. Proposed scope for the next design/contract memo (PR #50)

PR #50 — the market-context layer design and contract memo — should **evaluate,
but not yet implement**, exactly these routes:

- `/v1/market/regime/latest`
- `/v1/market/regime/history`
- `/v1/market/regime/forecast`
- `/v1/breadth/sector/latest`
- `/v1/breadth/sector/history`
- `/v1/leadership/definitions`
- `/v1/leadership/summary/latest`
- `/v1/leadership/rotation/history`

This memo deliberately does **not** decide the final tool/resource shape. PR #50
must decide, from verified contract facts:

- **which endpoints become tools vs resources** (e.g. whether
  `leadership/definitions` is a public/static resource, and whether
  `regime/forecast` ships in the first subset given its forward-looking framing);
- **which are paid vs public**, verified credential-free (including resolving the
  `leadership_definitions_public` catalog-vs-OpenAPI-security ambiguity in §4.0);
- **whether latest endpoints ship separated from history endpoints** — the
  history-beside-latest pairing rule was a single-symbol convenience; for the
  breadth history scale observed in §4.0, latest-first with history deferred is a
  legitimate outcome PR #50 must decide explicitly per family;
- **whether definitions should be a public resource** (and if so, that it adds a
  resource, not a tool, and changes no tool count without explicit justification);
- **safe default limits** and **hard max limits** per route (MCP-side, far below
  the observed API defaults where those are large — the breadth history default
  of `200000` must never be reachable through the MCP);
- **caps and budgets** — per-session/per-tool call caps, covering STC budget
  semantics, and repeated-identical-call loop posture per family;
- **auth boundary** — `X-API-Key` only; explicit, separately reviewed promotion
  of each selected route into the auth-capable allowlist; public routes never
  credential-bearing;
- **pricing reconciliation** — fresh, family-scoped static mirrors per family
  (`market`, `breadth`, `leadership` — using the exact `endpoint_family` values
  the catalog actually publishes, which PR #50 must verify) that fail closed on
  any mismatch;
- **response provenance** — verbatim `api_data`, `mcp_metadata` with
  context-not-advice framing, no fabricated `observed_cost`/`payment_status`;
- **metadata requirements** — freshness/staleness fields, row-count/limit
  transparency, regime/breadth/leadership interpretation notes;
- **validation plan requirements** — the controlled, operator-supervised,
  one-off validation posture per family, mock-only automated tests, no live call
  in CI.

## 7. Later subphase roadmap

After the market-context layer completes its own evidence chain (design →
mock-only implementation → validation plan → report → narrow signoff):

- **Phase 5E — decision/evaluate-symbol.** First body-bearing (`POST`) paid
  tool; requires a security-model extension for request bodies, instrument
  validation or a strict input contract, and dedicated decision/advice-language
  framing. Follows the market-context layer so decisions land on top of context.
- **Phase 5F — portfolio/evaluate and portfolio/compare.** User-supplied
  portfolio inputs; bounded position counts; portfolio-sensitive logging
  posture; dedicated design/security memo. Follows Phase 5E, which proves the
  body-bearing machinery on a smaller surface.
- **Phase 5G — portfolio/construct, if still desired after heavier review.**
  Constructs positions, so it waits until the evaluation and decision boundaries
  are signed off; heaviest design review, strict disclaimers, caps, bounded
  candidate universe, and likely Fable-level escalation for the
  authority-boundary design.
- **Intelligence Agent artifact phase — when artifacts are stable.** Scheduled
  once the Stock Trends Intelligence Agent produces stable API artifacts
  (discovery/editorial/guidance/research); re-verify public/free status of the
  free surfaces first (they returned `503` at the last checks).
- **Remote MCP / x402 / wallet / OAuth — separate architecture/security track
  only.** Never bolted onto the subscription path; own architecture-first memo
  sequence, own security review, independent of the data-capability phases.

## 8. Authority and safety boundaries

For **all** future endpoint families in this roadmap, the controlling boundary is
unchanged:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

- **The API remains the authority.** The MCP only forwards API-authored outputs
  verbatim in `api_data`.
- **No local regime calculation.** The MCP never computes, smooths, reclassifies,
  or forecasts regimes.
- **No local breadth calculation.** No re-aggregation, re-grouping, or
  participation math.
- **No local leadership calculation.** No ranking, re-scoring, re-bucketing, or
  threshold changes.
- **No local decision scoring.** Evaluate-symbol outputs are forwarded, never
  recomputed or adjusted.
- **No local portfolio construction.** Ever, in any phase — construction happens
  only at the API, if ever exposed.
- **No local ranking, scoring, thresholding, filtering, summarization,
  rewriting, or recomputation** of any API output, in any family.
- **No investment advice.** No buy/sell/hold/allocation/risk output; context
  framing must state that regime/breadth/leadership outputs are market context,
  not recommendations.
- **No suitability analysis** and no individualized advice, including for
  user-supplied portfolios in Phases 5F/5G.
- **No prompts.** Zero MCP prompts in every mode, unchanged.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No remote MCP in this track** — local stdio only; hosted transport belongs
  to the separate architecture track (§7).
- **No database or control-plane access.**
- **No secrets** — no key committed, logged, printed, or stored; placeholders
  only in all docs.
- **No paid calls in this memo** — the §4.0 checks were credential-free public
  metadata reads only.

## 9. Contract verification requirements for PR #50

PR #50 must verify, credential-free from the front-facing API contract (the §4.0
observations are inputs, not substitutes), for every route it selects:

- **Exact routes** and the `/v1` server-prefix resolution.
- **HTTP methods** (all eight candidates were observed `GET`; confirm).
- **Auth requirements** — `X-API-Key` subscription semantics per route; which
  routes (if any) are genuinely credential-free.
- **Public vs paid status** — including resolving the
  `leadership_definitions_public` catalog-vs-OpenAPI-security ambiguity by an
  actual credential-free read.
- **Pricing catalog rules** — exact rule ids (including the observed
  no-`_paid`-suffix ids `market_regime_latest`/`_history`/`_forecast`),
  duplicate/ambiguity checks, and fail-closed reconciliation design.
- **`endpoint_family` values** — the exact strings the catalog publishes
  (observed: `market`, `breadth`, `leadership`, `planning`), which the
  family-scoped mirrors must match exactly.
- **Cost units and costs** — `cost_unit` must be confirmed per rule (observed
  `STC` for paid rules, `request` for the public definitions rule); costs
  re-verified at design time, never assumed from this memo.
- **Input parameters and defaults** — the full parameter set per route (the §4.0
  extraction was partial and must not be relied on).
- **API default limits and max limits** per route.
- **MCP safe default limits and hard max limits** per route — designed fresh,
  always-sent explicit limits, fail-closed on out-of-range, no sweep mode.
- **Response schemas or unconstrained JSON** — what shape each route returns and
  what the wrapper preserves.
- **Latest vs history distinctions** — per family, including whether history
  ships at all in the first subset.
- **Freshness/staleness metadata** — weekdate/staleness fields per route.
- **Provenance metadata** — source endpoint, request id, and
  context-not-advice framing fields in `mcp_metadata`.
- **Row-count/limit metadata** — effective limit sent and rows returned, as in
  §16.3.
- **Whether definitions can be static/public resources** — and if so, the
  fetch-on-request, credential-free resource pattern applies.
- **No secrets** — verification is credential-free; no key used, requested,
  inspected, printed, logged, or stored.
- **No live paid calls** — none, unless separately authorized later in the
  validation-report stage.
- **No tool count/resource count changes unless explicitly justified** — the
  memo must state the exact intended before/after counts per mode and justify
  every change.

## 10. Proposed PR sequence

Consistent with the Phase 5B/5C cadence (selection → design/contract → mock-only
implementation → validation plan → validation report → signoff):

| PR | Scope |
| --- | --- |
| **PR #49** | Phase 5D MCP launch capability roadmap and available endpoint selection memo (this document). Docs-only; one README documentation-index link; no runtime change. |
| **PR #50** | Market-context layer design and contract memo — verifies §9 for the eight candidate routes; decides tools vs resources, paid vs public, latest vs history, limits, caps, mirrors, provenance; authorizes nothing by itself. Docs-only. |
| **PR #51** | Mock-only implementation foundation for the approved Phase 5D market-context subset — gated registration, explicit allowlist promotions, family-scoped mirrors, limit safety; mocked tests only; no live call, no real key. |
| **PR #52** | Controlled validation plan — operator-supervised, one-off procedure, checklists, assertions, rollback. No live run. |
| **PR #53** | Controlled validation report — only if a live validation is separately authorized and performed under PR #52's plan, followed by rollback. |
| **PR #54** | Production-readiness signoff — narrow, controlled-local-stdio-operator-use declaration, only if the report passes and independent review is complete. |

Then later, each as its own full sequence on the same cadence:

- **Decision/evaluate-symbol sequence** (Phase 5E: selection/design → mock-only
  implementation → plan → report → signoff).
- **Portfolio/evaluate and portfolio/compare sequence** (Phase 5F).
- **Portfolio/construct sequence** (Phase 5G, only if still desired after the
  heavier authority-boundary review).
- **Intelligence Agent artifact sequence** — once artifact production is stable
  and the free surfaces verify healthy credential-free.
- **Remote MCP / x402 architecture sequence** — a separate architecture/security
  track with its own review chain.

## 11. Explicit non-goals

This memo and the Phase 5D track explicitly do **not** include:

- **No implementation in this memo** — selection/roadmap only.
- **No decision/evaluate-symbol implementation yet** (Phase 5E at the earliest).
- **No portfolio implementation yet** (evaluate/compare are Phase 5F at the
  earliest).
- **No portfolio construction yet** (Phase 5G at the earliest, after heavier
  review).
- **No Intelligence Agent editorial artifact implementation yet** — deferred
  until artifact outputs are actually available and stable.
- **No `selections/history` and no `selections/published/*`** — unchanged from
  the Phase 5C signoff; they remain deferred and denied.
- **No remote MCP** — local stdio only.
- **No x402 / wallet / OAuth / `Authorization: Bearer` / payment-header
  behavior.**
- **No paid validation** — no live paid call is performed or authorized by this
  memo.
- **No prompts** — zero MCP prompts in every mode.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No advice** — no buy/sell/hold/allocation/risk/suitability output.
- **No bulk scans** — no universe sweeps, pagination loops, exchange iteration,
  or multi-call assembly in any future family.
- **No local recomputation** — no regime, breadth, leadership, decision,
  selection, indicator, ST-IM, or portfolio math in the adapter, ever.

## 12. Final recommendation

- **Recommend Phase 5D proceed to a design/contract memo (PR #50) for the
  currently available market-context endpoints: market regime, breadth, and
  leadership.** These are available now, verified to exist credential-free
  (§4.0), lowest-advice-risk among the available paid candidates, foundational
  for retail trading agents, and the natural complement to the proven ST-IM,
  indicators, and selections/latest families.
- **Do not authorize implementation yet.** This memo authorizes no code, no tool
  or resource registration, no allowlist promotion, and no live validation.
  PR #50 must verify the §9 contract facts first, and PR #51 remains a separate,
  reviewed step after that.
- **Require Codex review before merge** of the security-sensitive PRs in the
  sequence (the design/contract memo's limit and boundary design, the
  implementation foundation, and any validation report), as in Phases 4, 5B,
  and 5C.
- **Require future implementation to preserve the thin-adapter and authority
  boundaries** (§8) unchanged — the API authors every output; the MCP forwards
  verbatim, fails closed, and never recomputes or advises.
- **Defer decision and portfolio endpoints to later subphases** (5E:
  evaluate-symbol; 5F: portfolio evaluate/compare; 5G: construct, if still
  desired) — each after the market-context layer is signed off, each with its
  own design/security memo, and construct only after the heaviest review.
- **Defer Intelligence Agent artifacts until artifact outputs are actually
  available and stable** — they are strategically important but must not gate or
  headline the launch.
- **Defer remote MCP / x402 / wallet / OAuth to a separate architecture review
  track** — never an incremental data-phase add-on.

Nothing in this memo declares the selected endpoints safe for implementation.
That determination belongs to PR #50's contract verification and the reviews
that follow it. Readiness today is exactly this: the routes exist, the pricing
rules exist, the pattern is proven three times, and the staged path to a
launch-quality MCP surface is defined above.
