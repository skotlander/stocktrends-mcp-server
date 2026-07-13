import { describe, expect, it } from "vitest";
import { DEFAULT_API_BASE_URL, parseConfig } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";

describe("config", () => {
  it("uses Phase 1 defaults", () => {
    const config = parseConfig({});

    expect(config.apiBaseUrl.href).toBe(`${DEFAULT_API_BASE_URL}/`);
    expect(config.transport).toBe("stdio");
    expect(config.logLevel).toBe("warn");
    expect(config.requestTimeoutMs).toBe(10_000);
    expect(config.paidTools).toMatchObject({
      requested: false,
      apiKeyConfigured: false,
      status: "disabled",
      runtimeToolsRegistered: false,
      spendPolicy: {
        pricingPreflightRequired: true,
        maxPaidCallsPerSession: 0,
        maxPaidCallsPerTool: 0,
        maxStcPerSession: null,
        maxUsdPerSession: null,
        automaticPaidRetries: false,
        paidCallsAuthorizedInThisBuild: true
      }
    });
    expect(config.paidTools.executionEnabled).toBe(false);
    expect(config.paidTools.requirePricingPreflight).toBe(true);
    expect(config.x402Relay).toEqual({
      relayEnabled: false,
      challengeExecutionEnabled: false,
      proofForwardingEnabled: false,
      mockOnly: true,
      mode: "disabled"
    });
  });

  it("supports a configured Stock Trends API base URL", () => {
    const config = parseConfig({
      STOCKTRENDS_API_BASE_URL: "https://staging.stocktrends.com",
      STOCKTRENDS_MCP_TRANSPORT: "stdio"
    });

    expect(config.apiBaseUrl.href).toBe("https://staging.stocktrends.com/");
  });

  it("ignores API key configuration unless paid tools are explicitly enabled", () => {
    const config = parseConfig({
      STOCKTRENDS_API_KEY: "not-used-without-paid-flag"
    });

    expect(config.transport).toBe("stdio");
    expect(config.paidTools.apiKeyConfigured).toBe(false);
    expect(config.paidTools.apiKey).toBeUndefined();
  });

  it("does not read STOCKTRENDS_API_KEY when the paid flag is absent or false", () => {
    const envTargets: Array<Record<string, string | undefined>> = [{}, { STOCKTRENDS_ENABLE_PAID_TOOLS: "false" }];

    for (const envTarget of envTargets) {
      const env = new Proxy(envTarget, {
        get(target, property: string | symbol) {
          if (property === "STOCKTRENDS_API_KEY") {
            throw new Error("STOCKTRENDS_API_KEY should not be read.");
          }

          return typeof property === "string" ? target[property] : undefined;
        }
      });

      const config = parseConfig(env);

      expect(config.paidTools.status).toBe("disabled");
    }
  });

  it("blocks paid mode without breaking public configuration when the flag is true but the API key is missing", () => {
    const config = parseConfig({
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true"
    });

    expect(config.transport).toBe("stdio");
    expect(config.paidTools).toMatchObject({
      requested: true,
      apiKeyConfigured: false,
      status: "blocked_missing_api_key",
      runtimeToolsRegistered: false
    });
  });

  it("stores a paid API key only for explicit paid-mode configuration and keeps it out of JSON diagnostics", () => {
    const config = parseConfig({
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "phase3-test-secret",
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "3",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "2",
      STOCKTRENDS_MAX_STC_PER_SESSION: "5.5"
    });

    expect(config.paidTools).toMatchObject({
      requested: true,
      apiKeyConfigured: true,
      status: "configured_foundation_no_execution",
      runtimeToolsRegistered: false,
      spendPolicy: {
        maxPaidCallsPerSession: 3,
        maxPaidCallsPerTool: 2,
        maxStcPerSession: 5.5,
        maxUsdPerSession: null,
        pricingPreflightRequired: true,
        automaticPaidRetries: false,
        paidCallsAuthorizedInThisBuild: true
      }
    });
    expect(config.paidTools.executionEnabled).toBe(false);
    expect(config.paidTools.status).toBe("configured_foundation_no_execution");
    expect(config.paidTools.apiKey).toBe("phase3-test-secret");
    expect(JSON.stringify(config.paidTools)).not.toContain("phase3-test-secret");
  });

  it("enables execution only when the paid-execution flag is set with a key, and never from the flag alone", () => {
    const enabled = parseConfig({
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "phase4-test-secret",
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
      STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "2",
      STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL: "2",
      STOCKTRENDS_MAX_STC_PER_SESSION: "5"
    });

    expect(enabled.paidTools.executionEnabled).toBe(true);
    expect(enabled.paidTools.status).toBe("configured_execution_enabled");

    // Execution flag with paid tools but NO key: blocked, execution impossible.
    const noKey = parseConfig({
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true"
    });
    expect(noKey.paidTools.status).toBe("blocked_missing_api_key");
    expect(noKey.paidTools.executionEnabled).toBe(false);

    // Execution flag WITHOUT the paid-tools flag: paid mode not requested at all.
    const noPaidFlag = parseConfig({
      STOCKTRENDS_ENABLE_PAID_EXECUTION: "true",
      STOCKTRENDS_API_KEY: "phase4-test-secret"
    });
    expect(noPaidFlag.paidTools.requested).toBe(false);
    expect(noPaidFlag.paidTools.executionEnabled).toBe(false);
    expect(noPaidFlag.paidTools.status).toBe("disabled");
  });

  it("defaults the pricing-preflight posture to required and rejects invalid values", () => {
    const explicitFalse = parseConfig({
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "phase4-test-secret",
      STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT: "false"
    });
    expect(explicitFalse.paidTools.requirePricingPreflight).toBe(false);

    expect(() =>
      parseConfig({
        STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
        STOCKTRENDS_API_KEY: "phase4-test-secret",
        STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT: "maybe"
      })
    ).toThrow(StockTrendsMcpError);

    expect(() =>
      parseConfig({
        STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
        STOCKTRENDS_API_KEY: "phase4-test-secret",
        STOCKTRENDS_ENABLE_PAID_EXECUTION: "sometimes"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("rejects unsupported transports", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_MCP_TRANSPORT: "streamable-http"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("rejects arbitrary API origins", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://example.com"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("rejects base URLs with credentials, query, fragment, or routes", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://user:pass@api.stocktrends.com"
      })
    ).toThrow(StockTrendsMcpError);

    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://api.stocktrends.com?token=unsafe"
      })
    ).toThrow(StockTrendsMcpError);

    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://api.stocktrends.com#unsafe"
      })
    ).toThrow(StockTrendsMcpError);

    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://api.stocktrends.com/v1"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("rejects invalid paid-mode configuration instead of enabling paid behavior silently", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_ENABLE_PAID_TOOLS: "yes"
      })
    ).toThrow(StockTrendsMcpError);

    expect(() =>
      parseConfig({
        STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
        STOCKTRENDS_API_KEY: "phase3-test-secret",
        STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION: "-1"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("keeps provisional x402 relay flags default-off", () => {
    const config = parseConfig({});

    expect(config.x402Relay).toMatchObject({
      relayEnabled: false,
      challengeExecutionEnabled: false,
      proofForwardingEnabled: false,
      mockOnly: true,
      mode: "disabled"
    });
  });

  it("enables mock-only x402 challenge mode only with literal true on both gates", () => {
    const config = parseConfig({
      STOCKTRENDS_ENABLE_X402_RELAY: "true",
      STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true"
    });

    expect(config.x402Relay).toMatchObject({
      relayEnabled: true,
      challengeExecutionEnabled: true,
      proofForwardingEnabled: false,
      mockOnly: true,
      mode: "mock_challenge_enabled"
    });
  });

  it.each(["1", "yes", "on", "enabled"])("rejects ambiguous x402 truthy value %s", (value) => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_ENABLE_X402_RELAY: value
      })
    ).toThrow(StockTrendsMcpError);
  });

  it.each(["false", "0", "no", "off"])("accepts explicit x402 off value %s", (value) => {
    const config = parseConfig({
      STOCKTRENDS_ENABLE_X402_RELAY: value,
      STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: value,
      STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING: value
    });

    expect(config.x402Relay.mode).toBe("disabled");
    expect(config.x402Relay.proofForwardingEnabled).toBe(false);
  });

  it("rejects x402 proof forwarding true as unsupported in the mock-only build", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING: "true"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("fails closed when x402 challenge execution is requested without the relay gate", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("fails closed on x402/API-key paid-mode ambiguity before reading STOCKTRENDS_API_KEY", () => {
    const envTarget = {
      STOCKTRENDS_ENABLE_X402_RELAY: "true",
      STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true",
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true"
    };
    const env = new Proxy(envTarget, {
      get(target, property: string | symbol) {
        if (property === "STOCKTRENDS_API_KEY") {
          throw new Error("STOCKTRENDS_API_KEY should not be read for a mixed x402 config.");
        }

        return typeof property === "string" ? target[property as keyof typeof target] : undefined;
      }
    });

    expect(() => parseConfig(env)).toThrow(StockTrendsMcpError);
  });
});
