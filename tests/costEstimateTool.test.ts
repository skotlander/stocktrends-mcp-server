import { describe, expect, it, vi } from "vitest";
import { listPublicResourceUris } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import {
  COST_ESTIMATE_ENDPOINT_PATH,
  COST_ESTIMATE_RAIL_PREFERENCES,
  COST_ESTIMATE_TOOL_NAME,
  COST_ESTIMATE_WORKFLOW_IDS,
  PAID_RUNTIME_TOOL_DEFINITIONS
} from "../src/tools/index.js";
import { connectMcp, jsonResponse, textResponse } from "./helpers.js";

const EXPECTED_PUBLIC_RESOURCE_URIS = [
  "stocktrends://api/openapi",
  "stocktrends://ai/context",
  "stocktrends://ai/tools",
  "stocktrends://workflows",
  "stocktrends://methodology/stim",
  "stocktrends://methodology/indicators",
  "stocktrends://methodology/inference",
  "stocktrends://pricing/catalog",
  "stocktrends://proof/market-edge"
];

const PAID_ENV_MATRIX = [
  {},
  { STOCKTRENDS_API_KEY: "present-but-ignored" },
  { STOCKTRENDS_ENABLE_PAID_TOOLS: "false" },
  { STOCKTRENDS_ENABLE_PAID_TOOLS: "true" },
  { STOCKTRENDS_ENABLE_PAID_TOOLS: "true", STOCKTRENDS_API_KEY: "mock-key-must-not-be-sent" }
];

