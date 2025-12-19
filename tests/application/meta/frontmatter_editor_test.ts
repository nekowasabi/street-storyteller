/**
 * FrontmatterEditor テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  type EditResult,
  FrontmatterEditor,
} from "@storyteller/application/meta/frontmatter_editor.ts";

Deno.test("FrontmatterEditor", async (t) => {
  // ========================================
  // process3 sub1: 基本構造とaddEntities操作
  // ========================================

  await t.step("空の配列にキャラクターを追加できる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
---

# 本文
`;

    const result = editor.addEntities(content, "characters", ["hero"]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertExists(result.value.content);
      assertEquals(result.value.addedIds, ["hero"]);
      assertEquals(result.value.changedFields, ["characters"]);
      // 出力内容にcharacters: hero が含まれる
      assertEquals(result.value.content.includes("characters:"), true);
      assertEquals(
        result.value.content.includes("hero") ||
          result.value.content.includes("- hero"),
        true,
      );
    }
  });

  await t.step("既存の配列にキャラクターを追加できる（重複無視）", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
  characters:
    - hero
---

# 本文
`;

    const result = editor.addEntities(content, "characters", [
      "hero",
      "heroine",
    ]);

    assertEquals(result.ok, true);
    if (result.ok) {
      // heroは既に存在するので追加されない
      assertEquals(result.value.addedIds, ["heroine"]);
      // heroine が追加されている
      assertEquals(result.value.content.includes("heroine"), true);
    }
  });

  await t.step("Frontmatterがない場合エラーを返す", () => {
    const editor = new FrontmatterEditor();
    const content = `# タイトル

本文のみのMarkdownファイル
`;

    const result = editor.addEntities(content, "characters", ["hero"]);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.type, "no_frontmatter");
    }
  });

  await t.step("storytellerキーがない場合エラーを返す", () => {
    const editor = new FrontmatterEditor();
    const content = `---
title: "普通のFrontmatter"
date: 2024-01-01
---

# 本文
`;

    const result = editor.addEntities(content, "characters", ["hero"]);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.type, "missing_storyteller_key");
    }
  });

  // ========================================
  // process3 sub2: removeEntities操作
  // ========================================

  await t.step("存在するIDを削除できる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
  characters:
    - hero
    - heroine
---

# 本文
`;

    const result = editor.removeEntities(content, "characters", ["hero"]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.removedIds, ["hero"]);
      // heroが削除されている（"- hero\n" または "- hero" が含まれない）
      // 注: "heroine" に "hero" が含まれるため、正確にチェックする
      const lines = result.value.content.split("\n");
      const heroLine = lines.find((l: string) =>
        l.trim() === "- hero" || l.includes("- hero\n")
      );
      assertEquals(heroLine, undefined);
      // heroineは残っている
      assertEquals(result.value.content.includes("heroine"), true);
    }
  });

  await t.step("存在しないIDは無視される", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
  characters:
    - hero
---

# 本文
`;

    const result = editor.removeEntities(content, "characters", [
      "nonexistent",
    ]);

    assertEquals(result.ok, true);
    if (result.ok) {
      // 削除されたものはない
      assertEquals(result.value.removedIds, []);
      // heroは残っている
      assertEquals(result.value.content.includes("hero"), true);
    }
  });

  await t.step("削除後に空配列になった場合フィールドは空配列として維持", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
  characters:
    - hero
---

# 本文
`;

    const result = editor.removeEntities(content, "characters", ["hero"]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.removedIds, ["hero"]);
      // characters フィールドは空配列として残る（または削除される）
      // 実装による
    }
  });

  // ========================================
  // process3 sub3: setEntities操作
  // ========================================

  await t.step("リストを完全置換できる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
  characters:
    - hero
    - heroine
---

# 本文
`;

    const result = editor.setEntities(content, "characters", [
      "villain",
      "sidekick",
    ]);

    assertEquals(result.ok, true);
    if (result.ok) {
      // 古い値は含まれない
      assertEquals(result.value.content.includes("hero"), false);
      assertEquals(result.value.content.includes("heroine"), false);
      // 新しい値が含まれる
      assertEquals(result.value.content.includes("villain"), true);
      assertEquals(result.value.content.includes("sidekick"), true);
    }
  });

  await t.step("空配列でsetした場合フィールドが空になる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
  characters:
    - hero
---

# 本文
`;

    const result = editor.setEntities(content, "characters", []);

    assertEquals(result.ok, true);
    if (result.ok) {
      // heroは含まれない
      assertEquals(
        result.value.content.includes("- hero"),
        false,
      );
    }
  });

  // ========================================
  // process3 sub4: 新規フィールド対応
  // ========================================

  await t.step("timeline_eventsフィールドをaddできる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
---

# 本文
`;

    const result = editor.addEntities(content, "timeline_events", [
      "event_001",
    ]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.addedIds, ["event_001"]);
      assertEquals(result.value.content.includes("timeline_events:"), true);
      assertEquals(result.value.content.includes("event_001"), true);
    }
  });

  await t.step("phasesフィールドをaddできる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
---

# 本文
`;

    const result = editor.addEntities(content, "phases", ["hero_phase_01"]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.addedIds, ["hero_phase_01"]);
      assertEquals(result.value.content.includes("phases:"), true);
    }
  });

  await t.step("timelinesフィールドをaddできる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
---

# 本文
`;

    const result = editor.addEntities(content, "timelines", ["main_story"]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.addedIds, ["main_story"]);
      assertEquals(result.value.content.includes("timelines:"), true);
    }
  });

  await t.step("複数の新規フィールドを同時に編集できる", () => {
    const editor = new FrontmatterEditor();
    let content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
---

# 本文
`;

    // timeline_eventsを追加
    let result = editor.addEntities(content, "timeline_events", ["event_001"]);
    assertEquals(result.ok, true);
    if (result.ok) {
      content = result.value.content;
    }

    // phasesを追加
    result = editor.addEntities(content, "phases", ["hero_phase_01"]);
    assertEquals(result.ok, true);
    if (result.ok) {
      content = result.value.content;
    }

    // timelinesを追加
    result = editor.addEntities(content, "timelines", ["main_story"]);
    assertEquals(result.ok, true);
    if (result.ok) {
      // 全てのフィールドが含まれる
      assertEquals(result.value.content.includes("timeline_events:"), true);
      assertEquals(result.value.content.includes("phases:"), true);
      assertEquals(result.value.content.includes("timelines:"), true);
    }
  });

  // ========================================
  // YAML形式の検証
  // ========================================

  await t.step("YAML出力はスペース2つでインデントされる", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
---

# 本文
`;

    const result = editor.addEntities(content, "characters", ["hero"]);

    assertEquals(result.ok, true);
    if (result.ok) {
      // storytellerの下に2スペースインデントでcharacters
      // characters: の下に2スペースインデントで - hero
      const lines = result.value.content.split("\n");
      const characterLine = lines.find((l: string) =>
        l.includes("characters:")
      );
      assertExists(characterLine);
      // 2スペースでインデントされていることを確認
      assertEquals(characterLine?.startsWith("  characters:"), true);
    }
  });

  await t.step("本文が保持される", () => {
    const editor = new FrontmatterEditor();
    const content = `---
storyteller:
  chapter_id: chapter01
  title: "テストチャプター"
  order: 1
---

# 本文

これは保持されるべきテキストです。
日本語も含まれます。
`;

    const result = editor.addEntities(content, "characters", ["hero"]);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(
        result.value.content.includes("これは保持されるべきテキストです。"),
        true,
      );
      assertEquals(result.value.content.includes("日本語も含まれます。"), true);
    }
  });
});
