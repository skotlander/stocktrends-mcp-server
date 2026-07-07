import type { StockTrendsMcpConfig, StockTrendsMcpLogLevel } from "./config.js";
import { StockTrendsMcpError } from "./errors.js";

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

const LEVEL_WEIGHT: Record<Exclude<StockTrendsMcpLogLevel, "silent">, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export function createLogger(config: Pick<StockTrendsMcpConfig, "logLevel">): Logger {
  return {
    debug: (message) => write("debug", message, config.logLevel),
    info: (message) => write("info", message, config.logLevel),
    warn: (message) => write("warn", message, config.logLevel),
    error: (message) => write("error", message, config.logLevel)
  };
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof StockTrendsMcpError) {
    return `${error.errorCode}: ${error.message}`;
  }

  if (error instanceof Error) {
    return `startup_error: ${error.message}`;
  }

  return "startup_error: Unknown startup failure.";
}

function write(level: Exclude<StockTrendsMcpLogLevel, "silent">, message: string, configuredLevel: StockTrendsMcpLogLevel): void {
  if (configuredLevel === "silent") {
    return;
  }

  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configuredLevel]) {
    return;
  }

  console.error(`[stocktrends-mcp] ${level}: ${message}`);
}
