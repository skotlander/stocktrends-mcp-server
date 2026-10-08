import { StockTrendsMcpError } from "./errors.js";
import {
  createPaidToolsConfig,
  DEFAULT_PAID_SPEND_POLICY,
  type PaidSpendPolicy,
  type PaidToolsConfig
} from "./paidPolicy.js";
import { parseX402RelayConfig, type X402RelayConfig } from "./x402Relay.js";

export const DEFAULT_API_BASE_URL = "https://api.stocktrends.com";
export const DEFAULT_LOG_LEVEL = "warn";
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export type StockTrendsMcpTransport = "stdio" | "streamable-http";
export type StockTrendsMcpLogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface StreamableHttpConfig {
  bindAddress: string;
  port: number;
  allowedHosts?: readonly string[];
  allowedOrigins?: readonly string[];
}

export interface StockTrendsMcpConfig {
  apiBaseUrl: URL;
  transport: StockTrendsMcpTransport;
  logLevel: StockTrendsMcpLogLevel;
  requestTimeoutMs: number;
  paidTools: PaidToolsConfig;
  x402Relay: X402RelayConfig;
  http?: StreamableHttpConfig;
}

export type Env = Record<string, string | undefined>;

const LOG_LEVELS = new Set<StockTrendsMcpLogLevel>(["debug", "info", "warn", "error", "silent"]);

export function parseConfig(env: Env = process.env): StockTrendsMcpConfig {
  const transport = parseTransport(env.STOCKTRENDS_MCP_TRANSPORT);
  const apiBaseUrl = parseApiBaseUrl(env.STOCKTRENDS_API_BASE_URL);
  const logLevel = parseLogLevel(env.STOCKTRENDS_MCP_LOG_LEVEL);
  const paidToolsRequested = parsePaidToolsEnabled(env.STOCKTRENDS_ENABLE_PAID_TOOLS, "STOCKTRENDS_ENABLE_PAID_TOOLS");
  const x402Relay = parseX402RelayConfig(env, { paidToolsRequested });
  const paidTools = parsePaidToolsConfig(env, paidToolsRequested);

  const config: StockTrendsMcpConfig = {
    apiBaseUrl,
    transport,
    logLevel,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    paidTools,
    x402Relay
  };

  if (transport === "streamable-http") {
    config.http = parseStreamableHttpConfig(env);
    assertStreamableHttpSafe(env, config);
  }

  return config;
}

function parseTransport(value: string | undefined): StockTrendsMcpTransport {
  const transport = normalize(value, "stdio");

  if (transport !== "stdio" && transport !== "streamable-http") {
    throw new StockTrendsMcpError("unsupported_transport", {
      detail: "Set STOCKTRENDS_MCP_TRANSPORT=stdio or streamable-http."
    });
  }

  return transport;
}

function parseStreamableHttpConfig(env: Env): StreamableHttpConfig {
  const bindAddress = normalize(env.STOCKTRENDS_MCP_HTTP_BIND_ADDRESS, "127.0.0.1");
  if (!bindAddress || /\s/.test(bindAddress)) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_MCP_HTTP_BIND_ADDRESS must be a non-empty hostname or IP address without whitespace."
    });
  }

  const port = parsePort(env.STOCKTRENDS_MCP_HTTP_PORT);
  const allowedHosts = parseHttpAllowlist(env.STOCKTRENDS_MCP_HTTP_ALLOWED_HOSTS, "STOCKTRENDS_MCP_HTTP_ALLOWED_HOSTS");
  const allowedOrigins = parseHttpAllowlist(env.STOCKTRENDS_MCP_HTTP_ALLOWED_ORIGINS, "STOCKTRENDS_MCP_HTTP_ALLOWED_ORIGINS");
  const loopbackBind = bindAddress === "127.0.0.1" || bindAddress === "localhost" || bindAddress === "::1";

  if (!loopbackBind && !allowedHosts) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_MCP_HTTP_ALLOWED_HOSTS is required when STOCKTRENDS_MCP_HTTP_BIND_ADDRESS is not loopback."
    });
  }

  return Object.freeze({ bindAddress, port, allowedHosts, allowedOrigins });
}

