# Phase 5E Operator Smoke-Test Runbook

Date: 2026-07-12

Status: **Documentation / operator-readiness only (PR #58). Current-surface
runbook. Executing it is no-spend by design.** This document is the
current-surface (1 free tool / 10 paid-exposed tools / 10 public resources /
0 prompts / 9 auth-capable paid routes) operator smoke-test procedure designed
by the Phase 5E launch/distribution readiness design memo §7.1. The PR that
creates this document **does not execute it**: no live endpoint call of any
kind (paid or credential-free), no MCP Inspector session, no client session,
no paid validation, and no API key used, requested, inspected, printed,
logged, or stored is performed by this PR. Only the literal placeholder
`<your-api-key>` and `REDACTED` markers appear anywhere in this document.

**Executing this runbook later is no-spend by design, not by budget:**

- **No real API key ever.** The only credential-shaped value the procedure
  uses is the literal placeholder `<your-api-key>`.
- **`STOCKTRENDS_ENABLE_PAID_EXECUTION` is never set** — not even to `false`;
  it stays entirely unset in every step.
- **No cap or budget variable is ever set**
  (`STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, `STOCKTRENDS_MAX_STC_PER_SESSION`,
  `STOCKTRENDS_MAX_USD_PER_SESSION` all stay unset).
- **No live paid execution recipe exists in this document, and no paid tool
  call succeeds in a correct run.** Exactly **one** paid-boundary invocation
  occurs in a full execution — the S6 probe — and it is expected to fail
  closed with `paid_execution_disabled` before any request, auth header,
  payment header, cap debit, or pricing reconciliation.
- **The only Stock Trends network activity in a full execution is the S3
  credential-free public-resource reads** (plus any identical credential-free
  resource read the operator's MCP client performs on request). No Stock
  Trends endpoint is contacted at any other step. (S1's `npm install` and an
  `npx`-launched MCP Inspector talk to the npm registry only; they touch no
  Stock Trends endpoint.)
- **No payload dumps and no secret values** are ever captured or recorded —
  counts, names, booleans, statuses, and top-level shape summaries only, with
  `REDACTED` placeholders for anything secret-shaped.

This runbook supersedes the Phase 5A MCP Inspector runbook's Phase 4-era
counts **for current-surface smoke-testing use**; the Phase 5A documents are
historical records and are not edited. The Phase 5A troubleshooting table
([`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
§3) remains the referenced troubleshooting companion for every step below.

This runbook builds on and does not supersede:

- [`PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md`](PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md)
  (PR #56) — the §7.1 design this runbook implements.
- [`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md)
  (PR #54) — the controlled-local-stdio-only scope, §8 non-approvals, and the
  §9 operator requirements (whose parent-shell hygiene item S0 absorbs
  permanently).
- [`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
  (PR #53) — the observation baseline this runbook's expected values reuse
  without spend (counts, startup warnings, denial shapes, rollback evidence).
- [`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
  and
  [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — the Phase 4-era procedures and the still-in-force §3 troubleshooting
  table and §4 paid-execution eligibility checklist.
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) — §2 secret handling, §5/§7/§8
  paid-call/loop/spend controls, §11 local stdio risks, §15–§17 the paid
  execution models and the nine-route auth-capable allowlist.
- [`README.md`](../README.md) — the canonical install path, the "Connect a
  local stdio MCP client" section, and the environment-variable table.

## 1. Status and scope

- **Docs-only runbook.** This PR adds this document (plus two sibling Phase 5E
  documents and three README documentation-index links); no `src/`, `tests/`,
  `package.json`, or `package-lock.json` change, no runtime behavior change,
  no tool/resource/prompt/route/promotion change.
- **Executing it is no-spend by design** — no real key, no execution flag, no
  caps, no budget, one fail-closed probe, credential-free reads only.
- **Local stdio only.** Every step drives the compiled `dist/server.js` over
  local stdio. No remote MCP, no HTTP/SSE/Streamable HTTP, no hosted or
  multi-user configuration appears anywhere in this procedure.
- **No production-readiness expansion.** A passing execution confirms the
  already-approved controlled local stdio operator scope (PR #54 §2) and
  grants nothing beyond it — no remote/hosted MCP, no autonomous or
  unattended use, no deferred routes, no new approval of any kind.
- **Paid execution stays eligibility-checklist-only.** This runbook contains
  no live paid execution recipe. The operator-facing preconditions for any
  separately authorized live run remain the Phase 5A §4 eligibility
  checklist, referenced from the
  [Phase 5E launch release checklist](PHASE5E_LAUNCH_RELEASE_CHECKLIST.md).

**Client mechanism.** Steps that list or invoke MCP surfaces can be performed
with MCP Inspector (`npx @modelcontextprotocol/inspector node dist/server.js`,
per the README quickstart), with any local stdio MCP client configured per the
README "Connect a local stdio MCP client" section, or — in a non-interactive
session — with a local-stdio MCP SDK client harness (the mechanism accepted by
the Phase 5B/5C/5D reports; record its use as a deviation). Whatever the
mechanism, the surface checked is identical: the compiled `dist/server.js`
over local stdio.

## 2. Preconditions

Confirm every item before S0:

- [ ] **Clean local checkout** of this repository (`git status` clean or
  containing only intended, unrelated work), run from the checkout root.
- [ ] **Node.js and npm installed** (the Phase 5D validation used Node
  `v22.12.0`; any supported Node works — record the version used).
- [ ] **Repository builds** — or will be built in S1 (`npm install` +
  `npm run build` producing `dist/server.js`).
- [ ] **No `STOCKTRENDS_*` variable set in the parent shell** — verified
  names-only in S0; S0 is mandatory, not optional.
- [ ] **No real API key anywhere in the procedure** — the operator does not
  retrieve, display, or handle a real key at any point; the placeholder
  `<your-api-key>` is the only credential-shaped value used.
- [ ] **Run from the local checkout over stdio only** — no remote endpoint,
  no hosted server, no tunnel.
- [ ] **Expected current surface known in advance:** 1 free tool /
  10 paid-exposed tools / 10 public resources / 0 prompts / 9 auth-capable
  paid routes (the "1/10/10/0/9" contract). Any drift from these counts at
  any step is a stop/fail condition (§12), not something to work around.

## 3. S0 — Parent-shell hygiene (mandatory on every execution)

This step permanently absorbs the open operator hygiene item from the PR #53
report §11 / PR #54 signoff §9 (pre-provisioned `STOCKTRENDS_*` variables
observed in the operator's parent shell). It is mandatory at the start of
**every** execution of this runbook, and again at S7 rollback.

Run the **names-only** presence check. It prints variable *names* only —
values are never inspected, printed, or recorded.

**Windows PowerShell:**

```powershell
# Names only, never values. Must print nothing.
Get-ChildItem Env: | Where-Object { $_.Name -like 'STOCKTRENDS_*' } | Select-Object -ExpandProperty Name
```

**POSIX shell (bash/zsh):**

```sh
# Names only, never values. Must print nothing.
env | grep '^STOCKTRENDS_' | cut -d= -f1
```

**Expected: no output.** If any name prints, unset **every** `STOCKTRENDS_*`
variable before proceeding — the eight paid/secret-relevant variables below
explicitly, plus any other `STOCKTRENDS_*` name the check printed (for
example `STOCKTRENDS_API_BASE_URL`, `STOCKTRENDS_MCP_TRANSPORT`,
`STOCKTRENDS_MCP_LOG_LEVEL`), using the same command form:

**Windows PowerShell:**

```powershell
Remove-Item Env:STOCKTRENDS_API_KEY -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_ENABLE_PAID_TOOLS -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_ENABLE_PAID_EXECUTION -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_STC_PER_SESSION -ErrorAction SilentlyContinue
Remove-Item Env:STOCKTRENDS_MAX_USD_PER_SESSION -ErrorAction SilentlyContinue
```

**POSIX shell (bash/zsh):**

```sh
unset STOCKTRENDS_API_KEY
unset STOCKTRENDS_ENABLE_PAID_TOOLS
unset STOCKTRENDS_ENABLE_PAID_EXECUTION
unset STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT
unset STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION
unset STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL
unset STOCKTRENDS_MAX_STC_PER_SESSION
unset STOCKTRENDS_MAX_USD_PER_SESSION
```

Then re-run the names-only check; it must print nothing.

**Persistent sources.** If a variable reappears in a fresh shell, it is being
provisioned persistently — a Windows user/system environment variable (for
example set via `setx` or System Properties) or a POSIX shell profile
(`~/.bashrc`, `~/.zshrc`, etc.). Remove it from the persistent store (checking
profile files by variable *name* only — never echo a value), open a fresh
shell, and re-run the names-only check. Per the README Secret Safety rules,
no paid `STOCKTRENDS_*` variable — especially `STOCKTRENDS_API_KEY` — may be
provisioned persistently.

If `STOCKTRENDS_API_KEY` was found set and there is any possibility its value
was ever pasted, logged, or captured, treat it per the Phase 5A §3
compromised-secret row: rotate/revoke out of band. Presence alone (observed
names-only and unset without inspection) is a hygiene finding, not a
compromise.

## 4. S1 — Build preflight

From the checkout root (commands identical in PowerShell and POSIX):

```sh
npm install
npm run build
```

- [ ] `npm install` succeeds.
- [ ] `npm run build` succeeds.
- [ ] `dist/server.js` exists after the build.

`npm run typecheck` and `npm test` are **optional** for a docs-only release
execution; if run, record their results in the §13 record. (`npm test` is
mock-only by design — it performs no live API call.)

## 5. S2 — Default/free listing

With **no** `STOCKTRENDS_*` variable set (S0 just verified this), start the
server via the client mechanism and list tools, resources, and prompts.

Expected — all three must hold exactly:

- **Exactly 1 tool:** `stocktrends_estimate_workflow_cost`. No other tool of
  any kind is visible.
- **Exactly 10 resources**, exactly these URIs:
  1. `stocktrends://api/openapi`
  2. `stocktrends://ai/context`
  3. `stocktrends://ai/tools`
  4. `stocktrends://workflows`
  5. `stocktrends://methodology/stim`
  6. `stocktrends://methodology/indicators`
  7. `stocktrends://methodology/inference`
  8. `stocktrends://pricing/catalog`
  9. `stocktrends://proof/market-edge`
  10. `stocktrends://leadership/definitions`
- **Exactly 0 prompts.** The server registers no prompts capability; a client
  may show an empty prompts panel or report `prompts/list` as method-not-found
  (`-32601`) — both observations mean zero prompts and both pass.

**Any paid tool visible in this mode is a stop/fail condition:** stop
immediately, do not invoke anything, run S7 rollback, re-run S0 (a leftover
paid variable in the parent shell is the most likely cause — see the
Phase 5A §3 troubleshooting row), and record the deviation. Do not proceed
until the free surface shows exactly one tool.

## 6. S3 — Credential-free resource reads

In the same free session (no key of any kind configured), read these two
public resources through the client:

- `stocktrends://api/openapi`
- `stocktrends://leadership/definitions`

Expected: both reads succeed credential-free (fetch-on-request; the public
path never constructs an auth header under any configuration).

**Record status and top-level shape only — no payload dumps.** Record: the
resource URI, that the read succeeded, the upstream status from the resource
wrapper's `source.status` field, and at most the top-level key names of the
wrapper (`resourceUri`, `source`, `fetchedAt`, `data`) and/or of `data`.
Never reproduce payload contents, row data, or any value beyond a status
code and key names.

These reads are the only intended Stock Trends network activity in the entire
runbook execution.

## 7. S4 — Exposure matrix spot-checks (listing-only)

Confirm that neither the paid-tools flag alone nor a key alone exposes
anything. Two throwaway sessions, **listing only — nothing is invoked in
either**:

**Check 1 — flag without key.** Set only:

```powershell
# PowerShell
$env:STOCKTRENDS_ENABLE_PAID_TOOLS = "true"
```

```sh
# POSIX
export STOCKTRENDS_ENABLE_PAID_TOOLS=true
```

Start the server, list tools. Expected: still **exactly 1 tool** (the
planning tool), 10 resources, 0 prompts. A startup warning on stderr states
that paid mode is blocked because no API key is configured
(`blocked_missing_api_key` posture).

**Check 2 — placeholder key without flag.** Clear the flag from check 1
(`Remove-Item Env:STOCKTRENDS_ENABLE_PAID_TOOLS -ErrorAction SilentlyContinue`
/ `unset STOCKTRENDS_ENABLE_PAID_TOOLS`), then set only:

```powershell
# PowerShell — literal placeholder, never a real key
$env:STOCKTRENDS_API_KEY = "<your-api-key>"
```

```sh
# POSIX — literal placeholder, never a real key
export STOCKTRENDS_API_KEY="<your-api-key>"
```

Start the server, list tools. Expected: still **exactly 1 tool**,
10 resources, 0 prompts.

Clear both sessions' variables (S0 cleanup commands) before S5. Any paid tool
visible in either check is a stop/fail condition (§12).

## 8. S5 — Paid-exposed listing (placeholder key only)

Set **exactly two** variables — and nothing else:

**Windows PowerShell:**

```powershell
$env:STOCKTRENDS_ENABLE_PAID_TOOLS = "true"
$env:STOCKTRENDS_API_KEY = "<your-api-key>"   # literal placeholder — never a real key
# Do NOT set STOCKTRENDS_ENABLE_PAID_EXECUTION — it stays entirely unset.
# Do NOT set any cap or budget variable — they stay entirely unset.
```

**POSIX shell (bash/zsh):**

```sh
export STOCKTRENDS_ENABLE_PAID_TOOLS=true
export STOCKTRENDS_API_KEY="<your-api-key>"   # literal placeholder — never a real key
# Do NOT set STOCKTRENDS_ENABLE_PAID_EXECUTION — it stays entirely unset.
# Do NOT set any cap or budget variable — they stay entirely unset.
```

(Parser facts: only the literal `true` enables the paid-tools flag; `1`,
`yes`, and `on` fail startup with `invalid_config`.)

Start the server. **Before any invocation of anything**, confirm the stderr
startup warning states that paid tools are exposed but execution is **NOT
enabled** — the expected banner is:

> Paid ST-IM, indicators, base selections, and market-context tools are
> exposed but paid execution is NOT enabled
> (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true); every invocation fails
> closed with no request.

**If the banner instead reports live execution ENABLED, stop immediately —
invoke nothing — run S7 rollback**, re-run S0 (a persistent
`STOCKTRENDS_ENABLE_PAID_EXECUTION` in the environment is the likely cause),
and record the deviation. Do not continue until a restart shows the
NOT-enabled banner.

With the NOT-enabled banner confirmed, list the surface. Expected:

- **Exactly 10 tools**, exactly these names:
  1. `stocktrends_estimate_workflow_cost`
  2. `stocktrends_get_stim_latest`
  3. `stocktrends_get_stim_history`
  4. `stocktrends_get_indicators_latest`
  5. `stocktrends_get_indicators_history`
  6. `stocktrends_get_selections_latest`
  7. `stocktrends_get_market_regime_latest`
  8. `stocktrends_get_market_regime_history`
  9. `stocktrends_get_breadth_sector_latest`
  10. `stocktrends_get_leadership_summary_latest`
- **Exactly 10 resources** (the identical S2 URI list).
- **Exactly 0 prompts.**

Exposure is not execution: this configuration makes the nine paid tool
*definitions* visible and can never send a request or spend — execution is a
separate gate (`STOCKTRENDS_ENABLE_PAID_EXECUTION` plus mandatory preflight,
nonzero caps, and a covering budget), and it is deliberately absent here.

## 9. S6 — Execution-disabled fail-closed probe

In the S5 session (placeholder key, execution flag unset, caps unset), invoke
**exactly one** paid tool, **once**:

- Tool: `stocktrends_get_market_regime_latest`
- Arguments: `{}` (empty object)

Expected: a deterministic, secret-free, fail-closed denial with **all** of:

| Field | Expected |
| --- | --- |
| `error_code` / `denial_reason` | `paid_execution_disabled` |
| `paid_execution_authorized` | `false` |
| `paid_execution_occurred` | `false` |
| `api_request_sent` | `false` |
| `auth_header_sent` | `false` |
| `payment_header_sent` | `false` |
| Cap debit (`paid_calls_this_session` / `stc_spent_this_session`) | `0` / `0` |
| `pricing_reconciliation.status` | `not_evaluated` (no catalog read occurs) |

The denial is expected **before** any request, auth header, payment header,
cap debit, or pricing reconciliation: **no request of any kind leaves the
machine** for this probe. (Some MCP clients surface the denial as an in-band
error-shaped tool result rather than a protocol error — the fields above are
what matter, per the Phase 5B/5C/5D precedent.)

**No other paid tool is invoked** — this probe is the single paid-boundary
invocation in the entire runbook. If the observed result differs in any way —
in particular if `api_request_sent` or `auth_header_sent` is `true`, or the
call appears to succeed — stop immediately, invoke nothing else, run S7
rollback, and record a FAIL (§12/§13).

## 10. S7 — Rollback to the free surface

1. Stop the client/server session.
2. Unset **every** `STOCKTRENDS_*` variable — run the full S0 cleanup command
   set (both shells shown in §3), plus any other `STOCKTRENDS_*` name
   present.
3. Restart the server via the client mechanism.
4. Verify the default/free surface: exactly **1 tool**
   (`stocktrends_estimate_workflow_cost`), **10 resources** (the S2 URI
   list), **0 prompts**.
5. Re-run the S0 names-only check — it must print nothing.

Rollback is mandatory on every execution — full, partial, or abandoned —
including after any stop/fail condition.

## 11. S8 — Secret-safety scan and record

Scan **everything captured during the execution** (notes, terminal output
retained for the record, screenshots, the §13 record itself) for
secret-shaped content before the record is stored or shared. Search terms:

- `STOCKTRENDS_API_KEY`
- `X-API-Key`
- `Authorization`
- `Bearer`
- `private key`
- `wallet`
- `.env`
- `<your-api-key>`

Rules for what may appear in a stored record:

- **Placeholders only.** The literal placeholder `<your-api-key>` and
  `REDACTED` markers are the only credential-shaped strings permitted. Any
  hit on the terms above must resolve to a variable *name*, a documented
  placeholder, or this term list itself — never a populated value.
- **No payload dumps.** No resource payload, API row data, or raw response
  body appears in the record — statuses, counts, names, booleans, and
  top-level key names only (§6).
- **No secret values.** If the scan surfaces anything that could be a real
  secret, stop: treat it per Phase 5A §6 (rotate/revoke out of band, delete
  the offending artifact, never commit it), and do not store or share the
  record until it is cleared.

Record the scan result (terms searched, findings, resolution) secret-free in
the §13 record.

## 12. Stop/fail conditions

Any of the following stops the execution immediately (invoke nothing further,
run S7 rollback, record the outcome — FAIL unless noted):

- **Any real API key present** anywhere — parent shell, session, client
  config, or record.
- **`STOCKTRENDS_ENABLE_PAID_EXECUTION` set** — to any value, at any step.
- **Any cap or budget variable set** at any step.
- **The startup banner reports live execution ENABLED** at any step (S5 stop
  rule).
- **Any paid request sent** — any observed `api_request_sent: true`.
- **Any auth header sent** — any observed `auth_header_sent: true`.
- **Any payment header sent** — any observed `payment_header_sent: true`.
- **Any prompt count other than zero** in any mode.
- **Any surface-count drift** — tools ≠ 1 (free) or ≠ 10 (paid-exposed),
  resources ≠ 10, or any name/URI differing from the S2/S5 lists.
- **Any paid tool visible in free mode** (S2/S4).
- **Any secret value captured** in any output, note, or screenshot.
- **Any payload dump captured** in the record.

A stop for a hygiene finding that S0 cleanup fully resolves (names-only,
values never inspected, re-check clean) may be recorded as a deviation with
disposition rather than a FAIL, provided every count and fail-closed
expectation subsequently holds. Deviations are recorded, never worked around.

## 13. Expected result template

Record every execution secret-free, in this shape:

```text
Phase 5E operator smoke-test execution record

Date/time (UTC):
Operator:
HEAD commit / branch:
Node version:
Client mechanism (Inspector / client name+version / SDK harness):

Verdict: PASS | PASS WITH DEVIATIONS | FAIL
```

Observed counts:

| Surface | Expected | Observed (S2 free) | Observed (S5 paid-exposed) | Observed (S7 rollback) |
| --- | --- | --- | --- | --- |
| Tools | 1 / 10 / 1 | | | |
| Resources | 10 | | | |
| Prompts | 0 | | | |

Step results:

| Step | Expected | Observed | Pass? |
| --- | --- | --- | --- |
| S0 hygiene check | prints nothing | | |
| S1 build | `dist/server.js` exists | | |
| S2 free listing | 1 / 10 / 0 | | |
| S3 resource reads | 2 credential-free successes; shape only | | |
| S4 flag-only / key-only | 1 tool each | | |
| S5 paid-exposed listing | NOT-enabled banner; 10 / 10 / 0 | | |
| S6 fail-closed probe | `paid_execution_disabled`; all-false flags; no request | | |
| S7 rollback | 1 / 10 / 0; S0 check prints nothing | | |
| S8 secret scan | no findings | | |
| Typecheck/tests (optional) | recorded if run | | |

Deviations:

| # | Step | Deviation | Safety impact | Disposition |
| --- | --- | --- | --- | --- |

**Verdict rules:** **PASS** — every step observed exactly as expected, no
deviations. **PASS WITH DEVIATIONS** — all counts and fail-closed behaviors
held; procedural deviations (for example an SDK-harness mechanism, or an S0
hygiene finding fully resolved names-only) are recorded with dispositions.
**FAIL** — any §12 condition, any spend, any real key, any request/auth/
payment header observed sent, or any unresolved surface drift.

The stored record contains no secrets, no populated header values, and no
payload dumps (S8 verifies this before storage).

---

**Reminder:** This runbook is documentation only, and executing it performs no
live paid execution: no real key, no execution flag, no caps, no budget, one
fail-closed probe that sends nothing, credential-free public-resource reads
as the only Stock Trends network activity, and placeholder credentials only.
It grants no approval beyond the existing controlled local stdio operator
scope, and it is not a paid-execution runbook — paid execution remains
governed by the Phase 5A §4 eligibility checklist and separate operator
authorization.
