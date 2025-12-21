/**
 * マルチプロジェクト統合テスト
 * LSPサーバーがファイルURIから適切なプロジェクトを検出し、
 * 正しいエンティティを使用することをテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { ProjectDetector } from "@storyteller/lsp/project/project_detector.ts";
import { ProjectContextManager } from "@storyteller/lsp/project/project_context_manager.ts";

// プロジェクトルート
const PROJECT_ROOT = Deno.cwd();

// samples/cinderella は .storyteller.json を持つサブプロジェクト
const CINDERELLA_PROJECT = join(PROJECT_ROOT, "samples/cinderella");
const CINDERELLA_CHARACTER_FILE = join(
  CINDERELLA_PROJECT,
  "src/characters/cinderella.ts",
);

Deno.test("Integration - detects correct project and loads entities", async () => {
  // ProjectDetectorとProjectContextManagerを統合
  const detector = new ProjectDetector(PROJECT_ROOT);
  const contextManager = new ProjectContextManager();

  // ファイルURIからプロジェクトルートを検出
  const fileUri = `file://${CINDERELLA_CHARACTER_FILE}`;
  const projectRoot = await detector.detectProjectRoot(fileUri);

  // 検出されたプロジェクトルートが正しいことを確認
  assertEquals(projectRoot, CINDERELLA_PROJECT);

  // プロジェクトコンテキストを取得
  const context = await contextManager.getContext(projectRoot);

  // cinderellaエンティティが存在することを確認
  const cinderella = context.entities.find((e) => e.id === "cinderella");
  assertExists(cinderella, "Should find cinderella entity");
  assertEquals(cinderella.kind, "character");
  assertEquals(cinderella.name, "シンデレラ");

  // EntityInfoMapにcinderellaの詳細情報が存在することを確認
  const cinderellaInfo = context.entityInfoMap.get("cinderella");
  assertExists(cinderellaInfo, "Should have cinderella EntityInfo");
  assertEquals(cinderellaInfo.id, "cinderella");
  assertEquals(cinderellaInfo.kind, "character");
});

Deno.test("Integration - different subprojects load different entities", async () => {
  const detector = new ProjectDetector(PROJECT_ROOT);
  const contextManager = new ProjectContextManager();

  // cinderellaプロジェクトのファイル
  const cinderellaUri = `file://${CINDERELLA_CHARACTER_FILE}`;
  const cinderellaRoot = await detector.detectProjectRoot(cinderellaUri);
  const cinderellaContext = await contextManager.getContext(cinderellaRoot);

  // cinderellaプロジェクトにはcinderellaキャラクターが存在
  const hasCinderella = cinderellaContext.entities.some(
    (e) => e.id === "cinderella",
  );
  assertEquals(
    hasCinderella,
    true,
    "Cinderella project should have cinderella",
  );

  // メインプロジェクトのファイル（.storyteller.jsonがない）
  const mainProjectUri = `file://${join(PROJECT_ROOT, "deno.json")}`;
  const mainProjectRoot = await detector.detectProjectRoot(mainProjectUri);

  // フォールバックとしてPROJECT_ROOTが返される
  assertEquals(mainProjectRoot, PROJECT_ROOT);

  const mainContext = await contextManager.getContext(mainProjectRoot);

  // メインプロジェクトにはcinderellaキャラクターは存在しない
  // （メインプロジェクトには.storyteller.jsonがないため、エンティティは空）
  const hasCinderellaInMain = mainContext.entities.some(
    (e) => e.id === "cinderella",
  );
  assertEquals(
    hasCinderellaInMain,
    false,
    "Main project should not have cinderella",
  );
});

Deno.test("Integration - context manager caches across detector calls", async () => {
  const detector = new ProjectDetector(PROJECT_ROOT);
  const contextManager = new ProjectContextManager();

  // 同じプロジェクト内の異なるファイル
  const file1 = `file://${
    join(CINDERELLA_PROJECT, "src/characters/cinderella.ts")
  }`;
  const file2 = `file://${join(CINDERELLA_PROJECT, "src/settings/castle.ts")}`;

  const root1 = await detector.detectProjectRoot(file1);
  const root2 = await detector.detectProjectRoot(file2);

  // 同じプロジェクトルートが検出される
  assertEquals(root1, root2);
  assertEquals(root1, CINDERELLA_PROJECT);

  // コンテキストを取得（両方とも同じプロジェクトなのでキャッシュされる）
  const context1 = await contextManager.getContext(root1);
  const context2 = await contextManager.getContext(root2);

  // 同じオブジェクトが返される（キャッシュ）
  assertEquals(context1, context2);
  assertEquals(contextManager.getCacheSize(), 1);
});

Deno.test("Integration - handles manuscripts directory", async () => {
  const detector = new ProjectDetector(PROJECT_ROOT);
  const contextManager = new ProjectContextManager();

  // 原稿ファイル
  const manuscriptUri = `file://${
    join(CINDERELLA_PROJECT, "manuscripts/chapter01.md")
  }`;
  const projectRoot = await detector.detectProjectRoot(manuscriptUri);

  // cinderellaプロジェクトが検出される
  assertEquals(projectRoot, CINDERELLA_PROJECT);

  // エンティティが正しくロードされる
  const context = await contextManager.getContext(projectRoot);
  const hasEntities = context.entities.length > 0;
  assertEquals(
    hasEntities,
    true,
    "Should have entities from cinderella project",
  );
});
