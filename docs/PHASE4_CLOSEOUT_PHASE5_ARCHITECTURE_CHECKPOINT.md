# Phase 4 Closeout and Phase 5 Architecture Checkpoint

## 0. Purpose and scope

This memo is **documentation only**. It records that Phase 4 — the first paid
ST-IM MCP execution path — is complete, pricing-corrected, live-validated,
independently reviewed, and documented; and it defines the architectural
options and recommended next phase **without beginning any implementation**.

Nothing in this memo changes runtime behavior. No source, test, packaging, or
configuration file is modified as part of this checkpoint. No live API call was
made and no secret was used, requested, inspected, printed, logged, or stored
while writing it.

This memo builds on and does not supersede:

- [`ARCHITECTURE_DECISIONS.md`](ARCHITECTURE_DECISIONS.md) — the accepted ADRs
  that constrain the design (authority boundary, thin-adapter posture).
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — the security model for paid ST-IM
  live execution.
- [`MCP_SERVER_ARCHITECTURE.md`](MCP_SERVER_ARCHITECTURE.md) — the local stdio
  server architecture.
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the approved paid ST-IM design and gate policy.
- [`PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md`](PHASE4_PAID_STIM_PRICING_MIRROR_CORRECTION_MEMO.md)
  — the corrected static pricing mirror.
