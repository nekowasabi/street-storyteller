/**
 * ContextAnalyzer テスト
 * カーソル位置のコンテキスト解析をテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { ContextAnalyzer } from "@storyteller/lsp/providers/context_analyzer.ts";

// 文字列リテラル検出テスト
Deno.test("ContextAnalyzer - detects cursor inside string literal", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: "pro';
  const context = analyzer.analyze(content, 0, 9); // カーソルは "pro" の o の後

  assertExists(context);
  assertEquals(context.inStringLiteral, true);
  assertEquals(context.stringStart, 6);
});

Deno.test("ContextAnalyzer - detects cursor at start of string literal", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: ""';
  const context = analyzer.analyze(content, 0, 7); // カーソルは "" の中

  assertExists(context);
  assertEquals(context.inStringLiteral, true);
  assertEquals(context.stringStart, 6);
});

Deno.test("ContextAnalyzer - detects cursor outside string literal (before)", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: "prophecy"';
  const context = analyzer.analyze(content, 0, 4); // カーソルは type の e の後

  assertExists(context);
  assertEquals(context.inStringLiteral, false);
});

Deno.test("ContextAnalyzer - detects cursor outside string literal (after)", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: "prophecy"';
  const context = analyzer.analyze(content, 0, 16); // カーソルは閉じ" の後

  assertExists(context);
  assertEquals(context.inStringLiteral, false);
});

Deno.test("ContextAnalyzer - handles escaped quotes", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'name: "John \\"Doe"';
  const context = analyzer.analyze(content, 0, 15); // カーソルはエスケープされた"の後

  assertExists(context);
  assertEquals(context.inStringLiteral, true);
});

Deno.test("ContextAnalyzer - handles single quotes", () => {
  const analyzer = new ContextAnalyzer();
  const content = "type: 'hint'";
  const context = analyzer.analyze(content, 0, 8); // カーソルは 'hint' の中

  assertExists(context);
  assertEquals(context.inStringLiteral, true);
});

// フィールド名検出テスト
Deno.test("ContextAnalyzer - detects field name (type: '')", () => {
  const analyzer = new ContextAnalyzer();
  const content = '  type: "hint"';
  const context = analyzer.analyze(content, 0, 10);

  assertExists(context);
  assertEquals(context.fieldName, "type");
});

Deno.test("ContextAnalyzer - detects field name with space (type : '')", () => {
  const analyzer = new ContextAnalyzer();
  const content = '  type : "hint"';
  const context = analyzer.analyze(content, 0, 11);

  assertExists(context);
  assertEquals(context.fieldName, "type");
});

Deno.test("ContextAnalyzer - detects field name (role: '')", () => {
  const analyzer = new ContextAnalyzer();
  const content = '  role: "protagonist"';
  const context = analyzer.analyze(content, 0, 10);

  assertExists(context);
  assertEquals(context.fieldName, "role");
});

Deno.test("ContextAnalyzer - detects field name in JSON format", () => {
  const analyzer = new ContextAnalyzer();
  const content = '  "type": "hint"';
  const context = analyzer.analyze(content, 0, 12);

  assertExists(context);
  assertEquals(context.fieldName, "type");
});

// 親型推定テスト
Deno.test("ContextAnalyzer - infers parent type from variable annotation", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const fs: Foreshadowing = {
  type: ""
};`;
  const context = analyzer.analyze(content, 1, 10);

  assertExists(context);
  assertEquals(context.parentType, "Foreshadowing");
});

Deno.test("ContextAnalyzer - infers parent type from Character annotation", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const char: Character = {
  role: ""
};`;
  const context = analyzer.analyze(content, 1, 10);

  assertExists(context);
  assertEquals(context.parentType, "Character");
});

Deno.test("ContextAnalyzer - infers parent type from Setting annotation", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const setting: Setting = {
  type: ""
};`;
  const context = analyzer.analyze(content, 1, 10);

  assertExists(context);
  assertEquals(context.parentType, "Setting");
});

Deno.test("ContextAnalyzer - infers parent type from Timeline annotation", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const tl: Timeline = {
  scope: ""
};`;
  const context = analyzer.analyze(content, 1, 10);

  assertExists(context);
  assertEquals(context.parentType, "Timeline");
});

Deno.test("ContextAnalyzer - infers parent type from TimelineEvent annotation", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const event: TimelineEvent = {
  category: ""
};`;
  const context = analyzer.analyze(content, 1, 12);

  assertExists(context);
  assertEquals(context.parentType, "TimelineEvent");
});

Deno.test("ContextAnalyzer - infers parent type from CharacterPhase annotation", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const phase: CharacterPhase = {
  transitionType: ""
};`;
  const context = analyzer.analyze(content, 1, 18);

  assertExists(context);
  assertEquals(context.parentType, "CharacterPhase");
});

// オブジェクトパス検出テスト
Deno.test("ContextAnalyzer - detects nested field in relationships", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const char: Character = {
  relationships: {
    prince: ""
  }
};`;
  const context = analyzer.analyze(content, 2, 13);

  assertExists(context);
  assertEquals(context.fieldName, "prince");
  assertEquals(context.objectPath.includes("relationships"), true);
});

Deno.test("ContextAnalyzer - detects objectPath for deeply nested objects", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const char: Character = {
  details: {
    appearance: ""
  }
};`;
  const context = analyzer.analyze(content, 2, 16);

  assertExists(context);
  assertEquals(context.fieldName, "appearance");
  assertEquals(context.objectPath.includes("details"), true);
});

// マルチライン対応テスト
Deno.test("ContextAnalyzer - works with multiline content", () => {
  const analyzer = new ContextAnalyzer();
  const content = `// Comment
const fs: Foreshadowing = {
  id: "ancient_sword",
  type: ""
};`;
  // 行3: "  type: """ (長さ10)
  // position 9 は閉じ引用符の位置（空文字列内とみなす）
  const context = analyzer.analyze(content, 3, 9);

  assertExists(context);
  assertEquals(context.fieldName, "type");
  assertEquals(context.parentType, "Foreshadowing");
  assertEquals(context.inStringLiteral, true);
});

// 型注釈がない場合のテスト
Deno.test("ContextAnalyzer - returns null parentType when no annotation", () => {
  const analyzer = new ContextAnalyzer();
  const content = `const obj = {
  type: ""
};`;
  const context = analyzer.analyze(content, 1, 10);

  assertExists(context);
  assertEquals(context.fieldName, "type");
  assertEquals(context.parentType, null);
});

// エッジケーステスト
Deno.test("ContextAnalyzer - handles empty content", () => {
  const analyzer = new ContextAnalyzer();
  const content = "";
  const context = analyzer.analyze(content, 0, 0);

  assertExists(context);
  assertEquals(context.inStringLiteral, false);
});

Deno.test("ContextAnalyzer - handles line out of range", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: "hint"';
  const context = analyzer.analyze(content, 10, 0); // 存在しない行

  assertExists(context);
  assertEquals(context.inStringLiteral, false);
});

Deno.test("ContextAnalyzer - handles character out of range", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: "hint"';
  const context = analyzer.analyze(content, 0, 100); // 存在しない列

  assertExists(context);
  assertEquals(context.inStringLiteral, false);
});

// YAML形式テスト
Deno.test("ContextAnalyzer - handles YAML format", () => {
  const analyzer = new ContextAnalyzer();
  const content = `foreshadowings:
  - type: "hint"`;
  const context = analyzer.analyze(content, 1, 12, "yaml");

  assertExists(context);
  assertEquals(context.fieldName, "type");
  assertEquals(context.inStringLiteral, true);
});

Deno.test("ContextAnalyzer - handles YAML without quotes", () => {
  const analyzer = new ContextAnalyzer();
  const content = `foreshadowings:
  - type: hint`;
  // YAMLでは引用符なしでも値として認識されるが、
  // LSP補完は引用符内でのみ発火するため、これは対象外
  const context = analyzer.analyze(content, 1, 11, "yaml");

  assertExists(context);
  assertEquals(context.inStringLiteral, false);
});

// プレフィックス取得テスト
Deno.test("ContextAnalyzer - getPrefix returns text after string start", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: "pro';
  const context = analyzer.analyze(content, 0, 10);

  assertExists(context);
  assertEquals(context.inStringLiteral, true);
  assertEquals(context.prefix, "pro");
});

Deno.test("ContextAnalyzer - getPrefix returns empty string for empty literal", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: ""';
  const context = analyzer.analyze(content, 0, 7);

  assertExists(context);
  assertEquals(context.prefix, "");
});

Deno.test("ContextAnalyzer - getPrefix returns partial text", () => {
  const analyzer = new ContextAnalyzer();
  const content = 'type: "chek"';
  const context = analyzer.analyze(content, 0, 11);

  assertExists(context);
  assertEquals(context.prefix, "chek");
});
