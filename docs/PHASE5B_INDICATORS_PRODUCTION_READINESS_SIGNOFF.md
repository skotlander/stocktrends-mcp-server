# Phase 5B Indicators Production Readiness Signoff

**Status: Approved for controlled operator use under existing local stdio
paid-mode controls.**

Signoff date: 2026-07-10

State of the capability at signoff:

- **Implementation merged** — the internal credential-free instrument resolver
  and the paired paid indicators tools landed on `main` (PR #39, mock-only).
- **Contract verification complete** — the indicators and instrument
  lookup/resolve contracts were verified credential-free (PR #38).
- **Controlled validation plan merged** — the operator-supervised, one-off
  validation procedure landed on `main` (PR #40).
- **Controlled live validation report merged** — a single operator-authorized,
  operator-supervised live run was performed and recorded (PR #41).
- **Codex GPT-5.5 Extra High reviewed and approved the validation report.**
- **No further live validation is performed by this signoff.**

> **What this signoff is.** This document declares that the Phase 5B indicators
> capability is ready for **controlled operator use** under the **existing**
> paid-mode gates and documented safety constraints. It is a readiness
> declaration built on already-merged, already-reviewed evidence.
>
> **What this signoff is not.** It is **not** a new validation run, **not** a new
> implementation, and **not** a production deployment procedure. It does **not**
> authorize unattended, autonomous, scheduled, recurring, CI, remote, or
> background paid validation, and it **does not weaken any security boundary.**
> No live API call is made by this document; no API key is used, requested,
> inspected, printed, logged, or stored; no MCP Inspector session is run; and no
> paid validation is performed to produce it.

This signoff builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15 (and §15.8, the internal
  credential-free resolver) — the reconfirmed paid-mode security model.
- [`README.md`](../README.md) — the free/paid mode contract and environment
  variable table.
- [`PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md`](PHASE5B_INDICATORS_AND_INSTRUMENT_RESOLUTION_DESIGN_MEMO.md)
  — the approved design and identity/resolution flow.
- [`PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md`](PHASE5B_INDICATORS_CONTRACT_VERIFICATION_MEMO.md)
  — the verified API contract (including the §6.3 `prefer_exchange=N` caveat).
- [`PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md`](PHASE5B_INDICATORS_IMPLEMENTATION_NOTES.md)
  — what PR #39 implemented (mock-only).
- [`PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_PLAN.md)
  — the operator-controlled validation procedure (PR #40).
- [`PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md)
  — the completed controlled live validation report (PR #41).
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the operator-facing preconditions and secret-safety scan.

## 1. Meaning of this signoff

This signoff means exactly one thing: the Phase 5B indicators capability is
**ready for controlled operator use under the existing paid-mode gates and
documented safety constraints.** It carries the capability from
"implemented + validated + independently reviewed" to "approved for controlled
local stdio operator use," and nothing further. Every gate, cap, credential
rule, and fail-closed behavior described in
[`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15 remains in force unchanged.

## 2. Scope

In scope for this signoff:

- The **internal credential-free instrument resolver**
  (`resolveInstrumentIdentity`) — an internal helper only; it adds no public MCP
  tool and no MCP resource.
- **`stocktrends_get_indicators_latest`** → `GET /v1/indicators/latest`.
- **`stocktrends_get_indicators_history`** → `GET /v1/indicators/history`.
- **Local stdio MCP server only** — `STOCKTRENDS_MCP_TRANSPORT=stdio`; no other
  transport.

Approved front-facing Stock Trends API endpoints referenced by this capability:

| Endpoint | Role | Credential |
| --- | --- | --- |
| `/v1/indicators/latest` | Paid indicators (latest) | `X-API-Key` only, after all gates |
| `/v1/indicators/history` | Paid indicators (history) | `X-API-Key` only, after all gates |
| `/v1/instruments/lookup` | Internal resolver — bare-symbol disambiguation | **Credential-free** (never keyed) |
| `/v1/instruments/resolve` | Internal resolver — explicit `symbol`+`exchange` | **Credential-free** (never keyed) |
| `/v1/pricing/catalog` | Family-scoped catalog reconciliation | **Credential-free** (never keyed) |

Surface contract (unchanged by this signoff):

- **Free/default mode remains exactly one tool** —
  `stocktrends_estimate_workflow_cost`.
- **Paid-exposed mode remains exactly five tools** — the planning tool, the
  paired paid ST-IM tools, and the paired paid indicators tools.
- **Zero MCP prompts** in every mode.
- **Public resources remain credential-free** in every mode.

## 3. Completion evidence

The evidence chain is fully merged to `main`:

| PR | Contribution | State |
| --- | --- | --- |
| **#36** | Phase 5B next-capability selection (indicators family + resolver prerequisite) | Merged |
| **#37** | Indicators / instrument-resolver design and contract memo | Merged |
| **#38** | Indicators contract verification (credential-free) | Merged |
| **#39** | Indicators tools + internal resolver implementation, mock-only tests | Merged |
| **#40** | Controlled validation plan | Merged |
| **#41** | Controlled live validation report | Merged |

Independent review:

- **Codex review of PR #39 — approved after blocker fixes.** The implementation
  was approved once the raised blockers (including the malformed-`count`
  fail-closed hardening and mandatory catalog unit enforcement) were resolved.
- **Codex review of PR #41 — approved.** The completed controlled validation
  report was independently reviewed and approved.
- **Codex GPT-5.5 Extra High reviewed and approved the validation report**,
  satisfying the independent-review precondition that PR #40 §14 and PR #41 §10
  left open.

**Current `main` commit: `23ae0fe`** (`Add indicators controlled validation
report (#41)`).

## 4. Controlled validation result

Summarized from
[`PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md`](PHASE5B_INDICATORS_CONTROLLED_VALIDATION_REPORT.md)
(recorded exactly as observed; not re-run here):

- **Overall result: PASS WITH DEVIATIONS.** Deviations are procedural and
  assessed non-blocking (report §9).
- **Exactly two paid calls** were made — one `indicators_latest` and one
  `indicators_history`.
- **Latest call cost: `0.0035 STC`** (preflight `estimated_cost`,
  `indicators_latest_paid`).
- **History call cost: `0.01 STC`** (preflight `estimated_cost`,
  `indicators_history_paid`).
- **Total spend: `0.0135 STC`** of a `0.02 STC` session budget.
- **Cap probe denied** — a third invocation was denied `spend_cap_exceeded`
  before the paid boundary, with **no paid request, no auth header, and no
  spend**.
- **Default/free one-tool surface confirmed** — exactly one tool with no paid
  variables set.
- **Paid-exposed five-tool surface confirmed** — the planning tool plus the two
  ST-IM and two indicators tools.
- **Zero prompts confirmed** in every configuration.
- **Rollback completed** — server-side restart with no `STOCKTRENDS_*` variables
  returned to the one-tool surface.
- **Operator-side shell cleanup completed** — the operator unset all paid
  `STOCKTRENDS_*` variables (key, flags, caps, budgets, preflight), with boolean
  presence checks returning `false` (no values printed).
- **No secrets in report** — only `REDACTED` placeholders appear.
- **Production-readiness was pending independent review**, and that condition is
  now **satisfied** by the Codex review of the report referenced in §3.

## 5. Runtime authority boundary

The controlling authority boundary is unchanged and must not be weakened:

```text
Stock Trends dataset -> Stock Trends API -> published Stock Trends API responses/artifacts -> MCP adapter -> external MCP clients/agents
```

Reaffirmed:

- The **MCP server is a thin adapter** over the front-facing Stock Trends API.
- It has **no database or control-plane access**.
- It has **no reasoning authority** — it does not recompute or reinterpret
  indicators, ST-IM, selections, or intelligence conclusions.
- It has **no pricing authority beyond a static mirror plus live catalog
  reconciliation** — the static mirror is a local safety basis only and never
  authorizes a call by itself.
- It has **no payment authority** — no payment header, no x402, no wallet, no
  settlement.
- It provides **no investment advice** — no buy/sell/hold/allocation/risk output;
  indicator fields are API-authored and forwarded verbatim.

## 6. Approved operating boundary

Controlled operator use is bounded by the existing controls, all of which remain
mandatory:

- **Local stdio only** — no remote MCP transport.
- **Paid tools are exposed only** with `STOCKTRENDS_ENABLE_PAID_TOOLS=true`
  **and** `STOCKTRENDS_API_KEY` present.
- **Paid execution occurs only** with `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`
  **and** explicit nonzero caps/budgets covering the nonzero cost.
- **Pricing preflight / catalog reconciliation is mandatory** —
  `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` stays `true`; setting it `false` denies
  execution rather than skipping the requirement.
- **`X-API-Key` is sent only** to the approved paid ST-IM and indicators
  endpoints, and **only after every gate passes**.
- **No API key** is ever sent to public resources, the pricing catalog, the
  `stocktrends_estimate_workflow_cost` planning tool, or the internal resolver's
  `/v1/instruments/lookup` and `/v1/instruments/resolve` reads.
- **No `Authorization: Bearer`** header, ever.
- **No payment header**, ever.
- **No x402, wallet, or OAuth** behavior.
- **No automatic retries** — exactly one attempt per authorized call.
- **No remote MCP.**
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **Zero prompts.**

## 7. Resolver signoff

The internal credential-free instrument resolver is approved as validated:

- **Canonical `symbol_exchange` path is trusted after validation** — no discovery
  call — and converted to API hyphen form (`IBM_N` → `IBM-N`).
- **Bare symbol path uses lookup-first, count-based ambiguity handling** via
  `GET /v1/instruments/lookup` (requires a valid integer `count === 1` and exactly
  one usable canonical match).
- **The bare symbol path does not use `/v1/instruments/resolve`'s default
  `prefer_exchange=N`** — it never sends `prefer_exchange`, so the default-`N`
  US auto-pick can never occur (contract memo §6.3).
- **Ambiguous, no-match, invalid, and conflicting input fail closed before the
  paid boundary** — ambiguity returns the candidate `symbol_exchange` matches;
  none proceeds to a paid call.
- **Explicit `symbol` + `exchange` uses the explicit exchange** — verified via
  `/v1/instruments/resolve` with `prefer_exchange` equal to the supplied
  exchange, never the default.
- **Lookup and resolve are credential-free** — Accept + User-Agent only; never
  `X-API-Key`, `Authorization`, or a payment header.
- **No cap debit and no paid call occur on resolver failure** — resolution
  completes before any pricing preflight, cap debit, auth-header construction, or
  paid fetch.

## 8. Pricing / cap signoff

The family-specific pricing and cap enforcement is approved as validated:

- **`indicators_latest_paid` = `0.0035 STC`.**
- **`indicators_history_paid` = `0.01 STC`.**
- **ST-IM prices remain distinct** (`stim_latest_paid` `0.0025`,
  `stim_history_paid` `0.0075 STC`) and are never reused for indicators.
- **Catalog `cost_unit`/`unit` STC enforcement** — reconciliation requires the
  verified `STC` unit; a missing, unsupported, or conflicting unit fails closed
  even when the numeric cost matches.
- **Family-scoped reconciliation** — a paid indicators call reconciles only the
  indicators rule group; a successful ST-IM reconciliation never gates or
  satisfies indicators (and vice versa).
- **Missing or mismatched catalog fails closed**
  (`pricing_catalog_reconciliation_failed`) — no auth header, no fetch.
- **Caps/budgets are enforced before the paid fetch** — per-session and per-tool
  call caps (default `0` = deny) and a covering budget cap must pass first.
- **`observed_cost` / `payment_status` are not fabricated** — they remain `null`
  unless the API returns them (subscription mode does not); a static/catalog
  estimate is never presented as an observed charge.

## 9. Release / usage conditions

Controlled operator use is allowed **only if all** of the following hold at run
time:

- [ ] **`main` is clean** — no uncommitted changes in the checkout used.
- [ ] **Tests / build pass** — `npm run typecheck`, `npm test`, and `npm run
      build` succeed.
- [ ] **The API key is supplied outside the repo** — process-local /
      session-local only; never committed, pasted into chat, or written to a repo
      file.
- [ ] **Caps and budgets are explicit and nonzero** for any paid call, sized to
      cover the known nonzero indicators cost.
- [ ] **The operator understands paid usage may occur** — enabling execution
      permits real chargeable STC debits.
- [ ] **Rollback steps are known** — the operator can return to the one-tool
      free surface immediately (plan §11).
- [ ] **Any observed mismatch stops the session** — a pricing/catalog mismatch,
      resolver ambiguity issue, auth failure, or unexpected paid behavior halts
      use rather than being worked around.
- [ ] **No secrets enter reports, logs, screenshots, chats, commits, or issues**
      — placeholders only; a real key that appears anywhere is treated as
      compromised and rotated out of band.

## 10. Non-goals / not approved

This signoff does **not** approve any of the following:

- **No public instrument tools** — the resolver stays internal-only.
- **No additional indicators endpoints** beyond latest/history.
- **No bulk scans.**
- **No multi-symbol inputs** — exactly one instrument per call.
- **No universe sweeps.**
- **No remote MCP.**
- **No x402 / wallet / OAuth / `Authorization: Bearer`.**
- **No payment headers.**
- **No database / control-plane access.**
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No prompts.**
- **No investment advice.**
- **No autonomous production agent operation** — the run is manual, supervised,
  and controlled.

## 11. Residual risks and monitoring

Even under controlled operator use, the following residual risks remain and must
be monitored:

- **The live API contract could change** — routes, schemas, or response fields
  may drift from the verified contract.
- **Instrument ambiguity can change over time** — a symbol that is unambiguous
  today may become dual-listed (or vice versa); ambiguity is a property of the
  live instrument universe.
- **The pricing catalog could change** — a catalog cost, unit, or rule id change
  would (correctly) fail reconciliation closed.
- **API availability and rate limits can affect execution** — `429`/`5xx`/
  unavailability fail closed with no retry.
- **The operator must monitor the first real use after signoff** and confirm
  observed behavior matches this document.
- **Any catalog mismatch, resolver ambiguity issue, auth failure, or unexpected
  paid behavior should stop use and trigger a follow-up issue/PR** rather than
  being bypassed.

## 12. Final signoff

- **The Phase 5B indicators capability is production-ready for controlled local
  stdio operator use** under the documented paid-mode gates and safety
  constraints.
- **This is not a signoff** for remote MCP, public instrument tools, bulk
  execution, autonomous production usage, or any payment / x402 / wallet
  behavior.
- **Next architectural work should proceed only after this boundary is
  preserved** — the thin-adapter authority boundary, the credential-free resolver
  and public surfaces, the exposure-vs-execution gate split, mandatory
  family-scoped reconciliation, and the fail-closed cap policy must all remain
  intact.
