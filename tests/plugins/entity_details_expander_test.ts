/**
 * EntityDetailsExpander のテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { EntityDetailsExpander } from "@storyteller/plugins/features/details/entity_details_expander.ts";

const TEST_PROJECT_ROOT = "/tmp/test_entity_details_expander";

// テスト前にテスト用のディレクトリとファイルを作成
async function setupTestFiles(): Promise<void> {
  // テスト用ディレクトリを作成
  await Deno.mkdir(`${TEST_PROJECT_ROOT}/src/characters`, { recursive: true });
  await Deno.mkdir(`${TEST_PROJECT_ROOT}/details`, { recursive: true });

  // 詳細ファイル
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/details/hero_backstory.md`,
    `---
title: 勇者の過去
---
勇者は幼い頃に両親を亡くし、祖父に育てられた。`,
  );

  // TypeScriptエンティティファイル（details付き）
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/src/characters/hero.ts`,
    `export const hero = {
  id: "hero",
  name: "勇者",
  role: "protagonist",
  traits: ["勇敢", "正義感"],
  relationships: {},
  appearingChapters: ["chapter_01"],
  summary: "物語の主人公",
  displayNames: ["勇者", "英雄"],
  details: {
    description: "若き勇者の冒険者",
    backstory: { file: "details/hero_backstory.md" },
    personality: "正義感が強く、困っている人を放っておけない性格。"
  }
};`,
  );

  // detailsなしのエンティティファイル
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/src/characters/villager.ts`,
    `export const villager = {
  id: "villager",
  name: "村人",
  role: "supporting",
  traits: ["親切"],
  relationships: {},
  appearingChapters: ["chapter_01"],
  summary: "村の住人",
  displayNames: ["村人"]
};`,
  );
}

// テスト後にテスト用のディレクトリを削除
async function cleanupTestFiles(): Promise<void> {
  try {
    await Deno.remove(TEST_PROJECT_ROOT, { recursive: true });
  } catch {
    // 無視
  }
}

Deno.test("EntityDetailsExpander", async (t) => {
  // テスト前のセットアップ
  await setupTestFiles();

  try {
    await t.step(
      "expandDetails - インライン文字列とファイル参照を展開する",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const result = await expander.expandDetails({
          description: "直接指定の説明",
          backstory: { file: "details/hero_backstory.md" },
        });

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value.description, "直接指定の説明");
          assertEquals(
            result.value.backstory,
            "勇者は幼い頃に両親を亡くし、祖父に育てられた。",
          );
        }
      },
    );

    await t.step(
      "expandDetails - 存在しないファイルはundefinedになる",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const result = await expander.expandDetails({
          description: "説明",
          backstory: { file: "details/nonexistent.md" },
        });

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value.description, "説明");
          assertEquals(result.value.backstory, undefined);
        }
      },
    );

    await t.step(
      "expandFromFile - エンティティファイルからdetailsを展開する",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const result = await expander.expandFromFile(
          "src/characters/hero.ts",
          "hero",
        );

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value.description, "若き勇者の冒険者");
          assertEquals(
            result.value.backstory,
            "勇者は幼い頃に両親を亡くし、祖父に育てられた。",
          );
          assertEquals(
            result.value.personality,
            "正義感が強く、困っている人を放っておけない性格。",
          );
        }
      },
    );

    await t.step(
      "expandFromFile - detailsがないエンティティはエラーを返す",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const result = await expander.expandFromFile(
          "src/characters/villager.ts",
          "villager",
        );

        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.type, "no_details");
        }
      },
    );

    await t.step(
      "expandFromFile - 存在しないファイルはエラーを返す",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const result = await expander.expandFromFile(
          "src/characters/nonexistent.ts",
          "nonexistent",
        );

        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.type, "import_failed");
        }
      },
    );

    await t.step(
      "expandFromFile - 存在しないエンティティIDはエラーを返す",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const result = await expander.expandFromFile(
          "src/characters/hero.ts",
          "wrong_id",
        );

        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.type, "entity_not_found");
        }
      },
    );

    await t.step(
      "expandEntityDetails - サマリーにdetailsを追加して返す",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const summary = {
          id: "hero",
          name: "勇者",
          summary: "物語の主人公",
          filePath: "src/characters/hero.ts",
        };

        const expanded = await expander.expandEntityDetails(
          summary,
          summary.filePath,
          summary.id,
        );

        assertEquals(expanded.id, "hero");
        assertEquals(expanded.name, "勇者");
        assertExists((expanded as { details?: unknown }).details);
        const details =
          (expanded as { details: Record<string, string | undefined> }).details;
        assertEquals(details.description, "若き勇者の冒険者");
      },
    );

    await t.step(
      "expandEntityDetails - detailsがない場合は元のサマリーを返す",
      async () => {
        const expander = new EntityDetailsExpander(TEST_PROJECT_ROOT);
        const summary = {
          id: "villager",
          name: "村人",
          summary: "村の住人",
          filePath: "src/characters/villager.ts",
        };

        const expanded = await expander.expandEntityDetails(
          summary,
          summary.filePath,
          summary.id,
        );

        assertEquals(expanded.id, "villager");
        assertEquals(expanded.name, "村人");
        // detailsがないのでそのまま返される
        assertEquals((expanded as { details?: unknown }).details, undefined);
      },
    );
  } finally {
    // テスト後のクリーンアップ
    await cleanupTestFiles();
  }
});
