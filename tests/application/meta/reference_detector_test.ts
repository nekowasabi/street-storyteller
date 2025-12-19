import { assertEquals } from "../../asserts.ts";
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
    "reference_detector",
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

async function writeEntityFixtures(projectRoot: string) {
  await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
    recursive: true,
  });
  await Deno.mkdir(joinPath(projectRoot, "src/settings"), { recursive: true });

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者"], aliases: ["主人公"], pronouns: ["彼"] };\n`,
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/characters/heroine.ts"),
    `export const heroine = { id: "heroine", name: "エリーゼ", displayNames: ["エリーゼ"], aliases: ["エリー"], pronouns: ["彼女"] };\n`,
  );

  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/kingdom.ts"),
    `export const kingdom = { id: "kingdom", name: "王都", displayNames: ["王都"], detectionHints: { commonPatterns: ["王都"], excludePatterns: [], confidence: 0.9 } };\n`,
  );
  await Deno.writeTextFile(
    joinPath(projectRoot, "src/settings/magic_forest.ts"),
    `export const magicForest = { id: "magic_forest", name: "魔法の森", displayNames: ["魔法の森"] };\n`,
  );
}

Deno.test("ReferenceDetector - prioritizes frontmatter characters", async () => {
  await withTestDir("frontmatter_characters", async (projectRoot) => {
    await writeEntityFixtures(projectRoot);

    const detector = new ReferenceDetector();
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n  characters:\n    - hero\n---\n\n本文\n`;

    const frontmatter = { characters: ["hero"] };

    const result = await detector.detect(content, frontmatter, projectRoot);

    assertEquals(result.characters.some((c) => c.id === "hero"), true);
  });
});

Deno.test("ReferenceDetector - prioritizes frontmatter settings", async () => {
  await withTestDir("frontmatter_settings", async (projectRoot) => {
    await writeEntityFixtures(projectRoot);

    const detector = new ReferenceDetector();
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n  settings:\n    - kingdom\n---\n\n本文\n`;

    const frontmatter = { settings: ["kingdom"] };

    const result = await detector.detect(content, frontmatter, projectRoot);

    assertEquals(result.settings.some((s) => s.id === "kingdom"), true);
  });
});

Deno.test("ReferenceDetector - detects exact matches from body (Phase 1)", async () => {
  await withTestDir("body_exact_match", async (projectRoot) => {
    await writeEntityFixtures(projectRoot);

    const detector = new ReferenceDetector();
    const body = "勇者は王都に着いた。エリーゼも一緒だ。";
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n---\n\n${body}\n`;

    const frontmatter = {};

    const result = await detector.detect(content, frontmatter, projectRoot);

    assertEquals(result.characters.some((c) => c.id === "hero"), true);
    assertEquals(result.characters.some((c) => c.id === "heroine"), true);
    assertEquals(result.settings.some((s) => s.id === "kingdom"), true);
  });
});

Deno.test("ReferenceDetector - merges frontmatter and body detections (hybrid)", async () => {
  await withTestDir("hybrid_merge", async (projectRoot) => {
    await writeEntityFixtures(projectRoot);

    const detector = new ReferenceDetector();
    const body = "魔法の森でエリーゼが待っていた。";
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n  characters:\n    - hero\n---\n\n${body}\n`;

    const frontmatter = { characters: ["hero"] };

    const result = await detector.detect(content, frontmatter, projectRoot);

    assertEquals(result.characters.some((c) => c.id === "hero"), true);
    assertEquals(result.characters.some((c) => c.id === "heroine"), true);
    assertEquals(result.settings.some((s) => s.id === "magic_forest"), true);
  });
});

Deno.test("ReferenceDetector - detects using displayNames with confidence 0.9 (Phase 2)", async () => {
  await withTestDir("display_names", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.ts"),
      `export const hero = { id: "hero", name: "勇者アレクス", displayNames: ["勇者", "アレクス"] };\n`,
    );

    const detector = new ReferenceDetector();
    const body = "アレクスは剣を抜いた。";
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n---\n\n${body}\n`;
    const frontmatter = {};

    const result = await detector.detect(content, frontmatter, projectRoot);
    const hero = result.characters.find((c) => c.id === "hero");
    assertEquals(!!hero, true);
    if (hero) {
      assertEquals(hero.matchedPatterns.includes("アレクス"), true);
      assertEquals(hero.confidence, 0.9);
    }
  });
});

Deno.test("ReferenceDetector - detects using aliases with confidence 0.8 (Phase 2)", async () => {
  await withTestDir("aliases", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.ts"),
      `export const hero = { id: "hero", name: "勇者", aliases: ["主人公"] };\n`,
    );

    const detector = new ReferenceDetector();
    const body = "主人公は目を覚ました。";
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n---\n\n${body}\n`;
    const frontmatter = {};

    const result = await detector.detect(content, frontmatter, projectRoot);
    const hero = result.characters.find((c) => c.id === "hero");
    assertEquals(!!hero, true);
    if (hero) {
      assertEquals(hero.matchedPatterns.includes("主人公"), true);
      assertEquals(hero.confidence, 0.8);
    }
  });
});

Deno.test("ReferenceDetector - detects using pronouns with confidence 0.6 (Phase 2)", async () => {
  await withTestDir("pronouns", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/characters/hero.ts"),
      `export const hero = { id: "hero", name: "勇者", pronouns: ["彼"] };\n`,
    );

    const detector = new ReferenceDetector();
    const body = "彼は立ち上がった。";
    const content =
      `---\nstoryteller:\n  chapter_id: chapter01\n  title: test\n  order: 1\n---\n\n${body}\n`;
    const frontmatter = {};

    const result = await detector.detect(content, frontmatter, projectRoot);
    const hero = result.characters.find((c) => c.id === "hero");
    assertEquals(!!hero, true);
    if (hero) {
      assertEquals(hero.matchedPatterns.includes("彼"), true);
      assertEquals(hero.confidence, 0.6);
    }
  });
});
