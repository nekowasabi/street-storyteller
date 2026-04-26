import type { Character } from "@storyteller/types/v2/character.ts";
import type { Setting } from "@storyteller/types/v2/setting.ts";

Deno.test("TypeScript authoring surface remains importable", () => {
  const hero: Character = {
    id: "hero",
    name: "Hero",
    role: "protagonist",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: "Hero summary",
  };
  const setting: Setting = {
    id: "town",
    name: "Town",
    type: "location",
    appearingChapters: [],
    summary: "Town summary",
  };
  if (hero.id !== "hero" || setting.id !== "town") {
    throw new Error("authoring type construction failed");
  }
});