describe("stocktrends_estimate_workflow_cost", () => {
  it("registers exactly one public planning tool, zero prompts, and the unchanged 9 public resources", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse()));
    const { client, server } = await connectMcp(fetchFn);

    const tools = await client.listTools();
    const resources = await client.listResources();

    expect(tools.tools).toHaveLength(1);
    expect(tools.tools[0]?.name).toBe(COST_ESTIMATE_TOOL_NAME);
    expect(tools.tools[0]?.inputSchema.required).toEqual(["workflow_id"]);
    expect(tools.tools[0]?.inputSchema.additionalProperties).toBe(false);
    expect(tools.tools[0]?.inputSchema.properties?.workflow_id).toMatchObject({
      enum: [...COST_ESTIMATE_WORKFLOW_IDS]
    });
    expect(tools.tools[0]?.inputSchema.properties?.rail_preference).toMatchObject({
      enum: [...COST_ESTIMATE_RAIL_PREFERENCES]
    });
    expect(PAID_RUNTIME_TOOL_DEFINITIONS).toEqual([]);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
    expect(listPublicResourceUris()).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it.each(COST_ESTIMATE_WORKFLOW_IDS)("accepts valid workflow_id %s", async (workflowId) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse({ workflow_id: workflowId })));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: workflowId
      }
    });

    expect(result.isError).not.toBe(true);
    expect(structured(result).mcp_metadata.workflow_id).toBe(workflowId);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.close();
    await server.close();
  });

  it("rejects unknown workflow_id before any API call", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse()));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "unknown_workflow"
      }
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Invalid arguments");
    expect(text(result)).toContain("workflow_id");
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it.each(COST_ESTIMATE_RAIL_PREFERENCES)("accepts valid rail_preference %s", async (railPreference) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse({ workflow_id: "portfolio_build", rail: railPreference })));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "portfolio_build",
        rail_preference: railPreference
      }
    });

    expect(result.isError).not.toBe(true);
    expect(fetchFn.mock.calls[0]?.[0].searchParams.get("rail_preference")).toBe(railPreference);
    expect(structured(result).mcp_metadata.rail_preference).toBe(railPreference);

    await client.close();
    await server.close();
  });

  it.each([
    { label: "invalid rail_preference", args: { workflow_id: "portfolio_build", rail_preference: "card" } },
    { label: "invalid quota_remaining", args: { workflow_id: "portfolio_build", quota_remaining: -1 } },
    { label: "invalid max_budget_usd", args: { workflow_id: "portfolio_build", max_budget_usd: -1 } },
    { label: "invalid max_budget_stc", args: { workflow_id: "portfolio_build", max_budget_stc: -1 } }
  ])("rejects $label before any API call", async ({ args }) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse()));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: args
    });

    expect(result.isError).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("rejects unknown extra input keys before any API call or paid behavior", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse()));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "portfolio_build",
        unexpected_paid_execution_hint: true
      }
    });

    expect(result.isError).toBe(true);
    expect(text(result)).toContain("Invalid arguments");
    expect(text(result)).toContain("unexpected_paid_execution_hint");
    expect(fetchFn).not.toHaveBeenCalled();
    expect(PAID_RUNTIME_TOOL_DEFINITIONS).toEqual([]);
    expect(text(result).toLowerCase()).not.toContain("authorization");
    expect(text(result).toLowerCase()).not.toContain("payment-signature");

    await client.close();
    await server.close();
  });

  it("calls GET /v1/cost-estimate through the public client path with only supplied query parameters and no auth headers", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse({ workflow_id: "portfolio_build", rail: "subscription" })));
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "must-not-be-sent"
    });

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "portfolio_build",
        rail_preference: "subscription",
        quota_remaining: 3,
        max_budget_usd: 10,
        max_budget_stc: 100
      }
    });
    const url = fetchFn.mock.calls[0]?.[0];
    const init = fetchFn.mock.calls[0]?.[1];

    expect(result.isError).not.toBe(true);
    expect(url?.pathname).toBe(COST_ESTIMATE_ENDPOINT_PATH);
    expect(url?.searchParams.get("workflow_id")).toBe("portfolio_build");
    expect(url?.searchParams.get("rail_preference")).toBe("subscription");
    expect(url?.searchParams.get("quota_remaining")).toBe("3");
    expect(url?.searchParams.has("max_budget_usd")).toBe(false);
    expect(url?.searchParams.has("max_budget_stc")).toBe(false);
    expect(init).toMatchObject({
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "stocktrends-mcp-server/1.0"
      },
      redirect: "manual"
    });
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("authorization");
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("api-key");
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("secret");

    await client.close();
    await server.close();
  });

  it("omits rail_preference and quota_remaining when they are not supplied while reporting effective auto planning", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse()));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "stim_forecast_review"
      }
    });
    const url = fetchFn.mock.calls[0]?.[0];

    expect(url?.searchParams.get("workflow_id")).toBe("stim_forecast_review");
    expect(url?.searchParams.has("rail_preference")).toBe(false);
    expect(url?.searchParams.has("quota_remaining")).toBe(false);
    expect(structured(result).mcp_metadata.rail_preference).toBe("auto");

    await client.close();
    await server.close();
  });

  it("wraps the API estimate with source, authority limits, fetched_at, steps, notes, and execution authorization set false", async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(costEstimateResponse({ workflow_id: "stim_forecast_review", total_stc_cost: 2, total_usd_cost: 0.4 }), 200, {
        "x-request-id": "req-cost-estimate"
      })
    );
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "stim_forecast_review"
      }
    });
    const body = structured(result);

    expect(result.isError).not.toBe(true);
    expect(body.api_data).toMatchObject({
      workflow_id: "stim_forecast_review",
      total_stc_cost: 2,
      total_usd_cost: 0.4
    });
    expect(body.mcp_metadata).toMatchObject({
      tool_name: COST_ESTIMATE_TOOL_NAME,
      source: "cost_estimate",
      endpoint_path: COST_ESTIMATE_ENDPOINT_PATH,
      http_method: "GET",
      upstream_request_id: "req-cost-estimate",
      workflow_id: "stim_forecast_review",
      estimated_total: {
        stc: {
          amount: 2,
          unit: "STC"
        },
        usd: {
          amount: 0.4,
          currency: "USD"
        }
      },
      authoritative_for: ["workflow-level budgeting/planning"],
      paid_execution_authorized: false,
      payment_authorized: false,
      future_payment_challenge_amount_known: false,
      future_payment_challenge_amount: null
    });
    expect(body.mcp_metadata.not_authoritative_for).toContain("paid execution authorization");
    expect(body.mcp_metadata.not_authoritative_for).toContain("payment authorization");
    expect(body.mcp_metadata.step_estimates).toHaveLength(1);
    expect(body.mcp_metadata.notes).toContain("Mock estimate.");
    expect(typeof body.mcp_metadata.fetched_at).toBe("string");

    await client.close();
    await server.close();
  });

  it("returns within-budget local planning status without authorizing execution", async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(costEstimateResponse({ workflow_id: "portfolio_compare_review", total_stc_cost: 2, total_usd_cost: 0.4 }))
    );
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "portfolio_compare_review",
        max_budget_usd: 1,
        max_budget_stc: 3
      }
    });
    const comparison = structured(result).mcp_metadata.local_budget_comparison;

    expect(comparison).toMatchObject({
      evaluated: true,
      planning_status: "within_budget",
      usd_within_budget: true,
      stc_within_budget: true,
      paid_execution_authorized: false
    });
    expect(structured(result).mcp_metadata.paid_execution_authorized).toBe(false);

    await client.close();
    await server.close();
  });

  it("returns over-budget local planning warning without attempting paid execution", async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse(costEstimateResponse({ workflow_id: "portfolio_compare_review", total_stc_cost: 8, total_usd_cost: 4 }))
    );
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "portfolio_compare_review",
        max_budget_usd: 1
      }
    });
    const comparison = structured(result).mcp_metadata.local_budget_comparison;

    expect(comparison).toMatchObject({
      evaluated: true,
      planning_status: "over_budget",
      usd_within_budget: false,
      paid_execution_authorized: false
    });
    expect(comparison.warnings.join(" ")).toContain("exceeds");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0].pathname).toBe(COST_ESTIMATE_ENDPOINT_PATH);

    await client.close();
    await server.close();
  });

  it("reports unable-to-compare when the dollar-side response unit is not supported for local USD comparison", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse({ currency: "USDC", total_usd_cost: 1 })));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "stim_forecast_review",
        max_budget_usd: 1
      }
    });
    const comparison = structured(result).mcp_metadata.local_budget_comparison;

    expect(result.isError).not.toBe(true);
    expect(comparison).toMatchObject({
      evaluated: true,
      planning_status: "unable_to_compare",
      usd_within_budget: null,
      paid_execution_authorized: false
    });
    expect(comparison.warnings.join(" ")).toContain("Unable to compare");

    await client.close();
    await server.close();
  });

  it("returns deterministic network, malformed, missing-total, and unsupported-unit failures", async () => {
    await expectToolError(
      async () => {
        throw new TypeError("network down with STOCKTRENDS_API_KEY=secret");
      },
      "public_api_network_failure"
    );

    await expectToolError(async () => jsonResponse({ ok: true }), "malformed_cost_estimate_response");

    await expectToolError(async () => textResponse("{not-json", 200, { "content-type": "application/json" }), "malformed_cost_estimate_response");

    await expectToolError(
      async () =>
        jsonResponse({
          ...costEstimateResponse(),
          total_usd_cost: undefined
        }),
      "missing_estimated_total",
      {
        workflow_id: "stim_forecast_review",
        max_budget_usd: 1
      }
    );

    await expectToolError(
      async () =>
        jsonResponse({
          ...costEstimateResponse(),
          unit: "POINTS"
        }),
      "unsupported_budget_comparison_unit",
      {
        workflow_id: "stim_forecast_review",
        max_budget_stc: 1
      }
    );
  });

  it.each(PAID_ENV_MATRIX)("is available in environment mode %# and never calls paid, pricing, workflow-registration, x402, wallet, OAuth, DB, or control-plane paths", async (env) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse(costEstimateResponse()));
    const { client, server } = await connectMcp(fetchFn, env);

    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: {
        workflow_id: "stim_forecast_review",
        rail_preference: "x402"
      }
    });

    expect(result.isError).not.toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0].pathname).toBe(COST_ESTIMATE_ENDPOINT_PATH);
    expect(fetchFn.mock.calls[0]?.[0].pathname).not.toBe("/v1/pricing/catalog");
    expect(fetchFn.mock.calls[0]?.[0].pathname).not.toBe("/v1/workflows");
    expect(fetchFn.mock.calls[0]?.[0].pathname).not.toContain("/v1/stim/");
    expect(JSON.stringify(fetchFn.mock.calls[0]?.[1].headers).toLowerCase()).not.toContain("api-key");
    expect(JSON.stringify(structured(result)).toLowerCase()).not.toContain("oauth");
    expect(JSON.stringify(structured(result)).toLowerCase()).not.toContain("database");
    expect(JSON.stringify(structured(result)).toLowerCase()).not.toContain("control-plane");
    expect(JSON.stringify(structured(result)).toLowerCase()).not.toContain("private_key");
    expect(JSON.stringify(structured(result)).toLowerCase()).not.toContain("payment-signature");

    await client.close();
    await server.close();
  });
});

function costEstimateResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    workflow_id: "stim_forecast_review",
    rail: "auto",
    total_stc_cost: 2,
    total_usd_cost: 0.4,
    quota_remaining_supplied: null,
    quota_sufficient: null,
    steps: [
      {
        step_id: "stim_latest",
        method: "GET",
        path: "/v1/stim/latest",
        pricing_rule_id: "stim_latest_paid",
        stc_cost: 1,
        usd_cost: 0.2,
        assigned_rail: "subscription",
        quota_impact: 1,
        purpose: "Mock step.",
        safe_example_request: {
          symbol_exchange: "AAPL_XNAS"
        }
      }
    ],
    notes: ["Mock estimate."],
    ...overrides
  };
}

async function expectToolError(
  fetchImpl: FetchLike,
  errorCode: string,
  args: Record<string, unknown> = {
    workflow_id: "stim_forecast_review"
  }
): Promise<void> {
  const fetchFn = vi.fn<FetchLike>(fetchImpl);
  const { client, server } = await connectMcp(fetchFn);

  try {
    const result = await client.callTool({
      name: COST_ESTIMATE_TOOL_NAME,
      arguments: args
    });
    const body = structured(result);

    expect(result.isError).toBe(true);
    expect(body.error.error_code).toBe(errorCode);
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(body.paid_execution_authorized).toBe(false);
    expect(body.payment_authorized).toBe(false);
    if (fetchFn.mock.calls.length > 0) {
      expect(fetchFn.mock.calls[0]?.[0].pathname).toBe(COST_ESTIMATE_ENDPOINT_PATH);
      expect(fetchFn.mock.calls[0]?.[0].pathname).not.toBe("/v1/pricing/catalog");
      expect(fetchFn.mock.calls[0]?.[0].pathname).not.toBe("/v1/workflows");
      expect(JSON.stringify(fetchFn.mock.calls[0]?.[1].headers).toLowerCase()).not.toContain("authorization");
      expect(JSON.stringify(fetchFn.mock.calls[0]?.[1].headers).toLowerCase()).not.toContain("api-key");
      expect(JSON.stringify(fetchFn.mock.calls[0]?.[1].headers).toLowerCase()).not.toContain("payment");
    }
  } finally {
    await client.close();
    await server.close();
  }
}

function structured(result: Awaited<ReturnType<import("@modelcontextprotocol/sdk/client/index.js").Client["callTool"]>>): Record<string, any> {
  if (!("structuredContent" in result) || !result.structuredContent) {
    throw new Error(`Expected structured tool content, got ${JSON.stringify(result)}`);
  }

  return result.structuredContent as Record<string, any>;
}

function text(result: Awaited<ReturnType<import("@modelcontextprotocol/sdk/client/index.js").Client["callTool"]>>): string {
  if (!("content" in result) || !Array.isArray(result.content)) {
    return "";
  }

  return result.content.map((item) => ("text" in item ? item.text : "")).join("\n");
}
