# Phase 5A Operator Safety and Release Checklist

Date: 2026-07-10

Status: **Documentation / operator-readiness only.** This checklist adds no
runtime code, no `src/` changes, no `tests/` changes, no `package.json` /
`package-lock.json` changes, no MCP tools, and no MCP prompts. It performs no
live API call, runs no MCP Inspector session, and uses, inspects, prints, logs,
or stores no secrets. It authorizes no behavior change.

**This checklist is not a live execution runbook.** It does not provide
step-by-step live paid execution instructions, and it does not authorize
unattended, recurring, automated, or CI-driven live paid validation. It closes
the Phase 5A documentation sequence by giving operators a safe checklist for
(1) troubleshooting common configuration and startup issues, (2) deciding
whether live paid execution is even *eligible* to be attempted, and (3)
preparing a documentation/readiness release.

This checklist builds on and does not supersede:

- [`PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md`](PHASE5A_OPERATIONAL_HARDENING_DESIGN_MEMO.md)
  — the Phase 5A scope (§5 deliverables 7 troubleshooting table, 8 paid
  execution safety checklist, 9 release checklist) and the hard secret-safety
  rules (§6) this checklist obeys.
- [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
  — the safe default/free and paid-*exposed* inspection procedure and the
  default-mode rollback checklist referenced below.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — secret handling and the
  disabled-by-default paid surface (§15).
- [`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md)
  — the exposure-vs-execution gate split, mandatory preflight, and cap
  semantics.
- [`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)
  — the one recorded operator-supervised controlled live run; the template for
  how an exceptional supervised validation is authorized, documented, and rolled
  back. Live paid execution belongs to that separate process, not to this
  checklist.

## 1. Purpose and scope

This document is Phase 5A operator-readiness **documentation only**. Explicitly:

- **No runtime changes.** No `src/`, `tests/`, `package.json`, or
  `package-lock.json` change is made or implied.
- **No live API calls.** Nothing here sends a request to any Stock Trends
  endpoint.
- **No MCP Inspector session is performed by this PR.** Inspector usage is
  documented separately in the
  [MCP Inspector Validation Runbook](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md);
  this PR runs none.
- **No secrets are used or inspected.** No API key is read, requested, printed,
  logged, or stored. Only variable *names* and explicit placeholders ever
  appear.
- **This checklist is not a live execution runbook.** It documents paid
  execution safety *preconditions* conceptually; it gives no live paid call
  commands and no paid ST-IM tool invocation examples.
- **This checklist does not authorize unattended, recurring, automated, or
  CI-driven live paid validation.** Any live paid call remains a separate,
  one-off, operator-authorized, operator-supervised process.

## 2. Governing safety boundaries

These boundaries are reaffirmed from
[`SECURITY_MODEL.md`](SECURITY_MODEL.md) §15,
[`PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md`](PHASE4_PAID_STIM_LIVE_EXECUTION_DESIGN_MEMO.md),
and the README *Current Status → Excluded* list. Nothing in this checklist
weakens them.

- **Local stdio only.** No remote HTTP/SSE/Streamable HTTP hosting.
- **Default/free mode requires no API key.** It is fully functional with no
  credential and must be demonstrated without one.
- **Public resources and `stocktrends_estimate_workflow_cost` are
  credential-free.** They never send an API key and are unaffected by the
  exposure or execution flags.
- **Paid tool exposure and paid execution are separate gates.** Making the two
  paid ST-IM tool *definitions* visible never, by itself, performs a paid call.
- **Paid execution requires explicit operator authorization.** It is never a
  default and never implicit.
- **Paid execution requires the separate execution flag, mandatory pricing
  preflight, explicit nonzero caps, and a covering budget cap** —
  `STOCKTRENDS_ENABLE_PAID_EXECUTION=true`, `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT`
  resolving (it stays `true`), explicit nonzero
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION` and
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, and a budget cap
  (`STOCKTRENDS_MAX_STC_PER_SESSION`, plus `STOCKTRENDS_MAX_USD_PER_SESSION`
  where a USD cost applies) that covers the nonzero cost.
- **No x402, wallet, OAuth, `Authorization: Bearer`, remote MCP, database,
  control-plane, dynamic registration, or advice behavior.** None of these
  exist on this surface, and this checklist adds none of them.
- **No automatic retries.** A paid call is single-attempt; there is no retry on
  failure.
- **No live validation in automated tests.** Automated validation is mock-only;
  no live paid API call runs in the test suite.

## 3. Troubleshooting table

This table covers common configuration and startup issues and the safe next
action for each. **Live paid execution is never an ordinary troubleshooting
step.** The final column is "No" for every row: diagnosing installation,
startup, or tool-listing problems never requires — and must not be resolved by —
a live paid call. Where a row touches paid execution *eligibility*, that is a
separate, operator-authorized process (see §4 and the
[controlled live validation report](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md)),
not this troubleshooting checklist.

| Issue | Likely cause | Safe next action | Live paid execution permitted as a troubleshooting step? |
| --- | --- | --- | --- |
| **`npm install` fails.** | Node/npm version mismatch, offline registry, or a partial/corrupt `node_modules`. | Confirm a supported Node/npm is installed, restore network access to the registry, remove `node_modules` and reinstall. No key or paid variable is involved. | No. |
| **`npm run build` fails.** | TypeScript/compile error or an incomplete install. | Re-run `npm install`, then `npm run build`; read the compiler output and resolve the reported error. Build is credential-free. | No. |
| **`npm start` appears to hang.** | Expected: the stdio server waits for JSON-RPC input on stdin and writes no human-readable output to stdout. | This is normal. Do not expect terminal output; stop with Ctrl+C and drive the server through an MCP client / Inspector instead. | No. |
| **MCP Inspector shows no tools.** | Build not run, `dist/server.js` missing, or the Inspector pointed at the wrong path. | Stop. Run `npm run build`, confirm `dist/server.js` exists, and relaunch with the exact command from the [Inspector runbook](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md) §4. | No. |
| **Default mode shows paid tools.** | A paid variable (`STOCKTRENDS_ENABLE_PAID_TOOLS` plus a key) is still set in the shell from a prior session. | Stop. Run the [default-mode rollback checklist](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md#6-default-mode-rollback-checklist) to clear all `STOCKTRENDS_*` variables, restart, and re-verify the one-tool surface. | No. |
| **Paid tools do not appear in paid-exposed mode.** | Exposure needs **both** `STOCKTRENDS_ENABLE_PAID_TOOLS=true` **and** `STOCKTRENDS_API_KEY` set; one is missing, or the shell was not relaunched. | Set both (placeholder key only for inspection), relaunch, and re-check. Do **not** enable execution or set caps to force visibility. | No. |
| **A paid tool fails closed.** | Execution not enabled, caps at their `0`/unset defaults, missing budget cap, or preflight not resolving — the intended fail-closed behavior. | This is the designed default. To merely confirm the surface, stop at exposure (no execution). Enabling execution is **not** a troubleshooting step; it is a separate operator-authorized process (§4). | No. |
| **Pricing preflight / catalog reconciliation fails.** | `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` unresolved, or the static pricing mirror does not reconcile against the credential-free `/v1/pricing/catalog` metadata — a deliberate fail-closed. | Treat the denial as correct. Do not weaken the requirement or bypass reconciliation. Investigate the pricing/catalog discrepancy out of band before any separately authorized live run. | No. |
| **A cap or budget denial occurs.** | Per-session/per-tool call cap or the STC/USD budget cap is `0`, unset, or lower than the nonzero cost — fail-closed by design. | This is expected protection. Do not raise caps to "get past" a denial during troubleshooting; caps are only set deliberately as part of a separately authorized live run (§4). | No. |
| **User accidentally enabled paid execution.** | `STOCKTRENDS_ENABLE_PAID_EXECUTION=true` was set outside an authorized run. | Stop immediately. Do **not** invoke a paid tool. Run the [rollback checklist](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md#6-default-mode-rollback-checklist) (execution `false`/unset, caps unset, key removed), restart, and confirm the one-tool surface before continuing. | No. |
| **Public resources not visible.** | Server did not start cleanly, or the Inspector connected before the server was ready. | Stop the session, relaunch against the compiled stdio server, and confirm the server started without error before re-checking the resource list. Public resources are credential-free. | No. |
| **Prompts appear unexpectedly.** | The server registers zero MCP prompts; a non-empty prompts panel is unexpected. | Stop and report. Capture the discrepancy (no secrets) for review against the documented zero-prompt surface. Do not proceed. | No. |
| **A suspicious secret appears in a terminal, log, or screenshot.** | A real key was pasted or captured, contrary to the placeholder-only rule. | Stop. Treat the key as compromised: rotate/revoke it out of band, delete the offending log/screenshot, and never commit it. Re-run using a placeholder only. | No. |
| **Branch/worktree confusion in the Claude Code Windows app.** | Editing the wrong worktree or `main` instead of the session branch/worktree. | Confirm the checkout with `git rev-parse --show-toplevel`, `git branch --show-current`, and `git worktree list`; work only in the session branch/worktree and never modify `main` directly. | No. |

## 4. Paid execution safety checklist

**Before any separately authorized live paid execution.** This section is
deliberately conservative. It lists *preconditions* an operator confirms before
a separate, operator-authorized, operator-supervised live run — the run itself
is governed by the
[controlled live validation report](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md),
not by this checklist. This checklist provides **no live call commands** and no
paid ST-IM tool invocation examples.

Confirm every item before considering a live run eligible:

- [ ] The run is **operator-authorized, one-off, and supervised** by a person
  who owns the outcome.
- [ ] The run is **not CI, not scheduled, not recurring, not autonomous, and not
  a background job.**
- [ ] The operator **understands exposure vs execution** — that visible paid
  tool *definitions* are not the same as an authorized billable call.
- [ ] **Default/free mode was inspected first** (exactly one tool, public
  resources, no key, no spend) per the
  [Inspector runbook](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md) §4.
- [ ] **Paid-exposed mode was inspected without execution first** (the three-tool
  surface, no paid call) per the
  [Inspector runbook](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md) §5.
- [ ] The **API key is process-local / session-local** and is **not** in the
  repo, a committed config, a machine-wide location, or any screenshot.
- [ ] **No real key will be pasted** into shared logs, chats, or issue reports —
  placeholders only in anything shareable.
- [ ] `STOCKTRENDS_ENABLE_PAID_EXECUTION` is **deliberately set only for the live
  run**, and will be unset immediately afterward.
- [ ] **Explicit nonzero per-session and per-tool caps** are set
  (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`) — never left at `0`/unset for the run.
