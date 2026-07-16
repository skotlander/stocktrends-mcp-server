# Package Metadata and Closed Artifact Allowlist — Implementation Record

Date: 2026-07-16

**Decision classification:**

`MANIFEST CONTRACT IMPLEMENTED — NO ARTIFACT MEASURED; NO PUBLICATION AUTHORIZED`

This document records **PR-2** of
[`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md)
§13: package metadata and the closed artifact allowlist.

**This PR implements the manifest-level allowlist only.** It declares what the
package contract *says*. It does **not** prove what npm would place in a
tarball — no artifact was created, and none could be, because this PR runs no
package command. That evidence is PR-3 work under separate authorization (§23).

This PR performs **no** package build for distribution, `npm pack`, `npm pack
--dry-run`, `npm publish`, registry query, package install, temporary consumer,
MCP Inspector session, live Stock Trends API call, x402 canary, Git fetch,
AWS/deployment query, or external network request of any kind. It uses no API
key, proof, payment material, or spend.

---

## 1. Purpose and governing authority

**Purpose.** Implement the reviewed package metadata and the owner-approved
closed package file-selection contract, and add deterministic static validation
of both. This closes the manifest-level portion of blockers **B-6** (no
`engines`), **B-7** (missing `repository`/`homepage`/`bugs`), and **B-9** (stale
`description`), and implements — but does **not** empirically settle — the
metadata half of **B-2** (entry points may not ship).

**Authority.** This PR implements decisions already recorded elsewhere; it
originates none of them:

| Input | Source |
| --- | --- |
| Closed inclusion allowlist and exclusion categories | [`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md) §7.1, §7.2 |
| Package-content owner decisions (**D-5**..**D-8**) | [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md) §10 |
| `private: true` publication-safety posture (**D-4**) | [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md) §8 — **reviewed here, not re-decided** |
| Node-range evidence scope | Architecture memo §7.5 |
| Runtime dependency contract | [`PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md`](PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md) — **preserved, not re-derived** |

**Boundary.** PR-2 is authorized for package metadata and the closed artifact
allowlist only. Publication, artifact creation, installation, and registry
activity remain unauthorized and are not granted by this record.

---

## 2. Previous manifest state

[repository fact] Read from the checkout at `55733ea` ("Record package identity
and MIT license (#85)") before this PR's edits. `package.json` was 36 lines.

| Field | State before this PR |
| --- | --- |
| `name` | `stocktrends-mcp-server` |
| `version` | `1.0.0` |
| `description` | `Local stdio MCP adapter for public Stock Trends API resources.` — stale (**B-9**) |
| `type` | `module` |
| `main` | `dist/server.js` |
| `types` | `dist/server.d.ts` |
| `bin` | `{ "stocktrends-mcp-server": "dist/server.js" }` |
| `scripts` | exactly six: `build`, `dev`, `start`, `test`, `typecheck`, `check:runtime-deps` |
| `keywords` | `["mcp", "stocktrends"]` |
| `author` | `Stocktrends Publications` |
| `license` | `MIT` |
| `private` | boolean `true` |
| `dependencies` | `@modelcontextprotocol/sdk` `^1.29.0`, `zod` `^4.4.3` |
| `devDependencies` | four, unchanged |

**Absent before this PR** (each verified across the full file): `files`,
`repository`, `homepage`, `bugs`, `engines`, `publishConfig`, `exports`,
`module`. **No `.npmignore` existed** anywhere in the repository, and no
`.npmrc`. **No npm lifecycle script of any kind existed.** `dist/` was
gitignored (`.gitignore:2`) and untracked (`git ls-files dist` returned zero
entries).

---

## 3. Exact metadata added

[implementation in this PR] Five fields added; one replaced. Every pre-existing
field kept its value **and its position** — no field was reordered.

| Field | Change |
| --- | --- |
| `description` | **Replaced** (§4) |
| `files` | **Added** — the closed allowlist (§7) |
| `engines` | **Added** — `{ "node": ">=18" }` (§6) |
| `repository` | **Added** (§5) |
| `homepage` | **Added** (§5) |
| `bugs` | **Added** (§5) |
| `scripts["check:package-metadata"]` | **Added** — the static validator (§15) |

---

## 4. Exact description

[implementation in this PR] `description` is now exactly:

```text
Local stdio MCP adapter for Stock Trends public resources, workflow planning, and separately gated paid API tools.
```

This closes **B-9**. The previous value described only "public Stock Trends API
resources" — accurate at Phase 1, silent on the paid ST-IM/indicators/
selections/market-context tools and on x402 since.

**What the wording deliberately does not imply.** The phrasing was chosen
against the architecture memo's §12.1 distinctions, which must never be
collapsed:

- **"Local stdio"** — not remote MCP, not hosted MCP.
- **"separately gated paid API tools"** — the paid surface exists and is gated;
  it is not part of the default/free surface, and naming it is not a claim that
  it is enabled.
- **No x402 claim at all.** Post-Phase-5F the honest statement is neither "no
  payment rails" nor "x402 supported" but *challenge-validation-only,
  default-off, no proof, payment, or spend* — a nuance a `description` cannot
  carry, so it makes no x402 claim rather than a wrong one.
- **No publication claim.** Nothing in the wording implies the package is
  published, packaged, or installable from a registry.
- **No autonomous payment and no investment advice.**

---

## 5. Repository, homepage, and bugs

[implementation in this PR] Closing **B-7**:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/skotlander/stocktrends-mcp-server.git"
},
"homepage": "https://github.com/skotlander/stocktrends-mcp-server#readme",
"bugs": {
  "url": "https://github.com/skotlander/stocktrends-mcp-server/issues"
}
```

[repository fact] The repository URL is the one already recorded in
[`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md)
§2 as the checkout's `origin`. It was **not** obtained by a Git fetch or any
remote query — none occurred (§20).

