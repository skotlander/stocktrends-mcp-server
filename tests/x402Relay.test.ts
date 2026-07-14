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
  X402_EXTENSION_MAX_ARRAY_LENGTH,
  X402_EXTENSION_MAX_DEPTH,
  X402_EXTENSION_MAX_OBJECT_MEMBERS,
  X402_EXTENSION_MAX_STRING_BYTES,
  X402_EXTENSION_MAX_TOTAL_BYTES,
  X402_EXTENSION_MAX_TOTAL_MEMBERS,
  X402_TOOL_INPUT_MAX_ARRAY_LENGTH,
  X402_TOOL_INPUT_MAX_DEPTH,
  X402_TOOL_INPUT_MAX_OBJECT_MEMBERS,
  X402_TOOL_INPUT_MAX_STRING_BYTES,
  X402_TOOL_INPUT_MAX_TOTAL_MEMBERS,
  X402_LIVE_CHALLENGE_FIELD_CATEGORIES,
  X402_LIVE_CHALLENGE_TOP_LEVEL_BODY_KEYS,
  MAX_X402_PAYMENT_REQUIRED_DECODED_BYTES,
  type X402ChallengeRelayRequest,
  type X402LiveChallengeResponse,
  type X402LivePaymentRequiredResult,
  type X402LiveRelayErrorResult,
  type X402MockChallengeFixture,
  type X402PaymentRequiredResult,
  type X402RelayErrorResult
} from "../src/x402Relay.js";
import {
  MAX_X402_CHALLENGE_RESPONSE_BYTES,
  MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES,
  StockTrendsClient,
  type FetchLike
} from "../src/stocktrendsClient.js";
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
const DIRECT_TOOL_INPUT_SENTINEL = "synthetic-direct-tool-input-secret-path-value";

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
    const fetchFn = vi.fn<FetchLike>(async () => canonicalLiveHttpResponse("/v1/market/regime/latest"));
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
    const fetchFn = vi.fn<FetchLike>(async () => canonicalLiveHttpResponse("/v1/market/regime/latest"));
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

describe("Phase 5F bounded direct-helper tool input", () => {
  const invalidCases: ReadonlyArray<readonly [string, () => unknown]> = [
    ["deep object far above the depth limit", () => nestedToolInput("object", 7_000)],
    ["deep array far above the depth limit", () => nestedToolInput("array", 7_000)],
    ["deep alternating object and array input", () => alternatingToolInput(X402_TOOL_INPUT_MAX_DEPTH + 8)],
    ["wide input above the aggregate budget", () => aggregateToolInput(X402_TOOL_INPUT_MAX_TOTAL_MEMBERS + 100)],
    ["cyclic object", () => cyclicToolInput("object")],
    ["cyclic array", () => cyclicToolInput("array")],
    ["input immediately above the depth limit", () => nestedToolInput("object", X402_TOOL_INPUT_MAX_DEPTH + 1)],
    ["input immediately above the aggregate budget", () => aggregateToolInput(X402_TOOL_INPUT_MAX_TOTAL_MEMBERS + 1)],
    [
      "object above the per-object member limit",
      () => Object.fromEntries(
        Array.from({ length: X402_TOOL_INPUT_MAX_OBJECT_MEMBERS + 1 }, (_, index) => [
          `synthetic_member_${index}`,
          index === 0 ? DIRECT_TOOL_INPUT_SENTINEL : index
        ])
      )
    ],
    [
      "array above the per-array length limit",
      () => Array.from(
        { length: X402_TOOL_INPUT_MAX_ARRAY_LENGTH + 1 },
        (_, index) => index === 0 ? DIRECT_TOOL_INPUT_SENTINEL : index
      )
    ],
    [
      "string above the string limit",
      () => `${DIRECT_TOOL_INPUT_SENTINEL}${"x".repeat(X402_TOOL_INPUT_MAX_STRING_BYTES + 1)}`
    ]
  ];

  for (const helper of ["mock", "live"] as const) {
    it.each(invalidCases)(`${helper} rejects %s before reservation or fetch`, async (_name, buildInput) => {
      await expectDirectToolInputRejected(helper, buildInput());
    });

    it.each([
      ["immediately below depth", () => nestedToolInput("object", X402_TOOL_INPUT_MAX_DEPTH - 1)],
      ["at depth", () => nestedToolInput("object", X402_TOOL_INPUT_MAX_DEPTH)],
      ["immediately below aggregate budget", () => aggregateToolInput(X402_TOOL_INPUT_MAX_TOTAL_MEMBERS - 1)],
      ["at aggregate budget", () => aggregateToolInput(X402_TOOL_INPUT_MAX_TOTAL_MEMBERS)]
    ] as const)(`${helper} accepts %s and preserves normal behavior`, async (_name, buildInput) => {
      await expectDirectToolInputAccepted(helper, buildInput());
    });

    it(`${helper} rejects cyclic, non-plain, accessor, and non-JSON-safe shapes coarsely`, async () => {
      const getter = vi.fn(() => DIRECT_TOOL_INPUT_SENTINEL);
      const withGetter: Record<string, unknown> = {};
      Object.defineProperty(withGetter, "synthetic_getter_path", {
        get: getter,
        enumerable: true
      });
      const withSymbol = { safe: true } as Record<PropertyKey, unknown>;
      withSymbol[Symbol("synthetic_symbol_path")] = DIRECT_TOOL_INPUT_SENTINEL;
      const sparseArray = new Array(2);
      sparseArray[0] = DIRECT_TOOL_INPUT_SENTINEL;
      const customPropertyArray = [DIRECT_TOOL_INPUT_SENTINEL] as unknown as
        unknown[] & Record<string, unknown>;
      customPropertyArray.synthetic_custom_path = DIRECT_TOOL_INPUT_SENTINEL;
      const withNonEnumerable: Record<string, unknown> = {};
      Object.defineProperty(withNonEnumerable, "synthetic_hidden_path", {
        value: DIRECT_TOOL_INPUT_SENTINEL,
        enumerable: false
      });

      for (const input of [
        withGetter,
        withSymbol,
        sparseArray,
        customPropertyArray,
        withNonEnumerable,
        Object.create(null),
        new Date(0),
        { value: undefined },
        undefined,
        () => DIRECT_TOOL_INPUT_SENTINEL,
        Symbol("synthetic-symbol-value"),
        1n,
        Number.NaN,
        Number.POSITIVE_INFINITY
      ]) {
        await expectDirectToolInputRejected(helper, input);
      }
      expect(getter).not.toHaveBeenCalled();
    });
  }

  it("preserves the existing deterministic normalized signature for valid mock and live inputs", async () => {
    const firstInput = { z: [3, { b: true, a: "x" }], a: 1 };
    const reorderedInput = { a: 1, z: [3, { a: "x", b: true }] };
    const expectedSignature = JSON.stringify({
      tool_name: REQUEST.toolName,
      endpoint_path: REQUEST.endpointPath,
      http_method: "GET",
      input: { a: 1, z: [3, { a: "x", b: true }] }
    });

    const mockConfig = parseConfig(X402_ENV).x402Relay;
    const mockState = createX402ChallengeSessionState();
    expect(buildPublicMockX402ChallengeRelayResult(mockConfig, REQUEST, firstInput, mockState).status)
      .toBe("payment_required");
    const mockRepeat = buildPublicMockX402ChallengeRelayResult(
      mockConfig,
      REQUEST,
      reorderedInput,
      mockState
    );
    expect(mockRepeat.status === "error" && mockRepeat.error.error_code)
      .toBe("x402_repeated_challenge_call");
    expect([...mockState.completedSignatures]).toEqual([expectedSignature]);

    const liveConfig = parseConfig(X402_LIVE_ENV).x402Relay;
    const liveState = createX402LiveChallengeSessionState();
    const fetchChallenge = vi.fn(async () => canonicalInjectedResponse(REQUEST.endpointPath));
    expect((await executePublicLiveX402ChallengeRelay(
      liveConfig,
      REQUEST,
      firstInput,
      liveState,
      fetchChallenge
    )).status).toBe("payment_required");
    const liveRepeat = await executePublicLiveX402ChallengeRelay(
      liveConfig,
      REQUEST,
      reorderedInput,
      liveState,
      fetchChallenge
    );
    expect(liveRepeat.status === "error" && liveRepeat.error.error_code)
      .toBe("x402_live_challenge_repeated_call");
    expect([...liveState.reservedSignatures]).toEqual([expectedSignature]);
    expect(fetchChallenge).toHaveBeenCalledTimes(1);
  });
});

