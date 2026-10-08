import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { StockTrendsMcpError } from "../errors.js";
import type { JsonObject, StockTrendsClient } from "../stocktrendsClient.js";

export const COST_ESTIMATE_TOOL_NAME = "stocktrends_estimate_workflow_cost";
export const COST_ESTIMATE_ENDPOINT_PATH = "/v1/cost-estimate";

export const COST_ESTIMATE_WORKFLOW_IDS = [
  "regime_analysis",
  "symbol_decision",
  "stim_forecast_review",
  "portfolio_build",
  "portfolio_compare_review"
] as const;

export const COST_ESTIMATE_RAIL_PREFERENCES = ["subscription", "x402", "mpp", "auto"] as const;

export interface PublicPlanningToolDefinition {
  name: typeof COST_ESTIMATE_TOOL_NAME;
  endpointPath: typeof COST_ESTIMATE_ENDPOINT_PATH;
  access: "public";
  cost: "free";
  purpose: "workflow_cost_planning";
}

export const PUBLIC_PLANNING_TOOL_DEFINITIONS: readonly PublicPlanningToolDefinition[] = Object.freeze([
  {
    name: COST_ESTIMATE_TOOL_NAME,
    endpointPath: COST_ESTIMATE_ENDPOINT_PATH,
    access: "public",
    cost: "free",
    purpose: "workflow_cost_planning"
  }
]);

export const PAID_RUNTIME_TOOL_DEFINITIONS: readonly [] = [];
export const MCP_PROMPT_DEFINITIONS: readonly [] = [];

const costEstimateInputSchema = z
  .object({
  workflow_id: z.enum(COST_ESTIMATE_WORKFLOW_IDS).describe("Confirmed Stock Trends workflow id to estimate."),
  rail_preference: z.enum(COST_ESTIMATE_RAIL_PREFERENCES).optional().describe("Optional planning rail preference. Defaults to auto."),
  quota_remaining: z.number().finite().int().nonnegative().optional().describe("Optional caller-supplied illustrative subscription quota remaining."),
  max_budget_usd: z.number().finite().nonnegative().optional().describe("Optional local USD planning budget. Not sent to the API."),
  max_budget_stc: z.number().finite().nonnegative().optional().describe("Optional local STC planning budget. Not sent to the API.")
  })
  .strict();

type CostEstimateToolInput = z.infer<typeof costEstimateInputSchema>;

type PlanningStatus = "not_evaluated" | "within_budget" | "over_budget" | "unable_to_compare";
type CostEstimateToolErrorCode =
  | "public_api_network_failure"
  | "public_api_timeout"
  | "public_api_unapproved_redirect"
  | "public_api_auth_required"
  | "public_api_payment_required"
  | "public_api_forbidden"
  | "public_api_not_found"
  | "public_api_rate_limited"
  | "public_api_unexpected_status"
  | "malformed_cost_estimate_response"
  | "missing_estimated_total"
  | "unsupported_budget_comparison_unit";

interface NormalizedCostEstimateResponse {
  workflowId: string;
  rail: string;
  totalStcCost: number;
  totalUsdCost: number;
  quotaRemainingSupplied: unknown;
  quotaSufficient: unknown;
  steps: unknown[];
  notes: unknown[];
  currency: "USD" | "USDC";
  stcUnit: "STC";
}

interface BudgetComparison {
  evaluated: boolean;
  planning_status: PlanningStatus;
  max_budget_usd: number | null;
  max_budget_stc: number | null;
  usd_estimate: { amount: number; currency: "USD" | "USDC" } | null;
  stc_estimate: { amount: number; unit: "STC" } | null;
  usd_within_budget: boolean | null;
  stc_within_budget: boolean | null;
  paid_execution_authorized: false;
  warnings: string[];
}

export function registerPublicPlanningTools(server: McpServer, client: StockTrendsClient): void {
  server.registerTool(
    COST_ESTIMATE_TOOL_NAME,
    {
      title: "Estimate Stock Trends Workflow Cost",
      description:
        "Public/free planning tool that calls GET /v1/cost-estimate for workflow-level budgeting only. It does not authorize paid execution, payment, x402, wallet use, or paid endpoint calls.",
      inputSchema: costEstimateInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      },
      _meta: {
        access: "public",
        endpointPath: COST_ESTIMATE_ENDPOINT_PATH,
        method: "GET",
        source: "cost_estimate",
        paidExecutionAuthorized: false
      }
    },
    async (input) => handleCostEstimateTool(client, input)
  );
}

