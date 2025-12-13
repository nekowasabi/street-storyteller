/**
 * FrontmatterParser テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  FrontmatterParser,
} from "../../../src/application/meta/frontmatter_parser.ts";

Deno.test("FrontmatterParser", async (t) => {
  const parser = new FrontmatterParser();

  await t.step("正常なFrontmatterを解析できる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "旅の始まり"
  order: 1
  characters:
    - hero
    - heroine
  settings:
    - kingdom
  summary: "勇者アレクスが故郷を離れ、運命の旅に出発する"
---

# 第1章：旅の始まり
本文がここに続く...
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.chapter_id, "chapter01");
      assertEquals(result.value.title, "旅の始まり");
      assertEquals(result.value.order, 1);
      assertEquals(result.value.characters, ["hero", "heroine"]);
      assertEquals(result.value.settings, ["kingdom"]);
      assertEquals(
        result.value.summary,
        "勇者アレクスが故郷を離れ、運命の旅に出発する",
      );
    }
  });

  await t.step("chapter_id, title, orderを正しく抽出できる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter02
  title: "魔法の森"
  order: 2
---

# 第2章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.chapter_id, "chapter02");
      assertEquals(result.value.title, "魔法の森");
      assertEquals(result.value.order, 2);
    }
  });

  await t.step("characters, settingsがオプショナルで空配列になる", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter03
  title: "間章"
  order: 3
---

# 間章
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.characters, undefined);
      assertEquals(result.value.settings, undefined);
    }
  });

  await t.step("不正なYAML形式でエラーを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "test
  order: 1
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "yaml_parse_error");
    }
  });

  await t.step("Frontmatterが存在しない場合エラーを返す", () => {
    const markdown = `# タイトル

本文のみのMarkdownファイル
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "no_frontmatter");
    }
  });

  await t.step("storytellerキーがない場合エラーを返す", () => {
    const markdown = `---
title: "普通のFrontmatter"
date: 2024-01-01
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_storyteller_key");
    }
  });

  await t.step("必須フィールド(chapter_id)がない場合エラーを返す", () => {
    const markdown = `---
storyteller:
  title: "タイトルのみ"
  order: 1
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_required_field");
      if (result.error.type === "missing_required_field") {
        assertEquals(result.error.field, "chapter_id");
      }
    }
  });

  await t.step("必須フィールド(title)がない場合エラーを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  order: 1
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_required_field");
      if (result.error.type === "missing_required_field") {
        assertEquals(result.error.field, "title");
      }
    }
  });

  await t.step("必須フィールド(order)がない場合エラーを返す", () => {
    const markdown = `---
storyteller:
  chapter_id: chapter01
  title: "タイトル"
---

# 本文
`;

    const result = parser.parse(markdown);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertExists(result.error);
      assertEquals(result.error.type, "missing_required_field");
      if (result.error.type === "missing_required_field") {
        assertEquals(result.error.field, "order");
      }
    }
  });
});
