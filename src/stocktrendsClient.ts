import type { StockTrendsMcpConfig } from "./config.js";
import { errorFromHttpStatus, StockTrendsMcpError } from "./errors.js";

export interface PublicEndpointRequest {
  endpointPath: string;
  resourceUri?: string;
}

export interface PublicEndpointResponse {
  data: JsonObject;
  status: number;
  upstreamRequestId?: string;
}

export type JsonObject = Record<string, unknown>;
export type FetchLike = (input: URL, init: RequestInit) => Promise<Response>;

export class StockTrendsClient {
  readonly apiBaseOrigin: string;
  private readonly fetchFn: FetchLike;

  constructor(
    private readonly config: StockTrendsMcpConfig,
    fetchFn?: FetchLike
  ) {
    if (!fetchFn && typeof globalThis.fetch !== "function") {
      throw new StockTrendsMcpError("invalid_config", {
        detail: "Global fetch is unavailable in this Node runtime."
      });
    }

    this.fetchFn = fetchFn ?? ((input, init) => globalThis.fetch(input, init));
    this.apiBaseOrigin = config.apiBaseUrl.origin;
  }

  buildUrl(endpointPath: string): URL {
    if (!endpointPath.startsWith("/") || endpointPath.startsWith("//") || endpointPath.includes("://")) {
      throw new StockTrendsMcpError("invalid_resource_request", {
        endpointPath
      });
    }

    const url = new URL(endpointPath, this.apiBaseOrigin);

    if (url.origin !== this.apiBaseOrigin) {
      throw new StockTrendsMcpError("invalid_resource_request", {
        endpointPath
      });
    }

    return url;
  }

  async fetchJson(request: PublicEndpointRequest): Promise<PublicEndpointResponse> {
    const url = this.buildUrl(request.endpointPath);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);

    let response: Response;

    try {
      response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "stocktrends-mcp-server/1.0"
        },
        redirect: "manual",
        signal: controller.signal
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        throw new StockTrendsMcpError("timeout", safeRequestData(request));
      }

      throw new StockTrendsMcpError("api_unavailable", safeRequestData(request));
    } finally {
      clearTimeout(timeout);
    }

    const upstreamRequestId = getUpstreamRequestId(response);
    const safeData = {
      ...safeRequestData(request),
      status: response.status,
      upstreamRequestId
    };

    if (response.status >= 300 && response.status < 400) {
      throw new StockTrendsMcpError("api_unapproved_redirect", safeData);
    }

    if (!response.ok) {
      throw errorFromHttpStatus(response.status, safeData);
    }

    if (!isJsonResponse(response)) {
      throw new StockTrendsMcpError("malformed_api_response", safeData);
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new StockTrendsMcpError("malformed_api_response", safeData);
    }

    if (!isJsonObject(data)) {
      throw new StockTrendsMcpError("malformed_api_response", safeData);
    }

    return {
      data,
      status: response.status,
      upstreamRequestId
    };
  }
}

function safeRequestData(request: PublicEndpointRequest): { resourceUri?: string; endpointPath?: string } {
  return {
    resourceUri: request.resourceUri,
    endpointPath: request.endpointPath
  };
}

function getUpstreamRequestId(response: Response): string | undefined {
  return response.headers.get("x-request-id") ?? response.headers.get("x-correlation-id") ?? undefined;
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/json") || contentType.includes("+json");
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
