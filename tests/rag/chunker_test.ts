/**
 * チャンキングエンジンテスト
 * Process 10: チャンキングエンジン基盤
 */
import { assertEquals } from "@std/assert";
import {
  chunkContent,
  selectChunkingStrategy,
} from "@storyteller/rag/chunker.ts";
import type { ChunkingOptions } from "@storyteller/rag/types.ts";

Deno.test("selectChunkingStrategy - 小規模ファイルはドキュメント単位", () => {
  const content = "短いテキスト".repeat(100); // 約600文字
  const strategy = selectChunkingStrategy(content);
  assertEquals(strategy, "document");
});

Deno.test("selectChunkingStrategy - 中規模ファイルはシーン単位", () => {
  const content = "中規模テキスト".repeat(1000); // 約7000文字
  const strategy = selectChunkingStrategy(content);
  assertEquals(strategy, "scene");
});

Deno.test("selectChunkingStrategy - 大規模ファイルはセマンティック単位", () => {
  const content = "大規模テキスト".repeat(3000); // 約21000文字
  const strategy = selectChunkingStrategy(content);
  assertEquals(strategy, "semantic");
});

Deno.test("selectChunkingStrategy - 境界値テスト 3000文字", () => {
  // 3000文字ちょうどはドキュメント単位
  const content = "a".repeat(3000);
  const strategy = selectChunkingStrategy(content);
  assertEquals(strategy, "document");
});

Deno.test("selectChunkingStrategy - 境界値テスト 3001文字", () => {
  // 3001文字はシーン単位
  const content = "a".repeat(3001);
  const strategy = selectChunkingStrategy(content);
  assertEquals(strategy, "scene");
});

Deno.test("chunkContent - ドキュメント単位は分割なし", () => {
  const content = "短いコンテンツ";
  const options: ChunkingOptions = {
    strategy: "document",
    maxChunkChars: 5000,
    overlapChars: 500,
    minChunkChars: 200,
  };

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    options,
  );
  assertEquals(chunks.length, 1);
  assertEquals(chunks[0].content, content);
  assertEquals(chunks[0].id, "test");
});

Deno.test("chunkContent - auto戦略は自動選択", () => {
  const content = "短いコンテンツ";
  const options: ChunkingOptions = {
    strategy: "auto",
    maxChunkChars: 5000,
    overlapChars: 500,
    minChunkChars: 200,
  };

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    options,
  );
  assertEquals(chunks.length, 1);
});

Deno.test("chunkContent - メタデータが継承される", () => {
  const content = "テストコンテンツ";
  const options: ChunkingOptions = {
    strategy: "document",
    maxChunkChars: 5000,
    overlapChars: 500,
    minChunkChars: 200,
  };

  const chunks = chunkContent(
    content,
    {
      id: "test_id",
      title: "Test Title",
      date: "2025-01-15",
      tags: ["tag1", "tag2"],
      sourcePath: "src/test.ts",
    },
    options,
  );

  assertEquals(chunks[0].id, "test_id");
  assertEquals(chunks[0].title, "Test Title");
  assertEquals(chunks[0].date, "2025-01-15");
  assertEquals(chunks[0].tags, ["tag1", "tag2"]);
  assertEquals(chunks[0].sourcePath, "src/test.ts");
});

Deno.test("chunkContent - シーン単位分割 基本", () => {
  const content = `## シーン1
これは最初のシーンです。

## シーン2
これは二番目のシーンです。

## シーン3
これは三番目のシーンです。`;

  const options: ChunkingOptions = {
    strategy: "scene",
    maxChunkChars: 5000,
    overlapChars: 10,
    minChunkChars: 10,
  };

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    options,
  );

  assertEquals(chunks.length, 3);
  assertEquals(chunks[0].id, "test_scene01");
  assertEquals(chunks[1].id, "test_scene02");
  assertEquals(chunks[2].id, "test_scene03");
});
