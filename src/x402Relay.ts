import { StockTrendsMcpError } from "./errors.js";
import { AUTH_CAPABLE_PAID_ENDPOINT_POLICIES, type PaidHttpMethod } from "./paidPolicy.js";
import type { JsonObject } from "./stocktrendsClient.js";

export const STOCKTRENDS_ENABLE_X402_RELAY = "STOCKTRENDS_ENABLE_X402_RELAY";
export const STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION = "STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION";
export const STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY = "STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY";
export const STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING = "STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING";

export const X402_LIVE_MAX_CHALLENGES_PER_TOOL = 1;
export const X402_LIVE_MAX_CHALLENGES_PER_SESSION = 3;

export const X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST: readonly string[] = Object.freeze(
  AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.map((policy) => policy.endpointPath)
);

export const X402_CHALLENGE_HEADER_NAMES: readonly string[] = Object.freeze([
  "payment-required",
  "x-request-id",
  "x-stocktrends-payment-required",
  "x-stocktrends-accepted-payment-methods",
  "x-stocktrends-pricing-rule"
]);

export const X402_CHALLENGE_TOP_LEVEL_BODY_KEYS: readonly string[] = Object.freeze([
  "accepted_payment_methods",
  "detail",
  "error",
  "payment_required",
  "pricing",
  "protocol",
  "resource",
  "stocktrends_preview"
]);

export const X402_CHALLENGE_FIELD_CATEGORIES: readonly string[] = Object.freeze([
  "amount",
  "asset",
  "network",
  "recipient_or_address",
  "expiry_or_expires_at",
  "correlation_or_challenge_id_or_nonce",
  "accepted_payment_methods",
  "pricing_rule_or_family"
]);

export type X402RelayMode =
  | "disabled"
  | "relay_enabled_challenge_disabled"
  | "mock_challenge_enabled"
  | "live_challenge_enabled";

export interface X402RelayConfig {
  relayEnabled: boolean;
  challengeExecutionEnabled: boolean;
  liveChallengeEnabled: boolean;
  proofForwardingEnabled: false;
  mockOnly: boolean;
  mode: X402RelayMode;
}

export type X402RelayErrorCode =
  | "x402_relay_disabled"
  | "x402_payment_required"
  | "x402_challenge_unavailable"
  | "x402_challenge_unexpected_shape"
  | "x402_symbol_exchange_required"
  | "x402_repeated_challenge_call"
  | "x402_proof_forwarding_not_enabled"
  | "x402_proof_invalid_shape"
  | "x402_route_not_allowlisted"
  | "x402_mixed_mode_invalid"
  | "x402_paid_output_without_proof"
  | "x402_secret_safety_violation"
  | "x402_live_challenge_disabled"
  | "x402_live_challenge_not_enabled"
  | "x402_live_challenge_cap_exceeded"
  | "x402_live_challenge_repeated_call"
  | "x402_live_challenge_unexpected_status"
  | "x402_live_challenge_unexpected_shape"
  | "x402_live_challenge_value_not_approved"
  | "x402_live_challenge_paid_output_without_proof";

export interface X402MockChallengeFixture {
  status: number;
  headers: Record<string, string | undefined>;
  body: JsonObject;
}

export interface X402ChallengeRelayRequest {
  toolName: string;
  endpointPath: string;
  httpMethod?: PaidHttpMethod;
  proof?: unknown;
  paymentProof?: unknown;
  paymentEnvelope?: unknown;
  x402Proof?: unknown;
}

export interface X402ChallengeRelayMetadata {
  tool_name: string;
  endpoint_path: string;
  http_method: PaidHttpMethod;
  relay_mode: X402RelayMode;
  mock_only: true;
  public_tool_wiring: "not_exposed" | "existing_paid_semantic_tools";
  paid_execution_occurred: false;
  api_request_sent: false;
  auth_header_sent: false;
  payment_header_sent: false;
  proof_forwarded: false;
  spend_occurred: false;
  paid_api_data_returned: false;
  automatic_paid_retries: false;
  repeated_identical_policy:
    | "deferred_until_public_tool_wiring_no_fetch_or_spend"
    | "same_session_normalized_signature_denied";
}

export interface X402RelayBuildOptions {
  publicToolWiring?: X402ChallengeRelayMetadata["public_tool_wiring"];
  repeatedIdenticalPolicy?: X402ChallengeRelayMetadata["repeated_identical_policy"];
}

export interface X402PaymentRequiredResult {
  status: "payment_required";
  error_code: "x402_payment_required";
  api_status: 402;
  tool_name: string;
  endpoint_path: string;
  method: PaidHttpMethod;
  http_method: PaidHttpMethod;
  challenge: {
    header_names_present: string[];
    top_level_body_keys_present: string[];
    field_categories_present: string[];
    safe_values: {
      payment_required: true;
      protocol: "<redacted-protocol>";
      resource: string;
      pricing: "<redacted-pricing>";
      accepted_payment_methods: "<redacted-accepted-payment-methods>";
      stocktrends_preview: "<redacted-stocktrends-preview>";
    };
  };
  mcp_metadata: X402ChallengeRelayMetadata;
  paid_execution_authorized: false;
  paid_execution_occurred: false;
  api_request_sent: false;
  auth_header_sent: false;
  payment_header_sent: false;
  proof_forwarded: false;
  spend_occurred: false;
  paid_api_data_returned: false;
  automatic_paid_retries: false;
}

