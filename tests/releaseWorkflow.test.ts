import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  analyzeReleaseWorkflow,
  classifyLines,
  MalformedWorkflowError,
  stripInlineComment
} from "../scripts/check-release-workflow.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

// A compact, known-good workflow that satisfies every control the checker
// enforces. Negative cases mutate this string. It is spelled out here rather
// than derived from the shipped file so the test pins the contract independently.
function validWorkflow(): string {
  return [
    "name: test stage release",
    "on:",
    "  workflow_dispatch:",
    "    inputs:",
    "      expected_version:",
    "        required: true",
    "        type: string",
    "      confirm_phrase:",
    "        required: true",
    "        type: string",
    "permissions:",
    "  contents: read",
    "  id-token: write",
    "jobs:",
    "  stage-release:",
    "    runs-on: ubuntu-24.04",
    "    steps:",
    "      - name: main gate",
    "        run: |",
    '          if [ "$GITHUB_REF" != "refs/heads/main" ]; then exit 1; fi',
    "      - name: confirm gate",
    "        env:",
    "          CONFIRM_PHRASE: ${{ inputs.confirm_phrase }}",
    "        run: |",
    '          if [ "$CONFIRM_PHRASE" != "STAGE_STOCKTRENDS_NPM_RELEASE" ]; then exit 1; fi',
    "      - name: checkout",
    "        uses: actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3",
    "        with:",
    "          persist-credentials: false",
    "      - name: setup node",
    "        uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6.5.0",
    "        with:",
    "          node-version: '24'",
    "          registry-url: 'https://registry.npmjs.org/'",
    "          package-manager-cache: false",
    "      - name: npm pin",
    "        run: |",
    "          npm install -g npm@11.18.0",
    '          EXPECTED="11.18.0"',
    '          CUR="$(npm --version)"',
    '          if [ "$CUR" != "$EXPECTED" ]; then exit 1; fi',
    "      - name: install",
    "        run: npm ci",
    "      - name: build",
    "        run: npm run build",
    "      - name: test",
    "        run: npm test",
    "      - name: deps",
    "        run: npm run check:runtime-deps",
    "      - name: metadata",
    "        run: npm run check:package-metadata",
    "      - name: registry metadata",
    "        run: npm run check:mcp-registry-metadata",
    "      - name: verify identity",
    "        env:",
    "          EXPECTED_VERSION: ${{ inputs.expected_version }}",
    "        run: |",
    '          echo "verify @stocktrends-publications/stocktrends-mcp-server $EXPECTED_VERSION"',
    "      - name: pack",
    "        run: |",
    "          npm pack",
    '          TARBALL="$(ls -1 ./*.tgz | head -n1)"',
    '          echo "TARBALL=$TARBALL" >> "$GITHUB_ENV"',
    "      - name: digest",
    '        run: sha256sum "$TARBALL"',
    "      - name: allowlist",
    '        run: tar -tzf "$TARBALL" > /dev/null',
    "      - name: stage",
    '        run: npm stage publish "$TARBALL" --access public'
  ].join("\n");
}

function writeWorkflow(content: string, basename = "npm-stage-release.yml"): string {
  const root = mkdtempSync(path.join(tmpdir(), "release-workflow-"));
  tempDirs.push(root);
  const workflowPath = path.join(root, basename);
  writeFileSync(workflowPath, content, "utf8");
  return workflowPath;
}

function violationsForWorkflow(content: string, basename?: string): string[] {
  return analyzeReleaseWorkflow({ workflowPath: writeWorkflow(content, basename) }).violations;
}

