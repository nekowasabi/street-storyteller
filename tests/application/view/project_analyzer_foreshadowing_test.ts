/**
 * ProjectAnalyzer Foreshadowing テスト（TDD Red Phase）
 *
 * ProjectAnalyzerがForeshadowingを正しくロードすることを検証
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  type ForeshadowingSummary,
  ProjectAnalyzer,
} from "../../../src/application/view/project_analyzer.ts";
import type { Foreshadowing } from "../../../src/type/v2/foreshadowing.ts";

Deno.test("ProjectAnalyzer Foreshadowing", async (t) => {
  await t.step(
    "ProjectAnalysisにforeshadowingsフィールドが含まれること",
    async () => {
      const tempDir = await Deno.makeTempDir();

      try {
        // 空のディレクトリ構造を作成
        await Deno.mkdir(`${tempDir}/src/foreshadowings`, { recursive: true });

        const analyzer = new ProjectAnalyzer();
        const result = await analyzer.analyzeProject(tempDir);

        assertEquals(result.ok, true);
        if (result.ok) {
          assertExists(result.value.foreshadowings);
          assertEquals(Array.isArray(result.value.foreshadowings), true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step("src/foreshadowings/*.tsから伏線をロードすること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const foreshadowing: Foreshadowing = {
        id: "ancient_sword",
        name: "古びた剣",
        type: "chekhov",
        summary: "床板の下から発見される剣",
        planting: {
          chapter: "chapter_01",
          description: "剣を発見する",
        },
        status: "planted",
        importance: "major",
      };

      // TypeScriptファイルを作成
      await Deno.writeTextFile(
        `${foreshadowingsDir}/ancient_sword.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

export const ancient_sword: Foreshadowing = ${
          JSON.stringify(foreshadowing, null, 2)
        };`,
      );

      const analyzer = new ProjectAnalyzer();
      const result = await analyzer.analyzeProject(tempDir);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertExists(result.value.foreshadowings);
        assertEquals(result.value.foreshadowings.length, 1);

        const loadedForeshadowing = result.value.foreshadowings[0];
        assertEquals(loadedForeshadowing.id, "ancient_sword");
        assertEquals(loadedForeshadowing.name, "古びた剣");
        assertEquals(loadedForeshadowing.type, "chekhov");
        assertEquals(loadedForeshadowing.status, "planted");
        assertEquals(loadedForeshadowing.importance, "major");
        assertEquals(loadedForeshadowing.plantingChapter, "chapter_01");
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("ForeshadowingSummary型が正しく返されること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const foreshadowing: Foreshadowing = {
        id: "resolved_mystery",
        name: "解決された謎",
        type: "mystery",
        summary: "謎が解決される",
        planting: {
          chapter: "chapter_01",
          description: "謎が提示される",
        },
        status: "resolved",
        resolutions: [
          {
            chapter: "chapter_05",
            description: "謎の一部が解ける",
            completeness: 0.5,
          },
          {
            chapter: "chapter_10",
            description: "謎が完全に解決",
            completeness: 1.0,
          },
        ],
        plannedResolutionChapter: "chapter_10",
        relations: {
          characters: ["hero", "villain"],
          settings: ["dungeon"],
        },
        displayNames: ["大いなる謎", "秘密"],
      };

      await Deno.writeTextFile(
        `${foreshadowingsDir}/resolved_mystery.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

export const resolved_mystery: Foreshadowing = ${
          JSON.stringify(foreshadowing, null, 2)
        };`,
      );

      const analyzer = new ProjectAnalyzer();
      const result = await analyzer.analyzeProject(tempDir);

      assertEquals(result.ok, true);
      if (result.ok) {
        const loadedForeshadowing = result.value.foreshadowings[0];

        // ForeshadowingSummaryのフィールドを確認
        assertEquals(loadedForeshadowing.id, "resolved_mystery");
        assertEquals(loadedForeshadowing.name, "解決された謎");
        assertEquals(loadedForeshadowing.type, "mystery");
        assertEquals(loadedForeshadowing.status, "resolved");
        assertEquals(loadedForeshadowing.summary, "謎が解決される");
        assertEquals(loadedForeshadowing.plantingChapter, "chapter_01");
        assertEquals(
          loadedForeshadowing.plannedResolutionChapter,
          "chapter_10",
        );

        // 回収情報
        assertExists(loadedForeshadowing.resolutions);
        assertEquals(loadedForeshadowing.resolutions.length, 2);
        assertEquals(loadedForeshadowing.resolutions[0].chapter, "chapter_05");
        assertEquals(loadedForeshadowing.resolutions[0].completeness, 0.5);

        // 関連エンティティ
        assertExists(loadedForeshadowing.relatedCharacters);
        assertEquals(loadedForeshadowing.relatedCharacters.length, 2);
        assertExists(loadedForeshadowing.relatedSettings);
        assertEquals(loadedForeshadowing.relatedSettings.length, 1);

        // ファイルパス
        assertExists(loadedForeshadowing.filePath);
        assertEquals(
          loadedForeshadowing.filePath.includes("foreshadowings"),
          true,
        );
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("複数の伏線をロードできること", async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
      await Deno.mkdir(foreshadowingsDir, { recursive: true });

      const foreshadowing1: Foreshadowing = {
        id: "sword",
        name: "剣",
        type: "chekhov",
        summary: "剣の伏線",
        planting: {
          chapter: "chapter_01",
          description: "剣",
        },
        status: "planted",
      };

      const foreshadowing2: Foreshadowing = {
        id: "prophecy",
        name: "予言",
        type: "prophecy",
        summary: "予言の伏線",
        planting: {
          chapter: "chapter_02",
          description: "予言",
        },
        status: "resolved",
        resolutions: [
          {
            chapter: "chapter_10",
            description: "成就",
            completeness: 1.0,
          },
        ],
      };

      await Deno.writeTextFile(
        `${foreshadowingsDir}/sword.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const sword: Foreshadowing = ${
          JSON.stringify(foreshadowing1, null, 2)
        };`,
      );

      await Deno.writeTextFile(
        `${foreshadowingsDir}/prophecy.ts`,
        `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const prophecy: Foreshadowing = ${
          JSON.stringify(foreshadowing2, null, 2)
        };`,
      );

      const analyzer = new ProjectAnalyzer();
      const result = await analyzer.analyzeProject(tempDir);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.foreshadowings.length, 2);
      }
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step(
    "伏線ディレクトリが存在しない場合は空配列を返すこと",
    async () => {
      const tempDir = await Deno.makeTempDir();

      try {
        // foreshadowingsディレクトリを作成しない

        const analyzer = new ProjectAnalyzer();
        const result = await analyzer.analyzeProject(tempDir);

        assertEquals(result.ok, true);
        if (result.ok) {
          assertExists(result.value.foreshadowings);
          assertEquals(result.value.foreshadowings.length, 0);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  // ========================================
  // process4: 原稿での伏線参照検出テスト
  // ========================================

  await t.step(
    "原稿内の伏線参照を検出できること",
    async () => {
      const tempDir = await Deno.makeTempDir();

      try {
        // 伏線定義を作成
        const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
        await Deno.mkdir(foreshadowingsDir, { recursive: true });

        const foreshadowing: Foreshadowing = {
          id: "glass_slipper",
          name: "ガラスの靴",
          type: "chekhov",
          summary: "シンデレラが落としたガラスの靴",
          planting: {
            chapter: "chapter_01",
            description: "舞踏会の帰り道に落とす",
          },
          status: "planted",
          displayNames: ["ガラスの靴", "輝く靴"],
        };

        await Deno.writeTextFile(
          `${foreshadowingsDir}/glass_slipper.ts`,
          `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";
export const glass_slipper: Foreshadowing = ${
            JSON.stringify(foreshadowing, null, 2)
          };`,
        );

        // 原稿を作成
        const manuscriptsDir = `${tempDir}/manuscripts`;
        await Deno.mkdir(manuscriptsDir, { recursive: true });

        await Deno.writeTextFile(
          `${manuscriptsDir}/chapter_01.md`,
          `---
storyteller:
  chapter_id: chapter_01
  title: "灰かぶり姫の日常"
  order: 1
---

シンデレラはガラスの靴を見つめた。
輝く靴が光を放っていた。
`,
        );

        const analyzer = new ProjectAnalyzer();
        const result = await analyzer.analyzeProject(tempDir);

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value.manuscripts.length, 1);
          const manuscript = result.value.manuscripts[0];

          // 伏線参照が検出されること
          const foreshadowingRef = manuscript.referencedEntities.find(
            (e) => e.kind === "foreshadowing" && e.id === "glass_slipper",
          );
          assertExists(foreshadowingRef);
          assertEquals(foreshadowingRef.occurrences >= 1, true);
        }
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );
});
