#!/usr/bin/env node
// Statically validates that every external package directly imported by
// compiled runtime JavaScript under dist/ is declared in this package's
// own "dependencies". Run with `npm run check:runtime-deps`.
import { builtinModules } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const DEFAULT_DIST_DIR = path.join(repoRoot, "dist");
const DEFAULT_PACKAGE_JSON_PATH = path.join(repoRoot, "package.json");

export class MissingDistError extends Error {}

// Normalizes a raw module specifier to the external package name it names,
// or null if the specifier is not an external-package import (relative,
// absolute, a file: URL, or a Node builtin).
export function normalizeSpecifier(specifier) {
  if (typeof specifier !== "string" || specifier.length === 0) return null;
  if (specifier.startsWith(".")) return null;
  if (specifier.startsWith("file:")) return null;
  if (specifier.startsWith("node:")) return null;
  if (path.isAbsolute(specifier)) return null;
  if (builtinModules.includes(specifier)) return null;

  const segments = specifier.split("/");
  if (specifier.startsWith("@")) {
    return segments.slice(0, 2).join("/");
  }
  return segments[0];
}

export function listJsFilesRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listJsFilesRecursive(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

// Extracts every bare module specifier referenced by a compiled file via
// static import, side-effect import, `export ... from`, dynamic
// `import("literal")`, or `require("literal")`.
export function extractSpecifiersFromFile(filePath) {
  const sourceText = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  const specifiers = [];

  function visit(node) {
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (ts.isImportCall(node) && node.arguments.length > 0 && ts.isStringLiteralLike(node.arguments[0])) {
      specifiers.push(node.arguments[0].text);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

// Runs the full contract check against an arbitrary dist directory and
// package.json path. Throws MissingDistError if dist is absent or empty.
export function analyzeRuntimeDependencyContract({ distDir, packageJsonPath }) {
  if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
    throw new MissingDistError(`'dist' directory not found at ${distDir}.`);
  }

  const jsFiles = listJsFilesRecursive(distDir);

  if (jsFiles.length === 0) {
    throw new MissingDistError(`No compiled '.js' files found under ${distDir}.`);
  }

  const packageToFirstFile = new Map();
  for (const file of jsFiles) {
    const relFile = path.relative(path.dirname(distDir), file).split(path.sep).join("/");
    for (const specifier of extractSpecifiersFromFile(file)) {
      const pkg = normalizeSpecifier(specifier);
      if (!pkg) continue;
      if (!packageToFirstFile.has(pkg)) {
        packageToFirstFile.set(pkg, relFile);
      }
    }
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const declaredDependencies = new Set(Object.keys(packageJson.dependencies ?? {}));
  const discoveredPackages = Array.from(packageToFirstFile.keys()).sort();
  const undeclaredPackages = discoveredPackages.filter((pkg) => !declaredDependencies.has(pkg));

  return {
    jsFileCount: jsFiles.length,
    discoveredPackages,
    undeclaredPackages,
    packageToFirstFile
  };
}

function isDirectExecution() {
  const entrypoint = process.argv[1];
  return entrypoint ? import.meta.url === pathToFileURL(entrypoint).href : false;
}

if (isDirectExecution()) {
  try {
    const result = analyzeRuntimeDependencyContract({
      distDir: DEFAULT_DIST_DIR,
      packageJsonPath: DEFAULT_PACKAGE_JSON_PATH
    });

    console.log(`check-runtime-dependency-contract: scanned ${result.jsFileCount} compiled file(s) under dist/.`);
    console.log(
      `check-runtime-dependency-contract: discovered external package(s): ${
        result.discoveredPackages.length === 0 ? "(none)" : result.discoveredPackages.join(", ")
      }`
    );

    if (result.undeclaredPackages.length > 0) {
      console.error("check-runtime-dependency-contract: FAIL - undeclared direct runtime dependency import(s):");
      for (const pkg of result.undeclaredPackages) {
        console.error(`  - ${pkg} (first seen in ${result.packageToFirstFile.get(pkg)})`);
      }
      console.error(
        'Each package listed above is imported directly by compiled runtime JavaScript but does not appear in ' +
          'this package\'s "dependencies". Add it there (not "devDependencies") to close the contract.'
      );
      process.exit(1);
    }

    console.log(
      'check-runtime-dependency-contract: PASS - every directly imported external package is declared in "dependencies".'
    );
  } catch (error) {
    if (error instanceof MissingDistError) {
      console.error(
        `check-runtime-dependency-contract: ${error.message}\n` +
          "Run `npm run build` before `npm run check:runtime-deps`."
      );
    } else {
      console.error(`check-runtime-dependency-contract: ${error.message}`);
    }
    process.exit(1);
  }
}