export interface X402RelayErrorResult {
  status: "error";
  error: {
    error_code: Exclude<X402RelayErrorCode, "x402_payment_required">;
    message: string;
    tool_name: string;
    endpoint_path: string;
    http_method: PaidHttpMethod;
    denial_reason: Exclude<X402RelayErrorCode, "x402_payment_required">;
  };
  mcp_metadata: X402ChallengeRelayMetadata;
  paid_execution_authorized: false;
  paid_execution_occurred: false;
  api_request_sent: false;
  auth_header_sent: false;
  payment_header_sent: false;
  proof_forwarded: false;
  spend_occurred: false;
  paid_api_data_returned: false;
  automatic_paid_retries: false;
}

export type X402ChallengeRelayResult = X402PaymentRequiredResult | X402RelayErrorResult;

export interface X402ChallengeSessionState {
  inFlightSignatures: Set<string>;
  completedSignatures: Set<string>;
}

export interface X402LiveChallengeSessionState {
  reservedSignatures: Set<string>;
  reservedByTool: Map<string, number>;
  totalReserved: number;
}

export interface X402LiveChallengeResponse {
  status: number;
  approvedHeaderNamesPresent: string[];
  body: JsonObject | null;
}

export interface X402LiveChallengeRelayMetadata {
  tool_name: string;
  endpoint_path: string;
  http_method: "GET";
  relay_mode: "live_challenge_enabled";
  mock_only: false;
  challenge_source: "api_no_key_live";
  public_tool_wiring: "existing_paid_semantic_tools";
  paid_execution_occurred: false;
  api_request_sent: boolean;
  auth_header_sent: false;
  payment_header_sent: false;
  proof_forwarded: false;
  spend_occurred: false;
  paid_api_data_returned: false;
  automatic_paid_retries: false;
  repeated_identical_policy: "same_session_reserved_signature_denied";
  live_challenge_limits: {
    per_tool: typeof X402_LIVE_MAX_CHALLENGES_PER_TOOL;
    per_session: typeof X402_LIVE_MAX_CHALLENGES_PER_SESSION;
    reserved_for_tool: number;
    reserved_for_session: number;
  };
}

export interface X402LivePaymentRequiredResult {
  status: "payment_required";
  error_code: "x402_payment_required";
  api_status: 402;
  tool_name: string;
  endpoint_path: string;
  method: "GET";
  http_method: "GET";
  challenge_source: "api_no_key_live";
  challenge: {
    header_names_present: string[];
    top_level_body_keys_present: string[];
    field_categories_present: string[];
    conditional_values_relayed: false;
    x_request_id_value_relayed: false;
  };
  mcp_metadata: X402LiveChallengeRelayMetadata;
  paid_execution_authorized: false;
  paid_execution_occurred: false;
  api_request_sent: true;
  auth_header_sent: false;
  payment_header_sent: false;
  proof_forwarded: false;
  spend_occurred: false;
  paid_api_data_returned: false;
  automatic_paid_retries: false;
}

export interface X402LiveRelayErrorResult {
  status: "error";
  api_status: number | null;
  error: {
    error_code: Exclude<X402RelayErrorCode, "x402_payment_required">;
    message: string;
    tool_name: string;
    endpoint_path: string;
    http_method: "GET";
    denial_reason: Exclude<X402RelayErrorCode, "x402_payment_required">;
  };
  mcp_metadata: X402LiveChallengeRelayMetadata;
  paid_execution_authorized: false;
  paid_execution_occurred: false;
  api_request_sent: boolean;
  auth_header_sent: false;
  payment_header_sent: false;
  proof_forwarded: false;
  spend_occurred: false;
  paid_api_data_returned: false;
  automatic_paid_retries: false;
}

export type X402LiveChallengeRelayResult = X402LivePaymentRequiredResult | X402LiveRelayErrorResult;

export function createX402ChallengeSessionState(): X402ChallengeSessionState {
  return {
    inFlightSignatures: new Set<string>(),
    completedSignatures: new Set<string>()
  };
}

export function createX402LiveChallengeSessionState(): X402LiveChallengeSessionState {
  return {
    reservedSignatures: new Set<string>(),
    reservedByTool: new Map<string, number>(),
    totalReserved: 0
  };
}

export function parseX402RelayConfig(
  env: Record<string, string | undefined>,
  options: { paidToolsRequested: boolean }
): X402RelayConfig {
  const relayEnabled = parseX402StrictBooleanFlag(env[STOCKTRENDS_ENABLE_X402_RELAY], STOCKTRENDS_ENABLE_X402_RELAY);
  const challengeExecutionEnabled = parseX402StrictBooleanFlag(
    env[STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION],
    STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION
  );
  const liveChallengeEnabled = parseX402StrictBooleanFlag(
    env[STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY],
    STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY
  );
  parseX402ProofForwardingFlag(env[STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING]);

  if ((relayEnabled || challengeExecutionEnabled || liveChallengeEnabled) && options.paidToolsRequested) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "x402 relay flags cannot be combined with STOCKTRENDS_ENABLE_PAID_TOOLS.",
      denialReason: "x402_mixed_mode_invalid"
    });
  }

  if (liveChallengeEnabled && (!relayEnabled || !challengeExecutionEnabled)) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: `${STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY}=true requires both ${STOCKTRENDS_ENABLE_X402_RELAY}=true and ${STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION}=true.`,
      denialReason: "x402_live_challenge_not_enabled"
    });
  }

  if (challengeExecutionEnabled && !relayEnabled) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: `${STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION}=true requires ${STOCKTRENDS_ENABLE_X402_RELAY}=true.`,
      denialReason: "x402_relay_disabled"
    });
  }

  return Object.freeze({
    relayEnabled,
    challengeExecutionEnabled,
    liveChallengeEnabled,
    proofForwardingEnabled: false,
    mockOnly: !liveChallengeEnabled,
    mode: liveChallengeEnabled
      ? "live_challenge_enabled"
      : challengeExecutionEnabled
        ? "mock_challenge_enabled"
        : relayEnabled
          ? "relay_enabled_challenge_disabled"
          : "disabled"
  });
}

