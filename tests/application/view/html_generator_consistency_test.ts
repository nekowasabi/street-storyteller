// tests/application/view/html_generator_consistency_test.ts
import { assertStringIncludes } from "@std/assert";
import { HtmlGenerator } from "@storyteller/application/view/html_generator.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

Deno.test("HtmlGenerator - 整合性チェック結果表示", async (t) => {
  const generator = new HtmlGenerator();

  await t.step("整合性問題がある場合、整合性セクションを表示する", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "orphan",
          name: "孤独な人",
          displayNames: [],
          role: "supporting",
          summary: "",
          filePath: "",
          relationships: {},
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "hint_01",
          name: "伏線1",
          type: "hint",
          status: "planted",
          plantingChapter: "chapter_01",
          plantingDescription: "",
          resolutions: [],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // 整合性セクションが存在する
    assertStringIncludes(html, "整合性チェック");
    // 孤立キャラクターの警告
    assertStringIncludes(html, "孤独な人");
    assertStringIncludes(html, "他のキャラクターと関係がありません");
    // 未回収伏線の警告
    assertStringIncludes(html, "伏線1");
    assertStringIncludes(html, "まだ回収されていません");
  });

  await t.step("整合性問題がない場合、問題なしメッセージを表示する", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "hero",
          name: "勇者",
          displayNames: [],
          role: "protagonist",
          summary: "",
          filePath: "",
          relationships: { villain: "enemy" },
        },
        {
          id: "villain",
          name: "魔王",
          displayNames: [],
          role: "antagonist",
          summary: "",
          filePath: "",
          relationships: { hero: "enemy" },
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "hint_01",
          name: "伏線1",
          type: "hint",
          status: "resolved",
          plantingChapter: "chapter_01",
          plantingDescription: "",
          resolutions: [
            { chapter: "chapter_10", description: "回収", completeness: 1.0 },
          ],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // 整合性セクションが存在する
    assertStringIncludes(html, "整合性チェック");
    // 問題なしメッセージ
    assertStringIncludes(html, "整合性に問題はありません");
  });

  await t.step("severity別にスタイルが異なる", () => {
    const analysis: ProjectAnalysis = {
      characters: [
        {
          id: "orphan",
          name: "孤独",
          displayNames: [],
          role: "supporting",
          summary: "",
          filePath: "",
          relationships: {},
        },
      ],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "hint_01",
          name: "伏線1",
          type: "hint",
          status: "partially_resolved",
          plantingChapter: "chapter_01",
          plantingDescription: "",
          resolutions: [],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // warning用のクラス
    assertStringIncludes(html, "issue-warning");
    // info用のクラス
    assertStringIncludes(html, "issue-info");
  });
});
