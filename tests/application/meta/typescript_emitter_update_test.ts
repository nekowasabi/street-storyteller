import { assertEquals } from "../../asserts.ts";
import { TypeScriptEmitter } from "../../../src/application/meta/typescript_emitter.ts";

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
    "meta_emitter_update",
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

Deno.test("TypeScriptEmitter - updateOrEmit preserves manual sections and updates auto blocks", async () => {
  await withTestDir("preserve_manual", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/types"), { recursive: true });
    await Deno.mkdir(joinPath(projectRoot, "src/characters"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "src/settings"), {
      recursive: true,
    });
    await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });

    await Deno.writeTextFile(
      joinPath(projectRoot, "src/types/chapter.ts"),
      "export type ChapterMeta = { id: string; title: string; order: number; characters: any[]; settings: any[]; validations?: any[]; references?: any; summary?: string; };\n",
    );

    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");

    const meta1 = {
      id: "chapter01",
      title: "初期タイトル",
      order: 1,
      characters: [
        { exportName: "hero", filePath: "src/characters/hero.ts" },
      ],
      settings: [{
        exportName: "kingdom",
        filePath: "src/settings/kingdom.ts",
      }],
      references: {
        "勇者": { exportName: "hero", filePath: "src/characters/hero.ts" },
      },
    };

    const emitter = new TypeScriptEmitter();
    const first = await emitter.emit(meta1, outputPath);
    assertEquals(first.ok, true);

    // Insert manual edits outside auto blocks.
    const existing = await Deno.readTextFile(outputPath);
    const manual = [
      "",
      '  summary: "MANUAL SUMMARY",',
      "  validations: [",
      '    { type: "custom", validate: (content: string) => true },',
      "  ],",
      "",
    ].join("\n");
    const injected = existing.replace(
      "  // storyteller:auto:entities:end\n",
      `  // storyteller:auto:entities:end\n${manual}`,
    );
    await Deno.writeTextFile(outputPath, injected);

    const meta2 = {
      id: "chapter01",
      title: "更新タイトル",
      order: 2,
      characters: [
        { exportName: "heroine", filePath: "src/characters/heroine.ts" },
      ],
      settings: [{
        exportName: "kingdom",
        filePath: "src/settings/kingdom.ts",
      }],
      references: {
        "エリーゼ": {
          exportName: "heroine",
          filePath: "src/characters/heroine.ts",
        },
      },
    };

    const updated = await emitter.updateOrEmit(meta2, outputPath);
    assertEquals(updated.ok, true);

    const code = await Deno.readTextFile(outputPath);
    assertEquals(code.includes('summary: "MANUAL SUMMARY"'), true);
    assertEquals(code.includes("validations: ["), true);

    assertEquals(code.includes("characters: [heroine]"), true);
    assertEquals(code.includes("settings: [kingdom]"), true);
    assertEquals(code.includes('"エリーゼ": heroine'), true);

    assertEquals(
      code.includes('import { heroine } from "../src/characters/heroine.ts";'),
      true,
    );
    assertEquals(
      code.includes('import { hero } from "../src/characters/hero.ts";'),
      false,
    );
  });
});

Deno.test("TypeScriptEmitter - updateOrEmit fails safely without marker blocks", async () => {
  await withTestDir("missing_markers", async (projectRoot) => {
    await Deno.mkdir(joinPath(projectRoot, "src/types"), { recursive: true });
    await Deno.mkdir(joinPath(projectRoot, "manuscripts"), { recursive: true });
    await Deno.writeTextFile(
      joinPath(projectRoot, "src/types/chapter.ts"),
      "export type ChapterMeta = { id: string; title: string; order: number; characters: any[]; settings: any[]; };\n",
    );

    const outputPath = joinPath(projectRoot, "manuscripts/chapter01.meta.ts");
    await Deno.writeTextFile(outputPath, "export const x = 1;\n");

    const emitter = new TypeScriptEmitter();
    const meta = {
      id: "chapter01",
      title: "t",
      order: 1,
      characters: [],
      settings: [],
      references: {},
    };

    const result = await emitter.updateOrEmit(meta, outputPath);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.type, "update_not_supported");
    }
  });
});
