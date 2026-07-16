# Package Artifact and Installation Validation — Architecture and Validation Plan

Date: 2026-07-16

**Decision classification:**

`RECOMMENDED FOR IMPLEMENTATION AFTER ARCHITECTURE REVIEW — LOCAL PACKAGE VALIDATION ONLY; NO PUBLICATION AUTHORIZED`

This memo is the architecture and validation-plan document for the recommended
post-Phase-5F phase named in
[`PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md`](PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md)
§12: **Package Artifact and Installation Validation**.

This PR is **documentation only**. It changes exactly two files: this memo and
one README documentation-index link. It records no implementation and
authorizes no execution.

This PR performs **no** package build, `npm pack`, `npm publish`, registry
query, package install, temporary consumer, MCP Inspector session, live Stock
Trends API call, x402 canary, Git fetch, AWS/deployment query, or external
network request of any kind. It uses no API key, proof, payment material, or
spend. No runtime code, test, package metadata, lock file, build
configuration, script, license file, or MCP registration is modified.

---

## 1. Source discipline and claim classification

Every statement below is labelled. The labels are load-bearing: a
recommendation in this memo is **not** an approved decision, and an inference
about tooling behavior is **not** a repository fact.

| Label | Meaning |
| --- | --- |
| **[FACT]** | Read directly from the checked-out repository at `cb2ee91`. Cited with `file:line`. |
| **[ROADMAP]** | An existing decision already recorded in a merged governing document. Cited. |
| **[INFERENCE]** | Architectural reasoning, including reasoning about npm/Node behavior that this PR is forbidden to execute. Must be settled empirically by a named later PR before it is relied on. |
| **[RECOMMENDATION]** | Proposed by this architecture. Not approved, not implemented. |
| **[OWNER]** | A decision reserved for the owner. This memo does not make it. |
| **[FUTURE]** | Deliberately left to implementation detail in a later PR. |

**A specific discipline applies to npm behavior.** This PR may not run
`npm pack`, `npm pack --dry-run`, `npm publish`, or any registry command
(§18). Therefore *no* claim about what npm would actually place in a tarball
is a repository fact in this memo. Such claims are labelled **[INFERENCE]**
and each one names the PR that must settle it empirically. The architecture
deliberately does not depend on any of these inferences being correct — it
requires that they be *measured* before any metadata is trusted (§9, PR-3).

---

## 2. Authority and phase boundary

This phase preserves the repository's authority chain unchanged
([FACT] `README.md:11-17`, `docs/MCP_SERVER_ARCHITECTURE.md`):

```text
Stock Trends dataset
  -> Stock Trends API
  -> published Stock Trends API responses/artifacts
  -> MCP adapter (this repository)
  -> external MCP clients/agents
```

The following boundaries are **preserved without exception** by this phase:

- the **Stock Trends API remains the data and analytical authority**; the
  adapter recomputes nothing;
- the **MCP remains a thin local stdio adapter**;
- **default/free mode is the installation-validation target**;
- **API-key paid execution remains a separate existing posture**, out of scope
  here;
- **x402 remains challenge-validation-only and default-off**
  ([ROADMAP] closure memo §2, §14);
- **no proof, payment, wallet, signing, settlement, paid output, or spend**;
- **no remote or hosted MCP**;
- **no registry publication**;
- **no marketplace or directory submission**;
- **no live Stock Trends API request**;
- **no autonomous paid execution**;
- **no investment-advice capability**.

