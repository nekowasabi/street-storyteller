import { assert, assertEquals } from "../../asserts.ts";
import { getPreset } from "@storyteller/domain/meta/preset_templates.ts";

Deno.test("preset_templates - battle-scene preset is available", () => {
  const preset = getPreset("battle-scene");
  assertEquals(preset.type, "battle-scene");
  assert(
    preset.validations.some((v) => v.type === "plot_advancement"),
    "Should include plot_advancement",
  );
  const rule = preset.validations.find((v) => v.type === "plot_advancement");
  assert(rule);
  assertEquals(rule.validate.includes("戦"), true);
});

Deno.test("preset_templates - romance-scene preset is available", () => {
  const preset = getPreset("romance-scene");
  assertEquals(preset.type, "romance-scene");
  assert(
    preset.validations.some((v) => v.type === "plot_advancement"),
    "Should include plot_advancement",
  );
  const rule = preset.validations.find((v) => v.type === "plot_advancement");
  assert(rule);
  assertEquals(rule.validate.includes("恋"), true);
});

Deno.test("preset_templates - dialogue preset is available", () => {
  const preset = getPreset("dialogue");
  assertEquals(preset.type, "dialogue");
  assert(
    preset.validations.some((v) => v.type === "plot_advancement"),
    "Should include plot_advancement",
  );
  const rule = preset.validations.find((v) => v.type === "plot_advancement");
  assert(rule);
  assertEquals(rule.validate.includes("「"), true);
});
