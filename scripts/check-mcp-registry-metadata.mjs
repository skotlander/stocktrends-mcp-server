// Statically validates the repository-root `server.json` MCP Registry
// metadata against the reviewed Registry-readiness contract recorded in
// docs/MCP_REGISTRY_READINESS_IMPLEMENTATION_NOTES.md, and validates that it
// agrees with package.json and package-lock.json's root identity.
//
// Scope boundary: this check reads server.json, package.json, and
// package-lock.json and nothing else. It runs no npm command, no
// mcp-publisher command, builds nothing, packs nothing, installs nothing,
// and reaches no registry or network. It therefore validates what the
// repository *declares* -- it does not and cannot publish, authenticate, or
// verify domain ownership. That is separate, later, owner-authorized work.
//
// Run with `npm run check:mcp-registry-metadata`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_SERVER_JSON_PATH = path.join(repoRoot, "server.json");
const DEFAULT_PACKAGE_JSON_PATH = path.join(repoRoot, "package.json");
const DEFAULT_PACKAGE_LOCK_PATH = path.join(repoRoot, "package-lock.json");

const MAX_REPORTED_VIOLATIONS = 50;

export class MalformedRegistryMetadataError extends Error {}

// The reviewed, owner-settled MCP Registry ownership-verification identity.
export const REVIEWED_SCHEMA = "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";
export const REVIEWED_MCP_NAME = "com.stocktrends/market-intelligence";
export const REVIEWED_TITLE = "Stock Trends Market Intelligence";
// Exactly 100 characters -- the approved MCP Registry schema
// (2025-12-11/server.schema.json) caps ServerDetail.description at 100
// characters. Keep this literal in sync with checkSchemaShapeFields' bound
// below if the schema's limit ever changes.
export const REVIEWED_DESCRIPTION =
  "Equity trend, relative-strength, expected-return, market-context, and research resources for agents.";
export const REVIEWED_REPOSITORY = Object.freeze({
  url: "https://github.com/skotlander/stocktrends-mcp-server",
  source: "github"
});
export const REVIEWED_GITHUB_REPOSITORY = "skotlander/stocktrends-mcp-server";
export const REVIEWED_VERSION = "1.0.1";
export const REVIEWED_NPM_IDENTIFIER = "@stocktrends-publications/stocktrends-mcp-server";
export const REVIEWED_REGISTRY_TYPE = "npm";
export const REVIEWED_TRANSPORT = Object.freeze({ type: "stdio" });

// Registry schema shape bounds (2025-12-11/server.schema.json), enforced
// independently of the exact-value checks above -- a value can be the wrong
// length even before it is compared for exact equality, and a schema
// violation should be reported as such rather than folded into a generic
// "must be exactly" mismatch.
export const MIN_DESCRIPTION_LENGTH = 1;
export const MAX_DESCRIPTION_LENGTH = 100;
export const MIN_TITLE_LENGTH = 1;
export const MAX_TITLE_LENGTH = 100;
// Registry reverse-DNS/server-name form: exactly one `/` separating a
// dotted-domain-like namespace from a server-name segment.
export const NAME_PATTERN = /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/;
export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 200;

// server.json is closed: only these top-level and per-package fields are
// reviewed. Anything else is an unreviewed, unexpected addition -- remotes,
// environmentVariables, package arguments, credentials, and any other field
// each fail closed rather than being silently ignored.
export const ALLOWED_TOP_LEVEL_FIELDS = Object.freeze([
  "$schema",
  "name",
  "title",
  "description",
  "repository",
  "version",
  "packages"
]);
export const ALLOWED_PACKAGE_FIELDS = Object.freeze(["registryType", "identifier", "version", "transport"]);

export function summarizeValue(value, maxLength = 160) {
  let rendered;
  try {
    rendered = JSON.stringify(value);
  } catch {
    rendered = String(value);
  }
  if (rendered === undefined) rendered = "undefined";
  return rendered.length > maxLength ? `${rendered.slice(0, maxLength - 1)}…` : rendered;
}

