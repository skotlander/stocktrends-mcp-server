import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.js";
import { AUTH_CAPABLE_PAID_ENDPOINT_POLICIES } from "../src/paidPolicy.js";
import { redactSensitiveText } from "../src/redaction.js";
import { COST_ESTIMATE_TOOL_NAME } from "../src/tools/index.js";
import {
  buildLiveChallengeSearchParams,
  X402_PUBLIC_LIVE_TOOL_DEFINITIONS,
  X402_PUBLIC_MOCK_TOOL_DEFINITIONS
} from "../src/tools/x402Tools.js";
import {
  createX402LiveChallengeSessionState,
  executePublicLiveX402ChallengeRelay,
  buildPublicMockX402ChallengeRelayResult,
  buildMockX402ChallengeRelayResult,
  createMockX402ChallengeFixture,
  createX402ChallengeSessionState,
  isX402RouteAllowlisted,
  X402_CHALLENGE_FIELD_CATEGORIES,
  X402_CHALLENGE_HEADER_NAMES,
  X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST,
  X402_CHALLENGE_TOP_LEVEL_BODY_KEYS,
  type X402ChallengeRelayRequest,
  type X402LivePaymentRequiredResult,
  type X402LiveRelayErrorResult,
  type X402MockChallengeFixture,
  type X402PaymentRequiredResult,
  type X402RelayErrorResult
} from "../src/x402Relay.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { connectMcp, jsonResponse } from "./helpers.js";

const X402_ENV = {
  STOCKTRENDS_ENABLE_X402_RELAY: "true",
  STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION: "true"
};

const X402_LIVE_ENV = {
  ...X402_ENV,
  STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY: "true"
};

const REQUEST: X402ChallengeRelayRequest = {
  toolName: "stocktrends_get_market_regime_latest",
  endpointPath: "/v1/market/regime/latest"
};

const LIVE_VALUE_SENTINEL = "synthetic-live-challenge-value-marker";

const EXPECTED_TEN_TOOL_NAMES = [
  COST_ESTIMATE_TOOL_NAME,
  ...AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) => policy.toolName)
].sort();

const PUBLIC_MOCK_INVOCATIONS = [
  { name: "stocktrends_get_stim_latest", endpointPath: "/v1/stim/latest", arguments: { symbol_exchange: "IBM_N" } },
  { name: "stocktrends_get_stim_history", endpointPath: "/v1/stim/history", arguments: { symbol_exchange: "IBM_N", limit: 1 } },
  { name: "stocktrends_get_indicators_latest", endpointPath: "/v1/indicators/latest", arguments: { symbol_exchange: "IBM_N" } },
  { name: "stocktrends_get_indicators_history", endpointPath: "/v1/indicators/history", arguments: { symbol_exchange: "IBM_N", limit: 1 } },
  { name: "stocktrends_get_selections_latest", endpointPath: "/v1/selections/latest", arguments: { limit: 1 } },
  { name: "stocktrends_get_market_regime_latest", endpointPath: "/v1/market/regime/latest", arguments: {} },
  { name: "stocktrends_get_market_regime_history", endpointPath: "/v1/market/regime/history", arguments: { limit: 1 } },
  { name: "stocktrends_get_breadth_sector_latest", endpointPath: "/v1/breadth/sector/latest", arguments: { limit: 1 } },
  {
    name: "stocktrends_get_leadership_summary_latest",
    endpointPath: "/v1/leadership/summary/latest",
    arguments: { limit_overall: 1, limit_bucket: 1 }
  }
] as const;

