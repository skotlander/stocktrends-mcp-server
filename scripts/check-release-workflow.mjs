// Statically validates the single release-publication workflow
// `.github/workflows/npm-stage-release.yml` against the settled P-4 publication
// controls recorded in
// docs/PACKAGE_PUBLICATION_CONFIGURATION_IMPLEMENTATION_NOTES.md.
//
// The workflow is inert repository configuration: this check never runs it,
// never calls GitHub Actions, never authenticates, never publishes. It reads
// the workflow file and nothing else.
//
// Line-aware, not naive substring matching. A forbidden command such as
// `npm publish` or `npm stage approve` may be *discussed* in an explanatory
// comment (the workflow is required to document why those are excluded). This
// checker therefore separates comment lines from executable ("code") lines and
// applies command presence/absence rules to code lines only, so documentation
// is never mistaken for an executable step.
//
// Run with `npm run check:release-workflow`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

export const RELEASE_WORKFLOW_RELATIVE_PATH = ".github/workflows/npm-stage-release.yml";
const DEFAULT_WORKFLOW_PATH = path.join(repoRoot, ".github", "workflows", "npm-stage-release.yml");

const MAX_REPORTED_VIOLATIONS = 60;

export const EXPECTED_WORKFLOW_BASENAME = "npm-stage-release.yml";
export const CONFIRMATION_PHRASE = "STAGE_STOCKTRENDS_NPM_RELEASE";
export const REVIEWED_PACKAGE_NAME = "@stocktrends-publications/stocktrends-mcp-server";
// npm is pinned to an exact version (above the 11.15.0 staged-publishing floor),
// never a caret/tilde/range/tag/latest. The workflow must install exactly this
// version and assert `npm --version` equals it before staging.
export const REQUIRED_NPM_VERSION = "11.18.0";
export const REQUIRED_NODE_MAJOR = "24";

// Every external action must be pinned to an immutable full 40-character commit
// SHA -- never a branch, tag (`@v4`/`@v6`), or abbreviated SHA. Only these two
// actions, at exactly these approved release commits, are permitted.
export const REQUIRED_CHECKOUT_ACTION = "actions/checkout";
export const REQUIRED_CHECKOUT_SHA = "df4cb1c069e1874edd31b4311f1884172cec0e10"; // v6.0.3
export const REQUIRED_SETUP_NODE_ACTION = "actions/setup-node";
export const REQUIRED_SETUP_NODE_SHA = "249970729cb0ef3589644e2896645e5dc5ba9c38"; // v6.5.0
export const APPROVED_ACTION_SHAS = Object.freeze({
  [REQUIRED_CHECKOUT_ACTION]: REQUIRED_CHECKOUT_SHA,
  [REQUIRED_SETUP_NODE_ACTION]: REQUIRED_SETUP_NODE_SHA
});

// The single shell variable the exact tarball is bound to. The staging command
// must submit this bound variable -- the same artifact that `npm pack` created
// and that the SHA-256 and allowlist steps validated -- never a bare command or
// a re-derived path.
export const TARBALL_VAR = "TARBALL";

// Exact minimal workflow permissions: checkout read + OIDC token issuance only.
export const REQUIRED_PERMISSIONS = Object.freeze({ contents: "read", "id-token": "write" });

// Triggers that would let an ordinary push, merge, PR, schedule, tag, or event
// fire the workflow. None may appear as an `on:` trigger.
export const FORBIDDEN_TRIGGERS = Object.freeze([
  "push",
  "pull_request",
  "pull_request_target",
  "schedule",
  "release",
  "create",
  "workflow_run",
  "repository_dispatch",
  "merge_group",
  "page_build"
]);

export class MalformedWorkflowError extends Error {}

export function getIndent(line) {
  const match = /^(\s*)/.exec(line);
  return match ? match[1].length : 0;
}

