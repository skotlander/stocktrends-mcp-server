# Phase 5C Next-Capability Selection Memo

Design date: 2026-07-10

Status: **Architecture / decision memo only.** This memo evaluates the next
capability path after the Phase 5B indicators production-readiness signoff and
recommends the next phase. It authorizes **no implementation**. No `src/` change,
no `tests/` change, no `package.json` / `package-lock.json` change, no
`README.md` runtime change, no MCP tool added, no MCP resource added, no MCP
prompt added, no endpoint call, no MCP Inspector session, and no API key used,
requested, inspected, printed, logged, or stored is performed or authorized by
this memo. Nothing here changes runtime behavior. This memo selects a direction
and defines the gates that a **later, separately reviewed** design/contract memo
must clear before any code is written.

This memo builds on and does not supersede:

- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) — the accepted ADRs
  that constrain the design (source authority ADR-001, authority boundary
  ADR-002, artifact route canonicality ADR-003/004, disabled-by-default paid
  surface ADR-005/006/012, stdio-only posture, default API base URL ADR-008).
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — the conservative security model,
  including §15 (paid ST-IM and indicators live execution), §15.7 (the narrowed
  credential-bearing endpoint allowlist), and §15.8 (the internal credential-free
  instrument resolver).
- [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) — the local stdio
  server architecture and public-resource model, including its explicit
  no-recomputation rule for ST-IM, indicators, selections, rankings, breadth,
  leadership, **portfolio scores**, and intelligence conclusions.
- [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md) — the
  read-only audit of front-facing API capabilities and their public/paid status.
- [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md)
  — the confirmed ST-IM contracts and the recorded contract status of indicators,
  selections, and guidance/research families.
