import { StockTrendsMcpError } from "./errors.js";
import { AUTH_CAPABLE_PAID_ENDPOINT_POLICIES, type PaidHttpMethod } from "./paidPolicy.js";
import {
  MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES,
  type JsonObject
} from "./stocktrendsClient.js";

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

export const X402_LIVE_CHALLENGE_TOP_LEVEL_BODY_KEYS: readonly string[] = Object.freeze([
  "accepted_payment_methods",
  "detail",
  "error",
  "payment_required",
  "pricing",
  "protocol",
  "resource"
]);

export const X402_LIVE_CHALLENGE_FIELD_CATEGORIES: readonly string[] = Object.freeze([
  "x402_v2_requirements",
  "resource_info",
  "pricing",
  "accepted_payment_methods",
  "single_accepted_requirement",
  "bounded_extensions"
]);

export const MAX_X402_PAYMENT_REQUIRED_DECODED_BYTES = 32 * 1024;
export const X402_EXTENSION_MAX_DEPTH = 12;
export const X402_EXTENSION_MAX_OBJECT_MEMBERS = 64;
export const X402_EXTENSION_MAX_TOTAL_MEMBERS = 512;
export const X402_EXTENSION_MAX_ARRAY_LENGTH = 64;
export const X402_EXTENSION_MAX_STRING_BYTES = 2 * 1024;
export const X402_EXTENSION_MAX_TOTAL_BYTES = 24 * 1024;

// Current-source rich stocktrends_preview maxima across the exact nine relay
// routes are depth 4, 23 object members, 224 aggregate entries, array length
// 27, 231 string bytes, 31 key bytes, and 7,726 serialized bytes. These
// rounded caps remain deliberately below the broader extension/tree budgets.
export const X402_PREVIEW_MAX_DEPTH = 4;
export const X402_PREVIEW_MAX_OBJECT_MEMBERS = 23;
export const X402_PREVIEW_MAX_TOTAL_MEMBERS = 224;
export const X402_PREVIEW_MAX_ARRAY_LENGTH = 27;
export const X402_PREVIEW_MAX_STRING_BYTES = 256;
export const X402_PREVIEW_MAX_KEY_BYTES = 32;
export const X402_PREVIEW_MAX_TOTAL_BYTES = 8 * 1024;
export const X402_DESCRIPTIVE_PAYMENT_METHODS_MAX_LENGTH = 3;

export const X402_TOOL_INPUT_MAX_DEPTH = 32;
export const X402_TOOL_INPUT_MAX_OBJECT_MEMBERS = 64;
export const X402_TOOL_INPUT_MAX_TOTAL_MEMBERS = 4_096;
export const X402_TOOL_INPUT_MAX_ARRAY_LENGTH = 256;
export const X402_TOOL_INPUT_MAX_STRING_BYTES = 16 * 1024;

const X402_LIVE_RESPONSE_MAX_DEPTH = 32;
const X402_LIVE_RESPONSE_MAX_OBJECT_MEMBERS = 1_024;
const X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS = 8_192;
const X402_LIVE_RESPONSE_MAX_ARRAY_LENGTH = 256;
const X402_LIVE_RESPONSE_MAX_STRING_BYTES = 64 * 1024;

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
  | "x402_tool_input_invalid"
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
  | "x402_live_challenge_header_missing"
  | "x402_live_challenge_header_invalid"
  | "x402_live_challenge_header_shape_not_approved"
  | "x402_live_challenge_header_body_mismatch"
  | "x402_live_challenge_network_unsupported"
  | "x402_live_challenge_prohibited_material"
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
  paymentRequiredHeader: string | null;
  paymentRequiredHeaderState: "missing" | "present" | "oversized";
  apiBaseOrigin: string;
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

  const boundedToolInput = snapshotBoundedToolInput(toolInput);
  if (!boundedToolInput.ok) {
    return failClosed(config, normalizedRequest, "x402_tool_input_invalid", options);
  }

  if (containsProofLikeToolInput(boundedToolInput.value)) {
    return failClosed(config, normalizedRequest, "x402_proof_forwarding_not_enabled", options);
  }

  if (
    requiresCanonicalSymbolExchange(normalizedRequest.endpointPath) &&
    !hasCanonicalSymbolExchangeOnly(boundedToolInput.value)
  ) {
    return failClosed(config, normalizedRequest, "x402_symbol_exchange_required", options);
  }

  const signature = buildChallengeSignature(normalizedRequest, boundedToolInput.value);
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

  const boundedToolInput = snapshotBoundedToolInput(toolInput);
  if (!boundedToolInput.ok) {
    return failClosedLive(normalizedRequest, state, "x402_tool_input_invalid", false, null);
  }

  if (hasProofLikeInput(request) || containsProofLikeToolInput(boundedToolInput.value)) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_proof_forwarding_not_enabled",
      false,
      null
    );
  }

  if (
    requiresCanonicalSymbolExchange(normalizedRequest.endpointPath) &&
    !hasCanonicalSymbolExchangeOnly(boundedToolInput.value)
  ) {
    return failClosedLive(normalizedRequest, state, "x402_symbol_exchange_required", false, null);
  }

  const signature = buildChallengeSignature(normalizedRequest, boundedToolInput.value);
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

  let responseTreeScan: JsonTreeScanResult;
  try {
    responseTreeScan = scanBoundedJsonTree(response.body, normalizedRequest.endpointPath);
  } catch {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_unexpected_shape",
      true,
      response.status
    );
  }

  if (!responseTreeScan.valid) {
    return failClosedLive(
      normalizedRequest,
      state,
      "x402_live_challenge_unexpected_shape",
      true,
      response.status
    );
  }

  if ((response.status >= 200 && response.status < 300) || responseTreeScan.hasPaidOutput) {
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

  let shapeError: X402LiveShapeError | null;
  try {
    shapeError = validateLiveChallengeShape(
      response,
      normalizedRequest.endpointPath,
      responseTreeScan
    );
  } catch {
    shapeError = "x402_live_challenge_unexpected_shape";
  }
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
      header_names_present: approvedLiveHeaderNames(response.approvedHeaderNamesPresent),
      top_level_body_keys_present: approvedLiveTopLevelKeys(response.body),
      field_categories_present: [...X402_LIVE_CHALLENGE_FIELD_CATEGORIES],
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
  | "x402_live_challenge_value_not_approved"
  | "x402_live_challenge_header_missing"
  | "x402_live_challenge_header_invalid"
  | "x402_live_challenge_header_shape_not_approved"
  | "x402_live_challenge_header_body_mismatch"
  | "x402_live_challenge_network_unsupported"
  | "x402_live_challenge_prohibited_material";

const X402_REQUIREMENTS_KEYS = Object.freeze(["x402Version", "resource", "accepts", "extensions"]);
const X402_RESOURCE_INFO_KEYS = Object.freeze([
  "url",
  "description",
  "mimeType",
  "serviceName",
  "tags",
  "iconUrl"
]);
const X402_PRICING_KEYS = Object.freeze(["amount_usd", "unit", "network", "token", "scheme"]);
const X402_ACCEPTED_REQUIREMENT_KEYS = Object.freeze([
  "scheme",
  "network",
  "amount",
  "asset",
  "payTo",
  "maxTimeoutSeconds",
  "extra"
]);
const X402_EXTRA_REQUIRED_KEYS = Object.freeze(["name", "version", "resource"]);
const X402_EXTRA_KNOWN_KEYS = new Set([...X402_EXTRA_REQUIRED_KEYS, "assetTransferMethod"]);
const X402_PROTOTYPE_POLLUTION_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const X402_EXTENSION_SHADOW_KEYS = new Set([
  "route",
  "path",
  "method",
  "url",
  "resource",
  "amount",
  "amountusd",
  "price",
  "pricing",
  "payment",
  "asset",
  "token",
  "decimals",
  "payto",
  "payee",
  "recipient",
  "address",
  "network",
  "chain",
  "chainid",
  "family",
  "scheme",
  "timeout",
  "maxtimeoutseconds",
  "expiry",
  "expiresat",
  "proof",
  "paymentsignature",
  "paymentproof",
  "paymentheader",
  "authorization",
  "facilitator",
  "settlement",
  "metering",
  "transaction",
  "transactionhash",
  "apidata",
  "data",
  "results",
  "rows",
  "records"
]);
const X402_PAID_OUTPUT_SHAPE_KEYS = new Set(["apidata", "data", "results", "rows", "records"]);
const X402_PREVIEW_OUTPUT_SHAPE_KEYS = new Set([
  "exampleobject",
  "history",
  "overallleaders",
  "sectorleaders",
  "industrygroupleaders"
]);
const X402_SOURCE_OUTPUT_CARRIER_KEYS = new Set(["api_data", "data", "results", "rows", "records"]);
const X402_METHOD_AUTHORITY_KEYS = new Set([
  "httpmethod",
  "executionmethod",
  "methodauthority",
  "methodoverride",
  "httpmethodauthority",
  "httpmethodoverride",
  "executionmethodauthority",
  "executionmethodoverride",
  "methodauthorityoverride",
  "httpmethodauthorityoverride",
  "executionmethodauthorityoverride"
]);
const X402_PROTECTED_AUTHORITY_TOKEN_SEQUENCES = Object.freeze([
  ["route"],
  ["path"],
  ["method"],
  ["http", "method"],
  ["execution", "method"],
  ["amount"],
  ["price"],
  ["asset"],
  ["token"],
  ["payee"],
  ["recipient"],
  ["address"],
  ["pay", "to"],
  ["payto"],
  ["network"],
  ["chain"],
  ["scheme"],
  ["timeout"],
  ["expiry"],
  ["payment"],
  ["proof"],
  ["authorization"],
  ["settlement"],
  ["transaction"]
] as const);
const X402_PROTECTED_AUTHORITY_COMPACT_CONCEPTS = new Set(
  X402_PROTECTED_AUTHORITY_TOKEN_SEQUENCES.map((tokens) => tokens.join(""))
);
const X402_PROTECTED_AUTHORITY_COMPACT_ALIASES = new Set(
  [...X402_PROTECTED_AUTHORITY_COMPACT_CONCEPTS].flatMap((concept) => [
    `${concept}authority`,
    `authority${concept}`
  ])
);
const X402_TRANSACTION_STATE_TOKENS = new Set([
  "execution",
  "executed",
  "completion",
  "completed",
  "confirmation",
  "confirmed",
  "hash"
]);
const X402_TRANSACTION_STATE_COMPACT_KEYS = new Set([
  "execution",
  "executionstatus",
  "executionstate",
  "executionresult",
  "executed",
  "completion",
  "completionstatus",
  "completionstate",
  "completionresult",
  "completed",
  "confirmation",
  "confirmationstatus",
  "confirmationstate",
  "confirmationresult",
  "confirmed",
  "hash",
  "hashvalue",
  "paymenthash",
  "transactionhash",
  "txhash"
]);
const X402_SAFE_AUTONOMOUS_EXECUTION_KEY =
  "safe_for_autonomous_execution_with_budget_controls";

const X402_SOURCE_PAYMENT_METHODS = Object.freeze(["subscription", "x402", "mpp"] as const);
const X402_DESCRIPTIVE_PAYMENT_METHODS_BY_ROUTE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  "/v1/stim/latest": X402_SOURCE_PAYMENT_METHODS,
  "/v1/stim/history": X402_SOURCE_PAYMENT_METHODS,
  "/v1/indicators/latest": X402_SOURCE_PAYMENT_METHODS,
  "/v1/indicators/history": X402_SOURCE_PAYMENT_METHODS,
  "/v1/selections/latest": X402_SOURCE_PAYMENT_METHODS,
  "/v1/market/regime/latest": X402_SOURCE_PAYMENT_METHODS,
  "/v1/market/regime/history": X402_SOURCE_PAYMENT_METHODS,
  "/v1/breadth/sector/latest": X402_SOURCE_PAYMENT_METHODS,
  "/v1/leadership/summary/latest": X402_SOURCE_PAYMENT_METHODS
});

