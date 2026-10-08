import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeRuntimeDependencyContract,
  MissingDistError,
  normalizeSpecifier
} from "../scripts/check-runtime-dependency-contract.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// Builds a fixture repository (outside the tracked tree, under the OS temp
// directory) with the given dist/**/*.js contents and package.json.
function createFixture(distFiles: Record<string, string>, packageJson: Record<string, unknown>) {
  const root = mkdtempSync(path.join(tmpdir(), "runtime-deps-contract-"));
  tempDirs.push(root);

  const distDir = path.join(root, "dist");
  for (const [relPath, content] of Object.entries(distFiles)) {
    const filePath = path.join(distDir, relPath);
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, "utf8");
  }

  const packageJsonPath = path.join(root, "package.json");
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), "utf8");

  return { root, distDir, packageJsonPath };
}

describe("runtime dependency contract check", () => {
  it("passes when a directly imported external package is declared in dependencies", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'import { z } from "zod";\nexport const schema = z;\n' },
      { dependencies: { zod: "^4.4.3" } }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual(["zod"]);
    expect(result.undeclaredPackages).toEqual([]);
  });

  it("fails when a directly imported external package is undeclared", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'import { z } from "zod";\n' },
      { dependencies: {} }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.undeclaredPackages).toEqual(["zod"]);
  });

  it("fails when the package is declared only in devDependencies", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'import { z } from "zod";\n' },
      { dependencies: {}, devDependencies: { zod: "^4.4.3" } }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.undeclaredPackages).toEqual(["zod"]);
  });

  it("fails when the package is available only via a transitive/hoisted node_modules install", () => {
    const { root, distDir, packageJsonPath } = createFixture(
      { "index.js": 'import { z } from "zod";\n' },
      { dependencies: { "some-sdk": "^1.0.0" } }
    );

    // Simulate hoisting: `zod` physically resolves on disk (as it would if
    // hoisted by some-sdk's own transitive dependency) even though this
    // package's own manifest never declares it. The check must not treat
    // successful physical presence as a substitute for a direct declaration.
    const hoistedZodDir = path.join(root, "node_modules", "zod");
    mkdirSync(hoistedZodDir, { recursive: true });
    writeFileSync(path.join(hoistedZodDir, "package.json"), JSON.stringify({ name: "zod", version: "4.4.3" }), "utf8");

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.undeclaredPackages).toEqual(["zod"]);
  });

  it("ignores Node builtins, including node: prefixed specifiers", () => {
    const { distDir, packageJsonPath } = createFixture(
      {
        "index.js": 'import { pathToFileURL } from "node:url";\nimport fs from "fs";\nexport { pathToFileURL, fs };\n'
      },
      { dependencies: {} }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual([]);
    expect(result.undeclaredPackages).toEqual([]);
  });

  it("ignores relative imports", () => {
    const { distDir, packageJsonPath } = createFixture(
      {
        "index.js": 'import { helper } from "./helper.js";\nexport { helper };\n',
        "helper.js": "export const helper = 1;\n"
      },
      { dependencies: {} }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual([]);
  });

  it("normalizes scoped package subpaths to the package root", () => {
    expect(normalizeSpecifier("@modelcontextprotocol/server/stdio")).toBe("@modelcontextprotocol/server");
  });

  it("normalizes unscoped package subpaths to the package root", () => {
    expect(normalizeSpecifier("lodash/debounce")).toBe("lodash");
  });

  it("detects static imports", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'import { z } from "zod";\nexport const schema = z;\n' },
      { dependencies: { zod: "^4.4.3" } }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual(["zod"]);
  });

  it("detects side-effect imports with no bindings", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'import "zod";\n' },
      { dependencies: { zod: "^4.4.3" } }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual(["zod"]);
  });

  it("detects export ... from re-export sources", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'export { z } from "zod";\n' },
      { dependencies: { zod: "^4.4.3" } }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual(["zod"]);
  });

  it("detects string-literal dynamic import() calls", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'export async function load() {\n  return import("zod");\n}\n' },
      { dependencies: { zod: "^4.4.3" } }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual(["zod"]);
  });

  it("detects string-literal require() calls", () => {
    const { distDir, packageJsonPath } = createFixture(
      { "index.js": 'const zod = require("zod");\nmodule.exports = { zod };\n' },
      { dependencies: { zod: "^4.4.3" } }
    );

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual(["zod"]);
  });

  it("fails clearly when dist is missing", () => {
    const root = mkdtempSync(path.join(tmpdir(), "runtime-deps-contract-"));
    tempDirs.push(root);
    const packageJsonPath = path.join(root, "package.json");
    writeFileSync(packageJsonPath, JSON.stringify({ dependencies: {} }), "utf8");

    expect(() => analyzeRuntimeDependencyContract({ distDir: path.join(root, "dist"), packageJsonPath })).toThrow(
      MissingDistError
    );
  });

  it("passes against this repository's actual built dist/ output", () => {
    const distDir = path.resolve(__dirname, "../dist");
    const packageJsonPath = path.resolve(__dirname, "../package.json");

    const result = analyzeRuntimeDependencyContract({ distDir, packageJsonPath });

    expect(result.discoveredPackages).toEqual(["@modelcontextprotocol/node", "@modelcontextprotocol/server", "zod"]);
    expect(result.undeclaredPackages).toEqual([]);
  });
});
