// Statically validates this repository's package.json against the reviewed
// package metadata contract and the closed `files` allowlist recorded in
// docs/PACKAGE_METADATA_AND_ARTIFACT_ALLOWLIST_IMPLEMENTATION.md, updated by the
// P-4 publication configuration in
// docs/PACKAGE_PUBLICATION_CONFIGURATION_IMPLEMENTATION_NOTES.md (scoped public
// identity, removal of the `private: true` guard, explicit public
// publishConfig), and also validates that package-lock.json's root package
// identity agrees with that reviewed identity.
//
// Scope boundary: this check reads package.json and package-lock.json and
// nothing else. It runs no npm command, builds nothing, packs nothing, installs
// nothing, and reaches no registry or network. It therefore validates what the
// manifests *declare* -- it does not and cannot measure what npm would actually
// place in a package artifact, and it does not publish. That evidence is
// separate work.
//
// Run with `npm run check:package-metadata`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_PACKAGE_JSON_PATH = path.join(repoRoot, "package.json");
const DEFAULT_PACKAGE_LOCK_PATH = path.join(repoRoot, "package-lock.json");

const MAX_REPORTED_VIOLATIONS = 50;

export class MalformedManifestError extends Error {}

// The owner-settled publication identity (P-4). The package is published under
// the owner-controlled npm organization scope; the scope is load-bearing and
// enforced both as the exact name and as a scope-prefix guard below.
export const REVIEWED_SCOPE = "@stocktrends-publications";
export const REVIEWED_NAME = "@stocktrends-publications/stocktrends-mcp-server";
export const REVIEWED_VERSION = "1.0.1";
// The MCP Registry ownership-verification identity (Registry-readiness
// work). Exact-string-checked below alongside the other reviewed identity
// fields, so a missing, malformed, wrong-namespace, wrong-path, or
// non-string value each fails closed the same way a name/version drift does.
export const REVIEWED_MCP_NAME = "com.stocktrends/market-intelligence";
export const REVIEWED_DESCRIPTION =
  "Stock Trends MCP adapter with local stdio and fail-closed Streamable HTTP public discovery support.";
