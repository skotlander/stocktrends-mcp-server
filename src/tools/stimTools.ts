import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { StockTrendsMcpConfig } from "../config.js";
import {
  evaluatePaidInvocationPreflight,
  type PaidAuthConfig,
  type PaidHttpMethod,
  type PaidInvocationDenialReason,
  type PaidInvocationPreflightResult,
  type PaidSpendPolicy
} from "../paidPolicy.js";
import type { StockTrendsClient } from "../stocktrendsClient.js";

// --- Confirmed contract constants (see PHASE4_FIRST_PAID_STIM_TOOL_PREFLIGHT_DESIGN_MEMO.md) ---

export const STIM_LATEST_TOOL_NAME = "stocktrends_get_stim_latest";
export const STIM_HISTORY_TOOL_NAME = "stocktrends_get_stim_history";

export const STIM_LATEST_ENDPOINT_PATH = "/v1/stim/latest";
export const STIM_HISTORY_ENDPOINT_PATH = "/v1/stim/history";

export const STIM_HTTP_METHOD: PaidHttpMethod = "GET";

// Confirmed API `VALID_EXCHANGES`. Local static mirror; fail closed on anything else.
export const VALID_STIM_EXCHANGES = ["N", "Q", "A", "B", "T", "I"] as const;

// Confirmed API history `limit` bounds: Query(default=260, ge=1, le=2600).
// MCP enforces the API min/max locally and never sends a `limit` above 2600.
export const STIM_HISTORY_LIMIT_MIN = 1;
export const STIM_HISTORY_LIMIT_MAX = 2600;

// Strict, deterministic identity patterns. Uppercase canonical symbols only;
// exchange suffix must be one of the confirmed single-letter exchange codes.
// Trimming whitespace is the only normalization applied (no silent rewriting).
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}$/;
const SYMBOL_EXCHANGE_PATTERN = /^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export interface PaidStimToolDefinition {
  name: typeof STIM_LATEST_TOOL_NAME | typeof STIM_HISTORY_TOOL_NAME;
  endpointPath: typeof STIM_LATEST_ENDPOINT_PATH | typeof STIM_HISTORY_ENDPOINT_PATH;
  httpMethod: typeof STIM_HTTP_METHOD;
  access: "paid";
  pairedWith: typeof STIM_LATEST_TOOL_NAME | typeof STIM_HISTORY_TOOL_NAME;
  paidExecutionAuthorized: false;
}

// The two paired paid ST-IM tools. `latest` must never ship without `history`
// (history-beside-latest rule); they are registered together or not at all.
export const PAID_STIM_TOOL_DEFINITIONS: readonly PaidStimToolDefinition[] = Object.freeze([
  {
    name: STIM_LATEST_TOOL_NAME,
    endpointPath: STIM_LATEST_ENDPOINT_PATH,
    httpMethod: STIM_HTTP_METHOD,
    access: "paid",
    pairedWith: STIM_HISTORY_TOOL_NAME,
    paidExecutionAuthorized: false
  },
  {
    name: STIM_HISTORY_TOOL_NAME,
    endpointPath: STIM_HISTORY_ENDPOINT_PATH,
    httpMethod: STIM_HTTP_METHOD,
    access: "paid",
    pairedWith: STIM_LATEST_TOOL_NAME,
    paidExecutionAuthorized: false
  }
]);

export const PAID_STIM_TOOL_NAMES: readonly string[] = Object.freeze(PAID_STIM_TOOL_DEFINITIONS.map((tool) => tool.name));

// --- Input schemas (strict; single-field constraints validated at the SDK boundary) ---
//
// Cross-field rules (symbol-identity presence/precedence and start<=end) are
// enforced in the handler *before* any preflight/network step, and surface a
// deterministic `invalid_tool_input` error code.

const symbolExchangeField = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(SYMBOL_EXCHANGE_PATTERN, "symbol_exchange must be canonical uppercase SYMBOL_EXCHANGE (exchange one of N,Q,A,B,T,I).")
  .optional();

const symbolField = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(SYMBOL_PATTERN, "symbol must be canonical uppercase alphanumeric.")
  .optional();

