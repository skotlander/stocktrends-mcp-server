import { describe, expect, it, vi } from "vitest";
import { parseConfig, type Env } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";
import { createLogger, safeErrorMessage } from "../src/logging.js";
import {
  assertPaidCallPolicySatisfied,
  assertPaidEndpointAllowed,
  buildPaidAuthHeaders,
  PAID_ENDPOINT_POLICIES,
  PHASE3_PAID_TOOLS_REGISTERED,
  PHASE4_PAID_EXECUTION_ENABLED,
  type PaidPreflightEvaluationInput
} from "../src/paidPolicy.js";
import { redactSensitiveText } from "../src/redaction.js";
import { listPublicResourceUris, PHASE1_PROMPT_DEFINITIONS, PHASE1_TOOL_DEFINITIONS, PUBLIC_RESOURCES } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { COST_ESTIMATE_TOOL_NAME, PAID_RUNTIME_TOOL_DEFINITIONS } from "../src/tools/index.js";
import { connectMcp, jsonResponse } from "./helpers.js";

const EXPECTED_PUBLIC_RESOURCE_URIS = [
  "stocktrends://api/openapi",
  "stocktrends://ai/context",
  "stocktrends://ai/tools",
  "stocktrends://workflows",
  "stocktrends://methodology/stim",
  "stocktrends://methodology/indicators",
  "stocktrends://methodology/inference",
  "stocktrends://pricing/catalog",
  "stocktrends://proof/market-edge",
  "stocktrends://leadership/definitions"
];

const PAID_ENV_MATRIX: Array<{ label: string; env: Env }> = [
  { label: "paid flag absent and API key absent", env: {} },
  { label: "paid flag false and API key absent", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "false" } },
  { label: "paid flag false and API key present", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "false", STOCKTRENDS_API_KEY: "ignored-secret" } },
  { label: "paid flag absent and API key present", env: { STOCKTRENDS_API_KEY: "ignored-secret" } },
  { label: "paid flag true and API key absent", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "true" } },
  { label: "paid flag true and API key present", env: { STOCKTRENDS_ENABLE_PAID_TOOLS: "true", STOCKTRENDS_API_KEY: "configured-secret" } }
];

