# Package Publication Configuration — Implementation Notes

Date: 2026-07-18

**Decision classification:**

`P-4 PUBLICATION CONFIGURATION IMPLEMENTED AND VALIDATED OFFLINE —
ORGANIZATION-SCOPED PACKAGE METADATA, EXPLICIT PUBLIC NPM TARGET, CONTROLLED
REMOVAL OF PRIVATE GUARD, AND MANUAL POST-BOOTSTRAP STAGE-ONLY OIDC WORKFLOW
IMPLEMENTED; PACKAGE CREATION, NPM AUTHENTICATION, TRUSTED-PUBLISHER
CONFIGURATION, BOOTSTRAP PUBLICATION, STAGING, PUBLICATION, AND PUBLIC-INSTALL
VALIDATION REMAIN UNAUTHORIZED AND UNPERFORMED`

This document records **P-4**: the implementation of the publication
configuration settled in
[`PACKAGE_PUBLICATION_IMPLEMENTATION_DECISION.md`](PACKAGE_PUBLICATION_IMPLEMENTATION_DECISION.md)
(P-3). It is an implementation record. It configures repository metadata, adds
one inert release workflow, and extends the authoritative validators. It
**creates no npm package, authenticates to no registry, configures no trusted
publisher, publishes nothing, stages nothing, and runs no workflow.** Every
external publication operation remains gated behind its own separate, later,
exact authorization (§17).

---

## 1. Branch and base commit

- Checkout: the normal attached checkout at
  `<repository-root>`. Worktree mode **off**; no
  `.claude/worktrees`, `.codex/worktrees`, or any other worktree was created or
  used for this work.
