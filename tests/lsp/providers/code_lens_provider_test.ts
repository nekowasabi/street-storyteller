/**
 * CodeLensProviderテスト
 * Process4: Code Lens機能のテスト
 *
 * ファイル参照（{ file: "./path.md" }）にCode Lensを表示し、
 * クリックで参照先ファイルを開く機能
 */

import { assertEquals, assertExists } from "@std/assert";
import {
  CodeLensProvider,
  type CodeLens,
} from "@storyteller/lsp/providers/code_lens_provider.ts";

// ===== provideCodeLenses テスト =====

Deno.test("CodeLensProvider - returns code lens for file reference", () => {
  const provider = new CodeLensProvider();

  const content = `const character = {
  name: "hero",
  description: { file: "./description.md" },
};`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 1);

  // Code Lensが正しい行に配置されている
  assertEquals(result[0].range.start.line, 2);

  // コマンド情報が含まれている
  assertExists(result[0].command);
  assertEquals(result[0].command.command, "storyteller.openReferencedFile");
  assertEquals(result[0].command.title, "Open ./description.md");
});

Deno.test("CodeLensProvider - returns multiple code lenses for multiple file references", () => {
  const provider = new CodeLensProvider();

  const content = `const character = {
  name: "hero",
  description: { file: "./description.md" },
  backstory: { file: "./backstory.md" },
  appearance: { file: "./appearance.md" },
};`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 3);

  // 各Code Lensが正しい行に配置されている
  assertEquals(result[0].range.start.line, 2);
  assertEquals(result[1].range.start.line, 3);
  assertEquals(result[2].range.start.line, 4);

  // 各コマンドのタイトルが正しい
  assertEquals(result[0].command!.title, "Open ./description.md");
  assertEquals(result[1].command!.title, "Open ./backstory.md");
  assertEquals(result[2].command!.title, "Open ./appearance.md");
});

Deno.test("CodeLensProvider - returns empty array for non-storyteller directory", () => {
  const provider = new CodeLensProvider();

  const content = `description: { file: "./description.md" },`;
  // storyteller専用ディレクトリ外
  const uri = "file:///project/src/utils/helper.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 0);
});

Deno.test("CodeLensProvider - returns empty array for content without file references", () => {
  const provider = new CodeLensProvider();

  const content = `const character = {
  name: "hero",
  summary: "A brave hero",
};`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 0);
});

Deno.test("CodeLensProvider - command arguments include resolved file path", () => {
  const provider = new CodeLensProvider();

  const content = `description: { file: "./description.md" },`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 1);

  // コマンド引数に解決済みファイルパスが含まれる
  assertExists(result[0].command);
  assertExists(result[0].command.arguments);
  assertEquals(result[0].command.arguments.length, 1);
  const arg0 = result[0].command.arguments[0] as string;
  assertEquals(arg0.includes("description.md"), true);
});

Deno.test("CodeLensProvider - handles parent directory paths", () => {
  const provider = new CodeLensProvider();

  const content = `backstory: { file: "../shared/backstory.md" },`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 1);

  // タイトルに元のパスが表示される
  assertEquals(result[0].command!.title, "Open ../shared/backstory.md");

  // 引数には解決済みパスが含まれる
  const arg = result[0].command!.arguments![0] as string;
  assertEquals(arg.includes("backstory.md"), true);
});

Deno.test("CodeLensProvider - code lens range covers entire file reference", () => {
  const provider = new CodeLensProvider();

  const content = `description: { file: "./description.md" },`;
  const uri = "file:///project/samples/cinderella/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 1);

  // rangeが設定されている
  assertExists(result[0].range);
  assertEquals(result[0].range.start.line, 0);
  assertEquals(result[0].range.end.line, 0);
  // startCharはファイル参照の開始位置
  assertEquals(typeof result[0].range.start.character, "number");
});

Deno.test("CodeLensProvider - works with settings directory", () => {
  const provider = new CodeLensProvider();

  const content = `geography: { file: "./geography.md" },`;
  const uri = "file:///project/src/settings/castle.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 1);
});

Deno.test("CodeLensProvider - returns empty array for empty content", () => {
  const provider = new CodeLensProvider();

  const content = "";
  const uri = "file:///project/samples/cinderella/characters/hero.ts";

  const result = provider.provideCodeLenses(uri, content);

  assertExists(result);
  assertEquals(result.length, 0);
});
