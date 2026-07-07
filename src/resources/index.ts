import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StockTrendsClient } from "../stocktrendsClient.js";
import { StockTrendsMcpError, toMcpError } from "../errors.js";

export interface PublicResource {
  name: string;
  title: string;
  uri: string;
  endpointPath: string;
  description: string;
  mimeType: "application/json";
  phase: "phase1" | "phase2";
}

export type Phase1PublicResource = PublicResource;

export interface ExcludedPublicResourceCandidate {
  uri: string;
  endpointPath: string;
  reason: string;
  verification: string;
  phase: "phase1" | "phase2";
}

export type ExcludedPhase1ResourceCandidate = ExcludedPublicResourceCandidate;

export const PUBLIC_RESOURCES: readonly PublicResource[] = [
  {
    name: "stocktrends_openapi_contract",
    title: "Stock Trends OpenAPI Contract",
    uri: "stocktrends://api/openapi",
    endpointPath: "/v1/openapi.json",
    description: "Public OpenAPI contract fetched on request from GET /v1/openapi.json.",
    mimeType: "application/json",
    phase: "phase1"
  },
  {
    name: "stocktrends_ai_context",
    title: "Stock Trends AI Context",
    uri: "stocktrends://ai/context",
    endpointPath: "/v1/ai/context",
    description: "Public AI context fetched on request from GET /v1/ai/context after no-key verification.",
    mimeType: "application/json",
    phase: "phase1"
  },
  {
    name: "stocktrends_ai_tools_manifest",
    title: "Stock Trends AI Tools Manifest",
    uri: "stocktrends://ai/tools",
    endpointPath: "/v1/ai/tools",
    description: "Public machine-readable API tools manifest fetched on request from GET /v1/ai/tools.",
    mimeType: "application/json",
    phase: "phase1"
  },
  {
    name: "stocktrends_workflows",
    title: "Stock Trends Workflows",
    uri: "stocktrends://workflows",
    endpointPath: "/v1/workflows",
    description: "Public workflow planning metadata fetched on request from GET /v1/workflows.",
    mimeType: "application/json",
    phase: "phase1"
  },
  {
    name: "stocktrends_methodology_stim",
    title: "ST-IM Methodology Metadata",
    uri: "stocktrends://methodology/stim",
    endpointPath: "/v1/meta/stim",
    description: "Public ST-IM methodology metadata fetched on request from GET /v1/meta/stim.",
    mimeType: "application/json",
    phase: "phase1"
  },
  {
    name: "stocktrends_methodology_indicators",
    title: "Stock Trends Indicator Methodology Metadata",
    uri: "stocktrends://methodology/indicators",
    endpointPath: "/v1/meta/indicators",
    description: "Public indicator methodology metadata fetched on request from GET /v1/meta/indicators.",
    mimeType: "application/json",
    phase: "phase2"
  },
  {
    name: "stocktrends_methodology_inference",
    title: "Stock Trends Inference Contract Metadata",
    uri: "stocktrends://methodology/inference",
    endpointPath: "/v1/meta/inference",
    description: "Public provider-agnostic inference metadata fetched on request from GET /v1/meta/inference.",
    mimeType: "application/json",
    phase: "phase2"
  },
  {
    name: "stocktrends_pricing_catalog",
    title: "Stock Trends Pricing Catalog",
    uri: "stocktrends://pricing/catalog",
    endpointPath: "/v1/pricing/catalog",
    description: "Public pricing catalog fetched on request from GET /v1/pricing/catalog for planning metadata only.",
    mimeType: "application/json",
    phase: "phase2"
  },
  {
    name: "stocktrends_proof_market_edge",
    title: "Stock Trends Market Edge Proof Metadata",
    uri: "stocktrends://proof/market-edge",
    endpointPath: "/v1/ai/proof/market-edge",
    description: "Public static market-edge proof metadata fetched on request from GET /v1/ai/proof/market-edge.",
    mimeType: "application/json",
    phase: "phase2"
  }
];

