/**
 * BatchOperations テスト
 */

import { assertEquals } from "@std/assert";
import { BatchOperations } from "@storyteller/application/batch_operations.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

Deno.test("BatchOperations", async (t) => {
  await t.step(
    "addDetailsToMultipleCharacters - 複数キャラクターに詳細を一括追加",
    async () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "主人公",
        },
        {
          id: "villain",
          name: "魔王",
          role: "antagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "敵",
        },
      ];

      const batch = new BatchOperations();
      const result = await batch.addDetailsToMultipleCharacters(characters, [
        "appearance",
        "personality",
      ]);

      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.updatedCharacters.length, 2);
        assertEquals(
          result.value.updatedCharacters[0].details?.appearance !== undefined,
          true,
        );
        assertEquals(
          result.value.updatedCharacters[0].details?.personality !== undefined,
          true,
        );
        assertEquals(
          result.value.updatedCharacters[1].details?.appearance !== undefined,
          true,
        );
        assertEquals(
          result.value.updatedCharacters[1].details?.personality !== undefined,
          true,
        );
      }
    },
  );

  await t.step(
    "addDetailsToMultipleCharacters - 役割フィルタリング",
    async () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "主人公",
        },
        {
          id: "villain",
          name: "魔王",
          role: "antagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "敵",
        },
        {
          id: "friend",
          name: "仲間",
          role: "supporting",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "サポート",
        },
      ];

      const batch = new BatchOperations();
      const result = await batch.addDetailsToMultipleCharacters(
        characters,
        ["appearance"],
        { roleFilter: ["protagonist", "antagonist"] },
      );

      assertEquals(result.ok, true);
      if (result.ok) {
        // protagonistとantagonistのみ
        assertEquals(result.value.updatedCharacters.length, 2);
        assertEquals(
          result.value.updatedCharacters.every((c) =>
            c.role === "protagonist" || c.role === "antagonist"
          ),
          true,
        );
      }
    },
  );

  await t.step(
    "addDetailsToMultipleCharacters - チャプターフィルタリング",
    async () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: ["chapter1", "chapter2"],
          summary: "主人公",
        },
        {
          id: "villain",
          name: "魔王",
          role: "antagonist",
          traits: [],
          relationships: {},
          appearingChapters: ["chapter2", "chapter3"],
          summary: "敵",
        },
        {
          id: "friend",
          name: "仲間",
          role: "supporting",
          traits: [],
          relationships: {},
          appearingChapters: ["chapter1"],
          summary: "サポート",
        },
      ];

      const batch = new BatchOperations();
      const result = await batch.addDetailsToMultipleCharacters(
        characters,
        ["appearance"],
        { chapterFilter: ["chapter1"] },
      );

      assertEquals(result.ok, true);
      if (result.ok) {
        // chapter1に登場するキャラクターのみ
        assertEquals(result.value.updatedCharacters.length, 2);
        assertEquals(
          result.value.updatedCharacters.every((c) =>
            c.appearingChapters.includes("chapter1")
          ),
          true,
        );
      }
    },
  );

  await t.step(
    "addDetailsToMultipleCharacters - 既存詳細は上書きしない",
    async () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "主人公",
          details: {
            appearance: "既存の外見",
          },
        },
      ];

      const batch = new BatchOperations();
      const result = await batch.addDetailsToMultipleCharacters(characters, [
        "appearance",
        "personality",
      ]);

      assertEquals(result.ok, true);
      if (result.ok) {
        // appearance は既存のまま
        assertEquals(
          result.value.updatedCharacters[0].details?.appearance,
          "既存の外見",
        );
        // personality は追加される
        assertEquals(
          result.value.updatedCharacters[0].details?.personality !== undefined,
          true,
        );
      }
    },
  );

  await t.step(
    "addDetailsToMultipleCharacters - エラーハンドリング",
    async () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "主人公",
        },
      ];

      const batch = new BatchOperations();
      const result = await batch.addDetailsToMultipleCharacters(characters, [
        "invalid_field" as any,
      ]);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.message.includes("Invalid"), true);
      }
    },
  );
});
