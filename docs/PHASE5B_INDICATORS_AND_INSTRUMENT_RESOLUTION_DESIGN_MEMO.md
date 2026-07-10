# Phase 5B Indicators and Instrument Resolution Design and Contract Memo

Design date: 2026-07-10

Status: **Architecture / design and contract-verification memo only.** This memo
selects **indicators latest/history** as the next paid tool family and defines
the **instrument identity / resolution** design that any stock-specific paid
family must satisfy first. It **authorizes no implementation on its own.** No
`src/` change, no `tests/` change, no `README.md` change, no `package.json` /
`package-lock.json` change, no MCP tool added, no MCP prompt added, no MCP
resource added, no endpoint call, no MCP Inspector session, and no API key used,
requested, inspected, printed, logged, or stored is performed or authorized by
this memo. Nothing here changes runtime behavior or the visible MCP surface.

**Conditional authorization.** This memo may only authorize a subsequent
implementation PR (PR 38) if **all** required contract items in §4, §5, and §13
are sufficiently verified from existing repository docs and owner-provided facts.
Where an item is not contract-verified to the standard applied to ST-IM in
[`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md),
it is explicitly marked **"requires contract verification before implementation"**
and is treated as a blocker / implementation precondition. As drafted, unresolved
blockers remain (indicators endpoint-specific pricing/catalog reconciliation; the
full instrument lookup/resolve contract). Therefore this memo does **not** clear
PR 38 to implement; see §14 and §16.

This memo builds on and does not supersede:

- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) — accepted ADRs
  (source authority ADR-001, authority boundary ADR-002, artifact route
  canonicality ADR-003/004, disabled-by-default paid surface ADR-005/006/012,
  stdio-only posture, default API base URL ADR-008).
- [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) — the local stdio
  server architecture, public-resource model, and candidate tool mappings.
- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) — the
  read-only audit of front-facing API capabilities and their public/paid status.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — the conservative security model,
  including paid live-execution flags, caps, preflight, and secret handling.
- [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
  — the confirmed ST-IM contracts and the recorded contract status of indicators,
  selections, and guidance/research families.
- [`PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md`](PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md)
  — the preflight / gate blueprint.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved paid ST-IM design, gate policy, wrapper, error taxonomy, and
  live-validation policy this memo mirrors for indicators.
- [`PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md`](PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md)
  — the static pricing mirror / live catalog reconciliation behavior and its
  fail-closed semantics.
- [`PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md`](PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md)
  — the Phase 4 closeout enumerating Phase 5 candidate paths.
- [`PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md`](PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md)
  and
  [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the completed Phase 5A operator-readiness documentation set.
- [`PHASE5B_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5B_NEXT_CAPABILITY_SELECTION_MEMO.md)
  — the selection memo (PR 36) that recommended this phase and named indicators
  latest/history as the conditional preliminary preferred family (its PR 37 is
  this document).

## 0. Architecture boundary (unchanged)

Phase 5B preserves — and must not weaken — the controlling authority boundary
from ADR-002:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a **thin local stdio adapter over the front-facing Stock
Trends API**. Indicators exposure and instrument resolution must not turn the
adapter into a second source of truth, a pricing or payment authority, a database
or control-plane client, a recomputation layer, or an advice generator. Indicator
rows and instrument lookup/resolve results are **API-authored**; the adapter
forwards them and attaches only transparent provenance metadata.

## 1. Purpose and scope

This is an architecture/design and contract-verification memo. Its job is to (a)
confirm whether **indicators latest/history** can be the next paid tool family,
(b) define the **instrument identity/resolution** design that must precede any
stock-specific paid implementation, and (c) enumerate the contract items that a
later implementation PR must have verified before any code is written.

This memo explicitly does **not**:

- implement anything, or authorize any implementation by itself;
- add MCP tools, resources, or prompts, or change the tool count in any mode;
- change runtime behavior, gates, caps, preflight, or reconciliation logic;
- change `src/`, `tests/`, `README.md`, `package.json`, or `package-lock.json`;
- make any live API call or run MCP Inspector;
- use, request, inspect, print, log, or store any secret or API key;
- claim live verification of any endpoint, or call `/v1/indicators/*`,
  `/instruments/lookup`, or `/instruments/resolve`;