describe("Phase 5F canonical x402 v2 live no-key challenge invocation", () => {
  it("accepts the source-shaped compact Bazaar challenge and returns only safe shape metadata", async () => {
    const fetchFn = vi.fn<FetchLike>(async (input, init) => {
      expect((input as URL).origin).toBe("https://api.stocktrends.com");
      expect((input as URL).pathname).toBe("/v1/stim/latest");
      expect((input as URL).searchParams.get("symbol_exchange")).toBe("IBM-N");
      expect(init).toMatchObject({ method: "GET", redirect: "manual", credentials: "omit" });
      expect(init.body).toBeUndefined();
      const headers = new Headers(init.headers);
      expect([...headers.keys()].sort()).toEqual(["accept", "user-agent"]);
      for (const forbidden of ["authorization", "x-api-key", "payment-signature", "x-payment", "cookie"]) {
        expect(headers.has(forbidden)).toBe(false);
      }
      return canonicalLiveHttpResponse("/v1/stim/latest", (body) => {
        compactBazaarInfo(body).description = LIVE_VALUE_SENTINEL;
      });
    });
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    const result = await client.callTool({
      name: "stocktrends_get_stim_latest",
      arguments: { symbol_exchange: "IBM_N" }
    });
    const body = structured<X402LivePaymentRequiredResult>(result);
    const serialized = JSON.stringify(body);

    expect(result.isError).not.toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
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
      header_names_present: ["payment-required"],
      top_level_body_keys_present: X402_LIVE_CHALLENGE_TOP_LEVEL_BODY_KEYS,
      field_categories_present: X402_LIVE_CHALLENGE_FIELD_CATEGORIES,
      conditional_values_relayed: false,
      x_request_id_value_relayed: false
    });
    expect("challenge_values" in body.challenge).toBe(false);
    expect(serialized).not.toContain(LIVE_VALUE_SENTINEL);
    expect(contentText(result)).not.toContain(LIVE_VALUE_SENTINEL);

    await client.close();
    await server.close();
  });

  it.each([true, false])("accepts a representative source-shaped rich Bazaar extension with assetTransferMethod present=%s", async (present) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const extra = acceptedExtra(body);
    if (!present) delete extra.assetTransferMethod;
    extra.vendor_metadata = { mode: "rich", flags: [true, false], optional: null };
    paymentRequirements(body).extensions = createRepresentativeRichBazaarExtension();
    body.stocktrends_preview = { envelope_note: "synthetic-known-preview" };

    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
    expect(result.status).toBe("payment_required");
    if (result.status === "payment_required") {
      expect(result.challenge.top_level_body_keys_present).toContain("stocktrends_preview");
      expect(result.method).toBe("GET");
      expect(result.http_method).toBe("GET");
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain("synthetic-discovery-family");
      expect(serialized).not.toContain("/v1/synthetic/discovery/example");
    }
  });

  it.each(PUBLIC_MOCK_INVOCATIONS)(
    "accepts the default compact source-shaped challenge for exact tool/route mapping $name",
    async (invocation) => {
      const fetchFn = vi.fn<FetchLike>(async (input, init) => {
        expect(init.method).toBe("GET");
        expect((input as URL).pathname).toBe(invocation.endpointPath);
        return canonicalLiveHttpResponse(invocation.endpointPath);
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

  it("requires only the authoritative standard header and treats legacy metadata names as optional", async () => {
    const standardOnly = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath));
    const withLegacy = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      headerNames: [...X402_CHALLENGE_HEADER_NAMES]
    }));
    const noStandard = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      headerNames: X402_CHALLENGE_HEADER_NAMES.filter((name) => name !== "payment-required"),
      headerValue: null,
      headerState: "missing"
    }));

    expect(standardOnly.status).toBe("payment_required");
    expect(withLegacy.status).toBe("payment_required");
    expect(noStandard.status).toBe("error");
    if (noStandard.status === "error") {
      expect(noStandard.error.error_code).toBe("x402_live_challenge_header_missing");
    }
  });

  it("rejects duplicated Payment-Required values when Node combines them deterministically", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const encoded = encodeJson(paymentRequirements(body));
    const headers = new Headers([
      ["content-type", "application/json"],
      ["payment-required", encoded],
      ["payment-required", encoded]
    ]);
    expect(headers.get("payment-required")).toBe(`${encoded}, ${encoded}`);

    const fetchFn = vi.fn<FetchLike>(async () =>
      new Response(JSON.stringify(body), { status: 402, headers })
    );
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);
    const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const output = structured<X402LiveRelayErrorResult>(result);

    expect(output.error.error_code).toBe("x402_live_challenge_header_invalid");
    expect(fetchFn).toHaveBeenCalledTimes(1);

    await client.close();
    await server.close();
  });

  it.each([
    ["base64url-only", "e30_"],
    ["invalid alphabet", "e3$="],
    ["invalid padding", "e30==="],
    ["whitespace", "e3 0="],
    ["non-canonical pad bits", "e31="],
    ["invalid UTF-8", Buffer.from([0xff]).toString("base64")],
    ["invalid JSON", Buffer.from("not-json", "utf8").toString("base64")],
    ["more than one JSON value", Buffer.from("{}{}", "utf8").toString("base64")]
  ])("rejects malformed authoritative header: %s", async (_name, headerValue) => {
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { headerValue }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_live_challenge_header_invalid");
    }
  });

  it.each([null, [], "primitive", 7, true])("rejects decoded non-object JSON %#", async (decoded) => {
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      headerValue: encodeJson(decoded)
    }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_live_challenge_header_shape_not_approved");
    }
  });

  it("applies independent encoded and decoded header caps", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const encodedOverflow = await fetchDirectNoKeyChallenge(async () => jsonResponse(body, 402, {
      "payment-required": "A".repeat(MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES + 1)
    }));
    expect(encodedOverflow.paymentRequiredHeaderState).toBe("oversized");
    expect(encodedOverflow.paymentRequiredHeader).toBeNull();
    const encodedOverflowResult = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      headerValue: null,
      headerState: "oversized"
    }));
    expect(encodedOverflowResult.status).toBe("error");
    if (encodedOverflowResult.status === "error") {
      expect(encodedOverflowResult.error.error_code).toBe("x402_live_challenge_header_invalid");
    }

    const decodedOverflowValue = Buffer.alloc(MAX_X402_PAYMENT_REQUIRED_DECODED_BYTES + 1, 0x20).toString("base64");
    expect(decodedOverflowValue.length).toBeLessThan(MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES);
    const decodedOverflow = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      headerValue: decodedOverflowValue
    }));
    expect(decodedOverflow.status).toBe("error");
    if (decodedOverflow.status === "error") {
      expect(decodedOverflow.error.error_code).toBe("x402_live_challenge_header_invalid");
    }
  });

  it("treats JSON object key order as irrelevant while preserving exact structure", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const requirements = paymentRequirements(body);
    const reordered = Object.fromEntries(Object.entries(requirements).reverse());
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      body,
      headerValue: encodeJson(reordered)
    }));
    expect(result.status).toBe("payment_required");
  });

  it.each([
    ["version", (body: Record<string, unknown>) => { paymentRequirements(body).x402Version = 3; }],
    ["resource", (body: Record<string, unknown>) => { resourceInfo(body).description = "changed"; }],
    ["accepts", (body: Record<string, unknown>) => { acceptedRequirement(body).amount = "2"; }],
    ["accepted extra", (body: Record<string, unknown>) => { acceptedExtra(body).version = "changed"; }],
    ["extensions", (body: Record<string, unknown>) => { paymentRequirements(body).extensions = { changed: true }; }]
  ])("rejects header/body divergence in %s", async (_name, mutate) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const headerValue = encodeJson(cloneJson(paymentRequirements(body)));
    mutate(body);
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body, headerValue }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_live_challenge_header_body_mismatch");
    }
  });

  it("rejects the legacy payment_required boolean model", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    body.payment_required = true;
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      body,
      headerValue: encodeJson(true)
    }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_live_challenge_header_shape_not_approved");
    }
  });

  it.each([
    ["missing", undefined],
    ["object entry", [{ method: "x402" }]],
    ["empty", []],
    ["duplicate", ["x402", "x402"]],
    ["extra", ["x402", "mpp"]],
    ["non-string", [7]]
  ])("rejects invalid accepted_payment_methods: %s", async (_name, value) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    if (value === undefined) delete body.accepted_payment_methods;
    else body.accepted_payment_methods = value;
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
    expect(result.status).toBe("error");
  });

  it.each([0, 2])("rejects accepts length %s instead of silently selecting", async (length) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const accepted = cloneJson(acceptedRequirement(body));
    paymentRequirements(body).accepts = length === 0 ? [] : [accepted, accepted];
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each(["recipient", "address"])("rejects %s as a payTo substitute", async (alias) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const accepted = acceptedRequirement(body);
    const payTo = accepted.payTo;
    delete accepted.payTo;
    accepted[alias] = payTo;
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each(["expiry", "expires_at"])("rejects %s as a timeout substitute or addition", async (alias) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    acceptedRequirement(body)[alias] = "2030-01-01T00:00:00Z";
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each(["1", "9".repeat(78)])("accepts canonical positive atomic amount %s", async (amount) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    acceptedRequirement(body).amount = amount;
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("payment_required");
  });

  it.each([1, "1.0", "+1", "1e6", "0", "01", "-1", " 1", "9".repeat(79)])(
    "rejects non-canonical atomic amount %#",
    async (amount) => {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      acceptedRequirement(body).amount = amount;
      expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
    }
  );

  it.each(["0.000001", "1.250000", `${"9".repeat(32)}.999999`])(
    "accepts canonical fixed-six USD value %s",
    async (amountUsd) => {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      pricing(body).amount_usd = amountUsd;
      expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("payment_required");
    }
  );

  it.each([1.25, "1.25", "1.25000", "1.2500000", "1e0", "+1.000000", "0.000000", "-1.000000", "01.000000", `${"9".repeat(33)}.000001`])(
    "rejects non-canonical USD value %#",
    async (amountUsd) => {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      pricing(body).amount_usd = amountUsd;
      expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
    }
  );

  it.each([
    ["network", (body: Record<string, unknown>) => { pricing(body).network = "eip155:1"; }],
    ["token/asset", (body: Record<string, unknown>) => { pricing(body).token = `0x${"c".repeat(40)}`; }],
    ["scheme", (body: Record<string, unknown>) => { pricing(body).scheme = "upto"; }]
  ])("rejects pricing/requirement %s mismatch", async (_name, mutate) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    mutate(body);
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each([
    ["relative", REQUEST.endpointPath, true],
    ["lowercase canonical configured origin", `https://api.stocktrends.com${REQUEST.endpointPath}`, true],
    ["mixed-case scheme", `HTTPS://api.stocktrends.com${REQUEST.endpointPath}`, false],
    ["mixed-case hostname", `https://API.StockTrends.com${REQUEST.endpointPath}`, false],
    ["explicit default port", `https://api.stocktrends.com:443${REQUEST.endpointPath}`, false],
    ["zero-padded default port", `https://api.stocktrends.com:0443${REQUEST.endpointPath}`, false],
    ["wrong non-default port", `https://api.stocktrends.com:8443${REQUEST.endpointPath}`, false],
    ["wrong origin", `https://example.com${REQUEST.endpointPath}`, false],
    ["wrong endpoint on same origin", "https://api.stocktrends.com/v1/market/regime/history", false],
    ["another allowlisted endpoint for a different tool", "https://api.stocktrends.com/v1/selections/latest", false],
    ["credentials", `https://user:pass@api.stocktrends.com${REQUEST.endpointPath}`, false],
    ["fragment", `https://api.stocktrends.com${REQUEST.endpointPath}#fragment`, false],
    ["query", `https://api.stocktrends.com${REQUEST.endpointPath}?limit=1`, false],
    ["backslash", `https://api.stocktrends.com\\v1/market/regime/latest`, false],
    ["duplicate slash", "https://api.stocktrends.com/v1/market//regime/latest", false],
    ["encoded slash", "https://api.stocktrends.com/v1/market%2fregime/latest", false],
    ["encoded backslash", "https://api.stocktrends.com/v1/market%5cregime/latest", false],
    ["double encoding", "https://api.stocktrends.com/v1/market%252fregime/latest", false],
    ["dot segment", "https://api.stocktrends.com/v1/market/other/../regime/latest", false],
    ["parser-normalized encoded path", "https://api.stocktrends.com/v1/market/regime/%6catest", false],
    ["trailing slash", `https://api.stocktrends.com${REQUEST.endpointPath}/`, false]
  ])("validates route-bound resource URL: %s", async (_name, resourceUrl, valid) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    setAllResourceUrls(body, resourceUrl);
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
    expect(result.status).toBe(valid ? "payment_required" : "error");
  });

  it("accepts only an exactly configured canonical non-default origin and port", async () => {
    const canonical = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    setAllResourceUrls(canonical, `https://api.synthetic.test:8443${REQUEST.endpointPath}`);
    const accepted = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      body: canonical,
      apiBaseOrigin: "https://api.synthetic.test:8443"
    }));

    const wrongPort = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    setAllResourceUrls(wrongPort, `https://api.synthetic.test:9443${REQUEST.endpointPath}`);
    const rejected = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, {
      body: wrongPort,
      apiBaseOrigin: "https://api.synthetic.test:8443"
    }));

    expect(accepted.status).toBe("payment_required");
    expect(rejected.status).toBe("error");
  });

  it.each(["top-level", "extra copy"])("rejects disagreement among resource copies: %s", async (where) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    if (where === "top-level") body.resource = "/v1/market/regime/history";
    else (acceptedExtra(body).resource as Record<string, unknown>).url = "/v1/market/regime/history";
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each(["2", 2.5, true, 1, 3])("rejects invalid x402Version %#", async (version) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(body).x402Version = version;
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each(["solana:mainnet", "eip155:0", "eip155:01", "eip155:-1", "eip155:1.5"])(
    "fails closed for unsupported or invalid network %s",
    async (network) => {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      acceptedRequirement(body).network = network;
      pricing(body).network = network;
      const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.error_code).toBe("x402_live_challenge_network_unsupported");
      }
    }
  );

  it("accepts a source-aligned non-Base EVM chain without widening beyond eip155", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    acceptedRequirement(body).network = "eip155:1";
    pricing(body).network = "eip155:1";
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status)
      .toBe("payment_required");
  });

  it.each([
    ["asset", "0x1234"],
    ["payTo", "0X" + "a".repeat(40)],
    ["asset", "0x" + "g".repeat(40)],
    ["payTo", "0x" + "a".repeat(39)]
  ])("rejects invalid EVM %s address", async (field, value) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    acceptedRequirement(body)[field] = value;
    if (field === "asset") pricing(body).token = value;
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each([0, -1, 1.5, "300", true, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid maxTimeoutSeconds %#",
    async (timeout) => {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      acceptedRequirement(body).maxTimeoutSeconds = timeout;
      expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
    }
  );

  it("accepts bounded unknown members only in extra and extensions", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    acceptedExtra(body).vendor_metadata = { mode: "synthetic", flags: [1, true, null] };
    paymentRequirements(body).extensions = { synthetic_vendor: { note: "bounded metadata", fields: ["a", "b"] } };
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("payment_required");
  });

  it("accepts family, method, path, schemas, and examples only at source-authored Bazaar discovery paths", async () => {
    const compactExtension = createCompactBazaarExtension();
    const compactInfo = bazaarInfo(compactExtension);
    const compactInput = compactInfo.input as Record<string, unknown>;
    const compactSchemaProperties = bazaarSchema(compactExtension).properties as Record<string, unknown>;
    const compactSchemaInput = compactSchemaProperties.input as Record<string, unknown>;
    const compactSchemaInputProperties = compactSchemaInput.properties as Record<string, unknown>;
    expect(compactInfo.family).toBe("synthetic-discovery-family");
    expect(compactInput.method).toBe("GET");
    expect(compactSchemaInputProperties.method).toEqual({ type: "string", enum: ["GET"] });

    const compact = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(compact).extensions = compactExtension;

    const richExtension = createRepresentativeRichBazaarExtension();
    const richInfo = bazaarInfo(richExtension);
    const richInput = richInfo.input as Record<string, unknown>;
    const richInputExample = richInput.example as Record<string, unknown>;
    const richExamples = richInfo.examples as Record<string, unknown>[];
    const richInterpretationDependencies = richInfo.interpretation_dependencies as Record<string, unknown>;
    const richInterpretationDependency = richInterpretationDependencies.dependency as Record<string, unknown>;
    const richInputParameters = richInput.parameters as Record<string, unknown>[];
    const richSchemaProperties = bazaarSchema(richExtension).properties as Record<string, unknown>;
    const richSchemaInput = richSchemaProperties.input as Record<string, unknown>;
    const richSchemaInputProperties = richSchemaInput.properties as Record<string, unknown>;
    const richOutput = richInfo.output as Record<string, unknown>;
    const familySentinel = "synthetic-source-role-family-marker";
    const pathSentinel = "/v1/synthetic/source-role-path-marker";
    const proofreadingSentinel = "synthetic-source-role-proofreading-marker";
    const seedlingSentinel = "synthetic-source-role-seedling-marker";

    richInfo.endpoint_family = familySentinel;
    richInputExample.path = pathSentinel;
    richExamples[0].path = pathSentinel;
    richSchemaInputProperties.proofreading_note = {
      type: "string",
      description: proofreadingSentinel
    };
    richInputParameters[0].proofreading_note = proofreadingSentinel;
    richOutput.seedling_metadata = seedlingSentinel;

    expect(richInput.method).toBe("GET");
    expect(richInterpretationDependency.method).toBe("GET");
    expect(richInputExample.method).toBe("GET");
    expect(richInputExample.path).toBe(pathSentinel);
    expect(richExamples[0].path).toBe(pathSentinel);
    expect(richOutput).toMatchObject({
      type: "json",
      example: { request_id: "req_synthetic_rich", data: { status: "synthetic" } }
    });

    const rich = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(rich).extensions = richExtension;

    const compactResult = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: compact }));
    const richResult = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: rich }));
    expect(compactResult.status).toBe("payment_required");
    expect(richResult.status).toBe("payment_required");
    const serializedAccepted = `${JSON.stringify(compactResult)}\n${JSON.stringify(richResult)}`;
    for (const omitted of [familySentinel, pathSentinel, proofreadingSentinel, seedlingSentinel]) {
      expect(serializedAccepted).not.toContain(omitted);
    }

    for (const [key, value] of [
      ["family", "synthetic-family"],
      ["method", "GET"],
      ["path", "/v1/synthetic/unapproved"]
    ] as const) {
      const unapproved = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      paymentRequirements(unapproved).extensions = { synthetic_vendor: { [key]: value } };
      const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: unapproved }));
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.error_code).toBe("x402_live_challenge_prohibited_material");
      }
    }

    for (const [key, value] of [
      ["family", "synthetic-family"],
      ["method", "GET"],
      ["path", "/v1/synthetic/unapproved"]
    ] as const) {
      for (const placement of ["schema-root", "output-example"] as const) {
        const unapproved = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
        const extension = createRepresentativeRichBazaarExtension();
        if (placement === "schema-root") {
          bazaarSchema(extension)[key] = value;
        } else {
          const output = bazaarInfo(extension).output as Record<string, unknown>;
          (output.example as Record<string, unknown>)[key] = value;
        }
        paymentRequirements(unapproved).extensions = extension;
        const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: unapproved }));
        expect(result.status).toBe("error");
        if (result.status === "error") {
          expect(result.error.error_code).toBe("x402_live_challenge_prohibited_material");
        }
      }
    }
  });

  it.each([
    ["body", (body: Record<string, unknown>) => { body.synthetic_unknown = true; }],
    ["pricing", (body: Record<string, unknown>) => { pricing(body).synthetic_unknown = true; }],
    ["requirements", (body: Record<string, unknown>) => { paymentRequirements(body).synthetic_unknown = true; }],
    ["resource", (body: Record<string, unknown>) => { resourceInfo(body).synthetic_unknown = true; }],
    ["accepted", (body: Record<string, unknown>) => { acceptedRequirement(body).synthetic_unknown = true; }]
  ])("rejects unknown core member at %s", async (_name, mutate) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    mutate(body);
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it.each([
    ["depth", () => extensionNesting(X402_EXTENSION_MAX_DEPTH + 2)],
    ["members", () => Object.fromEntries(Array.from({ length: X402_EXTENSION_MAX_OBJECT_MEMBERS + 1 }, (_, i) => [`k${i}`, i]))],
    ["array", () => ({ items: Array.from({ length: X402_EXTENSION_MAX_ARRAY_LENGTH + 1 }, () => 1) })],
    ["string", () => ({ note: "x".repeat(X402_EXTENSION_MAX_STRING_BYTES + 1) })],
    ["total", () => ({ items: Array.from({ length: 30 }, () => "x".repeat(1_000)) })]
  ])("rejects extension %s overflow", async (_name, buildExtension) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const extension = buildExtension();
    expect(Buffer.byteLength(JSON.stringify(extension))).toBeGreaterThan(
      _name === "total" ? X402_EXTENSION_MAX_TOTAL_BYTES : 0
    );
    paymentRequirements(body).extensions = extension;
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status).toBe("error");
  });

  it("counts array elements and object entries against one shared aggregate extension budget", async () => {
    const exactlyAtLimit = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(exactlyAtLimit).extensions = aggregateSiblingArrays(8, 63);
    expect(countAggregateMembers(paymentRequirements(exactlyAtLimit).extensions)).toBe(
      X402_EXTENSION_MAX_TOTAL_MEMBERS
    );
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: exactlyAtLimit }))).status)
      .toBe("payment_required");

    const arrayOverflow = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(arrayOverflow).extensions = aggregateSiblingArrays(9, 56);
    expect(countAggregateMembers(paymentRequirements(arrayOverflow).extensions)).toBe(
      X402_EXTENSION_MAX_TOTAL_MEMBERS + 1
    );
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: arrayOverflow }))).status)
      .toBe("error");

    const objectOverflow = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(objectOverflow).extensions = aggregateSiblingObjects(9, 56);
    expect(countAggregateMembers(paymentRequirements(objectOverflow).extensions)).toBe(
      X402_EXTENSION_MAX_TOTAL_MEMBERS + 1
    );
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: objectOverflow }))).status)
      .toBe("error");
  });

  it("rejects prototype-pollution keys in decoded extension objects", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(body).extensions = JSON.parse('{"__proto__":{"polluted":true}}');
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_live_challenge_unexpected_shape");
    }
  });

  it.each([
    "proof",
    "payment_signature",
    "authorization",
    "authToken",
    "privateKey",
    "wallet_seed",
    "payment",
    "amount",
    "payTo",
    "settlement",
    "transaction_hash"
  ])(
    "rejects prohibited or core-shadow extension key %s",
    async (key) => {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      paymentRequirements(body).extensions = { vendor: { [key]: "synthetic-prohibited-marker" } };
      const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.error_code).toBe("x402_live_challenge_prohibited_material");
      }
      expect(JSON.stringify(result)).not.toContain("synthetic-prohibited-marker");
    }
  );

  it.each([
    "payment",
    "payment_required",
    "payment_status",
    "settlement",
    "settlement_status",
    "transaction",
    "transaction_hash",
    "transactionHash",
    "facilitator",
    "facilitator_url",
    "proof",
    "payment_signature",
    "authorization",
    "privateKey",
    "wallet_seed"
  ])("rejects universally prohibited Bazaar schema concept %s at root and nested roles", async (key) => {
    for (const placement of ["schema-root", "schema-nested"] as const) {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      const extension = createRepresentativeRichBazaarExtension();
      const schema = bazaarSchema(extension);
      const sentinel = "synthetic-bazaar-schema-prohibited-marker";

      if (placement === "schema-root") {
        schema[key] = sentinel;
      } else {
        const properties = schema.properties as Record<string, unknown>;
        const input = properties.input as Record<string, unknown>;
        const inputProperties = input.properties as Record<string, unknown>;
        inputProperties.synthetic_nested_metadata = {
          type: "object",
          properties: { [key]: { type: "string", const: sentinel } }
        };
      }

      paymentRequirements(body).extensions = extension;
      const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.error_code).toBe("x402_live_challenge_prohibited_material");
      }
      expect(JSON.stringify(result)).not.toContain(sentinel);
    }
  });

  it.each([
    "routeOverride",
    "route_override",
    "ROUTE-OVERRIDE",
    "amountOverride",
    "amount_override",
    "assetOverride",
    "payee_override",
    "network.override",
    "schemeOverride",
    "payToOverride",
    "timeout_override",
    "maxTimeoutSecondsOverride"
  ])("rejects tokenized payment-semantic override key %s outside and inside Bazaar schema roles", async (key) => {
    for (const placement of ["generic", "schema-root", "schema-nested"] as const) {
      const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      const sentinel = "synthetic-override-marker";
      if (placement === "generic") {
        paymentRequirements(body).extensions = { synthetic_vendor: { [key]: sentinel } };
      } else {
        const extension = createRepresentativeRichBazaarExtension();
        const schema = bazaarSchema(extension);
        if (placement === "schema-root") {
          schema[key] = sentinel;
        } else {
          const properties = schema.properties as Record<string, unknown>;
          const input = properties.input as Record<string, unknown>;
          const inputProperties = input.properties as Record<string, unknown>;
          inputProperties.synthetic_nested_override = {
            type: "object",
            properties: { [key]: { type: "string", const: sentinel } }
          };
        }
        paymentRequirements(body).extensions = extension;
      }

      const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.error_code).toBe("x402_live_challenge_prohibited_material");
      }
      expect(JSON.stringify(result)).not.toContain(sentinel);
    }
  });

  it("accepts benign longer words instead of substring-matching proof or seed", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    paymentRequirements(body).extensions = {
      synthetic_vendor: {
        proofreading_note: "synthetic editorial metadata",
        seedling_metadata: "synthetic taxonomy metadata"
      }
    };
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }))).status)
      .toBe("payment_required");
  });

  it.each(["extra", "stocktrends_preview"])("applies prohibited-material rules to %s", async (container) => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    if (container === "extra") acceptedExtra(body).payment_signature = "synthetic-prohibited-marker";
    else body.stocktrends_preview = { amount: "synthetic-prohibited-marker" };
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_live_challenge_prohibited_material");
    }
  });

  it("accepts the seven-key body and one benign optional preview, but rejects arbitrary top-level fields", async () => {
    const sevenKey = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const preview = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    preview.stocktrends_preview = { envelope_note: "synthetic-preview" };
    const arbitrary = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    arbitrary.arbitrary_extension = { benign: true };

    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: sevenKey }))).status)
      .toBe("payment_required");
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: preview }))).status)
      .toBe("payment_required");
    expect((await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body: arbitrary }))).status)
      .toBe("error");
  });

  it("never relays raw header/body sentinels through text, structured output, errors, metadata, or logs", async () => {
    const capturedLogs: string[] = [];
    const spies = (["log", "warn", "error"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation((...args: unknown[]) => capturedLogs.push(args.join(" ")))
    );
    const fetchFn = vi.fn<FetchLike>(async () => canonicalLiveHttpResponse(REQUEST.endpointPath, (body) => {
      compactBazaarInfo(body).description = LIVE_VALUE_SENTINEL;
    }, { "x-unrelated-response-header": LIVE_VALUE_SENTINEL }));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);

    try {
      const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
      const allVisible = `${JSON.stringify(result)}\n${contentText(result)}\n${capturedLogs.join("\n")}`;
      expect(allVisible).not.toContain(LIVE_VALUE_SENTINEL);
      expect(allVisible).not.toContain("paymentRequiredHeader");
      expect(fetchFn).toHaveBeenCalledTimes(1);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
      await client.close();
      await server.close();
    }
  });

  it("omits valid core amount, asset, payee, network, scheme, and timeout values", async () => {
    const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const accepted = acceptedRequirement(body);
    const safePricing = pricing(body);
    const omittedValues = {
      atomicAmount: "987654321",
      usdAmount: "9.876543",
      asset: `0x${"c".repeat(40)}`,
      payTo: `0x${"d".repeat(40)}`,
      network: "eip155:11155111",
      scheme: "synthetic-exact",
      timeout: 777
    };
    Object.assign(accepted, {
      amount: omittedValues.atomicAmount,
      asset: omittedValues.asset,
      payTo: omittedValues.payTo,
      network: omittedValues.network,
      scheme: omittedValues.scheme,
      maxTimeoutSeconds: omittedValues.timeout
    });
    Object.assign(safePricing, {
      amount_usd: omittedValues.usdAmount,
      token: omittedValues.asset,
      network: omittedValues.network,
      scheme: omittedValues.scheme
    });
    const result = await executeInjected(canonicalInjectedResponse(REQUEST.endpointPath, { body }));
    expect(result.status).toBe("payment_required");
    const serialized = JSON.stringify(result);
    for (const value of Object.values(omittedValues)) {
      expect(serialized).not.toContain(String(value));
    }
  });

  it("preserves mock-only invocation when live mode is explicitly off", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => canonicalLiveHttpResponse(REQUEST.endpointPath));
    const { client, server } = await connectMcp(fetchFn, {
      ...X402_ENV,
      STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY: "off"
    });
    const body = structured<X402PaymentRequiredResult>(
      await client.callTool({ name: REQUEST.toolName, arguments: {} })
    );
    expect(body.status).toBe("payment_required");
    expect(body.api_request_sent).toBe(false);
    expect(body.mcp_metadata.mock_only).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
    await client.close();
    await server.close();
  });

  it("fails direct live-helper use while the live flag is absent or disabled without reserving or fetching", async () => {
    for (const env of [
      X402_ENV,
      { ...X402_ENV, STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY: "off" }
    ]) {
      const config = parseConfig(env).x402Relay;
      const state = createX402LiveChallengeSessionState();
      const fetchChallenge = vi.fn(async () => canonicalInjectedResponse(REQUEST.endpointPath));
      const result = await executePublicLiveX402ChallengeRelay(
        config,
        REQUEST,
        {},
        state,
        fetchChallenge
      );

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error.error_code).toBe("x402_live_challenge_disabled");
      }
      expect(state.totalReserved).toBe(0);
      expect(fetchChallenge).not.toHaveBeenCalled();
    }
  });

  it.each([{ symbol: "IBM" }, { symbol_exchange: "IBM_N", symbol: "IBM", exchange: "N" }])(
    "fails non-canonical symbol input before resolver or network",
    async (arguments_) => {
      const fetchFn = vi.fn<FetchLike>(async () => canonicalLiveHttpResponse("/v1/indicators/latest"));
      const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);
      const result = await client.callTool({ name: "stocktrends_get_indicators_latest", arguments: arguments_ });
      const body = structured<X402LiveRelayErrorResult>(result);
      expect(body.error.error_code).toBe("x402_symbol_exchange_required");
      expect(body.api_request_sent).toBe(false);
      expect(fetchFn).not.toHaveBeenCalled();
      await client.close();
      await server.close();
    }
  );

  it("denies proof input and non-allowlisted bindings before reservation or fetch", async () => {
    const config = parseConfig(X402_LIVE_ENV).x402Relay;
    const proofState = createX402LiveChallengeSessionState();
    const routeState = createX402LiveChallengeSessionState();
    const fetchChallenge = vi.fn(async () => canonicalInjectedResponse(REQUEST.endpointPath));
    const proof = await executePublicLiveX402ChallengeRelay(
      config, REQUEST, { payment_proof: "<redacted-proof>" }, proofState, fetchChallenge
    );
    const route = await executePublicLiveX402ChallengeRelay(
      config,
      { toolName: "stocktrends_unknown", endpointPath: "/v1/pricing/catalog" },
      {}, routeState, fetchChallenge
    );
    expect(proof.status === "error" && proof.error.error_code).toBe("x402_proof_forwarding_not_enabled");
    expect(route.status === "error" && route.error.error_code).toBe("x402_route_not_allowlisted");
    expect(fetchChallenge).not.toHaveBeenCalled();
    expect(proofState.totalReserved).toBe(0);
    expect(routeState.totalReserved).toBe(0);
  });

  it("rejects a mismatched paid tool and route even when both are independently allowlisted", async () => {
    const config = parseConfig(X402_LIVE_ENV).x402Relay;
    const state = createX402LiveChallengeSessionState();
    const fetchChallenge = vi.fn(async () => canonicalInjectedResponse("/v1/market/regime/history"));
    const result = await executePublicLiveX402ChallengeRelay(
      config,
      {
        toolName: "stocktrends_get_market_regime_latest",
        endpointPath: "/v1/market/regime/history"
      },
      {},
      state,
      fetchChallenge
    );

    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.error.error_code).toBe("x402_route_not_allowlisted");
    }
    expect(state.totalReserved).toBe(0);
    expect(fetchChallenge).not.toHaveBeenCalled();
  });

  it("keeps consumed-attempt, per-tool, and per-session caps unchanged", async () => {
    const fetchFn = vi.fn<FetchLike>(async (input) => canonicalLiveHttpResponse((input as URL).pathname));
    const firstServer = await connectMcp(fetchFn, X402_LIVE_ENV);
    const first = await firstServer.client.callTool({ name: REQUEST.toolName, arguments: {} });
    const repeat = structured<X402LiveRelayErrorResult>(
      await firstServer.client.callTool({ name: REQUEST.toolName, arguments: {} })
    );
    expect(structured<X402LivePaymentRequiredResult>(first).status).toBe("payment_required");
    expect(repeat.error.error_code).toBe("x402_live_challenge_repeated_call");
    await firstServer.client.close();
    await firstServer.server.close();

    const capFetch = vi.fn<FetchLike>(async (input) => canonicalLiveHttpResponse((input as URL).pathname));
    const capped = await connectMcp(capFetch, X402_LIVE_ENV);
    await capped.client.callTool({ name: "stocktrends_get_selections_latest", arguments: { limit: 1 } });
    const perTool = structured<X402LiveRelayErrorResult>(
      await capped.client.callTool({ name: "stocktrends_get_selections_latest", arguments: { limit: 2 } })
    );
    expect(perTool.error.error_code).toBe("x402_live_challenge_cap_exceeded");
    await capped.client.close();
    await capped.server.close();

    const sessionFetch = vi.fn<FetchLike>(async (input) => canonicalLiveHttpResponse((input as URL).pathname));
    const session = await connectMcp(sessionFetch, X402_LIVE_ENV);
    for (const invocation of [
      { name: "stocktrends_get_market_regime_latest", arguments: {} },
      { name: "stocktrends_get_selections_latest", arguments: { limit: 1 } },
      { name: "stocktrends_get_breadth_sector_latest", arguments: { limit: 1 } }
    ]) await session.client.callTool(invocation);
    const fourth = structured<X402LiveRelayErrorResult>(await session.client.callTool({
      name: "stocktrends_get_leadership_summary_latest",
      arguments: { limit_overall: 1, limit_bucket: 1 }
    }));
    expect(fourth.error.error_code).toBe("x402_live_challenge_cap_exceeded");
    expect(sessionFetch).toHaveBeenCalledTimes(3);
    await session.client.close();
    await session.server.close();
  });

  it("keeps a failed reservation consumed and performs no retry or fallback", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ error: "temporary" }, 503));
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);
    const first = structured<X402LiveRelayErrorResult>(await client.callTool({ name: REQUEST.toolName, arguments: {} }));
    const second = structured<X402LiveRelayErrorResult>(await client.callTool({ name: REQUEST.toolName, arguments: {} }));
    expect(first.error.error_code).toBe("x402_live_challenge_unexpected_status");
    expect(first.api_status).toBe(503);
    expect(second.error.error_code).toBe("x402_live_challenge_repeated_call");
    expect(fetchFn).toHaveBeenCalledTimes(1);
    await client.close();
    await server.close();
  });

  it.each(["stocktrends_preview", "unknown_body_field", "extensions", "extra"] as const)(
    "fails closed without RangeError for deeply nested %s in direct and public live paths",
    async (target) => {
      const sentinel = `synthetic-deep-${target}-sentinel`;
      const directBody = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
      setDeepChallengeValue(directBody, target, nestedObject(5_000, sentinel));
      const directResponse = canonicalInjectedResponse(REQUEST.endpointPath, {
        body: directBody,
        headerValue: "e30="
      });
      const config = parseConfig(X402_LIVE_ENV).x402Relay;
      const state = createX402LiveChallengeSessionState();
      const fetchChallenge = vi.fn(async () => directResponse);

      const direct = await executePublicLiveX402ChallengeRelay(
        config,
        REQUEST,
        {},
        state,
        fetchChallenge
      );
      expect(direct.status).toBe("error");
      if (direct.status === "error") {
        expect(direct.error.error_code).toBe("x402_live_challenge_unexpected_shape");
      }
      expect(JSON.stringify(direct)).not.toContain(sentinel);
      expect(state.totalReserved).toBe(1);
      expect(fetchChallenge).toHaveBeenCalledTimes(1);

      const directRepeat = await executePublicLiveX402ChallengeRelay(
        config,
        REQUEST,
        {},
        state,
        fetchChallenge
      );
      expect(directRepeat.status === "error" && directRepeat.error.error_code)
        .toBe("x402_live_challenge_repeated_call");
      expect(fetchChallenge).toHaveBeenCalledTimes(1);

      const deepHttp = deepChallengeHttpResponse(target, sentinel);
      const fetchFn = vi.fn<FetchLike>(async () => deepHttp);
      const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);
      const publicResult = await client.callTool({ name: REQUEST.toolName, arguments: {} });
      const publicBody = structured<X402LiveRelayErrorResult>(publicResult);
      expect(publicBody.error.error_code).toBe("x402_live_challenge_unexpected_shape");
      expect(`${JSON.stringify(publicResult)}\n${contentText(publicResult)}`).not.toContain(sentinel);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      const publicRepeat = structured<X402LiveRelayErrorResult>(
        await client.callTool({ name: REQUEST.toolName, arguments: {} })
      );
      expect(publicRepeat.error.error_code).toBe("x402_live_challenge_repeated_call");
      expect(fetchFn).toHaveBeenCalledTimes(1);

      await client.close();
      await server.close();
    }
  );

  it("fails closed on redirects, network failures, and paid output without proof", async () => {
    const cases: Array<[FetchLike, string]> = [
      [async () => new Response(null, { status: 302, headers: { location: "https://example.com" } }), "x402_live_challenge_unexpected_status"],
      [async () => { throw new Error(LIVE_VALUE_SENTINEL); }, "x402_live_challenge_unexpected_status"],
      [async () => jsonResponse({ api_data: { marker: LIVE_VALUE_SENTINEL } }, 200), "x402_live_challenge_paid_output_without_proof"]
    ];
    for (const [implementation, expectedCode] of cases) {
      const fetchFn = vi.fn<FetchLike>(implementation);
      const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);
      const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
      const body = structured<X402LiveRelayErrorResult>(result);
      expect(body.error.error_code).toBe(expectedCode);
      expect(JSON.stringify(result)).not.toContain(LIVE_VALUE_SENTINEL);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      await client.close();
      await server.close();
    }
  });

  it("preserves the bounded 64-KiB streaming body behavior", async () => {
    const expectedBody = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const under = streamingJsonResponse(chunkText(JSON.stringify(expectedBody), 97));
    const over = oversizedStreamingJsonResponse("synthetic-over-limit-body-marker");
    const exactBody = exactSizeJsonObject(MAX_X402_CHALLENGE_RESPONSE_BYTES);
    const exact = streamingJsonResponse([exactBody]);
    const firstByteOver = streamingJsonResponse([`${exactBody}x`]);

    expect((await fetchDirectNoKeyChallenge(async () => under.response)).body).toEqual(expectedBody);
    expect((await fetchDirectNoKeyChallenge(async () => over.response)).body).toBeNull();
    expect((await fetchDirectNoKeyChallenge(async () => exact.response)).body).toEqual(JSON.parse(exactBody));
    expect((await fetchDirectNoKeyChallenge(async () => firstByteOver.response)).body).toBeNull();
    expect(under.metrics.cancelled).toBe(false);
    expect(over.metrics.cancelled).toBe(true);
    expect(firstByteOver.metrics.cancelled).toBe(true);
  });

  it.each(["malformed", "-1", "Infinity", String(MAX_X402_CHALLENGE_RESPONSE_BYTES + 1)])(
    "rejects invalid or oversized declared Content-Length %s before reading",
    async (declaredLength) => {
      const streamed = streamingJsonResponse([JSON.stringify({ ok: true })], declaredLength);
      const response = await fetchDirectNoKeyChallenge(async () => streamed.response);
      expect(response.body).toBeNull();
      expect(streamed.metrics.pulls).toBe(0);
      expect(streamed.metrics.cancelled).toBe(true);
    }
  );

  it("does not trust a dishonest under-limit Content-Length when the streamed body exceeds 64 KiB", async () => {
    const marker = "synthetic-dishonest-content-length-marker";
    const streamed = oversizedStreamingJsonResponse(marker, "1024");
    const response = await fetchDirectNoKeyChallenge(async () => streamed.response);

    expect(response.body).toBeNull();
    expect(streamed.metrics.pulls).toBeGreaterThan(0);
    expect(streamed.metrics.cancelled).toBe(true);
  });

  it("maps an oversized streamed challenge to a safe local error", async () => {
    const marker = "synthetic-streamed-body-value-that-must-not-leak";
    const canonical = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
    const streamed = oversizedStreamingJsonResponse(marker, undefined, {
      "payment-required": encodeJson(paymentRequirements(canonical))
    });
    const fetchFn = vi.fn<FetchLike>(async () => streamed.response);
    const { client, server } = await connectMcp(fetchFn, X402_LIVE_ENV);
    const result = await client.callTool({ name: REQUEST.toolName, arguments: {} });
    const body = structured<X402LiveRelayErrorResult>(result);
    expect(body.error.error_code).toBe("x402_live_challenge_unexpected_shape");
    expect(JSON.stringify(result)).not.toContain(marker);
    expect(streamed.metrics.cancelled).toBe(true);
    await client.close();
    await server.close();
  });

  it("builds only route-bound validated query parameters", () => {
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/stim/latest", {
      symbol_exchange: "IBM_N", symbol: "IBM", exchange: "N"
    }))).toEqual({ symbol_exchange: "IBM-N" });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/selections/latest", {}))).toEqual({ limit: "50" });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/market/regime/history", {}))).toEqual({ limit: "12" });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/breadth/sector/latest", {}))).toEqual({ group_level: "sector", limit: "50" });
    expect(Object.fromEntries(buildLiveChallengeSearchParams("/v1/leadership/summary/latest", {}))).toEqual({ limit_overall: "50", limit_bucket: "20" });
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

