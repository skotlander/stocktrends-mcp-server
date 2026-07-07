import { describe, expect, it, vi } from "vitest";
import {
  EXCLUDED_PUBLIC_RESOURCE_CANDIDATES,
  listPublicResourceUris,
  PROHIBITED_RESOURCE_ENDPOINTS,
  PUBLIC_RESOURCES
} from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { connectMcp, jsonResponse } from "./helpers.js";

const EXPECTED_PUBLIC_RESOURCE_URIS = [
  "stocktrends://api/openapi",
  "stocktrends://ai/context",
  "stocktrends://ai/tools",
  "stocktrends://workflows",
  "stocktrends://methodology/stim",
  "stocktrends://methodology/indicators",
  "stocktrends://methodology/inference",
  "stocktrends://pricing/catalog",
  "stocktrends://proof/market-edge"
];

const PHASE2_PUBLIC_RESOURCES = PUBLIC_RESOURCES.filter((resource) => resource.phase === "phase2");

describe("public resources", () => {
  it("registers only verified public resource URIs", () => {
    expect(listPublicResourceUris()).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);
  });

  it("does not register paid or prohibited endpoints", () => {
    const registeredEndpoints = PUBLIC_RESOURCES.map((resource) => resource.endpointPath);

    for (const endpoint of PROHIBITED_RESOURCE_ENDPOINTS) {
      expect(registeredEndpoints).not.toContain(endpoint);
    }
  });

  it("does not register paid endpoint strings as resource endpoints or URIs", () => {
    const registeredSurface = JSON.stringify(PUBLIC_RESOURCES.map((resource) => [resource.uri, resource.endpointPath]));

    for (const endpoint of PROHIBITED_RESOURCE_ENDPOINTS) {
      expect(registeredSurface).not.toContain(endpoint);
    }

    for (const forbidden of ["x402", "wallet", "oauth"]) {
      expect(registeredSurface.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("documents unverified intelligence candidate exclusions", () => {
    expect(EXCLUDED_PUBLIC_RESOURCE_CANDIDATES).toEqual([
      expect.objectContaining({
        uri: "stocktrends://intelligence/discovery",
        endpointPath: "/v1/intelligence/discovery",
        verification: expect.stringContaining("503"),
        phase: "phase2"
      }),
      expect.objectContaining({
        uri: "stocktrends://intelligence/editorial/latest/preview",
        endpointPath: "/v1/intelligence/editorial/latest/preview",
        verification: expect.stringContaining("503"),
        phase: "phase2"
      })
    ]);

    for (const excluded of EXCLUDED_PUBLIC_RESOURCE_CANDIDATES) {
      expect(listPublicResourceUris()).not.toContain(excluded.uri);
    }
  });

  it("lists resources without fetching the API at startup or list time", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn);

    const resources = await client.listResources();

    expect(fetchFn).not.toHaveBeenCalled();
    expect(resources.resources.map((resource) => resource.uri)).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);

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

  it.each(PHASE2_PUBLIC_RESOURCES)("fetches $uri on request from its verified public endpoint", async (resource) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ request_id: "req-phase2", ok: true }));
    const { client, server } = await connectMcp(fetchFn);

    const result = await client.readResource({
      uri: resource.uri
    });
    const content = result.contents[0];

    if (!content || !("text" in content)) {
      throw new Error("Expected text resource content.");
    }

    const body = JSON.parse(content.text) as Record<string, unknown>;

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0]?.[0].pathname).toBe(resource.endpointPath);
    expect(body).toMatchObject({
      resourceUri: resource.uri,
      source: {
        apiBaseUrl: "https://api.stocktrends.com",
        endpointPath: resource.endpointPath,
        status: 200
      },
      data: {
        request_id: "req-phase2",
        ok: true
      }
    });

    await client.close();
    await server.close();
  });

  it.each(
    PHASE2_PUBLIC_RESOURCES.flatMap((resource) => [
      { resource, status: 401, errorCode: "unexpected_auth_required" },
      { resource, status: 402, errorCode: "unexpected_paid_endpoint" },
      { resource, status: 403, errorCode: "unexpected_forbidden" }
    ])
  )("fails closed when $resource.uri returns HTTP $status", async ({ resource, status, errorCode }) => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ error: "safe" }, status));
    const { client, server } = await connectMcp(fetchFn);

    try {
      await expect(
        client.readResource({
          uri: resource.uri
        })
      ).rejects.toMatchObject({
        data: {
          errorCode,
          endpointPath: resource.endpointPath,
          resourceUri: resource.uri,
          status
        }
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("does not send auth headers for Phase 2 resources even when paid mode and STOCKTRENDS_API_KEY are set", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn, {
      STOCKTRENDS_ENABLE_PAID_TOOLS: "true",
      STOCKTRENDS_API_KEY: "must-not-be-forwarded-for-public-resources"
    });

    await client.readResource({
      uri: "stocktrends://methodology/indicators"
    });

    const init = fetchFn.mock.calls[0]?.[1];
    expect(init?.headers).toEqual({
      Accept: "application/json",
      "User-Agent": "stocktrends-mcp-server/1.0"
    });
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("api-key");
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("authorization");
    expect(JSON.stringify(init?.headers).toLowerCase()).not.toContain("secret");

    await client.close();
    await server.close();
  });

  it("does not dynamically register resources from the live tools manifest", async () => {
    const fetchFn = vi.fn<FetchLike>(async () =>
      jsonResponse({
        tools: [
          {
            name: "manifest_paid_candidate",
            endpoint: "/v1/stim/latest",
            resource_uri: "stocktrends://stim/latest"
          }
        ]
      })
    );
    const { client, server } = await connectMcp(fetchFn);

    await client.readResource({
      uri: "stocktrends://ai/tools"
    });
    const resources = await client.listResources();

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(resources.resources.map((resource) => resource.uri)).toEqual(EXPECTED_PUBLIC_RESOURCE_URIS);

    await client.close();
    await server.close();
  });
});
