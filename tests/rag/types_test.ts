/**
 * RAG型定義テスト
 * Process 1: RAG基盤モジュール構造作成
 */
import { assertEquals, assertExists } from "@std/assert";
import type {
  ChunkingOptions,
  ExportResult,
  GeneratorOptions,
  RagDocument,
} from "@storyteller/rag/types.ts";

Deno.test("RagDocument - 必須フィールド検証", () => {
  const doc: RagDocument = {
    id: "character_hero",
    title: "Character: 勇者",
    date: "2025-01-15",
    tags: ["character", "protagonist"],
    content: "## 基本情報\n- ID: hero\n...",
    sourcePath: "src/characters/hero.ts",
  };

  assertExists(doc.id);
  assertExists(doc.title);
  assertExists(doc.date);
  assertEquals(doc.tags.length > 0, true);
  assertEquals(doc.id, "character_hero");
  assertEquals(doc.tags.includes("character"), true);
});

Deno.test("GeneratorOptions - デフォルト値構造確認", () => {
  const options: GeneratorOptions = {
    outputDir: ".rag-docs",
    manuscriptFormat: "full",
    chunking: {
      strategy: "auto",
      maxChunkChars: 5000,
      overlapChars: 500,
      minChunkChars: 200,
    },
    incremental: false,
  };

  assertEquals(options.outputDir, ".rag-docs");
  assertEquals(options.manuscriptFormat, "full");
  assertEquals(options.incremental, false);
});

Deno.test("ChunkingOptions - 戦略オプション検証", () => {
  const strategies: ChunkingOptions["strategy"][] = [
    "document",
    "scene",
    "semantic",
    "auto",
  ];

  strategies.forEach((strategy) => {
    const options: ChunkingOptions = {
      strategy,
      maxChunkChars: 5000,
      overlapChars: 500,
      minChunkChars: 200,
    };
    assertExists(options.strategy);
  });
});

Deno.test("ExportResult - 結果構造検証", () => {
  const result: ExportResult = {
    documentCount: 10,
    chunkCount: 15,
    totalSize: 50000,
    outputDir: ".rag-docs",
    duration: 1500,
    files: ["character_hero.md", "setting_kingdom.md"],
    errors: [],
  };

  assertEquals(result.documentCount, 10);
  assertEquals(result.chunkCount, 15);
  assertEquals(result.files.length, 2);
  assertEquals(result.errors.length, 0);
});
