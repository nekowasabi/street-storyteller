/**
 * HtmlGenerator Foreshadowing テスト（TDD Red Phase）
 *
 * HtmlGeneratorがForeshadowingセクションを正しく生成することを検証
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { HtmlGenerator } from "../../../src/application/view/html_generator.ts";
import type { ProjectAnalysis } from "../../../src/application/view/project_analyzer.ts";

Deno.test("HtmlGenerator Foreshadowing", async (t) => {
  await t.step("生成されたHTMLにForeshadowingsセクションが含まれること", () => {
    const generator = new HtmlGenerator();
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    assertStringIncludes(html, "Foreshadowings");
    assertStringIncludes(html, '<section class="foreshadowings">');
  });

  await t.step("回収率統計が表示されること", () => {
    const generator = new HtmlGenerator();
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "sword",
          name: "古びた剣",
          type: "chekhov",
          status: "planted",
          summary: "剣の伏線",
          plantingChapter: "chapter_01",
          plantingDescription: "発見",
          resolutions: [],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "src/foreshadowings/sword.ts",
        },
        {
          id: "prophecy",
          name: "予言",
          type: "prophecy",
          status: "resolved",
          summary: "予言の伏線",
          plantingChapter: "chapter_02",
          plantingDescription: "予言",
          resolutions: [
            {
              chapter: "chapter_10",
              description: "成就",
              completeness: 1.0,
            },
          ],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "src/foreshadowings/prophecy.ts",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // 統計情報が含まれること
    assertStringIncludes(html, "foreshadowing-stats");
    assertStringIncludes(html, "Total:");
    assertStringIncludes(html, "Planted:");
    assertStringIncludes(html, "Resolved:");
    assertStringIncludes(html, "Resolution Rate:");
  });

  await t.step("各伏線がカード形式で表示されること", () => {
    const generator = new HtmlGenerator();
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "sword",
          name: "古びた剣",
          type: "chekhov",
          status: "planted",
          summary: "床板の下から発見される剣",
          importance: "major",
          plantingChapter: "chapter_01",
          plantingDescription: "床板の下から発見",
          resolutions: [],
          relatedCharacters: ["hero"],
          relatedSettings: ["house"],
          displayNames: ["古い剣", "錆びた剣"],
          filePath: "src/foreshadowings/sword.ts",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // 伏線カードが含まれること
    assertStringIncludes(html, "foreshadowing-card");
    assertStringIncludes(html, "古びた剣");
    assertStringIncludes(html, "chekhov");
    assertStringIncludes(html, "planted");
    assertStringIncludes(html, "major");
    assertStringIncludes(html, "床板の下から発見される剣");
    assertStringIncludes(html, "chapter_01");
  });

  await t.step("ステータス別の色分けが適用されること", () => {
    const generator = new HtmlGenerator();
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "planted",
          name: "未回収",
          type: "hint",
          status: "planted",
          plantingChapter: "chapter_01",
          plantingDescription: "設置",
          resolutions: [],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "src/foreshadowings/planted.ts",
        },
        {
          id: "resolved",
          name: "回収済み",
          type: "mystery",
          status: "resolved",
          plantingChapter: "chapter_01",
          plantingDescription: "設置",
          resolutions: [
            {
              chapter: "chapter_05",
              description: "回収",
              completeness: 1.0,
            },
          ],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "src/foreshadowings/resolved.ts",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // ステータス用のCSSクラスが含まれること
    assertStringIncludes(html, "status-planted");
    assertStringIncludes(html, "status-resolved");
  });

  await t.step("回収情報が表示されること", () => {
    const generator = new HtmlGenerator();
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "mystery",
          name: "謎",
          type: "mystery",
          status: "partially_resolved",
          plantingChapter: "chapter_01",
          plantingDescription: "謎の提示",
          resolutions: [
            {
              chapter: "chapter_05",
              description: "一部解決",
              completeness: 0.5,
            },
            {
              chapter: "chapter_08",
              description: "さらに解決",
              completeness: 0.8,
            },
          ],
          relatedCharacters: [],
          relatedSettings: [],
          displayNames: [],
          filePath: "src/foreshadowings/mystery.ts",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // 回収情報が含まれること
    assertStringIncludes(html, "resolution-info");
    assertStringIncludes(html, "chapter_05");
    assertStringIncludes(html, "一部解決");
    assertStringIncludes(html, "50%");
    assertStringIncludes(html, "chapter_08");
    assertStringIncludes(html, "80%");
  });

  await t.step("関連エンティティが表示されること", () => {
    const generator = new HtmlGenerator();
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [
        {
          id: "related",
          name: "関連付き伏線",
          type: "symbol",
          status: "planted",
          plantingChapter: "chapter_01",
          plantingDescription: "設置",
          resolutions: [],
          relatedCharacters: ["hero", "mentor"],
          relatedSettings: ["temple", "forest"],
          displayNames: [],
          filePath: "src/foreshadowings/related.ts",
        },
      ],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    // 関連エンティティが含まれること
    assertStringIncludes(html, "hero");
    assertStringIncludes(html, "mentor");
    assertStringIncludes(html, "temple");
    assertStringIncludes(html, "forest");
  });

  await t.step("伏線がない場合は空のメッセージが表示されること", () => {
    const generator = new HtmlGenerator();
    const analysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(analysis);

    assertStringIncludes(html, "No foreshadowings found");
  });
});
