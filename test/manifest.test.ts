import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateManifest } from "@mcp-widget/manifest-schema";

const here = dirname(fileURLToPath(import.meta.url));

test("claude-code widget.manifest.json passes the canonical schema", () => {
  const manifest = JSON.parse(
    readFileSync(resolve(here, "../widget.manifest.json"), "utf8"),
  );
  const result = validateManifest(manifest);
  if (!result.ok) console.error(result.errors);
  expect(result.ok).toBe(true);
});
