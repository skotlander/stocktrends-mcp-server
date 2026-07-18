# Package Publication and Distribution Decision Architecture

Date: 2026-07-18

**Decision classification (proposed, before owner merge of this PR):**

`PROPOSED FOR OWNER REVIEW — PUBLICATION AND DISTRIBUTION ARCHITECTURE ONLY;
NO REGISTRY QUERY, PACKAGE-NAME CHECK, ACCOUNT OPERATION, PUBLICATION,
MCP REGISTRY SUBMISSION, DIRECTORY SUBMISSION, OR REMOTE MCP AUTHORIZED`

This document is **P-1**: the governed decision architecture for a *possible*
future public release of `stocktrends-mcp-server`, beginning from the completed
and owner-accepted local package-readiness phase
([`PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md`](PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md),
PR #92) and ending — only through a sequence of separately authorized future
phases — at a public npm package and a subsequent Official MCP Registry entry.

**This PR is documentation only.** It changes exactly two files: this memo and
one README documentation-index link. It queries no registry, checks no
package name, touches no npm or GitHub account, configures no trusted
publisher, creates no token, packs nothing for release, publishes nothing,
submits nothing, changes no repository visibility, and alters no publication
control. It makes no live Stock Trends API request, uses no API key, and
performs no x402, proof, payment, or spend operation. **It does not authorize
any of those actions either** — see §18.

**Merging this memo does not authorize any external operation.** It records the
owner's acceptance of a *framework*: a recommended channel hierarchy, a phased
process, a security model, an owner-decision register, a validation matrix, and
a set of stop conditions. Every live operation the framework describes remains
gated behind a later, separate, exact authorization (§12, §18).

---

## 1. Purpose, scope, and what this memo is not

### 1.1 What this memo is

This memo answers, as a concrete recommended architecture with preserved future
execution gates, the ten questions that a responsible move from *locally
validated but unpublished* to *possibly published* must settle:

1. **Should Stock Trends proceed toward public package publication?** (§4, §11 P-D1)
2. **What distribution channel should be primary?** (§5, §11 P-D2)
3. **What role should the Official MCP Registry play?** (§5.2, §10, §11 P-D15)
4. **What role, if any, should GitHub Releases and GitHub Packages play?** (§5.3, §5.4, §11 P-D14)
5. **What owner decisions must precede a package-name query?** (§6, §11 P-D3)
6. **What decisions must precede changing `private: true`?** (§9-scope note, §11 P-D9)
7. **What security and release controls must precede publication?** (§8, §9, §11 P-D6/P-D11/P-D12)
8. **How will the first publication be validated?** (§13 P-4 → P-6, §14)
9. **What must happen before directory and marketplace promotion?** (§13 P-8, §11 P-D16)
10. **What failures require stopping, correcting, deprecating, or abandoning the proposed publication?** (§11 P-D17, §15)

### 1.2 What this memo is not

- It is **not** a publication approval.
- It is **not** a claim that the package name `stocktrends-mcp-server` is
  available on npm or any other registry — that is unqueried and unknown (§6, §11 P-D3).
- It is **not** a claim that an npm account is ready, owned, or 2FA-configured (§8, §11 P-D7).
- It is **not** a claim of MCP Registry namespace ownership (§10, §11 P-D15).
- It is **not** a claim of public-package availability (§16).
- It is **not** legal advice, financial advice, or investment advice.
- It is the **sole** new decision artifact of P-1; the README index link is its
  only companion change (§13 P-1, and the expected change surface recorded there).

---

## 2. Current accepted local-readiness baseline

The following is treated as **already established and owner-accepted by PR #92**
([`PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md`](PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md)).
This memo does **not** reopen or re-run any of it.

| # | Accepted fact | Authoritative source |
| --- | --- | --- |
| 1 | Local package identity and MIT license are coherent (`stocktrends-mcp-server`, `1.0.0`, unscoped, author/copyright `Stocktrends Publications`, canonical root `LICENSE`) | [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md) |
| 2 | Direct runtime dependency declarations are complete — exactly `@modelcontextprotocol/sdk` and `zod`, verified statically and offline (V-26) | [`PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md`](PACKAGE_RUNTIME_DEPENDENCY_CONTRACT_CORRECTION.md) |
| 3 | The package artifact has a **closed 37-path allowlist** (17 `dist/**/*.js` + 17 `dist/**/*.d.ts` + `package.json` + `README.md` + `LICENSE`) enforced by a 4-entry `files` field | [`PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md`](PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md), [`OFFLINE_PACKAGE_ARTIFACT_CONTENT_VALIDATION_REPORT.md`](OFFLINE_PACKAGE_ARTIFACT_CONTENT_VALIDATION_REPORT.md) |
| 4 | Offline artifact-content validation passed (measured, not assumed) | [`OFFLINE_PACKAGE_ARTIFACT_CONTENT_VALIDATION_REPORT.md`](OFFLINE_PACKAGE_ARTIFACT_CONTENT_VALIDATION_REPORT.md) |
| 5 | Isolated **offline** installation passed | [`CROSS_PLATFORM_PACKAGE_INSTALL_STDIO_VALIDATION_REPORT.md`](CROSS_PLATFORM_PACKAGE_INSTALL_STDIO_VALIDATION_REPORT.md) |
| 6 | The npm-installed bin completed MCP `initialize` on Windows **and** WSL2 Ubuntu; **B-5 is closed on those two approved tested environments** (Windows 11 Home 10.0.26200 / Node v22.23.1; WSL2 Ubuntu 24.04.4 LTS / Node v20.20.2), at the corrected source commit | [`B5_POSIX_INSTALLED_BIN_CORRECTION_MEMO.md`](B5_POSIX_INSTALLED_BIN_CORRECTION_MEMO.md), [`CROSS_PLATFORM_PACKAGE_INSTALL_STDIO_VALIDATION_REPORT.md`](CROSS_PLATFORM_PACKAGE_INSTALL_STDIO_VALIDATION_REPORT.md) |
| 7 | The exact default/free surface is **one tool** (`stocktrends_estimate_workflow_cost`), **ten resources**, and **no prompts** (undefined prompts capability) | [`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md) §8 |
| 8 | The refreshed consumer README was validated **inside the final local artifact** (V-28) | [`PACKAGE_DOCUMENTATION_REFRESH_AND_TAIL_VALIDATION_REPORT.md`](PACKAGE_DOCUMENTATION_REFRESH_AND_TAIL_VALIDATION_REPORT.md) |
| 9 | The package remains **local and unpublished** | handoff §8, §10 |
| 10 | `private: true` remains the accidental-publication guard; no `publishConfig`; no publication lifecycle script | [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md) §8, [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §18 |
| 11 | **No** registry availability or package-name evidence exists | handoff §8, D-10 deferred |
| 12 | **No** directory or marketplace submission occurred | handoff §7 D-12 |
| 13 | **No** remote or hosted MCP exists | [`PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md`](PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md) §7 |
| 14 | Publication requires a **new, separately authorized decision** | handoff §9, §10, §12 |

**This memo does not repeat or reopen the completed local package-validation
phase.** It consumes that phase's accepted conclusion as its starting line.

**One carried-forward, non-blocking item.** `SERVER_VERSION` in `src/server.ts`
still hand-duplicates `package.json` `version` (**B-8**, open, never a phase
blocker; versioning policy **D-9** was recommended, never selected). This
matters to publication because a version is what gets published; it is folded
into P-D8 (§11) rather than treated as resolved.

---

## 3. Current external platform constraints (dated 2026-07-18)

These are **time-sensitive architecture inputs** captured on 2026-07-18. They
are recorded so the architecture can reason about them; **every one must be
re-verified against official documentation before any implementation or live
operation** (this re-verification is the mandatory **P-2** gate, §13). None is
acted upon here.

### 3.1 npm trusted publishing (OIDC)

Current official npm documentation describes **trusted publishing through OIDC**
for supported cloud CI/CD providers, including GitHub-hosted GitHub Actions. Its
security advantage is **avoiding a long-lived npm publish token**. Current
requirements include sufficiently current Node and npm versions and an exact
trusted relationship to an authorized workflow. **This architecture does not
select exact CI versions**; any version floor named later is a *future minimum
subject to re-verification*, never a fact asserted here.

### 3.2 Private repository and npm provenance

Current npm documentation states that **automatic provenance is not generated
for a package published from a private repository**, even when the package
itself is public. The Stock Trends MCP GitHub repository is **currently
private**. The architecture therefore forces an explicit owner decision (§7,
§11 P-D5) between:

- retaining the private repository and accepting that npm provenance may not be
  available;
- making some or all relevant source public before release, through its own
  separately reviewed decision;
- another officially supported publication design verified later.

**This memo does not recommend changing repository visibility, and does not
expose the repository.**

### 3.3 First-publication bootstrap

Trusted-publisher configuration, first-package creation, account ownership, 2FA,
staged publication, and initial-publication procedures may have **bootstrap
dependencies** — in particular, a trusted publisher may or may not be
configurable *before the package exists*. This memo does **not** guess the
ordering. It creates a **mandatory P-2 official-document and account-readiness
verification gate** for exactly this issue (§8, §13 P-2). **No npm account
operation is authorized now.**

### 3.4 Official MCP Registry

The Official MCP Registry currently stores **server metadata, not package
artifacts**. For an npm-distributed stdio server, the npm package must be
**publicly available before** the MCP Registry entry can be validated and
published. The Registry is currently described as **preview**. Registry metadata
versions are **immutable**, and current official guidance says server
deletion/unpublishing is **not** available. Therefore MCP Registry publication
must occur **only after**: successful npm publication; public-package
installation validation; release-metadata validation; and an explicit **separate
MCP Registry authorization** (§10, §13 P-7).

### 3.5 GitHub Packages

Current GitHub documentation requires **authentication for npm package
installation through GitHub Packages, including public packages**. This
architecture therefore treats GitHub Packages as an **evaluated alternative or
secondary archive, not the presumptive primary public installation channel**
(§5.4). It configures nothing.

### 3.6 npm public registry (the presumptive candidate to evaluate)

The presumptive primary recommendation this architecture must **evaluate rather
than silently assume** is:

- **public npm registry** for artifact distribution and low-friction installation;
- **Official MCP Registry** afterward for MCP discovery metadata;
- **optional GitHub Release** afterward as a human-facing release record;
- **GitHub Packages not used** as the primary consumer installation channel.

§5 performs that evaluation and reaches a recommendation.

---

## 4. Should Stock Trends proceed toward public package publication?

**Recommended answer: Yes — proceed *toward* publication through the gated
sequence in §13, and no further.** The local-readiness phase produced exactly
the class of evidence that makes a public artifact defensible: a closed
allowlist, an offline-validated artifact, a complete static dependency contract,
a cross-platform installed-bin `initialize`, and a supply-chain surface with no
lifecycle scripts and a `private: true` guard (§2). The only remaining friction
on adoption — "clone the repository and build it yourself" — is precisely what a
published package removes, **without changing runtime capability** (the surface
stays 1 tool / 10 resources / 0 prompts; paid and x402 postures are unchanged,
§17).

**But "proceed toward" is not "publish."** Proceeding means authorizing the
*architecture*, then walking the phases. It does **not** collapse the P-2
readiness gate, the P-5 exact publication authorization, or any owner decision
in §11. The correct posture is: accept the direction, then decide each live step
on its own evidence, at its own time, under its own authorization.

Whether to proceed *at all* is itself an owner decision — **P-D1** (§11). This
section is the architecture's recommendation, not the owner's ruling.

---

## 5. Recommended distribution-channel architecture

The architecture evaluates the §3.6 candidate sequence against ten dimensions
and **recommends it**, with GitHub Packages **rejected as the primary channel**.

### 5.1 Public npm registry — RECOMMENDED as the primary artifact channel

| Dimension | Assessment |
| --- | --- |
| **Consumer discoverability** | npmjs.org is the default discovery and search surface for the JavaScript/TypeScript ecosystem the SDK and this package already live in. Highest reach for the least effort. |
| **Agent discoverability** | An MCP stdio server that installs by name (`npx`/`npm install`) is the shape MCP clients and agent tooling expect; it is also the artifact the Official MCP Registry will *reference* (§10). npm is the substrate; the Registry is the index. |
| **Installation friction** | Lowest of the evaluated options: unauthenticated `npm install <name>` / `npx <name>` with no registry configuration. GitHub Packages cannot match this (§5.4). |
| **Namespace & identity coherence** | The retained local identity `stocktrends-mcp-server` maps directly to an unscoped npm name **if available and controllable** (unknown; §6). npm scope is the coherent fallback (§6 B). |
| **Security posture** | Supports OIDC trusted publishing (no long-lived token, §3.1), 2FA on the account, and provenance **when prerequisites are met** — but provenance is constrained by repository visibility (§3.2, §7). |
| **Release repeatability** | Well-defined `npm pack` → compare-to-allowlist → `npm publish` flow; immutable published versions enforce discipline. Repeatable from a clean, commit-bound runner (§8, §9). |
| **Rollback / correction posture** | Weak by design and must be planned for: unpublish windows are narrow, deprecation supersedes rather than deletes, and a name once taken is taken (P-D17, §15). This is a *reason for caution*, not against npm. |
| **Repository-visibility implications** | npm publication does **not** require a public repository; a private repository can publish a public package (§3.2). Visibility couples to provenance, not to the ability to publish (§7). |
| **Provenance implications** | Automatic provenance is unavailable from a private repository (§3.2); this is an accepted limitation under P-D5 Option A, not a blocker. |
| **Operational burden** | Modest and mostly one-time (account/2FA/trusted-publisher bootstrap, §8); steady-state is a bounded release workflow (P-D11). |

**Verdict: public npm registry is the recommended primary artifact channel.**

### 5.2 Official MCP Registry — RECOMMENDED as the subsequent discovery channel

The MCP Registry is the ecosystem's **discovery index for MCP servers**, keyed
by a namespaced server identity distinct from the npm package name (§6 C, §10).
It is the right *second* step because it stores metadata that *points at* the
npm package — so the npm package must exist and be public first (§3.4). It is
**not** an artifact host and must never be treated as an install channel.
Recommended, but strictly **after** P-6 public-install validation and under a
**separate** authorization (§13 P-7, §11 P-D15).

### 5.3 GitHub Release — RECOMMENDED as an optional human-facing record

A GitHub Release is useful as a **release-note and source-tag record** bound to
the exact published commit and version — a human audit trail. It is **optional**
and **secondary**: it must not precede successful package publication (unless
explicitly designed as a reviewed release candidate), must not carry an
unreviewed artifact, and is **not** the npm installation channel (§5.4, §11
P-D14).

### 5.4 GitHub Packages — REJECTED as the primary channel

GitHub Packages requires **authentication even for public-package npm
installation** (§3.5), which adds consumer friction the public npm registry does
not. Its scoped identity and registry configuration differ from npmjs.org, and
selecting it *merely because the source is hosted on GitHub* would be a
non-reason. It is therefore **rejected as the primary consumer installation
channel**; it may remain an *evaluated secondary archive* only if a future,
separately reviewed need arises. This architecture **configures nothing** for
it.

### 5.5 Recommended channel hierarchy

```text
1. Public npm registry        — PRIMARY artifact + install channel (P-D2)
2. Official MCP Registry      — SUBSEQUENT MCP discovery metadata, after npm public-install validation (P-D15)
3. GitHub Release (optional)  — human-facing release-note / source-tag record, after publication (P-D14)
   —
   GitHub Packages            — NOT the primary channel; authenticated-install friction (P-D2 alt, rejected)
```

**No channel is implemented by this memo.**

---

## 6. Package identity and namespace decision tree

The retained local identity is **`stocktrends-mcp-server`** (unscoped, `1.0.0`,
`Stocktrends Publications`; §2). Retaining it for local validation is **not** a
claim that the npm name is available or controllable — that is unqueried and
unknown (§11 P-D3).

### A. Preferred outcome

**Retain the unscoped npm name `stocktrends-mcp-server`** *if and only if* it is:

- **available** (verified by an authorized, single, bounded package-name query
  in P-2 — not performed here);
- **appropriate** (no confusing collision, squat, or trademark conflict); and
- **controllable** (registrable and ownable by the project's npm account, whose
  readiness is a separate P-2 check, §8).

If all three hold, no scope is introduced and the npm identity mirrors the local
one exactly.

### B. Unavailable or unsuitable unscoped name — fallback categories

Evaluated **without querying them** and **without inventing an owner-controlled
scope that has not been verified**:

1. **A scoped npm package under an owner-controlled npm scope** — e.g. an
   organization scope the project controls. This memo **does not name or assume**
   any specific scope, GitHub username, company handle, npm account, or MCP
   namespace as available or controlled; scope ownership is itself a P-2
   verification (§8) and an owner choice (P-D4).
2. **A carefully chosen alternative unscoped identity** — a distinct,
   non-confusing unscoped name, itself subject to the same availability /
   appropriateness / controllability test.
3. **Deferral of publication** — if no acceptable identity is available or
   controllable, defer rather than publish under a compromised identity.

**The fallback *process* (which category to prefer, in what order) is an owner
decision — P-D4 (§11).** This memo does not pre-commit it.

### C. MCP Registry identity is distinct

The **MCP Registry server name is a separate namespaced identity** from the npm
package name (§10). It requires an owner-controlled namespace, chosen later from
officially supported options — for example:

- a **GitHub-authenticated namespace**;
- a **domain-verified namespace**; or
- another officially supported owner-controlled namespace.

**This memo chooses and registers no namespace** (§18). The choice is a future
decision under P-D15, taken only after npm public-install validation.

```text
Identity decision tree (no live query performed):

  Is `stocktrends-mcp-server` available + appropriate + controllable on npm?
        │
   yes ─┼─ RETAIN unscoped npm name  ──────────────► (P-D3 authorizes the query; P-D4 unused)
        │
   no / unsuitable
        │
        ├─ owner-controlled npm scope exists & chosen?  ──► scoped npm package (P-D4)
        ├─ acceptable alternative unscoped identity?     ──► alternative unscoped name (P-D4)
        └─ neither acceptable?                            ──► DEFER publication (P-D4)

  MCP Registry server name = a DISTINCT namespaced identity (P-D15),
    chosen later from GitHub-authenticated / domain-verified / other supported namespace.
```

---

## 7. Private repository and provenance decision

This issue gets its own section because it is the sharpest coupling between a
business/security choice (repository visibility) and a supply-chain feature
(npm provenance). **This memo does not select an option and does not change
visibility.** It is decided under **P-D5** (§11).

### Option A — Keep the repository private

- **Advantages:** preserves current source confidentiality and access posture;
  requires no new disclosure review; publication of a *public package* remains
  fully possible (§3.2).
- **Costs:** current npm **provenance limitation** (automatic provenance not
  generated from a private repository, §3.2); weaker public source
  transparency; possible additional trust/adoption friction for consumers who
  weigh provenance.

### Option B — Make the repository public

- **Advantages:** public reviewability; potential npm **provenance support**
  when *all* official prerequisites are met; easier ecosystem trust and
  contribution.
- **Costs:** **irreversible disclosure** of repository history and source unless
  carefully prepared; security, licensing, secret-history, documentation,
  business, and support implications; **requires its own complete
  repository-publication review** — a separate architecture, not a side effect
  of package publication.

### Option C — Defer publication

- Appropriate if provenance or repository-visibility decisions are unresolved.
  Deferring is a legitimate, fail-safe outcome, not a failure.

**Guidance.** Do **not** select Option B *merely to obtain provenance* —
provenance is one input among many, and public disclosure is irreversible. If
public visibility is ever considered, it requires a **separate
repository-publication architecture** with its own secret-history, licensing,
and business review. Under Option A, the accepted posture is: **publish a public
package from a private repository and accept that automatic provenance may be
unavailable**, documenting that limitation honestly rather than papering over
it.

---

## 8. First-publication bootstrap assessment

Publication is not a single command; it has a **bootstrap** whose ordering this
memo must not guess (§3.3). The mandatory **P-2** gate (§13) must obtain
official-document confirmation of, at minimum:

- **npm account and ownership** — which account owns/will own the package, and
  that it is genuinely controlled by the project (not assumed);
- **required 2FA posture** — account- and publish-level two-factor requirements;
- **whether package creation must precede trusted-publisher configuration** —
  the core bootstrap-ordering unknown (§3.3): a trusted publisher may not be
  configurable before the package exists, which would force a tightly controlled
  *initial* publication before OIDC can take over;
- **staged-publishing availability and suitability** — whether a staged/pending
  publication flow exists and fits;
- **exact Node/npm requirements** — the current minimums for OIDC trusted
  publishing, captured as *future minimums subject to re-verification*, never
  hard-coded here (§3.1);
- **private-repository implications** — the provenance consequence of §3.2/§7
  under the chosen visibility.

Because of the bootstrap-ordering unknown, **P-D6** (authentication) explicitly
allows a *tightly controlled initial manual/bootstrap publication followed by
trusted publishing* as one option — chosen only if P-2 confirms the ordering
requires it. **No npm account operation is authorized now.**

---

## 9. First-publication security model

The security controls below are **requirements for the future publication
phases**, not actions taken here. Publication must **not** change runtime
authority (§17); it changes only how the already-validated artifact is
distributed.

**Publication identity and credentials**

- **Least-privilege publication identity** — the narrowest identity that can
  publish this one package; no broad org-wide rights.
- **No credentials committed to the repository**; **no credential printed to
  logs**; request headers and tokens treated as sensitive by default
  ([`SECURITY_MODEL.md`](SECURITY_MODEL.md) §2, §9).
- **No broad reusable automation token by default.** A long-lived, broad publish
  token is **not** the default recommendation (P-D6).
- **Short-lived OIDC** where officially supported and selected (§3.1), so no
  long-lived publish secret exists.

**Release runner and workflow**

- **Protected GitHub environment or equivalent approval** gating the publish step.
- **Restricted workflow permissions** — minimal token scopes; no ambient write
  access beyond what publish requires.
- **Immutable binding to an exact source commit and version** — the published
  artifact traces to one reviewed commit and one version (P-D12, §14 P-V15).
- **Clean cloud-hosted release runner** if trusted publishing is selected — a
  fresh, reproducible environment, not a developer workstation.
- **Publication is never triggered by an ordinary merge to `main`** (P-D11) — it
  requires a bounded, explicitly approved trigger.

**Artifact integrity**

- **Package-content allowlist** — the closed 37-path allowlist (or a
  deliberately revised, re-reviewed one) re-verified against the rebuilt
  artifact (§2, §14 P-V16).
- **Runtime-dependency validation** — the static, offline `check:runtime-deps`
  contract re-confirmed against the compiled output (§2, §14 P-V18).
- **Secret and forbidden-material scan** over the **unpacked** artifact
  ([`SECURITY_MODEL.md`](SECURITY_MODEL.md) §18; §14 P-V17).
- **No lifecycle installation scripts** — `preinstall`/`install`/`postinstall`/
  `prepare`/`prepack`/`postpack`/`prepublish`/`prepublishOnly`/`publish`/
  `postpublish` all absent; a consumer install triggers no code (§14 P-V19).
- **No network-dependent package runtime initialization** — startup makes no
  fetch; the installed-bin `initialize` window is network-free (§2, §17).

**Blast-radius and evidence**

- **No accidental paid / API-key / x402 activation** during package validation
  (§17; §14 P-V30).
- **Audit evidence** — each release step records commit, version, artifact
  checksum, and validation outcomes.
- **Bounded retries** — publication has **no automatic retry** (§15); a failed
  publish requires a new disposition, not a re-run.
- **Cleanup** — every `.tgz`, unpacked directory, and temporary consumer removed
  after validation; none committed (§2 item 3, [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §18).
- **Incident response** — a defined correction/deprecation path for a faulty
  first release (P-D17, §15), given that deletion/unpublishing may be
  unavailable on both npm and the MCP Registry.

---

## 10. MCP Registry architecture

Recorded facts (to be re-verified in P-2, §3.4):

- the MCP Registry is a **metadata registry, not the artifact host**;
- it **follows** successful artifact publication;
- it currently remains **preview**;
- it requires **owner-controlled namespace verification**;
- it requires **coherent server and package versions**;
- its published metadata versions are **immutable**;
- it may **not** currently permit deletion/unpublishing.

**Requirements before any MCP Registry submission (P-7, §13):**

- an **exact namespace decision** (P-D15) and **exact server name** (distinct
  from the npm package name, §6 C);
- the **exact npm package identity and version** the entry references;
- transport declared as **`stdio`**;
- **accurate environment-variable declarations** (names only — e.g.
  `STOCKTRENDS_API_KEY`, `STOCKTRENDS_ENABLE_PAID_TOOLS`,
  `STOCKTRENDS_ENABLE_PAID_EXECUTION` — **no secret values**);
- accurate **repository and website** claims consistent with the chosen
  visibility (§7);
- **no hosted/remote MCP claim** (none exists, §17);
- **no claim that API-key or x402 credentials are bundled** (they are not);
- **no x402 transaction-complete claim** (§17);
- a **correction/versioning policy** established *before* submission, because
  metadata is immutable and deletion may be unavailable.

**This memo does not create `server.json`, does not install or invoke
`mcp-publisher`, and does not access the MCP Registry** (§18).

---

## 11. Owner-decision register

Eighteen decisions. **This unmerged draft settles none of them by itself**; it
recommends and frames them so they are decided deliberately. **Owner merge
settles only the framework decisions whose rows explicitly record "Settled by
architecture merge? — Yes"; every other decision remains unsettled.** In
particular, all evidence-dependent, account, identity, implementation, registry,
publication, registration, and submission decisions remain open and require a
later exact authorization (§12 Level 2 or Level 3) before any live operation
they imply. Each row records: **Purpose · Recommended option · Alternatives ·
Security implications · Evidence needed · Decision timing · Settled by
architecture merge? · Later exact owner authorization still required?**

For every decision below, unless stated otherwise, **architecture merge does
not settle it**, and a **later exact owner authorization remains required**
before any live operation it implies.

---

**P-D1 — Publication purpose**
- **Purpose:** Decide whether publication is intended primarily for Claude
  users; agent developers; trading-agent orchestrators; API consumers needing a
  local MCP adapter; or broader MCP discovery.
- **Recommended option:** Publish primarily for **agent developers and Claude
  users adopting a local MCP adapter**, with broader MCP discovery as a
  follow-on (§4).
- **Alternatives:** any narrower audience; or do not publish.
- **Security implications:** audience shapes claims and therefore the
  public-claims gate (§16); a broader audience raises the bar on accuracy.
- **Evidence needed:** none external — this is an intent decision.
- **Decision timing:** at architecture review (now).
- **Settled by architecture merge?** Yes — merge records the accepted purpose.
- **Later exact authorization required?** No (intent only); every downstream
  live step still has its own authorization.

**P-D2 — Primary distribution registry**
- **Purpose:** Choose the primary artifact/install channel.
- **Recommended option:** **Public npm registry** (§5.1).
- **Alternatives:** GitHub Packages (rejected as primary, §5.4); no public
  publication; another later-reviewed registry.
- **Security implications:** npm supports OIDC/2FA/provenance-when-eligible; the
  channel choice sets the credential model (P-D6).
- **Evidence needed:** none to *choose* the channel; account/name readiness is
  P-D3/P-D7.
- **Decision timing:** at architecture review.
- **Settled by architecture merge?** Yes — merge records public npm as the
  recommended primary channel.
- **Later exact authorization required?** Yes — for every account operation and
  the publication itself (P-D3, P-D7, P-5).

**P-D3 — Package-name query authorization**
- **Purpose:** Authorize the single live external package-name availability
  query.
- **Recommended option:** Authorize **one bounded query** in P-2, *after*
  architecture approval, under an explicit Level-2 authorization (§12).
- **Alternatives:** defer the query; choose a scoped identity up front (P-D4).
- **Security implications:** a name query is a live external operation; it must
  be scoped, logged, and not generalized into other npm operations.
- **Evidence needed:** the query itself (in P-2), plus re-verified official docs.
- **Decision timing:** P-2, under separate authorization.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** **Yes — explicitly.** The query is
  prohibited until a separate owner authorization names it.

**P-D4 — Identity fallback**
- **Purpose:** Choose the allowed fallback process if the preferred unscoped
  name is unavailable or unsuitable (§6 B).
- **Recommended option:** Prefer, in order: **owner-controlled npm scope →
  acceptable alternative unscoped name → defer** — *without* pre-committing to
  any specific scope that has not been verified as owner-controlled.
- **Alternatives:** any reordering; immediate deferral.
- **Security implications:** identity confusion/squatting risk (avoid confusing
  or borrowed identities); a scope must be genuinely controlled.
- **Evidence needed:** P-2 name query result + scope-ownership verification.
- **Decision timing:** P-2, if the preferred name fails.
- **Settled by architecture merge?** No — the *process* may be accepted, but the
  actual fallback identity is chosen on P-2 evidence.
- **Later exact authorization required?** Yes.

**P-D5 — Repository visibility and provenance**
- **Purpose:** Choose the repository-visibility / provenance posture (§7).
- **Recommended option:** **Option A — keep the repository private and accept
  the provenance limitation**, documented honestly; do not pursue Option B
  merely for provenance.
- **Alternatives:** Option B (make repository public, via a *separate*
  repository-publication architecture); Option C (defer publication); another
  officially supported provenance posture.
- **Security implications:** Option B is an **irreversible disclosure** with
  secret-history/licensing/business review requirements; Option A preserves
  confidentiality at the cost of automatic provenance.
- **Evidence needed:** re-verified npm provenance/private-repo docs (P-2); for
  Option B, a full separate repository-publication review.
- **Decision timing:** before P-3 repository/metadata changes.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes — **and repository visibility is
  never changed automatically** (§18).

**P-D6 — Publication authentication**
- **Purpose:** Choose the credential mechanism for publishing.
- **Recommended option:** **OIDC trusted publishing** *if the first-publication
  bootstrap is officially confirmed to allow it* (§3.1, §8); otherwise a
  **tightly controlled initial manual/bootstrap publication followed by trusted
  publishing**.
- **Alternatives:** another officially supported approach; deferral. **A
  long-lived broad publish token is not the default recommendation.**
- **Security implications:** OIDC avoids a long-lived secret; any bootstrap token
  must be least-privilege, short-lived, unlogged, and revoked after use.
- **Evidence needed:** P-2 bootstrap-ordering confirmation (P-D7).
- **Decision timing:** P-2 → P-3 (workflow design).
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes.

**P-D7 — First-publication bootstrap**
- **Purpose:** Resolve the bootstrap dependencies before any account operation
  (§8).
- **Recommended option:** Require **official verification** of npm
  account/ownership; required 2FA posture; whether package creation must precede
  trusted-publisher configuration; staged-publishing availability/suitability;
  exact Node/npm requirements; and private-repository implications — **before**
  choosing P-D6's mechanism.
- **Alternatives:** none — this is a gate, not a menu.
- **Security implications:** getting ordering wrong could force an unprotected
  first publish; verification prevents that.
- **Evidence needed:** re-verified official npm docs + account inspection (P-2).
- **Decision timing:** P-2.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes — **no npm account operation is
  authorized now.**

**P-D8 — Versioning and release policy**
- **Purpose:** Define the recommended initial public version and later
  versioning model **without changing `package.json` now**; assess whether the
  already-validated local `1.0.0` should be the first public version or whether
  publication preparation requires a different versioning decision.
- **Recommended option:** Adopt a deliberate SemVer policy and a mechanism
  preventing `SERVER_VERSION` (`src/server.ts`) from drifting from
  `package.json` `version` (**B-8/D-9**, §2). Publishing the already-validated
  **`1.0.0`** is reasonable *only if* it binds to a freshly rebuilt,
  re-validated artifact at the exact release commit; otherwise select a distinct
  initial version deliberately.
- **Alternatives:** a pre-1.0 initial version; a different first version bound to
  a new artifact.
- **Security implications:** an immutable published version means the first
  number cannot be reused or corrected in place (§15).
- **Evidence needed:** P-4 release-candidate build evidence.
- **Decision timing:** P-3 (policy) → P-4 (exact number bound to the artifact).
- **Settled by architecture merge?** No — the policy may be accepted in
  principle; the exact first version is fixed at P-4/P-5.
- **Later exact authorization required?** Yes.

**P-D9 — `private: true`**
- **Purpose:** Govern removal of the accidental-publication guard.
- **Recommended option:** Remove `private: true` **only** in a **dedicated
  implementation PR** and **only** behind a release gate — never as a side
  effect (§13 P-3).
- **Alternatives:** none that weaken the guard casually.
- **Security implications:** the guard is the primary fail-closed control against
  premature/accidental publication (T-23 lineage, [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md) §8-9).
- **Evidence needed:** the release gate (identity, account, workflow, artifact)
  all satisfied.
- **Decision timing:** P-3, immediately before the publication workflow is armed.
- **Settled by architecture merge?** **No — architecture approval alone must not
  authorize its removal.**
- **Later exact authorization required?** Yes.

**P-D10 — `publishConfig`**
- **Purpose:** Decide whether `publishConfig` is required and what it may
  contain.
- **Recommended option:** Decide **only after** the registry, scope, and access
  posture are selected (P-D2/P-D4); add it only if the chosen registry/access
  requires it (e.g. `access: public` for a scoped package), with nothing beyond
  what the registry needs.
- **Alternatives:** omit it (if unscoped public npm defaults suffice).
- **Security implications:** an incorrect `publishConfig` could target the wrong
  registry or access level (§15 stop condition: wrong registry).
- **Evidence needed:** finalized P-D2/P-D4/P-D5 decisions.
- **Decision timing:** P-3.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes.

**P-D11 — Publication workflow**
- **Purpose:** Choose how publication is triggered and approved.
- **Recommended option:** **Manually approved CI** *or* **tag-triggered CI with
  a protected environment** *or* **staged publication with separate approval** —
  **never** publication automatically triggered by an ordinary merge to `main`.
- **Alternatives:** another bounded method with explicit approval.
- **Security implications:** an ambient merge trigger is exactly how an
  unintended publish fires; a protected environment/approval is the mitigation
  (§9).
- **Evidence needed:** P-3 workflow review + permissions review (§14 P-V13/P-V14).
- **Decision timing:** P-3.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes.

**P-D12 — Exact release artifact**
- **Purpose:** Define how the public artifact is rebuilt, compared with reviewed
  contents, scanned, and bound to an exact source commit.
- **Recommended option:** A **fresh clean-checkout build at the recorded release
  commit**, `npm pack`, closed-allowlist comparison (37-path or deliberately
  revised), secret/forbidden-material scan, dependency-contract re-check, and a
  recorded checksum — reproducing the P-3-through-P-5 flow of the local phase but
  now bound to the *release* commit.
- **Alternatives:** none — reusing an old artifact is prohibited (each phase
  destroys its artifacts, §2 item 3).
- **Security implications:** artifact-to-source drift (T-17 lineage) is a stop
  condition (§15).
- **Evidence needed:** P-4 build/compare/scan evidence.
- **Decision timing:** P-4.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes.

**P-D13 — Public-install validation**
- **Purpose:** Define clean **public** installation tests after publication.
- **Recommended option:** Install the published package **by name** into fresh
  isolated consumers on **approved Windows and Linux/POSIX** environments; launch
  the installed **bin**; require a completed MCP `initialize` and the exact 1/10/0
  surface; confirm no unintended API-key/paid/x402 activity (§14 P-V26–P-V30).
- **Alternatives:** none weaker — offline local install (the local phase) is not
  public-by-name install.
- **Security implications:** validates that the *published* artifact behaves;
  installed-bin `initialize` (not exit 0) is the real check.
- **Evidence needed:** P-6 public install evidence on both platform families.
- **Decision timing:** P-6.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes.

**P-D14 — GitHub Release**
- **Purpose:** Decide whether a GitHub Release is useful.
- **Recommended option:** Use it as an **optional release-note and source-tag
  record** bound to the published commit/version; **not** as the npm installation
  channel; **not** carrying an unreviewed artifact; **not** before successful
  publication (unless explicitly designed as a reviewed release candidate).
- **Alternatives:** skip it as unnecessary duplication.
- **Security implications:** a Release attaching an unreviewed artifact would be a
  distribution surface outside the allowlist discipline.
- **Evidence needed:** successful P-6 publication.
- **Decision timing:** after P-6.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes — **no GitHub Release is created
  now** (§18).

**P-D15 — Official MCP Registry**
- **Purpose:** Govern the MCP Registry entry (§10).
- **Recommended option:** Submit **only after** P-6 npm public-install validation
  and under a **separate** authorization, with an owner-controlled namespace, a
  distinct server name, coherent package reference/version, accurate env-var
  names (no values), and a correction/versioning policy set first (immutability +
  no-deletion, §3.4).
- **Alternatives:** defer indefinitely; do not list.
- **Security implications:** immutable metadata and possible no-deletion make
  errors durable; accuracy is mandatory.
- **Evidence needed:** P-6 completion + re-verified Registry docs + namespace
  verification.
- **Decision timing:** P-7.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** **Yes — separate authorization after
  npm public-install validation.**

**P-D16 — Directory and marketplace promotion**
- **Purpose:** Govern directory/marketplace promotion beyond the official
  channels.
- **Recommended option:** Require **separate decisions after** official
  distribution identities are proven (npm public + MCP Registry), each honoring
  the existing forbidden-claims list ([`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md) §9).
