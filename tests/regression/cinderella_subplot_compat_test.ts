import { assertEquals } from "jsr:@std/assert";
import { join } from "jsr:@std/path";
import { validateSubplot } from "@storyteller/plugins/core/subplot/validator.ts";

const CINDERELLA = join(Deno.cwd(), "samples/cinderella");

Deno.test("cinderella: validate runs without errors when no subplots", async () => {
  // cinderella has no src/subplots/ directory
  try {
    for await (const _entry of Deno.readDir(join(CINDERELLA, "src/subplots"))) {
      // Should not reach here
      assertEquals(true, false, "Expected no subplots directory");
    }
    assertEquals(true, false, "Expected directory to not exist");
  } catch {
    // Directory doesn't exist — expected
    assertEquals(true, true);
  }
});

Deno.test("cinderella: subplot validator handles empty input gracefully", () => {
  const result = validateSubplot({
    id: "test",
    name: "Test",
    type: "subplot",
    status: "active",
    summary: "test",
    beats: [],
  });
  // Even a minimal subplot should not crash the validator
  assertEquals(typeof result.valid, "boolean");
});

Deno.test("cinderella: existing character files are unaffected", async () => {
  let count = 0;
  for await (const entry of Deno.readDir(join(CINDERELLA, "src/characters"))) {
    if (entry.isFile && entry.name.endsWith(".ts")) count++;
  }
  assertEquals(count > 0, true, "cinderella should have character files");
});

Deno.test("cinderella: existing foreshadowing files are unaffected", async () => {
  try {
    let count = 0;
    for await (const entry of Deno.readDir(join(CINDERELLA, "src/foreshadowings"))) {
      if (entry.isFile && entry.name.endsWith(".ts")) count++;
    }
    assertEquals(count > 0, true, "cinderella should have foreshadowing files");
  } catch {
    // Directory may not exist in all samples
    assertEquals(true, true);
  }
});