type PreviewScalarType = "string" | "number" | "integer" | "boolean";
type PreviewRouteFlavor = "stim" | "selection" | "market" | "provenance";

interface PreviewRouteContract {
  category: string;
  pricingRuleId: string;
  analyticalRole: string;
  flavor: PreviewRouteFlavor;
  requiredInputs: readonly string[];
  optionalInputs: readonly string[];
  safeQuery: Readonly<Record<string, PreviewScalarType>>;
  responseShape: readonly string[];
  exampleObject: Readonly<Record<string, unknown>>;
  notesLength: number;
  relatedEndpoints: readonly string[];
  nextRecommendedCalls: readonly string[];
}

const X402_PREVIEW_ROUTE_CONTRACTS: Readonly<Record<string, PreviewRouteContract>> = Object.freeze({
  "/v1/stim/latest": {
    category: "stim",
    pricingRuleId: "stim_latest_paid",
    analyticalRole: "probabilistic_forward_inference",
    flavor: "stim",
    requiredInputs: ["symbol_exchange"],
    optionalInputs: ["symbol", "exchange"],
    safeQuery: { symbol_exchange: "string" },
    responseShape: [
      "request_id", "symbol_exchange", "weekdate", "exchange", "symbol",
      "x4wk1", "x4wk2", "x4wk", "x4wksd", "x13wk1", "x13wk2", "x13wk",
      "x13wksd", "x40wk1", "x40wk2", "x40wk", "x40wksd",
      "latest_data_weekdate", "is_stale", "missing_reason", "missing_weekdate"
    ],
    exampleObject: {
      request_id: "req_demo",
      symbol_exchange: "SAMPLE-N",
      weekdate: "YYYY-MM-DD",
      x13wk: 0,
      x13wksd: 1
    },
    notesLength: 5,
    relatedEndpoints: [
      "/v1/meta/inference", "/v1/meta/stim", "/v1/indicators/latest",
      "/v1/stim/history", "/v1/selections/published/latest"
    ],
    nextRecommendedCalls: [
      "/v1/meta/inference", "/v1/meta/stim", "/v1/decision/evaluate-symbol",
      "/v1/portfolio/construct"
    ]
  },
  "/v1/stim/history": {
    category: "stim",
    pricingRuleId: "stim_history_paid",
    analyticalRole: "probabilistic_forward_inference",
    flavor: "stim",
    requiredInputs: ["symbol_exchange"],
    optionalInputs: ["symbol", "exchange", "start", "end", "limit", "include_gaps"],
    safeQuery: { symbol_exchange: "string", limit: "integer" },
    responseShape: [
      "request_id", "symbol_exchange", "start", "end", "count", "data",
      "include_gaps", "gaps"
    ],
    exampleObject: {
      request_id: "req_demo",
      symbol_exchange: "SAMPLE-N",
      count: 1,
      data: [{ weekdate: "YYYY-MM-DD", x13wk: 0, x13wksd: 1 }]
    },
    notesLength: 4,
    relatedEndpoints: [
      "/v1/meta/inference", "/v1/meta/stim", "/v1/stim/latest",
      "/v1/indicators/history"
    ],
    nextRecommendedCalls: [
      "/v1/meta/inference", "/v1/meta/stim", "/v1/indicators/history",
      "/v1/decision/evaluate-symbol"
    ]
  },
  "/v1/indicators/latest": {
    category: "indicators",
    pricingRuleId: "indicators_latest_paid",
    analyticalRole: "symbol_signal_intelligence",
    flavor: "provenance",
    requiredInputs: ["symbol_exchange"],
    optionalInputs: ["symbol", "exchange", "cs_only"],
    safeQuery: { symbol_exchange: "string", cs_only: "boolean" },
    responseShape: [
      "request_id", "symbol_exchange", "weekdate", "exchange", "symbol", "type",
      "currency_code", "trend", "trend_cnt", "mt_cnt", "prev_mtcnt", "rsi",
      "rsi_updn", "vol_tag", "rvol", "atv", "fpr_chg1", "fpr_chg2",
      "fpr_chg4", "fpr_chg13", "fpr_chg40", "pr_chg13", "pr_change",
      "shortavg", "longavg", "yr_hi", "yr_lo"
    ],
    exampleObject: {
      request_id: "req_demo",
      symbol_exchange: "SAMPLE-N",
      weekdate: "YYYY-MM-DD",
      trend: "^+",
      trend_cnt: 8,
      mt_cnt: 12,
      rsi: 118,
      rsi_updn: "+",
      vol_tag: "*"
    },
    notesLength: 6,
    relatedEndpoints: ["/v1/indicators/history", "/v1/stim/latest", "/v1/selections/history"],
    nextRecommendedCalls: ["/v1/indicators/history", "/v1/stim/latest"]
  },
  "/v1/indicators/history": {
    category: "indicators",
    pricingRuleId: "indicators_history_paid",
    analyticalRole: "symbol_signal_intelligence",
    flavor: "provenance",
    requiredInputs: ["symbol_exchange"],
    optionalInputs: ["symbol", "exchange", "cs_only", "start", "end", "limit"],
    safeQuery: { symbol_exchange: "string", limit: "integer", cs_only: "boolean" },
    responseShape: [
      "request_id", "symbol_exchange", "cs_only", "start", "end", "count",
      "data[].weekdate", "data[].exchange", "data[].symbol", "data[].symbol_exchange",
      "data[].trend", "data[].trend_cnt", "data[].mt_cnt", "data[].rsi",
      "data[].rsi_updn", "data[].vol_tag", "data[].pr_change"
    ],
    exampleObject: {
      request_id: "req_demo",
      symbol_exchange: "SAMPLE-N",
      count: 1,
      data: [{
        weekdate: "YYYY-MM-DD",
        symbol_exchange: "SAMPLE-N",
        trend: "^-",
        trend_cnt: 4,
        mt_cnt: 11,
        rsi: 104,
        rsi_updn: "-",
        vol_tag: ""
      }]
    },
    notesLength: 4,
    relatedEndpoints: ["/v1/indicators/latest", "/v1/stim/history", "/v1/prices/history"],
    nextRecommendedCalls: ["/v1/stim/history", "/v1/decision/evaluate-symbol"]
  },
  "/v1/selections/latest": {
    category: "selections",
    pricingRuleId: "selections_latest_paid",
    analyticalRole: "probabilistic_selection_universe",
    flavor: "selection",
    requiredInputs: [],
    optionalInputs: ["exchange", "min_prob13wk", "limit", "include_data", "include_mast", "cs_only"],
    safeQuery: { limit: "integer", include_data: "boolean" },
    responseShape: [
      "request_id", "weekdate", "exchange", "min_prob13wk", "include_data",
      "include_mast", "cs_only", "count", "data[].weekdate", "data[].exchange",
      "data[].symbol", "data[].prob13wk", "data[].symbol_exchange"
    ],
    exampleObject: {
      request_id: "req_demo",
      weekdate: "YYYY-MM-DD",
      count: 1,
      data: [{ symbol_exchange: "SAMPLE-N", prob13wk: 0 }]
    },
    notesLength: 2,
    relatedEndpoints: ["/v1/selections/published/latest", "/v1/selections/history"],
    nextRecommendedCalls: ["/v1/selections/published/latest", "/v1/indicators/latest"]
  },
  "/v1/market/regime/latest": {
    category: "market",
    pricingRuleId: "market_regime_latest",
    analyticalRole: "market_regime_classifier",
    flavor: "market",
    requiredInputs: [],
    optionalInputs: [],
    safeQuery: {},
    responseShape: [
      "regime", "confidence", "regime_score", "bullish_pct", "bearish_pct",
      "avg_rsi", "avg_mt_cnt", "weekdate", "signal_count"
    ],
    exampleObject: {
      regime: "mixed",
      confidence: 0,
      regime_score: 0,
      weekdate: "YYYY-MM-DD"
    },
    notesLength: 1,
    relatedEndpoints: ["/v1/market/regime/history", "/v1/market/regime/forecast"],
    nextRecommendedCalls: ["/v1/market/regime/forecast", "/v1/decision/evaluate-symbol"]
  },
  "/v1/market/regime/history": {
    category: "market",
    pricingRuleId: "market_regime_history",
    analyticalRole: "market_regime_classifier",
    flavor: "market",
    requiredInputs: [],
    optionalInputs: ["limit", "start"],
    safeQuery: { limit: "integer" },
    responseShape: [
      "history[].weekdate", "history[].regime", "history[].confidence",
      "history[].regime_score", "history[].bullish_pct", "history[].bearish_pct",
      "history[].avg_rsi", "history[].avg_mt_cnt", "history[].signal_count",
      "count", "limit", "start_date"
    ],
    exampleObject: {
      history: [{ weekdate: "YYYY-MM-DD", regime: "mixed", regime_score: 0 }],
      count: 1
    },
    notesLength: 1,
    relatedEndpoints: ["/v1/market/regime/latest", "/v1/market/regime/forecast"],
    nextRecommendedCalls: ["/v1/market/regime/forecast"]
  },
  "/v1/breadth/sector/latest": {
    category: "breadth",
    pricingRuleId: "breadth_sector_latest_paid",
    analyticalRole: "market_breadth_context",
    flavor: "provenance",
    requiredInputs: [],
    optionalInputs: [
      "group_level", "exchange", "weekdate", "cs_only", "include_unknown",
      "min_price", "min_volume", "vol_scale", "limit"
    ],
    safeQuery: { group_level: "string", limit: "integer" },
    responseShape: [
      "request_id", "group_level", "exchange", "weekdate", "cs_only",
      "include_unknown", "count", "data[].sector_code", "data[].sector_name",
      "data[].industry_group_code", "data[].industry_group_name",
      "data[].industry_code", "data[].industry_name", "data[].bullish_count",
      "data[].bearish_count", "data[].bullish_pct", "data[].bearish_pct",
      "data[].avg_rsi", "data[].avg_mt_cnt", "data[].net_breadth"
    ],
    exampleObject: {
      request_id: "req_demo",
      group_level: "sector",
      weekdate: "YYYY-MM-DD",
      count: 1,
      data: [{
        sector_code: "SAMPLE",
        sector_name: "Sample Sector",
        bullish_count: 0,
        bearish_count: 0,
        bullish_pct: 0,
        bearish_pct: 0,
        avg_rsi: 100,
        net_breadth: 0
      }]
    },
    notesLength: 1,
    relatedEndpoints: ["/v1/breadth/sector/history", "/v1/market/regime/latest"],
    nextRecommendedCalls: ["/v1/market/regime/latest", "/v1/leadership/summary/latest"]
  },
  "/v1/leadership/summary/latest": {
    category: "leadership",
    pricingRuleId: "leadership_summary_latest_paid",
    analyticalRole: "leadership_intelligence",
    flavor: "provenance",
    requiredInputs: [],
    optionalInputs: [
      "exchange", "weekdate", "type", "min_rsi", "min_mt_cnt",
      "limit_overall", "limit_bucket"
    ],
    safeQuery: { exchange: "string", type: "string", min_rsi: "integer", min_mt_cnt: "integer" },
    responseShape: [
      "request_id", "weekdate", "exchange", "filters.type", "filters.min_rsi",
      "filters.min_mt_cnt", "overall_leaders[].symbol", "overall_leaders[].exchange",
      "overall_leaders[].rsi", "overall_leaders[].mt_cnt", "overall_leaders[].trend",
      "overall_leaders[].trend_cnt", "overall_leaders[].rsi_updn",
      "overall_leaders[].sector_name", "overall_leaders[].industry_group_name",
      "sector_leaders[].symbol", "sector_leaders[].sector_name",
      "industry_group_leaders[].symbol", "industry_group_leaders[].industry_group_name", "note"
    ],
    exampleObject: {
      request_id: "req_demo",
      weekdate: "YYYY-MM-DD",
      exchange: "N",
      filters: { type: "CS", min_rsi: 40, min_mt_cnt: 4 },
      overall_leaders: [{
        symbol: "SAMPLE",
        exchange: "N",
        rsi: 118,
        mt_cnt: 10,
        trend: "^+",
        trend_cnt: 6,
        sector_name: "Sample Sector"
      }],
      sector_leaders: [],
      industry_group_leaders: []
    },
    notesLength: 2,
    relatedEndpoints: [
      "/v1/breadth/sector/latest", "/v1/market/regime/latest",
      "/v1/leadership/rotation/history"
    ],
    nextRecommendedCalls: ["/v1/market/regime/latest", "/v1/indicators/latest"]
  }
});

