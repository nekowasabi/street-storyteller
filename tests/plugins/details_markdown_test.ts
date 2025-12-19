/**
 * markdown.ts のテスト
 */

import { assertEquals } from "@std/assert";
import { generateMarkdownContent } from "@storyteller/plugins/features/details/markdown.ts";
import type { DetailField } from "@storyteller/plugins/features/details/templates.ts";

Deno.test("generateMarkdownContent - descriptionフィールドの日本語ラベル「詳細説明」が使用される", () => {
  const field: DetailField = "description";
  const content = "これはテストの説明です。";
  const metadata = {
    characterId: "test_hero",
    characterName: "テストヒーロー",
  };

  const result = generateMarkdownContent(field, content, metadata);

  // フロントマターにdescriptionフィールドが含まれる
  assertEquals(result.includes("field: description"), true);
  // タイトルに「詳細説明」が含まれる
  assertEquals(result.includes("title: 詳細説明"), true);
  // ヘッダーに「詳細説明」が含まれる
  assertEquals(result.includes("# テストヒーロー - 詳細説明"), true);
});

Deno.test("generateMarkdownContent - 既存フィールドのラベルが正しく設定される", () => {
  const testCases: { field: DetailField; expectedLabel: string }[] = [
    { field: "appearance", expectedLabel: "外見" },
    { field: "personality", expectedLabel: "性格" },
    { field: "backstory", expectedLabel: "背景ストーリー" },
    { field: "relationships_detail", expectedLabel: "人間関係の詳細" },
    { field: "goals", expectedLabel: "目標・動機" },
    { field: "development", expectedLabel: "キャラクター発展" },
  ];

  const metadata = {
    characterId: "test_hero",
    characterName: "テストヒーロー",
  };

  for (const { field, expectedLabel } of testCases) {
    const result = generateMarkdownContent(field, "テスト内容", metadata);
    assertEquals(
      result.includes(`title: ${expectedLabel}`),
      true,
      `Expected label "${expectedLabel}" for field "${field}"`,
    );
    assertEquals(
      result.includes(`# テストヒーロー - ${expectedLabel}`),
      true,
      `Expected header with label "${expectedLabel}" for field "${field}"`,
    );
  }
});