- **Alternatives:** no promotion.
- **Security implications:** overstated listings (autonomy, payment, remote,
  advice) are prohibited claims; promotion multiplies exposure.
- **Evidence needed:** P-6/P-7 completion + re-verified per-directory rules.
- **Decision timing:** P-8.
- **Settled by architecture merge?** No.
- **Later exact authorization required?** Yes.

**P-D17 — Correction, deprecation, rollback, and incident response**
- **Purpose:** Define how a faulty first release is deprecated, superseded,
  corrected, documented, and investigated.
- **Recommended option:** Plan a **supersede-forward** posture (publish a
  corrected higher version + deprecate the faulty one) **without assuming npm or
  MCP Registry deletion/unpublishing is available**; document the incident and
  root cause; hold public claims until the corrected release re-validates (§16).
- **Alternatives:** none that rely on deletion.
- **Security implications:** the correction path is the safety net for immutable,
  hard-to-recall releases (§3.4).
- **Evidence needed:** none to *plan*; a real incident triggers a fresh
  disposition.
- **Decision timing:** defined in P-3/P-4, exercised on incident.
- **Settled by architecture merge?** The *policy* is accepted at merge; any real
  correction is a new disposition.
- **Later exact authorization required?** Yes for any live corrective publish.

**P-D18 — Public claims**
- **Purpose:** Define which public claims are prohibited until each external
  validation step passes.
