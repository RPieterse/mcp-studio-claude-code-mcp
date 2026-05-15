import { existsSync, statSync } from "node:fs";

export type ExecFn = (
  command: string,
  args: string[],
  options: { cwd: string },
) => Promise<{ stdout: string; stderr: string; code: number }>;

export type ToolResult = { text: string; isError?: boolean };

export async function runClaude(
  input: { prompt: string; cwd: string },
  deps: { exec: ExecFn },
): Promise<ToolResult> {
  const prompt = input.prompt?.trim();
  if (!prompt) {
    return { text: "prompt must be non-empty", isError: true };
  }
  if (!existsSync(input.cwd) || !statSync(input.cwd).isDirectory()) {
    return { text: `cwd does not exist: ${input.cwd}`, isError: true };
  }
  const { stdout, stderr, code } = await deps.exec(
    "claude",
    ["-p", prompt],
    { cwd: input.cwd },
  );
  if (code !== 0) {
    return {
      text: `claude exited with code ${code}\n${stderr || stdout}`,
      isError: true,
    };
  }
  return { text: stdout };
}