function parsePort(value: string | undefined): number {
  const raw = normalize(value, "3000");
  if (!/^\d+$/.test(raw)) {
    throw new StockTrendsMcpError("invalid_config", { detail: "STOCKTRENDS_MCP_HTTP_PORT must be an integer from 1 to 65535." });
  }
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new StockTrendsMcpError("invalid_config", { detail: "STOCKTRENDS_MCP_HTTP_PORT must be an integer from 1 to 65535." });
  }
  return port;
}

function parseHttpAllowlist(value: string | undefined, variableName: string): readonly string[] | undefined {
  if (value === undefined || !value.trim()) return undefined;
  const values = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!values.length || values.some((entry) => entry.includes("*") || /\s/.test(entry))) {
    throw new StockTrendsMcpError("invalid_config", { detail: `${variableName} must be a comma-separated, non-wildcard hostname allowlist.` });
  }
  return Object.freeze([...new Set(values)]);
}

// This is deliberately limited to the credential/payment execution controls
// that exist in this revision. Future controls must be added here explicitly.
export function assertStreamableHttpConfigSafe(config: StockTrendsMcpConfig): void {
  const paidConfigured =
    config.paidTools.requested ||
    config.paidTools.apiKeyConfigured ||
    Boolean(config.paidTools.apiKey?.trim()) ||
    config.paidTools.executionEnabled;
  const x402Configured =
    config.x402Relay.relayEnabled ||
    config.x402Relay.challengeExecutionEnabled ||
    config.x402Relay.liveChallengeEnabled ||
    config.x402Relay.proofForwardingEnabled;

  if (paidConfigured || x402Configured) {
    throw new StockTrendsMcpError("remote_transport_incompatible_config", {
      detail: "streamable-http permits only credential-free public resources and workflow planning; disable current paid, API-key, and x402 configuration before startup."
    });
  }
}

// Environment checks retain the current flags that intentionally are not all
// represented by a free-only parsed configuration. Programmatic callers must
// independently pass assertStreamableHttpConfigSafe at the HTTP boundary.
export function assertStreamableHttpSafe(env: Env, config: StockTrendsMcpConfig): void {
  assertStreamableHttpConfigSafe(config);

  const apiKeyConfigured = Boolean(env.STOCKTRENDS_API_KEY?.trim());
  const paidExecutionRequested = isLiteralTrue(env.STOCKTRENDS_ENABLE_PAID_EXECUTION);
  const x402Configured =
    isLiteralTrue(env.STOCKTRENDS_ENABLE_X402_CHALLENGE_EXECUTION) ||
    isLiteralTrue(env.STOCKTRENDS_ENABLE_X402_LIVE_CHALLENGE_RELAY) ||
    isLiteralTrue(env.STOCKTRENDS_ENABLE_X402_PROOF_FORWARDING);

  if (apiKeyConfigured || paidExecutionRequested || x402Configured) {
    throw new StockTrendsMcpError("remote_transport_incompatible_config", {
      detail: "streamable-http permits only credential-free public resources and workflow planning; disable current paid, API-key, and x402 configuration before startup."
    });
  }
}

function isLiteralTrue(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

function parseLogLevel(value: string | undefined): StockTrendsMcpLogLevel {
  const logLevel = normalize(value, DEFAULT_LOG_LEVEL);

  if (!LOG_LEVELS.has(logLevel as StockTrendsMcpLogLevel)) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_MCP_LOG_LEVEL must be debug, info, warn, error, or silent."
    });
  }

  return logLevel as StockTrendsMcpLogLevel;
}

function parseApiBaseUrl(value: string | undefined): URL {
  const raw = normalize(value, DEFAULT_API_BASE_URL);
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_API_BASE_URL must be a valid HTTPS URL."
    });
  }

  if (url.protocol !== "https:") {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_API_BASE_URL must use HTTPS."
    });
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_API_BASE_URL must not include credentials, query, or fragment."
    });
  }

  if (url.pathname !== "/" && url.pathname !== "") {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_API_BASE_URL must be an origin, not a route."
    });
  }

  if (!isAllowedStockTrendsOrigin(url)) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: "STOCKTRENDS_API_BASE_URL must be api.stocktrends.com or another Stock Trends HTTPS origin."
    });
  }

  return new URL(url.origin);
}