type JsonPathSegment = string | number;
type ExtensionSemanticContext = "generic" | "bazaar_extensions";
type BazaarOutputCarrierRole =
  | "source_output_example_carrier"
  | "source_output_schema_property"
  | "not_approved";

interface JsonTreeScanResult {
  valid: boolean;
  hasForbiddenMaterial: boolean;
  hasPaidOutput: boolean;
}

type HeaderDecodeResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: "invalid" | "shape" };

type ExtensionValidationResult = "ok" | "invalid" | "prohibited";

function validateLiveChallengeShape(
  response: X402LiveChallengeResponse,
  endpointPath: string,
  responseTreeScan: JsonTreeScanResult
): X402LiveShapeError | null {
  if (response.body === null || !isPlainRecord(response.body)) {
    return "x402_live_challenge_unexpected_shape";
  }

  if (responseTreeScan.hasForbiddenMaterial) {
    return "x402_live_challenge_prohibited_material";
  }

  if (response.paymentRequiredHeaderState === "missing") {
    return "x402_live_challenge_header_missing";
  }

  if (
    response.paymentRequiredHeaderState === "oversized" ||
    response.paymentRequiredHeaderState !== "present" ||
    response.paymentRequiredHeader === null
  ) {
    return "x402_live_challenge_header_invalid";
  }

  const decodedHeader = decodeStandardBase64JsonObject(response.paymentRequiredHeader);
  if (!decodedHeader.ok) {
    return decodedHeader.error === "shape"
      ? "x402_live_challenge_header_shape_not_approved"
      : "x402_live_challenge_header_invalid";
  }

  if (!hasOwn(response.body, "payment_required")) {
    return "x402_live_challenge_unexpected_shape";
  }

  // Identity is checked before any normalization, filtering, or semantic
  // interpretation. Object key order is ignored; array order and every JSON
  // type, key, length, and value remain exact.
  if (!jsonStructuralEqual(decodedHeader.value, response.body.payment_required)) {
    return "x402_live_challenge_header_body_mismatch";
  }

  return validateCanonicalLiveChallenge(
    response.body,
    endpointPath,
    response.apiBaseOrigin
  );
}

function decodeStandardBase64JsonObject(value: string): HeaderDecodeResult {
  if (
    value.length === 0 ||
    value.length > MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES ||
    new TextEncoder().encode(value).byteLength > MAX_X402_PAYMENT_REQUIRED_HEADER_BYTES ||
    value.length % 4 !== 0 ||
    /\s/.test(value) ||
    /[-_]/.test(value) ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    return { ok: false, error: "invalid" };
  }

  let decoded: Uint8Array;
  try {
    decoded = Buffer.from(value, "base64");
  } catch {
    return { ok: false, error: "invalid" };
  }

  if (
    decoded.byteLength > MAX_X402_PAYMENT_REQUIRED_DECODED_BYTES ||
    Buffer.from(decoded).toString("base64") !== value
  ) {
    return { ok: false, error: "invalid" };
  }

  let decodedText: string;
  try {
    decodedText = new TextDecoder("utf-8", { fatal: true }).decode(decoded);
  } catch {
    return { ok: false, error: "invalid" };
  }

  let parsed: unknown;
  try {
    // JSON.parse rejects trailing non-whitespace and therefore accepts exactly
    // one JSON value. It does not expose duplicate-key detection; later exact
    // structural checks still apply to the parser's resulting object.
    parsed = JSON.parse(decodedText);
  } catch {
    return { ok: false, error: "invalid" };
  }

  if (!isPlainRecord(parsed) || !scanBoundedJsonTree(parsed).valid) {
    return { ok: false, error: "shape" };
  }

  return { ok: true, value: parsed };
}

function validateCanonicalLiveChallenge(
  body: Record<string, unknown>,
  endpointPath: string,
  apiBaseOrigin: string
): X402LiveShapeError | null {
  const bodyKeys = Object.keys(body);

  const allowedBodyKeys = new Set([...X402_LIVE_CHALLENGE_TOP_LEVEL_BODY_KEYS, "stocktrends_preview"]);
  if (bodyKeys.some((key) => !allowedBodyKeys.has(key))) {
    return "x402_live_challenge_value_not_approved";
  }
  if (!X402_LIVE_CHALLENGE_TOP_LEVEL_BODY_KEYS.every((key) => hasOwn(body, key))) {
    return "x402_live_challenge_unexpected_shape";
  }
  if (!hasOwn(body, "stocktrends_preview")) {
    return "x402_live_challenge_unexpected_shape";
  }

  if (
    body.error !== "payment_required" ||
    body.detail !== "Payment is required to access this endpoint." ||
    body.protocol !== "x402" ||
    !isApprovedDescriptivePaymentMethodsForRoute(endpointPath, body.accepted_payment_methods)
  ) {
    return "x402_live_challenge_value_not_approved";
  }

  if (!isPlainRecord(body.pricing) || !hasExactObjectKeys(body.pricing, X402_PRICING_KEYS)) {
    return "x402_live_challenge_value_not_approved";
  }
  const pricing = body.pricing;
  if (
    !isCanonicalPositiveFixedSix(pricing.amount_usd) ||
    pricing.unit !== "request" ||
    !isBoundedIdentifier(pricing.network, 128) ||
    !isEvmAddress(pricing.token) ||
    !isBoundedIdentifier(pricing.scheme, 64)
  ) {
    return "x402_live_challenge_value_not_approved";
  }

  if (!isPlainRecord(body.payment_required)) {
    return "x402_live_challenge_value_not_approved";
  }
  const requirements = body.payment_required;
  if (!hasExactObjectKeys(requirements, X402_REQUIREMENTS_KEYS)) {
    return "x402_live_challenge_value_not_approved";
  }
  if (requirements.x402Version !== 2 || !Number.isInteger(requirements.x402Version)) {
    return "x402_live_challenge_value_not_approved";
  }
  if (!isApprovedResourceInfo(requirements.resource)) {
    return "x402_live_challenge_value_not_approved";
  }
  if (!Array.isArray(requirements.accepts) || requirements.accepts.length !== 1) {
    return "x402_live_challenge_value_not_approved";
  }

  const accepted = requirements.accepts[0];
  if (!isPlainRecord(accepted) || !hasExactObjectKeys(accepted, X402_ACCEPTED_REQUIREMENT_KEYS)) {
    return "x402_live_challenge_value_not_approved";
  }
  if (!isBoundedIdentifier(accepted.scheme, 64) || !isBoundedIdentifier(accepted.network, 128)) {
    return "x402_live_challenge_value_not_approved";
  }
  if (!isSupportedEip155Network(accepted.network)) {
    return "x402_live_challenge_network_unsupported";
  }
  if (
    !isCanonicalPositiveAtomicAmount(accepted.amount) ||
    !isEvmAddress(accepted.asset) ||
    !isEvmAddress(accepted.payTo) ||
    typeof accepted.maxTimeoutSeconds !== "number" ||
    !Number.isSafeInteger(accepted.maxTimeoutSeconds) ||
    accepted.maxTimeoutSeconds <= 0 ||
    !isPlainRecord(accepted.extra)
  ) {
    return "x402_live_challenge_value_not_approved";
  }

  if (
    pricing.network !== accepted.network ||
    pricing.token !== accepted.asset ||
    pricing.scheme !== accepted.scheme
  ) {
    return "x402_live_challenge_value_not_approved";
  }

  const resource = requirements.resource;
  const extraValidation = validateAcceptedExtra(accepted.extra, resource);
  if (extraValidation === "prohibited") {
    return "x402_live_challenge_prohibited_material";
  }
  if (extraValidation !== "ok") {
    return "x402_live_challenge_value_not_approved";
  }

  const extraResource = accepted.extra.resource;
  if (
    !isPlainRecord(extraResource) ||
    !jsonStructuralEqual(extraResource, resource) ||
    typeof body.resource !== "string" ||
    body.resource !== resource.url ||
    extraResource.url !== resource.url ||
    !isApprovedRouteResource(body.resource, endpointPath, apiBaseOrigin)
  ) {
    return "x402_live_challenge_value_not_approved";
  }

  const extensionsValidation = validateExtensionContainer(
    requirements.extensions,
    "bazaar_extensions"
  );
  if (extensionsValidation === "prohibited") {
    return "x402_live_challenge_prohibited_material";
  }
  if (extensionsValidation !== "ok") {
    return "x402_live_challenge_value_not_approved";
  }

  const previewValidation = validateStocktrendsPreview(body.stocktrends_preview, endpointPath);
  if (previewValidation === "prohibited") {
    return "x402_live_challenge_prohibited_material";
  }
  if (previewValidation !== "ok") {
    return "x402_live_challenge_value_not_approved";
  }

  return null;
}

function isApprovedDescriptivePaymentMethodsForRoute(
  endpointPath: string,
  value: unknown
): value is string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > X402_DESCRIPTIVE_PAYMENT_METHODS_MAX_LENGTH ||
    value.some((rail) => typeof rail !== "string" || rail.length === 0) ||
    new Set(value).size !== value.length ||
    !value.includes("x402")
  ) {
    return false;
  }

  const expected = X402_DESCRIPTIVE_PAYMENT_METHODS_BY_ROUTE[endpointPath];
  return (
    expected !== undefined &&
    expected.length === value.length &&
    expected.every((rail, index) => value[index] === rail)
  );
}

function isApprovedResourceInfo(value: unknown): value is Record<string, unknown> {
  if (!isPlainRecord(value) || !hasExactObjectKeys(value, X402_RESOURCE_INFO_KEYS)) {
    return false;
  }

  return (
    isBoundedUtf8String(value.url, 1, 2_048) &&
    isBoundedUtf8String(value.description, 0, 2_048) &&
    value.mimeType === "application/json" &&
    isBoundedUtf8String(value.serviceName, 0, 256) &&
    Array.isArray(value.tags) &&
    value.tags.length <= 32 &&
    value.tags.every((tag) => isBoundedUtf8String(tag, 0, 256)) &&
    isBoundedUtf8String(value.iconUrl, 0, 2_048)
  );
}

