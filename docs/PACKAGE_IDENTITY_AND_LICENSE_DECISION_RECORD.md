# Package Identity and License Decision Record

Date: 2026-07-16

**Decision classification:**

`OWNER DECISIONS RECORDED AND IMPLEMENTED — LOCAL VALIDATION ONLY; NO PUBLICATION AUTHORIZED`

This document is the authoritative record of the package identity and license
decisions for this repository. It implements **PR-1** of
[`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md)
§13, the sole PR permitted to record and implement the license decision (§5.4).

**This record is not legal advice.** It implements the owner's selected
repository and package license posture and records it so the decision is
auditable. It offers no legal opinion, and it does not compare, rank, or
evaluate alternative licenses — the owner selected MIT, and this document
records and implements that selection.

This PR performs **no** package build for distribution, `npm pack`, `npm
publish`, registry query, package install, temporary consumer, MCP Inspector
session, live Stock Trends API call, x402 canary, Git fetch, AWS/deployment
query, or external network request of any kind. It uses no API key, proof,
payment material, or spend.

---

## 1. Purpose and decision authority

**Purpose.** Close blocker **B-4** (license inconsistency, architecture memo §5,
§6) and settle owner decisions **D-1** (license), **D-2** (package name),
**D-3** (scope), and **D-4** (public/private intent, §17.1) — the decisions that
[gate](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md) PR-2 and
everything downstream of it (§13.2).

**Authority.** [owner decision] Every decision in §3–§10 is an explicit owner
decision supplied as direction to this PR. This document does not originate any
of them. The architecture memo deliberately declined to select a license,
name a copyright holder, or choose a publication-safety posture (§5.4, §17.1);
those choices were reserved to the owner and are now made.

**Boundary.** [implementation in this PR] This PR records the decisions and
implements exactly the subset that belongs to PR-1: the license declaration,
the license artifact, the author field, and the accidental-publication guard.
It implements no package artifact, file-selection mechanism, installation, or
publication. Per §13.2, PR-1 gates PR-2; the phase must not produce or validate
a distributable artifact while the license posture is unresolved. That posture
is now resolved.

---

## 2. Previous repository state

All of §2 is **[repository fact]**, read from the checkout at `8af9a71`
("Enforce runtime dependency declarations (#83)") before this PR's edits.

| Question | State before this PR | Evidence |
| --- | --- | --- |
| Declared license | `ISC` | `package.json:24` |
| Declared author | `""` (empty string) | `package.json:23` |
| Root license artifact | **None.** No `LICENSE`, `LICENSE.md`, `LICENCE`, `COPYING`, or `NOTICE` existed — tracked or untracked, at root or any subdirectory | `git ls-files` returned no license-like path; root disk listing returned none |
| Ever existed in history? | **No** | Repository history search for added license files returns nothing |
| Named copyright holder | **None** anywhere — no license text, no README copyright line, no SPDX header in `src/` | Repository-wide search |
| `private` field | Absent | `package.json` (35 lines, field not present) |
| `publishConfig` field | Absent | `package.json` |
| Package name | `stocktrends-mcp-server` | `package.json:2` |
| Package version | `1.0.0` | `package.json:3` |
| Lockfile root license | `ISC` | `package-lock.json:10` (`lockfileVersion` 3) |

**Provenance of the `ISC` value.** [repository fact] `ISC` and `author: ""` were
never decisions. `git show b07c0ec:package.json` — the "Initial MCP server
project scaffold" commit — shows `"license": "ISC"`, `"author": ""`, and
`"version": "1.0.0"` as unmodified `npm init -y` scaffold defaults. Before this
PR, `package.json` had been touched in exactly three commits in the entire
repository history: `b07c0ec` (scaffold), `6a907d3` (Phase 1, PR #3), and
`8af9a71` (runtime dependency declarations, PR #83). Neither the license nor
the author value was reviewed in any of them.

**The documentation set already disclaimed the value.** [repository fact]
[`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md)
§2 records the license as "**not asserted here**," notes that `package.json`
carries `"license": "ISC"` but "the repository contains no `LICENSE` file and no
reviewed license decision is recorded," and instructs that a future submission
"must resolve and record the license status in its own separately reviewed step
(§11) rather than reuse an unconfirmed field." The repository therefore
simultaneously **declared and disclaimed** the same value. This record is that
separately reviewed step.

**The exact inconsistencies this PR closes** (architecture memo §5.2):

