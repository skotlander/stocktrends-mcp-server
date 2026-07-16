// Statically validates this repository's package.json against the reviewed
// package metadata contract and the closed `files` allowlist recorded in
// docs/PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md.
//
// Scope boundary: this check reads the manifest and nothing else. It runs no
// npm command, builds nothing, packs nothing, installs nothing, and reaches no
// registry or network. It therefore validates what the manifest *declares* --
// it does not and cannot measure what npm would actually place in a package
// artifact. That evidence is separate work.
//
// Run with `npm run check:package-metadata`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_PACKAGE_JSON_PATH = path.join(repoRoot, "package.json");

const MAX_REPORTED_VIOLATIONS = 50;

export class MalformedManifestError extends Error {}

export const REVIEWED_NAME = "stocktrends-mcp-server";
export const REVIEWED_VERSION = "1.0.0";
export const REVIEWED_DESCRIPTION =
  "Local stdio MCP adapter for Stock Trends public resources, workflow planning, and separately gated paid API tools.";
export const REVIEWED_AUTHOR = "Stocktrends Publications";
export const REVIEWED_LICENSE = "MIT";
export const REVIEWED_HOMEPAGE = "https://github.com/skotlander/stocktrends-mcp-server#readme";
export const REVIEWED_REPOSITORY = Object.freeze({
  type: "git",
  url: "git+https://github.com/skotlander/stocktrends-mcp-server.git"
});
export const REVIEWED_BUGS = Object.freeze({
  url: "https://github.com/skotlander/stocktrends-mcp-server/issues"
});
export const REVIEWED_ENGINES = Object.freeze({ node: ">=18" });
export const REVIEWED_FILES = Object.freeze(["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE"]);
export const REVIEWED_RUNTIME_DEPENDENCIES = Object.freeze({
  "@modelcontextprotocol/sdk": "^1.29.0",
  zod: "^4.4.3"
});

// npm install, package, and publication lifecycle hooks. Their absence is a
// deliberate safety property: no publish can fire without someone typing it.
export const FORBIDDEN_LIFECYCLE_SCRIPTS = Object.freeze([
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
]);

// Representative compiled source-map paths. An entry that matches one of these
// is a source-map pattern regardless of how it is spelled.
const SOURCE_MAP_PROBES = Object.freeze(["dist/server.js.map", "dist/tools/index.js.map"]);

const EXACT_STRING_FIELDS = Object.freeze([
  ["name", REVIEWED_NAME],
  ["version", REVIEWED_VERSION],
  ["description", REVIEWED_DESCRIPTION],
  ["author", REVIEWED_AUTHOR],
  ["license", REVIEWED_LICENSE],
  ["homepage", REVIEWED_HOMEPAGE]
]);

const EXACT_OBJECT_FIELDS = Object.freeze([
  ["repository", REVIEWED_REPOSITORY],
  ["bugs", REVIEWED_BUGS],
  ["engines", REVIEWED_ENGINES]
]);

export function normalizeSlashes(value) {
  return String(value).split("\\").join("/");
}

export function containsGlob(value) {
  return /[*?]/.test(String(value));
}

// Renders a value for a violation message, bounded so that output stays
// deterministic and small no matter what the manifest contains.
export function summarizeValue(value, maxLength = 120) {
  let rendered;
  try {
    rendered = JSON.stringify(value);
  } catch {
    rendered = String(value);
  }
  if (rendered === undefined) rendered = "undefined";
  return rendered.length > maxLength ? `${rendered.slice(0, maxLength - 1)}…` : rendered;
}

// Structural equality for JSON values. Extra keys are a mismatch: the reviewed
// objects are exact, not minimums.
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

export function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    const key = typeof value === "string" ? value : summarizeValue(value);
    if (seen.has(key)) duplicates.add(value);
    else seen.add(key);
  }
  return Array.from(duplicates);
}