function validateAcceptedExtra(
  extra: Record<string, unknown>,
  resource: Record<string, unknown>
): ExtensionValidationResult {
  if (Object.keys(extra).length > X402_EXTENSION_MAX_OBJECT_MEMBERS) {
    return "invalid";
  }
  if (!X402_EXTRA_REQUIRED_KEYS.every((key) => hasOwn(extra, key))) {
    return "invalid";
  }
  if (
    !isBoundedUtf8String(extra.name, 0, 256) ||
    !isBoundedUtf8String(extra.version, 0, 128) ||
    !isPlainRecord(extra.resource) ||
    !jsonStructuralEqual(extra.resource, resource) ||
    (hasOwn(extra, "assetTransferMethod") && !isBoundedUtf8String(extra.assetTransferMethod, 1, 128))
  ) {
    return "invalid";
  }
  if (
    hasForbiddenLiveResponseMaterial(extra.name) ||
    hasForbiddenLiveResponseMaterial(extra.version) ||
    (hasOwn(extra, "assetTransferMethod") && hasForbiddenLiveResponseMaterial(extra.assetTransferMethod))
  ) {
    return "prohibited";
  }

  const unknownExtra = Object.fromEntries(
    Object.entries(extra).filter(([key]) => !X402_EXTRA_KNOWN_KEYS.has(key))
  );
  const knownAggregateMembers =
    Object.keys(extra).filter((key) => X402_EXTRA_KNOWN_KEYS.has(key)).length +
    Object.keys(resource).length +
    (Array.isArray(resource.tags) ? resource.tags.length : 0);
  const unknownValidation = validateExtensionContainer(
    unknownExtra,
    "generic",
    knownAggregateMembers
  );
  if (unknownValidation !== "ok") {
    return unknownValidation;
  }
  return jsonUtf8ByteLength(extra) <= X402_EXTENSION_MAX_TOTAL_BYTES ? "ok" : "invalid";
}

function validateExtensionContainer(
  value: unknown,
  context: ExtensionSemanticContext = "generic",
  initialTotalMembers = 0
): ExtensionValidationResult {
  if (!isPlainRecord(value)) {
    return "invalid";
  }

  let totalMembers = initialTotalMembers;
  if (totalMembers > X402_EXTENSION_MAX_TOTAL_MEMBERS) {
    return "invalid";
  }
  const stack: Array<{ value: unknown; depth: number; path: JsonPathSegment[] }> = [
    { value, depth: 0, path: [] }
  ];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.depth > X402_EXTENSION_MAX_DEPTH) {
      return "invalid";
    }

    if (current.value === null || typeof current.value === "boolean") {
      continue;
    }
    if (typeof current.value === "number") {
      if (!Number.isFinite(current.value)) return "invalid";
      continue;
    }
    if (typeof current.value === "string") {
      if (!isBoundedUtf8String(current.value, 0, X402_EXTENSION_MAX_STRING_BYTES)) {
        return "invalid";
      }
      if (hasForbiddenLiveResponseMaterial(current.value)) {
        return "prohibited";
      }
      continue;
    }

    if (Array.isArray(current.value)) {
      if (current.value.length > X402_EXTENSION_MAX_ARRAY_LENGTH) {
        return "invalid";
      }
      totalMembers += current.value.length;
      if (totalMembers > X402_EXTENSION_MAX_TOTAL_MEMBERS) {
        return "invalid";
      }
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({
          value: current.value[index],
          depth: current.depth + 1,
          path: [...current.path, index]
        });
      }
      continue;
    }

    if (!isPlainRecord(current.value)) {
      return "invalid";
    }

    const entries = Object.entries(current.value);
    if (entries.length > X402_EXTENSION_MAX_OBJECT_MEMBERS) {
      return "invalid";
    }
    totalMembers += entries.length;
    if (totalMembers > X402_EXTENSION_MAX_TOTAL_MEMBERS) {
      return "invalid";
    }

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index];
      if (!isBoundedUtf8String(key, 1, 128)) {
        return "invalid";
      }
      const childPath = [...current.path, key];
      if (isProhibitedExtensionKey(key, childPath, context, child, value)) {
        return "prohibited";
      }
      stack.push({ value: child, depth: current.depth + 1, path: childPath });
    }
  }

  return jsonUtf8ByteLength(value) <= X402_EXTENSION_MAX_TOTAL_BYTES ? "ok" : "invalid";
}

function validateStocktrendsPreview(
  value: unknown,
  endpointPath: string
): ExtensionValidationResult {
  const contract = X402_PREVIEW_ROUTE_CONTRACTS[endpointPath];
  if (contract === undefined || !isPlainRecord(value)) {
    return "invalid";
  }

  const bounds = scanBoundedStocktrendsPreview(value);
  if (bounds !== "ok") {
    return bounds;
  }

  if (!isApprovedStocktrendsPreviewSchema(value, endpointPath, contract)) {
    return hasProhibitedStocktrendsPreviewMaterial(value, endpointPath)
      ? "prohibited"
      : "invalid";
  }

  return "ok";
}

function scanBoundedStocktrendsPreview(value: Record<string, unknown>): ExtensionValidationResult {
  let totalMembers = 0;
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.depth > X402_PREVIEW_MAX_DEPTH) {
      return "invalid";
    }

    if (current.value === null || typeof current.value === "boolean") {
      continue;
    }
    if (typeof current.value === "number") {
      if (!Number.isFinite(current.value)) return "invalid";
      continue;
    }
    if (typeof current.value === "string") {
      if (!isBoundedUtf8String(current.value, 0, X402_PREVIEW_MAX_STRING_BYTES)) {
        return "invalid";
      }
      if (hasForbiddenLiveString(current.value)) {
        return "prohibited";
      }
      continue;
    }

    if (Array.isArray(current.value)) {
      if (current.value.length > X402_PREVIEW_MAX_ARRAY_LENGTH) {
        return "invalid";
      }
      totalMembers += current.value.length;
      if (totalMembers > X402_PREVIEW_MAX_TOTAL_MEMBERS) {
        return "invalid";
      }
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: current.value[index], depth: current.depth + 1 });
      }
      continue;
    }

    if (!isPlainRecord(current.value)) {
      return "invalid";
    }
    const entries = Object.entries(current.value);
    if (entries.length > X402_PREVIEW_MAX_OBJECT_MEMBERS) {
      return "invalid";
    }
    totalMembers += entries.length;
    if (totalMembers > X402_PREVIEW_MAX_TOTAL_MEMBERS) {
      return "invalid";
    }
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index];
      if (
        !isBoundedUtf8String(key, 1, X402_PREVIEW_MAX_KEY_BYTES) ||
        X402_PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase())
      ) {
        return "invalid";
      }
      stack.push({ value: child, depth: current.depth + 1 });
    }
  }

  return jsonUtf8ByteLength(value) <= X402_PREVIEW_MAX_TOTAL_BYTES ? "ok" : "invalid";
}

function isApprovedStocktrendsPreviewSchema(
  preview: Record<string, unknown>,
  endpointPath: string,
  contract: PreviewRouteContract
): boolean {
  const rootKeys = [
    "endpoint",
    "investment_agent_value",
    "supported_rails",
    "input_rule",
    "input_location",
    "parameter_source",
    "required_inputs",
    "optional_inputs",
    "safe_example_request",
    "response_shape",
    "example_object",
    "output_summary",
    "notes",
    "related_endpoints",
    "next_recommended_calls",
    "pricing",
    "analytical_role",
    ...(contract.flavor === "stim"
      ? [
          "interpretation_dependency",
          "interpretation_guidance",
          "required_interpretation_steps",
          "inference_contract",
          "inference_provider",
          "cognition_architecture"
        ]
      : contract.flavor === "selection"
        ? ["inference_contract", "inference_provider", "cognition_architecture", "provenance_reference"]
        : contract.flavor === "market"
          ? ["interpretation_guidance", "provenance_reference"]
          : ["provenance_reference"])
  ];
  if (!hasExactObjectKeys(preview, rootKeys)) {
    return false;
  }

  if (
    !isApprovedPreviewEndpoint(preview.endpoint, endpointPath, contract.category) ||
    !isBoundedUtf8String(preview.investment_agent_value, 1, X402_PREVIEW_MAX_STRING_BYTES) ||
    !hasExactStringArray(preview.supported_rails, X402_SOURCE_PAYMENT_METHODS) ||
    (contract.requiredInputs.length > 0
      ? !isBoundedUtf8String(preview.input_rule, 1, X402_PREVIEW_MAX_STRING_BYTES)
      : preview.input_rule !== null) ||
    preview.input_location !== "query" ||
    preview.parameter_source !== "query" ||
    !isApprovedPreviewInputs(preview.required_inputs, contract.requiredInputs, true, endpointPath) ||
    !isApprovedPreviewInputs(preview.optional_inputs, contract.optionalInputs, false, endpointPath) ||
    !isApprovedPreviewSafeRequest(preview.safe_example_request, endpointPath, contract.safeQuery) ||
    !hasExactStringArray(preview.response_shape, contract.responseShape) ||
    !jsonStructuralEqual(preview.example_object, contract.exampleObject) ||
    !isBoundedUtf8String(preview.output_summary, 1, X402_PREVIEW_MAX_STRING_BYTES) ||
    !hasBoundedStringArray(preview.notes, contract.notesLength) ||
    !hasExactStringArray(preview.related_endpoints, contract.relatedEndpoints) ||
    !hasExactStringArray(preview.next_recommended_calls, contract.nextRecommendedCalls) ||
    !isApprovedPreviewPricing(preview.pricing, contract.pricingRuleId) ||
    preview.analytical_role !== contract.analyticalRole
  ) {
    return false;
  }

  if (contract.flavor === "stim") {
    return (
      isApprovedStimInterpretationDependency(preview.interpretation_dependency) &&
      isApprovedStimInterpretationGuidance(preview.interpretation_guidance) &&
      hasBoundedStringArray(preview.required_interpretation_steps, 10) &&
      isApprovedInferenceContract(preview.inference_contract) &&
      isApprovedInferenceProvider(preview.inference_provider) &&
      preview.cognition_architecture === "docs/STOCK_TRENDS_COGNITION_ARCHITECTURE.md"
    );
  }
  if (contract.flavor === "selection") {
    return (
      isApprovedInferenceContract(preview.inference_contract) &&
      isApprovedInferenceProvider(preview.inference_provider) &&
      preview.cognition_architecture === "docs/STOCK_TRENDS_COGNITION_ARCHITECTURE.md" &&
      isApprovedProvenanceReference(preview.provenance_reference)
    );
  }
  if (contract.flavor === "market") {
    return (
      isApprovedMarketInterpretationGuidance(preview.interpretation_guidance) &&
      isApprovedProvenanceReference(preview.provenance_reference)
    );
  }
  return isApprovedProvenanceReference(preview.provenance_reference);
}

function isApprovedPreviewEndpoint(value: unknown, endpointPath: string, category: string): boolean {
  return (
    isPlainRecord(value) &&
    hasExactObjectKeys(value, [
      "method", "path", "purpose", "category", "workflow_role", "access_type", "requires_payment"
    ]) &&
    value.method === "GET" &&
    value.path === endpointPath &&
    isBoundedUtf8String(value.purpose, 1, X402_PREVIEW_MAX_STRING_BYTES) &&
    value.category === category &&
    isBoundedUtf8String(value.workflow_role, 1, X402_PREVIEW_MAX_STRING_BYTES) &&
    value.access_type === "paid" &&
    value.requires_payment === true
  );
}

function isApprovedPreviewInputs(
  value: unknown,
  expectedNames: readonly string[],
  required: boolean,
  endpointPath: string
): boolean {
  if (!isPlainRecord(value) || !hasExactObjectKeys(value, expectedNames)) {
    return false;
  }
  return expectedNames.every((name) =>
    isApprovedPreviewInputDescriptor(value[name], name, required, endpointPath)
  );
}

