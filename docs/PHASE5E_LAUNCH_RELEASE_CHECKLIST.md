# Phase 5E Launch Release Checklist

Date: 2026-07-12

Status: **Documentation / release-readiness only (PR #58). Current-surface
launch release checklist.** Use this checklist before tagging or announcing a
documentation/readiness release of the current surface (1 free tool /
10 paid-exposed tools / 10 public resources / 0 prompts / 9 auth-capable paid
routes). Every item is a docs/readiness check; **no item requires a live paid
call**, a real API key, an MCP Inspector session, or any spend. The PR that
creates this document performs none of those either: no live endpoint call of
any kind (paid or credential-free), no API key used, requested, inspected,
printed, logged, or stored, no MCP Inspector session, and no paid validation.

**Supersession (see C11).** This checklist **supersedes the Phase 5A release
checklist
([`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
§5) for current release use** — the Phase 5A counts (1 free / 3 paid-exposed
tools, nine resources) were correct for the Phase 4 era and remain accurate
history. The Phase 5A document is **not edited**. This checklist does **not**
supersede the Phase 5A §3 troubleshooting table or the Phase 5A §4
paid-execution eligibility checklist — both remain in force and are
referenced, not duplicated.

**This checklist approves no publication.** Completing it authorizes a
documentation/readiness release (tag/notes per C6) only. It grants **no npm
package or registry publication approval and no directory/marketplace
submission approval** — each of those remains its own separately reviewed
step (see the
[Phase 5E directory metadata readiness document](PHASE5E_DIRECTORY_METADATA_READINESS.md)
§1/§11).

This checklist builds on and does not supersede:

- [`PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md`](PHASE5E_LAUNCH_DISTRIBUTION_READINESS_DESIGN_MEMO.md)
  (PR #56) — the §7.2 design this checklist implements.
- [`PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`](PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md)
  — the current-surface, no-spend execution evidence C1 and C9 consume.
- [`PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md`](PHASE5D_MARKET_CONTEXT_PRODUCTION_READINESS_SIGNOFF.md)
  (PR #54) — the controlled-local-stdio-only scope and the §8 non-approvals
  C12 restates.
- [`PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md`](PHASE5A_OPERATOR_SAFETY_AND_RELEASE_CHECKLIST.md)
  — §3 (troubleshooting, still in force), §4 (paid-execution eligibility,
  still in force), §5 (the Phase 4-era release checklist superseded for
  current release use by this document), §6 (secret-scan guidance C3 uses),
  §7 (tag/release-notes pattern C6 follows).
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) and [`README.md`](../README.md) —
  the security posture and the free/paid contract the released documentation
  must match.

## 1. Status and scope

- **Docs-only.** This PR adds this document (plus two sibling Phase 5E
  documents and three README documentation-index links); no `src/`,
  `tests/`, `package.json`, or `package-lock.json` change, and no runtime
  behavior change.
- **Docs/readiness checks only.** Every item below is verifiable from the
  repository, the merged documentation, and a no-spend runbook execution.
  No item requires — or permits — a live paid call.
- **Current-surface.** The counts this checklist gates on are the
  1/10/10/0/9 contract confirmed by the merged PR #54 signoff §4 and the
  Phase 5E design memo §3.
- **Scope of a release under this checklist:** a documentation/readiness
  milestone for the controlled local stdio operator scope only. Nothing here
  approves any new runtime behavior, transport, endpoint, cap value, usage
  pattern, publication, or submission.

## 2. Release checklist (C1–C12)

Complete every item before tagging or announcing:

- [ ] **C1 — Surface counts verified.** A completed S0–S8 execution of the
  [Phase 5E operator smoke-test runbook](PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md)
  — or the merged PR #59 controlled local client validation report for the
  same HEAD — confirms **1 free tool / 10 paid-exposed tools / 10 public
  resources / 0 prompts**, and the auth-capable paid allowlist stands at
  **exactly 9 routes** (read-only source check of
  `AUTH_CAPABLE_PAID_ENDPOINT_POLICIES` in `src/paidPolicy.ts`; no live call
  needed or permitted).
- [ ] **C2 — Docs completeness.** The README quickstart, the "Connect a
  local stdio MCP client" section (Claude Desktop, Claude Code, generic
  stdio template, Inspector-as-diagnostic), the environment-variable table,
  and the Secret Safety rules are present and current at the release HEAD;
  the Phase 5E runbook and directory-metadata documents are merged; the
  Phase 5E signoff status (merged / pending) is recorded in the §3 decision
  record.
- [ ] **C3 — Secret-safety scan completed.** The Phase 5A §6 scan (terms
  including `STOCKTRENDS_API_KEY=`, `X-API-Key:`, `Authorization:`,
  `Bearer`, `private key`, `wallet`) plus the runbook S8 additions (`.env`,
  `<your-api-key>`) run over the release diff with **no findings** — every
  hit resolves to a variable name, documented placeholder, or term list,
  never a populated value.
- [ ] **C4 — Docs-only diff confirmed.** `src/`, `tests/`, `package.json`,
  and `package-lock.json` are unchanged for the release; `git status` is
  clean in the release checkout.
- [ ] **C5 — Build/test status recorded if run.** Docs-only prose changes may
  not require `npm run build` / `npm test` / `npm run typecheck`; whichever
  were run (for example as runbook S1), record the results in the §3 decision
  record.
- [ ] **C6 — Tag / release-notes decision recorded.** Whether this milestone
  is tagged now or deferred, per the Phase 5A §7 pattern (`CHANGELOG.md`
  adoption remains an open, separate decision; the `docs/` phase trail
  remains the record).
- [ ] **C7 — Directory/marketplace metadata readiness confirmed.** The
  [Phase 5E directory metadata readiness document](PHASE5E_DIRECTORY_METADATA_READINESS.md)
  is merged, and its counts and non-claims are re-checked against the README
  and source at the release HEAD. Any actual submission remains a separate
  reviewed step — not part of this release.
- [ ] **C8 — Codex review completed** on every Phase 5E PR merged to date
  (#55, #56, #57, #58, and any later Phase 5E PR included in the release).
- [ ] **C9 — Rollback and hygiene confirmed.** The C1 runbook execution
  included the S7 rollback (free surface restored: 1/10/0) and the S0
  parent-shell hygiene check (names-only, printed nothing at start and after
  rollback).
- [ ] **C10 — No live paid validation required or performed.** A docs-only
  release requires no live paid call, and none was performed for it. Paid
  execution remains eligibility-checklist-only (Phase 5A §4) — one-off,
  operator-authorized, operator-supervised, separately planned outside this
  checklist.
- [ ] **C11 — Supersession statement acknowledged.** This checklist
  supersedes the Phase 5A release checklist (§5) **for current release use**;
  the Phase 5A document is unedited, remains accurate Phase 4-era history,
  and its §3 troubleshooting table and §4 paid-execution eligibility
  checklist remain in force and referenced, not duplicated.
- [ ] **C12 — Non-approvals restated.** The release changes nothing about
  the §4 non-approved surfaces, and no tag, release note, or announcement
  wording claims otherwise.

## 3. Release decision record template

Record each release decision secret-free, in this shape:

```text
Phase 5E release decision record

Date/time (UTC):
Maintainer:
HEAD commit / branch:
Release scope (docs/readiness milestone description):

C1  Surface counts (1/10/10/0/9) verified via:   runbook execution <date> | PR #59 report
C2  Docs completeness:                            confirmed | gaps: <list>
C3  Secret-safety scan:                           no findings | findings + resolution: <secret-free note>
C4  Docs-only diff:                               confirmed
C5  Build/test status (if run):                   build: <result> | tests: <result> | typecheck: <result> | not run
C6  Tag / release-notes decision:                 tag now: <tag name> | deferred | notes location
C7  Directory metadata readiness:                 confirmed at HEAD | mismatches + disposition
C8  Codex review on all Phase 5E PRs:             confirmed (#55–#<n>)
C9  Rollback + S0 hygiene in C1 evidence:         confirmed
C10 No live paid validation performed:            confirmed
C11 Supersession statement:                       acknowledged
C12 Non-approvals restated in announcement text:  confirmed

Decision: RELEASE (tag/announce) | RELEASE (untagged) | DEFER
Deviations (secret-free):
```

## 4. Non-approvals

A release under this checklist changes **nothing** about the following, all
of which remain **not approved** (PR #54 §8; Phase 5E design memo §11), and
no release wording may claim otherwise:

- **No remote MCP and no hosted MCP** — no HTTP/SSE/Streamable HTTP
  transport, no public, multi-user, or third-party-hosted deployment.
- **No autonomous agent use** and **no unattended, scheduled, CI,
  background, or bulk/sweep use** of any paid or credential-bearing surface.
- **No x402, wallet, OAuth, `Authorization: Bearer`, or payment-header
  behavior** — `X-API-Key`-only remains the sole credential path, only where
  already promoted, only after every gate passes.
- **No deferred routes** — `/v1/market/regime/forecast`,
  `/v1/breadth/sector/history`, and `/v1/leadership/rotation/history` remain
  non-promoted and denied `endpoint_not_allowlisted`.
- **No decision/portfolio endpoints** and **no Intelligence Agent artifact
  endpoints.**
- **No investment advice** — no buy/sell/hold/allocation/risk/suitability
  output; context-not-advice framing stands in every released document.
- **No npm package or registry publication** — the supported install channel
  remains `git clone` + `npm install` + `npm run build`; packaging/publication
  is a separate, later, reviewed decision.
- **No directory/marketplace submission** — the metadata readiness document
  prepares reviewed content only; any actual submission is its own separately
  reviewed step.

## 5. Codex review checklist (for PR #58)

Codex review of PR #58 should verify:

1. **Docs-only diff:** exactly three new documents
   (`PHASE5E_OPERATOR_SMOKE_TEST_RUNBOOK.md`,
   `PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`,
   `PHASE5E_DIRECTORY_METADATA_READINESS.md`) plus exactly three README
   documentation-index links; no `src/`, `tests/`, `package.json`,
   `package-lock.json`, script, runtime-artifact, log, or output-file change,
   and no other README change.
2. **Runbook is no-spend by design:** placeholder key only; the execution
   flag never set (not even to `false`); caps/budgets never set; exactly one
   paid-boundary invocation (S6) expected to fail closed
   (`paid_execution_disabled`) before any request/auth/payment/cap/
   reconciliation; the only Stock Trends network activity is the S3
   credential-free reads; the S5 stop rule fires **before any invocation** if
   the banner reports execution ENABLED.
3. **Runbook counts and names:** 1/10/10/0/9, the ten tool names, and the ten
   resource URIs match the source at the PR's HEAD and the merged PR #54
   signoff §4 verbatim; the S0 step absorbs the PR #53 §11 / PR #54 §9
   parent-shell hygiene item with names-only checks and both shells' cleanup
   commands for all eight paid variables.
4. **Checklist supersession is correctly scoped:** C11 supersedes Phase 5A
   §5 for current release use only; Phase 5A §3 troubleshooting and §4
   eligibility are explicitly not superseded; no historical document is
   edited.
5. **Checklist requires no live call:** every C1–C12 item is satisfiable
   docs-only/no-spend; C10 states no live paid validation is required or
   performed; C6 records the tag decision per the Phase 5A §7 pattern.
6. **Metadata accuracy and non-claims:** the metadata document's counts match
   the source; it contains no hardcoded prices (catalog authoritative); the
   §9 forbidden-claims list is complete (no autonomous/set-and-forget,
   remote/hosted, x402/payment-rail, OAuth/Bearer, trading-signal,
   buy/sell/hold/allocation/risk/suitability, performance/returns,
   uptime/SLA, vendor-endorsement, nonexistent-surface, or publication
   claims); it performs no submission and creates no manifest or
   `package.json` change.
7. **Identity facts invent nothing:** server name, repository URL, and
   maintainer contact come only from what the repository already records;
   license status is not asserted.
8. **Secret safety:** no key-shaped string, no populated
   `X-API-Key:`/`Authorization:` header value, and no realistic-looking
   credential anywhere in the diff; `<your-api-key>` and `REDACTED`
   placeholders only; no payload dumps.
9. **No forbidden actions performed by the PR itself:** no live endpoint
   call (paid or credential-free), no API key
   used/requested/inspected/printed/logged/stored, no MCP Inspector session,
   no paid validation, no runbook execution — and each document states its
   facts come from merged documents and read-only source inspection.
10. **Non-approvals preserved verbatim:** §4 of this checklist and the
    metadata document's §9 restate the PR #54 §8 non-approvals with no
    weakening, and no document normalizes autonomous/unattended/remote/bulk
    usage or investment advice.

---

**Reminder:** This checklist is documentation/release-readiness only. It runs
no live paid execution, requires no API key, sets no caps, enables no
execution flag, runs no MCP Inspector session, approves no publication or
submission, and uses placeholder credentials only.