// Removes a YAML/shell trailing comment from a single line. A `#` begins a
// comment only when it is not inside quotes and is at line start or preceded by
// whitespace -- `foo#bar` and `url#frag` are not comments.
export function stripInlineComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "'" && !inDouble) inSingle = !inSingle;
    else if (char === '"' && !inSingle) inDouble = !inDouble;
    else if (char === "#" && !inSingle && !inDouble) {
      const prev = i === 0 ? "" : line[i - 1];
      if (i === 0 || /\s/.test(prev)) return line.slice(0, i);
    }
  }
  return line;
}

// True when the entire line (ignoring indentation) is a comment.
export function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith("#");
}

// Splits the file into comment-free "code" lines (with inline comments removed)
// and the raw line list. Blank lines are dropped from code lines.
export function classifyLines(text) {
  const rawLines = text.split(/\r?\n/);
  const codeLines = [];
  for (const raw of rawLines) {
    if (isCommentLine(raw)) continue;
    const stripped = stripInlineComment(raw);
    if (stripped.trim().length === 0) continue;
    codeLines.push(stripped);
  }
  return { rawLines, codeLines };
}

// Returns the child lines of the first top-level `key:` block -- every line
// after it that is indented more deeply than the key line, stopping at the
// first line indented at or below the key. Operates on code lines only.
export function extractTopLevelBlock(codeLines, key) {
  const headerIndex = codeLines.findIndex((line) => new RegExp(`^${key}\\s*:`).test(line));
  if (headerIndex === -1) return null;
  const header = codeLines[headerIndex];
  const headerIndent = getIndent(header);
  const inline = header.slice(header.indexOf(":") + 1).trim();
  const body = [];
  for (let i = headerIndex + 1; i < codeLines.length; i += 1) {
    if (getIndent(codeLines[i]) <= headerIndent) break;
    body.push(codeLines[i]);
  }
  return { header, inline, body };
}

// Direct-child `key:` names of a block -- the lines at the shallowest
// indentation within the block body.
export function directChildKeys(body) {
  const indents = body.filter((line) => line.trim().length > 0).map(getIndent);
  if (indents.length === 0) return [];
  const childIndent = Math.min(...indents);
  const keys = [];
  for (const line of body) {
    if (getIndent(line) !== childIndent) continue;
    const match = /^\s*-?\s*([A-Za-z0-9_-]+)\s*:/.exec(line);
    if (match) keys.push(match[1]);
  }
  return keys;
}

function checkTrigger(codeText, codeLines, violations) {
  const onBlock = extractTopLevelBlock(codeLines, "on");
  if (!onBlock) {
    violations.push("workflow must declare an `on:` trigger block.");
    return;
  }

  const inlineTriggers = onBlock.inline;
  // Reject inline array/scalar forms that include anything but workflow_dispatch.
  if (inlineTriggers.length > 0 && !/^\[?\s*workflow_dispatch\s*\]?$/.test(inlineTriggers)) {
    violations.push(
      `on: must trigger only on workflow_dispatch (found inline trigger ${JSON.stringify(inlineTriggers)}).`
    );
  }

  const triggerKeys = onBlock.inline.length > 0 ? [] : directChildKeys(onBlock.body);
  const usesDispatch = /workflow_dispatch/.test(onBlock.inline) || triggerKeys.includes("workflow_dispatch");
  if (!usesDispatch) {
    violations.push("on: must include workflow_dispatch as its trigger.");
  }

  for (const key of triggerKeys) {
    if (key !== "workflow_dispatch") {
      violations.push(`on: must not declare the ${key} trigger; only workflow_dispatch is allowed.`);
    }
  }

  // Defence in depth: no forbidden trigger keyword may appear as an on-block key.
  const onBlockText = onBlock.body.join("\n");
  for (const trigger of FORBIDDEN_TRIGGERS) {
    if (new RegExp(`^\\s+${trigger}\\s*:`, "m").test(onBlockText)) {
      violations.push(`on: must not reference the ${trigger} trigger anywhere in its block.`);
    }
  }
}

