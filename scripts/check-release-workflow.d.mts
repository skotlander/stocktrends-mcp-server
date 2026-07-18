export declare class MalformedWorkflowError extends Error {}

export declare const RELEASE_WORKFLOW_RELATIVE_PATH: string;
export declare const EXPECTED_WORKFLOW_BASENAME: string;
export declare const CONFIRMATION_PHRASE: string;
export declare const REVIEWED_PACKAGE_NAME: string;
export declare const REQUIRED_NPM_VERSION: string;
export declare const REQUIRED_NODE_MAJOR: string;
export declare const REQUIRED_CHECKOUT_ACTION: string;
export declare const REQUIRED_CHECKOUT_SHA: string;
export declare const REQUIRED_SETUP_NODE_ACTION: string;
export declare const REQUIRED_SETUP_NODE_SHA: string;
export declare const APPROVED_ACTION_SHAS: Readonly<Record<string, string>>;
export declare const TARBALL_VAR: string;
export declare const REQUIRED_PERMISSIONS: Readonly<Record<string, string>>;
export declare const FORBIDDEN_TRIGGERS: readonly string[];

export declare function getIndent(line: string): number;

export declare function stripInlineComment(line: string): string;

export declare function isCommentLine(line: string): boolean;

export interface ClassifiedLines {
  rawLines: string[];
  codeLines: string[];
}

export declare function classifyLines(text: string): ClassifiedLines;

export interface TopLevelBlock {
  header: string;
  inline: string;
  body: string[];
}

export declare function extractTopLevelBlock(codeLines: readonly string[], key: string): TopLevelBlock | null;

export declare function directChildKeys(body: readonly string[]): string[];

export declare function readWorkflow(workflowPath: string): string;

export interface ReleaseWorkflowResult {
  violations: string[];
}

export declare function analyzeReleaseWorkflow(options: { workflowPath: string }): ReleaseWorkflowResult;
