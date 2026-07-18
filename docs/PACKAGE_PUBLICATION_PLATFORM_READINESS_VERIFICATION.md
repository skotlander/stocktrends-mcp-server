# Package Publication Platform Readiness Verification

Date: 2026-07-18

**Decision classification:**

`OFFICIAL PLATFORM REQUIREMENTS VERIFIED FOR P-2 PLANNING — ACCOUNT
OWNERSHIP, 2FA POSTURE, PACKAGE-NAME AVAILABILITY, NAMESPACE OWNERSHIP,
TRUSTED-PUBLISHER CONFIGURATION, AND PUBLICATION REMAIN UNVERIFIED AND
UNAUTHORIZED`

This document is **P-2A**: a bounded, documentation-only verification of the
current external platform requirements that affect
[`PACKAGE_PUBLICATION_AND_DISTRIBUTION_DECISION_ARCHITECTURE.md`](PACKAGE_PUBLICATION_AND_DISTRIBUTION_DECISION_ARCHITECTURE.md)
(**P-1**, PR #93) phases **P-2 through P-7**. It reads only official public
documentation from npm, GitHub, and the Model Context Protocol project. It
performs **no** account inspection, **no** registry query, **no**
package-name check, **no** namespace claim, and **no** publication operation
of any kind (§16, §18 of P-1 remain fully in force; nothing in this document
narrows them).

This PR is documentation only. It changes exactly two files: this report and
one README documentation-index link. It queries no npm or MCP Registry API,
touches no account, configures no trusted publisher, creates no token, packs
nothing, publishes nothing, and changes no repository visibility. **It does
not authorize P-2B or any other future phase** — see §16 and §18.

---

## 1. Purpose and relationship to P-1

P-1 (§3) recorded a set of **time-sensitive architecture inputs**, dated
2026-07-18, and required that "every one must be re-verified against official
documentation before any implementation or live operation" — the mandatory
**P-2** gate (P-1 §13). This document is the first half of that gate: an
**official-documentation** re-verification. It does not perform the second
half — npm account-readiness inspection, the authorized package-name query,
or namespace verification — all of which require a **separate Level-2
authorization** under P-1 §12 that has not been granted.

This document:

1. verifies P-1's dated external assumptions against current official
   documentation (§4–§11);
2. separates confirmed facts from inferences and unresolved
   account-specific questions (§12, and the A/B/C/D split in §6);
3. identifies the first-publication bootstrap constraint (§6);
4. defines the exact information a future **P-2B** must obtain (§14);
5. proposes a narrow future P-2B authorization package for later owner
   approval (§15);
6. performs no account, name, namespace, registry, or publication
   operation.

**This document does not establish P-2 as complete.** It establishes only
the official-documentation-verification component of P-2. Account
inspection, the package-name query, namespace verification,
trusted-publisher configuration, and publication all remain unverified,
unauthorized, and reserved to a later, separately authorized P-2B (§14–§16).

---

## 2. Working-copy posture (confirmed before editing)

- Checkout: the normal attached checkout at
  `C:\Users\skort\Projects\stocktrends-mcp-server` (no worktree used, none
  created).
- Branch: `docs/package-publication-platform-readiness`.
- HEAD at start of this work: `db19b67` ("Define package publication and
  distribution architecture (#93)").
- Working tree and index were clean before any edit.
- `package.json` confirmed to contain: `name: "stocktrends-mcp-server"`,
  `version: "1.0.0"`, `license: "MIT"`, `private: true` (boolean), no
  `publishConfig`, no publication lifecycle script (`scripts` contains only
  `build`, `dev`, `start`, `test`, `typecheck`, `check:runtime-deps`,
  `check:package-metadata`), and the reviewed four-entry `files` allowlist
  (`dist/**/*.js`, `dist/**/*.d.ts`, `README.md`, `LICENSE`).
- No `.tgz`, `server.json`, publication workflow (`.github/workflows` does
  not exist), registry metadata, consumer project, harness, or temporary
  validation directory exists anywhere in the repository.
- No remote Git fetch or query occurred at any point in producing this
  document.

---

## 3. Official sources consulted

Every source below is read from the five domains this task authorizes:
`docs.npmjs.com`, `docs.github.com`, `modelcontextprotocol.io`,
`github.com/modelcontextprotocol/registry`, and
`registry.modelcontextprotocol.io`. No blog, social media, third-party
tutorial, package-search site, directory, marketplace, or community registry
mirror was read. Access date for every source below is **2026-07-18**.

| # | Page title | Domain | Stability | What it was used to verify |
| --- | --- | --- | --- | --- |
| 1 | Trusted publishing for npm packages | docs.npmjs.com/trusted-publishers/ | Not labeled preview/beta; described as production feature | §4, P2A-F1–F6 |
| 2 | npm-trust (CLI v11) | docs.npmjs.com/cli/v11/commands/npm-trust/ | CLI reference, versioned | §5, P2A-F7–F12 |
| 3 | Generating provenance statements | docs.npmjs.com/generating-provenance-statements/ | Stable reference | §8, P2A-F15–F18 |
| 4 | Requiring 2FA for package publishing and settings modification | docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/ | Stable reference | §7, P2A-F13–F14 |
| 5 | Staged publishing for npm packages | docs.npmjs.com/staged-publishing/ | Stable reference, versioned like trusted publishing | §6, P2A-F31 |
| 6 | OpenID Connect reference / OpenID Connect (concepts) | docs.github.com/en/actions/... (OIDC reference) | Stable reference | §9, P2A-F19 |
| 7 | Deployments and environments / Reviewing deployments | docs.github.com/en/actions/... | Stable reference | §9, P2A-F20 |
| 8 | Working with the npm registry (GitHub Packages) | docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry | Stable reference | §10, P2A-F21 |
| 9 | The MCP Registry | modelcontextprotocol.io/registry/about | Explicitly marked **preview** | §11, P2A-F22–F23, F29 |
| 10 | Quickstart: Publish an MCP Server to the MCP Registry | modelcontextprotocol.io/registry/quickstart | Explicitly marked **preview** | §11, P2A-F24–F27, F30 |
| 11 | How to Authenticate When Publishing to the Official MCP Registry | modelcontextprotocol.io/registry/authentication | Explicitly marked **preview** | §11, P2A-F26 |
| 12 | The MCP Registry Moderation Policy | modelcontextprotocol.io/registry/moderation-policy | Explicitly marked **preview** | §11, P2A-F28–F29 |

No long passage was copied from any source; every quotation below is short
and attributed inline.

---

## 4. npm trusted-publishing findings

Source: docs.npmjs.com/trusted-publishers/ (accessed 2026-07-18).

- **Purpose.** Trusted publishing lets a CI/CD workflow publish using
  OpenID Connect (OIDC) instead of a long-lived npm token, implementing the
  OpenSSF trusted-publishers standard.
- **Currently supported CI/CD providers:** GitHub Actions (GitHub-hosted
  runners), GitLab CI/CD (GitLab.com shared runners), and CircleCI
  (CircleCI cloud).
- **Runner restriction:** self-hosted runners are **not currently
  supported** for npm trusted publishing, though the documentation notes
  this is "planned for future releases." This is an **npm-side**
  restriction — GitHub's own OIDC feature is not limited to GitHub-hosted
  runners for every integration, but npm's trusted-publishing
  implementation currently is.
- **Node/npm minimums for trusted publishing:** npm CLI **11.5.1 or later**
  and Node **22.14.0 or higher**. This is distinct from the `npm trust` CLI
  command's own, higher minimum (§5).
- **Required GitHub Actions workflow permission:** `id-token: write`.
- **`npm publish` and `npm stage publish` support:** both are supported
  under a configured trusted publisher.
- **One trusted publisher per package:** "Each package can only have one
  trusted publisher configured at a time," though a configuration can be
  edited or deleted.
- **Package-existence question:** the page's setup instructions describe
  navigating to "your package settings on npmjs.com" to add a trusted
  publisher — wording that presumes an existing package listing, but the
  page does not contain an explicit standalone sentence ruling out
  pre-existing-package configuration. The `npm trust` CLI reference (§5)
  **does** state this explicitly. See §6 for the full bootstrap finding.

---

## 5. npm trust CLI findings

Source: docs.npmjs.com/cli/v11/commands/npm-trust/ (accessed 2026-07-18).
**This is a distinct, more specific gate than the general trusted-publishing
requirements in §4** — it governs the CLI-driven trust-configuration path
specifically, and carries its own version floor.

- **Minimum npm version:** "npm@11.15.0 or above is required" — **higher**
  than the general trusted-publishing floor of npm 11.5.1 (§4). A
  workflow or operator using `npm trust` itself needs the higher version;
  a workflow merely *publishing under* an already-configured trusted
  publisher needs only the lower floor.
- **Package write access:** required — "You must have write access to the
  package you're configuring."
- **Account-level 2FA:** required — "Two-factor authentication must be
  enabled at the account level."
- **Authentication limitations:** "Granular Access Tokens (GAT) with the
  bypass 2FA option are not supported. Legacy basic auth (username and
  password) credentials will not work for trust commands or endpoints."
- **Package-existence requirement (explicit):** "The package you're
  configuring must already exist on the npm registry."
- **Publish / staged-publish permission choices:** two independent flags,
  `--allow-publish` and `--allow-stage-publish`; at least one is required
  when creating a trust configuration, and both may be granted together.

**Do not run `npm trust`.** No command in this list was executed; every
item above is read from documentation only.

---

## 6. First-publication bootstrap finding

### A. Confirmed current documentation

- The `npm trust` CLI command **explicitly** requires that "the package you
  are configuring must already exist on the npm registry" (§5).
- The general trusted-publishing setup flow (§4) is described entirely in
  terms of navigating to "your package settings on npmjs.com" — a page
  that exists only for an already-listed package.
- Staged publishing (§6a below, and P2A-F31) likewise documents itself as
  something a maintainer does with trusted publishing "from CI/CD" for a
  package already able to be published — it does not describe creating a
  brand-new package's first version through the staging flow without an
  ordinary publish having occurred first.

### B. Reasonable inference

- Taken together, the CLI's explicit requirement and the website flow's
  implicit presumption of an existing package listing support the
  inference that **first-package creation cannot occur through
  trusted-publisher configuration alone** — some ordinary, credentialed
  `npm publish` (interactive login + 2FA, or a short-lived manual token)
  most plausibly has to create the package's first version before a
  trusted publisher can be attached to it.
- This inference is **not** contradicted by anything read in this session,
  but it is also not stated as a single explicit sentence anywhere in the
  four pages read ("you must publish once manually before configuring a
  trusted publisher"). No official page combines the two facts into one
  bootstrap statement.

### C. Account-specific or workflow-specific unknowns

- Whether the Stock Trends npm account (once identified, P-D7) already
  owns any conflicting or reusable package identity.
- Whether the preferred name `stocktrends-mcp-server` is available at all
  (unqueried; P-D3).
- Whether an owner-controlled npm organization/scope exists that could
  simplify or change the bootstrap sequence (P-D4).
- The exact mechanics of "one bounded manual bootstrap publish" — which
  credential mechanism, which operator, which environment — none of which
  this document selects (P-1 §8, P-D6 remain open).

### D. Actions prohibited until separately authorized

- Running `npm login`, `npm trust`, `npm publish`, `npm stage`, or any
  registry-reaching command.
- Creating a package under any identity, preferred or fallback.
- Concluding, on the account's behalf, which bootstrap credential
  mechanism will be used — that is P-D6/P-D7, decided only after P-2B
  account-readiness evidence exists (§14).

**Net finding.** Current official documentation is **consistent with, but
does not explicitly assert as one sentence**, the P-1 architecture's working
assumption (§3.3, §8) that first publication may require a separately
controlled bootstrap step before a trusted publisher can be attached. This
document treats that as a **Class B reasonable inference**, not a Class A
confirmed fact — it is an architecture finding for P-2B to plan around, not
authorization to perform a manual publish.

---

## 6a. Staged publishing (context for the bootstrap finding)

Source: docs.npmjs.com/staged-publishing/ (accessed 2026-07-18).

- Staged publishing adds a review/approval step: a package is submitted to
  a staging area, then "a maintainer must then review and explicitly
  approve the staged package — with two-factor authentication (2FA) via
  the CLI or npmjs.com — before it becomes publicly available."
- It integrates with trusted publishing: "If you use trusted publishing
  (OIDC) from CI/CD, you can use staged publishing to submit a package for
  review before it goes live."
- Version floor: npm CLI **11.15.0 or later**, Node **22.14.0 or higher**
  — the same CLI floor as `npm trust` (§5), not the lower general
  trusted-publishing floor (§4).

---

## 7. Account and 2FA public requirements

Source: docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/
(accessed 2026-07-18). **No Stock Trends account was inspected.**

- **Default posture:** "Require two-factor authentication or a granular
  access token with bypass 2FA enabled" — account-level 2FA is required,
  and interactive publish triggers a 2FA prompt, or a granular access
  token with the bypass-2FA option may be used non-interactively.
- **Recommended stricter posture:** "Require two-factor authentication and
  disallow tokens" — publish must be interactive with a 2FA prompt; no
  granular access token, regardless of its bypass-2FA setting, can publish
  under this posture.
- **Recommended CI/CD posture:** the documentation points toward trusted
  publishing itself as the token-free, strong-authentication CI/CD path,
  without prescribing a specific "disallow tokens after trusted publishing
  is configured" sequencing step as its own named recommendation.

**Consequence for P-1 P-D6/P-D7:** whichever npm account is eventually
identified (P-2B) must already have, or be brought to, account-level 2FA
before any trust configuration or 2FA-gated publish is possible; this is a
BLOCKING account-readiness fact, not something this document can satisfy.

---

## 8. Provenance finding

Source: docs.npmjs.com/generating-provenance-statements/ and
docs.npmjs.com/trusted-publishers/ (accessed 2026-07-18).

- **Confirmed (Class A):** automatic provenance applies only when **all**
  of the following hold: (1) publication uses trusted publishing through
  OIDC; (2) the package is public; (3) the source repository is public.
  Provenance requires a supported cloud CI/CD provider using a
  cloud-hosted runner; the page names **GitHub Actions** and **GitLab
  CI/CD** in this context (it does not name CircleCI here, though CircleCI
  appears in the broader trusted-publishing provider list, §4 — this
  cross-document inconsistency is itself recorded as an item needing
  re-verification at execution time, not resolved here).
- **Confirmed (Class A):** "Ensure your `package.json` is configured with
  a public `repository` that matches (case-sensitive) where you are
  publishing with provenance from."
- **Confirmed (Class A):** when trusted publishing from GitHub Actions or
  GitLab CI/CD is used, provenance attestations are generated
  automatically, without the `--provenance` flag.
- **Confirmed (Class A):** current official npm documentation states that
  provenance is **not supported for private repositories, even when
  publishing a public package**. This is a directly documented current
  npm fact, not an inference — P-1 §3.2/§7's assertion of this consequence
  is **confirmed as stated**, not merely clarified. Like every other
  time-sensitive fact in this document, it is dated 2026-07-18 and must be
  re-verified against official documentation before any implementation or
  live operation (§1; P-1 §13).
- **Repository currently private.** This report does not inspect GitHub
  repository settings (prohibited, §2). It relies on the already-recorded,
  owner-known fact carried forward from P-1 (§3.2) that the Stock Trends
  MCP repository is currently private. **Given that carried-forward fact
  and the confirmed private-repository provenance restriction above,
  automatic provenance is not available under the documented current
  conditions** while the repository remains private at publication time.
  This document does **not** recommend changing repository visibility
  (P-1 §7, P-D5 remain the owner's decision).

---

## 9. GitHub Actions finding

Sources: docs.github.com OpenID Connect reference/concepts pages;
docs.github.com deployments-and-environments and reviewing-deployments
pages (accessed 2026-07-18).

- **GitHub-hosted vs. self-hosted runner support for npm trusted
  publishing:** GitHub's own OIDC mechanism is a general capability not
  inherently restricted to GitHub-hosted runners for all integrations, but
  **npm's trusted-publishing implementation currently supports only
  GitHub-hosted runners** (§4) — this is npm's restriction on top of a
  broader GitHub capability, not a GitHub-imposed limitation.
- **Required permission:** `id-token: write` at the job or workflow level
  is required so GitHub's OIDC provider can issue a token for the run;
  granting it does not itself grant write access to any resource — it
  only allows the workflow to request and use an OIDC token.
- **Protected GitHub environment usefulness:** required reviewers (up to
  six users or teams, each needing at least read access) can gate a
  job that references a protected environment; only one reviewer need
  approve unless self-review prevention is enabled; environment secrets
  are inaccessible to the job until approval. **Plan-dependent nuance:**
  on GitHub Free, Pro, or Team plans, required reviewers are documented as
  available **only for public repositories** — a fact directly relevant
  to this repository's current private status if a protected-environment
  gate (P-1 §9, P-D11) is later designed on a plan where that limitation
  applies. This is recorded as a re-verification item for P-3, not
  resolved here (this document performs no plan/tier inspection).
- **`repository.url` matching requirement:** this is an **npm** provenance
  requirement (§8), not a distinct GitHub-side rule; it is cross-referenced
  here because the task's GitHub-verification checklist names it.

---

## 10. GitHub Packages finding

Source: docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry
(accessed 2026-07-18).

- **Authentication is required to install any npm package from GitHub
  Packages, including public packages.** The documentation states an
  access token is needed "to publish, install, and delete private,
  internal, and public packages," and that pulling a package requires
  authenticating with a personal access token or `GITHUB_TOKEN`
  "regardless of whether the package is public or private."
- **Token scope:** a personal access token (classic) with `read:packages`
  scope, plus read permission on the user account, is required to
  download/install.

**Consequence for P-1 §5.4/§11 P-D2:** this confirms P-1's basis for
**rejecting GitHub Packages as the primary consumer installation channel**
— an unauthenticated `npm install <name>` against the public npm registry
remains materially lower-friction than any GitHub Packages install, public
or not. **P-1's rejection of GitHub Packages as the primary channel remains
justified** by current official documentation.

---

## 11. MCP Registry finding

Sources: modelcontextprotocol.io/registry/about,
.../registry/quickstart, .../registry/authentication,
.../registry/moderation-policy (all accessed 2026-07-18; all pages carry an
explicit preview notice).

- **Current status:** every MCP Registry documentation page fetched in this
  session carries the identical note: "The MCP Registry is currently in
  preview. Breaking changes or data resets may occur before general
  availability."
- **Metadata-registry, not artifact-host role:** "Package registries — such
  as npm, PyPI, and Docker Hub — host packages with code and binaries. The
  MCP Registry hosts metadata that points to those packages."
- **npm-first sequencing (explicit):** "The MCP Registry only hosts
  metadata, not artifacts, so we must publish the package to npm before
  publishing the server to the MCP Registry."
- **Package-to-server verification mechanism (`mcpName`):** for npm
  packages, an `mcpName` property must be added to `package.json`; its
  value becomes the server's name in the MCP Registry, and the `name`
  property in `server.json` **must** match `package.json`'s `mcpName`.
- **Namespace ownership methods currently documented:**
  - **GitHub-based authentication** — server name **must** be of the form
    `io.github.<username>/*` or `io.github.<orgname>/*`; performed via
    `mcp-publisher login github`, an OAuth device-code flow.
  - **Domain-based (DNS) authentication** — server name **must** be of the
    form `<reverse-DNS-of-domain>/*` (e.g. `com.example/*`); proven via a
    DNS TXT record generated from an Ed25519 or ECDSA P-384 key pair (or a
    cloud KMS-backed key), via `mcp-publisher login dns`.
  - **HTTP-based (domain) authentication** — the same reverse-DNS name
    format, proven instead via a `/.well-known/mcp-registry-auth` file
    hosted on the domain, via `mcp-publisher login http`.
- **Server/package version coherence:** the official quickstart's own
  worked example keeps `server.json`'s top-level `version` and the
  `packages[].version` field for the npm package identical (both edited
  from `1.0.0` to `1.0.1` together) — the tooling does not appear to
  auto-derive one from the other; keeping them coherent is a manual
  authoring discipline the publisher must maintain, not an
  automatically-enforced invariant demonstrated in the fetched pages.
- **Version-metadata immutability and deletion/unpublishing — CONFIRMED,
  stated here as the precise distinction current official documentation
  supports:**
  - **Publisher-initiated deletion or unpublishing is currently
    unavailable.** No documented publisher-facing operation removes or
    unpublishes a server or a published version.
  - **Published version metadata is immutable.** A publisher cannot edit
    an already-published version's metadata in place; publisher
    corrections require publishing a **new, unique version**.
  - **Separately, the Registry may set a server's status to `deleted` as
    a moderation action**, distinct from any publisher operation: "Servers
    are generally immutable, except for the status field which can be
    updated to `deleted` (among other states). When we remove a server, we
    set the server's status to `deleted` ... In extreme cases, we may
    overwrite or erase the server's metadata."
  - **A moderation `deleted` status does not generally erase the
    metadata**, which "remains accessible via the MCP Registry API"; only
    downstream aggregators are expected to then remove the server from
    their own indexes. True erasure is reserved for "extreme cases," which
    the moderation policy ties to illegal content, malware, spam, or
    completely broken servers — not ordinary publisher correction
    requests.
  - **The moderation-status mechanism is not a publisher-controlled delete
    or unpublish facility.** It is exercised by Registry maintainers, not
    by the publisher, and a publisher cannot invoke it to remove or amend
    their own listing.
- **Official publisher tool role (`mcp-publisher`):** an official CLI
  distributed via GitHub Releases or Homebrew, with four subcommands:
  `init` (scaffold a `server.json` template), `login` (GitHub/DNS/HTTP
  authentication), `logout`, and `publish` (submit `server.json` to the
  registry).
- **Correction-through-new-version implications:** because publisher-
  initiated deletion/unpublishing is unavailable and published version
  metadata is immutable, P-1's planned "supersede-forward" correction
  posture (P-D17) is the **required** shape for any publisher-side
  correction, not merely a preferred one — publish a corrected higher
  version. A faulty prior version cannot be edited, deleted, or
  unpublished by the publisher, and its metadata may remain
  API-accessible even if Registry moderators separately flag it
  `deleted`.
- **Private-server exclusion:** "The MCP Registry does not support private
  servers" — servers whose installation method or endpoint is not publicly
  reachable (private package registries, internal-only remote endpoints)
  are out of scope for the Registry entirely, independent of npm
  publication status.
- **Security scanning / moderation:** the Registry delegates security
  scanning to underlying package registries (npm, PyPI, Docker Hub) and
  downstream aggregators; the Registry itself performs namespace
  authentication and minimal moderation (illegal content, malware, spam,
  completely broken servers only).

**This document creates no `server.json`, installs no `mcp-publisher`
binary, and makes no request to any MCP Registry API or namespace-auth
endpoint.**

---

## 12. Platform-fact table (P2A-F1 et seq.)

Confidence legend: **High** = directly quoted from the cited page this
session. **Medium** = paraphrased/synthesized from directly-quoted material
on the cited page. **Inferred** = a reasonable but not verbatim-confirmed
consequence (Class B, §6). No row below is marked "account-specific
verified" — none is, by design (§1).

| ID | Platform | Verified requirement | Official source | Access date | Confidence | Implementation consequence | Re-verify at |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P2A-F1 | npm | Trusted publishing supports GitHub Actions, GitLab CI/CD, CircleCI (cloud-hosted only); self-hosted not currently supported | docs.npmjs.com/trusted-publishers/ | 2026-07-18 | High | Any GitHub Actions release runner must be GitHub-hosted | P-3 workflow design; P-5 |
| P2A-F2 | npm | Trusted publishing requires npm CLI ≥11.5.1 and Node ≥22.14.0 | docs.npmjs.com/trusted-publishers/ | 2026-07-18 | High | CI runner image must pin at/above this floor | P-3, P-5 (recent/subject to change) |
| P2A-F3 | npm/GitHub | Requires `id-token: write` workflow permission | docs.npmjs.com/trusted-publishers/; docs.github.com OIDC reference | 2026-07-18 | High | Workflow permissions block must include this scope, minimally | P-3 |
| P2A-F4 | npm | Both `npm publish` and `npm stage publish` supported under trusted publishing | docs.npmjs.com/trusted-publishers/ | 2026-07-18 | High | Either release shape is available once bootstrapped | P-3 |
| P2A-F5 | npm | Only one trusted publisher configurable per package at a time | docs.npmjs.com/trusted-publishers/ | 2026-07-18 | High | No dual-provider trust config; plan for exactly one | P-2B, P-3 |
| P2A-F6 | npm | Trusted-publisher website setup flow presumes an existing package listing | docs.npmjs.com/trusted-publishers/ | 2026-07-18 | Medium | Supports the bootstrap finding (§6) | P-2B |
| P2A-F7 | npm | `npm trust` CLI requires npm ≥11.15.0 — a higher floor than general trusted publishing | docs.npmjs.com/cli/v11/commands/npm-trust/ | 2026-07-18 | High | Operator/runner using `npm trust` itself needs the higher floor | P-2B, P-3 |
| P2A-F8 | npm | `npm trust` requires package write access | docs.npmjs.com/cli/v11/commands/npm-trust/ | 2026-07-18 | High | Whoever configures trust must already have write access | P-2B |
| P2A-F9 | npm | `npm trust` requires account-level 2FA | docs.npmjs.com/cli/v11/commands/npm-trust/ | 2026-07-18 | High | BLOCKING account-readiness prerequisite | P-2B |
| P2A-F10 | npm | `npm trust` rejects GAT-bypass-2FA tokens and legacy basic auth | docs.npmjs.com/cli/v11/commands/npm-trust/ | 2026-07-18 | High | Only full-2FA interactive/OIDC paths work for trust config | P-2B |
| P2A-F11 | npm | `npm trust` explicitly requires the package to already exist on the registry | docs.npmjs.com/cli/v11/commands/npm-trust/ | 2026-07-18 | High | Core bootstrap-ordering fact (§6) | P-2B |
| P2A-F12 | npm | `npm trust` permission flags `--allow-publish` / `--allow-stage-publish`, ≥1 required | docs.npmjs.com/cli/v11/commands/npm-trust/ | 2026-07-18 | High | Trust config must explicitly choose permitted operations | P-3 |
| P2A-F13 | npm | Two 2FA publish postures exist: default (2FA-or-bypass-GAT) and recommended stricter (2FA + disallow tokens) | docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/ | 2026-07-18 | High | Account-level setting choice affects P-D6/P-D7 | P-2B |
| P2A-F14 | npm | Docs recommend trusted publishing (not tokens) for CI/CD | docs.npmjs.com/requiring-2fa-for-package-publishing-and-settings-modification/ | 2026-07-18 | Medium | Supports P-D6's OIDC-first recommendation | P-3 |
| P2A-F15 | npm | Provenance requires a supported cloud CI/CD provider on a cloud-hosted runner; page names GitHub Actions and GitLab CI/CD (not CircleCI, inconsistent with F1's list) | docs.npmjs.com/generating-provenance-statements/ | 2026-07-18 | High (quote); flagged inconsistency | Confirms provenance path narrower than general trusted-publishing provider list | P-2B, P-3 |
| P2A-F16 | npm | `package.json` `repository` must be public and case-sensitively match the actual publishing source | docs.npmjs.com/generating-provenance-statements/ | 2026-07-18 | High | Directly gates provenance eligibility | P-2B, P-3 |
| P2A-F17 | npm | Automatic provenance requires trusted publishing via OIDC, a public package, and a public source repository together; current official npm documentation states provenance is not supported for private repositories, even when publishing a public package | docs.npmjs.com/generating-provenance-statements/; docs.npmjs.com/trusted-publishers/ | 2026-07-18 | High | Confirms P-1 §3.2/§7's assertion as stated, not merely as a clarified inference | P-2B, P-3 (re-verify before implementation; time-sensitive) |
| P2A-F18 | npm | Trusted publishing from GitHub Actions/GitLab CI/CD auto-generates provenance, no `--provenance` flag needed | docs.npmjs.com/generating-provenance-statements/ | 2026-07-18 | High | Simplifies workflow design once trusted publishing is live | P-3 |
| P2A-F19 | GitHub | `id-token: write` only grants the ability to request/use an OIDC token, not resource write access | docs.github.com OIDC reference/concepts | 2026-07-18 | High | Least-privilege framing for workflow permissions (P-1 §9) | P-3 |
| P2A-F20 | GitHub | Protected environments support required reviewers (≤6), self-review prevention, and secret-gating; required reviewers are documented as public-repo-only on Free/Pro/Team plans | docs.github.com deployments-and-environments; reviewing-deployments | 2026-07-18 | High (quote) / Medium (plan applicability unverified for this account) | Private-repo + protected-environment design needs re-check at P-3 against the actual plan | P-3 |
| P2A-F21 | GitHub | GitHub Packages requires an access token (`read:packages`) to install any npm package, public or private | docs.github.com working-with-the-npm-registry | 2026-07-18 | High | Confirms P-1's rejection of GitHub Packages as primary channel | P-3 (re-verify only if GitHub Packages is ever reconsidered) |
| P2A-F22 | MCP Registry | Registry is explicitly marked "currently in preview"; breaking changes/data resets possible before GA | modelcontextprotocol.io/registry/about (and every MCP Registry page fetched) | 2026-07-18 | High | Any MCP Registry submission is a preview-stability risk, not a stable-API commitment | P-7 (mandatory re-check, high change likelihood) |
| P2A-F23 | MCP Registry | Registry hosts metadata only; package registries (npm, PyPI, Docker Hub) host the artifact | modelcontextprotocol.io/registry/about | 2026-07-18 | High | Confirms P-1's "metadata, not artifact host" framing | P-7 |
| P2A-F24 | MCP Registry | npm package must be published to npm before MCP Registry submission | modelcontextprotocol.io/registry/quickstart | 2026-07-18 | High | Confirms P-1's npm-first sequencing (§3.4, P-D15) | P-7 |
| P2A-F25 | MCP Registry | `mcpName` in `package.json` must match `server.json`'s `name`; this is the package-to-server verification mechanism | modelcontextprotocol.io/registry/quickstart | 2026-07-18 | High | A future P-3/P-7 step will need to add `mcpName` to `package.json` — **not done in this document** | P-7 |
| P2A-F26 | MCP Registry | Namespace ownership: GitHub-based (`io.github.<user\|org>/*`) or domain-based (DNS TXT or HTTP well-known file), via `mcp-publisher login` | modelcontextprotocol.io/registry/authentication | 2026-07-18 | High | Owner must choose and control one of these before P-7 (P-D15) | P-2B, P-7 |
| P2A-F27 | MCP Registry | `server.json` version and package version are kept coherent by manual authoring discipline in the official example, not automatic derivation | modelcontextprotocol.io/registry/quickstart | 2026-07-18 | Medium | Confirms P-1's "coherent server and package versions" requirement, with the mechanism clarified as manual | P-3/P-4 (P-D8) |
| P2A-F28 | MCP Registry | Publisher-initiated deletion/unpublishing is currently unavailable; published version metadata is immutable, so publisher corrections require a new unique version; separately, the Registry may set a server's status to `deleted` as a moderation action, and metadata generally remains API-accessible even after that status change; the moderation `deleted` status is not a publisher-controlled delete/unpublish facility | modelcontextprotocol.io/registry/moderation-policy | 2026-07-18 | High | Confirms P-1's immutability and no-deletion/unpublishing claims; the moderation-status mechanism is an added, non-publisher-controlled distinction P-1 did not draw | P-7 |
| P2A-F29 | MCP Registry | Minimal-to-no proactive moderation; only illegal content/malware/spam/completely-broken servers removed; security scanning delegated to upstream registries and downstream aggregators | modelcontextprotocol.io/registry/moderation-policy | 2026-07-18 | High | Sets expectations for what the Registry will and will not catch on its own | P-7 |
| P2A-F30 | MCP Registry | `mcp-publisher` is the official CLI (`init`, `login`, `logout`, `publish`), distributed via GitHub Releases/Homebrew | modelcontextprotocol.io/registry/quickstart | 2026-07-18 | High | Confirms the "official publisher tool role" P-1 §10 referenced without naming it | P-7 |
| P2A-F31 | npm | Staged publishing requires npm ≥11.15.0/Node ≥22.14.0, approval via CLI or npmjs.com with 2FA, integrates with trusted publishing from CI/CD | docs.npmjs.com/staged-publishing/ | 2026-07-18 | High | Confirms P-1's staged-publishing framing with exact version floor added | P-2B, P-3 |

**No account-specific fact is marked verified anywhere in this table.**
Every row above is a public-documentation fact only.

---

## 13. Architecture-assumption reconciliation

| P-1 external assumption | Disposition | Basis |
| --- | --- | --- |
| npm trusted publishing and OIDC (§3.1) | **Confirmed with clarification** | OIDC/trusted-publishing exists and matches P-1's description; P-1 did not name the exact provider list, self-hosted-runner restriction, or the two-tier version-floor distinction (general trusted publishing vs. `npm trust` CLI) — now added (P2A-F1, F2, F7) |
| Minimum Node/npm requirements (§3.1) | **Confirmed with clarification** | P-1 deliberately did not select exact versions ("any version floor named later is a future minimum"); this document supplies the current floors (11.5.1/22.14.0 general; 11.15.0/22.14.0 for `npm trust` and staged publishing) as **re-verify-at-execution-time** figures, not as frozen facts (P2A-F2, F7, F31) |
| Supported runners | **Confirmed** | GitHub-hosted runners only for npm trusted publishing today; self-hosted "planned" but not available (P2A-F1) |
| Private-repository provenance (§3.2, §7) | **Confirmed** | Current official npm documentation states that automatic provenance requires trusted publishing via OIDC, a public package, and a public source repository, and that provenance is not supported for private repositories even when publishing a public package; P-1's assertion matches this directly (P2A-F16, F17) |
| Package-existence bootstrap (§3.3, §8) | **Confirmed** | `npm trust` CLI explicitly requires an existing package; the website flow's wording is consistent with the same requirement (P2A-F6, F11; §6 bootstrap finding) |
| Staged publishing (§3.1 context) | **Confirmed with clarification** | Exists, integrates with trusted publishing, and carries its own version floor and 2FA-gated approval step P-1 did not detail (P2A-F31) |
| GitHub Packages authenticated installation (§3.5) | **Confirmed** | Access token required to install any package, public or private (P2A-F21) |
| MCP Registry preview status (§3.4) | **Confirmed** | Every MCP Registry page fetched carries the identical preview notice (P2A-F22) |
| npm-first sequencing (§3.4) | **Confirmed** | Explicit: package must be on npm before Registry submission (P2A-F24) |
| Namespace verification (§10, §6 C) | **Confirmed with clarification** | GitHub-based and domain-based methods exist as P-1 anticipated; this document adds the exact mechanisms (DNS TXT, HTTP well-known file, `mcp-publisher login`) P-1 left unnamed (P2A-F26) |
| Metadata immutability (§10) | **Confirmed** | Published version metadata is immutable; publisher corrections require a new unique version, matching P-1's assertion directly (P2A-F28) |
| Deletion/unpublishing posture (§10) | **Confirmed with clarification** | Publisher-initiated deletion/unpublishing is unavailable, matching P-1's assertion directly; the added clarification is that a separate, non-publisher, moderation-only mechanism can flip a server's status to `deleted` without generally erasing its metadata — a distinction P-1 did not draw but that does not weaken P-1's supersede-forward correction posture (P-D17), which remains required, not optional (P2A-F28) |

**No item above is marked "superseded."** Every P-1 external assumption
checked against current official documentation is either confirmed or
confirmed-with-clarification; none was found to be factually wrong. Private-
repository provenance unavailability is now a directly confirmed current npm
fact (P2A-F17), matching P-1's assertion as stated. The one item still
carrying a meaningful clarification is the MCP Registry's deletion posture:
publisher-initiated deletion/unpublishing is unavailable and version
metadata is immutable, exactly as P-1 stated, with the added distinction
that a separate, non-publisher, moderation-only status mechanism exists and
does not generally erase metadata — recorded as a **blocker for P-2B to
carry forward accurately**, not as a contradiction requiring P-1 to be
rewritten (per this task's instruction not to edit the accepted P-1
architecture).

---

## 14. P-2B readiness questions

Listing these questions does not decide them, does not authorize any
registry query, account inspection, or namespace claim, and does not
authorize publication or removal of `private: true`.

1. Which npm account or organization is intended to own the package?
2. Is that identity controlled by the owner (Stock Trends), verifiably?
3. Is account-level 2FA enabled on that account, and is its posture
   (default vs. "require 2FA and disallow tokens," §7) suitable?
4. Does the account meet the current publication-security requirements
   this document recorded (P2A-F9, F10, F13)?
5. Is `stocktrends-mcp-server` available, appropriate, and controllable as
   an unscoped npm name? (Requires the single authorized P-D3 query, not
   performed here.)
6. If unavailable or unsuitable, which verified owner-controlled scope or
   fallback identity (P-D4) is permitted, and is that scope itself
   genuinely owner-controlled?
7. Does the account already contain or control any relevant, possibly
   conflicting, package identity?
8. Which first-publication bootstrap path is officially available for the
   identified account — specifically, what exact manual/bootstrap publish
   step (credential mechanism, operator, environment) will create the
   package's first version before a trusted publisher can be attached
   (§6)?
9. Once bootstrapped, can trusted publishing then be configured, and under
   which of the two version floors (general vs. `npm trust`/staged, P2A-F2
   vs. F7/F31) does the intended release workflow actually operate?
10. Which exact GitHub Actions workflow and protected environment (P-1 §9,
    P-D11) would be bound to the trusted-publisher configuration, and does
    the intended plan tier support required reviewers on a private
    repository (P2A-F20)?
11. Is the repository remaining private through first publication, and is
    the resulting lack of automatic provenance (§8, P2A-F16/F17) accepted
    as-is, or does this trigger a separate Option B repository-publication
    review (P-1 §7, P-D5)?
12. Given that publishers currently cannot delete or unpublish their MCP
    Registry server entry, that published version metadata is immutable,
    that publisher corrections therefore require publishing a new unique
    version, and that the Registry may separately assign a moderation
    status of "deleted" that is not a publisher-controlled deletion
    facility and generally does not erase the metadata (P2A-F28), does the
    owner accept that immutable, supersede-forward correction posture
    (P-D17) as the standing correction plan?
13. Which exact P-3 implementation decisions (private:true removal timing,
    publishConfig contents, workflow trigger design, first version number)
    are then enabled by the answers above?

---

## 15. Proposed P-2B authorization package (non-executing draft)

This is a **proposal for later, separate owner approval** — it authorizes
nothing by existing in this document (P-1 §12 Level 2 applies unchanged).

**May propose authorizing exactly:**

1. One official-documentation re-verification session at P-2B execution
   time (this document's facts, especially P2A-F2/F7/F17/F22/F28, are
   dated 2026-07-18 and may have drifted).
2. One browser-based or officially supported npm account-readiness
   inspection (confirm the intended account exists and is reachable by
   its controller — no modification).
3. Confirmation of account identity and 2FA status **without changing
   either**.
4. One exact query for the preferred package name
   (`stocktrends-mcp-server`), scoped and logged, per P-1 P-D3.
5. Only if that name is unavailable or unsuitable: one bounded
   verification of an already owner-identified fallback identity or scope
   — not an open-ended search for alternatives.
6. Inspection of trusted-publisher eligibility and bootstrap options for
   the identified account (e.g., viewing the "Trusted Publisher" section
   of package/account settings if a package already exists, or confirming
   its absence if not) **without configuring anything**.
7. Bounded evidence recording of the above, with all secrets, tokens, and
   account-identifying material redacted before it is written to any
   document.

**Must explicitly exclude — none of the following may be authorized by any
P-2B package derived from this proposal:**

- Account creation.
- Account modification of any kind.
- Enabling, disabling, or changing 2FA.
- Organization or team creation/modification.
- Package creation (including any bootstrap/manual first publish).
- Token creation of any kind (classic, granular, or otherwise).
- Trusted-publisher configuration (`npm trust`, or the npmjs.com UI
  equivalent).
- Workflow creation (no `.github/workflows` file).
- `private: true` removal.
- `publishConfig` changes.
- Package publication or staged publication.
- Package deprecation or deletion.
- Any MCP Registry operation (login, `server.json` creation,
  `mcp-publisher` installation or invocation, submission, or query).
- Directory or marketplace submission.
- Remote MCP deployment.
- Live Stock Trends API or x402 operation of any kind.

**This proposed package is not itself authorization.** It exists only to
give a future owner a concrete, narrow shape to approve, amend, or reject.

---

## 16. P-2B stop conditions

A future P-2B execution must halt and return for owner disposition on any
of the following:

- The intended npm owner identity is unclear or disputed.
- The owner cannot demonstrate control of the intended npm account or
  organization.
- Account-level 2FA is absent, or its configured posture is unsuitable for
  the intended release workflow.
- The preferred package name `stocktrends-mcp-server` is unavailable.
- A name collision or identity concern is found (confusable name,
  possible squat, possible trademark concern).
- A proposed fallback scope's ownership cannot be cleanly verified as
  owner-controlled.
- The first-publication bootstrap procedure needed for the identified
  account is not officially documented, or documentation has changed
  since 2026-07-18 in a way that reopens §6.
- Any step would require a credential mechanism not already approved
  under a Level-2/Level-3 authorization.
- Any step would require modifying an account or creating a package
  outside the narrow bounds of §15.
- The repository-visibility/provenance decision (P-D5) is still
  unresolved when a bootstrap step would otherwise be reached.
- Any secret, token, account identifier, or other sensitive material is
  accidentally exposed during evidence recording.
- Executing the authorized steps would require more queries, inspections,
  or operations than §15 explicitly lists.

On any of these: **halt, record the condition, and return the finding to
the owner for disposition.** No condition above is self-resolving; none may
be worked around by a broader reading of an existing authorization.

---

## 17. No-implementation conclusion

**This document, P-2A, establishes:**

- Current public platform requirements for npm trusted publishing, the
  `npm trust` CLI, staged publishing, npm 2FA policy, npm provenance,
  GitHub Actions OIDC/environments, GitHub Packages authentication, and
  the Official MCP Registry, each dated 2026-07-18 (§4–§11, §12).
- A reconciliation of those requirements against the P-1 architecture's
  external assumptions, finding every checked assumption confirmed or
  confirmed-with-clarification, none superseded (§13).
- The first-publication bootstrap constraint as a documented Class
  A/B/C/D finding: the ordering concern is real and consistent with
  current documentation, though not asserted as one explicit official
  sentence (§6).
- The exact questions and controls a future P-2B must resolve (§14), and a
  narrow, non-executing proposed authorization package and stop-condition
  set for that future phase (§15, §16).

**This document does not establish:**

- Account readiness of any kind.
- Package-name availability (unqueried; P-D3 remains open).
- Identity or namespace ownership (unqueried; P-D4/P-D15 remain open).
- Workflow readiness (no workflow file exists).
- Publication credentials of any kind.
- Trusted-publisher configuration.
- Public package readiness.
- Publication authorization at any level (P-1 §12 Levels 2 and 3 remain
  entirely unexercised by this document).

**P-2 is not complete.** This document satisfies only the
official-documentation-verification component of the P-2 gate described in
P-1 §13. The account-readiness verification, the single authorized
package-name query, and namespace verification remain outstanding and
require the separate Level-2 authorization this document explicitly does
not grant (§1, §15, §16).

---

## 18. Final classification

`OFFICIAL PLATFORM REQUIREMENTS VERIFIED FOR P-2 PLANNING — ACCOUNT
OWNERSHIP, 2FA POSTURE, PACKAGE-NAME AVAILABILITY, NAMESPACE OWNERSHIP,
TRUSTED-PUBLISHER CONFIGURATION, AND PUBLICATION REMAIN UNVERIFIED AND
UNAUTHORIZED`

The package is not classified as publicly available, registry-published,
name-reserved, namespace-owned, or ready for any publication operation.
Merging this document records only that its official-documentation findings
were read and reconciled; it authorizes no external operation, no account
inspection, no registry query, and no P-2B execution. A future P-2B
requires its own separate, exact Level-2 authorization naming precisely
which of the §15 proposed operations it permits.

---

**Reminder.** This document queries no registry, checks no package name,
touches no npm or GitHub account, configures no trusted publisher, creates
no token, packs nothing, publishes nothing, submits nothing, changes no
repository visibility, creates no `server.json`, installs no
`mcp-publisher`, contacts no directory, makes no live API request, uses no
key, and spends nothing. Every finding above is read from official public
documentation only, dated 2026-07-18, and is subject to re-verification
before any future live operation.