export function createMockX402ChallengeFixture(endpointPath: string): X402MockChallengeFixture {
  return {
    status: 402,
    headers: {
      "payment-required": "<redacted-payment-required>",
      "x-request-id": "<redacted-request-id>",
      "x-stocktrends-payment-required": "<redacted-payment-required>",
      "x-stocktrends-accepted-payment-methods": "<redacted-accepted-payment-methods>",
      "x-stocktrends-pricing-rule": "<redacted-pricing-rule>"
    },
    body: {
      accepted_payment_methods: [
        {
          network: "<redacted-network>",
          asset: "<redacted-asset>",
          amount: "<redacted-amount>",
          recipient: "<redacted-recipient>"
        }
      ],
      detail: "mock payment required",
      error: "payment_required",
      payment_required: true,
      pricing: {
        amount: "<redacted-amount>",
        asset: "<redacted-asset>",
        network: "<redacted-network>",
        recipient: "<redacted-recipient>",
        pricing_rule: "<redacted-pricing-rule>",
        family: "<redacted-pricing-family>"
      },
      protocol: "<redacted-protocol>",
      resource: endpointPath,
      stocktrends_preview: {
        expires_at: "<redacted-expires-at>",
        challenge_id: "<redacted-challenge-id>",
        nonce: "<redacted-nonce>",
        correlation_id: "<redacted-correlation-id>",
        address: "<redacted-recipient>"
      }
    }
  };
}

export function buildMockX402ChallengeRelayResult(
  config: X402RelayConfig,
  request: X402ChallengeRelayRequest,
  fixture: X402MockChallengeFixture = createMockX402ChallengeFixture(request.endpointPath),
  options: X402RelayBuildOptions = {}
): X402ChallengeRelayResult {
  const normalizedRequest = normalizeRequest(request);

  if (!config.relayEnabled) {
    return failClosed(config, normalizedRequest, "x402_relay_disabled", options);
  }

  if (!config.challengeExecutionEnabled) {
    return failClosed(config, normalizedRequest, "x402_challenge_unavailable", options);
  }

  if (!isX402RouteAllowlisted(normalizedRequest.endpointPath) || normalizedRequest.httpMethod !== "GET") {
    return failClosed(config, normalizedRequest, "x402_route_not_allowlisted", options);
  }

  if (hasProofLikeInput(request)) {
    return failClosed(config, normalizedRequest, "x402_proof_forwarding_not_enabled", options);
  }

  if (hasForbiddenProofMaterial(fixture)) {
    return failClosed(config, normalizedRequest, "x402_secret_safety_violation", options);
  }

  if (fixture.status >= 200 && fixture.status < 300) {
    return failClosed(config, normalizedRequest, "x402_paid_output_without_proof", options);
  }

  if (fixture.status !== 402) {
    return failClosed(config, normalizedRequest, "x402_challenge_unavailable", options);
  }

  if (hasPaidOutputWithoutProof(fixture.body)) {
    return failClosed(config, normalizedRequest, "x402_paid_output_without_proof", options);
  }

  const shape = normalizeChallengeShape(fixture);
  if (!shape.ok) {
    return failClosed(config, normalizedRequest, "x402_challenge_unexpected_shape", options);
  }

  return {
    status: "payment_required",
    error_code: "x402_payment_required",
    api_status: 402,
    tool_name: normalizedRequest.toolName,
    endpoint_path: normalizedRequest.endpointPath,
    method: normalizedRequest.httpMethod,
    http_method: normalizedRequest.httpMethod,
    challenge: {
      header_names_present: [...X402_CHALLENGE_HEADER_NAMES],
      top_level_body_keys_present: [...X402_CHALLENGE_TOP_LEVEL_BODY_KEYS],
      field_categories_present: [...X402_CHALLENGE_FIELD_CATEGORIES],
      safe_values: {
        payment_required: true,
        protocol: "<redacted-protocol>",
        resource: normalizedRequest.endpointPath,
        pricing: "<redacted-pricing>",
        accepted_payment_methods: "<redacted-accepted-payment-methods>",
        stocktrends_preview: "<redacted-stocktrends-preview>"
      }
    },
    mcp_metadata: safetyMetadata(config, normalizedRequest, options),
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false,
    automatic_paid_retries: false
  };
}