export function listPublicPlanningToolNames(): string[] {
  return PUBLIC_PLANNING_TOOL_DEFINITIONS.map((tool) => tool.name);
}

async function handleCostEstimateTool(client: StockTrendsClient, input: CostEstimateToolInput): Promise<CallToolResult> {
  const endpointPath = buildCostEstimateEndpointPath(input);

  try {
    const response = await client.fetchJson({
      endpointPath,
      toolName: COST_ESTIMATE_TOOL_NAME
    });
    const normalized = normalizeCostEstimateResponse(response.data, input);
    const warnings = buildWarnings(input, normalized);
    const localBudgetComparison = compareLocalBudgets(input, normalized);
    const output = {
      api_data: response.data,
      mcp_metadata: {
        tool_name: COST_ESTIMATE_TOOL_NAME,
        source: "cost_estimate",
        endpoint_path: COST_ESTIMATE_ENDPOINT_PATH,
        http_method: "GET",
        api_base_url: client.apiBaseOrigin,
        status: response.status,
        upstream_request_id: response.upstreamRequestId ?? null,
        workflow_id: input.workflow_id,
        api_workflow_id: normalized.workflowId,
        rail_preference: input.rail_preference ?? "auto",
        api_rail: normalized.rail,
        quota_remaining: input.quota_remaining ?? null,
        quota_remaining_is_caller_supplied: input.quota_remaining !== undefined,
        fetched_at: new Date().toISOString(),
        estimated_total: {
          stc: {
            amount: normalized.totalStcCost,
            unit: normalized.stcUnit
          },
          usd: {
            amount: normalized.totalUsdCost,
            currency: normalized.currency
          }
        },
        quota: {
          quota_remaining_supplied: normalized.quotaRemainingSupplied,
          quota_sufficient: normalized.quotaSufficient,
          verified_by_mcp: false
        },
        step_estimates: normalized.steps,
        notes: normalized.notes,
        authoritative_for: ["workflow-level budgeting/planning"],
        not_authoritative_for: [
          "paid execution authorization",
          "payment authorization",
          "endpoint-level pricing authorization unless API explicitly provides it"
        ],
        paid_execution_authorized: false,
        payment_authorized: false,
        future_payment_challenge_amount_known: false,
        future_payment_challenge_amount: null,
        local_budget_comparison: localBudgetComparison,
        warnings: [...warnings, ...localBudgetComparison.warnings],
        limitations: [
          "This tool estimates workflow-level cost only.",
          "This tool does not authorize paid execution or payment.",
          "Actual payment challenge amounts, if any, are determined later by the Stock Trends API/payment rail."
        ]
      }
    };

    return toolSuccess(output);
  } catch (error) {
    return toolError(mapCostEstimateToolError(error, endpointPath));
  }
}

function buildCostEstimateEndpointPath(input: CostEstimateToolInput): string {
  const params = new URLSearchParams({
    workflow_id: input.workflow_id
  });

  if (input.rail_preference !== undefined) {
    params.set("rail_preference", input.rail_preference);
  }

  if (input.quota_remaining !== undefined) {
    params.set("quota_remaining", String(input.quota_remaining));
  }

  return `${COST_ESTIMATE_ENDPOINT_PATH}?${params.toString()}`;
}

function normalizeCostEstimateResponse(data: JsonObject, input: CostEstimateToolInput): NormalizedCostEstimateResponse {
  const workflowId = readRequiredString(data, "workflow_id");
  const rail = readRequiredString(data, "rail");
  const totalStcCost = readRequiredNumber(data, "total_stc_cost", input.max_budget_stc !== undefined);
  const totalUsdCost = readRequiredNumber(data, "total_usd_cost", input.max_budget_usd !== undefined);
  const steps = readRequiredArray(data, "steps");
  const notes = readRequiredArray(data, "notes");

  if (workflowId !== input.workflow_id) {
    throw new CostEstimatePlanningError("malformed_cost_estimate_response", "API cost-estimate workflow_id did not match the requested workflow_id.");
  }

  if (!COST_ESTIMATE_RAIL_PREFERENCES.includes(rail as (typeof COST_ESTIMATE_RAIL_PREFERENCES)[number])) {
    throw new CostEstimatePlanningError("malformed_cost_estimate_response", "API cost-estimate rail was not one of the supported planning rails.");
  }

  return {
    workflowId,
    rail,
    totalStcCost,
    totalUsdCost,
    quotaRemainingSupplied: data.quota_remaining_supplied,
    quotaSufficient: data.quota_sufficient,
    steps,
    notes,
    currency: readOptionalCurrency(data),
    stcUnit: readOptionalStcUnit(data)
  };
}