// Translates a `files` glob into an anchored RegExp. `**/` spans zero or more
// directories; `*` and `?` stay within a single path segment.
export function globToRegExp(pattern) {
  const normalized = normalizeSlashes(pattern);
  let source = "";
  let index = 0;

  while (index < normalized.length) {
    const char = normalized[index];

    if (char === "*") {
      if (normalized[index + 1] === "*") {
        if (normalized[index + 2] === "/") {
          source += "(?:.*/)?";
          index += 3;
        } else {
          source += ".*";
          index += 2;
        }
      } else {
        source += "[^/]*";
        index += 1;
      }
      continue;
    }

    if (char === "?") {
      source += "[^/]";
      index += 1;
      continue;
    }

    source += char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    index += 1;
  }

  return new RegExp(`^${source}$`);
}

function normalizeEntry(entry) {
  return normalizeSlashes(entry)
    .replace(/^\.\//, "")
    .replace(/\/+$/, "");
}

// True when a single `files` entry would select the given path. Mirrors npm's
// two selection shapes: a glob match, or a directory entry that ships its
// entire contents.
export function entryMatchesPath(entry, targetPath) {
  if (typeof entry !== "string" || entry.length === 0) return false;
  const normalizedEntry = normalizeEntry(entry);
  const normalizedTarget = normalizeEntry(targetPath);
  if (normalizedEntry === "") return false;
  if (globToRegExp(normalizedEntry).test(normalizedTarget)) return true;
  if (!containsGlob(normalizedEntry) && normalizedTarget.startsWith(`${normalizedEntry}/`)) return true;
  return false;
}

export function isCoveredByFiles(targetPath, filesEntries) {
  if (!Array.isArray(filesEntries)) return false;
  return filesEntries.some((entry) => entryMatchesPath(entry, targetPath));
}

// Selects the whole package: `.`, `/`, `*`, `**`, `**/*`, and friends.
export function isWholeTreeEntry(entry) {
  const normalized = normalizeEntry(entry);
  if (normalized === "" || normalized === ".") return true;
  return /^[*/]+$/.test(normalized);
}

// A final segment that is only glob stars selects every file below a directory
// regardless of type -- `dist/**` would sweep in the source maps that
// `dist/**/*.js` deliberately leaves out.
export function isUnnarrowedGlobEntry(entry) {
  const normalized = normalizeEntry(entry);
  if (!normalized.includes("/")) return false;
  const finalSegment = normalized.split("/").pop() ?? "";
  return /^\*+$/.test(finalSegment);
}

// Behavioral rather than spelling-based: an entry is a source-map pattern if it
// is spelled as one, or if it would match a compiled source-map path.
export function isSourceMapEntry(entry) {
  const normalized = normalizeEntry(entry);
  if (normalized === "") return false;
  if (/\.map$/i.test(normalized)) return true;
  const matcher = globToRegExp(normalized);
  return SOURCE_MAP_PROBES.some((probe) => matcher.test(probe));
}

// A glob-free entry that is a parent directory of a declared entry point names
// a directory, and a directory entry ships everything under it.
export function isDirectoryWholesaleEntry(entry, entryPointPaths) {
  if (typeof entry !== "string" || containsGlob(entry)) return false;
  const normalized = normalizeEntry(entry);
  if (normalized === "") return false;
  return entryPointPaths.some((target) => normalizeEntry(target).startsWith(`${normalized}/`));
}

// Shape classification for one `files` entry. Returns null when the entry's
// shape is acceptable, or a reason phrase describing why it is not.
export function classifyFilesEntry(entry) {
  if (typeof entry !== "string") return "is not a string";
  if (entry.length === 0) return "is empty";
  if (entry !== entry.trim()) return "has leading or trailing whitespace";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(entry)) return "is a URL";
  if (entry.startsWith("/") || entry.startsWith("\\")) return "is an absolute path";
  if (/^[a-zA-Z]:[\\/]/.test(entry)) return "is an absolute path";
  if (entry.startsWith("!")) return "is a negated entry";
  if (normalizeSlashes(entry).split("/").includes("..")) return "is parent-relative";
  if (isWholeTreeEntry(entry)) return "selects the entire package";
  if (normalizeSlashes(entry).endsWith("/")) return "names a directory, which would ship its entire contents";
  if (isUnnarrowedGlobEntry(entry)) return "selects every file under a directory regardless of type";
  if (isSourceMapEntry(entry)) return "is a source-map pattern, which the reviewed allowlist excludes";
  return null;
}

