import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeRegistryMetadataAgreement,
  analyzeServerJson,
  deepEqual,
  MalformedRegistryMetadataError,
  parseGitHubRepoIdentity,
  REVIEWED_DESCRIPTION,
  REVIEWED_GITHUB_REPOSITORY,
  REVIEWED_MCP_NAME,
  REVIEWED_NPM_IDENTIFIER,
  REVIEWED_REPOSITORY,
  REVIEWED_SCHEMA,
  REVIEWED_TITLE,
  REVIEWED_TRANSPORT,
  REVIEWED_VERSION
} from "../scripts/check-mcp-registry-metadata.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// The reviewed server.json, spelled out literally rather than imported from
// the checker, so these tests pin the contract independently of the
// constants the checker compares against.
function reviewedServerJson(): Record<string, unknown> {
  return {
    $schema: REVIEWED_SCHEMA,
    name: REVIEWED_MCP_NAME,
    title: REVIEWED_TITLE,
    description: REVIEWED_DESCRIPTION,
    repository: { url: REVIEWED_REPOSITORY.url, source: REVIEWED_REPOSITORY.source },
    version: REVIEWED_VERSION,
    packages: [
      {
        registryType: "npm",
        identifier: REVIEWED_NPM_IDENTIFIER,
        version: REVIEWED_VERSION,
        transport: { type: REVIEWED_TRANSPORT.type }
      }
    ]
  };
}

// A minimal reviewed package.json fixture -- only the fields this checker's
// agreement pass reads.
function reviewedPackageJsonFixture(): Record<string, unknown> {
  return {
    name: REVIEWED_NPM_IDENTIFIER,
    version: REVIEWED_VERSION,
    mcpName: REVIEWED_MCP_NAME,
    repository: { type: "git", url: "git+https://github.com/skotlander/stocktrends-mcp-server.git" }
  };
}

// A minimal reviewed package-lock.json fixture -- only the root identity
// fields this checker's agreement pass reads.
function reviewedLockJsonFixture(): Record<string, unknown> {
  return {
    name: REVIEWED_NPM_IDENTIFIER,
    version: REVIEWED_VERSION,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": {
        name: REVIEWED_NPM_IDENTIFIER,
        version: REVIEWED_VERSION
      }
    }
  };
}

function writeJsonFile(root: string, filename: string, content: unknown, raw?: string): string {
  const filePath = path.join(root, filename);
  writeFileSync(filePath, raw ?? JSON.stringify(content, null, 2), "utf8");
  return filePath;
}

function newTempDir(): string {
  const root = mkdtempSync(path.join(tmpdir(), "mcp-registry-metadata-"));
  tempDirs.push(root);
  return root;
}

// Writes only server.json into a fresh temp dir and returns its path, for
// analyzeServerJson tests (which read no other file).
function writeServerJsonOnly(server: unknown, raw?: string): string {
  const root = newTempDir();
  return writeJsonFile(root, "server.json", server, raw);
}

interface AgreementPaths {
  serverJsonPath: string;
  packageJsonPath: string;
  packageLockPath: string;
}

function writeAgreementFixtures(overrides: {
  server?: unknown;
  serverRaw?: string;
  pkg?: unknown;
  pkgRaw?: string;
  lock?: unknown;
  lockRaw?: string;
} = {}): AgreementPaths {
  const root = newTempDir();
  const serverJsonPath = writeJsonFile(root, "server.json", overrides.server ?? reviewedServerJson(), overrides.serverRaw);
  const packageJsonPath = writeJsonFile(root, "package.json", overrides.pkg ?? reviewedPackageJsonFixture(), overrides.pkgRaw);
  const packageLockPath = writeJsonFile(root, "package-lock.json", overrides.lock ?? reviewedLockJsonFixture(), overrides.lockRaw);
  return { serverJsonPath, packageJsonPath, packageLockPath };
}

// Applies a mutation to the reviewed server.json and returns the
// analyzeServerJson violations it produces.
function serverViolationsFor(mutate: (server: Record<string, unknown>) => void): string[] {
  const server = reviewedServerJson();
  mutate(server);
  return analyzeServerJson({ serverJsonPath: writeServerJsonOnly(server) }).violations;
}