export function buildPublicMockX402ChallengeRelayResult(
  config: X402RelayConfig,
  request: X402ChallengeRelayRequest,
  toolInput: unknown,
  state: X402ChallengeSessionState
): X402ChallengeRelayResult {
  const normalizedRequest = normalizeRequest(request);
  const options: X402RelayBuildOptions = {
    publicToolWiring: "existing_paid_semantic_tools",
    repeatedIdenticalPolicy: "same_session_normalized_signature_denied"
  };

  if (!config.relayEnabled || !config.challengeExecutionEnabled) {
    return buildMockX402ChallengeRelayResult(
      config,
      request,
      createMockX402ChallengeFixture(request.endpointPath),
      options
    );
  }

  if (!isX402RouteAllowlisted(normalizedRequest.endpointPath) || normalizedRequest.httpMethod !== "GET") {
    return failClosed(config, normalizedRequest, "x402_route_not_allowlisted", options);
  }

  if (containsProofLikeToolInput(toolInput)) {
    return failClosed(config, normalizedRequest, "x402_proof_forwarding_not_enabled", options);
  }

  if (requiresCanonicalSymbolExchange(normalizedRequest.endpointPath) && !hasCanonicalSymbolExchangeOnly(toolInput)) {
    return failClosed(config, normalizedRequest, "x402_symbol_exchange_required", options);
  }

  const signature = buildChallengeSignature(normalizedRequest, toolInput);
  if (state.inFlightSignatures.has(signature) || state.completedSignatures.has(signature)) {
    return failClosed(config, normalizedRequest, "x402_repeated_challenge_call", options);
  }

  state.inFlightSignatures.add(signature);
  const result = buildMockX402ChallengeRelayResult(
    config,
    request,
    createMockX402ChallengeFixture(request.endpointPath),
    options
  );

  state.inFlightSignatures.delete(signature);
  if (result.status === "payment_required") {
    state.completedSignatures.add(signature);
  }

  return result;
}

export async function executePublicLiveX402ChallengeRelay(
  config: X402RelayConfig,
  request: X402ChallengeRelayRequest,
  toolInput: unknown,
  state: X402LiveChallengeSessionState,
  fetchChallenge: () => Promise<X402LiveChallengeResponse>
): Promise<X402LiveChallengeRelayResult> {
  const normalizedRequest = normalizeRequest(request);

  if (!config.liveChallengeEnabled) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_disabled",
      false,
      null
    );
  }

  if (!config.relayEnabled || !config.challengeExecutionEnabled) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_not_enabled",
      false,
      null
    );
  }

  if (!isX402ToolRouteAllowlisted(normalizedRequest)) {
    return failClosedLive(normalizedRequest, state, "x402_route_not_allowlisted", false, null);
  }

  if (hasProofLikeInput(request) || containsProofLikeToolInput(toolInput)) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_proof_forwarding_not_enabled",
      false,
      null
    );
  }

  if (requiresCanonicalSymbolExchange(normalizedRequest.endpointPath) && !hasCanonicalSymbolExchangeOnly(toolInput)) {
    return failClosedLive(normalizedRequest, state, "x402_symbol_exchange_required", false, null);
  }

  const signature = buildChallengeSignature(normalizedRequest, toolInput);
  if (state.reservedSignatures.has(signature)) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_repeated_call",
      false,
      null
    );
  }

  const reservedForTool = state.reservedByTool.get(normalizedRequest.toolName) ?? 0;
  if (
    reservedForTool >= X402_LIVE_MAX_CHALLENGES_PER_TOOL ||
    state.totalReserved >= X402_LIVE_MAX_CHALLENGES_PER_SESSION
  ) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_cap_exceeded",
      false,
      null
    );
  }

  // Reservation is synchronous and precedes the first async boundary. It is
  // intentionally never released, including on network/status/shape failure.
  state.reservedSignatures.add(signature);
  state.reservedByTool.set(normalizedRequest.toolName, reservedForTool + 1);
  state.totalReserved += 1;

  let response: X402LiveChallengeResponse;

  try {
    response = await fetchChallenge();
  } catch {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_unexpected_status",
      true,
      null
    );
  }

  if (
    (response.status >= 200 && response.status < 300) ||
    (response.body !== null && hasLivePaidOutputWithoutProof(response.body))
  ) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_paid_output_without_proof",
      true,
      response.status
    );
  }

  if (response.status !== 402) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_unexpected_status",
      true,
      response.status
    );
  }

  const shapeError = validateLiveChallengeShape(response, normalizedRequest.endpointPath);
  if (shapeError) {
    return failClosedLive(normalizedRequest, state, shapeError, true, response.status);
  }

  return {
    status: "payment_required",
    error_code: "x402_payment_required",
    api_status: 402,
    tool_name: normalizedRequest.toolName,
    endpoint_path: normalizedRequest.endpointPath,
    method: "GET",
    http_method: "GET",
    challenge_source: "api_no_key_live",
    challenge: {
      header_names_present: [...X402_CHALLENGE_HEADER_NAMES],
      top_level_body_keys_present: [...X402_CHALLENGE_TOP_LEVEL_BODY_KEYS],
      field_categories_present: [...X402_CHALLENGE_FIELD_CATEGORIES],
      conditional_values_relayed: false,
      x_request_id_value_relayed: false
    },
    mcp_metadata: liveSafetyMetadata(normalizedRequest, state, true),
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: true,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false,
    automatic_paid_retries: false
  };
}

export function isX402RouteAllowlisted(endpointPath: string): boolean {
  return X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST.includes(endpointPath);
}

export function isX402ToolRouteAllowlisted(request: {
  toolName: string;
  endpointPath: string;
  httpMethod: PaidHttpMethod;
}): boolean {
  return AUTH_CAPABLE_PAID_ENDPOINT_POLICIES.some(
    (policy) =>
      policy.toolName === request.toolName &&
      policy.endpointPath === request.endpointPath &&
      policy.httpMethod === request.httpMethod
  );
}

