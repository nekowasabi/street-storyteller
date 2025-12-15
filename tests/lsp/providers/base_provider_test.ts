/**
 * BaseProviderユーティリティテスト
 * Process100 Sub1: LSPプロバイダー共通ロジックのテスト
 *
 * TDD Red Phase: 共通化されたロジックのテスト
 */

import { assertEquals, assertExists } from "@std/assert";
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
    aliases: ["主人公"],
    filePath: "src/characters/hero.ts",
  },
  {
    kind: "setting",
    id: "castle",
    name: "城",
    displayNames: ["城", "王城"],
    aliases: ["城塞"],
    filePath: "src/settings/castle.ts",
  },
];

// ===== エンティティリゾルバーテスト =====

Deno.test("EntityResolver - resolves entity at position", async () => {
  // 共通化後: EntityResolverを使ったエンティティ解決
  const { createEntityResolver } = await import(
    "../../../src/lsp/providers/entity_resolver.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const content = "勇者は冒険を始めた。";
  const position = { line: 0, character: 0 };

  const result = resolver.resolveAtPosition(content, position);

  assertExists(result);
  assertEquals(result.id, "hero");
  assertEquals(result.kind, "character");
});

Deno.test("EntityResolver - returns undefined for empty content", async () => {
  const { createEntityResolver } = await import(
    "../../../src/lsp/providers/entity_resolver.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const result = resolver.resolveAtPosition("", { line: 0, character: 0 });

  assertEquals(result, undefined);
});

Deno.test("EntityResolver - returns undefined when no entity at position", async () => {
  const { createEntityResolver } = await import(
    "../../../src/lsp/providers/entity_resolver.ts"
  );

  const detector = new PositionedDetector(mockEntities);
  const resolver = createEntityResolver(detector);

  const content = "何もない場所。";
  const position = { line: 0, character: 0 };

  const result = resolver.resolveAtPosition(content, position);

  assertEquals(result, undefined);
});

// ===== 型定義共有テスト =====

Deno.test("LSP types - Range type is exported from shared module", async () => {
  const { Range } = await import(
    "../../../src/lsp/providers/lsp_types.ts"
  );

  // Type existence check - if this compiles, the type exists
  const range: typeof Range = Range;
  assertExists(range);
});

Deno.test("LSP types - Position type is exported from shared module", async () => {
  const { Position } = await import(
    "../../../src/lsp/providers/lsp_types.ts"
  );

  // Type existence check
  assertExists(Position);
});

// ===== 共通ヘルパーテスト =====

Deno.test("isValidContent - returns false for empty string", async () => {
  const { isValidContent } = await import(
    "../../../src/lsp/providers/provider_utils.ts"
  );

  assertEquals(isValidContent(""), false);
  assertEquals(isValidContent("  "), false);
});

Deno.test("isValidContent - returns true for non-empty string", async () => {
  const { isValidContent } = await import(
    "../../../src/lsp/providers/provider_utils.ts"
  );

  assertEquals(isValidContent("勇者は冒険を始めた"), true);
  assertEquals(isValidContent("test"), true);
});

Deno.test("filePathToUri - converts relative path to file URI", async () => {
  const { filePathToUri } = await import(
    "../../../src/lsp/providers/provider_utils.ts"
  );

  const result = filePathToUri("src/characters/hero.ts", "/project");

  assertEquals(result, "file:///project/src/characters/hero.ts");
});

Deno.test("filePathToUri - handles absolute path correctly", async () => {
  const { filePathToUri } = await import(
    "../../../src/lsp/providers/provider_utils.ts"
  );

  const result = filePathToUri("/absolute/path/hero.ts", "/project");

  assertEquals(result, "file:///absolute/path/hero.ts");
});

Deno.test("filePathToUri - handles trailing slash in project path", async () => {
  const { filePathToUri } = await import(
    "../../../src/lsp/providers/provider_utils.ts"
  );

  const result = filePathToUri("src/characters/hero.ts", "/project/");

  assertEquals(result, "file:///project/src/characters/hero.ts");
});