function isApprovedPreviewInputDescriptor(
  value: unknown,
  inputName: string,
  required: boolean,
  endpointPath: string
): boolean {
  const keys = previewInputDescriptorKeys(inputName, endpointPath);
  const expectedType = previewInputType(inputName);
  if (
    keys === null ||
    expectedType === null ||
    !isPlainRecord(value) ||
    !hasExactObjectKeys(value, keys) ||
    value.type !== expectedType ||
    value.required !== required ||
    value.input_location !== "query" ||
    value.parameter_source !== "query"
  ) {
    return false;
  }

  for (const key of keys) {
    const child = value[key];
    if (["type", "required", "input_location", "parameter_source"].includes(key)) {
      continue;
    }
    if (key === "description" && !isBoundedUtf8String(child, 1, X402_PREVIEW_MAX_STRING_BYTES)) {
      return false;
    }
    if (key === "pattern" && child !== "^[A-Z0-9.]+-[A-Z]$") {
      return false;
    }
    if (key === "format" && child !== "date") {
      return false;
    }
    if (key === "enum") {
      const expected = inputName === "group_level"
        ? ["sector", "industry_group", "industry"]
        : ["N", "Q", "A", "B", "T", "I"];
      if (!hasExactStringArray(child, expected)) return false;
    }
    if (["example", "safe_default", "safe_default_for_demo"].includes(key)) {
      if (!isApprovedPreviewScalar(child, expectedType)) return false;
    }
    if (["minimum", "maximum"].includes(key) && (typeof child !== "number" || !Number.isFinite(child))) {
      return false;
    }
  }
  return true;
}

function previewInputType(inputName: string): PreviewScalarType | null {
  if ([
    "symbol_exchange", "symbol", "exchange", "start", "end", "weekdate",
    "group_level", "type"
  ].includes(inputName)) return "string";
  if (["min_prob13wk", "min_price"].includes(inputName)) return "number";
  if ([
    "limit", "min_volume", "vol_scale", "min_rsi", "min_mt_cnt",
    "limit_overall", "limit_bucket"
  ].includes(inputName)) return "integer";
  if (["cs_only", "include_gaps", "include_data", "include_mast", "include_unknown"].includes(inputName)) {
    return "boolean";
  }
  return null;
}

function previewInputDescriptorKeys(inputName: string, endpointPath: string): readonly string[] | null {
  const locationKeys = ["input_location", "parameter_source"];
  switch (inputName) {
    case "symbol_exchange":
      return ["type", "required", "example", "safe_default_for_demo", "pattern", "description", ...locationKeys];
    case "symbol":
      return ["type", "required", "example", "description", ...locationKeys];
    case "exchange":
      return ["type", "required", "enum", "example", "description", ...locationKeys];
    case "cs_only":
      return ["type", "required", "safe_default", "example", "description", ...locationKeys];
    case "start":
    case "end":
      return ["type", "required", "format", "example", "description", ...locationKeys];
    case "weekdate":
      return endpointPath === "/v1/breadth/sector/latest"
        ? ["type", "required", "format", "description", ...locationKeys]
        : ["type", "required", "format", "example", "description", ...locationKeys];
    case "limit":
      return ["/v1/stim/history", "/v1/indicators/history"].includes(endpointPath)
        ? ["type", "required", "safe_default", "minimum", "maximum", "example", "description", ...locationKeys]
        : ["type", "required", "safe_default", "minimum", "maximum", ...locationKeys];
    case "include_gaps":
    case "include_data":
    case "include_mast":
    case "include_unknown":
      return ["type", "required", "safe_default", ...locationKeys];
    case "group_level":
      return ["type", "required", "enum", "safe_default", ...locationKeys];
    case "min_price":
    case "min_volume":
      return ["type", "required", "minimum", ...locationKeys];
    case "vol_scale":
      return ["type", "required", "safe_default", "minimum", ...locationKeys];
    case "min_prob13wk":
      return ["type", "required", "example", "description", ...locationKeys];
    case "type":
      return ["type", "required", "safe_default", "example", "description", ...locationKeys];
    case "min_rsi":
    case "min_mt_cnt":
      return ["type", "required", "safe_default", "minimum", "maximum", "example", "description", ...locationKeys];
    case "limit_overall":
    case "limit_bucket":
      return ["type", "required", "safe_default", "minimum", "maximum", "example", ...locationKeys];
    default:
      return null;
  }
}

function isApprovedPreviewScalar(value: unknown, type: PreviewScalarType): boolean {
  if (type === "string") return isBoundedUtf8String(value, 0, X402_PREVIEW_MAX_STRING_BYTES);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "integer") return typeof value === "number" && Number.isSafeInteger(value);
  return typeof value === "number" && Number.isFinite(value);
}

function isApprovedPreviewSafeRequest(
  value: unknown,
  endpointPath: string,
  safeQuery: Readonly<Record<string, PreviewScalarType>>
): boolean {
  if (
    !isPlainRecord(value) ||
    !hasExactObjectKeys(value, ["method", "path", "query"]) ||
    value.method !== "GET" ||
    value.path !== endpointPath ||
    !isPlainRecord(value.query) ||
    !hasExactObjectKeys(value.query, Object.keys(safeQuery))
  ) {
    return false;
  }
  return Object.entries(safeQuery).every(([key, type]) =>
    isApprovedPreviewScalar((value.query as Record<string, unknown>)[key], type)
  );
}

function isApprovedPreviewPricing(value: unknown, pricingRuleId: string): boolean {
  return (
    isPlainRecord(value) &&
    hasExactObjectKeys(value, ["pricing_rule_id", "stc_cost", "effective_price_usd", "unit", "cost_source"]) &&
    value.pricing_rule_id === pricingRuleId &&
    isCanonicalPositiveFixedSix(value.stc_cost) &&
    isCanonicalPositiveFixedSix(value.effective_price_usd) &&
    value.unit === "request" &&
    value.cost_source === "/v1/pricing/catalog"
  );
}

function hasExactStringArray(value: unknown, expected: readonly string[]): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((entry, index) => entry === expected[index])
  );
}

function hasBoundedStringArray(value: unknown, expectedLength: number): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === expectedLength &&
    value.every((entry) => isBoundedUtf8String(entry, 1, X402_PREVIEW_MAX_STRING_BYTES))
  );
}

function isApprovedProvenanceReference(value: unknown): boolean {
  return (
    isPlainRecord(value) &&
    hasExactObjectKeys(value, [
      "historical_coverage_start_year",
      "approximate_observation_count",
      "classification_framework",
      "semantic_continuity",
      "full_metadata_endpoints",
      "interpretation_limit"
    ]) &&
    value.historical_coverage_start_year === 1980 &&
    value.approximate_observation_count === "16M+" &&
    isBoundedUtf8String(value.classification_framework, 1, X402_PREVIEW_MAX_STRING_BYTES) &&
    isBoundedUtf8String(value.semantic_continuity, 1, X402_PREVIEW_MAX_STRING_BYTES) &&
    hasExactStringArray(value.full_metadata_endpoints, [
      "/v1/ai/context", "/v1/meta/indicators", "/v1/meta/stim"
    ]) &&
    isBoundedUtf8String(value.interpretation_limit, 1, X402_PREVIEW_MAX_STRING_BYTES)
  );
}

function isApprovedInferenceContract(value: unknown): boolean {
  return (
    isPlainRecord(value) &&
    hasExactObjectKeys(value, ["endpoint", "provider_agnostic", "core_concepts"]) &&
    value.endpoint === "/v1/meta/inference" &&
    value.provider_agnostic === true &&
    hasExactStringArray(value.core_concepts, [
      "inference_provider",
      "forecast_horizon",
      "probability_distribution",
      "confidence_measure",
      "evidence",
      "uncertainty",
      "explanation",
      "signal_source",
      "reasoning_interpretation"
    ])
  );
}

function isApprovedInferenceProvider(value: unknown): boolean {
  return (
    isPlainRecord(value) &&
    hasExactObjectKeys(value, [
      "provider_id",
      "provider_name",
      "provider_role",
      "provider_profile_endpoint",
      "not_final_intelligence_layer",
      "future_causal_ai_compatible"
    ]) &&
    value.provider_id === "stim" &&
    value.provider_name === "Stock Trends Inference Model" &&
    value.provider_role === "current_baseline_inference_provider" &&
    value.provider_profile_endpoint === "/v1/meta/stim" &&
    value.not_final_intelligence_layer === true &&
    value.future_causal_ai_compatible === true
  );
}

function isApprovedStimInterpretationDependency(value: unknown): boolean {
  return (
    isPlainRecord(value) &&
    hasExactObjectKeys(value, [
      "endpoint",
      "method",
      "required_before_interpretation",
      "reason",
      "inference_contract_endpoint",
      "cognition_architecture"
    ]) &&
    value.endpoint === "/v1/meta/stim" &&
    value.method === "GET" &&
    value.required_before_interpretation === true &&
    isBoundedUtf8String(value.reason, 1, X402_PREVIEW_MAX_STRING_BYTES) &&
    value.inference_contract_endpoint === "/v1/meta/inference" &&
    value.cognition_architecture === "docs/STOCK_TRENDS_COGNITION_ARCHITECTURE.md"
  );
}

function isApprovedStimInterpretationGuidance(value: unknown): boolean {
  if (
    !isPlainRecord(value) ||
    !hasExactObjectKeys(value, [
      "inference_contract_endpoint",
      "inference_provider",
      "base_period_mean_returns_pct",
      "mean_return_fields",
      "standard_deviation_fields",
      "calculation",
      "interpretation_rules",
      "randomness_assumptions",
      "distribution_framing",
      "classification_role",
      "limitations",
      "portfolio_applications",
      "stim_select_style_logic"
    ]) ||
    value.inference_contract_endpoint !== "/v1/meta/inference" ||
    !isPlainRecord(value.inference_provider) ||
    !hasExactObjectKeys(value.inference_provider, [
      "provider_id", "provider_role", "not_final_intelligence_layer", "profile_endpoint"
    ]) ||
    value.inference_provider.provider_id !== "stim" ||
    value.inference_provider.provider_role !== "current_baseline_inference_provider" ||
    value.inference_provider.not_final_intelligence_layer !== true ||
    value.inference_provider.profile_endpoint !== "/v1/meta/stim" ||
    !isPlainRecord(value.base_period_mean_returns_pct) ||
    !hasExactObjectKeys(value.base_period_mean_returns_pct, ["x4wk", "x13wk", "x40wk"]) ||
    !Object.values(value.base_period_mean_returns_pct).every((entry) =>
      isBoundedUtf8String(entry, 1, X402_PREVIEW_MAX_STRING_BYTES)
    ) ||
    !hasExactStringArray(value.mean_return_fields, ["x4wk", "x13wk", "x40wk"]) ||
    !hasExactStringArray(value.standard_deviation_fields, ["x4wksd", "x13wksd", "x40wksd"]) ||
    !isPlainRecord(value.calculation) ||
    !hasExactObjectKeys(value.calculation, ["delta_vs_base", "z", "probability_outperform"]) ||
    !Object.values(value.calculation).every((entry) =>
      isBoundedUtf8String(entry, 1, X402_PREVIEW_MAX_STRING_BYTES)
    ) ||
    !hasBoundedStringArray(value.interpretation_rules, 6) ||
    !hasBoundedStringArray(value.randomness_assumptions, 3) ||
    !isPlainRecord(value.distribution_framing) ||
    !hasExactObjectKeys(value.distribution_framing, [
      "assumption", "central_limit_theorem_intuition", "probability_formula"
    ]) ||
    !Object.values(value.distribution_framing).every((entry) =>
      isBoundedUtf8String(entry, 1, X402_PREVIEW_MAX_STRING_BYTES)
    ) ||
    !isBoundedUtf8String(value.classification_role, 1, X402_PREVIEW_MAX_STRING_BYTES) ||
    !hasBoundedStringArray(value.limitations, 7) ||
    !hasBoundedStringArray(value.portfolio_applications, 6) ||
    !isPlainRecord(value.stim_select_style_logic) ||
    !hasExactObjectKeys(value.stim_select_style_logic, [
      "prob13wk_minimum", "prob13wk_minimum_description", "lower_confidence_bounds"
    ]) ||
    value.stim_select_style_logic.prob13wk_minimum !== 0.55 ||
    !isBoundedUtf8String(
      value.stim_select_style_logic.prob13wk_minimum_description,
      1,
      X402_PREVIEW_MAX_STRING_BYTES
    ) ||
    !isBoundedUtf8String(
      value.stim_select_style_logic.lower_confidence_bounds,
      1,
      X402_PREVIEW_MAX_STRING_BYTES
    )
  ) {
    return false;
  }
  return true;
}

