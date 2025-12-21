/**
 * ファイル参照機能統合テスト
 * Process10: Phase 1統合テスト
 *
 * ホバー + 定義ジャンプ + CodeLensの統合動作を検証
 * 実際のサンプルファイル（cinderella.ts）での動作確認
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  type DetectableEntity,
  PositionedDetector,
} from "@storyteller/lsp/detection/positioned_detector.ts";
import { HoverProvider } from "@storyteller/lsp/providers/hover_provider.ts";
import { DefinitionProvider } from "@storyteller/lsp/providers/definition_provider.ts";
import { CodeLensProvider } from "@storyteller/lsp/providers/code_lens_provider.ts";
import type { EntityInfo } from "@storyteller/lsp/providers/hover_provider.ts";

// テスト用のモックエンティティ
const mockEntities: DetectableEntity[] = [
  {
    kind: "character",
    id: "cinderella",
    name: "シンデレラ",
    displayNames: ["シンデレラ"],
    aliases: [],
    filePath: "src/characters/cinderella.ts",
  },
];

// テスト用のエンティティ情報マップ
const mockEntityInfoMap = new Map<string, EntityInfo>([
  [
    "cinderella",
    {
      id: "cinderella",
      name: "シンデレラ",
      kind: "character" as const,
      role: "protagonist",
      summary: "継母にいじめられながらも優しさを失わない少女",
    },
  ],
]);

// 実際のcinderella.tsの内容を模したテストデータ
const cinderellaFileContent =
  `import type { Character } from "@storyteller/types/v2/character.ts";

export const cinderella: Character = {
  "id": "cinderella",
  "name": "シンデレラ",
  "role": "protagonist",
  "traits": ["優しい", "忍耐強い"],
  "summary": "継母にいじめられながらも優しさを失わない少女",
  "details": {
    "description": { "file": "./cinderella_description.md" },
    "backstory": { "file": "./backstory.md" },
  },
};
`;

// ===== ファイル参照ホバー統合テスト =====

Deno.test("Integration - HoverProvider shows file reference info", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const uri = "file:///project/samples/cinderella/src/characters/cinderella.ts";
  const projectPath = "/project";

  // ファイル参照行にホバー（{ "file": "./cinderella_description.md" } の行）
  const result = await provider.getHover(uri, cinderellaFileContent, {
    line: 9, // "description": { "file": "./cinderella_description.md" }, の行
    character: 25,
  }, projectPath);

  assertExists(result);
  assertEquals(result.contents.kind, "markdown");
  // ファイル参照情報が含まれている
  assertEquals(result.contents.value.includes("ファイル参照"), true);
  assertEquals(
    result.contents.value.includes("cinderella_description.md"),
    true,
  );
});

// ===== ファイル参照定義ジャンプ統合テスト =====

Deno.test("Integration - DefinitionProvider returns location for file reference", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new DefinitionProvider(detector);

  const uri = "file:///project/samples/cinderella/src/characters/cinderella.ts";
  const projectPath = "/project";

  // ファイル参照行に定義ジャンプ
  const result = await provider.getDefinition(uri, cinderellaFileContent, {
    line: 9,
    character: 25,
  }, projectPath);

  assertExists(result);
  // file:// URI形式で参照先ファイルが返される
  assertEquals(result.uri.startsWith("file://"), true);
  assertEquals(result.uri.includes("cinderella_description.md"), true);
});

// ===== CodeLens統合テスト =====

Deno.test("Integration - CodeLensProvider generates lenses for all file references", () => {
  const provider = new CodeLensProvider();

  const uri = "file:///project/samples/cinderella/src/characters/cinderella.ts";

  const result = provider.provideCodeLenses(uri, cinderellaFileContent);

  assertExists(result);
  // 2つのファイル参照（description, backstory）に対するCode Lens
  assertEquals(result.length, 2);

  // 各Code Lensの検証
  assertEquals(result[0].command!.title, "Open ./cinderella_description.md");
  assertEquals(result[1].command!.title, "Open ./backstory.md");

  // コマンドIDの検証
  assertEquals(result[0].command!.command, "storyteller.openReferencedFile");
  assertEquals(result[1].command!.command, "storyteller.openReferencedFile");
});

// ===== エッジケース：存在しないファイル =====

Deno.test("Integration - HoverProvider handles non-existent file gracefully", async () => {
  const detector = new PositionedDetector(mockEntities);
  const provider = new HoverProvider(detector, mockEntityInfoMap);

  const content = `description: { file: "./nonexistent_file.md" },`;
  const uri = "file:///project/samples/cinderella/src/characters/hero.ts";
  const projectPath = "/project";

  const result = await provider.getHover(uri, content, {
    line: 0,
    character: 15,
  }, projectPath);

  assertExists(result);
  // エラーメッセージが表示される
  assertEquals(result.contents.value.includes("エラー"), true);
  assertEquals(
    result.contents.value.includes("ファイルが見つかりません"),
    true,
  );
});

// ===== 複合テスト：エンティティ + ファイル参照 =====

Deno.test("Integration - Providers fallback to entity when not on file reference", async () => {
  const detector = new PositionedDetector(mockEntities);
  const hoverProvider = new HoverProvider(detector, mockEntityInfoMap);
  const definitionProvider = new DefinitionProvider(detector);

  // 原稿ファイル内でシンデレラを参照
  const content = "シンデレラは舞踏会に行きたいと思った。";
  const uri = "file:///project/samples/cinderella/manuscripts/chapter01.md";
  const projectPath = "/project";

  // ホバーでキャラクター情報が表示される
  const hoverResult = await hoverProvider.getHover(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(hoverResult);
  assertEquals(hoverResult.contents.value.includes("シンデレラ"), true);
  assertEquals(hoverResult.contents.value.includes("キャラクター"), true);

  // 定義ジャンプでキャラクター定義ファイルに移動
  const defResult = await definitionProvider.getDefinition(uri, content, {
    line: 0,
    character: 0,
  }, projectPath);

  assertExists(defResult);
  assertEquals(defResult.uri.includes("cinderella.ts"), true);
});

// ===== storyteller専用ディレクトリ制限テスト =====

Deno.test("Integration - File reference features only work in storyteller directories", async () => {
  const detector = new PositionedDetector(mockEntities);
  const hoverProvider = new HoverProvider(detector, mockEntityInfoMap);
  const definitionProvider = new DefinitionProvider(detector);
  const codeLensProvider = new CodeLensProvider();

  const content = `description: { file: "./description.md" },`;
  // storyteller専用ディレクトリ外
  const nonStorytellerUri = "file:///project/src/utils/helper.ts";
  const projectPath = "/project";

  // ホバーはnull
  const hoverResult = await hoverProvider.getHover(nonStorytellerUri, content, {
    line: 0,
    character: 15,
  }, projectPath);
  assertEquals(hoverResult, null);

  // 定義ジャンプはnull
  const defResult = await definitionProvider.getDefinition(
    nonStorytellerUri,
    content,
    { line: 0, character: 15 },
    projectPath,
  );
  assertEquals(defResult, null);

  // CodeLensは空配列
  const codeLensResult = codeLensProvider.provideCodeLenses(
    nonStorytellerUri,
    content,
  );
  assertEquals(codeLensResult.length, 0);
});

// ===== 複数パターン対応テスト =====

Deno.test("Integration - Handles various file reference patterns", () => {
  const provider = new CodeLensProvider();

  // 様々なパターンのファイル参照
  const content = `const config = {
  a: { file: "./path1.md" },
  b: { "file": "./path2.md" },
  c: { 'file': './path3.md' },
  d: { file : "./path4.md" },
};`;
  const uri = "file:///project/samples/test/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 4);

  // すべてのパターンが検出される
  assertEquals(result[0].command!.title, "Open ./path1.md");
  assertEquals(result[1].command!.title, "Open ./path2.md");
  assertEquals(result[2].command!.title, "Open ./path3.md");
  assertEquals(result[3].command!.title, "Open ./path4.md");
});
