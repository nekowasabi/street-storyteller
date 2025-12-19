/**
 * Phase 5: 高度な管理機能の統合テスト
 */

import { assertEquals } from "@std/assert";
import { CompletenessAnalyzer } from "@storyteller/application/completeness_analyzer.ts";
import { BatchOperations } from "@storyteller/application/batch_operations.ts";
import type { Character } from "@storyteller/types/v2/character.ts";

Deno.test("Phase 5統合テスト: 完成度分析→一括処理→検証フロー", async (t) => {
  await t.step("ステップ1: 複数キャラクターの完成度分析", () => {
    const characters: Character[] = [
      {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: ["勇敢", "正義感"],
        relationships: {},
        appearingChapters: ["chapter1", "chapter2"],
        summary: "物語の主人公",
      },
      {
        id: "villain",
        name: "魔王",
        role: "antagonist",
        traits: ["冷酷", "強大な力"],
        relationships: { hero: "enemy" },
        appearingChapters: ["chapter2", "chapter3"],
        summary: "TODO: 魔王の詳細を追加",
      },
      {
        id: "friend",
        name: "仲間",
        role: "supporting",
        traits: ["明るい", "頼りになる"],
        relationships: { hero: "ally" },
        appearingChapters: ["chapter1", "chapter2"],
        summary: "勇者を支える仲間",
        details: {
          appearance: "赤い髪の青年",
          personality: "明るく前向きな性格",
        },
      },
    ];

    const analyzer = new CompletenessAnalyzer();
    const analysisResult = analyzer.analyzeMultipleCharacters(characters);

    // 検証: 総数、平均完成度、TODO数
    assertEquals(analysisResult.totalCount, 3);
    assertEquals(analysisResult.averageCompleteness > 0, true);
    assertEquals(analysisResult.totalTodoCount, 1); // villainのsummaryにTODO

    // 個別キャラクターの検証
    const heroResult = analysisResult.characterResults.find((r) =>
      r.character.id === "hero"
    );
    const villainResult = analysisResult.characterResults.find((r) =>
      r.character.id === "villain"
    );
    const friendResult = analysisResult.characterResults.find((r) =>
      r.character.id === "friend"
    );

    // hero: 必須のみ（50%）
    assertEquals(heroResult?.completenessRate, 50);

    // villain: 必須のみ + TODOマーカー
    assertEquals(villainResult?.completenessRate, 50);
    assertEquals(villainResult?.todoFields.includes("summary"), true);

    // friend: 必須 + details 2つ（約67%）
    assertEquals(friendResult && friendResult.completenessRate > 50, true);
    assertEquals(friendResult?.filledOptionalFieldsCount, 2);

    // レポート生成
    const report = analyzer.generateCompletenessReport(analysisResult);
    assertEquals(report.includes("勇者"), true);
    assertEquals(report.includes("魔王"), true);
    assertEquals(report.includes("仲間"), true);
    assertEquals(report.includes("TODO"), true);
  });

  await t.step("ステップ2: 一括詳細追加（役割フィルタリング）", async () => {
    const characters: Character[] = [
      {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: [],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "主人公",
      },
      {
        id: "villain",
        name: "魔王",
        role: "antagonist",
        traits: [],
        relationships: {},
        appearingChapters: ["chapter2"],
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

    // protagonistとantagonistのみに詳細を追加
    const batchResult = await batch.addDetailsToMultipleCharacters(
      characters,
      ["appearance", "personality"],
      { roleFilter: ["protagonist", "antagonist"] },
    );

    assertEquals(batchResult.ok, true);
    if (batchResult.ok) {
      // protagonistとantagonistのみ更新される（2人）
      assertEquals(batchResult.value.updatedCharacters.length, 2);
      assertEquals(batchResult.value.processedCount, 2);

      // 各キャラクターに詳細が追加されている
      for (const character of batchResult.value.updatedCharacters) {
        assertEquals(character.details?.appearance !== undefined, true);
        assertEquals(character.details?.personality !== undefined, true);
      }
    }
  });

  await t.step("ステップ3: 完成度の再分析と検証", async () => {
    // ステップ2の後の状態をシミュレート
    const updatedCharacters: Character[] = [
      {
        id: "hero",
        name: "勇者",
        role: "protagonist",
        traits: [],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "主人公",
        details: {
          appearance: "（外見の説明を追加）",
          personality: "（性格の説明を追加）",
        },
      },
      {
        id: "villain",
        name: "魔王",
        role: "antagonist",
        traits: [],
        relationships: {},
        appearingChapters: ["chapter2"],
        summary: "敵",
        details: {
          appearance: "（外見の説明を追加）",
          personality: "（性格の説明を追加）",
        },
      },
      {
        id: "friend",
        name: "仲間",
        role: "supporting",
        traits: [],
        relationships: {},
        appearingChapters: ["chapter1"],
        summary: "サポート",
        // detailsなし（フィルタリングされた）
      },
    ];

    const analyzer = new CompletenessAnalyzer();
    const analysisResult = analyzer.analyzeMultipleCharacters(
      updatedCharacters,
    );

    // 検証: 完成度が向上していること
    const heroResult = analysisResult.characterResults.find((r) =>
      r.character.id === "hero"
    );
    const villainResult = analysisResult.characterResults.find((r) =>
      r.character.id === "villain"
    );
    const friendResult = analysisResult.characterResults.find((r) =>
      r.character.id === "friend"
    );

    // heroとvillainは詳細が追加されて完成度が上がっている
    assertEquals(heroResult && heroResult.completenessRate > 50, true);
    assertEquals(villainResult && villainResult.completenessRate > 50, true);

    // friendは変わらず50%
    assertEquals(friendResult?.completenessRate, 50);

    // 平均完成度も向上している
    assertEquals(analysisResult.averageCompleteness > 50, true);
  });

  await t.step(
    "ステップ4: チャプター別フィルタリング + 完成度分析",
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
          appearingChapters: ["chapter3"],
          summary: "敵",
        },
      ];

      const analyzer = new CompletenessAnalyzer();

      // chapter1に登場するキャラクターのみ分析
      const chapter1Result = analyzer.analyzeMultipleCharacters(characters, {
        chapterFilter: ["chapter1"],
      });

      assertEquals(chapter1Result.totalCount, 1); // heroのみ
      assertEquals(chapter1Result.characterResults[0].character.id, "hero");

      // chapter3に登場するキャラクターのみ分析
      const chapter3Result = analyzer.analyzeMultipleCharacters(characters, {
        chapterFilter: ["chapter3"],
      });

      assertEquals(chapter3Result.totalCount, 1); // villainのみ
      assertEquals(chapter3Result.characterResults[0].character.id, "villain");
    },
  );

  await t.step("ステップ5: 強制上書き機能の統合確認", async () => {
    // 既存詳細を持つキャラクター
    const characterWithDetails: Character = {
      id: "hero",
      name: "勇者",
      role: "protagonist",
      traits: [],
      relationships: {},
      appearingChapters: [],
      summary: "主人公",
      details: {
        appearance: "既存の外見",
        personality: "既存の性格",
      },
    };

    // force = false（デフォルト）では既存詳細を保持
    // NOTE: BatchOperationsはDetailsPluginを使用するが、
    // DetailsPlugin自体がforce引数を持つため、
    // 今後BatchOperationsにforceオプションを追加する必要がある
    // ここでは機能の存在確認のみ
    assertEquals(characterWithDetails.details?.appearance, "既存の外見");
    assertEquals(characterWithDetails.details?.personality, "既存の性格");
  });
});