const exchangeField = z.enum(VALID_STIM_EXCHANGES).optional();

export const stimLatestInputSchema = z
  .object({
    symbol_exchange: symbolExchangeField,
    symbol: symbolField,
    exchange: exchangeField
  })
  .strict();

export const stimHistoryInputSchema = z
  .object({
    symbol_exchange: symbolExchangeField,
    symbol: symbolField,
    exchange: exchangeField,
    start: z.string().regex(DATE_PATTERN, "start must be a YYYY-MM-DD date.").optional(),
    end: z.string().regex(DATE_PATTERN, "end must be a YYYY-MM-DD date.").optional(),
    limit: z.number().int().min(STIM_HISTORY_LIMIT_MIN).max(STIM_HISTORY_LIMIT_MAX).optional(),
    include_gaps: z.boolean().optional()
  })
  .strict();

type StimLatestInput = z.infer<typeof stimLatestInputSchema>;
type StimHistoryInput = z.infer<typeof stimHistoryInputSchema>;

// --- Error taxonomy (tool-facing, deterministic, secret-free) ---

export type StimToolErrorCode =
  | "paid_tools_disabled"
  | "paid_auth_blocked_missing_api_key"
  | "invalid_tool_input"
  | "endpoint_not_allowlisted"
  | "host_not_approved"
  | "pricing_preflight_unavailable"
  | "spend_cap_exceeded"
  | "paid_execution_disabled"
  | "unexpected_auth_attempt";

const DENIAL_REASON_TO_ERROR_CODE: Record<PaidInvocationDenialReason, StimToolErrorCode> = {
  paid_tools_disabled: "paid_tools_disabled",
  paid_auth_blocked_missing_api_key: "paid_auth_blocked_missing_api_key",
  endpoint_not_allowlisted: "endpoint_not_allowlisted",
  tool_endpoint_mismatch: "endpoint_not_allowlisted",
  host_not_approved: "host_not_approved",
  paid_execution_disabled: "paid_execution_disabled"
};

class StimToolInputError extends Error {
  constructor(readonly errorCode: "invalid_tool_input", message: string) {
    super(message);
    this.name = "StimToolInputError";
  }
}

// --- Output wrapper scaffolding for later (separately reviewed) execution ---
//
// These shapes describe what an authorized paid ST-IM response wrapper will look
// like once execution is enabled. No success path is reachable in this build;
// the types exist so the future execution branch has a stable contract.

export interface PaidStimPreflightSummary {
  endpoint_allowlisted: boolean;
  tool_allowlisted: boolean;
  host_approved: boolean;
  paid_mode_configured: boolean;
  pricing_source: string | null;
  estimated_cost: { amount: number; unit: string } | null;
  hard_execution_gate_enabled: boolean;
  local_authorization_decision: "allow" | "deny";
  denial_reason: StimToolErrorCode | null;
}

export interface PaidStimLocalCapStatus {
  max_paid_calls_per_session: number;
  max_paid_calls_per_tool: number;
  max_stc_per_session: number | null;
  max_usd_per_session: number | null;
  automatic_paid_retries: false;
}

export interface PaidStimSymbolIdentity {
  symbol: string | null;
  exchange: string | null;
  symbol_exchange: string;
  identity_source: "symbol_exchange" | "symbol_and_exchange";
}

export interface PaidStimToolMetadata {
  tool_name: string;
  endpoint_path: string;
  http_method: typeof STIM_HTTP_METHOD;
  source: "stocktrends_api";
  symbol_identity: PaidStimSymbolIdentity;
  request_parameters: Record<string, unknown>;
  preflight_decision_summary: PaidStimPreflightSummary;
  local_budget_cap_status: PaidStimLocalCapStatus;
  request_id: string | null;
  pricing_rule: string | null;
  observed_cost: null;
  payment_status: null;
  authoritative_for: string;
  not_authoritative_for: string[];
  fetched_at: string | null;
  paid_execution_authorized: boolean;
  warnings: string[];
  limitations: string[];
}

// Future authorized-execution wrapper (unreachable in this foundation build).
export interface PaidStimSuccessWrapper {
  api_data: Record<string, unknown>;
  mcp_metadata: PaidStimToolMetadata & { paid_execution_authorized: true };
}

