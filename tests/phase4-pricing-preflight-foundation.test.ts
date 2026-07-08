import { describe, expect, it } from "vitest";
import { parseConfig, type Env } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";
import {
  assertPaidPreflightAuthorized,
  buildPaidAuthHeaders,
  evaluatePaidPreflight,
  PAID_ENDPOINT_POLICIES,
  PHASE4_PAID_EXECUTION_ENABLED,
  type PaidCostEstimate,
  type PaidPreflightDecision,
  type PaidPreflightEvaluationInput
} from "../src/paidPolicy.js";
import { PHASE1_PROMPT_DEFINITIONS, PHASE1_TOOL_DEFINITIONS, PUBLIC_RESOURCES } from "../src/resources/index.js";
import { PUBLIC_PLANNING_TOOL_DEFINITIONS } from "../src/tools/index.js";

describe("Phase 4 pricing/preflight foundation", () => {
  it("models a complete synthetic preflight decision while paid execution stays disabled", () => {
    const config = paidConfig();
    const input = stimLatestInput();
    const decision = evaluatePaidPreflight(config, input);

    expect(PHASE4_PAID_EXECUTION_ENABLED).toBe(false);
    expect(decision).toMatchObject({
      toolName: "stocktrends_get_stim_latest",
      endpointPath: "/v1/stim/latest",
      httpMethod: "GET",
      estimatedCost: {
        amount: 0.25,
        unit: "STC",
        authoritative: true,
        pricingSource: "pricing_catalog",
        pricingRuleId: "stim_latest_paid",
        fetchedAt: "2026-07-07T00:00:00.000Z"
      },
      costEstimateAuthoritative: true,
      pricingSource: "pricing_catalog",
      fetchedAt: "2026-07-07T00:00:00.000Z",
      localPolicyDecision: "deny",
      denialReason: "paid_execution_disabled",
      capState: {
        perSessionPaidCallCap: {
          limit: 3,
          current: 0,
          projected: 1,
          wouldExceed: false
        },
        perToolPaidCallCap: {
          limit: 2,
          current: 0,
          projected: 1,
          wouldExceed: false
        },
        stcBudgetCap: {
          limit: 10,
          current: 0,
          projected: 0.25,
          wouldExceed: false,
          configured: true
        },
        automaticPaidRetries: false
      }
    });
    expectPreflightError(decision, "paid_execution_disabled");
    expectBuildAuthError(config, input, "paid_execution_disabled");
  });

  it("denies when estimated cost is missing", () => {
    const decision = evaluatePaidPreflight(
      paidConfig(),
      stimLatestInput({
        costEstimate: null
      })
    );

    expect(decision.denialReason).toBe("missing_pricing");
    expect(decision.estimatedCost).toBeNull();
    expectPreflightError(decision, "paid_pricing_missing");
  });

  it("denies when pricing is not authoritative enough", () => {
    const decision = evaluatePaidPreflight(
      paidConfig(),
      stimLatestInput({
        costEstimate: stcCost({
          authoritative: false,
          pricingSource: "explicit_test_estimate"
        })
      })
    );

    expect(decision.denialReason).toBe("non_authoritative_pricing");
    expectPreflightError(decision, "paid_pricing_non_authoritative");
  });

  it("denies catalog estimates that do not match the endpoint pricing rule", () => {
    const decision = evaluatePaidPreflight(
      paidConfig(),
      stimLatestInput({
        costEstimate: stcCost({
          pricingRuleId: "wrong_rule"
        })
      })
    );

    expect(decision.denialReason).toBe("non_authoritative_pricing");
    expectPreflightError(decision, "paid_pricing_non_authoritative");
  });

  it("denies when the STC budget cap would be exceeded", () => {
    const decision = evaluatePaidPreflight(
      paidConfig({
        STOCKTRENDS_MAX_STC_PER_SESSION: "1"
      }),
      stimLatestInput({
        costEstimate: stcCost({
          amount: 2
        })
      })
    );

    expect(decision.denialReason).toBe("cap_exceeded");
    expect(decision.capState.stcBudgetCap).toMatchObject({
      limit: 1,
      current: 0,
      projected: 2,
      wouldExceed: true
    });
    expectPreflightError(decision, "paid_spend_cap_exceeded");
  });

  it("denies when the USD budget cap would be exceeded before auth headers can be built", () => {
    const config = paidConfig({
      STOCKTRENDS_MAX_USD_PER_SESSION: "1"
    });
    const input = stimLatestInput({
      costEstimate: usdCost({
        amount: 2
      })
    });
    const decision = evaluatePaidPreflight(config, input);

    expect(PHASE4_PAID_EXECUTION_ENABLED).toBe(false);
    expect(decision.denialReason).toBe("cap_exceeded");
    expect(decision.capState.usdBudgetCap).toMatchObject({
      limit: 1,
      current: 0,
      projected: 2,
      wouldExceed: true,
      configured: true
    });
    expect(decision.capState.stcBudgetCap.wouldExceed).toBe(false);
    expectPreflightError(decision, "paid_spend_cap_exceeded");
    expectBuildAuthError(config, input, "paid_spend_cap_exceeded");
  });

  it("denies when the per-session paid call cap would be exceeded", () => {
    const decision = evaluatePaidPreflight(
      paidConfig({
        STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "1",
        STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "5"
      }),
      stimLatestInput({
        usage: {
          paidCallsThisSession: 1
        }
      })
    );

    expect(decision.denialReason).toBe("cap_exceeded");
    expect(decision.capState.perSessionPaidCallCap).toMatchObject({
      limit: 1,
      current: 1,
      projected: 2,
      wouldExceed: true
    });
    expectPreflightError(decision, "paid_spend_cap_exceeded");
  });

  it("denies when the per-tool paid call cap would be exceeded", () => {
    const decision = evaluatePaidPreflight(
      paidConfig({
        STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "5",
        STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "1"
      }),
      stimLatestInput({
        usage: {
          paidCallsByTool: {
            stocktrends_get_stim_latest: 1
          }
        }
      })
    );

    expect(decision.denialReason).toBe("cap_exceeded");
    expect(decision.capState.perToolPaidCallCap).toMatchObject({
      limit: 1,
      current: 1,
      projected: 2,
      wouldExceed: true
    });
    expectPreflightError(decision, "paid_spend_cap_exceeded");
  });

  it("denies non-allowlisted paid endpoints before auth headers can be built", () => {
    const config = paidConfig();
    const input = stimLatestInput({
      toolName: "stocktrends_get_selections_latest",
      endpointPath: "/v1/selections/latest",
      targetUrl: new URL("https://api.stocktrends.com/v1/selections/latest")
    });
    const decision = evaluatePaidPreflight(config, input);

    expect(decision.denialReason).toBe("endpoint_not_allowlisted");
    expectPreflightError(decision, "unapproved_paid_endpoint");
    expectBuildAuthError(config, input, "unapproved_paid_endpoint");
  });

  it("denies non-approved hosts before auth headers can be built", () => {
    const config = paidConfig();
    const input = stimLatestInput({
      targetUrl: new URL("https://example.com/v1/stim/latest")
    });
    const decision = evaluatePaidPreflight(config, input);

    expect(decision.denialReason).toBe("host_not_approved");
    expectPreflightError(decision, "unapproved_auth_host");
    expectBuildAuthError(config, input, "unapproved_auth_host");
  });

  it("keeps ST-IM latest/history only as static paid policy metadata, not resources or tools", () => {
    expect(PAID_ENDPOINT_POLICIES.filter((policy) => policy.endpointPath.startsWith("/v1/stim/"))).toEqual([
      expect.objectContaining({
        toolName: "stocktrends_get_stim_latest",
        endpointPath: "/v1/stim/latest",
        httpMethod: "GET",
        pricingRuleId: "stim_latest_paid"
      }),
      expect.objectContaining({
        toolName: "stocktrends_get_stim_history",
        endpointPath: "/v1/stim/history",
        httpMethod: "GET",
        pricingRuleId: "stim_history_paid"
      })
    ]);

    const publicResourceEndpoints = PUBLIC_RESOURCES.map((resource) => resource.endpointPath);
    const publicResourceUris = PUBLIC_RESOURCES.map((resource) => resource.uri);
    const serializedTools = JSON.stringify({
      phase1Tools: PHASE1_TOOL_DEFINITIONS,
      publicPlanningTools: PUBLIC_PLANNING_TOOL_DEFINITIONS
    });
    const serializedPrompts = JSON.stringify(PHASE1_PROMPT_DEFINITIONS);

    expect(publicResourceEndpoints).not.toContain("/v1/stim/latest");
    expect(publicResourceEndpoints).not.toContain("/v1/stim/history");
    expect(publicResourceUris).not.toContain("stocktrends://stim/latest");
    expect(publicResourceUris).not.toContain("stocktrends://stim/history");
    expect(serializedTools).not.toContain("stocktrends_get_stim_latest");
    expect(serializedTools).not.toContain("stocktrends_get_stim_history");
    expect(serializedPrompts).toBe("[]");
  });

  it("does not introduce wallet, OAuth, remote, database, control-plane, or paid execution behavior into the visible MCP surface", () => {
    const visibleSurface = JSON.stringify({
      resources: PUBLIC_RESOURCES,
      tools: PHASE1_TOOL_DEFINITIONS,
      publicPlanningTools: PUBLIC_PLANNING_TOOL_DEFINITIONS,
      prompts: PHASE1_PROMPT_DEFINITIONS
    }).toLowerCase();

    for (const forbidden of ["wallet", "oauth", "database", "control-plane", "control_plane", "remote", "streamable", "sse", "paid_execution_authorized"]) {
      expect(visibleSurface).not.toContain(forbidden);
    }
  });
});

