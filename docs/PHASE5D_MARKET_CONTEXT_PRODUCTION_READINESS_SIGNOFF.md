# Phase 5D Market-Context Production Readiness Signoff

**Status: APPROVED for controlled local stdio operator use only — limited to
the four Phase 5D paid market-context tools
(`stocktrends_get_market_regime_latest`, `stocktrends_get_market_regime_history`,
`stocktrends_get_breadth_sector_latest`,
`stocktrends_get_leadership_summary_latest`) and the credential-free public
resource `stocktrends://leadership/definitions`.**

Signoff date: 2026-07-11

> **What this signoff is.** A narrow production-readiness declaration built on
> the already-merged Phase 5D market-context evidence chain (PRs #49–#53:
> roadmap → design/contract memo → mock-only implementation → controlled
> validation plan → completed controlled validation report, verdict **PASS WITH
> DEVIATIONS**). It carries the Phase 5D market-context capability from
> "implemented + mock-validated + controlled-live-validated" to "approved for
> **controlled local stdio operator use**," and nothing further. It is a
> documentation-only signoff: it weakens no boundary, adds no runtime behavior,
> and performs no validation of its own.
>
> **What this signoff is not.** It is **not** a new validation run, **not** a
> new implementation, and **not** a general production deployment procedure. It
> does **not** approve remote MCP, hosted MCP, autonomous agent use, unattended
> or scheduled operation, bulk/sweep usage, the deferred routes
> (`/v1/market/regime/forecast`, `/v1/breadth/sector/history`,
> `/v1/leadership/rotation/history`), decision or portfolio endpoints,
> Intelligence Agent artifact endpoints, any x402/wallet/OAuth/Bearer/
> payment-header behavior, or investment advice. **No live API call is made by
> this document; no API key is used, requested, inspected, printed, logged, or
> stored; no MCP Inspector session is run; and no paid validation is performed
> to produce it.** Only `REDACTED` placeholders appear; no raw API payload and
> no secret-shaped value is reproduced.

This signoff builds on and does not supersede:

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §17 (paid market-context live
  execution), §16 (paid `selections/latest` live execution and list-shaped
  limit safety), §15 (paid ST-IM and indicators live execution), §15.7 (the
  narrowed credential-bearing allowlist, now nine routes), and §5/§7/§8
  (paid-call safety, runaway-loop and broad-sweep controls, rate/spend
  control) — the reconfirmed paid-mode security model.
- [`README.md`](../README.md) — the free/paid mode contract, the Conditional
  Paid Market-Context Tools section, and the environment variable table.
