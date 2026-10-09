import { describe, expect, it, vi } from "vitest";
import { listPublicResourceUris, PHASE1_PROMPT_DEFINITIONS, PHASE1_TOOL_DEFINITIONS } from "../src/resources/index.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { COST_ESTIMATE_TOOL_NAME, listPublicPlanningToolNames, PAID_RUNTIME_TOOL_DEFINITIONS } from "../src/tools/index.js";
import { connectMcp, jsonResponse } from "./helpers.js";

describe("MCP safety surface", () => {
  it("exposes the three public tools and no prompts by default", async () => {
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn);
    const tools = await client.listTools();

    expect(PHASE1_TOOL_DEFINITIONS).toEqual([]);
    expect(PAID_RUNTIME_TOOL_DEFINITIONS).toEqual([]);
    expect(listPublicPlanningToolNames()).toEqual([COST_ESTIMATE_TOOL_NAME]);
    expect(tools.tools.map((tool) => tool.name)).toEqual([COST_ESTIMATE_TOOL_NAME, "stocktrends_lookup_instruments", "stocktrends_resolve_instrument"]);
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);
    expect(client.getServerCapabilities()?.tools).toBeDefined();
    expect(client.getServerCapabilities()?.prompts).toBeUndefined();

    await client.close();
    await server.close();
  });

  it("does not register paid, x402, wallet, OAuth, remote, database, or control-plane surfaces", () => {
    const serializedTools = JSON.stringify(PHASE1_TOOL_DEFINITIONS);
    const serializedPaidTools = JSON.stringify(PAID_RUNTIME_TOOL_DEFINITIONS);
    const serializedPrompts = JSON.stringify(PHASE1_PROMPT_DEFINITIONS);

    for (const forbidden of ["x402", "wallet", "oauth", "database", "control-plane", "control_plane", "remote", "streamable", "sse", "guidance", "research"]) {
      expect(serializedTools.toLowerCase()).not.toContain(forbidden);
      expect(serializedPaidTools.toLowerCase()).not.toContain(forbidden);
      expect(serializedPrompts.toLowerCase()).not.toContain(forbidden);
    }
  });

  it("keeps the market-edge proof endpoint as a resource only", () => {
    expect(listPublicResourceUris()).toContain("stocktrends://proof/market-edge");
    expect(PHASE1_TOOL_DEFINITIONS).toEqual([]);
    expect(listPublicPlanningToolNames()).toEqual([COST_ESTIMATE_TOOL_NAME]);
    expect(PHASE1_PROMPT_DEFINITIONS).toEqual([]);
  });
});