function paidConfig(overrides: Env = {}) {
  return parseConfig({
    STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
    STOCKTRENDS_API_KEY: "phase4-test-secret",
    STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "3",
    STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "2",
    STOCKTRENDS_MAX_STC_PER_SESSION: "10",
    STOCKTRENDS_MAX_USD_PER_SESSION: "10",
    ...overrides
  });
}

function stimLatestInput(overrides: Partial<PaidPreflightEvaluationInput> = {}): PaidPreflightEvaluationInput {
  const endpointPath = overrides.endpointPath ?? "/v1/stim/latest";

  return {
    toolName: "stocktrends_get_stim_latest",
    endpointPath,
    httpMethod: "GET",
    targetUrl: new URL(`https://api.stocktrends.com${endpointPath}`),
    costEstimate: stcCost(),
    ...overrides
  };
}

function stcCost(overrides: Partial<PaidCostEstimate> = {}): PaidCostEstimate {
  return {
    amount: 0.25,
    unit: "STC",
    authoritative: true,
    pricingSource: "pricing_catalog",
    pricingRuleId: "stim_latest_paid",
    fetchedAt: "2026-07-07T00:00:00.000Z",
    ...overrides
  };
}

function usdCost(overrides: Partial<PaidCostEstimate> = {}): PaidCostEstimate {
  return {
    amount: 0.5,
    unit: "USD",
    authoritative: true,
    pricingSource: "pricing_catalog",
    pricingRuleId: "stim_latest_paid",
    fetchedAt: "2026-07-07T00:00:00.000Z",
    ...overrides
  };
}

function expectPreflightError(decision: PaidPreflightDecision, errorCode: string): void {
  try {
    assertPaidPreflightAuthorized(decision);
  } catch (error) {
    expect(error).toBeInstanceOf(StockTrendsMcpError);
    expect(error).toMatchObject({ errorCode });
    expect(serializedSafeError(error)).not.toContain("phase4-test-secret");
    return;
  }

  throw new Error(`Expected preflight denial ${errorCode}.`);
}

function expectBuildAuthError(config: ReturnType<typeof parseConfig>, input: PaidPreflightEvaluationInput, errorCode: string): void {
  try {
    buildPaidAuthHeaders(config, input);
  } catch (error) {
    expect(error).toBeInstanceOf(StockTrendsMcpError);
    expect(error).toMatchObject({ errorCode });
    expect(serializedSafeError(error)).not.toContain("phase4-test-secret");
    return;
  }

  throw new Error(`Expected auth header denial ${errorCode}.`);
}

function serializedSafeError(error: unknown): string {
  if (error instanceof StockTrendsMcpError) {
    return `${error.message} ${JSON.stringify(error.toSafeData())}`;
  }

  return String(error);
}
