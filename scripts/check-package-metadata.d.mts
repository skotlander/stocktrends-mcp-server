export declare class MalformedManifestError extends Error {}

export declare const REVIEWED_SCOPE: string;
export declare const REVIEWED_NAME: string;
export declare const REVIEWED_VERSION: string;
export declare const REVIEWED_MCP_NAME: string;
export declare const REVIEWED_DESCRIPTION: string;
export declare const REVIEWED_AUTHOR: string;
export declare const REVIEWED_LICENSE: string;
export declare const REVIEWED_HOMEPAGE: string;
export declare const REVIEWED_REPOSITORY: Readonly<{ type: string; url: string }>;
export declare const REVIEWED_GITHUB_REPOSITORY: string;
export declare const REVIEWED_BUGS: Readonly<{ url: string }>;
export declare const REVIEWED_ENGINES: Readonly<{ node: string }>;
export declare const REVIEWED_PUBLISH_CONFIG: Readonly<{ access: string; registry: string }>;
export declare const REVIEWED_FILES: readonly string[];
export declare const REVIEWED_RUNTIME_DEPENDENCIES: Readonly<Record<string, string>>;
export declare const FORBIDDEN_LIFECYCLE_SCRIPTS: readonly string[];

export declare function normalizeSlashes(value: unknown): string;

export declare function parseGitHubRepoIdentity(url: unknown): string | null;

export declare function containsGlob(value: unknown): boolean;

export declare function summarizeValue(value: unknown, maxLength?: number): string;

export declare function deepEqual(actual: unknown, expected: unknown): boolean;

export declare function findDuplicates<T>(values: readonly T[]): T[];

export declare function globToRegExp(pattern: string): RegExp;

export declare function entryMatchesPath(entry: unknown, targetPath: string): boolean;

export declare function isCoveredByFiles(targetPath: string, filesEntries: unknown): boolean;

export declare function isWholeTreeEntry(entry: string): boolean;

export declare function isUnnarrowedGlobEntry(entry: string): boolean;

export declare function isSourceMapEntry(entry: string): boolean;

export declare function isDirectoryWholesaleEntry(entry: unknown, entryPointPaths: readonly string[]): boolean;

export declare function classifyFilesEntry(entry: unknown): string | null;

export interface PackageEntryPointTarget {
  field: string;
  target: unknown;
}

export declare function collectEntryPointTargets(manifest: Record<string, unknown>): PackageEntryPointTarget[];

export declare function readManifest(packageJsonPath: string): Record<string, unknown>;

export interface PackageMetadataResult {
  violations: string[];
}

export declare function analyzePackageMetadata(options: { packageJsonPath: string }): PackageMetadataResult;

export declare function analyzeLockfileIdentity(options: {
  packageJsonPath: string;
  packageLockPath: string;
}): PackageMetadataResult;