describe("Phase 3 paid-auth foundation", () => {
  it.each(PAID_ENV_MATRIX)("keeps resources unchanged with the public planning tool and zero prompts when $label", async ({ env }) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, env);

    const resources = await client.listResources();
    const tools = await client.listTools();

    // The paired paid ST-IM and paired paid indicators tool *definitions*, the
    // base selections tool, and the four market-context tools are only exposed
    // when paid mode is enabled with an API key. Every other env keeps the single
    // public planning tool. The paid-exposed surface is exactly ten tools
    // (PR 39 + PR 45 + PR 51).
    const paidToolsExposed = env.STOCKTRENDS_ENABLE_PAID_TOOLS === "true" && Boolean(env.STOCKTRENDS_API_KEY);
    const expectedToolNames = paidToolsExposed
      ? [
          COST_ESTIMATE_TOOL_NAME, "stocktrends_lookup_instruments", "stocktrends_resolve_instrument",
          "stocktrends_get_stim_latest",
          "stocktrends_get_stim_history",
          "stocktrends_get_indicators_latest",
          "stocktrends_get_indicators_history",
          "stocktrends_get_selections_latest",
          "stocktrends_get_market_regime_latest",
          "stocktrends_get_market_regime_history",
          "stocktrends_get_breadth_sector_latest",
          "stocktrends_get_leadership_summary_latest"
        ].sort()
      : [COST_ESTIMATE_TOOL_NAME, "stocktrends_lookup_instruments", "stocktrends_resolve_instrument"];

    expect(fetchFn).not.toHaveBeenCalled();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
    expect(listPublicResourceUris()).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
    expect(PHASE1_TOOL_DEFINITIONS).toEqual([]);
    expect(PAID_RUNTIME_TOOL_DEFINITIONS).toEqual([]);
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual(expectedToolNames);
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);
    expect(client.getServerCapabilities()?.tools).toBeDefined();
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();

    await client.close();
    await server.close();
  });

  it("keeps public resources readable without auth headers when paid mode is blocked by a missing API key", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true"
    });

    await client.readResource({
      uri: "stocktrends://api/openapi"
    });

    const init = fetchFn.mock.calls[0]?.[1];

    expect(init?.headers).toEqual({
      Accept: "application/json",
      "User-Agent": "stocktrends-mcp-server/1.0"
    });

    await client.close();
    await server.close();
  });

  it("keeps the paid auth helper scoped to the configured Stock Trends API origin and policy gate", () => {
    const config = parseConfig({
      STOCKTRENDS_API_BASE_URL: "https://staging.stocktrends.com",
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "phase3-helper-secret",
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "1",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "1",
      STOCKTRENDS_MAX_STC_PER_SESSION: "1"
    });
    const allowedInput = paidPreflightInput("https://staging.stocktrends.com/v1/stim/latest?symbol_exchange=AAPL_XNAS");

    // Build is execution-capable, but this config sets no runtime execution
    // flag, so the coupled auth boundary still refuses to construct a header.
    expect(PHASE4_PAID_EXECUTION_ENABLED).toBe(true);
    expect(() => buildPaidAuthHeaders(config, allowedInput)).toThrow(StockTrendsMcpError);

    for (const target of [
      "https://api.stocktrends.com/v1/stim/latest",
      "https://example.com/v1/stim/latest",
      "http://staging.stocktrends.com/v1/stim/latest",
      "https://user:pass@staging.stocktrends.com/v1/stim/latest",
      "https://staging.stocktrends.com/v1/stim/latest#fragment"
    ]) {
      expect(() => buildPaidAuthHeaders(config, paidPreflightInput(target))).toThrow(StockTrendsMcpError);

      try {
        buildPaidAuthHeaders(config, paidPreflightInput(target));
      } catch (error) {
        expect(serializedSafeError(error)).not.toContain("phase3-helper-secret");
      }
    }
  });

  it("does not construct auth headers from API-key-only public configuration", () => {
    const config = parseConfig({
      STOCKTRENDS_API_KEY: "key-alone-must-not-enable-auth"
    });

    expect(() => buildPaidAuthHeaders(config, paidPreflightInput("https://api.stocktrends.com/v1/stim/latest"))).toThrow(StockTrendsMcpError);

    try {
      buildPaidAuthHeaders(config, paidPreflightInput("https://api.stocktrends.com/v1/stim/latest"));
    } catch (error) {
      expect(serializedSafeError(error)).not.toContain("key-alone-must-not-enable-auth");
    }
  });

  it("defines only a narrow static paid endpoint policy and does not register it as public resources", () => {
    expect(PHASE3_PAID_TOOLS_REGISTERED).toBe(false);
    expect(PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath)).toEqual([
      "/v1/stim/latest",
      "/v1/stim/history",
      "/v1/indicators/latest",
      "/v1/indicators/history",
      "/v1/selections/latest",
      "/v1/market/regime/latest",
      "/v1/market/regime/history",
      "/v1/breadth/sector/latest",
      "/v1/leadership/summary/latest"
    ]);
    expect(PAID_ENDPOINT_POLICIES.every((policy) => policy.httpMethod === "GET")).toBe(true);
    expect(PAID_ENDPOINT_POLICIES.every((policy) => policy.requiresPricingPreflight)).toBe(true);
    expect(PAID_ENDPOINT_POLICIES.find((policy) => policy.endpointPath === "/v1/stim/latest")?.pricingRuleId).toBe("stim_latest_paid");
    expect(PAID_ENDPOINT_POLICIES.find((policy) => policy.endpointPath === "/v1/stim/history")?.pricingRuleId).toBe("stim_history_paid");
    expect(PAID_ENDPOINT_POLICIES.find((policy) => policy.endpointPath === "/v1/stim/latest")?.requiredHistoryPair).toBe(
      "stocktrends_get_stim_history"
    );
    expect(PAID_ENDPOINT_POLICIES.find((policy) => policy.endpointPath === "/v1/indicators/latest")?.requiredHistoryPair).toBe(
      "stocktrends_get_indicators_history"
    );
    // A still-non-allowlisted paid route (base selections/latest was promoted in
    // PR 45, but selections history and the published pair remain off-allowlist).
    expect(() => assertPaidEndpointAllowed("/v1/selections/history")).toThrow(StockTrendsMcpError);

    const registeredResourceEndpoints = PUBLIC_RESOURCES.map((resource) => resource.endpointPath);

    for (const policy of PAID_ENDPOINT_POLICIES) {
      expect(registeredResourceEndpoints).not.toContain(policy.endpointPath);
    }
  });

  it("keeps pricing/spend policy fail-closed until pricing and local authorization are implemented", () => {
    const config = parseConfig({
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "phase3-policy-secret",
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "1",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "1"
    });

    expect(config.paidTools.spendPolicy).toMatchObject({
      pricingPreflightRequired: true,
      maxPaidCallsPerSession: 1,
      maxPaidCallsPerTool: 1,
      automaticPaidRetries: false,
      paidCallsAuthorizedInThisBuild: true
    });

    const paidCallAttempt = {
      endpointPath: "/v1/stim/history",
      toolName: "stocktrends_get_stim_history",
      pricingDetermined: true,
      localPolicyAuthorized: true
    };

    expect(() => assertPaidCallPolicySatisfied(config, paidCallAttempt)).toThrow(StockTrendsMcpError);

    try {
      assertPaidCallPolicySatisfied(config, paidCallAttempt);
    } catch (error) {
      expect(error).toMatchObject({
        errorCode: "paid_execution_disabled"
      });
      expect(serializedSafeError(error)).not.toContain("phase3-policy-secret");
    }
  });

  it("blocks paid policy checks when pricing has not been determined", () => {
    const config = parseConfig({
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "phase3-preflight-secret"
    });

    expect(() =>
      assertPaidCallPolicySatisfied(config, {
        endpointPath: "/v1/stim/history",
        toolName: "stocktrends_get_stim_history",
        pricingDetermined: false,
        localPolicyAuthorized: true
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("redacts API keys, auth headers, payment headers, and known secrets from logs and error text", () => {
    const text = [
      "STOCKTRENDS_API_KEY=phase3-redact-secret",
      "Authorization: Bearer phase3-bearer-secret",
      "X-API-Key: phase3-header-secret",
      "PAYMENT-SIGNATURE: phase3-payment-secret",
      "loose-known-secret"
    ].join(" ");

    const redacted = redactSensitiveText(text, ["loose-known-secret"]);

    for (const secret of [
      "phase3-redact-secret",
      "phase3-bearer-secret",
      "phase3-header-secret",
      "phase3-payment-secret",
      "loose-known-secret"
    ]) {
      expect(redacted).not.toContain(secret);
    }

    expect(safeErrorMessage(new Error(text), ["loose-known-secret"])).not.toContain("phase3-redact-secret");

    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const logger = createLogger({ logLevel: "warn" });
      logger.warn(text);

      const logged = String(stderrSpy.mock.calls[0]?.[0]);

      expect(logged).toContain("[REDACTED]");
      expect(logged).not.toContain("phase3-header-secret");
      expect(logged).not.toContain("phase3-payment-secret");
    } finally {
      stderrSpy.mockRestore();
    }
  });
});

function paidPreflightInput(target: string): PaidPreflightEvaluationInput {
  return {
    toolName: "stocktrends_get_stim_latest",
    endpointPath: "/v1/stim/latest",
    httpMethod: "GET",
    targetUrl: new URL(target),
    costEstimate: {
      amount: 0.25,
      unit: "STC",
      authoritative: true,
      pricingSource: "pricing_catalog",
      pricingRuleId: "stim_latest_paid",
      fetchedAt: "2026-07-07T00:00:00.000Z"
    }
  };
}

function serializedSafeError(error: unknown): string {
  if (error instanceof StockTrendsMcpError) {
    return `${error.message} ${JSON.stringify(error.toSafeData())}`;
  }

  return safeErrorMessage(error);
}
