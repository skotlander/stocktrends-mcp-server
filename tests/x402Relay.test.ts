import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.js";
import { AUTH_CAPABLE_PAID_ENDPOINT_POLICIES } from "../src/paidPolicy.js";
import { redactSensitiveText } from "../src/redaction.js";
import { COST_ESTIMATE_TOOL_NAME } from "../src/tools/index.js";
import {
  buildMockX402ChallengeRelayResult,
  createMockX402ChallengeFixture,
  isX402RouteAllowlisted,
  X402_CHALLENGE_FIELD_CATEGORIES,
  X402_CHALLENGE_HEADER_NAMES,
  X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST,
  X402_CHALLENGE_TOP_LEVEL_BODY_KEYS,
  type X402ChallengeRelayRequest,
  type X402MockChallengeFixture
} from "../src/x402Relay.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { connectMcp, jsonResponse } from "./helpers.js";

const X402_ENV = {
  STOCKTRENDS_ENABLE_X402_RELAY: "true",
  STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true"
};

const REQUEST: X402ChallengeRelayRequest = {
  toolName: "stocktrends_get_market_regime_latest",
  endpointPath: "/v1/market/regime/latest"
};

describe("Phase 5F x402 mock challenge relay config and surface", () => {
  it("does not change public MCP tool count, resources, or prompts when mock x402 flags are enabled", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, X402_ENV);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    const resources = await client.listResources();

    expect(toolNames).toEqual([COST_ESTIMATE_TOOL_NAME]);
    expect(resources.resources).toHaveLength(10);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("keeps API-key paid mode unchanged when x402 flags are absent", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "mock-api-key-for-existing-paid-mode"
    });

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);

    expect(toolNames).toHaveLength(10);
    expect(toolNames).toContain("stocktrends_get_stim_latest");
    expect(toolNames).toContain("stocktrends_get_leadership_summary_latest");

    await client.close();
    await server.close();
  });
});

describe("Phase 5F x402 mock challenge relay allowlist", () => {
  it("uses exactly the nine current auth-capable paid routes", () => {
    expect(X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST).toEqual([
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
    expect(X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST).toEqual(AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath));
    expect(X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST).toHaveLength(9);
  });

  it.each(["/v1/leadership/definitions", "/v1/pricing/catalog", "/v1/instruments/lookup", "/v1/breadth/sector/history"])(
    "fails closed before any action for non-allowlisted route %s",
    (endpointPath) => {
      const config = parseConfig(X402_ENV).x402Relay;
      const result = buildMockX402ChallengeRelayResult(config, {
        toolName: "stocktrends_unknown",
        endpointPath
      });

      expect(isX402RouteAllowlisted(endpointPath)).toBe(false);
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.error_code).toBe("x402_route_not_allowlisted");
      }
      expect(result.api_request_sent).toBe(false);
      expect(result.auth_header_sent).toBe(false);
      expect(result.payment_header_sent).toBe(false);
      expect(result.proof_forwarded).toBe(false);
      expect(result.spend_occurred).toBe(false);
    }
  );
});