- [`PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md`](PHASE5D_MCP_LAUNCH_CAPABILITY_ROADMAP.md)
  — the capability selection memo (PR #49).
- [`PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md`](PHASE5D_MARKET_CONTEXT_DESIGN_AND_CONTRACT_MEMO.md)
  — the design/contract verification memo (PR #50).
- [`PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md`](PHASE5D_MARKET_CONTEXT_IMPLEMENTATION_NOTES.md)
  — the mock-only implementation (PR #51).
- [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_PLAN.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_PLAN.md)
  — the controlled validation plan (PR #52).
- [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
  — the completed controlled live validation report (PR #53), verdict **PASS
  WITH DEVIATIONS**.
- [`PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5C_SELECTIONS_LATEST_PRODUCTION_READINESS_SIGNOFF.md)
  and
  [`PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5B_INDICATORS_PRODUCTION_READINESS_SIGNOFF.md)
  — the thrice-proven narrow-signoff pattern this document extends.
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the operator-facing preconditions and secret-safety scan.

## 1. Status

- **This is a production-readiness signoff (PR #54), and it is docs-only.**
  The only repository changes are this document and one README
  documentation-index link. No `src/`, `tests/`, `package.json`, or
  `package-lock.json` change is made; no tool, resource, prompt, promotion,
  pricing-mirror, or runtime behavior change of any kind.
- **No validation is performed in this PR.** No live endpoint is called (paid
  or credential-free), no test/typecheck/build run is required to produce this
  document, and every result cited below is recorded from the merged PR #53
  report exactly as observed — nothing is re-run here.
- **No API key is used** — not used, requested, inspected, printed, logged, or
  stored by this PR.
- **No live call is made** and no spend or usage is created.
- **No MCP Inspector session is run.**
- **No production approval beyond controlled local stdio operator use is
  granted.** This document approves exactly the §2 scope and nothing broader;
  §8 lists the explicit non-approvals.

## 2. Scope of approval

Based on the reviewed evidence chain, **the four Phase 5D paid market-context
tools and the leadership definitions public resource are signed off as
production-ready only for controlled local stdio operator use, under the
existing safety model, caps, and operator procedures**:

| # | MCP surface | Backing endpoint | Kind / cost | MCP limit safety |
| --- | --- | --- | --- | --- |
| 1 | `stocktrends_get_market_regime_latest` | `GET /v1/market/regime/latest` | Paid tool / `0.15 STC` (`market_regime_latest`, family `market`) | Snapshot; strict empty input, unknown keys rejected |
| 2 | `stocktrends_get_market_regime_history` | `GET /v1/market/regime/history` | Paid tool / `0.25 STC` (`market_regime_history`, family `market`) | `limit` default `12`, hard max `52`, always sent |
| 3 | `stocktrends_get_breadth_sector_latest` | `GET /v1/breadth/sector/latest` | Paid tool / `0.1 STC` (`breadth_sector_latest_paid`, family `breadth`) | `limit` default `50`, hard max `250`, always sent; `group_level` default `sector`, always sent; `weekdate` and `vol_scale` not exposed |
| 4 | `stocktrends_get_leadership_summary_latest` | `GET /v1/leadership/summary/latest` | Paid tool / `0.25 STC` (`leadership_summary_latest_paid`, family `leadership`) | `limit_overall` default `50`, hard max `200`; `limit_bucket` default `20`, hard max `50`; both always sent; `weekdate` and `type` not exposed |
| 5 | `stocktrends://leadership/definitions` | `GET /v1/leadership/definitions` | **Public resource** — credential-free, zero cost (`leadership_definitions_public`) | Visible in every mode; never keyed, never paid, no paid mirror, no auth-capable allowlist entry |

Conditions of the approval:

- **Controlled local stdio operator use only.** A manual, operator-initiated,
  operator-supervised run over the local stdio transport — and nothing
  broader. Every gate, cap, credential rule, and fail-closed behavior in
  [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §17 (and §15/§16) remains in force
  unchanged, and the operator procedures in the validation plan §7/§12 and the
  Phase 5A checklist remain required (§9 below).
- **Existing caps and procedures remain mandatory.** Exposure requires both
  the paid-tools flag and a configured key; execution additionally requires
  the execution flag, mandatory pricing preflight, passing family-scoped
  catalog reconciliation, explicit nonzero call caps, and a covering STC
  budget. Nothing in this signoff relaxes any of them.
- **Not approved:** remote or hosted MCP, autonomous or unattended use, bulk
  or repeated-loop usage, broad sweeps, the deferred forecast/breadth-history/
  rotation-history routes, decision/portfolio endpoints, Intelligence Agent
  artifact endpoints, x402/wallet/OAuth/Bearer/payment-header behavior, or
  investment advice — see §8 for the complete list.

## 3. Evidence reviewed

The Phase 5D evidence chain is merged and consistent (HEAD at signoff:
`0d79b44 Add market context controlled validation report (#53)`):

| PR | Contribution | State |
| --- | --- | --- |
| **#49** | Phase 5D launch capability roadmap — selected the market-context layer (regime, breadth, leadership) and deferred decision/portfolio/artifact/remote tracks. | Merged |
| **#50** | Market-context design and contract verification memo — credential-free verification of all eight candidate route contracts, the recommended four-tool + one-resource subset, pricing mirrors, allowlist promotions, limit-safety design, and the §12 test surface. | Merged |
| **#51** | Mock-only implementation — exactly the approved subset. | Merged |
| **#52** | Controlled validation plan — the one-off, operator-authorized, operator-supervised procedure, budget, checklists, and report template. **No live run in the PR itself.** | Merged |
| **#53** | Completed controlled validation report — no-spend phases plus a single authorized live phase, recorded secret-free. **Verdict: PASS WITH DEVIATIONS.** | Merged |

**From the PR #51 implementation (implementation notes, reviewed):**

- **Mock-only implementation** — no live validation was performed in the
  implementation PR: no live API call, no real key, no MCP Inspector, no paid
  validation; all validation was mock-only (injected fetch).
- **The full suite passed: 448 tests across 15 files** (`npm run typecheck`,
  `npm test`, `npm run build` all clean at the time of PR #51).
- **Exactly the four paid tools and the one public resource were added** — the
  §2 surface, nothing more; the three deferred routes were **not promoted**
  and remain denied `endpoint_not_allowlisted`, and
  `PROHIBITED_RESOURCE_ENDPOINTS` gained the two paid leadership routes while
  deliberately keeping `/v1/leadership/definitions` off the list.

**From the PR #52 plan (reviewed):**

- **An exact operator authorization phrase is required** before any live paid
  execution; a paraphrase, truncation, prior-session authorization, or
  inferred intent does not count.
- **The live budget is bounded:** at most four paid calls, at most one per
  approved tool, expected exposure `0.75 STC`
  (`0.15 + 0.25 + 0.1 + 0.25`) under a `0.80 STC` session cap with per-session
  call cap `4` and per-tool cap `1`.
- **No retries, no repeats, no deferred routes** — a failed paid call is
  recorded, never retried; identical repeats are forbidden (and fail closed in
  the adapter); no call outside the four approved tools is permitted.
- **Rollback is required** after any run (full, partial, or abandoned):
  unset key/flags/caps, restart, and confirm the default/free one-tool
  surface.

**From the PR #53 report (reviewed; summarized in §6):** the no-spend and
authorized live phases, the auth-boundary observations, the rollback
evidence, and the deviations record.

**Supporting evidence reviewed:**

- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §17 — surface counts, the four
  allowlist promotions, family-scoped pricing, the limit-safety table, the
  authority boundary, and the local-stdio operator-controlled scope statement.
- **Prior signoff precedent** — the Phase 5B indicators and Phase 5C
  selections signoffs, both narrow approvals for controlled local stdio
  operator use built on a PASS WITH DEVIATIONS report; this signoff follows
  the same pattern and grants nothing broader.
- **Test suite / controlled live run / rollback** — the recorded 448/15
  passing suite, the four-call live run, and the rollback restart are all
  taken from the merged PR #53 report exactly as observed; none is re-run by
  this document.
- **Source consistency** — the §2/§4 facts were cross-checked for consistency
  against the current source at `0d79b44`
  (`src/tools/marketContextTools.ts`, `src/paidPolicy.ts`,
  `src/paidPricing.ts`, `src/resources/index.ts`, `src/server.ts`,
  `src/config.ts`, `tests/phase5d-market-context-tools.test.ts`) — a
  read-only documentation check; no code was changed.

## 4. Surface confirmed

The post-PR #51 surface contract, confirmed consistent across the
implementation notes, SECURITY_MODEL §17.1, the README, the PR #53 report
(§§4–5, §8, §11), and the source at `0d79b44`:

- **Default/free mode: exactly 1 tool** — `stocktrends_estimate_workflow_cost`
  (credential-free planning tool). No paid tool is ever visible in free mode.
- **Paid-exposed mode: exactly 10 tools** — the planning tool, the paired paid
  ST-IM tools, the paired paid indicators tools, the base selections tool, and
  the four Phase 5D market-context tools. Exposure requires **both**
  `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** a configured
  `STOCKTRENDS_API_KEY`; neither alone exposes anything.
- **Public resources: exactly 10 in every mode**, all credential-free and
  fetch-on-request, including `stocktrends://leadership/definitions`.
- **MCP prompts: exactly 0 in every mode** (`prompts/list` → `-32601`; no
  prompts capability is registered).
- **Auth-capable allowlist: exactly 9 paid routes**
  (`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES`): `/v1/stim/latest`,
  `/v1/stim/history`, `/v1/indicators/latest`, `/v1/indicators/history`,
  `/v1/selections/latest`, `/v1/market/regime/latest`,
  `/v1/market/regime/history`, `/v1/breadth/sector/latest`, and
  `/v1/leadership/summary/latest`. Every other route is denied
  `endpoint_not_allowlisted` before any auth header or fetch.
- **The definitions resource is credential-free and non-auth-capable** — it is
  never keyed, never on the auth-capable allowlist, never mirrored as a paid
  STC pricing rule, and is deliberately kept off
  `PROHIBITED_RESOURCE_ENDPOINTS` as the verified public/zero-cost route.
- **The execution flag changes behavior, not tool count** — the ten-tool
  paid-exposed surface is identical whether or not
  `STOCKTRENDS_ENABLE_PAID_EXECUTION` is set; only whether an authorized live
  fetch may occur changes.

## 5. Safety controls confirmed

All of the following are confirmed in force by the reviewed evidence and are
not weakened by this signoff:

- **Strict input schemas** on every tool — unknown keys rejected everywhere,
  including the zero-parameter regime-latest tool; invalid inputs fail closed
  at the schema boundary (`-32602`) before any handler, pricing, auth, or
  fetch.
- **Hard caps and always-sent limits** — regime history `limit` default `12`
  hard max `52`; breadth `limit` default `50` hard max `250` with
  `group_level` (default `sector`) always sent; leadership `limit_overall`
  default `50` hard max `200` and `limit_bucket` default `20` hard max `50`.
  Every limit parameter is sent explicitly on every outbound request, so the
  API's own defaults (e.g. breadth's `5000`) can never silently apply.
- **No silent clamping** — out-of-range, non-integer, array, and sentinel
  limit values are rejected, never clamped.
- **No optional first-live filters** — the live probes used the plan's exact
  minimal inputs; optional passthroughs (`start_date`, `exchange`,
  `min_price`, `min_volume`, `min_rsi`, `min_mt_cnt`) stayed unexercised live
  and remain covered by the mock-only suite.
- **No deferred routes** — `/v1/market/regime/forecast`,
  `/v1/breadth/sector/history` (API default/max `200000`/`500000` — never
  reachable through this adapter), and `/v1/leadership/rotation/history` are
  not implemented, not promoted, and denied `endpoint_not_allowlisted`.
- **No dynamic registration** from `/v1/ai/tools` or `/v1/workflows`.
- **No retries** — exactly one `GET` per invocation; no automatic retry on
  `429`/`5xx`/`402`; no pagination, date-range sweeping, exchange iteration,
  bulk assembly, or background refresh.
- **Repeated-identical-call denial** — the normalized-signature loop gate
  fails duplicates closed (`repeated_identical_market_context_call`),
  sequentially and concurrently, before any pricing/auth/fetch/cap debit; the
  constant regime-latest signature blocks a second executed call per session.
- **Session, per-tool, and STC caps** —
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` and
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` default `0` (deny); every
  market-context rule is nonzero STC, so a covering
  `STOCKTRENDS_MAX_STC_PER_SESSION` is effectively mandatory
  (`spend_cap_exceeded` otherwise, before auth/fetch).
- **Preflight pricing reconciliation** — mandatory, non-skippable,
  family-scoped (`market` / `breadth` / `leadership` groups reconcile
  independently; no cross-family transfer), credential-free catalog reads,
  fail-closed on any missing/duplicate/mismatched rule, endpoint, family,
  cost, or unit.
- **`X-API-Key` only, and only after every gate passes** — built only inside
  the coupled paid boundary for the approved origin + exact promoted path;
  the pricing catalog, planning tool, definitions resource, and all public
  resources can never receive the key.
- **No `Authorization: Bearer`, no payment header, no x402, no wallet, no
  OAuth** — under any configuration or outcome.
- **No remote MCP** — local stdio only.
- **No local recomputation** — no regime calculation/smoothing/forecasting,
  no breadth re-aggregation, no leadership re-ranking/re-bucketing/
  thresholding; `api_data` is preserved verbatim.
- **Context, not advice** — every tool description and `mcp_metadata` carry
  the framing: a regime label is market context, not a trading
  recommendation; breadth rows are participation context, not confirmation
  signals; leadership tables are rotation context, not picks. No
  buy/sell/hold/allocation/risk/suitability output exists.

## 6. Validation result

Recorded from
[`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
(PR #53, run on `f97ad18`) exactly as observed — **not re-run by this
signoff**:

**No-spend phases — all passed:**

- **Preflight:** `npm run typecheck` passed; `npm test` passed — **448 tests /
  15 files**; `npm run build` passed; working tree clean; `package.json` /
  `package-lock.json` untouched.
- **Default/free surface confirmed:** exactly **1 tool / 10 resources /
  0 prompts**, no paid tool visible; neither the paid-tools flag alone nor a
  key alone exposed anything.
- **Paid-exposed execution-disabled surface confirmed:** exactly **10 tools /
  10 resources / 0 prompts** (placeholder key only).
- **All four market-context tools denied `paid_execution_disabled`** with no
  request, no auth header, no cap debit, and reconciliation `not_evaluated`.
- **Invalid inputs rejected before the handler** — nineteen cases (including
  the deliberately unexposed `weekdate`, `vol_scale`, and `type` keys)
  rejected at `-32602` before any endpoint selection, pricing, auth, or
  fetch; never clamped.
- **Cap-denial no-spend probe denied before auth/fetch** — the disclosed
  optional probe (execution flag on, caps at default-deny, placeholder key)
  denied `spend_cap_exceeded` with no request and no spend.
- **Duplicate denial covered mock-only** — per plan §9, no live duplicate was
  issued; `repeated_identical_market_context_call` (sequential, concurrent,
  reservation release, executed persistence, constant regime-latest
  signature) is validated by the merged mock-only suite.
- **Leadership definitions resource visible and read credential-free** — in
  every mode, through the public path only, no key of any kind, no
  reconciliation, no paid path, zero cost.

**Authorized live phase — passed:**

- **The exact plan §4 authorization phrase was supplied verbatim by the
  operator before any paid execution** — an earlier checkpoint without the
  phrase correctly stopped at the no-spend boundary, and an instruction that
  did not contain the phrase was refused.
- **Four live paid calls were made — one per approved tool — and all four
  succeeded**, in the planned order, against exactly the four promoted
  endpoints and nothing else.
- **Exact minimal live inputs were used:** `{}`; `{"limit": 1}`;
  `{"limit": 1}` (with `group_level=sector` sent explicitly even though
  defaulted); `{"limit_overall": 1, "limit_bucket": 1}`.
- **Total expected exposure was `0.75 STC` under the `0.80 STC` cap**
  (session counters `0.15 → 0.40 → 0.50 → 0.75 STC`, calls `1 → 2 → 3 → 4`,
  per-tool `1` each; every counter honored).
- **No retries, no repeats, no deferred routes** — `automatic_paid_retries:
  false` on every result; no second call to any tool; no non-promoted route
  touched.
- **`X-API-Key` went only to the four approved paid routes**, once each, only
  after every gate passed; family-scoped catalog reconciliation
  (`reconciled`, `source: pricing_catalog`) preceded every auth/fetch.
- **No Bearer, no payment header, no x402/wallet/OAuth, no remote MCP, no raw
  API bypass** — every API interaction went through the gated MCP surfaces;
  `observed_cost`/`payment_status` remained `null` and were never fabricated.
- **Rollback restored the default surface** — a restart with no
  `STOCKTRENDS_*` variables showed exactly **1 tool / 10 resources /
  0 prompts**, with no key in any session output and no secret/log artifacts
  created.

**Verdict: PASS WITH DEVIATIONS** — every plan phase passed exactly as
specified; the deviations are disclosed in the report §12, assessed
non-blocking there, and assessed again in §7 below. **No secrets were
exposed:** no key value, populated auth header, or raw secret appears in the
report or any artifact; the real key was forwarded by environment-variable
reference into exactly one child process, never inspected, and all harness
output was scrubbed.

## 7. Deviations assessment

The PR #53 report discloses eight deviations. Each is assessed here against
the only scope this signoff grants — controlled local stdio operator use:

1. **Staged authorization within one session.** The live phase ran only after
   the operator supplied the exact §4 phrase verbatim; the two earlier
   checkpoints (phrase absent; instruction without the phrase) were correctly
   refused, and the report was updated in place rather than written in one
   pass. **Non-blocking:** the authorization boundary *held* — this deviation
   is evidence the gate works as designed, not a weakening of it. The phrase
   preceded every paid-execution configuration and every paid call.
2. **SDK stdio harness instead of MCP Inspector.** The documented mechanism
   names the interactive Inspector UI; a non-interactive session used an
   equivalent local-stdio MCP client harness built on the project's own MCP
   SDK, driving the same compiled `dist/server.js` over the same transport
   and surface. **Non-blocking:** this is the same accepted deviation as the
   Phase 5B and 5C reports — transport- and surface-equivalent for exactly
   the local stdio scope approved here, and the harness lived outside the
   repository and changed no repository file.
3. **Optional cap-denial no-spend probe performed.** Plan §9 explicitly
   permits it in a separate throwaway session with a placeholder key; it was
   disclosed, denied `spend_cap_exceeded` before any auth/fetch, and sent no
   network traffic. **Non-blocking:** it added fail-closed evidence at zero
   spend, exactly as the plan intended.
4. **Pre-provisioned paid variables observed in the operator's parent shell
   (boolean presence only), with operator-side cleanup required.** The parent
   shell already contained `STOCKTRENDS_API_KEY` and the five paid flag/cap
   variables before the validation began — not the plan's expected
   set-immediately-before posture. This observation is **not hidden**: it is
   an **operator hygiene finding**, and plan §4/§12 cleanup ("unset
   immediately after") became due the moment the authorized run completed.
   The report records the operator-side unset as the operator's own step,
   performed outside the report per the Phase 5B/5C precedent, and open at
   the time the report was written. **Assessed a hygiene note, not a runtime
   blocker, because the runtime never depended on that shell state:** every
   child server environment was explicitly curated (MCP SDK safe default
   allowlist plus only the per-phase values, with a guard stripping any
   `STOCKTRENDS_*` key not explicitly set), each child's `STOCKTRENDS_*` key
   list was recorded and matched the intended configuration exactly, values
   were only ever checked as booleans and never read, only the key was
   forwarded — by reference, into exactly one authorized child — and the
   rollback restart confirmed the clean one-tool surface. Completing the
   parent-shell unset is carried forward as a **mandatory operator
   requirement in §9**.
5. **SDK `-32602` surfacing detail.** Schema rejections surfaced to the MCP
   client as in-band `isError` tool results carrying the `-32602` validation
   error text rather than thrown protocol errors — an SDK surfacing behavior
   also observed in Phase 5C. **Non-blocking:** the substance is identical —
   the rejection carries `-32602`, occurs before the handler, and produces no
   wrapper metadata, so no endpoint/pricing/auth/fetch was reached.
6. **Three credential-free definitions reads.** The public resource was read
   in the default/free session, the paid-exposed session, and once for shape
   capture. **Non-blocking:** all three are catalog-verified public/zero-cost
   reads through the credential-free public-resource path, explicitly
   non-paid under plan §9/§10, and disclosed for completeness.
7. **Expected `0.75 STC` real spend incurred.** The four authorized calls
   consumed exactly the plan §8 worst-case budget of real subscription usage.
   **Non-blocking:** this is the intended, disclosed, authorized cost of the
   controlled live validation, recorded in the audit trail — evidence for
   four bounded supervised calls, not for any broader usage pattern.
8. **No live cap-denied or duplicate probe in the execution-enabled session.**
   The live session issued exactly the four authorized calls and nothing
   else. **Non-blocking and deliberate:** plan §9 forbids issuing a live
   duplicate "to see it fire," cap-denial evidence exists from the disclosed
   no-spend probe (deviation 3), and duplicate denial is deterministically
   covered by the merged mock-only suite. Honoring the authorization bound is
   the conservative choice.

**Why these deviations do not extend the approval.** Every deviation was
procedural, disclosed, and exercised (or deliberately declined to exercise)
exactly the local stdio surface this signoff approves. None validates remote
transport, tenancy, secret isolation at scale, scheduling, or repeated/bulk
calling — which is precisely why §8 excludes those uses. A stdio-equivalent
harness validates the stdio surface only; a one-call-per-tool budget is
evidence for bounded supervised runs only; and a parent-shell hygiene finding
is a reason to *tighten* operator procedure (§9), never to relax it.

## 8. Explicit non-approvals

This signoff explicitly does **not** approve, and the following remain blocked
until their own separately reviewed design, validation, and signoff work:

- **No remote MCP** — no HTTP/SSE/Streamable HTTP transport of any kind.
- **No hosted MCP** — no public, multi-user, or third-party-hosted
  deployment.
- **No autonomous agent use** — no agent-initiated paid execution outside a
  supervised, operator-initiated session.
- **No unattended operation** — no background, recurring, or CI use.
- **No cron/scheduled operation** of any paid or credential-bearing surface.
- **No bulk/sweep usage** — no repeated loops, broad sweeps, pagination,
  offset walking, date-range sweeping, exchange iteration, or multi-call
  series/universe assembly.
- **No external user rollout** — no exposure of this surface to users other
  than the controlled local operator.
- **No additional endpoints** — nothing beyond the §2 surface.
- **No deferred routes** — `/v1/market/regime/forecast` (forecast route),
  `/v1/breadth/sector/history` (breadth history route), and
  `/v1/leadership/rotation/history` (leadership rotation history route)
  remain non-promoted and denied `endpoint_not_allowlisted`.
- **No decision endpoints** (e.g. `/v1/decision/evaluate-symbol`) and **no
  portfolio endpoints** (evaluate/compare/construct).
- **No Intelligence Agent artifact endpoints.**
- **No x402, wallet, payment-header, `Authorization: Bearer`, or OAuth
  behavior** — subscription `X-API-Key` only, where promoted, after all
  gates.
- **No investment advice** — no buy/sell/hold/allocation/risk/suitability
  output, and no MCP-side regime/breadth/leadership recomputation.
- **No higher caps** — this signoff approves the existing default-deny cap
  posture, not any specific raised value; caps stay bounded per §9.
- **No removal of authorization boundaries** — the exposure/execution split,
  the exact-phrase live-validation doctrine, mandatory preflight, and the
  fail-closed gates all remain mandatory.
- **No bypassing MCP gates** — no direct keyed API call that skips the gated
  tools, under any circumstance.
- **No production readiness for future tools** — nothing here pre-approves
  any later tool, route, resource, prompt, or transport; each requires its
  own design → implementation → plan → report → signoff chain.

## 9. Operator requirements after signoff

Controlled operator use under this signoff is allowed **only** under all of
the following, which remain mandatory:

- **Local stdio only** — `STOCKTRENDS_MCP_TRANSPORT=stdio`; no other
  transport.
- **Set the API key only when needed** — provision `STOCKTRENDS_API_KEY`
  process-locally, immediately before an intended paid session, and only for
  that session; never in a shared profile, CI store, or persisted config.
- **Never log, commit, or share the key** — no key in chats, docs, commits,
  logs, screenshots, or recordings; placeholders only; a key that appears
  anywhere is treated as compromised and rotated out of band.
- **Use `true` for the paid flags** — the config parser accepts only `true`
  as truthy for `STOCKTRENDS_ENABLE_PAID_TOOLS` and the execution flag
  (`1` is rejected as `invalid_config`).
- **Use `STOCKTRENDS_ENABLE_PAID_EXECUTION`, not
  `STOCKTRENDS_ALLOW_PAID_EXECUTION`** — the former is the variable's exact
  name in `src/config.ts`; the latter does not exist and setting it does
  nothing.
- **Keep caps bounded** — explicit nonzero
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` /
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL` sized to the planned run (the
  validation used `4`/`1`), and a covering `STOCKTRENDS_MAX_STC_PER_SESSION`
  sized to the summed verified costs with a small buffer (the validation used
  `0.80 STC` for a `0.75 STC` worst case); never raise a cap to get past a
  denial.
- **Unset the key, flags, and caps after every run** — plan §12 rollback is
  mandatory regardless of outcome: unset `STOCKTRENDS_API_KEY`,
  `STOCKTRENDS_ENABLE_PAID_TOOLS`, `STOCKTRENDS_ENABLE_PAID_EXECUTION`, and
  the cap/budget variables from the shell and any profile, restart, and
  confirm the default one-tool surface. This includes completing the
  parent-shell cleanup recorded as open in the PR #53 report §11 (deviation
  4 above) — pre-provisioned paid variables must not persist between runs.
- **No retries and no sweeps** — exactly one `GET` per authorized call; a
  failed call is recorded, never retried; no repeated identical calls, no
  pagination, no date or exchange sweeping, no bulk assembly.
- **No deferred routes** — never attempt forecast, breadth history, or
  rotation history through any path; expected `endpoint_not_allowlisted`
  denials are correct results, not obstacles.
- **Use the public definitions resource for leadership interpretation** —
  `stocktrends://leadership/definitions` is the credential-free interpretive
  companion (indicator and taxonomy definitions) to the leadership summary
  tool; read it instead of re-deriving or re-interpreting leadership
  semantics locally.
- **Document deviations** — any deviation from the documented procedure in a
  future run, however small, is recorded secret-free, exactly as the
  Phase 5B/5C/5D reports did.

## 10. Merge recommendation

- **Recommend PR #54 proceed to Codex review.** As with every prior memo,
  plan, report, and signoff in the Phase 4/5B/5C/5D cadence, independent
  review is required before this signoff merges.
- **If approved and merged, the Phase 5D market-context surface is
  production-ready for controlled local stdio operator use only** — the four
  paid tools and one public resource in §2, under the §5 controls and §9
  operator requirements, with the §8 exclusions in force.
- **The next strategic phase remains separate.** Any further capability —
  including the deferred forecast/breadth-history/rotation-history routes,
  decision/portfolio endpoints, Intelligence Agent artifacts, or the remote
  MCP / x402 architecture track — requires its own new design/contract memo,
  implementation, validation plan, report, and signoff; nothing is inherited
  from this document.

## 11. Final signoff statement

Based on the reviewed implementation, security model, controlled validation
plan, and controlled validation report, **the Phase 5D market-context MCP
surface — the four paid tools `stocktrends_get_market_regime_latest`,
`stocktrends_get_market_regime_history`,
`stocktrends_get_breadth_sector_latest`, and
`stocktrends_get_leadership_summary_latest`, plus the credential-free public
resource `stocktrends://leadership/definitions` — is signed off as
production-ready for controlled local stdio operator use only, subject to the
explicit exclusions and operator requirements in this document.**

- **APPROVED for controlled local stdio operator use.**
- **NOT APPROVED for remote or hosted MCP, autonomous or unattended
  operation, scheduled or bulk use, deferred/decision/portfolio/artifact
  endpoints, x402/wallet/payment/Bearer/OAuth behavior, or investment
  advice.**
- Production readiness is limited to the approved scope described in this
  signoff; it implies no general public production deployment and no remote
  MCP readiness, and no additional live call is performed or claimed by this
  document.