type DirectHelperKind = "mock" | "live";

async function expectDirectToolInputRejected(helper: DirectHelperKind, input: unknown): Promise<void> {
  if (helper === "mock") {
    const config = parseConfig(X402_ENV).x402Relay;
    const state = createX402ChallengeSessionState();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      throw new Error("mock direct-helper input rejection must not fetch");
    });
    let result!: ReturnType<typeof buildPublicMockX402ChallengeRelayResult>;

    try {
      expect(() => {
        result = buildPublicMockX402ChallengeRelayResult(config, REQUEST, input, state);
      }).not.toThrow();
      expect(result.status).toBe("error");
      if (result.status !== "error") throw new Error("expected coarse tool-input rejection");
      assertCoarseToolInputRejection(result);
      expect(state.inFlightSignatures.size).toBe(0);
      expect(state.completedSignatures.size).toBe(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
    return;
  }

  const config = parseConfig(X402_LIVE_ENV).x402Relay;
  const state = createX402LiveChallengeSessionState();
  const fetchChallenge = vi.fn(async () => canonicalInjectedResponse(REQUEST.endpointPath));
  const result = await executePublicLiveX402ChallengeRelay(
    config,
    REQUEST,
    input,
    state,
    fetchChallenge
  );

  expect(result.status).toBe("error");
  if (result.status !== "error") throw new Error("expected coarse tool-input rejection");
  assertCoarseToolInputRejection(result);
  expect(state.totalReserved).toBe(0);
  expect(state.reservedSignatures.size).toBe(0);
  expect(state.reservedByTool.size).toBe(0);
  expect(fetchChallenge).not.toHaveBeenCalled();
}