- [`PHASE5B_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5B_NEXT_CAPABILITY_SELECTION_MEMO.md)
  — the Phase 5B selection memo that chose indicators and defined the instrument
  identity/resolution prerequisite. This memo is its direct successor and reuses
  its evaluation method.
- The completed Phase 5B indicators document set:
  [`PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md`](PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md),
  [`PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md`](PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md),
  [`PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md`](PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md),
  [`PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md),
  [`PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md),
  and
  [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  — the merged, independently reviewed evidence chain that this memo starts from.

## 0. Architecture boundary (unchanged)

Phase 5C must preserve — and must not weaken — the controlling authority boundary
from ADR-002:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

The MCP server remains a **thin local stdio adapter over the front-facing Stock
Trends API**. Whatever Phase 5C becomes, it does not turn the adapter into a
second source of truth, a pricing or payment authority, a database or
control-plane client, a recomputation layer, a ranking/selection engine, a
portfolio scorer, or an advice generator. The next capability, if it is a data
capability, exposes API-published data through the same gated adapter posture
that Phase 4 (ST-IM) and Phase 5B (indicators) proved.

## 1. Purpose and scope

This is an architecture/decision memo. Its single job is to decide **what the
next capability phase after the Phase 5B indicators signoff should be**, and — if
that phase is a new paid tool family — to define the gates a later
design/contract memo must clear before implementation begins.

This memo explicitly does **not**:

- implement anything, or authorize any implementation;
- add MCP tools, resources, or prompts, or change the tool count in any mode;
- change runtime behavior, gates, caps, or preflight logic;
- change `src/`, `tests/`, `package.json`, or `package-lock.json` (a
  documentation-index link in `README.md` is the only non-`docs/` change, and it
  changes no runtime behavior);
- make any live API call or run MCP Inspector;
- use, request, inspect, print, log, or store any secret or API key;
- authorize any new tool or behavior on its own. A later, separately reviewed
  design/contract memo must precede any implementation.

## 2. Current state

The state this memo starts from, drawn from the Phase 5B signoff and the merged
Phase 5B evidence chain:

- **Phase 5B indicators is complete and signed off.** The paired paid indicators
  tools and the internal credential-free instrument resolver are implemented
  (mock-only), contract-verified credential-free, controlled-validated once under
  operator supervision, independently (Codex GPT-5.5 Extra High) reviewed, and
  declared ready for controlled operator use. The production-readiness signoff
  (PR #42) is on `main` at `9d89e2a`.
- **Phase 4 paid ST-IM latest/history remains complete** — the first proven paid
  family (auth, static pricing mirror, catalog reconciliation, caps, preflight,
  no-retry, latest/history pairing, rollback).
- **The server remains local `stdio` only.** No remote HTTP/SSE/Streamable HTTP
  hosting exists.
- **Default/free mode exposes exactly one tool:**
  `stocktrends_estimate_workflow_cost` (workflow-level `GET /v1/cost-estimate`,
  credential-free, `paid_execution_authorized` always `false`).
- **Paid-exposed mode exposes exactly five tools:**
  - `stocktrends_estimate_workflow_cost`
  - `stocktrends_get_stim_latest`
  - `stocktrends_get_stim_history`
  - `stocktrends_get_indicators_latest`
  - `stocktrends_get_indicators_history`
- **Execution-enabled paid mode changes call behavior, not tool count.** The
  five-tool surface is identical whether or not paid execution is enabled; the
  execution flag (plus caps and passing preflight) only governs whether the four
  paid data tools perform a live authorized `X-API-Key` fetch or fail closed.
- **An internal credential-free instrument resolver exists** for stock-specific
  paid families (§15.8). It is an internal helper only — **no public tool, no
  resource** — and never sends `X-API-Key`.
- **Public resources remain credential-free** in every mode.
- **Zero MCP prompts.**
- **No dynamic registration** — no tool or resource is registered from
  `/v1/ai/tools` or `/v1/workflows`; tool/endpoint/pricing metadata is static and
  reconciled against the live catalog at call time.
- **The credential-bearing allowlist is exactly four routes** (§15.7):
  `/v1/stim/latest`, `/v1/stim/history`, `/v1/indicators/latest`,
  `/v1/indicators/history`. Any new paid route requires an explicit, separately
  reviewed promotion into that allowlist.
- **No x402, wallet, OAuth, `Authorization: Bearer` fallback, remote MCP,
  database, control-plane, or advice behavior** exists anywhere in the server.

## 3. Decision question

> **What should the next capability phase be after the Phase 5B indicators
> signoff?**

Phase 4 proved one paid family (ST-IM); Phase 5B proved a second (indicators) and
added the internal instrument resolver. The decision now is whether to (a) grow
the paid data surface with the next confirmed family, (b) add free public
resources, (c) open a heavier authority-sensitive family, (d) package/tag a
release milestone, or (e) open one of the deferred high-risk boundaries — and, if
growth is chosen, to define the gates that keep it safe.

## 4. Candidate paths to evaluate

- **A. `selections/latest` (and possibly `selections/history`) paid tool
  family.** Extend the proven Phase 4 / Phase 5B gated-adapter pattern to the
  latest confirmed selection universe endpoint, behind a Phase 5C design/contract
  memo.
- **B. Intelligence discovery / editorial free resources.** Expose the
  public/free `GET /v1/intelligence/discovery` and
  `GET /v1/intelligence/editorial/latest/preview` envelopes as credential-free
  MCP resources (no paid gate).
- **C. Portfolio / outcome resources.** Surface portfolio-oriented endpoints that
  appear in the API manifest (e.g. `/v1/stocktrends/portfolios{,/…}`,
  `/v1/portfolio/construct`, `/v1/portfolio/compare`, portfolio returns /
  positions / summary / strategy).
- **D. Release packaging.** Cut and package a milestone marking the Phase 4 +
  Phase 5A + Phase 5B state (five-tool paid surface + resolver) without adding
  capability.
- **E. Deferred high-risk boundaries — remote MCP / x402.** Architect a hosted
  transport (auth, tenancy, rate limiting, secret isolation) or a machine-payment
  rail (payment-header construction, `402` handling, signing, retry policy),
  neither of which exists today.

## 5. Evaluation criteria

Each candidate is scored against the following, which reflect the accepted ADRs,
the security model, and the current Stock Trends business posture:

1. **Strategic value for agent/client adoption.**
2. **Reuse of the proven Phase 4 / Phase 5B paid pattern** — gated adapter,
   `X-API-Key`-only auth, static pricing mirror, family-scoped catalog
   reconciliation, caps, mandatory preflight, no-retry.
3. **Architecture / security risk** — new attack surface, credential handling,
   payment/hosting/broad-sweep machinery introduced.
4. **Authority-boundary clarity** — keeps the adapter thin and API-authoritative
   (ADR-002), or risks recomputation, re-ranking, scoring, advice, or a second
   source of truth.
5. **Implementation complexity** — size and novelty of the build.
6. **Need for external/public API contract verification** — dependence on
   endpoint availability, auth, pricing rule, and schema facts that must be
   re-confirmed against the front-facing API before coding.
7. **Value without a payment/hosting redesign** — can value be added without
   opening the x402 or remote-MCP boundaries.
8. **Risk of multiplying operational confusion** — added gates, pricing rules,
   modes, or validation surface operators must reason about.
9. **Fit with current Stock Trends discoverability goals.**

## 6. Candidate analysis

For each candidate: benefits, risks, required preconditions, whether it needs a
design memo before implementation, whether Codex review should gate merge, and
whether Fable 5 should be reserved for it.

### A. `selections/latest` paid tool family

- **Benefits.** The **next confirmed paid family** and the natural continuation
  of the proven pattern. `GET /v1/selections/latest` has route/auth/schema
  recorded (Phase 4 memo §7; audit) and a recorded pricing rule
  `selections_latest_paid`. It reuses the gated adapter, `X-API-Key`-only auth,
  family-scoped static-mirror + catalog reconciliation, caps, preflight, and
  no-retry. It adds distinctive agent value: the current base ST-IM selection
  universe ranked by `prob13wk`. It opens **no** payment or hosting boundary.
- **Risks.** Selections is the **first list/universe-returning paid family** —
  it does not take a single symbol; it returns *many* rows. That inverts the risk
  profile from the single-symbol ST-IM/indicators tools:
  - **Broad-sweep / runaway-loop misuse** (SECURITY_MODEL §7, §8): a large
    default/max `limit` and universe-shaped output are exactly the misuse surface
    the security model calls out. This is the central new safety design, and it
    is why Phase 4 and Phase 5B deferred selections.
  - **Base-vs-published ambiguity**: `/v1/selections/latest` returns the **base**
    ST-IM selection universe, which is **not** identical to the strict published
    STIM Select list unless thresholds are applied or a published endpoint is
    used. A tool that blurs this could misrepresent selection quality.
  - **Re-ranking temptation**: the adapter must forward API-ranked rows verbatim
    and must never re-rank, re-threshold, or re-score them (ADR-002;
    MCP_SERVER_ARCHITECTURE no-recomputation rule).
  - Pricing/catalog reconciliation is **family-specific** and does not transfer
    from ST-IM or indicators; a fresh selections mirror must be verified.
- **Note on the instrument resolver.** Unlike indicators, selections is
  **exchange-scoped, not symbol-keyed on input**, so the §15.8 instrument-identity
  prerequisite does **not** gate it the same way — there is no bare symbol to
  resolve before the call. Any `symbol_exchange` identities the API *returns* must
  be preserved verbatim, not recomputed. The new prerequisite for selections is
  **limit/broad-sweep safety**, not instrument resolution.
- **Preconditions.** A Phase 5C design/contract memo that verifies the specifics
  (see §7 and §9).
- **Design memo before implementation?** **Yes — mandatory.** No paid family may
  be added without its own design/contract memo.
- **Codex review before merge?** **Yes** — paid execution is security-sensitive;
  the broad-sweep controls make independent review especially important.
- **Reserve Fable 5?** No. This reuses an established, bounded paid pattern; it
  does not cross a payment, hosting, multi-tenant, dynamic-registration, or
  authority-boundary line. The broad-sweep controls are ordinary cap/limit design,
  not a reserved boundary. Opus 4.8 for design, Sonnet 5 high for narrow doc
  follow-ups, Codex for the security review.

### B. Intelligence discovery / editorial free resources

- **Benefits.** `GET /v1/intelligence/discovery` and
  `GET /v1/intelligence/editorial/latest/preview` are recorded **public/free**
  surfaces. Exposing them as **credential-free MCP resources** (the Phase 1
  resource pattern) gives agents a safe, no-spend way to discover canonical
  published Intelligence Agent artifact ids and a free editorial preview —
  strategic for discoverability and for steering agents to free surfaces before
  paid artifacts. **Lowest new security risk** of the growth options: no key, no
  paid gate, no broad-sweep spend.
- **Risks.** Authority-boundary-sensitive in a narrow way: resources must forward
  API-published envelopes with **provenance intact** (source endpoint, artifact
  id, schema version, content hash where provided) and must not summarize,
  reinterpret, or generate. Their **public/free status must be re-verified** at
  design time (the audit flags this open question); if either has become
  paid/metered, it moves out of the free-resource class. These are **resources,
  not paid tools**, so they do not advance the *paid* surface — a different, and
  complementary, kind of value.
- **Preconditions.** A design/contract memo confirming continued public/free
  status, envelope schema, provenance fields, and fetch-on-request (no caching)
  behavior.
- **Design memo before implementation?** **Yes**, though lighter than a paid
  family (no pricing/caps/auth surface).
- **Codex review before merge?** Advisable but lighter — no credential or spend
  path is added.
- **Reserve Fable 5?** No. (The **paid** intelligence guidance/research artifacts
  remain the authority-sensitive candidate from the Phase 5B memo §6.E and are
  **not** this candidate.)

### C. Portfolio / outcome resources

- **Benefits.** Portfolio-shaped endpoints appear in the API manifest
  (`/v1/stocktrends/portfolios`, `.../{port_id}`, `.../returns`, `.../positions/history`,
  `.../summary`, `.../strategy`; `/v1/portfolio/construct`, `/v1/portfolio/compare`).
  Portfolio/outcome context could be distinctive for agents.
- **Risks.** **Most authority-sensitive of the data options.** Portfolio
  **construction**, **comparison**, **returns**, and **scoring** sit closest to
  allocation/risk/advice territory, which the security model and
  MCP_SERVER_ARCHITECTURE explicitly fence off (no recomputation of "portfolio
  scores"; no investment advice). Even pure forwarding of API-authored portfolio
  artifacts needs careful framing so agents do not read them as buy/sell/allocate
  guidance. Contract status is **unverified** — these routes appear only in the
  manifest, not in the Phase 4 contract memo, and their public/paid split, pricing
  rules, and schemas are unconfirmed. Some (`construct`, `compare`) are
  computational endpoints whose provenance and determinism need scrutiny.
- **Preconditions.** A dedicated, authority-boundary-first design memo (heavier
  than candidate A) that resolves the advice-adjacency framing, the
  API-authored-vs-recomputed line, provenance, and the public/paid contract — plus
  the same paid-gate machinery if any route is paid.
- **Design memo before implementation?** **Yes — authority-boundary-first.**
- **Codex review before merge?** **Yes**, and earlier.
- **Reserve Fable 5?** **Yes for the authority-boundary design** (whether/how
  portfolio outcomes may be surfaced without implying advice). It is heavier and
  later than A and B.

### D. Release packaging

- **Benefits.** Cheap. Records a clean, reviewed, documented state (Phase 4 +
  Phase 5A + Phase 5B: a five-tool paid surface plus the internal resolver) as a
  referenceable, pinnable milestone. More meaningful now than at Phase 5B because
  there is a genuine multi-family paid surface worth pinning/packaging.
- **Risks.** Adds no capability and no adoption value on its own. Tagging is
  already covered by the Phase 5A release checklist, so a standalone "phase" for
  it would be thin; it is better folded into whichever capability phase is chosen.
- **Preconditions.** Phase 5A release checklist satisfied; surfaces confirmed
  (1/5/0/resources); secret-safety scan clean; `main` green.
- **Design memo before implementation?** No — it is a release action, not a
  capability.
- **Codex review before merge?** Not required for a tag; normal review suffices.
- **Reserve Fable 5?** No.

### E. Deferred high-risk boundaries — remote MCP / x402

- **Benefits.** Remote/hosted MCP would let non-local clients reach the server;
  x402 would eventually enable machine-pay per-request access without a
  subscription key. Both are strategically interesting long term.
- **Risks.** **Highest new-boundary risk available.** Remote MCP requires
  authentication, tenancy, logging, rate limiting, and multi-tenant secret
  isolation the local stdio model intentionally avoids. x402 introduces
  payment-header construction, `402` handling, signing, and retry policy that do
  not exist today and must **not** be bolted onto the subscription path. Both are
  explicitly deferred by SECURITY_MODEL §4, §12 and §15.6.
- **Preconditions.** A dedicated architecture-first design phase, separate from
  any data-tool work, with its own security review.
- **Design memo before implementation?** **Yes — architecture-only first**, and
  separate.
- **Codex review before merge?** **Yes**, and earlier — even the design memo
  warrants security scrutiny.
- **Reserve Fable 5?** **Yes.** Hosted transport, multi-tenant auth/secret
  isolation, and payment-rail/wallet design are exactly the class of
  authority-boundary-sensitive work for which Fable 5 is reserved. **Not selected
  for Phase 5C.**

## 7. Recommended next phase

**Recommended next phase: Phase 5C — `selections/latest` Paid Tool Family Design
and Contract Verification (candidate A).**

Rationale, grounded in the governing docs:

- Phases 4 and 5B **proved the gated paid-adapter pattern twice** — auth, static
  pricing mirror, family-scoped catalog reconciliation, caps, preflight,
  no-retry, and rollback. Extending it to the next **confirmed** paid family is
  the highest-value, lowest-novel-risk capability move available.
- It **adds agent-facing value without opening the x402 or remote-MCP boundaries
  (E)** the design deliberately keeps out, and without the heavier
  authority-boundary design that portfolio/outcome (C) requires.
- The distinctive new risk — **broad-sweep/list misuse and base-vs-published
  ambiguity** — is real but **containable by gating implementation behind a
  design/contract memo** that fixes limit caps and the base-vs-published contract
  before any code is written. That is exactly why selections was deferred through
  Phases 4 and 5B and is now the right subject of a dedicated design phase.
- Free intelligence resources (B) are attractive and **low-risk**, but they grow
  the *free-resource* surface, not the paid surface, and can be scheduled
  independently (see §11 note). Release packaging (D) is a release action, not a
  capability. The deferred boundaries (E) are out of scope.

**Recommendation is for design/contract verification next — not implementation.**
No selections code, tool registration, allowlist promotion, or live validation is
authorized by choosing this path.

**Implementation must not begin** until a Phase 5C design/contract memo selects
the exact selection endpoint(s) and confirms, from the front-facing API contract,
everything in §9.

## 8. Candidate paid/free families considered

Evaluated from [`API_CAPABILITY_COVERAGE_AUDIT.md`](API_CAPABILITY_COVERAGE_AUDIT.md)
and [`PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md`](PHASE4_API_CONTRACT_CONFIRMATION_MEMO.md).
No endpoint support is invented here; each family is marked with its verification
status. A "requires contract verification" mark means the Phase 5C design/contract
memo must re-confirm the specifics against the live front-facing API even where a
route is already documented. This memo makes **no live call** to any of them.

| Family | Contract status in existing docs | Notes / suitability |
| --- | --- | --- |
| **`selections/latest`** (`GET /v1/selections/latest`) | **Latest route/auth/schema confirmed** (Phase 4 memo §7; audit); pricing rule `selections_latest_paid`. **Endpoint-specific pricing/catalog reconciliation, limit semantics, and base-vs-published distinction require contract verification.** | **Recommended next family.** Confirmed paid route; reuses the proven pattern. Central new burden is broad-sweep/limit safety and the base-vs-published contract, not instrument resolution. |
| **`selections/history`** (`/v1/selections/history` listed as a v1 candidate) | **Requires contract verification.** Listed as an "Additional v1 Candidate"; not confirmed to the ST-IM/indicators standard. | Would pair with latest if verified. The Phase 5C memo must prove the route, pricing rule, and history limit semantics before pairing; otherwise ship latest alone. |
| **Published STIM Select** (`/v1/selections/published/latest`, `/v1/selections/published/history` — candidates) | **Requires contract verification.** Candidate routes only. | Relevant to resolving the base-vs-published ambiguity: the *published* list is the canonical strict STIM Select set. The Phase 5C memo must decide whether the base or published route (or both, clearly distinguished) is surfaced. |
| **Intelligence discovery / editorial (free)** (`GET /v1/intelligence/discovery`, `GET /v1/intelligence/editorial/latest/preview`) | **Recorded public/free**; public/free status is an open question to re-verify at implementation time. | Free-resource candidate (B), not a paid family. Low risk; complementary; schedulable independently. |
| **Portfolio / outcome** (`/v1/stocktrends/portfolios{,/…}`, `/v1/portfolio/construct`, `/v1/portfolio/compare`, returns/positions/summary/strategy) | **Requires contract verification.** Manifest entries only; not in the Phase 4 contract memo; public/paid split, pricing rules, and schemas unconfirmed. | Authority-sensitive (candidate C). Advice-adjacent; needs its own boundary-first phase. Not the next low-risk increment. |
| **Paid intelligence guidance/research artifacts** (`.../guidance/latest`, `.../research/latest`, `{artifact_id}`) | Route/class confirmed; provenance, by-id-vs-latest, and paid-gate specifics require verification. | Authority-boundary-sensitive (Phase 5B memo §6.E). Belongs to its own careful phase, not this increment. |

## 9. Blockers the Phase 5C design/contract memo must clear before implementation

Implementation of `selections/latest` (or any selection route) must not begin
until a Phase 5C design/contract memo confirms, from the front-facing API
contract:

1. **Endpoint availability and pairing** — exact path(s) and method; whether
   `/v1/selections/history` and/or `/v1/selections/published/*` exist as
   front-facing routes and should pair with latest, or whether latest ships alone.
2. **Auth requirement** — `X-API-Key` subscription only; x402 remains deferred.
   Any selected paid route requires an explicit, separately reviewed **promotion
   into the auth-capable allowlist** (§15.7); it is denied
   `endpoint_not_allowlisted` until promoted.
3. **Pricing / catalog rule** — the exact `selections_latest_paid` (and any
   history/published) rule id(s), and a **fresh, family-specific static pricing
   mirror** that **fails closed** on non-reconciliation; STC `cost_unit`/`unit`
   enforcement; **family-scoped** reconciliation (a selections call reconciles
   only the selections rule group; ST-IM/indicators success never satisfies it).
4. **Broad-sweep / limit safety (the central new control)** — a safe **default
   `limit`** and a hard **maximum `limit`** (row ceiling per call); per-session
   and per-tool call caps (default `0` = deny); a covering STC/USD budget cap;
   loop detection posture for repeated identical selection calls; and an explicit
   **no-universe-sweep** rule. Because selections returns a list, cap semantics
   differ from the single-symbol tools and must be designed, not inherited.
5. **Base-vs-published contract** — a definitive statement of what
   `/v1/selections/latest` returns (base ST-IM universe) versus the strict
   published STIM Select list, and tool-description language that prevents an
   agent from conflating them or overstating selection quality.
6. **Request schema** — required/optional inputs (`exchange`, `min_prob13wk`,
   `limit`, `include_data`, `include_mast`, `cs_only`), their validation, and
   which are gated by the limit-safety rules.
7. **Response wrapping** — raw `api_data` preserved (API-ranked rows verbatim,
   no re-ranking/re-thresholding), `mcp_metadata` added, provenance and
   base-vs-published limitation notes; `observed_cost` / `payment_status` remain
   `null` unless the API returns them (never fabricated).
8. **Authority boundary** — explicit confirmation that the adapter forwards
   API-authored selection rows and **does not** rank, threshold, score, or advise.
9. **Controlled validation plan** — a one-off, operator-authorized,
   operator-supervised procedure with rollback to default free mode; mock-only
   automated tests; **no** live call in CI.

If the Phase 5C design/contract memo cannot confirm selections' pricing/catalog
reconciliation, limit semantics, or the base-vs-published contract, it should
**explicitly defer final selection** (and may fall back to the low-risk free
intelligence resources, candidate B) rather than force implementation.

## 10. Non-goals for the next phase

The next phase reaffirms — and does not relax — the following exclusions:

- **No x402 / wallet** unless a separate x402 design phase is independently
  selected.
- **No remote / hosted MCP** unless a separate hosted-MCP design phase is
  independently selected.
- **No OAuth / `Authorization: Bearer` fallback.** `X-API-Key` remains the only
  credential path.
- **No database / control-plane access.**
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`; metadata
  stays static and catalog-reconciled.
- **No investment advice** — no buy/sell/hold/allocation/risk output.
- **No recomputation, re-ranking, re-thresholding, or scoring** of selections,
  ST-IM, indicators, portfolios, or intelligence conclusions.
- **No auto-promotion into the auth-capable allowlist** — a new paid route is
  executable only after an explicit, separately reviewed promotion (§15.7).
- **No unattended, scheduled, autonomous, or recurring live validation.**
- **No live paid execution without an operator-supervised validation plan** —
  live runs remain one-off, operator-authorized, operator-supervised, and
  followed by rollback to default free mode.

Selections-specific fail-closed exclusions:

- **No unbounded or universe-sweep selection calls** — a hard maximum `limit` and
  covering caps/budget must gate every call; a nonzero cost with no covering
  budget is denied `spend_cap_exceeded`.
- **No base-vs-published conflation** — the tool must not present the base ST-IM
  selection universe as the strict published STIM Select list.
- **No adapter-side ranking or thresholding** — API-ranked rows are forwarded
  verbatim; `min_prob13wk` and `limit` are passed to the API, not applied locally
  as a second ranking pass.

## 11. Proposed PR sequence

Incremental and independently reviewable, consistent with the Phase 4 / 5B
cadence. Names may be adjusted; the sequence stays incremental.

| PR | Scope |
| --- | --- |
| **PR 43** | Phase 5C next-capability selection memo (this document). Docs-only; adds one README documentation-index link; no runtime change. |
| **PR 44** | `selections/latest` design and API contract verification memo — confirms endpoint availability/pairing, auth, pricing rule(s), family-specific static pricing mirror + catalog reconciliation, request schema, response wrapping, **broad-sweep/limit-safety controls**, the **base-vs-published contract**, cap/budget semantics, and the controlled validation plan. Docs-only. |
| **PR 45** | `selections/latest` implementation foundation — gated registration, auth-capable allowlist promotion, family-specific pricing mirror/reconciliation, limit/broad-sweep caps, preflight, mocked tests only. **No live validation, no real API key, no x402, no paid endpoint call.** |
| **PR 46** | Controlled validation plan — the operator-supervised, one-off validation procedure, checklists, and assertions, including limit-cap and base-vs-published assertions (documentation; no live run yet). |
| **PR 47** | Completed controlled validation report — only if operator-authorized live validation is separately approved and supervised, followed by rollback to default free mode. |
| **PR 48** | Production-readiness signoff — declares controlled operator readiness once PRs 44–47 and independent Codex review are complete, weakening no boundary. |

Note: the **free intelligence discovery / editorial resources (candidate B)** can
be scheduled as an independent, lighter track (no pricing/caps/auth), before or in
parallel with the selections track, if leadership prefers to grow the free-resource
surface first. If leadership instead selects a boundary phase (E) or defers, this
sequence is replaced by that phase's own architecture-first memo sequence.

## 12. Model / review guidance

- **Opus 4.8** — normal architecture/design docs (this memo; the Phase 5C
  design/contract memo).
- **Sonnet 5 high** — narrow README/doc implementation **after** the architecture
  is settled (e.g. documenting the selections tool family once its design is
  approved).
- **Codex GPT-5.5 Extra High** — security-sensitive reviews **before**
  implementation merges (the selections implementation, the pricing/reconciliation
  and limit-cap code, and any live-validation report), as used for Phases 4 and 5B.
- **Fable 5 — reserved** for x402 / wallet design, remote / hosted MCP design,
  multi-tenant auth / secret isolation, dynamic-registration policy, the
  portfolio/outcome authority-boundary design (candidate C), or Intelligence Agent
  paid-artifact authority-boundary changes. The recommended Phase 5C selections
  increment does **not** cross these lines and does not require Fable 5.

## 13. Final recommendation

**Proceed with Phase 5C — `selections/latest` Paid Tool Family Design and Contract
Verification next**, as **design/contract verification, not implementation**.
Selections is the next confirmed paid family and the smallest safe delta from the
twice-proven gated paid-adapter pattern, but it is the first list/universe family,
so its design/contract memo must resolve **broad-sweep/limit safety** and the
**base-vs-published contract** before any code, tool registration, allowlist
promotion, or live validation begins.

Free intelligence discovery / editorial resources remain an attractive, low-risk
complementary track that can be scheduled independently. Portfolio/outcome
resources and the paid intelligence artifacts remain authority-sensitive and
belong to their own boundary-first phases. Remote MCP and x402 remain deferred
high-risk boundaries reserved for a separate architecture-first phase and Fable 5.

No implementation is authorized by this memo. The next step is a Phase 5C
design/contract memo (PR 44) that selects and verifies the exact selection
endpoint(s), the family-specific pricing/catalog reconciliation, the limit-safety
controls, and the base-vs-published contract. **No code, no tool registration, no
allowlist promotion, and no live validation may begin until that design memo is
written, reviewed, and approved.**
