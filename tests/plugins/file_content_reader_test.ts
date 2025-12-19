/**
 * FileContentReader のテスト
 */

import { assertEquals } from "@std/assert";
import { FileContentReader } from "@storyteller/plugins/features/details/file_content_reader.ts";

const TEST_PROJECT_ROOT = "/tmp/test_file_content_reader";

// テスト前にテスト用のディレクトリとファイルを作成
async function setupTestFiles(): Promise<void> {
  // テスト用ディレクトリを作成
  await Deno.mkdir(TEST_PROJECT_ROOT, { recursive: true });

  // 通常のMarkdownファイル
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/test.md`,
    "ファイルの内容です",
  );

  // フロントマター付きMarkdownファイル
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/with_frontmatter.md`,
    `---
title: テストタイトル
author: テスト著者
---
本文の内容です`,
  );

  // 複雑なフロントマター付きファイル
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/complex_frontmatter.md`,
    `---
title: test
tags:
  - tag1
  - tag2
---

複数行の本文
二行目
三行目`,
  );

  // 空のフロントマターのファイル
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/empty_frontmatter.md`,
    `---
---
本文のみ`,
  );

  // フロントマターなしのファイル
  await Deno.writeTextFile(
    `${TEST_PROJECT_ROOT}/no_frontmatter.md`,
    "フロントマターなしの本文",
  );
}

// テスト後にテスト用のディレクトリを削除
async function cleanupTestFiles(): Promise<void> {
  try {
    await Deno.remove(TEST_PROJECT_ROOT, { recursive: true });
  } catch {
    // 無視
  }
}

Deno.test("FileContentReader", async (t) => {
  // テスト前のセットアップ
  await setupTestFiles();

  try {
    await t.step(
      "resolveHybridField - インライン文字列はそのまま返す",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.resolveHybridField("詳細な説明");

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, "詳細な説明");
        }
      },
    );

    await t.step(
      "resolveHybridField - undefinedはok(undefined)を返す",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.resolveHybridField(undefined);

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, undefined);
        }
      },
    );

    await t.step(
      "resolveHybridField - ファイル参照は内容を読み込んで返す",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.resolveHybridField({ file: "test.md" });

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, "ファイルの内容です");
        }
      },
    );

    await t.step(
      "resolveHybridField - 存在しないファイルはエラーを返す",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.resolveHybridField({
          file: "nonexistent.md",
        });

        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.type, "file_not_found");
          assertEquals(result.error.filePath, "nonexistent.md");
        }
      },
    );

    await t.step(
      "readFileContent - ファイル内容を読み込む",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.readFileContent("test.md");

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, "ファイルの内容です");
        }
      },
    );

    await t.step(
      "readFileContent - フロントマターを除去する",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.readFileContent("with_frontmatter.md");

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, "本文の内容です");
        }
      },
    );

    await t.step(
      "readFileContent - 複雑なフロントマターを除去する",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.readFileContent("complex_frontmatter.md");

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, "複数行の本文\n二行目\n三行目");
        }
      },
    );

    await t.step(
      "readFileContent - 空のフロントマターを除去する",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.readFileContent("empty_frontmatter.md");

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, "本文のみ");
        }
      },
    );

    await t.step(
      "readFileContent - フロントマターなしのファイルはそのまま返す",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.readFileContent("no_frontmatter.md");

        assertEquals(result.ok, true);
        if (result.ok) {
          assertEquals(result.value, "フロントマターなしの本文");
        }
      },
    );

    await t.step(
      "readFileContent - 存在しないファイルはエラーを返す",
      async () => {
        const reader = new FileContentReader(TEST_PROJECT_ROOT);
        const result = await reader.readFileContent("nonexistent.md");

        assertEquals(result.ok, false);
        if (!result.ok) {
          assertEquals(result.error.type, "file_not_found");
          assertEquals(result.error.filePath, "nonexistent.md");
        }
      },
    );
  } finally {
    // テスト後のクリーンアップ
    await cleanupTestFiles();
  }
});
