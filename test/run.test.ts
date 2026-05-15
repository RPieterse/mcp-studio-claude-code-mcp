import { describe, expect, test, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runClaude } from "../src/tools/run.js";

function tmpProject(): string {
  return mkdtempSync(join(tmpdir(), "claude-mcp-test-"));
}

describe("runClaude", () => {
  test("invokes claude with -p prompt in the given cwd", async () => {
    const dir = tmpProject();
    try {
      const exec = vi.fn().mockResolvedValue({ stdout: "done", stderr: "", code: 0 });
      const result = await runClaude({ prompt: "hello", cwd: dir }, { exec });
      expect(exec).toHaveBeenCalledWith("claude", ["-p", "hello"], { cwd: dir });
      expect(result.isError).toBeFalsy();
      expect(result.text).toBe("done");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("surfaces a non-zero exit as an error result", async () => {
    const dir = tmpProject();
    try {
      const exec = vi
        .fn()
        .mockResolvedValue({ stdout: "", stderr: "boom", code: 1 });
      const result = await runClaude({ prompt: "x", cwd: dir }, { exec });
      expect(result.isError).toBe(true);
      expect(result.text).toContain("boom");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("rejects when cwd does not exist", async () => {
    const exec = vi.fn();
    const result = await runClaude(
      { prompt: "x", cwd: "/this/path/does/not/exist/zzz" },
      { exec },
    );
    expect(result.isError).toBe(true);
    expect(result.text).toMatch(/cwd|exist/i);
    expect(exec).not.toHaveBeenCalled();
  });

  test("rejects an empty prompt without invoking claude", async () => {
    const dir = tmpProject();
    try {
      const exec = vi.fn();
      const result = await runClaude({ prompt: "   ", cwd: dir }, { exec });
      expect(result.isError).toBe(true);
      expect(exec).not.toHaveBeenCalled();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