// Denial wrapper returned by every invocation in this build.
export interface PaidStimDenialWrapper {
  error: {
    error_code: StimToolErrorCode;
    message: string;
    tool_name: string;
    endpoint_path: string;
    http_method: typeof STIM_HTTP_METHOD;
    denial_reason: StimToolErrorCode;
  };
  mcp_metadata: PaidStimToolMetadata;
  paid_execution_authorized: false;
  paid_execution_occurred: false;
  api_request_sent: false;
  auth_header_sent: false;
  payment_header_sent: false;
}

// --- Registration ---

export function registerPaidStimTools(server: McpServer, client: StockTrendsClient, config: StockTrendsMcpConfig): void {
  // Paired paid ST-IM tool *definitions* are only exposed when paid mode is
  // explicitly enabled AND an API key is configured (Phase 3/4 paid-mode
  // policy). API key alone, paid flag alone, or a blocked/missing-key state
  // exposes nothing. Both tools register together or neither does.
  if (!shouldExposePaidStimTools(config)) {
    return;
  }

  server.registerTool(
    STIM_LATEST_TOOL_NAME,
    {
      title: "Get Latest Stock Trends ST-IM Record (paid, execution disabled)",
      description:
        "Paid ST-IM tool foundation for GET /v1/stim/latest. Paid execution is DISABLED in this build: every invocation fails closed at the hard paid-execution-disabled gate, sends no API request, and constructs no auth or payment header. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: stimLatestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: STIM_LATEST_ENDPOINT_PATH,
        method: STIM_HTTP_METHOD,
        source: "stim_latest",
        pairedWith: STIM_HISTORY_TOOL_NAME,
        paidExecutionAuthorized: false
      }
    },
    async (input) => handleStimLatestTool(config, input as StimLatestInput)
  );

  server.registerTool(
    STIM_HISTORY_TOOL_NAME,
    {
      title: "Get Stock Trends ST-IM History (paid, execution disabled)",
      description:
        "Paid ST-IM tool foundation for GET /v1/stim/history. Paid execution is DISABLED in this build: every invocation fails closed at the hard paid-execution-disabled gate, sends no API request, and constructs no auth or payment header. Not authoritative for investment advice, payment, or future performance.",
      inputSchema: stimHistoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "paid",
        endpointPath: STIM_HISTORY_ENDPOINT_PATH,
        method: STIM_HTTP_METHOD,
        source: "stim_history",
        pairedWith: STIM_LATEST_TOOL_NAME,
        paidExecutionAuthorized: false
      }
    },
    async (input) => handleStimHistoryTool(config, input as StimHistoryInput)
  );
}

export function shouldExposePaidStimTools(config: StockTrendsMcpConfig): boolean {
  return config.paidTools.requested && config.paidTools.apiKeyConfigured;
}

export function listPaidStimToolNames(): string[] {
  return [...PAID_STIM_TOOL_NAMES];
}

// --- Handlers (fail closed before any preflight/network) ---

function handleStimLatestTool(config: StockTrendsMcpConfig, input: StimLatestInput): CallToolResult {
  try {
    const identity = resolveSymbolIdentity(input);
    const requestParameters = { symbol_exchange: identity.symbol_exchange };
    return denyStimInvocation(config, {
      toolName: STIM_LATEST_TOOL_NAME,
      endpointPath: STIM_LATEST_ENDPOINT_PATH,
      identity,
      requestParameters,
      extraWarnings: [
        "A single latest ST-IM record is a point-in-time snapshot, not a forecast or instruction; use stocktrends_get_stim_history for longitudinal context."
      ]
    });
  } catch (error) {
    return toolInputError(error, STIM_LATEST_TOOL_NAME, STIM_LATEST_ENDPOINT_PATH);
  }
}

