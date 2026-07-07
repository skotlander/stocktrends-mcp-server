import { describe, expect, it, vi } from "vitest";
import { parseConfig } from "../src/config.js";
import { StockTrendsMcpError } from "../src/errors.js";
import { StockTrendsClient, type FetchLike } from "../src/stocktrendsClient.js";
import { jsonResponse, textResponse } from "./helpers.js";

describe("StockTrendsClient", () => {
  it("constructs public API URLs under the configured base URL", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const client = new StockTrendsClient(
      parseConfig({
        STOCKTRENDS_API_BASE_URL: "https://staging.stocktrends.com"
      }),
      fetchFn
    );

    await client.fetchJson({
      endpointPath: "/v1/openapi.json",
      resourceUri: "stocktrends://api/openapi"
    });

    expect(String(fetchFn.mock.calls[0]?.[0])).toBe("https://staging.stocktrends.com/v1/openapi.json");
  });

  it("does not send API keys, authorization headers, or secret headers for public resources", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const client = new StockTrendsClient(
      parseConfig({
        STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
        STOCKTRENDS_API_KEY: "phase3-public-resource-must-not-send-this"
      }),
      fetchFn
    );

    await client.fetchJson({
      endpointPath: "/v1/ai/tools",
      resourceUri: "stocktrends://ai/tools"
    });

    const init = fetchFn.mock.calls[0]?.[1];
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "User-Agent": "stocktrends-mcp-server/1.0"
    });
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("api-key");
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("authorization");
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("secret");
  });

  it("rejects unsafe endpoint paths", () => {
    const client = new StockTrendsClient(parseConfig({}), vi.fn<FetchLike>());

    expect(() => client.buildUrl("https://evil.example/v1/openapi.json")).toThrow(StockTrendsMcpError);
    expect(() => client.buildUrl("//evil.example/v1/openapi.json")).toThrow(StockTrendsMcpError);
  });

  it.each([
    [401, "unexpected_auth_required"],
    [402, "unexpected_paid_endpoint"],
    [403, "unexpected_forbidden"],
    [404, "api_not_found"],
    [429, "api_rate_limited"],
    [503, "api_unavailable"]
  ])("maps HTTP %i to deterministic fail-closed errors", async (status, errorCode) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ error: "safe" }, status));
    const client = new StockTrendsClient(parseConfig({}), fetchFn);

    await expect(
      client.fetchJson({
        endpointPath: "/v1/openapi.json",
        resourceUri: "stocktrends://api/openapi"
      })
    ).rejects.toMatchObject({
      errorCode
    });
  });

  it("fails closed on redirects", async () => {
    const fetchFn = vi.fn<FetchLike>(
      async () =>
        new Response("", {
          status: 302,
          headers: {
            location: "https://example.com"
          }
        })
    );
    const client = new StockTrendsClient(parseConfig({}), fetchFn);

    await expect(
      client.fetchJson({
        endpointPath: "/v1/openapi.json",
        resourceUri: "stocktrends://api/openapi"
      })
    ).rejects.toMatchObject({
      errorCode: "api_unapproved_redirect"
    });
  });

  it("maps network failures and timeouts without exposing raw stack traces", async () => {
    const unavailableFetch = vi.fn<FetchLike>(async () => {
      throw new TypeError("getaddrinfo ENOTFOUND api.stocktrends.com");
    });
    const timeoutFetch = vi.fn<FetchLike>(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });

    await expect(new StockTrendsClient(parseConfig({}), unavailableFetch).fetchJson({ endpointPath: "/v1/openapi.json" })).rejects.toMatchObject({
      errorCode: "api_unavailable",
      message: "Stock Trends API is unavailable for this public resource."
    });

    await expect(new StockTrendsClient(parseConfig({}), timeoutFetch).fetchJson({ endpointPath: "/v1/openapi.json" })).rejects.toMatchObject({
      errorCode: "timeout",
      message: "Timed out fetching Stock Trends public resource."
    });
  });

  it("fails closed on non-JSON and malformed JSON responses", async () => {
    const nonJsonClient = new StockTrendsClient(
      parseConfig({}),
      vi.fn<FetchLike>(async () => textResponse("ok", 200, { "content-type": "text/plain" }))
    );
    const malformedClient = new StockTrendsClient(
      parseConfig({}),
      vi.fn<FetchLike>(async () => textResponse("{", 200, { "content-type": "application/json" }))
    );

    await expect(nonJsonClient.fetchJson({ endpointPath: "/v1/openapi.json" })).rejects.toMatchObject({
      errorCode: "malformed_api_response"
    });
    await expect(malformedClient.fetchJson({ endpointPath: "/v1/openapi.json" })).rejects.toMatchObject({
      errorCode: "malformed_api_response"
    });
  });
});
