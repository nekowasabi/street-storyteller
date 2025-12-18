/**
 * ViewCharacterCommand --details オプションテスト
 *
 * --details オプション指定時に、キャラクターのdetailsフィールドが
 * 展開表示されることを検証
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  CharacterLoader,
  ViewCharacterCommand,
} from "../../../../src/cli/modules/view/character.ts";
import { createMockContext } from "../../../test_utils/mock_context.ts";
import type { Character } from "../../../../src/type/v2/character.ts";
import type { OutputPresenter } from "../../../../src/cli/types.ts";

/**
 * テスト用のCharacterLoader（インメモリ）
 */
class MockCharacterLoader implements CharacterLoader {
  constructor(private characters: Map<string, Character>) {}

  async loadCharacter(id: string): Promise<Character> {
    const character = this.characters.get(id);
    if (!character) {
      throw new Error(`Character not found: ${id}`);
    }
    return Promise.resolve(character);
  }
}

Deno.test("ViewCharacterCommand --details option", async (t) => {
  await t.step(
    "--details未指定時はdetailsセクションが表示されないこと",
    async () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: { mentor: "mentor" },
        appearingChapters: ["chapter_01"],
        summary: "世界を救う勇者",
        details: {
          appearance: "銀髪に青い瞳",
          personality: "真面目で正義感が強い",
          backstory: "小さな村で育った",
        },
      };

      const loader = new MockCharacterLoader(new Map([["hero", character]]));
      const command = new ViewCharacterCommand(loader);
      const context = createMockContext({
        args: {
          id: "hero",
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      // 出力にDetailsセクションが含まれていないことを確認
      const presenter = context.presenter as OutputPresenter & {
        logs: string[];
      };
      const output = presenter.logs.join("\n");
      assertEquals(output.includes("## Details"), false);
      assertEquals(output.includes("### Appearance"), false);
    },
  );

  await t.step(
    "--details指定時にインライン文字列が展開表示されること",
    async () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: { mentor: "mentor" },
        appearingChapters: ["chapter_01"],
        summary: "世界を救う勇者",
        details: {
          appearance: "銀髪に青い瞳",
          personality: "真面目で正義感が強い",
          backstory: "小さな村で育った",
        },
      };

      const loader = new MockCharacterLoader(new Map([["hero", character]]));
      const command = new ViewCharacterCommand(loader);
      const context = createMockContext({
        args: {
          id: "hero",
          details: true,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      // 出力にDetailsセクションが含まれていることを確認
      const presenter = context.presenter as OutputPresenter & {
        logs: string[];
      };
      const output = presenter.logs.join("\n");
      assertStringIncludes(output, "## Details");
      assertStringIncludes(output, "### Appearance");
      assertStringIncludes(output, "銀髪に青い瞳");
      assertStringIncludes(output, "### Personality");
      assertStringIncludes(output, "真面目で正義感が強い");
      assertStringIncludes(output, "### Backstory");
      assertStringIncludes(output, "小さな村で育った");
    },
  );

  await t.step(
    "--details指定時にファイル参照の内容が読み込まれ表示されること",
    async () => {
      // テスト用の一時ディレクトリを作成
      const tempDir = await Deno.makeTempDir();

      try {
        // ファイルを作成
        const backstoryContent = `---
title: 勇者の過去
---

勇者は遠い過去、小さな村で生まれ育った。
彼の運命が変わったのは、15歳の夏のことだった。`;

        await Deno.mkdir(`${tempDir}/docs/characters`, { recursive: true });
        await Deno.writeTextFile(
          `${tempDir}/docs/characters/hero_backstory.md`,
          backstoryContent,
        );

        const character: Character = {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: ["勇敢", "正義感"],
          relationships: { mentor: "mentor" },
          appearingChapters: ["chapter_01"],
          summary: "世界を救う勇者",
          details: {
            appearance: "銀髪に青い瞳",
            backstory: { file: "docs/characters/hero_backstory.md" },
          },
        };

        const loader = new MockCharacterLoader(new Map([["hero", character]]));
        const command = new ViewCharacterCommand(loader);
        const context = createMockContext({
          args: {
            id: "hero",
            details: true,
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        // 出力にファイル内容が含まれていることを確認（フロントマター除去後）
        const presenter = context.presenter as OutputPresenter & {
          logs: string[];
        };
        const output = presenter.logs.join("\n");
        assertStringIncludes(output, "## Details");
        assertStringIncludes(output, "### Backstory");
        assertStringIncludes(
          output,
          "勇者は遠い過去、小さな村で生まれ育った。",
        );
        assertStringIncludes(
          output,
          "彼の運命が変わったのは、15歳の夏のことだった。",
        );
        // フロントマターが除去されていることを確認
        assertEquals(output.includes("title: 勇者の過去"), false);
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "--details指定時にファイルが見つからない場合はエラー表示すること",
    async () => {
      const tempDir = await Deno.makeTempDir();

      try {
        const character: Character = {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: ["勇敢", "正義感"],
          relationships: {},
          appearingChapters: ["chapter_01"],
          summary: "世界を救う勇者",
          details: {
            backstory: { file: "docs/nonexistent.md" },
          },
        };

        const loader = new MockCharacterLoader(new Map([["hero", character]]));
        const command = new ViewCharacterCommand(loader);
        const context = createMockContext({
          args: {
            id: "hero",
            details: true,
            projectRoot: tempDir,
          },
        });

        const result = await command.execute(context);
        assertEquals(result.ok, true);

        // 出力にエラーメッセージが含まれていることを確認
        const presenter = context.presenter as OutputPresenter & {
          logs: string[];
        };
        const output = presenter.logs.join("\n");
        assertStringIncludes(output, "### Backstory");
        assertStringIncludes(output, "[File not found: docs/nonexistent.md]");
      } finally {
        await Deno.remove(tempDir, { recursive: true });
      }
    },
  );

  await t.step(
    "--details指定時にdevelopmentフィールドが展開表示されること",
    async () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: {},
        appearingChapters: ["chapter_01"],
        summary: "世界を救う勇者",
        details: {
          development: {
            initial: "臆病な少年",
            goal: "世界を救う勇者になる",
            obstacle: "自分への自信のなさ",
            resolution: "仲間との絆で成長",
          },
        },
      };

      const loader = new MockCharacterLoader(new Map([["hero", character]]));
      const command = new ViewCharacterCommand(loader);
      const context = createMockContext({
        args: {
          id: "hero",
          details: true,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      const presenter = context.presenter as OutputPresenter & {
        logs: string[];
      };
      const output = presenter.logs.join("\n");
      assertStringIncludes(output, "### Development");
      assertStringIncludes(output, "**Initial:** 臆病な少年");
      assertStringIncludes(output, "**Goal:** 世界を救う勇者になる");
      assertStringIncludes(output, "**Obstacle:** 自分への自信のなさ");
      assertStringIncludes(output, "**Resolution:** 仲間との絆で成長");
    },
  );

  await t.step(
    "--details --json指定時にresolvedDetailsがJSON出力に含まれること",
    async () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢"],
        relationships: {},
        appearingChapters: ["chapter_01"],
        summary: "世界を救う勇者",
        details: {
          appearance: "銀髪に青い瞳",
          personality: "真面目で正義感が強い",
        },
      };

      const loader = new MockCharacterLoader(new Map([["hero", character]]));
      const command = new ViewCharacterCommand(loader);
      const context = createMockContext({
        args: {
          id: "hero",
          details: true,
          json: true,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      const presenter = context.presenter as OutputPresenter & {
        logs: string[];
      };
      const output = presenter.logs.join("\n");
      // JSON出力をパース
      const jsonOutput = JSON.parse(output.replace("[INFO] ", ""));
      assertEquals(jsonOutput.resolvedDetails.appearance, "銀髪に青い瞳");
      assertEquals(
        jsonOutput.resolvedDetails.personality,
        "真面目で正義感が強い",
      );
    },
  );

  await t.step(
    "detailsフィールドがないキャラクターで--details指定時はDetailsセクションなし",
    async () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢"],
        relationships: {},
        appearingChapters: ["chapter_01"],
        summary: "世界を救う勇者",
        // detailsフィールドなし
      };

      const loader = new MockCharacterLoader(new Map([["hero", character]]));
      const command = new ViewCharacterCommand(loader);
      const context = createMockContext({
        args: {
          id: "hero",
          details: true,
        },
      });

      const result = await command.execute(context);
      assertEquals(result.ok, true);

      const presenter = context.presenter as OutputPresenter & {
        logs: string[];
      };
      const output = presenter.logs.join("\n");
      // detailsがない場合はDetailsセクションが表示されない
      assertEquals(output.includes("## Details"), false);
    },
  );
});