function parseX402StrictBooleanFlag(value: string | undefined, variableName: string): boolean {
  const raw = value?.trim().toLowerCase();

  if (!raw) {
    return false;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false" || raw === "0" || raw === "no" || raw === "off") {
    return false;
  }

  throw new StockTrendsMcpError("invalid_config", {
    detail: `${variableName} must be true, false, 0, no, or off; only literal true enables x402 relay flags.`
  });
}

function parseX402ProofForwardingFlag(value: string | undefined): void {
  const raw = value?.trim().toLowerCase();

  if (!raw || raw === "false" || raw === "0" || raw === "no" || raw === "off") {
    return;
  }

  if (raw === "true") {
    throw new StockTrendsMcpError("invalid_config", {
      detail: `${STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING}=true is not supported in this build.`,
      denialReason: "x402_proof_forwarding_not_enabled"
    });
  }

  throw new StockTrendsMcpError("invalid_config", {
    detail: `${STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING} must be false, 0, no, or off; proof forwarding is unsupported.`
  });
}

function normalizeRequest(request: X402ChallengeRelayRequest): Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & {
  httpMethod: PaidHttpMethod;
} {
  return {
    toolName: request.toolName,
    endpointPath: request.endpointPath,
    httpMethod: request.httpMethod ?? "GET"
  };
}

function normalizeChallengeShape(fixture: X402MockChallengeFixture): { ok: true } | { ok: false } {
  const headerNames = new Set(Object.keys(fixture.headers).map((name) => name.toLowerCase()));
  const bodyKeys = new Set(Object.keys(fixture.body));
  const fieldCategories = detectFieldCategories(fixture.body);

  if (!hasExactMembers(headerNames, X402_CHALLENGE_HEADER_NAMES)) {
    return { ok: false };
  }

  if (!hasExactMembers(bodyKeys, X402_CHALLENGE_TOP_LEVEL_BODY_KEYS)) {
    return { ok: false };
  }

  if (fieldCategories.unexpected) {
    return { ok: false };
  }

  if (!hasExactMembers(fieldCategories.present, X402_CHALLENGE_FIELD_CATEGORIES)) {
    return { ok: false };
  }

  return { ok: true };
}

type X402LiveShapeError =
  | "x402_live_challenge_unexpected_shape"
  | "x402_live_challenge_value_not_approved";

const X402_LIVE_ACCEPTED_METHOD_FIELDS = new Set([
  "amount",
  "asset",
  "network",
  "recipient",
  "address",
  "expiry",
  "expires_at"
]);
const X402_LIVE_PRICING_FIELDS = new Set([
  "amount",
  "asset",
  "network",
  "recipient",
  "address",
  "pricing_rule",
  "family"
]);
const X402_LIVE_PREVIEW_FIELDS = new Set([
  "expiry",
  "expires_at",
  "challenge_id",
  "correlation_id",
  "nonce",
  "recipient",
  "address"
]);

function validateLiveChallengeShape(
  response: X402LiveChallengeResponse,
  endpointPath: string
): X402LiveShapeError | null {
  if (response.body === null) {
    return "x402_live_challenge_unexpected_shape";
  }

  const headerNames = new Set(response.approvedHeaderNamesPresent.map((name) => name.toLowerCase()));
  if (!hasExactMembers(headerNames, X402_CHALLENGE_HEADER_NAMES)) {
    return "x402_live_challenge_unexpected_shape";
  }

  const bodyKeys = new Set(Object.keys(response.body));
  const unexpectedTopLevelKey = [...bodyKeys].some(
    (key) => !X402_CHALLENGE_TOP_LEVEL_BODY_KEYS.includes(key)
  );
  if (unexpectedTopLevelKey) {
    return "x402_live_challenge_value_not_approved";
  }
  if (!hasExactMembers(bodyKeys, X402_CHALLENGE_TOP_LEVEL_BODY_KEYS)) {
    return "x402_live_challenge_unexpected_shape";
  }

  if (
    response.body.payment_required !== true ||
    !isBoundedString(response.body.detail, 1_024) ||
    !isBoundedString(response.body.error, 256) ||
    !isBoundedString(response.body.protocol, 256) ||
    response.body.resource !== endpointPath ||
    !Array.isArray(response.body.accepted_payment_methods) ||
    response.body.accepted_payment_methods.length === 0 ||
    response.body.accepted_payment_methods.length > 16 ||
    !isRecord(response.body.pricing) ||
    !isRecord(response.body.stocktrends_preview)
  ) {
    return "x402_live_challenge_value_not_approved";
  }

  if (
    !response.body.accepted_payment_methods.every(
      (entry) => isRecord(entry) && hasOnlyBoundedScalarFields(entry, X402_LIVE_ACCEPTED_METHOD_FIELDS)
    ) ||
    !hasOnlyBoundedScalarFields(response.body.pricing, X402_LIVE_PRICING_FIELDS) ||
    !hasOnlyBoundedScalarFields(response.body.stocktrends_preview, X402_LIVE_PREVIEW_FIELDS)
  ) {
    return "x402_live_challenge_value_not_approved";
  }

  if (hasForbiddenLiveResponseMaterial(response.body)) {
    return "x402_live_challenge_value_not_approved";
  }

  const fieldCategories = detectFieldCategories(response.body);
  if (fieldCategories.unexpected) {
    return "x402_live_challenge_value_not_approved";
  }
  if (!hasExactMembers(fieldCategories.present, X402_CHALLENGE_FIELD_CATEGORIES)) {
    return "x402_live_challenge_unexpected_shape";
  }

  return null;
}