describe("release workflow control check", () => {
  it("passes for the compact valid workflow", () => {
    expect(violationsForWorkflow(validWorkflow())).toEqual([]);
  });

  it("passes for this repository's actual release workflow", () => {
    const workflowPath = path.resolve(__dirname, "../.github/workflows/npm-stage-release.yml");

    expect(analyzeReleaseWorkflow({ workflowPath }).violations).toEqual([]);
  });

  describe("triggers", () => {
    it("fails when a push trigger is added", () => {
      const content = validWorkflow().replace("on:\n", "on:\n  push:\n    branches: [main]\n");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("push"))).toBe(true);
    });

    it("fails when a pull_request trigger is added", () => {
      const content = validWorkflow().replace("on:\n", "on:\n  pull_request:\n");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("pull_request"))).toBe(true);
    });

    it("fails when a schedule trigger is added", () => {
      const content = validWorkflow().replace("on:\n", "on:\n  schedule:\n    - cron: '0 0 * * *'\n");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("schedule"))).toBe(true);
    });

    it("fails when a release trigger is added", () => {
      const content = validWorkflow().replace("on:\n", "on:\n  release:\n    types: [published]\n");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("release"))).toBe(true);
    });
  });

  describe("permissions", () => {
    it("fails when contents is write instead of read", () => {
      const content = validWorkflow().replace("  contents: read", "  contents: write");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("permissions.contents"))).toBe(true);
    });

    it("fails when id-token: write is missing", () => {
      const content = validWorkflow().replace("  id-token: write\n", "");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("id-token"))).toBe(true);
    });

    it("fails when an extra write permission is granted", () => {
      const content = validWorkflow().replace("  id-token: write", "  id-token: write\n  packages: write");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("extra permission") && v.includes("packages"))).toBe(true);
    });
  });

  describe("runner and toolchain", () => {
    it("fails on a self-hosted runner", () => {
      const content = validWorkflow().replace("runs-on: ubuntu-24.04", "runs-on: self-hosted");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("self-hosted") || v.includes("GitHub-hosted"))).toBe(true);
    });

    it("fails when Node is not 24", () => {
      const content = validWorkflow().replace("node-version: '24'", "node-version: '20'");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("node-version must be 24"))).toBe(true);
    });

  });

  describe("npm CLI exact pin (11.18.0)", () => {
    it("fails on a caret range install", () => {
      const content = validWorkflow().replace("npm install -g npm@11.18.0", "npm install -g npm@^11.18.0");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("pinned exactly to 11.18.0"))).toBe(true);
    });

    it("fails on a tilde range install", () => {
      const content = validWorkflow().replace("npm install -g npm@11.18.0", "npm install -g npm@~11.18.0");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("pinned exactly to 11.18.0"))).toBe(true);
    });

    it("fails on a moving `latest` tag install", () => {
      const content = validWorkflow().replace("npm install -g npm@11.18.0", "npm install -g npm@latest");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("pinned exactly to 11.18.0"))).toBe(true);
    });

    it("fails on a different exact version", () => {
      const content = validWorkflow()
        .replace("npm install -g npm@11.18.0", "npm install -g npm@11.17.0")
        .replace('EXPECTED="11.18.0"', 'EXPECTED="11.17.0"');
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("install npm exactly as npm@11.18.0"))).toBe(true);
    });

    it("fails when the exact version-equality assertion is absent", () => {
      const content = validWorkflow().replace(
        '          EXPECTED="11.18.0"\n          CUR="$(npm --version)"\n          if [ "$CUR" != "$EXPECTED" ]; then exit 1; fi',
        '          echo "installed npm"'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("equals exactly 11.18.0"))).toBe(true);
    });

    it("fails when the npm pin is placed after staging", () => {
      const withoutPin = validWorkflow().replace(
        '      - name: npm pin\n        run: |\n          npm install -g npm@11.18.0\n          EXPECTED="11.18.0"\n          CUR="$(npm --version)"\n          if [ "$CUR" != "$EXPECTED" ]; then exit 1; fi\n',
        ""
      );
      const content = withoutPin.replace(
        '        run: npm stage publish "$TARBALL" --access public',
        '        run: |\n          npm stage publish "$TARBALL" --access public\n      - name: npm pin\n        run: |\n          npm install -g npm@11.18.0\n          EXPECTED="11.18.0"\n          CUR="$(npm --version)"\n          if [ "$CUR" != "$EXPECTED" ]; then exit 1; fi'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("before 'npm stage publish'"))).toBe(true);
    });
  });

  describe("gates", () => {
    it("fails when the main-branch gate is removed", () => {
      const content = validWorkflow().replace("refs/heads/main", "refs/heads/release");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("main branch"))).toBe(true);
    });

    it("fails when the confirmation phrase is wrong", () => {
      const content = validWorkflow().replace("STAGE_STOCKTRENDS_NPM_RELEASE", "STAGE_IT_NOW");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("confirmation phrase"))).toBe(true);
    });

    it("fails when the expected_version input is removed", () => {
      const content = validWorkflow()
        .replace("      expected_version:\n        required: true\n        type: string\n", "")
        .replace("          EXPECTED_VERSION: ${{ inputs.expected_version }}\n", "");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("expected_version"))).toBe(true);
    });

    it("fails when the exact package name gate is missing", () => {
      const content = validWorkflow().replace(
        "@stocktrends-publications/stocktrends-mcp-server",
        "some-other-package"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("exact package name"))).toBe(true);
    });
  });

  describe("staging command and ordering", () => {
    it("fails when npm stage publish is missing", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        "        run: echo done"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("npm stage publish"))).toBe(true);
    });

    it("fails when --access public is not explicit", () => {
      const content = validWorkflow().replace(
        'npm stage publish "$TARBALL" --access public',
        'npm stage publish "$TARBALL"'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("--access public"))).toBe(true);
    });

    it("fails when npm pack is missing before staging", () => {
      const content = validWorkflow().replace("          npm pack\n", "          echo skip-pack\n");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("tarball creation"))).toBe(true);
    });

    it("fails when the SHA-256 digest step is missing", () => {
      const content = validWorkflow().replace('        run: sha256sum "$TARBALL"', '        run: ls "$TARBALL"');
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("SHA-256"))).toBe(true);
    });

    it("fails when MCP Registry metadata validation is missing", () => {
      const content = validWorkflow().replace(
        "      - name: registry metadata\n        run: npm run check:mcp-registry-metadata\n",
        ""
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("MCP Registry metadata validation"))).toBe(true);
    });

    it("fails when MCP Registry metadata validation runs after npm pack", () => {
      const withoutStep = validWorkflow().replace(
        "      - name: registry metadata\n        run: npm run check:mcp-registry-metadata\n",
        ""
      );
      const content = withoutStep.replace(
        '          echo "TARBALL=$TARBALL" >> "$GITHUB_ENV"\n',
        '          echo "TARBALL=$TARBALL" >> "$GITHUB_ENV"\n      - name: registry metadata\n        run: npm run check:mcp-registry-metadata\n'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("before tarball creation"))).toBe(true);
    });

    it("fails when MCP Registry metadata validation runs before dependency installation", () => {
      const withoutStep = validWorkflow().replace(
        "      - name: registry metadata\n        run: npm run check:mcp-registry-metadata\n",
        ""
      );
      const content = withoutStep.replace(
        "      - name: install\n        run: npm ci\n",
        "      - name: registry metadata\n        run: npm run check:mcp-registry-metadata\n      - name: install\n        run: npm ci\n"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("after dependency installation"))).toBe(true);
    });

    it("fails when staging is ordered before the build", () => {
      // Secure primitives throughout; only the build/test/validation ordering is
      // wrong (placed after staging), so the ordering violation is isolated.
      const content = validWorkflow()
        .replace("      - name: build\n        run: npm run build\n", "")
        .replace("      - name: test\n        run: npm test\n", "")
        .replace("      - name: deps\n        run: npm run check:runtime-deps\n", "")
        .replace("      - name: metadata\n        run: npm run check:package-metadata\n", "")
        .replace(
          '        run: npm stage publish "$TARBALL" --access public',
          [
            '        run: npm stage publish "$TARBALL" --access public',
            "      - name: build",
            "        run: npm run build",
            "      - name: test",
            "        run: npm test",
            "      - name: deps",
            "        run: npm run check:runtime-deps",
            "      - name: metadata",
            "        run: npm run check:package-metadata"
          ].join("\n")
        );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("before 'npm stage publish'"))).toBe(true);
    });

    it("fails when npm stage publish is bare (no tarball argument)", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        "        run: npm stage publish --access public"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("a bare command is forbidden"))).toBe(true);
    });

    it("fails when staging references a re-globbed path instead of the bound variable", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        "        run: npm stage publish ./pkg.tgz --access public"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("must reference the established $TARBALL variable"))).toBe(true);
    });

    it("fails when staging references a different variable", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        '        run: npm stage publish "$OTHER" --access public'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("must reference the established $TARBALL variable"))).toBe(true);
    });

    it("fails when two npm stage publish commands exist", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        '        run: |\n          npm stage publish "$TARBALL" --access public\n          npm stage publish "$TARBALL" --access public'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("exactly one executable 'npm stage publish'"))).toBe(true);
    });

    it("fails when the tarball variable is never bound", () => {
      const content = validWorkflow().replace(
        '          TARBALL="$(ls -1 ./*.tgz | head -n1)"\n          echo "TARBALL=$TARBALL" >> "$GITHUB_ENV"\n',
        ""
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("must be bound to a $TARBALL variable"))).toBe(true);
    });

    it("fails when the tarball variable is re-derived per step", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        '        run: |\n          TARBALL="$(ls -1 ./*.tgz | head -n1)"\n          npm stage publish "$TARBALL" --access public'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("must be bound once and shared, not re-derived per step"))).toBe(true);
    });

    it("fails when the bound tarball is not exported to $GITHUB_ENV", () => {
      const content = validWorkflow().replace(
        '          echo "TARBALL=$TARBALL" >> "$GITHUB_ENV"\n',
        ""
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("must be exported to $GITHUB_ENV"))).toBe(true);
    });
  });

  describe("shell context interpolation (Issue 1)", () => {
    it("passes when inputs and github context are used only in env: mappings", () => {
      // The valid workflow already reads confirm_phrase and expected_version via
      // env: mappings and uses $GITHUB_REF in shell -- no direct interpolation.
      expect(violationsForWorkflow(validWorkflow())).toEqual([]);
    });

    it("fails on direct ${{ inputs.confirm_phrase }} interpolation in a shell command", () => {
      const content = validWorkflow().replace(
        '          if [ "$CONFIRM_PHRASE" != "STAGE_STOCKTRENDS_NPM_RELEASE" ]; then exit 1; fi',
        '          if [ "${{ inputs.confirm_phrase }}" != "STAGE_STOCKTRENDS_NPM_RELEASE" ]; then exit 1; fi'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("${{ inputs.* }}"))).toBe(true);
    });

    it("fails on direct ${{ github.ref }} interpolation in a shell command", () => {
      const content = validWorkflow().replace(
        '          if [ "$GITHUB_REF" != "refs/heads/main" ]; then exit 1; fi',
        '          if [ "${{ github.ref }}" != "refs/heads/main" ]; then exit 1; fi'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("${{ github.* }}"))).toBe(true);
    });

    it("does not flag ${{ inputs.* }} when it appears only in an env: mapping", () => {
      // Move confirm_phrase into an env mapping on the main-gate step too; still
      // never interpolated into shell. Must remain clean.
      const content = validWorkflow().replace(
        "      - name: main gate\n        run: |",
        "      - name: main gate\n        env:\n          REF_NOTE: ${{ github.ref }}\n        run: |"
      );
      const violations = violationsForWorkflow(content);

      expect(violations).toEqual([]);
    });
  });

  describe("action pinning to immutable full SHAs (Issue 2)", () => {
    it("fails on a mutable major tag for checkout", () => {
      const content = validWorkflow().replace(
        "actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3",
        "actions/checkout@v6"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("actions/checkout must be pinned"))).toBe(true);
    });

    it("fails on a mutable major tag for setup-node", () => {
      const content = validWorkflow().replace(
        "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38 # v6.5.0",
        "actions/setup-node@v6"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("actions/setup-node must be pinned"))).toBe(true);
    });

    it("fails on an abbreviated SHA", () => {
      const content = validWorkflow().replace(
        "actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3",
        "actions/checkout@df4cb1c"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("actions/checkout must be pinned"))).toBe(true);
    });

    it("fails on a different full SHA", () => {
      const content = validWorkflow().replace(
        "actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6.0.3",
        "actions/checkout@0000000000000000000000000000000000000000"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("a different full SHA"))).toBe(true);
    });

    it("fails on an unapproved external action", () => {
      const content = validWorkflow().replace(
        "      - name: install\n        run: npm ci",
        "      - name: extra\n        uses: some/other-action@1111111111111111111111111111111111111111\n      - name: install\n        run: npm ci"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("is not allowed"))).toBe(true);
    });

    it("fails when persist-credentials: false is missing", () => {
      const content = validWorkflow().replace("          persist-credentials: false\n", "");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("persist-credentials: false"))).toBe(true);
    });

    it("fails when package-manager-cache: false is missing", () => {
      const content = validWorkflow().replace("          package-manager-cache: false\n", "");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("package-manager-cache: false"))).toBe(true);
    });
  });

  describe("workflow_dispatch input declarations", () => {
    it("fails when expected_version is missing", () => {
      const content = validWorkflow().replace(
        "      expected_version:\n        required: true\n        type: string\n",
        ""
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("inputs must declare expected_version"))).toBe(true);
    });

    it("fails when expected_version.required is not true", () => {
      const content = validWorkflow().replace(
        "      expected_version:\n        required: true\n        type: string\n",
        "      expected_version:\n        required: false\n        type: string\n"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("expected_version.required must be true"))).toBe(true);
    });

    it("fails when expected_version.type is not string", () => {
      const content = validWorkflow().replace(
        "      expected_version:\n        required: true\n        type: string\n",
        "      expected_version:\n        required: true\n        type: boolean\n"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("expected_version.type must be string"))).toBe(true);
    });

    it("fails when confirm_phrase is missing", () => {
      const content = validWorkflow().replace(
        "      confirm_phrase:\n        required: true\n        type: string\n",
        ""
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("inputs must declare confirm_phrase"))).toBe(true);
    });

    it("fails when confirm_phrase.required is not true", () => {
      const content = validWorkflow().replace(
        "      confirm_phrase:\n        required: true\n        type: string\n",
        "      confirm_phrase:\n        required: false\n        type: string\n"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("confirm_phrase.required must be true"))).toBe(true);
    });

    it("fails when confirm_phrase.type is not string", () => {
      const content = validWorkflow().replace(
        "      confirm_phrase:\n        required: true\n        type: string\n",
        "      confirm_phrase:\n        required: true\n        type: number\n"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("confirm_phrase.type must be string"))).toBe(true);
    });
  });

  describe("forbidden executable content (code lines only)", () => {
    it("fails when a direct npm publish is present as a command", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        '        run: npm publish "$TARBALL" --access public'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("direct `npm publish`"))).toBe(true);
    });

    it("fails when npm stage approve is present as a command", () => {
      const content = validWorkflow().replace(
        '        run: npm stage publish "$TARBALL" --access public',
        '        run: |\n          npm stage publish "$TARBALL" --access public\n          npm stage approve'
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("npm stage approve"))).toBe(true);
    });

    it("fails when NODE_AUTH_TOKEN appears in a command", () => {
      const content = validWorkflow().replace(
        "        run: npm ci",
        "        env:\n          NODE_AUTH_TOKEN: xyz\n        run: npm ci"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("NODE_AUTH_TOKEN"))).toBe(true);
    });

    it("fails when a GitHub secret is referenced", () => {
      const content = validWorkflow().replace(
        "        run: npm ci",
        "        env:\n          TOKEN: ${{ secrets.NPM_TOKEN }}\n        run: npm ci"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("secret"))).toBe(true);
    });

    it("fails when a GitHub Release is created", () => {
      const content = validWorkflow().replace(
        "          npm pack\n",
        "          npm pack\n          gh release create v1.0.0\n"
      );
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("GitHub Release"))).toBe(true);
    });

    it("does NOT flag forbidden commands that appear only in explanatory comments", () => {
      const documented = [
        "# This workflow never runs a direct npm publish.",
        "# It never runs npm stage approve (that is a separate 2FA owner action).",
        "# It uses no NODE_AUTH_TOKEN and no secrets.NPM_TOKEN, and creates no gh release.",
        "# It performs no x402, payment, settlement, wallet, proof, or spend operation.",
        validWorkflow()
      ].join("\n");

      expect(violationsForWorkflow(documented)).toEqual([]);
    });
  });

  describe("path and malformed handling", () => {
    it("fails when the workflow filename is wrong", () => {
      const violations = violationsForWorkflow(validWorkflow(), "release.yml");

      expect(violations.some((v) => v.includes("must be named npm-stage-release.yml"))).toBe(true);
    });

    it("throws MalformedWorkflowError when the file cannot be read", () => {
      const root = mkdtempSync(path.join(tmpdir(), "release-workflow-"));
      tempDirs.push(root);

      expect(() =>
        analyzeReleaseWorkflow({ workflowPath: path.join(root, "npm-stage-release.yml") })
      ).toThrow(MalformedWorkflowError);
    });
  });

  describe("line classification helpers", () => {
    it("treats a full-line # as a comment and drops it from code", () => {
      const { codeLines } = classifyLines("# a comment\n  run: npm ci\n");

      expect(codeLines).toEqual(["  run: npm ci"]);
    });

    it("strips an inline comment but keeps quoted # characters", () => {
      expect(stripInlineComment("  run: npm ci # trailing note").trim()).toBe("run: npm ci");
      expect(stripInlineComment("        run: sed 's#^package/##'")).toContain("s#^package/##");
    });
  });
});