1. A declared license value with no corresponding license text.
2. A declared license with no named copyright holder.
3. A manifest that contradicted the documentation set.
4. An unreviewed scaffold default standing in place of a decision.

---

## 3. Exact owner decisions

[owner decision] The complete set of decisions supplied to this PR:

| # | Decision | Value |
| --- | --- | --- |
| **D-1** | License | **MIT** |
| **D-1** | Copyright year | **2026** |
| **D-1** | Copyright holder | **Stocktrends Publications** |
| **D-1** | Which side changes to match | **Both** — the manifest changes to `MIT` *and* a canonical MIT `LICENSE` artifact is added at the root |
| **D-2** | Package name | **Retain `stocktrends-mcp-server`** |
| **D-3** | Package scope/namespace | **Retain unscoped identity.** No scope added or selected |
| **D-4** | Public vs private intent | **Long-term intent: potentially publicly installable, subject to later review.** Current state: local validation only. The publication-safety posture for this phase is `private: true` (§8) |
| — | Package version | **Unchanged at `1.0.0`** — not a PR-1 decision |
| — | Author metadata | **`Stocktrends Publications`** — no personal email or other contact in this PR |

---

## 4. Exact package identity

[owner decision] / [implementation in this PR]

| Field | Value | Status in this PR |
| --- | --- | --- |
| `name` | `stocktrends-mcp-server` | **Retained unchanged** |
| Scope | **none** (unscoped) | **Retained unchanged** — no scope added |
| `version` | `1.0.0` | **Retained unchanged** |

**Name retained.** [owner decision] The owner retains `stocktrends-mcp-server`
as the package identity for local validation.

**No registry availability check was performed, and none is authorized.**
[repository fact] Determining whether this name is available on any registry
requires a registry query (`npm view` / `npm search` / `npm info`), which is
prohibited in this phase (architecture memo §9.1, §18). The name-availability
question (**T-16**) remains **deferred to publication planning under separate
authorization** (§17.4 **D-10**) — deferred, not dismissed. Retaining the name
for local validation is not a claim that it is available, and not a claim on it.

---

## 5. MIT license decision

[owner decision] **The license is MIT.**

[implementation in this PR] The decision is implemented on **both** sides, which
is what closes B-4 — a declared license and a license text that agree:

1. `package.json` `license` changed from `ISC` to `MIT`.
2. A canonical MIT `LICENSE` artifact added at the repository root.
3. `package-lock.json`'s root entry `license` updated to `MIT` (§12).

**The license artifact.** [implementation in this PR] `LICENSE` at the
repository root contains the canonical MIT license text — the standard MIT
permission and warranty paragraphs, unmodified apart from the exact copyright
line. It is plain text, UTF-8, no BOM, with a final newline, and has LF line
endings as stored in Git; the Windows working tree may be CRLF under the
repository's core.autocrlf=true configuration. It
carries no Markdown formatting, no additional project terms, no additional
restrictions, and no explanatory preamble. Exactly one license artifact exists:
`LICENSE`. No `LICENSE.md` was created.

**No license comparison is offered.** This record does not rank MIT against any
alternative, does not evaluate its suitability, and expresses no legal opinion.
The owner selected MIT; this record implements and documents that selection.

---

## 6. Exact copyright holder and notice

[owner decision] The copyright holder, in this exact spelling, is:

```text
Stocktrends Publications
```

[implementation in this PR] The exact copyright notice, which appears **once**
in `LICENSE`:

```text
Copyright (c) 2026 Stocktrends Publications
```

**Spelling is load-bearing.** "Stocktrends" is **one word with a lowercase
`t`**. The holder is a corporate identity, not the owner's personal name. This
exact form is the only approved form; no variant spelling, spaced form, or
alternate capitalization is authorized, and none appears in the files this PR
adds or changes. [repository fact] Verified: `LICENSE` contains the exact line
above exactly once (§16).

**`LICENSE` begins exactly:**

```text
MIT License

Copyright (c) 2026 Stocktrends Publications

```

---

## 7. Package author metadata

[owner decision] / [implementation in this PR] The `author` field is set to
exactly:

```json
"author": "Stocktrends Publications"
```

This closes blocker **B-10** (empty `author`, architecture memo §6).

**No contact information is added in this PR.** [owner decision] No personal
email address, URL, or other contact detail is included. The author value is the
corporate identity only, matching the copyright holder in §6.