- [ ] An **explicit budget cap covering the nonzero cost** is set
  (`STOCKTRENDS_MAX_STC_PER_SESSION`, plus `STOCKTRENDS_MAX_USD_PER_SESSION`
  where a USD cost applies).
- [ ] The **mandatory pricing preflight remains required**
  (`STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT` stays `true`); it is never disabled
  to force a call through.
- [ ] The **planned call count and endpoint family are bounded before starting**
  — the operator knows how many calls, to which paid ST-IM endpoint family,
  before beginning.
- [ ] **Rollback / default-mode steps are ready before starting**, so the
  session can return to the one-tool free surface immediately after.
- [ ] **No automatic retries** are assumed or added — a failed call is not
  silently re-attempted.
- [ ] **No payment / x402 / wallet / OAuth / `Authorization: Bearer` path is
  being used** — the only credential is the `X-API-Key` header on the approved
  paid ST-IM endpoints.
- [ ] **No investment advice will be generated** from the run — the server
  returns published API data verbatim, not buy/sell/hold/allocation output.
- [ ] `observed_cost` / `payment_status` **must not be fabricated if absent** —
  if the response carries no such values, they are recorded as absent/`null`,
  never invented.
- [ ] **Results will be recorded without secrets** — no key, no populated auth
  header, no secret-bearing screenshot in whatever is written down.