function handleStimHistoryTool(config: StockTrendsMcpConfig, input: StimHistoryInput): CallToolResult {
  try {
    const identity = resolveSymbolIdentity(input);
    const requestParameters = buildHistoryRequestParameters(identity, input);
    return denyStimInvocation(config, {
      toolName: STIM_HISTORY_TOOL_NAME,
      endpointPath: STIM_HISTORY_ENDPOINT_PATH,
      identity,
      requestParameters,
      extraWarnings: []
    });
  } catch (error) {
    return toolInputError(error, STIM_HISTORY_TOOL_NAME, STIM_HISTORY_ENDPOINT_PATH);
  }
}

interface StimDenialContext {
  toolName: string;
  endpointPath: string;
  identity: PaidStimSymbolIdentity;
  requestParameters: Record<string, unknown>;
  extraWarnings: string[];
}

function denyStimInvocation(config: StockTrendsMcpConfig, context: StimDenialContext): CallToolResult {
  // Build the target URL for host/endpoint allowlist evaluation only. It is NOT
  // fetched anywhere in this build.
  const targetUrl = new URL(context.endpointPath, config.apiBaseUrl);
  const paidAuthConfig: PaidAuthConfig = { apiBaseUrl: config.apiBaseUrl, paidTools: config.paidTools };
  const preflight = evaluatePaidInvocationPreflight(paidAuthConfig, {
    toolName: context.toolName,
    endpointPath: context.endpointPath,
    httpMethod: STIM_HTTP_METHOD,
    targetUrl
  });

  const errorCode = DENIAL_REASON_TO_ERROR_CODE[preflight.denialReason];
  const metadata = buildDeniedMetadata(config.paidTools.spendPolicy, context, preflight, errorCode);
  const wrapper: PaidStimDenialWrapper = {
    error: {
      error_code: errorCode,
      message: denialMessage(errorCode),
      tool_name: context.toolName,
      endpoint_path: context.endpointPath,
      http_method: STIM_HTTP_METHOD,
      denial_reason: errorCode
    },
    mcp_metadata: metadata,
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false
  };

  return failClosed(wrapper);
}

function buildDeniedMetadata(
  spendPolicy: PaidSpendPolicy,
  context: StimDenialContext,
  preflight: PaidInvocationPreflightResult,
  errorCode: StimToolErrorCode
): PaidStimToolMetadata {
  return {
    tool_name: context.toolName,
    endpoint_path: context.endpointPath,
    http_method: STIM_HTTP_METHOD,
    source: "stocktrends_api",
    symbol_identity: context.identity,
    request_parameters: context.requestParameters,
    preflight_decision_summary: {
      endpoint_allowlisted: preflight.endpointAllowlisted,
      tool_allowlisted: preflight.toolAllowlisted,
      host_approved: preflight.hostApproved,
      paid_mode_configured: preflight.paidModeConfigured,
      pricing_source: null,
      estimated_cost: null,
      hard_execution_gate_enabled: preflight.hardExecutionGateEnabled,
      local_authorization_decision: "deny",
      denial_reason: errorCode
    },
    local_budget_cap_status: {
      max_paid_calls_per_session: spendPolicy.maxPaidCallsPerSession,
      max_paid_calls_per_tool: spendPolicy.maxPaidCallsPerTool,
      max_stc_per_session: spendPolicy.maxStcPerSession,
      max_usd_per_session: spendPolicy.maxUsdPerSession,
      automatic_paid_retries: false
    },
    request_id: null,
    pricing_rule: null,
    observed_cost: null,
    payment_status: null,
    authoritative_for: "ST-IM API data returned by Stock Trends API",
    not_authoritative_for: ["investment advice", "payment authorization", "future performance guarantee"],
    fetched_at: null,
    paid_execution_authorized: false,
    warnings: [
      "Paid ST-IM execution is disabled in this build; no API request was sent and no auth or payment header was constructed.",
      ...context.extraWarnings
    ],
    limitations: [
      "Paid execution remains blocked behind the hard paid-execution-disabled build gate.",
      "This tool does not authorize paid execution, payment, x402, wallet use, or paid endpoint calls.",
      "Pricing/preflight cost resolution and live execution are deferred to a separately reviewed branch."
    ]
  };
}

// --- Input resolution and validation (before preflight/network) ---