function readRequiredString(data: JsonObject, fieldName: string): string {
  const value = data[fieldName];

  if (typeof value !== "string" || !value.trim()) {
    throw new CostEstimatePlanningError("malformed_cost_estimate_response", `API cost-estimate response is missing string field ${fieldName}.`);
  }

  return value;
}

function readRequiredNumber(data: JsonObject, fieldName: string, neededForBudgetComparison: boolean): number {
  const value = data[fieldName];

  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new CostEstimatePlanningError(
      neededForBudgetComparison ? "missing_estimated_total" : "malformed_cost_estimate_response",
      `API cost-estimate response is missing non-negative numeric field ${fieldName}.`
    );
  }

  return value;
}

function readRequiredArray(data: JsonObject, fieldName: string): unknown[] {
  const value = data[fieldName];

  if (!Array.isArray(value)) {
    throw new CostEstimatePlanningError("malformed_cost_estimate_response", `API cost-estimate response is missing array field ${fieldName}.`);
  }

  return value;
}

function readOptionalCurrency(data: JsonObject): "USD" | "USDC" {
  const value = data.currency;

  if (value === undefined || value === null) {
    return "USD";
  }

  if (typeof value !== "string") {
    throw new CostEstimatePlanningError("unsupported_budget_comparison_unit", "API cost-estimate currency was not a supported string value.");
  }

  const currency = value.toUpperCase();

  if (currency === "USD" || currency === "USDC") {
    return currency;
  }

  throw new CostEstimatePlanningError("unsupported_budget_comparison_unit", "API cost-estimate currency is not supported for local USD budget comparison.");
}

function readOptionalStcUnit(data: JsonObject): "STC" {
  const value = data.unit;

  if (value === undefined || value === null) {
    return "STC";
  }

  if (typeof value === "string" && value.toUpperCase() === "STC") {
    return "STC";
  }

  throw new CostEstimatePlanningError("unsupported_budget_comparison_unit", "API cost-estimate unit is not supported for local STC budget comparison.");
}

function compareLocalBudgets(input: CostEstimateToolInput, normalized: NormalizedCostEstimateResponse): BudgetComparison {
  const maxBudgetUsd = input.max_budget_usd ?? null;
  const maxBudgetStc = input.max_budget_stc ?? null;
  const evaluated = maxBudgetUsd !== null || maxBudgetStc !== null;
  const usdWithinBudget = maxBudgetUsd === null || normalized.currency !== "USD" ? null : normalized.totalUsdCost <= maxBudgetUsd;
  const stcWithinBudget = maxBudgetStc === null ? null : normalized.totalStcCost <= maxBudgetStc;
  const warnings: string[] = [];

  if (maxBudgetUsd !== null && normalized.currency !== "USD") {
    warnings.push("Unable to compare max_budget_usd because the API returned a non-USD currency label; no FX conversion was attempted.");
  }

  const comparisonValues = [usdWithinBudget, stcWithinBudget].filter((value): value is boolean => value !== null);
  const planningStatus = buildPlanningStatus(evaluated, comparisonValues, warnings);

  if (planningStatus === "over_budget") {
    warnings.push("Estimated workflow cost exceeds at least one caller-provided local planning budget; no paid execution was attempted.");
  }

  if (planningStatus === "within_budget") {
    warnings.push("Estimated workflow cost is within the caller-provided local planning budget, but this is not paid execution authorization.");
  }

  return {
    evaluated,
    planning_status: planningStatus,
    max_budget_usd: maxBudgetUsd,
    max_budget_stc: maxBudgetStc,
    usd_estimate: maxBudgetUsd === null ? null : { amount: normalized.totalUsdCost, currency: normalized.currency },
    stc_estimate: maxBudgetStc === null ? null : { amount: normalized.totalStcCost, unit: normalized.stcUnit },
    usd_within_budget: usdWithinBudget,
    stc_within_budget: stcWithinBudget,
    paid_execution_authorized: false,
    warnings
  };
}