This checklist stops at eligibility. It intentionally contains no live call
commands, no `stocktrends_get_stim_latest` or `stocktrends_get_stim_history`
invocation examples, and no real or realistic-looking key.

## 5. Release checklist

Use this before tagging a documentation/readiness release. Every item is a
docs/readiness check; none requires a live paid call.

- [ ] **`git status` is clean** in the release checkout (or contains only the
  intended release changes).
- [ ] **The branch is merged to `main`** (or is ready to merge) with no
  unintended files.
- [ ] **README explains free/default mode** — local stdio, one credential-free
  planning tool, public resources, no key, no spend.
- [ ] **README explains paid exposure vs execution** — the three-tool exposure
  surface and the separate execution gate (flag + nonzero caps + preflight),
  with exposure ≠ execution stated explicitly.
- [ ] **The MCP Inspector runbook exists**
  ([`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)).
- [ ] **A rollback / default-mode checklist exists** (Inspector runbook §6).
- [ ] **An operator safety checklist exists** (this document, §4).
- [ ] **The environment variable table is present and current** in the README
  (all `STOCKTRENDS_*` variables, defaults, and exposure-vs-execution effect).
- [ ] **A secret-safety scan is completed** (see §6) with no findings.
- [ ] **No real keys, auth headers, screenshots, or logs are committed** — only
  placeholders like `<your-api-key>`.
- [ ] **`src/`, `tests/`, `package.json`, and `package-lock.json` are unchanged**
  for a docs-only PR.
- [ ] **`npm run build` / `npm test` / `npm run typecheck` status is recorded**
  if any of them was run (docs-only prose changes may not require running them;
  record the result if run).
- [ ] **No new paid tools** were added — the tool count is unchanged in every
  mode (1 free / 3 paid-exposed).
- [ ] **No runtime behavior changes** were introduced.
- [ ] **No live paid validation is required** for a docs-only release.
- [ ] **A tag / release-notes decision is recorded** — whether this milestone is
  tagged now or deferred to a later capability phase.

## 6. Secret-safety scan guidance

Before release, manually search the diff (and ideally the repository) for
secret-shaped strings. Suggested search terms:

- `STOCKTRENDS_API_KEY=`
- `X-API-Key:`
- `Authorization:`
- `Bearer`
- `sk_live`
- `private key`
- `wallet`
- `seed phrase`
- `mnemonic`

**Placeholders are allowed; real-looking secrets are not.** A literal
placeholder such as `<your-api-key>` (or `<STOCKTRENDS_API_KEY>`, `xxxxxxxx`) is
acceptable and expected. A real key, a populated `X-API-Key:` / `Authorization:`
header value, or a realistic-looking fake presented as real must never appear.
If a scan surfaces anything that could be a real secret, stop, treat it as
compromised (rotate/revoke out of band, purge it from history if committed), and
do not release until it is cleared.

## 7. Release notes guidance

A `CHANGELOG.md` is **not** created in this PR, and adding one now is not
required (the Phase 5A design memo §11 leaves CHANGELOG adoption as an open
question). Prefer continuing to rely on the `docs/` phase trail and PR history
for now. When Phase 5A is completed, release notes can simply state:

- Phase 5A docs completed.
- Default/free quickstart added.
- Paid-mode configuration guidance added.
- MCP Inspector validation runbook added.
- Operator safety and release checklist added.
- No runtime behavior changes.

If a maintainer later decides to adopt a `CHANGELOG.md` or a formal
release-notes convention, that is a separate documentation decision and does not
change runtime behavior.

## 8. What this checklist does not do

To keep the boundary explicit, this checklist does **not**:

- **validate live paid execution** — it documents eligibility preconditions
  only;
- **validate API key authorization** against paid endpoints;
- **validate billing, settlement, or `observed_cost`**;
- **add x402, wallet, OAuth, or `Authorization: Bearer`** — none exist on this
  surface;
- **add remote MCP** transport;
- **add database or control-plane access**;
- **add dynamic registration** from `/v1/ai/tools` or `/v1/workflows`;
- **add Intelligence Agent recomputation** or reinterpretation;
- **generate investment advice** — no buy/sell/hold/allocation/risk output.

Those surfaces are either out of the product scope entirely or are exercised
only under the separate, exceptional, operator-supervised live-validation
process recorded in
[`PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md`](PHASE4_PAID_STIM_CONTROLLED_LIVE_VALIDATION_REPORT.md).

---

**Reminder:** This checklist is documentation/operator-readiness only. It runs no
live paid execution, invokes neither `stocktrends_get_stim_latest` nor
`stocktrends_get_stim_history`, sets no caps, enables no execution flag, runs no
MCP Inspector session, and uses placeholder credentials only.