- **Recommended option:** Adopt the **public-claims gate** of §16 verbatim as the
  governing rule.
- **Alternatives:** none — accuracy is not optional.
- **Security implications:** premature availability/registry claims mislead
  consumers and agents.
- **Evidence needed:** the specific validation step each claim depends on
  (P-6 for npm availability, P-7 for MCP Registry availability).
- **Decision timing:** binding from now through every phase.
- **Settled by architecture merge?** Yes — the gate is accepted as a standing
  rule at merge.
- **Later exact authorization required?** N/A (a prohibition, not an operation).

---

## 12. Architecture merge semantics

Three distinct levels of authority. **They do not collapse into one another.**

### Level 1 — Architecture acceptance (what merging *this* PR does)

Merging this architecture records that the owner **accepts the sequence,
controls, and decision framework** — the recommended channel hierarchy, the
phased process, the security controls, the owner-decision register, the
validation matrix, and the stop conditions. **It authorizes no external
operation.** It does not settle any decision explicitly marked for P-2 or a later
phase (§11).

### Level 2 — Bounded readiness authorization (a *later* explicit grant)

A later explicit authorization *may* permit **narrowly defined** actions such as:

- one official-documentation verification session;
- one npm account-readiness check;
- one package-name availability query;
- one namespace-ownership check.