// The paths the manifest promises a consumer: main, types, and each bin target.
export function collectEntryPointTargets(manifest) {
  const targets = [];
  targets.push({ field: "main", target: manifest.main });
  targets.push({ field: "types", target: manifest.types });

  const bin = manifest.bin;
  if (typeof bin === "string") {
    targets.push({ field: "bin", target: bin });
  } else if (bin !== null && typeof bin === "object" && !Array.isArray(bin)) {
    for (const name of Object.keys(bin).sort()) {
      targets.push({ field: `bin["${name}"]`, target: bin[name] });
    }
  } else if (bin === undefined) {
    targets.push({ field: "bin", target: undefined });
  } else {
    targets.push({ field: "bin", target: null });
  }

  return targets;
}

function checkExactFields(manifest, violations) {
  for (const [field, expected] of EXACT_STRING_FIELDS) {
    if (manifest[field] !== expected) {
      violations.push(
        `${field} must be exactly ${summarizeValue(expected)} (found ${summarizeValue(manifest[field])}).`
      );
    }
  }

  for (const [field, expected] of EXACT_OBJECT_FIELDS) {
    if (!deepEqual(manifest[field], expected)) {
      violations.push(
        `${field} must be exactly ${summarizeValue(expected)} (found ${summarizeValue(manifest[field])}).`
      );
    }
  }

  if (typeof manifest.name === "string" && manifest.name.startsWith("@")) {
    violations.push(
      `name must remain unscoped; no package scope is authorized (found ${summarizeValue(manifest.name)}).`
    );
  }
}

function checkPublicationSafety(manifest, violations) {
  if (manifest.private !== true) {
    violations.push(
      `private must be boolean true -- it is the accidental-publication guard (found ${summarizeValue(manifest.private)}).`
    );
  }

  if (manifest.publishConfig !== undefined) {
    violations.push(
      `publishConfig must not be present; no publication configuration is authorized (found ${summarizeValue(manifest.publishConfig)}).`
    );
  }

  const scripts = manifest.scripts;
  if (scripts === undefined) return;

  if (scripts === null || typeof scripts !== "object" || Array.isArray(scripts)) {
    violations.push(`scripts must be an object (found ${summarizeValue(scripts)}).`);
    return;
  }

  for (const hook of FORBIDDEN_LIFECYCLE_SCRIPTS) {
    if (Object.prototype.hasOwnProperty.call(scripts, hook)) {
      violations.push(
        `scripts.${hook} must not be present; no npm install, package, or publication lifecycle script is authorized.`
      );
    }
  }
}

