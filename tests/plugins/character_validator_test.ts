import { assert, assertEquals } from "../asserts.ts";
import { validateCharacter } from "@storyteller/plugins/core/character/validator.ts";

Deno.test("validateCharacter rejects non-object inputs", () => {
  const result = validateCharacter(null);
  assertEquals(result.valid, false);
  assert(result.errors);
  assertEquals(result.errors[0]?.field, "root");
});

Deno.test("validateCharacter reports missing required fields", () => {
  const result = validateCharacter({});
  assertEquals(result.valid, false);
  const fields = (result.errors ?? []).map((e) => e.field);
  assert(fields.includes("id"));
  assert(fields.includes("name"));
  assert(fields.includes("role"));
  assert(fields.includes("traits"));
  assert(fields.includes("relationships"));
  assert(fields.includes("appearingChapters"));
  assert(fields.includes("summary"));
});

Deno.test("validateCharacter accepts a valid character", () => {
  const result = validateCharacter({
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: [],
    summary: "正義感の強い青年",
  });
  assertEquals(result.valid, true);
});
