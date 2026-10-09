import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { StockTrendsClient } from "../stocktrendsClient.js";

const exchanges = ["N", "Q", "A", "B", "T", "I"] as const;
const symbol = z.string().trim().min(1).max(32).regex(/^[A-Z0-9][A-Z0-9.-]{0,31}$/);
const symbolExchange = z.string().trim().regex(/^[A-Z0-9][A-Z0-9.-]{0,31}-[NQABTI]$/);
const lookupSchema = z.object({ symbol, cs_only: z.boolean().optional(), limit: z.number().int().min(1).max(500).default(50), details: z.boolean().optional() }).strict();
const resolveSchema = z.object({ symbol_exchange: symbolExchange.optional(), symbol: symbol.optional(), exchange: z.enum(exchanges).optional(), prefer_exchange: z.enum(exchanges).optional(), cs_only: z.boolean().optional(), details: z.boolean().optional() }).strict().refine((value) => Boolean(value.symbol_exchange || value.symbol), { message: "symbol_exchange or symbol is required." }).refine((value) => !value.exchange || Boolean(value.symbol), { message: "exchange requires symbol.", path: ["exchange"] });

export function registerPublicInstrumentDiscoveryTools(server: McpServer, client: StockTrendsClient): void {
  register(server, client, "stocktrends_lookup_instruments", "Lookup Stock Trends Instruments", "Search public instrument candidates across exchanges. It does not select an ambiguous symbol or make a paid request.", "/v1/instruments/lookup", lookupSchema);
  register(server, client, "stocktrends_resolve_instrument", "Resolve a Stock Trends Instrument", "Resolve a Stock Trends instrument identifier. The API prefers U.S. listings by default; specify exchange or canonical symbol_exchange for a particular listing, including Canadian securities. Use lookup to explore alternatives. Upstream 404 and 409 responses are preserved.", "/v1/instruments/resolve", resolveSchema);
}

function register(server: McpServer, client: StockTrendsClient, name: string, title: string, description: string, endpointPath: string, inputSchema: any): void {
  server.registerTool(name, { title, description, inputSchema, annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }, _meta: { access: "public", endpointPath, method: "GET", paidExecutionAuthorized: false } }, async (input: Record<string, unknown>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) if (value !== undefined) params.set(key, String(value));
    const result = await client.fetchPublicDiscovery({ endpointPath, toolName: name, searchParams: params });
    const output = { api_data: result.data, mcp_metadata: { tool_name: name, endpoint_path: endpointPath, http_method: "GET", status: result.status, credential_free: true, paid_execution_authorized: false } };
    return { structuredContent: output, content: [{ type: "text", text: JSON.stringify(output) }], ...(result.status === 200 ? {} : { isError: true }) } satisfies CallToolResult;
  });
}
