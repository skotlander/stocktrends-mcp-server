# Package Publication Implementation Decision

Date: 2026-07-18

**Decision classification:**

`P-3 PUBLICATION IMPLEMENTATION DECISIONS SETTLED — PRIVATE SOURCE REPOSITORY
AND INITIAL PROVENANCE LIMITATION ACCEPTED; ORGANIZATION-SCOPED
@STOCKTRENDS-PUBLICATIONS/STOCKTRENDS-MCP-SERVER@1.0.0 SELECTED; ONE
OWNER-AUTHORIZED 2FA-PROTECTED BOOTSTRAP PUBLICATION AND POST-BOOTSTRAP OIDC
TRUSTED-PUBLISHING RELEASE PATH SELECTED; IMPLEMENTATION, PACKAGE CREATION,
WORKFLOW CONFIGURATION, AND PUBLICATION REMAIN UNAUTHORIZED`

This document is **P-3**: the governing decision record that settles the
publication-implementation strategy for `stocktrends-mcp-server` **before** any
publication-configuration implementation begins. It is the final decision
record that precedes implementation.

**This document is documentation only.** It records the publication decisions
the owner has explicitly approved. It **implements none of them**. It changes
exactly two files: this record and one README documentation-index link. It
changes no `package.json`, creates no workflow, packs nothing, publishes
nothing, queries no registry, touches no npm or GitHub account, configures no
trusted publisher, creates no token, changes no repository visibility, creates
no `server.json`, contacts no directory, makes no live Stock Trends API
request, uses no API key, and performs no x402, proof, payment, settlement, or
spend operation. **It does not authorize any of those actions either** — see
§14 (implementation gate), §15 (authorization boundaries), and §16
(no-external-action statement).

This record sits between the completed **P-2** readiness gate and the future
**P-4** publication-configuration implementation. It settles the strategic
publication decisions so that P-4 implements a decided design rather than
deciding one, and so that every live external operation remains gated behind
its own separate, exact, later authorization.

**Governing inputs.** This record is derived from and consistent with:

- [`PACKAGE_PUBLICATION_AND_DISTRIBUTION_DECISION_ARCHITECTURE.md`](PACKAGE_PUBLICATION_AND_DISTRIBUTION_DECISION_ARCHITECTURE.md) (P-1);
- [`PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md`](PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md) (P-2A);
- [`PACKAGE_PUBLICATION_ACCOUNT_AND_NAME_READINESS_REPORT.md`](PACKAGE_PUBLICATION_ACCOUNT_AND_NAME_READINESS_REPORT.md) (P-2B);
- [`PACKAGE_PUBLICATION_ORGANIZATION_READINESS_CLOSURE.md`](PACKAGE_PUBLICATION_ORGANIZATION_READINESS_CLOSURE.md) (P-2C);
- [`PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md`](PACKAGE_READINESS_CLOSURE_AND_PUBLICATION_DECISION_HANDOFF.md);
- [`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md);
- [`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md);
- [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §18.

---

## 1. Working-copy posture (confirmed before any edit)

- Checkout: the normal attached checkout at
  `C:\Users\skort\Projects\stocktrends-mcp-server`. Worktree mode **off**; no
  worktree branch or directory used or created (no `.claude/worktrees`,
  `.codex/worktrees`, or any other worktree).
- Branch: `docs/package-publication-implementation-decision`, created from
  `main`.
- HEAD / base commit at the start of this work: `bb7deee` ("Close npm
  organization readiness (#96)"), which includes the merged
  organization-readiness closure (PRs #93–#96).
- `main` was current with `origin/main`; the working tree and index were clean
  before any edit.
- After the initial posture confirmation and branch creation, no remote Git
  fetch, pull, or query occurred at any point in producing this document.

---

## 2. Current package posture (confirmed and preserved as evidence)

The following are confirmed from the checkout and are **preserved unchanged**
by P-3. None is modified by this document.

| Property | Confirmed value | Preserved in P-3? |
| --- | --- | --- |
| Package `name` | `stocktrends-mcp-server` (unscoped) | **Unchanged** |
| `version` | `1.0.0` | **Unchanged** |
| `license` | `MIT` | **Unchanged** |
| `private` | boolean `true` | **Unchanged — remains** |
| `publishConfig` | absent | **Remains absent** |
| Publication lifecycle script | none (`scripts` are exactly `build`, `dev`, `start`, `test`, `typecheck`, `check:runtime-deps`, `check:package-metadata`) | **Remains absent** |
| Publication workflow | none (`.github/workflows` does not exist) | **Remains absent** |
| Trusted-publisher configuration | none | **Remains absent** |
| npm package created/published | none | **None created** |
| MCP Registry metadata (`server.json`, `mcpName`) | none | **Remains absent** |
| Reviewed `files` allowlist | four entries: `dist/**/*.js`, `dist/**/*.d.ts`, `README.md`, `LICENSE` | **Unchanged** |

**`package.json` is not changed by this document. No workflow is created. The
package is not packed or published.**

---

## 3. Decision 1 — Repository visibility and initial provenance

[owner decision] **The existing GitHub repository will remain private for the
initial public npm release.**

The owner **accepts** that automatic npm provenance will not be available for
this initial release while the source repository remains private. This
consequence is a directly confirmed current npm fact
([`PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md`](PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md)
P2A-F17): automatic provenance requires trusted publishing via OIDC, a public
package, **and** a public source repository together; it is not generated for a
package published from a private repository, even when the package itself is
public.

The decision to keep the repository private is based on preserving the
confidentiality of:

- internal architecture and governance records;
- tests and validation infrastructure;
- security reasoning;
- development history;
- unpublished plans and future work.

**A public npm package does not require the source repository to be public.** A
private repository can publish a public package (P-1 §3.2, §7). Repository
visibility couples to provenance, not to the ability to publish.

A future public-source release may be considered **only** through a separate,
explicitly reviewed repository-visibility decision. That decision would carry
its own secret-history, licensing, and business review (P-1 §7 Option B).
**P-3 does not authorize changing GitHub repository visibility.**

---

## 4. Decision 2 — Public package identity

[owner decision] **The selected publication identity is:**

```text
@stocktrends-publications/stocktrends-mcp-server
```

**The organization scope is:**

```text
stocktrends-publications
```

This organization-scoped identity **supersedes the unscoped package identity
as the intended public publication identity**. It was selected on the strength
of the owner-confirmed, owner-controlled npm organization recorded in
[`PACKAGE_PUBLICATION_ORGANIZATION_READINESS_CLOSURE.md`](PACKAGE_PUBLICATION_ORGANIZATION_READINESS_CLOSURE.md)
§2 (exact scope `stocktrends-publications`, authenticated personal account role
**Owner**, personal 2FA enabled, organization 2FA enforcement enabled).

**The current `package.json` `name` remains `stocktrends-mcp-server`
(unscoped), unchanged during P-3.** Selecting the scoped identity for planning
is not the same as renaming the package; the rename is P-4 implementation work
(§13).

**The package has not been created or reserved.** No claimability query against
the scoped identity is authorized, and none has been performed.

**Historical unscoped-query treatment.** The single authorized HTTP query
performed in P-2B applied only to the **unscoped** identity
`stocktrends-mcp-server` and returned HTTP `404` ("no published npm package
record found at the authorized query time")
([`PACKAGE_PUBLICATION_ACCOUNT_AND_NAME_READINESS_REPORT.md`](PACKAGE_PUBLICATION_ACCOUNT_AND_NAME_READINESS_REPORT.md)
§4). That observation:

- is treated as historical evidence only, scoped exactly to the unscoped
  identity;
- **establishes nothing** — positive or negative — about the claimability,
  availability, or controllability of the distinct scoped identity
  `@stocktrends-publications/stocktrends-mcp-server` (a scope is a different
  registry namespace);
- **must not be repeated.** No query of any kind against the scoped identity is
  authorized by this document, and P-3 performs none.

---

## 5. Decision 3 — Initial public version

[owner decision] **The selected initial public version is `1.0.0`.**

The existing local package version is already `1.0.0`. However, the scoped
package **must be rebuilt and revalidated after the package identity and
publication metadata are implemented** — a fresh, clean-checkout build at the
recorded release commit, bound to a re-measured artifact (P-1 P-D8/P-D12).
Publishing the already-validated `1.0.0` is acceptable **only if** it binds to
that freshly rebuilt, re-validated artifact at the exact release commit.

**Selection of version `1.0.0` does not authorize publication.** An immutable
published version cannot be reused or corrected in place, so the first number
is fixed to the release artifact at P-4 and consumed only under a later exact
publication authorization.

Note: `SERVER_VERSION` in `src/server.ts` still hand-duplicates `package.json`
`version` (B-8, open, never a phase blocker; versioning policy D-9 recommended,
never selected). Because a version is what gets published, a drift-prevention
mechanism is a candidate P-4 implementation concern, not settled here.

---

## 6. Decision 4 — First-publication bootstrap

[owner decision] **The first publication will use one narrowly authorized,
owner-controlled, manual bootstrap publication protected by npm account 2FA.**

The bootstrap publication is a **one-time exception** required because the
package must exist before the intended post-bootstrap trusted-publisher
configuration can be attached. This ordering constraint is confirmed by current
official documentation: the `npm trust` CLI explicitly requires that "the
package you are configuring must already exist on the npm registry," and the
website trusted-publisher setup flow presumes an existing package listing
([`PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md`](PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md)
§5, §6, P2A-F6/F11).

The bootstrap **must**:

- publish only the exact reviewed scoped package;
- publish only version `1.0.0`;
- occur only after release-candidate validation;
- require a fresh exact owner authorization;
- use the owner's authenticated npm account and 2FA;
- avoid creating a reusable long-lived automation publication token;
- avoid storing an npm publication credential in GitHub;
- stop immediately on any identity, artifact, authentication, or registry
  discrepancy.

**P-3 does not authorize npm login, token creation, package creation, or
publication.** The bootstrap is a decided *shape*, not an executed step; it is
performed only under a later, exact, release-specific (Level-3) authorization
(§15).

---

## 7. Decision 5 — Post-bootstrap publication authentication

[owner decision] After the successful initial publication and public-install
validation, **the intended release authentication architecture is GitHub
Actions OIDC trusted publishing.**

The design objective is:

- **no long-lived npm publication token in GitHub**;
- trusted-publisher authority restricted to the approved release workflow;
- trusted-publisher authority limited to **staging** rather than immediate
  public publication where the verified npm capability supports that
  configuration (npm documents `npm stage publish` and staged publishing under
  a trusted publisher — P2A-F4/F31);
- explicit human review of the staged release;
- owner 2FA approval before public promotion;
- ordinary pushes and ordinary merges **must never publish automatically**.

This is recorded as the **selected post-bootstrap architecture**.

Exact UI labels, CLI syntax, workflow permissions (e.g. `id-token: write`),
environment configuration, required Node/npm version floors, protected-
environment reviewer availability on the applicable plan tier, and currently
supported staging controls remain **implementation-time details** that must be
verified against the existing platform-readiness record
([`PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md`](PACKAGE_PUBLICATION_PLATFORM_READINESS_VERIFICATION.md),
dated 2026-07-18 and subject to re-verification) before configuration.

**P-3 does not authorize trusted-publisher configuration or workflow
creation.**

---

## 8. Decision 6 — Treatment of `private: true`

[owner decision] The existing boolean `"private": true` **must remain
unchanged during P-3.**

It may be removed **only** in the dedicated publication-implementation change,
**after** the scoped identity and publication controls are implemented
together. Its removal must be **deliberate, reviewed, and covered by package
validation**. It **must not** be removed in an unrelated change.

`private: true` is the primary fail-closed accidental-publication guard
([`PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md`](PACKAGE_IDENTITY_AND_LICENSE_DECISION_RECORD.md)
§8–§9; [`SECURITY_MODEL.md`](SECURITY_MODEL.md) §18). Removing it is what arms
publication; therefore it is removed only behind the P-4 release gate, never as
a side effect (P-1 P-D9). **It remains `true` in this checkout.**

---

## 9. Decision 7 — `publishConfig`

[owner decision] The publication implementation will add an explicit
configuration equivalent to:

```json
"publishConfig": {
  "access": "public",
  "registry": "https://registry.npmjs.org/"
}
```

The purpose is to make the **public-access intent** (a scoped package published
publicly requires `access: public`) and the **target npm registry** explicit in
reviewed package metadata.

**Do not add it during P-3.** It is added only in the dedicated P-4
implementation change, alongside the scoped identity and the controlled
`private: true` removal, and covered by package validation (P-1 P-D10). It
**remains absent** in this checkout.

---

## 10. Decision 8 — Release trigger and approval mechanism

[owner decision] **An ordinary merge to `main` must not publish, stage, or
create a release.** The future workflow must require an intentional
release-specific action and explicit approval.

The intended post-bootstrap sequence is:

1. approved release commit or release-specific trigger;
2. deterministic build and validation;
3. exact package artifact creation;
4. artifact-content and identity checks;
5. OIDC trusted-publisher staging;
6. human review;
7. owner 2FA approval;
8. public promotion;
9. clean public-install validation.

The **exact trigger mechanism remains an implementation detail**, but it must
**not** be an automatic publish-on-merge design (P-1 P-D11). An ambient merge
trigger is precisely how an unintended publish fires; a release-specific
trigger with a protected environment and explicit approval is the mitigation.

---

## 11. Decision 9 — MCP Registry ordering

[owner decision] The Official MCP Registry remains a **later discovery step**.

It must occur **only after**:

- npm publication succeeds;
- the exact public npm package is retrievable;
- clean public installation succeeds;
- Windows and Linux/WSL MCP validation succeeds;
- public Claude Code installation instructions are confirmed.

The MCP Registry is a metadata registry, not an artifact host, and current
official documentation makes npm-first sequencing explicit ("we must publish
the package to npm before publishing the server to the MCP Registry" —
P2A-F24). Its published version metadata is immutable and publisher-initiated
deletion/unpublishing is unavailable (P2A-F28), so a supersede-forward
correction posture is required, not merely preferred.

**P-3 does not authorize an MCP Registry operation** (no `server.json`, no
`mcpName`, no `mcp-publisher` login/install/invoke, no submission, no query).

---

## 12. Settled decisions

The following are **settled** by this record as owner decisions. They are
strategic decisions, not implementation or execution:

1. **Repository remains private for the initial release.**
2. **Lack of automatic provenance is accepted for the initial release.**
3. **Scoped package identity** `@stocktrends-publications/stocktrends-mcp-server`
   (scope `stocktrends-publications`), superseding the unscoped identity as the
   intended public publication identity.
4. **Initial public version `1.0.0`**, bound to a freshly rebuilt, revalidated
   artifact at the release commit.
5. **One manual owner-controlled 2FA bootstrap publication** as a one-time
   exception.
6. **No reusable long-lived automation publication token**; no npm publication
   credential stored in GitHub.
7. **Post-bootstrap OIDC trusted publishing** as the release authentication
   architecture.
8. **Stage-and-human-approval release design** (staging where supported, human
   review, owner 2FA approval before public promotion).
9. **No automatic publication from ordinary merges.**
10. **Controlled removal of `private: true`** — only in the dedicated
    implementation change, reviewed, and covered by validation.
11. **Explicit public npm `publishConfig`** (`access: public`, npm registry).
12. **MCP Registry only after npm publication and public-install validation.**

---

## 13. Still unresolved or unimplemented

The following are **not yet implemented** and are distinguished clearly from
the settled strategic decisions above. Each is an implementation or operational
step — **not** an open strategic decision — unless implementation discovers a
platform contradiction (§14):

- `package.json` scoped-name change;
- removal of `private: true`;
- addition of `publishConfig`;
- exact release workflow YAML;
- exact GitHub permissions;
- exact trusted-publisher configuration;
- exact release trigger;
- exact staging and promotion commands;
- first-publication runbook;
- release-candidate artifact;
- package creation;
- publication;
- public-install validation;
- public Claude Code instructions;
- MCP Registry registration;
- directory or marketplace promotion.

---

## 14. Implementation gate — the next phase is P-4

The next governed phase is:

**P-4 — publication configuration implementation.**

**P-4 may prepare repository changes for review, but it must not publish.**

**P-4 must be limited to implementing the settled decisions**, including:

- scoped package identity;
- explicit public `publishConfig`;
- controlled removal of `private: true`;
- release scripts or validation controls only where approved;
- release-specific GitHub Actions workflow;
- minimal OIDC permissions;
- no long-lived npm publication credential;
- no automatic publish on ordinary merge;
- release-candidate validation;
- documentation updates.

**P-4 must not:**

- create the npm package;
- authenticate to npm;
- publish or stage a package;
- configure the npm trusted publisher;
- change repository visibility;
- register with the MCP Registry;
- call the live Stock Trends API;
- use x402;
- create payment proof;
- spend funds.

**Implementation must stop and return to decision review if the settled design
conflicts with actual supported platform behavior.** The platform facts
underlying these decisions are dated 2026-07-18 and are subject to
re-verification; a discovered contradiction (for example, a change in
trusted-publisher bootstrap ordering, staging availability, or provenance
rules) reopens the affected decision rather than being worked around in
implementation.

---

## 15. Separate authorization levels

The following authorization levels are explicitly **separate**. Authorization
for one level **must not imply** authorization for another; each requires its
own explicit, exact grant.

1. **Documentation and repository implementation** (P-3 record; P-4 metadata,
   workflow, and documentation changes prepared for review).
2. **Offline release-candidate validation** (clean-checkout build, artifact
   comparison against the reviewed allowlist, secret scan, dependency-contract
   re-check, offline/local install, installed-bin `initialize`).
3. **npm account or trusted-publisher configuration** (account operations,
   `npm trust` / trusted-publisher setup).
4. **First bootstrap publication** (the one-time manual, owner-controlled,
   2FA-protected publish).
5. **Public-install validation** (clean by-name install on Windows and
   Linux/WSL; installed-bin `initialize`; exact 1-tool/10-resource/0-prompt
   surface; no unintended API-key/paid/x402 activity).
6. **MCP Registry registration** (namespace, `server.json`, submission).
7. **External promotion** (directory/marketplace listings).

P-3 grants **level 1 only to the extent of this documentation record**. It does
not grant P-4 implementation authority, offline validation authority, account
or trusted-publisher configuration authority, publication authority,
public-install validation authority, MCP Registry authority, or external
promotion authority.

---

## 16. No-external-action statement

The following are stated explicitly for this P-3 task:

- no npm query was performed;
- no npm login occurred;
- no token or credential was created;
- no account or organization was modified;
- no package was created;
- no trusted publisher was configured;
- no workflow was created during P-3;
- `package.json` was not changed;
- `private: true` remains;
- no package was packed, staged, or published;
- no repository visibility change occurred;
- no GitHub release was created;
- no MCP Registry or directory operation occurred;
- no live Stock Trends API, x402, payment, proof, settlement, or spend
  occurred.

---

## 17. P-D decision status

Recorded status of the publication-implementation decision register at P-3:

- **P-D3** — prior unscoped-name query completed historically (HTTP `404`,
  exactly once, unscoped identity only) and **must not be repeated**.
- **P-D4** — institutional scoped identity selected:
  `@stocktrends-publications/stocktrends-mcp-server`.
- **P-D5** — private repository selected; initial provenance limitation
  accepted.
- **P-D6** — manual owner-controlled 2FA bootstrap selected as the
  first-publication mechanism.
- **P-D7** — post-bootstrap OIDC trusted-publishing architecture selected.
- **P-D8** — version `1.0.0` selected (bound to a rebuilt, revalidated release
  artifact).
- **P-D9** — deliberate implementation-time removal of `private: true`
  selected (dedicated change, reviewed, validation-covered); remains `true`
  now.
- **P-D10** — explicit public npm `publishConfig` selected (`access: public`,
  npm registry); remains absent now.
- **P-D11** — release-specific trigger, staging, and human approval selected;
  automatic publish-on-merge **rejected**.
- **P-D12** — exact release artifact remains **future implementation
  evidence** (P-4).
- **P-D13** — public-install validation remains **future execution evidence**
  (post-bootstrap).
- **P-D15** — MCP Registry remains **later and unauthorized**.
- **P-D16** — external promotion (directory/marketplace) remains **later and
  unauthorized**.

---

## 18. Final classification

`P-3 PUBLICATION IMPLEMENTATION DECISIONS SETTLED — PRIVATE SOURCE REPOSITORY
AND INITIAL PROVENANCE LIMITATION ACCEPTED; ORGANIZATION-SCOPED
@STOCKTRENDS-PUBLICATIONS/STOCKTRENDS-MCP-SERVER@1.0.0 SELECTED; ONE
OWNER-AUTHORIZED 2FA-PROTECTED BOOTSTRAP PUBLICATION AND POST-BOOTSTRAP OIDC
TRUSTED-PUBLISHING RELEASE PATH SELECTED; IMPLEMENTATION, PACKAGE CREATION,
WORKFLOW CONFIGURATION, AND PUBLICATION REMAIN UNAUTHORIZED`

The package is **not** classified as publicly available, registry-published,
name-reserved, provenance-attested, staged, or ready for any publication
operation. This record settles the publication-implementation strategy and
hands a decided design to a later, separately authorized P-4 implementation; it
authorizes no external operation, no account or registry query, no
package.json change, no workflow creation, and no publication.

---

**Reminder.** This document records owner-approved decisions and implements
none of them. It queries no registry, checks no name, touches no account,
configures no publisher, creates no token, packs nothing, publishes nothing,
submits nothing, changes no repository visibility, creates no `server.json`,
contacts no directory, makes no live API request, uses no key, and spends
nothing. Every decision recorded here becomes a live operation only through a
later, separate, exact authorization at its own authorization level (§15).
