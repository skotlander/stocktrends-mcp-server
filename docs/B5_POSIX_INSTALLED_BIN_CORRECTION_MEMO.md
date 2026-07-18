# B-5 POSIX Installed-Bin Direct-Execution Correction Memo

Date: 2026-07-18

**Decision classification:**

`RECOMMENDED FOR NARROW IMPLEMENTATION AFTER REVIEW — CANONICAL
DIRECT-EXECUTION PATH COMPARISON ONLY; NO MCP CAPABILITY, NETWORK, PAYMENT,
DEPENDENCY, PACKAGE-METADATA, OR PUBLICATION CHANGE AUTHORIZED`

This memo is a concise correction contract for **B-5**, the candidate defect
named in
[`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md)
§6: the bin-launch guard `isDirectExecution()` in [`src/server.ts`](../src/server.ts)
is an untested exact-string identity check. That architecture memo recorded
B-5 as *candidate* — necessity conditional on PR-4's installed-bin
observation. **PR-4 has since reproduced it.** This memo converts that
observation into one exact, minimal, capability-neutral implementation
contract. It repeats neither the full package architecture nor the complete
PR-4 procedure; both are cited, not restated.

This PR is **documentation only**. It implements no runtime correction. It
changes exactly two files: this memo and one README documentation-index link.

---

## 1. Empirical evidence (source commit `8fa6f1f`)

All of this section is **[FACT]**, observed during the PR-4 installed-bin
validation run at source commit `8fa6f1f6f66661ccc5a3503e9e1d4225cba91ff9`
(HEAD of `main`, includes PR #87).

The same freshly packed artifact:

- passed the strict Windows offline cache gate;
- passed the strict WSL2 Ubuntu offline cache gate;
- installed cleanly in isolated consumers on both platforms;
- resolved both direct runtime dependencies (`@modelcontextprotocol/sdk`, `zod`);
- preserved the reviewed private/package metadata;
- attempted no outbound network operation.

**Windows — B-5 not reproduced:**

- npm's `.cmd` shim passed the installed real `dist/server.js` path to Node;
- the MCP `initialize` handshake completed;
- exactly one tool, ten resources, and zero prompts were observed;
- the server behaved correctly through the installed bin.

**WSL/POSIX — B-5 reproduced:**

- npm created `.bin/stocktrends-mcp-server` as a **symlink** to the installed
  `dist/server.js`;
- Node started and the network guard loaded;
- no outbound network operation occurred;
- `isDirectExecution()` returned **false**;
- the stdio server did **not** start;
- the process **exited zero**;
- MCP `initialize` failed because the connection closed.

**Conclusion.** The package/install architecture validated by PR-3 and PR-4 is
largely sound: content allowlist, dependency-contract completeness, metadata
consistency, and offline-cache posture all held on both platforms. **B-5 is
one narrow entry-point detection defect**, isolated to the direct-execution
guard, not a defect in packaging, dependencies, or metadata. It does not call
into question anything else PR-3/PR-4 validated.

**This memo does not claim PR-4 succeeded end-to-end, and does not claim B-5
is closed.** PR-4's Windows leg succeeded; its WSL/POSIX leg reproduced B-5.
Closure is defined in §7 below and has not occurred.

---

## 2. Root cause

The current guard ([`src/server.ts:146-149`](../src/server.ts)):

```ts
function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];
  return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
}
```

compares `import.meta.url` (the ESM loader's resolved module URL, which
follows a symlink to its **real** target) against `pathToFileURL(process.argv[1])`
(a URL built directly from **whatever path the shell passed in argv**, symlink
or not — never resolved). On POSIX, npm's `bin` mechanism creates
`node_modules/.bin/<name>` as a **symlink** to the installed package's `bin`
target. When a consumer runs the installed command, `process.argv[1]` is the
**symlink path**; `import.meta.url` resolves to the **realpath** the symlink
points at. The two strings differ by construction, so the guard returns
`false`, `startStdioServer()` never runs, and the process exits `0` with no
transport, no error, and no log line — a silent no-op that looks like success
from an exit-code check alone.

Windows is unaffected because npm's generated `.cmd` shim invokes Node with
the **real** `dist/server.js` path directly — no symlink is in the chain — so
the two strings already agree.

---

## 3. Selected correction design

**Convert the comparison from URL/string identity to canonical filesystem
identity.** Concretely:

1. Convert `import.meta.url` to a filesystem path with `fileURLToPath`.
2. Require `process.argv[1]` to be present (unchanged precondition).
3. Resolve the entry argument from the current working directory with
   `path.resolve(process.argv[1])`.
4. Canonicalize both paths using `realpathSync.native`.
5. Compare the two canonical filesystem paths.
6. Return `false` on every conversion, resolution, or realpath exception.

The intended future structure is equivalent to:

- a small canonical-path helper (converts one path-like input to its
  canonical real path, or throws);
- a focused `isDirectExecution()` function that calls the helper twice and
  compares, catching and converting any exception to `false`;
- dependency injection or explicit helper parameters where useful for
  deterministic tests (so error branches — a bad URL, a missing file, a
  broken symlink — can be exercised without constructing real broken
  filesystem state);
- the existing conditional call to `startStdioServer()` remains the **only**
  autostart point; nothing else changes.

### Why this design

- **Resolves the POSIX npm-bin symlink to the installed target.**
  `realpathSync.native` follows `node_modules/.bin/<name>` to the real
  `dist/server.js` it points at, which is exactly what `import.meta.url`
  already resolves to independently — canonicalizing both sides makes the
  comparison symlink-transparent instead of symlink-brittle.
- **Preserves Windows command-shim behavior.** The `.cmd` shim already invokes
  the real path; canonicalizing an already-real path is a no-op, so the
  existing passing Windows case is unaffected.
- **Preserves direct compiled-file execution.** `node dist/server.js` passes
  its own real path as `argv[1]`; canonicalizing it changes nothing.
- **Preserves supported source-tree direct execution.** `npm run dev` (`tsx
  src/server.ts`) and any other supported direct-invocation path compare
  identically once both sides are canonicalized, because they were never
  symlinked to begin with.
- **Keeps imported modules from autostarting.** The comparison is unchanged in
  kind — it is still "does the executing entry point equal this module" — so
  a module imported by another executable (a test harness, another script)
  still resolves to two different canonical paths and does not autostart.
- **Requires no platform-name special case.** The defect is symlink-vs-real
  identity, not a Windows-vs-POSIX branch; canonical-path comparison fixes the
  underlying identity question on every platform uniformly, so no
  `process.platform` check is needed or wanted.
- **Fails closed when canonical identity cannot be established.** Any
  exception (missing file, invalid URL, broken symlink, permission error) is
  caught and converted to `false` — the safer default is "did not detect
  direct execution," never "assume direct execution."

---

## 4. Correction invariant

> The server starts automatically **if and only if** the executing
> entry-point path and the server module resolve to the same canonical
> filesystem object.

---

## 5. Authority boundary

The implementation may change **only** direct-execution detection.

It must **not** change: tool registration; resource registration; prompt
registration; configuration defaults; API-key handling; paid mode; x402
behavior; proof or payment behavior; network behavior; logging; package
metadata; runtime dependencies; build configuration; publication posture;
Stock Trends API authority.

**Not authorized:** unconditional startup; startup on import; an
environment-variable bypass; a project-maintained shell wrapper; a second
executable; a retry or fallback startup route; a platform-specific shortcut
where canonical path identity is sufficient.

---

## 6. Focused test contract

Deterministic tests required, using an injected canonicalization helper for
error branches so failure modes don't depend on constructing real broken
filesystem state:

1. exact real module path equals entry path → `true`;
2. entry path is a symlink resolving to the module → `true`;
3. unrelated executable path → `false`;
4. module imported by another executable → no automatic startup;
5. missing `process.argv[1]` → `false`;
6. non-file module URL → `false`;
7. module URL conversion failure → `false`;
8. module-path realpath failure → `false`;
9. entry-path realpath failure → `false`;
10. source-tree direct invocation remains supported;
11. Windows command-shim-equivalent real path remains supported;
12. no duplicate invocation of `startStdioServer()`.

Also required: **one genuine symlink integration test**, where the test
environment supports symlink creation (create a real symlink, invoke the
real helper against it, assert `true`) — not just the injected-helper unit
tests above.

Tests must **not**: call the Stock Trends API; invoke an MCP tool; read an
MCP resource; access a registry; use an API key; run x402; send proof or
payment material; make payment or spend.

---

## 7. Implementation PR scope

The next branch is a narrow implementation PR expected to change only files
genuinely required, likely:

- [`src/server.ts`](../src/server.ts) — the canonicalization helper and
  revised `isDirectExecution()`;
- one focused direct-execution test file (or the most appropriate existing
  test file);
- optionally one concise implementation record, only if this memo cannot
  hold the necessary evidence.

No package metadata, lockfile, dependency, build-config, or MCP-surface
change should be required.

### Required implementation validation

- focused direct-execution tests (§6);
- genuine symlink test where supported;
- typecheck;
- full test suite;
- build;
- runtime-dependency validator;
- package-metadata validator through both invocation paths;
- x402 relay suite;
- `git diff --check`.

**Pre-change baselines** (recorded by prior PRs, to be reconfirmed unchanged
by the implementation PR before it changes anything):

| Check | Baseline |
| --- | --- |
| Package metadata suite | 67/67 |
| Runtime dependency contract suite | 15/15 |
| Full suite | 1027/1027 across 18 files |
| x402 relay suite | 474/474 |

Actual post-change test counts must be reported by the implementation PR —
this memo does not assert what they will be.

---

## 8. Review and rerun path

1. Merge this concise memo after review.
2. Create a separate narrow implementation branch.
3. Implement and independently review the correction.
4. Merge the correction.
5. Restart PR-4 from current clean `main`.

**Implementation tests alone do not close B-5.** Passing unit and symlink
tests demonstrate the helper behaves correctly in isolation; they are not a
substitute for an installed-consumer MCP handshake on both platforms.

The post-correction PR-4 rerun must use:

- a fresh package artifact;
- the already prepared npm caches;
- fresh Windows and WSL literal-`--offline` cache gates;
- fresh isolated installs on both platforms;
- the Windows npm shim;
- the WSL POSIX symlink bin;
- completed MCP `initialize` on both platforms;
- exact 1-tool / 10-resource / 0-prompt verification;
- no tool invocation;
- no resource reading;
- the process-level no-network guard;
- full cleanup.

No registry-reaching cache preparation should be repeated unless an
independent new cache failure is observed.

---

## 9. B-5 closure standard

> B-5 is closed only when a freshly packed and cleanly installed package
> completes an MCP `initialize` handshake through the npm-installed bin on
> both the approved Windows and WSL2 Ubuntu environments.

An exit code alone is not success.

---

## 10. Cost-conscious execution note

The defect and root cause are already empirically established (§1, §2). The
next implementation and rerun should be treated as narrow deterministic work,
not a new architecture investigation.

---

## 11. Final classification

`RECOMMENDED FOR NARROW IMPLEMENTATION AFTER REVIEW — CANONICAL
DIRECT-EXECUTION PATH COMPARISON ONLY; NO MCP CAPABILITY, NETWORK, PAYMENT,
DEPENDENCY, PACKAGE-METADATA, OR PUBLICATION CHANGE AUTHORIZED`
