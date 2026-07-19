# MCP Registry Readiness — Implementation Notes

Date: 2026-07-18

**Decision classification:**

`MCP REGISTRY READINESS (1.0.1) IMPLEMENTED AND VALIDATED OFFLINE — OWNERSHIP-
VERIFICATION IDENTITY (mcpName, server.json) AND ITS VALIDATORS ADDED; NPM
PUBLICATION, MCP REGISTRY DOMAIN AUTHENTICATION, server.json SUBMISSION, AND
REGISTRY RECORD CREATION REMAIN UNAUTHORIZED AND UNPERFORMED BY THIS CHANGE`

This document records the narrow `1.0.1` patch that prepares the already
publicly published npm package
`@stocktrends-publications/stocktrends-mcp-server` for later registration
under the Stock Trends domain identity in the official MCP Registry. It is an
implementation record. It adds repository-metadata (`package.json` `mcpName`,
repository-root `server.json`) and extends the authoritative offline
validators. **It creates no npm package version beyond the local `1.0.1`
manifest edit, authenticates to no registry, performs no domain verification,
submits nothing to the MCP Registry, and creates no Registry record.**

---

## 1. Business objective

Agents and downstream MCP directories/clients discover MCP servers primarily
through the official MCP Registry, keyed by a domain-verified server name
(`com.stocktrends/market-intelligence`) rather than by npm package name alone.
Registering this server under the Stock Trends domain identity makes it
discoverable by name-aware MCP clients and directory aggregators without
requiring a consumer to already know the npm package name. This patch is the
repository-side prerequisite for that later registration: it declares the
exact identity the Registry submission will use and validates that the
declaration is internally consistent, before any live Registry action is
authorized.

---

## 2. Domain identity (exact, settled)

| Field | Value |
| --- | --- |
| MCP Registry server name / `mcpName` | `com.stocktrends/market-intelligence` |
| Registry title | `Stock Trends Market Intelligence` |
| npm package identifier | `@stocktrends-publications/stocktrends-mcp-server` |
| Release version (this patch) | `1.0.1` |
| Repository identity | `skotlander/stocktrends-mcp-server` |
| Repository URL (`server.json`) | `https://github.com/skotlander/stocktrends-mcp-server` |
| Registry schema URL | `https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json` |
| Transport | `stdio` |

---

## 3. Branch and base commit

- Checkout: the normal attached checkout at
  `C:\Users\skort\Projects\stocktrends-mcp-server`. Worktree mode **off**.