// Structural equality for JSON values. Extra keys are a mismatch: the
// reviewed objects are exact, not minimums.
export function deepEqual(actual, expected) {
  if (actual === expected) return true;
  if (actual === null || expected === null) return false;
  if (typeof actual !== "object" || typeof expected !== "object") return false;

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return false;
    if (actual.length !== expected.length) return false;
    return expected.every((value, index) => deepEqual(actual[index], value));
  }

  const actualKeys = Object.keys(actual).sort();
  const expectedKeys = Object.keys(expected).sort();
  if (actualKeys.length !== expectedKeys.length) return false;
  if (!actualKeys.every((key, index) => key === expectedKeys[index])) return false;
  return expectedKeys.every((key) => deepEqual(actual[key], expected[key]));
}

// Resolves a repository URL to its `owner/repo` GitHub identity, or null when
// the URL is not a parseable github.com repository. Handles the
// `git+https://`, `https://`, `ssh://`, and `git@github.com:` forms and an
// optional trailing `.git`, so package.json's `git+https://...git` form and
// server.json's plain `https://...` form can be compared by identity rather
// than by exact string.
export function parseGitHubRepoIdentity(url) {
  if (typeof url !== "string" || url.trim().length === 0) return null;
  const normalized = url.trim().replace(/^git\+/, "");
  const httpsMatch =
    /^(?:https?|ssh|git):\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/#?].*)?$/i.exec(normalized);
  const scpMatch = /^git@github\.com:([^/]+)\/([^/#?]+?)(?:\.git)?$/i.exec(normalized);
  const match = httpsMatch || scpMatch;
  if (!match) return null;
  return `${match[1]}/${match[2]}`;
}

export function readJson(filePath, label) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch (error) {
    throw new MalformedRegistryMetadataError(`${label} could not be read at ${filePath}: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new MalformedRegistryMetadataError(`${label} at ${filePath} is not valid JSON: ${error.message}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new MalformedRegistryMetadataError(`${label} at ${filePath} must contain a JSON object at its top level.`);
  }

  return parsed;
}

function checkUnexpectedFields(record, allowedFields, label, violations) {
  for (const key of Object.keys(record)) {
    if (!allowedFields.includes(key)) {
      violations.push(`${label} has an unexpected field ${summarizeValue(key)}; only ${summarizeValue(allowedFields)} are reviewed.`);
    }
  }
}

// Registry schema shape invariants, checked independently of the exact-value
// checks in checkTopLevelFields: a value can be malformed (wrong type, wrong
// length, wrong name shape) whether or not it also happens to differ from
// the reviewed exact value.
function checkSchemaShapeFields(server, violations) {
  if (typeof server.description !== "string") {
    violations.push(`server.json description must be a string (found ${summarizeValue(server.description)}).`);
  } else if (server.description.length < MIN_DESCRIPTION_LENGTH || server.description.length > MAX_DESCRIPTION_LENGTH) {
    violations.push(
      `server.json description length must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters (found ${server.description.length}).`
    );
  }

  if (typeof server.title !== "string") {
    violations.push(`server.json title must be a string (found ${summarizeValue(server.title)}).`);
  } else if (server.title.length < MIN_TITLE_LENGTH || server.title.length > MAX_TITLE_LENGTH) {
    violations.push(
      `server.json title length must be between ${MIN_TITLE_LENGTH} and ${MAX_TITLE_LENGTH} characters (found ${server.title.length}).`
    );
  }

  if (typeof server.name !== "string") {
    violations.push(`server.json name must be a string (found ${summarizeValue(server.name)}).`);
  } else {
    if (!NAME_PATTERN.test(server.name)) {
      violations.push(
        `server.json name must match the Registry reverse-DNS/server-name form ${NAME_PATTERN} with exactly one slash (found ${summarizeValue(server.name)}).`
      );
    }
    if (server.name.length < MIN_NAME_LENGTH || server.name.length > MAX_NAME_LENGTH) {
      violations.push(
        `server.json name length must be between ${MIN_NAME_LENGTH} and ${MAX_NAME_LENGTH} characters (found ${server.name.length}).`
      );
    }
  }
}

function checkTopLevelFields(server, violations) {
  checkUnexpectedFields(server, ALLOWED_TOP_LEVEL_FIELDS, "server.json", violations);
  checkSchemaShapeFields(server, violations);

  if (server.$schema !== REVIEWED_SCHEMA) {
    violations.push(`server.json $schema must be exactly ${summarizeValue(REVIEWED_SCHEMA)} (found ${summarizeValue(server.$schema)}).`);
  }
  if (server.name !== REVIEWED_MCP_NAME) {
    violations.push(`server.json name must be exactly ${summarizeValue(REVIEWED_MCP_NAME)} (found ${summarizeValue(server.name)}).`);
  }
  if (server.title !== REVIEWED_TITLE) {
    violations.push(`server.json title must be exactly ${summarizeValue(REVIEWED_TITLE)} (found ${summarizeValue(server.title)}).`);
  }
  if (server.description !== REVIEWED_DESCRIPTION) {
    violations.push(
      `server.json description must be exactly ${summarizeValue(REVIEWED_DESCRIPTION)} (found ${summarizeValue(server.description)}).`
    );
  }
  if (!deepEqual(server.repository, REVIEWED_REPOSITORY)) {
    violations.push(
      `server.json repository must be exactly ${summarizeValue(REVIEWED_REPOSITORY)} (found ${summarizeValue(server.repository)}).`
    );
  }
  if (server.version !== REVIEWED_VERSION) {
    violations.push(`server.json version must be exactly ${summarizeValue(REVIEWED_VERSION)} (found ${summarizeValue(server.version)}).`);
  }
}

function checkPackagesArray(server, violations) {
  const packages = server.packages;

  if (!Array.isArray(packages)) {
    violations.push(`server.json packages must be an array of exactly one item (found ${summarizeValue(packages)}).`);
    return;
  }
  if (packages.length !== 1) {
    violations.push(`server.json packages must contain exactly one item (found ${packages.length}).`);
    return;
  }

  const pkg = packages[0];
  if (pkg === null || typeof pkg !== "object" || Array.isArray(pkg)) {
    violations.push(`server.json packages[0] must be an object (found ${summarizeValue(pkg)}).`);
    return;
  }

  checkUnexpectedFields(pkg, ALLOWED_PACKAGE_FIELDS, "server.json packages[0]", violations);

  if (Object.prototype.hasOwnProperty.call(pkg, "remotes")) {
    violations.push("server.json packages[0] must not declare a remotes field; only the stdio npm package is reviewed.");
  }
  if (Object.prototype.hasOwnProperty.call(pkg, "environmentVariables")) {
    violations.push(
      "server.json packages[0] must not declare an environmentVariables field; the default surface requires no API key or environment variable to initialize."
    );
  }

  if (pkg.registryType !== REVIEWED_REGISTRY_TYPE) {
    violations.push(
      `server.json packages[0].registryType must be exactly ${summarizeValue(REVIEWED_REGISTRY_TYPE)} (found ${summarizeValue(pkg.registryType)}).`
    );
  }
  if (pkg.identifier !== REVIEWED_NPM_IDENTIFIER) {
    violations.push(
      `server.json packages[0].identifier must be exactly ${summarizeValue(REVIEWED_NPM_IDENTIFIER)} (found ${summarizeValue(pkg.identifier)}).`
    );
  }
  if (pkg.version !== REVIEWED_VERSION) {
    violations.push(
      `server.json packages[0].version must be exactly ${summarizeValue(REVIEWED_VERSION)} (found ${summarizeValue(pkg.version)}).`
    );
  }
  if (!deepEqual(pkg.transport, REVIEWED_TRANSPORT)) {
    violations.push(
      `server.json packages[0].transport must be exactly ${summarizeValue(REVIEWED_TRANSPORT)} (found ${summarizeValue(pkg.transport)}).`
    );
  }
}

// Validates server.json in isolation (no other file read). Throws
// MalformedRegistryMetadataError when server.json cannot be read or parsed.
export function analyzeServerJson({ serverJsonPath }) {
  const server = readJson(serverJsonPath, "server.json");
  const violations = [];

  checkTopLevelFields(server, violations);
  checkPackagesArray(server, violations);

  return { violations };
}

// Cross-file agreement between server.json, package.json, and
// package-lock.json. Throws MalformedRegistryMetadataError when any of the
// three files cannot be read or parsed.
export function analyzeRegistryMetadataAgreement({ serverJsonPath, packageJsonPath, packageLockPath }) {
  const server = readJson(serverJsonPath, "server.json");
  const pkg = readJson(packageJsonPath, "package.json");
  const lock = readJson(packageLockPath, "package-lock.json");
  const violations = [];

  if (pkg.mcpName !== server.name) {
    violations.push(
      `package.json mcpName ${summarizeValue(pkg.mcpName)} must exactly equal server.json name ${summarizeValue(server.name)}.`
    );
  }
  if (pkg.version !== server.version) {
    violations.push(
      `package.json version ${summarizeValue(pkg.version)} must exactly equal server.json version ${summarizeValue(server.version)}.`
    );
  }

  const identifier = Array.isArray(server.packages) && server.packages.length === 1 ? server.packages[0]?.identifier : undefined;
  if (pkg.name !== identifier) {
    violations.push(
      `package.json name ${summarizeValue(pkg.name)} must exactly equal the server.json npm package identifier ${summarizeValue(identifier)}.`
    );
  }

  const rootPackage =
    lock.packages !== null && typeof lock.packages === "object" && !Array.isArray(lock.packages) ? lock.packages[""] : undefined;
  const hasRootPackage = rootPackage !== null && typeof rootPackage === "object" && !Array.isArray(rootPackage);
  const lockVersion = hasRootPackage ? rootPackage.version : undefined;
  if (lock.version !== server.version || lockVersion !== server.version) {
    violations.push(
      `package-lock.json root version (top-level ${summarizeValue(lock.version)}, packages[""] ${summarizeValue(lockVersion)}) must agree with server.json version ${summarizeValue(server.version)}.`
    );
  }

  const packageRepoUrl = typeof pkg.repository === "object" && pkg.repository !== null ? pkg.repository.url : pkg.repository;
  const packageRepoIdentity = parseGitHubRepoIdentity(packageRepoUrl);
  const serverRepoIdentity = parseGitHubRepoIdentity(server.repository?.url);
  if (packageRepoIdentity === null || serverRepoIdentity === null || packageRepoIdentity !== serverRepoIdentity) {
    violations.push(
      `repository identity must agree across package.json (${summarizeValue(packageRepoIdentity)}) and server.json (${summarizeValue(serverRepoIdentity)}); both must resolve to exactly ${REVIEWED_GITHUB_REPOSITORY}.`
    );
  }

  return { violations };
}

function isDirectExecution() {
  const entrypoint = process.argv[1];
  return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
}

if (isDirectExecution()) {
  try {
    const serverResult = analyzeServerJson({ serverJsonPath: DEFAULT_SERVER_JSON_PATH });
    const agreementResult = analyzeRegistryMetadataAgreement({
      serverJsonPath: DEFAULT_SERVER_JSON_PATH,
      packageJsonPath: DEFAULT_PACKAGE_JSON_PATH,
      packageLockPath: DEFAULT_PACKAGE_LOCK_PATH
    });
    const violations = [...serverResult.violations, ...agreementResult.violations];

    if (violations.length > 0) {
      console.error(`check-mcp-registry-metadata: FAIL - ${violations.length} Registry metadata contract violation(s):`);
      for (const violation of violations.slice(0, MAX_REPORTED_VIOLATIONS)) {
        console.error(`  - ${violation}`);
      }
      if (violations.length > MAX_REPORTED_VIOLATIONS) {
        console.error(`  ... and ${violations.length - MAX_REPORTED_VIOLATIONS} more.`);
      }
      process.exit(1);
    }

    console.log(
      "check-mcp-registry-metadata: PASS - server.json matches the reviewed MCP Registry contract and agrees with package.json and package-lock.json."
    );
    console.log(
      "check-mcp-registry-metadata: scope - local file inspection only. No npm, mcp-publisher, registry, or network operation was run; nothing was published or authenticated."
    );
  } catch (error) {
    if (error instanceof MalformedRegistryMetadataError) {
      console.error(`check-mcp-registry-metadata: MALFORMED METADATA - ${error.message}`);
    } else {
      console.error(`check-mcp-registry-metadata: ${error.message}`);
    }
    process.exit(1);
  }
}
