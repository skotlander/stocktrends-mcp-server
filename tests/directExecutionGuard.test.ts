import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultDirectExecutionDeps, isDirectExecution, type DirectExecutionDeps } from "../src/server.js";

const serverSourcePath = fileURLToPath(new URL("../src/server.ts", import.meta.url));

// Error codes recognized as a genuine platform inability to create a
// filesystem symlink (permission-denied or feature-unsupported), as opposed
// to an unrelated filesystem or test defect. Only these codes convert the
// probe into a skip; anything else propagates and fails the test run.
const RECOGNIZED_SYMLINK_UNSUPPORTED_CODES = new Set(["EPERM", "EACCES", "ENOSYS", "ENOTSUP"]);

function getErrnoCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as NodeJS.ErrnoException).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

interface SymlinkProbeResult {
  supported: boolean;
  unsupportedCode: string | null;
}

// Probed once at module load: symlink creation can fail with a recognized
// permission or unsupported-feature error code on some hosts (e.g. Windows
// without Developer Mode / SeCreateSymbolicLinkPrivilege). Only those
// recognized codes are treated as a skip condition -- every other error
// (e.g. a real filesystem or test-harness defect) is rethrown and fails the
// test, rather than being silently converted into a skip.
function probeSymlinkSupport(): SymlinkProbeResult {
  const probeDir = mkdtempSync(resolve(tmpdir(), "b5-symlink-probe-"));
  try {
    const target = resolve(probeDir, "target.txt");
    writeFileSync(target, "probe");
    symlinkSync(target, resolve(probeDir, "link.txt"));
    return { supported: true, unsupportedCode: null };
  } catch (error) {
    const code = getErrnoCode(error);
    if (code && RECOGNIZED_SYMLINK_UNSUPPORTED_CODES.has(code)) {
      return { supported: false, unsupportedCode: code };
    }
    throw error;
  } finally {
    rmSync(probeDir, { recursive: true, force: true });
  }
}

const symlinkProbe = probeSymlinkSupport();
const symlinkSupported = symlinkProbe.supported;