function assertCoarseToolInputRejection(
  result: X402RelayErrorResult | X402LiveRelayErrorResult
): void {
  expect(result.error.error_code).toBe("x402_tool_input_invalid");
  expect(result.error.denial_reason).toBe("x402_tool_input_invalid");
  expect(result.api_request_sent).toBe(false);
  expect(result.paid_execution_occurred).toBe(false);
  expect(result.auth_header_sent).toBe(false);
  expect(result.payment_header_sent).toBe(false);
  expect(result.proof_forwarded).toBe(false);
  expect(result.spend_occurred).toBe(false);
  expect(result.paid_api_data_returned).toBe(false);
  expect(result.automatic_paid_retries).toBe(false);
  expect(JSON.stringify(result)).not.toContain(DIRECT_TOOL_INPUT_SENTINEL);
}

async function expectDirectToolInputAccepted(helper: DirectHelperKind, input: unknown): Promise<void> {
  if (helper === "mock") {
    const state = createX402ChallengeSessionState();
    const result = buildPublicMockX402ChallengeRelayResult(
      parseConfig(X402_ENV).x402Relay,
      REQUEST,
      input,
      state
    );
    expect(result.status).toBe("payment_required");
    expect(state.inFlightSignatures.size).toBe(0);
    expect(state.completedSignatures.size).toBe(1);
    expect(JSON.stringify(result)).not.toContain(DIRECT_TOOL_INPUT_SENTINEL);
    return;
  }

  const state = createX402LiveChallengeSessionState();
  const fetchChallenge = vi.fn(async () => canonicalInjectedResponse(REQUEST.endpointPath));
  const result = await executePublicLiveX402ChallengeRelay(
    parseConfig(X402_LIVE_ENV).x402Relay,
    REQUEST,
    input,
    state,
    fetchChallenge
  );
  expect(result.status).toBe("payment_required");
  expect(state.totalReserved).toBe(1);
  expect(state.reservedSignatures.size).toBe(1);
  expect(fetchChallenge).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(result)).not.toContain(DIRECT_TOOL_INPUT_SENTINEL);
}

