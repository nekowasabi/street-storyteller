// tests/application/view/html_generator_graph_test.ts
import { assertStringIncludes } from "@std/assert";
import { HtmlGenerator } from "@storyteller/application/view/html_generator.ts";
import { VIS_CDN_LINKS } from "@storyteller/application/view/graph/vis_types.ts";
import type { ProjectAnalysis } from "@storyteller/application/view/project_analyzer.ts";

const mockAnalysis: ProjectAnalysis = {
  characters: [
    {
      id: "hero",
      name: "勇者",
      displayNames: [],
      role: "protagonist",
      summary: "主人公",
      filePath: "characters/hero.ts",
      relationships: { villain: "enemy" },
    },
    {
      id: "villain",
      name: "魔王",
      displayNames: [],
      role: "antagonist",
      summary: "敵",
      filePath: "characters/villain.ts",
      relationships: { hero: "enemy" },
    },
  ],
  settings: [],
  timelines: [
    {
      id: "main",
      name: "メインストーリー",
      scope: "story",
      summary: "",
      filePath: "timelines/main.ts",
      events: [
        {
          id: "event_01",
          title: "始まり",
          category: "plot_point",
          order: 1,
          summary: "",
          characters: [],
          settings: [],
          chapters: [],
          causes: ["event_02"],
        },
        {
          id: "event_02",
          title: "終わり",
          category: "resolution",
          order: 2,
          summary: "",
          characters: [],
          settings: [],
          chapters: [],
          causedBy: ["event_01"],
        },
      ],
    },
  ],
  foreshadowings: [
    {
      id: "foreshadow_01",
      name: "伏線1",
      type: "hint",
      summary: "",
      status: "planted",
      plantingChapter: "chapter_01",
      plantingDescription: "",
      resolutions: [],
      relatedCharacters: [],
      relatedSettings: [],
      displayNames: [],
      filePath: "foreshadowings/foreshadow_01.ts",
    },
  ],
  manuscripts: [],
};

Deno.test("HtmlGenerator - グラフ統合", async (t) => {
  const generator = new HtmlGenerator();

  await t.step("vis.js CDNリンクが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, VIS_CDN_LINKS.network);
    assertStringIncludes(html, VIS_CDN_LINKS.css);
  });

  await t.step("キャラクター関係グラフセクションが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, 'id="character-graph"');
    assertStringIncludes(html, "Character Relationships");
  });

  await t.step("タイムライン因果グラフセクションが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, 'id="timeline-graph"');
    assertStringIncludes(html, "Timeline Causality");
  });

  await t.step("伏線フローグラフセクションが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, 'id="foreshadowing-graph"');
    assertStringIncludes(html, "Foreshadowing Flow");
  });

  await t.step("グラフ初期化スクリプトが含まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, "new vis.Network");
  });

  await t.step("グラフデータがJSON形式で埋め込まれる", () => {
    const html = generator.generate(mockAnalysis);
    assertStringIncludes(html, '"nodes"');
    assertStringIncludes(html, '"edges"');
  });

  await t.step("キャラクターデータがグラフに反映される", () => {
    const html = generator.generate(mockAnalysis);
    // JSON内にキャラクターIDが含まれる
    assertStringIncludes(html, '"hero"');
    assertStringIncludes(html, '"villain"');
  });
});

Deno.test("HtmlGenerator - 空データでのグラフ", async (t) => {
  const generator = new HtmlGenerator();

  await t.step("キャラクターがない場合でもグラフセクションは存在する", () => {
    const emptyAnalysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };
    const html = generator.generate(emptyAnalysis);
    assertStringIncludes(html, 'id="character-graph"');
    assertStringIncludes(html, 'id="timeline-graph"');
    assertStringIncludes(html, 'id="foreshadowing-graph"');
  });
});
