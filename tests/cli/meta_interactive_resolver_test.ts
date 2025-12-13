import { assert, assertEquals } from "../asserts.ts";
import { InteractiveResolver } from "../../src/cli/modules/meta/interactive_resolver.ts";
import type { DetectedEntity } from "../../src/application/meta/reference_detector.ts";

Deno.test("InteractiveResolver - resolves ambiguous references via user choice", async () => {
  const outputs: string[] = [];
  const inputs = ["1"]; // choose the first candidate

  const resolver = new InteractiveResolver({
    write: (message) => outputs.push(message),
    prompt: () => Promise.resolve(inputs.shift() ?? null),
  });

  const entities: DetectedEntity[] = [
    {
      kind: "character",
      id: "hero",
      exportName: "hero",
      filePath: "src/characters/hero.ts",
      matchedPatterns: ["彼"],
      patternMatches: { "彼": { occurrences: 1, confidence: 0.6 } },
      occurrences: 1,
      confidence: 0.6,
    },
    {
      kind: "character",
      id: "mentor",
      exportName: "mentor",
      filePath: "src/characters/mentor.ts",
      matchedPatterns: ["彼"],
      patternMatches: { "彼": { occurrences: 1, confidence: 0.6 } },
      occurrences: 1,
      confidence: 0.6,
    },
  ];

  const references = await resolver.resolve(entities, {
    threshold: 0.8,
  });

  assert(references["彼"]);
  assertEquals(references["彼"].exportName, "hero");
  assertEquals(outputs.some((line) => line.includes("彼")), true);
});

Deno.test("InteractiveResolver - allows skipping low-confidence references", async () => {
  const inputs = ["0"]; // skip
  const resolver = new InteractiveResolver({
    write: () => {},
    prompt: () => Promise.resolve(inputs.shift() ?? null),
  });

  const entities: DetectedEntity[] = [
    {
      kind: "character",
      id: "heroine",
      exportName: "heroine",
      filePath: "src/characters/heroine.ts",
      matchedPatterns: ["彼女"],
      patternMatches: { "彼女": { occurrences: 1, confidence: 0.6 } },
      occurrences: 1,
      confidence: 0.6,
    },
  ];

  const references = await resolver.resolve(entities, {
    threshold: 0.8,
  });

  assertEquals("彼女" in references, false);
});