**That authorization must state exactly which operations are allowed.** It is not
implied by Level 1, and it does not extend to publication.

### Level 3 — Publication authorization (a *later* release-specific grant)

A later release-specific authorization must identify **all** of:

- exact source commit;
- exact package version;
- exact package identity;
- exact registry;
- exact artifact;
- exact workflow or command;
- allowed credential mechanism;
- allowed validation operations;
- stop conditions.

**No reusable or standing publication authorization may be inferred** from Level
1, Level 2, or any prior Level-3 grant. Each publication is authorized once, for
one exact release.

---

## 13. Phased implementation plan (P-1 through P-8)

A controlled sequence. **Do not perform any phase beyond P-1.**

### P-1 — Publication and distribution decision architecture *(this PR)*

- **Documentation only.** Deliverables: this memo + one README
  documentation-index link.
- **Expected change surface — exactly two files:**
  `docs/PACKAGE_PUBLICATION_AND_DISTRIBUTION_DECISION_ARCHITECTURE.md` and
  `README.md` (one added index link). No other file changes; no `src/`, tests,
  `package.json`, `package-lock.json`, scripts, workflows, tsconfig, `LICENSE`,
  `.env.example`, `.gitignore`, or prior document is modified.
- **Authorization:** Owner review of the framework. No external operation.

