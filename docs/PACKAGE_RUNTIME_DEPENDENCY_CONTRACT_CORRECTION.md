# Package Runtime Dependency Contract Correction

Date: 2026-07-16

**Classification:**

`PR-0 LEG A — MANDATORY DEFECT CORRECTION, NO RUNTIME CAPABILITY CHANGE`

This is PR-0 Leg A of
[`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md)
§13: the mandatory, minimal correction of B-1, the confirmed undeclared
direct-runtime-dependency defect. It changes only the package dependency
contract and its offline, static validation. It does not implement PR-0 Leg B
(B-5), and B-5 remains conditional and unresolved.

---

## 1. Confirmed defect

Five source files import `zod` as a runtime value, not a type:
[`src/tools/index.ts:3`](../src/tools/index.ts), `src/tools/indicatorsTools.ts:3`,
`src/tools/marketContextTools.ts:3`, `src/tools/selectionsTools.ts:3`, and
`src/tools/stimTools.ts:3` each contain `import { z } from "zod";`. These
value imports survive compilation and appear as a bare `"zod"` specifier in
the corresponding `dist/tools/*.js` files.

Before this correction, `zod` appeared nowhere in `package.json` — not in
`dependencies`, not in `devDependencies`. The repository shipped compiled
code with a direct runtime import of a package its own manifest never
declared, relying entirely on `@modelcontextprotocol/sdk`'s transitive range
(`"zod": "^3.25 || ^4.0"`) to make the import resolve in any given consumer's
tree.

The confirmed local `zod` version, read from `package-lock.json` and
`node_modules/zod/package.json` before this change, was `4.4.3`.

`dist/tools/index.js` is loaded unconditionally on the default/free path
(`src/server.ts:51`), so the defect sits on the validation target of the
architecture memo's phase, not only behind paid execution.

## 2. Why transitive availability or hoisting is insufficient

A consumer's package manager may hoist the SDK's transitive `zod` dependency
into a location Node's module resolution finds when loading
`dist/tools/index.js`. If that happens, the import resolves, the server
starts, and every runtime check passes — while the dependency contract is
still incomplete. A green install-and-launch result is therefore consistent
with the defect being present or absent; it cannot distinguish the two. Only
a static check against the declared contract — independent of what any
particular `node_modules` tree happens to contain — can settle whether the
contract itself is complete. This is why the correction pairs a manifest
change with a static validator rather than relying on install-time evidence.

## 3. Exact dependency declaration added

`package.json` `dependencies` now reads:

```json
"dependencies": {
  "@modelcontextprotocol/sdk": "^1.29.0",
  "zod": "^4.4.3"
}
```

Placed in `dependencies`, not `devDependencies`. The existing SDK dependency
is unchanged. No source import and no runtime behavior changed.

## 4. Exact lockfile update posture

`package-lock.json` was updated with:

```text
npm install --package-lock-only --offline --ignore-scripts
```

run after the manifest edit, with no prior `npm install`. The command made no
registry request (the local npm cache already satisfied the existing,
already-installed `zod@4.4.3`), ran no lifecycle script, and did not mutate
any installed package. The resulting diff is three lines: the lockfile's root
package entry gained a `"zod": "^4.4.3"` line under its `dependencies` object.
The resolved `node_modules/zod` entry (`version 4.4.3`) is unchanged — it was
already present as a transitive resolution of the SDK's declared range and
now additionally satisfies this package's own direct declaration.

## 5. Static compiled-import validation design

[`scripts/check-runtime-dependency-contract.mjs`](../scripts/check-runtime-dependency-contract.mjs)
recursively enumerates `dist/**/*.js`, parses each file with the TypeScript
compiler API already present as a devDependency
(`ts.createSourceFile(..., ts.ScriptKind.JS)`), and walks the resulting AST to
collect bare module specifiers. It normalizes each specifier to a package
name, excludes Node builtins and non-external specifiers, and requires every
remaining external package name to appear in `package.json`'s `dependencies`.
It never reads `node_modules` and never attempts module resolution — the
check is purely a comparison between what compiled code imports and what the
manifest declares. It fails clearly, without building, if `dist/` is absent
or empty.

The check is general: it is not hard-coded to `zod`, and would fail on any
future direct import of a sixth undeclared external package exactly the same
way it failed on `zod` before this correction.

## 6. Covered import forms

- Static `import { x } from "pkg"` declarations
- Side-effect imports (`import "pkg"`)
- `export { x } from "pkg"` / `export * from "pkg"` re-export sources
- Dynamic `import("pkg")` calls with a string-literal specifier
- `require("pkg")` calls with a string-literal specifier

## 7. Builtin and relative-import exclusions

Excluded from the external-package set:

- Relative specifiers (anything starting with `.`)
- Absolute filesystem paths
- `file:` URLs
- `node:`-prefixed specifiers (e.g. `node:url`)
- Bare Node builtin names, matched against `node:module`'s `builtinModules`
  list (e.g. `fs`, `path`, `url`)

## 8. Package-subpath normalization

- `package/subpath` → `package`
- `@scope/package/subpath` → `@scope/package`

Verified against the repository's own compiled specifiers:
`@modelcontextprotocol/sdk/server/mcp.js`,
`@modelcontextprotocol/sdk/server/stdio.js`, and
`@modelcontextprotocol/sdk/types.js` all normalize to
`@modelcontextprotocol/sdk`.

## 9. Focused tests

[`tests/runtimeDependencyContract.test.ts`](../tests/runtimeDependencyContract.test.ts)
exercises the general contract (not only this repository's current result)
against fixture directories created under the OS temp directory and removed
after each test:

1. A declared direct external package passes.
2. An undeclared direct external package fails.
3. A package declared only in `devDependencies` fails.
4. A package physically present only via a simulated hoisted `node_modules`
   install (not directly declared) still fails.
5. Node builtins and `node:` specifiers are ignored.
6. Relative imports are ignored.
7. Scoped package subpaths normalize correctly.
8. Unscoped package subpaths normalize correctly.
9. Static imports are detected.
10. Side-effect imports are detected.
11. `export ... from` sources are detected.
12. String-literal dynamic imports are detected.
13. String-literal `require()` calls are detected.
14. A missing `dist` directory fails clearly (throws `MissingDistError`).
15. This repository's actual built `dist/` output passes, with the
    discovered external package set equal to exactly
    `["@modelcontextprotocol/sdk", "zod"]`.

## 10. Current compiled external package result

Running `npm run check:runtime-deps` against this repository's built `dist/`
after this correction reports exactly two external packages, both declared:
`@modelcontextprotocol/sdk` and `zod`. No undeclared package is reported.

## 11. No runtime capability change

No tool, resource, prompt, route, request behavior, API-key behavior, x402
behavior, payment behavior, feature flag, transport, or direct-execution
behavior changed. The only source changes are `package.json`,
`package-lock.json`, one new script, and one new test file. No file under
`src/` changed.

## 12. No package artifact or publication

This PR produced no tarball, ran no `npm pack`, `npm pack --dry-run`, or
`npm publish`, made no registry query, and created no temporary consumer or
installed package.

## 13. No live API, x402, payment, or external activity

No Stock Trends API call, no x402 canary, no API key use, no proof or
payment material, and no network request of any kind occurred during this
work. The lockfile update ran with `--offline`.

## 14. Remaining package-readiness work

This PR closes only B-1 (§6 of the architecture memo). It does not touch
B-2 through B-13 (artifact contents, license posture, `engines`, `repository`/
`homepage`/`bugs`, README refresh, or any packing/install/publication work).
That work remains scoped to PR-1 through PR-6 of the architecture memo's
decomposition, none of which this PR authorizes or begins.

## 15. B-5 remaining conditional and unresolved

PR-0 Leg B (the candidate bin-launch guard defect, B-5) is not addressed by
this PR. It remains conditional on later installed-bin observation (PR-4) or
separate review establishing necessity, exactly as the architecture memo
specifies. Nothing here predetermines whether B-5 requires a correction or
what form one would take.

## 16. Validation results

Recorded at the time this correction was validated:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Pass |
| `npm test -- tests/runtimeDependencyContract.test.ts` | Pass — 15/15 |
| `npm test` (full suite) | Pass |
| `npm test -- tests/x402Relay.test.ts` | Pass |
| `npm run build` | Pass |
| `npm run check:runtime-deps` | Pass — discovered `@modelcontextprotocol/sdk`, `zod`; none undeclared |

No conflict markers, no secret-shaped content, no tarball, no unpacked
package, no temporary consumer, no generated package manifest, and no
temporary test fixture remained after validation.
