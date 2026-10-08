import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createMcpHandler } from "@modelcontextprotocol/server";
import {
  hostHeaderValidation,
  localhostHostValidation,
  localhostOriginValidation,
  originValidation,
  toNodeHandler
} from "@modelcontextprotocol/node";
import type { Env, StockTrendsMcpConfig } from "./config.js";
import { parseConfig } from "./config.js";
import { createLogger, safeErrorMessage } from "./logging.js";
import { createStockTrendsMcpServer } from "./server.js";
import type { FetchLike } from "./stocktrendsClient.js";

const MAX_REQUEST_BODY_BYTES = 4 * 1024 * 1024;
const HTTP_HEADERS_TIMEOUT_MS = 10_000;
const HTTP_REQUEST_TIMEOUT_MS = 30_000;
const HTTP_KEEP_ALIVE_TIMEOUT_MS = 5_000;
const HTTP_MAX_CONNECTIONS = 100;

export interface StreamableHttpServerOptions {
  env?: Env;
  config?: StockTrendsMcpConfig;
  fetchFn?: FetchLike;
}

export interface RunningStreamableHttpServer {
  readonly server: Server;
  readonly port: number;
  close(): Promise<void>;
}

export function createStreamableHttpMcpHandler(options: StreamableHttpServerOptions = {}) {
  const config = options.config ?? parseConfig(options.env);
  if (config.transport !== "streamable-http") {
    throw new Error("Streamable HTTP handler requires STOCKTRENDS_MCP_TRANSPORT=streamable-http.");
  }

  const logger = createLogger({ logLevel: config.logLevel });
  return createMcpHandler(
    () => createStockTrendsMcpServer({ config, fetchFn: options.fetchFn }).server,
    {
      maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
      onerror: (error) => logger.error(safeErrorMessage(error))
    }
  );
}

export async function startStreamableHttpServer(options: StreamableHttpServerOptions = {}): Promise<RunningStreamableHttpServer> {
  const config = options.config ?? parseConfig(options.env);
  if (config.transport !== "streamable-http" || !config.http) {
    throw new Error("Streamable HTTP startup requires validated streamable-http configuration.");
  }

  const logger = createLogger({ logLevel: config.logLevel });
  const handler = createStreamableHttpMcpHandler({ ...options, config });
  const nodeHandler = toNodeHandler(handler, {
    maxRequestBodySize: MAX_REQUEST_BODY_BYTES,
    onerror: (error) => logger.error(safeErrorMessage(error))
  });
  const validateHost = config.http.allowedHosts
    ? hostHeaderValidation([...config.http.allowedHosts])
    : localhostHostValidation();
  const validateOrigin = config.http.allowedOrigins
    ? originValidation([...config.http.allowedOrigins])
    : config.http.allowedHosts
      ? originValidation([...config.http.allowedHosts])
      : localhostOriginValidation();
  let ready = false;
  let closing = false;

  const server = createServer(async (request, response) => {
    if (!validateHost(request, response) || !validateOrigin(request, response)) return;

    const pathname = request.url ? new URL(request.url, "http://localhost").pathname : "/";
    if (pathname === "/healthz") {
      return respondHealth(request, response, 200, "ok");
    }
    if (pathname === "/readyz") {
      return respondHealth(request, response, ready && !closing ? 200 : 503, ready && !closing ? "ready" : "not_ready");
    }
    if (pathname !== "/mcp") {
      response.writeHead(404, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(JSON.stringify({ error: "not_found" }));
      return;
    }

    try {
      await nodeHandler(request, response);
    } catch (error) {
      logger.error(safeErrorMessage(error));
      if (!response.headersSent) {
        response.writeHead(500, { "content-type": "application/json", "cache-control": "no-store" });
        response.end(JSON.stringify({ error: "internal_error" }));
      } else {
        response.destroy();
      }
    }
  });

  server.headersTimeout = HTTP_HEADERS_TIMEOUT_MS;
  server.requestTimeout = HTTP_REQUEST_TIMEOUT_MS;
  server.keepAliveTimeout = HTTP_KEEP_ALIVE_TIMEOUT_MS;
  server.maxConnections = HTTP_MAX_CONNECTIONS;

  await listen(server, config.http.port, config.http.bindAddress);
  ready = true;
  const address = server.address();
  if (!address || typeof address === "string") {
    await handler.close();
    await closeServer(server);
    throw new Error("Streamable HTTP server did not expose a TCP listen address.");
  }

  logger.info(`Streamable HTTP MCP listening on ${config.http.bindAddress}:${address.port}.`);

  const close = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    ready = false;
    await handler.close();
    await closeServer(server);
  };

  const onSignal = () => void close().catch((error) => logger.error(safeErrorMessage(error)));
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  return {
    server,
    port: address.port,
    close: async () => {
      process.removeListener("SIGINT", onSignal);
      process.removeListener("SIGTERM", onSignal);
      await close();
    }
  };
}

function respondHealth(request: IncomingMessage, response: ServerResponse, status: number, state: string): void {
  if (request.method !== "GET") {
    response.writeHead(405, { allow: "GET", "content-type": "application/json", "cache-control": "no-store" });
    response.end(JSON.stringify({ error: "method_not_allowed" }));
    return;
  }
  response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  response.end(JSON.stringify({ status: state }));
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.removeListener("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      server.removeListener("error", onError);
      resolve();
    };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, host);
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