function buildPlanningStatus(evaluated: boolean, comparisonValues: boolean[], warnings: string[]): PlanningStatus {
  if (!evaluated) {
    return "not_evaluated";
  }

  if (warnings.some((warning) => warning.startsWith("Unable to compare"))) {
    return "unable_to_compare";
  }

  if (comparisonValues.some((value) => !value)) {
    return "over_budget";
  }

  return "within_budget";
}

function buildWarnings(input: CostEstimateToolInput, normalized: NormalizedCostEstimateResponse): string[] {
  const warnings = [
    "Cost estimate is workflow-level planning evidence only and does not authorize paid execution.",
    "Future payment challenge amount is not known from this planning tool."
  ];

  if (input.quota_remaining !== undefined) {
    warnings.push("quota_remaining is caller-supplied planning context and is not verified entitlement or quota.");
  }

  if (input.rail_preference === "x402" || input.rail_preference === "mpp") {
    warnings.push("Rail planning for x402 or MPP does not trigger payment signing, wallet handling, or payment retry.");
  }

  if (normalized.steps.length === 0) {
    warnings.push("API returned no workflow steps; treat the estimate as limited planning context.");
  }

  return warnings;
}

function toolSuccess(output: Record<string, unknown>): CallToolResult {
  return {
    structuredContent: output,
    content: [
      {
        type: "text",
        text: JSON.stringify(output, null, 2)
      }
    ]
  };
}

function toolError(error: { error_code: CostEstimateToolErrorCode; message: string; endpoint_path: string; tool_name: string }): CallToolResult {
  const output = {
    error,
    paid_execution_authorized: false,
    payment_authorized: false
  };

  return {
    structuredContent: output,
    content: [
      {
        type: "text",
        text: JSON.stringify(output, null, 2)
      }
    ],
    isError: true
  };
}

function mapCostEstimateToolError(error: unknown, endpointPath: string): {
  error_code: CostEstimateToolErrorCode;
  message: string;
  endpoint_path: string;
  tool_name: string;
} {
  if (error instanceof CostEstimatePlanningError) {
    return {
      error_code: error.errorCode,
      message: error.message,
      endpoint_path: endpointPath,
      tool_name: COST_ESTIMATE_TOOL_NAME
    };
  }

  if (error instanceof StockTrendsMcpError) {
    return {
      error_code: mapClientErrorCode(error),
      message: clientErrorMessage(error),
      endpoint_path: endpointPath,
      tool_name: COST_ESTIMATE_TOOL_NAME
    };
  }

  return {
    error_code: "public_api_network_failure",
    message: "Stock Trends public API cost-estimate request failed.",
    endpoint_path: endpointPath,
    tool_name: COST_ESTIMATE_TOOL_NAME
  };
}

function mapClientErrorCode(error: StockTrendsMcpError): CostEstimateToolErrorCode {
  switch (error.errorCode) {
    case "timeout":
      return "public_api_timeout";
    case "api_unapproved_redirect":
      return "public_api_unapproved_redirect";
    case "unexpected_auth_required":
      return "public_api_auth_required";
    case "unexpected_paid_endpoint":
      return "public_api_payment_required";
    case "unexpected_forbidden":
      return "public_api_forbidden";
    case "api_not_found":
      return "public_api_not_found";
    case "api_rate_limited":
      return "public_api_rate_limited";
    case "api_unexpected_status":
      return "public_api_unexpected_status";
    case "malformed_api_response":
      return "malformed_cost_estimate_response";
    default:
      return "public_api_network_failure";
  }
}

function clientErrorMessage(error: StockTrendsMcpError): string {
  if (error.errorCode === "malformed_api_response") {
    return "Stock Trends public API returned malformed JSON for the cost-estimate request.";
  }

  if (error.errorCode === "api_unavailable") {
    return "Stock Trends public API is unavailable for the cost-estimate request.";
  }

  return error.message;
}

class CostEstimatePlanningError extends Error {
  constructor(
    readonly errorCode: CostEstimateToolErrorCode,
    message: string
  ) {
    super(message);
    this.name = "CostEstimatePlanningError";
  }
}