[repository fact] Note the deliberate distinction from
[`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md)
§2, which records a maintainer contact for **directory-submission readiness**.
That is maintainer/operator identity for a submission that has not occurred and
is not authorized; it is **not** the package's author or copyright metadata. The
two are intentionally not merged here.

---

## 8. Temporary `private: true` publication-safety posture

[owner decision] / [implementation in this PR] `package.json` now declares:

```json
"private": true
```

**This is the accidental-publication guard for the local package-validation
phase.** It is the owner's selection of the safety posture reserved to them by
architecture memo §17.1 **D-4**, mitigating threat **T-23** (accidental or
premature publication).

**Why the guard is warranted.** [repository fact] The architecture memo's T-23
analysis states the realistic trigger is "not malice but **muscle memory or an
errant flag**" — the phase ahead runs `npm pack` repeatedly, and `pack` and
`publish` are one word apart. The failure is irreversible or hard to reverse: an
unpublish window is narrow, mirrors and caches persist, and a name once taken is
taken. Worse, an unintended publish would distribute the artifact **before the
evidence for it exists** — before metadata is reviewed (B-6, B-7, B-9), before
the closed allowlist is verified, and before any readiness report.

**`private: true` is intentional and temporary for this phase.** [owner
decision] It is scoped to local package validation. It is not a statement about
the package's permanent disposition.

**No `publishConfig` in this PR.** [implementation in this PR] The owner
selected `private: true` as the guard. `publishConfig` is not added here.

**No publication lifecycle script exists, and none is added.** [repository fact]
The complete script key list remains exactly six — `build`, `dev`, `start`,
`test`, `typecheck`, `check:runtime-deps`. There is no `preinstall`, `install`,
`postinstall`, `prepare`, `prepublishOnly`, `prepack`, or `postpack`. This is a
positive safety property (T-23 layer 2) and this PR preserves it exactly: the
absence of `prepublishOnly`/`prepack`/`postpack` is also the absence of the most
likely way an unintended publish would fire without anyone typing it.

---

## 9. Why `private: true` does not authorize or imply permanent privacy

This section exists because the guard is easy to misread as a decision it is
not.

**What `private: true` means here.** [owner decision]

- It is a **temporary, phase-scoped accidental-publication guard**.
- It is **intentional** — a deliberate selection, not a default and not an
  oversight.
- It makes an unintended `npm publish` **fail closed** during a phase whose
  entire purpose is local validation.

**What `private: true` does *not* mean.** [owner decision]

- It does **not** mean the owner has decided the package must remain
  permanently private.
- It does **not** contradict the recorded long-term intent (§3 **D-4**):
  *potentially publicly installable, subject to later review*.
- It does **not** itself constitute a publication decision in either direction —
  it is a safety interlock, not a disposition.

**Removing it requires a later, separately reviewed publication decision.**
[deferred decision] `private: true` must not be removed, weakened, or worked
around by any PR in this phase. Its removal is authorized only by a separate
publication decision that is reviewed on its own terms — which does not exist
today (§14, §15).

**This PR does not authorize or perform publication.** [implementation in this
PR] Recording the long-term intent in §3 is not authorization. Naming a possible
future is not approving it.

---

## 10. Package-content owner decisions for PR-2

[owner decision] The owner has settled the package-content decisions reserved by
architecture memo §17.1 **D-5..D-8**. **They are recorded here and deliberately
not implemented in this PR.**

| Architecture ID | Category | Owner decision |
| --- | --- | --- |
| **I-1** | Compiled runtime JavaScript | **Include** |
| **I-5** / **D-6** | Type declarations | **Include** |
| **X-4** / **D-5** | Source maps | **Exclude** |
| **X-5** / **D-7** | TypeScript source | **Exclude** |
| **I-3** / **D-8** | Consumer-facing `README.md` | **Include** |
| **I-4** | Root MIT `LICENSE` | **Include** |
| **X-7** / **D-8** | Internal architecture and phase memos | **Exclude** |
| **X-6**, **X-8**..**X-13** | Tests, fixtures, development configuration, worktrees, local files, generated artifacts | **Exclude** |

**Coherence note.** [repository fact] Including type declarations is the
coherent option given that `package.json:7` `types` points at
`dist/server.d.ts`; the architecture memo (§7.3, D-6) identifies excluding them
while retaining `types` as the one incoherent combination. The owner's decision
avoids it.

**Not implemented here.** [deferred decision] The **closed artifact allowlist**
and the **package file-selection mechanism** that enforce these decisions are
**PR-2 work**. This PR adds no `files` field, no `.npmignore`, and no other
file-selection metadata. Recording a content decision is not implementing it,
and the decisions above become real only when PR-2 enforces them and PR-3
verifies the artifact's actual contents against the closed allowlist
(fail-closed, §7.4).

---

## 11. Decisions intentionally deferred

[deferred decision] Not decided, not implemented, and not implied by this PR:

| Deferred | Where it belongs |
| --- | --- |
| Registry availability / package-name availability (**T-16**) | Publication planning under separate authorization (§17.4 **D-10**) — requires a prohibited registry query |
| Final publication target (registry, scope, access) | **D-10** |
| npm scope ownership | **D-10** |
| External package publication | Separate publication decision (§20) — not authorized |
| Directory or marketplace submission | §17.4 **D-12** — explicitly out of scope |
| Removal of `private: true` | A later, separately reviewed publication decision (§9) |
| All-platform package evidence | **D-11**, required before PR-4 (§17.2) |
| Installed-bin correction (**B-5**) | PR-0 Leg B — conditional on PR-4 evidence establishing necessity |
| Package `files` allowlist / file-selection mechanism | **PR-2** (§10) |
| Build or lifecycle hooks (incl. any build-only `prepare` for **B-3**) | **PR-2** |
| `repository` / `homepage` / `bugs` metadata (**B-7**) | **PR-2** |
| Node `engines` range (**B-6**) | **PR-2** (**V-7**) |
| Package `description` refresh (**B-9**) | **PR-2** |
| Versioning automation / `SERVER_VERSION` drift (**B-8**, **D-9**) | **D-9**, recommended not selected |

---

## 12. Files changed

[implementation in this PR] Exactly five files, and no others:

| File | Change |
| --- | --- |
| `LICENSE` | **Added.** Canonical MIT text; exact copyright line; plain text, UTF-8, no BOM, final newline; LF in the Git-normalized committed blob; working-tree CRLF is expected under core.autocrlf=true |
| `package.json` | **Modified — three lines.** `author` `""` → `Stocktrends Publications`; `license` `ISC` → `MIT`; `private: true` added |
| `package-lock.json` | **Modified — one line.** Root entry `license` `ISC` → `MIT` |
| `docs/PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md` | **Added.** This record |
| `README.md` | **Modified — one line.** Exactly one documentation-index link to this record |

**Lockfile update posture.** [implementation in this PR] `package-lock.json` was
regenerated with exactly:

```text
npm install --package-lock-only --offline --ignore-scripts
```

No registry request, no package download, no lifecycle script, no dependency
graph change, no version change, no unrelated churn. The resulting diff is a
single line.

**`private` and `author` are absent from the lockfile by npm's own design, not
by omission.** [repository fact] npm records `license` in the lockfile root
entry but does not record `private` or `author` there. This was verified
empirically against the installed npm (10.9.8) with an isolated, dependency-free
local fixture that declared all three fields: the resulting root entry contained
exactly `name`, `version`, and `license`. Neither field was forced into the
lockfile, in line with the instruction not to record what npm does not normally
record. The fixture referenced no package from this repository, installed
nothing, produced no artifact, and reached no network; it was removed after the
check.

**Retained unchanged in `package.json`:** `name`, `version`, `description`,
`type`, `main`, `types`, `bin`, all six scripts, `keywords`, all dependencies,
and all devDependencies. No dependency was reordered or re-ranged.

**Not added** (each belongs to PR-2 or a later decision): `repository`,
`homepage`, `bugs`, `engines`, `files`, `exports`, `publishConfig`, package
scope, and any lifecycle script.

---

## 13. No runtime-capability change

[implementation in this PR] **This PR changes no runtime capability.** No file
under `src/` was modified — the change surface (§12) contains no source file.

Unchanged: every MCP tool, resource, and prompt; every route; API requests;
API-key behavior; x402 behavior; payments; transport; direct execution;
configuration; feature flags; logging; and the Stock Trends API's standing as
the data and analytical authority.

**The Phase 5F runtime remains untouched**, consistent with
[`PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md`](PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md)
§13. The default/free surface remains exactly one tool, ten credential-free
resources, and zero prompts; x402 remains challenge-validation-only and
default-off.

**PR #83's runtime dependency declarations are preserved exactly.**
[repository fact] `dependencies` remains `@modelcontextprotocol/sdk` `^1.29.0`
and `zod` `^4.4.3`, unchanged in name, range, and count. The
`check:runtime-deps` script and its enforcement are untouched. This PR edits
only the `author`, `license`, and `private` fields; it neither relaxes nor
re-derives the dependency contract established by
[`PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md`](PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md).

Metadata is not capability: declaring a license, an author, and a publication
guard changes what the repository *says about itself*, not what the server
*does*.

---

## 14. No package artifact, install, registry query, or publication

[implementation in this PR] None of the following occurred:

- **No package artifact.** No `npm pack`, no `npm pack --dry-run`, no `*.tgz`,
  no unpacked artifact directory.
- **No installation.** No install of this package into any consumer; no
  temporary package consumer created.
- **No registry query.** No `npm view`, `npm search`, or `npm info`. No
  package-name availability check. The only npm invocation was the
  `--offline --package-lock-only --ignore-scripts` lockfile update (§12), which
  made no registry request.
- **No `--prefer-offline`.** The lockfile update used strict `--offline` and
  completed locally; no fallback to a fetch occurred or was attempted.
- **No publication.** No `npm publish` in any form — no flag, no dry run, no
  exception. No registry submission. No marketplace or directory submission.
- **No generated package manifest** was produced or committed.

**No publication authority exists.** [deferred decision] This phase is local
validation only. Completion of this PR grants no publication authority, no
marketplace authority, and no remote-MCP authority.

---

## 15. No live API, x402, API-key, proof, payment, spend, or external activity

[implementation in this PR] None of the following occurred:

- no live Stock Trends API call;
- no x402 canary, challenge, or relay execution;
- no API key read, supplied, or used;
- no proof or payment material sent;
- no payment, settlement, or spend;
- no MCP Inspector session;
- no remote or hosted MCP access;
- no Git fetch or other remote Git query;
- no AWS or deployment-infrastructure query;
- no external network request of any kind.

[repository fact] The Phase 5F live authorization is `CONSUMED`
([`PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md`](PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md)).
**No live or external authorization exists or was requested**, and none is
created by this PR. No reusable live authorization is established. This PR was
completed entirely offline.

---

## 16. Validation results

[repository fact] All checks run offline on the normal attached checkout of
branch `chore/package-identity-license-decision`, from a clean tree at base
commit `0788068` ("Fix runtime dependency validator test import (#84)"), with
PR-1's change surface (§12) applied as working-tree modifications on top.

### 16.1 Suites and build

| Check | Command | Result | Matches expected baseline? |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | **PASS** | Yes |
| Build | `npm run build` | **PASS** | Yes |
| Runtime dependency check | `npm run check:runtime-deps` | **PASS** — 17 compiled files scanned; discovered `@modelcontextprotocol/sdk`, `zod`; every directly imported external package declared | Yes |
| Relay suite | `npm test -- tests/x402Relay.test.ts` | **PASS — 474/474** | Yes |
| Full suite | `npm test` | **PASS — 960/960 across 17 test files** | Yes |
| Dependency-contract focused suite | `npm test -- tests/runtimeDependencyContract.test.ts` | **PASS — 15/15** | Yes |

**All six checks match the expected post-PR-#83/#84 baseline.** There is no
open discrepancy to explain in this validation pass.

### 16.2 Historical note: a pre-existing test-import defect, corrected in PR #84

[repository fact] An earlier validation pass on this branch — before PR #84 was
merged — found that `tests/runtimeDependencyContract.test.ts` failed to import
under vitest (0/15 executed), because `scripts/check-runtime-dependency-contract.mjs:1`
carried a `#!/usr/bin/env node` shebang that vitest inlined rather than
stripped, producing `SyntaxError: Invalid or unexpected token`. That defect
reproduced at the pristine pre-PR-1 base commit `8af9a71` and was pre-existing,
not caused by this PR. It was not a dependency-contract failure: the contract
itself was verified green throughout by `npm run check:runtime-deps`, which runs
the same module under Node directly (where the shebang is stripped correctly).
The broken thing was the test harness's ability to import the checker, not the
checker or the contract.

[repository fact] The shebang was removed separately in **"Fix runtime
dependency validator test import (#84)"**, merged to `main` ahead of this PR-1
finalization. PR-1 was then rebased/fast-forwarded onto that correction and
revalidated (§16.1): the focused dependency-contract suite now passes **15/15**,
and the full suite passes **960/960** across all **17** test files. No further
remedy is required from PR-1, and no test-harness import blocker remains to
carry forward.

### 16.3 Metadata and identity

| Check | Result |
| --- | --- |
| `package.json` parses | **PASS** |
| Package name unchanged (`stocktrends-mcp-server`) | **PASS** |
| Version unchanged (`1.0.0`) | **PASS** |
| `author` exactly `Stocktrends Publications` | **PASS** |
| `license` exactly `MIT` | **PASS** |
| `private` exactly boolean `true` (not the string `"true"`) | **PASS** |
| `dependencies` unchanged | **PASS** — `@modelcontextprotocol/sdk` `^1.29.0`, `zod` `^4.4.3` |
| `devDependencies` unchanged | **PASS** — four, unchanged |
| No lifecycle script added | **PASS** — six scripts, none of them a lifecycle hook |
| No `publishConfig` / `repository` / `homepage` / `bugs` / `engines` / `files` / `exports` added | **PASS** |

### 16.4 License content

| Check | Result |
| --- | --- |
| `LICENSE` is canonical MIT text | **PASS** — standard permission and warranty paragraphs, unmodified apart from the copyright line |
| Exact copyright line appears exactly once | **PASS** |
| Plain text, no Markdown | **PASS** |
| UTF-8, no BOM | **PASS** — pure ASCII; first bytes `4d 49 54` (`MIT`) |
| Line endings | **PASS** — LF in the Git-normalized committed blob; working-tree CRLF is consistent with repository-wide core.autocrlf=true |
| Final newline present | **PASS** |
| No additional terms, restrictions, or preamble | **PASS** |
| Exactly one license artifact (`LICENSE`; no `LICENSE.md`) | **PASS** |
| Rejected alternate holder spellings absent from new/changed files | **PASS** |

### 16.5 Change surface and safety

| Check | Result |
| --- | --- |
| Change surface is exactly the five files in §12 | **PASS** |
| No source file (`src/**`) changed | **PASS** |
| Lockfile change minimal (one line) | **PASS** |
| README adds exactly one link | **PASS** |
| README link target exists | **PASS** |
| `git diff --check` (whitespace/conflict) | **PASS** — clean |
| No conflict marker | **PASS** |
| No secret or credential introduced | **PASS** |
| No package tarball, unpacked package, or temporary consumer | **PASS** — none exists |
| No generated package manifest | **PASS** |
| No reusable live authorization | **PASS** — none created |

---

## 17. Next gate: PR-2 — package metadata and closed artifact allowlist

[deferred decision] **PR-1 is complete; the license gate is closed.** The
architecture memo's §13.2 sequencing (PR-0 Leg A → **PR-1** → PR-2 → PR-3 → PR-4
→ PR-5 → PR-6) now permits PR-2 to proceed: the controlling rule — *the phase
must not produce or validate a distributable artifact while the license posture
remains unresolved* — is satisfied. Entry-gate item 6 (§16.1) is met: **B-4 is
closed**, and the owner decisions D-1..D-8 that PR-2 depends on are recorded
(§3, §10). **V-26** (static dependency-contract completeness, architecture memo
§7.7) is **green** for this PR-1 baseline: the focused suite passes 15/15, the
full suite passes 960/960 across 17 files, and `check:runtime-deps` passes
(§16.1).

**No test-harness blocker is carried into PR-2.** [repository fact] The
dependency-contract focused suite's earlier import failure (§16.2) was corrected
in PR #84 before this finalization; PR-1's revalidation confirms the suite now
executes and passes cleanly. PR-2 inherits a clean, green baseline and does not
need to resolve or accept any validator-import defect.

**PR-2 is authorized only for package metadata and the closed artifact
allowlist** (below). Publication, artifact creation, installation, and registry
activity remain unauthorized and are not granted by this record (§14, §15).

**PR-2 must:**

- implement the **closed artifact allowlist** and the **package file-selection
  mechanism** enforcing the §10 content decisions;
- add the remaining metadata fields — `repository`, `homepage`, `bugs` (**B-7**),
  a **reviewed** Node `engines` range consistent with the SDK's `>=18` (**B-6**,
  **V-7**), and a refreshed `description` (**B-9**);
- **review, not re-decide**, the owner's `private: true` publication-safety
  posture (**V-27**) — it must remain in place;
- verify the checkout-path regression explicitly if any build-only `prepare` is
  introduced for **B-3** (§11, **T-10**);
- keep **V-26** (static dependency-contract completeness) green.

**PR-2 must not:** publish; produce an artifact; install; query a registry;
remove or weaken `private: true`; or re-open any decision settled in this record.

**What this record does not grant.** Closing the license gate authorizes PR-2
only. It does not authorize publication, registry submission, marketplace or
directory submission, a live API call, or any spend. Those remain deferred to
separate decisions that do not exist today.
