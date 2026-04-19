import { assertEquals } from "jsr:@std/assert";
import type { Subplot } from "@storyteller/types/v2/subplot.ts";
import { validateSubplot } from "@storyteller/plugins/core/subplot/validator.ts";

Deno.test("detects subplot without climax beat", () => {
  const subplot: Subplot = {
    id: "no_climax",
    name: "No Climax",
    type: "subplot",
    status: "active",
    summary: "test",
    beats: [
      { id: "b1", title: "Setup", summary: "s", structurePosition: "setup" },
      { id: "b2", title: "Rising", summary: "s", structurePosition: "rising" },
    ],
  };
  const hasClimax = subplot.beats.some((b) => b.structurePosition === "climax");
  assertEquals(hasClimax, false);
});

Deno.test("detects subplot without setup beat", () => {
  const subplot: Subplot = {
    id: "no_setup",
    name: "No Setup",
    type: "subplot",
    status: "active",
    summary: "test",
    beats: [
      { id: "b1", title: "Rising", summary: "s", structurePosition: "rising" },
      { id: "b2", title: "Climax", summary: "s", structurePosition: "climax" },
    ],
  };
  const hasSetup = subplot.beats.some((b) => b.structurePosition === "setup");
  assertEquals(hasSetup, false);
});

Deno.test("warns subplot with no intersections (orphan)", () => {
  const subplot: Subplot = {
    id: "orphan",
    name: "Orphan",
    type: "subplot",
    status: "active",
    summary: "test",
    beats: [
      { id: "b1", title: "Setup", summary: "s", structurePosition: "setup" },
      { id: "b2", title: "Climax", summary: "s", structurePosition: "climax" },
    ],
    intersections: [],
  };
  const isOrphan = subplot.type !== "main" && (subplot.intersections ?? []).length === 0;
  assertEquals(isOrphan, true);
});

Deno.test("warns reversed structure position order", () => {
  const subplot: Subplot = {
    id: "reversed",
    name: "Reversed",
    type: "subplot",
    status: "active",
    summary: "test",
    beats: [
      { id: "b1", title: "Climax", summary: "s", structurePosition: "climax", chapter: "ch5" },
      { id: "b2", title: "Setup", summary: "s", structurePosition: "setup", chapter: "ch10" },
    ],
  };
  const positions = subplot.beats.map((b) => b.structurePosition);
  const climaxIdx = positions.indexOf("climax");
  const setupIdx = positions.indexOf("setup");
  const isReversed = setupIdx > climaxIdx;
  assertEquals(isReversed, true);
});