describe("Phase 5F x402 mock challenge relay config and surface", () => {
  it("keeps default/free mode at one tool, ten resources, and zero prompts", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn);

    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([COST_ESTIMATE_TOOL_NAME]);
    expect((await client.listResources()).resources).toHaveLength(10);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("exposes the same ten-tool shape with relay exposure only and no API key", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, { STOCKTRENDS_ENABLE_X402_RELAY: "true" });

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();

    expect(toolNames).toEqual(EXPECTED_TEN_TOOL_NAMES);
    expect((await client.listResources()).resources).toHaveLength(10);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("exposes the same ten-tool shape in mock challenge mode without an API key", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, X402_ENV);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();
    const resources = await client.listResources();

    expect(toolNames).toEqual(EXPECTED_TEN_TOOL_NAMES);
    expect(resources.resources).toHaveLength(10);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("exposes the same ten-tool, ten-resource, zero-prompt shape in live no-key challenge mode", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => liveChallengeResponse("/v1/market/regime/latest"));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name).sort();

    expect(toolNames).toEqual(EXPECTED_TEN_TOOL_NAMES);
    expect((await client.listResources()).resources).toHaveLength(10);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("keeps API-key paid mode unchanged when x402 flags are absent", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "<redacted-api-key>"
    });

    const toolNames = (await client.listTools()).tools.map((tool) => tool.name);
    const paidTool = (await client.listTools()).tools.find((tool) => tool.name === REQUEST.toolName);

    expect(toolNames.sort()).toEqual(EXPECTED_TEN_TOOL_NAMES);
    expect((await client.listResources()).resources).toHaveLength(10);
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();
    expect(paidTool?.title).toContain("(paid)");
    expect(paidTool?.description).toContain("Live subscription/API-key execution");
    expect(paidTool?.description).toContain("no x402");
    expect(paidTool?._meta).not.toHaveProperty("x402Relay");

    await client.close();
    await server.close();
  });

  it("maps public mock wiring to exactly the nine approved paid policies", () => {
    expect(X402_PUBLIC_MOCK_TOOL_DEFINITIONS).toEqual(
      AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) => ({
        name: policy.toolName,
        endpointPath: policy.endpointPath,
        httpMethod: policy.httpMethod,
        access: "paid",
        relayMode: "mock_only"
      }))
    );
    expect(X402_PUBLIC_MOCK_TOOL_DEFINITIONS).toHaveLength(9);
  });

  it("maps public live wiring to the same exact nine approved paid GET policies", () => {
    expect(X402_PUBLIC_LIVE_TOOL_DEFINITIONS).toEqual(
      AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) => ({
        name: policy.toolName,
        endpointPath: policy.endpointPath,
        httpMethod: policy.httpMethod,
        access: "paid",
        relayMode: "live_no_key_challenge"
      }))
    );
    expect(X402_PUBLIC_LIVE_TOOL_DEFINITIONS).toHaveLength(9);
  });

  it("keeps mock registration metadata unchanged and uses truthful live/open-world metadata", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => liveChallengeResponse("/v1/market/regime/latest"));
    const mock = await connectMcp(fetchFn, X402_ENV);
    const live = await connectMcp(fetchFn, X402_LIVE_ENV);

    const mockTool = (await mock.client.listTools()).tools.find((tool) => tool.name === REQUEST.toolName);
    const liveTool = (await live.client.listTools()).tools.find((tool) => tool.name === REQUEST.toolName);

    expect(mockTool?.description).toContain("mock-only");
    expect(mockTool?.description).toContain("sends no request");
    expect(mockTool?.annotations?.openWorldHint).toBe(false);
    expect(mockTool?._meta).toMatchObject({ x402Relay: "mock_only", apiRequestSent: false });

    expect(liveTool?.description).toContain("one external no-key GET request");
    expect(liveTool?.description).toContain("No API key is used");
    expect(liveTool?.description).toContain("no proof is accepted or forwarded");
    expect(liveTool?.description).toContain("no payment header is sent");
    expect(liveTool?.description).toContain("no payment or spend occurs");
    expect(liveTool?.description).toContain("no paid API data is returned");
    expect(liveTool?.description).not.toContain("mock-only");
    expect(liveTool?.annotations?.openWorldHint).toBe(true);
    expect(liveTool?._meta).toMatchObject({
      x402Relay: "live_no_key_challenge",
      apiRequestMayBeSent: true,
      maxApiRequestsPerInvocation: 1,
      apiKeyUsed: false,
      proofForwarded: false,
      paymentHeaderSent: false,
      paymentOrSpendOccurs: false,
      paidApiDataReturned: false
    });
    expect(liveTool?._meta).not.toHaveProperty("apiRequestSent", false);

    await mock.client.close();
    await mock.server.close();
    await live.client.close();
    await live.server.close();
  });
});

