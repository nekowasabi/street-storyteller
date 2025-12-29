/**
 * シーン単位チャンキング詳細テスト
 * Process 30: シーン単位チャンキング
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { chunkContent } from "@storyteller/rag/chunker.ts";
import type { ChunkingOptions } from "@storyteller/rag/types.ts";

const defaultOptions: ChunkingOptions = {
  strategy: "scene",
  maxChunkChars: 5000,
  overlapChars: 100,
  minChunkChars: 10, // テスト用に小さく設定
};

// 十分な長さのシーンコンテンツを生成
function createSceneContent(sceneNum: number, length: number = 100): string {
  const base = `これはシーン${sceneNum}の内容です。`;
  return base.repeat(Math.ceil(length / base.length)).slice(0, length);
}

Deno.test("chunkByScene - 複数シーンの分割", () => {
  const content = `## シーン1
${createSceneContent(1, 50)}

## シーン2
${createSceneContent(2, 50)}

## シーン3
${createSceneContent(3, 50)}`;

  const chunks = chunkContent(
    content,
    { id: "story", title: "Story" },
    defaultOptions,
  );

  assertEquals(chunks.length, 3);
  assertEquals(chunks[0].id, "story_scene01");
  assertEquals(chunks[1].id, "story_scene02");
  assertEquals(chunks[2].id, "story_scene03");
});

Deno.test("chunkByScene - オーバーラップ処理", () => {
  const content = `## シーン1
${createSceneContent(1, 150)}

## シーン2
${createSceneContent(2, 150)}`;

  const options: ChunkingOptions = {
    ...defaultOptions,
    overlapChars: 50,
  };

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    options,
  );

  assertEquals(chunks.length, 2);
  // 2番目のチャンクにオーバーラップが含まれる
  assertStringIncludes(chunks[1].content, "...");
});

Deno.test("chunkByScene - 最小サイズ未満のシーンはスキップ", () => {
  const content = `## シーン1
${createSceneContent(1, 100)}

## 短い
x

## シーン3
${createSceneContent(3, 100)}`;

  const options: ChunkingOptions = {
    ...defaultOptions,
    minChunkChars: 30,
  };

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    options,
  );

  // 短いシーンはスキップされる
  assertEquals(chunks.length, 2);
});

Deno.test("chunkByScene - タグにシーン番号が含まれる", () => {
  const content = `## シーン1
${createSceneContent(1, 50)}

## シーン2
${createSceneContent(2, 50)}`;

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test", tags: ["story"] },
    defaultOptions,
  );

  assertEquals(chunks[0].tags.includes("scene1"), true);
  assertEquals(chunks[1].tags.includes("scene2"), true);
  // 元のタグも継承
  assertEquals(chunks[0].tags.includes("story"), true);
});

Deno.test("chunkByScene - タイトルにシーン番号が含まれる", () => {
  const content = `## シーン1
${createSceneContent(1, 50)}

## シーン2
${createSceneContent(2, 50)}`;

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test Document" },
    defaultOptions,
  );

  assertStringIncludes(chunks[0].title, "Scene 1");
  assertStringIncludes(chunks[1].title, "Scene 2");
});

Deno.test("chunkByScene - ## がないコンテンツは単一シーンとして扱われる", () => {
  const content = `これは見出しのないテキストです。
シーン分割されずに単一シーンとして返されます。`;

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    defaultOptions,
  );

  // 見出しがなくても1つのシーンとして扱われる
  assertEquals(chunks.length, 1);
  // シーン形式のIDになる
  assertEquals(chunks[0].id, "test_scene01");
});

Deno.test("chunkByScene - 見出しの前にテキストがある場合", () => {
  const content = `${createSceneContent(0, 50)}

## シーン1
${createSceneContent(1, 50)}

## シーン2
${createSceneContent(2, 50)}`;

  const options: ChunkingOptions = {
    ...defaultOptions,
    minChunkChars: 10,
  };

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    options,
  );

  // 導入部分 + 2シーン
  assertEquals(chunks.length, 3);
});

Deno.test("chunkByScene - メタデータが正しく継承される", () => {
  const content = `## シーン1
${createSceneContent(1, 50)}`;

  const chunks = chunkContent(
    content,
    {
      id: "test",
      title: "Test",
      date: "2025-01-15",
      tags: ["original"],
      sourcePath: "src/test.md",
    },
    defaultOptions,
  );

  assertEquals(chunks[0].date, "2025-01-15");
  assertEquals(chunks[0].tags.includes("original"), true);
  assertEquals(chunks[0].sourcePath, "src/test.md");
});

Deno.test("chunkByScene - 空のコンテンツは単一ドキュメントで返す", () => {
  const content = "";

  const options: ChunkingOptions = {
    ...defaultOptions,
    minChunkChars: 10,
  };

  const chunks = chunkContent(
    content,
    { id: "test", title: "Test" },
    options,
  );

  // 空のコンテンツでも最低1つのドキュメントが返される
  assertEquals(chunks.length, 1);
  assertEquals(chunks[0].id, "test");
});
