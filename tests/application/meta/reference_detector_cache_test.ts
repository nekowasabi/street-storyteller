import { assertEquals } from "../../asserts.ts";
import type { EntityLoader } from "@storyteller/application/meta/reference_detector.ts";
import { ReferenceDetector } from "@storyteller/application/meta/reference_detector.ts";

Deno.test("reference_detector_cache caches entity loads per project path", async () => {
  let loadCalls = 0;

  const loader: EntityLoader = async (_projectPath, kind) => {
    loadCalls += 1;
    if (kind === "character") {
      return [
        {
          kind: "character",
          id: "hero",
          name: "勇者",
          exportName: "hero",
          filePath: "src/characters/hero.ts",
          displayNames: ["勇者"],
        },
      ];
    }
    return [
      {
        kind: "setting",
        id: "capital",
        name: "王都",
        exportName: "capital",
        filePath: "src/settings/capital.ts",
        displayNames: ["王都"],
      },
    ];
  };

  const detector = new ReferenceDetector(loader);
  const content =
    `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n---\n\n勇者は王都に着いた。\n`;

  await detector.detect(content, {}, "/project");
  await detector.detect(content, {}, "/project");

  // first detect: loads (character + setting), second detect: hits cache
  assertEquals(loadCalls, 2);
});
