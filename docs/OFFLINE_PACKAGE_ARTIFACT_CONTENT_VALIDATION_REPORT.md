# Offline Pack and Artifact-Content Validation Report

Date: 2026-07-16

**Decision classification:**

`ARTIFACT MEASURED AND CONTENT-VALIDATED OFFLINE — B-2 SETTLED FOR THIS SOURCE COMMIT; NO INSTALL, NO LAUNCH, NO PUBLICATION`

This document records **PR-3** of
[`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md)
§13: offline pack and artifact-content validation.

**This PR measured an artifact. It did not install one, launch one, or publish
one.** It produced exactly one temporary local package artifact outside the
repository, measured it, compared it against the reviewed closed contract, and
destroyed it. No `*.tgz` is committed and none remains anywhere.

This PR performed **no** package installation, installed-bin launch, MCP stdio
handshake, temporary consumer, MCP Inspector session, `npm publish`, registry
query, package-name availability check, live Stock Trends API call, x402 canary,
Git fetch, GitHub query, AWS/deployment query, or external network request of any
kind. It used no API key, proof, payment material, or spend.

---

## 1. Purpose and governing authority

**Purpose.** Execute the architecture memo's §9 build-and-pack plan: settle
**B-2** empirically by measurement before PR-2's metadata is trusted, then
produce, unpack, and scan one local artifact against the §7.1 closed allowlist,
failing closed on any path outside it.

**Authority.** This PR executes decisions recorded elsewhere; it originates none:

| Input | Source |
| --- | --- |
| Build-and-pack plan; offline posture; fail-closed principle | [`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md) §9, §9.1, §7.4 |
| Closed inclusion allowlist (I-1..I-5) and exclusion categories (X-1..X-14) | Architecture memo §7.1, §7.2 |
| Package-content owner decisions (D-5..D-8) | [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md) §10 |
| `private: true` publication-safety posture (D-4) | [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md) §8 — **verified here, not re-decided** |
| Reviewed manifest contract and four-entry `files` allowlist | [`PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md`](PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md) §7, §9 |
| Runtime dependency contract | [`PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md`](PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md) — **preserved, not re-derived** |
| Phase boundary; `CONSUMED` live-authorization state | [`PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md`](PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md) §12, §14 |

---

## 2. Explicit local-pack authorization boundary

This PR was authorized for **exactly two** local npm pack operations and one
temporary local artifact outside the repository:

| Authorized | Performed |
| --- | --- |
| One local `npm pack --dry-run`, strict offline, no scripts | **Yes — exactly once** |
| One local `npm pack`, strict offline, no scripts, external destination | **Yes — exactly once** |
| One temporary local `.tgz` outside the repository | **Yes — created, measured, destroyed** |

**Not authorized, and not performed:** package installation; installed-bin
launch; publication; registry query; network access; Stock Trends API call.

No third pack ran. No pack was re-run to "confirm" a result. No offline flag was
weakened, removed, or substituted with `--prefer-offline`, and no network
fallback was permitted or attempted.

---

## 3. Source branch and commit