### P-2 — Official-platform and account readiness *(after separate Level-2 authorization)*

- **Re-verify** current official npm and MCP Registry requirements against
  official documentation (§3).
- **Verify** npm owner/account posture and 2FA (P-D7).
- **Perform** the specifically authorized **package-name query** (P-D3).
- **Verify** fallback identity options if needed (P-D4).
- **Verify** the first-publication / trusted-publisher **bootstrap** ordering
  (P-D6/P-D7).
- **Verify** repository-visibility / provenance implications (P-D5).
- **Verify** MCP namespace options (P-D15/§6 C).
- **No publication. No account modification.** Read/verify + the single
  authorized name query only.

### P-3 — Publication implementation architecture and repository changes *(only after P-2 decisions)*

- Package-metadata changes; exact repository metadata; **carefully authorized
  `private: true` treatment** (P-D9, dedicated PR + release gate);
  `publishConfig` **only if selected** (P-D10); release workflow (P-D11);
  protected environment; permission minimization; release-validation scripts;
  MCP metadata preparation **only if appropriate** (not `server.json` creation
  yet).
- **No publication in the implementation PR.**

### P-4 — Release-candidate build and prepublication validation

- Exact commit; clean build; **closed artifact comparison** (37-path or
  deliberately revised); dependency validation; secret scan; offline/local
  installation; installed-bin validation; public-facing documentation review;
  **release-candidate owner signoff**.