- authorize any new tool or behavior on its own — a later, separately reviewed
  implementation PR (PR 38) must precede any implementation, and only if this
  memo's preconditions (§13) are satisfied.

## 2. Current approved state

Drawn from the Phase 4 closeout, the Phase 4 paid ST-IM live-execution memo, the
pricing mirror correction memo, the Phase 5A set, and the Phase 5B selection memo:

- **Phase 4 paid ST-IM latest/history is implemented and live-validated.** The
  paired `stocktrends_get_stim_latest` / `stocktrends_get_stim_history` tools are
  implemented, pricing-corrected (static mirror reconciled to live catalog:
  `stim_latest_paid` `0.0025 STC`, `stim_history_paid` `0.0075 STC`), and were
  live-validated once under operator supervision with rollback to default free
  mode. The gated paid-adapter pattern is proven end to end.
- **Phase 5A operator-readiness documentation is complete** — free/default
  quickstart, paid-mode configuration, MCP Inspector validation runbook, and
  operator-safety/release checklist have landed on `main`.
- **The Phase 5B selection memo (PR 36) recommends the next paid tool family**
  (candidate B) as the next phase, with **indicators latest/history** as the
  **conditional preliminary preferred family**, subject to contract verification.
- **Instrument identity/resolution is a mandatory prerequisite** before any
  stock-specific paid implementation (selection memo §8, §9). No stock-specific
  family may begin implementation until the endpoint contract **and** the
  instrument-resolution contract are confirmed.
- **The server remains local `stdio` only.** No remote HTTP/SSE/Streamable HTTP.
- **Default/free surface is exactly one tool:**
  `stocktrends_estimate_workflow_cost` (workflow-level `GET /v1/cost-estimate`,
  credential-free, `paid_execution_authorized` always `false`).
- **Paid-exposed surface is exactly three tools:**
  `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`,
  `stocktrends_get_stim_history`. Execution-enabled paid mode changes call
  behavior, not tool count.
- **Public resources remain credential-free** in every mode.
- **Zero MCP prompts.**
- **No dynamic registration** — no tool or resource is registered from
  `/v1/ai/tools` or `/v1/workflows`; tool/endpoint/pricing metadata is static and
  reconciled against the live catalog at call time.
- **No x402, wallet, OAuth, `Authorization: Bearer` fallback, remote MCP,
  database, control-plane, or advice behavior** exists anywhere in the server.

## 3. Decision

- **Selected paid family: indicators latest/history** (`GET /v1/indicators/latest`,
  `GET /v1/indicators/history`), **subject to contract verification** of its
  endpoint-specific pricing/catalog reconciliation and history parameter bounds
  (§4). Route, method, auth, input model, and response class are already confirmed
  in the Phase 4 contract memo §6; the pricing/reconciliation specifics are not.
- **Selected instrument identity rule: canonical `symbol_exchange` remains the
  primary, unambiguous identity.** This is the same identity model the paid ST-IM
  tools already use (MCP underscore form `IBM_N`; API outbound hyphen form
  `IBM-N`).
- **Raw symbol convenience input may be supported only through credential-free
  safe resolution.** A bare ticker is never a primary key. If a raw symbol is
  supplied, it must be resolved to exactly one canonical `symbol_exchange`,
  credential-free, before any paid boundary is entered.
- **Ambiguous or unresolved raw symbols fail closed before any paid boundary.**
  On ambiguity — including `/instruments/resolve` returning `409` with matches —
  the server returns candidate matches and makes no paid call, constructs no auth
  header, and debits no cap.

This decision does **not** authorize implementation; it is the design PR 38 must
implement **only if** §13 preconditions are met.

## 4. Indicators family contract analysis

