export declare class MalformedRegistryMetadataError extends Error {}

export declare const REVIEWED_SCHEMA: string;
export declare const REVIEWED_MCP_NAME: string;
export declare const REVIEWED_TITLE: string;
export declare const REVIEWED_DESCRIPTION: string;
export declare const REVIEWED_REPOSITORY: Readonly<{ url: string; source: string }>;
export declare const REVIEWED_GITHUB_REPOSITORY: string;
export declare const REVIEWED_VERSION: string;
export declare const REVIEWED_NPM_IDENTIFIER: string;
export declare const REVIEWED_REGISTRY_TYPE: string;
export declare const REVIEWED_TRANSPORT: Readonly<{ type: string }>;
export declare const ALLOWED_TOP_LEVEL_FIELDS: readonly string[];
export declare const ALLOWED_PACKAGE_FIELDS: readonly string[];
export declare const MIN_DESCRIPTION_LENGTH: number;
export declare const MAX_DESCRIPTION_LENGTH: number;
export declare const MIN_TITLE_LENGTH: number;
export declare const MAX_TITLE_LENGTH: number;
export declare const NAME_PATTERN: RegExp;
export declare const MIN_NAME_LENGTH: number;
export declare const MAX_NAME_LENGTH: number;

export declare function summarizeValue(value: unknown, maxLength?: number): string;

export declare function deepEqual(actual: unknown, expected: unknown): boolean;

export declare function parseGitHubRepoIdentity(url: unknown): string | null;

export declare function readJson(filePath: string, label: string): Record<string, unknown>;

export interface RegistryMetadataResult {
  violations: string[];
}

export declare function analyzeServerJson(options: { serverJsonPath: string }): RegistryMetadataResult;

export declare function analyzeRegistryMetadataAgreement(options: {
  serverJsonPath: string;
  packageJsonPath: string;
  packageLockPath: string;
}): RegistryMetadataResult;
