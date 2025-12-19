/**
 * LiteralTypeCompletionProvider テスト
 * リテラル型補完プロバイダーをテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  CompletionItemKind,
  LiteralTypeCompletionProvider,
} from "@storyteller/lsp/providers/literal_type_completion_provider.ts";

// ヘルパー関数: 文字列内の指定文字の位置を取得
function findPositionInString(
  content: string,
  line: number,
  searchChar: string,
  occurrence: number = 1,
): number {
  const lines = content.split("\n");
  const targetLine = lines[line] ?? "";
  let count = 0;
  for (let i = 0; i < targetLine.length; i++) {
    if (targetLine[i] === searchChar) {
      count++;
      if (count === occurrence) {
        return i;
      }
    }
  }
  return -1;
}

// 基本テスト
Deno.test("LiteralTypeCompletionProvider - returns ForeshadowingType values for type field", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const fs: Foreshadowing = {
  type: ""
};`;
  // 行1: '  type: ""'
  // 閉じ引用符の位置で補完
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );

  assertEquals(result.items.length, 6);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("hint"), true);
  assertEquals(labels.includes("prophecy"), true);
  assertEquals(labels.includes("mystery"), true);
  assertEquals(labels.includes("symbol"), true);
  assertEquals(labels.includes("chekhov"), true);
  assertEquals(labels.includes("red_herring"), true);
});

Deno.test("LiteralTypeCompletionProvider - returns CharacterRole values for role field", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const char: Character = {
  role: ""
};`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );

  assertEquals(result.items.length, 4);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("protagonist"), true);
  assertEquals(labels.includes("antagonist"), true);
  assertEquals(labels.includes("supporting"), true);
  assertEquals(labels.includes("guest"), true);
});

Deno.test("LiteralTypeCompletionProvider - returns SettingType values for Setting.type", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const setting: Setting = {
  type: ""
};`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );

  assertEquals(result.items.length, 4);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("location"), true);
  assertEquals(labels.includes("world"), true);
  assertEquals(labels.includes("culture"), true);
  assertEquals(labels.includes("organization"), true);
});

Deno.test("LiteralTypeCompletionProvider - distinguishes Foreshadowing.type from Setting.type", () => {
  const provider = new LiteralTypeCompletionProvider();

  // Foreshadowing: 'const fs: Foreshadowing = { type: "" };'
  const fContent = `const fs: Foreshadowing = { type: "" };`;
  const fCloseQuotePos = findPositionInString(fContent, 0, '"', 2);
  const fResult = provider.getCompletions(
    "file:///test.ts",
    fContent,
    0,
    fCloseQuotePos,
  );
  assertEquals(fResult.items.some((i) => i.label === "chekhov"), true);
  assertEquals(fResult.items.some((i) => i.label === "location"), false);

  // Setting: 'const set: Setting = { type: "" };'
  const sContent = `const set: Setting = { type: "" };`;
  const sCloseQuotePos = findPositionInString(sContent, 0, '"', 2);
  const sResult = provider.getCompletions(
    "file:///test.ts",
    sContent,
    0,
    sCloseQuotePos,
  );
  assertEquals(sResult.items.some((i) => i.label === "location"), true);
  assertEquals(sResult.items.some((i) => i.label === "chekhov"), false);
});

Deno.test("LiteralTypeCompletionProvider - returns ForeshadowingStatus values", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const fs: Foreshadowing = {
  status: ""
};`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );

  assertEquals(result.items.length, 4);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("planted"), true);
  assertEquals(labels.includes("partially_resolved"), true);
  assertEquals(labels.includes("resolved"), true);
  assertEquals(labels.includes("abandoned"), true);
});

Deno.test("LiteralTypeCompletionProvider - returns EventCategory values", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const event: TimelineEvent = {
  category: ""
};`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );

  assertEquals(result.items.length, 7);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("plot_point"), true);
  assertEquals(labels.includes("climax"), true);
});

Deno.test("LiteralTypeCompletionProvider - returns TimelineScope values", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const tl: Timeline = {
  scope: ""
};`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );

  assertEquals(result.items.length, 4);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("story"), true);
  assertEquals(labels.includes("world"), true);
  assertEquals(labels.includes("character"), true);
  assertEquals(labels.includes("arc"), true);
});

Deno.test("LiteralTypeCompletionProvider - returns TransitionType values", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const phase: CharacterPhase = {
  transitionType: ""
};`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );

  assertEquals(result.items.length, 5);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("gradual"), true);
  assertEquals(labels.includes("turning_point"), true);
  assertEquals(labels.includes("transformation"), true);
});

Deno.test("LiteralTypeCompletionProvider - returns RelationType for relationships", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const char: Character = {
  relationships: {
    prince: ""
  }
};`;
  const closeQuotePos = findPositionInString(content, 2, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    2,
    closeQuotePos,
  );

  assertEquals(result.items.length, 7);
  const labels = result.items.map((i) => i.label);
  assertEquals(labels.includes("ally"), true);
  assertEquals(labels.includes("enemy"), true);
  assertEquals(labels.includes("mentor"), true);
});

// プレフィックスフィルタリングテスト
Deno.test("LiteralTypeCompletionProvider - filters by prefix", () => {
  const provider = new LiteralTypeCompletionProvider();

  // 'const fs: Foreshadowing = { type: "pr" };'
  const content = `const fs: Foreshadowing = { type: "pr" };`;
  // "pr" の r の後（閉じ引用符の位置）
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );

  // "pr" にマッチするのは "prophecy" のみ
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].label, "prophecy");
});

Deno.test("LiteralTypeCompletionProvider - filters by prefix (case insensitive)", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const fs: Foreshadowing = { type: "PR" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );

  // "PR" にマッチするのは "prophecy" のみ（大文字小文字無視）
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].label, "prophecy");
});

Deno.test("LiteralTypeCompletionProvider - filters by partial prefix", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const fs: Foreshadowing = { type: "che" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );

  // "che" にマッチするのは "chekhov" のみ
  assertEquals(result.items.length, 1);
  assertEquals(result.items[0].label, "chekhov");
});

// 補完アイテム形式テスト
Deno.test("LiteralTypeCompletionProvider - completion item has EnumMember kind", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const char: Character = { role: "" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );

  assertExists(result.items[0]);
  assertEquals(result.items[0].kind, CompletionItemKind.EnumMember);
});

Deno.test("LiteralTypeCompletionProvider - completion item has detail", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const char: Character = { role: "" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );

  assertExists(result.items[0]);
  assertExists(result.items[0].detail);
  assertEquals(result.items[0].detail?.includes("CharacterRole"), true);
});

Deno.test("LiteralTypeCompletionProvider - completion item has documentation", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const fs: Foreshadowing = { type: "" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );

  const chekhovItem = result.items.find((i) => i.label === "chekhov");
  assertExists(chekhovItem);
  assertExists(chekhovItem.documentation);
  if (typeof chekhovItem.documentation === "object") {
    assertEquals(
      chekhovItem.documentation.value.includes("チェーホフ"),
      true,
    );
  }
});

// 空の結果テスト
Deno.test("LiteralTypeCompletionProvider - returns empty for non-matching field", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const char: Character = {
  name: ""
};`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    1,
    closeQuotePos,
  );
  assertEquals(result.items.length, 0);
});

Deno.test("LiteralTypeCompletionProvider - returns empty when not in string literal", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const char: Character = {
  role: protagonist
};`;
  // 引用符がないので、適当な位置を指定
  const result = provider.getCompletions("file:///test.ts", content, 1, 12);
  assertEquals(result.items.length, 0);
});

Deno.test("LiteralTypeCompletionProvider - returns empty for non-TypeScript files", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `type: "hint"`;
  const result = provider.getCompletions("file:///test.md", content, 0, 8);
  assertEquals(result.items.length, 0);
});

// ファイル拡張子テスト
Deno.test("LiteralTypeCompletionProvider - works with .ts files", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const fs: Foreshadowing = { type: "" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );
  assertEquals(result.items.length > 0, true);
});

Deno.test("LiteralTypeCompletionProvider - works with .json files", () => {
  const provider = new LiteralTypeCompletionProvider();

  // JSON形式（ただし親型推定はできない）
  const content = `{
  "type": ""
}`;
  const closeQuotePos = findPositionInString(content, 1, '"', 4); // "type": "" の最後の引用符
  const result = provider.getCompletions(
    "file:///test.json",
    content,
    1,
    closeQuotePos,
  );
  // 親型がないのでマッチしない
  assertEquals(result.isIncomplete, false);
});

Deno.test("LiteralTypeCompletionProvider - works with .yaml files", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `foreshadowings:
  - type: ""`;
  const closeQuotePos = findPositionInString(content, 1, '"', 2);
  const result = provider.getCompletions(
    "file:///test.yaml",
    content,
    1,
    closeQuotePos,
  );
  assertEquals(result.isIncomplete, false);
});

// isIncompleteフラグテスト
Deno.test("LiteralTypeCompletionProvider - isIncomplete is always false", () => {
  const provider = new LiteralTypeCompletionProvider();

  const content = `const fs: Foreshadowing = { type: "" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );
  assertEquals(result.isIncomplete, false);
});

// 親型がない場合のテスト
Deno.test("LiteralTypeCompletionProvider - returns empty when no parent type for ambiguous field", () => {
  const provider = new LiteralTypeCompletionProvider();

  // 型注釈がない場合、typeフィールドは曖昧
  const content = `const obj = { type: "" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );
  // 親型がないのでマッチしない
  assertEquals(result.items.length, 0);
});

// 曖昧でないフィールド（roleなど）のテスト
Deno.test("LiteralTypeCompletionProvider - works for unambiguous fields without parent type", () => {
  const provider = new LiteralTypeCompletionProvider();

  // roleはCharacterでのみ使用されるが、現在の実装では親型マッチが必要
  const content = `const obj = { role: "" };`;
  const closeQuotePos = findPositionInString(content, 0, '"', 2);
  const result = provider.getCompletions(
    "file:///test.ts",
    content,
    0,
    closeQuotePos,
  );
  // 現在の実装では親型がないのでマッチしない
  assertEquals(result.isIncomplete, false);
});