function nestedToolInput(kind: "object" | "array", depth: number): unknown {
  let value: unknown = DIRECT_TOOL_INPUT_SENTINEL;
  for (let index = 0; index < depth; index += 1) {
    value = kind === "object"
      ? { [`${DIRECT_TOOL_INPUT_SENTINEL}_path`]: value }
      : [value];
  }
  return value;
}

function alternatingToolInput(depth: number): unknown {
  let value: unknown = DIRECT_TOOL_INPUT_SENTINEL;
  for (let index = 0; index < depth; index += 1) {
    value = index % 2 === 0
      ? { [`${DIRECT_TOOL_INPUT_SENTINEL}_path`]: value }
      : [value];
  }
  return value;
}

function aggregateToolInput(totalMembers: number): unknown[] {
  const groupCount = Math.ceil(totalMembers / (X402_TOOL_INPUT_MAX_ARRAY_LENGTH + 1));
  if (groupCount > X402_TOOL_INPUT_MAX_ARRAY_LENGTH) {
    throw new Error("synthetic aggregate fixture exceeds root array limit");
  }
  let remainingElements = totalMembers - groupCount;
  let sentinelAssigned = false;
  return Array.from({ length: groupCount }, () => {
    const groupLength = Math.min(X402_TOOL_INPUT_MAX_ARRAY_LENGTH, remainingElements);
    remainingElements -= groupLength;
    return Array.from({ length: groupLength }, (_, index) => {
      if (!sentinelAssigned && index === 0) {
        sentinelAssigned = true;
        return DIRECT_TOOL_INPUT_SENTINEL;
      }
      return index;
    });
  });
}

