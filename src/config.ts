import { StockTrendsMcpError } from "./errors.js";

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
}

export type Env = Record<string, string | undefined>;

const LOG_LEVELS = new Set<StockTrendsMcpLogLevel>(["debug", "info", "warn", "error", "silent"]);

export function parseConfig(env: Env = process.env): StockTrendsMcpConfig {
  const transport = parseTransport(env.STOCKTRENDS_MCP_TRANSPORT);
  const apiBaseUrl = parseApiBaseUrl(env.STOCKTRENDS_API_BASE_URL);
  const logLevel = parseLogLevel(env.STOCKTRENDS_MCP_LOG_LEVEL);

  return {
    apiBaseUrl,
    transport,
    logLevel,
    requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS
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

function isAllowedStockTrendsOrigin(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return hostname === "api.stocktrends.com" || hostname.endsWith(".stocktrends.com");
}

function normalize(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : fallback;
}
