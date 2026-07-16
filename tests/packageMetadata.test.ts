import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyzePackageMetadata,
  classifyFilesEntry,
  isCoveredByFiles,
  isSourceMapEntry,
  MalformedManifestError
} from "../scripts/check-package-metadata.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// The reviewed manifest, spelled out literally rather than imported from the
// checker, so these tests pin the contract independently of the constants the
// checker compares against. A drift in either one fails here.
function reviewedManifest(): Record<string, unknown> {
  return {
    name: "stocktrends-mcp-server",
    version: "1.0.0",
    description:
      "Local stdio MCP adapter for Stock Trends public resources, workflow planning, and separately gated paid API tools.",
    type: "module",
    main: "dist/server.js",
    types: "dist/server.d.ts",
    bin: { "stocktrends-mcp-server": "dist/server.js" },
    files: ["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE"],
    engines: { node: ">=18" },
    repository: { type: "git", url: "git+https://github.com/skotlander/stocktrends-mcp-server.git" },
    homepage: "https://github.com/skotlander/stocktrends-mcp-server#readme",
    bugs: { url: "https://github.com/skotlander/stocktrends-mcp-server/issues" },
    scripts: {
      build: "tsc -p tsconfig.build.json",
      test: "vitest run",
      "check:package-metadata": "node scripts/check-package-metadata.mjs"
    },
    keywords: ["mcp", "stocktrends"],
    author: "Stocktrends Publications",
    license: "MIT",
    private: true,
    dependencies: { "@modelcontextprotocol/sdk": "^1.29.0", zod: "^4.4.3" },
    devDependencies: { vitest: "^4.1.10" }
  };
}

// Writes a fixture manifest into a temp directory outside the tracked tree.
function writeManifest(manifest: unknown, raw?: string): string {
  const root = mkdtempSync(path.join(tmpdir(), "package-metadata-"));
  tempDirs.push(root);
  const packageJsonPath = path.join(root, "package.json");
  writeFileSync(packageJsonPath, raw ?? JSON.stringify(manifest, null, 2), "utf8");
  return packageJsonPath;
}

// Applies a mutation to the reviewed manifest and returns the violations it
// produces.
function violationsFor(mutate: (manifest: Record<string, unknown>) => void): string[] {
  const manifest = reviewedManifest();
  mutate(manifest);
  return analyzePackageMetadata({ packageJsonPath: writeManifest(manifest) }).violations;
}

