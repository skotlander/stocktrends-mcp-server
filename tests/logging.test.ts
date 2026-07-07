import { describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/logging.js";
import type { FetchLike } from "../src/stocktrendsClient.js";
import { connectMcp, jsonResponse } from "./helpers.js";

describe("stdio logging safety", () => {
  it("writes logger output to stderr rather than stdout", () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const stderrSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const logger = createLogger({ logLevel: "info" });
    logger.info("safe startup metadata");

    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(stderrSpy).toHaveBeenCalled();
  });

  it("does not write normal resource registration or read activity to stdout", async () => {
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const fetchFn = vi.fn<FetchLike>(async () => jsonResponse({ ok: true }));
    const { client, server } = await connectMcp(fetchFn);

    await client.listResources();
    await client.readResource({
      uri: "stocktrends://ai/tools"
    });

    expect(stdoutSpy).not.toHaveBeenCalled();

    await client.close();
    await server.close();
  });
});
