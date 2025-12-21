/**
 * ProjectDetector テスト
 * ファイルURIから最も近い.storyteller.jsonを検出するロジックをテスト
 *
 * 既存のsamples/cinderellaプロジェクトを使用してテスト（実際の使用ケース）
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { ProjectDetector } from "@storyteller/lsp/project/project_detector.ts";

// プロジェクトルート
const PROJECT_ROOT = Deno.cwd();

// samples/cinderella は .storyteller.json を持つサブプロジェクト
const CINDERELLA_PROJECT = join(PROJECT_ROOT, "samples/cinderella");
const CINDERELLA_CHARACTER_FILE = join(
  CINDERELLA_PROJECT,
  "src/characters/cinderella.ts",
);

Deno.test("ProjectDetector - detects .storyteller.json in samples/cinderella", async () => {
  // フォールバックはリポジトリルート（街の語り手本体）
  const fallbackRoot = PROJECT_ROOT;
  const detector = new ProjectDetector(fallbackRoot);

  const fileUri = `file://${CINDERELLA_CHARACTER_FILE}`;
  const projectRoot = await detector.detectProjectRoot(fileUri);

  // samples/cinderellaの.storyteller.jsonが見つかるはず
  assertEquals(projectRoot, CINDERELLA_PROJECT);
});

Deno.test("ProjectDetector - uses fallback when no marker file found", async () => {
  const fallbackRoot = PROJECT_ROOT;
  const detector = new ProjectDetector(fallbackRoot);

  // リポジトリルート直下のファイル（.storyteller.jsonがない）
  const fileUri = `file://${join(PROJECT_ROOT, "deno.json")}`;
  const projectRoot = await detector.detectProjectRoot(fileUri);

  // フォールバックが返されるはず
  assertEquals(projectRoot, fallbackRoot);
});

Deno.test("ProjectDetector - caches detection results", async () => {
  const fallbackRoot = PROJECT_ROOT;
  const detector = new ProjectDetector(fallbackRoot);

  const fileUri = `file://${CINDERELLA_CHARACTER_FILE}`;

  // 1回目
  const result1 = await detector.detectProjectRoot(fileUri);
  assertEquals(detector.getCacheSize(), 1);

  // 2回目（キャッシュから）
  const result2 = await detector.detectProjectRoot(fileUri);
  assertEquals(detector.getCacheSize(), 1); // キャッシュサイズは変わらない

  assertEquals(result1, result2);

  // キャッシュをクリアして再検出
  detector.clearCache();
  assertEquals(detector.getCacheSize(), 0);

  const result3 = await detector.detectProjectRoot(fileUri);
  assertEquals(result1, result3);
  assertEquals(detector.getCacheSize(), 1);
});

Deno.test("ProjectDetector - handles file:// protocol correctly", async () => {
  const fallbackRoot = PROJECT_ROOT;
  const detector = new ProjectDetector(fallbackRoot);

  // file://プロトコル付きのURI
  const fileUri = `file://${CINDERELLA_CHARACTER_FILE}`;
  const projectRoot = await detector.detectProjectRoot(fileUri);

  assertExists(projectRoot);
  assertEquals(projectRoot, CINDERELLA_PROJECT);
});

Deno.test("ProjectDetector - returns fallback for non-existent file", async () => {
  const fallbackRoot = "/tmp/fallback";
  const detector = new ProjectDetector(fallbackRoot);

  const fileUri = "file:///non/existent/path/file.ts";
  const projectRoot = await detector.detectProjectRoot(fileUri);

  assertEquals(projectRoot, fallbackRoot);
});

Deno.test("ProjectDetector - detects project for manuscript files", async () => {
  const fallbackRoot = PROJECT_ROOT;
  const detector = new ProjectDetector(fallbackRoot);

  // 原稿ファイル（manuscripts/配下）
  const manuscriptFile = join(CINDERELLA_PROJECT, "manuscripts/chapter01.md");
  const fileUri = `file://${manuscriptFile}`;
  const projectRoot = await detector.detectProjectRoot(fileUri);

  // samples/cinderellaが検出されるはず
  assertEquals(projectRoot, CINDERELLA_PROJECT);
});

Deno.test("ProjectDetector - different files in same project share cache", async () => {
  const fallbackRoot = PROJECT_ROOT;
  const detector = new ProjectDetector(fallbackRoot);

  const file1 = `file://${
    join(CINDERELLA_PROJECT, "src/characters/cinderella.ts")
  }`;
  const file2 = `file://${
    join(CINDERELLA_PROJECT, "src/settings/royal_palace.ts")
  }`;

  await detector.detectProjectRoot(file1);
  await detector.detectProjectRoot(file2);

  // 2つの異なるファイルがキャッシュされる
  assertEquals(detector.getCacheSize(), 2);
});