function checkPermissions(codeLines, violations) {
  const block = extractTopLevelBlock(codeLines, "permissions");
  if (!block) {
    violations.push("workflow must declare an explicit top-level `permissions:` block.");
    return;
  }

  const found = {};
  for (const line of block.body) {
    const match = /^\s*([A-Za-z0-9_-]+)\s*:\s*([A-Za-z-]+)\s*$/.exec(line);
    if (match) found[match[1]] = match[2];
  }

  const expectedKeys = Object.keys(REQUIRED_PERMISSIONS).sort();
  const foundKeys = Object.keys(found).sort();

  for (const [key, value] of Object.entries(REQUIRED_PERMISSIONS)) {
    if (found[key] !== value) {
      violations.push(`permissions.${key} must be exactly "${value}" (found ${JSON.stringify(found[key])}).`);
    }
  }
  for (const key of foundKeys) {
    if (!(key in REQUIRED_PERMISSIONS)) {
      violations.push(
        `permissions must be exactly { contents: read, id-token: write }; extra permission ${JSON.stringify(key)} is not allowed.`
      );
    }
  }
  if (foundKeys.length !== expectedKeys.length && foundKeys.length < expectedKeys.length) {
    for (const key of expectedKeys) {
      if (!(key in found)) {
        violations.push(`permissions must include ${key}: ${REQUIRED_PERMISSIONS[key]}.`);
      }
    }
  }
}

function checkRunner(codeText, violations) {
  const runsOn = /runs-on:\s*([^\n]+)/.exec(codeText);
  if (!runsOn) {
    violations.push("workflow must declare a `runs-on:` runner.");
    return;
  }
  const label = runsOn[1].trim();
  if (!/ubuntu/i.test(label)) {
    violations.push(`runs-on must be a GitHub-hosted Ubuntu runner (found ${JSON.stringify(label)}).`);
  }
  if (/self-hosted/i.test(codeText)) {
    violations.push("runs-on must not use a self-hosted runner; npm trusted publishing requires a GitHub-hosted runner.");
  }
}