describe("package metadata contract check", () => {
  it("passes for the reviewed manifest", () => {
    const packageJsonPath = writeManifest(reviewedManifest());

    expect(analyzePackageMetadata({ packageJsonPath }).violations).toEqual([]);
  });

  it("passes for this repository's actual manifest", () => {
    const packageJsonPath = path.resolve(__dirname, "../package.json");

    expect(analyzePackageMetadata({ packageJsonPath }).violations).toEqual([]);
  });

  describe("publication safety", () => {
    it("fails when private is missing", () => {
      const violations = violationsFor((manifest) => {
        delete manifest.private;
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("private must be boolean true");
    });

    it("fails when private is false", () => {
      const violations = violationsFor((manifest) => {
        manifest.private = false;
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("private must be boolean true");
    });

    it("fails when private is the string \"true\" rather than the boolean", () => {
      const violations = violationsFor((manifest) => {
        manifest.private = "true";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("private must be boolean true");
    });

    it("fails when publishConfig is present", () => {
      const violations = violationsFor((manifest) => {
        manifest.publishConfig = { access: "public" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("publishConfig must not be present");
    });

    it.each([
      "preinstall",
      "install",
      "postinstall",
      "prepare",
      "prepack",
      "postpack",
      "prepublish",
      "prepublishOnly",
      "publish",
      "postpublish"
    ])("fails when the %s lifecycle script is present", (hook) => {
      const violations = violationsFor((manifest) => {
        (manifest.scripts as Record<string, string>)[hook] = "echo lifecycle";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain(`scripts.${hook} must not be present`);
    });
  });

  describe("identity and metadata fields", () => {
    it("fails on package name drift", () => {
      const violations = violationsFor((manifest) => {
        manifest.name = "stocktrends-mcp";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("name must be exactly");
    });

    it("fails on package scope drift", () => {
      const violations = violationsFor((manifest) => {
        manifest.name = "@stocktrends/stocktrends-mcp-server";
      });

      expect(violations.some((violation) => violation.includes("name must be exactly"))).toBe(true);
      expect(violations.some((violation) => violation.includes("must remain unscoped"))).toBe(true);
    });

    it("fails on version drift", () => {
      const violations = violationsFor((manifest) => {
        manifest.version = "1.0.1";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("version must be exactly");
    });

    it("fails on a wrong description", () => {
      const violations = violationsFor((manifest) => {
        manifest.description = "Local stdio MCP adapter for public Stock Trends API resources.";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("description must be exactly");
    });

    it("fails on a wrong author", () => {
      const violations = violationsFor((manifest) => {
        manifest.author = "Stock Trends Publications";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("author must be exactly");
    });

    it("fails on a wrong license", () => {
      const violations = violationsFor((manifest) => {
        manifest.license = "ISC";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("license must be exactly");
    });

    it("fails on a repository mismatch", () => {
      const violations = violationsFor((manifest) => {
        manifest.repository = { type: "git", url: "git+https://github.com/example/other.git" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("repository must be exactly");
    });

    it("fails when repository carries an extra key", () => {
      const violations = violationsFor((manifest) => {
        manifest.repository = {
          type: "git",
          url: "git+https://github.com/skotlander/stocktrends-mcp-server.git",
          directory: "packages/server"
        };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("repository must be exactly");
    });

    it("fails on a homepage mismatch", () => {
      const violations = violationsFor((manifest) => {
        manifest.homepage = "https://stocktrends.com";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("homepage must be exactly");
    });

    it("fails on a bugs mismatch", () => {
      const violations = violationsFor((manifest) => {
        manifest.bugs = { url: "https://github.com/example/other/issues" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("bugs must be exactly");
    });

    it("fails on an engines mismatch", () => {
      const violations = violationsFor((manifest) => {
        manifest.engines = { node: ">=20" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("engines must be exactly");
    });

    it("fails when engines is absent", () => {
      const violations = violationsFor((manifest) => {
        delete manifest.engines;
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("engines must be exactly");
    });
  });

  describe("closed files allowlist", () => {
    it("fails when a required allowlist entry is missing", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "README.md"];
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('files must include the reviewed entry "LICENSE"');
    });

    it("fails when files is absent entirely", () => {
      const violations = violationsFor((manifest) => {
        delete manifest.files;
      });

      expect(violations.some((violation) => violation.includes("files must be an array"))).toBe(true);
    });

    it("fails on an extra allowlist entry", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE", "CHANGELOG.md"];
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('files entry "CHANGELOG.md" is not part of the reviewed closed allowlist');
    });

    it("fails on a duplicate allowlist entry", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE", "LICENSE"];
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('files entry "LICENSE" is duplicated');
    });

    it("fails on a broad dist/** entry", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**", "README.md", "LICENSE"];
      });

      expect(
        violations.some((violation) =>
          violation.includes('files entry "dist/**" selects every file under a directory regardless of type')
        )
      ).toBe(true);
    });

    it("fails on a bare dist directory entry", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist", "README.md", "LICENSE"];
      });

      expect(
        violations.some((violation) =>
          violation.includes('files entry "dist" names a directory holding a declared entry point')
        )
      ).toBe(true);
    });

    it("fails on a whole-package entry", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE", "*"];
      });

      expect(
        violations.some((violation) => violation.includes('files entry "*" selects the entire package'))
      ).toBe(true);
    });

    it("fails on a source-map pattern", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "dist/**/*.js.map", "README.md", "LICENSE"];
      });

      expect(
        violations.some((violation) =>
          violation.includes('files entry "dist/**/*.js.map" is a source-map pattern')
        )
      ).toBe(true);
    });

    it("fails on a TypeScript source entry", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "src/**/*.ts", "README.md", "LICENSE"];
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('files entry "src/**/*.ts" is not part of the reviewed closed allowlist');
    });

    it("fails on an internal docs entry", () => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "docs/**/*.md", "README.md", "LICENSE"];
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('files entry "docs/**/*.md" is not part of the reviewed closed allowlist');
    });

    it.each([
      ["an absolute POSIX path", "/etc/passwd", "is an absolute path"],
      ["an absolute Windows path", "C:\\Windows\\system32", "is an absolute path"],
      ["a parent-relative path", "../secrets/key.txt", "is parent-relative"],
      ["an https URL", "https://example.com/payload.js", "is a URL"],
      ["a negated entry", "!dist/**/*.js", "is a negated entry"],
      ["a directory entry", "dist/", "names a directory"],
      ["a whitespace-padded entry", " README.md ", "has leading or trailing whitespace"],
      ["an empty entry", "", "is empty"]
    ])("classifies %s as unsafe", (_label, entry, expectedReason) => {
      expect(classifyFilesEntry(entry)).toContain(expectedReason);
    });

    it.each([
      ["an absolute path", "/etc/passwd"],
      ["a parent-relative path", "../secrets/key.txt"],
      ["a URL", "https://example.com/payload.js"],
      ["a non-string entry", 42]
    ])("fails the manifest when the allowlist holds %s", (_label, entry) => {
      const violations = violationsFor((manifest) => {
        manifest.files = ["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE", entry];
      });

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((violation) => violation.startsWith("files entry"))).toBe(true);
    });

    it("accepts every reviewed entry's shape", () => {
      for (const entry of ["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE"]) {
        expect(classifyFilesEntry(entry)).toBeNull();
      }
    });

    it("does not mistake the reviewed compiled-JavaScript entry for a source-map pattern", () => {
      expect(isSourceMapEntry("dist/**/*.js")).toBe(false);
      expect(isSourceMapEntry("dist/**/*.d.ts")).toBe(false);
      expect(isSourceMapEntry("dist/**/*.js.map")).toBe(true);
      expect(isSourceMapEntry("dist/**")).toBe(true);
    });
  });

  describe("entry-point coverage", () => {
    it("fails when main is not covered by the files contract", () => {
      const violations = violationsFor((manifest) => {
        manifest.main = "dist/server.cjs";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('main target "dist/server.cjs" is not covered');
    });

    it("fails when types is not covered by the files contract", () => {
      const violations = violationsFor((manifest) => {
        manifest.types = "types/server.d.ts";
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('types target "types/server.d.ts" is not covered');
    });

    it("fails when a bin target is not covered by the files contract", () => {
      const violations = violationsFor((manifest) => {
        manifest.bin = { "stocktrends-mcp-server": "bin/cli.mjs" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('bin["stocktrends-mcp-server"] target "bin/cli.mjs" is not covered');
    });

    it("fails when only one of several bin targets is uncovered", () => {
      const violations = violationsFor((manifest) => {
        manifest.bin = {
          "stocktrends-mcp-server": "dist/server.js",
          "stocktrends-mcp-legacy": "legacy/cli.js"
        };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain('bin["stocktrends-mcp-legacy"] target "legacy/cli.js" is not covered');
    });

    it("fails when main is removed from the manifest", () => {
      const violations = violationsFor((manifest) => {
        delete manifest.main;
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("main must declare a non-empty path");
    });

    it("resolves nested compiled output through the recursive glob", () => {
      const files = ["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE"];

      expect(isCoveredByFiles("dist/server.js", files)).toBe(true);
      expect(isCoveredByFiles("dist/tools/index.js", files)).toBe(true);
      expect(isCoveredByFiles("dist/resources/index.d.ts", files)).toBe(true);
      expect(isCoveredByFiles("LICENSE", files)).toBe(true);
      expect(isCoveredByFiles("dist/server.js.map", files)).toBe(false);
      expect(isCoveredByFiles("src/server.ts", files)).toBe(false);
      expect(isCoveredByFiles("docs/MEMO.md", files)).toBe(false);
    });
  });

  describe("runtime dependency contract", () => {
    it("fails when a declared runtime dependency is dropped", () => {
      const violations = violationsFor((manifest) => {
        manifest.dependencies = { "@modelcontextprotocol/sdk": "^1.29.0" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("dependencies must remain exactly the reviewed runtime dependency contract");
    });

    it("fails when a declared runtime dependency range drifts", () => {
      const violations = violationsFor((manifest) => {
        manifest.dependencies = { "@modelcontextprotocol/sdk": "^1.29.0", zod: "^3.25.0" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("dependencies must remain exactly the reviewed runtime dependency contract");
    });

    it("fails when a runtime dependency is demoted to devDependencies", () => {
      const violations = violationsFor((manifest) => {
        manifest.dependencies = { "@modelcontextprotocol/sdk": "^1.29.0" };
        manifest.devDependencies = { vitest: "^4.1.10", zod: "^4.4.3" };
      });

      expect(violations).toHaveLength(1);
      expect(violations[0]).toContain("dependencies must remain exactly the reviewed runtime dependency contract");
    });
  });

  describe("malformed manifests", () => {
    it("fails clearly when package.json is not valid JSON", () => {
      const packageJsonPath = writeManifest(null, "{ not json");

      expect(() => analyzePackageMetadata({ packageJsonPath })).toThrow(MalformedManifestError);
    });

    it("fails clearly when package.json is not a JSON object", () => {
      const packageJsonPath = writeManifest(null, "[]");

      expect(() => analyzePackageMetadata({ packageJsonPath })).toThrow(MalformedManifestError);
    });

    it("fails clearly when package.json does not exist", () => {
      const root = mkdtempSync(path.join(tmpdir(), "package-metadata-"));
      tempDirs.push(root);

      expect(() => analyzePackageMetadata({ packageJsonPath: path.join(root, "package.json") })).toThrow(
        MalformedManifestError
      );
    });

    it("distinguishes a malformed manifest from a contract violation", () => {
      const packageJsonPath = writeManifest(null, "{ not json");

      // A malformed manifest throws rather than returning violations, so a
      // caller cannot mistake "unreadable" for "reviewed and clean".
      expect(() => analyzePackageMetadata({ packageJsonPath })).toThrow(MalformedManifestError);
      expect(analyzePackageMetadata({ packageJsonPath: writeManifest(reviewedManifest()) }).violations).toEqual([]);
    });
  });

  describe("output discipline", () => {
    it("reports every independent violation deterministically", () => {
      const first = violationsFor((manifest) => {
        manifest.license = "ISC";
        manifest.private = false;
      });
      const second = violationsFor((manifest) => {
        manifest.license = "ISC";
        manifest.private = false;
      });

      expect(first).toEqual(second);
      expect(first).toHaveLength(2);
    });

    it("bounds the rendered value of an oversized field", () => {
      const violations = violationsFor((manifest) => {
        manifest.description = "x".repeat(5000);
      });

      expect(violations).toHaveLength(1);
      expect(violations[0].length).toBeLessThan(600);
    });
  });
});
