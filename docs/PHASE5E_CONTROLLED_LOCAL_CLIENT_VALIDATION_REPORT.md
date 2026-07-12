# Phase 5E Controlled Local Client Validation Report

Date: 2026-07-12

Status: **Controlled local client validation report (PR #59) — credential-free /
no-spend by design. Verdict: PASS WITH DEVIATIONS (§14).** This report records a
completed controlled local stdio validation of the merged PR #57/#58
launch/distribution documentation, executed as designed by the
[Phase 5E launch/distribution readiness design memo](PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md)
§9 and the [Phase 5E operator smoke-test runbook](PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md).

## 1. Status

- **Credential-free / no-spend by design, not by budget.** No real API key
  exists anywhere in the validation: the only credential-shaped value used in
  any session is the literal README placeholder `<your-api-key>`.
- **No real key** was used, requested, inspected, printed, logged, stored, or
  forwarded at any point (see §3 for the parent-shell names-only hygiene
  finding, which was handled without ever reading a value).
- **Zero paid calls. Zero STC. Zero USD.** No paid endpoint was contacted; no
  spend or usage of any kind was created.
- **No paid execution.** `STOCKTRENDS_ENABLE_PAID_EXECUTION` was never set in
  any validation session — not even to `false`; it stayed entirely unset. No
  cap or budget variable was ever set. The single paid-boundary invocation
  (§8) failed closed with `paid_execution_disabled` and sent nothing.
- **No x402, no wallet, no OAuth, no `Authorization: Bearer`, no payment
  header** — observed `auth_header_sent: false` and
  `payment_header_sent: false` on the only paid-boundary result; no other
  credential-bearing behavior exists or was exercised.
- **No remote MCP.** Every session drove the compiled `dist/server.js` over
  local stdio only. No HTTP/SSE/Streamable HTTP transport, hosted endpoint, or
  tunnel of any kind.
- **No runtime changes.** This PR adds this document plus one README
  documentation-index link; `src/`, `tests/`, `package.json`, and
  `package-lock.json` are untouched, and no script, runtime artifact, log,
  payload dump, or screenshot is added to the repository.
- **No launch-readiness signoff claim.** Launch readiness may be declared only
  by PR #60 on the PR #56–#59 evidence after Codex review; this report claims
  nothing beyond its own observations.

## 2. Validation scope

| Item | Value |
| --- | --- |
| HEAD commit validated | `90e505e733f8fa4fd7bda99583553711adc32466` (`90e505e Add Phase 5E operator launch readiness docs (#58)`) |
| Branch | `claude/pr59-controlled-local-client-validation` (not `main`; based on `main` including the merged PR #57 `6daf7fa` and PR #58 `90e505e`) |
| Operator | Skot Kortje / Stock Trends (skortje@stocktrends.com) |
| OS | Microsoft Windows 11 Home 10.0.26200 |
| Node / npm | Node `v22.12.0`; npm `10.9.0` |
| Transport | Local `stdio` only |
| Session timestamps (UTC) | free/default `2026-07-12T13:05:18Z`; paid-exposed `2026-07-12T13:06:03Z`; rollback `2026-07-12T13:06:41Z` |

**Client mechanism.** The validation client preference order (design memo §9
P2) was applied as follows:

- **Claude Desktop (primary target): unavailable.** This validation ran in a
  non-interactive session that cannot perform Claude Desktop GUI steps and
  does not modify the operator's persistent `claude_desktop_config.json`; no
  Claude Desktop evidence is claimed or fabricated.
- **Claude Code (named-client alternate): used for free-mode corroboration.**
  This validation itself ran inside a Claude Code session with this
  repository's server connected over local stdio. The session's tool registry
  was checked and contains **exactly one** stocktrends tool —
  `stocktrends_estimate_workflow_cost`, the credential-free planning tool —
  and **none** of the nine paid tools: a real end-user agentic client
  observing the free-mode tool surface. Nothing was invoked through it. Per
  the README §B boundary note, the documented Claude Code path is
  free-mode-only, and the session's connected server cannot be restarted with
  per-phase environments, so Claude Code could not carry the paid-exposed or
  rollback phases (deviation 4). Claude Code CLI version was not printable in
  this session.
- **SDK harness (controlled mechanism for all phases): used — recorded as a
  deviation.** All controlled phases (§5–§9) were driven by a throwaway
  local-stdio MCP client harness built on the project's own MCP SDK
  (`@modelcontextprotocol/sdk` `1.29.0`, `Client` + `StdioClientTransport`) —
  the mechanism the Phase 5E runbook's "Client mechanism" paragraph accepts
  for non-interactive sessions and the same pattern the accepted
  Phase 5B/5C/5D reports used. Its configuration is exactly the README §C
  generic MCP stdio client shape. The harness lives in the session scratchpad
  **outside the repository** and changed no repository file.
- **MCP Inspector: not used** — neither as primary nor supplemental evidence.

**Scope note.** This report executes the PR #59 procedure (design memo §9 plus
the PR #59 task scope): S0 hygiene, S1 install/build, free/default listing,
the two credential-free resource reads, paid-exposed placeholder listing with
the startup-banner check, one execution-disabled fail-closed probe, rollback,
and the secret-safety scan. Runbook step **S4** (flag-only / key-only exposure
matrix spot-checks) is not part of the PR #59 procedure and was **not**
executed; that matrix remains covered by the merged PR #53 report §4 evidence
and the mock-only suite.

**Governing documents followed as written:** [`README.md`](../README.md)
(quickstart, "Connect a local stdio MCP client", paid-mode configuration,
secret safety),
[`PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`](PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md),
[`PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`](PHASE5E_LAUNCH_RELEASE_CHECKLIST.md),
[`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md),
[`PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md`](PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md) §9,
[`PHASE5E_NEXT_CAPABILITY_SELECTION_MEMO.md`](PHASE5E_NEXT_CAPABILITY_SELECTION_MEMO.md),
[`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md),
[`PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md`](PHASE5D_MARKET_CONTEXT_CONTROLLED_VALIDATION_REPORT.md)
(observation baseline),
[`SECURITY_MODEL.md`](SECURITY_MODEL.md),
[`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
(§3 troubleshooting, §6 secret scan), and
[`PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md`](PHASE5A_MCP_INSPECTOR_VALIDATION_RUNBOOK.md)
(historical counts context).

## 3. Safety preconditions

All checks are **names-only / boolean-presence-only**; no environment variable
value was inspected, printed, logged, stored, or recorded at any point.

- **S0 parent-shell names-only check at start: FINDING.** The check printed
  **eight** `STOCKTRENDS_*` variable names in the session's inherited
  environment (both PowerShell and POSIX forms of the runbook command):
  `STOCKTRENDS_API_KEY`, `STOCKTRENDS_ENABLE_PAID_TOOLS`,
  `STOCKTRENDS_ENABLE_PAID_EXECUTION`,
  `STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION`,
  `STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL`, `STOCKTRENDS_MAX_STC_PER_SESSION`,
  `STOCKTRENDS_MAX_USD_PER_SESSION`. This is the same pre-provisioned
  parent-shell condition the PR #53 report §11 / PR #54 signoff §9 recorded as
  an open operator item.
- **Persistent-source determination (names-only):** all eight names are
  present as value names under `HKCU:\Environment` (the Windows **user**
  persistent environment — the `setx`/System Properties store); the machine
  environment (`HKLM`) is clean. Persistent provisioning of paid variables —
  especially `STOCKTRENDS_API_KEY` — is exactly what the README Secret Safety
  section forbids. See deviation 2 (§13) for the disposition and the operator
  cleanup — required at validation time and completed after the validation
  (§13 post-validation update).
- **S0 cleanup applied to every working shell:** before every command in this
  validation, the executing shell unset every `STOCKTRENDS_*` variable and
  re-ran the names-only check, which then printed nothing (verified `0`
  remaining in every working shell used, PowerShell and bash).
- **Curated child environments (Phase 5D-precedent pattern):** every server
  child was spawned with an environment built from the MCP SDK's safe default
  allowlist (`getDefaultEnvironment()` — no `STOCKTRENDS_*` variable is on
  it), plus only the explicit per-phase placeholder values, with a
  belt-and-suspenders guard stripping any `STOCKTRENDS_*` key not explicitly
  set. Each child's `STOCKTRENDS_*` key list was recorded and matched the
  intended configuration exactly: free `[]`; paid-exposed
  `[STOCKTRENDS_API_KEY, STOCKTRENDS_ENABLE_PAID_TOOLS]` (placeholder values
  only); rollback `[]`.
- **No real API key present in any validation session or artifact.** The only
  credential-shaped value used anywhere was the literal placeholder
  `<your-api-key>`. The parent-shell `STOCKTRENDS_API_KEY` **name** presence
  is a hygiene finding handled names-only: per runbook S0 / Phase 5A §3,
  presence alone — observed names-only and never inspected — is a hygiene
  finding, not a compromise. Its value was never read, used, or forwarded
  into any process by this validation.
- **No `STOCKTRENDS_ENABLE_PAID_EXECUTION` in any session:** the execution
  flag was never set in any validation session (the recorded child key lists
  prove its absence); the parent-shell name (value never inspected) never
  reached any child.
- **No cap/budget variables** in any session (all four stayed entirely
  unset in every child).
- **Local stdio only; no remote or hosted endpoint** of any kind.
- **No x402/wallet/OAuth/`Authorization: Bearer`/payment-header behavior**
  anywhere in the validation.

## 4. Install/build validation

Run from the checkout root, following the README as written, each command in a
working shell with `STOCKTRENDS_*` first unset (§3):

| Check | Result |
| --- | --- |
| `npm install` | **PASS** — "up to date, audited 144 packages", exit 0; touches the npm registry only, no Stock Trends endpoint |
| `package.json` / `package-lock.json` | **Untouched** — `git status` for both empty before and after |
| `npm run build` | **PASS** — `tsc -p tsconfig.build.json`, exit 0 |
| `dist/server.js` exists | **True** |
| `npm run typecheck` (optional, recorded) | **PASS** — `tsc --noEmit`, exit 0 |
| `npm test` (optional, recorded; mock-only by design) | **PASS** — **448 tests / 15 files**, exit 0 — matches the PR #51/PR #53 baseline exactly; no live API call runs in the suite |

No live paid call was made by any install/build step.

## 5. Free/default client validation

Server child started over local stdio with **no** `STOCKTRENDS_*` variables of
any kind (recorded child key list: `[]`):

| Item | Observed |
| --- | --- |
| Tools | **1** — `stocktrends_estimate_workflow_cost` only |
| Resources | **10** — `stocktrends://api/openapi`, `stocktrends://ai/context`, `stocktrends://ai/tools`, `stocktrends://workflows`, `stocktrends://methodology/stim`, `stocktrends://methodology/indicators`, `stocktrends://methodology/inference`, `stocktrends://pricing/catalog`, `stocktrends://proof/market-edge`, `stocktrends://leadership/definitions` — exactly the runbook S2 URI list |
| Prompts | **0** — `prompts/list` → `MCP error -32601: Method not found` (no prompts capability registered; the runbook-blessed zero-prompt observation) |
| Paid tools absent | Confirmed — none of the nine paid tool names appears |
| Startup stderr | 0 bytes (no paid banner in free mode, as expected) |
| Server identity | `stocktrends-mcp-server` `1.0.0` |

**Named-client corroboration (Claude Code):** independently of the harness,
the Claude Code session hosting this validation has this repository's server
connected over local stdio, and its tool registry contains exactly one
stocktrends tool — the credential-free planning tool — with none of the nine
paid tools visible. Nothing was invoked through that connection. (Its
resource/prompt panels are not enumerable from within the session, so those
counts are evidenced by the harness — deviation 4.)

## 6. Credential-free resource read validation

In the same free/default session (**no key of any kind configured**), both
reads succeeded through the public resource path. Status and top-level shape
only — no payload dumps:

| Item | `stocktrends://api/openapi` | `stocktrends://leadership/definitions` |
| --- | --- | --- |
| Read result | **Succeeded**, credential-free | **Succeeded**, credential-free |
| `mimeType` | `application/json` | `application/json` |
| Wrapper top-level keys | `resourceUri`, `source`, `fetchedAt`, `data` | `resourceUri`, `source`, `fetchedAt`, `data` |
| `source.status` | `200` | `200` |
| `source.endpointPath` | `/v1/openapi.json` | `/v1/leadership/definitions` |
| `data` top-level keys | `openapi`, `info`, `paths`, `components`, `servers`, `x-stocktrends-provenance-summary`, `x-stocktrends-data-provenance` | `concept`, `indicators`, `taxonomy_source`, `taxonomy_levels`, `notes` (matches the PR #53 §7 recorded shape exactly) |

These two fetch-on-request reads were the **only Stock Trends network
activity in the entire validation** (`npm install` touched the npm registry
only). The public path sends no auth header under any configuration.

## 7. Paid-exposed placeholder listing validation

Server child started with **exactly two** variables — recorded child key list
`[STOCKTRENDS_API_KEY, STOCKTRENDS_ENABLE_PAID_TOOLS]`:

- `STOCKTRENDS_ENABLE_PAID_TOOLS=true`
- `STOCKTRENDS_API_KEY=<your-api-key>` (the literal README placeholder —
  never a real key)
- `STOCKTRENDS_ENABLE_PAID_EXECUTION` **remained entirely unset**; all
  cap/budget variables **remained entirely unset**.

**Startup warning confirmed before any invocation.** The stderr banner
observed (verbatim, secret-free) was:

> `[stocktrends-mcp] warn: Paid ST-IM, indicators, base selections, and
> market-context tools are exposed but paid execution is NOT enabled
> (STOCKTRENDS_ENABLE_PAID_EXECUTION is not true); every invocation fails
> closed with no request.`

The execution-ENABLED banner was **absent** (checked explicitly; the harness
stop rule would have invoked nothing had it appeared).

| Item | Observed |
| --- | --- |
| Tools | **10**, exactly: `stocktrends_estimate_workflow_cost`, `stocktrends_get_stim_latest`, `stocktrends_get_stim_history`, `stocktrends_get_indicators_latest`, `stocktrends_get_indicators_history`, `stocktrends_get_selections_latest`, `stocktrends_get_market_regime_latest`, `stocktrends_get_market_regime_history`, `stocktrends_get_breadth_sector_latest`, `stocktrends_get_leadership_summary_latest` |
| Resources | **10** — the identical §5 URI list |
| Prompts | **0** (`-32601`) |

No paid request was sent by this listing (exposure is not execution; the
placeholder key was never transmitted anywhere).

## 8. Execution-disabled fail-closed probe

In the §7 session, **exactly one** paid-boundary invocation was made — the
only one in the entire validation:

- Tool: `stocktrends_get_market_regime_latest`; arguments: `{}`; invocations: 1.

The denial surfaced as an in-band error-shaped tool result (`isError: true` —
the SDK surfacing behavior the runbook §9 notes from the Phase 5B/5C/5D
precedent). Observed fields, recorded exactly:

| Field | Expected (runbook §9) | Observed |
| --- | --- | --- |
| `error_code` / `denial_reason` | `paid_execution_disabled` | `paid_execution_disabled` / `paid_execution_disabled` |
| `paid_execution_authorized` | `false` | `false` |
| `paid_execution_occurred` | `false` | `false` |
| `api_request_sent` | `false` | `false` |
| `auth_header_sent` | `false` | `false` |
| `payment_header_sent` | `false` | `false` |
| Cap debit (`paid_calls_this_session` / `stc_spent_this_session`) | `0` / `0` | `0` / `0` (and `usd_spent_this_session` `0`) |
| `pricing_reconciliation.status` | `not_evaluated` (no catalog read) | `not_evaluated` |
| `automatic_paid_retries` | `false` | `false` |
| Endpoint in denial metadata | `/v1/market/regime/latest` | `/v1/market/regime/latest` |
| `effective_limits` | `{}` (snapshot; no limit exists) | `{}` |
| `observed_cost` / `payment_status` | `null` / `null` (never fabricated) | `null` / `null` |
| `context_not_advice` provenance | `true` | `true` |

The denial occurred **before** any request, auth header, payment header, cap
debit, or pricing reconciliation: **no request of any kind left the machine
for this probe**, and **no other paid tool was invoked** at any point.

## 9. Rollback validation

1. The paid-exposed child exited at the end of §8 (ephemeral process; its
   in-memory state ended with it).
2. A fresh server child was started with **every** `STOCKTRENDS_*` variable
   unset (recorded child key list: `[]`).
3. Free/default surface re-verified: **1 tool**
   (`stocktrends_estimate_workflow_cost`), **10 resources** (the §5 URI
   list), **0 prompts** (`-32601`); startup stderr silent.
4. Names-only parent-shell re-check:
   - **Cleaned working shell (post-S0 unset): printed nothing** (0 names) —
     the runbook-expected result for the shell the validation ran in.
   - **Fresh shell: still prints the eight persistent names**, because the
     `HKCU:\Environment` provisioning (§3) re-injects them into every new
     process until the operator removes it — recorded as part of deviation 2,
     with the required operator cleanup steps in §13. (That provisioning was
     removed after the validation and re-verified names-only — see the §13
     post-validation update; this line preserves the state observed at
     rollback time.)

No `STOCKTRENDS_*` value was exported, persisted, or otherwise added to any
shell profile, registry store, or configuration by this validation; the
placeholder values existed only inside the two paid-exposed child-process
environment entries and ended with that process.

## 10. Secret-safety scan

The runbook S8 term list was searched over this report, the PR diff, the
throwaway harness, its captured outputs, and the session notes:
`STOCKTRENDS_API_KEY`, `X-API-Key`, `Authorization`, `Bearer`, `private key`,
`wallet`, `.env`, `<your-api-key>`.

**Result: no findings.** Every hit resolves to a variable **name**, the
documented literal placeholder `<your-api-key>`, prohibition/reporting
language (including this term list itself), or a `REDACTED`-style marker —
never a populated value. Specifically:

- no real key value and no realistic-looking fake credential anywhere;
- no populated `X-API-Key:` or `Authorization:` header value anywhere;
- no `Bearer` token, private key, wallet material, or `.env` contents (no
  `.env` file exists in this repository, and none was created or read);
- no raw payload dumps — only counts, names, URIs, booleans, statuses, and
  top-level key names appear in this report and in the harness output;
- no screenshots, logs, or runtime artifacts were created in the repository.

## 11. Observed counts table

| Surface | Expected | Observed (free/default) | Observed (paid-exposed placeholder) | Observed (rollback) |
| --- | --- | --- | --- | --- |
| Tools | 1 / 10 / 1 | **1** | **10** | **1** |
| Resources | 10 | **10** | **10** | **10** |
| Prompts | 0 | **0** (`-32601`) | **0** (`-32601`) | **0** (`-32601`) |

Tool names and resource URIs matched the README / runbook lists **verbatim**
in every phase (§5, §7, §9). The auth-capable paid allowlist stands at exactly
**9 routes** by read-only source inspection of
`AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` in `src/paidPolicy.ts` at this HEAD (no
live call needed or permitted for that check), completing the 1/10/10/0/9
contract.

## 12. Doc/observation mismatch log

| # | Doc said | Observed | Severity | Disposition |
| --- | --- | --- | --- | --- |
| 1 | Runbook S0: the names-only check "must print nothing" | Eight `STOCKTRENDS_*` names printed at start; all eight persistently provisioned in `HKCU:\Environment` (names-only; values never inspected) | Operator-environment hygiene — **not a documentation defect**: the runbook's S0/persistent-sources path anticipated exactly this and its cleanup guidance worked as written | Handled per runbook S0: per-shell unset + clean re-check for every working shell; curated child environments with recorded key lists; persistent-store removal was recorded **due** at validation time as the operator's own step and was **completed after the validation** (§13 post-validation update) |
| 2 | Runbook S7 / PR #59 spec: rollback names-only re-check "expected: prints nothing" | Prints nothing in the cleaned working shell; a **fresh** shell re-inherited the eight persistent names at rollback time | Same root cause as row 1 | Same disposition; carried as deviation 2, not worked around — **closed post-validation** (§13 update): after the operator cleanup, a fresh-shell check prints nothing |

No other mismatch was observed: counts, tool names, resource URIs, the
startup banner text, the denial shape, the `-32601` zero-prompt observation,
and the resource wrapper shape all matched the merged documentation verbatim.
**No safety-relevant documentation mismatch was observed.**

## 13. Deviations

1. **Client mechanism (procedural; same class as the accepted Phase 5B/5C/5D
   deviation).** Claude Desktop (primary target) was unavailable in this
   non-interactive session (GUI steps and persistent desktop-config edits are
   not performable here), and Claude Code — while it directly corroborated the
   free-mode tool surface as a real end-user client (§5) — is documented
   free-mode-only and cannot restart its connected server with per-phase
   environments. All controlled phases therefore ran over a local-stdio MCP
   SDK client harness (the project's own `@modelcontextprotocol/sdk` `1.29.0`
   `Client` + `StdioClientTransport`, in the README §C generic-stdio-client
   shape) — the mechanism the runbook's "Client mechanism" paragraph accepts
   for non-interactive sessions with this deviation recorded. The harness
   lives in the session scratchpad outside the repository and changed no
   repository file. A fully named-end-user-client execution (Claude Desktop
   per README §A) remains available to any operator via the runbook.
2. **S0 parent-shell hygiene finding — persistent provisioning; operator
   action completed after the validation (see the post-validation update
   below).** Eight `STOCKTRENDS_*` variables — including
   `STOCKTRENDS_API_KEY` and `STOCKTRENDS_ENABLE_PAID_EXECUTION` — were found
   (names-only) in the session's inherited environment and are persistently
   provisioned in the Windows **user** registry environment
   (`HKCU:\Environment`; machine env clean). Values were never inspected,
   printed, logged, stored, or forwarded; every working shell was cleaned
   before use and every child environment was curated (§3), so no validation
   process ever depended on or received that shell state. This validation
   deliberately did **not** delete the operator's registry values: that is a
   destructive change to operator machine state (and the store may hold the
   operator's only copy of the key), and the PR #53 §11 / PR #54 §9 precedent
   records this cleanup as the operator's own step. **Operator cleanup steps
   (required at validation time; since completed — see the post-validation
   update below):** remove each of the eight values from the
   user environment — e.g.
   `Remove-ItemProperty -Path 'HKCU:\Environment' -Name '<NAME>'` for each
   name in §3, or System Properties → Environment Variables → delete each —
   then close applications launched before the cleanup (running processes,
   including this one, retain the inherited copies), open a fresh shell, and
   re-run the S0 names-only check until it prints nothing. Per Phase 5A §3
   and runbook S0, presence alone (names-only, never inspected) is a hygiene
   finding, not a compromise; whether to rotate the key out of band — given
   that it has sat in a persistent plaintext store across sessions — is the
   operator's out-of-band decision.
3. **Rollback re-check scope.** Because of deviation 2, the rollback
   names-only check printed nothing only in the cleaned working shell at
   validation time; fresh shells re-inherited the persistent names until the
   operator completed the cleanup. Recorded, not worked around. Following the
   post-validation cleanup (below), fresh shells no longer inherit any
   `STOCKTRENDS_*` name.
4. **Claude Code corroboration limited to the tool surface.** The Claude Code
   session registry evidences the free-mode tool surface (exactly one
   credential-free tool, no paid tools) but does not expose resource/prompt
   enumeration in-session, so resource and prompt counts in every phase are
   evidenced by the harness.

No other deviation occurred: no environmental issue, no manual step was
skipped or substituted, no resource-read limitation was encountered (both
reads succeeded through the client mechanism), and nothing was invoked or
configured beyond the procedure above.

**Post-validation update (2026-07-12) — deviation 2 closed.** After this
validation completed, the operator removed all eight persistent
`STOCKTRENDS_*` values from the Windows user environment. Re-verified
names-only at `2026-07-12T13:26:36Z`: `HKCU:\Environment` now contains
**zero** `STOCKTRENDS*` value names (the machine environment remains clean),
and the operator confirmed that the S0 names-only check in a fresh PowerShell
window now prints nothing. No value was inspected at any point, before or
after the cleanup. Processes launched before the cleanup — including the
session that ran this validation — retain stale inherited copies of the
names until they are restarted; freshly launched processes no longer inherit
any `STOCKTRENDS_*` variable. The open operator hygiene item carried since
the PR #53 report §11 / PR #54 signoff §9 is therefore **closed** as of this
note. The original finding and its validation-time handling above remain
recorded unchanged; this validation's observations (§3, §9, §12) describe the
environment as it was when the validation ran.

## 14. Verdict

**PASS WITH DEVIATIONS.**

- Every count and every fail-closed expectation held exactly as documented:
  1/10/10/0/9 surface contract confirmed (§11); install/build/typecheck/tests
  clean (§4); both credential-free reads succeeded shape-only (§6); the
  NOT-enabled banner appeared verbatim before any invocation (§7); the single
  probe failed closed `paid_execution_disabled` with all-false
  request/auth/payment flags, zero cap debit, and `not_evaluated` pricing
  reconciliation (§8); rollback restored the free surface (§9); the secret
  scan found nothing (§10).
- **Zero real keys, zero paid calls, zero STC, zero auth headers, zero
  payment headers**, no execution-enabled state in any validation session, no
  surface drift, and no safety-relevant docs mismatch — so no FAIL condition
  was met.
- **PASS (unqualified) is withheld** because the full procedure did not run
  end-to-end on a named end-user client (deviation 1) and the S0 hygiene
  finding occurred during the validation (deviation 2 — subsequently closed
  by the post-validation cleanup recorded in §13, which does not change what
  the validation itself observed). All deviations are documented and
  dispositioned above, which is exactly the PASS WITH DEVIATIONS contract.

## 15. Non-approvals preserved

This report validates documentation against the free and paid-*exposed*
(execution-disabled) surfaces only. It approves **nothing**, and in
particular does **not** approve:

- remote MCP (no HTTP/SSE/Streamable HTTP transport);
- hosted MCP (no public, multi-user, or third-party-hosted deployment);
- autonomous agent paid execution;
- unattended, scheduled, CI, background, or bulk/sweep use of any paid or
  credential-bearing surface;
- x402 relay behavior of any kind;
- wallet payments or wallet custody;
- OAuth, `Authorization: Bearer`, or payment-header behavior (`X-API-Key`
  remains the only credential path, only where already promoted, only after
  every gate passes);
- the deferred routes (`/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, `/v1/leadership/rotation/history`);
- decision/portfolio endpoints;
- Intelligence Agent artifact endpoints;
- investment advice of any kind (context-not-advice framing stands);
- npm package or registry publication;
- directory/marketplace submission.

The PR #54 §8 non-approvals stand unchanged; launch readiness itself is
declared, if at all, only by PR #60.

## 16. Recommendation

**Proceed to PR #60 — the Phase 5E local stdio launch-readiness signoff** —
on this report's PASS WITH DEVIATIONS evidence, after Codex review of this
report. The deviation-2 operator cleanup was completed and re-verified
names-only after the validation (§13 post-validation update), so **PR #60
has no open operator-side hygiene item to track**; the procedural deviations
(§13) remain documented as part of the evidence record.

Per the agreed post-PR #60 roadmap, the next MCP work after the signoff is
the **x402 relay architecture track — design-first, as its own separately
reviewed sequence — before any final marketplace launch and before returning
to Stock Trends Intelligence Agent work**; nothing in that track is started,
designed, or approved by this report.

---

**Reminder:** This validation used no real API key, sent no paid request, no
auth header, and no payment header, spent zero STC, never set the execution
flag or any cap/budget variable, ran over local stdio only, and recorded
everything secret-free with no payload dumps. It makes no launch-readiness
claim; PR #60 remains the only document in the Phase 5E sequence that may
declare launch readiness.
