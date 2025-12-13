/**
 * CompletenessAnalyzer テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { CompletenessAnalyzer } from "../../src/application/completeness_analyzer.ts";
import type { Character } from "../../src/type/v2/character.ts";

Deno.test("CompletenessAnalyzer", async (t) => {
  await t.step(
    "analyzeCharacter - 必須フィールドのみのキャラクターは低い完成度を示す",
    () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "物語の主人公",
      };

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeCharacter(character);

      // 必須フィールドのみなので完成度は50%（必須50% + オプショナル0%）
      assertEquals(result.completenessRate, 50);
      assertEquals(result.requiredFieldsCount, 7);
      assertEquals(result.filledRequiredFieldsCount, 7);
      assertEquals(result.optionalFieldsCount > 0, true);
      assertEquals(result.filledOptionalFieldsCount, 0);
    },
  );

  await t.step(
    "analyzeCharacter - detailsフィールドがあるキャラクターは高い完成度を示す",
    () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "物語の主人公",
        details: {
          appearance: "黒髪に鋭い目つきの青年",
          personality: "正義感が強く、困っている人を見過ごせない性格",
          backstory: "幼少期に村が襲撃され、復讐を誓った",
        },
      };

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeCharacter(character);

      // detailsフィールドが3つあるので完成度は高め
      assertEquals(result.completenessRate > 40, true);
      assertEquals(result.filledOptionalFieldsCount, 3);
    },
  );

  await t.step(
    "analyzeCharacter - TODOマーカーを含むフィールドを検出する",
    () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "TODO: 詳細な概要を追加",
        details: {
          appearance: "TODO: 外見を記述",
          personality: "正義感が強い",
          backstory: "TODO: 背景を追加",
        },
      };

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeCharacter(character);

      // TODOマーカーを検出
      assertEquals(result.todoFields.length, 3);
      assertEquals(result.todoFields.includes("summary"), true);
      assertEquals(result.todoFields.includes("details.appearance"), true);
      assertEquals(result.todoFields.includes("details.backstory"), true);
    },
  );

  await t.step(
    "analyzeCharacter - ファイル参照のdetailsフィールドも検出する",
    () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "物語の主人公",
        details: {
          appearance: { file: "characters/hero/appearance.md" },
          personality: "正義感が強く、困っている人を見過ごせない性格",
          backstory: { file: "characters/hero/backstory.md" },
        },
      };

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeCharacter(character);

      // ファイル参照も完成度に含める
      assertEquals(result.filledOptionalFieldsCount, 3);
      assertEquals(result.fileReferences.length, 2);
      assertEquals(
        result.fileReferences.includes("characters/hero/appearance.md"),
        true,
      );
      assertEquals(
        result.fileReferences.includes("characters/hero/backstory.md"),
        true,
      );
    },
  );

  await t.step(
    "analyzeCharacter - development フィールドの完成度を計算する",
    () => {
      const character: Character = {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "物語の主人公",
        details: {
          development: {
            initial: "未熟な少年",
            goal: "真の勇者になる",
            obstacle: "恐怖心との戦い",
            resolution: "TODO: 最終的な状態",
          },
        },
      };

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeCharacter(character);

      // development フィールドが存在
      assertEquals(result.filledOptionalFieldsCount, 1);
      // TODOマーカーを検出
      assertEquals(
        result.todoFields.includes("details.development.resolution"),
        true,
      );
    },
  );

  await t.step(
    "analyzeMultipleCharacters - 複数のキャラクターの完成度を集計する",
    () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: ["勇敢"],
          relationships: {},
          appearingChapters: ["chapter1"],
          summary: "主人公",
          details: {
            appearance: "黒髪",
            personality: "正義感が強い",
            backstory: "村出身",
          },
        },
        {
          id: "villain",
          name: "魔王",
          role: "antagonist",
          traits: ["冷酷"],
          relationships: {},
          appearingChapters: ["chapter2"],
          summary: "TODO: 詳細を追加",
        },
      ];

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeMultipleCharacters(characters);

      assertEquals(result.totalCount, 2);
      assertEquals(result.averageCompleteness > 0, true);
      assertEquals(result.characterResults.length, 2);
      assertEquals(result.totalTodoCount, 1);
    },
  );

  await t.step(
    "analyzeMultipleCharacters - 役割別のフィルタリングを行う",
    () => {
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

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeMultipleCharacters(characters, {
        roleFilter: ["protagonist", "antagonist"],
      });

      assertEquals(result.totalCount, 2);
      assertEquals(
        result.characterResults.every((r: any) =>
          r.character.role === "protagonist" ||
          r.character.role === "antagonist"
        ),
        true,
      );
    },
  );

  await t.step(
    "analyzeMultipleCharacters - チャプター別のフィルタリングを行う",
    () => {
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

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeMultipleCharacters(characters, {
        chapterFilter: ["chapter1"],
      });

      assertEquals(result.totalCount, 2);
      assertEquals(
        result.characterResults.every((r: any) =>
          r.character.appearingChapters.includes("chapter1")
        ),
        true,
      );
    },
  );

  await t.step(
    "generateCompletenessReport - 完成度レポートをテキスト形式で生成する",
    () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: ["勇敢"],
          relationships: {},
          appearingChapters: ["chapter1"],
          summary: "主人公",
          details: {
            appearance: "黒髪",
            personality: "正義感が強い",
          },
        },
      ];

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeMultipleCharacters(characters);
      const report = analyzer.generateCompletenessReport(result);

      assertExists(report);
      assertEquals(report.includes("Complete"), true);
      assertEquals(report.includes("勇者"), true);
    },
  );

  await t.step(
    "generateCompletenessReport - TODOマーカーを含むレポートを生成する",
    () => {
      const characters: Character[] = [
        {
          id: "hero",
          name: "勇者",
          role: "protagonist",
          traits: [],
          relationships: {},
          appearingChapters: [],
          summary: "TODO: 詳細を追加",
        },
      ];

      const analyzer = new CompletenessAnalyzer();
      const result = analyzer.analyzeMultipleCharacters(characters);
      const report = analyzer.generateCompletenessReport(result);

      assertExists(report);
      assertEquals(report.includes("TODO"), true);
    },
  );
});
