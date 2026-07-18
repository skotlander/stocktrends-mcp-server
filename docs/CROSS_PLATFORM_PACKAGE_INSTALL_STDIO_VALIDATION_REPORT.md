# Cross-Platform Package Install / Stdio Validation Report (Post-B-5-Correction Rerun)

Date: 2026-07-18

**Decision classification:** `B-5 CLOSED ON THE APPROVED WINDOWS AND WSL2 UBUNTU
VALIDATION ENVIRONMENTS — SCOPED TO THE EXACT COMMIT, ARTIFACT, AND HOST
VERSIONS RECORDED BELOW.`

## 1. Purpose and governing decisions

This is the cost-controlled confirmation rerun of the cross-platform
package/install/installed-bin acceptance validation, performed after the B-5
canonical direct-execution correction was designed, independently reviewed,
implemented, reviewed, corrected, and merged
([`B5_POSIX_INSTALLED_BIN_CORRECTION_MEMO.md`](B5_POSIX_INSTALLED_BIN_CORRECTION_MEMO.md)).
It governs itself by the D-11 acceptance decision recorded in
[`PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md`](PACKAGE_ARTIFACT_INSTALLATION_VALIDATION_ARCHITECTURE.md):
successful clean-install and installed-bin validation is required on both
Windows and Linux/POSIX (WSL2 Ubuntu accepted as the Linux environment; macOS
evidence not required), each platform independently passing a strict offline
cache gate with no registry fallback.

This run performed no architecture investigation, no cache-root-cause
investigation, and no B-5 design analysis — it is deterministic confirmation
against an already-merged correction.

## 2. Exact source commit and branch