**Runtime immutability.** The completed Phase 5F runtime remains unchanged
during this phase ([ROADMAP] closure memo §13: "Phase 5F runtime remains
unchanged unless separately reviewed"). This memo identifies two defects
(§6 B-1, B-5) that force or may force a *narrow* correction:

- **B-1 is a confirmed defect** (§4.5, §6). Its correction is **mandatory**
  before package artifact work; only the exact form of that narrow correction
  remains subject to separate review.
- **B-5 is a candidate defect.** Its correction is **conditional** — it happens
  only if PR-4's installed-bin validation or separate review establishes
  necessity.

**Neither may be changed on this memo's authority.** Each requires its own
separately reviewed defect PR establishing that the correction is necessary,
minimal, and capability-neutral (§13, PR-0). This memo implements neither and
predetermines neither remedy.

**Phase-name provenance.** [ROADMAP] The closure memo §11 states plainly: "No
existing document assigns an authoritative post-Phase-5F phase name. The
following is therefore a **recommended next phase**, not a claim of a prior
historical commitment." This memo inherits that framing exactly. Nothing here
converts a recommendation into an approved phase.

---

## 3. What this phase is, and why it is the smallest coherent step

[ROADMAP] The closure memo §12 selected this phase because "The supported
install path still requires a repository checkout and local build. A reviewed
package artifact removes adoption friction without changing runtime
capability," and because "It can be completed entirely offline with
synthetic/local validation and no x402 live request, proof, payment, or
spend."

The phase establishes exactly nine things and nothing more:

1. a deliberately reviewed **local** package artifact;
2. an explicit **package-content allowlist**;
3. internally consistent **package identity and metadata**;
4. a **resolved license posture**;
5. a **clean temporary installation** from the locally produced artifact;
6. **launch of the packaged local stdio executable**;
7. validation of the **installed artifact's default/free MCP surface**;
8. **refreshed installation and discoverability documentation**;
9. a **package-readiness handoff** for a later, separately authorized
   publication decision.

**This phase must not publish externally.** Publication is a distinct decision
with distinct authority (§17, §20).

### 3.1 The evidence gap this phase closes

[FACT] This is the central architectural justification, and it is stronger
than the closure memo's framing.

The repository's full test suite provides **no evidence whatsoever about a
packaged artifact**. Every test constructs the server in-process:

- `tests/helpers.ts:26` builds the client/server pair with
  `InMemoryTransport.createLinkedPair()`;
- `tests/helpers.ts:5` imports `createStockTrendsMcpServer` from
  `../src/server.js` — the **TypeScript source**, resolved by vitest, not the
  compiled output;
- `tests/helpers.ts:29` injects `fetchFn`, so no real network occurs.

Consequently the suite **never** exercises:

| Never exercised by the 945-test suite | Why it matters to a package artifact |
| --- | --- |
| `dist/` | The artifact ships `dist/`, not `src/`. |
| The `bin` entry (`package.json:8-10`) | The installed command is the consumer's entry point. |
| `StdioServerTransport` (`src/server.ts:135`) | The installed executable's only transport. |
| `isDirectExecution()` (`src/server.ts:146-149`) | The sole condition that starts the server as a binary. |
| Module resolution from an installed `node_modules` layout | Exercises the artifact's real resolution path. It does **not** by itself prove the dependency contract is complete — hoisting can satisfy an undeclared import (§6 B-1, §10.1). |

[INFERENCE] A green 474/945 suite, a green typecheck, and a green build are
therefore **necessary but categorically insufficient** evidence of package
readiness. They validate the source tree. They cannot detect a missing `dist/`
in the tarball, an undeclared runtime dependency, or a `bin` that exits
silently. This phase exists precisely to produce the class of evidence the
existing suite structurally cannot produce.

---

## 4. Current-state inventory

All of §4 is **[FACT]**, read from the checkout at `cb2ee91`.

### 4.1 Package identity and metadata

`package.json` is 33 lines. Present fields and their exact current values:

| Field | Current value | `file:line` |
| --- | --- | --- |
| `name` | `stocktrends-mcp-server` | `package.json:2` |
| `version` | `1.0.0` | `package.json:3` |
| `description` | `Local stdio MCP adapter for public Stock Trends API resources.` | `package.json:4` |
| `type` | `module` (ESM) | `package.json:5` |
| `main` | `dist/server.js` | `package.json:6` |
| `types` | `dist/server.d.ts` | `package.json:7` |
| `bin` | `{ "stocktrends-mcp-server": "dist/server.js" }` | `package.json:8-10` |
| `scripts` | exactly five: `build`, `dev`, `start`, `test`, `typecheck` | `package.json:11-17` |
| `keywords` | `["mcp", "stocktrends"]` | `package.json:18-21` |
| `author` | `""` (empty string) | `package.json:22` |
| `license` | `ISC` | `package.json:23` |
| `dependencies` | exactly one: `@modelcontextprotocol/sdk` `^1.29.0` | `package.json:24-26` |
| `devDependencies` | four: `@types/node` `^26.1.0`, `tsx` `^4.23.0`, `typescript` `^6.0.3`, `vitest` `^4.1.10` | `package.json:27-32` |

**Absent packaging-relevant fields** (each verified absent across the full
33-line file): `repository`, `homepage`, `bugs`, `engines`, `files`,
`publishConfig`, `private`, `exports`, `module`.

**No npm lifecycle script of any kind exists.** The complete script key list is
exactly the five above. There is no `preinstall`, `install`, `postinstall`,
`prepare`, `prepublishOnly`, `prepack`, or `postpack` (`package.json:11-17`).
This is a **positive safety property** worth preserving explicitly (§14 T-10,
T-11, **T-23**) — the absence of `prepublishOnly`/`prepack`/`postpack` is also
the absence of the most likely way an unintended publish would fire.

**Metadata provenance.** `package.json` has been modified in exactly two
commits in the entire repository history — `b07c0ec` (initial scaffold) and
`6a907d3` (Phase 1, PR #3) — and has been untouched since Phase 1 while the
repository advanced to Phase 5F. `git show b07c0ec:package.json` shows
`version` `1.0.0`, `author` `""`, and `license` `"ISC"` as unchanged
`npm init -y` scaffold defaults.

`package-lock.json` is `lockfileVersion` 3; its root entry mirrors
`package.json`'s name, version, license, bin, and dependencies. It has been
modified in exactly one commit (`6a907d3`). Every declared range is satisfied
by its locked version (SDK `^1.29.0`→`1.29.0`, and the four devDependencies
likewise).

### 4.2 Build and output layout

- `tsconfig.json:10` sets `"outDir": "dist"`; `tsconfig.json:11` sets
  `"declaration": true`; `tsconfig.json:12` sets `"sourceMap": true`.
- `tsconfig.build.json:1-8` extends `tsconfig.json`, narrows `rootDir` to
  `src`, restricts `types` to `["node"]`, and includes only `src/**/*.ts`.
- `npm run build` = `tsc -p tsconfig.build.json` (`package.json:12`).
- The build therefore emits, for each of the **17** source modules, a `.js`, a
  `.d.ts`, and a `.js.map` into `dist/`, preserving the `resources/` and
  `tools/` subtrees — **17 `.js`, 17 `.d.ts`, and 17 `.js.map` files** under the
  current build configuration, and no other file type.
- `dist/` exists on disk as untracked local build output and is **not tracked
  by git**: `git ls-files dist` returns zero entries, and
  `git check-ignore -v dist/server.js` reports `.gitignore:2:dist/`.

### 4.3 Executable entry point

- `src/server.ts:1` and the compiled `dist/server.js:1` both carry the shebang
  `#!/usr/bin/env node`. The bin target is shebang-correct.
- `dist/server.js` is **not self-contained**: `dist/server.js:5-16` contains 12
  relative sibling imports (`./config.js`, `./logging.js`, `./paidPolicy.js`,
  `./paidPricing.js`, `./resources/index.js`, `./stocktrendsClient.js`,
  `./tools/index.js`, `./tools/indicatorsTools.js`,
  `./tools/marketContextTools.js`, `./tools/selectionsTools.js`,
  `./tools/stimTools.js`, `./tools/x402Tools.js`). The entry point is useless
  without its siblings.
- The server starts as a binary only if `isDirectExecution()` returns true
  (`src/server.ts:138`). That function is an exact string-identity comparison
  (`src/server.ts:146-149`):

  ```ts
  function isDirectExecution(): boolean {
    const entrypoint = process.argv[1];
    return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
  }
  ```

- `src/server.ts:19` hardcodes `export const SERVER_VERSION = "1.0.0";`, a
  duplicate of `package.json:3` maintained by hand.

### 4.4 File-selection mechanism

- `.gitignore` has exactly six entries; `.gitignore:2` is `dist/`.
- **No `.npmignore` exists** anywhere in the repository, and no `.npmrc`.
  (`git ls-files` matches only `.gitignore`; the only `.npmignore` files on
  disk are inside `node_modules/` dependency internals.)
- **No `files` field exists** in `package.json`.

[INFERENCE] With no `files` field and no `.npmignore`, npm's documented
fallback is to use `.gitignore` as the ignore list. Since `.gitignore:2`
excludes `dist/` — the directory containing `main`, `types`, and the `bin`
target — the artifact's contents are in doubt. §6 B-2 states the two candidate
failure modes and names the PR that must settle them empirically. **This memo
does not assert which occurs.**

### 4.5 Dependencies actually loaded at runtime

- `src/` imports the Node builtin `node:url` (`src/server.ts:2`) and the
  declared dependency `@modelcontextprotocol/sdk` (`src/server.ts:3-4`).
- **`zod` is a value import in five source files** — `src/tools/index.ts:3`,
  `src/tools/indicatorsTools.ts:3`, `src/tools/marketContextTools.ts:3`,
  `src/tools/selectionsTools.ts:3`, `src/tools/stimTools.ts:3` — each
  `import { z } from "zod";`. These are **value** imports, not `import type`,
  so they survive compilation into `dist/tools/*.js`.
- **`zod` appears nowhere in `package.json`** — neither in `dependencies` nor
  `devDependencies`.
- **The complete set of non-relative (bare) module specifiers in the current
  `dist/**/*.js` is exactly five**, and this is the evidence the §7.7 static
  check exists to generalize:

  | Compiled bare specifier | Classification | Declared? |
  | --- | --- | --- |
  | `node:url` | Node builtin (`node:` prefix) | n/a — builtins are not declared |
  | `@modelcontextprotocol/sdk/server/mcp.js` | external package subpath | **Yes** — `package.json:25` |
  | `@modelcontextprotocol/sdk/server/stdio.js` | external package subpath | **Yes** — `package.json:25` |
  | `@modelcontextprotocol/sdk/types.js` | external package subpath | **Yes** — `package.json:25` |
  | `zod` | external package | **No** — undeclared (**B-1**) |

  Every other specifier in `dist/**/*.js` is relative (`./` or `../`). This
  table is **current repository evidence at `cb2ee91`, not the contract**: the
  contract in §7.7 is general and must not be hard-coded to `zod`.
- `node_modules/@modelcontextprotocol/sdk/package.json:118` declares
  `"zod": "^3.25 || ^4.0"`; the hoisted `node_modules/zod` is version `4.4.3`.
- `node_modules/@modelcontextprotocol/sdk/package.json:14-16` declares
  `"engines": { "node": ">=18" }`. This repository declares no `engines` field
  at all.
- No `src/` file reads from disk at runtime, reads `package.json` at runtime,
  or loads any non-code asset. The artifact therefore needs no data files
  beyond compiled JavaScript.

### 4.6 Installation instructions and publication claims

- `README.md:44-49` documents the only supported install channel:
  `git clone` + `cd` + `npm install` + `npm run build`.
- `README.md:51` states: "This `git clone` + `npm install` + `npm run build`
  sequence, followed by local stdio execution of the compiled `dist/server.js`,
  is the only supported install channel for this phase. There is no npm
  package, no registry publication, and no hosted MCP endpoint — packaging and
  publication are explicitly deferred, not omitted."
- README hardcodes the checkout-relative launch path
  `<absolute-path-to-checkout>/dist/server.js` in **seven** places — the
  section preamble at `README.md:81` and the client-configuration examples at
  `:92`, `:114`, `:135`, `:145`, `:158`, `:168`. Every one is a location a
  package install would replace with a bin name. (`README.md:98` additionally
  spells out Windows path escaping for those examples and would need the same
  treatment.)
- Stated default/free surface: exactly one tool (`README.md:36`), all public
  resources credential-free (`README.md:37`), zero prompts (`README.md:38`),
  ten resources (`README.md:464`).
- The `## Documentation` index begins at `README.md:548` and is a flat list of
  `- [Title](docs/FILE.md)` bullets, one per line, ordered by phase. Before
  this PR it ended with the Phase 5F closure memo; this PR appends exactly one
  entry, for this memo (§19).
- README contains **no license section**.

### 4.7 Directory and discoverability metadata

[FACT] `docs/PHASE5E_DIRECTORY_METADATA_READINESS.md` (PR #58) is readiness
content only; it performed no submission and changed no package metadata.

- §2 records the repository URL `https://github.com/skotlander/stocktrends-mcp-server`
  (the checkout's `origin` remote) — **yet no `repository` field exists in
  `package.json`**.
- §2 records the maintainer as Skot Kortje / Stock Trends
  (`skortje@stocktrends.com`) — **yet `package.json:22` `author` is `""`**.
- §2 states the license is "**not asserted here**", noting `package.json`
  carries `"license": "ISC"` but "the repository contains no `LICENSE` file and
  no reviewed license decision is recorded," and instructs that a future
  submission "must resolve and record the license status in its own separately
  reviewed step (§11) rather than reuse an unconfirmed field."
- §5's capability block asserts `"payment_rails": "none (no x402, no wallet, no
  OAuth, no Bearer)"` and `"install": "git clone + npm install + npm run
  build"`.
- §9 forbids claiming "**x402 or any payment-rail support**" and forbids
  claiming "**npm/registry publication or packaged availability** — unless and
  until an actual, separately reviewed publication step has occurred."
- §10 points the launch-readiness signoff at `PHASE5E_LAUNCH_READINESS_SIGNOFF.md`.

---

## 5. License state and decision boundary

This section is limited to **repository, metadata, packaging, and release
consistency**. It contains **no legal opinion**, and it neither selects nor
drafts a license.

### 5.1 Current state

| Question | Answer | Evidence |
| --- | --- | --- |
| What does package metadata declare? | `ISC` | [FACT] `package.json:23`; mirrored in `package-lock.json` root entry |
| Does a license file exist? | **No** — no `LICENSE`, `LICENCE`, `COPYING`, or `NOTICE` at root or any subdirectory, tracked or untracked | [FACT] `git ls-files` (123 tracked files) contains no such entry; root listing shows none |
| Has one ever existed in history? | **No** | [FACT] history search for added license files returns nothing |
| Is a copyright holder named anywhere? | **No** — no license text, no README copyright line, no SPDX header in any `src/**/*.ts` | [FACT] repository-wide search |
| Is an author declared? | **No** — `author` is `""` | [FACT] `package.json:22` |
| Where did `ISC` come from? | An unchanged `npm init -y` scaffold default | [FACT] `git show b07c0ec:package.json` |
| What does the documentation set say? | The license is "not asserted"; the field is "an unconfirmed field" that must not be reused | [FACT] `PHASE5E_DIRECTORY_METADATA_READINESS.md` §2 |

### 5.2 The exact inconsistencies

1. **A declared license value with no corresponding license text.** The
   manifest asserts `ISC` while the repository contains no license artifact —
   and never has.
2. **A declared license with no copyright holder.** `ISC` is a template
   requiring a copyright holder and year. No holder is named in any form. The
   only identity in the repository (Skot Kortje / Stock Trends) appears solely
   as the *operator* of validation runs — never as author, copyright holder, or
   licensor.
3. **The manifest contradicts the documentation set.** `package.json` states
   `ISC` as fact; `PHASE5E_DIRECTORY_METADATA_READINESS.md` §2 simultaneously
   disclaims it and forbids its reuse. The repository declares and disclaims
   the same value at once.
4. **The value is an unreviewed default, not a decision.** It entered at
   scaffold time and has never been the subject of any recorded review.

### 5.3 Why this blocks package readiness

[INFERENCE] A package artifact is a **distribution act**, and distribution is
where the license field stops being cosmetic:

- npm surfaces the `license` field as the package's stated terms; publishing
  `ISC` would assert a license posture the repository has never reviewed and
  cannot evidence with any license text.
- [INFERENCE] npm's always-included set covers `LICENSE`/`LICENCE` files;
  there is none to include, so the artifact would carry a license *claim* with
  no license *text* — an internally inconsistent artifact.
- Consumers of an installed artifact have no terms to rely on.
- [ROADMAP] The closure memo §12 entry criterion 4 already requires: "The
  license inconsistency is resolved deliberately: package metadata and a
  reviewed repository license artifact agree." This is a pre-existing,
  independently recorded gate — not a new requirement invented here.

### 5.4 Owner decision required

**[OWNER] The license decision is reserved entirely for the owner.** This memo
deliberately does **not** select a license, draft license text, recommend a
license, or rank options. It does not treat the existing `ISC` value as either
correct or incorrect — only as **unreviewed and unbacked**.

The owner must decide, at minimum:

- the intended license (or an explicit decision that the package is
  proprietary/unlicensed for distribution);
- the named copyright holder and year;
- whether `package.json:23` should change to match, or a license artifact
  should be added to match `package.json:23`, or both;
- whether the intended posture is compatible with the intent to distribute at
  all.

**Recording PR:** [RECOMMENDATION] **PR-1** (§13) is the sole PR permitted to
record and implement the license decision, and it may act only on explicit
owner direction captured in that PR. **No other PR in this phase may add,
select, draft, or alter license material.** If the owner does not supply
direction, PR-1 does not proceed and the phase halts at its gate (§16) — the
phase must not route around an unresolved license.

---

## 6. Package-readiness blockers

[FACT]-grounded findings, each classified. **None is corrected in this PR.**

| ID | Finding | Class | Blocks completion? |
| --- | --- | --- | --- |
| **B-1** | **Undeclared direct runtime dependency `zod` — a confirmed dependency-contract defect.** Five `src` files value-import `zod` (§4.5); it survives into `dist/tools/*.js` as a bare specifier; it is absent from `package.json` entirely. The package therefore ships compiled code that directly imports a package its own contract never declares, while relying on the SDK's transitive copy to be present. **The defect is the incomplete declaration itself, and that is a repository fact — it does not depend on any prediction about what an install would do.** Aggravating: the SDK's range is `^3.25 \|\| ^4.0`, so a consumer whose tree resolves `zod` 3.x would run code compiled and tested against 4.4.3, with this package declaring nothing that would prevent it. **Aggravating further: `dist/tools/index.js` is loaded unconditionally on the default/free path (`src/server.ts:51`), so this hits the exact validation target of this phase, not just paid mode.** **Critically, this defect is not reliably observable by installing and launching the package** — see §10.1: a normal consumer install may hoist `zod` and resolve the import successfully, so a green PR-4 launch is fully consistent with the defect still being present. It is settled **statically** by §7.7 / V-26, not by observation. | [FACT] for the imports, the omission, and the resulting contract incompleteness; [INFERENCE] for what any particular consumer tree would resolve | **Yes** |
| **B-2** | **The artifact's entry points may not ship.** `main`/`types`/`bin` all point into `dist/`; `dist/` is gitignored; there is no `files` field and no `.npmignore` (§4.4). Two candidate failure modes: **(a)** `dist/` is excluded wholesale, leaving `main`, `types`, and `bin` dangling; or **(b)** npm's always-included rule pulls in only the `main` file, producing a tarball with `dist/server.js` but none of its 12 required siblings (§4.3) — an install that succeeds and a bin that crashes on first import. Both fail closed rather than silently misbehaving, but both are release-breaking. | [FACT] for the metadata state; **[INFERENCE] for which mode occurs — PR-3 must settle this empirically before any metadata change is trusted** | **Yes** |
| **B-3** | **No build hook.** No `prepare`/`prepack`/`prepublishOnly` script exists (§4.1), and `dist/` is untracked. A fresh clone has no `dist/` at all, so a pack from clean checkout would carry zero runtime code unless a build is run first as a deliberate, ordered step. | [FACT] | **Yes** |
| **B-4** | **License inconsistency** (§5). | [FACT] | **Yes** |
| **B-5** | **The bin launch guard is an untested exact-string identity check — a candidate defect, empirical.** `isDirectExecution()` (§4.3) starts the server only if `import.meta.url === pathToFileURL(process.argv[1]).href`. [INFERENCE] npm installs a `bin` differently per platform — a symlink in `node_modules/.bin` on POSIX, a shim that invokes the real path on Windows. Where `argv[1]` is a symlink path but the ESM loader resolves the module to its realpath, the two strings differ, the guard returns `false`, and **the process exits 0 with no transport, no error, and no log line** — a silent no-op that looks like success. It has zero test coverage (§3.1). **This creates a platform asymmetry that is itself an architectural finding: validating only on the Windows development host could pass while the artifact is broken for macOS/Linux consumers.** | [FACT] for the code and the absence of coverage; **[INFERENCE] for the failure mechanism — PR-4 must settle it by observation** | **Yes** |
| **B-6** | **No `engines` field**, while the SDK declares `node >=18` (§4.5). The supported Node range is undeclared and unenforced. | [FACT] | **Yes** |
| **B-7** | **Missing `repository`, `homepage`, `bugs`.** The origin URL is known to the checkout and already recorded in `PHASE5E_DIRECTORY_METADATA_READINESS.md` §2, but no manifest field records it (§4.1, §4.7). | [FACT] | **Yes** |
| **B-8** | **Hardcoded version duplicate.** `src/server.ts:19` `SERVER_VERSION = "1.0.0"` duplicates `package.json:3` by hand. They agree today; nothing enforces it. | [FACT] | No — but see T-15 |
| **B-9** | **Stale `description`.** `package.json:4` describes only "public Stock Trends API resources," accurate at Phase 1 (the last commit to touch the file) but silent on paid ST-IM/indicators/selections/market-context and x402 postures. | [FACT] | No |
| **B-10** | **`author` is empty** (`package.json:22`) while the maintainer is recorded in docs (§4.7). | [FACT] | **Yes** |
| **B-11** | **Directory metadata is stale for x402.** `PHASE5E_DIRECTORY_METADATA_READINESS.md` §5 asserts `"payment_rails": "none (no x402, ...)"` and §9 forbids claiming x402 support. After Phase 5F, the accurate statement is neither "none" nor "supported" but **challenge-validation-only, default-off, no payment/proof/spend**. [ROADMAP] The closure memo §7 independently classifies this content as "stale for x402." | [FACT] + [ROADMAP] | **Yes** for the refresh PR |
| **B-12** | **Stale internal doc reference.** `PHASE5E_DIRECTORY_METADATA_READINESS.md` §10 references `PHASE5E_LAUNCH_READINESS_SIGNOFF.md`; the file that exists is `PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md`. | [FACT] | No |
| **B-13** | **No packaging evidence exists at all** (§3.1). The suite validates `src`, never the artifact. | [FACT] + [INFERENCE] | **Yes** — this phase *is* the remedy |

**B-1 and B-5 are the two defects referenced in §2, and they are not in the same
epistemic state.** Neither is corrected here, and neither may be corrected on
this memo's authority: each requires its own separately reviewed defect PR
(§13, PR-0) establishing that the correction is necessary, minimal, and
capability-neutral. But their *triggers* differ:

| | **B-1** | **B-5** |
| --- | --- | --- |
| Status | **Confirmed defect.** The imports, the omission, and therefore the contract's incompleteness are all repository fact (§4.5). | **Candidate defect.** The code and the absence of coverage are fact; the failure mechanism is [INFERENCE]. |
| Trigger for correction | **Mandatory.** A separately reviewed narrow correction PR is **required before package artifact work begins** (§13 PR-0, §16). Nothing about the defect's existence is conditional. | **Conditional.** Correction occurs **only if** installed-bin validation (PR-4) or separate review establishes necessity. |
| What review still decides | Only the **exact form** of the narrow correction. | **Whether** a correction is needed at all, and if so its form. |
| How it is settled | **Statically and offline** (§7.7, V-26). Not by install-and-launch (§10.1). | **By observation** on the installed bin (§10.2, V-6/V-10), per-platform (D-11). |

[INFERENCE] B-1 is most likely resolved as a *metadata* correction — declaring
the dependency the code already loads — rather than a runtime change, which
would leave the Phase 5F runtime literally untouched. **That is an inference,
not a decision.** This memo neither implements it nor predetermines it: the
remedy's exact form belongs to PR-0's review. What this memo does fix is that
PR-0's B-1 leg **happens**.

---

## 7. Package artifact contract

[RECOMMENDATION] A **closed** contract: everything not explicitly included is
excluded, and the later implementation **fails closed** if any unexpected path
appears in the artifact. Nothing in §7 is implemented by this PR; `package.json`,
`.npmignore`, and every file-selection mechanism remain untouched.

### 7.1 Inclusion allowlist (closed)

| # | Category | Contents | Rationale |
| --- | --- | --- | --- |
| **I-1** | Compiled runtime JavaScript | `dist/**/*.js`, preserving `resources/` and `tools/` subtrees | The executable and its 12 required siblings (§4.3). Without these the artifact is non-functional. |
| **I-2** | Package manifest | `package.json` | Carries identity, bin, and the dependency contract. [INFERENCE] Expected to be included by npm unconditionally — but the allowlist requires its **presence** to be verified in the artifact (V-3), not assumed (§1). |
| **I-3** | Primary documentation | `README.md` | The consumer-facing contract. [INFERENCE] Expected to be included by npm unconditionally. **Its presence is not sufficient — the artifact must contain the *refreshed* README** (§13.1 step 4, V-28). |
| **I-4** | License artifact | the license file, **if and only if** PR-1 records an owner decision that produces one | [OWNER]-gated (§5.4). Not created by this memo. |
| **I-5** | Type declarations | `dist/**/*.d.ts` | [OWNER] — see §17 D-6. `types` currently points at `dist/server.d.ts` (`package.json:7`), so excluding them without also changing `types` would create a fresh inconsistency. |

**Everything else is excluded by default.** The allowlist is closed: an
artifact containing any path outside I-1..I-5 fails the phase.

### 7.2 Exclusion categories (each fails closed)

| # | Category | Concrete instances in this repository | Fail-closed requirement |
| --- | --- | --- | --- |
| **X-1** | Secrets and credentials | **No actual credential exists in the tree.** [FACT] `.env.example` contains no real credential: its API-key placeholder is empty (`STOCKTRENDS_API_KEY=`), while its **non-secret example configuration fields do carry example values** (`STOCKTRENDS_API_BASE_URL=https://api.stocktrends.com`, `STOCKTRENDS_MCP_TRANSPORT=stdio`, `STOCKTRENDS_MCP_LOG_LEVEL=warn`). "No credential" is therefore the accurate claim; "only empty values" is not. `.env.example` is excluded from the artifact regardless — it is not on the §7.1 allowlist. | Zero credential-shaped values in the artifact. Any hit fails the phase. |
| **X-2** | `.env` / local configuration | `.env` (absent from the tree; gitignored at `.gitignore:3-4`), `.env.local` | Never packed, including if an operator creates one locally before packing. |
| **X-3** | Captured responses / challenge or paid data | none present ([ROADMAP] closure memo §5: tests "do not contain captured production challenge values") | No captured API payload, challenge value, or paid data may ship. |
| **X-4** | Source maps | `dist/**/*.js.map` (emitted today by `tsconfig.json:12`) | [OWNER] — see §17 D-5. Default recommendation: **exclude** (§7.3). |
| **X-5** | Source files | `src/**` | Excluded. The artifact ships compiled output. |
| **X-6** | Tests and fixtures | `tests/**` (18 files incl. `helpers.ts`) | Never packed. |
| **X-7** | Internal memos and development artifacts | `docs/**` (80 markdown files) | [OWNER] — see §17 D-8. Default recommendation: **exclude** (§7.3). |
| **X-8** | Build/tooling configuration | `tsconfig.json`, `tsconfig.build.json`, `vitest.config.ts`, `.gitignore` | Not needed by a consumer. |
| **X-9** | Agent/tooling directories | `.claude/`, `.agents/`, `.codex/` | Internal-only. Never packed. |
| **X-10** | Worktree content | `.codex/worktrees/**` and any auxiliary worktree | Never packed. Worktree content must never reach an artifact. |
| **X-11** | Temporary files and logs | any `*.log`, scratch, or coverage output (`coverage/`, `.gitignore:6`) | Never packed. |
| **X-12** | Generated package artifacts | any `*.tgz`, unpacked artifact directory, or temporary consumer | Never packed; never committed (§9 step 10). |
| **X-13** | VCS internals | `.git/**`, `node_modules/**` | Never packed. |
| **X-14** | Dependency lockfile | `package-lock.json` | **Not on the §7.1 allowlist — it does not ship.** A lockfile pins *this repository's own* development tree; a consumer resolves this package's dependencies from the manifest's declared ranges against *their* tree, so a shipped lockfile describes nothing the consumer will actually get. [INFERENCE] npm is expected to omit it from a package tarball by default — **but this contract does not rely on that expectation, and this memo does not assert it as fact** (§1). The closed allowlist governs: if `package-lock.json` appears in the artifact, PR-3 fails the phase regardless of what the tool's default was supposed to be. |

### 7.3 Contract decisions this architecture recommends

[RECOMMENDATION] — each remains subject to §17:

- **Source maps: exclude (X-4).** They add artifact weight and map compiled
  output back to source the artifact does not ship (T-4). Excluding them is
  also the simpler, more auditable default.
- **Source files: exclude (X-5).** Unambiguous.
- **Internal memos: exclude (X-7).** 80 phase memos are development history,
  not consumer documentation. Shipping them would place internal roadmap,
  threat-model, and validation material into a distributed artifact (T-6).
- **Type declarations: include (I-5)** — but only because `types` points at
  them today; the coherent alternative is to exclude them *and* drop `types`.
  Either is defensible; the incoherent option is excluding them while keeping
  `types`. [OWNER] D-6.
- **README: include (I-3).** But note that today's README documents the
  checkout path with seven hardcoded checkout-relative paths (§4.6) — shipping
  it unrefreshed would hand consumers instructions that do not describe what
  they installed. **This couples the artifact contract to PR-5 in both
  directions:** PR-5 cannot refresh the README until an artifact is validated,
  and the artifact is not final until PR-5 has refreshed it. **§13.1's tail
  step is what resolves the circularity** — the phase closes on a repack taken
  *after* the refresh, with the refreshed README verified inside it (V-28).

### 7.4 Fail-closed principle

[RECOMMENDATION] The implementation must **enumerate the artifact's actual
contents and compare against the closed allowlist**, failing on any path not
explicitly allowed — rather than checking for known-bad patterns. A denylist
cannot catch a file category nobody anticipated; an allowlist can. Unexpected
files are a **phase-blocking failure**, not a warning.

### 7.5 Metadata requirements

[RECOMMENDATION] The artifact's metadata must be internally consistent:
identity, version, license, repository, engine range, entry point, and
declared dependencies must each be true of the artifact actually produced.
Specifically, the dependency contract must cover **everything the compiled code
directly imports** (B-1, enforced by §7.7), and `bin`/`main`/`types` must each
resolve to a path that is actually present in the tarball (B-2).

**Node-version evidence scope.** [RECOMMENDATION] The manifest must declare a
**reviewed** supported Node range that is consistent with what the runtime
dependencies require — [FACT] the SDK declares `"engines": { "node": ">=18" }`
(`node_modules/@modelcontextprotocol/sdk/package.json:14-16`), while this
repository declares no `engines` field at all (B-6). Declaring the range is
necessary but is not evidence for it:

- [INFERENCE] **Validating on one host Node version proves only that host
  version.** A green PR-4 run on the operator's Node build is evidence about
  that build and nothing else.
- Therefore **any Node-range support claim broader than the validated host
  requires either a defined Node-version matrix or an explicitly scoped
  claim.** The phase may honestly say "validated on Node X; declared range
  `>=N` per dependency requirements" — it may **not** say "supports `>=N`" on
  the strength of a single-version run.
- [FUTURE] This memo does **not** invent a matrix: no evidence in the
  repository establishes which Node versions have ever been exercised. Whether
  to build one, or to scope the claim to the validated host, is settled by the
  same evidence-scoping logic as D-11 (§17.2) and needs no separate owner
  decision — PR-2 declares the range, PR-4 records the host actually used, and
  PR-5/PR-6 must not widen the claim beyond that record.

### 7.6 Size and file-category constraints

[RECOMMENDATION] The phase should record artifact size and file count as
evidence (§9 step 8) and constrain by **category** rather than by an arbitrary
byte ceiling: the artifact should contain only I-1..I-5 categories. A size
that materially exceeds the compiled output's footprint is a **signal** that an
excluded category leaked in, and should trigger investigation rather than an
automatic pass/fail on bytes alone. [FUTURE] Exact thresholds are an
implementation detail for PR-3.

### 7.7 Static dependency-contract completeness (blocking)

[RECOMMENDATION] **This is the control that settles B-1, and it is the only one
that can.** §10.1 explains why installing and launching the package cannot do
it: a consumer install may hoist a transitively-required package and resolve an
undeclared import successfully, so a green install proves nothing about
contract completeness. This check therefore runs **statically and entirely
offline**, against the compiled output, with no install, no resolution, and no
network.

**Implemented in PR-2 or PR-3** (§13), enforced by **V-26**, and **blocking**.

The check must:

1. **Inspect all compiled `dist/**/*.js`** — every emitted module, not a
   sample, and not `src/**`. The artifact ships compiled output; the compiled
   output is what makes the claim.
2. **Extract every bare module specifier** — every specifier that is not
   relative (`./`, `../`) and not absolute. It must cover static `import`
   declarations, `export ... from` re-exports, and dynamic `import()` with a
   literal specifier.
3. **Classify and remove Node builtins**, including both `node:`-prefixed
   specifiers (`node:url`) and bare builtin names (`url`, `path`, `fs`, …).
   Builtins are provided by the runtime and are never declared as
   dependencies.
4. **Resolve each remaining specifier to its package name** — `zod` → `zod`;
   `@modelcontextprotocol/sdk/server/mcp.js` → `@modelcontextprotocol/sdk`.
   A subpath import is an import of its package.
5. **Require every resulting package name to appear in this package's declared
   runtime `dependencies`** (`package.json`). `devDependencies` do **not**
   satisfy this requirement — a consumer never installs them (T-9). Neither
   does a transitive dependency of a declared dependency: **a direct import
   requires a direct declaration.**
6. **Fail closed on any undeclared direct runtime import.** One unmatched
   specifier fails the phase. There is no advisory tier and no allowlisted
   exception.
7. **Treat successful transitive resolution or hoisting as irrelevant.** The
   check must never consult `node_modules`, never attempt resolution, and never
   accept "it resolves here" as evidence. Whether a specifier *happens* to
   resolve in some tree is not the question; whether the contract *declares* it
   is.

**The contract is general.** [RECOMMENDATION] The check must be written against
the rule — *every directly imported external package must be declared* — and
**must not be hard-coded to `zod`**. `zod` is today's instance (§4.5), not the
requirement. A check that special-cases `zod` would pass the moment a sixth
module imported something else undeclared, which is precisely the failure this
control exists to prevent.

[FACT] Applied to the current checkout at `cb2ee91`, the §4.5 specifier table
shows this check would fail on exactly one specifier — `zod` — and pass
`@modelcontextprotocol/sdk` (declared, `package.json:25`) and `node:url`
(builtin). That is the evidence for B-1, recorded as current repository
evidence and not as the contract.

[INFERENCE] The check is expected to go green only after PR-0's mandatory B-1
correction lands (§13). **This memo does not implement that correction, does
not predetermine its form, and does not treat the expected result as
established** — V-26 must actually be run and observed green.

---

## 8. Default/free installed surface

[FACT] Resolved from **current source and current tests**, not from Phase 4/5
prose. Where docs and source could disagree, source and tests govern.

| Property | Required value | Authority |
| --- | --- | --- |
| Tools exposed | **exactly one**: `stocktrends_estimate_workflow_cost` | `src/server.ts:51` (unconditional); asserted `tests/phase1-safety.test.ts:15-16` |
| Paid semantic tools | **all nine absent** | `tests/phase1-safety.test.ts:14` asserts `PAID_RUNTIME_TOOL_DEFINITIONS` is `[]` in default mode |
| Prompts | **zero registered; the prompts capability is not advertised at all** | No `registerPrompt` anywhere in `src/`; `tests/phase1-safety.test.ts:19` asserts `client.getServerCapabilities()?.prompts` is **`undefined`** |
| Resources | **exactly ten**, credential-free | `src/resources/index.ts:27-124`; asserted `tests/resources.test.ts:11-22, 28` |
| API key | **never read** in default/free mode | `src/config.ts` gating; `README.md:347` |
| Startup network | **none** — fetch-on-request only | `README.md:362`; no startup fetch in `src/server.ts` |

The exact ten resource URIs (`tests/resources.test.ts:11-22`):
`stocktrends://api/openapi`, `stocktrends://ai/context`,
`stocktrends://ai/tools`, `stocktrends://workflows`,
`stocktrends://methodology/stim`, `stocktrends://methodology/indicators`,
`stocktrends://methodology/inference`, `stocktrends://pricing/catalog`,
`stocktrends://proof/market-edge`, `stocktrends://leadership/definitions`.

**The 1 / 10 / 0 surface is corroborated** by [ROADMAP] closure memo §7 ("one
planning tool, ten credential-free resources, zero prompts") and
`PHASE5E_DIRECTORY_METADATA_READINESS.md` §5/§7. Source and tests agree with
the docs here; no drift was found in the counts.

### 8.1 A harness-design consequence

[INFERENCE] **The prompt assertion must be written as a capability check, not
a list call.** `tests/phase1-safety.test.ts:19` asserts the prompts capability
is `undefined` — the server does not advertise prompts at all. A harness that
"confirms zero prompts" by calling `listPrompts()` would be testing the SDK's
behavior against an unadvertised capability, not the server's surface. The
installed-artifact harness must assert **capability absence**, mirroring the
existing test. This is exactly the kind of detail that makes a naive
reimplementation of the check wrong.

### 8.2 Required negative evidence — and its exact boundary

The installed artifact must additionally demonstrate: **no API key read; no
paid request; no x402 request; no external network request of any kind.**
[RECOMMENDATION] Because the harness cannot inject `fetchFn` into a separate
installed process the way `tests/helpers.ts:29` does in-process, the negative
network evidence must come from **process-level observation** (§10.3), not
from dependency injection.

**The negative claim must be scoped to a named lifecycle window, not asserted
in general.** [RECOMMENDATION] What PR-4 demonstrates is:

- **no network during process startup, `initialize`, tool listing, resource
  listing, and shutdown** — that exact window, and no more.

**The boundary exists because the default/free surface is not network-free on
call.** [FACT] This is the load-bearing detail, and it is easy to get wrong:

- The single default/free tool **does fetch**. `handleCostEstimateTool` calls
  `client.fetchJson({ endpointPath: "/v1/cost-estimate", … })`
  (`src/tools/index.ts:124-131`); the endpoint is
  `COST_ESTIMATE_ENDPOINT_PATH = "/v1/cost-estimate"` (`src/tools/index.ts:8`).
  "Free" means **no API key and no spend** — it does **not** mean no request.
- The ten resources are likewise **fetch-on-request** (`README.md:362`,
  `README.md:464`), so *reading* one is a live request.
- [FACT] What makes the negative claim true is therefore *when* the server
  fetches, not *whether* it can: `README.md:362` records fetch-on-request with
  no startup fetch, and `src/server.ts` performs no fetch at startup.

**Consequently the harness must list, and must not invoke.** [RECOMMENDATION]
**No tool that fetches an API resource may be invoked during this validation,
and no resource may be read.** `listTools`, `listResources`, and the
`initialize` handshake are the permitted operations; `callTool` on
`stocktrends_estimate_workflow_cost` and `readResource` on any of the ten URIs
are **prohibited** — either would make a live Stock Trends API request and
breach §18, and would do so *legitimately*, which is what makes it a trap
rather than a bug.

**Two evidence sources, jointly.** [RECOMMENDATION] Neither alone is
sufficient, and the memo does not claim otherwise:

1. **Structural source evidence** — the cited fetch-on-request design and the
   absence of any startup fetch establish *why* the window is network-free.
2. **Process-level observation** — establishes that this *particular installed
   artifact* actually made no request in that window.

Structural evidence without observation is an argument about source the
artifact may not even match (T-17); observation without structural evidence is
a single lucky run. **Together** they support the negative claim; PR-4 must
produce both.

[FUTURE] **The observation mechanism itself is left to PR-4 — but PR-4 must
name and justify it before execution**, not choose it mid-run. It must be
consistent with §18 (no downloaded tooling, no network) and must be able to
distinguish "no request was made" from "a request was made and failed." A
mechanism that cannot tell those apart does not produce the evidence this row
claims (V-15).

---

## 9. Build and pack plan (offline)

[RECOMMENDATION] A deterministic, offline procedure. **None of it runs in this
PR.**

| # | Step | Notes |
| --- | --- | --- |
| 1 | Begin from a clean normal checkout | No worktree, no detached HEAD. |
| 2 | Confirm exact repository and branch state | `git status --short --branch`, `git rev-parse HEAD`. Record the commit. |
| 3 | Run typecheck, focused tests, full tests, build | Green required before packing anything (§16). |
| 4 | Produce a local package artifact **without publication** | See §9.1 on which invocation is permitted. |
| 5 | Inspect the package manifest | The metadata npm would actually attribute to the artifact. |
| 6 | Inspect the exact included-file list | Compare against the §7.1 closed allowlist; fail closed on any extra path (§7.4). |
| 7 | Unpack and scan the artifact | Scan the **unpacked contents**, not the manifest — the manifest is a claim, the contents are the fact. |
| 8 | Record a local checksum and artifact size | Evidence, computed with a **local** checksum tool. No network. |
| 9 | Confirm the artifact corresponds to reviewed Git source | Tie the artifact to the recorded commit (step 2) and confirm no untracked/modified source contributed (T-17). |
| 10 | Retain no generated artifact in Git | `*.tgz` and unpacked output must never be committed (X-12). |
| 11 | Remove all temporary artifacts after validation | Tarball, unpacked directory, temporary consumer (§10). |

### 9.1 npm commands that could reach a registry

[INFERENCE] Each command is classified by whether it can attempt registry
access, with a required offline/local posture. **PR-3 must confirm each
empirically before relying on it; this PR runs none of them.**

| Command | Registry risk | Required posture |
| --- | --- | --- |
| `npm pack --dry-run` | Should be local; **must be confirmed** | **Preconditioned.** Run first, with dependencies already installed. This is the command that settles B-2 — the exact included-file list — without producing an artifact. |
| `npm pack` | Should be local | **Preconditioned.** Produces the local tarball. Never combined with a publish step. |
| `npm publish` | **Publishes** | **PROHIBITED** in this phase, unconditionally (§18, §20). |
| `npm view` / `npm search` / `npm info` | **Queries a registry** | **PROHIBITED.** This is the command that would resolve the package-name-availability question (T-16) — which is precisely why that question is deferred to publication planning under separate authorization (§17 D-10). |
| `npm install <tarball>` | Resolves dependencies; **may reach a registry** | **Preconditioned** (§10.1) and **`--offline`** (§9.2). Must install *only* the local artifact against an already-complete local cache; must not fetch. |
| `npm install` (bare) | **May fetch** | Only as an already-satisfied precondition in the existing checkout. Must obtain no new dependency. |

[RECOMMENDATION] Any invocation that could reach the network must be run with
an explicit offline posture, and the phase must **fail closed** if an offline
invocation cannot be satisfied locally — rather than silently falling back to a
fetch. **Obtaining dependencies is not authorized in this phase.**

### 9.2 Offline dependency-closure gate (entry gate before PR-4)

[RECOMMENDATION] §10's consumer install needs this package's declared runtime
dependencies to come from somewhere. This phase authorizes no registry access
(§18), so they must already be local — and that must be **established before
PR-4 runs**, not discovered by watching an install succeed or fail.

**The gate.** Before PR-4 begins:

1. **The local npm cache must already contain the complete dependency closure**
   required by the isolated consumer installation — this package's declared
   runtime `dependencies` and their full transitive closure, at versions the
   declared ranges resolve to.
2. **This must be verified offline**, using only local cache inspection. The
   verification may not itself reach a registry — a check that fetches to
   discover what is missing has already broken the boundary it was meant to
   protect.
3. **Cache insufficiency fails closed.** If the closure is incomplete, **PR-4
   does not run.** The phase halts and the gap is reported.
4. **The phase must not silently obtain missing packages from a registry.** Not
   as a fallback, not as a "just this once" step, not as a side effect of a
   command whose offline flag was omitted. Obtaining dependencies is a separate
   decision this memo does not make and this phase does not authorize.

**The exact permitted posture is literal `--offline`.** [RECOMMENDATION]

| Flag | Verdict | Why |
| --- | --- | --- |
| **`--offline`** | **The permitted posture.** | Uses only the cache and **fails** on a cache miss. A miss surfaces as an error — which is exactly the fail-closed behavior this gate requires. |
| **`--prefer-offline`** | **PROHIBITED. Not equivalent, and must never be treated as equivalent.** | It prefers the cache but **may use the network on a cache miss**. Its failure mode is a *silent successful fetch* — the boundary breaks and the run still goes green, which is strictly worse than a red run. It looks like the same control and is the opposite one. |
| `--prefer-online`, `--no-offline`, or an omitted flag | **PROHIBITED.** | Same failure mode, less disguised. |

**Permitted fallback, if `--offline` against the npm cache cannot be
satisfied.** [RECOMMENDATION] A fallback is permitted **only** if it preserves
every boundary. It must be:

- **an entirely local, consumer-specific dependency source or store**, prepared
  **from already-available local material** — nothing newly obtained;
- **no registry access**, of any kind, at any step;
- **no use of the checkout's `node_modules` as the installed package's runtime
  resolution source** — that would void the isolation §10.1 requires;
- **no `NODE_PATH`, no linking, and no source-tree fallback.**

A fallback that fails any one of these is not a fallback; it is the phase
routing around its own gate. **If no boundary-preserving option exists, the
correct outcome is that PR-4 does not run.**

[FUTURE] Whether the cache is already sufficient today is **unknown to this
memo and is not assumed** — establishing it requires inspecting the local cache,
which is implementation work for the PR-4 entry gate (§16.2), not a claim this
documentation PR makes. **This PR runs none of these commands** (§18).

---

## 10. Clean-install validation plan

[RECOMMENDATION] A temporary-consumer procedure. **None of it runs in this
PR.**

### 10.1 The consumer

- Create a temporary directory **outside the repository** — never inside the
  checkout, never inside a worktree.
- Install **only the locally produced artifact** (§9 step 4). No registry
  fetch (§9.1), literal `--offline` posture, and only after the §9.2 closure
  gate passes.
- **The repository checkout must not be the runtime source.** No `npm link`,
  no relative path into the checkout, no `NODE_PATH` pointing back at it, no
  source-tree fallback.
- Confirm no reliance on undeclared source-tree-relative files.

#### 10.1.1 What consumer isolation does and does not prove (B-1)

**This is the correction that matters most in this memo, because the intuitive
reading is wrong.** Isolation is **necessary but not sufficient**, and the two
must not be conflated:

**Necessary — isolation prevents checkout contamination.** [RECOMMENDATION] If
the consumer can reach the checkout's `node_modules`, the run is void. It would
not be testing the artifact at all; it would be testing the artifact plus the
development tree that happens to sit next to it, including `typescript`, `tsx`,
`vitest`, and every other package a consumer will never have (T-9). **Isolation
is non-negotiable for that reason** — it makes the run a test *of the artifact*.

**Not sufficient — isolation does not expose an undeclared direct dependency.**
[INFERENCE] A normal consumer installation may reproduce dependency hoisting.
The consumer installs this package; this package declares
`@modelcontextprotocol/sdk`; [FACT] the SDK declares `"zod": "^3.25 || ^4.0"`
(`node_modules/@modelcontextprotocol/sdk/package.json:118`). A package manager
is free to hoist that transitive `zod` to the consumer's top-level
`node_modules`, where Node's resolution algorithm — walking up from
`node_modules/stocktrends-mcp-server/dist/tools/index.js` — will find it. **The
undeclared import then resolves, the server starts, the handshake completes,
and every §10.3 check goes green while the dependency contract is still
incomplete.**

**Therefore:**

- **Successful installed-package module resolution cannot prove
  dependency-contract completeness.** It proves that *this* consumer tree, at
  *this* moment, happened to contain a package this package never declared. It
  says nothing about the contract, and a contract is what a consumer relies on.
- **A green PR-4 is fully consistent with B-1 still being present.** This is
  not a hypothetical concern about the harness; it is the expected outcome of a
  correctly-built isolated consumer.
- **A red PR-4 would also be consistent with B-1** — if the tree happened not to
  hoist. Either result is consistent with the defect, which is precisely what
  makes the observation uninformative here.

**This memo therefore claims neither outcome.** [INFERENCE] It does **not**
assert that a consumer installation will pass, and it does **not** assert it
will fail. Hoisting layout is a package-manager behavior this PR is forbidden
to execute (§1, §18), so any prediction would be an inference dressed as
evidence. **The architecture deliberately does not depend on which occurs.**

**What settles B-1 instead: §7.7 / V-26, statically and offline.** The
dependency contract is a *declaration* claim, so it is checked against the
*declaration* — compiled bare specifiers versus declared runtime
`dependencies` — with no install, no resolution, and no tree to get lucky in.
[RECOMMENDATION] §7.7 explicitly treats successful transitive resolution or
hoisting as **irrelevant** to the check, for exactly the reason above.

**What PR-4 still contributes to B-1.** Not nothing, but not proof: a **failed**
resolution in the isolated consumer would be *additional* confirming evidence,
and PR-4 must report the observed layout (whether `zod` was hoisted into the
consumer, and at what version) as **recorded evidence**. That record is
useful — [FACT] the SDK's `^3.25 || ^4.0` range against code compiled and tested
at `zod` 4.4.3 (§4.5) means the resolved version is worth knowing. It is not a
completeness verdict, and PR-4 must not report it as one.

### 10.2 The launch

- Launch the **installed package executable** over local stdio — via the
  installed `bin`, not by pathing to a `.js` file. Invoking the file directly
  would bypass the shim/symlink and **silently skip the B-5 failure mode**,
  which is the single most important thing this step exists to detect.
- **Default/free mode only**: no API key; no paid execution; no x402 mode
  (relay, challenge, or live); no `STOCKTRENDS_*` variable set.
- Confirm clean startup **and** clean shutdown.

### 10.3 What the harness must confirm

| Check | Expected |
| --- | --- |
| Tool surface | exactly `stocktrends_estimate_workflow_cost` (§8) |
| Paid tools | all nine absent |
| Prompts | capability **undefined** (§8.1) |
| Resources | exactly the ten URIs of §8 |
| API key | none read |
| Stock Trends API request | **none** |
| x402 request | **none** |
| External network request | **none**, across the named window only: startup, `initialize`, tool listing, resource listing, shutdown (§8.2) |
| Tool invocation | **none.** `callTool` is prohibited — the one default/free tool fetches (`src/tools/index.ts:124-131`, §8.2) |
| Resource read | **none.** `readResource` is prohibited — resources are fetch-on-request (`README.md:362`, §8.2) |
| Dev-dependency reliance | none — the consumer has no `typescript`, `tsx`, or `vitest` |
| Consumer dependency layout | **recorded, not graded** — report whether `zod` was hoisted into the consumer and at what version (§10.1.1). **Evidence only; not a B-1 verdict** |
| Startup/shutdown | clean; non-silent |

**Silent-success trap.** [INFERENCE] Because B-5's failure mode is *exit 0 with
no output*, the harness must not treat "the process did not error" as success.
It must require a **completed MCP initialize handshake and a positive tool/
resource listing** over stdio. A harness that only checks the exit code would
report a passing result for a completely non-functional package.

**Green-run trap (B-1).** [INFERENCE] The mirror-image error, and the one this
memo's review caught: the harness must **not** treat a green run as evidence
that the dependency contract is complete. Every row above can pass with B-1
still present (§10.1.1). **PR-4 does not settle B-1; §7.7 / V-26 does.** The
PR-4 report must state this explicitly rather than let a wall of green imply
otherwise.

### 10.4 Harness choice

[RECOMMENDATION] **Do not use MCP Inspector as the sole validation mechanism**
— it is interactive, it is a downloaded tool ([ROADMAP] `README.md:180`
already positions it as a diagnostic reference, "not the only, or the primary,
installation path"), and §18 forbids downloading it here.

Prefer a **deterministic local stdio harness** using the SDK client already
present in the repository's dependencies (the same `Client` used at
`tests/helpers.ts:1`), driving `StdioClientTransport` against the installed
bin. This reuses a dependency the repository already has, requires no
download, and produces a machine-checkable transcript.

[INFERENCE] Note the deliberate difference from the existing suite: the
existing tests use `InMemoryTransport` **in-process against `src`**
(`tests/helpers.ts:26`). The harness must use a **stdio transport against a
separate installed process**. That difference is the entire point — it is what
makes the evidence new (§3.1).

[FUTURE] Whether the harness lives as a temporary throwaway consumer or as a
reviewed repository script is an implementation detail for PR-4, subject to
§7's rule that it must never ship in the artifact (X-6).

---

## 11. Checkout-installation compatibility

[ROADMAP] The checkout path is today's only supported channel (`README.md:51`).

**This memo does not deprecate it.** [RECOMMENDATION] The phase must
demonstrate that **checkout installation remains supported alongside package
installation**:

- `git clone` + `npm install` + `npm run build` + local stdio launch of
  `dist/server.js` must continue to work exactly as `README.md:44-49`
  documents;
- the seven hardcoded `<absolute-path-to-checkout>/dist/server.js` client
  configurations (§4.6) must continue to work unchanged;
- `npm start`, `npm run dev`, `npm test`, `npm run typecheck`, and
  `npm run build` must continue to work.

[INFERENCE] This is a **live regression risk, not a theoretical one**: the most
likely remedy for B-2 is adding a `files` field, and the most likely remedy for
B-3 is adding a `prepare` script. A `prepare` script runs on `npm install` in a
checkout — so a change made to fix packaging could alter the checkout
developer experience. PR-2 must therefore verify the checkout path explicitly
rather than assuming metadata changes are inert.

**Any future deprecation, replacement, or migration of the checkout path
requires a separately reviewed versioning and migration decision** and is
explicitly out of scope here. No silent break is permitted.

---

## 12. Documentation and discoverability refresh

[RECOMMENDATION] Refreshed **only in PR-5**, only after an artifact is actually
validated. **Nothing in §12 is refreshed by this PR**, other than the single
README documentation-index link.

**The refresh invalidates the artifact it was justified by, so PR-5 does not end
here.** [FACT] `README.md` ships inside the artifact (§7.1 I-3), so the moment
PR-5 rewrites it, PR-3's packed artifact and PR-4's validated artifact both
contain a **superseded** README. **PR-5's §13.1 tail step closes that loop** —
final repack, closed-allowlist comparison, secret/forbidden-content scans,
verification that the **refreshed** README is the one inside the artifact, a
minimal installed-bin handshake, and cleanup (V-28). The phase cannot close on
an artifact carrying documentation the repository has already replaced.

| Material | Required correction | Driver |
| --- | --- | --- |
| `README.md` install instructions (`:44-51`) | Add the validated local-package path; **retain** the checkout path (§11); correct "There is no npm package" only insofar as it remains true — a locally validated artifact is **still not a published package** | B-13 |
| `README.md` client configs (`:81, :92, :114, :135, :145, :158, :168`, plus the Windows path note at `:98`) | Seven hardcoded checkout-relative paths; a package install changes the launch shape to a bin name | §4.6 |
| `package.json` metadata | `repository`, `homepage`, `bugs`, `engines`, `author`, `description`, `files`, license coherence | B-4, B-6, B-7, B-9, B-10 |
| `PHASE5E_DIRECTORY_METADATA_READINESS.md` | §5 `"payment_rails": "none"` is stale post-5F; §5 `"install"` string; §2 license/identity; §10 stale filename | B-11, B-12 |
| `PHASE5E_LAUNCH_RELEASE_CHECKLIST.md` | Package-artifact steps | §13 PR-5 |
| `PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md` | Certifies the checkout channel; a package channel is new evidence | §13 PR-5 |
| `SECURITY_MODEL.md` | Only **where necessary** — a package artifact introduces a distribution/supply-chain surface the model does not currently address | T-1, T-18 |

### 12.1 Claims the refreshed material must keep distinct

[RECOMMENDATION] These nine statements are **separate** and must never be
collapsed. Conflating any two of them would overstate the project's posture:

1. **repository checkout available** — true today;
2. **local package artifact validated** — true only after PR-4 passes;
3. **package not yet externally published** — remains true throughout this
   phase, without exception;
4. **API-key paid execution** — a separate existing posture;
5. **x402 challenge-only capability** — default-off, challenge-validation-only;
6. **no transaction-complete x402** — no proof, payment, settlement, or paid
   output ([ROADMAP] closure memo §2);
7. **no remote MCP**;
8. **no marketplace submission**;
9. **no investment advice**.

[FACT] Distinction 2-vs-3 is the one most likely to be fumbled, and
`PHASE5E_DIRECTORY_METADATA_READINESS.md` §9 already forbids the error:
no listing may claim "npm/registry publication or packaged availability —
unless and until an actual, separately reviewed publication step has occurred."
**A validated local artifact is not packaged availability.** Refreshed copy
must not imply a consumer can install from a registry.

Distinction 5-vs-6 is the second trap: post-5F, the honest statement is
neither "no payment rails" (stale, per B-11) nor "x402 supported" (overstated,
per T-20) — it is **challenge-validation-only, default-off, no payment or
spend**.

---

## 13. Implementation PR decomposition

[RECOMMENDATION] Narrow, sequential, individually reviewable. **Publication is
never combined with package validation.**

Legend for the four authorization columns: **Owner** = owner input required;
**Net** = external network authorization required; **Live** = live Stock
Trends authorization required; **Pub** = publication authority required.

### PR-0 — Narrow defect corrections (B-1 leg **mandatory**; B-5 leg conditional)

**This PR has two legs, and they are not in the same state (§6).**

**Leg A — B-1 (mandatory).**

- **Purpose:** Record and implement the **minimal** correction to the
  undeclared direct runtime dependency (§4.5, §6 B-1).
- **Mandatory:** **This leg is required before any package artifact work
  begins** (§16.1 gate 9). B-1's existence is **not conditional** — the
  imports, the omission, and the resulting contract incompleteness are
  repository fact. **What separate review decides is only the exact form of the
  narrow correction, not whether one is needed.**
- **[INFERENCE], not a decision:** the remedy is *likely* metadata-only —
  declaring the dependency the compiled code already imports — which would
  leave the Phase 5F runtime literally untouched. **This memo does not
  implement that, does not predetermine it, and does not bind PR-0's review to
  it** (§2, §6). PR-0 may reach a different minimal remedy; it may not skip the
  leg.
- **Expected files:** `package.json`, if the review lands on the metadata
  remedy; a defect record. Any other file requires the review to justify it.

**Leg B — B-5 (conditional, empirical).**

- **Purpose:** Correct the bin launch guard **if, and only if,** PR-4's
  installed-bin validation or separate review establishes necessity (§6 B-5).
- **Conditional:** B-5's failure mechanism is [INFERENCE] (§4.3). If the
  evidence does not establish a defect, **this leg does not happen** and
  nothing is changed.
- **Expected files:** possibly `src/server.ts`; a defect record.
- **Timing note:** this leg's trigger is downstream evidence, so it may land
  after PR-4 rather than before PR-2. That is expected and is not a sequencing
  violation — only Leg A gates the artifact work.

**Both legs:**

- **Checks:** full suite, focused suite, typecheck, build — all must remain
  green at their current counts (§19); capability-neutrality argued explicitly;
  **V-26 (§7.7) must be green after Leg A lands**, and that is the check that
  actually demonstrates B-1 is closed — not any install or launch (§10.1.1).
- **Capability changes:** **none permitted.** No tool, resource, prompt, route,
  or behavior change.
- **Non-goals:** any change beyond the minimum the defect review establishes;
  any packaging work; implementing either correction on **this** memo's
  authority (§2).
- **Owner:** No · **Net:** No · **Live:** No · **Pub:** No
- **Note:** This PR exists because §2 forbids changing the Phase 5F runtime on
  this memo's authority. **Leg A is owner-free, offline, and
  capability-neutral, so it may proceed before the license decision** (§13
  sequencing). The phase cannot complete while B-1 stands (§6).

### PR-1 — Package and license decision record

- **Purpose:** Record the [OWNER] license decision (§5.4) and the package
  identity decisions (§17 D-1..D-4) and implement them.
- **Expected files:** a decision record; a license artifact **only if the owner
  directs one**; `package.json` license/author fields to match.
- **Checks:** repository/metadata license consistency; no other metadata drift.
- **Capability changes:** none.
- **Non-goals:** artifact contents; packing; installing; any legal advice.
- **Owner:** **Yes — blocking** · **Net:** No · **Live:** No · **Pub:** No

### PR-2 — Package metadata and closed artifact allowlist

- **Purpose:** Implement §7's closed contract and the metadata fields
  (B-6, B-7, B-9, B-10) — the file-selection mechanism and manifest. Implement
  the **owner-approved publication-safety posture** (T-23) and, if not deferred
  to PR-3, the **static dependency-contract check** (§7.7).
- **Expected files:** `package.json`; possibly `.npmignore`; the §7.7 check if
  implemented here.
- **Checks:** full/focused suites, typecheck, build green; **checkout-path
  regression explicitly verified** (§11 — a `prepare` script would change
  `npm install` behavior in a checkout); **V-26** static dependency-contract
  completeness green (§7.7) if implemented here; **V-27** publication-safety
  posture present and reviewed (T-23); **V-7** declares a reviewed Node range
  consistent with runtime dependencies, with the evidence scope of §7.5
  respected — declaring a range is not evidence for it.
- **Capability changes:** none.
- **Non-goals:** producing an artifact; installing; publishing; **selecting the
  `private`/`publishConfig` posture** — that is the owner's (D-4). PR-2
  implements and reviews the owner's selection; it does not make it.
- **Owner:** **Yes** (§17 D-4..D-8 must be settled first) · **Net:** No ·
  **Live:** No · **Pub:** No

### PR-3 — Offline pack and artifact-content validation

- **Purpose:** Execute §9. **Settle B-2 empirically** via `npm pack --dry-run`
  before trusting PR-2's metadata; then produce and scan a local artifact.
  Implement the **static dependency-contract check** (§7.7) if PR-2 did not.
- **Expected files:** a validation report recording the exact file list,
  checksum, size, and source commit. **No `*.tgz` committed** (X-12).
- **Checks:** actual contents vs the §7.1 closed allowlist, failing closed on
  any extra path (§7.4); secret/`.env`/fixture/memo scans over the **unpacked**
  artifact; artifact-to-Git-source correspondence; **V-26** static
  dependency-contract completeness green against the artifact's compiled output
  (§7.7) — **statically, with no install and no resolution**; `package-lock.json`
  absent from the artifact (X-14).
- **Capability changes:** none.
- **Non-goals:** installing; launching; publishing.
- **Owner:** No · **Net:** **No — offline posture required** (§9.1) ·
  **Live:** No · **Pub:** **No — `npm publish` prohibited**

### PR-4 — Clean temporary installation and default/free stdio validation

- **Purpose:** Execute §10. Install the artifact into a temporary consumer,
  launch the installed **bin**, validate the §8 surface. **Settle B-5 by
  observation.**
- **Entry gates — PR-4 does not start until both hold** (§16.2):
  - **[OWNER] D-11 is decided** (§17.2) — cross-platform evidence scope. This
    determines *what PR-4 must produce*, so it cannot be answered afterward.
  - **The §9.2 offline dependency-closure gate passes** — the local cache
    already contains the complete closure, verified offline. **Cache
    insufficiency fails closed and PR-4 does not run.** Literal `--offline`
    only; **`--prefer-offline` is prohibited** (§9.2).
- **Expected files:** a validation report; the harness (never shipped, X-6).
- **Checks:** §10.3 in full, including the §10.3 silent-success trap, the
  §10.3 green-run trap, and the §8.1 capability-based prompt assertion;
  temporary consumer and artifact removed afterward.
- **Must name before executing:** the **process-level network-observation
  mechanism** (§8.2) — named and justified **in advance**, consistent with §18
  (no downloaded tooling, no network), and able to distinguish "no request was
  made" from "a request was made and failed."
- **Must not do:** invoke `callTool` on `stocktrends_estimate_workflow_cost` or
  `readResource` on any of the ten URIs. **Both fetch** (§8.2,
  `src/tools/index.ts:124-131`, `README.md:362`). The validated window is
  startup → `initialize` → list tools → list resources → shutdown, and nothing
  beyond it.
- **Does not settle B-1.** [INFERENCE] A green PR-4 is fully consistent with
  B-1 still present, because a consumer install may hoist `zod` and resolve the
  undeclared import (§10.1.1). PR-4 **records** the observed consumer layout as
  evidence; **V-26 / §7.7 is what settles B-1**, statically. The PR-4 report
  must say so rather than let green rows imply completeness.
- **Node-version scope:** record the **exact host Node version used**. It is
  evidence for that version only (§7.5); PR-4 may not claim the declared range
  is validated.
- **Capability changes:** none.
- **Non-goals:** publishing; any paid, x402, or live request; MCP Inspector as
  sole mechanism.
- **Owner:** **Yes — D-11 blocking, before PR-4 runs** (§17.2) · **Net:** **No**
  · **Live:** **No** · **Pub:** No

### PR-5 — Documentation and discoverability refresh

- **Purpose:** Execute §12, only after PR-4 passes. **Then close the
  README/artifact loop with a final revalidation tail step** (§13.1).
- **Expected files:** `README.md`; `PHASE5E_DIRECTORY_METADATA_READINESS.md`;
  `PHASE5E_LAUNCH_RELEASE_CHECKLIST.md`;
  `PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md`; `SECURITY_MODEL.md` where
  necessary; a **final revalidation record** (§13.1). **No `*.tgz` committed**
  (X-12).
- **Checks:** every §12.1 distinction preserved; no publication or packaged-
  availability claim; no x402 overstatement (T-20); **V-28 green** — the §13.1
  tail step.
- **Capability changes:** none.
- **Non-goals:** publishing; submitting; claiming availability; **any change to
  the package's file-selection mechanism or metadata** — if the tail step
  reveals one is needed, that is a PR-2 change and a re-run, not a PR-5 edit.
- **Owner:** No · **Net:** No · **Live:** No · **Pub:** No

#### 13.1 PR-5 tail step — final artifact revalidation (blocking, V-28)

**The problem this closes.** [FACT] `README.md` is on the artifact's inclusion
allowlist (§7.1 I-3), and PR-5 rewrites it (§12). But PR-3 packed and PR-4
validated the artifact **before** PR-5 ran. **The validated artifact therefore
contains the pre-refresh README** — the one with seven hardcoded
`<absolute-path-to-checkout>/dist/server.js` paths (§4.6) describing a checkout
the consumer does not have. Without this step the phase would close on an
artifact carrying **superseded consumer documentation**, having validated a
tarball that no longer corresponds to the repository's own documentation set.

**The fix: PR-5 does not end at the doc edit.** [RECOMMENDATION] After the
final documentation refresh, and as the **tail of PR-5**, re-run a narrow
revalidation. This is deliberately placed here — the PR that invalidates the
artifact is the PR that re-establishes it, rather than leaving PR-6 to discover
the gap.

Required, in order:

1. **A final local repack** — from the clean normal checkout at the recorded
   post-refresh commit, offline, `npm pack` only (§9.1). **Never `npm
   publish`** (T-23).
2. **The closed artifact-allowlist comparison** — actual contents vs §7.1,
   failing closed on any path outside I-1..I-5 (§7.4). The same closed
   contract, not a lighter variant.
3. **Secret and forbidden-content scans** over the **unpacked** artifact —
   §7.2 X-1..X-14, scanning contents rather than the manifest (§9 step 7).
4. **Verification that the refreshed README is the one inside the artifact** —
   not merely that *a* `README.md` is present. Compare the packed README
   against the refreshed working-tree file; **a stale-but-present README fails
   this step**, which is the entire point of it.
5. **A minimal installed-bin stdio handshake and default/free surface
   confirmation** — install the final artifact into a fresh temporary consumer
   (§10.1, §9.2 `--offline`), launch the installed **bin** (§10.2), and confirm
   a completed `initialize` handshake plus the **1 tool / 10 resources / 0
   prompts** surface (§8, §8.1). **Minimal by design:** this re-establishes
   that the repacked artifact still works; it does not re-run PR-4 in full, and
   the §8.2 boundary still binds — **no `callTool`, no `readResource`.**
6. **Cleanup of the final validation artifact and consumer** — tarball,
   unpacked directory, and temporary consumer all removed; `git status` clean
   of `*.tgz` and unpacked output (X-12, §9 steps 10-11, V-19).

**Scope discipline.** [RECOMMENDATION] This is a **narrow re-confirmation of a
changed artifact**, not a second full validation phase and not an architecture
redesign. It requires **no external publication**, no new authorization, and no
platform beyond the one D-11 scoped (§17.2). If step 4 or 5 fails, the phase
does not close — but the remedy is to fix the cause and re-run the tail step,
not to widen the phase.

### PR-6 — Package-readiness closure and publication handoff

- **Purpose:** Record the readiness report and hand off to a later, separately
  authorized publication decision.
- **Expected files:** a closure/readiness memo.
- **Checks:** every §15 BLOCKING row green; every §16 gate satisfied.
  Specifically: **V-26** (B-1 closed statically, not by a green install);
  **V-27** (publication-safety posture in place); **V-28** (the **final**
  post-refresh artifact revalidated per §13.1 — the readiness claim attaches to
  **that** artifact, not to PR-3's now-superseded one); **D-11's scope
  honoured** — the readiness claim's platform scope must match the evidence
  actually produced (§17.2), so Windows-only evidence yields an explicitly
  Windows-scoped claim and nothing broader.
- **Capability changes:** none.
- **Non-goals:** **publication itself, in any form**; re-opening decisions
  settled in PR-1..PR-5; widening any claim beyond its evidence.
- **Owner:** **Yes** — accepts the readiness report · **Net:** No ·
  **Live:** No · **Pub:** **No — and the handoff explicitly does not grant it**

### 13.2 Sequencing and gates

**Order.** PR-0 Leg A (**mandatory**) → PR-1 → PR-2 → PR-3 → PR-4 → PR-5
(including its §13.1 tail step) → PR-6. PR-0 Leg B is conditional and, if
triggered at all, lands when PR-4's evidence establishes necessity.

```text
PR-0 Leg A   mandatory B-1 defect correction        owner-free, offline,
             (+ PR-0 Leg B if PR-4 later            capability-neutral
              establishes B-5 necessity)            -- may precede PR-1
   |
   v
PR-1         owner package/license decision   <-- GATES EVERYTHING BELOW
   |
   v
PR-2         package metadata + closed allowlist + publication-safety posture
   |
   v
PR-3         offline pack + artifact-content validation
   |
   v
PR-4         installed-package validation      <-- entry gates: D-11 decided,
   |                                               §9.2 offline closure passes
   v
PR-5         documentation refresh
   |         + §13.1 tail: final repack, allowlist, scans,
   |           refreshed-README-in-artifact, minimal bin handshake, cleanup
   v
PR-6         final package-readiness closure
```

**What gates what — precisely:**

- **PR-0 Leg A may proceed before the license decision.** Its correction is
  **owner-free, offline, and capability-neutral** (§13 PR-0): it declares a
  dependency the compiled code already imports. It touches no license material,
  produces no artifact, and asks the owner nothing. **Nothing about an
  unresolved license posture is implicated by fixing a dependency
  declaration**, so blocking it behind PR-1 would delay a mandatory correction
  for no reason.
- **PR-1 gates PR-2 and everything downstream of it** — all package artifact,
  installation, documentation-distribution, readiness, and publication-handoff
  work. The phase must not route around an unresolved license (§5.4).
- **The controlling rule: the phase must not produce or validate a
  distributable artifact while the license posture remains unresolved.** That
  is what PR-1 protects, and it is why the gate sits exactly at PR-2 — the
  first PR that shapes what a distributable artifact would contain — rather
  than at PR-0, which produces nothing distributable.
- **PR-3 gates PR-4** — no install without a validated artifact.
- **PR-4 gates PR-5** — no refreshed claims without evidence.
- **PR-5, including its §13.1 tail step, gates PR-6** — the readiness report
  attaches to the **final** revalidated artifact (V-28), not to the superseded
  one PR-3 packed.

**This supersedes the earlier "PR-1 gates everything" formulation**, which
contradicted PR-0's own authorization row (**Owner: No**) and would have made a
mandatory, owner-free defect correction wait on an owner decision it has
nothing to do with.

---

## 14. Threat model

[RECOMMENDATION] Each threat: failure mode → fail-closed mitigation →
validation evidence → blocking.

| # | Threat | Failure mode | Fail-closed mitigation | Evidence | Blocks? |
| --- | --- | --- | --- | --- | --- |
| **T-1** | Accidental secret inclusion | A credential ships to every consumer and cannot be recalled | Closed allowlist (§7.1); scan the **unpacked** artifact | PR-3 scan | **Yes** |
| **T-2** | `.env` / local config inclusion | Operator-local config leaks | X-2; allowlist excludes by default even if `.env` exists locally at pack time | PR-3 file list | **Yes** |
| **T-3** | Captured challenge/paid-data inclusion | Paid or challenge values distributed | X-3; none present today ([ROADMAP] closure memo §5) | PR-3 scan | **Yes** |
| **T-4** | Source maps expose unintended material | Maps reference source the artifact does not ship | X-4 exclude (§7.3) | PR-3 file list | **Yes** if included unintentionally |
| **T-5** | Test fixtures included | `tests/**` ships | X-6 | PR-3 file list | **Yes** |
| **T-6** | Internal memos included | 80 internal phase memos ship in a distributed artifact | X-7 exclude (§7.3) | PR-3 file list | **Yes** if unintentional |
| **T-7** | Incorrect `bin` path | Installed command missing or dangling (**B-2**) | `npm pack --dry-run` settles the file list **before** metadata is trusted; allowlist requires the bin target present | PR-3 + PR-4 | **Yes** |
| **T-8** | **Undeclared direct runtime dependency** | **B-1 — `zod` undeclared**; shipped code directly imports a package the contract never declares, leaving the consumer relying on a transitive copy this package neither declares nor version-constrains (SDK range `^3.25 \|\| ^4.0` vs code compiled at 4.4.3) | **Primary, and the only one that actually detects this: the §7.7 static dependency-contract check (V-26)** — compiled bare specifiers vs declared runtime `dependencies`, statically and offline, treating hoisting and successful resolution as **irrelevant**. **Secondary, and explicitly not sufficient:** consumer isolation with no access to the checkout's `node_modules` (§10.1) — **necessary to prevent checkout contamination, but it cannot expose this threat**, since a normal consumer install may hoist the transitive copy and resolve the import successfully (§10.1.1). Plus PR-0 Leg A, the **mandatory** correction (§13). | **PR-2/PR-3 static check (V-26)** — *not* the PR-4 launch, which can pass with the defect present. PR-4 contributes the recorded consumer layout as evidence only. | **Yes** |
| **T-9** | Runtime reliance on a dev dependency | Consumer lacks `typescript`/`tsx`/`vitest` | Consumer installs only the artifact + declared deps | PR-4 | **Yes** |
| **T-10** | Lifecycle-script side effects | A script runs arbitrary work on consumer install | **None exist today** (§4.1) — preserve that; if PR-2 adds `prepare`, confirm it does not run on consumer install of a packed artifact | PR-2 + PR-4 | **Yes** |
| **T-11** | Install-time network execution | Consumer install reaches the network | No `preinstall`/`install`/`postinstall` (§4.1); confirm none added | PR-2 review | **Yes** |
| **T-12** | Environment-dependent output | Artifact varies by machine | Pack from clean checkout at a recorded commit; record checksum (§9) | PR-3 | **Yes** |
| **T-13** | Platform-specific path assumptions | **B-5** — bin launches on Windows, silently no-ops on POSIX | Launch via the installed **bin**, not a file path (§10.2); require a completed handshake, not exit 0 (§10.3) | PR-4 | **Yes** |
| **T-14** | Validation passes on one platform only | Windows-only evidence masks a POSIX-broken artifact (B-5); or the readiness claim silently outruns the platform actually validated | **[OWNER] D-11, decided *before* PR-4 runs** (§17.2, §16.2) — Windows-only with an **explicitly Windows-scoped** claim, or Windows + POSIX evidence. Either is acceptable; **a claim broader than the evidence is not** (PR-6) | PR-4 — scope fixed in advance, claim checked at PR-6 | **Yes** — the *decision* gates PR-4; the *scope* binds the claim |
| **T-15** | Stale version/metadata | `SERVER_VERSION` (B-8) drifts from `package.json`; description stale (B-9) | Consistency check across manifest, `src/server.ts:19`, and the artifact | PR-2 + PR-3 | **Yes** for the artifact's own consistency |
| **T-16** | Package-name confusion or squatting | The name resolves to someone else's package, or is unavailable | **Cannot be assessed without a registry query, which is prohibited** (§9.1). **Deferred to publication planning under separate authorization** (§17 D-10) | — | **No** — deferred, not dismissed |
| **T-17** | Artifact drift from Git-reviewed source | Artifact contains code never reviewed | Pack from a clean checkout at a recorded commit; confirm no untracked/modified source contributed (§9 step 9) | PR-3 | **Yes** |
| **T-18** | Temporary artifact retention | `*.tgz`/unpacked output committed or left behind | X-12; §9 steps 10-11; §10 cleanup | PR-3 + PR-4 | **Yes** |
| **T-19** | Validation accidentally invokes live API behavior | A "clean install test" makes a real Stock Trends request | Default/free only; no key; no x402 flag; **process-level** no-network evidence (§8.2) — the harness cannot inject `fetchFn` into a separate process | PR-4 | **Yes** |
| **T-20** | Discoverability copy overstates x402/payment | A listing implies payment capability that does not exist | §12.1 distinctions 5/6; [ROADMAP] `PHASE5E_DIRECTORY_METADATA_READINESS.md` §9 forbidden claims | PR-5 | **Yes** |
| **T-21** | License inconsistency | Artifact asserts terms it cannot evidence (**B-4**) | §5; PR-1 gates the phase | PR-1 | **Yes** |
| **T-22** | Worktree content leaks | Auxiliary worktree content packs | X-10; pack only from the normal clean checkout (§9 step 1) | PR-3 | **Yes** |
| **T-23** | **Accidental or premature publication** | An unintended `npm publish` — or any equivalent release action — pushes this package to a registry **during a phase whose entire purpose is local validation**. The failure is **irreversible or hard to reverse**: an unpublish window is narrow, mirrors and caches persist, and a name, once taken, is taken. Worse, it would distribute the artifact **before the evidence for it exists** — before the license posture is resolved (B-4, D-1), before metadata is reviewed (B-6, B-7, B-9, B-10), before the closed allowlist is verified (§7.4), and before any readiness report. The realistic trigger is not malice but **muscle memory or an errant flag**: this phase runs `npm pack` repeatedly, and `pack` and `publish` are one word apart. | **Four layers, all fail-closed:** **(1)** an **[OWNER]-approved safety posture** in the manifest for the duration of this local-validation phase — `private: true` or an appropriate `publishConfig` publication restriction (**[OWNER] D-4 selects which**; §17.1); **(2)** **no publication lifecycle script** — [FACT] no lifecycle script of any kind exists today (§4.1: no `prepublishOnly`, `prepack`, `postpack`, `prepare`), and **no script may perform, trigger, or facilitate publication**, since a lifecycle hook is exactly how an unintended publish fires without anyone typing it. **`prepublishOnly` is prohibited outright** — it exists only to run on publish. **Narrow exception, reconciled with B-3:** a **build-only** `prepare` (§11 — the likely B-3 remedy) is permitted, because building is not publishing; but PR-2 must confirm it **only builds**, invokes no publish/registry command, and does not run on a consumer's install of a packed artifact (T-10); **(3)** **`npm publish` is explicitly prohibited, unconditionally** (§9.1, §18, §20) — no flag, no dry run, no exception; **(4)** **the selected protection is reviewed during the metadata PR** (PR-2), not assumed. | **PR-2 — V-27** | **Yes** |

---

## 15. Validation matrix

[RECOMMENDATION] Failure classes: **BLOCKING** (phase cannot complete) ·
**OWNER** (needs an owner decision) · **ADVISORY** (record, do not block).

| # | Check | Method | Expected | Failure class | Blocks? | PR |
| --- | --- | --- | --- | --- | --- | --- |
| V-1 | Package metadata consistency | Manifest inspection | identity/version/repo/engine/entry coherent | BLOCKING | Yes | PR-2/PR-3 |
| V-2 | License consistency | Repo + manifest comparison | metadata and license artifact agree | BLOCKING | Yes | PR-1 |
| V-3 | Expected artifact files | Unpacked list vs §7.1 allowlist | every I-1..I-5 path present | BLOCKING | Yes | PR-3 |
| V-4 | Forbidden artifact files | Unpacked list vs §7.2 | zero X-1..X-13 paths; **fail closed on any unlisted path** | BLOCKING | Yes | PR-3 |
| V-5 | Executable presence | Artifact inspection | bin target present **with its 12 siblings** (§4.3) | BLOCKING | Yes | PR-3 |
| V-6 | Executable permissions / shim | Installed consumer inspection | bin invocable on the target platform | BLOCKING | Yes | PR-4 |
| V-7 | Node engine **declaration** | Declared range vs SDK `>=18` (§4.5) | a **reviewed** range is declared and is consistent with what runtime dependencies require. **Scope:** declaring a range is not evidence for it — validation on one host Node version proves only that version; any broader support claim requires a defined matrix or an explicitly scoped claim (§7.5) | BLOCKING | Yes | PR-2 |
| V-8 | **Consumer isolation integrity** — *not* dependency completeness (**see V-26**) | Temporary consumer inspection (§10.1) | the consumer **cannot reach the checkout's `node_modules`**; no `npm link`, no `NODE_PATH`, no source-tree fallback; every module the installed code loads resolves from the **consumer's own tree**. **Records** whether `zod` was hoisted, and at what version, as evidence. **A pass here does not establish dependency-contract completeness** — a normal install may hoist and resolve the undeclared import (§10.1.1) | BLOCKING | Yes | PR-4 |
| V-9 | Clean local install | Temporary consumer (§10.1) | installs from local artifact only, no fetch | BLOCKING | Yes | PR-4 |
| V-10 | Installed executable launch | Launch installed **bin** over stdio | **completed MCP handshake** — not merely exit 0 (§10.3) | BLOCKING | Yes | PR-4 |
| V-11 | Default/free tool surface | Harness `listTools` | exactly `stocktrends_estimate_workflow_cost`; nine paid absent | BLOCKING | Yes | PR-4 |
| V-12 | Resource surface | Harness `listResources` | exactly the ten URIs of §8 | BLOCKING | Yes | PR-4 |
| V-13 | Prompt surface | **Capability check** (§8.1) | prompts capability **undefined** | BLOCKING | Yes | PR-4 |
| V-14 | No API-key access | Env absent + process observation | no key read | BLOCKING | Yes | PR-4 |
| V-15 | No external request | **Process-level** observation (§8.2) | zero outbound requests | BLOCKING | Yes | PR-4 |
| V-16 | No paid execution | Config + observation | no paid request; no auth header | BLOCKING | Yes | PR-4 |
| V-17 | No x402 request | Flags unset + observation | no x402 request | BLOCKING | Yes | PR-4 |
| V-18 | Checkout-path regression | Full checkout flow (§11) | clone/install/build/launch unaffected | BLOCKING | Yes | PR-2 |
| V-19 | Artifact cleanup | Filesystem + `git status` | no `*.tgz`, unpacked dir, or consumer retained | BLOCKING | Yes | PR-3/PR-4 |
| V-20 | Documentation accuracy | Review vs §12.1 | all nine distinctions preserved | BLOCKING | Yes | PR-5 |
| V-21 | Artifact-to-source correspondence | Commit + checksum (§9 steps 8-9) | artifact traces to reviewed source | BLOCKING | Yes | PR-3 |
| V-22 | Suite/typecheck/build green | Existing commands | 474/474; 945/945 across 16 files; green | BLOCKING | Yes | every PR |
| V-23 | Package-name availability | **Registry query — PROHIBITED** (§9.1) | **not assessed in this phase** | OWNER | No | deferred (D-10) |
| V-24 | Cross-platform install evidence | Per **D-11 — which must be decided *before* PR-4 runs** (§17.2, §16.2) | per the owner's decision, and one of exactly two shapes: **(a)** Windows-only evidence accepted, with the readiness claim **explicitly scoped to Windows**; or **(b)** Windows **plus** POSIX (macOS/Linux) evidence required before phase completion. **The claim may never exceed the evidence produced** | OWNER | **Yes** — the *decision* gates PR-4; the resulting *scope* binds PR-6's claim | PR-4 |
| V-25 | Artifact size/category | Size + file count (§7.6) | only I-1..I-5 categories; size consistent with compiled output | ADVISORY | No | PR-3 |
| **V-26** | **Dependency-contract completeness — the check that settles B-1** | **Static** inspection of all compiled `dist/**/*.js` (§7.7): extract every bare specifier; classify and remove Node builtins **including `node:` specifiers**; resolve each remainder to its package name; require it in this package's declared runtime `dependencies`. **No install, no resolution, no `node_modules`, offline** | **zero undeclared direct runtime imports.** `devDependencies` do not satisfy it; a transitive dependency does not satisfy a direct import; **successful hoisting or transitive resolution is irrelevant to the verdict**. General by construction — **not hard-coded to `zod`** | BLOCKING | Yes | PR-2/PR-3 |
| **V-27** | **Publication-safety posture** (T-23) | Manifest review (§4.1, §17.1 D-4) | an **owner-approved** protection is present for this phase — `private: true` or an appropriate `publishConfig` restriction; **no script performs, triggers, or facilitates publication**; **`prepublishOnly` absent**; any `prepare` is **build-only** and reviewed (T-10, §11); `npm publish` prohibited unconditionally. **This memo does not select the posture** — PR-2 reviews the owner's selection | BLOCKING | Yes | PR-2 |
| **V-28** | **Final post-refresh artifact revalidation** (§13.1) | PR-5 tail step: final local repack → closed-allowlist comparison → secret/forbidden-content scans over the unpacked artifact → **refreshed-README-in-artifact verification** → minimal installed-bin stdio handshake + default/free surface → cleanup | the artifact that closes the phase contains the **refreshed** README, not the superseded one; zero paths outside I-1..I-5; zero forbidden content; a **completed** handshake with the 1-tool/10-resource/0-prompt surface; **no `callTool`, no `readResource`** (§8.2); tarball, unpacked dir, and consumer all removed | BLOCKING | Yes | PR-5 tail |

---

## 16. Implementation entry gates

### 16.1 Before implementation begins

[RECOMMENDATION] All must hold:

1. **This architecture memo is reviewed and merged.**
2. **Phase 5F closure is merged.** [FACT] Satisfied — `main` includes `cb2ee91`
   "Close Phase 5F x402 challenge validation (#81)".
3. **Clean `main`.**
4. **Typecheck, focused tests, full tests, and build are green** at 474/474 and
   945/945 across 16 files (§19).
5. **Package identity is confirmed** ([OWNER] D-1..D-4).
6. **The license decision is resolved, or split into an explicit owner-decision
   PR** (PR-1). **PR-2 and everything downstream must not proceed with B-4
   open** — the phase must not produce or validate a distributable artifact
   while the license posture is unresolved (§13.2). **PR-0 Leg A is exempt**:
   it is owner-free, offline, capability-neutral, and produces nothing
   distributable.
7. **The exact package-content contract is approved** (§7; [OWNER] D-5..D-8).
8. **No external publication authority is assumed** — none exists (§20).
9. **PR-0 Leg A — the mandatory B-1 correction — has landed, and V-26 (§7.7) is
   green.** [RECOMMENDATION] **This gate is not conditional.** B-1 is a
   confirmed defect (§6); package artifact work must not begin on a package
   whose dependency contract is known to be incomplete. Only the *form* of the
   correction was ever open.
10. **An owner-approved publication-safety posture is in place** (T-23, V-27),
    and **no script performs, triggers, or facilitates publication** — a
    build-only `prepare` remains permitted (§11, T-10, T-23).

### 16.2 Before PR-4 runs

[RECOMMENDATION] Both must additionally hold. **Neither may be resolved
retroactively by watching PR-4 succeed:**

1. **[OWNER] D-11 is decided** (§17.2) — Windows-only evidence with an
   explicitly Windows-scoped claim, **or** Windows plus POSIX/macOS/Linux
   evidence before phase completion. This determines *what PR-4 must produce*,
   so it must be answered first. **This memo does not silently require access
   to another platform** — the owner may scope the evidence, and the claim then
   follows the scope (V-24).
2. **The §9.2 offline dependency-closure gate passes** — the local npm cache
   already contains the complete dependency closure for the isolated consumer
   installation, **verified offline**. **Cache insufficiency fails closed and
   PR-4 does not run.** Literal `--offline` is the permitted posture;
   **`--prefer-offline` is prohibited** (it may use the network on a cache
   miss). No registry access, and no silent acquisition of missing packages.

---

## 17. Owner decisions

**This memo makes none of these.** They are listed so they are decided
deliberately rather than by default — which is precisely how the current
`ISC`/`""`/`1.0.0` values arrived (§4.1).

### 17.1 Required before implementation

| ID | Decision | Why it cannot be defaulted |
| --- | --- | --- |
| **D-1** | **License** (§5.4) — intended license or explicit proprietary/unlicensed posture; named copyright holder and year; which side changes to match | The current value is an unreviewed scaffold default that the documentation set explicitly disclaims. Distribution makes it consequential. |
| **D-2** | **Package name** — retain `stocktrends-mcp-server`? | Identity for any future publication. Availability **cannot be checked** without a prohibited registry query (D-10). |
| **D-3** | **Package scope/namespace** — unscoped, or a scope (e.g. an org namespace)? | Affects identity and any future publication target. |
| **D-4** | **Public vs private package intent** | Determines whether `private: true` or a `publishConfig` restriction is the correct **safety** posture during this phase — the mitigation for **accidental or premature publication** (§14 **T-23**, V-27). This memo does **not** choose the posture; PR-2 implements and reviews the owner's selection. |
| **D-5** | **Source-map inclusion** (X-4) | [RECOMMENDATION] exclude (§7.3). |
| **D-6** | **Type-declaration inclusion** (I-5) | [RECOMMENDATION] include, **or** exclude *and* drop `types` — the incoherent option is excluding while keeping `types` (§7.3). |
| **D-7** | **Source-file inclusion** (X-5) | [RECOMMENDATION] exclude. |
| **D-8** | **Package documentation set / whether internal memos belong in the artifact** (I-3, X-7) | [RECOMMENDATION] README only; exclude the 80 internal memos (§7.3). |

### 17.2 Required before PR-4

| ID | Decision | Why it must be decided now, not deferred |
| --- | --- | --- |
| **D-11** | **Cross-platform installed-bin evidence scope.** The owner must decide **which** of exactly two postures applies: **(a)** **Windows-only validation is accepted**, and the phase's readiness claim is **explicitly scoped to Windows** — no POSIX/macOS/Linux claim is made or implied; or **(b)** **Windows plus POSIX (macOS/Linux) evidence is required** before phase completion. | **This decision determines what PR-4 must produce, so PR-4 cannot start without it** (§16.2, V-24). It was previously filed under "deferred until publication planning," which was wrong: publication planning happens *after* the evidence is gathered, so deferring the decision would mean PR-4 runs without knowing its own scope — and the phase would then discover at PR-6 that its evidence does not match its claim. [FACT] The pressure is real, not theoretical: B-5's failure mechanism is **platform-asymmetric** (§4.3, §6, T-14) — a Windows shim and a POSIX symlink resolve `argv[1]` differently, so **Windows-only evidence can pass while the artifact is broken for POSIX consumers**. **This memo does not silently require access to another platform.** Posture (a) is fully legitimate; what is **not** legitimate is producing Windows-only evidence and then claiming more than Windows (§12.1, PR-6). The owner scopes the evidence; the claim follows the scope. |

### 17.3 Recommended by this architecture (owner may override)

| ID | Recommendation |
| --- | --- |
| **D-9** | **Versioning policy** — [RECOMMENDATION] a deliberate policy, plus a mechanism preventing `src/server.ts:19` from drifting from `package.json:3` (B-8, T-15). This memo does not select a scheme. |

### 17.4 Deferred until publication planning

| ID | Decision | Why deferred |
| --- | --- | --- |
| **D-10** | **Publication target** (registry, scope, access) — and the **package-name availability** question (T-16, V-23) | Determining availability requires a registry query, which is prohibited in this phase (§9.1). **Actual publication remains deferred regardless** (§20). Naming a target is not authorizing a publish. |
| **D-12** | **Directory/marketplace submission** | Explicitly out of scope ([ROADMAP] closure memo §12 non-goals). |

**D-11 is no longer in this category.** It moved to §17.2 (required before PR-4)
because cross-platform evidence is an **input** to PR-4's design, not an output
of publication planning.

---

## 18. No-network and no-live policy

[RECOMMENDATION] The recommended phase must remain executable **without any**
of: Stock Trends API calls · package-registry queries · package publication ·
Git fetch · GitHub queries · AWS or deployment queries · MCP Inspector
downloads · API keys · proof · payment · spend.

Offline alternatives for commands that might otherwise reach a registry are
specified in §9.1. Where an offline invocation cannot be satisfied locally, the
phase **fails closed** rather than fetching.

**This memo authorizes no external activity of any kind.** [ROADMAP] The
closure memo §14 records the live authorization state as
`CONSUMED — no further live action authorized`, and §12 confirms "No x402 live
authorization is needed or permitted for this recommended phase."

---

## 19. Offline validation of this documentation PR

[FACT] This PR changes exactly two files:

- `docs/PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md` (new);
- `README.md` (exactly one documentation-index link added; no other text
  changed).

Validation performed for this PR: `git status --short --branch`,
`git diff --check`, `git diff --name-only`, `git diff --stat`,
`npm run typecheck`, `npm test -- tests/x402Relay.test.ts`, `npm test`,
`npm run build`. Expected: focused suite 474/474; full suite 945/945 across 16
files; typecheck and build green; no conflict markers; no secrets or
credential-shaped values; **no package artifact, tarball, unpacked package,
temporary consumer, or generated package manifest exists**; no reusable live
authorization exists; no external network action occurred.

---

## 20. Decision record

| Field | Determination |
| --- | --- |
| **Recommended phase status** | `RECOMMENDED FOR IMPLEMENTATION AFTER ARCHITECTURE REVIEW — LOCAL PACKAGE VALIDATION ONLY; NO PUBLICATION AUTHORIZED` |
| **Architecture boundary** | Build the existing local stdio server into a reviewed **local** package artifact, install it into a clean temporary consumer, launch its executable, and validate the default/free MCP surface from the installed artifact. The Stock Trends API remains the data and analytical authority; the MCP remains a thin local stdio adapter; API-key paid execution remains a separate posture; x402 remains challenge-validation-only and default-off. No proof, payment, wallet, signing, settlement, paid output, or spend. No remote/hosted MCP. No registry publication. No marketplace or directory submission. No live Stock Trends request. No autonomous paid execution. No investment advice. |
| **Implementation sequence** | **PR-0 Leg A — the mandatory B-1 defect correction** (owner-free, offline, capability-neutral; **may precede PR-1**) → PR-1 (**owner package/license decision — gates PR-2 and everything downstream**) → PR-2 (package metadata + closed allowlist + publication-safety posture) → PR-3 (offline pack + artifact-content validation) → PR-4 (installed-package validation; **entry gates: D-11 decided, §9.2 offline closure passes**) → PR-5 (documentation refresh **+ the §13.1 final-revalidation tail step**) → PR-6 (final package-readiness closure). **PR-0 Leg B (B-5) is conditional and empirical** — it happens only if PR-4's evidence or separate review establishes necessity, and may therefore land after PR-4. The phase must not produce or validate a distributable artifact while the license posture is unresolved. Publication is never combined with validation. |
| **Owner decisions required** | **Before implementation:** D-1 license (**blocking**), D-2 name, D-3 scope, D-4 public/private intent (**also the T-23 publication-safety posture**), D-5 source maps, D-6 type declarations, D-7 source files, D-8 documentation set/internal memos. **Before PR-4:** **D-11 cross-platform installed-bin evidence scope** — Windows-only with an explicitly Windows-scoped claim, or Windows + POSIX evidence (**moved out of "deferred"; PR-4 cannot start without it**). **Recommended:** D-9 versioning. **Deferred until publication planning:** D-10 publication target + name availability, D-12 marketplace submission. |
| **Live/network authorization state** | **NONE. No live or external authorization exists or is requested.** The Phase 5F live authorization is [ROADMAP] `CONSUMED`. The phase is designed to complete fully offline. |
| **Publication state** | **NOT AUTHORIZED, NOT PERFORMED, NOT REQUESTED.** A validated local artifact is **not** packaged availability and must never be described as such (§12.1). |
| **Completion evidence required** | Every §15 BLOCKING row green: reviewed metadata; repository/package license consistency; **dependency-contract completeness established statically and offline (V-26) — not inferred from a green install**; owner-approved publication-safety posture with no publication lifecycle script (V-27); closed allowlist with zero forbidden content; deterministic local artifact traceable to reviewed Git source; **offline dependency closure verified before PR-4 (§9.2)**; clean install without a checkout; successful installed-bin stdio launch with a **completed handshake**; the exact 1-tool / 10-resource / 0-prompt default/free surface; no external, paid, or x402 request across the named startup→shutdown window, **with no tool invoked and no resource read** (§8.2); preserved checkout path; refreshed documentation; **the final post-refresh artifact revalidated with the refreshed README verified inside it (V-28)**; a readiness claim whose platform scope matches D-11's evidence; approved readiness report. |
| **Known blockers at entry** | **B-1** undeclared direct runtime dependency `zod` — a **confirmed** defect affecting the default/free path; **its correction (PR-0 Leg A) is mandatory before package artifact work, and it is settled statically (V-26), not by installing and launching**; **B-2** artifact entry points may not ship; **B-3** no build hook; **B-4** license inconsistency; **B-5** untested bin launch guard with platform asymmetry — a **candidate** defect, corrected only if evidence establishes necessity; **B-6** no `engines`; **B-7** missing repository metadata; **B-10** empty `author`; **B-11** x402-stale directory metadata; **B-13** no packaging evidence exists. None is corrected in this PR. |
| **Handoff after completion** | A reviewed package-readiness report hands the verified artifact to a **later, separately authorized** publication/submission decision. Completion of this phase grants **no** publication authority, no marketplace authority, no remote-MCP authority, and no live or paid authority. |

---

**Reminder.** This memo is architecture and planning only. It implements
nothing, corrects nothing, publishes nothing, submits nothing, installs
nothing, packs nothing, calls no API, uses no key, spends nothing, and
approves nothing beyond its own review. Every recommendation above remains a
recommendation until separately reviewed and merged.