function isApprovedMarketInterpretationGuidance(value: unknown): boolean {
  if (
    !isPlainRecord(value) ||
    !hasExactObjectKeys(value, [
      "regime_score_scale", "interpretation_rules", "downstream_workflow", "confirmation_endpoints"
    ]) ||
    !isPlainRecord(value.regime_score_scale)
  ) {
    return false;
  }
  const scale = value.regime_score_scale;
  return (
    hasExactObjectKeys(scale, [
      "range", "formula", "strong_bullish", "mixed", "strong_bearish"
    ]) &&
    Array.isArray(scale.range) &&
    scale.range.length === 2 &&
    scale.range[0] === -1 &&
    scale.range[1] === 1 &&
    ["formula", "strong_bullish", "mixed", "strong_bearish"].every((key) =>
      isBoundedUtf8String(scale[key], 1, X402_PREVIEW_MAX_STRING_BYTES)
    ) &&
    hasBoundedStringArray(value.interpretation_rules, 5) &&
    isBoundedUtf8String(value.downstream_workflow, 1, X402_PREVIEW_MAX_STRING_BYTES) &&
    hasExactStringArray(value.confirmation_endpoints, [
      "/v1/breadth/sector/latest", "/v1/leadership/summary/latest"
    ])
  );
}

function hasProhibitedStocktrendsPreviewMaterial(value: unknown, endpointPath: string): boolean {
  const stack: Array<{ value: unknown; path: JsonPathSegment[] }> = [{ value, path: [] }];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (typeof current.value === "string") {
      if (hasForbiddenLiveString(current.value)) return true;
      continue;
    }
    if (Array.isArray(current.value)) {
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({ value: current.value[index], path: [...current.path, index] });
      }
      continue;
    }
    if (!isPlainRecord(current.value)) continue;
    const entries = Object.entries(current.value);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index];
      const childPath = [...current.path, key];
      if (
        !isApprovedPreviewProtectedRole(childPath, child, endpointPath) &&
        isProhibitedExtensionKey(key, childPath, "generic", child, value)
      ) {
        return true;
      }
      stack.push({ value: child, path: childPath });
    }
  }
  return false;
}

function isApprovedPreviewProtectedRole(
  path: readonly JsonPathSegment[],
  value: unknown,
  endpointPath: string
): boolean {
  if (
    (pathsEqual(path, ["endpoint", "method"]) && value === "GET") ||
    (pathsEqual(path, ["endpoint", "path"]) && value === endpointPath) ||
    (pathsEqual(path, ["endpoint", "requires_payment"]) && value === true) ||
    (pathsEqual(path, ["safe_example_request", "method"]) && value === "GET") ||
    (pathsEqual(path, ["safe_example_request", "path"]) && value === endpointPath) ||
    (pathsEqual(path, ["pricing"]) && isPlainRecord(value)) ||
    (pathsEqual(path, ["interpretation_dependency", "method"]) && value === "GET") ||
    (
      pathsEqual(path, ["interpretation_guidance", "confirmation_endpoints"]) &&
      hasExactStringArray(value, ["/v1/breadth/sector/latest", "/v1/leadership/summary/latest"])
    )
  ) {
    return true;
  }

  if (path.length >= 2 && path[0] === "example_object") {
    const expectedExample = X402_PREVIEW_ROUTE_CONTRACTS[endpointPath]?.exampleObject;
    const expectedValue = expectedExample === undefined
      ? undefined
      : getJsonPathValue(expectedExample, path.slice(1));
    return expectedValue !== undefined && jsonStructuralEqual(value, expectedValue);
  }
  return false;
}

function isProhibitedExtensionKey(
  key: string,
  path: readonly JsonPathSegment[],
  context: ExtensionSemanticContext,
  childValue: unknown,
  extensionRoot: unknown
): boolean {
  if (X402_PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase())) {
    return true;
  }

  const tokens = tokenizeIdentifier(key);
  const compact = tokens.join("");
  const tokenSet = new Set(tokens);

  if (
    [
      "proof",
      "signature",
      "authorization",
      "privatekey",
      "seedphrase",
      "mnemonic",
      "bearertoken",
      "apikey",
      "credential",
      "walletsecret",
      "walletseed",
      "paymentproof",
      "paymentsignature",
      "paymentheader",
      "paymentenvelope"
    ].includes(compact) ||
    tokenSet.has("proof") ||
    tokenSet.has("signature") ||
    tokenSet.has("authorization") ||
    tokenSet.has("authentication") ||
    tokenSet.has("auth") ||
    tokenSet.has("mnemonic") ||
    tokenSet.has("secret") ||
    (tokenSet.has("private") && tokenSet.has("key")) ||
    (tokenSet.has("wallet") && (tokenSet.has("seed") || tokenSet.has("secret"))) ||
    (tokenSet.has("seed") && tokenSet.has("phrase")) ||
    ((tokenSet.has("auth") || tokenSet.has("authentication")) && tokenSet.has("token")) ||
    (tokenSet.has("bearer") && tokenSet.has("token")) ||
    (tokenSet.has("api") && tokenSet.has("key")) ||
    tokenSet.has("payment") ||
    tokenSet.has("settlement") ||
    tokenSet.has("transaction") ||
    tokenSet.has("facilitator")
  ) {
    return true;
  }

  if (isPaymentSemanticOverride(compact)) {
    return true;
  }

  if (isProtectedAuthorityAlias(tokens, compact)) {
    return true;
  }

  // build_bazaar_extension() authors this single descriptive boolean at this
  // exact info role. It does not grant request, payment, proof, settlement, or
  // output authority. No other execution-bearing key or path is exempted.
  if (isApprovedBazaarSafeAutonomousExecutionFlag(path, context, childValue)) {
    return false;
  }

  if (isProhibitedTransactionState(tokens, compact)) {
    return true;
  }

  // HTTP-method authority is an execution semantic. Literal descriptive
  // `method` is allowed only at the five exact Python-builder roles below;
  // aliases and authority/override compounds are rejected before any broader
  // Bazaar discovery-path allowance is considered.
  if (isProhibitedMethodAuthority(tokens, compact, path, context)) {
    return true;
  }

  const approvedBazaarDiscoveryPath =
    context === "bazaar_extensions" && isApprovedBazaarDiscoveryPath(path, extensionRoot);
  if (approvedBazaarDiscoveryPath) {
    return false;
  }

  return X402_EXTENSION_SHADOW_KEYS.has(compact);
}

