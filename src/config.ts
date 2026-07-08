import { StockTrendsMcpError } from "./errors.js";
import {
  createPaidToolsConfig,
  DEFAULT_PAID_SPEND_POLICY,
  type PaidSpendPolicy,
  type PaidToolsConfig
} from "./paidPolicy.js";

export const DEFAULT_API_BASE_URL = "https://api.stocktrends.com";
export const DEFAULT_LOG_LEVEL = "warn";
export const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export type StockTrendsMcpTransport = "stdio";
export type StockTrendsMcpLogLevel = "debug" | "info" | "warn" | "error" | "silent";

export interface StockTrendsMcpConfig {
  apiBaseUrl: URL;
  transport: StockTrendsMcpTransport;
  logLevel: StockTrendsMcpLogLevel;
  requestTimeoutMs: number;
  paidTools: PaidToolsConfig;
}

export type Env = Record<string, string | undefined>;

const LOG_LEVELS = new Set<StockTrendsMcpLogLevel>(["debug", "info", "warn", "error", "silent"]);

export function parseConfig(env: Env = process.env): StockTrendsMcpConfig {
  const transport = parseTransport(env.STOCKTRENDS_MCP_TRANSPORT);
  const apiBaseUrl = parseApiBaseUrl(env.STOCKTRENDS_API_BASE_URL);
  const logLevel = parseLogLevel(env.STOCKTRENDS_MCP_LOG_LEVEL);
  const paidTools = parsePaidToolsConfig(env);

  return {
    apiBaseUrl,
    transport,
    logLevel,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS,
    paidTools
  };
}

function parseTransport(value: string | undefined): StockTrendsMcpTransport {
  const transport = normalize(value, "stdio");

  if (transport !== "stdio") {
    throw new StockTrendsMcpError("unsupported_transport", {
      detail: "Set STOCKTRENDS_MCP_TRANSPORT=stdio."
    });
  }

  return "stdio";
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

function parsePaidToolsConfig(env: Env): PaidToolsConfig {
  const paidToolsRequested = parsePaidToolsEnabled(env.STOCKTRENDS_ENABLE_PAID_TOOLS);

  if (!paidToolsRequested) {
    return createPaidToolsConfig({
      requested: false,
      status: "disabled"
    });
  }

  const spendPolicy = parsePaidSpendPolicy(env);
  const apiKey = env.STOCKTRENDS_API_KEY?.trim();

  if (!apiKey) {
    return createPaidToolsConfig({
      requested: true,
      status: "blocked_missing_api_key",
      spendPolicy
    });
  }

  return createPaidToolsConfig({
    requested: true,
    apiKey,
    status: "configured_foundation_no_execution",
    spendPolicy
  });
}

function parsePaidToolsEnabled(value: string | undefined): boolean {
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
    detail: "STOCKTRENDS_ENABLE_PAID_TOOLS must be true, false, 0, no, or off."
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
