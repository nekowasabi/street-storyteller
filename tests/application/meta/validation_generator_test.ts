import { assert, assertEquals } from "../../asserts.ts";
import { ValidationGenerator } from "../../../src/application/meta/validation_generator.ts";
import type { DetectionResult } from "../../../src/application/meta/reference_detector.ts";

Deno.test("ValidationGenerator - generates character_presence rules", () => {
  const generator = new ValidationGenerator();
  const detected: DetectionResult = {
    characters: [
      {
        kind: "character",
        id: "hero",
        exportName: "hero",
        filePath: "src/characters/hero.ts",
        matchedPatterns: ["勇者", "アレクス"],
        occurrences: 3,
        confidence: 0.95,
      },
    ],
    settings: [],
    confidence: 0.95,
  };

  const validations = generator.generate(detected);

  const rule = validations.find((v) => v.type === "character_presence");
  assert(rule, "character_presence rule should exist");
  assertEquals(rule.validate.includes('content.includes("勇者")'), true);
  assertEquals(rule.validate.includes('content.includes("アレクス")'), true);
});

Deno.test("ValidationGenerator - generates setting_consistency rules", () => {
  const generator = new ValidationGenerator();
  const detected: DetectionResult = {
    characters: [],
    settings: [
      {
        kind: "setting",
        id: "kingdom",
        exportName: "kingdom",
        filePath: "src/settings/kingdom.ts",
        matchedPatterns: ["王都", "城門"],
        occurrences: 2,
        confidence: 0.9,
      },
    ],
    confidence: 0.9,
  };

  const validations = generator.generate(detected);

  const rule = validations.find((v) => v.type === "setting_consistency");
  assert(rule, "setting_consistency rule should exist");
  assertEquals(rule.validate.includes('content.includes("王都")'), true);
  assertEquals(rule.validate.includes('content.includes("城門")'), true);
});

Deno.test("ValidationGenerator - includes an empty custom template", () => {
  const generator = new ValidationGenerator();
  const detected: DetectionResult = {
    characters: [],
    settings: [],
    confidence: 0,
  };

  const validations = generator.generate(detected);

  const custom = validations.find((v) => v.type === "custom");
  assert(custom, "custom template should exist");
  assertEquals(custom.validate.includes("TODO"), true);
});