**These fields identify repository documentation and issue tracking. They do
not authorize publication and do not claim registry availability.** A
`homepage` is where the documentation lives, not evidence that anything is
installable.

---

## 6. Node engine decision and evidence scope

[implementation in this PR]

```json
"engines": {
  "node": ">=18"
}
```

This closes **B-6** at the declaration level and satisfies **V-7**.

**Why `>=18`.** [repository fact] The SDK declares `"engines": { "node":
">=18" }` (`node_modules/@modelcontextprotocol/sdk/package.json:14-16`). The
reviewed source establishes no known requirement above that floor. The declared
range is therefore consistent with what the runtime dependencies require.

**Evidence boundary — declaring a range is not evidence for it.** Architecture
memo §7.5 is explicit, and this record honors it exactly:

- The SDK declares Node `>=18`.
- The reviewed source does not establish a known requirement above that floor.
- **The current validation host proves only its actual installed Node version.**
  [repository fact] The checks in §21 ran on **Node v22.23.1** on Windows 11.
  That is evidence about that build, on that platform, and nothing else.
- **This PR does not claim that every Node 18-to-current platform combination
  has been tested.** None has been. No Node-version matrix exists, and this PR
  does not invent one.
- **Later artifact evidence must scope its compatibility claim honestly.** PR-4
  records the exact host Node version used and may not claim the declared range
  is validated; PR-5/PR-6 must not widen the claim beyond that record.

The honest statement available today is: *declared `>=18` per dependency
requirements; no artifact has been validated on any Node version.*

---

## 7. Exact files allowlist

[implementation in this PR] The owner-approved closed manifest contract:

```json
"files": [
  "dist/**/*.js",
  "dist/**/*.d.ts",
  "README.md",
  "LICENSE"
]
```

Exactly four entries, each unique. **The `files` field is the single package
file-selection mechanism for this PR.**

**Deliberately narrow.** No broad entry (`dist`, `dist/**`, `docs`, `.`, `*`)
was used, and `dist/**/*.js.map` is not present. The narrowing is the point: a
bare `dist` or `dist/**` would sweep in the 17 `.js.map` files the build emits
alongside the 17 `.js` and 17 `.d.ts` files, silently defeating the owner's
source-map exclusion (**X-4** / **D-5**). The two `dist/**/*` globs are narrowed
by extension for exactly that reason.