function checkFilesAllowlist(manifest, violations) {
  const files = manifest.files;

  if (!Array.isArray(files)) {
    violations.push(
      `files must be an array of exactly the ${REVIEWED_FILES.length} reviewed entries ${summarizeValue(REVIEWED_FILES)} (found ${summarizeValue(files)}).`
    );
    return;
  }

  const entryPointPaths = collectEntryPointTargets(manifest)
    .map(({ target }) => target)
    .filter((target) => typeof target === "string" && target.length > 0);

  for (const entry of files) {
    const reason = classifyFilesEntry(entry);
    if (reason !== null) {
      violations.push(`files entry ${summarizeValue(entry)} ${reason}.`);
    } else if (isDirectoryWholesaleEntry(entry, entryPointPaths)) {
      violations.push(
        `files entry ${summarizeValue(entry)} names a directory holding a declared entry point, which would ship its entire contents.`
      );
    }
  }

  for (const duplicate of findDuplicates(files)) {
    violations.push(`files entry ${summarizeValue(duplicate)} is duplicated.`);
  }

  for (const reviewed of REVIEWED_FILES) {
    if (!files.includes(reviewed)) {
      violations.push(`files must include the reviewed entry ${summarizeValue(reviewed)}.`);
    }
  }

  const seenExtras = new Set();
  for (const entry of files) {
    if (typeof entry !== "string") continue;
    if (REVIEWED_FILES.includes(entry) || seenExtras.has(entry)) continue;
    seenExtras.add(entry);
    violations.push(`files entry ${summarizeValue(entry)} is not part of the reviewed closed allowlist.`);
  }

  for (const { field, target } of collectEntryPointTargets(manifest)) {
    if (typeof target !== "string" || target.length === 0) {
      violations.push(`${field} must declare a non-empty path (found ${summarizeValue(target)}).`);
      continue;
    }
    if (!isCoveredByFiles(target, files)) {
      violations.push(`${field} target ${summarizeValue(target)} is not covered by the declared files contract.`);
    }
  }
}

function checkRuntimeDependencyContract(manifest, violations) {
  if (!deepEqual(manifest.dependencies, REVIEWED_RUNTIME_DEPENDENCIES)) {
    violations.push(
      `dependencies must remain exactly the reviewed runtime dependency contract ${summarizeValue(REVIEWED_RUNTIME_DEPENDENCIES)} (found ${summarizeValue(manifest.dependencies)}).`
    );
  }
}

export function readManifest(packageJsonPath) {
  let raw;
  try {
    raw = fs.readFileSync(packageJsonPath, "utf8");
  } catch (error) {
    throw new MalformedManifestError(`package.json could not be read at ${packageJsonPath}: ${error.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new MalformedManifestError(`package.json at ${packageJsonPath} is not valid JSON: ${error.message}`);
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new MalformedManifestError(`package.json at ${packageJsonPath} must contain a JSON object at its top level.`);
  }

  return parsed;
}

// Validates a manifest against the reviewed contract. Throws
// MalformedManifestError when the manifest cannot be read or parsed -- a
// malformed manifest is a distinct outcome from a contract violation. Never
// repairs the manifest.
export function analyzePackageMetadata({ packageJsonPath }) {
  const manifest = readManifest(packageJsonPath);
  const violations = [];

  checkExactFields(manifest, violations);
  checkPublicationSafety(manifest, violations);
  checkFilesAllowlist(manifest, violations);
  checkRuntimeDependencyContract(manifest, violations);

  return { violations };
}

function isDirectExecution() {
  const entrypoint = process.argv[1];
  return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
}

if (isDirectExecution()) {
  try {
    const result = analyzePackageMetadata({ packageJsonPath: DEFAULT_PACKAGE_JSON_PATH });

    if (result.violations.length > 0) {
      console.error(`check-package-metadata: FAIL - ${result.violations.length} manifest contract violation(s):`);
      for (const violation of result.violations.slice(0, MAX_REPORTED_VIOLATIONS)) {
        console.error(`  - ${violation}`);
      }
      if (result.violations.length > MAX_REPORTED_VIOLATIONS) {
        console.error(`  ... and ${result.violations.length - MAX_REPORTED_VIOLATIONS} more.`);
      }
      process.exit(1);
    }

    console.log(
      `check-package-metadata: PASS - reviewed package metadata and the closed files allowlist (${REVIEWED_FILES.length} entries) are satisfied.`
    );
    console.log(
      "check-package-metadata: scope - manifest contract only. No artifact contents were measured; no npm command, build, pack, install, or registry query was run."
    );
  } catch (error) {
    if (error instanceof MalformedManifestError) {
      console.error(`check-package-metadata: MALFORMED MANIFEST - ${error.message}`);
    } else {
      console.error(`check-package-metadata: ${error.message}`);
    }
    process.exit(1);
  }
}
