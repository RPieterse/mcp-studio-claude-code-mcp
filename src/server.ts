import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { runClaude, type ExecFn } from "./tools/run.js";
import { defaultExec } from "./exec.js";

const TOOLS = [
  {
    name: "run",
    description:
      "Run `claude -p <prompt>` inside the given project directory and return its stdout.",
    inputSchema: {
      type: "object" as const,
      properties: {
        prompt: {
          type: "string",
          description: "Instructions to send to Claude Code.",
        },
        cwd: {
          type: "string",
          description: "Absolute path to the project directory.",
        },
      },
      required: ["prompt", "cwd"],
      additionalProperties: false,
    },
  },
];

export function createServer(opts: { exec?: ExecFn } = {}): Server {
  const exec = opts.exec ?? defaultExec;
  const server = new Server(
    { name: "claude-code", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    if (req.params.name !== "run") {
      throw new Error(`Unknown tool: ${req.params.name}`);
    }
    const args = (req.params.arguments ?? {}) as {
      prompt?: string;
      cwd?: string;
    };
    const result = await runClaude(
      { prompt: args.prompt ?? "", cwd: args.cwd ?? "" },
      { exec },
    );
    return {
      content: [{ type: "text" as const, text: result.text }],
      isError: result.isError ?? false,
    };
  });

  return server;
}