function cyclicToolInput(kind: "object" | "array"): unknown {
  if (kind === "array") {
    const value: unknown[] = [DIRECT_TOOL_INPUT_SENTINEL];
    value.push(value);
    return value;
  }
  const value: Record<string, unknown> = {
    [`${DIRECT_TOOL_INPUT_SENTINEL}_path`]: DIRECT_TOOL_INPUT_SENTINEL
  };
  value.self = value;
  return value;
}

function canonicalLiveHttpResponse(
  endpointPath: string,
  mutateBody?: (body: Record<string, unknown>) => void,
  extraHeaders: Record<string, string> = {}
): Response {
  const body = createCanonicalLiveChallengeBody(endpointPath);
  mutateBody?.(body);
  return jsonResponse(body, 402, {
    "payment-required": encodeJson(paymentRequirements(body)),
    ...extraHeaders
  });
}

function canonicalInjectedResponse(
  endpointPath: string,
  options: {
    body?: Record<string, unknown>;
    headerValue?: string | null;
    headerState?: X402LiveChallengeResponse["paymentRequiredHeaderState"];
    headerNames?: string[];
    apiBaseOrigin?: string;
    status?: number;
  } = {}
): X402LiveChallengeResponse {
  const body = options.body ?? createCanonicalLiveChallengeBody(endpointPath);
  const hasHeaderOverride = Object.prototype.hasOwnProperty.call(options, "headerValue");
  const paymentRequiredHeader = hasHeaderOverride
    ? options.headerValue ?? null
    : encodeJson(paymentRequirements(body));
  return {
    status: options.status ?? 402,
    approvedHeaderNamesPresent: options.headerNames ?? (paymentRequiredHeader === null ? [] : ["payment-required"]),
    paymentRequiredHeader,
    paymentRequiredHeaderState:
      options.headerState ?? (paymentRequiredHeader === null ? "missing" : "present"),
    apiBaseOrigin: options.apiBaseOrigin ?? "https://api.stocktrends.com",
    body
  };
}