describe("Phase 5F x402 public mock tool invocation", () => {
  it("fails closed locally when relay exposure is on but challenge behavior is off", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ should_not: "be called" }));
    const { client, server } = await connectMcp(fetchFn, { STOCKTRENDS_ENABLE_X402_RELAY: "true" });

    const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const body = structured<X402RelayErrorResult>(result);

    expect(result.isError).toBe(true);
    expect(body.status).toBe("error");
    expect(body.error.error_code).toBe("x402_challenge_unavailable");
    expect(body.api_request_sent).toBe(false);
    expect(body.auth_header_sent).toBe(false);
    expect(body.payment_header_sent).toBe(false);
    expect(body.proof_forwarded).toBe(false);
    expect(body.spend_occurred).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("returns a deterministic local payment_required result for all nine semantic paid tools", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ should_not: "be called" }));
    const { client, server } = await connectMcp(fetchFn, X402_ENV);

    for (const invocation of PUBLIC_MOCK_INVOCATIONS) {
      const result = await client.callTool({ name: invocation.name, arguments: invocation.arguments });
      const body = structured<X402PaymentRequiredResult>(result);
      const serialized = JSON.stringify(body);

      expect(result.isError).not.toBe(true);
      expect(body).toMatchObject({
        status: "payment_required",
        error_code: "x402_payment_required",
        api_status: 402,
        tool_name: invocation.name,
        endpoint_path: invocation.endpointPath,
        method: "GET",
        http_method: "GET",
        paid_execution_authorized: false,
        paid_execution_occurred: false,
        api_request_sent: false,
        auth_header_sent: false,
        payment_header_sent: false,
        proof_forwarded: false,
        spend_occurred: false,
        paid_api_data_returned: false,
        automatic_paid_retries: false
      });
      expect(body.challenge.header_names_present).toEqual(X402_CHALLENGE_HEADER_NAMES);
      expect(body.challenge.top_level_body_keys_present).toEqual(X402_CHALLENGE_TOP_LEVEL_BODY_KEYS);
      expect(body.challenge.field_categories_present).toEqual(X402_CHALLENGE_FIELD_CATEGORIES);
      expect(body.mcp_metadata).toMatchObject({
        public_tool_wiring: "existing_paid_semantic_tools",
        mock_only: true,
        api_request_sent: false,
        auth_header_sent: false,
        payment_header_sent: false,
        proof_forwarded: false,
        spend_occurred: false,
        paid_api_data_returned: false,
        automatic_paid_retries: false,
        repeated_identical_policy: "same_session_normalized_signature_denied"
      });
      expect("api_data" in body).toBe(false);
      expect(serialized).not.toContain('"api_data":');
    }

    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it.each([
    ["stocktrends_get_stim_latest", { symbol: "IBM", exchange: "N" }],
    ["stocktrends_get_indicators_latest", { symbol: "IBM" }]
  ])("fails closed before any resolver or network path for non-canonical input to %s", async (name, args) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ should_not: "be called" }));
    const { client, server } = await connectMcp(fetchFn, X402_ENV);

    const result = await client.callTool({ name, arguments: args });
    const body = structured<X402RelayErrorResult>(result);

    expect(result.isError).toBe(true);
    expect(body.error.error_code).toBe("x402_symbol_exchange_required");
    expect(body.api_request_sent).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("keeps proof fields out of public schemas and rejects proof-like tool input before the handler", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ should_not: "be called" }));
    const { client, server } = await connectMcp(fetchFn, X402_ENV);
    const tools = await client.listTools();

    for (const tool of tools.tools.filter((candidate) => candidate.name !== COST_ESTIMATE_TOOL_NAME)) {
      expect(JSON.stringify(tool.inputSchema).toLowerCase()).not.toContain("proof");
      expect(JSON.stringify(tool.inputSchema).toLowerCase()).not.toContain("payment_envelope");
    }

    const result = await client.callTool({
      name: REQUEST.toolName,
      arguments: { payment_proof: "<redacted-proof>" }
    });

    expect(result.isError).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("fails closed with the proof-forwarding denial in the public helper before reservation", () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const state = createX402ChallengeSessionState();
    const result = buildPublicMockX402ChallengeRelayResult(
      config,
      REQUEST,
      { payment_proof: "<redacted-proof>" },
      state
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_proof_forwarding_not_enabled");
    }
    expect(state.inFlightSignatures.size).toBe(0);
    expect(state.completedSignatures.size).toBe(0);
  });

  it("denies an identical repeated mock challenge call in the same server session", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ should_not: "be called" }));
    const { client, server } = await connectMcp(fetchFn, X402_ENV);

    const first = structured<X402PaymentRequiredResult>(
      await client.callTool({ name: REQUEST.toolName, arguments: {} })
    );
    const secondResult = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const second = structured<X402RelayErrorResult>(secondResult);

    expect(first.status).toBe("payment_required");
    expect(secondResult.isError).toBe(true);
    expect(second.error.error_code).toBe("x402_repeated_challenge_call");
    expect(second.api_request_sent).toBe(false);
    expect(second.spend_occurred).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});

