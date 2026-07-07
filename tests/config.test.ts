import { describe, expect, it } from "vitest";
import { DEFAULT_API_BASE_URL, parseConfig } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";

describe("config", () => {
  it("uses Phase 1 defaults", () => {
    const config = parseConfig({});

    expect(config.apiBaseUrl.href).toBe(`${DEFAULT_API_BASE_URL}/`);
    expect(config.transport).toBe("stdio");
    expect(config.logLevel).toBe("warn");
    expect(config.requestTimeoutMs).toBe(10_000);
  });

  it("supports a configured Stock Trends API base URL", () => {
    const config = parseConfig({
      STOCKTRENDS_API_BASE_URL: "https://staging.stocktrends.com",
      STOCKTRENDS_MCP_TRANSPORT: "stdio"
    });

    expect(config.apiBaseUrl.href).toBe("https://staging.stocktrends.com/");
  });

  it("does not require or parse an API key for Phase 1", () => {
    const config = parseConfig({
      STOCKTRENDS_API_KEY: "not-used-by-phase-1"
    });

    expect(config.transport).toBe("stdio");
  });

  it("rejects unsupported transports", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_MCP_TRANSPORT: "streamable-http"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("rejects arbitrary API origins", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://example.com"
      })
    ).toThrow(StockTrendsMcpError);
  });

  it("rejects base URLs with credentials or routes", () => {
    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://user:pass@api.stocktrends.com"
      })
    ).toThrow(StockTrendsMcpError);

    expect(() =>
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://api.stocktrends.com/v1"
      })
    ).toThrow(StockTrendsMcpError);
  });
});