- **No publication until an exact P-5 authorization.**

### P-5 — Controlled first npm publication *(only under an exact Level-3 authorization)*

- One exact artifact; one exact version; one exact registry; one bounded
  publication operation; **fail-closed** behavior; **no retry without a new
  disposition** (§15). Then **independently validate the public package
  installation** (feeds P-6).

### P-6 — Post-publication npm closure

- Confirm: public registry metadata; public artifact composition;
  package-**by-name** installation; **Windows and Linux/POSIX installed-bin
  `initialize`**; the exact MCP surface (1/10/0); no unexpected scripts or
  dependencies; public-documentation accuracy; correction/deprecation readiness.

### P-7 — Official MCP Registry publication *(only after P-6 and separate authorization)*

- Finalized server identity; `server.json`; namespace ownership; package
  reference; metadata validation; **one controlled registry submission**;
  post-submission discovery validation (§10).

### P-8 — Discoverability rollout *(only after official channels are validated)*

- Developer site; `llms.txt` and agent metadata; selected MCP directories;
  release communication; Claude connector migration guidance; agentic
  marketplace updates — each under P-D16, honoring the forbidden-claims list.

```text
P-1  architecture (this PR, docs only)
  │  Level-1 acceptance
  ▼
P-2  platform + account readiness      ── Level-2 authorization; one name query; NO publication
  ▼
P-3  implementation + repo changes      ── dedicated private:true PR; workflow; NO publication
  ▼
P-4  release-candidate build + validate ── owner RC signoff; NO publication
  ▼
P-5  controlled first npm publish        ── Level-3 exact authorization; fail-closed; no retry
  ▼
P-6  post-publication npm closure        ── public by-name install, Win + POSIX initialize
  ▼
P-7  Official MCP Registry publish        ── separate authorization; one submission
  ▼
P-8  discoverability rollout              ── separate per-channel decisions
```