async function executeInjected(response: X402LiveChallengeResponse) {
  const config = parseConfig(X402_LIVE_ENV).x402Relay;
  const state = createX402LiveChallengeSessionState();
  return executePublicLiveX402ChallengeRelay(config, REQUEST, {}, state, async () => response);
}

function createCanonicalLiveChallengeBody(endpointPath: string): Record<string, unknown> {
  const resource = {
    url: endpointPath,
    description: "Synthetic route description",
    mimeType: "application/json",
    serviceName: "Synthetic Stock Trends API",
    tags: [] as string[],
    iconUrl: ""
  };
  const asset = `0x${"a".repeat(40)}`;
  const payTo = `0x${"b".repeat(40)}`;
  const requirements = {
    x402Version: 2,
    resource,
    accepts: [
      {
        scheme: "exact",
        network: "eip155:8453",
        amount: "1250000",
        asset,
        payTo,
        maxTimeoutSeconds: 300,
        extra: {
          name: "Synthetic USDC",
          version: "2",
          assetTransferMethod: "eip3009",
          resource: cloneJson(resource)
        }
      }
    ],
    extensions: createCompactBazaarExtension()
  };
  return {
    error: "payment_required",
    detail: "Payment is required to access this endpoint.",
    protocol: "x402",
    resource: endpointPath,
    pricing: {
      amount_usd: "1.250000",
      unit: "request",
      network: "eip155:8453",
      token: asset,
      scheme: "exact"
    },
    accepted_payment_methods: ["x402"],
    payment_required: requirements
  };
}

function createCompactBazaarExtension(): Record<string, unknown> {
  const inputSchema = {
    type: "object",
    properties: {
      synthetic_symbol: {
        type: "string",
        pattern: "^[A-Z]{1,8}-[A-Z]$"
      }
    },
    required: ["synthetic_symbol"],
    additionalProperties: false
  };
  const outputSchema = {
    type: "object",
    description: "Synthetic JSON market-context response.",
    properties: {
      type: { type: "string", const: "json" },
      format: { type: "string" },
      example: {}
    },
    required: ["type"],
    additionalProperties: true
  };

  return {
    bazaar: {
      info: {
        title: "Synthetic Market Context",
        description: "Synthetic discovery description for a mocked challenge fixture.",
        category: "synthetic-market",
        family: "synthetic-discovery-family",
        tools_manifest: "https://synthetic.invalid/tools.json",
        metadataUrl: "https://synthetic.invalid/ai-context.json",
        schemaUrl: "https://synthetic.invalid/tools.json",
        pricing_catalog: "https://synthetic.invalid/pricing.json",
        input: {
          type: "http",
          method: "GET",
          queryParams: { synthetic_symbol: "SYNTH-N" }
        },
        output: {
          type: "json",
          format: "application/json",
          example: { request_id: "req_synthetic_compact" }
        },
        role: "synthetic-context-reader"
      },
      schema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        properties: {
          input: {
            type: "object",
            properties: {
              type: { type: "string", const: "http" },
              method: { type: "string", enum: ["GET"] },
              queryParams: inputSchema
            },
            required: ["type", "method"],
            additionalProperties: false
          },
          output: outputSchema,
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string" },
          family: { type: "string" },
          tools_manifest: { type: "string" },
          metadataUrl: { type: "string" },
          schemaUrl: { type: "string" },
          pricing_catalog: { type: "string" }
        },
        required: ["input"],
        additionalProperties: true
      }
    }
  };
}