describe("isDirectExecution", () => {
  it("returns true when the exact real module path and entry path canonicalize equal", () => {
    const identityDeps: DirectExecutionDeps = {
      fileURLToPath: () => "/fake/dist/server.js",
      resolvePath: (p) => p,
      realpathNative: (p) => p
    };

    expect(isDirectExecution("file:///fake/dist/server.js", "/fake/dist/server.js", identityDeps)).toBe(true);
  });

  it("returns true when the entry path is a symlink that canonicalizes to the module (deterministic, injected)", () => {
    const symlinkEquivalentDeps: DirectExecutionDeps = {
      fileURLToPath: () => "/fake/dist/server.js",
      resolvePath: (p) => p,
      realpathNative: (p) => (p === "/fake/node_modules/.bin/stocktrends-mcp-server" ? "/fake/dist/server.js" : p)
    };

    expect(
      isDirectExecution("file:///fake/dist/server.js", "/fake/node_modules/.bin/stocktrends-mcp-server", symlinkEquivalentDeps)
    ).toBe(true);
  });

  it("returns false when the entry path canonicalizes to an unrelated executable", () => {
    const unrelatedDeps: DirectExecutionDeps = {
      fileURLToPath: () => "/fake/dist/server.js",
      resolvePath: (p) => p,
      realpathNative: (p) => (p === "/fake/other/tool.js" ? "/fake/other/tool-real.js" : p)
    };

    expect(isDirectExecution("file:///fake/dist/server.js", "/fake/other/tool.js", unrelatedDeps)).toBe(false);
  });

  it("does not autostart the stdio server when this module is imported under the real test runner entry point", () => {
    // Zero-argument call resolves `import.meta.url` lexically inside
    // src/server.ts (its own module URL) and `process.argv[1]` to the real
    // running process (the vitest worker, not a compiled server entry
    // point) -- genuine end-to-end proof that import alone never autostarts.
    expect(isDirectExecution()).toBe(false);
  });

  it("returns false when the entry argument is missing", () => {
    expect(isDirectExecution("file:///fake/dist/server.js", undefined, defaultDirectExecutionDeps)).toBe(false);
  });

  it("returns false for a non-file module URL (real fileURLToPath, unmocked)", () => {
    expect(isDirectExecution("https://example.com/server.js", "/fake/entry.js")).toBe(false);
  });

  it("returns false when module-URL-to-path conversion throws (injected failure)", () => {
    const throwingDeps: DirectExecutionDeps = {
      fileURLToPath: () => {
        throw new Error("simulated file URL conversion failure");
      },
      resolvePath: (p) => p,
      realpathNative: (p) => p
    };

    expect(isDirectExecution("file:///fake/dist/server.js", "/fake/dist/server.js", throwingDeps)).toBe(false);
  });

  it("returns false when the module-path realpath call throws, isolated from a distinct entry path", () => {
    const moduleCanonicalPath = "/fake/dist/server.js";
    const entryRawPath = "/fake/other/entry-raw.js";
    const entryResolvedPath = "/fake/other/entry-resolved.js";
    const realpathCalls: string[] = [];

    const moduleRealpathFailsDeps: DirectExecutionDeps = {
      fileURLToPath: () => moduleCanonicalPath,
      resolvePath: (p) => (p === entryRawPath ? entryResolvedPath : p),
      realpathNative: (p) => {
        realpathCalls.push(p);
        if (p === moduleCanonicalPath) {
          throw new Error("simulated module-path realpath failure");
        }
        return p;
      }
    };

    // Prove the entry path is a distinct, valid input that would resolve
    // successfully if the module-side failure hadn't short-circuited the
    // comparison first -- without altering production evaluation order.
    expect(moduleRealpathFailsDeps.realpathNative(entryResolvedPath)).toBe(entryResolvedPath);
    realpathCalls.length = 0;

    expect(isDirectExecution("file:///fake/dist/server.js", entryRawPath, moduleRealpathFailsDeps)).toBe(false);

    // Call evidence: realpathNative was invoked exactly once, with the
    // module path, before the exception propagated -- the entry path was
    // never reached, proving the module side was the failing input.
    expect(realpathCalls).toEqual([moduleCanonicalPath]);
  });

  it("returns false when the entry-path realpath call throws, after module canonicalization succeeds", () => {
    const moduleCanonicalPath = "/fake/dist/server.js";
    const entryRawPath = "/fake/other/entry-raw.js";
    const entryResolvedPath = "/fake/other/entry-resolved.js";
    const realpathCalls: string[] = [];

    const entryRealpathFailsDeps: DirectExecutionDeps = {
      fileURLToPath: () => moduleCanonicalPath,
      resolvePath: (p) => (p === entryRawPath ? entryResolvedPath : p),
      realpathNative: (p) => {
        realpathCalls.push(p);
        if (p === moduleCanonicalPath) {
          return p;
        }
        throw new Error("simulated entry-path realpath failure");
      }
    };

    expect(isDirectExecution("file:///fake/dist/server.js", entryRawPath, entryRealpathFailsDeps)).toBe(false);

    // Call evidence: module canonicalization was attempted and succeeded
    // first (its path is recorded with no exception), then entry
    // canonicalization was attempted and only it threw.
    expect(realpathCalls).toEqual([moduleCanonicalPath, entryResolvedPath]);
  });

  it("supports direct compiled-file invocation (node dist/server.js)", () => {
    const compiledPath = resolve("/fake-project", "dist", "server.js");
    const compiledInvocationDeps: DirectExecutionDeps = {
      fileURLToPath: () => compiledPath,
      resolvePath: resolve,
      realpathNative: (p) => p
    };

    expect(isDirectExecution(pathToFileURL(compiledPath).href, compiledPath, compiledInvocationDeps)).toBe(true);
  });

  it("supports supported source-tree direct invocation (tsx src/server.ts)", () => {
    const sourcePath = resolve("/fake-project", "src", "server.ts");
    const sourceInvocationDeps: DirectExecutionDeps = {
      fileURLToPath: () => sourcePath,
      resolvePath: resolve,
      realpathNative: (p) => p
    };

    expect(isDirectExecution(pathToFileURL(sourcePath).href, sourcePath, sourceInvocationDeps)).toBe(true);
  });

  it("supports a noncanonical-but-equivalent Windows command-shim-style entry path", () => {
    // Deliberately not the simplest equal-string case: the raw entry path
    // contains a `..` segment that real path.resolve() must normalize away
    // before the comparison, mirroring a shim that passes an already-real
    // but differently-spelled path.
    const distDir = resolve(process.cwd(), "fake-shim-project", "dist");
    const canonicalModulePath = resolve(distDir, "server.js");
    const noncanonicalEntry = `${distDir}/../dist/server.js`;

    const shimDeps: DirectExecutionDeps = {
      fileURLToPath: () => canonicalModulePath,
      resolvePath: resolve,
      realpathNative: (p) => p
    };

    expect(isDirectExecution("file:///irrelevant-because-injected", noncanonicalEntry, shimDeps)).toBe(true);
  });

  it("has exactly one conditional autostart call site invoking startStdioServer(), guarded by exactly one direct-execution conditional", () => {
    const serverSource = readFileSync(serverSourcePath, "utf8");

    // Matches the zero-argument call site `startStdioServer()`. This never
    // matches the function declaration
    // `export async function startStdioServer(env: Env = process.env)`,
    // which always carries a parameter and therefore has non-empty parens.
    const callSites = serverSource.match(/\bstartStdioServer\(\)/g) ?? [];
    expect(callSites).toHaveLength(1);

    // Exactly one direct-execution conditional exists in the module.
    const guardConditionals = serverSource.match(/if\s*\(\s*isDirectExecution\(\)\s*\)/g) ?? [];
    expect(guardConditionals).toHaveLength(1);

    // The single call site sits immediately inside the single guard's
    // opening brace -- since there is exactly one call site in total (proven
    // above) and it is here, no unconditional top-level call exists
    // anywhere else in the module.
    expect(/if\s*\(\s*isDirectExecution\(\)\s*\)\s*\{\s*startStdioServer\(\)/.test(serverSource)).toBe(true);
  });

  it.skipIf(!symlinkSupported)(
    "GENUINE: a real filesystem symlink resolves to true via the unmocked canonicalization logic",
    () => {
      const dir = mkdtempSync(resolve(tmpdir(), "b5-symlink-genuine-"));
      try {
        const realFile = resolve(dir, "server.js");
        writeFileSync(realFile, "// real target file\n");
        const symlinkBin = resolve(dir, "stocktrends-mcp-server");
        symlinkSync(realFile, symlinkBin);

        const moduleUrl = pathToFileURL(realFile).href;

        expect(isDirectExecution(moduleUrl, symlinkBin)).toBe(true);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  );

  if (!symlinkSupported) {
    it("records the recognized platform error code that caused the genuine symlink case to be skipped", () => {
      // This records a Windows/host filesystem limitation on creating the
      // test fixture, not evidence about POSIX installed-bin behavior --
      // that remains the PR-4 rerun's job. The deterministic
      // symlink-equivalent case above still ran and passed regardless.
      expect(symlinkProbe.unsupportedCode).not.toBeNull();
      expect(RECOGNIZED_SYMLINK_UNSUPPORTED_CODES.has(symlinkProbe.unsupportedCode as string)).toBe(true);
    });
  }
});