---

## 8. The conceptually always-included `package.json`

[repository fact] `package.json` is npm-mandatory package metadata. It is
understood as part of the conceptual artifact contract (architecture memo §7.1
**I-2**) even though it need not be listed in the `files` array — npm does not
require a package to list its own manifest, and listing it would not make its
inclusion more certain.

**This is a manifest-contract statement, not a measurement.** [deferred
decision] Architecture memo §7.1 **I-2** requires the manifest's **presence in
the artifact** to be *verified* (**V-3**), not assumed. That verification is
PR-3 work. This PR asserts only that `package.json` belongs to the contract; it
does not assert what any tarball contains.

---

## 9. Included categories

[owner decision, recorded in the decision record §10] The allowlist includes
exactly:

| # | Category | Allowlist entry | Architecture ID |
| --- | --- | --- | --- |
| 1 | Compiled runtime JavaScript, preserving the `resources/` and `tools/` subtrees | `dist/**/*.js` | **I-1** |
| 2 | Type declarations | `dist/**/*.d.ts` | **I-5** / **D-6** |
| 3 | Consumer-facing README | `README.md` | **I-3** / **D-8** |
| 4 | Root MIT license artifact | `LICENSE` | **I-4** |
| — | Package manifest (npm-mandatory; not listed) | *(conceptual — §8)* | **I-2** |

**Coherence.** [repository fact] Including `dist/**/*.d.ts` is the coherent
choice given that `types` points at `dist/server.d.ts`; the architecture memo
(§7.3, **D-6**) identifies excluding the declarations while retaining `types` as
the one incoherent combination. The static validator enforces the general form
of this rule — `main`, `types`, and every `bin` target must be covered by the
declared files contract (§15).

---

## 10. Excluded categories

[owner decision / implementation in this PR] Everything not listed in §9 is
excluded by default — the contract is **closed**, not a denylist. The
categories the exclusion is specifically understood to cover:

| Excluded | Architecture ID |
| --- | --- |
| JavaScript source maps (`dist/**/*.js.map`) | **X-4** / **D-5** |
| TypeScript source (`src/**`) | **X-5** / **D-7** |
| Internal `docs/**` architecture and phase memos | **X-7** / **D-8** |
| Tests and fixtures (`tests/**`) | **X-6** |
| Scripts and validator tooling (`scripts/**`) | **X-6**, **X-8** |
| TypeScript/Vitest/build configuration (`tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `.gitignore`) | **X-8** |
| `.env.example` and local configuration | **X-1**, **X-2** |
| Agent/tooling directories (`.claude/`, `.agents/`, `.codex/`) | **X-9** |
| Worktree content | **X-10** |
| Temporary files and logs | **X-11** |
| Generated tarballs and unpacked packages | **X-12** |
| VCS internals (`.git/**`, `node_modules/**`) | **X-13** |
| Dependency lockfile (`package-lock.json`) | **X-14** |

**Exclusion here means "not on the allowlist."** [deferred decision] It does
**not** mean any of these categories has been observed absent from an artifact.
Nothing has been packed. §22 states the boundary in full.

---

## 11. Why no `.npmignore` was added

[implementation in this PR] **No `.npmignore` exists, and none was added.**

1. **A single mechanism is auditable; two are not.** `files` is an allowlist —
   everything not named is out. `.npmignore` is a denylist — everything not
   named is in. Adding both would mean the artifact's contents are the product
   of two mechanisms whose interaction a reviewer must reason about, when one
   mechanism states the contract directly.
2. **A closed contract calls for an allowlist.** Architecture memo §7.4 requires
   failing closed on any path nobody anticipated. **A denylist structurally
   cannot do that** — it can only exclude what was foreseen. `files` can.
3. **npm's precedence would make the `.npmignore` inert anyway.** [inference]
   Where `files` is present it is the authority; a `.npmignore` would be dead
   metadata that reads as if it were load-bearing — worse than absent.

[repository fact] Verified: no `.npmignore` exists anywhere in the repository
tree, and none is tracked.

---

## 12. Why no lifecycle hook was added

[implementation in this PR] **No lifecycle script was added.** The complete
script key list remains free of `preinstall`, `install`, `postinstall`,
`prepare`, `prepack`, `postpack`, `prepublish`, `prepublishOnly`, `publish`, and
`postpublish`. No `publishConfig` was added.

**The absence is intentional and is a safety property**, not an oversight
(architecture memo §14 **T-23**, decision record §8):

- The absence of `prepublishOnly`/`prepack`/`postpack` is **the absence of the
  most likely way an unintended publish fires without anyone typing it.** The
  phase ahead runs `npm pack` repeatedly, and `pack` and `publish` are one word
  apart.
- A `prepare` script would run on `npm install` **in a checkout**, changing the
  documented checkout developer experience (architecture memo §11) — a live
  regression risk, not a theoretical one. This PR declines to introduce it.

The static validator enforces this absence going forward (§15), so a hook cannot
be added later without failing the check.

---

## 13. Explicit ordered-build treatment of B-3

[implementation in this PR] **B-3** ("no build hook": `dist/` is untracked, so a
fresh clone has no compiled output and a pack from a clean checkout would carry
zero runtime code unless a build runs first) is **not** addressed with an
implicit lifecycle hook. It is handled by an **explicit ordered build
requirement in PR-3**:

1. clean checkout;
2. tests and typecheck;
3. explicit `npm run build`;
4. **only then** local package inspection.

**Why ordering rather than a hook.** Package creation must not depend on an
implicit install or publish lifecycle hook. An automatic `prepare` would make
the artifact's completeness a side effect of whichever command someone happened
to run — and would couple the checkout path's `npm install` to packaging
concerns (§12). An explicit ordered step makes the build a reviewable
precondition that either visibly ran or visibly did not.

**B-3 is therefore open at the manifest level by design, and PR-3 closes it
procedurally.** This PR does not claim B-3 is resolved.

---

## 14. Preservation of `private: true`

[implementation in this PR] `package.json` still declares exactly:

```json
"private": true
```

**Reviewed, not re-decided.** Per architecture memo §13 PR-2 non-goals,
selecting the publication-safety posture is the owner's (**D-4**); PR-2
implements and reviews the selection. **V-27** is satisfied: the guard is
present, is the boolean `true` (not the string `"true"`), and is unchanged.

**Review finding:** the guard remains warranted and is strengthened by this PR's
change surface. This PR adds the metadata that makes the package *look*
publishable — `repository`, `homepage`, `bugs`, `engines`, a refreshed
`description`, and a `files` allowlist. That is precisely the state in which an
errant `npm publish` would produce a plausible-looking, unauthorized release.
`private: true` is what makes that fail closed.

The static validator now enforces the guard mechanically (§15): `private` absent,
`false`, or the string `"true"` each fail the check. Its removal remains
authorized only by a later, separately reviewed publication decision, which does
not exist today.

---

## 15. Static validator design

[implementation in this PR] Added `scripts/check-package-metadata.mjs`, its
strict TypeScript declaration companion `scripts/check-package-metadata.d.mts`,
and one package script:

```json
"check:package-metadata": "node scripts/check-package-metadata.mjs"
```

**No shebang.** [repository fact] Deliberate, and the reason is recorded: a
`#!/usr/bin/env node` shebang on `scripts/check-runtime-dependency-contract.mjs`
made that module fail to import under vitest and was removed in PR #84
(decision record §16.2). This validator is written without one so its focused
suite can import it directly.

**Structure.** The module mirrors the runtime dependency checker's proven shape:
pure exported helpers plus an `analyzePackageMetadata({ packageJsonPath })`
entry point, with the CLI reporting wrapped in a direct-execution guard. Tests
import the analysis function and assert on returned violations rather than
shelling out.

**Three distinct outcomes**, never conflated:

| Outcome | Signal |
| --- | --- |
| **Manifest contract PASS** | exit 0; explicit scope line stating no artifact contents were measured |
| **Manifest contract violation** | exit 1; `FAIL - N manifest contract violation(s)` with one bounded line each |
| **Malformed manifest** | exit 1; `MALFORMED MANIFEST`, raised as a distinct `MalformedManifestError` so "unreadable" can never be mistaken for "reviewed and clean" |

**What it verifies.** Exactly the reviewed contract:

1. `name` is exactly `stocktrends-mcp-server`;
2. `version` is exactly `1.0.0`;
3. `description` is exactly the reviewed description;
4. `author` is exactly `Stocktrends Publications`;
5. `license` is exactly `MIT`;
6. `private` is boolean `true`;
7. `repository` is exact — extra keys are a mismatch;
8. `homepage` is exact;
9. `bugs` is exact;
10. `engines` is exact;
11. `files` contains exactly the four reviewed entries;
12. no duplicate `files` entry;
13. no extra, broad, absolute, parent-relative, URL, negated, whitespace-padded,
    or otherwise unsafe entry;
14. no source-map pattern;
15. `main`, `types`, and every `bin` target are covered by the declared files
    contract;
16. no `publishConfig`;
17. no npm install, package, or publication lifecycle script;
18. the runtime dependency contract remains exactly `@modelcontextprotocol/sdk`
    `^1.29.0` and `zod` `^4.4.3`;
19. no package scope or identity drift;
20. output is deterministic, bounded, and secret-free.

**General helpers, not ad hoc checks.** The rules are expressed generally so
they hold for entries nobody has written yet:

- `globToRegExp` / `entryMatchesPath` / `isCoveredByFiles` — model npm's two
  selection shapes (a glob match; a directory entry shipping its contents), so
  entry-point coverage is computed rather than assumed.
- `isSourceMapEntry` — **behavioral, not spelling-based**: an entry fails if it
  is spelled as a source-map pattern *or* if it would match a representative
  compiled `.js.map` path. This catches `dist/**` and `dist/**/*.js*`, which a
  `.map`-suffix test would wave through.
- `isUnnarrowedGlobEntry` — a final segment of only glob stars selects every
  file under a directory regardless of type.
- `isDirectoryWholesaleEntry` — **manifest-derived**: a glob-free entry that is
  a parent directory of a declared entry point names a directory, so `dist`
  fails while `LICENSE` does not. The rule is inferred from the manifest's own
  `main`/`types`/`bin`, not from a hard-coded directory list.
- `deepEqual` — exact structural comparison; extra keys are a mismatch.

**Bounded, deterministic, secret-free output.** Violations are produced in fixed
iteration order; rendered values are truncated (`summarizeValue`, 120 chars) so
an oversized field cannot flood output; the report is capped at 50 violations
with a stated remainder. The validator reads `package.json` and nothing else —
no environment variables, no credentials, no network state.

**What it must not do, and does not.** It runs no npm command; builds nothing;
packs nothing; installs nothing; queries no registry; inspects no network state;
**claims nothing about actual tarball contents**; and never silently repairs
metadata — it reports and exits nonzero.

---

## 16. Focused tests

[implementation in this PR] Added `tests/packageMetadata.test.ts` — **67 tests**,
all passing.

**The reviewed manifest is spelled out literally in the test**, not imported
from the validator's exported constants. This is deliberate: a test built from
the same constants it validates would be tautological. As written, the test
independently pins the contract, so drift in *either* the manifest or the
checker's constants fails.

**Fixtures are temporary and outside the tracked repository.** Each fixture is
an `mkdtempSync` directory under the OS temp directory, removed in an `afterEach`
hook. [repository fact] No fixture remains after the run (§21).

**The tests validate general checker behavior**, not a single execution against
the current manifest. Coverage:

| Area | Cases |
| --- | --- |
| Passing baselines | reviewed manifest passes; **this repository's actual manifest passes** |
| Publication safety | `private` missing, `false`, and the string `"true"`; `publishConfig` present; **each of the ten forbidden lifecycle hooks**, parameterized |
| Identity | name drift; **scope drift**; version drift |
| Metadata | description, author, license, repository (incl. an extra key), homepage, bugs, engines mismatch; engines absent |
| Closed allowlist | missing entry; `files` absent; extra entry; duplicate entry; broad `dist/**`; bare `dist`; whole-package `*`; source-map pattern; `src/**/*.ts`; `docs/**/*.md` |
| Unsafe entries | absolute POSIX, absolute Windows, parent-relative, URL, negated, directory, whitespace-padded, empty, non-string — parameterized at both the classifier and manifest level |
| Entry-point coverage | `main`, `types`, a `bin` target, one of several `bin` targets, `main` removed; positive/negative glob resolution |
| Dependency contract | dependency dropped; range drift; demotion to `devDependencies` |
| Malformed manifests | invalid JSON; non-object JSON; missing file; malformed distinguished from violation |
| Output discipline | determinism across runs; bounded rendering of an oversized field |

**The tests access no registry, install nothing, pack nothing, create no package
consumer, and invoke no live API.**

---

## 17. Lockfile update and exact diff

[implementation in this PR] `package-lock.json` was updated with exactly:

```text
npm install --package-lock-only --offline --ignore-scripts
```

The command completed locally. **No `--prefer-offline`** was used, no fallback
to a fetch occurred or was attempted, and no retry without `--offline` was
needed.

**The complete diff — three insertions, one hunk:**

```diff
@@ -20,6 +20,9 @@
         "tsx": "^4.23.0",
         "typescript": "^6.0.3",
         "vitest": "^4.1.10"
+      },
+      "engines": {
+        "node": ">=18"
       }
     },
