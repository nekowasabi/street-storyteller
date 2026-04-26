/**
 * Subplot File Parser テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  parseSubplotFromFile,
  parseSubplotWithMutableBeats,
} from "@storyteller/application/subplot/subplot_file_parser.ts";

Deno.test("parseSubplotFromFile", async (t) => {
  await t.step("should parse a valid subplot file content", () => {
    const content =
      `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

/**
 * 王子の花嫁探し
 * 王子が運命の人を探す物語
 */
export const prince_story: Subplot = {
  "id": "prince_story",
  "name": "王子の花嫁探し",
  "type": "subplot",
  "status": "active",
  "summary": "王子が運命の人を探す物語",
  "beats": [],
  "focusCharacters": {
    "prince": "primary"
  }
};
`;

    const result = parseSubplotFromFile(content);
    assertExists(result);
    assertEquals(result.id, "prince_story");
    assertEquals(result.name, "王子の花嫁探し");
    assertEquals(result.type, "subplot");
    assertEquals(result.summary, "王子が運命の人を探す物語");
    assertEquals(result.beats.length, 0);
    // focusCharacters is Record<string, SubplotFocusCharacterWeight>
    const fc = result.focusCharacters as Record<string, string> | undefined;
    assertExists(fc);
    assertEquals(Object.keys(fc).length, 1);
    assertEquals(fc!["prince"], "primary");
  });

  await t.step("should parse subplot with beats", () => {
    const content =
      `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const main_story: Subplot = {
  "id": "main_story",
  "name": "メインストーリー",
  "type": "main",
  "status": "active",
  "summary": "シンデレラの物語",
  "beats": [
    {
      "id": "ball_invitation",
      "title": "舞踏会の招待状",
      "summary": "シンデレラが招待状を受け取る",
      "structurePosition": "setup",
      "chapter": "chapter_01",
      "characters": ["cinderella"],
      "settings": ["mansion"]
    },
    {
      "id": "ball_dance",
      "title": "舞踏会でのダンス",
      "summary": "王子と踊る",
      "structurePosition": "climax",
      "chapter": "chapter_02",
      "characters": ["cinderella", "prince"],
      "settings": ["castle_ballroom"],
      "preconditionBeatIds": ["ball_invitation"]
    }
  ],
  "focusCharacters": {
    "cinderella": "primary"
  }
};
`;

    const result = parseSubplotFromFile(content);
    assertExists(result);
    assertEquals(result.beats.length, 2);
    assertEquals(result.beats[0].id, "ball_invitation");
    assertEquals(result.beats[1].preconditionBeatIds, ["ball_invitation"]);
    assertEquals(result.beats[1].structurePosition, "climax");
  });

  await t.step("should parse subplot with optional fields", () => {
    const content =
      `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const stepmother_plot: Subplot = {
  "id": "stepmother_plot",
  "name": "継母の野望",
  "type": "subplot",
  "status": "active",
  "summary": "娘を王妃にしようとする継母の計画",
  "beats": [],
  "focusCharacters": {
    "stepmother": "primary"
  },
  "importance": "minor",
  "displayNames": ["継母の計画", "義母の野望"],
  "parentSubplotId": "main_story",
  "relations": {
    "characters": ["cinderella"],
    "settings": []
  },
  "details": {
    "description": "社会的地位の向上と娘たちの幸福"
  }
};
`;

    const result = parseSubplotFromFile(content);
    assertExists(result);
    assertEquals(result.relations?.characters, ["cinderella"]);
    assertEquals(result.parentSubplotId, "main_story");
    assertEquals(result.importance, "minor");
    assertEquals(result.displayNames, ["継母の計画", "義母の野望"]);
    assertEquals(result.details?.description, "社会的地位の向上と娘たちの幸福");
  });

  await t.step("should return null for content without subplot export", () => {
    const content =
      `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

export const myTimeline: Timeline = {
  "id": "test",
  "name": "test"
};
`;
    const result = parseSubplotFromFile(content);
    assertEquals(result, null);
  });

  await t.step("should return null for empty content", () => {
    const result = parseSubplotFromFile("");
    assertEquals(result, null);
  });

  await t.step("should return null for malformed JSON", () => {
    const content =
      `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const broken: Subplot = { this is not valid json };
`;
    const result = parseSubplotFromFile(content);
    assertEquals(result, null);
  });

  await t.step("should handle Japanese variable names in export", () => {
    const content =
      `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const 王子の物語: Subplot = {
  "id": "prince_tale",
  "name": "王子の物語",
  "type": "subplot",
  "status": "active",
  "summary": "テスト",
  "beats": [],
  "focusCharacters": {}
};
`;
    const result = parseSubplotFromFile(content);
    assertExists(result);
    assertEquals(result.id, "prince_tale");
  });
});

Deno.test("parseSubplotWithMutableBeats", async (t) => {
  await t.step("should return subplot and mutable beats array", () => {
    const content =
      `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const test_plot: Subplot = {
  "id": "test_plot",
  "name": "テストプロット",
  "type": "main",
  "status": "active",
  "summary": "テスト用",
  "beats": [
    {
      "id": "beat_1",
      "title": "ビート1",
      "summary": "最初のビート",
      "structurePosition": "setup",
      "chapter": "chapter_01",
      "characters": [],
      "settings": []
    },
    {
      "id": "beat_2",
      "title": "ビート2",
      "summary": "二番目のビート",
      "structurePosition": "rising",
      "chapter": "chapter_02",
      "characters": [],
      "settings": []
    }
  ],
  "focusCharacters": {}
};
`;

    const { subplot, beats } = parseSubplotWithMutableBeats(content);
    assertExists(subplot);
    assertEquals(beats.length, 2);
    assertEquals(beats[0].id, "beat_1");
    assertEquals(beats[1].id, "beat_2");
    assertEquals(subplot.beats.length, 2);

    // beats配列が独立していることを確認（変更が元に影響しない）
    beats.push({
      id: "beat_3",
      title: "追加ビート",
      summary: "追加されたビート",
      structurePosition: "climax",
      chapter: "chapter_03",
      characters: [],
      settings: [],
    });
    assertEquals(beats.length, 3);
    assertEquals(subplot.beats.length, 2);
  });

  await t.step(
    "should return null subplot and empty beats for invalid content",
    () => {
      const { subplot, beats } = parseSubplotWithMutableBeats("invalid");
      assertEquals(subplot, null);
      assertEquals(beats, []);
    },
  );

  await t.step(
    "should return empty beats array for subplot without beats",
    () => {
      const content =
        `import type { Subplot } from "@storyteller/types/v2/subplot.ts";

export const empty_plot: Subplot = {
  "id": "empty_plot",
  "name": "空のプロット",
  "type": "background",
  "status": "active",
  "summary": "ビートなし",
  "beats": [],
  "focusCharacters": {}
};
`;

      const { subplot, beats } = parseSubplotWithMutableBeats(content);
      assertExists(subplot);
      assertEquals(beats.length, 0);
      assertEquals(subplot.beats.length, 0);
    },
  );
});
