import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { FrontmatterEditor } from "@storyteller/application/meta/frontmatter_editor.ts";

const BASE_MD = `---
title: Test
storyteller:
  characters: []
  settings: []
  foreshadowings: []
  subplots: []
---

Content here.
`;

Deno.test("manuscript_binding subplots: adds subplot ID to FrontMatter", () => {
  const editor = new FrontmatterEditor();
  const result = editor.addEntities(BASE_MD, "subplots", ["love_story"]);
  assertEquals(result.ok, true);
  if (result.ok) assertStringIncludes(result.value.content, "love_story");
});

Deno.test("manuscript_binding subplots: sets subplot list with action=set", () => {
  const editor = new FrontmatterEditor();
  const added = editor.addEntities(BASE_MD, "subplots", ["sp1"]);
  assertEquals(added.ok, true);
  if (!added.ok) return;

  const set = editor.setEntities(added.value.content, "subplots", [
    "sp2",
    "sp3",
  ]);
  assertEquals(set.ok, true);
  if (set.ok) {
    assertStringIncludes(set.value.content, "sp2");
    assertStringIncludes(set.value.content, "sp3");
    assertEquals(set.value.content.includes("sp1"), false);
  }
});

Deno.test("manuscript_binding subplots: removes subplot from list with action=remove", () => {
  const editor = new FrontmatterEditor();
  const added = editor.addEntities(BASE_MD, "subplots", ["sp1", "sp2"]);
  assertEquals(added.ok, true);
  if (!added.ok) return;

  const removed = editor.removeEntities(added.value.content, "subplots", [
    "sp1",
  ]);
  assertEquals(removed.ok, true);
  if (removed.ok) {
    assertStringIncludes(removed.value.content, "sp2");
    assertEquals(removed.value.content.includes("sp1"), false);
  }
});

Deno.test("manuscript_binding subplots: accepts any subplot ID without validation", () => {
  const editor = new FrontmatterEditor();
  const result = editor.addEntities(BASE_MD, "subplots", ["nonexistent_id"]);
  assertEquals(result.ok, true);
  if (result.ok) assertStringIncludes(result.value.content, "nonexistent_id");
});

Deno.test("manuscript_binding subplots: preserves other entityType behavior (characters)", () => {
  const editor = new FrontmatterEditor();
  const withChar = editor.addEntities(BASE_MD, "characters", ["hero"]);
  assertEquals(withChar.ok, true);
  if (!withChar.ok) return;

  const withSubplot = editor.addEntities(withChar.value.content, "subplots", [
    "sp1",
  ]);
  assertEquals(withSubplot.ok, true);
  if (withSubplot.ok) {
    assertStringIncludes(withSubplot.value.content, "hero");
    assertStringIncludes(withSubplot.value.content, "sp1");
  }
});