function tokenizeIdentifier(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function isPaymentSemanticOverride(compactKey: string): boolean {
  if (!compactKey.endsWith("override")) {
    return false;
  }
  const concept = compactKey.slice(0, -"override".length);
  return [
    "route",
    "path",
    "url",
    "resource",
    "amount",
    "amountusd",
    "price",
    "pricing",
    "payment",
    "asset",
    "token",
    "payto",
    "payee",
    "recipient",
    "address",
    "network",
    "chain",
    "chainid",
    "family",
    "scheme",
    "timeout",
    "maxtimeoutseconds",
    "expiry",
    "expiresat"
  ].includes(concept);
}

function isProtectedAuthorityAlias(tokens: readonly string[], compactKey: string): boolean {
  if (X402_PROTECTED_AUTHORITY_COMPACT_ALIASES.has(compactKey)) {
    return true;
  }

  if (!tokens.includes("authority")) {
    return false;
  }

  return X402_PROTECTED_AUTHORITY_TOKEN_SEQUENCES.some((conceptTokens) =>
    containsTokenSequence(tokens, conceptTokens)
  );
}

function containsTokenSequence(
  tokens: readonly string[],
  expected: readonly string[]
): boolean {
  if (expected.length === 0 || expected.length > tokens.length) {
    return false;
  }
  for (let start = 0; start <= tokens.length - expected.length; start += 1) {
    if (expected.every((token, offset) => tokens[start + offset] === token)) {
      return true;
    }
  }
  return false;
}

function isApprovedBazaarSafeAutonomousExecutionFlag(
  path: readonly JsonPathSegment[],
  context: ExtensionSemanticContext,
  value: unknown
): boolean {
  return (
    context === "bazaar_extensions" &&
    pathsEqual(path, ["bazaar", "info", X402_SAFE_AUTONOMOUS_EXECUTION_KEY]) &&
    typeof value === "boolean"
  );
}

function isProhibitedTransactionState(
  tokens: readonly string[],
  compactKey: string
): boolean {
  return (
    X402_TRANSACTION_STATE_COMPACT_KEYS.has(compactKey) ||
    tokens.some((token) => X402_TRANSACTION_STATE_TOKENS.has(token))
  );
}

function isProhibitedMethodAuthority(
  tokens: readonly string[],
  compactKey: string,
  path: readonly JsonPathSegment[],
  context: ExtensionSemanticContext
): boolean {
  if (compactKey === "method") {
    return context !== "bazaar_extensions" || !isApprovedBazaarDescriptiveMethodPath(path);
  }

  if (X402_METHOD_AUTHORITY_KEYS.has(compactKey)) {
    return true;
  }

  const tokenSet = new Set(tokens);
  return (
    tokenSet.has("method") &&
    (
      tokenSet.has("http") ||
      tokenSet.has("execution") ||
      tokenSet.has("authority") ||
      tokenSet.has("override")
    )
  );
}

function isApprovedBazaarDescriptiveMethodPath(path: readonly JsonPathSegment[]): boolean {
  return (
    pathsEqual(path, ["bazaar", "info", "input", "method"]) ||
    pathsEqual(path, ["bazaar", "schema", "properties", "input", "properties", "method"]) ||
    pathsEqual(path, ["bazaar", "info", "interpretation_dependencies", "dependency", "method"]) ||
    pathsEqual(path, ["bazaar", "info", "input", "example", "method"]) ||
    (
      path.length === 5 &&
      path[0] === "bazaar" &&
      path[1] === "info" &&
      path[2] === "examples" &&
      typeof path[3] === "number" &&
      path[4] === "method"
    )
  );
}

function isApprovedBazaarDiscoveryPath(
  path: readonly JsonPathSegment[],
  extensionRoot: unknown
): boolean {
  const lastSegment = path[path.length - 1];
  if (path[0] !== "bazaar" || typeof lastSegment !== "string") {
    return false;
  }

  // build_compact_bazaar_extension() and build_bazaar_extension() author these
  // exact descriptive identity fields. They describe discovery grouping; they
  // do not select the relay route, method, payment terms, or execution mode.
  if (
    pathsEqual(path, ["bazaar", "info", "family"]) ||
    pathsEqual(path, ["bazaar", "info", "endpoint_family"]) ||
    pathsEqual(path, ["bazaar", "schema", "properties", "family"])
  ) {
    return true;
  }

  // Both builders place the descriptive HTTP method in info.input. The compact
  // builder declares it in JSON Schema; the rich builder may also copy the
  // registry-authored interpretation dependency method. These values describe
  // discovery metadata and never override the separately bound GET request.
  if (isApprovedBazaarDescriptiveMethodPath(path)) {
    return true;
  }

  // build_bazaar_extension() copies safe_example_request only into these two
  // request-example roles. method/path here are inert example metadata, not
  // authority over the invoked route or the actual GET method.
  if (
    pathsEqual(path, ["bazaar", "info", "input", "example", "path"]) ||
    (
      path.length === 5 &&
      path[0] === "bazaar" &&
      path[1] === "info" &&
      path[2] === "examples" &&
      typeof path[3] === "number" &&
      path[4] === "path"
    )
  ) {
    return true;
  }

  return classifyBazaarOutputCarrierPath(path, extensionRoot) !== "not_approved";
}

function pathsEqual(
  path: readonly JsonPathSegment[],
  expected: readonly JsonPathSegment[]
): boolean {
  return path.length === expected.length && path.every((segment, index) => segment === expected[index]);
}

function classifyBazaarOutputCarrierPath(
  path: readonly JsonPathSegment[],
  extensionRoot: unknown
): BazaarOutputCarrierRole {
  const carrier = path[path.length - 1];
  if (typeof carrier !== "string" || !X402_SOURCE_OUTPUT_CARRIER_KEYS.has(carrier)) {
    return "not_approved";
  }

  // The rich builder's output example is one object. Only its immediate
  // carrier properties are descriptive; arrays, ancestors, and descendants do
  // not inherit this role.
  if (
    path.length === 5 &&
    pathsEqual(path.slice(0, 4), ["bazaar", "info", "output", "example"])
  ) {
    return "source_output_example_carrier";
  }

  const schemaRoots: readonly (readonly JsonPathSegment[])[] = [
    ["bazaar", "info", "output", "schema"],
    ["bazaar", "schema", "properties", "output"]
  ];
  for (const schemaRootPath of schemaRoots) {
    if (
      path.length > schemaRootPath.length &&
      pathsEqual(path.slice(0, schemaRootPath.length), schemaRootPath) &&
      isSourceOutputSchemaCarrierDeclaration(
        path.slice(schemaRootPath.length),
        getJsonPathValue(extensionRoot, schemaRootPath)
      )
    ) {
      return "source_output_schema_property";
    }
  }

  return "not_approved";
}

// The current compact/rich helpers attach an object schema at exactly these
// roots. From there, a carrier must be a property name immediately after a
// structurally valid JSON Schema `properties` node. Nested object properties
// and object-valued array `items` are supported; arbitrary keys, arrays,
// interposed nodes, and property names that masquerade as schema structure are
// not source-authored roles.
function isSourceOutputSchemaCarrierDeclaration(
  suffix: readonly JsonPathSegment[],
  schemaRoot: unknown
): boolean {
  if (
    suffix.length < 2 ||
    suffix[suffix.length - 2] !== "properties" ||
    typeof suffix[suffix.length - 1] !== "string" ||
    !X402_SOURCE_OUTPUT_CARRIER_KEYS.has(suffix[suffix.length - 1] as string) ||
    !isPlainRecord(schemaRoot) ||
    schemaRoot.type !== "object"
  ) {
    return false;
  }

  let schemaNode: unknown = schemaRoot;
  let index = 0;
  while (index < suffix.length) {
    if (!isPlainRecord(schemaNode)) {
      return false;
    }

    const segment = suffix[index];
    if (segment === "items") {
      if (
        schemaNode.type !== "array" ||
        !isPlainRecord(schemaNode.items)
      ) {
        return false;
      }
      schemaNode = schemaNode.items;
      index += 1;
      continue;
    }

    if (
      segment !== "properties" ||
      schemaNode.type !== "object" ||
      !isPlainRecord(schemaNode.properties) ||
      index + 1 >= suffix.length
    ) {
      return false;
    }

    const propertyName = suffix[index + 1];
    if (
      typeof propertyName !== "string" ||
      propertyName === "properties" ||
      !hasOwn(schemaNode.properties, propertyName) ||
      !isPlainRecord(schemaNode.properties[propertyName])
    ) {
      return false;
    }

    if (index + 2 === suffix.length) {
      return X402_SOURCE_OUTPUT_CARRIER_KEYS.has(propertyName);
    }

    schemaNode = schemaNode.properties[propertyName];
    index += 2;
  }

  return false;
}

function getJsonPathValue(root: unknown, path: readonly JsonPathSegment[]): unknown {
  let current = root;
  for (const segment of path) {
    if (typeof segment === "number") {
      if (!Array.isArray(current) || segment < 0 || segment >= current.length) {
        return undefined;
      }
      current = current[segment];
      continue;
    }
    if (!isPlainRecord(current) || !hasOwn(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

function isApprovedRouteResource(value: string, endpointPath: string, apiBaseOrigin: string): boolean {
  if (value === endpointPath) {
    return true;
  }
  if (!isBoundedUtf8String(value, 1, 2_048)) {
    return false;
  }

  const canonicalAbsoluteResource = `${apiBaseOrigin}${endpointPath}`;
  if (value !== canonicalAbsoluteResource) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  if (
    parsed.origin !== apiBaseOrigin ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.search !== "" ||
    parsed.hash !== "" ||
    parsed.pathname !== endpointPath
  ) {
    return false;
  }

  return parsed.href === canonicalAbsoluteResource;
}

function isCanonicalPositiveAtomicAmount(value: unknown): value is string {
  return typeof value === "string" && /^[1-9]\d{0,77}$/.test(value);
}

function isCanonicalPositiveFixedSix(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:0|[1-9]\d{0,31})\.\d{6}$/.test(value) &&
    /[1-9]/.test(value.replace(".", ""))
  );
}

function isBoundedIdentifier(value: unknown, maxBytes: number): value is string {
  return (
    typeof value === "string" &&
    isBoundedUtf8String(value, 1, maxBytes) &&
    /^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(value)
  );
}

function isEvmAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9A-Fa-f]{40}$/.test(value);
}

function isSupportedEip155Network(value: string): boolean {
  return /^eip155:[1-9]\d{0,31}$/.test(value);
}

function isBoundedUtf8String(value: unknown, minBytes: number, maxBytes: number): value is string {
  if (typeof value !== "string") {
    return false;
  }
  const byteLength = new TextEncoder().encode(value).byteLength;
  return byteLength >= minBytes && byteLength <= maxBytes;
}

function hasExactObjectKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => hasOwn(value, key));
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.getPrototypeOf(value) === Object.prototype;
}

function jsonStructuralEqual(left: unknown, right: unknown): boolean {
  const stack: Array<[unknown, unknown]> = [[left, right]];
  let comparedMembers = 0;

  while (stack.length > 0) {
    const [leftValue, rightValue] = stack.pop()!;
    if (Object.is(leftValue, rightValue)) {
      continue;
    }

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      if (!Array.isArray(leftValue) || !Array.isArray(rightValue) || leftValue.length !== rightValue.length) {
        return false;
      }
      comparedMembers += leftValue.length;
      if (comparedMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) {
        return false;
      }
      for (let index = leftValue.length - 1; index >= 0; index -= 1) {
        stack.push([leftValue[index], rightValue[index]]);
      }
      continue;
    }

    if (!isPlainRecord(leftValue) || !isPlainRecord(rightValue)) {
      return false;
    }
    const leftKeys = Object.keys(leftValue);
    const rightKeys = Object.keys(rightValue);
    if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => !hasOwn(rightValue, key))) {
      return false;
    }
    comparedMembers += leftKeys.length;
    if (comparedMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) {
      return false;
    }
    for (let index = leftKeys.length - 1; index >= 0; index -= 1) {
      const key = leftKeys[index];
      stack.push([leftValue[key], rightValue[key]]);
    }
  }

  return true;
}

function jsonUtf8ByteLength(value: unknown): number {
  try {
    const serialized = JSON.stringify(value);
    return typeof serialized === "string"
      ? new TextEncoder().encode(serialized).byteLength
      : Number.POSITIVE_INFINITY;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

function approvedLiveHeaderNames(names: readonly string[]): string[] {
  const present = new Set(names.map((name) => name.toLowerCase()));
  return X402_CHALLENGE_HEADER_NAMES.filter((name) => present.has(name));
}

function approvedLiveTopLevelKeys(body: JsonObject | null): string[] {
  if (body === null) return [];
  return [
    ...X402_LIVE_CHALLENGE_TOP_LEVEL_BODY_KEYS,
    ...(hasOwn(body, "stocktrends_preview") ? ["stocktrends_preview"] : [])
  ];
}

function scanBoundedJsonTree(value: unknown, endpointPath?: string): JsonTreeScanResult {
  const result: JsonTreeScanResult = {
    valid: true,
    hasForbiddenMaterial: false,
    hasPaidOutput: false
  };
  let totalMembers = 0;
  const stack: Array<{ value: unknown; depth: number; path: JsonPathSegment[] }> = [
    { value, depth: 0, path: [] }
  ];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current.depth > X402_LIVE_RESPONSE_MAX_DEPTH) {
      result.valid = false;
      return result;
    }

    if (current.value === null || typeof current.value === "boolean") {
      continue;
    }
    if (typeof current.value === "number") {
      if (!Number.isFinite(current.value)) {
        result.valid = false;
        return result;
      }
      continue;
    }
    if (typeof current.value === "string") {
      if (!isBoundedUtf8String(current.value, 0, X402_LIVE_RESPONSE_MAX_STRING_BYTES)) {
        result.valid = false;
        return result;
      }
      if (hasForbiddenLiveString(current.value)) {
        result.hasForbiddenMaterial = true;
      }
      continue;
    }

    if (Array.isArray(current.value)) {
      if (current.value.length > X402_LIVE_RESPONSE_MAX_ARRAY_LENGTH) {
        result.valid = false;
        return result;
      }
      totalMembers += current.value.length;
      if (totalMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) {
        result.valid = false;
        return result;
      }
      for (let index = current.value.length - 1; index >= 0; index -= 1) {
        stack.push({
          value: current.value[index],
          depth: current.depth + 1,
          path: [...current.path, index]
        });
      }
      continue;
    }

    if (!isPlainRecord(current.value)) {
      result.valid = false;
      return result;
    }
    const entries = Object.entries(current.value);
    if (entries.length > X402_LIVE_RESPONSE_MAX_OBJECT_MEMBERS) {
      result.valid = false;
      return result;
    }
    totalMembers += entries.length;
    if (totalMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) {
      result.valid = false;
      return result;
    }

    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index];
      if (
        !isBoundedUtf8String(key, 1, 256) ||
        X402_PROTOTYPE_POLLUTION_KEYS.has(key.toLowerCase())
      ) {
        result.valid = false;
        return result;
      }
      const childPath = [...current.path, key];
      const compactKey = tokenizeIdentifier(key).join("");
      const previewOutputCandidate =
        childPath[0] === "stocktrends_preview" && X402_PREVIEW_OUTPUT_SHAPE_KEYS.has(compactKey);
      if (
        (X402_PAID_OUTPUT_SHAPE_KEYS.has(compactKey) || previewOutputCandidate) &&
        !isApprovedFullResponseBazaarOutputCarrierPath(childPath, value) &&
        !isApprovedFullResponsePreviewOutputCarrierPath(childPath, value, endpointPath)
      ) {
        result.hasPaidOutput = true;
      }
      stack.push({ value: child, depth: current.depth + 1, path: childPath });
    }
  }

  return result;
}