---

## 14. Publication validation matrix

Proposed rows with stable IDs. Class: **BLOCKING** (a live gate that must pass) ·
**OWNER** (needs an owner decision/authorization) · **ADVISORY** (record, do not
block). **No live row is green in P-1.** The only row an architecture merge can
satisfy is **P-V1**, and only because it is purely an architecture condition —
and even then only *upon* merge, not before.

| ID | Check | Class | Phase | P-1 status |
| --- | --- | --- | --- | --- |
| **P-V1** | Architecture accepted (framework, controls, register, matrix, stop conditions) | OWNER | P-1 | **Satisfied only upon owner merge; not before** |
| **P-V2** | External requirements re-verified against official docs (npm + MCP Registry) | BLOCKING | P-2 | Not started |
| **P-V3** | npm account ownership confirmed | OWNER | P-2 | Not started |
| **P-V4** | 2FA / account security posture confirmed | BLOCKING | P-2 | Not started |
| **P-V5** | Package-name availability queried (one authorized query) | OWNER | P-2 | Not started — **unqueried, unknown** |
| **P-V6** | Namespace fallback resolved (if needed) | OWNER | P-2 | Not started |
| **P-V7** | Repository-visibility decision made | OWNER | P-2/P-3 | Not started |
| **P-V8** | Provenance decision made | OWNER | P-2/P-3 | Not started |
| **P-V9** | First-publication bootstrap confirmed | BLOCKING | P-2 | Not started |
| **P-V10** | Exact package metadata reviewed | BLOCKING | P-3 | Not started |
| **P-V11** | Exact first version decided | OWNER | P-3/P-4 | Not started |
| **P-V12** | `private: true` controlled transition (dedicated PR + release gate) | BLOCKING | P-3 | Not started — **guard remains in place** |
| **P-V13** | Publication workflow reviewed (no merge-triggered publish) | BLOCKING | P-3 | Not started |
| **P-V14** | Workflow permissions minimized / protected environment | BLOCKING | P-3 | Not started |
| **P-V15** | Source-to-artifact binding (exact commit) | BLOCKING | P-4 | Not started |
| **P-V16** | 37-path (or deliberately revised) allowlist re-verified | BLOCKING | P-4 | Not started |
| **P-V17** | Secret / forbidden-material scan over unpacked artifact | BLOCKING | P-4 | Not started |
| **P-V18** | Runtime-dependency completeness (static, offline) | BLOCKING | P-4 | Not started |
| **P-V19** | No lifecycle scripts present | BLOCKING | P-4 | Not started |
| **P-V20** | Clean prepublication (offline/local) installation | BLOCKING | P-4 | Not started |
| **P-V21** | Installed-bin `initialize` (not exit 0) | BLOCKING | P-4 | Not started |
| **P-V22** | Owner release-candidate signoff | OWNER | P-4 | Not started |
| **P-V23** | Exact publication authorization (Level 3) | OWNER | P-5 | Not started |
| **P-V24** | Public registry metadata correct | BLOCKING | P-6 | Not started |
| **P-V25** | Public artifact composition compared to reviewed contents | BLOCKING | P-6 | Not started |
| **P-V26** | Public package-**by-name** installation | BLOCKING | P-6 | Not started |
| **P-V27** | Windows validation (installed-bin `initialize`) | BLOCKING | P-6 | Not started |
| **P-V28** | Linux/POSIX validation (installed-bin `initialize`) | BLOCKING | P-6 | Not started |
| **P-V29** | Default/free MCP surface (exactly 1 tool / 10 resources / 0 prompts) | BLOCKING | P-6 | Not started |
| **P-V30** | No unintended API-key, paid, or x402 activation | BLOCKING | P-6 | Not started |
| **P-V31** | Release notes accurate | ADVISORY | P-6 | Not started |
| **P-V32** | Rollback / deprecation procedure ready | BLOCKING | P-6 | Not started |
| **P-V33** | MCP Registry readiness (namespace, server name, package ref, env-var names, correction policy) | BLOCKING | P-7 | Not started |
| **P-V34** | MCP Registry authorization (separate) | OWNER | P-7 | Not started |
| **P-V35** | MCP Registry publication (one submission) | BLOCKING | P-7 | Not started |
| **P-V36** | Post-registration discovery validation | BLOCKING | P-7 | Not started |
| **P-V37** | Directory/marketplace submission authorization | OWNER | P-8 | Not started |

