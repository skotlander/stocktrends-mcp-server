# Package Documentation Refresh and Tail Validation Report

Date: 2026-07-18

**Decision classification:**

`DOCUMENTATION REFRESHED AND V-28 FINAL TAIL VALIDATION PASSED — LOCAL WINDOWS ARTIFACT ONLY; NO PUBLICATION AUTHORIZED`

This document records **PR-5** of
[`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md)
§13: package documentation and discoverability refresh, followed by the
architecture's §13.1 **V-28** final artifact revalidation tail step.

This PR performed **no** package publication, registry query,
package-name-availability check, directory/marketplace submission, live
Stock Trends API call, x402 canary, Git fetch, GitHub query, AWS/deployment
query, or external network request of any kind. It used no API key, proof,
payment material, or spend.

---

## 1. Purpose

Refresh consumer-facing installation, release, security, and discoverability
documentation now that PR-4 (#90, merged) validated a local package artifact
cross-platform, and B-5 was closed on the approved Windows and WSL2 Ubuntu
environments. Then perform the architecture's §13.1 **V-28** tail step: a
final local repack, closed-allowlist comparison, secret/forbidden-content
scan, refreshed-README-in-artifact byte comparison, a minimal installed-bin
MCP handshake, and cleanup — so the phase does not close on an artifact that
still carries superseded (pre-refresh) documentation.

## 2. Source branch and base commit

- Branch: `docs/package-installation-discoverability-refresh`
- Base / confirmed HEAD at start of this work: `78a3074`
  (`Validate cross-platform package installation and stdio startup (#90)`)
- Working tree and index were clean before any edit; confirmed again after
  cleanup (§14).
- No worktree was used; work occurred in the normal attached checkout.
- No remote Git fetch or query occurred at any point (posture confirmed
  before editing and preserved throughout).

## 3. Files refreshed

Exactly five documentation files, plus this report:

| File | Change |
| --- | --- |
| `README.md` | Checkout-channel wording preserved; new "Local Package Artifact Installation" subsection added; client-configuration examples extended with package-installed variants (Claude Desktop, Claude Code, generic stdio); doc-index link to this report added |
| `docs/PHASE5E_DIRECTORY_METADATA_READINESS.md` | License/identity corrected to MIT; installation reference distinguishes checkout vs. local-artifact; `payment_rails` corrected off "none"; stale signoff filename reference corrected |
| `docs/PHASE5E_LAUNCH_RELEASE_CHECKLIST.md` | New §2a package-artifact readiness checklist (C13–C30) added |
| `docs/PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md` | Dated 2026-07-18 addendum (§15) appended; original 2026-07-12 signoff content preserved unmodified |
| `docs/SECURITY_MODEL.md` | New §18 "Package Distribution and Supply-Chain Surface" added |
| `docs/PACKAGE_DOCUMENTATION_REFRESH_AND_TAIL_VALIDATION_REPORT.md` | Added — this report |

No `src/`, `tests/`, `package.json`, `package-lock.json`, build-config, or
`LICENSE` file was changed. `package.json` `files` allowlist, `private:
true`, and the absence of `publishConfig`/lifecycle scripts were confirmed
unchanged throughout (§8, §9, §14).

## 4. Documentation distinctions preserved

The nine statements the architecture memo §12.1 requires never be collapsed
were checked explicitly against the refreshed material:

1. **Repository checkout available** — preserved verbatim as the primary
   install channel in README.md.
2. **Local package artifact validated** — stated in README.md and the
   directory-metadata doc, tied to the merged PR #90 cross-platform report.
3. **Package not yet externally published** — stated repeatedly and
   explicitly in every refreshed document; no command implies registry
   installability by name.
4. **API-key paid execution** — described as a separate existing posture;
   unchanged by this PR.
5. **x402 challenge-only capability** — described as default-off,
   challenge-validation-only, in the directory-metadata doc's corrected
   `payment_rails` field.
6. **No transaction-complete x402** — no proof/payment/settlement/paid-output
   claim added anywhere.
7. **No remote MCP** — restated in the signoff addendum and the security
   model addition.
8. **No marketplace submission** — restated in the signoff addendum, the
   directory-metadata doc, and the release checklist.
9. **No investment advice** — unchanged; not touched by this refresh.

## 5. No publication or submission claim

Every refreshed document was checked for prohibited claims:

- No statement asserts registry publication or registry-installable
  availability.
- No command in any refreshed document reads `npm install
  stocktrends-mcp-server` by itself (a registry-style install); every
  local-artifact example uses an explicit local `.tgz` path or a
  consumer-relative installed-bin path.
- No statement asserts remote/hosted MCP.
- No statement asserts directory/marketplace submission occurred.
- `docs/PHASE5E_LOCAL_STDIO_LAUNCH_READINESS_SIGNOFF.md`'s original
  2026-07-12 content (§4, §10) retains its original, historically accurate
  `payment_rails: "none"` and pre-x402 wording **as a historical record of
  what was true at that signoff's evidence base** — it is not rewritten,
  per instruction not to rewrite history. The new §15 addendum, dated
  2026-07-18, supplies the current, accurate status alongside it.

## 6. No runtime/package/dependency change

Confirmed throughout and re-confirmed at the end (§13, §14):

- No file under `src/` or `tests/` changed.
- `package.json` and `package-lock.json` are byte-unchanged from HEAD
  `78a3074`.
- The `files` allowlist remains exactly `dist/**/*.js`, `dist/**/*.d.ts`,
  `README.md`, `LICENSE`.
- `private: true` remains a boolean, unchanged.
- No `publishConfig` and no lifecycle/publication script exist.
- Every MCP tool, resource, prompt, route, and runtime behavior is
  unchanged.

## 7. Baseline validation (pre-edit)

Run before any documentation edit, on the normal attached checkout at HEAD
`78a3074`, Windows 11, Node v22.23.1 (per prior PR baselines), npm 10.9.8:

| Check | Command | Result | Expected |
| --- | --- | --- | --- |
| Typecheck | `npm run typecheck` | **PASS** | pass |
| Direct-execution guard suite | `npm test -- tests/directExecutionGuard.test.ts` | **PASS — 14 passed, 1 skipped** | 14/1 skipped |
| Package-metadata suite | `npm test -- tests/packageMetadata.test.ts` | **PASS — 67/67** | 67/67 |
| Runtime dependency contract suite | `npm test -- tests/runtimeDependencyContract.test.ts` | **PASS — 15/15** | 15/15 |
| Full suite | `npm test` | **PASS — 1041 passed, 1 skipped across 19 files** | 1041/1 skipped, 19 files |
| Build | `npm run build` | **PASS** — 17 `.js`, 17 `.d.ts`, 17 `.js.map`, 51 total | 17/17/17 |
| Runtime dependency check | `npm run check:runtime-deps` | **PASS** — discovered `@modelcontextprotocol/sdk`, `zod`; both declared | pass |
| Package-metadata check (script) | `npm run check:package-metadata` | **PASS** | pass |
| Package-metadata check (direct) | `node scripts/check-package-metadata.mjs` | **PASS** | pass |
| x402 relay suite | `npm test -- tests/x402Relay.test.ts` | **PASS — 474/474** | 474/474 |

All results matched the expected baselines exactly. No discrepancy required
investigation.

## 8. V-28 final tail validation — scope

Performed only after all documentation edits were complete, as one local
Windows validation leg, per the architecture memo §13.1. The merged PR #90
cross-platform (Windows + WSL2 Ubuntu) installed-bin evidence was not
repeated — WSL validation is explicitly out of scope for this narrow
tail step.

**Authorized-operation budget respected:** exactly one fresh build, one
offline `npm pack`, one offline consumer install, one installed-bin launch.
No retry of any completed evidentiary operation. No `npm pack --dry-run`,
no second pack, no `npm ci`, no `npm cache add`, no `npm update`, no
non-offline install, no `--prefer-offline`, no package linking, no registry
query, no publication, no WSL validation, no MCP Inspector.

### 8.1 Pre-existing connector isolation

Before creating the PR-5 temporary consumer, a bounded baseline of
already-running processes whose command line referenced
`stocktrends-mcp-server` was recorded (process IDs only — not inspected,
not probed via MCP, not communicated with, not terminated). These processes
remained present and untouched throughout, and are explicitly excluded from
this report's cleanup accounting; their continued presence after PR-5
cleanup is not a cleanup failure. All V-28 evidence below came exclusively
from the freshly packed PR-5 `.tgz`, the isolated temporary consumer created
for this validation, that consumer's own `node_modules`, that consumer's
npm-installed command shim, the temporary MCP harness (using only the
consumer-installed SDK), and the temporary process-level network guard.

### 8.2 Final build

`dist/` (ignored, untracked) was removed and rebuilt fresh with `npm run
build`. Output: **17 `.js`, 17 `.d.ts`, 17 `.js.map`, 51 total files, zero
other categories.**

## 9. Final artifact identity and 37-path result

One offline pack, run exactly once:

```text
npm pack . --json --ignore-scripts --offline --pack-destination <TEMP_ROOT>
```

| Field | Value |
| --- | --- |
| Identity | `stocktrends-mcp-server@1.0.0` |
| Filename | `stocktrends-mcp-server-1.0.0.tgz` |
| Exit code | 0 |
| Packed size | 114,220 bytes |
| Unpacked size | 549,063 bytes |
| Entry count | **37** |
| npm shasum (SHA-1) | `8420619ac164dc5c8c3d1210715d7a7ca4648347` |
| npm integrity | `sha512-Pu36Y9vrDNTDQFOVNzFiHznFCXhSsuCzIYwZ1aAqtpnPdFwxmBTu4JYm+CqPWivKt+YXBKgE2QE7jO93rkRElw==` |
| Local SHA-256 (tarball, independently computed) | `CE3B99C31B0BE4525C53A056C4BA87A8774D6F47E2362B7C4F059EECE2F4FE7A` |

The unpacked file list matched the closed allowlist exactly: `package.json`,
`README.md`, `LICENSE`, and 17 each of `dist/**/*.js` / `dist/**/*.d.ts` —
**37 paths, zero unexpected paths.** No source maps, no TypeScript source,
no tests, no internal docs, no scripts, no lockfile, no build/test
configuration, no `.env` files, no npm configs, no VCS/worktree material, no
logs, no nested artifacts.

This size/hash differs from the PR-3 (§`d1dc9d9`) and PR-4 (§`433bf73`)
artifacts, as expected — the refreshed README and the intervening B-5
runtime correction both changed packed content since those earlier
measurements.

## 10. Refreshed README byte-correspondence result

The packed `README.md`, `package.json`, and `LICENSE` were each compared by
independent SHA-256 against the corresponding refreshed repository files:

| File | Packed SHA-256 | Repository SHA-256 | Match |
| --- | --- | --- | --- |
| `README.md` | `69B02128331D74A421A184B6905A62F11395F63DE6981765269FEDB767FA8DA6` | `69B02128331D74A421A184B6905A62F11395F63DE6981765269FEDB767FA8DA6` | **Yes** |
| `package.json` | `F36FDA59126C11EBC6CCD5B42756208D71CE9982E1F017F75C594199E70AE3E8` | `F36FDA59126C11EBC6CCD5B42756208D71CE9982E1F017F75C594199E70AE3E8` | **Yes** |
| `LICENSE` | `44AA9B7D787EF8E41D0C23CBC46E75BE74F99F5D699832CD1FF02E8E88EE93F0` | `44AA9B7D787EF8E41D0C23CBC46E75BE74F99F5D699832CD1FF02E8E88EE93F0` | **Yes** |

**Result: the refreshed README is confirmed byte-identical to the README
inside the final artifact.** This closes the loop the architecture memo
§13.1 exists to close — the phase does not close on an artifact carrying
superseded documentation.

## 11. Forbidden-material scan

The unpacked artifact was scanned for forbidden path categories and
secret-shaped content:

| Category | Result |
| --- | --- |
| Source maps, non-`.d.ts` TypeScript, `.env*`, `package-lock.json`, `tsconfig*`/`vitest*` | **0 hits** |
| Private key material (PEM/OPENSSH/PGP) | **0 hits** |
| AWS-shaped access key id | **0 hits** |
| Slack-shaped token | **0 hits** |
| Populated `STOCKTRENDS_API_KEY` value (16+ char assignment) | **0 hits** |
| Operator username or home-directory path | **0 hits** |
| Temporary-root path | **0 hits** |

No finding required adjudication. Placeholder documentation strings (for
example `<your-api-key>`) are expected inside `README.md` and were not
flagged as secrets.

## 12. Clean offline installation result

One offline install, run exactly once, into a freshly created isolated
temporary consumer with distinct empty user/global npm configs and the
existing local npm cache:

```text
npm install <LOCAL_TGZ> --offline --ignore-scripts --no-audit --no-fund
  --package-lock=false --no-save --omit=dev
  --cache <EXISTING_WINDOWS_CACHE>
  --userconfig <EMPTY_USER_CONFIG> --globalconfig <EMPTY_GLOBAL_CONFIG>
```

| Check | Result |
| --- | --- |
| Exit code | **0** |
| Packages added | **94** (matches the PR #90 cross-platform report's Windows leg exactly) |
| `ENOTCACHED` or registry fallback | **None** |
| `package-lock.json` created | **No** |
| Consumer manifest | **Unchanged** (`--no-save`) |
| Installed package realpath | Real copied directory beneath the consumer (not a symlink) |
| `@modelcontextprotocol/sdk` / `zod` realpaths | Both resolve beneath the consumer |
| `NODE_PATH` or checkout fallback | **None** |
| Installed manifest `private` | **`true`** (boolean) |
| Installed manifest `publishConfig` | **Absent** |
| Installed manifest lifecycle/publication script | **Absent** — `build`, `dev`, `start`, `test`, `typecheck`, `check:runtime-deps`, `check:package-metadata` only |

## 13. Installed-bin form and MCP initialize result

The npm-generated Windows command shim,
`node_modules\.bin\stocktrends-mcp-server.cmd`, was launched directly by the
harness (not a checkout-relative `.js` path). The harness used **only the
consumer-installed MCP SDK** (imported from within the consumer directory)
and a temporary process-level network guard preloaded into the spawned
server child process only, via `NODE_OPTIONS=--import <guard-file-url>`.

| Check | Result |
| --- | --- |
| MCP `initialize` handshake | **Completed** |
| `capabilities.tools` | present |
| `capabilities.resources` | present |
| `capabilities.prompts` | **`undefined`** (asserted as capability absence, not a `listPrompts` call) |
| `listTools()` result | **exactly** `["stocktrends_estimate_workflow_cost"]` — all nine paid/x402 tools absent |
| `listResources()` result | **exactly** the ten expected URIs: `stocktrends://api/openapi`, `stocktrends://ai/context`, `stocktrends://ai/tools`, `stocktrends://workflows`, `stocktrends://methodology/stim`, `stocktrends://methodology/indicators`, `stocktrends://methodology/inference`, `stocktrends://pricing/catalog`, `stocktrends://proof/market-edge`, `stocktrends://leadership/definitions` |
| `callTool` invoked | **Never** |
| `readResource` invoked | **Never** |
| Client/transport shutdown | **Clean** |
| Guard-loaded marker | **Present** |
| Attempted-network marker | **Absent** |

**No API key, paid-mode flag, x402 variable, proof material, payment
header, or spend path was present, read, or exercised at any point.** The
spawned server child process received only `NODE_OPTIONS` (guard preload)
and the two guard marker paths as explicit environment, merged with the
SDK's own minimal default-inherited-variable set; no `STOCKTRENDS_*`
variable, API key, or `NODE_PATH` was present. The driving harness process
itself ran under a separately curated, explicitly cleared environment.

## 14. Cleanup proof

| Check | Result |
| --- | --- |
| Temporary validation root | **Deleted** — confirmed absent by direct path check |
| `.tgz` in repository | **None** — 0 anywhere in the checkout |
| Unpacked artifact, consumer, harness, guard in repository | **None** |
| Lingering PR-5 child process | **None** — post-cleanup process listing showed only the pre-existing baseline PIDs recorded in §8.1, unmodified and untouched |
| `package.json` / `package-lock.json` | **Unchanged** |
| `git status --short --branch` | Shows only this report and the five documentation edits |
| `dist/` | Remains as normal ignored, untracked build output |

## 15. Evidence limitations

- **This is a Windows-only tail leg**, by design (architecture memo §13.1:
  "no platform beyond the one D-11 scoped"). It does not repeat or
  supersede the merged PR #90 cross-platform (Windows + WSL2 Ubuntu)
  installed-bin evidence, which remains the governing cross-platform
  record.
- **B-5 closure remains scoped exactly as recorded in the PR #90 report** —
  the specific Windows 11 and WSL2 Ubuntu environments and source commit
  named there. This tail step's clean Windows result is consistent with,
  and does not narrow or widen, that scope.
- **This report is not a package-readiness closure.** It establishes that
  the refreshed documentation is inside a still-functional final local
  artifact. Package-readiness closure is reserved for a separately reviewed
  **PR-6** record.
- **No publication authority exists or is created by this report.** Local
  artifact validation, however thorough, is not registry availability.

## 16. Next gate

**PR-6 — package-readiness closure and publication handoff**, per the
architecture memo §13 PR-6. That record must independently confirm every
§15 blocking row and every §16 gate, including this report's V-28 result,
before any later, separate, explicitly authorized publication decision.