- Branch: `feat/package-publication-configuration`, created from `main`.
- Base commit at the start of this work: `cf5c57e` ("Settle package
  publication implementation decisions (#97)").
- `main` matched `origin/main` (0 ahead / 0 behind); the working tree and index
  were clean before any edit; the only local branch was `main`.
- After the initial posture confirmation and branch creation, **no remote Git
  fetch, pull, push, or query occurred**, no web access occurred, and no npm or
  other registry was accessed.

**Pre-existing-worktree note.** The stated expected posture said "no worktree
branch or directory exists," but the checkout already contained 16 pre-existing
`.codex/worktrees/*` detached-HEAD worktrees from prior sessions. They are
unrelated to this task, contain no branches, sit outside the working directory,
and were not created or touched here. Recorded as an observation, not a
blocker.

---

## 2. Settled decisions implemented

From P-3 (`PACKAGE_PUBLICATION_IMPLEMENTATION_DECISION.md`) §12:

| # | Settled decision | Implemented as |
| --- | --- | --- |
| 3 | Scoped package identity `@stocktrends-publications/stocktrends-mcp-server` | `package.json` `name`; `package-lock.json` root identity; validator constants and tests |
| 4 | Initial public version `1.0.0` | `version` unchanged; validator pins `1.0.0`; workflow requires the typed `expected_version` to equal it |
| 7 | Post-bootstrap OIDC trusted publishing | `.github/workflows/npm-stage-release.yml` (tokenless, `id-token: write`) |
| 8 | Stage-and-human-approval release design | workflow submits with `npm stage publish` only; contains no approval/promotion step |
| 9 | No automatic publication from ordinary merges | workflow trigger is `workflow_dispatch` only, with main-branch, confirmation, and version gates |
| 10 | Controlled removal of `private: true` | `private` removed from `package.json`; validator now fails closed if it reappears |
| 11 | Explicit public npm `publishConfig` | `publishConfig` added; validator enforces exact `access: public` + public registry |

Decisions 1–2 (repository stays private; initial provenance limitation
accepted), 5–6 (manual 2FA bootstrap; no reusable token), and 12 (MCP Registry
later) are **not** repository configuration and are **not** implemented here —
they remain owner/operational actions gated separately (§17).

---

## 3. Exact permanent files changed

Modified:

- `package.json`
- `package-lock.json`
- `scripts/check-package-metadata.mjs`
- `scripts/check-package-metadata.d.mts`
- `tests/packageMetadata.test.ts`
- `README.md`
- `docs/SECURITY_MODEL.md` (P-4 narrow correction — §21)

Added:

- `.github/workflows/npm-stage-release.yml`
- `scripts/check-release-workflow.mjs`
- `scripts/check-release-workflow.d.mts`
- `tests/releaseWorkflow.test.ts`
- `docs/PACKAGE_PUBLICATION_CONFIGURATION_IMPLEMENTATION_NOTES.md` (this record)

No file under `src/` was changed. No historical governance/decision record was
rewritten. No `server.json`, `.npmrc`, `.npmignore`, or credential file was
created.

---

## 4. package.json changes

- `name`: `stocktrends-mcp-server` → `@stocktrends-publications/stocktrends-mcp-server`.
- `version`: unchanged at `1.0.0`.
- `"private": true`: **removed** (the deliberate, reviewed removal of the
  accidental-publication guard — see §7).
- `publishConfig`: **added**, exactly

  ```json
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
  ```

- `scripts`: added one validator script `check:release-workflow` (`node
  scripts/check-release-workflow.mjs`). No lifecycle hook was added; no script
  invokes `npm publish` or `npm stage publish`.
- Unchanged: `license` (`MIT`), `author` (`Stocktrends Publications`),
  `description`, `type`, `main`, `types`, the `bin` contract
  (`{ "stocktrends-mcp-server": "dist/server.js" }` — the executable name is
  unchanged), the closed four-entry `files` allowlist, `engines`, `repository`,
  `homepage`, `bugs`, `keywords`, and the runtime `dependencies`
  (`@modelcontextprotocol/sdk` `^1.29.0`, `zod` `^4.4.3`).

The `files` allowlist was **not** broadened; no new package-runtime file was
required by the governing architecture, so none was added.

---

## 5. package-lock change

`package-lock.json` was updated by a **bounded, deterministic two-line edit**
to its root identity only:

- top-level `name` → `@stocktrends-publications/stocktrends-mcp-server`;
- `packages[""].name` → `@stocktrends-publications/stocktrends-mcp-server`.

The `bin` key inside `packages[""]` remains `stocktrends-mcp-server` (the
executable name, part of the unchanged bin contract). No dependency version,
integrity hash, resolved URL, or transitive entry was changed. `lockfileVersion`
remains `3`. **No registry-accessing command was run to make this change** — it
was a direct textual edit of the two root-name fields, which requires no
dependency resolution.

---

## 6. Workflow filename, trigger, and permissions

- Path: `.github/workflows/npm-stage-release.yml` (the exact filename npm
  trusted publishing must later be restricted to).
- Trigger: `workflow_dispatch` **only**. There is no `push`, `pull_request`,
  `schedule`, `release`, `create`, `workflow_run`, tag, or any other event
  trigger, so an ordinary push, merge, PR, schedule, or tag **cannot** invoke
  it.
- Permissions (exact, minimal):

  ```yaml
  permissions:
    contents: read
    id-token: write
  ```

  `contents: read` for checkout; `id-token: write` for OIDC token issuance.
  **No repository-write permission** is granted.
- Runner: GitHub-hosted `ubuntu-24.04`.
- Toolchain: Node `24`; npm is forced to `>= 11.15.0` (the staged-publishing
  floor) and the floor is asserted before any staged-publishing command.

---

## 7. Post-bootstrap-only status

The workflow is the **selected post-bootstrap release path**, not the initial
`1.0.0` bootstrap. Its header documents that:

- staged publishing and trusted publishing require the package to already exist
  on the registry, so a brand-new package cannot be created through this path;
- the first version `1.0.0` is a **separate, owner-controlled, 2FA-protected
  manual bootstrap publication** that this workflow does not perform and must
  not precede;
- the workflow must not be dispatched before both the bootstrap publication and
  the trusted-publisher configuration are complete;
- npm trusted-publisher configuration must later be restricted to this exact
  filename and granted **stage-only** permission (not direct publish);
- staged-package approval is a **separate owner action requiring 2FA**, not part
  of this workflow;
- **merging this workflow configures no npm trust and does not authorize it to
  be run.**

The removal of `private: true` is the reviewed step that arms a future release;
it is covered by validation (§9) and does not by itself publish anything.

---

## 8. Confirmation and version gates

The workflow fails closed unless **all** of the following hold at dispatch:

1. **Main-branch gate** — `github.ref` must be `refs/heads/main`.
2. **Confirmation gate** — the typed `confirm_phrase` input must be exactly
   `STAGE_STOCKTRENDS_NPM_RELEASE`.
3. **Version gate** — the typed `expected_version` input must equal
   `package.json`'s `version`.
4. **Identity gate** — `package.json` `name` must be exactly
   `@stocktrends-publications/stocktrends-mcp-server`, `private` must be absent,
   and `publishConfig` must declare public access to the public npm registry.

Both `expected_version` and `confirm_phrase` are declared as required typed
`workflow_dispatch` inputs.

---

## 9. Package/tarball validation chain (in the workflow, before staging)

In order, all **before** `npm stage publish`:

1. `npm ci` — deterministic install.
2. `npm run build`.
3. `npm test` — full suite.
4. `npm run check:runtime-deps` — static dependency-contract completeness.
5. `npm run check:package-metadata` — reviewed metadata + lockfile root
   identity.
6. `npm run check:release-workflow` — the workflow validates its own
   publication controls.
7. Identity/version verification step (§8 gates 3–4).
8. `npm pack` — creates the exact tarball.
9. `sha256sum` — computes and reports the tarball digest (§10).
10. Tarball-content validation — lists the tarball and asserts every path is
    within the closed allowlist and the required entry points are present,
    reusing the committed validator helpers (`REVIEWED_FILES`,
    `isCoveredByFiles` from `scripts/check-package-metadata.mjs`).

Only after all of the above does the workflow run `npm stage publish`.

---

## 10. SHA-256 evidence design

The workflow computes and reports (`sha256sum | tee`) the SHA-256 digest of the
exact `npm pack` tarball before staging, binding the staged submission to a
recorded digest. The digest is **build-specific** (npm pack embeds file mtimes),
so it is release-run evidence, not a frozen constant.

For this offline P-4 validation run, one local `npm pack` of the scoped package
produced `stocktrends-publications-stocktrends-mcp-server-1.0.0.tgz` (37 files,
114.4 kB packed) with SHA-256
`21bf537d5c74d82e82839bedbad5f584bf84602d7d4596ce359e44a323179697`. This tarball
was produced in an isolated scratchpad outside the repository and **deleted
after measurement**; it is not a release artifact and no digest is committed as
a release commitment.

---

## 11. Stage-only command design; absence of direct publish and stage approval

- The **only** publication command in the workflow is `npm stage publish`, run
  with `--access public` to make scoped-package public access explicit.
- Direct `npm publish` is **absent** from all executable (non-comment) lines.
- `npm stage approve` (and `reject`/`list`/`view`/`download`) is **absent** —
  staged-package approval is a separate owner action requiring 2FA and is not
  reachable through this workflow.
- The workflow contains **no** GitHub Release creation, **no** repository-write
  operation, **no** MCP Registry operation, **no** live Stock Trends API call,
  and **no** x402/proof/payment/settlement/spend operation.

Forbidden commands are *discussed* only in explanatory comments; the validator
(§13) distinguishes documentation from executable content precisely so those
comments are permitted while an executable forbidden command fails closed.

---

## 12. Absence of tokens and publication secrets

- **No** `NODE_AUTH_TOKEN` anywhere.
- **No** GitHub secret reference (`secrets.*`) anywhere.
- **No** npm token creation or use; **no** long-lived publication credential.
- Authentication is OIDC (`id-token: write`) only. The private source
  repository can still use trusted publishing; it simply does not receive
  automatic npm provenance, which is the accepted limitation for the initial
  release.

---

## 13. Updated validator/test coverage

**`scripts/check-package-metadata.mjs`** (authoritative package-metadata
validator, extended — not parallelized):

- `REVIEWED_NAME` is now the scoped name; a new `REVIEWED_SCOPE`
  (`@stocktrends-publications`) guard fails any other scope.
- Publication-safety inverted: `private` must be **absent** (any `private`
  field, including boolean `true`, `false`, or string `"true"`, fails), and
  `publishConfig` must be **exactly** `{ access: "public", registry:
  "https://registry.npmjs.org/" }`.
- New `analyzeLockfileIdentity()` fails closed unless the lockfile's top-level
  and `packages[""]` names equal the scoped name, versions equal `1.0.0`, the
  root runtime dependencies match the reviewed contract, and `package.json` and
  the lockfile root identity agree. Wired into the CLI so
  `npm run check:package-metadata` covers both manifest and lockfile.
- The forbidden-lifecycle-script and closed-`files`-allowlist checks are
  unchanged.

**`scripts/check-release-workflow.mjs`** (new sibling validator, same proven
shape — pure exported helpers + `analyzeReleaseWorkflow()` + direct-execution
guard). Line-aware, not naive substring matching: it separates comment lines
from executable ("code") lines and applies command presence/absence rules to
code lines only. It fails closed unless the workflow is at the exact filename,
`workflow_dispatch`-only (no push/PR/schedule/release/tag), has exactly
`contents: read` + `id-token: write`, uses a GitHub-hosted Ubuntu runner, Node
24, an npm `>= 11.15.0` floor, main-branch/confirmation/version/name gates,
runs build/test/validation/pack/sha256 before staging, uses only
`npm stage publish` with `--access public`, and contains no direct
`npm publish`, `npm stage approve`, `NODE_AUTH_TOKEN`, GitHub secret, npm
token, `npm view`/account command, GitHub Release, repository write, MCP
Registry, or x402/payment/spend operation.

**Type-declaration companions** `scripts/check-package-metadata.d.mts` and
`scripts/check-release-workflow.d.mts` updated/added to match.

**Tests:**

- `tests/packageMetadata.test.ts` — updated reviewed manifest fixture (scoped
  name, no `private`, exact `publishConfig`); inverted publication-safety cases;
  scope-drift cases; a lockfile-identity block; and (§21) a GitHub
  repository-identity block. **87 cases**.
- `tests/releaseWorkflow.test.ts` — **38 cases** covering every workflow
  invariant, including a case proving that forbidden commands appearing **only
  in explanatory comments** do not fail (the documentation-vs-command
  distinction), and (§21) the staged-exact-tarball invariant.

---

## 14. Tests and offline validation performed

All offline, on `feat/package-publication-configuration` over base `cf5c57e`,
host Windows 11 Home 10.0.26200 (Node v22.23.1, npm 10.9.8):

| Check | Result |
| --- | --- |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| `npm test` (full suite) | **PASS — 1099 passed, 1 skipped, 20 files** (was 1041/1 across 19 pre-P-4; +19 metadata → 87, +38 workflow → 38, incl. the §21 correction) |
| `npm run check:runtime-deps` | **PASS** — 17 compiled files; `@modelcontextprotocol/sdk`, `zod` declared |
| `npm run check:package-metadata` | **PASS** — metadata + lockfile root identity |
| `npm run check:release-workflow` | **PASS** |
| Offline `npm pack` (scratchpad) | **PASS** — `stocktrends-publications-stocktrends-mcp-server-1.0.0.tgz`, 37 files |
| Tarball allowlist check | **PASS** — 17 `.js` + 17 `.d.ts` + `README.md` + `LICENSE` + `package.json`; 0 outside allowlist; no `.js.map`, no `src/`, no `package-lock.json` |
| Packed `package.json` identity | **PASS** — scoped name, no `private`, exact public `publishConfig`, bin unchanged |
| Offline isolated install (`--offline --omit=dev`) | **PASS** — 94 packages from cache; scoped package + unchanged `stocktrends-mcp-server` bin shim |
| Installed-bin MCP `initialize` handshake (list-only, sanitized env) | **PASS** — completed `initialize`, prompts capability undefined, exactly 1 tool (`stocktrends_estimate_workflow_cost`), exactly 10 resources, empty stderr |
| Network / x402 boundary | **PASS** — handshake window is list-only (no `callTool`, no `readResource`), so no live request; `STOCKTRENDS_*` stripped from the child env; x402 remains default-off and challenge-validation-only, unchanged |

All temporary artifacts (tarball, isolated consumer, harness, file lists) were
created outside the repository and deleted after measurement; none remains in
the repository or scratchpad.

**Not re-run** (intentionally): MCP Inspector, remote MCP validation, live
Stock Trends API calls, API-key/paid/x402 live execution, and cross-platform
(WSL/POSIX) installed-bin validation. P-4 changes no `src/` runtime; the
installed-bin behavior is unchanged from the PR-4 cross-platform closure (#90).
The Windows installed-bin handshake was re-run here only to confirm the
**scoped** artifact installs and handshakes identically.

---

## 15. SECURITY_MODEL reconciliation (resolved in the §21 correction)

Originally flagged as a follow-up: [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §18
still described the now-removed `"private": true` / no-`publishConfig` posture,
which the P-4 configuration made materially false. This has now been
**reconciled** in the §21 narrow correction — §18's applicable
package-publication bullets were rewritten to record the configured public
scoped identity, the deliberate governed removal of the `"private": true`
guard, the explicit public `publishConfig`, and the layered fail-closed
controls that replace the guard (scoped-identity, GitHub-repository-identity,
registry/access, lifecycle-script, and package/lockfile-agreement validation;
the `workflow_dispatch`-only tokenless gated release workflow; stage-only OIDC;
and separate owner authorization for bootstrap/dispatch/approval/public-install).
The correction also states that configuration is not publication and that the
private repository means no automatic provenance is expected. No historical
decision record was rewritten (SECURITY_MODEL is the living security model).

---

## 16. Document-name discrepancies (resolved, not blockers)

Two files named in the P-4 instruction do not exist under those exact names.
The actual corresponding governing/evidence documents were identified and read:

- `PACKAGE_ARTIFACT_AND_INSTALLATION_VALIDATION_IMPLEMENTATION_NOTES.md` → the
  actual implementation record is
  [`PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md`](PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md)
  (PR-2, #86).
- `PACKAGE_ARTIFACT_AND_INSTALLATION_VALIDATION_REPORT.md` → the actual
  evidence reports are
  [`OFFLINE_PACKAGE_ARTIFACT_CONTENT_VALIDATION_REPORT.md`](OFFLINE_PACKAGE_ARTIFACT_CONTENT_VALIDATION_REPORT.md)
  (PR-3, #87) and
  [`CROSS_PLATFORM_PACKAGE_INSTALL_STDIO_VALIDATION_REPORT.md`](CROSS_PLATFORM_PACKAGE_INSTALL_STDIO_VALIDATION_REPORT.md)
  (PR-4, #90), consolidated in
  [`PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md`](PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md).

Relevant evidence was present, so the discrepancy was not treated as a blocker.

---

## 17. Remaining authorization boundaries

P-4 implements repository configuration only. The following remain **separate,
later, exact, unperformed and unauthorized** actions:

- npm account/organization operations of any kind;
- creation of the scoped npm package;
- npm trusted-publisher (`npm trust`) configuration restricted to this workflow;
- the one manual, owner-controlled, 2FA-protected `1.0.0` bootstrap
  publication;
- dispatching this workflow / any staged publication;
- staged-package approval/promotion (a separate 2FA owner action);
- public-by-name install validation;
- MCP Registry registration (`server.json`, namespace, submission);
- directory/marketplace promotion;
- any GitHub Release, repository-visibility change, or GitHub environment
  configuration;
- any live Stock Trends API, x402, proof, payment, settlement, or spend
  operation.

---

## 18. No-external-action statement

- No npm query occurred (no `view`/`ping`/`whoami`/`search`/`stage list`/etc.).
- No npm login or authentication occurred.
- No one-time password was requested or entered.
- No account or organization was modified.
- No package was created.
- No package-name availability query was performed.
- No token, credential, cookie, or secret was created.
- No `.npmrc` was created or modified.
- No trusted publisher was configured.
- The workflow was created only as inert repository configuration and was not
  run.
- No GitHub environment was created.
- No package was staged.
- No package was published.
- No staged package was approved.
- No GitHub Release was created.
- No repository visibility change occurred.
- No MCP Registry or directory operation occurred.
- No live Stock Trends API call occurred.
- No API key, x402 proof, payment header, wallet, signature, settlement, or
  spend occurred.
- All temporary package artifacts were removed.

---

## 19. Next gate

The next governed step is the **separately authorized `1.0.0` bootstrap
publication** — a one-time, owner-controlled, 2FA-protected manual `npm publish`
of the exact reviewed scoped package from a freshly rebuilt, revalidated
release-candidate artifact, followed by npm trusted-publisher configuration
restricted to `npm-stage-release.yml` with stage-only permission. Only after
that bootstrap and configuration may this workflow be dispatched. None of it is
authorized or performed by P-4.

---

## 20. Final classification

`P-4 PUBLICATION CONFIGURATION IMPLEMENTED AND VALIDATED OFFLINE —
ORGANIZATION-SCOPED PACKAGE METADATA, EXPLICIT PUBLIC NPM TARGET, CONTROLLED
REMOVAL OF PRIVATE GUARD, AND MANUAL POST-BOOTSTRAP STAGE-ONLY OIDC WORKFLOW
IMPLEMENTED; PACKAGE CREATION, NPM AUTHENTICATION, TRUSTED-PUBLISHER
CONFIGURATION, BOOTSTRAP PUBLICATION, STAGING, PUBLICATION, AND PUBLIC-INSTALL
VALIDATION REMAIN UNAUTHORIZED AND UNPERFORMED`

The package is **not** classified as publicly available, registry-published,
name-reserved, provenance-attested, staged, or ready for any publication
operation. This record implements the settled publication configuration and
hands a decided, offline-validated repository state to the separately authorized
bootstrap publication.

---

## 21. P-4 narrow correction (three issues)

A post-implementation review raised three items, corrected here on the same
branch. No external action, and the no-external-action boundary (§18) is
unchanged.

**Issue 1 — SECURITY_MODEL contradiction (corrected).** `docs/SECURITY_MODEL.md`
§18 still asserted the removed `"private": true` / no-`publishConfig` posture.
Only the applicable current package-publication bullets were rewritten (no
historical decision record touched; SECURITY_MODEL is the living model) to
record: the configured public scoped identity; the deliberate governed removal
of `"private": true`; the explicit public `publishConfig`; the layered
fail-closed controls that replace the guard (scoped-identity, GitHub
repository-identity, registry/access, lifecycle-script, and package/lockfile
agreement validation; the `workflow_dispatch`-only tokenless gated workflow;
stage-only OIDC; and separate owner authorization for bootstrap, dispatch,
staged approval, and public-install validation); that configuration is not
publication (nothing created/reserved/staged/published/installable); and that
the private repository means automatic provenance is not expected.

**Issue 2 — exact validated tarball must be staged (corrected).** Previously
each of the pack, SHA-256, allowlist, and staging steps independently re-derived
`TARBALL="$(ls -1 ./*.tgz | head -n1)"` in its own shell, so the staged tarball
was not provably the same created/validated/hashed artifact. Corrected so the
tarball is **bound once**: the pack step assigns `TARBALL` and exports it to
`$GITHUB_ENV`, and the SHA-256, allowlist, and staging steps all reference that
single bound `"$TARBALL"`.

- Exact executable staging line (unchanged in text, now referencing the bound
  env variable):

  ```
  npm stage publish "$TARBALL" --access public
  ```

- Tarball-variable binding: `TARBALL="$(ls -1 ./*.tgz | head -n1)"` in the pack
  step, exported via `echo "TARBALL=$TARBALL" >> "$GITHUB_ENV"`.
- Ordering: `npm pack` → bind `TARBALL` → SHA-256 (`sha256sum "$TARBALL"`) →
  allowlist validation (`tar -tzf "$TARBALL"`) → `npm stage publish "$TARBALL"`.
- This is design only; the command was **not executed** and the workflow was
  **not run**.

`scripts/check-release-workflow.mjs` (+`.d.mts`) gained a `TARBALL_VAR`
constant and a `checkStagedTarball` control that fails closed unless: exactly
one executable `npm stage publish` exists; it explicitly references the bound
`$TARBALL`; the variable is bound exactly once (not re-derived per step) and
exported to `$GITHUB_ENV`; the SHA-256 and allowlist steps operate on `$TARBALL`;
and binding precedes SHA-256/allowlist which precede staging. A bare command, a
re-globbed path, a different variable, a second staging command, a missing
binding, a re-derived binding, or a missing `$GITHUB_ENV` export each fails.
Explanatory comments remain distinguishable from executable commands (code-line
analysis). `tests/releaseWorkflow.test.ts` added focused positive and negative
cases (bare, path-not-variable, other-variable, two-commands, unbound,
re-derived, un-exported), reaching **38 cases**.

**Issue 3 — trusted-publisher repository identity (confirmed + enforced).**
`package.json` `repository.url` is
`git+https://github.com/skotlander/stocktrends-mcp-server.git`, which already
canonically identifies `skotlander/stocktrends-mcp-server`; **it was not
changed.** An explicit, bounded invariant was added to
`scripts/check-package-metadata.mjs` (+`.d.mts`): a `REVIEWED_GITHUB_REPOSITORY`
constant, a `parseGitHubRepoIdentity` helper, and a `checkRepositoryIdentity`
control (in addition to the existing exact `repository` object match) that fails
closed on another owner, another repository, a missing field, a non-GitHub host,
or malformed metadata. `tests/packageMetadata.test.ts` added a repository-identity
block, reaching **87 cases**.

**Correction change surface:** `docs/SECURITY_MODEL.md`,
`scripts/check-package-metadata.mjs` (+`.d.mts`), `tests/packageMetadata.test.ts`,
`.github/workflows/npm-stage-release.yml`, `scripts/check-release-workflow.mjs`
(+`.d.mts`), `tests/releaseWorkflow.test.ts`, and this record. No README change
(no existing README statement was made false by the corrections). No `src/`,
runtime, dependency, version, `files`-allowlist, or historical-record change.

**All checks re-run after the correction:** typecheck, build, `npm test`
(**1099 passed / 1 skipped, 20 files**), the three `check:*` scripts, offline
`npm pack` (scoped 37-file tarball, allowlist-clean), offline isolated install
(94 packages), Windows installed-bin MCP `initialize` (1 tool / 10 resources /
0 prompts, no network), secret scan (clean), `git diff --check` (clean). All
temporary artifacts removed.

---

## 22. PR #98 release-workflow security correction (three issues)

A workflow-security review of the open PR #98 raised three hardening items,
corrected here on the same branch. `.github/workflows/npm-stage-release.yml`,
`scripts/check-release-workflow.mjs` (+`.d.mts`), `tests/releaseWorkflow.test.ts`,
and this record were changed. No external action; the no-external-action
boundary (§18) is unchanged; the workflow remains inert and was not run.

**Issue 1 — no GitHub-context shell interpolation (corrected).** The confirmation
input and main-branch value were interpolated directly into shell via
`${{ inputs.confirm_phrase }}` and `${{ github.ref }}`. Corrected so no
dispatch-time value is expanded into shell text:
- the confirmation input is passed through the step's `env:` mapping
  (`CONFIRM_PHRASE: ${{ inputs.confirm_phrase }}`) and the shell compares only the
  quoted environment variable: `if [ "$CONFIRM_PHRASE" != "STAGE_STOCKTRENDS_NPM_RELEASE" ]`;
- the main-branch gate uses GitHub's shell environment variable:
  `if [ "$GITHUB_REF" != "refs/heads/main" ]`;
- the expected-version step's existing safe `env:` pattern is preserved.

The validator gained `collectRunShellLines` and `checkShellContextInterpolation`,
which fail closed when a `run:` inline command or run-block shell line directly
contains `${{ inputs.` or `${{ github.`. Expressions in YAML `env:` mappings
remain permitted. Tests prove: the corrected workflow passes; direct
`${{ inputs.confirm_phrase }}` shell interpolation fails; direct
`${{ github.ref }}` shell interpolation fails; and the same expressions in an
`env:` mapping do not fail.

**Issue 2 — immutable full-SHA action pinning (corrected).** `actions/checkout@v4`
and `actions/setup-node@v4` (mutable tags) were replaced with exact approved
release commits, with the security-relevant `with:` options set:
- `actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3` with
  `persist-credentials: false`;
- `actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6.5.0` with
  `node-version: '24'`, `registry-url`, and `package-manager-cache: false`.

The validator gained `checkActionPins` (constants `REQUIRED_CHECKOUT_ACTION/SHA`,
`REQUIRED_SETUP_NODE_ACTION/SHA`, `APPROVED_ACTION_SHAS`), requiring exactly the
approved checkout and setup-node full SHAs, no other external `uses:` action,
`persist-credentials: false`, and `package-manager-cache: false`. Tests reject:
a mutable major tag; an abbreviated SHA; a different full SHA; a different
action; missing `persist-credentials: false`; missing `package-manager-cache: false`.

**Issue 3 — exact npm CLI pin (corrected).** `npm install -g npm@^11.15.0`
(floating) was replaced with `npm install -g npm@11.18.0`, followed by an exact
version-equality guard (`EXPECTED="11.18.0"; CUR="$(npm --version)"; if [ "$CUR" != "$EXPECTED" ]`).
The `MIN_NPM_VERSION` floor constant/`checkNpmFloor` were replaced by
`REQUIRED_NPM_VERSION = "11.18.0"` and `checkNpmPin`, which requires the exact
install, an exact-equality assertion of `npm --version`, and both before
`npm stage publish`, and rejects caret/tilde/range/tag/`latest`, other versions,
and a missing equality assertion.

**Input-declaration contract (added).** `checkInputDeclarations` structurally
enforces that `expected_version` and `confirm_phrase` each exist with
`required: true` and `type: string`; focused negative tests cover each missing
or incorrect property.

**SECURITY_MODEL:** left unchanged — its current P-4 §18 wording (stage-only
OIDC, no long-lived publication credential/token/`NODE_AUTH_TOKEN`,
`workflow_dispatch`-only, gated) does not overstate these controls; it is now
further hardened, not contradicted.

**Test totals after this correction:** `tests/releaseWorkflow.test.ts` **60
cases** (was 38); full suite **`npm test` 1121 passed / 1 skipped across 20
files**. `tests/packageMetadata.test.ts` remains **87**.

**All checks re-run:** typecheck, build, `npm test` (1121/1 skip/20), the three
`check:*` scripts, offline `npm pack` (scoped 37-file tarball, allowlist-clean),
offline isolated install (94 packages), Windows installed-bin MCP `initialize`
(1 tool / 10 resources / 0 prompts, no network), secret scan (clean),
`git diff --check` (clean), all workflow `uses:` confirmed 40-char SHAs, no
floating npm selector, no `${{ inputs. }}`/`${{ github. }}` in any shell line.
Temporary artifacts removed. The workflow was **not run**; no GitHub Actions,
registry, npm, live API, or x402 operation occurred.

---

**Reminder.** This document and its change surface configure repository metadata
and add one inert release workflow and its validators. They query no registry,
check no name, touch no account, configure no publisher, create no token, stage
nothing, publish nothing, approve nothing, submit nothing, change no repository
visibility, create no `server.json`, contact no directory, make no live API
request, use no key, and spend nothing. Every publication operation becomes live
only through a later, separate, exact authorization.