describe("MCP Registry metadata contract check", () => {
  describe("valid committed state", () => {
    it("passes for the reviewed server.json fixture", () => {
      expect(analyzeServerJson({ serverJsonPath: writeServerJsonOnly(reviewedServerJson()) }).violations).toEqual([]);
    });

    it("passes for this repository's actual server.json", () => {
      const serverJsonPath = path.resolve(__dirname, "../server.json");

      expect(analyzeServerJson({ serverJsonPath }).violations).toEqual([]);
    });

    it("passes agreement for the reviewed fixture trio", () => {
      expect(analyzeRegistryMetadataAgreement(writeAgreementFixtures()).violations).toEqual([]);
    });

    it("passes agreement for this repository's actual server.json, package.json, and package-lock.json", () => {
      const serverJsonPath = path.resolve(__dirname, "../server.json");
      const packageJsonPath = path.resolve(__dirname, "../package.json");
      const packageLockPath = path.resolve(__dirname, "../package-lock.json");

      expect(analyzeRegistryMetadataAgreement({ serverJsonPath, packageJsonPath, packageLockPath }).violations).toEqual([]);
    });
  });

  describe("malformed and missing files", () => {
    it("throws MalformedRegistryMetadataError when server.json is not valid JSON", () => {
      const serverJsonPath = writeServerJsonOnly(null, "{ not json");

      expect(() => analyzeServerJson({ serverJsonPath })).toThrow(MalformedRegistryMetadataError);
    });

    it("throws MalformedRegistryMetadataError when server.json is not a JSON object", () => {
      const serverJsonPath = writeServerJsonOnly(null, "[]");

      expect(() => analyzeServerJson({ serverJsonPath })).toThrow(MalformedRegistryMetadataError);
    });

    it("throws MalformedRegistryMetadataError when server.json does not exist", () => {
      const root = newTempDir();

      expect(() => analyzeServerJson({ serverJsonPath: path.join(root, "server.json") })).toThrow(
        MalformedRegistryMetadataError
      );
    });
  });

  describe("top-level field contract", () => {
    it("fails on the wrong schema URL", () => {
      const violations = serverViolationsFor((server) => {
        server.$schema = "https://static.modelcontextprotocol.io/schemas/2024-01-01/server.schema.json";
      });

      expect(violations.some((v) => v.includes("$schema must be exactly"))).toBe(true);
    });

    it("fails on the wrong domain namespace", () => {
      const violations = serverViolationsFor((server) => {
        server.name = "com.example/market-intelligence";
      });

      expect(violations.some((v) => v.includes("name must be exactly"))).toBe(true);
    });

    it("fails on a wrong title", () => {
      const violations = serverViolationsFor((server) => {
        server.title = "Stocktrends Server";
      });

      expect(violations.some((v) => v.includes("title must be exactly"))).toBe(true);
    });

    it("fails on a wrong description", () => {
      const violations = serverViolationsFor((server) => {
        server.description = "A different description.";
      });

      expect(violations.some((v) => v.includes("description must be exactly"))).toBe(true);
    });

    it("fails on another repository", () => {
      const violations = serverViolationsFor((server) => {
        server.repository = { url: "https://github.com/example/other", source: "github" };
      });

      expect(violations.some((v) => v.includes("repository must be exactly"))).toBe(true);
    });

    it("fails on another version", () => {
      const violations = serverViolationsFor((server) => {
        server.version = "2.0.0";
      });

      expect(violations.some((v) => v.includes("server.json version must be exactly"))).toBe(true);
    });

    it("fails on an unexpected top-level field", () => {
      const violations = serverViolationsFor((server) => {
        (server as Record<string, unknown>).remotes = [{ type: "streamable-http", url: "https://example.com" }];
      });

      expect(violations.some((v) => v.includes("unexpected field") && v.includes("remotes"))).toBe(true);
    });
  });

  describe("Registry schema shape bounds", () => {
    it("fails on a 101-character description", () => {
      const violations = serverViolationsFor((server) => {
        server.description = "d".repeat(101);
      });

      expect(violations.some((v) => v.includes("description length must be between 1 and 100"))).toBe(true);
    });

    it("fails on an empty description", () => {
      const violations = serverViolationsFor((server) => {
        server.description = "";
      });

      expect(violations.some((v) => v.includes("description length must be between 1 and 100"))).toBe(true);
    });

    it("accepts a description at exactly the 100-character bound", () => {
      const violations = serverViolationsFor((server) => {
        server.description = "d".repeat(100);
      });

      expect(violations.some((v) => v.includes("description length must be between"))).toBe(false);
    });

    it("fails on a 101-character title", () => {
      const violations = serverViolationsFor((server) => {
        server.title = "t".repeat(101);
      });

      expect(violations.some((v) => v.includes("title length must be between 1 and 100"))).toBe(true);
    });

    it("fails on an empty title", () => {
      const violations = serverViolationsFor((server) => {
        server.title = "";
      });

      expect(violations.some((v) => v.includes("title length must be between 1 and 100"))).toBe(true);
    });

    it("fails on a name with no slash", () => {
      const violations = serverViolationsFor((server) => {
        server.name = "comstocktrendsmarketintelligence";
      });

      expect(violations.some((v) => v.includes("reverse-DNS/server-name form"))).toBe(true);
    });

    it("fails on a name with two slashes", () => {
      const violations = serverViolationsFor((server) => {
        server.name = "com.stocktrends/market/intelligence";
      });

      expect(violations.some((v) => v.includes("reverse-DNS/server-name form"))).toBe(true);
    });

    it("fails on a name containing an invalid character", () => {
      const violations = serverViolationsFor((server) => {
        server.name = "com.stocktrends/market intelligence";
      });

      expect(violations.some((v) => v.includes("reverse-DNS/server-name form"))).toBe(true);
    });

    it("fails on a name longer than 200 characters", () => {
      const violations = serverViolationsFor((server) => {
        server.name = `${"a".repeat(199)}/b`;
      });

      expect(violations.some((v) => v.includes("name length must be between 3 and 200"))).toBe(true);
    });

    it("fails when name is a non-string value", () => {
      const violations = serverViolationsFor((server) => {
        (server as Record<string, unknown>).name = 42;
      });

      expect(violations.some((v) => v.includes("name must be a string"))).toBe(true);
    });
  });

  describe("packages array contract", () => {
    it("fails on a non-npm registry type", () => {
      const violations = serverViolationsFor((server) => {
        (server.packages as Array<Record<string, unknown>>)[0].registryType = "pypi";
      });

      expect(violations.some((v) => v.includes("registryType must be exactly"))).toBe(true);
    });

    it("fails on another npm package identifier", () => {
      const violations = serverViolationsFor((server) => {
        (server.packages as Array<Record<string, unknown>>)[0].identifier = "@other-scope/other-package";
      });

      expect(violations.some((v) => v.includes("identifier must be exactly"))).toBe(true);
    });

    it("fails on a non-stdio transport", () => {
      const violations = serverViolationsFor((server) => {
        (server.packages as Array<Record<string, unknown>>)[0].transport = { type: "streamable-http" };
      });

      expect(violations.some((v) => v.includes("transport must be exactly"))).toBe(true);
    });

    it("fails when multiple package entries are present", () => {
      const violations = serverViolationsFor((server) => {
        const packages = server.packages as Array<Record<string, unknown>>;
        server.packages = [...packages, { ...packages[0] }];
      });

      expect(violations.some((v) => v.includes("exactly one item"))).toBe(true);
    });

    it("fails when packages is empty", () => {
      const violations = serverViolationsFor((server) => {
        server.packages = [];
      });

      expect(violations.some((v) => v.includes("exactly one item"))).toBe(true);
    });

    it("fails when environmentVariables is present", () => {
      const violations = serverViolationsFor((server) => {
        (server.packages as Array<Record<string, unknown>>)[0].environmentVariables = [
          { name: "STOCKTRENDS_API_KEY", isRequired: true }
        ];
      });

      expect(violations.some((v) => v.includes("environmentVariables"))).toBe(true);
    });

    it("fails when remotes is present on a package entry", () => {
      const violations = serverViolationsFor((server) => {
        (server.packages as Array<Record<string, unknown>>)[0].remotes = [{ type: "sse", url: "https://example.com" }];
      });

      expect(violations.some((v) => v.includes("remotes field"))).toBe(true);
    });

    it("fails on an unexpected package field", () => {
      const violations = serverViolationsFor((server) => {
        (server.packages as Array<Record<string, unknown>>)[0].runtimeArguments = ["--verbose"];
      });

      expect(violations.some((v) => v.includes("unexpected field") && v.includes("runtimeArguments"))).toBe(true);
    });

    it("fails when packages[0].version drifts from the reviewed version", () => {
      const violations = serverViolationsFor((server) => {
        (server.packages as Array<Record<string, unknown>>)[0].version = "1.0.0";
      });

      expect(violations.some((v) => v.includes("packages[0].version must be exactly"))).toBe(true);
    });
  });

  describe("cross-file agreement", () => {
    it("fails when package.json mcpName is missing", () => {
      const pkg = reviewedPackageJsonFixture();
      delete (pkg as Record<string, unknown>).mcpName;
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ pkg })).violations;

      expect(violations.some((v) => v.includes("mcpName") && v.includes("must exactly equal"))).toBe(true);
    });

    it("fails when package.json mcpName is a different namespace", () => {
      const pkg = reviewedPackageJsonFixture();
      pkg.mcpName = "com.example/market-intelligence";
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ pkg })).violations;

      expect(violations.some((v) => v.includes("mcpName") && v.includes("must exactly equal"))).toBe(true);
    });

    it("fails when package.json mcpName is a non-string value", () => {
      const pkg = reviewedPackageJsonFixture();
      (pkg as Record<string, unknown>).mcpName = 42;
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ pkg })).violations;

      expect(violations.some((v) => v.includes("mcpName") && v.includes("must exactly equal"))).toBe(true);
    });

    it("fails when package.json version disagrees with server.json version", () => {
      const pkg = reviewedPackageJsonFixture();
      pkg.version = "1.0.0";
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ pkg })).violations;

      expect(violations.some((v) => v.includes("package.json version") && v.includes("must exactly equal"))).toBe(true);
    });

    it("fails when package.json name disagrees with the server.json npm package identifier", () => {
      const pkg = reviewedPackageJsonFixture();
      pkg.name = "@stocktrends-publications/stocktrends-mcp";
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ pkg })).violations;

      expect(violations.some((v) => v.includes("package.json name") && v.includes("must exactly equal"))).toBe(true);
    });

    it("fails when the lockfile top-level version disagrees with server.json version", () => {
      const lock = reviewedLockJsonFixture();
      lock.version = "1.0.0";
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ lock })).violations;

      expect(violations.some((v) => v.includes("package-lock.json root version"))).toBe(true);
    });

    it("fails when the lockfile packages[\"\"].version disagrees with server.json version", () => {
      const lock = reviewedLockJsonFixture();
      (lock.packages as Record<string, Record<string, unknown>>)[""].version = "1.0.0";
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ lock })).violations;

      expect(violations.some((v) => v.includes("package-lock.json root version"))).toBe(true);
    });

    it("fails when package.json repository identifies a different GitHub repository", () => {
      const pkg = reviewedPackageJsonFixture();
      pkg.repository = { type: "git", url: "git+https://github.com/example/other-repo.git" };
      const violations = analyzeRegistryMetadataAgreement(writeAgreementFixtures({ pkg })).violations;

      expect(violations.some((v) => v.includes("repository identity must agree"))).toBe(true);
    });

    it("throws MalformedRegistryMetadataError when package.json is not valid JSON", () => {
      const paths = writeAgreementFixtures({ pkgRaw: "{ not json" });

      expect(() => analyzeRegistryMetadataAgreement(paths)).toThrow(MalformedRegistryMetadataError);
    });

    it("throws MalformedRegistryMetadataError when package-lock.json is not valid JSON", () => {
      const paths = writeAgreementFixtures({ lockRaw: "{ not json" });

      expect(() => analyzeRegistryMetadataAgreement(paths)).toThrow(MalformedRegistryMetadataError);
    });
  });

  describe("helper functions", () => {
    it("parses the reviewed and equivalent GitHub URL forms", () => {
      expect(parseGitHubRepoIdentity("git+https://github.com/skotlander/stocktrends-mcp-server.git")).toBe(
        REVIEWED_GITHUB_REPOSITORY
      );
      expect(parseGitHubRepoIdentity("https://github.com/skotlander/stocktrends-mcp-server")).toBe(REVIEWED_GITHUB_REPOSITORY);
      expect(parseGitHubRepoIdentity("not-a-real-url")).toBeNull();
      expect(parseGitHubRepoIdentity(42)).toBeNull();
    });

    it("treats structurally equal objects as deepEqual regardless of key order", () => {
      expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });
  });
});