| Field | Value |
| --- | --- |
| Branch | `test/offline-package-artifact-validation` |
| Full source commit | `d1dc9d9f63c480a0871ea9de491bc6aabb6cfe36` |
| Short source commit | `d1dc9d9` |
| Commit subject | Define package metadata and artifact allowlist (#86) |
| Working copy | Normal attached checkout — no auxiliary worktree, no detached HEAD |

HEAD includes `d1dc9d9` (#86), `55733ea` (#85), and `0788068` (#84). No remote
Git fetch or query occurred; branch and commit were read locally.

---

## 4. Date, platform, and toolchain

| Field | Value |
| --- | --- |
| Date | 2026-07-16 |
| Operating system | Microsoft Windows 11 Home, 10.0.26200 |
| Architecture | AMD64 |
| Node | **v22.23.1** |
| npm | **10.9.8** |
| Archive tool | bsdtar 3.8.4 / libarchive 3.8.4 (`C:\windows\system32\tar.exe`) — OS-provided, not downloaded |
| Package | `stocktrends-mcp-server@1.0.0` |

**Evidence scope.** These measurements are evidence about this host and this
toolchain. Consistent with architecture memo §7.5, declaring `engines.node >=18`
is not evidence for that range, and nothing here validates any other Node version
or platform.

---

## 5. Clean-source and clean-build preconditions

All verified before any package command ran:

| Precondition | Result |
| --- | --- |
| Active branch exactly `test/offline-package-artifact-validation` | **PASS** |
| Normal attached checkout (not a worktree/detached HEAD) | **PASS** |
| `git status --porcelain` empty | **PASS** — clean |
| No uncommitted work; no staged file | **PASS** |
| HEAD includes #86, #85, #84 | **PASS** |
| No `*.tgz` anywhere in the repository | **PASS** — 0 |
| No prior unpacked-package directory or temporary consumer | **PASS** — none |
| `private` is boolean `true` | **PASS** |
| Reviewed four-entry `files` allowlist present | **PASS** |
| No `.npmignore` anywhere in the repository tree | **PASS** — none |
| No `.npmrc` | **PASS** — none |
| No lifecycle or publication script | **PASS** — the seven script keys are `build`, `dev`, `start`, `test`, `typecheck`, `check:runtime-deps`, `check:package-metadata`; none is a lifecycle hook |
| No `publishConfig` | **PASS** |

**Stale build output eliminated.** The ignored `dist/` directory (51 files) was
removed before building. `git clean` was **not** run. `dist/` is untracked
(`git ls-files dist` → 0 entries) and ignored at `.gitignore:2`, so its removal
left the tree clean.

### 5.1 Command-order reconciliation — recorded, not waived

The prescribed baseline order runs `npm test` **before** `npm run build`. That
order cannot hold once `dist/` is removed:
[`tests/runtimeDependencyContract.test.ts`](../tests/runtimeDependencyContract.test.ts)
case 15 asserts against **this repository's actual built `dist/`** output. With
`dist/` removed, `analyzeRuntimeDependencyContract` throws `MissingDistError`
(`scripts/check-runtime-dependency-contract.mjs:84`), causing case 15 to fail
before making its intended dependency-contract assertion. (Case 14 is the
separate, focused fixture test that already exercises the missing-dist throw
directly, against a temporary directory rather than the repository's real
`dist/`.) Running the suites against a removed `dist/` would have produced a
**false red** unrelated to the artifact.

**Resolution.** The fresh explicit build was run immediately after `dist/`
removal — this is PR-2's §13 ordered-build requirement and this
PR's own step 2 — and **every prescribed command then ran in the prescribed
order**. The order's own `npm run build` was verified **byte-idempotent**: SHA-256
of all 51 `dist/` files before and after the second build are identical, so the
`dist/` the suites ran against is byte-identical to the `dist/` that was packed.
Nothing was skipped and no expected count was relaxed.

---

## 6. Exact commands used

Build and baseline, in the order run:

```text
Remove-Item -Recurse -Force dist          # ignored build output only; no `git clean`
npm run build                             # fresh explicit build (ordered-build requirement)
npm run typecheck
npm test -- tests/packageMetadata.test.ts
npm test -- tests/runtimeDependencyContract.test.ts
npm test
npm run build                             # verified byte-idempotent against the fresh build
npm run check:runtime-deps
npm run check:package-metadata
node scripts/check-package-metadata.mjs
npm test -- tests/x402Relay.test.ts
```

The two authorized pack operations, verbatim:

```text
npm pack . --dry-run --json --ignore-scripts --offline
npm pack . --json --ignore-scripts --offline --pack-destination <TEMPORARY_ROOT>
```

Archive inspection (OS tooling; no `npm install`):

```text
tar -tvf <artifact>.tgz          # listing
tar -xf  <artifact>.tgz -C <TEMPORARY_ROOT>/unpacked
```

`<TEMPORARY_ROOT>` was a uniquely named directory under the operating-system
temporary directory, outside the repository. Its machine-specific absolute path
is deliberately not retained here; it no longer exists (§28).

**Flag discipline.** Every pack invocation carried `--offline` (fails closed on a
cache miss rather than fetching) and `--ignore-scripts`. `--prefer-offline` was
never used. `npm publish`, `npm view`, `npm search`, and `npm info` were never
run in any form.

---

## 7. Baseline tests and exact counts

All green, all matching the expected current baseline:

| Check | Command | Result | Expected |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | **PASS** | pass |
| Package-metadata suite | `npm test -- tests/packageMetadata.test.ts` | **PASS — 67/67** | 67/67 |
| Dependency-contract suite | `npm test -- tests/runtimeDependencyContract.test.ts` | **PASS — 15/15** | 15/15 |
| Full suite | `npm test` | **PASS — 1027/1027 across 18 test files** | 1027/1027 across 18 |
| Build | `npm run build` | **PASS** | pass |
| Runtime dependency check | `npm run check:runtime-deps` | **PASS** — 17 compiled files scanned; discovered `@modelcontextprotocol/sdk`, `zod`; none undeclared | pass |
| Package-metadata check (script) | `npm run check:package-metadata` | **PASS** — 4-entry allowlist satisfied | pass |
| Package-metadata check (direct) | `node scripts/check-package-metadata.mjs` | **PASS** | pass |
| Relay suite | `npm test -- tests/x402Relay.test.ts` | **PASS — 474/474** | 474/474 |

Counts were read from actual output, not assumed.

---

## 8. Fresh build output counts

Measured after the fresh explicit build, not assumed:

| Category | Count |
| --- | --- |
| `dist/**/*.js` | **17** |
| `dist/**/*.d.ts` | **17** |
| `dist/**/*.js.map` | **17** |
| Any other extension or category | **0** |
| **Total files under `dist/`** | **51** |

The 17 `.js.map` files exist on disk and are **deliberately excluded** from the
artifact by the reviewed allowlist (X-4 / D-5). Their presence in `dist/` and
absence from the artifact is the exact behavior the extension-narrowed globs
(`dist/**/*.js`, `dist/**/*.d.ts`) exist to produce.

---

## 9. Exact reviewed artifact contract

**Closed allowlist.** The normalized artifact may contain only:

| # | Category | Contents | Architecture ID |
| --- | --- | --- | --- |
| 1 | Package manifest | `package.json` | I-2 |
| 2 | Consumer documentation | `README.md` | I-3 |
| 3 | License artifact | `LICENSE` | I-4 |
| 4 | Compiled runtime JavaScript | every required `dist/**/*.js` | I-1 |
| 5 | Type declarations | every required `dist/**/*.d.ts` | I-5 |

**Everything else is excluded and fails closed**, specifically: `dist/**/*.js.map`
and any other source map; `src/**`; `docs/**`; `tests/**`; `scripts/**`; `.env`;
`.env.*`; `.npmrc`; `.npmignore`; `.gitignore`; `package-lock.json`; TypeScript
configuration; Vitest configuration; worktree content; `.claude/**`; `.codex/**`;
`.agents/**`; `node_modules/**`; `.git/**`; logs; coverage; temporary files;
another tarball; unpacked-package directories; fixtures; internal phase or
architecture memos.

**Expected exact file set**, constructed from the reviewed contract against the
freshly built output: `package.json` + `README.md` + `LICENSE` + 17 `dist/**/*.js`
+ 17 `dist/**/*.d.ts` = **37 paths**.

**Archive-prefix normalization.** The npm tar archive prefixes every entry with
`package/`. That single prefix was stripped before comparison. No other
normalization was applied.

---

## 10. Dry-run result

| Field | Value |
| --- | --- |
| Command | `npm pack . --dry-run --json --ignore-scripts --offline` |
| Exit code | **0** |
| stderr | **empty** — no notice, no registry request, no offline fallback |
| JSON parses | **PASS** |
| Package results returned | **exactly 1** |
| `id` | `stocktrends-mcp-server@1.0.0` |
| `name` / `version` | `stocktrends-mcp-server` / `1.0.0` |
| `filename` | `stocktrends-mcp-server-1.0.0.tgz` |
| `entryCount` | **37** |
| `files[]` length | **37** |
| `size` | 112325 |
| `unpackedSize` | 541631 |
| `shasum` | `a1be199d40d4a9b945c3e05485be7f8c1cca354f` |
| `integrity` | `sha512-1yvZwlcBBTRnz9DEPntHNlIxsAEM6t2+vyTZD/sXmtL/WiKKpcRD4lccH+g1ARUaiODkNW60gOENRb+UpWdraQ==` |
| `bundled` | empty |

**Dry-run gate — every condition met before the real pack was permitted:**

| Gate | Result |
| --- | --- |
| Exit zero; JSON parses; exactly one package result | **PASS** |
| Reported identity correct | **PASS** |
| Reported file list == reviewed closed contract | **PASS** — exactly equal, 37 paths |
| Every entry point present | **PASS** — `dist/server.js`, `dist/server.d.ts`, `package.json`, `README.md`, `LICENSE` |
| No prohibited path | **PASS** — 0 |
| No source map | **PASS** — 0 |
| Metadata internally coherent | **PASS** — `entryCount` == `files[].length` == 37; Σ`files[].size` == `unpackedSize` (541631); `size` > 0; `unpackedSize` > `size`; `bundled` empty |
| No duplicate path, case-only ambiguity, traversal, absolute or backslash path | **PASS** — 0 each |

---

## 11. Complete normalized dry-run file list

37 paths, sorted, `package/` prefix normalized:

```text
dist/config.d.ts
dist/config.js
dist/errors.d.ts
dist/errors.js
dist/instrumentResolver.d.ts
dist/instrumentResolver.js
dist/logging.d.ts
dist/logging.js
dist/paidPolicy.d.ts
dist/paidPolicy.js
dist/paidPricing.d.ts
dist/paidPricing.js
dist/redaction.d.ts
dist/redaction.js
dist/resources/index.d.ts
dist/resources/index.js
dist/server.d.ts
dist/server.js
dist/stocktrendsClient.d.ts
dist/stocktrendsClient.js
dist/tools/index.d.ts
dist/tools/index.js
dist/tools/indicatorsTools.d.ts
dist/tools/indicatorsTools.js
dist/tools/marketContextTools.d.ts
dist/tools/marketContextTools.js
dist/tools/selectionsTools.d.ts
dist/tools/selectionsTools.js
dist/tools/stimTools.d.ts
dist/tools/stimTools.js
dist/tools/x402Tools.d.ts
dist/tools/x402Tools.js
dist/x402Relay.d.ts
dist/x402Relay.js
LICENSE
package.json
README.md
```

---

## 12. Actual-pack result

| Field | Value |
| --- | --- |
| Command | `npm pack . --json --ignore-scripts --offline --pack-destination <TEMPORARY_ROOT>` |
| Exit code | **0** |
| stderr | **empty** — no registry request |
| Package results returned | **exactly 1** |
| Tarball created under the temporary root only | **PASS** |
| Tarball created in the repository | **None** — 0 `*.tgz` anywhere in the repository, verified immediately after |
| Lifecycle script run | **None** — `--ignore-scripts`; none exists to run |
| Registry request | **None** |
| Second confirming pack | **Not run** |

Every npm-reported field is identical to the dry run — `entryCount` 37, `size`
112325, `unpackedSize` 541631, `shasum`, and `integrity` all equal. The dry run
predicted the artifact exactly.

---

## 13. Complete normalized real-pack file list

**37 paths — identical to the §11 dry-run list, set-equal with zero differences.**
The full enumeration is §11; it is not duplicated here because the two sets were
verified exactly equal by comparison, not by inspection.

---

## 14. Tar-listing comparison

`tar -tvf` reported **37 entries**, normalized from the `package/` prefix:

| Check | Result |
| --- | --- |
| Entry count | **37** |
| Entry types | **37/37 regular files** (mode `-rw-r--r--`) |
| Directory entries in the archive | **0** — none emitted |
| Symlink, hardlink, device, or other unexpected entry type | **0** |
| Tar-listing set vs real-pack set | **PASS — exactly equal** |
| Timestamps | All normalized to a fixed epoch (1985-10-26), npm's deterministic-pack behavior — supports T-12 |

**Recorded for PR-4, not concluded here:** the packed `dist/server.js` carries
mode `0644` with **no execute bit**. Whether the installed `bin` is invocable is
**V-6**, an installed-consumer check that belongs to PR-4 (§27). This report
records the observed archive mode as evidence and draws no conclusion from it.

---

## 15. Unpacked-filesystem comparison

The archive was unpacked with OS `tar` into a fresh directory under the temporary
root. **`npm install` was not used.**

| Check | Result |
| --- | --- |
| Extraction exit code | **0** |
| Unpacked root | exactly one directory, `package/` |
| Files on disk | **37** |
| Directories materialized | `dist`, `dist/resources`, `dist/tools` — implied by file paths; ignored for path comparison per the contract |
| Symlink / junction / reparse points | **0** |
| Unpacked-filesystem set vs tar-listing set | **PASS — exactly equal** |

Directory entries were ignored only when comparing **file paths**. No unexpected
file was ignored.

---

## 16. Exact four-way set-equality result

All four normalized path sets are **exactly equal at 37 paths**:

| Comparison | Result |
| --- | --- |
| dry-run JSON ↔ real-pack JSON | **PASS — equal (37)** |
| real-pack JSON ↔ tar listing | **PASS — equal (37)** |
| tar listing ↔ unpacked filesystem | **PASS — equal (37)** |
| unpacked filesystem ↔ dry-run JSON | **PASS — equal (37)** |

**Closed-allowlist comparison — expected set vs each observed set:**

| Comparison | Result |
| --- | --- |
| expected ↔ dry-run | **PASS — equal (37)** |
| expected ↔ real-pack | **PASS — equal (37)** |
| expected ↔ tar listing | **PASS — equal (37)** |
| expected ↔ unpacked filesystem | **PASS — equal (37)** |

**Fail-closed structural checks over the unpacked filesystem:**

| Check | Count | Result |
| --- | --- | --- |
| Missing file | 0 | PASS |
| Extra file | 0 | PASS |
| Duplicate path | 0 | PASS |
| Case-only path ambiguity | 0 | PASS |
| Path traversal | 0 | PASS |
| Absolute path | 0 | PASS |
| Backslash / non-normalized archive path | 0 | PASS |
| Unsupported file type | 0 | PASS |
| Symlink or unexpected link entry | 0 | PASS |
| Unexpected directory payload | 0 | PASS |

**Category breakdown of the 37:** 17 `dist/**/*.js` + 17 `dist/**/*.d.ts` +
`package.json` + `README.md` + `LICENSE`. **Uncategorized: 0.** Every path falls
inside I-1..I-5.

---

## 17. Artifact identity, size, and checksums

| Field | Value |
| --- | --- |
| Filename | `stocktrends-mcp-server-1.0.0.tgz` |
| Source commit | `d1dc9d9f63c480a0871ea9de491bc6aabb6cfe36` |
| Byte size (measured independently) | **112325** |
| npm-reported `size` | 112325 — **matches measured bytes** |
| **SHA-256 (computed independently)** | **`4DF06DEBFDFACC386753DED7FB6A7172224193CEC7545B63AFF3699E8AC3FC3D`** |
| npm-reported `shasum` (SHA-1) | `a1be199d40d4a9b945c3e05485be7f8c1cca354f` — **independently reproduced** |
| npm-reported `integrity` | `sha512-1yvZwlcBBTRnz9DEPntHNlIxsAEM6t2+vyTZD/sXmtL/WiKKpcRD4lccH+g1ARUaiODkNW60gOENRb+UpWdraQ==` — **independently reproduced** |
| Packed size | 112325 |
| Unpacked size | 541631 |
| File count | **37** |

The artifact was **not renamed** after hashing. npm's `shasum` and `integrity`
were each recomputed from the tarball bytes and matched exactly, so npm's
reported values are corroborated rather than trusted.

**These are checksums of a locally generated artifact built from public reviewed
code. They are validation evidence, not credentials.**

---

## 18. Exact package metadata extracted from the unpacked manifest

Read from the **unpacked artifact's** `package.json`, not the repository's:

| Field | Artifact value | Required | Result |
| --- | --- | --- | --- |
| `name` | `stocktrends-mcp-server` | exact | **PASS** |
| `version` | `1.0.0` | exact | **PASS** |
| `description` | `Local stdio MCP adapter for Stock Trends public resources, workflow planning, and separately gated paid API tools.` | exact | **PASS** |
| `author` | `Stocktrends Publications` | exact | **PASS** |
| `license` | `MIT` | exact | **PASS** |
| `private` | `true` — **boolean**, `typeof === "boolean"` | boolean `true` | **PASS** |
| `type` | `module` | exact | **PASS** |
| `main` | `dist/server.js` | exact | **PASS** |
| `types` | `dist/server.d.ts` | exact | **PASS** |
| `bin` | `{"stocktrends-mcp-server":"dist/server.js"}` | exact | **PASS** |
| `engines` | `{"node":">=18"}` | exact | **PASS** |
| `repository` | `{"type":"git","url":"git+https://github.com/skotlander/stocktrends-mcp-server.git"}` | PR #86 | **PASS** |
| `homepage` | `https://github.com/skotlander/stocktrends-mcp-server#readme` | PR #86 | **PASS** |
| `bugs` | `{"url":"https://github.com/skotlander/stocktrends-mcp-server/issues"}` | PR #86 | **PASS** |
| `dependencies` | exactly 2: `@modelcontextprotocol/sdk` `^1.29.0`, `zod` `^4.4.3` | exact | **PASS** |
| `files` | exactly 4: `dist/**/*.js`, `dist/**/*.d.ts`, `README.md`, `LICENSE` | exact | **PASS** |
| `publishConfig` | **absent** | absent | **PASS** |
| Package scope | **none** (unscoped) | unscoped | **PASS** |

**The reviewed validator was run against the unpacked artifact's own manifest**
(`analyzePackageMetadata` from
[`scripts/check-package-metadata.mjs`](../scripts/check-package-metadata.mjs)):
**0 violations**. The artifact's manifest satisfies the full reviewed contract —
not merely the repository's copy of it.

**npm applied no transformation.** The artifact's `package.json` is
**byte-identical** to the repository's (1497 bytes both; SHA-256
`F36FDA59126C11EBC6CCD5B42756208D71CE9982E1F017F75C594199E70AE3E8`). No field was
added, removed, reordered, or rewritten. **No difference required adjudication or
waiver.**

---

## 19. Main / types / bin target-presence result

Verified against the **unpacked artifact's** file set:

| Manifest field | Declared target | Present in artifact |
| --- | --- | --- |
| `main` | `dist/server.js` | **PRESENT** |
| `types` | `dist/server.d.ts` | **PRESENT** |
| `bin["stocktrends-mcp-server"]` | `dist/server.js` | **PRESENT** |

**Result: PASS.** No entry point dangles. `dist/server.js` line 1 carries the
shebang `#!/usr/bin/env node` — shebang-correct in the packed artifact.

This is **artifact-content validation only**. The bin was not launched and the
artifact was not imported as an installed package.

---

## 20. Relative-import closure result

Every packed `dist/**/*.js` was parsed with the TypeScript compiler API via the
repository's reviewed extractor
([`scripts/check-runtime-dependency-contract.mjs`](../scripts/check-runtime-dependency-contract.mjs)),
covering static imports, side-effect imports, `export ... from` re-exports,
string-literal dynamic `import()`, and string-literal `require()`.

| Check | Result |
| --- | --- |
| Compiled `.js` scanned | **17** |
| Relative imports found | **43** |
| Unresolved relative imports | **0** |
| Every relative import resolves to another **packed** `.js` | **PASS** |
| `dist/server.js` direct relative dependencies | **12 — all present** |

The 12 siblings `dist/server.js` requires (`./config.js`, `./logging.js`,
`./paidPolicy.js`, `./paidPricing.js`, `./resources/index.js`,
`./stocktrendsClient.js`, `./tools/index.js`, `./tools/indicatorsTools.js`,
`./tools/marketContextTools.js`, `./tools/selectionsTools.js`,
`./tools/stimTools.js`, `./tools/x402Tools.js`) are all packed. This is exactly
architecture memo §4.3's requirement and closes B-2 candidate failure mode (b).

**V-26 against the artifact's own compiled output** — statically, with no install
and no resolution: discovered external packages are exactly
`@modelcontextprotocol/sdk` (first seen in `dist/errors.js`) and `zod` (first seen
in `dist/tools/index.js`); **both declared**; **0 undeclared direct runtime
imports**. `node:url` was classified as a builtin and excluded. `node_modules` was
never consulted.

---

## 21. Artifact-to-source byte-correspondence result

Every one of the 37 unpacked files was mapped to its repository file and both were
hashed with SHA-256.

| Result | Count |
| --- | --- |
| Files compared | **37** |
| **Byte-for-byte identical** | **37** |
| Mismatched | **0** |
| Source file missing | **0** |

| Group | Files | All match |
| --- | --- | --- |
| `dist/**/*.js` → freshly built repository `dist/**/*.js` | 17 | **Yes** |
| `dist/**/*.d.ts` → freshly built repository `dist/**/*.d.ts` | 17 | **Yes** |
| root (`package.json`, `README.md`, `LICENSE`) | 3 | **Yes** |

Mandatory mappings, explicitly:

| Artifact file | Repository file | SHA-256 | Match |
| --- | --- | --- | --- |
| `package.json` | `package.json` | `F36FDA59126C11EBC6CCD5B42756208D71CE9982E1F017F75C594199E70AE3E8` | **Yes** |
| `README.md` | `README.md` | `D59DF6DB4D9C06912EA9C8D2DDFDD7799725D6F23A1388A3CCAE41EB853270D7` | **Yes** |
| `LICENSE` | `LICENSE` | `44AA9B7D787EF8E41D0C23CBC46E75BE74F99F5D699832CD1FF02E8E88EE93F0` | **Yes** |
| `dist/server.js` | `dist/server.js` | `B31DDC805999DFA08BE1ECCAB883C98D19F56A1D65B3C9EF32FB07258F803777` | **Yes** |
| `dist/server.d.ts` | `dist/server.d.ts` | `348400208233DFEF33E5B27AA0852AE724B94D8FD9D17690851117BBD8052049` | **Yes** |

The complete 37-path file list is recorded in §11. The correspondence result is
grouped above because **all 37 hashes matched**; no file needed individual
adjudication.

**README hash timing.** The recorded `README.md` digest is the file as it stood
at pack time — from the clean `d1dc9d9` source tree, before this PR appended its
own documentation-index link in §29. Re-hashing the post-edit working-tree
`README.md` therefore produces a different digest by design. The recorded
`unpackedSize` of 541631 bytes likewise reflects the pack-time README.

**T-17 (artifact drift from reviewed source) is closed for this commit.** The
tree was clean at `d1dc9d9`, `dist/` was rebuilt from that exact source, the
build was verified byte-idempotent, and no untracked or modified source
contributed. **npm transformed nothing**, so no difference required a waiver.

---

## 22. Unpacked path/category scan results

Scanned over the **unpacked filesystem**, not npm's JSON output:

| Category | Hits | Result |
| --- | --- | --- |
| Source map (`*.map`) | 0 | **PASS** |
| TypeScript source (`*.ts` excluding `.d.ts`) | 0 | **PASS** |
| Internal docs / memo (`*.md` other than `README.md`) | 0 | **PASS** |
| Test or fixture file | 0 | **PASS** |
| Validator or script | 0 | **PASS** |
| `.env` / `.env.*` / local config / `.npmrc` / `.npmignore` / `.gitignore` | 0 | **PASS** |
| Lockfile (`package-lock.json`, shrinkwrap, `yarn.lock`, `pnpm-lock.yaml`) | 0 | **PASS** — X-14 confirmed by measurement |
| Build/test configuration (`tsconfig*`, `vitest*`) | 0 | **PASS** |
| VCS or worktree content (`.git`, `.codex`, `.claude`, `.agents`) | 0 | **PASS** |
| `node_modules` | 0 | **PASS** |
| Nested tarball / archive | 0 | **PASS** |
| Temporary file | 0 | **PASS** |
| Log or coverage data | 0 | **PASS** |
| Symlink, hard link, device, or other unexpected entry type | 0 | **PASS** |

**File-type inventory of the artifact:** 17 `.js`, 17 `.d.ts`, one `package.json`,
one `README.md`, one `LICENSE`. Nothing else.

---

## 23. Content-safety scan results

The artifact's text files were scanned for **actual sensitive material**. Every
category is clean. Three probes raised candidate hits; each was inspected and
adjudicated with evidence rather than waived. **No discovered value is reproduced
here.**

| Category | Result |
| --- | --- |
| Non-placeholder API key | **PASS — none** |
| Bearer token value | **PASS — none** |
| Private key material (PEM / OPENSSH / PGP) | **PASS — none** |
| Wallet seed, mnemonic, or signing material | **PASS — none** |
| Cloud credential (AWS key id / secret) | **PASS — none** |
| Password | **PASS — none** |
| Non-placeholder authorization header value | **PASS — none** |
| JWT / opaque token value | **PASS — none** |
| Retained production challenge payload | **PASS — none** |
| Retained proof / payment value | **PASS — none** |
| Captured paid API response | **PASS — none** |
| Fixture-only synthetic sentinel or test corpus | **PASS — none** |
| Local absolute path embedded unexpectedly | **PASS — none** |
| Machine username or home path embedded unexpectedly | **PASS — none** — 0 occurrences of the operator's username or home directory anywhere in the artifact |
| Temporary-root path | **PASS — none** |

### 23.1 Adjudicated candidates

Per architecture memo §7.2 X-1 and the phase's scanning rules, names and
placeholders must not be misclassified as secrets. Each candidate was resolved on
evidence:

| Candidate | Finding | Verdict |
| --- | --- | --- |
| `api_key` assigned a literal in four compiled tool modules | The **only** value ever assigned is the fixed fail-closed reason code `paid_auth_blocked_missing_api_key`, defined in reviewed source (`src/paidPolicy.ts` and four tool modules). It is a **safety error identifier**, not a credential. | **Not a secret** |
| A Windows path in `README.md` | Line 98's JSON-escaping note uses the generic placeholder `C:\Users\you\...`. Independent scans confirm **0 occurrences** of the operator's real username or home directory anywhere in the artifact. | **Documentation placeholder** |
| `STOCKTRENDS_API_KEY` with an assigned value in `README.md` | **All five** assignment sites — `:117` and `:171` (JSON), `:241` and `:253` (shell/PowerShell), `:348` (prose) — assign the literal placeholder `<your-api-key>`; 8 placeholder occurrences in total and **zero real keys**. `:241` and `:253` additionally carry an inline comment warning never to paste a real key. **Scan-coverage correction:** the initial regex required a quote immediately before the delimiter and therefore matched only the two shell forms; the JSON and prose forms were found by an explicit re-check and are recorded here rather than left to the narrower regex's count. | **Documentation placeholder** |
| `fixture` tokens in `dist/x402Relay.{js,d.ts}` | An **identifier**, not fixture data: the parameter and type name of the reviewed x402 **mock-mode runtime API** (`X402MockChallengeFixture`, `createMockX402ChallengeFixture`), present verbatim in reviewed source `src/x402Relay.ts`. Its challenge builder is composed **entirely of `<redacted-*>` symbolic placeholders** — no real amount, asset, address, nonce, challenge id, or correlation id. | **Symbolic x402 vocabulary; no captured value** |

Legitimate vocabulary present as expected and correctly **not** flagged:
environment-variable names (`STOCKTRENDS_API_KEY`, 17 occurrences), header names
(`Payment-Required`, `X-PAYMENT`, `Authorization`), route names, stable safety
codes (`x402_payment_required`), and symbolic payment/x402 terms. **These are
names; the artifact carries no values behind them.**

Consistent with Phase 5F closure memo §5, the artifact contains **no captured
production challenge value**.

---

## 24. `private: true` and publication-safety result

| Check | Result |
| --- | --- |
| Unpacked manifest declares `"private": true` | **PASS** — boolean `true`, `typeof === "boolean"` (not the string `"true"`) |
| `publishConfig` | **PASS — absent** |
| Lifecycle or publication script | **PASS — absent.** None of the ten forbidden hooks (`preinstall`, `install`, `postinstall`, `prepare`, `prepack`, `postpack`, `prepublish`, `prepublishOnly`, `publish`, `postpublish`) is present in the artifact's manifest |
| Package scope | **PASS — unscoped** |
| Registry metadata created by this process | **None** |
| Publication occurred | **No — `npm publish` was never run in any form** |
| Package-name availability check | **None — no `npm view`/`search`/`info`; T-16 / D-10 remains deferred** |

The guard was **verified, not re-decided**. `private: true` was neither removed
nor weakened, and this PR creates no authority to remove it — that remains
reserved to a later, separately reviewed publication decision that does not exist
today.

---

## 25. B-2 is empirically settled for this exact source commit

**B-2 — "the artifact's entry points may not ship" — is SETTLED for source commit
`d1dc9d9f63c480a0871ea9de491bc6aabb6cfe36`, by measurement.**

Architecture memo §6 named two candidate failure modes. **Neither occurred:**

| Candidate mode | Prediction | Measured outcome |
| --- | --- | --- |
| **(a)** `dist/` excluded wholesale, leaving `main`, `types`, and `bin` dangling | `dist/` gitignored with no `files` field would exclude it | **Did not occur.** All 34 required `dist/` files ship; `main`, `types`, and every `bin` target are present. |
| **(b)** Only the `main` file pulled in, without its 12 required siblings — an install that succeeds and a bin that crashes on first import | npm's always-included rule might ship `dist/server.js` alone | **Did not occur.** All 12 siblings ship; all 43 relative imports across all 17 packed modules resolve to packed `.js` files. |

PR #86's `files` allowlist is therefore **empirically confirmed as the effective
remedy** — it was a hypothesis until this measurement, and PR-2's own record
(§22) explicitly declined to claim it. The artifact contains exactly the 37
reviewed paths and nothing else, with source maps and the lockfile confirmed
absent by measurement rather than by expectation.

**Scope.** This settles B-2 for **this exact source commit and this manifest**. It
is not a general claim about npm, and any later change to `files`, `dist/`, or the
build would require re-measurement.

**B-3** ("no build hook") is closed **procedurally**, as PR-2 §13 designed: the
explicit ordered build ran as a visible, reviewable step (§5.1, §6). No lifecycle
hook was added or relied upon.

---

## 26. Validation-matrix status supported by this evidence

| # | Check | Status | Basis |
| --- | --- | --- | --- |
| **V-3** | Expected artifact files | **GREEN** | Unpacked list == §7.1 allowlist; every I-1..I-5 path present; `package.json` presence **verified**, not assumed (§16, §18) |
| **V-4** | Forbidden artifact files | **GREEN** | Zero X-1..X-14 paths; **fail-closed on any unlisted path** — 0 uncategorized of 37 (§16, §22) |
| **V-5** | Executable presence | **GREEN** | Bin target present **with all 12 siblings**; full relative-import closure (§19, §20) |
| **V-6** | Executable permissions / shim | **NOT ESTABLISHED — out of PR-3's scope** | Requires installed-consumer inspection; this PR performed **no install and no launch**. The packed `dist/server.js` mode `0644` is **recorded as evidence only** (§14). **V-6 belongs to PR-4** and nothing here should be read as satisfying it. |
| **V-19** | Artifact cleanup | **GREEN** | Tarball, unpacked directory, JSON, listings, helpers, and the entire temporary root removed; no `*.tgz` in the repository (§28) |
| **V-21** | Artifact-to-source correspondence | **GREEN** | 37/37 byte-identical to reviewed source at `d1dc9d9`; checksum and commit recorded (§17, §21) |
| **V-25** | Artifact size / category (**ADVISORY**) | **GREEN** | 112325 bytes packed / 541631 unpacked / 37 files; **only I-1..I-5 categories**; size consistent with compiled output — no category leak signal (§8, §16, §17) |
| **V-26** | Dependency-contract completeness | **GREEN** | Static, offline, against the **artifact's** compiled output: discovered exactly `@modelcontextprotocol/sdk` and `zod`; both declared; **0 undeclared**; `node_modules` never consulted, resolution never attempted (§20) |

**V-6 is listed here to record that this evidence does not support it.** Reporting
it as green would be exactly the overclaim the architecture memo's §10.3
"silent-success trap" warns against.

---

## 27. Explicit evidence boundary

What this PR **did not** establish, stated plainly so the green results above
cannot imply otherwise:

- **No package installation.** The artifact was never installed anywhere. No
  temporary consumer was created.
- **No installed-bin launch.** The `bin` was never executed.
- **No stdio handshake.** No MCP `initialize`, no `listTools`, no
  `listResources`, no client, no transport.
- **No runtime module-resolution evidence from a consumer.** Import closure here
  is **static and path-based** against the packed file set. It is not evidence
  that Node resolves these modules in an installed tree.
- **No B-5 conclusion.** The bin launch guard's failure mechanism remains an
  inference with zero coverage. The observed `0644` archive mode is not a verdict.
  B-5 is settled only by PR-4's installed-bin observation, per platform.
- **No cross-platform install conclusion.** Evidence is Windows 11 / Node v22.23.1
  / npm 10.9.8 only. **D-11 is not decided by this PR** and remains a PR-4 entry
  gate.
- **No registry availability conclusion.** The package name's availability is
  unknown and unqueried (T-16 / D-10, deferred).
- **No publication readiness or authority.** A measured local artifact is **not**
  packaged availability and must never be described as such (architecture memo
  §12.1 distinction 2-vs-3).
- **B-1 is not settled by anything in this report's file lists.** It is closed
  **statically** by V-26 (§20). Nothing here relies on an install resolving.
- **The `README.md` inside this artifact is the pre-refresh README.** PR-5's §13.1
  tail step must repack and verify the refreshed README (V-28). The artifact
  measured here is expected to be superseded.
- **The recorded `README.md` hash predates this PR's own edit.** It is a
  pack-time digest, taken before this PR appended its §29 documentation-index
  link — see the timing note in §21.
- **The Node range is declared, not validated.** No artifact has been run on any
  Node version.

---

## 28. Cleanup evidence

| Check | Result |
| --- | --- |
| Unpacked artifact directory deleted | **PASS** |
| `.tgz` deleted | **PASS** |
| Dry-run and real-pack JSON deleted | **PASS** |
| Tar listings deleted | **PASS** |
| Temporary hash/comparison output deleted | **PASS** |
| Temporary validation helpers deleted | **PASS** |
| **Entire unique temporary root deleted** | **PASS** — the directory no longer exists |
| Any sibling temporary root left behind | **PASS — 0** |
| No `*.tgz` anywhere in the repository | **PASS — 0** |
| No unpacked package in the repository | **PASS — 0** |
| No package consumer exists | **PASS — none created; no self-install under `node_modules/`** |
| No generated package manifest | **PASS — none** |
| Ignored `dist/` remains as normal build output | **PASS** — 51 files, untracked (`git ls-files dist` → 0), ignored at `.gitignore:2`, **not staged and not committed** |
| `git status --short --branch` | Shows only this PR's report and README edits |

**The tarball was not retained for PR-4.** PR-4 must create or consume an artifact
only under its own separately bounded validation procedure and its own entry gates
(D-11 decided; §9.2 offline dependency-closure gate passed).

---

## 29. No runtime-capability change

**No file under `src/` was modified.** The change surface is exactly this report
and one README documentation-index link.

Unchanged: every MCP tool, resource, and prompt; every route; API requests;
API-key behavior; x402 behavior; payments; transport; direct execution;
configuration; feature flags; logging; and the Stock Trends API's standing as the
data and analytical authority.

The Phase 5F runtime remains unchanged. The default/free surface remains exactly
one tool, ten credential-free resources, and zero prompts; x402 remains
challenge-validation-only and default-off. No package metadata, lockfile, source,
script, test, configuration, LICENSE, or build file changed.

**Measuring an artifact is not a capability change.** Packing compiled output and
comparing it to a contract changes nothing about what the server does.

---

## 30. No live, paid, or external activity

None of the following occurred at any point in this PR:

- no live Stock Trends API call;
- no API key read, supplied, or used;
- no x402 request, canary, challenge, relay execution, proof, or payment material;
- no payment, settlement, or spend;
- no MCP Inspector session;
- no remote or hosted MCP access;
- no package installation, temporary consumer, or installed-bin launch;
- no `npm publish` in any form — no flag, no dry run, no exception;
- no registry query (`npm view` / `npm search` / `npm info`) and no package-name
  availability check;
- no Git fetch or other remote Git query;
- no GitHub query;
- no AWS or deployment-infrastructure query;
- **no external network request of any kind.**

Both authorized pack operations ran with literal `--offline` and completed
locally; **no cache miss, no fallback, and no retry with weaker options
occurred.** Both produced empty stderr — no registry contact was attempted.

The Phase 5F live authorization is `CONSUMED`. **No live or external
authorization exists or was requested**, and none is created by this PR. No
reusable live authorization is established. **No publication authority exists.**

---

## 31. Next gate: PR-4 — clean temporary installation and default/free stdio validation

PR-3 is complete. B-2 is settled for `d1dc9d9`, the artifact's contents are
verified against the closed contract, and V-3, V-4, V-5, V-19, V-21, V-25, and
V-26 are green.

**PR-4 does not start until both entry gates hold** (architecture memo §16.2):

1. **[OWNER] D-11 is decided** — Windows-only evidence with an explicitly
   Windows-scoped readiness claim, **or** Windows plus POSIX (macOS/Linux)
   evidence before phase completion. This determines what PR-4 must produce, so it
   cannot be answered afterward.
2. **The §9.2 offline dependency-closure gate passes** — the local npm cache must
   already contain the complete transitive closure for the isolated consumer,
   **verified offline**. **Cache insufficiency fails closed and PR-4 does not
   run.** Literal `--offline` only; **`--prefer-offline` is prohibited.**

PR-4 must additionally name and justify its **process-level network-observation
mechanism in advance**, must launch the installed **bin** (not a file path), must
require a **completed handshake** rather than exit 0, and must **not** invoke
`callTool` or `readResource` — both fetch.

**PR-4 will need its own artifact.** This one was destroyed by design; nothing was
retained for it.

PR-3 carries **no** authorization to publish, install, query a registry, call a
live API, or spend, and grants none to any later PR.