**No P-V row above is claimed green by this memo.** P-V1 becomes satisfied only
when the owner merges this architecture; every other row is a live/decision gate
owned by a later phase.

---

## 15. Stop conditions

Each of the following requires **immediate stop and owner disposition**. **No
automatic retry is defined for publication.**

- preferred package name unavailable;
- package identity conflict (collision, squat, or trademark concern);
- npm account ownership ambiguity;
- namespace ownership ambiguity;
- unverified first-publication bootstrap;
- inability to use the approved credential model;
- repository / provenance conflict;
- artifact composition drift (any path outside the reviewed allowlist);
- secret-shaped content in the artifact;
- undeclared runtime dependency;
- lifecycle-script introduction;
- public artifact mismatch (published contents ≠ reviewed contents);
- failed clean public install;
- failed installed-bin `initialize`;
- wrong MCP surface (anything other than exactly 1 tool / 10 resources / 0 prompts);
- unexpected API, paid, or x402 activation;
- publication to the wrong registry;
- version already existing (immutable — cannot overwrite);
- registry metadata mismatch;
- MCP Registry validation failure;
- any need to repeat a completed live operation without new authorization.

On any of these: **halt, record, and obtain a new owner disposition.** A failed
publication is not re-run; it receives a fresh Level-3 authorization or is
abandoned/deprecated (P-D17).

---

## 16. Public claims gate

**Before successful P-6 validation**, the following claims are **prohibited**:

- "available on npm";
- "install with `npm install stocktrends-mcp-server`";
- "official MCP Registry listing";
- "published MCP package";
- "verified public package";
- "publicly supported on all platforms."

**Before successful P-7 validation**, claims of **official MCP Registry
availability** are prohibited.

**Until each gate passes**, public documentation may continue to describe only:

- repository-checkout installation;
- the **locally validated package artifact** (a local `.tgz`, not a registry
  install);
- **unpublished** status.

This is the standing rule adopted under **P-D18**, and it is consistent with the
existing forbidden-claims list ([`PHASE5E_DIRECTORY_METADATA_READINESS.md`](PHASE5E_DIRECTORY_METADATA_READINESS.md) §9:
no "npm/registry publication or packaged availability … unless and until an
actual, separately reviewed publication step has occurred").

---

## 17. x402, payment, and API boundary

**Publication architecture does not change runtime authority.** The following
are preserved exactly, unchanged by anything in this memo:

- default/free mode remains **credential-free** (1 tool / 10 resources / 0 prompts);
- API-key paid execution remains a **separate existing posture**;
- x402 remains **default-off** and **challenge-validation-only**;
- the **exact nine-route** x402 allowlist ([`PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md`](PHASE5F_X402_CLOSURE_AND_HANDOFF_MEMO.md) §3), unchanged;
- **no** proof input; **no** proof forwarding; **no** payment header; **no**
  wallet; **no** signing; **no** payment; **no** settlement; **no** spend; **no**
  metering confirmation; **no** paid output through x402.

**Package publication must not imply transaction-complete x402 support.** No MCP
Registry entry, listing, or release note may claim it (§10, §16). **No live Stock
Trends API request is authorized by P-1** — the Phase 5F live authorization is
`CONSUMED`.

---

## 18. No-external-action authority

**P-1 authorizes none of the following.** Each remains prohibited until a
later, separate, exact authorization (Level 2 or Level 3, §12) permits the
specific operation:

- npm login or account creation;
- npm account or organization modification;
- npm package-name search, view, ping, or availability query;
- npm trusted-publisher configuration;
- npm token or credential creation;
- `npm pack` for release evidence;
- `npm publish`;
- npm stage publish;
- npm unpublish;
- npm deprecate;
- GitHub repository visibility change;
- GitHub Release creation;
- GitHub workflow creation;
- GitHub Packages configuration;
- MCP Registry login;
- MCP namespace claim;
- `mcp-publisher` installation or invocation;
- `server.json` creation;
- MCP Registry submission;
- directory or marketplace submission;
- remote MCP deployment;
- live API request;
- API-key use;
- x402 operation;
- proof / payment forwarding;
- payment or spend.

**None of the above occurred in producing this memo, and none is authorized by
merging it.**

---

## 19. Architecture acceptance semantics

**Owner merge of this architecture records acceptance of:**

- the recommended channel hierarchy (§5.5);
- the phased process (§13);
- the security controls (§9);
- the owner-decision register (§11);
- the validation matrix (§14);
- the stop conditions (§15).

**Owner merge does *not* itself settle any decision explicitly marked for P-2 or
a later phase** (§11) — P-D3 through P-D17 remain open, each awaiting its own
evidence and timing.

**Owner merge does *not* authorize any external operation** (§12 Level 1, §18).

---

## 20. Final classification

**Proposed classification, before owner merge of this PR:**

`PROPOSED FOR OWNER REVIEW — PUBLICATION AND DISTRIBUTION ARCHITECTURE ONLY;
NO REGISTRY QUERY, PACKAGE-NAME CHECK, ACCOUNT OPERATION, PUBLICATION,
MCP REGISTRY SUBMISSION, DIRECTORY SUBMISSION, OR REMOTE MCP AUTHORIZED`

**Proposed classification, effective only upon owner merge of this PR:**

`PUBLICATION AND DISTRIBUTION ARCHITECTURE ACCEPTED — PUBLIC NPM AS THE
RECOMMENDED PRIMARY ARTIFACT CHANNEL AND THE OFFICIAL MCP REGISTRY AS THE
RECOMMENDED SUBSEQUENT DISCOVERY CHANNEL; ALL REGISTRY QUERIES, ACCOUNT
OPERATIONS, IMPLEMENTATION CHANGES, PUBLICATION, REGISTRATION, AND SUBMISSION
REQUIRE NEW EXACT AUTHORIZATION`

The effective classification is **not** in force as this memo is written, because
the PR that would carry it has not merged. The package is **not** classified as
publicly available, registry-published, or ready for automatic publication in
either state above.

---

**Reminder.** This memo is architecture and planning only. It queries no
registry, checks no name, touches no account, configures no publisher, creates
no token, packs nothing, publishes nothing, submits nothing, changes no
repository visibility, creates no `server.json`, contacts no directory, makes no
live API request, uses no key, spends nothing, and approves nothing beyond its
own review. Every recommendation remains a recommendation until separately
reviewed, authorized, and merged.
