import { assertEquals } from "../../asserts.ts";
import { TypeScriptEmitter } from "@storyteller/application/meta/typescript_emitter.ts";

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
  const testDir = joinPath(Deno.cwd(), "test_output", "meta_emitter", testName);
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

Deno.test("TypeScriptEmitter - writes ChapterMeta TypeScript file", async () => {
  await withTestDir("writes_file", async (testDir) => {
    // Minimal project structure for import path resolution
    await Deno.mkdir(joinPath(testDir, "src/types"), { recursive: true });
    await Deno.mkdir(joinPath(testDir, "src/characters"), { recursive: true });
    await Deno.mkdir(joinPath(testDir, "src/settings"), { recursive: true });
    await Deno.mkdir(joinPath(testDir, "manuscripts"), { recursive: true });

    await Deno.writeTextFile(
      joinPath(testDir, "src/types/chapter.ts"),
      "export type ChapterMeta = { id: string; title: string; order: number; characters: any[]; settings: any[]; };\n",
    );

    const outputPath = joinPath(testDir, "manuscripts/chapter01.meta.ts");

    const meta = {
      id: "chapter01",
      title: "旅の始まり",
      order: 1,
      characters: [
        {
          kind: "character",
          id: "hero",
          exportName: "hero",
          filePath: "src/characters/hero.ts",
          matchedPatterns: ["勇者"],
          occurrences: 2,
          confidence: 1.0,
        },
      ],
      settings: [
        {
          kind: "setting",
          id: "kingdom",
          exportName: "kingdom",
          filePath: "src/settings/kingdom.ts",
          matchedPatterns: ["王都"],
          occurrences: 1,
          confidence: 1.0,
        },
      ],
      validations: [
        {
          type: "character_presence",
          validate: '(content: string) => content.includes("勇者")',
          message: "主人公が登場していません",
        },
      ],
      references: {
        "勇者": {
          kind: "character",
          id: "hero",
          exportName: "hero",
          filePath: "src/characters/hero.ts",
        },
        "王都": {
          kind: "setting",
          id: "kingdom",
          exportName: "kingdom",
          filePath: "src/settings/kingdom.ts",
        },
      },
    };

    const emitter = new TypeScriptEmitter();
    const result = await emitter.emit(meta, outputPath);

    assertEquals(result.ok, true);

    const code = await Deno.readTextFile(outputPath);
    assertEquals(code.includes("自動生成: storyteller meta generate"), true);
    assertEquals(code.includes("import type { ChapterMeta }"), true);
    assertEquals(code.includes('from "../src/types/chapter.ts"'), true);
    assertEquals(
      code.includes('import { hero } from "../src/characters/hero.ts";'),
      true,
    );
    assertEquals(
      code.includes('import { kingdom } from "../src/settings/kingdom.ts";'),
      true,
    );
    assertEquals(
      code.includes("export const chapter01Meta: ChapterMeta"),
      true,
    );
    assertEquals(code.includes('id: "chapter01"'), true);
    assertEquals(code.includes("characters: [hero]"), true);
    assertEquals(code.includes("settings: [kingdom]"), true);
    assertEquals(code.includes('"勇者": hero'), true);
    assertEquals(code.includes('"王都": kingdom'), true);
  });
});