function resolveSymbolIdentity(input: { symbol_exchange?: string; symbol?: string; exchange?: string }): PaidStimSymbolIdentity {
  // symbol_exchange takes precedence over symbol + exchange (mirrors the API).
  if (input.symbol_exchange !== undefined) {
    const [symbol, exchange] = splitSymbolExchange(input.symbol_exchange);
    return {
      symbol,
      exchange,
      symbol_exchange: input.symbol_exchange,
      identity_source: "symbol_exchange"
    };
  }

  if (input.symbol !== undefined && input.exchange !== undefined) {
    return {
      symbol: input.symbol,
      exchange: input.exchange,
      symbol_exchange: `${input.symbol}_${input.exchange}`,
      identity_source: "symbol_and_exchange"
    };
  }

  throw new StimToolInputError(
    "invalid_tool_input",
    "Provide either symbol_exchange, or both symbol and exchange, to identify a single symbol."
  );
}

function splitSymbolExchange(symbolExchange: string): [string, string] {
  const separatorIndex = symbolExchange.lastIndexOf("_");
  return [symbolExchange.slice(0, separatorIndex), symbolExchange.slice(separatorIndex + 1)];
}

function buildHistoryRequestParameters(identity: PaidStimSymbolIdentity, input: StimHistoryInput): Record<string, unknown> {
  const start = input.start;
  const end = input.end;

  if (start !== undefined && !isRealCalendarDate(start)) {
    throw new StimToolInputError("invalid_tool_input", "start must be a valid YYYY-MM-DD calendar date.");
  }

  if (end !== undefined && !isRealCalendarDate(end)) {
    throw new StimToolInputError("invalid_tool_input", "end must be a valid YYYY-MM-DD calendar date.");
  }

  if (start !== undefined && end !== undefined && start > end) {
    throw new StimToolInputError("invalid_tool_input", "start must be on or before end.");
  }

  // Only forward parameters the caller actually supplied. `limit` and
  // `include_gaps` are omitted when not supplied so the API applies its own
  // documented defaults (limit=260, include_gaps=false); MCP never sends a
  // limit above the API max of 2600.
  const parameters: Record<string, unknown> = { symbol_exchange: identity.symbol_exchange };

  if (start !== undefined) {
    parameters.start = start;
  }

  if (end !== undefined) {
    parameters.end = end;
  }

  if (input.limit !== undefined) {
    parameters.limit = input.limit;
  }

  if (input.include_gaps !== undefined) {
    parameters.include_gaps = input.include_gaps;
  }

  return parameters;
}

function isRealCalendarDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// --- Result builders ---

function denialMessage(errorCode: StimToolErrorCode): string {
  switch (errorCode) {
    case "paid_execution_disabled":
      return "Paid ST-IM execution is disabled in this build. No API request was sent and no auth header was constructed.";
    case "paid_tools_disabled":
      return "Paid ST-IM tools are disabled. No API request was sent.";
    case "paid_auth_blocked_missing_api_key":
      return "Paid mode is enabled but no API key is configured. No API request was sent.";
    case "endpoint_not_allowlisted":
      return "The requested endpoint is not on the paid endpoint allowlist. No API request was sent.";
    case "host_not_approved":
      return "The target host is not the approved Stock Trends API origin. No API request was sent.";
    default:
      return "Paid ST-IM execution was denied by local policy. No API request was sent.";
  }
}

function toolInputError(error: unknown, toolName: string, endpointPath: string): CallToolResult {
  const message = error instanceof StimToolInputError ? error.message : "Invalid paid ST-IM tool input.";
  const wrapper = {
    error: {
      error_code: "invalid_tool_input" as const,
      message,
      tool_name: toolName,
      endpoint_path: endpointPath,
      http_method: STIM_HTTP_METHOD,
      denial_reason: "invalid_tool_input" as const
    },
    paid_execution_authorized: false as const,
    paid_execution_occurred: false as const,
    api_request_sent: false as const,
    auth_header_sent: false as const,
    payment_header_sent: false as const
  };

  return failClosed(wrapper);
}

function failClosed(output: object): CallToolResult {
  return {
    structuredContent: output as Record<string, unknown>,
    content: [
      {
        type: "text",
        text: JSON.stringify(output, null, 2)
      }
    ],
    isError: true
  };
}
