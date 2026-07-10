# Phase 5B Indicators and Instrument Resolution Contract Verification Memo

Verification date: 2026-07-10

Status: **Contract-verification memo only.** This memo verifies the open contract
blockers left by
[`PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md`](PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md)
(PR 37) using existing repository docs **plus credential-free public API contract
checks**, and decides whether the next implementation PR may proceed as a
**mock-only** foundation. It **authorizes no implementation.** No `src/` change,
no `tests/` change, no `README.md` change, no `package.json` /
`package-lock.json` change, no MCP tool added, no MCP prompt added, no MCP
resource added, and no runtime behavior change is performed or authorized here.

**No API key or auth header was used, requested, inspected, printed, logged, or
stored.** The only live traffic performed was **credential-free** HTTP `GET`
requests to **public metadata / discovery endpoints** (`/v1/openapi.json`,
`/v1/pricing/catalog`) and the **public** instrument discovery endpoints
(`/v1/instruments/lookup`, `/v1/instruments/resolve`), recorded in §2. **No paid
indicators endpoint was called** (not even credential-free), no `401`/`402`/`403`
was bypassed, no paid execution occurred, and no MCP Inspector session was run.

This memo builds on and does not supersede:

- [`PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md`](PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md)
  — the PR 37 design/contract memo whose §13 preconditions this memo verifies.
- [`PHASE5B_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5B_NEXT_CAPABILITY_SELECTION_MEMO.md)
  — the PR 36 selection memo that named indicators latest/history as the
  conditional preferred family and instrument resolution as its prerequisite.
- [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
  — the confirmed ST-IM/indicators route/auth/schema contract (source-read).
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved paid gate policy, wrapper, and no-retry posture indicators reuse.
- [`PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md`](PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md)
  — the static pricing mirror / live catalog reconciliation fail-closed semantics.
- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md),
  [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md),
  [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — the boundary, mapping, and security
  model this verification is bounded by.

## 1. Purpose and scope

PR 37 selected indicators latest/history as the conditional next paid family and
the internal credential-free instrument resolver as its prerequisite, but blocked
implementation until a specific set of contract items was verified. This memo:

- **verifies** those blockers as far as existing repo docs plus credential-free
  public API contract checks allow, and
- **decides** whether the next implementation PR may proceed **mock-only** or
  whether further contract work is still required.

This memo explicitly does **not**:

- implement anything, or authorize implementation by itself;
- add or change MCP tools, resources, or prompts, or change any tool count;
- change runtime behavior, gates, caps, preflight, or reconciliation logic;
- change `src/`, `tests/`, `README.md`, `package.json`, or `package-lock.json`;
- use, request, inspect, print, log, or store any secret or API key;
- call any paid endpoint, perform paid execution, or run MCP Inspector;
- bypass or defeat any `401`/`402`/`403` response.

**Credential-free public API checks are allowed and are recorded here (§2).**
They constitute the new evidence this memo adds over PR 37.

## 2. Verification method

All live checks were **credential-free** HTTP `GET` requests issued with `curl`
(no `-u`, no `--netrc`, no `Authorization` header, no `X-API-Key` header, no
payment/wallet header). No environment API key was referenced. Response bodies
were saved to a session scratchpad for structural inspection only; **only
redacted/summarized shapes are reproduced below** — no full OpenAPI or catalog
document is pasted, and no secrets appear because none were sent or returned.

| # | Timestamp (UTC) | Method + endpoint (no key) | Purpose | Result |
| --- | --- | --- | --- | --- |
| 1 | 2026-07-10T11:29:15Z | `GET /v1/pricing/catalog` | Indicators + instrument pricing rules | `HTTP 200` |
| 2 | 2026-07-10T11:29:26Z | `GET /v1/openapi.json` | Indicators + instrument schemas, limit bounds | `HTTP 200` (~172 KB) |
| 3 | 2026-07-10T11:31:04Z | `GET /v1/instruments/lookup?symbol=IBM` | Lookup shape / hyphen form / no-key | `HTTP 200`, `count=2` |
| 4 | 2026-07-10T11:31:04Z | `GET /v1/instruments/lookup?symbol=TD` | Ambiguous-symbol lookup | `HTTP 200`, `count=2` |
| 5 | 2026-07-10T11:31:04Z | `GET /v1/instruments/resolve?symbol=IBM` | Resolve bare symbol / no-key | `HTTP 200`, single |
| 6 | 2026-07-10T11:31:04Z | `GET /v1/instruments/resolve?symbol=TD` | Resolve ambiguous bare symbol | `HTTP 200`, single (auto-picked) |
| 7 | 2026-07-10T11:31:04Z | `GET /v1/instruments/resolve?symbol_exchange=IBM-N` | Resolve canonical identity | `HTTP 200`, single |
| 8 | 2026-07-10T11:31:59Z | `GET /v1/instruments/resolve?symbol=TD&prefer_exchange=T` | Prefer non-default exchange | `HTTP 200`, `TD-T` |
| 9 | 2026-07-10T11:31:59Z | `GET /v1/instruments/resolve?symbol=TD&prefer_exchange=Q` | Force unresolved ambiguity | **`HTTP 409`** + matches |
| 10 | 2026-07-10T11:31:59Z | `GET /v1/instruments/resolve?symbol=TD&prefer_exchange=` | Empty exchange | `HTTP 400` (invalid exchange) |
| 11 | 2026-07-10T11:31:59Z | `GET /v1/instruments/resolve?symbol=ZZZZQ` | No-match resolve | `HTTP 404` |
| 12 | 2026-07-10T11:31:59Z | `GET /v1/instruments/lookup?symbol=ZZZZQ` | No-match lookup | `HTTP 404` |
| 13 | 2026-07-10T11:31:59Z | `GET /v1/instruments/resolve` | Missing required inputs | `HTTP 400` |

Base origin: `https://api.stocktrends.com` (the ADR-008 default; the OpenAPI
`servers` block is `/v1`, so relative paths such as `/indicators/latest` resolve
to `/v1/indicators/latest`). Consistent with the credential-free no-key precedent
recorded in [`PHASE1_IMPLEMENTATION_NOTES.md`](PHASE1_IMPLEMENTATION_NOTES.md).

