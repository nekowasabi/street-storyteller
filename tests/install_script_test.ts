import { assert, assertEquals } from "./asserts.ts";

Deno.test("install.sh script contains expected sections", async () => {
  const content = await Deno.readTextFile("scripts/install.sh");
  assert(content.startsWith("#!/usr/bin/env bash"));
  assert(content.includes("storyteller"));
  assert(content.includes("set -euo pipefail"));
  assert(content.includes("deno compile"));
  const lines = content.trim().split("\n");
  assert(lines.length > 10);
  assertEquals(content.includes("Usage:"), true);
});