- Branch: `test/cross-platform-package-install-stdio-validation-rerun`
- Commit: `433bf730ed2fde1ba259921da29baba796474843` ("Fix POSIX installed-bin
  direct execution (#89)")
- HEAD includes `Define B-5 POSIX bin correction (#88)` and the merged
  correction (#89).
- Working tree and index were clean before and after the run;
  `package.json`/`package-lock.json` unchanged throughout.

## 3. Post-correction artifact identity and hashes

Produced by exactly one `npm pack . --json --ignore-scripts --offline` into an
isolated Windows temporary root.

| Field | Value |
| --- | --- |
| Identity | `stocktrends-mcp-server@1.0.0` |
| Filename | `stocktrends-mcp-server-1.0.0.tgz` |
| Packed size | 112,875 bytes |
| Unpacked size | 543,258 bytes |
| File count | 37 |
| npm shasum | `5df3386ae74c7f65ee99845a1a25efc9751d25b1` |
| npm integrity | `sha512-uLw9TOSjO5GTfSQQuv4vaeePCbr+1Z6EbaLXGF1Dw2yCQ0/qGmX6SC0WYmmoT0O5t+9agZ+WTE0hk5jbFy1Zlw==` |
| Local SHA-256 | `b495e97f788fc906c8a4dc1e3115d86a740e6312113e2285fc2935cbe0acf826` |

This hash differs from the earlier pre-correction artifact, as expected, since
`src/server.ts` and its compiled output changed.

The exact 37-path closed allowlist was verified: `package.json`, `README.md`,
`LICENSE`, and all `dist/**/*.js` / `dist/**/*.d.ts` (17 each) — no maps, no
TypeScript source, no tests, no scripts, no lockfile, no internal docs, no
configuration files, no VCS/worktree content, and no missing or extra path.
Packed `package.json`, `README.md`, and `LICENSE` were verified byte-identical
to the current repository files.

**Same-artifact rule:** the exact Windows tarball was copied into the WSL2
native temporary root (not repacked); SHA-256 was computed independently on
both platforms and found equal (`b495e97f788fc906c8a4dc1e3115d86a740e6312113e2285fc2935cbe0acf826`).

## 4. Windows and WSL environments

| | Windows | WSL2 |
| --- | --- | --- |
| OS | Windows 11 Home, build 10.0.26200, x64 | Ubuntu 24.04.4 LTS (noble), kernel 6.6.87.2-microsoft-standard-WSL2, x86_64 |
| Node | v22.23.1 | v20.20.2 |
| npm | 10.9.8 | 10.8.2 |

Both satisfy the declared `engines.node >=18` requirement. Both existing npm
caches (primed in a prior authorized session) were confirmed present before any
operation; no priming was repeated.

## 5. Both independent literal-`--offline` cache gates

Each governed gate is the single evidentiary execution reported below, run
with literal `--offline` (never `--prefer-offline`), against the existing
cache only.

- **Windows dry-run gate:** exit 0; 94 packages resolved; no `ENOTCACHED`; no
  registry fallback; no `node_modules` written (dry-run).
- **WSL dry-run gate:** exit 0; 94 packages resolved; no `ENOTCACHED`; no
  registry fallback; no `node_modules` written (dry-run).

Both gates passed as the single evidentiary execution of each. No cache
priming and no registry-reaching command occurred at any point in this run.
A preliminary command-construction failure did occur before the Windows
gate's evidentiary run — it did not reach dependency resolution, produced no
gate evidence, and was not a retry of a completed gate. It is disclosed in
full, without minimization, in §6.

## 6. Preliminary command-construction and transport deviations (disclosed for audit honesty)

Two preliminary command failures occurred during this run. Neither reached
registry access, package resolution, installation, or MCP server validation,
and neither produced evidence that competed with or altered the single
evidentiary result each governed operation ultimately produced.

**Windows cache-gate setup.** Before the evidentiary Windows offline cache
gate (§5) ran, a preliminary `npm install ... --dry-run --offline` invocation
was constructed with the same temporary empty configuration file supplied as
both `--userconfig` and `--globalconfig`. npm rejected this at its own
config-load validation stage ("double-loading config ... as 'global',
previously loaded as 'user'"), exiting non-zero with the message `Exit prior
to config file resolving`. This preliminary invocation:

- exited before dependency resolution — it never reached npm's cache/package
  closure logic;
- did not inspect or resolve the package closure from cache;
- created no `node_modules`;
- produced no cache-gate evidence of any kind;
- made no registry request (the failure was local config validation, prior to
  any network-capable step).

Two distinct empty configuration files (one for `--userconfig`, one for
`--globalconfig`) were then created, and the single evidentiary Windows
offline cache gate reported in §5 ran once against the corrected invocation
and passed.

**WSL command transport.** Separately, during verification of the completed
WSL real installation (§8), a command that invoked a previously-copied local
verification shell script by its native `/tmp`-rooted path was rewritten by
the local git-bash shell's own POSIX-to-Windows path auto-conversion (MSYS
path conversion) before it reached the WSL command line. The shell reported
`No such file or directory` against a mistranslated Windows-style path (exit
status 127). Based on the retained session evidence, this failure occurred at
the shell/exec level, before any subprocess was launched: the command being
run was the verification script itself, not an npm command, so **npm did not
start** during this preliminary failure, and no cache-gate, install, or
launch result was produced or used from it. The command was corrected by
setting `MSYS_NO_PATHCONV=1` for the remainder of the WSL command sequence,
and the verification then ran successfully. No governed cache gate,
installation, or installed-bin launch was affected by this transport issue —
each of those had already completed, or later completed, as a single
successful invocation.

A WSL keepalive session (a long-lived background WSL process) was
additionally established and held open from shortly after WSL root creation
through cleanup. This was necessary because the WSL2 lightweight VM was
observed to idle out and restart between separated `wsl` invocations, which
wipes the native `/tmp` temporary validation root; the keepalive prevented
this from recurring during the remainder of the governed sequence.

## 7. Owner disposition

The preliminary configuration and command-transport failures are recorded as
non-evidentiary execution-procedure deviations. They did not reach registry
access, package resolution, installation, or MCP server validation and did not
produce competing evidence. Each successful evidentiary offline cache gate,
real installation, and installed-bin launch was executed once. The deviations
do not alter the technical acceptance result, but they are retained for audit
honesty.

## 8. Both clean installs and isolation evidence

Each run exactly once, with literal `--offline`, `--ignore-scripts`,
`--no-save`, `--package-lock=false`, `--omit=dev`, empty user/global npm
configs, and the existing cache.

- **Windows:** `added 94 packages`, exit 0. Installed package is a real copied
  directory (not a symlink) whose realpath resolves beneath the isolated
  consumer; SDK and zod realpaths likewise resolve beneath the consumer; no
  `package-lock.json` created; no consumer manifest (no `--save`); no
  NODE_PATH or checkout fallback.
- **WSL:** `added 94 packages`, exit 0. Installed package and SDK/zod resolve
  beneath the isolated WSL consumer under native `/tmp`, with no path resolving
  under `/mnt/c`; no `package-lock.json`; no checkout fallback.

## 9. Installed direct and meaningful transitive versions

- Direct runtime dependencies on both platforms: `@modelcontextprotocol/sdk`
  `1.29.0`, `zod` `4.4.3`.
- Lock-free transitive drift observed (expected, since `package-lock.json` is
  not shipped and does not govern a consumer install): `express-rate-limit`
  `8.5.2` (Windows) vs `8.6.0` (WSL); `hono` `4.12.28` (Windows) vs `4.12.30`
  (WSL). Direct dependencies are identical on both platforms; this drift is
  controlled by V-26 (static dependency-contract completeness), not by
  consumer-install version matching.

## 10. Windows shim form

`node_modules/.bin/stocktrends-mcp-server.cmd` is the npm-generated Windows
shim; it locates `node.exe` relative to itself and invokes
`"%dp0%\..\stocktrends-mcp-server\dist\server.js"` — the installed package's
compiled entry point.

## 11. WSL bin symlink form and real target

`node_modules/.bin/stocktrends-mcp-server` is a POSIX symlink:

```
lrwxrwxrwx 1 <owner> <group> 40 ... stocktrends-mcp-server -> ../stocktrends-mcp-server/dist/server.js
```

Its final realpath resolves to the installed package's `dist/server.js`. The
harness launched this symlink path directly and did not resolve it or invoke
the target manually.

## 12. Network-guard design and fixed-marker evidence

One temporary ESM guard module was preloaded per platform via
`NODE_OPTIONS=--import <file-url>` into the spawned server child process only
(not the harness process). The guard replaced `globalThis.fetch` and the
relevant methods on `node:http`, `node:https`, `node:net`, `node:tls`,
`node:dns` (including `dns.promises` and `Resolver.prototype.resolve`), and
`node:dgram`, called `syncBuiltinESMExports()`, and would write a fixed
attempted-network marker file and throw immediately on any attempted outbound
call. No hostname, URL, header, body, credential, or token value is ever
recorded by the guard.

- Windows: guard-loaded marker present; attempted-network marker **absent**.
- WSL: guard-loaded marker present; attempted-network marker **absent**.

The guard was not exercised by a real network request (not permitted by this
validation); absence of the attempted-network marker combined with completed
initialize and surface listing is the evidence that no outbound operation was
attempted during the validated lifecycle window.

## 13. Sanitized child-environment evidence

Each installed-bin launch supplied the spawned server process an explicit
environment containing only `NODE_OPTIONS` (guard preload) and the two guard
marker paths; the SDK's own `StdioClientTransport` merges this with its
built-in minimal default-inherited-variable set (`PATH`/`HOME`/`APPDATA`/etc.
only). No `STOCKTRENDS_*` variable, API key, paid-mode variable, x402
variable, wallet/signing/proof/payment variable, token/auth variable, proxy
variable, or `NODE_PATH` was present in either child environment. The complete
child environment was not printed in evidence output.

## 14. Completed initialize on Windows

The harness, using only the Windows consumer's installed SDK, launched the
actual npm-installed `.cmd` shim and completed the MCP `initialize` handshake
within the bounded timeout.

## 15. Completed initialize on WSL

The harness, using only the WSL consumer's installed SDK, launched the actual
npm-installed POSIX symlink bin directly and completed the MCP `initialize`
handshake within the bounded timeout. This is the decisive post-correction
observation for B-5.

## 16. Exact one-tool surface

Both platforms: exactly `stocktrends_estimate_workflow_cost`; all nine paid
and x402 tools absent.

## 17. Exact ten-resource surface

Both platforms returned exactly the ten expected URIs: `stocktrends://api/openapi`,
`stocktrends://ai/context`, `stocktrends://ai/tools`, `stocktrends://workflows`,
`stocktrends://methodology/stim`, `stocktrends://methodology/indicators`,
`stocktrends://methodology/inference`, `stocktrends://pricing/catalog`,
`stocktrends://proof/market-edge`, `stocktrends://leadership/definitions`.

## 18. Prompts capability undefined

Both platforms: `client.getServerCapabilities()?.prompts === undefined`
(asserted as a capability check, not a `listPrompts` call).

## 19. No tool invocation

Neither harness run called `callTool` on any tool.

## 20. No resource read

Neither harness run called `readResource` on any URI.

## 21. No attempted network operation

Neither platform's attempted-network marker was written; no fetch, HTTP(S),
raw socket, TLS, DNS, or UDP operation was attempted during process startup,
initialize, tool listing, resource listing, or shutdown.

## 22. No API key, paid mode, x402, proof, payment, or spend

No API key, paid-mode flag, x402 variable, proof material, payment header, or
spend path was present, read, or exercised at any point in this run.

## 23. B-5 closure classification scoped to the tested environments

**`B-5 CLOSED ON THE APPROVED WINDOWS AND WSL2 UBUNTU VALIDATION
ENVIRONMENTS.`** This classification is scoped strictly to: commit
`433bf730ed2fde1ba259921da29baba796474843`; the artifact identified in §3;
Windows 11 Home build 10.0.26200 (x64) with Node v22.23.1 / npm 10.9.8; and WSL2
Ubuntu 24.04.4 LTS (kernel 6.6.87.2-microsoft-standard-WSL2, x86_64) with Node
v20.20.2 / npm 10.8.2. It is not a claim of universal operating-system
compatibility.

## 24. B-1/V-26 distinction

Successful consumer installation on both platforms (§8) is supplementary
evidence only. V-26 (static dependency-contract completeness, enforced by
`npm run check:runtime-deps`) remains the controlling proof that the compiled
output's direct runtime imports are fully declared. The transitive,
lock-free resolution observed on each platform (§9) does not substitute for
V-26 and was not treated as such.

## 25. Private/publication safety

Both installed manifests preserve `version: "1.0.0"`, `private: true`, the
unscoped package name `stocktrends-mcp-server`, no `publishConfig`, and no
lifecycle/publication script. No publication or registry metadata was created
by this run.

## 26. Evidence boundaries

No usernames, absolute home or temporary paths, complete cache paths, full
environments, raw logs/stderr, or credential-shaped values are recorded in
this report, including in the §6 disclosure of preliminary deviations.

## 27. Cleanup proof

Both dry-run consumers, both real consumers, both harnesses, both guards, all
npm configs, logs, bounded evidence files, the pack JSON, both artifact
copies, and both complete temporary roots were deleted. The WSL keepalive
session (its purpose is recorded in §6) and all child processes were
terminated. Post-cleanup verification confirmed: the Windows temporary root
absent; the WSL temporary root absent; no `.tgz`, consumer, unpacked package,
harness, guard, or generated manifest anywhere in the repository; no child
process remaining; `package.json` and `package-lock.json` unchanged; only the
ignored `dist/` directory remains under the checkout.

## 28. No runtime-capability change

This rerun changed no runtime source, no test, and no build/package
configuration. It exercised the already-merged B-5 correction; it did not
modify it.

## 29. Next gate

PR-5: documentation refresh and a final package/install tail revalidation.