function isApprovedFullResponseBazaarOutputCarrierPath(
  path: readonly JsonPathSegment[],
  responseRoot: unknown
): boolean {
  if (
    path.length > 2 &&
    path[0] === "extensions" &&
    path[1] === "bazaar"
  ) {
    return classifyBazaarOutputCarrierPath(
      path.slice(1),
      getJsonPathValue(responseRoot, ["extensions"])
    ) !== "not_approved";
  }
  if (
    path.length > 3 &&
    path[0] === "payment_required" &&
    path[1] === "extensions" &&
    path[2] === "bazaar"
  ) {
    return classifyBazaarOutputCarrierPath(
      path.slice(2),
      getJsonPathValue(responseRoot, ["payment_required", "extensions"])
    ) !== "not_approved";
  }
  return false;
}

function isApprovedFullResponsePreviewOutputCarrierPath(
  path: readonly JsonPathSegment[],
  responseRoot: unknown,
  endpointPath: string | undefined
): boolean {
  if (
    endpointPath === undefined ||
    path[0] !== "stocktrends_preview" ||
    path[1] !== "example_object"
  ) {
    return false;
  }
  const contract = X402_PREVIEW_ROUTE_CONTRACTS[endpointPath];
  const actualExample = getJsonPathValue(responseRoot, ["stocktrends_preview", "example_object"]);
  if (contract === undefined || !jsonStructuralEqual(actualExample, contract.exampleObject)) {
    return false;
  }

  if (path.length === 2) {
    return true;
  }
  const expectedValue = getJsonPathValue(contract.exampleObject, path.slice(2));
  return expectedValue !== undefined && jsonStructuralEqual(
    getJsonPathValue(responseRoot, path),
    expectedValue
  );
}

function hasForbiddenLiveResponseMaterial(value: unknown): boolean {
  return scanBoundedJsonTree(value).hasForbiddenMaterial;
}

function hasForbiddenLiveString(value: string): boolean {
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
  const keys: string[] = [];
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      for (let index = current.length - 1; index >= 0; index -= 1) {
        stack.push(current[index]);
      }
      continue;
    }
    if (!isRecord(current)) {
      continue;
    }
    const entries = Object.entries(current);
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      const [key, child] = entries[index];
      keys.push(key);
      stack.push(child);
    }
  }

  return keys;
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
  const stack: unknown[] = [value];
  let visitedMembers = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === "string" && hasForbiddenProofMaterialValue(current)) {
      return true;
    }
    if (Array.isArray(current)) {
      visitedMembers += current.length;
      if (visitedMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) return true;
      stack.push(...current);
      continue;
    }
    if (isRecord(current)) {
      const entries = Object.entries(current);
      visitedMembers += entries.length;
      if (visitedMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) return true;
      for (const [key, child] of entries) {
        if (hasForbiddenProofMaterialKey(key)) {
          return true;
        }
        stack.push(child);
      }
    }
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
  const stack: unknown[] = [value];
  let visitedMembers = 0;
  while (stack.length > 0) {
    const current = stack.pop();
    if (Array.isArray(current)) {
      visitedMembers += current.length;
      if (visitedMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) return true;
      stack.push(...current);
      continue;
    }
    if (!isRecord(current)) {
      continue;
    }
    const entries = Object.entries(current);
    visitedMembers += entries.length;
    if (visitedMembers > X402_LIVE_RESPONSE_MAX_TOTAL_MEMBERS) return true;
    for (const [key, child] of entries) {
      if (hasForbiddenProofMaterialKey(key)) {
        return true;
      }
      stack.push(child);
    }
  }
  return false;
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

type JsonSafeToolInput =
  | null
  | boolean
  | number
  | string
  | JsonSafeToolInput[]
  | { [key: string]: JsonSafeToolInput };

type BoundedToolInputSnapshot =
  | { ok: true; value: JsonSafeToolInput }
  | { ok: false };

type ToolInputCloneContainer = JsonSafeToolInput[] | { [key: string]: JsonSafeToolInput };

interface ToolInputCloneTarget {
  parent: ToolInputCloneContainer | null;
  key: string | number | null;
}

type ToolInputCloneFrame =
  | {
      kind: "visit";
      value: unknown;
      depth: number;
      target: ToolInputCloneTarget;
    }
  | { kind: "leave"; value: object };

/**
 * Iteratively validates and snapshots direct-helper input before signature
 * normalization. Reflection reads data-property descriptors without invoking
 * getters; the resulting snapshot contains only bounded plain JSON values.
 */
function snapshotBoundedToolInput(value: unknown): BoundedToolInputSnapshot {
  try {
    const root: { value?: JsonSafeToolInput } = {};
    const activeAncestors = new WeakSet<object>();
    let totalMembers = 0;
    const stack: ToolInputCloneFrame[] = [
      {
        kind: "visit",
        value,
        depth: 0,
        target: { parent: null, key: null }
      }
    ];

    while (stack.length > 0) {
      const frame = stack.pop()!;
      if (frame.kind === "leave") {
        activeAncestors.delete(frame.value);
        continue;
      }

      if (frame.depth > X402_TOOL_INPUT_MAX_DEPTH) {
        return { ok: false };
      }

      const current = frame.value;
      if (current === null || typeof current === "boolean") {
        assignToolInputClone(root, frame.target, current);
        continue;
      }
      if (typeof current === "number") {
        if (!Number.isFinite(current)) return { ok: false };
        assignToolInputClone(root, frame.target, current);
        continue;
      }
      if (typeof current === "string") {
        if (!isBoundedUtf8String(current, 0, X402_TOOL_INPUT_MAX_STRING_BYTES)) {
          return { ok: false };
        }
        assignToolInputClone(root, frame.target, current);
        continue;
      }
      if (typeof current !== "object") {
        return { ok: false };
      }

      if (activeAncestors.has(current)) {
        return { ok: false };
      }

      if (Array.isArray(current)) {
        if (
          Object.getPrototypeOf(current) !== Array.prototype ||
          current.length > X402_TOOL_INPUT_MAX_ARRAY_LENGTH
        ) {
          return { ok: false };
        }

        const ownKeys = Reflect.ownKeys(current);
        if (
          ownKeys.some((key) => typeof key === "symbol") ||
          ownKeys.length !== current.length + 1 ||
          !ownKeys.includes("length")
        ) {
          return { ok: false };
        }

        const childValues: unknown[] = [];
        for (let index = 0; index < current.length; index += 1) {
          const descriptor = Object.getOwnPropertyDescriptor(current, String(index));
          if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
            return { ok: false };
          }
          childValues.push(descriptor.value);
        }
        if (
          ownKeys.some(
            (key) =>
              typeof key === "string" &&
              key !== "length" &&
              (!/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= current.length)
          )
        ) {
          return { ok: false };
        }

        totalMembers += current.length;
        if (totalMembers > X402_TOOL_INPUT_MAX_TOTAL_MEMBERS) {
          return { ok: false };
        }

        const clone: JsonSafeToolInput[] = new Array(current.length);
        assignToolInputClone(root, frame.target, clone);
        activeAncestors.add(current);
        stack.push({ kind: "leave", value: current });
        for (let index = childValues.length - 1; index >= 0; index -= 1) {
          stack.push({
            kind: "visit",
            value: childValues[index],
            depth: frame.depth + 1,
            target: { parent: clone, key: index }
          });
        }
        continue;
      }

      if (Object.getPrototypeOf(current) !== Object.prototype) {
        return { ok: false };
      }

      const ownKeys = Reflect.ownKeys(current);
      if (
        ownKeys.some((key) => typeof key === "symbol") ||
        ownKeys.length > X402_TOOL_INPUT_MAX_OBJECT_MEMBERS
      ) {
        return { ok: false };
      }

      const entries: Array<[string, unknown]> = [];
      for (const ownKey of ownKeys) {
        if (
          typeof ownKey !== "string" ||
          !isBoundedUtf8String(ownKey, 0, X402_TOOL_INPUT_MAX_STRING_BYTES)
        ) {
          return { ok: false };
        }
        const descriptor = Object.getOwnPropertyDescriptor(current, ownKey);
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          return { ok: false };
        }
        entries.push([ownKey, descriptor.value]);
      }

      totalMembers += entries.length;
      if (totalMembers > X402_TOOL_INPUT_MAX_TOTAL_MEMBERS) {
        return { ok: false };
      }

      const clone: { [key: string]: JsonSafeToolInput } = {};
      assignToolInputClone(root, frame.target, clone);
      activeAncestors.add(current);
      stack.push({ kind: "leave", value: current });
      for (let index = entries.length - 1; index >= 0; index -= 1) {
        const [key, child] = entries[index];
        stack.push({
          kind: "visit",
          value: child,
          depth: frame.depth + 1,
          target: { parent: clone, key }
        });
      }
    }

    return Object.prototype.hasOwnProperty.call(root, "value")
      ? { ok: true, value: root.value! }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

function assignToolInputClone(
  root: { value?: JsonSafeToolInput },
  target: ToolInputCloneTarget,
  value: JsonSafeToolInput
): void {
  if (target.parent === null) {
    root.value = value;
    return;
  }
  if (Array.isArray(target.parent)) {
    if (typeof target.key !== "number") throw new Error("invalid tool-input clone target");
    target.parent[target.key] = value;
    return;
  }
  if (typeof target.key !== "string") throw new Error("invalid tool-input clone target");
  Object.defineProperty(target.parent, target.key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function buildChallengeSignature(
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod },
  toolInput: JsonSafeToolInput
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
    case "x402_tool_input_invalid":
      return "The x402 tool input was not bounded JSON-safe data. No reservation, request, retry, fallback, or second route occurred.";
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
    case "x402_live_challenge_header_missing":
      return "The API-authored 402 response omitted the authoritative Payment-Required header. No challenge values were returned.";
    case "x402_live_challenge_header_invalid":
      return "The API-authored Payment-Required header was malformed or oversized. No header or challenge values were returned.";
    case "x402_live_challenge_header_shape_not_approved":
      return "The decoded Payment-Required header was not an approved bounded JSON object. No decoded or challenge values were returned.";
    case "x402_live_challenge_header_body_mismatch":
      return "The Payment-Required header and response-body requirements were structurally inconsistent. No divergent path or value was returned.";
    case "x402_live_challenge_network_unsupported":
      return "The API-authored 402 response used an unsupported payment network family. No challenge values were returned.";
    case "x402_live_challenge_prohibited_material":
      return "The API-authored 402 response contained prohibited proof, authorization, secret, or payment-override material. No challenge values were returned.";
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
    case "x402_tool_input_invalid":
      return "The x402 tool input was not bounded JSON-safe data. No reservation, request, retry, fallback, or second route occurred.";
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
    case "x402_live_challenge_header_missing":
      return "The live no-key x402 challenge response omitted the authoritative Payment-Required header.";
    case "x402_live_challenge_header_invalid":
      return "The live no-key x402 Payment-Required header was malformed or oversized.";
    case "x402_live_challenge_header_shape_not_approved":
      return "The decoded live no-key x402 Payment-Required header was not an approved bounded JSON object.";
    case "x402_live_challenge_header_body_mismatch":
      return "The live no-key x402 Payment-Required header and body requirements did not match.";
    case "x402_live_challenge_network_unsupported":
      return "The live no-key x402 challenge used an unsupported payment network family.";
    case "x402_live_challenge_prohibited_material":
      return "The live no-key x402 challenge contained prohibited material.";
    case "x402_live_challenge_paid_output_without_proof":
      return "The no-proof request returned success or paid-data-shaped output, which was discarded.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
