import { describe, expect, test, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "../src/server.js";
import type { ExecFn } from "../src/tools/run.js";

async function connect(exec: ExecFn) {
  const server = createServer({ exec });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.connect(serverT);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(clientT);
  return { client, server };
}

describe("claude-code MCP server", () => {
  test("advertises the run tool with a proper input schema", async () => {
    const exec = vi.fn();
    const { client } = await connect(exec);
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(["run"]);
    const schema = tools[0]!.inputSchema;
    expect(schema.required).toEqual(["prompt", "cwd"]);
  });

  test("tools/call run delegates to runClaude with injected exec", async () => {
    const dir = mkdtempSync(join(tmpdir(), "claude-mcp-server-"));
    try {
      const exec = vi
        .fn()
        .mockResolvedValue({ stdout: "did it", stderr: "", code: 0 });
      const { client } = await connect(exec);
      const result = await client.callTool({
        name: "run",
        arguments: { prompt: "do the thing", cwd: dir },
      });
      expect((result.content as Array<{ text: string }>)[0]!.text).toBe("did it");
      expect(result.isError).toBeFalsy();
      expect(exec).toHaveBeenCalledWith(
        "claude",
        ["-p", "do the thing"],
        { cwd: dir },
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("tools/call surfaces tool errors as isError content (not a transport error)", async () => {
    const exec = vi.fn();
    const { client } = await connect(exec);
    const result = await client.callTool({
      name: "run",
      arguments: { prompt: "", cwd: "/tmp" },
    });
    expect(result.isError).toBe(true);
  });

  test("rejects unknown tool names", async () => {
    const exec = vi.fn();
    const { client } = await connect(exec);
    await expect(
      client.callTool({ name: "definitely_not_a_tool", arguments: {} }),
    ).rejects.toThrow();
  });
});