describe("Phase 5F x402 mock challenge relay result normalization", () => {
  it("returns the structured payment_required result from a mock PR #64-shaped fixture", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const result = buildMockX402ChallengeRelayResult(config, REQUEST);

    expect(result.status).toBe("payment_required");
    if (result.status !== "payment_required") throw new Error("expected payment_required");

    expect(result.error_code).toBe("x402_payment_required");
    expect(result.api_status).toBe(402);
    expect(result.tool_name).toBe(REQUEST.toolName);
    expect(result.endpoint_path).toBe(REQUEST.endpointPath);
    expect(result.http_method).toBe("GET");
    expect(result.challenge.header_names_present).toEqual(X402_CHALLENGE_HEADER_NAMES);
    expect(result.challenge.top_level_body_keys_present).toEqual(X402_CHALLENGE_TOP_LEVEL_BODY_KEYS);
    expect(result.challenge.field_categories_present).toEqual(X402_CHALLENGE_FIELD_CATEGORIES);
    expect(result.challenge.safe_values).toEqual({
      payment_required: true,
      protocol: "<redacted-protocol>",
      resource: REQUEST.endpointPath,
      pricing: "<redacted-pricing>",
      accepted_payment_methods: "<redacted-accepted-payment-methods>",
      stocktrends_preview: "<redacted-stocktrends-preview>"
    });
  });

  it("allows the approved redacted mock challenge placeholders", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("payment_required");
  });

  it("sets every no-spend safety boolean false and returns no api_data", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const result = buildMockX402ChallengeRelayResult(config, REQUEST);
    const serialized = JSON.stringify(result);

    expect(result.paid_execution_authorized).toBe(false);
    expect(result.paid_execution_occurred).toBe(false);
    expect(result.api_request_sent).toBe(false);
    expect(result.auth_header_sent).toBe(false);
    expect(result.payment_header_sent).toBe(false);
    expect(result.proof_forwarded).toBe(false);
    expect(result.spend_occurred).toBe(false);
    expect(result.paid_api_data_returned).toBe(false);
    expect(result.mcp_metadata.mock_only).toBe(true);
    expect(result.mcp_metadata.public_tool_wiring).toBe("not_exposed");
    expect(result.mcp_metadata.automatic_paid_retries).toBe(false);
    expect(result.mcp_metadata.repeated_identical_policy).toBe("deferred_until_public_tool_wiring_no_fetch_or_spend");
    expect("api_data" in result).toBe(false);
    expect(serialized).not.toContain('"api_data":');
    expect(serialized).not.toContain("X-API-Key");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("PAYMENT-SIGNATURE");
  });

  it("does not need live fetch or resolver traffic for symbol-dependent mock routes", () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ should_not: "be called" }));
    const config = parseConfig(X402_ENV).x402Relay;
    const result = buildMockX402ChallengeRelayResult(config, {
      toolName: "stocktrends_get_indicators_latest",
      endpointPath: "/v1/indicators/latest"
    });

    expect(result.status).toBe("payment_required");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("fails closed when relay config is default-off", () => {
    const config = parseConfig({}).x402Relay;
    const result = buildMockX402ChallengeRelayResult(config, REQUEST);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_relay_disabled");
    }
    expect(result.api_request_sent).toBe(false);
  });

  it("fails closed when relay is enabled but challenge execution is not enabled", () => {
    const config = parseConfig({ STOCKTRENDS_ENABLE_X402_RELAY: "true" }).x402Relay;
    const result = buildMockX402ChallengeRelayResult(config, REQUEST);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_challenge_unavailable");
    }
  });

  it("rejects proof-like input with proof forwarding disabled", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const result = buildMockX402ChallengeRelayResult(config, {
      ...REQUEST,
      paymentEnvelope: { placeholder: "proof-like-value" }
    });

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_proof_forwarding_not_enabled");
    }
    expect(result.proof_forwarded).toBe(false);
    expect(result.payment_header_sent).toBe(false);
  });

  it("fails closed when required mock challenge shape is missing", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    delete fixture.headers["x-stocktrends-pricing-rule"];

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_challenge_unexpected_shape");
    }
  });

  it("fails closed when mock challenge headers drift beyond the PR #64 set", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    fixture.headers["x-stocktrends-extra-mock-header"] = "<redacted-extra-header>";

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_challenge_unexpected_shape");
    }
  });

  it("fails closed when mock challenge top-level body keys drift beyond the PR #64 set", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    fixture.body.extra_mock_key = "<redacted-extra-body-key>";

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_challenge_unexpected_shape");
    }
  });

  it("fails closed when mock challenge field categories drift beyond the PR #64 set", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    (fixture.body.pricing as Record<string, unknown>).fee = "<redacted-fee>";

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_challenge_unexpected_shape");
    }
  });

  it("fails closed when mock fixture contains paid output without proof", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture: X402MockChallengeFixture = {
      ...createMockX402ChallengeFixture(REQUEST.endpointPath),
      status: 200,
      body: {
        ...createMockX402ChallengeFixture(REQUEST.endpointPath).body,
        api_data: { rows: [{ symbol_exchange: "IBM-N" }] }
      }
    };

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_paid_output_without_proof");
    }
    expect(result.paid_api_data_returned).toBe(false);
  });

  it("fails closed when proof-like values appear under approved mock challenge keys", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    (fixture.body.pricing as Record<string, unknown>).amount = "PAYMENT_PROOF=placeholder-payment-proof";

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_secret_safety_violation");
    }
    expect(serialized).not.toContain("placeholder-payment-proof");
  });

  it("fails closed when payment-header-like values appear under approved mock challenge keys", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    fixture.body.protocol = "X-PAYMENT: placeholder-payment-header";

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_secret_safety_violation");
    }
    expect(JSON.stringify(result)).not.toContain("placeholder-payment-header");
  });

  it("fails closed when unsafe address-like values appear under approved mock challenge keys", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    (fixture.body.stocktrends_preview as Record<string, unknown>).address = "ADDRESS=placeholder-unsafe-address";

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_secret_safety_violation");
    }
    expect(JSON.stringify(result)).not.toContain("placeholder-unsafe-address");
  });

  it("fails closed when bare EVM-address-shaped values appear under approved mock challenge keys", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const fixture = createMockX402ChallengeFixture(REQUEST.endpointPath);
    const unsafeAddress = `0x${"1".repeat(40)}`;
    ((fixture.body.accepted_payment_methods as Record<string, unknown>[])[0] as Record<string, unknown>).recipient = unsafeAddress;

    const result = buildMockX402ChallengeRelayResult(config, REQUEST, fixture);
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_secret_safety_violation");
    }
    expect(serialized).not.toContain(unsafeAddress);
  });
});

describe("Phase 5F x402 redaction safety", () => {
  it("redacts proof, payment-header, wallet-like, and auth-like material", () => {
    const redacted = redactSensitiveText(
      [
        "PAYMENT-SIGNATURE: placeholder-payment-signature",
        "PAYMENT_PROOF=placeholder-payment-proof",
        "X402_PROOF=placeholder-x402-proof",
        "PAYMENT-REQUIRED: placeholder-payment-required",
        "X-STOCKTRENDS-PRICING-RULE: placeholder-pricing-rule",
        "ADDRESS=placeholder-address",
        "WALLET_ADDRESS=placeholder-wallet-address",
        "SEED_PHRASE=placeholder-seed-phrase",
        "PRIVATE_KEY=placeholder-private-key",
        "Authorization: Bearer placeholder-bearer-token"
      ].join("\n")
    );

    for (const unsafeValue of [
      "placeholder-payment-signature",
      "placeholder-payment-proof",
      "placeholder-x402-proof",
      "placeholder-payment-required",
      "placeholder-pricing-rule",
      "placeholder-address",
      "placeholder-wallet-address",
      "placeholder-seed-phrase",
      "placeholder-private-key",
      "placeholder-bearer-token"
    ]) {
      expect(redacted).not.toContain(unsafeValue);
    }

    expect(redacted).toContain("[REDACTED]");
  });
});
