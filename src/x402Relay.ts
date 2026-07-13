import { StockTrendsMcpError } from "./errors.js";
import { AUTH_CAPABLE_PAID_ENDPOINT_POLICIES, type PaidHttpMethod } from "./paidPolicy.js";
import type { JsonObject } from "./stocktrendsClient.js";

export const STOCKTRENDS_ENABLE_X402_RELAY = "STOCKTRENDS_ENABLE_X402_RELAY";
export const STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION = "STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION";
export const STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING = "STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING";

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

export type X402RelayMode = "disabled" | "relay_enabled_challenge_disabled" | "mock_challenge_enabled";

export interface X402RelayConfig {
  relayEnabled: boolean;
  challengeExecutionEnabled: boolean;
  proofForwardingEnabled: false;
  mockOnly: true;
  mode: X402RelayMode;
}

export type X402RelayErrorCode =
  | "x402_relay_disabled"
  | "x402_payment_required"
  | "x402_challenge_unavailable"
  | "x402_challenge_unexpected_shape"
  | "x402_proof_forwarding_not_enabled"
  | "x402_proof_invalid_shape"
  | "x402_route_not_allowlisted"
  | "x402_mixed_mode_invalid"
  | "x402_paid_output_without_proof"
  | "x402_secret_safety_violation";

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
  public_tool_wiring: "not_exposed";
  paid_execution_occurred: false;
  api_request_sent: false;
  auth_header_sent: false;
  payment_header_sent: false;
  proof_forwarded: false;
  spend_occurred: false;
  paid_api_data_returned: false;
  automatic_paid_retries: false;
  repeated_identical_policy: "deferred_until_public_tool_wiring_no_fetch_or_spend";
}

export interface X402PaymentRequiredResult {
  status: "payment_required";
  error_code: "x402_payment_required";
  api_status: 402;
  tool_name: string;
  endpoint_path: string;
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
}

export type X402ChallengeRelayResult = X402PaymentRequiredResult | X402RelayErrorResult;