**No-key posture confirmation.** Every request above completed with **no API key
and no auth header sent**. The paid indicators endpoints (`/v1/indicators/latest`,
`/v1/indicators/history`) were **deliberately not called at all** — their
auth/paid status is verified from the catalog, the OpenAPI, and the Phase 4
source-read contract memo, honoring PR 37 §15 (“no call to `/v1/indicators/*`”)
and this task's endpoint allow-list.

## 3. Items to verify from PR 37

| # | Contract item | Source of truth | Finding (redacted) | Status |
| --- | --- | --- | --- | --- |
| 1 | Indicators **latest** path/method | OpenAPI #2; Phase 4 memo §6 | `GET /v1/indicators/latest` present | **Verified** |
| 2 | Indicators **history** path/method | OpenAPI #2; Phase 4 memo §6 | `GET /v1/indicators/history` present | **Verified** |
| 3 | Indicators auth requirement | Catalog #1; OpenAPI #2 | `access_type=paid`, `requires_payment=true` | **Verified** |
| 4 | Indicators pricing rule ids | Catalog #1 | `indicators_latest_paid`, `indicators_history_paid` | **Verified** |
| 5 | Indicators live cost values + units | Catalog #1 | latest `0.0035 STC`; history `0.01 STC` | **Verified** |
| 6 | Indicators history default/max `limit` | OpenAPI #2 | `default=260`, `min=1`, `max=2600` | **Verified** |
| 7 | Indicators request schema | OpenAPI #2 | see §5 | **Verified** |
| 8 | Indicators response schema/class | OpenAPI #2; Phase 4 memo §6 | `200` free-form (no response model); `422` `HTTPValidationError` | **Partially verified** |
| 9 | `/v1/instruments/lookup` path/method | OpenAPI #2 | `GET /v1/instruments/lookup` present | **Verified** |
| 10 | `/v1/instruments/resolve` path/method | OpenAPI #2 | `GET /v1/instruments/resolve` present | **Verified** |
| 11 | No-key/free behavior lookup+resolve | Catalog #1; live #3–13 | `access_type=public`, cost `0.0`; live `200` with no key | **Verified** |
| 12 | Lookup request schema | OpenAPI #2 | `symbol` **required**; `cs_only`, `limit(1..500,d=50)`, `details` | **Verified** |
| 13 | Lookup response shape | live #3–4 | `{request_id, symbol, cs_only, details, count, data[], hint}` | **Verified** |
| 14 | Resolve request schema | OpenAPI #2 | `symbol_exchange` \| `symbol`+`exchange`; `prefer_exchange(d=N)`, `cs_only`, `details` | **Verified** |
| 15 | Resolve success response shape | live #5–8 | single instrument object incl. `symbol_exchange`, `resolved_by`, `prefer_exchange` | **Verified** |
| 16 | Resolve ambiguity `409` + matches | live #9 | `409 {detail:{request_id,error,symbol,matches[],hint}}`; matches carry hyphen `symbol_exchange` | **Verified (with caveat, §6.3)** |
| 17 | `symbol_exchange` hyphen form | live #3–9 | `IBM-N`, `TD-N`, `TD-T` | **Verified** |
| 18 | Error behavior: no-match / invalid | live #10–13 | `404` no-match; `400` invalid/missing input; `422` param validation | **Verified** |

