export declare class MissingDistError extends Error {}

export declare function normalizeSpecifier(specifier: string): string | null;

export declare function listJsFilesRecursive(dir: string): string[];

export declare function extractSpecifiersFromFile(filePath: string): string[];

export interface RuntimeDependencyContractResult {
  jsFileCount: number;
  discoveredPackages: string[];
  undeclaredPackages: string[];
  packageToFirstFile: Map<string, string>;
}

export declare function analyzeRuntimeDependencyContract(options: {
  distDir: string;
  packageJsonPath: string;
}): RuntimeDependencyContractResult;