function createRepresentativeRichBazaarExtension(): Record<string, unknown> {
  const safeExample = {
    method: "GET",
    path: "/v1/synthetic/discovery/example",
    query: { synthetic_limit: 3 }
  };
  const inputSchema = {
    type: "object",
    properties: {
      synthetic_limit: {
        type: "integer",
        minimum: 1,
        maximum: 10,
        default: 3,
        example: 3,
        description: "Synthetic bounded discovery input."
      },
      market_context: {
        type: "string",
        enum: ["synthetic-descriptive-only"],
        description: "Describes a market-research API concept without granting execution authority."
      }
    },
    required: [],
    description: "Synthetic query parameters for discovery metadata.",
    additionalProperties: false,
    "x-stocktrends-input-location": "query",
    "x-stocktrends-parameter-source": "query"
  };
  const outputSchema = {
    type: "object",
    description: "Synthetic rich market-context response schema.",
    properties: {
      type: { type: "string", const: "json" },
      description: { type: "string" },
      example: {},
      response_shape: { type: "array", items: { type: "string" } }
    },
    required: ["type", "description", "example"],
    additionalProperties: true
  };

  return {
    bazaar: {
      info: {
        service_name: "Synthetic Discovery Service",
        service_category: "synthetic-market-research",
        title: "Synthetic Rich Market Context",
        description: "Synthetic representative rich Bazaar discovery metadata.",
        analytical_role: "synthetic-context-reader",
        research_goal: "Exercise source-authored rich discovery structure.",
        endpoint_family: "synthetic-discovery-family",
        workflow_context: "Synthetic workflow context.",
        interpretation_dependencies: {
          dependency: {
            endpoint: "/v1/synthetic/interpretation-profile",
            method: "GET",
            reason: "Synthetic prerequisite discovery metadata."
          },
          guidance: "Use only as fixture metadata.",
          required_steps: ["inspect synthetic context", "return no extension values"]
        },
        inference_contract: null,
        inference_provider: null,
        cognition_architecture: "synthetic-none",
        provenance_reference: { source: "synthetic-source-builder-mirror" },
        related_endpoints: ["/v1/synthetic/discovery/related"],
        next_recommended_calls: ["/v1/synthetic/discovery/next"],
        safe_for_autonomous_execution_with_budget_controls: true,
        state_mutation: false,
        market_research_context: true,
        decision_support_context: true,
        not_investment_advice: true,
        not_investment_adviser: true,
        developer_portal: "https://synthetic.invalid/developers",
        ai_context: "https://synthetic.invalid/ai-context.json",
        tools_manifest: "https://synthetic.invalid/tools.json",
        workflows: "https://synthetic.invalid/workflows.json",
        pricing_catalog: "https://synthetic.invalid/pricing.json",
        input: {
          type: "http",
          method: "GET",
          schema: inputSchema,
          parameters: [
            {
              name: "synthetic_limit",
              in: "query",
              input_location: "query",
              parameter_source: "query",
              required: false,
              schema: inputSchema.properties.synthetic_limit,
              description: "Synthetic bounded discovery input.",
              example: 3,
              style: "form",
              explode: true
            }
          ],
          example: safeExample,
          query: inputSchema
        },
        output: {
          type: "json",
          description: "Synthetic rich JSON output metadata.",
          example: { request_id: "req_synthetic_rich", data: { status: "synthetic" } },
          response_shape: ["request_id", "data.status"],
          schema: outputSchema
        },
        examples: [safeExample]
      },
      schema: {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        title: "Synthetic Rich Market Context",
        description: "Synthetic representative direct callable-parameter schema.",
        properties: {
          input: inputSchema,
          output: outputSchema
        },
        required: ["input", "output"]
      }
    }
  };
}

function bazaarRoot(extension: Record<string, unknown>): Record<string, unknown> {
  return extension.bazaar as Record<string, unknown>;
}

function bazaarInfo(extension: Record<string, unknown>): Record<string, unknown> {
  return bazaarRoot(extension).info as Record<string, unknown>;
}

function bazaarSchema(extension: Record<string, unknown>): Record<string, unknown> {
  return bazaarRoot(extension).schema as Record<string, unknown>;
}

function compactBazaarInfo(body: Record<string, unknown>): Record<string, unknown> {
  const extensions = paymentRequirements(body).extensions as Record<string, unknown>;
  return bazaarInfo(extensions);
}

function paymentRequirements(body: Record<string, unknown>): Record<string, unknown> {
  return body.payment_required as Record<string, unknown>;
}

function resourceInfo(body: Record<string, unknown>): Record<string, unknown> {
  return paymentRequirements(body).resource as Record<string, unknown>;
}

function acceptedRequirement(body: Record<string, unknown>): Record<string, unknown> {
  return (paymentRequirements(body).accepts as Record<string, unknown>[])[0];
}

function acceptedExtra(body: Record<string, unknown>): Record<string, unknown> {
  return acceptedRequirement(body).extra as Record<string, unknown>;
}

function pricing(body: Record<string, unknown>): Record<string, unknown> {
  return body.pricing as Record<string, unknown>;
}

function setAllResourceUrls(body: Record<string, unknown>, resourceUrl: string): void {
  body.resource = resourceUrl;
  resourceInfo(body).url = resourceUrl;
  (acceptedExtra(body).resource as Record<string, unknown>).url = resourceUrl;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64");
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function extensionNesting(depth: number): Record<string, unknown> {
  let value: Record<string, unknown> = { leaf: "synthetic" };
  for (let index = 0; index < depth; index += 1) {
    value = { nested: value };
  }
  return value;
}

function aggregateSiblingArrays(siblingCount: number, arrayLength: number): Record<string, unknown> {
  return Object.fromEntries(
    Array.from({ length: siblingCount }, (_, sibling) => [
      `synthetic_array_${sibling}`,
      Array.from({ length: arrayLength }, (_, index) => index)
    ])
  );
}

function aggregateSiblingObjects(siblingCount: number, memberCount: number): Record<string, unknown> {
  return Object.fromEntries(
    Array.from({ length: siblingCount }, (_, sibling) => [
      `synthetic_object_${sibling}`,
      Object.fromEntries(
        Array.from({ length: memberCount }, (_, index) => [`synthetic_member_${index}`, index])
      )
    ])
  );
}

function countAggregateMembers(value: unknown): number {
  let total = 0;
  const stack = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      total += current.length;
      for (const child of current) stack.push(child);
    } else if (current && typeof current === "object") {
      const entries = Object.entries(current);
      total += entries.length;
      for (const [, child] of entries) stack.push(child);
    }
  }
  return total;
}

type DeepChallengeTarget = "stocktrends_preview" | "unknown_body_field" | "extensions" | "extra";

function nestedObject(depth: number, sentinel: string): Record<string, unknown> {
  let value: unknown = sentinel;
  for (let index = 0; index < depth; index += 1) {
    value = { n: value };
  }
  return value as Record<string, unknown>;
}

function setDeepChallengeValue(
  body: Record<string, unknown>,
  target: DeepChallengeTarget,
  value: unknown
): void {
  if (target === "stocktrends_preview") {
    body.stocktrends_preview = { synthetic_nested: value };
  } else if (target === "unknown_body_field") {
    body.synthetic_unknown = { synthetic_nested: value };
  } else if (target === "extensions") {
    paymentRequirements(body).extensions = { synthetic_nested: value };
  } else {
    acceptedExtra(body).synthetic_nested = value;
  }
}

function deepChallengeHttpResponse(target: DeepChallengeTarget, sentinel: string): Response {
  const placeholder = "synthetic-deep-placeholder";
  const body = createCanonicalLiveChallengeBody(REQUEST.endpointPath);
  setDeepChallengeValue(body, target, placeholder);
  const paymentRequiredHeader = encodeJson(paymentRequirements(body));
  const deepJson = `${'{"n":'.repeat(5_000)}${JSON.stringify(sentinel)}${"}".repeat(5_000)}`;
  const rawBody = JSON.stringify(body).replace(JSON.stringify(placeholder), deepJson);
  if (Buffer.byteLength(rawBody) > MAX_X402_CHALLENGE_RESPONSE_BYTES) {
    throw new Error("synthetic deep challenge must remain under the transport body cap");
  }
  return new Response(rawBody, {
    status: 402,
    headers: {
      "content-type": "application/json",
      "payment-required": paymentRequiredHeader
    }
  });
}

async function fetchDirectNoKeyChallenge(fetchFn: FetchLike) {
  const client = new StockTrendsClient(parseConfig(X402_LIVE_ENV), fetchFn);
  return client.fetchNoKeyX402Challenge({
    endpointPath: REQUEST.endpointPath,
    toolName: REQUEST.toolName,
    searchParams: new URLSearchParams(),
    approvedHeaderNames: X402_CHALLENGE_HEADER_NAMES
  });
}

interface StreamingResponseMetrics {
  pulls: number;
  cancelled: boolean;
  totalChunks: number;
}

function streamingJsonResponse(
  chunks: readonly string[],
  declaredLength?: string,
  extraHeaders: Record<string, string> = {}
): { response: Response; metrics: StreamingResponseMetrics } {
  const encoder = new TextEncoder();
  const metrics: StreamingResponseMetrics = {
    pulls: 0,
    cancelled: false,
    totalChunks: chunks.length
  };
  let index = 0;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        if (index >= chunks.length) {
          controller.close();
          return;
        }

        metrics.pulls += 1;
        controller.enqueue(encoder.encode(chunks[index]));
        index += 1;
      },
      cancel() {
        metrics.cancelled = true;
      }
    },
    { highWaterMark: 0 }
  );
  const headers = new Headers({
    "content-type": "application/json",
    ...extraHeaders
  });
  if (declaredLength !== undefined) {
    headers.set("content-length", declaredLength);
  }

  return {
    response: new Response(stream, { status: 402, headers }),
    metrics
  };
}

function oversizedStreamingJsonResponse(
  marker?: string,
  declaredLength?: string,
  extraHeaders: Record<string, string> = {}
): { response: Response; metrics: StreamingResponseMetrics } {
  const payloadChunks = Array.from({ length: 40 }, () => "x".repeat(2_048));
  return streamingJsonResponse(
    [`{\"padding\":\"${marker ?? ""}`, ...payloadChunks, "\"}"],
    declaredLength,
    extraHeaders
  );
}

function chunkText(value: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    chunks.push(value.slice(offset, offset + chunkSize));
  }
  return chunks;
}

function exactSizeJsonObject(byteLength: number): string {
  const prefix = "{\"padding\":\"";
  const suffix = "\"}";
  const paddingLength = byteLength - prefix.length - suffix.length;
  if (paddingLength < 0) {
    throw new Error("requested JSON size is too small");
  }

  return `${prefix}${"x".repeat(paddingLength)}${suffix}`;
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
