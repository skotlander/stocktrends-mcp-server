# Phase 5B Next-Capability Selection Memo

Design date: 2026-07-10

Status: **Architecture / decision memo only.** This memo evaluates the next
capability path after Phase 5A documentation hardening and recommends the next
phase. It authorizes **no implementation**. No `src/` change, no `tests/` change,
no `package.json` / `package-lock.json` change, no `README.md` change, no MCP
tool added, no MCP prompt added, no endpoint call, no MCP Inspector session, and
no API key used, requested, inspected, printed, logged, or stored is performed or
authorized by this memo. Nothing here changes runtime behavior. This memo selects
a direction and defines the gates that a **later, separately reviewed** design/
contract memo must clear before any code is written.

This memo builds on and does not supersede:

- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) — the accepted ADRs
  that constrain the design (source authority ADR-001, authority boundary
  ADR-002, artifact route canonicality ADR-003/004, disabled-by-default paid
  surface ADR-005/006/012, stdio-only posture, default API base URL ADR-008).
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — the conservative security model,
  including the paid ST-IM live-execution flags, caps, preflight, and
  secret-handling rules.
- [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) — the local stdio
  server architecture and public-resource model.
- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) — the
  read-only audit of front-facing API capabilities and their public/paid status.
- [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
  — the confirmed ST-IM contracts and the recorded contract status of indicators,
  selections, and guidance/research families.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved paid ST-IM design, gate policy, and live-validation policy.
- [`PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md`](PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md)
  — the corrected static pricing mirror / catalog reconciliation behavior.
- [`PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md`](PHASE4_CLOSEOUT_PHASE5_ARCHITECTURE_CHECKPOINT.md)
  — the Phase 4 closeout that enumerated the Phase 5 candidate paths and chose
  Phase 5A first.
- [`PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md`](PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md),
  [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md),
  and
  [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the completed Phase 5A operator-readiness documentation set.

## 0. Architecture boundary (unchanged)

Phase 5B must preserve — and must not weaken — the controlling authority
boundary from ADR-002:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a **thin local stdio adapter over the front-facing Stock
Trends API**. Whatever Phase 5B becomes, it does not turn the adapter into a
second source of truth, a pricing or payment authority, a database or
control-plane client, a recomputation layer, or an advice generator. The next
capability, if it is a data capability, exposes API-published data through the
same gated adapter posture that Phase 4 proved.

## 1. Purpose and scope

This is an architecture/decision memo. Its single job is to decide **what the
next capability phase after Phase 5A should be**, and — if that phase is a new
paid tool family — to define the gates a later design/contract memo must clear
before implementation begins.

This memo explicitly does **not**:

- implement anything, or authorize any implementation;
- add MCP tools, resources, or prompts, or change the tool count in any mode;
- change runtime behavior, gates, caps, or preflight logic;
- change `src/`, `tests/`, `README.md`, `package.json`, or `package-lock.json`;
- make any live API call or run MCP Inspector;
- use, request, inspect, print, log, or store any secret or API key;
- authorize any new tool or behavior on its own. A later, separately reviewed
  design/contract memo must precede any implementation.

## 2. Current state

The state this memo starts from, drawn from the Phase 4 closeout and the Phase 5A
documentation set:

- **Phase 4 paid ST-IM latest/history execution is complete** — implemented,
  pricing-corrected, live-validated once under operator supervision,
  independently (Codex) reviewed, and documented. The MCP adapter is proven as a
  thin, gated paid adapter for the first paid ST-IM tool pair.
- **Phase 5A operator-readiness documentation is complete** — free/default
  quickstart (#32), paid-mode configuration (#33), MCP Inspector validation
  runbook (#34), and operator-safety/release checklist (#35) have landed on
  `main` at `0ab847f`.
- **The server remains local `stdio` only.** No remote HTTP/SSE/Streamable HTTP
  hosting exists.
- **Default/free mode exposes exactly one tool:**
  `stocktrends_estimate_workflow_cost` (workflow-level `GET /v1/cost-estimate`,
  credential-free, `paid_execution_authorized` always `false`).
- **Paid-exposed mode exposes exactly three tools:**
  - `stocktrends_estimate_workflow_cost`
  - `stocktrends_get_stim_latest`
  - `stocktrends_get_stim_history`
- **Execution-enabled paid mode changes call behavior, not tool count.** The
  three-tool surface is identical whether or not paid execution is enabled; the
  execution flag (plus caps and passing preflight) only governs whether the two
  paid ST-IM tools perform a live authorized `X-API-Key` fetch or fail closed.
- **Public resources remain credential-free** in every mode.
- **Zero MCP prompts.**
- **No dynamic registration** — no tool or resource is registered from
  `/v1/ai/tools` or `/v1/workflows`; tool/endpoint/pricing metadata is static and
  reconciled against the live catalog at call time.
- **No x402, wallet, OAuth, `Authorization: Bearer` fallback, remote MCP,
  database, control-plane, or advice behavior** exists anywhere in the server.

## 3. Decision question

> **What should the next capability phase be after Phase 5A?**

Phase 5A was deliberately docs-only and added no capability. Phase 4 proved a
single paid data pair. The decision now is whether to (a) stop and tag, (b) grow
paid data surface, (c) open a payment-rail design phase, (d) open a hosting
design phase, (e) expose Intelligence Agent artifacts, or (f) pause MCP work in
favor of the broader Stock Trends product/marketing effort — and, if growth is
chosen, to define the gates that keep it safe.

## 4. Candidate paths to evaluate

- **A. Tag/release a docs-only milestone now.** Cut a release marking the Phase
  4 + Phase 5A state without adding capability.
- **B. Add the next paid tool family.** Extend the proven Phase 4 gated-adapter
  pattern to a second confirmed paid data family (e.g. indicators, prices,
  selections, or intelligence artifacts), behind a Phase 5B design/contract memo.
- **C. x402 / wallet design phase.** Architect a machine-payment rail
  (payment-header construction, `402` handling, signing, retry policy) that does
  not exist today.
- **D. Remote MCP / hosted MCP design phase.** Architect authentication, tenancy,
  logging, rate limiting, and secret isolation for a hosted transport.
- **E. Intelligence Agent artifact MCP exposure.** Surface published guidance /
  research / discovery / editorial-preview artifacts through MCP.
- **F. Pause MCP and return focus to the Stock Trends Intelligence Agent / API
  marketing.** Treat the current MCP as feature-complete-enough and reinvest
  effort in product discoverability.

## 5. Evaluation criteria

Each candidate is scored against the following, which reflect the accepted ADRs,
the security model, and the current Stock Trends business posture:

1. **Strategic value for agent/client adoption** — does it make the MCP more
   useful to the agents and clients we want to attract?
2. **Reuse of the proven Phase 4 paid ST-IM execution pattern** — can it reuse
   the gated adapter, static pricing mirror, catalog reconciliation, caps,
   preflight, and no-retry posture already validated?
3. **Architecture / security risk** — how much new attack surface, credential
   handling, or payment/hosting machinery does it introduce?
4. **Authority-boundary clarity** — does it keep the adapter thin and
   API-authoritative (ADR-002), or does it risk recomputation, advice, or a
   second source of truth?
5. **Implementation complexity** — how large and how novel is the build?
6. **Need for external/public API contract verification** — does it depend on
   endpoint availability, auth, pricing rule, and schema facts that must be
   re-confirmed against the front-facing API before coding?
7. **Potential to improve MCP usefulness without a payment/hosting redesign** —
   can value be added without opening the x402 or remote-MCP boundaries the
   design deliberately keeps out?
8. **Risk of multiplying operational confusion** — does it add gates, pricing
   rules, modes, or validation surface that operators must now reason about?
9. **Fit with current Stock Trends business priority and discoverability goals**
   — does it advance the near-term goal of making Stock Trends data and the
   Intelligence Agent easy for agents to find and consume?

## 6. Candidate analysis

For each candidate: benefits, risks, required preconditions, whether it needs a
design memo before implementation, whether Codex review should gate merge, and
whether Fable 5 should be reserved for it.

### A. Tag/release a docs-only milestone now

- **Benefits.** Cheap. Records a clean, reviewed, documented state (Phase 4 +
  Phase 5A) as a referenceable milestone; gives operators a version to pin.
- **Risks.** Adds no capability and no adoption value on its own. If treated as a
  stopping point it leaves the paid surface at a single family. Tagging is
  already covered by the Phase 5A release checklist, so a standalone "phase" for
  it would be thin.
- **Preconditions.** Phase 5A release checklist satisfied; surfaces confirmed
  (1/3/0/resources); secret-safety scan clean; `main` green.
- **Design memo before implementation?** No — it is a release action, not a
  capability. It can be folded into whatever phase is chosen next.
- **Codex review before merge?** Not required for a tag; normal review suffices.
- **Reserve Fable 5?** No.

### B. Add the next paid tool family

- **Benefits.** Directly grows agent-facing value by adding a second confirmed
  paid data family. **Maximally reuses the proven Phase 4 pattern** — gated
  adapter, `X-API-Key`-only auth, static pricing mirror, catalog reconciliation,
  caps, mandatory preflight, no-retry, latest/history pairing. Keeps the
  authority boundary intact (forwarding API-published data, no recomputation).
  Adds capability **without** opening the payment or hosting boundaries.
- **Risks.** Each new family needs its **own** endpoint-specific pricing/catalog
  reconciliation — the ST-IM reconciliation does not transfer. Some candidate
  families (notably selections) carry misuse / broad-sweep risk. More paid tools
  means more gates and more validation surface, so operational confusion must be
  managed by keeping the increment to exactly one family.
- **Preconditions.** A Phase 5B design/contract memo that verifies the selected
  family's endpoint availability, auth, pricing rule, request schema, response
  wrapping, static pricing mirror + catalog reconciliation behavior, cap/budget
  semantics, and a controlled validation plan (see §7).
- **Design memo before implementation?** **Yes — mandatory.** No paid family may
  be added without its own design/contract memo (Phase 4 closeout §5).
- **Codex review before merge?** **Yes** — paid execution is security-sensitive;
  independent Codex review should gate the implementation and validation merges,
  as it did for Phase 4.
- **Reserve Fable 5?** No. This reuses an established, bounded pattern; it does
  not cross a payment, hosting, multi-tenant, dynamic-registration, or
  authority-boundary line. Opus 4.8 for design, Sonnet 5 high for narrow doc
  follow-ups, Codex for the security review.

### C. x402 / wallet design phase

- **Benefits.** Would eventually enable machine-pay / per-request access for
  agents without a subscription key — strategically interesting for autonomous
  agent adoption.
- **Risks.** **Highest new-boundary risk.** Introduces payment-header
  construction, `402` handling, signing, and retry policy that do not exist
  today. Must **not** be bolted onto the subscription path. Easy to blur the
  spend-authority boundary the current design deliberately keeps out.
- **Preconditions.** A dedicated architecture-first design phase with its own
  payment-boundary design; API-side confirmation of x402/MPP rails; no
  subscription-path entanglement.
- **Design memo before implementation?** **Yes — architecture-only first**, and
  separate from any data-tool work.
- **Codex review before merge?** **Yes**, and earlier — even the design memo
  warrants security scrutiny.
- **Reserve Fable 5?** **Yes.** Payment-rail / wallet design is exactly the class
  of authority-boundary-sensitive work for which Fable 5 is reserved.

### D. Remote MCP / hosted MCP design phase

- **Benefits.** Would let non-local clients reach the server; broadens
  distribution.
- **Risks.** Requires authentication, tenancy, logging, rate limiting, and secret
  isolation that the local stdio model intentionally avoids. Multi-tenant secret
  handling is the single largest security jump available here.
- **Preconditions.** A dedicated architecture-first design phase covering
  transport, auth, tenancy, rate limiting, logging, and secret isolation before
  any hosting work.
- **Design memo before implementation?** **Yes — architecture-only first.**
- **Codex review before merge?** **Yes.**
- **Reserve Fable 5?** **Yes** — hosted transport and multi-tenant auth/secret
  isolation are reserved for Fable 5.

### E. Intelligence Agent artifact MCP exposure

- **Benefits.** Surfaces the distinctive published Intelligence Agent
  guidance/research artifacts (and free discovery / editorial preview) to agents —
  high strategic value for Stock Trends' differentiation.
- **Risks.** Authority-boundary-sensitive (ADR-002/003): the adapter must surface
  **only API-published artifacts** with **no recomputation and no hidden
  reasoning**. Paid guidance/research are paid intelligence products requiring
  the same paid gates as ST-IM plus provenance preservation and artifact-envelope
  handling. By-id vs latest semantics (ADR-003/004) need design. This is a paid
  tool family, but a **more authority-sensitive** one than pure market data.
- **Preconditions.** A design/contract memo that treats it like candidate B **and**
  resolves artifact-envelope schema, provenance preservation, by-id vs latest
  retrieval, and the free discovery/editorial-preview classification.
- **Design memo before implementation?** **Yes.**
- **Codex review before merge?** **Yes.**
- **Reserve Fable 5?** **Yes for the authority-boundary design** (what artifacts
  may be surfaced, how provenance is preserved, whether any reasoning surface is
  implied). The mechanical paid-fetch wiring, once the boundary is fixed, is
  Opus/Sonnet + Codex work. Because it mixes reserved-boundary design with
  ordinary paid wiring, it is heavier and later than candidate B.

### F. Pause MCP; refocus on Stock Trends Intelligence Agent / API marketing

- **Benefits.** Redirects effort to product discoverability and demand, which may
  matter more to the business than additional MCP surface right now.
- **Risks.** The MCP momentum and the proven Phase 4 pattern go idle. Adoption of
  the MCP (a discoverability channel in its own right) stalls. This is a
  portfolio/priority decision outside the architecture's control.
- **Preconditions.** A business decision that MCP is sufficiently complete for
  now; nothing technical blocks it.
- **Design memo before implementation?** N/A — it is a pause, not a build.
- **Codex review before merge?** N/A.
- **Reserve Fable 5?** No.

## 7. Recommended next phase

**Recommended next phase: Phase 5B — Next Paid Tool Family Design and Contract
Verification (candidate B).**

Rationale, grounded in the governing docs:

- Phase 4 **proved the gated paid-adapter pattern end to end** — auth, static
  pricing mirror, catalog reconciliation, caps, preflight, no-retry, latest/
  history pairing, and rollback. Extending it to a second confirmed family is the
  **highest-value, lowest-novel-risk** capability move available.
- It **adds agent-facing value without opening the x402 (C) or hosting (D)
  boundaries** the design deliberately keeps out, and without the heavier
  authority-boundary design that intelligence artifacts (E) require.
- A pure tag (A) adds no capability and is already covered by the Phase 5A
  release checklist; a pause (F) is a business call, not an architecture
  recommendation, and can proceed independently if leadership chooses it.
- The main risk — endpoint-specific pricing reconciliation and misuse — is
  **containable by gating implementation behind a design/contract memo** and
  limiting the increment to exactly one family.

**Implementation must not begin** until a Phase 5B design/contract memo selects
the exact endpoint family and confirms, from the front-facing API contract:

- **endpoint availability** (exact path(s), method, latest/history pairing);
- **auth requirement** (`X-API-Key` subscription; x402 remains deferred);
- **pricing / catalog rule** (the exact `*_paid` pricing rule id(s));
- **request schema** (required/optional inputs, symbol/exchange model, limits);
- **instrument identity / resolution contract** — for any stock-specific family,
  the canonical `symbol_exchange` identity model **and** a credential-free
  instrument-resolution path (see the *Instrument identity and resolution*
  subsection in §8) that must complete before any paid request;
- **response wrapping requirements** (raw `api_data` preserved, `mcp_metadata`
  added, provenance and latest/history limitation notes);
- **static pricing mirror and catalog reconciliation behavior** for that family
  (a fresh, family-specific mirror; fail-closed on non-reconciliation);
- **cap / budget semantics** (per-session, per-tool, STC, USD; default zero paid
  execution unless explicit nonzero caps are configured);
- **controlled validation plan** (one-off, operator-authorized,
  operator-supervised, with rollback to default free mode).

Phase 5B therefore has a **mandatory instrument identity/resolution
prerequisite**: for any *stock-specific* paid tool family, the selected-family
design/contract memo (PR 37) must confirm the instrument-resolution contract
before implementation. **Implementation of indicators latest/history — or any
other stock-specific family — must not begin until that memo confirms how a
symbol is safely resolved to a canonical `symbol_exchange` before any paid
call.** This prerequisite does not change the recommended phase; it constrains
what the selected-family design must prove.

## 8. Candidate paid tool families

Evaluated from [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md)
and [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md).
No endpoint support is invented here; each family is marked with its verification
status. A "requires contract verification" mark means the Phase 5B design/contract
memo must re-confirm the specifics against the live front-facing API even where a
route is already documented.

| Family | Contract status in existing docs | Notes / suitability |
| --- | --- | --- |
| **Indicators latest/history** (`GET /v1/indicators/latest`, `GET /v1/indicators/history`) | **Route/auth/schema confirmed** in the Phase 4 contract memo §6; pricing rules `indicators_latest_paid` / `indicators_history_paid`. **Endpoint-specific pricing/catalog reconciliation requires contract verification.** | Strongest complement to ST-IM: symbol-keyed, latest+history paired, same input model, API-published rows, no recomputation. The Phase 4 memo explicitly kept indicators "second after ST-IM." |
| **Prices latest/history** | **Requires contract verification.** No confirmed standalone `/v1/prices/*` route is recorded in the audit or the Phase 4 contract memo; price-like fields appear embedded in indicator rows, not a separate priced family. | Do not assume a prices endpoint family exists. The Phase 5B memo must prove a front-facing route before considering it. Treat as unverified. |
| **Selections latest/history** (`GET /v1/selections/latest`; `/v1/selections/history` listed as a v1 candidate) | **Latest route/auth/schema confirmed** (Phase 4 memo §7; rule `selections_latest_paid`). **History and published-vs-base semantics require contract verification.** | Deferred in Phase 4 for **misuse / broad-sweep risk** (large default/max limit; base universe is not the strict published STIM Select list). Higher design burden; not the preferred first pick. |
| **Intelligence Agent guidance/research artifacts** (`GET /v1/intelligence/guidance/latest`, `.../research/latest`, and `{artifact_id}` by-id) | **Route/class confirmed** (Phase 4 memo §8; `PublicArtifactEnvelope`). **Provenance, by-id-vs-latest, and paid-gate specifics require contract verification.** | High strategic value but **authority-boundary-sensitive** (candidate E). Belongs to its own more careful phase, not the first low-risk data increment. |

Free/public intelligence surfaces (`GET /v1/intelligence/discovery`,
`GET /v1/intelligence/editorial/latest/preview`) are **not** paid tools and are
out of scope for a paid-family selection; they are noted only to keep the paid
vs free line explicit.

### Instrument identity and resolution (mandatory prerequisite)

Any stock-specific paid tool family added in Phase 5B or later must first satisfy
a Stock Trends **instrument-identity** requirement. This is a mandatory
architecture consideration before any additional stock-specific paid tool family
is implemented.

- **Raw ticker symbols alone are not always safe Stock Trends instrument
  identities.** The same ticker can exist on more than one exchange — for
  example `TD`, `RY`, `SHOP`, or `IBM` can resolve to Canadian and/or US listings
  — so a bare symbol can be ambiguous.
- **The canonical unambiguous identity remains symbol + exchange.** In MCP input
  it is represented as `symbol_exchange` (e.g. `IBM_N`), and the API outbound
  form is the hyphenated variant (e.g. `IBM-N`). The existing paid ST-IM tools
  already use this canonical path — accepting the underscore MCP form and
  emitting the hyphenated API form — and **that canonical path remains valid and
  is the required identity model** for any new stock-specific family.
- **The MCP server must not guess an exchange for a raw symbol when ambiguity
  exists.** It must never fabricate, default, or infer an exchange to make a
  symbol callable.
- **If future tools accept raw-symbol convenience input, they must resolve it
  through credential-free instrument discovery before any paid request.**
  Resolution is a free, pre-paid step; it must complete and yield a single
  canonical `symbol_exchange` before the paid boundary is entered.
- **`/instruments/resolve` should be the safe resolution path when one
  unambiguous result exists** — it returns exactly one instrument if the symbol
  can be resolved safely, producing the canonical `symbol_exchange`.
- **`/instruments/lookup` should support ambiguity display / user-agent
  disambiguation** — it lists all instruments matching a symbol across exchanges
  (returning `symbol_exchange` keys such as `IBM-N`) so the client or agent can
  choose.
- **If `/instruments/resolve` returns ambiguity — including `409` with matches —
  the MCP server must fail closed and return the candidate matches without making
  a paid request.** The agent/user selects a canonical identity; the server does
  not.
- **No API key, no auth header, no cap debit, no paid endpoint call, and no
  `observed_cost` / `payment_status` value may occur before safe resolution
  completes.** Resolution happens entirely on the credential-free side of the
  paid boundary.

**Endpoint status.** `/instruments/lookup` and `/instruments/resolve` are
**owner-identified API endpoints requiring contract verification before
implementation.** They appear in existing repository docs only as *candidates* —
listed under "Additional v1 Candidates" in
[`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) and as
candidate tool mappings in
[`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) — and are **not**
contract-verified to the standard applied to ST-IM in
[`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md).
This memo does **not** claim they are implemented in the MCP server, and it makes
no live call to them. The Phase 5B selected-family design/contract memo (PR 37)
must confirm their exact path (including the `/v1` prefix), method, free/no-key
status, request schema, response shape, and the `409`-ambiguity contract before
any implementation depends on them.

## 9. Preliminary preferred paid family

**Preliminary preferred family: indicators latest/history** — **conditional**,
preferred only **after (a) endpoint contract verification and (b)
instrument-resolution design** are confirmed in the Phase 5B design/contract
memo. The preference is not a green light to implement; it is a starting point
the PR 37 memo must validate.

The conditions on this preliminary preference are:

- **Preferred only after endpoint contract verification and instrument-resolution
  design** — both the `indicators_latest_paid` / `indicators_history_paid`
  pricing/catalog reconciliation **and** the instrument-resolution contract (§8)
  must be confirmed first.
- **The paid tool must continue to accept canonical `symbol_exchange`** as its
  primary, unambiguous identity input — the same model the ST-IM tools use.
- **Optional raw-symbol convenience input must resolve safely or fail closed** —
  a raw symbol is resolved via credential-free instrument discovery to a single
  canonical `symbol_exchange` before any paid request, or the call fails closed.
- **Ambiguous raw symbols must never trigger a paid request** — on ambiguity
  (including `/instruments/resolve` returning `409` with matches) the server
  returns candidate matches and makes no paid call.

It best satisfies the selection principles:

- **API-published data only** — the API returns indicator rows; the adapter
  forwards them.
- **No recomputation, no hidden reasoning** — trend-state and indicator fields
  are API-authored; the adapter adds only provenance metadata.
- **Low incremental runtime risk** — same symbol/exchange input model, same
  latest/history pairing, and the same gated-fetch pattern already validated for
  ST-IM; the smallest delta from proven code.
- **Clear pricing rule** — `indicators_latest_paid` / `indicators_history_paid`
  are recorded, so a family-specific static mirror + catalog reconciliation is
  tractable (still requires verification).
- **Strong value to MCP clients/agents** — gives agents current and historical
  Stock Trends classification/trend context, a natural companion to ST-IM
  distributions.
- **Good complement to existing ST-IM latest/history tools** — pairs cleanly with
  the two paid tools already shipped, without adding a new interaction shape.

Selections is **not** preferred first (misuse/broad-sweep risk and unresolved
base-vs-published semantics). A standalone prices family is **not** selectable
until its route is verified to exist. Intelligence artifacts belong to their own
more authority-sensitive phase. If the Phase 5B design/contract memo cannot
confirm indicators' pricing/catalog reconciliation, it should **explicitly defer
final selection** rather than force it.

## 10. Non-goals for the next phase

The next phase reaffirms — and does not relax — the following exclusions:

- **No x402 / wallet** unless a separate x402 design phase (candidate C) is
  independently selected.
- **No remote / hosted MCP** unless a separate hosted-MCP design phase (candidate
  D) is independently selected.
- **No OAuth / `Authorization: Bearer` fallback.** `X-API-Key` remains the only
  credential path.
- **No database / control-plane access.**
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`; metadata
  stays static and catalog-reconciled.
- **No investment advice** — no buy/sell/hold/allocation/risk output.
- **No Intelligence Agent recomputation** or reinterpretation.
- **No unattended, scheduled, autonomous, or recurring live validation.**
- **No live paid execution without an operator-supervised validation plan** —
  live runs remain one-off, operator-authorized, operator-supervised, and
  followed by rollback to default free mode.

Instrument-identity fail-closed exclusions (reaffirming §8):

- **No guessing exchanges** — the server never fabricates, defaults, or infers an
  exchange for a raw symbol.
- **No paid request on an unresolved or ambiguous raw symbol** — resolution to a
  single canonical `symbol_exchange` must complete first, or the call fails
  closed with candidate matches.
- **No raw-symbol-only primary-key assumption** — canonical `symbol_exchange`
  remains the identity; a bare ticker is never treated as a safe unique key.
- **No recomputation of instrument metadata** — the adapter forwards API-authored
  lookup/resolve results and does not re-derive, merge, or reinterpret them.
- **No dynamic registration from instrument endpoints** — `/instruments/lookup`
  and `/instruments/resolve` never drive dynamic tool/resource registration.
- **No live endpoint calls in this memo** — including no call to
  `/instruments/lookup` or `/instruments/resolve`; they remain owner-identified
  endpoints pending contract verification.

## 11. Proposed PR sequence

Incremental and independently reviewable, consistent with the Phase 4/5A
cadence. Names may be adjusted; the sequence stays incremental.

| PR | Scope |
| --- | --- |
| **PR 36** | Phase 5B next-capability selection memo (this document). Docs-only; no runtime change. |
| **PR 37** | Selected paid tool family **plus instrument identity/resolution design and API contract verification memo** — confirms endpoint availability, auth, pricing rule, request schema, response wrapping, family-specific static pricing mirror + catalog reconciliation, cap/budget semantics, the controlled validation plan, **and the instrument identity/resolution contract** (canonical `symbol_exchange`, credential-free `/instruments/lookup` and `/instruments/resolve` behavior, and the `409`-ambiguity fail-closed rule). Docs-only. |
| **PR 38** | **Instrument lookup/resolve foundation and/or selected paid family implementation foundation** — gated registration, credential-free resolution before any paid boundary, family-specific pricing mirror/reconciliation, caps, preflight, mocked tests only. **No live validation, no real API key, no x402, no paid endpoint call.** |
| **PR 39** | **Controlled validation plan** — the operator-supervised, one-off validation procedure, checklists, and assertions, including resolution-before-paid ordering (documentation; no live run yet). |
| **PR 40** | **Completed controlled validation report** — only if operator-authorized live validation is separately approved and supervised, followed by rollback to default free mode. |

If leadership instead selects pause (F) or a boundary phase (C/D), this sequence
is replaced by that phase's own architecture-first memo sequence.

## 12. Model / review guidance

- **Opus 4.8** — normal architecture/design docs (this memo; the Phase 5B
  design/contract memo).
- **Sonnet 5 high** — narrow README/doc implementation **after** the architecture
  is settled (e.g. documenting a newly added tool family once its design is
  approved).
- **Codex GPT-5.5 Extra High** — security-sensitive reviews **before**
  implementation merges (the paid-family implementation, the pricing/reconciliation
  code, and any live-validation report), as used for Phase 4.
- **Fable 5 — reserved** for x402 / wallet design (C), remote / hosted MCP design
  (D), multi-tenant auth / secret isolation, dynamic-registration policy, or
  Intelligence Agent authority-boundary changes (the boundary design portion of
  E). The recommended Phase 5B indicators increment does **not** cross these
  lines and does not require Fable 5.

## 13. Final recommendation

**Proceed with Phase 5B — Next Paid Tool Family Design and Contract Verification
next**, with **indicators latest/history** as the conditional preliminary
preferred family, subject to contract verification. Phase 5B **must include
instrument identity/resolution design as a prerequisite for any stock-specific
paid tool implementation**: no stock-specific family — indicators latest/history
or otherwise — may begin implementation until the selected-family design memo
confirms both the endpoint contract and the instrument-resolution contract
(canonical `symbol_exchange` input, credential-free resolution, and fail-closed
handling of ambiguous raw symbols with no paid request).

No implementation is authorized by this memo. The next step is a Phase 5B design/
contract memo (PR 37) that selects and verifies the exact endpoint family **and**
the instrument identity/resolution contract. **No code, no tool registration, and
no live validation may begin until that design memo is written, reviewed, and
approved.**