function parsePaidToolsConfig(env: Env, paidToolsRequested: boolean): PaidToolsConfig {
  if (!paidToolsRequested) {
    return createPaidToolsConfig({
      requested: false,
      status: "disabled"
    });
  }

  const spendPolicy = parsePaidSpendPolicy(env);
  const requirePricingPreflight = parseRequirePricingPreflight(env.STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT);
  const executionRequested = parsePaidToolsEnabled(env.STOCKTRENDS_ENABLE_PAID_EXECUTION, "STOCKTRENDS_ENABLE_PAID_EXECUTION");
  const apiKey = env.STOCKTRENDS_API_KEY?.trim();

  if (!apiKey) {
    // Paid-tools flag (and any execution flag) without a key: blocked. Execution
    // is impossible; the key is never read for tool registration.
    return createPaidToolsConfig({
      requested: true,
      status: "blocked_missing_api_key",
      spendPolicy,
      executionEnabled: false,
      requirePricingPreflight
    });
  }

  return createPaidToolsConfig({
    requested: true,
    apiKey,
    status: executionRequested ? "configured_execution_enabled" : "configured_foundation_no_execution",
    spendPolicy,
    executionEnabled: executionRequested,
    requirePricingPreflight
  });
}

function parseRequirePricingPreflight(value: string | undefined): boolean {
  const raw = value?.trim().toLowerCase();

  // Default (and unset) is the required posture: true.
  if (!raw || raw === "true" || raw === "1" || raw === "yes" || raw === "on") {
    return true;
  }

  if (raw === "false" || raw === "0" || raw === "no" || raw === "off") {
    return false;
  }

  throw new StockTrendsMcpError("invalid_config", {
    detail: "STOCKTRENDS_REQUIRE_PRICING_PREFLIGHT must be true, false, 1, 0, yes, no, on, or off."
  });
}

function parsePaidToolsEnabled(value: string | undefined, variableName: string): boolean {
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
    detail: `${variableName} must be true, false, 0, no, or off.`
  });
}

function parsePaidSpendPolicy(env: Env): PaidSpendPolicy {
  return {
    ...DEFAULT_PAID_SPEND_POLICY,
    maxPaidCallsPerSession: parseNonNegativeInteger(env.STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION, "STOCKTRENDS_MAX_PAID_CALLS_PER_SESSION"),
    maxPaidCallsPerTool: parseNonNegativeInteger(env.STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL, "STOCKTRENDS_MAX_PAID_CALLS_PER_TOOL"),
    maxStcPerSession: parseOptionalNonNegativeNumber(env.STOCKTRENDS_MAX_STC_PER_SESSION, "STOCKTRENDS_MAX_STC_PER_SESSION"),
    maxUsdPerSession: parseOptionalNonNegativeNumber(env.STOCKTRENDS_MAX_USD_PER_SESSION, "STOCKTRENDS_MAX_USD_PER_SESSION")
  };
}

function parseNonNegativeInteger(value: string | undefined, variableName: string): number {
  const raw = value?.trim();

  if (!raw) {
    return 0;
  }

  if (!/^\d+$/.test(raw)) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: `${variableName} must be a non-negative integer.`
    });
  }

  const parsed = Number(raw);

  if (!Number.isSafeInteger(parsed)) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: `${variableName} must be a safe non-negative integer.`
    });
  }

  return parsed;
}

function parseOptionalNonNegativeNumber(value: string | undefined, variableName: string): number | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new StockTrendsMcpError("invalid_config", {
      detail: `${variableName} must be a non-negative number.`
    });
  }

  return parsed;
}

function isAllowedStockTrendsOrigin(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === "api.stocktrends.com" || hostname.endsWith(".stocktrends.com");
}

function normalize(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : fallback;
}