export const REVIEWED_AUTHOR = "Stocktrends Publications";
export const REVIEWED_LICENSE = "MIT";
export const REVIEWED_HOMEPAGE = "https://github.com/skotlander/stocktrends-mcp-server#readme";
export const REVIEWED_REPOSITORY = Object.freeze({
  type: "git",
  url: "git+https://github.com/skotlander/stocktrends-mcp-server.git"
});
// The exact GitHub repository the npm trusted publisher must later be bound to.
// Enforced as an explicit, bounded owner/repo identity in addition to the exact
// `repository` object match, so an owner/repo/host change is named directly.
export const REVIEWED_GITHUB_REPOSITORY = "skotlander/stocktrends-mcp-server";
export const REVIEWED_BUGS = Object.freeze({
  url: "https://github.com/skotlander/stocktrends-mcp-server/issues"
});
export const REVIEWED_ENGINES = Object.freeze({ node: ">=20" });
// The explicit public-access, public-npm-registry publication configuration
// (P-4). Making public access explicit is required for a scoped package; the
// registry is pinned so the target cannot silently drift.
export const REVIEWED_PUBLISH_CONFIG = Object.freeze({
  access: "public",
  registry: "https://registry.npmjs.org/"
});
export const REVIEWED_FILES = Object.freeze(["dist/**/*.js", "dist/**/*.d.ts", "README.md", "LICENSE"]);
export const REVIEWED_RUNTIME_DEPENDENCIES = Object.freeze({
  "@modelcontextprotocol/node": "2.1.1",
  "@modelcontextprotocol/server": "2.3.1",
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
  ["mcpName", REVIEWED_MCP_NAME],
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

// Resolves a repository URL to its `owner/repo` GitHub identity, or null when
// the URL is not a parseable github.com repository (a non-GitHub host or a
// malformed value both yield null so the caller fails closed). Handles the
// `git+https://`, `https://`, `ssh://`, and `git@github.com:` forms and an
// optional trailing `.git`.
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

  // A scoped name is now the reviewed identity, but only under the one
  // authorized scope. Any other scope is a mismatch even before the exact-name
  // check, so an accidental scope swap is named explicitly.
  if (
    typeof manifest.name === "string" &&
    manifest.name.startsWith("@") &&
    !manifest.name.startsWith(`${REVIEWED_SCOPE}/`)
  ) {
    violations.push(
      `name must use the authorized ${REVIEWED_SCOPE} scope; no other package scope is authorized (found ${summarizeValue(manifest.name)}).`
    );
  }
}

// Explicit, bounded GitHub repository-identity invariant. The exact
// `repository` object is already pinned by EXACT_OBJECT_FIELDS; this adds a
// dedicated owner/repo check because the npm trusted publisher must later be
// bound to exactly this repository. It rejects another owner, another
// repository, a missing field, a non-GitHub host, and malformed metadata.
function checkRepositoryIdentity(manifest, violations) {
  const repo = manifest.repository;

  if (repo === undefined || repo === null) {
    violations.push(
      `repository must be present and identify the GitHub repository ${REVIEWED_GITHUB_REPOSITORY} (found ${summarizeValue(repo)}).`
    );
    return;
  }

  let url;
  if (typeof repo === "string") {
    url = repo;
  } else if (typeof repo === "object" && !Array.isArray(repo) && typeof repo.url === "string") {
    url = repo.url;
  } else {
    violations.push(
      `repository is malformed; it must identify the GitHub repository ${REVIEWED_GITHUB_REPOSITORY} (found ${summarizeValue(repo)}).`
    );
    return;
  }

  const identity = parseGitHubRepoIdentity(url);
  if (identity === null) {
    violations.push(
      `repository must identify the GitHub repository ${REVIEWED_GITHUB_REPOSITORY}; no github.com owner/repo could be resolved from ${summarizeValue(url)}.`
    );
    return;
  }

  if (identity !== REVIEWED_GITHUB_REPOSITORY) {
    violations.push(
      `repository must identify exactly the GitHub repository ${REVIEWED_GITHUB_REPOSITORY} (found ${summarizeValue(identity)}).`
    );
  }
}

function checkPublicationSafety(manifest, violations) {
  // P-4 deliberately removed the boolean `private: true` accidental-publication
  // guard as the controlled step that arms the configured public release. It
  // must not creep back in -- a stray `private` field (true, false, or a
  // string) would either re-block publication or read as an unreviewed toggle,
  // so the reviewed posture is the field's total absence.
  if (Object.prototype.hasOwnProperty.call(manifest, "private")) {
    violations.push(
      `private must be absent; the boolean "private": true accidental-publication guard is deliberately removed for the configured public release (found ${summarizeValue(manifest.private)}).`
    );
  }

  // The public-access, public-npm-registry publishConfig must be present and
  // exact. Its absence would leave scoped-package access implicit (npm defaults
  // a scoped package to restricted), and any extra key or drifted value could
  // retarget the release.
  if (!deepEqual(manifest.publishConfig, REVIEWED_PUBLISH_CONFIG)) {
    violations.push(
      `publishConfig must be exactly ${summarizeValue(REVIEWED_PUBLISH_CONFIG)} -- explicit public access to the public npm registry (found ${summarizeValue(manifest.publishConfig)}).`
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
  checkRepositoryIdentity(manifest, violations);
  checkPublicationSafety(manifest, violations);
  checkFilesAllowlist(manifest, violations);
  checkRuntimeDependencyContract(manifest, violations);

  return { violations };
}

// Validates that the lockfile's root package identity agrees with the reviewed
// scoped identity and with package.json, and that the reviewed root runtime
// dependency contract is unchanged in the lockfile. This is a bounded identity
// and agreement check -- it deliberately does not walk transitive dependency
// entries (drift there is caught by reviewing the lockfile diff, which the P-4
// change keeps to the two root-name lines). It reads the two manifests and
// nothing else: no npm command, no build, no install, no registry access.
// Throws MalformedManifestError when either file cannot be read or parsed.
export function analyzeLockfileIdentity({ packageJsonPath, packageLockPath }) {
  const manifest = readManifest(packageJsonPath);
  const lock = readManifest(packageLockPath);
  const violations = [];

  const rootPackage =
    lock.packages !== null && typeof lock.packages === "object" && !Array.isArray(lock.packages)
      ? lock.packages[""]
      : undefined;
  const hasRootPackage =
    rootPackage !== null && typeof rootPackage === "object" && !Array.isArray(rootPackage);

  if (lock.name !== REVIEWED_NAME) {
    violations.push(
      `package-lock.json top-level name must be exactly ${summarizeValue(REVIEWED_NAME)} (found ${summarizeValue(lock.name)}).`
    );
  }

  if (!hasRootPackage) {
    violations.push(
      `package-lock.json must contain a root package entry at packages[""] (found ${summarizeValue(rootPackage)}).`
    );
  } else {
    if (rootPackage.name !== REVIEWED_NAME) {
      violations.push(
        `package-lock.json packages[""].name must be exactly ${summarizeValue(REVIEWED_NAME)} (found ${summarizeValue(rootPackage.name)}).`
      );
    }
    if (rootPackage.version !== REVIEWED_VERSION) {
      violations.push(
        `package-lock.json packages[""].version must be exactly ${summarizeValue(REVIEWED_VERSION)} (found ${summarizeValue(rootPackage.version)}).`
      );
    }
    if (!deepEqual(rootPackage.dependencies, REVIEWED_RUNTIME_DEPENDENCIES)) {
      violations.push(
        `package-lock.json packages[""].dependencies must remain exactly the reviewed runtime dependency contract ${summarizeValue(REVIEWED_RUNTIME_DEPENDENCIES)} (found ${summarizeValue(rootPackage.dependencies)}).`
      );
    }
  }

  if (lock.version !== REVIEWED_VERSION) {
    violations.push(
      `package-lock.json top-level version must be exactly ${summarizeValue(REVIEWED_VERSION)} (found ${summarizeValue(lock.version)}).`
    );
  }

  // package.json and the lockfile root must agree with each other, not merely
  // each with the constant -- an incoherent pair is itself the defect.
  if (manifest.name !== lock.name || (hasRootPackage && manifest.name !== rootPackage.name)) {
    violations.push(
      `package.json name ${summarizeValue(manifest.name)} and package-lock.json root identity must agree.`
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
    const metadataResult = analyzePackageMetadata({ packageJsonPath: DEFAULT_PACKAGE_JSON_PATH });
    const lockResult = analyzeLockfileIdentity({
      packageJsonPath: DEFAULT_PACKAGE_JSON_PATH,
      packageLockPath: DEFAULT_PACKAGE_LOCK_PATH
    });
    const violations = [...metadataResult.violations, ...lockResult.violations];

    if (violations.length > 0) {
      console.error(`check-package-metadata: FAIL - ${violations.length} manifest/lockfile contract violation(s):`);
      for (const violation of violations.slice(0, MAX_REPORTED_VIOLATIONS)) {
        console.error(`  - ${violation}`);
      }
      if (violations.length > MAX_REPORTED_VIOLATIONS) {
        console.error(`  ... and ${violations.length - MAX_REPORTED_VIOLATIONS} more.`);
      }
      process.exit(1);
    }

    console.log(
      `check-package-metadata: PASS - reviewed package metadata, the closed files allowlist (${REVIEWED_FILES.length} entries), and package-lock root identity are satisfied.`
    );
    console.log(
      "check-package-metadata: scope - manifest and lockfile-root contract only. No artifact contents were measured; no npm command, build, pack, install, or registry query was run."
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
