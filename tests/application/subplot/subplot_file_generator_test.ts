/**
 * Subplot File Generator テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { generateSubplotFile } from "@storyteller/application/subplot/subplot_file_generator.ts";
import { parseSubplotFromFile } from "@storyteller/application/subplot/subplot_file_parser.ts";
import type { Subplot } from "@storyteller/types/v2/subplot.ts";

Deno.test("generateSubplotFile", async (t) => {
  await t.step("should generate valid TypeScript file with minimal subplot", () => {
    const subplot: Subplot = {
      id: "prince_story",
      name: "王子の花嫁探し",
      type: "subplot",
      summary: "王子が運命の人を探す物語",
      beats: [],
      focusCharacters: [
        { characterId: "prince", weight: "primary" },
      ],
    };

    const content = generateSubplotFile(subplot);

    // import文が含まれていること
    assertExists(content.match(/import type \{ Subplot \} from "@storyteller\/types\/v2\/subplot\.ts";/));

    // JSDocコメントが含まれていること
    assertExists(content.includes("王子の花嫁探し"));
    assertExists(content.includes("王子が運命の人を探す物語"));

    // export文が含まれていること
    assertExists(content.match(/export const prince_story: Subplot = \{/));

    // JSONが含まれていること
    assertExists(content.includes('"id": "prince_story"'));
  });

  await t.step("should generate file with beats", () => {
    const subplot: Subplot = {
      id: "main_story",
      name: "メインストーリー",
      type: "main",
      summary: "シンデレラの物語",
      beats: [
        {
          id: "ball_invitation",
          title: "舞踏会の招待状",
          summary: "招待状を受け取る",
          chapter: "chapter_01",
          characters: ["cinderella"],
          settings: ["mansion"],
        },
        {
          id: "ball_dance",
          title: "舞踏会でのダンス",
          summary: "王子と踊る",
          chapter: "chapter_02",
          characters: ["cinderella", "prince"],
          settings: ["castle_ballroom"],
          structurePosition: "climax",
          preconditionBeatIds: ["ball_invitation"],
        },
      ],
      focusCharacters: [
        { characterId: "cinderella", weight: "primary" },
      ],
    };

    const content = generateSubplotFile(subplot);

    // ビートが含まれていること
    assertExists(content.includes("ball_invitation"));
    assertExists(content.includes("ball_dance"));
    assertExists(content.includes("preconditionBeatIds"));

    // 生成された内容がパース可能であること
    const parsed = parseSubplotFromFile(content);
    assertExists(parsed);
    assertEquals(parsed.beats.length, 2);
    assertEquals(parsed.beats[1].preconditionBeatIds, ["ball_invitation"]);
  });

  await t.step("should generate file with all optional fields", () => {
    const subplot: Subplot = {
      id: "stepmother_plot",
      name: "継母の野望",
      type: "subplot",
      summary: "娘を王妃にしようとする計画",
      beats: [],
      focusCharacters: [
        { characterId: "stepmother", weight: "primary" },
      ],
      relatedCharacters: ["cinderella"],
      parentPlotId: "main_story",
      childPlotIds: ["daughter_plot"],
      themes: ["ambition", "jealousy"],
      importance: "minor",
      displayNames: ["継母の計画"],
      details: {
        motivation: "社会的地位の向上",
        resolution: { file: "subplots/stepmother_resolution.md" },
      },
      detectionHints: {
        commonPatterns: ["継母", "義母"],
        excludePatterns: ["母亲"],
        confidence: 0.8,
      },
    };

    const content = generateSubplotFile(subplot);
    const parsed = parseSubplotFromFile(content);

    assertExists(parsed);
    assertEquals(parsed.relatedCharacters, ["cinderella"]);
    assertEquals(parsed.parentPlotId, "main_story");
    assertEquals(parsed.childPlotIds, ["daughter_plot"]);
    assertEquals(parsed.themes, ["ambition", "jealousy"]);
    assertEquals(parsed.importance, "minor");
    assertEquals(parsed.displayNames, ["継母の計画"]);
    assertEquals(parsed.details?.motivation, "社会的地位の向上");
    assertEquals(parsed.detectionHints?.confidence, 0.8);
  });
});

Deno.test("Round-trip: parse -> generate -> parse", async (t) => {
  await t.step("should produce identical results for minimal subplot", () => {
    const original: Subplot = {
      id: "fairy_plot",
      name: "妖精の見守り",
      type: "background",
      summary: "妖精がシンデレラを見守る",
      beats: [],
      focusCharacters: [
        { characterId: "fairy_godmother", weight: "primary" },
      ],
    };

    // generate -> parse -> generate -> parse
    const generated1 = generateSubplotFile(original);
    const parsed1 = parseSubplotFromFile(generated1);
    assertExists(parsed1);

    const generated2 = generateSubplotFile(parsed1);
    const parsed2 = parseSubplotFromFile(generated2);
    assertExists(parsed2);

    // 2回目のパース結果が1回目と同一であること
    assertEquals(parsed2.id, parsed1.id);
    assertEquals(parsed2.name, parsed1.name);
    assertEquals(parsed2.type, parsed1.type);
    assertEquals(parsed2.summary, parsed1.summary);
    assertEquals(parsed2.beats, parsed1.beats);
    assertEquals(parsed2.focusCharacters, parsed1.focusCharacters);

    // 生成されたファイル内容も同一であること
    assertEquals(generated2, generated1);
  });

  await t.step("should produce identical results for complex subplot", () => {
    const original: Subplot = {
      id: "main_story",
      name: "メインストーリー",
      type: "main",
      summary: "シンデレラの物語",
      beats: [
        {
          id: "humble_beginnings",
          title: "惨めな生活",
          summary: "シンデレラの日常",
          chapter: "chapter_01",
          characters: ["cinderella", "stepmother"],
          settings: ["mansion"],
          structurePosition: "setup",
        },
        {
          id: "ball_dance",
          title: "舞踏会",
          summary: "王子との出会い",
          chapter: "chapter_02",
          characters: ["cinderella", "prince"],
          settings: ["castle_ballroom"],
          structurePosition: "climax",
          preconditionBeatIds: ["humble_beginnings"],
          timelineEventId: "event_ball",
          displayNames: ["舞踏会の夜"],
        },
      ],
      focusCharacters: [
        { characterId: "cinderella", weight: "primary" },
        { characterId: "prince", weight: "secondary" },
      ],
      relatedCharacters: ["fairy_godmother"],
      themes: ["love", "transformation"],
      importance: "major",
      displayNames: ["シンデレラストーリー"],
    };

    const generated1 = generateSubplotFile(original);
    const parsed1 = parseSubplotFromFile(generated1);
    assertExists(parsed1);

    const generated2 = generateSubplotFile(parsed1);
    const parsed2 = parseSubplotFromFile(generated2);
    assertExists(parsed2);

    // 全フィールドの同一性確認
    assertEquals(parsed2.id, parsed1.id);
    assertEquals(parsed2.name, parsed1.name);
    assertEquals(parsed2.type, parsed1.type);
    assertEquals(parsed2.summary, parsed1.summary);
    assertEquals(parsed2.beats.length, parsed1.beats.length);
    assertEquals(parsed2.beats[0], parsed1.beats[0]);
    assertEquals(parsed2.beats[1], parsed1.beats[1]);
    assertEquals(parsed2.focusCharacters, parsed1.focusCharacters);
    assertEquals(parsed2.relatedCharacters, parsed1.relatedCharacters);
    assertEquals(parsed2.themes, parsed1.themes);
    assertEquals(parsed2.importance, parsed1.importance);
    assertEquals(parsed2.displayNames, parsed1.displayNames);

    // ファイル内容の同一性
    assertEquals(generated2, generated1);
  });

  await t.step("should handle empty arrays correctly in round-trip", () => {
    const original: Subplot = {
      id: "empty_plot",
      name: "空のプロット",
      type: "parallel",
      summary: "テスト",
      beats: [],
      focusCharacters: [],
    };

    const generated = generateSubplotFile(original);
    const parsed = parseSubplotFromFile(generated);
    assertExists(parsed);
    assertEquals(parsed.beats, []);
    assertEquals(parsed.focusCharacters, []);

    // 二回目
    const generated2 = generateSubplotFile(parsed);
    const parsed2 = parseSubplotFromFile(generated2);
    assertExists(parsed2);
    assertEquals(parsed2.beats, []);
    assertEquals(parsed2.focusCharacters, []);
    assertEquals(generated2, generated);
  });
});