export function parseX402RelayConfig(
  env: Record<string, string | undefined>,
  options: { paidToolsRequested: boolean }
): X402RelayConfig {
  const relayEnabled = parseX402StrictBooleanFlag(env[STOCKTRENDS_ENABLE_X402_RELAY], STOCKTRENDS_ENABLE_X402_RELAY);
  const challengeExecutionEnabled = parseX402StrictBooleanFlag(
    env[STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION],
    STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION
  );
  parseX402ProofForwardingFlag(env[STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING]);

  if (challengeExecutionEnabled && !relayEnabled) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: `${STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION}=true requires ${STOCKTRENDS_ENABLE_X402_RELAY}=true.`,
      denialReason: "x402_relay_disabled"
    });
  }

  if (challengeExecutionEnabled && options.paidToolsRequested) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "x402 challenge execution cannot be combined with STOCKTRENDS_ENABLE_PAID_TOOLS in this mock-only build.",
      denialReason: "x402_mixed_mode_invalid"
    });
  }

  return Object.freeze({
    relayEnabled,
    challengeExecutionEnabled,
    proofForwardingEnabled: false,
    mockOnly: true,
    mode: challengeExecutionEnabled ? "mock_challenge_enabled" : relayEnabled ? "relay_enabled_challenge_disabled" : "disabled"
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
  fixture: X402MockChallengeFixture = createMockX402ChallengeFixture(request.endpointPath)
): X402ChallengeRelayResult {
  const normalizedRequest = normalizeRequest(request);

  if (!config.relayEnabled) {
    return failClosed(config, normalizedRequest, "x402_relay_disabled");
  }

  if (!config.challengeExecutionEnabled) {
    return failClosed(config, normalizedRequest, "x402_challenge_unavailable");
  }

  if (!isX402RouteAllowlisted(normalizedRequest.endpointPath) || normalizedRequest.httpMethod !== "GET") {
    return failClosed(config, normalizedRequest, "x402_route_not_allowlisted");
  }

  if (hasProofLikeInput(request)) {
    return failClosed(config, normalizedRequest, "x402_proof_forwarding_not_enabled");
  }

  if (hasForbiddenProofMaterialKey(fixture.body)) {
    return failClosed(config, normalizedRequest, "x402_secret_safety_violation");
  }

  if (fixture.status >= 200 && fixture.status < 300) {
    return failClosed(config, normalizedRequest, "x402_paid_output_without_proof");
  }

  if (fixture.status !== 402) {
    return failClosed(config, normalizedRequest, "x402_challenge_unavailable");
  }

  if (hasPaidOutputWithoutProof(fixture.body)) {
    return failClosed(config, normalizedRequest, "x402_paid_output_without_proof");
  }

  const shape = normalizeChallengeShape(fixture);
  if (!shape.ok) {
    return failClosed(config, normalizedRequest, "x402_challenge_unexpected_shape");
  }

  return {
    status: "payment_required",
    error_code: "x402_payment_required",
    api_status: 402,
    tool_name: normalizedRequest.toolName,
    endpoint_path: normalizedRequest.endpointPath,
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
    mcp_metadata: safetyMetadata(config, normalizedRequest),
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false
  };
}

export function isX402RouteAllowlisted(endpointPath: string): boolean {
  return X402_CHALLENGE_RELAY_ROUTE_ALLOWLIST.includes(endpointPath);
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
      detail: `${STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING}=true is not supported in this mock-only build.`,
      denialReason: "x402_proof_forwarding_not_enabled"
    });
  }

  throw new StockTrendsMcpError("invalid_config", {
    detail: `${STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING} must be false, 0, no, or off in this mock-only build.`
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

  if (!X402_CHALLENGE_HEADER_NAMES.every((name) => headerNames.has(name))) {
    return { ok: false };
  }

  if (!X402_CHALLENGE_TOP_LEVEL_BODY_KEYS.every((key) => bodyKeys.has(key))) {
    return { ok: false };
  }

  if (!X402_CHALLENGE_FIELD_CATEGORIES.every((category) => fieldCategories.has(category))) {
    return { ok: false };
  }

  return { ok: true };
}

function detectFieldCategories(value: unknown): Set<string> {
  const categories = new Set<string>();

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
  }

  return categories;
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

function hasForbiddenProofMaterialKey(value: unknown): boolean {
  return collectKeys(value).some((key) =>
    [
      "proof",
      "payment_proof",
      "payment-proof",
      "x402_proof",
      "x402-proof",
      "payment_signature",
      "payment-signature",
      "x_payment",
      "x-payment",
      "wallet_private_key",
      "private_key",
      "seed_phrase"
    ].includes(key.toLowerCase())
  );
}

function hasPaidOutputWithoutProof(body: JsonObject): boolean {
  return body.api_data !== undefined || body.data !== undefined || body.results !== undefined || body.rows !== undefined;
}

function failClosed(
  config: X402RelayConfig,
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod },
  errorCode: Exclude<X402RelayErrorCode, "x402_payment_required">
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
    mcp_metadata: safetyMetadata(config, request),
    paid_execution_authorized: false,
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false
  };
}

function safetyMetadata(
  config: X402RelayConfig,
  request: Required<Pick<X402ChallengeRelayRequest, "toolName" | "endpointPath">> & { httpMethod: PaidHttpMethod }
): X402ChallengeRelayMetadata {
  return {
    tool_name: request.toolName,
    endpoint_path: request.endpointPath,
    http_method: request.httpMethod,
    relay_mode: config.mode,
    mock_only: true,
    public_tool_wiring: "not_exposed",
    paid_execution_occurred: false,
    api_request_sent: false,
    auth_header_sent: false,
    payment_header_sent: false,
    proof_forwarded: false,
    spend_occurred: false,
    paid_api_data_returned: false,
    automatic_paid_retries: false,
    repeated_identical_policy: "deferred_until_public_tool_wiring_no_fetch_or_spend"
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
    case "x402_proof_forwarding_not_enabled":
      return "x402 proof forwarding is not enabled in this mock-only build. No proof was forwarded.";
    case "x402_proof_invalid_shape":
      return "The x402 proof input shape is invalid and proof forwarding is not enabled. No proof was forwarded.";
    case "x402_route_not_allowlisted":
      return "The endpoint is outside the nine-route x402 relay allowlist. No request was sent.";
    case "x402_mixed_mode_invalid":
      return "API-key paid mode and x402 challenge execution cannot be combined in this mock-only build.";
    case "x402_paid_output_without_proof":
      return "Paid API data appeared without proof. The result failed closed and no paid data was returned.";
    case "x402_secret_safety_violation":
      return "Proof or payment-like material appeared where only mock challenge shape is allowed. The result failed closed.";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
