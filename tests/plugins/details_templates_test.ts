/**
 * Markdownテンプレート生成機能のテスト
 */

import { assertEquals } from "@std/assert";
import { generateMarkdownContent } from "../../src/plugins/features/details/markdown.ts";
import {
  getAvailableFields,
  getTemplate,
  isValidField,
} from "../../src/plugins/features/details/templates.ts";

Deno.test("generateMarkdownContent: backstoryのMarkdown生成", () => {
  const content =
    "これは勇者のバックストーリーです。\n彼は小さな村で育ちました。";
  const metadata = {
    characterId: "hero",
    characterName: "勇者",
  };

  const result = generateMarkdownContent("backstory", content, metadata);

  // フロントマターの存在確認
  assertEquals(result.includes("---"), true);
  assertEquals(result.includes("type: character-detail"), true);
  assertEquals(result.includes("field: backstory"), true);
  assertEquals(result.includes("characterId: hero"), true);
  assertEquals(result.includes("characterName: 勇者"), true);
  assertEquals(result.includes("title: 背景ストーリー"), true);

  // 見出しの確認
  assertEquals(result.includes("# 勇者 - 背景ストーリー"), true);

  // 本文の確認
  assertEquals(result.includes("これは勇者のバックストーリーです。"), true);
  assertEquals(result.includes("彼は小さな村で育ちました。"), true);
});

Deno.test("generateMarkdownContent: appearanceのMarkdown生成", () => {
  const content = "金髪で青い目、背が高い。";
  const metadata = {
    characterId: "hero",
    characterName: "勇者",
  };

  const result = generateMarkdownContent("appearance", content, metadata);

  assertEquals(result.includes("field: appearance"), true);
  assertEquals(result.includes("title: 外見"), true);
  assertEquals(result.includes("# 勇者 - 外見"), true);
  assertEquals(result.includes("金髪で青い目、背が高い。"), true);
});

Deno.test("generateMarkdownContent: personalityのMarkdown生成", () => {
  const content = "正義感が強く、仲間思い。";
  const metadata = {
    characterId: "hero",
    characterName: "勇者",
  };

  const result = generateMarkdownContent("personality", content, metadata);

  assertEquals(result.includes("field: personality"), true);
  assertEquals(result.includes("title: 性格"), true);
  assertEquals(result.includes("# 勇者 - 性格"), true);
});

Deno.test("generateMarkdownContent: relationships_detailのMarkdown生成", () => {
  const content = "王様とは尊敬の関係。";
  const metadata = {
    characterId: "hero",
    characterName: "勇者",
  };

  const result = generateMarkdownContent(
    "relationships_detail",
    content,
    metadata,
  );

  assertEquals(result.includes("field: relationships_detail"), true);
  assertEquals(result.includes("title: 人間関係の詳細"), true);
});

Deno.test("generateMarkdownContent: goalsのMarkdown生成", () => {
  const content = "魔王を倒して世界を救う。";
  const metadata = {
    characterId: "hero",
    characterName: "勇者",
  };

  const result = generateMarkdownContent("goals", content, metadata);

  assertEquals(result.includes("field: goals"), true);
  assertEquals(result.includes("title: 目標・動機"), true);
});

Deno.test("generateMarkdownContent: 改行が保持される", () => {
  const content = "1行目\n2行目\n3行目";
  const metadata = {
    characterId: "test",
    characterName: "テスト",
  };

  const result = generateMarkdownContent("backstory", content, metadata);

  assertEquals(result.includes("1行目\n2行目\n3行目"), true);
});

// ============================================
// templates.ts のテスト
// ============================================

Deno.test("isValidField: descriptionがtrueを返す", () => {
  assertEquals(isValidField("description"), true);
});

Deno.test("isValidField: 既存フィールドがtrueを返す", () => {
  assertEquals(isValidField("appearance"), true);
  assertEquals(isValidField("personality"), true);
  assertEquals(isValidField("backstory"), true);
  assertEquals(isValidField("relationships_detail"), true);
  assertEquals(isValidField("goals"), true);
  assertEquals(isValidField("development"), true);
});

Deno.test("isValidField: 無効なフィールドがfalseを返す", () => {
  assertEquals(isValidField("invalid_field"), false);
  assertEquals(isValidField(""), false);
});

Deno.test("getTemplate: descriptionが適切なテンプレートを返す", () => {
  const template = getTemplate("description");
  assertEquals(typeof template, "string");
  assertEquals(
    template,
    "（詳細な説明を記述してください。summaryよりも長い、詳細な情報を記載します）",
  );
});

Deno.test("getTemplate: 既存フィールドが適切なテンプレートを返す", () => {
  const appearance = getTemplate("appearance");
  assertEquals(typeof appearance, "string");
  assertEquals(
    (appearance as string).includes("外見の詳細"),
    true,
  );
});

Deno.test("getAvailableFields: descriptionが含まれる", () => {
  const fields = getAvailableFields();
  assertEquals(fields.includes("description"), true);
});

Deno.test("getAvailableFields: 全フィールドが含まれる", () => {
  const fields = getAvailableFields();
  assertEquals(fields.includes("appearance"), true);
  assertEquals(fields.includes("personality"), true);
  assertEquals(fields.includes("backstory"), true);
  assertEquals(fields.includes("relationships_detail"), true);
  assertEquals(fields.includes("goals"), true);
  assertEquals(fields.includes("development"), true);
  assertEquals(fields.includes("description"), true);
  assertEquals(fields.length, 7);
});
