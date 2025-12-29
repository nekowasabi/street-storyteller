/**
 * インクリメンタルエクスポートテスト
 * Process 40: インクリメンタルエクスポート
 */
import { assertEquals, assertNotEquals } from "@std/assert";
import {
  computeContentHash,
  detectChanges,
  type DocumentHash,
  type RagState,
} from "@storyteller/rag/incremental.ts";

Deno.test("computeContentHash - 同一コンテンツは同一ハッシュ", () => {
  const hash1 = computeContentHash("Title", "Content");
  const hash2 = computeContentHash("Title", "Content");
  assertEquals(hash1, hash2);
});

Deno.test("computeContentHash - 異なるコンテンツは異なるハッシュ", () => {
  const hash1 = computeContentHash("Title", "Content A");
  const hash2 = computeContentHash("Title", "Content B");
  assertNotEquals(hash1, hash2);
});

Deno.test("computeContentHash - タイトルが異なれば異なるハッシュ", () => {
  const hash1 = computeContentHash("Title A", "Content");
  const hash2 = computeContentHash("Title B", "Content");
  assertNotEquals(hash1, hash2);
});

Deno.test("computeContentHash - ハッシュは16文字のhex文字列", () => {
  const hash = computeContentHash("Title", "Content");
  assertEquals(hash.length, 16);
  assertEquals(/^[a-f0-9]+$/.test(hash), true);
});

Deno.test("detectChanges - 変更検出（追加・変更・削除・未変更）", () => {
  const previousState: RagState = {
    version: 1,
    lastExport: "2025-01-15T10:00:00Z",
    files: {
      "doc1": { hash: "hash1", exportedAt: "2025-01-15T10:00:00Z" },
      "doc2": { hash: "hash2", exportedAt: "2025-01-15T10:00:00Z" },
      "doc3": { hash: "hash3", exportedAt: "2025-01-15T10:00:00Z" },
    },
  };

  const currentDocs: DocumentHash[] = [
    { id: "doc1", hash: "hash1" }, // unchanged
    { id: "doc2", hash: "hash2_modified" }, // modified
    { id: "doc4", hash: "hash4" }, // added
    // doc3 is removed
  ];

  const diff = detectChanges(previousState, currentDocs);

  assertEquals(diff.unchanged.length, 1);
  assertEquals(diff.unchanged[0], "doc1");
  assertEquals(diff.modified.length, 1);
  assertEquals(diff.modified[0], "doc2");
  assertEquals(diff.added.length, 1);
  assertEquals(diff.added[0], "doc4");
  assertEquals(diff.removed.length, 1);
  assertEquals(diff.removed[0], "doc3");
});

Deno.test("detectChanges - 初回実行（状態なし）", () => {
  const emptyState: RagState = {
    version: 1,
    lastExport: "",
    files: {},
  };

  const currentDocs: DocumentHash[] = [
    { id: "doc1", hash: "hash1" },
    { id: "doc2", hash: "hash2" },
  ];

  const diff = detectChanges(emptyState, currentDocs);

  assertEquals(diff.added.length, 2);
  assertEquals(diff.modified.length, 0);
  assertEquals(diff.removed.length, 0);
  assertEquals(diff.unchanged.length, 0);
});

Deno.test("detectChanges - 全て削除された場合", () => {
  const previousState: RagState = {
    version: 1,
    lastExport: "2025-01-15T10:00:00Z",
    files: {
      "doc1": { hash: "hash1", exportedAt: "2025-01-15T10:00:00Z" },
      "doc2": { hash: "hash2", exportedAt: "2025-01-15T10:00:00Z" },
    },
  };

  const currentDocs: DocumentHash[] = [];

  const diff = detectChanges(previousState, currentDocs);

  assertEquals(diff.added.length, 0);
  assertEquals(diff.modified.length, 0);
  assertEquals(diff.removed.length, 2);
  assertEquals(diff.unchanged.length, 0);
});

Deno.test("detectChanges - 全て未変更の場合", () => {
  const previousState: RagState = {
    version: 1,
    lastExport: "2025-01-15T10:00:00Z",
    files: {
      "doc1": { hash: "hash1", exportedAt: "2025-01-15T10:00:00Z" },
      "doc2": { hash: "hash2", exportedAt: "2025-01-15T10:00:00Z" },
    },
  };

  const currentDocs: DocumentHash[] = [
    { id: "doc1", hash: "hash1" },
    { id: "doc2", hash: "hash2" },
  ];

  const diff = detectChanges(previousState, currentDocs);

  assertEquals(diff.added.length, 0);
  assertEquals(diff.modified.length, 0);
  assertEquals(diff.removed.length, 0);
  assertEquals(diff.unchanged.length, 2);
});