- [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_PLAN.md)
  and
  [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
  — the plan and completed results for the controlled live validation run.

## 1. Phase 4 final status

Phase 4 is closed. The paid ST-IM MCP execution path exists, is gated, has been
exercised once under controlled live validation, and is documented. The
architecture at close is:

- **Transport.** Local `stdio` MCP server remains the only transport. No remote
  HTTP/SSE/Streamable HTTP hosting exists.
- **Default (free) surface.** Default mode exposes exactly one public/free tool:
  `stocktrends_estimate_workflow_cost`.
- **Paid surface.** Paid mode exposes exactly three tools:
  - `stocktrends_estimate_workflow_cost`
  - `stocktrends_get_stim_latest`
  - `stocktrends_get_stim_history`
- **Execution is a behavior change, not a surface change.** Enabling
  execution-enabled paid mode changes *call behavior* (whether a live authorized
  fetch occurs), not the *tool count*. The three-tool paid surface is identical
  whether or not `STOCKTRENDS_ENABLE_PAID_EXECUTION` is set; the execution flag
  only governs whether the two paid ST-IM tools perform a live authorized fetch
  or fail closed.
- **Prompts.** Zero MCP prompts.
- **Public resources.** Public resources remain credential-free.
- **No dynamic registration.** No tool or resource is registered dynamically
  from `/v1/ai/tools` or `/v1/workflows`.
- **No payment/identity/hosting machinery.** No x402, wallet, OAuth,
  `Authorization: Bearer`, remote MCP, database, or control-plane behavior
  exists anywhere in the server.
- **No advice.** No investment advice, guidance, or recommendation is generated.
  The adapter forwards API-authored responses only.

## 2. Phase 4 evidence trail

The Phase 4 paid ST-IM path was landed and corrected across the following PR
sequence. Each PR is documentation and/or narrowly-scoped implementation as
recorded in the corresponding `docs/` artifact:

| PR | Contribution |
| --- | --- |
| #22 | Live ST-IM execution implementation (gated subscription/API-key fetch). |
| #23 | Live execution validation report (mock-only automated coverage). |
| #24 | Controlled live validation **plan** (process, checklists, assertions). |
| #25 | Controlled live validation report **scaffold** (pre-run structure). |
| #26 | Supervised-agent live validation **doctrine correction** (clarified that the run is operator-authorized and operator-supervised, not autonomous). |
| #27 | Pricing mirror **correction memo** (identified the stale static mirror). |
| #28 | Pricing mirror **implementation correction** (corrected the static mirror to reconcile against the live catalog). |
| #29 | Completed controlled live validation **report** (the actual recorded run). |

The current `main` includes `9ed6b2d` (#29) and is clean.

## 3. Controlled live validation result

A single operator-authorized, operator-supervised controlled live validation
run was performed against the real Stock Trends API through a supervised MCP
Inspector session, and is recorded in
[`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md).
The result, summarized:

- **One latest MCP tool call passed** (`stocktrends_get_stim_latest`).
- **One history MCP tool call passed** (`stocktrends_get_stim_history`).
- **Pricing catalog reconciliation passed** on both calls
  (`reconcileStaticPricingWithCatalog`, `pricing_reconciliation.status:
  reconciled`), against the corrected static mirror.
- **`X-API-Key` was used only for the two approved ST-IM endpoints**
  (`GET /v1/stim/latest`, `GET /v1/stim/history`) and was never sent to any
  public resource, the planning tool, the pricing catalog, or any other
  endpoint.
- **No payment header** was constructed or sent (`payment_header_sent: false`).
- **No x402, wallet, OAuth, or `Bearer` behavior** was observed anywhere in the
  run.
- **`observed_cost` remained `null`** on both calls — not returned by the API,
  and not derived or fabricated.
- **`IBM_N` MCP input was converted/preserved as `IBM-N`** for API interaction:
  the canonical underscore input form was translated to the hyphenated
  outbound/API form and preserved verbatim in the returned wrapper.
- **Rollback / default free mode was confirmed** — after the run, paid execution
  and paid tools were disabled, the API key was removed, the Inspector session
  was restarted, and the default-mode tool listing showed only
  `stocktrends_estimate_workflow_cost`.
- **One minor deviation:** the history call used a date-range window
  (`2026-01-01` to `2026-07-03`) and returned 25 rows, rather than the plan's
  preferred minimal `limit: 1` shape. This was still exactly one history call —
  no sweep, no repeat, no retry — and was assessed as a non-blocking deviation
  from preferred call-shape guidance, not a violation of any bounded-execution,
  auth, or cap rule.
- **Independent Codex review approved the report** after a wording correction.
  With that independent review complete, the sole remaining Phase 4
  production-readiness prerequisite noted in the validation report has been
  satisfied for the purpose of closing Phase 4.

## 4. Architectural interpretation

- The MCP adapter is now **proven as a thin, gated paid adapter** over the
  front-facing Stock Trends API for the first paid ST-IM tool pair. It forwarded
  authorized requests, preserved API-authored semantics, and generated no
  independent computation or advice — consistent with ADR-002's authority
  boundary.
- The **static pricing mirror / catalog reconciliation design was validated both
  negatively and positively**:
  - **Negatively:** a stale mirror caused **fail-closed denial before any auth
    or fetch** occurred (the condition that PR #27/#28 corrected).
  - **Positively:** the corrected mirror allowed **bounded paid execution**,
    reconciling cleanly against the live catalog on both calls.
- Taken together, this is **strong evidence the authority boundary is working**:
  pricing authority remains with the API catalog, the adapter refuses to spend
  when its local mirror cannot reconcile, and it only proceeds within bounded,
  reconciled, operator-authorized limits.

## 5. Remaining constraints

These constraints remain in force at Phase 4 close and are not relaxed by this
checkpoint:

- **Local stdio only.** No remote/hosted transport.
- **Subscription / API-key only for paid execution.** `X-API-Key` is the only
  credential; there is no payment or wallet path.
- **x402 / wallet / remote MCP hosting remain future work** and are not
  partially present anywhere in the server.
- **Only ST-IM latest/history paid tools are live-enabled.** No other endpoint
  is wired for paid execution.
- **No other paid endpoints should be added without design review.** Each new
  paid tool family requires its own design memo, endpoint-specific
  pricing/catalog reconciliation, and controlled validation.
- **No live validation should be treated as recurring or automated.** Live runs
  are one-off, operator-authorized, and operator-supervised. There is no
  scheduled, unattended, or autonomous live execution.

## 6. Phase 5 candidate paths

The following are candidate next paths. They are described here for decision
purposes only; **none is implemented or partially implemented by this memo.**

### A. Operational hardening / user readiness

- README usage instructions.
- Local MCP configuration examples.
- Safer validation runbook.
- Install / start troubleshooting.
- Optional release tagging.

### B. Add next paid tool family

- Likely candidates: indicators latest/history, prices latest/history,
  selections latest/history, or intelligence artifacts.
- **Requires a design memo before implementation.**
- **Requires endpoint-specific pricing/catalog reconciliation and controlled
  validation** — the ST-IM pricing reconciliation does not transfer to other
  endpoints.

### C. x402 / wallet design phase

- **Architecture-only first.**
- Must **not** be bolted onto the existing subscription path.
- Requires a **new, separate payment-boundary design** (payment header
  construction, `402` handling, signing, retry policy) that does not exist today.

### D. Remote MCP / hosted MCP design phase

- **Architecture-only first.**
- Requires design for authentication, tenancy, logging, rate limiting, and
  secret isolation before any hosting work.

### E. Intelligence Agent artifact MCP resources/tools

- Should **only surface API-published artifacts** (per ADR-002/ADR-003).
- **No recomputation and no hidden reasoning** — the adapter must not generate,
  reinterpret, or synthesize intelligence output.

## 7. Recommended next phase

**Recommended next phase: Phase 5A — Operational Hardening and Public
Readiness**, before adding more paid tools or introducing x402.

Rationale:

- The **first paid execution path is now proven**, so the marginal risk of a
  pause on new paid surface is low.
- The **immediate value is making the server easier and safer to install, run,
  inspect, and demonstrate** — not adding capability.
- **Better docs and config examples reduce friction for agent/client adoption**,
  which multiplies the value of the paid path that already works.
- **Adding more paid endpoints before hardening could multiply operational
  confusion** (more gates, more pricing rules, more validation surface) on top
  of a server that is not yet documented for operators.
- **x402 and remote MCP deserve separate architecture phases** with their own
  boundaries; folding them into hardening would blur the payment and hosting
  boundaries the current design deliberately keeps out.

## 8. Proposed Phase 5A scope

Documentation and operator-facing improvements only. No runtime behavior changes
initially:

- README paid-mode quickstart.
- MCP Inspector validation recipe.
- Claude Desktop / Claude Code MCP configuration example **without secrets**.
- Environment variable checklist.
- Rollback / default-mode checklist.
- Troubleshooting table.
- Release checklist.

## 9. Phase 5A non-goals

Phase 5A explicitly does **not** include:

- No new paid tools.
- No x402 / wallet / OAuth / `Bearer`.
- No remote MCP.
- No database / control-plane.
- No dynamic registration.
- No investment advice generation.
- No source or runtime changes unless a later design memo authorizes them.

## 10. Decision checkpoint

Phase 4 is closed: the first paid ST-IM MCP execution path is complete,
pricing-corrected, live-validated, independently reviewed, and documented. The
recommended next step keeps new paid surface, payment, and hosting boundaries
untouched and instead invests in operator readiness.

> **Proceed next with a Phase 5A operational hardening design memo / README
> update branch.**