export const PHASE1_PUBLIC_RESOURCES = PUBLIC_RESOURCES;

export const EXCLUDED_PUBLIC_RESOURCE_CANDIDATES: readonly ExcludedPublicResourceCandidate[] = [
  {
    uri: "stocktrends://intelligence/discovery",
    endpointPath: "/v1/intelligence/discovery",
    reason: "Excluded because no-key implementation-time verification did not confirm a healthy public response.",
    verification: "GET without credentials returned 503 application/json on 2026-07-07 during Phase 1 and again during Phase 2.",
    phase: "phase2"
  },
  {
    uri: "stocktrends://intelligence/editorial/latest/preview",
    endpointPath: "/v1/intelligence/editorial/latest/preview",
    reason: "Excluded because no-key implementation-time verification did not confirm a healthy public response.",
    verification: "GET without credentials returned 503 application/json on 2026-07-07 during Phase 1 and again during Phase 2.",
    phase: "phase2"
  }
];

export const EXCLUDED_PHASE1_RESOURCE_CANDIDATES = EXCLUDED_PUBLIC_RESOURCE_CANDIDATES;

export const PHASE1_TOOL_DEFINITIONS: readonly [] = [];
export const PHASE1_PROMPT_DEFINITIONS: readonly [] = [];

export const PROHIBITED_RESOURCE_ENDPOINTS: readonly string[] = [
  "/v1/agent/screener/top",
  "/v1/breadth/sector/latest",
  "/v1/breadth/sector/history",
  "/v1/decision/evaluate-symbol",
  "/v1/stim/latest",
  "/v1/indicators/latest",
  "/v1/stim/history",
  "/v1/indicators/history",
  "/v1/selections/latest",
  "/v1/selections/history",
  "/v1/selections/published/latest",
  "/v1/selections/published/history",
  "/v1/portfolio/compare",
  "/v1/portfolio/construct",
  "/v1/portfolio/evaluate",
  "/v1/prices/latest",
  "/v1/prices/history",
  "/v1/market/regime/latest",
  "/v1/market/regime/history",
  "/v1/market/regime/forecast",
  "/v1/intelligence/guidance/latest",
  "/v1/intelligence/guidance/{artifact_id}",
  "/v1/intelligence/research/latest",
  "/v1/intelligence/research/{artifact_id}",
  "/v1/stwr/reports/latest",
  "/v1/stwr/reports/history"
];

export const PHASE1_PROHIBITED_ENDPOINTS = PROHIBITED_RESOURCE_ENDPOINTS;

export function registerPublicResources(server: McpServer, client: StockTrendsClient): void {
  for (const resource of PUBLIC_RESOURCES) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title,
        description: resource.description,
        mimeType: resource.mimeType,
        _meta: {
          phase: resource.phase,
          access: "public",
          endpointPath: resource.endpointPath,
          cachePolicy: "fetch-on-request"
        }
      },
      async (uri) => {
        if (uri.href !== resource.uri) {
          throw new StockTrendsMcpError("invalid_resource_request", {
            resourceUri: uri.href,
            endpointPath: resource.endpointPath
          }).toMcpError();
        }

        try {
          const response = await client.fetchJson({
            endpointPath: resource.endpointPath,
            resourceUri: resource.uri
          });

          return {
            contents: [
              {
                uri: resource.uri,
                mimeType: resource.mimeType,
                text: JSON.stringify(
                  {
                    resourceUri: resource.uri,
                    source: {
                      apiBaseUrl: client.apiBaseOrigin,
                      endpointPath: resource.endpointPath,
                      status: response.status,
                      upstreamRequestId: response.upstreamRequestId
                    },
                    fetchedAt: new Date().toISOString(),
                    data: response.data
                  },
                  null,
                  2
                )
              }
            ]
          };
        } catch (error) {
          throw toMcpError(error);
        }
      }
    );
  }
}

export function listPublicResourceUris(): string[] {
  return PUBLIC_RESOURCES.map((resource) => resource.uri);
}
