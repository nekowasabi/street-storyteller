import { assertEquals } from "../../asserts.ts";
import { loadBindingFile } from "@storyteller/application/meta/binding_loader.ts";
import { ReferenceDetector } from "@storyteller/application/meta/reference_detector.ts";

function joinPath(...segments: readonly string[]): string {
  let result = "";
  for (const segment of segments) {
    if (segment.length === 0) {
      continue;
    }
    if (segment.startsWith("/")) {
      result = segment.replace(/\/+$/, "");
      continue;
    }
    if (result.endsWith("/")) {
      result = `${result}${segment.replace(/^\/+/, "")}`;
    } else if (result.length === 0) {
      result = segment.replace(/\/+$/, "");
    } else {
      result = `${result}/${segment.replace(/^\/+/, "")}`;
    }
  }
  return result === "" ? "." : result;
}

async function withTestDir(
  testName: string,
  fn: (testDir: string) => Promise<void>,
) {
  const testDir = joinPath(
    Deno.cwd(),
    "test_output",
    "binding_loader",
    testName,
  );
  await Deno.mkdir(testDir, { recursive: true });

  try {
    await fn(testDir);
  } finally {
    try {
      await Deno.remove(testDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

Deno.test("loadBindingFile - returns null when file is missing", async () => {
  await withTestDir("missing", async (dir) => {
    const result = await loadBindingFile(joinPath(dir, "nope.binding.yaml"));
    assertEquals(result, null);
  });
});

Deno.test("loadBindingFile - loads patterns and clamps confidence", async () => {
  await withTestDir("loads_and_clamps", async (dir) => {
    const filePath = joinPath(dir, "hero.binding.yaml");
    await Deno.writeTextFile(
      filePath,
      `version: 1\npatterns:\n  - text: \"勇者\"\n    confidence: 2.5\n  - text: \"アレクス\"\nexcludePatterns:\n  - \"勇者という存在\"\n`,
    );

    const result = await loadBindingFile(filePath);
    assertEquals(!!result, true);
    if (!result) return;
    assertEquals(result.patterns.length, 2);
    assertEquals(result.patterns[0].text, "勇者");
    assertEquals(result.patterns[0].confidence, 1.0);
    assertEquals(result.patterns[1].text, "アレクス");
    assertEquals(result.patterns[1].confidence, 0.95);
    assertEquals(result.excludePatterns.length, 1);
    assertEquals(result.excludePatterns[0], "勇者という存在");
  });
});

Deno.test("loadBindingFile - rejects invalid yaml", async () => {
  await withTestDir("invalid_yaml", async (dir) => {
    const filePath = joinPath(dir, "hero.binding.yaml");
    await Deno.writeTextFile(filePath, "version: 1\npatterns: [\n");

    let threw = false;
    try {
      await loadBindingFile(filePath);
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  });
});

Deno.test("loadBindingFile - rejects invalid schema", async () => {
  await withTestDir("invalid_schema", async (dir) => {
    const filePath = joinPath(dir, "hero.binding.yaml");
    await Deno.writeTextFile(filePath, `version: 2\npatterns: []\n`);

    let threw = false;
    try {
      await loadBindingFile(filePath);
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  });
});

Deno.test("loadBindingFile - accepts legacy references schema", async () => {
  await withTestDir("legacy_schema", async (dir) => {
    const filePath = joinPath(dir, "hero.binding.yaml");
    await Deno.writeTextFile(
      filePath,
      `character: hero\nreferences:\n  - pattern: \"勇者\"\n    confidence: 0.9\n  - pattern: \"アレクス\"\n`,
    );

    const result = await loadBindingFile(filePath);
    assertEquals(!!result, true);
    if (!result) return;
    assertEquals(result.patterns.length, 2);
    assertEquals(result.patterns[0].text, "勇者");
    assertEquals(result.patterns[0].confidence, 0.9);
    assertEquals(result.patterns[1].text, "アレクス");
    assertEquals(result.patterns[1].confidence, 0.95);
  });
});

Deno.test("ReferenceDetector - binding patterns participate in detection", async () => {
  await withTestDir("detector_integration", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.ts"),
      `export const hero = { id: "hero", name: "勇者アレクス", displayNames: ["アレクス"] };\n`,
    );
    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.binding.yaml"),
      `version: 1\npatterns:\n  - text: \"アレクス\"\n    confidence: 0.95\n`,
    );

    const detector = new ReferenceDetector();
    const body = "アレクスは剣を抜いた。";
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n---\n\n${body}\n`;

    const result = await detector.detect(content, {}, projectRoot);
    const hero = result.characters.find((c) => c.id === "hero");
    assertEquals(!!hero, true);
    if (!hero) return;

    assertEquals(hero.matchedPatterns.includes("アレクス"), true);
    assertEquals(hero.patternMatches?.["アレクス"]?.confidence, 0.95);
    assertEquals(hero.confidence, 0.95);
  });
});

Deno.test("ReferenceDetector - binding excludePatterns suppress matches", async () => {
  await withTestDir("detector_exclude", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.ts"),
      `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者"] };\n`,
    );
    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.binding.yaml"),
      `version: 1\npatterns:\n  - text: \"勇者\"\n    confidence: 0.95\nexcludePatterns:\n  - \"勇者という存在\"\n`,
    );

    const detector = new ReferenceDetector();
    const body = "勇者という存在が語られた。";
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n---\n\n${body}\n`;

    const result = await detector.detect(content, {}, projectRoot);
    assertEquals(result.characters.length, 0);
  });
});