describe("Phase 5F x402 live no-key challenge invocation", () => {
  it("makes exactly one injected no-key GET and returns shape-only structured metadata", async () => {
    const fetchFn = vi.fn<FetchLike>(async (input, init) => {
      expect(input).toBeInstanceOf(URL);
      expect((input as URL).origin).toBe("https://api.stocktrends.com");
      expect((input as URL).pathname).toBe("/v1/stim/latest");
      expect((input as URL).searchParams.get("symbol_exchange")).toBe("IBM-N");
      expect(init.method).toBe("GET");
      expect(init.redirect).toBe("manual");
      expect(init.credentials).toBe("omit");
      expect(init.body).toBeUndefined();

      const headers = new Headers(init.headers);
      expect([...headers.keys()].sort()).toEqual(["accept", "user-agent"]);
      expect(headers.has("authorization")).toBe(false);
      expect(headers.has("x-api-key")).toBe(false);
      expect(headers.has("payment-signature")).toBe(false);
      expect(headers.has("x-payment")).toBe(false);
      expect(headers.has("cookie")).toBe(false);

      return liveChallengeResponse("/v1/stim/latest", LIVE_VALUE_SENTINEL);
    });
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const result = await client.callTool({
      name: "stocktrends_get_stim_latest",
      arguments: { symbol_exchange: "IBM_N" }
    });
    const body = structured<X402LivePaymentRequiredResult>(result);
    const serialized = JSON.stringify(body);
    const text = contentText(result);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(result.isError).not.toBe(true);
    expect(body).toMatchObject({
      status: "payment_required",
      error_code: "x402_payment_required",
      api_status: 402,
      tool_name: "stocktrends_get_stim_latest",
      endpoint_path: "/v1/stim/latest",
      method: "GET",
      http_method: "GET",
      challenge_source: "api_no_key_live",
      paid_execution_authorized: false,
      paid_execution_occurred: false,
      api_request_sent: true,
      auth_header_sent: false,
      payment_header_sent: false,
      proof_forwarded: false,
      spend_occurred: false,
      paid_api_data_returned: false,
      automatic_paid_retries: false
    });
    expect(body.challenge).toEqual({
      header_names_present: X402_CHALLENGE_HEADER_NAMES,
      top_level_body_keys_present: X402_CHALLENGE_TOP_LEVEL_BODY_KEYS,
      field_categories_present: X402_CHALLENGE_FIELD_CATEGORIES,
      conditional_values_relayed: false,
      x_request_id_value_relayed: false
    });
    expect(body.mcp_metadata).toMatchObject({
      relay_mode: "live_challenge_enabled",
      mock_only: false,
      challenge_source: "api_no_key_live",
      api_request_sent: true,
      auth_header_sent: false,
      payment_header_sent: false,
      proof_forwarded: false,
      spend_occurred: false,
      paid_api_data_returned: false,
      automatic_paid_retries: false,
      repeated_identical_policy: "same_session_reserved_signature_denied",
      live_challenge_limits: {
        per_tool: 1,
        per_session: 3,
        reserved_for_tool: 1,
        reserved_for_session: 1
      }
    });
    expect("api_data" in body).toBe(false);
    expect("challenge_values" in body.challenge).toBe(false);
    expect(serialized).not.toContain(LIVE_VALUE_SENTINEL);
    expect(serialized).not.toContain("<redacted-request-id>");
    expect(text).not.toContain(LIVE_VALUE_SENTINEL);
    expect(text).not.toContain("<redacted-request-id>");
    expect(text).not.toContain(JSON.stringify(body));

    await client.close();
    await server.close();
  });

  it("preserves exact mock-only invocation behavior when the live flag is explicitly off", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => liveChallengeResponse(REQUEST.endpointPath));
    const { client, server } = await connectMcp(fetchFn, {
      ...X402_ENV,
      STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY: "off"
    });

    const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const body = structured<X402PaymentRequiredResult>(result);

    expect(body.status).toBe("payment_required");
    expect(body.api_request_sent).toBe(false);
    expect(body.mcp_metadata.mock_only).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it.each(PUBLIC_MOCK_INVOCATIONS)(
    "maps $name to its exact allowlisted live GET route with one injected fetch",
    async (invocation) => {
      const fetchFn = vi.fn<FetchLike>(async (input, init) => {
        expect(init.method).toBe("GET");
        expect((input as URL).pathname).toBe(invocation.endpointPath);
        return liveChallengeResponse(invocation.endpointPath);
      });
      const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

      const result = await client.callTool({ name: invocation.name, arguments: invocation.arguments });
      const body = structured<X402LivePaymentRequiredResult>(result);

      expect(body.status).toBe("payment_required");
      expect(body.endpoint_path).toBe(invocation.endpointPath);
      expect(body.tool_name).toBe(invocation.name);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await client.close();
      await server.close();
    }
  );

  it.each([
    { symbol: "IBM" },
    { symbol_exchange: "IBM_N", symbol: "IBM", exchange: "N" }
  ])("fails non-canonical symbol input before resolver or network", async (arguments_) => {
    const fetchFn = vi.fn<FetchLike>(async () => liveChallengeResponse("/v1/indicators/latest"));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const result = await client.callTool({
      name: "stocktrends_get_indicators_latest",
      arguments: arguments_
    });
    const body = structured<X402LiveRelayErrorResult>(result);

    expect(result.isError).toBe(true);
    expect(body.error.error_code).toBe("x402_symbol_exchange_required");
    expect(body.api_request_sent).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });

  it("fails direct live helper use while the live flag is absent without reserving or fetching", async () => {
    const config = parseConfig(X402_ENV).x402Relay;
    const state = createX402LiveChallengeSessionState();
    const fetchChallenge = vi.fn(async () => ({
      status: 402,
      approvedHeaderNamesPresent: [...X402_CHALLENGE_HEADER_NAMES],
      body: createMockX402ChallengeFixture(REQUEST.endpointPath).body
    }));

    const result = await executePublicLiveX402ChallengeRelay(config, REQUEST, {}, state, fetchChallenge);

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_live_challenge_disabled");
    }
    expect(fetchChallenge).not.toHaveBeenCalled();
    expect(state.totalReserved).toBe(0);
  });

  it("rejects proof-like live input before reservation and network", async () => {
    const config = parseConfig(X402_LIVE_ENV).x402Relay;
    const state = createX402LiveChallengeSessionState();
    const fetchChallenge = vi.fn(async () => ({
      status: 402,
      approvedHeaderNamesPresent: [...X402_CHALLENGE_HEADER_NAMES],
      body: createMockX402ChallengeFixture(REQUEST.endpointPath).body
    }));

    const result = await executePublicLiveX402ChallengeRelay(
      config,
      REQUEST,
      { payment_proof: "<redacted-proof>" },
      state,
      fetchChallenge
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_proof_forwarding_not_enabled");
    }
    expect(fetchChallenge).not.toHaveBeenCalled();
    expect(state.totalReserved).toBe(0);
  });

  it("rejects a non-allowlisted live route before reservation and network", async () => {
    const config = parseConfig(X402_LIVE_ENV).x402Relay;
    const state = createX402LiveChallengeSessionState();
    const fetchChallenge = vi.fn(async () => ({
      status: 402,
      approvedHeaderNamesPresent: [...X402_CHALLENGE_HEADER_NAMES],
      body: createMockX402ChallengeFixture("/v1/pricing/catalog").body
    }));

    const result = await executePublicLiveX402ChallengeRelay(
      config,
      { toolName: "stocktrends_unknown", endpointPath: "/v1/pricing/catalog" },
      {},
      state,
      fetchChallenge
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_route_not_allowlisted");
    }
    expect(fetchChallenge).not.toHaveBeenCalled();
    expect(state.totalReserved).toBe(0);
  });

  it("rejects a mismatched live tool-to-route binding before reservation and network", async () => {
    const config = parseConfig(X402_LIVE_ENV).x402Relay;
    const state = createX402LiveChallengeSessionState();
    const fetchChallenge = vi.fn(async () => ({
      status: 402,
      approvedHeaderNamesPresent: [...X402_CHALLENGE_HEADER_NAMES],
      body: createMockX402ChallengeFixture(REQUEST.endpointPath).body
    }));

    const result = await executePublicLiveX402ChallengeRelay(
      config,
      { toolName: "stocktrends_get_selections_latest", endpointPath: REQUEST.endpointPath },
      {},
      state,
      fetchChallenge
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_route_not_allowlisted");
    }
    expect(fetchChallenge).not.toHaveBeenCalled();
    expect(state.totalReserved).toBe(0);
  });

  it("reserves the normalized signature before fetch and denies an identical repeat", async () => {
    const fetchFn = vi.fn<FetchLike>(async (input) => liveChallengeResponse((input as URL).pathname));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const first = structured<X402LivePaymentRequiredResult>(
      await client.callTool({ name: REQUEST.toolName, arguments: {} })
    );
    const secondResult = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const second = structured<X402LiveRelayErrorResult>(secondResult);

    expect(first.status).toBe("payment_required");
    expect(secondResult.isError).toBe(true);
    expect(second.error.error_code).toBe("x402_live_challenge_repeated_call");
    expect(second.api_request_sent).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.close();
    await server.close();
  });

  it("enforces the one-per-tool cap for different validated input before network", async () => {
    const fetchFn = vi.fn<FetchLike>(async (input) => liveChallengeResponse((input as URL).pathname));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const first = structured<X402LivePaymentRequiredResult>(
      await client.callTool({ name: "stocktrends_get_selections_latest", arguments: { limit: 1 } })
    );
    const secondResult = await client.callTool({
      name: "stocktrends_get_selections_latest",
      arguments: { limit: 2 }
    });
    const second = structured<X402LiveRelayErrorResult>(secondResult);

    expect(first.status).toBe("payment_required");
    expect(second.error.error_code).toBe("x402_live_challenge_cap_exceeded");
    expect(second.api_request_sent).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.close();
    await server.close();
  });

  it("enforces the three-per-session cap across different tools before network", async () => {
    const fetchFn = vi.fn<FetchLike>(async (input) => liveChallengeResponse((input as URL).pathname));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    for (const invocation of [
      { name: "stocktrends_get_market_regime_latest", arguments: {} },
      { name: "stocktrends_get_selections_latest", arguments: { limit: 1 } },
      { name: "stocktrends_get_breadth_sector_latest", arguments: { limit: 1 } }
    ]) {
      expect(structured<X402LivePaymentRequiredResult>(await client.callTool(invocation)).status).toBe(
        "payment_required"
      );
    }

    const fourthResult = await client.callTool({
      name: "stocktrends_get_leadership_summary_latest",
      arguments: { limit_overall: 1, limit_bucket: 1 }
    });
    const fourth = structured<X402LiveRelayErrorResult>(fourthResult);

    expect(fourth.error.error_code).toBe("x402_live_challenge_cap_exceeded");
    expect(fourth.api_request_sent).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(3);

    await client.close();
    await server.close();
  });

  it("keeps a failed-attempt reservation consumed and performs no retry or mock fallback", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ error: "temporary" }, 503));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const firstResult = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const first = structured<X402LiveRelayErrorResult>(firstResult);
    const secondResult = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const second = structured<X402LiveRelayErrorResult>(secondResult);

    expect(first.error.error_code).toBe("x402_live_challenge_unexpected_status");
    expect(first.api_status).toBe(503);
    expect(first.api_request_sent).toBe(true);
    expect(second.error.error_code).toBe("x402_live_challenge_repeated_call");
    expect(second.api_request_sent).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.close();
    await server.close();
  });

  it("maps a mocked network failure to a deterministic local error with no retry", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => {
      throw new Error(LIVE_VALUE_SENTINEL);
    });
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const body = structured<X402LiveRelayErrorResult>(result);

    expect(body.error.error_code).toBe("x402_live_challenge_unexpected_status");
    expect(body.api_status).toBeNull();
    expect(body.api_request_sent).toBe(true);
    expect(JSON.stringify(body)).not.toContain(LIVE_VALUE_SENTINEL);
    expect(contentText(result)).not.toContain(LIVE_VALUE_SENTINEL);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.close();
    await server.close();
  });

  it("fails closed on paid output without proof and leaks none of the returned data", async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse({ api_data: { marker: LIVE_VALUE_SENTINEL } }, 200)
    );
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const body = structured<X402LiveRelayErrorResult>(result);
    const serialized = JSON.stringify(body);

    expect(body.error.error_code).toBe("x402_live_challenge_paid_output_without_proof");
    expect(body.paid_api_data_returned).toBe(false);
    expect(serialized).not.toContain(LIVE_VALUE_SENTINEL);
    expect(contentText(result)).not.toContain(LIVE_VALUE_SENTINEL);
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.close();
    await server.close();
  });

  it("fails closed on redirect, wrong shape, and unapproved field paths without retry", async () => {
    const cases: Array<{
      response: Response;
      expectedCode:
        | "x402_live_challenge_unexpected_status"
        | "x402_live_challenge_unexpected_shape"
        | "x402_live_challenge_value_not_approved";
    }> = [
      {
        response: new Response(null, { status: 302, headers: { location: "https://example.com" } }),
        expectedCode: "x402_live_challenge_unexpected_status"
      },
      {
        response: jsonResponse(createMockX402ChallengeFixture(REQUEST.endpointPath).body, 402, {
          "payment-required": "<redacted-header-presence>"
        }),
        expectedCode: "x402_live_challenge_unexpected_shape"
      },
      {
        response: liveChallengeResponse(REQUEST.endpointPath, undefined, { extra_field: "synthetic" }),
        expectedCode: "x402_live_challenge_value_not_approved"
      }
    ];

    for (const testCase of cases) {
      const fetchFn = vi.fn<FetchLike>(async (_input, init) => {
        expect(init.redirect).toBe("manual");
        return testCase.response;
      });
      const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);
      const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
      const body = structured<X402LiveRelayErrorResult>(result);

      expect(body.error.error_code).toBe(testCase.expectedCode);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await client.close();
      await server.close();
    }
  });

  it("builds only route-bound, validated query parameters with bounded defaults", () => {
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/stim/latest", {
      symbol_exchange: "IBM_N",
      symbol: "IBM",
      exchange: "N"
    }))).toEqual({ symbol_exchange: "IBM-N" });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/selections/latest", {}))).toEqual({ limit: "50" });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/market/regime/history", {}))).toEqual({ limit: "12" });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/breadth/sector/latest", {}))).toEqual({
      group_level: "sector",
      limit: "50"
    });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/leadership/summary/latest", {}))).toEqual({
      limit_overall: "50",
      limit_bucket: "20"
    });
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
    expect(result.method).toBe("GET");
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
    expect(result.automatic_paid_retries).toBe(false);
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