function hasOnlyBoundedScalarFields(value: Record<string, unknown>, allowedFields: ReadonlySet<string>): boolean {
  const entries = Object.entries(value);
  return (
    entries.length > 0 &&
    entries.length <= allowedFields.size &&
    entries.every(([key, child]) => allowedFields.has(key) && isBoundedConditionalScalar(child))
  );
}

function isBoundedConditionalScalar(value: unknown): boolean {
  if (typeof value === "string") {
    return value.length > 0 && value.length <= 512;
  }

  return typeof value === "number" ? Number.isFinite(value) : typeof value === "boolean";
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength;
}

function hasLivePaidOutputWithoutProof(body: JsonObject): boolean {
  return collectKeys(body).some((key) =>
    ["api_data", "data", "results", "rows", "records"].includes(key.toLowerCase().replace(/[-\s]/g, "_"))
  );
}

function hasForbiddenLiveResponseMaterial(value: unknown): boolean {
  if (typeof value === "string") {
    if (isRedactedPlaceholder(value.trim())) {
      return false;
    }

    return [
      /\bAuthorization\s*:\s*(Bearer|Basic)\s+[^\s,;]+/i,
      /\b(Bearer|Basic)\s+[^\s,;]+/i,
      /\b(X-API-Key|X_API_KEY|API_KEY|STOCKTRENDS_API_KEY)\s*[:=]\s*[^<\s,;]+/i,
      /\b(PAYMENT-SIGNATURE|PAYMENT_SIGNATURE|PAYMENT-PROOF|PAYMENT_PROOF|PAYMENT-ENVELOPE|PAYMENT_ENVELOPE|X402-PROOF|X402_PROOF|X-PAYMENT|PAYMENT_HEADER)\s*[:=]\s*[^<\s,;]+/i,
      /\b(WALLET_PRIVATE_KEY|WALLET-PRIVATE-KEY|PRIVATE_KEY|PRIVATE-KEY|SEED_PHRASE|SEED-PHRASE)\s*[:=]\s*[^<\s,;]+/i
    ].some((pattern) => pattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenLiveResponseMaterial(item));
  }

  if (isRecord(value)) {
    return Object.entries(value).some(
      ([key, child]) => hasForbiddenProofMaterialKey(key) || hasForbiddenLiveResponseMaterial(child)
    );
  }

  return false;
}

function hasExactMembers(actual: ReadonlySet<string>, expected: readonly string[]): boolean {
  return actual.size === expected.length && expected.every((member) => actual.has(member));
}

function detectFieldCategories(value: unknown): { present: Set<string>; unexpected: boolean } {
  const categories = new Set<string>();
  let unexpected = false;

  for (const key of collectKeys(value)) {
    const normalized = key.toLowerCase().replace(/[-\s]/g, "_");

    if (normalized === "amount") categories.add("amount");
    if (normalized === "asset") categories.add("asset");
    if (normalized === "network") categories.add("network");
    if (normalized === "recipient" || normalized === "address" || normalized.endsWith("_recipient")) categories.add("recipient_or_address");
    if (normalized === "expiry" || normalized === "expires_at" || normalized.endsWith("_expires_at")) categories.add("expiry_or_expires_at");
    if (
      normalized === "nonce" ||
      normalized === "challenge_id" ||
      normalized === "correlation_id" ||
      normalized.includes("challenge") ||
      normalized.includes("correlation")
    ) {
      categories.add("correlation_or_challenge_id_or_nonce");
    }
    if (normalized === "accepted_payment_methods") categories.add("accepted_payment_methods");
    if (normalized === "pricing_rule" || normalized === "family" || normalized.includes("pricing_rule")) {
      categories.add("pricing_rule_or_family");
    }
    if (
      [
        "fee",
        "fees",
        "gas",
        "gas_fee",
        "gas_limit",
        "chain",
        "chain_id",
        "facilitator",
        "settlement",
        "settlement_status",
        "transaction_hash",
        "tx_hash"
      ].includes(normalized)
    ) {
      unexpected = true;
    }
  }

  return { present: categories, unexpected };
}

function collectKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectKeys(item));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, child]) => [key, ...collectKeys(child)]);
  }

  return [];
}

function hasProofLikeInput(request: X402ChallengeRelayRequest): boolean {
  return (
    request.proof !== undefined ||
    request.paymentProof !== undefined ||
    request.paymentEnvelope !== undefined ||
    request.x402Proof !== undefined
  );
}

function hasForbiddenProofMaterial(value: unknown): boolean {
  if (typeof value === "string") {
    return hasForbiddenProofMaterialValue(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasForbiddenProofMaterial(item));
  }

  if (isRecord(value)) {
    return Object.entries(value).some(
      ([key, child]) => hasForbiddenProofMaterialKey(key) || hasForbiddenProofMaterial(child)
    );
  }

  return false;
}

function hasForbiddenProofMaterialKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-\s]/g, "_");
  return [
    "proof",
    "payment_proof",
    "payment_signature",
    "payment_envelope",
    "x402_proof",
    "x_payment",
    "payment_header",
    "authorization",
    "bearer_token",
    "wallet",
    "wallet_private_key",
    "private_key",
    "seed_phrase"
  ].includes(normalized);
}

