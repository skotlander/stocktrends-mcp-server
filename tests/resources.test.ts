import { describe, expect, it, vi } from "vitest";
import {
  EXCLUDED_PHASE1_RESOURCE_CANDIDATES,
  listPublicResourceUris,
  PHASE1_PROHIBITED_ENDPOINTS,
  PHASE1_PUBLIC_RESOURCES
} from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { connectMcp, jsonResponse } from "./helpers.js";

describe("Phase 1 resources", () => {
  it("registers only the verified public Phase 1 resource URIs", () => {
    expect(listPublicResourceUris()).toEqual([
      "stocktrends://api/openapi",
      "stocktrends://ai/context",
      "stocktrends://ai/tools",
      "stocktrends://workflows",
      "stocktrends://methodology/stim"
    ]);
  });

  it("does not register paid or prohibited endpoints", () => {
    const registeredEndpoints = PHASE1_PUBLIC_RESOURCES.map((resource) => resource.endpointPath);

    for (const endpoint of PHASE1_PROHIBITED_ENDPOINTS) {
      expect(registeredEndpoints).not.toContain(endpoint);
    }
  });

  it("documents unverified intelligence candidate exclusions", () => {
    expect(EXCLUDED_PHASE1_RESOURCE_CANDIDATES).toEqual([
      expect.objectContaining({
        uri: "stocktrends://intelligence/discovery",
        endpointPath: "/v1/intelligence/discovery",
        verification: expect.stringContaining("503")
      }),
      expect.objectContaining({
        uri: "stocktrends://intelligence/editorial/latest/preview",
        endpointPath: "/v1/intelligence/editorial/latest/preview",
        verification: expect.stringContaining("503")
      })
    ]);
  });

  it("lists resources without fetching the API at startup or list time", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn);

    const resources = await client.listResources();

    expect(fetchFn).not.toHaveBeenCalled();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(listPublicResourceUris());

    await client.close();
    await server.close();
  });

  it("fetches a public resource on request and preserves API data in a transparent envelope", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ openapi: "3.1.0" }, 200, { "x-request-id": "req-test" }));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.readResource({
      uri: "stocktrends://api/openapi"
    });
    const content = result.contents[0];

    if (!content || !("text" in content)) {
      throw new Error("Expected text resource content.");
    }

    const body = JSON.parse(content.text) as Record<string, unknown>;

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      resourceUri: "stocktrends://api/openapi",
      source: {
        apiBaseUrl: "https://api.stocktrends.com",
        endpointPath: "/v1/openapi.json",
        status: 200,
        upstreamRequestId: "req-test"
      },
      data: {
        openapi: "3.1.0"
      }
    });
    expect(typeof body.fetchedAt).toBe("string");

    await client.close();
    await server.close();
  });
});
