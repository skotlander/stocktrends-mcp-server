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
    '          if [ "${{ github.ref }}" != "refs/heads/main" ]; then exit 1; fi',
    "      - name: confirm gate",
    "        run: |",
    '          if [ "${{ inputs.confirm_phrase }}" != "STAGE_STOCKTRENDS_NPM_RELEASE" ]; then exit 1; fi',
    "      - uses: actions/setup-node@v4",
    "        with:",
    "          node-version: '24'",
    "      - name: npm floor",
    "        run: npm install -g npm@^11.15.0",
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

    it("fails when the npm 11.15.0 floor is absent", () => {
      const content = validWorkflow().replace("npm install -g npm@^11.15.0", "npm install -g npm@latest");
      const violations = violationsForWorkflow(content);

      expect(violations.some((v) => v.includes("11.15.0"))).toBe(true);
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

    it("fails when staging is ordered before the build", () => {
      const content = [
        "name: bad order",
        "on:",
        "  workflow_dispatch:",
        "    inputs:",
        "      expected_version:",
        "        required: true",
        "      confirm_phrase:",
        "        required: true",
        "permissions:",
        "  contents: read",
        "  id-token: write",
        "jobs:",
        "  stage:",
        "    runs-on: ubuntu-24.04",
        "    steps:",
        '      - run: if [ "${{ github.ref }}" != "refs/heads/main" ]; then exit 1; fi',
        '      - run: if [ "${{ inputs.confirm_phrase }}" != "STAGE_STOCKTRENDS_NPM_RELEASE" ]; then exit 1; fi',
        "      - uses: actions/setup-node@v4",
        "        with:",
        "          node-version: '24'",
        "      - run: npm install -g npm@^11.15.0",
        "      - run: npm ci",
        '      - run: echo "@stocktrends-publications/stocktrends-mcp-server ${{ inputs.expected_version }}"',
        "      - run: |",
        "          npm pack",
        '          TARBALL="$(ls -1 ./*.tgz | head -n1)"',
        '          echo "TARBALL=$TARBALL" >> "$GITHUB_ENV"',
        '      - run: sha256sum "$TARBALL"',
        '      - run: tar -tzf "$TARBALL" > /dev/null',
        '      - run: npm stage publish "$TARBALL" --access public',
        "      - run: npm run build",
        "      - run: npm test",
        "      - run: npm run check:runtime-deps",
        "      - run: npm run check:package-metadata"
      ].join("\n");
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