function hasForbiddenProofMaterialValue(value: string): boolean {
  const trimmed = value.trim();

  if (isRedactedPlaceholder(trimmed)) {
    return false;
  }

  return [
    /^0x[0-9a-fA-F]{40}$/,
    /\bAuthorization\s*:\s*(Bearer|Basic)\s+[^\s,;]+/i,
    /\b(Bearer|Basic)\s+[^\s,;]+/i,
    /\b(X-API-Key|X_API_KEY|API_KEY|STOCKTRENDS_API_KEY)\s*[:=]\s*[^<\s,;]+/i,
    /\b(PAYMENT-SIGNATURE|PAYMENT_SIGNATURE|PAYMENT-PROOF|PAYMENT_PROOF|PAYMENT-ENVELOPE|PAYMENT_ENVELOPE|X402-PROOF|X402_PROOF|X-PAYMENT|PAYMENT_HEADER)\s*[:=]\s*[^<\s,;]+/i,
    /\b(WALLET_ADDRESS|WALLET-ADDRESS|WALLET_PRIVATE_KEY|WALLET-PRIVATE-KEY|PRIVATE_KEY|PRIVATE-KEY|SEED_PHRASE|SEED-PHRASE)\s*[:=]\s*[^<\s,;]+/i,
    /\b(ADDRESS|RECIPIENT)\s*[:=]\s*placeholder-[^\s,;]+/i,
    /\b(payment proof|payment-proof|payment_proof|payment signature|payment-signature|payment_signature|payment header|payment-header|payment_header|x-payment|x_payment|x402 proof|x402-proof|x402_proof)\b/i,
    /\b(wallet address|wallet-address|wallet_address|private key|private-key|private_key|seed phrase|seed-phrase|seed_phrase)\b/i,
    /\bplaceholder-(payment-proof|payment-signature|payment-header|x402-proof|bearer-token|api-key|wallet-address|private-key|seed-phrase|unsafe-recipient|unsafe-address)\b/i
  ].some((pattern) => pattern.test(trimmed));
}

function isRedactedPlaceholder(value: string): boolean {
  return /^<redacted-[a-z0-9-]+>$/.test(value);
}

function hasPaidOutputWithoutProof(body: JsonObject): boolean {
  return body.api_data !== undefined || body.data !== undefined || body.results !== undefined || body.rows !== undefined;
}

function containsProofLikeToolInput(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => containsProofLikeToolInput(item));
  }

  if (!isRecord(value)) {
    return false;
  }

  return Object.entries(value).some(
    ([key, child]) => hasForbiddenProofMaterialKey(key) || containsProofLikeToolInput(child)
  );
}

function requiresCanonicalSymbolExchange(endpointPath: string): boolean {
  return [
    "/v1/stim/latest",
    "/v1/stim/history",
    "/v1/indicators/latest",
    "/v1/indicators/history"
  ].includes(endpointPath);
}

function hasCanonicalSymbolExchangeOnly(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.symbol_exchange === "string" &&
    /^[A-Z0-9][A-Z0-9.-]{0,31}_[NQABTI]$/.test(value.symbol_exchange) &&
    value.symbol === undefined &&
    value.exchange === undefined
  );
}

function buildChallengeSignature(
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod },
  toolInput: unknown
): string {
  return JSON.stringify({
    tool_name: request.toolName,
    endpoint_path: request.endpointPath,
    http_method: request.httpMethod,
    input: normalizeSignatureValue(toolInput)
  });
}

function normalizeSignatureValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSignatureValue(item));
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeSignatureValue(value[key])])
    );
  }

  return value;
}

function failClosedLive(
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod },
  state: X402LiveChallengeSessionState,
  errorCode: Exclude<X402RelayErrorCode, "x402_payment_required">,
  apiRequestSent: boolean,
  apiStatus: number | null
): X402LiveRelayErrorResult {
  return {
    status: "error",
    api_status: apiStatus,
    error: {
      error_code: errorCode,
      message: liveErrorMessage(errorCode),
      tool_name: request.toolName,
      endpoint_path: request.endpointPath,
      http_method: "GET",
      denial_reason: errorCode
    },
    mcp_metadata: liveSafetyMetadata(request, state, apiRequestSent),
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: apiRequestSent,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false,
    automatic_paid_retries: false
  };
}

function liveSafetyMetadata(
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod },
  state: X402LiveChallengeSessionState,
  apiRequestSent: boolean
): X402LiveChallengeRelayMetadata {
  return {
    tool_name: request.toolName,
    endpoint_path: request.endpointPath,
    http_method: "GET",
    relay_mode: "live_challenge_enabled",
    mock_only: false,
    challenge_source: "api_no_key_live",
    public_tool_wiring: "existing_paid_semantic_tools",
    paid_execution_occurred: false,
    api_request_sent: apiRequestSent,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false,
    automatic_paid_retries: false,
    repeated_identical_policy: "same_session_reserved_signature_denied",
    live_challenge_limits: {
      per_tool: X402_LIVE_MAX_CHALLENGES_PER_TOOL,
      per_session: X402_LIVE_MAX_CHALLENGES_PER_SESSION,
      reserved_for_tool: state.reservedByTool.get(request.toolName) ?? 0,
      reserved_for_session: state.totalReserved
    }
  };
}