```

**Assessment.** [repository fact] Minimal and expected:

- **No registry request, no dependency download, no lifecycle script.**
- **No dependency graph change**; no resolved-version change; no integrity
  change; no unrelated churn. `lockfileVersion` remains 3.
- The single change is npm recording `engines` in the root entry — **npm's own
  normal behavior** for a declared engine range. Nothing was forced into the
  root entry.
- [repository fact] npm does **not** record `description`, `repository`,
  `homepage`, `bugs`, or `files` in the lockfile root entry, and none was added
  there — consistent with the decision record §12's finding that npm records
  `license` but not `private` or `author`.

---

## 18. No runtime-capability change

[implementation in this PR] **No file under `src/` was modified.** The change
surface (§19) contains no source file.

Unchanged: every MCP tool, resource, and prompt; every route; API requests;
API-key behavior; x402 behavior; payments; transport; direct execution; feature
flags; logging; and the Stock Trends API's standing as the data and analytical
authority. Runtime dependency versions and ranges are untouched — `dependencies`
remains exactly `@modelcontextprotocol/sdk` `^1.29.0` and `zod` `^4.4.3`, and
the `check:runtime-deps` contract is preserved, not re-derived.

The Phase 5F runtime remains unchanged. The default/free surface remains exactly
one tool, ten credential-free resources, and zero prompts; x402 remains
challenge-validation-only and default-off.

**Checkout-path regression (architecture memo §11).** [repository fact]
Explicitly verified rather than assumed — the memo warns that a metadata change
made to fix packaging could alter the checkout developer experience. `npm run
build`, `npm test`, and `npm run typecheck` all pass (§21). **No `prepare`
script was added** (§12), so `npm install` behavior in a checkout is unchanged.
The `files` field does not affect a checkout install.

Metadata is not capability: declaring a repository, an engine range, and a file
allowlist changes what the package *says about itself*, not what the server
*does*.

---

## 19. Files changed

[implementation in this PR] Exactly seven files, and no others:

| File | Change |
| --- | --- |
| `package.json` | **Modified.** `description` replaced; `files`, `engines`, `repository`, `homepage`, `bugs` added; one `check:package-metadata` script added |
| `package-lock.json` | **Modified — three insertions.** Root entry `engines` recorded by npm (§17) |
| `scripts/check-package-metadata.mjs` | **Added.** Static validator; no shebang (§15) |
| `scripts/check-package-metadata.d.mts` | **Added.** Strict TypeScript declaration companion |
| `tests/packageMetadata.test.ts` | **Added.** 67 focused tests (§16) |
| `docs/PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md` | **Added.** This record |
| `README.md` | **Modified — one line.** Exactly one documentation-index link to this record |

**No `.npmignore`** (§11). **No file under `src/`** (§18). No other file changed.

---

## 20. No artifact, install, registry query, publication, or live activity

[implementation in this PR] None of the following occurred:

- **No package artifact.** No `npm pack`, no `npm pack --dry-run`, no `*.tgz`,
  no unpacked artifact directory, no generated package manifest.
- **No installation.** No install of this package into any consumer; no
  temporary package consumer created.
- **No registry query.** No `npm view`, `npm search`, or `npm info`. No
  package-name availability check. The only npm invocation that touched
  dependency metadata was the `--package-lock-only --offline --ignore-scripts`
  lockfile update (§17), which made no registry request.
- **No publication.** No `npm publish` in any form — no flag, no dry run, no
  exception. No registry, marketplace, or directory submission.
- **No live API, x402, key, proof, payment, or spend.** No live Stock Trends API
  call; no x402 canary, challenge, or relay execution; no API key read, supplied,
  or used; no proof or payment material sent; no payment, settlement, or spend.
- **No MCP Inspector session, no remote or hosted MCP access, no Git fetch or
  other remote Git query, no AWS or deployment query, no external network
  request of any kind.**

[repository fact] The Phase 5F live authorization is `CONSUMED`. **No live or
external authorization exists or was requested**, and none is created by this
PR. No reusable live authorization is established. This PR was completed
entirely offline.

**No publication authority exists.** Completion of this PR grants no publication
authority, no marketplace authority, and no remote-MCP authority.

---

## 21. Validation results

[repository fact] All checks ran offline on the normal attached checkout of
branch `chore/package-metadata-artifact-allowlist`, from a clean tree at base
commit `55733ea`, with this PR's change surface applied as working-tree
modifications. Host: Windows 11, **Node v22.23.1**, npm 10.9.8.

### 21.1 Suites, build, and checks

| Check | Command | Result | Baseline |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | **PASS** | — |
| Build | `npm run build` | **PASS** | — |
| Package-metadata focused suite | `npm test -- tests/packageMetadata.test.ts` | **PASS — 67/67** | new |
| Dependency-contract focused suite | `npm test -- tests/runtimeDependencyContract.test.ts` | **PASS — 15/15** | 15/15 — unchanged |
| Relay suite | `npm test -- tests/x402Relay.test.ts` | **PASS — 474/474** | 474/474 — unchanged |
| Full suite | `npm test` | **PASS — 1027/1027 across 18 test files** | 960/960 across 17 files |
| Runtime dependency check | `npm run check:runtime-deps` | **PASS** — 17 compiled files scanned; discovered `@modelcontextprotocol/sdk`, `zod`; every directly imported external package declared | PASS — unchanged |
| Package-metadata check (script) | `npm run check:package-metadata` | **PASS** | new |
| Package-metadata check (direct) | `node scripts/check-package-metadata.mjs` | **PASS** | new |

**The full-suite arithmetic is exact and reconciles.** 960 + 67 = **1027**;
17 + 1 = **18**. Every pre-existing test still runs and still passes; this PR's
additions account for the entire delta and disturbed nothing.

**V-26 remains green.** The static dependency-contract completeness check passes
unchanged — this PR neither relaxed nor re-derived it.

### 21.2 Validator behavior verified in both directions

[repository fact] A passing check is only half the evidence, so the failure path
was exercised too. Against a deliberately violating manifest (guard off, license
`ISC`, broad `dist/**`) the validator reported **6 violations and exited 1**;
against unparseable JSON it reported **MALFORMED MANIFEST and exited 1**. Both
runs used a throwaway copy of the script in a scratch directory outside the
repository, against fixture manifests that referenced no package from this
repository; the scratch directory was removed afterward. Nothing was installed,
packed, or fetched.

### 21.3 Manifest and safety

| Check | Result |
| --- | --- |
| `package.json` parses | **PASS** |
| `name` / `version` / `author` / `license` / `private` exact | **PASS** — `stocktrends-mcp-server`, `1.0.0`, `Stocktrends Publications`, `MIT`, boolean `true` |
| `description` / `repository` / `homepage` / `bugs` / `engines` / `files` exact | **PASS** |
| `files` contains exactly four unique entries | **PASS** |
| No `dist/**/*.js.map` in the allowlist | **PASS** |
| No lifecycle script | **PASS** |
| No `publishConfig` | **PASS** |
| No `.npmignore` | **PASS** — none exists anywhere in the tree |
| `main` / `types` / `bin` covered by the files contract | **PASS** |
| Lockfile change minimal | **PASS** — three insertions, one hunk (§17) |
| README adds exactly one link | **PASS** |
| README link target exists | **PASS** |
| No `src/` file changed | **PASS** |
| `git diff --check` (whitespace/conflict) | **PASS** — clean |
| No conflict marker | **PASS** |
| No secret or actual credential | **PASS** |
| No artifact, tarball, or unpacked package | **PASS** — none exists |
| No temporary fixture remains | **PASS** |
| No reusable live authorization | **PASS** — none created |

---

## 22. Remaining evidence boundary

[deferred decision] **This PR implements the manifest-level allowlist only.**
What it has *not* established, stated plainly so a wall of green in §21 cannot
imply otherwise:

- **No actual npm package file list has been measured.** Every claim in §7–§10
  describes what the manifest *declares*, not what a tarball would contain. No
  package command was run.
- **B-2 remains empirically unverified until PR-3.** The architecture memo's two
  candidate failure modes — `dist/` excluded wholesale, or only `main` pulled in
  without its 12 required siblings — are **not** settled by this PR. Adding
  `files` is the *hypothesised* remedy; PR-3 must settle B-2 by measurement
  before this metadata is trusted. **This PR does not claim npm will include
  only the reviewed paths.**
- **B-3 is not closed at the manifest level, by design** (§13). PR-3's explicit
  ordered build closes it procedurally.
- **No clean install has occurred.** No consumer exists; the packaged bin has
  never been installed or launched. **No claim is made that the bin installs or
  runs.**
- **B-5 remains conditional and unsettled.** The bin launch guard's failure
  mechanism is still an inference with zero test coverage; only PR-4's
  installed-bin observation can establish it, per platform.
- **No publication authority exists.** The package is not published, not
  available, and not claimed to be. **No registry-availability check for the
  name has been performed** — that requires a prohibited registry query and
  remains deferred to publication planning (**T-16** / **D-10**).
- **The Node range is declared, not validated** (§6). Only Node v22.23.1 on
  Windows 11 has run these checks, and those checks exercised the source tree,
  not an artifact.

---

## 23. Next gate: PR-3 — offline pack and artifact-content validation

[deferred decision] PR-2 is complete at the manifest level. The next gate is
**PR-3**, which must:

1. run the **explicit ordered build** (§13): clean checkout → tests and
   typecheck → explicit `npm run build` → only then local package inspection;
2. **settle B-2 empirically** with `npm pack --dry-run` — the exact included-file
   list — **before** this PR's metadata is trusted;
3. produce a local artifact offline (`npm pack` only; **never** `npm publish`),
   then scan the **unpacked contents** rather than the manifest;
4. compare actual contents against the §7.1 closed allowlist, **failing closed on
   any path outside I-1..I-5** — including verifying that `package.json` is
   present (**V-3**, §8) and that `package-lock.json` is absent (**X-14**);
5. confirm **no `dist/**/*.js.map`** and no excluded category leaked in;
6. keep **V-26** green against the artifact's compiled output, statically;
7. record the exact file list, checksum, size, and source commit; commit no
   `*.tgz` and remove every temporary artifact.

PR-3 requires an offline posture throughout. It carries **no** authorization to
publish, install, query a registry, call a live API, or spend.