Grounded in [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
§6 and [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md). No
endpoint support is invented here. Items not confirmed to the ST-IM standard are
marked **"requires contract verification before implementation."**

| Contract item | Latest | History | Status |
| --- | --- | --- | --- |
| Endpoint candidate | `GET /v1/indicators/latest` | `GET /v1/indicators/history` | **Route confirmed** (Phase 4 memo §6). Re-verify `/v1` mount at implementation time. |
| Method | `GET` | `GET` | **Confirmed.** |
| Auth requirement | Protected/premium; `X-API-Key` subscription; machine-payment rails configured but **deferred for MCP**. | Same. | **Confirmed;** `X-API-Key` only for MCP. |
| Pricing rule id | `indicators_latest_paid` | `indicators_history_paid` | Rule **ids recorded** (policy provider). **Live catalog cost values are not recorded in repo docs** (the pricing mirror memo recorded ST-IM costs only) — **requires contract verification before implementation.** |
| Latest/history pairing rule | Paired family; latest never auto-calls history and vice versa. | Same. | **Design-confirmed** (history-beside-latest rule; Phase 4 live-execution memo §5). |
| Expected inputs | `symbol_exchange` **or** `symbol` plus `exchange`; optional `cs_only` (defaults true). | `symbol_exchange` **or** `symbol` plus `exchange`; optional `cs_only`, `start`, `end`, `limit`. | **Confirmed** input model (Phase 4 memo §6). |
| `symbol_exchange` / exchange handling | Same canonical identity model as ST-IM; exchange ∈ `{N,Q,A,B,T,I}`; API outbound hyphen form. | Same. | **Confirmed** for identity; see §6/§7 for resolution ordering. |
| History limits (default/max) | n/a | `start`/`end` window plus `limit`; **exact indicators default/max `limit` bounds are not recorded in repo docs** (unlike ST-IM's `260`/`2600`). | **Requires contract verification before implementation.** Do not assume ST-IM bounds transfer. |
| Response shape / wrapper | Latest indicator row dict with fields such as `weekdate`, `exchange`, `symbol`, `type`, `currency_code`, `trend`, `trend_cnt`, `mt_cnt`, `rsi`, `vol_tag`, `rvol`, price/change fields, `symbol_exchange`, `request_id`. No Pydantic response model. | Envelope with `request_id`, `symbol_exchange`, `cs_only`, `start`, `end`, `count`, `data` rows. | **Response class confirmed** (Phase 4 memo §6). Exact per-field response metadata headers **require contract verification** as for ST-IM §12. |
| Static pricing mirror requirement | A **fresh, family-specific** static mirror for `indicators_latest_paid`. | A **fresh, family-specific** static mirror for `indicators_history_paid`. | **Required.** The ST-IM mirror does not transfer. Values **require contract verification** (see pricing-rule row). |
| Live catalog reconciliation | Reconcile static mirror against live `GET /v1/pricing/catalog` credential-free before any paid call; fail closed on mismatch/absence. | Same. | **Required;** mirrors the corrected ST-IM behavior (pricing mirror memo §3). |
| Cap / budget semantics | Per-session and per-tool call caps; STC/USD budget caps; nonzero cost denied when no budget cap configured. | Same. | **Required;** reuse Phase 4 cap policy (§12 here). |
| Fail-closed conditions | Missing/ambiguous rule id, cost mismatch, unavailable catalog, unresolved/ambiguous symbol, unset caps → deny before auth/fetch. | Same. | **Required.** |
| Controlled validation | One-off, operator-authorized, operator-supervised, single call per tool, rollback to free mode; no live run in CI. | Same. | **Required;** mirrors Phase 4 live-validation policy. |

**Summary.** Indicators route/method/auth/input/response-class are contract-verified
enough to design against. The **endpoint-specific pricing/catalog reconciliation
values** and the **indicators history `limit` bounds** are **not** verified in
repo docs and are **implementation blockers** until confirmed against the live
front-facing API (credential-free catalog read for pricing; OpenAPI/route
confirmation for limit bounds), at implementation time.

## 5. Instrument endpoint contract analysis

The instrument endpoints are the resolution substrate for raw-symbol convenience
input. Facts are separated by source.

### 5.1 Existing repo-documented facts

- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) lists
  `/v1/instruments/lookup` ("Avoids symbol ambiguity before paid symbol calls")
  and `/v1/instruments/resolve` ("Produces canonical `symbol_exchange` inputs")
  under **"Additional v1 Candidates"** — i.e., *candidates*, not confirmed
  observed routes, and not verified to the ST-IM standard.
- [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) lists candidate tool
  mappings `stocktrends_lookup_instruments` → `GET /v1/instruments/lookup` and
  `stocktrends_resolve_instrument` → `GET /v1/instruments/resolve`, both marked
  **"Public planning helper"**, alongside an "Instrument resolution: lookup and
  resolve helpers" note. These are **candidate mappings**, not implemented tools.

### 5.2 Owner-provided facts (labelled as owner-identified)

> **Owner-provided API context (owner-identified; not repo-contract-verified).**
> Stock Trends instruments are **not identified safely by raw ticker symbol
> alone.** The canonical Stock Trends identity is **symbol + exchange**, because
> the same ticker may exist on Canadian and US exchanges.
>
> The API has two **free** instrument-discovery endpoints:
>
> - **`/instruments/lookup`** — looks up **all** instruments that match a symbol
>   across exchanges, using instrument metadata; returns `symbol_exchange` keys in
>   **hyphen** form such as `IBM-N`.
> - **`/instruments/resolve`** — returns **exactly one** instrument if it can be
>   resolved safely; if **ambiguous**, returns **`409` with matches**.

### 5.3 Unverified implementation preconditions

Each of the following **requires contract verification before implementation**
and must not be relied on by code until confirmed against the live front-facing
API (credential-free, no key), at implementation time:

| Item | Lookup | Resolve |
| --- | --- | --- |
| Exact path incl. `/v1` prefix | `/v1/instruments/lookup` is a **candidate** path; the `/v1` prefix is **assumed** from the audit's candidate listing and is **not proven**. | Same for `/v1/instruments/resolve`. |
| Method | Assumed `GET` (candidate mapping); **verify.** | Assumed `GET`; **verify.** |
| No-key / free requirement | Owner states free; **verify credential-free access** and fail-closed on `401`/`402`/`403`. | Same. |
| Input query schema | Symbol and API-defined filters (candidate mapping); **verify exact query params.** | `symbol_exchange` or symbol/exchange fields (candidate mapping); **verify.** |
| Output shape | Returns matching instruments with exchange context; `symbol_exchange` **hyphen** keys (owner); **verify field names.** | Returns exactly one instrument yielding canonical `symbol_exchange`; **verify field names.** |
| `symbol_exchange` hyphen form | Owner: `IBM-N`; **verify.** | Owner: canonical single result; **verify.** |
| `409` ambiguity behavior | n/a (lookup returns the list). | Owner: `409` with matches on ambiguity; **verify exact `409` body/shape.** |
| MCP exposure (tool vs resource vs internal helper) | Design decision — see §8. | Design decision — see §8. |

This memo does **not** claim these endpoints are implemented in the MCP server,
and makes **no live call** to them. They are **owner-identified endpoints
requiring contract verification before implementation.**

## 6. Instrument identity model

- **Canonical internal MCP identity: `symbol_exchange` with an underscore**, e.g.
  `IBM_N`. This is the primary, unambiguous key and matches the existing paid
  ST-IM tools' MCP input form.
- **API outbound identity: hyphen form**, e.g. `IBM-N`. The adapter converts the
  canonical underscore MCP form to the API hyphen form before building any query
  (the ST-IM separator reconciliation, Phase 4 live-execution memo §7.1), and
  preserves the API-returned hyphen `symbol_exchange` verbatim in `api_data`.
- **Raw symbol convenience input: `symbol`**, e.g. `IBM`. Optional, and **never a
  primary key**.
- **Precedence:** if both `symbol_exchange` and `symbol` are provided,
  **`symbol_exchange` takes precedence** and `symbol` is ignored for identity
  (a conflicting pair fails closed — see §10).
- **No exchange guessing.** The server never fabricates, defaults, or infers an
  exchange for a raw symbol.
- **No defaulting to a US or Canadian exchange.** There is no implicit market.
- **No recomputation of instrument metadata.** The adapter forwards API-authored
  lookup/resolve results; it does not re-derive, merge, or reinterpret them.

## 7. Resolution-before-paid execution flow

Ordering is strict. Every step must pass before the next; any failure is a
deterministic, fail-closed denial. This inserts a credential-free resolution
stage **ahead of** the Phase 4 paid preflight chain (Phase 4 live-execution memo
§7); it does not replace it.

1. **a. Validate tool input shape.** Strict schema (unknown keys rejected) at the
   SDK boundary. Reject arrays, multi-symbol, free-text, and unknown fields.
2. **b. If canonical `symbol_exchange` is provided:** validate syntax and that the
   exchange code ∈ `{N,Q,A,B,T,I}`. If valid, this **is** the canonical identity;
   skip resolution (steps c–f).
3. **c. If only raw `symbol` is provided:** call the **credential-free**
   `/instruments/resolve` (no `X-API-Key`, no auth header).
4. **d. If exactly one match:** derive the canonical `symbol_exchange` from the
   resolved instrument.
5. **e. If ambiguity / `409` / multiple matches:** return the candidate matches
   (optionally augmented by `/instruments/lookup`) and **fail closed** — no paid
   request.
6. **f. If no match or the resolve endpoint is unavailable:** **fail closed** — no
   paid request.
7. **g. Only after a safe canonical identity exists:** run pricing preflight,
   family-specific static-mirror **catalog reconciliation**, and cap/budget checks
   (the Phase 4 preflight chain), all still credential-free up to the auth
   boundary.
8. **h. Only after all gates pass:** construct the `X-API-Key` header inside the
   coupled paid-execution boundary and call the paid indicators endpoint exactly
   once (no retries).

Explicit invariants, all **before resolution completes**:

- **No API key** is read for outbound use.
- **No auth header** is constructed.
- **No cap debit** occurs.
- **No paid request** is made.
- **No `observed_cost` / `payment_status`** value is produced.
- **No paid request on ambiguity** — a `409`/multi-match never proceeds to a paid
  call under any configuration.

## 8. Tool surface design options

Whether the instrument lookup/resolve capability is exposed to clients, and how,
is a distinct decision from the indicators paid family. Four options:

### A. Internal-only instrument resolution helper

- **Benefits.** Smallest surface delta: default/free tool count stays **one**,
  paid-exposed stays **three** (plus the two new paid indicators tools when
  enabled). Credential-free resolver is a shared internal function used by paid
  tools before the paid boundary. No new README/doc tool obligations. Least
  operator confusion.
- **Risks.** Agents/users have no direct disambiguation tool; they can only
  disambiguate via the **ambiguity matches returned by the paid tool's fail-closed
  response** (§11). Slightly less ergonomic for raw-symbol discovery.

### B. Expose free public tools `stocktrends_lookup_instruments` and `stocktrends_resolve_instrument`

- **Benefits.** First-class, credential-free discovery/disambiguation for agents;
  matches the candidate mappings already sketched in
  [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md). Cleaner agent UX for
  resolving a raw ticker before spending.
- **Risks.** **Default/free tool count would no longer be one** after
  implementation (it would become three free tools). Requires README/doc updates
  in the implementation PR. Adds validation/operator surface. Both tools must
  remain **strictly credential-free** and must never send an API key.

### C. Expose public resources only

- **Benefits.** Read-only, credential-free, fits the existing 9-resource model; no
  tool-count change.
- **Risks.** Resources are parameter-light in the current model; lookup/resolve
  are **inherently parameterized by a symbol**, which fits the tool shape better
  than the static-resource shape. Higher risk of an awkward resource contract and
  of implying the endpoints are confirmed when they are not.

### D. Both public tools and internal helper

- **Benefits.** Shared internal resolver **and** first-class public tools; best
  ergonomics.
- **Risks.** Combines B's tool-count/doc obligations with maximum surface; largest
  increment; more to verify and validate at once.

### Recommendation

**Recommended: A first (shared credential-free internal resolver/lookup helper),
with B deferred to a deliberate, separately-decided step.** Rationale:

- It preserves the current, deliberately minimal surface (free = 1, paid-exposed =
  3 → 5 with indicators) and the "increment exactly one family" discipline from
  the selection memo.
- The paid tools can return ambiguity matches on fail-closed (§11), so raw-symbol
  disambiguation is still possible without new public tools.
- Exposing free public instrument tools (B) is a **legitimate** choice, but it
  **intentionally increases the default/free tool count** and should be an
  explicit, separately-approved decision — not a side effect of adding indicators.

**If B is chosen** (now or later), the implementation PR must explicitly state and
handle:

- **the default/free tool count would no longer remain one** after implementation;
- **README and docs must be updated** in that implementation PR to reflect the new
  free tools and the changed counts;
- **these tools must remain credential-free and must never send an API key**,
  payment header, or wallet header, and must fail closed on `401`/`402`/`403`.

**Because A is recommended (internal-only first), disambiguation after a paid tool
returns matches works as follows:** when a raw symbol is ambiguous, the paid
indicators tool fails closed **before** the paid boundary and returns the
candidate `symbol_exchange` matches (from `/instruments/resolve`'s `409` matches,
optionally enriched by `/instruments/lookup`) in ambiguity metadata (§11). The
agent/user then re-invokes the paid tool with an explicit canonical
`symbol_exchange`. The server never chooses the instrument.

## 9. Proposed indicators MCP tools

If — and only if — §13 preconditions are met, PR 38 would define:

- **`stocktrends_get_indicators_latest`** → `GET /v1/indicators/latest`
- **`stocktrends_get_indicators_history`** → `GET /v1/indicators/history`

Boundaries:

- **Registered as a paired paid family**, exactly like the ST-IM pair — latest and
  history together; latest-only registration is not permitted.
- **They appear only when paid tools are enabled with an API key**
  (`STOCKTRENDS_ENABLE_PAID_TOOLS=true` + configured `STOCKTRENDS_API_KEY`), the
  same exposure gate as the ST-IM pair — unless the design separately chooses the
  public lookup/resolve tools of §8 option B, which is an independent decision.
- **Adding them changes the paid-exposed tool count from 3 to 5.** The
  default/free surface remains **one** tool under the recommended option A.
- **Execution-enabled mode changes behavior, not tool count.** The 5-tool
  paid-exposed surface is identical whether or not paid execution is enabled; the
  execution flag + caps + passing preflight only govern whether the two indicators
  tools perform a live authorized `X-API-Key` fetch or fail closed.
- **Public resources and the free planning/instrument helpers remain
  credential-free** in every mode.

## 10. Input schema proposal

Conservative, `.strict()`, no invented parameters. Only parameters supported by
existing docs are included; anything unconfirmed is gated behind contract
verification.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `symbol_exchange` | string (underscore canonical, e.g. `IBM_N`) | optional | Primary identity. **Takes precedence** if both it and `symbol` are supplied. |
| `symbol` | string (raw ticker, e.g. `IBM`) | optional | Convenience only; resolved credential-free to a canonical `symbol_exchange` before any paid call, or fails closed. Never a primary key. |
| `exchange` | string ∈ `{N,Q,A,B,T,I}` | optional | Only supported if paired with `symbol` in the deliberately-supported symbol+exchange form; validated against the exchange allowlist. |
| `cs_only` | boolean | optional | Indicators-specific; API default applies when omitted (documented default true). |
| `start` / `end` | `YYYY-MM-DD` | optional (history only) | Inclusive window; **history only**, only if confirmed for indicators history. |
| `limit` | integer | optional (history only) | **History only.** Bounds **require contract verification** — do not assume ST-IM's `260`/`2600`. MCP applies its own conservative cap ≤ the verified API max; the adapter never sends a `limit` above its own cap. |

At least one of `symbol_exchange` or `symbol` must be present. Fail-closed rules:

- **Fail closed on conflicting `symbol`/`symbol_exchange`** (e.g. `symbol=IBM`
  with `symbol_exchange=MSFT_Q`) — do not silently prefer one over a
  contradictory other.
- **Fail closed on invalid exchange code** (not in `{N,Q,A,B,T,I}`).
- **Fail closed on an ambiguous symbol** (resolve `409`/multi-match).
- **No broad universe scan** — exactly one instrument per call; no wildcard,
  no all-symbols, no selection-style sweep.

## 11. Response wrapping

Mirrors the Phase 4 paid wrapper (live-execution memo §13), extended with
resolution/ambiguity metadata:

- **Preserve the API payload verbatim in `api_data`** — indicator row (latest) or
  `{request_id, symbol_exchange, cs_only, start, end, count, data}` envelope
  (history). No rewriting into advice or buy/sell/hold/allocation language.
- **Include `mcp_metadata`** — `tool_name`, `endpoint_path`, `http_method`,
  `symbol_identity` (resolved `symbol`, `exchange`, canonical `symbol_exchange` as
  sent in API hyphen form), `request_parameters`, `preflight_decision_summary`
  (pricing rule id, pricing source, reconciliation result, estimated cost+unit,
  authorization decision), `local_budget_cap_status`, `source = stocktrends_api`,
  `authoritative_for`, `not_authoritative_for` (incl. investment advice), and
  `fetched_at`.
- **Include resolution metadata when a raw symbol was resolved** —
  `resolution_used = true`, the resolve source, and the derived canonical
  `symbol_exchange`.
- **Include ambiguity metadata when fail-closed due to multiple matches** —
  `resolution_ambiguous = true` and the candidate matches (the `symbol_exchange`
  hyphen keys), so the agent/user can re-invoke with an explicit identity.
- **Include the standard authorization flags** as applicable:
  `paid_execution_authorized`, `api_request_sent`, `auth_header_sent`,
  `payment_header_sent` (always `false` in subscription mode).
- **`observed_cost` and `payment_status` remain `null`/absent** unless the API
  actually returns them (subscription mode does not; §12/§12.1 of the ST-IM
  live-execution memo). **No fabricated values** — never present a static/catalog
  estimate as an observed charge (at most a labeled *derived estimate*).
- **No investment advice** — no buy/sell/hold/allocation/risk output; trend-state
  and indicator fields are API-authored and forwarded, never recomputed.

## 12. Pricing and caps

Reuses the corrected Phase 4 mechanism (pricing mirror correction memo), with a
**family-specific** mirror:

- **Family-specific static pricing mirror** for `indicators_latest_paid` and
  `indicators_history_paid`. The ST-IM mirror values do **not** transfer; the
  indicators values **require contract verification** (§4).
- **Family-specific pricing/catalog reconciliation** — reconcile the static
  indicators mirror against live `GET /v1/pricing/catalog` (credential-free)
  before any paid call; **fail closed** on missing rule, ambiguous rule,
  cost mismatch, unsupported unit, or catalog unavailability
  (`pricing_catalog_reconciliation_failed`). Static pricing alone never
  authorizes a call. Reconciliation is not cached across restarts, not bypassed,
  not made optional.
- **Per-tool and per-session caps** — per-session and per-tool paid-call caps
  (default `0` = deny); a nonzero cost estimate is **denied** when no budget cap
  is configured.
- **STC/USD budget cap behavior** — `STOCKTRENDS_MAX_STC_PER_SESSION` and/or
  `STOCKTRENDS_MAX_USD_PER_SESSION`; because indicators rules are nonzero paid
  rules, at least one budget cap is effectively mandatory. In-memory accounting
  per session; reset on restart.
- **No automatic retries** — exactly one attempt per authorized call; no fallback
  endpoint; no auth-switch retry.
- **No x402 / payment header** — `payment_header_sent = false` always in scope; a
  `402` is surfaced as safe metadata only, never acted on.
- **No `Authorization: Bearer` fallback** — `X-API-Key` only, to the approved
  origin + the newly allowlisted indicators endpoints only.

## 13. Implementation preconditions

Must-have, all satisfied, before PR 38 implementation may begin:

- [ ] **Exact indicators contract verified** — route, method, auth, inputs,
  response shape re-confirmed (route/class already confirmed; re-verify at
  implementation time).
- [ ] **Indicators endpoint-specific pricing/catalog values verified** —
  `indicators_latest_paid` / `indicators_history_paid` live catalog cost + unit
  confirmed via credential-free `/v1/pricing/catalog`, and a matching static
  mirror defined. **(Open blocker.)**
- [ ] **Indicators history `limit` bounds verified** (default/max) — do not assume
  ST-IM bounds. **(Open blocker.)**
- [ ] **Exact instrument lookup/resolve contract verified** — path, method,
  no-key/free behavior, input query schema, output shape, `symbol_exchange`
  hyphen form. **(Open blocker.)**
- [ ] **Exact `/v1` path confirmed** for indicators and for
  `/instruments/lookup` / `/instruments/resolve`. **(Open blocker for
  instruments.)**
- [ ] **Pricing catalog rule ids confirmed** for the indicators family.
- [ ] **Request schemas confirmed** (indicators + instrument endpoints).
- [ ] **Response schemas confirmed** (indicators rows/envelope; instrument
  lookup/resolve bodies).
- [ ] **`409` ambiguity response confirmed** for `/instruments/resolve` (exact
  status + matches body). **(Open blocker.)**
- [ ] **Decision made on public instrument tools vs internal-only** (§8; the memo
  recommends internal-only first).
- [ ] **Test matrix planned** (§15 of the ST-IM live-execution memo, extended for
  resolution and ambiguity).
- [ ] **No live validation required** for the implementation foundation — PR 38 is
  mock-only.

## 14. Proposed PR sequence

Updating the sequence from the Phase 5B selection memo (PR 36):

| PR | Scope |
| --- | --- |
| **PR 37** | This design/contract memo — selects indicators latest/history and defines the instrument identity/resolution contract. Docs-only. |
| **PR 38** | **Instrument resolution foundation and indicators implementation foundation, mock-only** — gated registration, credential-free resolution before any paid boundary, family-specific indicators pricing mirror + reconciliation, caps, preflight, mocked tests only. **Only if §13 preconditions are satisfied.** No live validation, no real API key, no x402, no paid endpoint call. |
| **PR 39** | **Controlled validation plan** — the operator-supervised, one-off validation procedure, checklists, and assertions, including resolution-before-paid ordering (documentation; no live run). |
| **PR 40** | **Completed controlled validation report** — only if operator-authorized live validation is separately approved and supervised, followed by rollback to default free mode. |

**Blocker contingency.** As drafted, contract blockers remain (indicators
pricing/catalog values and history `limit` bounds; the full instrument
lookup/resolve contract incl. the `409` shape). **Until those are verified, PR 38
must be a contract-verification / documentation PR, not an implementation PR.**
PR 38 may become the implementation foundation only once §13 is fully checked off.

## 15. Non-goals

- **No implementation in this PR** — design/contract only.
- **No live endpoint calls** — including no call to `/v1/indicators/*`,
  `/instruments/lookup`, or `/instruments/resolve`.
- **No API keys** used, requested, inspected, printed, logged, or stored.
- **No dynamic registration** from `/v1/ai/tools`, `/v1/workflows`, or the
  instrument endpoints.
- **No raw-symbol-only identity** — canonical `symbol_exchange` remains the key.
- **No exchange guessing / defaulting** to a US or Canadian market.
- **No paid request on ambiguity** — resolution to a single canonical identity
  must complete first, or the call fails closed with candidate matches.
- **No x402 / wallet / OAuth / `Authorization: Bearer` fallback / remote MCP /
  database / control-plane.**
- **No investment advice** — no buy/sell/hold/allocation/risk output.
- **No Intelligence Agent recomputation** — and no recomputation of indicator or
  instrument metadata.

## 16. Final recommendation

- **Indicators latest/history should proceed as the selected next paid family**,
  paired, reusing the proven Phase 4 gated-adapter pattern — **conditional on
  contract verification** of the indicators endpoint-specific pricing/catalog
  reconciliation and history `limit` bounds (§4, §13).
- **Instrument lookup/resolve should be internal-only first** (§8 option A): a
  shared credential-free resolver/lookup helper used before the paid boundary,
  with paid tools returning ambiguity matches on fail-closed for disambiguation.
  Exposing free public `stocktrends_lookup_instruments` /
  `stocktrends_resolve_instrument` tools (option B) is a legitimate but separate
  decision that would intentionally raise the default/free tool count above one
  and require README/doc updates.
- **Implementation cannot proceed immediately.** Contract-verification blockers
  remain: the indicators pricing/catalog cost values, the indicators history
  `limit` bounds, and the full instrument lookup/resolve contract including the
  exact `/v1` path and the `409` ambiguity shape. **PR 38 must remain a
  contract-verification / documentation step until §13 is fully satisfied**, after
  which it may become the mock-only implementation foundation.

This memo authorizes **no implementation, no tool registration, and no live
validation.** The instrument endpoints remain **owner-identified and pending
contract verification**; no live verification was performed and none is claimed.
