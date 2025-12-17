/**
 * CodeActionProviderテスト
 * Process1 Sub1: Code Action機能のテスト
 *
 * TDD Red Phase: 実装がないため、このテストは失敗する
 *
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_codeAction
 */

import { assertEquals, assertExists } from "@std/assert";
import { CodeActionProvider } from "../../../src/lsp/providers/code_action_provider.ts";
import {
  type DetectableEntity,
  PositionedDetector,
} from "../../../src/lsp/detection/positioned_detector.ts";

// テスト用のモックエンティティデータ
const mockEntities: DetectableEntity[] = [
  {
    kind: "character",
    id: "hero",
    name: "勇者",
    displayNames: ["勇者", "ヒーロー"],
    aliases: ["主人公"], // alias -> confidence 0.8
    filePath: "src/characters/hero.ts",
  },
  {
    kind: "character",
    id: "princess",
    name: "姫",
    displayNames: ["姫", "王女"],
    aliases: [],
    filePath: "src/characters/princess.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"], // alias -> confidence 0.8
    filePath: "src/settings/castle.ts",
  },
];

// ===== 基本機能テスト =====

Deno.test("CodeActionProvider - returns code action for low confidence reference (alias)", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  // "主人公" はaliasで信頼度0.8
  const content = "主人公は冒険を始めた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // カーソルが "主人公" の上にある
  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 3 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  assertExists(result);
  assertEquals(
    result.length > 0,
    true,
    "Should return at least one code action",
  );

  const action = result[0];
  assertEquals(action.kind, "quickfix");
  assertEquals(
    action.title.includes("@hero"),
    true,
    "Title should mention @hero",
  );
  assertExists(action.edit, "Should include edit");
  assertExists(action.edit.changes, "Should include changes");
});

Deno.test("CodeActionProvider - returns no code action for high confidence reference (name)", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  // "勇者" は name で信頼度1.0
  const content = "勇者は剣を抜いた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 2 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  assertEquals(
    result.length,
    0,
    "Should return no code actions for high confidence",
  );
});

Deno.test("CodeActionProvider - returns no code action for @-prefixed reference", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  // "@勇者" は明示的な参照で信頼度1.0
  const content = "@勇者は剣を抜いた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 3 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  assertEquals(
    result.length,
    0,
    "Should return no code actions for @-prefixed reference",
  );
});

// ===== TextEdit検証テスト =====

Deno.test("CodeActionProvider - code action includes correct TextEdit", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  const content = "主人公は冒険を始めた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 3 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  assertExists(result);
  assertEquals(result.length > 0, true);

  const action = result[0];
  const changes = action.edit?.changes;
  assertExists(changes);

  const edits = changes[uri];
  assertExists(edits);
  assertEquals(edits.length > 0, true);

  const edit = edits[0];
  // "主人公" を "@hero" に置き換える
  assertEquals(edit.newText, "@hero");
  assertEquals(edit.range.start.line, 0);
  assertEquals(edit.range.start.character, 0);
  assertEquals(edit.range.end.character, 3); // "主人公" の長さ
});

// ===== Quick Fix種別テスト =====

Deno.test("CodeActionProvider - code action has quickfix kind", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  // "主人公" はaliasで信頼度0.8
  const content = "主人公の前で待ち合わせた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 3 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  assertExists(result);
  assertEquals(result.length > 0, true);

  const action = result[0];
  assertEquals(action.kind, "quickfix");
});

// ===== エッジケーステスト =====

Deno.test("CodeActionProvider - returns empty array for non-entity position", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  const content = "何もない場所。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 2 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  assertEquals(result.length, 0, "Should return empty array for non-entity");
});

Deno.test("CodeActionProvider - returns empty array for empty content", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  const content = "";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 0 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  assertEquals(result.length, 0, "Should return empty array for empty content");
});

Deno.test("CodeActionProvider - handles multiple low confidence references in range", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  // 複数の低信頼度参照
  const content = "主人公は城塞に向かった。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  // 全体をカバーする範囲
  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 12 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  // 少なくとも1つのcode actionが返される
  assertEquals(
    result.length >= 1,
    true,
    "Should return at least one code action",
  );
});

// ===== 信頼度閾値テスト =====

Deno.test("CodeActionProvider - respects confidence threshold (0.8)", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  // displayName (0.9) はCode Actionを返さない
  const content = "ヒーローが登場した。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 4 },
  };

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    [],
    projectPath,
  );

  // displayName (confidence 0.9) は閾値(0.8)を超えているのでCode Actionなし
  assertEquals(
    result.length,
    0,
    "Should not return code action for displayName (0.9)",
  );
});

// ===== 診断連携テスト =====

Deno.test("CodeActionProvider - works with diagnostics context", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new CodeActionProvider(detector);

  const content = "主人公は冒険を始めた。";
  const uri = "file:///manuscripts/chapter01.md";
  const projectPath = "/project";

  const range = {
    start: { line: 0, character: 0 },
    end: { line: 0, character: 3 },
  };

  // 診断情報を渡す
  const diagnostics = [
    {
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 3 },
      },
      message: "低信頼度の参照: 主人公 → hero (80%)",
      severity: 4, // Hint
    },
  ];

  const result = await provider.getCodeActions(
    uri,
    content,
    range,
    diagnostics,
    projectPath,
  );

  assertExists(result);
  assertEquals(
    result.length > 0,
    true,
    "Should return code action with diagnostics context",
  );
});