function checkNodeVersion(codeText, violations) {
  const nodeVersion = /node-version:\s*['"]?(\d+)/.exec(codeText);
  if (!nodeVersion) {
    violations.push("workflow must pin a Node version via `node-version:`.");
    return;
  }
  if (nodeVersion[1] !== REQUIRED_NODE_MAJOR) {
    violations.push(`node-version must be ${REQUIRED_NODE_MAJOR} (found major ${JSON.stringify(nodeVersion[1])}).`);
  }
}

// npm must be installed at exactly REQUIRED_NPM_VERSION -- no caret, tilde,
// range, tag, or `latest` -- and the workflow must assert `npm --version`
// equals that pin, before `npm stage publish`.
function checkNpmPin(codeLines, codeText, violations) {
  const installMatches = [...codeText.matchAll(/npm\s+install\s+-g\s+npm@([^\s;&|]+)/g)];
  const specs = installMatches.map((m) => m[1].replace(/["']/g, ""));

  if (!specs.includes(REQUIRED_NPM_VERSION)) {
    violations.push(
      `workflow must install npm exactly as npm@${REQUIRED_NPM_VERSION} before any staged-publishing command.`
    );
  }
  for (const spec of specs) {
    if (spec !== REQUIRED_NPM_VERSION) {
      violations.push(
        `npm CLI must be pinned exactly to ${REQUIRED_NPM_VERSION}; a floating or different selector ${JSON.stringify(spec)} is not allowed.`
      );
    }
  }

  if (!/npm\s+--version/.test(codeText)) {
    violations.push("workflow must read `npm --version` to assert the pinned npm version.");
  }

  // An exact-equality guard: an inequality test whose operand is the pinned
  // version literally, or a shell variable assigned that exact literal.
  const pinVars = codeLines
    .map((line) => new RegExp(`^\\s*([A-Za-z_][A-Za-z0-9_]*)=["']?${REQUIRED_NPM_VERSION.replace(/\./g, "\\.")}["']?\\s*$`).exec(line))
    .filter(Boolean)
    .map((m) => m[1]);
  const literalRe = new RegExp(REQUIRED_NPM_VERSION.replace(/\./g, "\\."));
  const equalityIndex = codeLines.findIndex((line) => {
    if (!/!=|-ne\b/.test(line)) return false;
    if (literalRe.test(line)) return true;
    return pinVars.some((v) => new RegExp(`\\$\\{?${v}\\}?`).test(line));
  });
  if (equalityIndex === -1) {
    violations.push(
      `workflow must assert \`npm --version\` equals exactly ${REQUIRED_NPM_VERSION} (an inequality guard that exits on mismatch).`
    );
  }

  // Ordering: the pinned install and its assertion must precede staging.
  const firstIndex = (pattern) => codeLines.findIndex((line) => pattern.test(line));
  const installIndex = firstIndex(/npm\s+install\s+-g\s+npm@/);
  const stageIndex = firstIndex(/\bnpm\s+stage\s+publish\b/);
  if (installIndex !== -1 && stageIndex !== -1 && installIndex > stageIndex) {
    violations.push(`npm must be pinned to ${REQUIRED_NPM_VERSION} before 'npm stage publish', not after.`);
  }
  if (equalityIndex !== -1 && stageIndex !== -1 && equalityIndex > stageIndex) {
    violations.push("the npm version-equality assertion must run before 'npm stage publish', not after.");
  }
}

// Collects the shell-content lines of every step: inline `run:` commands and the
// body lines of `run: |`/`run: >` block scalars. YAML `env:` mappings and other
// keys are excluded, so a ${{ ... }} expression is only ever inspected where it
// would actually be expanded into a shell command.
function collectRunShellLines(codeLines) {
  const shellLines = [];
  let inRunBlock = false;
  let runIndent = -1;
  for (const line of codeLines) {
    if (inRunBlock) {
      if (getIndent(line) > runIndent) {
        shellLines.push(line);
        continue;
      }
      inRunBlock = false;
      runIndent = -1;
    }
    if (/^\s*(?:-\s*)?run:\s*[|>]/.test(line)) {
      inRunBlock = true;
      runIndent = getIndent(line);
      continue;
    }
    const inlineRun = /^\s*(?:-\s*)?run:\s*(\S.*)$/.exec(line);
    if (inlineRun) shellLines.push(inlineRun[1]);
  }
  return shellLines;
}

// Untrusted/dispatch-time values must never be interpolated directly into shell.
// A ${{ inputs.* }} or ${{ github.* }} expression may appear in a YAML env:
// mapping (safe -- it becomes an environment variable), but not inside a run:
// shell command, where it would be expanded into executable text.
function checkShellContextInterpolation(codeLines, violations) {
  const shellLines = collectRunShellLines(codeLines);
  if (shellLines.some((line) => /\$\{\{\s*inputs\./.test(line))) {
    violations.push(
      "run: shell commands must not interpolate ${{ inputs.* }} directly; pass the value through an env: mapping and compare the quoted environment variable."
    );
  }
  if (shellLines.some((line) => /\$\{\{\s*github\./.test(line))) {
    violations.push(
      "run: shell commands must not interpolate ${{ github.* }} directly; use the corresponding shell environment variable (e.g. $GITHUB_REF)."
    );
  }
}

// Every external action must be pinned to its approved immutable full commit
// SHA. Only actions/checkout and actions/setup-node are permitted, and the
// security-relevant `with:` options must be set.
function checkActionPins(codeLines, codeText, violations) {
  const usesLines = codeLines.filter((line) => /(^|\s)uses:\s*\S/.test(line));
  const seen = new Set();
  const FULL_SHA = /^[0-9a-f]{40}$/;

  for (const line of usesLines) {
    const value = /uses:\s*([^\s#]+)/.exec(line)?.[1];
    if (!value) continue;
    const at = value.lastIndexOf("@");
    const name = at === -1 ? value : value.slice(0, at);
    const ref = at === -1 ? "" : value.slice(at + 1);

    if (!(name in APPROVED_ACTION_SHAS)) {
      violations.push(
        `only ${REQUIRED_CHECKOUT_ACTION} and ${REQUIRED_SETUP_NODE_ACTION} (pinned to their approved commit SHAs) may be used; ${JSON.stringify(value)} is not allowed.`
      );
      continue;
    }
    seen.add(name);
    const approved = APPROVED_ACTION_SHAS[name];
    if (ref !== approved) {
      const why = FULL_SHA.test(ref)
        ? "a different full SHA"
        : ref === ""
          ? "no ref"
          : "a mutable tag/branch or abbreviated SHA";
      violations.push(
        `${name} must be pinned to the approved full commit SHA ${approved}; ${JSON.stringify(ref)} is ${why}.`
      );
    }
  }

  for (const name of Object.keys(APPROVED_ACTION_SHAS)) {
    if (!seen.has(name)) {
      violations.push(`workflow must use ${name} pinned to ${APPROVED_ACTION_SHAS[name]}.`);
    }
  }

  if (!/persist-credentials:\s*false/.test(codeText)) {
    violations.push("actions/checkout must set `persist-credentials: false`.");
  }
  if (!/package-manager-cache:\s*false/.test(codeText)) {
    violations.push("actions/setup-node must set `package-manager-cache: false`.");
  }
}

// The workflow_dispatch input contract: both typed inputs must exist, be
// required, and be typed string.
function checkInputDeclarations(codeLines, violations) {
  const idx = codeLines.findIndex((line) => /^\s*inputs:\s*$/.test(line));
  if (idx === -1) {
    violations.push("workflow_dispatch must declare an `inputs:` block.");
    return;
  }
  const headerIndent = getIndent(codeLines[idx]);
  const body = [];
  for (let i = idx + 1; i < codeLines.length; i += 1) {
    if (getIndent(codeLines[i]) <= headerIndent) break;
    body.push(codeLines[i]);
  }
  if (body.length === 0) {
    violations.push("workflow_dispatch.inputs must declare expected_version and confirm_phrase.");
    return;
  }

  const keyIndent = Math.min(...body.map(getIndent));
  const inputs = {};
  let current = null;
  for (const line of body) {
    if (getIndent(line) === keyIndent) {
      const m = /^\s*([A-Za-z0-9_-]+)\s*:/.exec(line);
      if (m) {
        current = m[1];
        inputs[current] = {};
      }
    } else if (current) {
      const m = /^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/.exec(line);
      if (m) inputs[current][m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }

  for (const name of ["expected_version", "confirm_phrase"]) {
    const decl = inputs[name];
    if (!decl) {
      violations.push(`workflow_dispatch.inputs must declare ${name}.`);
      continue;
    }
    if (decl.required !== "true") {
      violations.push(`workflow_dispatch.inputs.${name}.required must be true (found ${JSON.stringify(decl.required)}).`);
    }
    if (decl.type !== "string") {
      violations.push(`workflow_dispatch.inputs.${name}.type must be string (found ${JSON.stringify(decl.type)}).`);
    }
  }
}

function checkGates(codeText, violations) {
  if (!codeText.includes("refs/heads/main")) {
    violations.push("workflow must gate on the main branch (an explicit `refs/heads/main` check).");
  }
  if (!codeText.includes(CONFIRMATION_PHRASE)) {
    violations.push(`workflow must gate on the exact confirmation phrase ${CONFIRMATION_PHRASE}.`);
  }
  if (!/inputs\.confirm_phrase/.test(codeText)) {
    violations.push("workflow must require and check a typed `confirm_phrase` input.");
  }
  if (!/inputs\.expected_version/.test(codeText)) {
    violations.push("workflow must require and check a typed `expected_version` input.");
  }
  if (!codeText.includes(REVIEWED_PACKAGE_NAME)) {
    violations.push(`workflow must gate on the exact package name ${REVIEWED_PACKAGE_NAME}.`);
  }

  // Both typed inputs must be declared under workflow_dispatch.inputs.
  if (!/expected_version\s*:/.test(codeText)) {
    violations.push("workflow_dispatch must declare an `expected_version` input.");
  }
  if (!/confirm_phrase\s*:/.test(codeText)) {
    violations.push("workflow_dispatch must declare a `confirm_phrase` input.");
  }
}

// Ordering: deterministic install, build, tests, authoritative package
// validation, tarball creation, tarball validation, and SHA-256 must all occur
// before `npm stage publish`.
function checkOrderingAndStaging(codeLines, codeText, violations) {
  const firstIndex = (pattern) => codeLines.findIndex((line) => pattern.test(line));

  const stageIndex = firstIndex(/\bnpm\s+stage\s+publish\b/);
  if (stageIndex === -1) {
    violations.push("workflow must submit the release with `npm stage publish`.");
  }

  const markers = [
    { label: "deterministic install (`npm ci`)", index: firstIndex(/\bnpm\s+ci\b/) },
    { label: "build (`npm run build`)", index: firstIndex(/\bnpm\s+run\s+build\b/) },
    { label: "tests (`npm test`)", index: firstIndex(/\bnpm\s+(?:run\s+)?test\b/) },
    { label: "package-metadata validation", index: firstIndex(/check:package-metadata/) },
    { label: "runtime-dependency validation", index: firstIndex(/check:runtime-deps/) },
    { label: "tarball creation (`npm pack`)", index: firstIndex(/\bnpm\s+pack\b/) },
    { label: "SHA-256 digest", index: firstIndex(/sha256/i) }
  ];

  for (const marker of markers) {
    if (marker.index === -1) {
      violations.push(`workflow must run ${marker.label} before staging.`);
    } else if (stageIndex !== -1 && marker.index > stageIndex) {
      violations.push(`workflow must run ${marker.label} before 'npm stage publish', not after.`);
    }
  }

  if (stageIndex !== -1 && !/--access\s+public/.test(codeText)) {
    violations.push("`npm stage publish` must make public access explicit (`--access public`).");
  }
}

// True when a code fragment references the bound tarball variable in any of the
// accepted shell forms: $TARBALL, ${TARBALL}, "$TARBALL", "${TARBALL}".
function referencesTarballVar(fragment) {
  return new RegExp(`\\$\\{?${TARBALL_VAR}\\}?`).test(fragment);
}

// The staged tarball must be the exact artifact that `npm pack` created and that
// the SHA-256 and allowlist steps validated: bound once to $TARBALL, exported
// across steps, and passed explicitly to the single `npm stage publish`. A bare
// staging command, a re-globbed path, a different variable, or a per-step
// re-derivation each fails closed.
function checkStagedTarball(codeLines, violations) {
  const stageLines = codeLines.filter((line) => /\bnpm\s+stage\s+publish\b/.test(line));
  if (stageLines.length === 0) return; // "missing" is reported by checkOrderingAndStaging
  if (stageLines.length > 1) {
    violations.push(`exactly one executable 'npm stage publish' command is allowed (found ${stageLines.length}).`);
  }

  const stageLine = stageLines[0];
  const argMatch = /\bnpm\s+stage\s+publish\s+(\S+)/.exec(stageLine);
  const firstArg = argMatch ? argMatch[1] : "";
  if (!argMatch || firstArg.startsWith("-")) {
    violations.push(
      `'npm stage publish' must explicitly pass the validated tarball variable "$${TARBALL_VAR}"; a bare command is forbidden.`
    );
  } else {
    const normalized = firstArg.replace(/^["']|["']$/g, "").replace(/^\$\{?/, "").replace(/\}$/, "");
    if (normalized !== TARBALL_VAR) {
      violations.push(
        `'npm stage publish' must reference the established $${TARBALL_VAR} variable, not ${JSON.stringify(firstArg)}.`
      );
    }
  }

  // The tarball must be bound exactly once (an assignment at the start of a
  // line), created by `npm pack`, and exported so later steps share it.
  const bindingIndices = codeLines
    .map((line, index) => (new RegExp(`^\\s*${TARBALL_VAR}=`).test(line) ? index : -1))
    .filter((index) => index !== -1);
  if (bindingIndices.length === 0) {
    violations.push(`the staged tarball must be bound to a $${TARBALL_VAR} variable created by 'npm pack'.`);
  } else if (bindingIndices.length > 1) {
    violations.push(
      `the $${TARBALL_VAR} variable must be bound once and shared, not re-derived per step (found ${bindingIndices.length} assignments).`
    );
  }

  if (!codeLines.some((line) => new RegExp(`${TARBALL_VAR}=.*GITHUB_ENV`).test(line))) {
    violations.push(
      `the bound $${TARBALL_VAR} must be exported to $GITHUB_ENV so every step references the same validated artifact.`
    );
  }

  const firstIndex = (pattern) => codeLines.findIndex((line) => pattern.test(line));
  const packIdx = firstIndex(/\bnpm\s+pack\b/);
  const bindIdx = bindingIndices.length ? bindingIndices[0] : -1;
  const shaIdx = firstIndex(/sha256/i);
  const tarIdx = firstIndex(/tar\s+-tzf/);
  const stageIdx = firstIndex(/\bnpm\s+stage\s+publish\b/);

  if (packIdx !== -1 && bindIdx !== -1 && bindIdx < packIdx) {
    violations.push(`the $${TARBALL_VAR} binding must come after 'npm pack'.`);
  }
  if (shaIdx !== -1 && !referencesTarballVar(codeLines[shaIdx])) {
    violations.push(`the SHA-256 step must hash the bound $${TARBALL_VAR} variable.`);
  }
  if (tarIdx !== -1 && !referencesTarballVar(codeLines[tarIdx])) {
    violations.push(`the tarball-content validation must operate on the bound $${TARBALL_VAR} variable.`);
  }
  if (bindIdx !== -1 && shaIdx !== -1 && shaIdx < bindIdx) {
    violations.push(`SHA-256 must be computed after the $${TARBALL_VAR} binding.`);
  }
  if (bindIdx !== -1 && stageIdx !== -1 && stageIdx < bindIdx) {
    violations.push(`staging must occur after the $${TARBALL_VAR} binding, not before.`);
  }
  if (tarIdx !== -1 && stageIdx !== -1 && stageIdx < tarIdx) {
    violations.push("tarball-content validation must occur before staging.");
  }
}

// Forbidden executable content. Checked against code lines only, so an
// explanatory comment naming a forbidden command is not a violation.
function checkForbiddenCommands(codeText, violations) {
  const forbidden = [
    {
      test: /\bnpm\s+publish\b/,
      message: "direct `npm publish` is forbidden; only `npm stage publish` may appear as an executable command."
    },
    { test: /\bnpm\s+stage\s+approve\b/, message: "`npm stage approve` is forbidden; staged approval is a separate owner action." },
    { test: /\bnpm\s+stage\s+(?:reject|list|view|download)\b/, message: "other `npm stage` subcommands are forbidden here." },
    { test: /NODE_AUTH_TOKEN/, message: "NODE_AUTH_TOKEN must not appear; publication is tokenless via OIDC." },
    { test: /secrets\./, message: "no GitHub secret reference is allowed; publication uses OIDC, not a stored credential." },
    { test: /\bnpm\s+token\b/, message: "`npm token` is forbidden; no publication token is created or used." },
    { test: /\bnpm\s+(?:login|adduser|whoami|profile|org|owner|access|trust)\b/, message: "npm account/registry commands are forbidden in this workflow." },
    { test: /\bnpm\s+view\b/, message: "`npm view` (registry query) is forbidden." },
    { test: /gh\s+release|create-release|action-gh-release|release-action/, message: "GitHub Release creation is forbidden." },
    { test: /\bgit\s+push\b/, message: "`git push` (repository write) is forbidden." },
    { test: /\bgit\s+commit\b/, message: "`git commit` (repository write) is forbidden." },
    { test: /mcp-publisher|server\.json/, message: "MCP Registry operations are forbidden." },
    { test: /\bx402\b/i, message: "x402 operations are forbidden." },
    { test: /\b(payment|settlement|wallet|proof|spend)\b/i, message: "payment/settlement/wallet/proof/spend operations are forbidden." }
  ];

  for (const rule of forbidden) {
    if (rule.test.test(codeText)) {
      violations.push(rule.message);
    }
  }
}

export function readWorkflow(workflowPath) {
  let raw;
  try {
    raw = fs.readFileSync(workflowPath, "utf8");
  } catch (error) {
    throw new MalformedWorkflowError(`release workflow could not be read at ${workflowPath}: ${error.message}`);
  }
  return raw;
}

// Validates the release workflow file. Throws MalformedWorkflowError when the
// file cannot be read. Never runs, publishes, or contacts any external service.
export function analyzeReleaseWorkflow({ workflowPath }) {
  const violations = [];

  if (path.basename(workflowPath) !== EXPECTED_WORKFLOW_BASENAME) {
    violations.push(
      `release workflow must be named ${EXPECTED_WORKFLOW_BASENAME} (found ${JSON.stringify(path.basename(workflowPath))}).`
    );
  }

  const text = readWorkflow(workflowPath);
  const { codeLines } = classifyLines(text);
  const codeText = codeLines.join("\n");

  checkTrigger(codeText, codeLines, violations);
  checkPermissions(codeLines, violations);
  checkRunner(codeText, violations);
  checkNodeVersion(codeText, violations);
  checkNpmPin(codeLines, codeText, violations);
  checkGates(codeText, violations);
  checkInputDeclarations(codeLines, violations);
  checkShellContextInterpolation(codeLines, violations);
  checkActionPins(codeLines, codeText, violations);
  checkOrderingAndStaging(codeLines, codeText, violations);
  checkStagedTarball(codeLines, violations);
  checkForbiddenCommands(codeText, violations);

  return { violations };
}

function isDirectExecution() {
  const entrypoint = process.argv[1];
  return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
}

if (isDirectExecution()) {
  try {
    const result = analyzeReleaseWorkflow({ workflowPath: DEFAULT_WORKFLOW_PATH });

    if (result.violations.length > 0) {
      console.error(`check-release-workflow: FAIL - ${result.violations.length} workflow control violation(s):`);
      for (const violation of result.violations.slice(0, MAX_REPORTED_VIOLATIONS)) {
        console.error(`  - ${violation}`);
      }
      if (result.violations.length > MAX_REPORTED_VIOLATIONS) {
        console.error(`  ... and ${result.violations.length - MAX_REPORTED_VIOLATIONS} more.`);
      }
      process.exit(1);
    }

    console.log(
      `check-release-workflow: PASS - ${RELEASE_WORKFLOW_RELATIVE_PATH} is workflow_dispatch-only, OIDC-scoped, tokenless, stage-publish-only, and gated.`
    );
    console.log(
      "check-release-workflow: scope - static workflow-file inspection only. The workflow was not run; no GitHub Actions, npm, registry, or publication operation occurred."
    );
  } catch (error) {
    if (error instanceof MalformedWorkflowError) {
      console.error(`check-release-workflow: MALFORMED WORKFLOW - ${error.message}`);
    } else {
      console.error(`check-release-workflow: ${error.message}`);
    }
    process.exit(1);
  }
}