function liveChallengeResponse(
  endpointPath: string,
  conditionalValueSentinel?: string,
  extraBody: Record<string, unknown> = {}
): Response {
  const fixture = createMockX402ChallengeFixture(endpointPath);

  if (conditionalValueSentinel) {
    fixture.body.protocol = conditionalValueSentinel;
    (fixture.body.pricing as Record<string, unknown>).amount = conditionalValueSentinel;
    ((fixture.body.accepted_payment_methods as Record<string, unknown>[])[0] as Record<string, unknown>).network =
      conditionalValueSentinel;
  }

  return jsonResponse(
    { ...fixture.body, ...extraBody },
    402,
    {
      "payment-required": "<redacted-payment-required>",
      "x-request-id": "<redacted-request-id>",
      "x-stocktrends-payment-required": "<redacted-payment-required>",
      "x-stocktrends-accepted-payment-methods": "<redacted-accepted-payment-methods>",
      "x-stocktrends-pricing-rule": "<redacted-pricing-rule>"
    }
  );
}

function contentText(result: unknown): string {
  if (!result || typeof result !== "object" || !("content" in result) || !Array.isArray(result.content)) {
    return "";
  }

  return result.content
    .filter((item): item is { type: "text"; text: string } =>
      Boolean(item && typeof item === "object" && item.type === "text" && typeof item.text === "string")
    )
    .map((item) => item.text)
    .join("\n");
}

function structured<T>(result: unknown): T {
  if (
    !result ||
    typeof result !== "object" ||
    !("structuredContent" in result) ||
    !result.structuredContent ||
    typeof result.structuredContent !== "object"
  ) {
    throw new Error("expected structured tool content");
  }

  return result.structuredContent as T;
}