## 4. Pricing / catalog verification

Credential-free `GET /v1/pricing/catalog` (#1, 2026-07-10T11:29:15Z). Redacted to
the four relevant rules:

| Rule id | Endpoint | Cost | Unit | Access | requires_payment | Rails |
| --- | --- | --- | --- | --- | --- | --- |
| `indicators_latest_paid` | `/v1/indicators/latest` | `0.0035` | `STC` | paid | `true` | `subscription, x402, mpp` |
| `indicators_history_paid` | `/v1/indicators/history` | `0.01` | `STC` | paid | `true` | `subscription, x402, mpp` |
| `instruments_lookup_public` | `/v1/instruments/lookup` | `0.0` | `request` | public | `false` | — |
| `instruments_resolve_public` | `/v1/instruments/resolve` | `0.0` | `request` | public | `false` | — |

- **Both indicators rules exist**, are `access_type=paid`, carry a nonzero
  `stc_cost`/`cost_per_request`, and report `cost_unit=STC` (the catalog's
  `pricing_note` states “STC is the pricing source of truth; payment rails
  translate this STC amount,” and `estimated_usd_cost` mirrors the STC value).
- **Endpoint association is present** (`endpoint_pattern`), `endpoint_family=indicators`.
- **Values are sufficient to define a fresh, family-specific static pricing
  mirror** for `indicators_latest_paid` (`0.0035 STC`) and
  `indicators_history_paid` (`0.01 STC`) that will reconcile cleanly against this
  live catalog — no ambiguity remains on the pricing values.
- **Both instrument endpoints are catalog-classified `public`** (`0.0`,
  `requires_payment=false`, `requires_subscription=false`), corroborating the
  free/no-key posture verified live in §6.

Explicit reaffirmations (per the pricing mirror correction memo):

- **ST-IM pricing values do not transfer.** The ST-IM mirror (`stim_latest_paid`
  `0.0025`, `stim_history_paid` `0.0075`) is unrelated to the indicators values
  above; a **separate** indicators mirror must be defined from these figures.
- **Static pricing alone does not authorize a call.** The static mirror is a
  local safety basis only; a paid call is authorized only after live-catalog
  reconciliation succeeds.
- **Catalog reconciliation must still fail closed at runtime** on missing rule,
  ambiguous rule, cost mismatch, unsupported unit, or catalog unavailability —
  exactly the `pricing_catalog_reconciliation_failed` posture already proven for
  ST-IM. The verified values do not weaken that gate; they only make the mirror
  seed correct.

## 5. OpenAPI / schema verification

Credential-free `GET /v1/openapi.json` (#2, 2026-07-10T11:29:26Z). Redacted to the
four endpoints (parameter names, requiredness, bounds, response references only):

**`GET /v1/indicators/latest`**

- Params: `symbol_exchange` (string\|null, optional), `symbol` (string\|null,
  optional), `exchange` (string\|null, optional), `cs_only` (boolean, default
  `true`).
- Responses: `200` free-form (no declared response model), `422`
  `HTTPValidationError`.

**`GET /v1/indicators/history`**

- Params: `symbol_exchange`, `symbol`, `exchange` (all string\|null, optional),
  `cs_only` (boolean, default `true`), `start` (string\|null), `end`
  (string\|null), **`limit` (integer, default `260`, minimum `1`, maximum
  `2600`)**.
- Responses: `200` free-form, `422` `HTTPValidationError`.

**`GET /v1/instruments/lookup`**

- Params: **`symbol` (string, required)**, `cs_only` (boolean, default `true`),
  `limit` (integer, default `50`, minimum `1`, maximum `500`), `details`
  (boolean, default `false`).
- Responses: `200` free-form, `422` `HTTPValidationError`.

**`GET /v1/instruments/resolve`**

- Params: `symbol_exchange` (string\|null), `symbol` (string\|null), `exchange`
  (string\|null), **`prefer_exchange` (string, default `N`)**, `cs_only`
  (boolean, default `true`), `details` (boolean, default `false`).
- Responses: `200` free-form, `422` `HTTPValidationError`.

Recorded outcomes:

- **Parameters and required fields**: verified for all four (above). Only
  `/v1/instruments/lookup`'s `symbol` is a hard-required query param; indicators
  and resolve use the `symbol_exchange` **or** `symbol`+`exchange` model enforced
  at runtime rather than by a single `required` flag.
- **Allowed exchange codes**: the live `400` body (#10) states
  `Must be one of ['A', 'B', 'I', 'N', 'Q', 'T']`, confirming the design memo's
  `{N,Q,A,B,T,I}` allowlist against the live API.
- **History `limit` bounds**: **documented and verified** as `default 260 / min 1
  / max 2600`. PR 37 flagged “do not assume ST-IM bounds transfer”; the OpenAPI
  confirms they happen to coincide with ST-IM's `260`/`2600` — now **verified**
  rather than assumed.
- **Response schema references / examples**: indicators and instrument `200`
  responses are **free-form** in the OpenAPI (no `$ref` response model), so
  response field names are not machine-declared there. Indicators field lists are
  taken from the Phase 4 source-read memo §6; instrument response shapes are taken
  from the **observed live public responses** in §6. Because the `200` response
  schema is not formally declared, item #8 (indicators response class) is marked
  **partially verified** — sufficient to design a verbatim `api_data` passthrough
  wrapper, but exact per-field response metadata should be re-observed at
  implementation time (as already required for ST-IM §12).

## 6. Instrument lookup/resolve live no-key verification

All requests credential-free (#3–13). Summarized shapes only.

### 6.1 Lookup (`GET /v1/instruments/lookup`)

- `symbol=IBM` → `200`; `symbol=TD` → `200`; **no key accepted** in both.
- Envelope: `{request_id, symbol, cs_only, details, count, data[], hint}`.
- Each `data[]` item: `{symbol, exchange, type, currency, name, shortname,
  gm_industry_id, x_sector_name, industry_id, symbol_exchange}`.
- **`symbol_exchange` is returned in hyphen form** (e.g. `IBM-N`), and the
  response `hint` text itself states: *“Use symbol_exchange (e.g. IBM-N) or
  symbol+exchange …”*.
- **Both `IBM` and `TD` returned `count=2`** — i.e. lookup surfaces the full
  cross-exchange match set and is the natural ambiguity-display path.
- No-match (`symbol=ZZZZQ`) → **`404`** (#12).

### 6.2 Resolve success (`GET /v1/instruments/resolve`)

- `symbol=IBM` → `200` single object `{…, symbol_exchange: IBM-N, exchange: N,
  resolved_by: prefer_exchange, prefer_exchange: N, request_id}`.
- `symbol_exchange=IBM-N` → `200` single object (canonical direct resolution; no
  `resolved_by`/`prefer_exchange` keys present).
- `symbol=TD&prefer_exchange=T` → `200` → `TD-T` (Toronto listing).
- **Canonical `symbol_exchange` input resolves deterministically** to exactly one
  instrument in hyphen form — this is the safe path the MCP adapter should use
  once a canonical identity already exists.

### 6.3 Resolve ambiguity — verified, with a material caveat

- `symbol=TD&prefer_exchange=Q` → **`409`** with body
  `{detail: {request_id, error, symbol, matches[], hint}}`, where `matches[]`
  carries hyphen `symbol_exchange` keys (`["TD-N", "TD-T"]`). **This confirms the
  PR 37 owner-stated “409 with matches” ambiguity contract**, including the exact
  status and the presence of a `matches` array of hyphen keys.

- **Caveat (new, design-shaping finding).** Resolve does **not** fail closed on a
  bare ambiguous symbol by default. `prefer_exchange` defaults to `N`, so a bare
  `symbol=TD` (which lookup shows is ambiguous, `count=2`) resolved to **`TD-N`
  with `resolved_by: prefer_exchange`** and `HTTP 200` — i.e. the API **silently
  selected the US (`N`) listing**. `409` only occurred when `prefer_exchange` (`Q`)
  matched **none** of the candidate exchanges.

  This directly implicates PR 37 §6/§10's **“no exchange guessing / no defaulting
  to a US or Canadian exchange.”** Calling `/instruments/resolve` with a bare
  symbol and the default `prefer_exchange=N` would let the API pick an exchange on
  the MCP server's behalf — the exact behavior the design forbids. **Therefore the
  credential-free resolver must not rely on resolve's default `prefer_exchange`
  auto-pick for bare symbols.** It must instead detect ambiguity itself — e.g. via
  `/instruments/lookup` (`count > 1`) — and **fail closed with the candidate
  matches**, or treat a resolve result whose `resolved_by == prefer_exchange` on a
  multi-match symbol as ambiguous. Resolve remains the safe path only when a
  canonical `symbol_exchange` (or a `symbol`+`exchange` pair the caller
  explicitly supplied) is already present.

### 6.4 Error / invalid-input behavior

- `resolve?symbol=TD&prefer_exchange=` (empty) → **`400`**,
  `{detail: "Invalid exchange ''. Must be one of ['A','B','I','N','Q','T']"}`.
- `resolve` (no `symbol`/`symbol_exchange`) → **`400`**,
  `{detail: {request_id, error, message}}`.
- `resolve?symbol=ZZZZQ` → **`404`**, `{detail: {request_id, error, symbol}}`.
- Parameter-type violations surface as **`422` `HTTPValidationError`** (OpenAPI).

No response dumps beyond the summarized key sets above are included, and no
secrets are present (none were sent or returned).

## 7. Contract verification outcome

| Blocker (PR 37 §13) | Classification |
| --- | --- |
| Exact indicators contract (route/method/auth/inputs/response) | **Verified** (response class **partially verified**, §5 #8) |
| Indicators endpoint-specific pricing/catalog values + units | **Verified** (`0.0035` / `0.01 STC`) |
| Indicators history `limit` bounds | **Verified** (`260` / `1` / `2600`) |
| Exact instrument lookup/resolve contract (path/method/no-key/inputs/outputs/hyphen) | **Verified** |
| Exact `/v1` path for indicators + instrument endpoints | **Verified** (OpenAPI `servers=/v1`) |
| Indicators pricing catalog rule ids | **Verified** |
| Request schemas (indicators + instruments) | **Verified** |
| Response schemas (indicators rows/envelope; instrument bodies) | **Verified** for instruments (observed); **partially verified** for indicators (free-form `200`) |
| `/instruments/resolve` `409` ambiguity status + matches shape | **Verified, with the §6.3 `prefer_exchange` caveat** |
| Public-instrument-tools vs internal-only decision | **Resolved by PR 37** (internal-only first) — not a verification item |

**Conclusion: the contract blockers are sufficiently verified for the next
implementation PR (PR 38) to proceed as a mock-only foundation.** No blocker
remains classified *unresolved* or *blocked*. The single non-trivial refinement
is the §6.3 `prefer_exchange` caveat, which **shapes the resolver design** but
does **not** require further live contract work — it is fully characterized above.

## 8. Updated implementation implications

With the blockers verified, PR 38 may implement, **mock-only**:

- **Internal credential-free resolver first** (PR 37 §8 option A): a shared,
  credential-free resolution helper used **before** any paid boundary. Because of
  §6.3, the resolver's ambiguity detection must **not** depend on
  `/instruments/resolve`'s default `prefer_exchange=N` auto-pick for bare symbols;
  it must use `/instruments/lookup` (`count > 1`) or an equivalent explicit check
  and **fail closed with candidate matches**, using `/instruments/resolve` for
  deterministic resolution only when a canonical `symbol_exchange` (or an
  explicit `symbol`+`exchange`) already exists.
- **Indicators paid pair** `stocktrends_get_indicators_latest` /
  `stocktrends_get_indicators_history`, registered together, gated behind
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` + configured `STOCKTRENDS_API_KEY`, reusing
  the proven Phase 4 gated-adapter, family-specific static mirror
  (`0.0035`/`0.01 STC`), live-catalog reconciliation, caps, preflight, and
  no-retry posture.
- **Paid-exposed tool count 3 → 5.** Adds the two indicators tools to the existing
  three; behavior (not count) still changes with execution enablement.
- **Default/free surface remains exactly one** (`stocktrends_estimate_workflow_cost`)
  because option A adds **no** public instrument tools. (Option B would raise the
  free count and require README/doc updates — it remains a separate, unapproved
  decision.)
- **No live paid validation** in PR 38; **mock-only tests** (mocked catalog,
  mocked resolve/lookup, mocked paid fetch), including ambiguity fail-closed,
  `prefer_exchange` non-reliance, reconciliation success/mismatch, and cap denial.

No blocker remains that must be resolved before PR 38; the §6.3 caveat is an input
to the resolver design, already fully specified here.

## 9. Fail-closed requirements (reaffirmed)

Implementation must preserve every fail-closed invariant unchanged:

- **No raw-symbol-only identity** — canonical `symbol_exchange` remains the key.
- **No exchange guessing / defaulting** — and, per §6.3, **no reliance on
  `/instruments/resolve`'s default `prefer_exchange=N`** to silently choose an
  exchange for a bare ambiguous symbol.
- **No paid request before a safe canonical identity** exists.
- **No cap debit before resolution** completes.
- **No auth header before resolution** completes.
- **No fabricated `observed_cost` / `payment_status`** — remain `null`/absent
  unless the API actually returns them.
- **No automatic retries** — exactly one attempt per authorized call.
- **No x402 / wallet / OAuth / `Authorization: Bearer` fallback / remote MCP /
  database / control-plane / investment advice.**

## 10. Proposed next PR

**Recommended: the next PR is the mock-only implementation foundation** (the PR 38
scope in PR 37 §14) — internal credential-free resolver + indicators paid pair,
family-specific pricing mirror + reconciliation, caps, preflight, mocked tests
only; no live validation, no real API key, no x402, no paid endpoint call.

The §6.3 `prefer_exchange` caveat is a **resolver design input**, not a separate
verification PR and not a docs-correction blocker: PR 37's §7 resolution flow
remains valid provided step (c) is read together with §6.3 of this memo (detect
ambiguity via lookup / do not trust resolve's default auto-pick). A one-line
clarification could optionally be folded into the PR 38 implementation notes, but
no standalone contract-verification or docs-correction PR is required first.

## 11. Non-goals

- **No implementation** in this memo — verification only.
- **No API keys** used, requested, inspected, printed, logged, or stored.
- **No paid calls** — the paid `/v1/indicators/*` endpoints were not called at all.
- **No MCP Inspector** session.
- **No runtime behavior changes** — `src/`, `tests/`, `README.md`,
  `package.json`, `package-lock.json` untouched.
- **No public instrument tools** — option B remains a separate, unapproved
  decision; this memo verifies contracts only and keeps the free surface at one.
- **No live paid validation** — deferred to a later, separately approved,
  operator-supervised step.

## 12. Final recommendation

**Implementation is unblocked.** The indicators pricing/catalog values
(`indicators_latest_paid` `0.0035 STC`, `indicators_history_paid` `0.01 STC`),
the indicators history `limit` bounds (`260`/`1`/`2600`), the exact `/v1`
indicators and instrument paths and methods, the credential-free/no-key behavior
of `/v1/instruments/lookup` and `/v1/instruments/resolve`, the request/response
shapes, the hyphen `symbol_exchange` form, and the `/instruments/resolve` `409`
ambiguity body with `matches` are all verified against the live public API.

The next PR may proceed as the **mock-only implementation foundation** (internal
credential-free resolver first, indicators paid pair, paid-exposed count 3 → 5,
free count staying at 1, mock-only tests, no live validation), **provided the
resolver honors the §6.3 finding**: it must detect ambiguity itself and fail
closed with candidate matches rather than relying on `/instruments/resolve`'s
default `prefer_exchange=N` auto-selection. All Phase 4 fail-closed and
no-payment-rail invariants remain in force unchanged.