function liveErrorMessage(errorCode: Exclude<X402RelayErrorCode, "x402_payment_required">): string {
  switch (errorCode) {
    case "x402_symbol_exchange_required":
      return "Live no-key x402 challenge mode requires canonical symbol_exchange input for symbol-dependent tools. No resolver or request was used.";
    case "x402_proof_forwarding_not_enabled":
      return "x402 proof forwarding is not enabled. No proof was stored, forwarded, or sent in a request.";
    case "x402_route_not_allowlisted":
      return "The tool, endpoint, and GET method are not an exact approved x402 live-route binding. No request was sent.";
    case "x402_live_challenge_disabled":
      return "Live no-key x402 challenge relay is disabled. No request was sent.";
    case "x402_live_challenge_not_enabled":
      return "Live no-key x402 challenge relay prerequisites are not enabled. No request was sent.";
    case "x402_live_challenge_cap_exceeded":
      return "The live no-key x402 challenge cap is exhausted for this server session. No request was sent.";
    case "x402_live_challenge_repeated_call":
      return "An identical live no-key x402 challenge signature is already reserved for this server session. No request was sent.";
    case "x402_live_challenge_unexpected_status":
      return "The single live no-key x402 challenge attempt failed or returned an unexpected status. No retry or fallback occurred.";
    case "x402_live_challenge_unexpected_shape":
      return "The API-authored 402 response did not match the approved challenge shape. No challenge values were returned.";
    case "x402_live_challenge_value_not_approved":
      return "The API-authored 402 response contained an unapproved value type, category, or field path. No challenge values were returned.";
    case "x402_live_challenge_paid_output_without_proof":
      return "The no-proof request returned success or paid-data-shaped output. The output was discarded and no retry occurred.";
    default:
      return errorMessage(errorCode);
  }
}

function failClosed(
  config: X402RelayConfig,
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod },
  errorCode: Exclude<X402RelayErrorCode, "x402_payment_required">,
  options: X402RelayBuildOptions = {}
): X402RelayErrorResult {
  return {
    status: "error",
    error: {
      error_code: errorCode,
      message: errorMessage(errorCode),
      tool_name: request.toolName,
      endpoint_path: request.endpointPath,
      http_method: request.httpMethod,
      denial_reason: errorCode
    },
    mcp_metadata: safetyMetadata(config, request, options),
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false,
    automatic_paid_retries: false
  };
}

function safetyMetadata(
  config: X402RelayConfig,
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod },
  options: X402RelayBuildOptions = {}
): X402ChallengeRelayMetadata {
  return {
    tool_name: request.toolName,
    endpoint_path: request.endpointPath,
    http_method: request.httpMethod,
    relay_mode: config.mode,
    mock_only: true,
    public_tool_wiring: options.publicToolWiring ?? "not_exposed",
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false,
    automatic_paid_retries: false,
    repeated_identical_policy:
      options.repeatedIdenticalPolicy ?? "deferred_until_public_tool_wiring_no_fetch_or_spend"
  };
}

function errorMessage(errorCode: Exclude<X402RelayErrorCode, "x402_payment_required">): string {
  switch (errorCode) {
    case "x402_relay_disabled":
      return "x402 relay is disabled. No request, auth header, payment header, proof, payment, or spend occurred.";
    case "x402_challenge_unavailable":
      return "x402 challenge execution is not enabled or the mock challenge is unavailable. No request was sent.";
    case "x402_challenge_unexpected_shape":
      return "The mock x402 challenge did not match the verified PR #64 shape. No proof path is enabled.";
    case "x402_symbol_exchange_required":
      return "Mock x402 challenge mode requires canonical symbol_exchange input for symbol-dependent tools. No resolver or request was used.";
    case "x402_repeated_challenge_call":
      return "An identical mock x402 challenge call already occurred in this server session. No retry, request, payment, or spend occurred.";
    case "x402_proof_forwarding_not_enabled":
      return "x402 proof forwarding is not enabled in this build. No proof was forwarded.";
    case "x402_proof_invalid_shape":
      return "The x402 proof input shape is invalid and proof forwarding is not enabled. No proof was forwarded.";
    case "x402_route_not_allowlisted":
      return "The endpoint is outside the nine-route x402 relay allowlist. No request was sent.";
    case "x402_mixed_mode_invalid":
      return "API-key paid mode and active x402 relay flags cannot be combined.";
    case "x402_paid_output_without_proof":
      return "Paid API data appeared without proof. The result failed closed and no paid data was returned.";
    case "x402_secret_safety_violation":
      return "Proof or payment-like material appeared where only mock challenge shape is allowed. The result failed closed.";
    case "x402_live_challenge_disabled":
      return "Live no-key x402 challenge relay is disabled. No request was sent.";
    case "x402_live_challenge_not_enabled":
      return "Live no-key x402 challenge relay prerequisites are not enabled. No request was sent.";
    case "x402_live_challenge_cap_exceeded":
      return "The live no-key x402 challenge cap is exhausted. No request was sent.";
    case "x402_live_challenge_repeated_call":
      return "An identical live no-key x402 challenge signature is already reserved. No request was sent.";
    case "x402_live_challenge_unexpected_status":
      return "The live no-key x402 challenge attempt returned an unexpected status. No retry occurred.";
    case "x402_live_challenge_unexpected_shape":
      return "The live no-key x402 challenge response had an unexpected shape.";
    case "x402_live_challenge_value_not_approved":
      return "The live no-key x402 challenge response contained an unapproved value category, type, or path.";
    case "x402_live_challenge_paid_output_without_proof":
      return "The no-proof request returned success or paid-data-shaped output, which was discarded.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