- Branch: `feat/mcp-registry-readiness-1.0.1`, created from `main`.
- Base commit: `b80926b` ("Implement package publication configuration
  (#98)").
- `main` matched `origin/main`; the working tree and index were clean before
  any edit; the only local branch was `main`.
- No remote Git fetch, pull, push, or query occurred during this work; no web
  access occurred; no npm or MCP Registry endpoint was contacted.

---

## 4. `1.0.0` publication evidence (completed prior to this patch)

Per the confirmed record and [`docs/SECURITY_MODEL.md`](SECURITY_MODEL.md)
§18:

- The separately authorized, owner-controlled, 2FA-protected manual `npm
  publish` of `1.0.0` has occurred. The package is publicly available on the
  npm registry as `@stocktrends-publications/stocktrends-mcp-server`.
- The anonymous registry tarball was verified as an exact SHA-256 match
  against the frozen, offline-validated release-candidate artifact produced
  during the P-4 publication-configuration work.
- Anonymous installation by package name (no local checkout, no `.tgz`)
  succeeded.
- The resulting Windows npm-managed command shim completed an MCP
  `initialize` handshake and a list-only check: prompts capability undefined,
  exactly one tool (`stocktrends_estimate_workflow_cost`), exactly ten
  resources, empty stderr.
- No tool was invoked and no resource was read during that validation; no
  network request beyond the registry install itself occurred; no
  `STOCKTRENDS_*` variable reached the child process; x402 remained
  default-off throughout.
- MCP Registry registration (a separate action from npm publication) had
  **not** occurred as of that validation and does not occur in this patch
  either — see §9.

This patch does not repeat or re-perform that publication or validation; it
records it and builds the readiness metadata for the next release.

---

## 5. Narrow `1.0.1` change surface

Modified:

- `package.json` — `version` → `1.0.1`; added `"mcpName":
  "com.stocktrends/market-intelligence"`.
- `package-lock.json` — root `version` and `packages[""].version` → `1.0.1`
  (two-line identity edit only; no dependency, integrity, or resolved-URL
  change).
- `src/server.ts` — `SERVER_VERSION` → `1.0.1` (release identity only; no
  capability, tool, resource, prompt, paid-policy, x402, logging, or error
  behavior change).
- `scripts/check-package-metadata.mjs` (+`.d.mts`) — `REVIEWED_VERSION` →
  `1.0.1`; added `REVIEWED_MCP_NAME` and an exact `mcpName` field check.
- `tests/packageMetadata.test.ts` — reviewed fixture updated to `1.0.1` +
  `mcpName`; added an `mcpName` invariant block (missing, malformed, wrong
  namespace, wrong path, non-string).
- `.github/workflows/npm-stage-release.yml` — added a
  `check:mcp-registry-metadata` step after dependency installation and
  package-metadata validation, before tarball creation.
- `scripts/check-release-workflow.mjs` — extended `checkOrderingAndStaging`
  to require the new validation step, positioned after `npm ci` and before
  `npm pack`.
- `tests/releaseWorkflow.test.ts` — fixture updated with the new step; added
  ordering-violation cases (missing, before install, after pack).
- `README.md` — corrected publication language (§7).
- `docs/SECURITY_MODEL.md` — §18 corrected; new §19 added (§8).

Added:

- `server.json` (repository root) — the MCP Registry submission metadata
  (§6). **Not** added to `package.json`'s `files` allowlist; **not** packaged
  into the npm tarball.
- `scripts/check-mcp-registry-metadata.mjs` (+`.d.mts`) — the new offline
  Registry-metadata validator (design detailed in §7).
- `tests/mcpRegistryMetadata.test.ts` — its focused test suite (coverage
  detailed in §7).
- `docs/MCP_REGISTRY_READINESS_IMPLEMENTATION_NOTES.md` (this record).

No file under `src/` changed except the single `SERVER_VERSION` literal. No
tool, resource, prompt, paid-policy, API, transport, or x402 behavior
changed. No historical governance/decision record was rewritten.

---

## 6. Exact `server.json` contract

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "com.stocktrends/market-intelligence",
  "title": "Stock Trends Market Intelligence",
  "description": "Equity trend, relative-strength, expected-return, market-context, and research resources for agents.",
  "repository": {
    "url": "https://github.com/skotlander/stocktrends-mcp-server",
    "source": "github"
  },
  "version": "1.0.1",
  "packages": [
    {
      "registryType": "npm",
      "identifier": "@stocktrends-publications/stocktrends-mcp-server",
      "version": "1.0.1",
      "transport": {
        "type": "stdio"
      }
    }
  ]
}
```

No `environmentVariables`, `remotes`, package arguments, payment/x402
configuration, credentials, or any field outside this exact shape is present.
The default MCP surface (one tool, ten resources) requires no API key or
other environment variable to initialize or list, so declaring a mandatory
environment variable here would misstate the package's actual requirements.

**Schema correction (post-implementation review).** The originally drafted
`description` was 160 characters. The approved MCP Registry schema
(`2025-12-11/server.schema.json`) caps `ServerDetail.description` at 100
characters, so the 160-character value would have failed Registry submission.
It was replaced everywhere it was treated as the exact canonical Registry
description (`server.json`, this record, and the validator/tests below) with
the exact 100-character value shown above. No other file reproduced the
original description verbatim.

---

## 7. Validator and test coverage

**`scripts/check-mcp-registry-metadata.mjs`** (new, offline, same proven shape
as the existing validators — pure exported helpers + a direct-execution CLI
guard):

- `analyzeServerJson()` validates `server.json` in isolation: exact
  `$schema`, `name`, `title`, `description`, `repository`, `version`; exactly
  one `packages` entry with exact `registryType`, `identifier`, `version`,
  `transport`; no `environmentVariables` or `remotes` on the package entry;
  no unexpected top-level or package field (closed-field enforcement via
  `ALLOWED_TOP_LEVEL_FIELDS` / `ALLOWED_PACKAGE_FIELDS`).
- `checkSchemaShapeFields()` (added in the schema correction) independently
  enforces the approved Registry schema's shape bounds, regardless of exact
  value: `description` must be a string of 1–100 characters; `title` must be
  a string of 1–100 characters; `name` must be a string matching the
  reverse-DNS/server-name form `^[a-zA-Z0-9.-]+/[a-zA-Z0-9._-]+$` (exactly one
  slash) and be 3–200 characters long. These run alongside, not instead of,
  the exact-value checks above.
- `analyzeRegistryMetadataAgreement()` validates cross-file agreement:
  `package.json` `mcpName` equals `server.json` `name`; `package.json`
  `version` equals `server.json` `version`; `package.json` `name` equals the
  declared npm package `identifier`; `package-lock.json` root version (both
  the top-level field and `packages[""].version`) agrees with `server.json`
  `version`; and the GitHub repository identity resolved from `package.json`
  `repository.url` and `server.json` `repository.url` agree with each other
  and with the reviewed `skotlander/stocktrends-mcp-server` identity.
- Reads only local files; runs no npm, `mcp-publisher`, registry, or network
  command.

**`tests/mcpRegistryMetadata.test.ts`** — **45 cases** (was 35; +10 from the
schema correction), covering the valid committed
`server.json`/`package.json`/`package-lock.json` state and every listed
negative invariant: malformed JSON, missing `server.json`, wrong schema,
wrong domain namespace, wrong title/description, another repository, another
version, version mismatch against `package.json`, version mismatch against
`package-lock.json`, missing/wrong `mcpName`, another npm package identifier,
non-npm registry type, non-stdio transport, multiple package entries,
`environmentVariables` present, `remotes` present (both top-level and
per-package), unexpected top-level field, unexpected package field, a
101-character description, an empty description, a description at exactly
the 100-character bound (accepted), a 101-character title, an empty title, a
name with no slash, a name with two slashes, a name with an invalid
character, a name over 200 characters, and a non-string name.

**`scripts/check-package-metadata.mjs`** — extended (not replaced): a
`REVIEWED_MCP_NAME` constant and an `mcpName` exact-string field check
alongside the existing `name`/`version`/`description`/etc. checks, so a
missing, malformed, wrong-namespace, wrong-path, or non-string `mcpName`
fails the same way any other identity drift does. **`tests/
packageMetadata.test.ts`** — **92 cases** (was 87; +5 for the `mcpName`
block).

**`scripts/check-release-workflow.mjs`** — `checkOrderingAndStaging` extended
with a `check:mcp-registry-metadata` marker (must run before staging, like
every other validation marker) plus two dedicated ordering rules: it must run
strictly **after** `npm ci` and strictly **before** `npm pack`. **`tests/
releaseWorkflow.test.ts`** — **63 cases** (was 60; +3 for missing / before
install / after pack).

---

## 8. README and SECURITY_MODEL corrections

- `README.md` — replaced the "not published" language with a new prominent
  **Public npm Installation** section documenting the true, publicly
  available install command
  (`npm install @stocktrends-publications/stocktrends-mcp-server`), the
  `1.0.0` publication/validation evidence, and the `1.0.1`
  Registry-readiness note (Registry publication itself explicitly **not**
  claimed as complete). The build-your-own local-artifact path is retained as
  an alternative, re-labeled to avoid implying it is the only or primary
  install path, with its example tarball filename updated to the `1.0.1` a
  fresh local build now produces.
- `docs/SECURITY_MODEL.md` §18 — the package-distribution bullets rewritten
  to record the completed `1.0.0` bootstrap publication and public-install
  validation as fact, and to state plainly that MCP Registry registration
  (a separate action from npm publication) has not yet occurred. A new §19
  ("MCP Registry Ownership-Identity Readiness") records the `mcpName`/
  `server.json` contract, its offline fail-closed validation, that
  `server.json` is Registry metadata excluded from the npm tarball, and that
  domain authentication and Registry submission remain separate,
  owner-authorized, later actions.

No historical decision record (P-1 through P-4, PR-1 through PR-4 notes, or
any dated implementation note) was rewritten.

---

## 9. Explicit no-external-action statement

This implementation performed:

- No web search.
- No npm query (`view`/`ping`/`whoami`/`search`/`access`/`owner`/`org`/
  `trust`/`token`/`publish`/`publish --dry-run`/`stage` command of any kind).
- No install or download of `mcp-publisher`.
- No `mcp-publisher init`/`login`/`logout`/`publish`.
- No generation of an MCP Registry authentication private key.
- No DNS record creation.
- No creation or deployment of `/.well-known/mcp-registry-auth`.
- No change to `stocktrends.com`.
- No live Stock Trends API call.
- No API key or x402 use.
- No payment or spend of any kind.
- No GitHub Actions workflow run.
- No GitHub Release creation.
- No repository-visibility change.
- No git stage, commit, push, merge, or pull request.

Local build, `npm test`, local `npm pack`, and offline installation of a
locally created tarball into a temporary, deleted consumer were performed as
explicitly authorized validation steps (see the accompanying validation
report in the session's final report; no artifact from that validation is
retained in the repository).

---

## 10. Next live gates (in order; none performed here)

1. Review and merge this `1.0.1` readiness patch.
2. Freeze and re-validate the exact `1.0.1` release candidate (build, full
   test suite, all `check:*` validators, offline pack/install) immediately
   before publishing.
3. Publish the exact `1.0.1` npm tarball (a separate, owner-controlled,
   2FA-protected — or, once configured, trusted-publisher OIDC — publication
   action; not performed by this patch).
4. Verify the public install of `1.0.1` by name from the npm registry.
5. Perform domain authentication for `stocktrends.com` against the MCP
   Registry (DNS or `/.well-known/mcp-registry-auth`, owner action; not
   performed by this patch).
6. Publish `server.json` to the official MCP Registry under
   `com.stocktrends/market-intelligence` (via `mcp-publisher`, a separate
   owner action; not performed by this patch).
7. Verify the resulting MCP Registry record (name, packages, version) matches
   the reviewed contract in §6.

---

## 11. Final classification

`MCP REGISTRY READINESS (1.0.1) IMPLEMENTED AND VALIDATED OFFLINE — OWNERSHIP-
VERIFICATION IDENTITY (mcpName, server.json) AND ITS VALIDATORS ADDED; NPM
PUBLICATION, MCP REGISTRY DOMAIN AUTHENTICATION, server.json SUBMISSION, AND
REGISTRY RECORD CREATION REMAIN UNAUTHORIZED AND UNPERFORMED BY THIS CHANGE`

The package is **not** classified as MCP-Registry-registered,
domain-verified, or Registry-discoverable. This record implements the
repository-side ownership-identity readiness and hands a decided,
offline-validated repository state to the separately authorized `1.0.1`
release and, later, MCP Registry registration gates in §10.
