/**
 * ProjectContextManager テスト
 * プロジェクトごとのエンティティを遅延ロード・キャッシュする機能をテスト
 *
 * 既存のsamples/cinderellaプロジェクトを使用してテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { ProjectContextManager } from "@storyteller/lsp/project/project_context_manager.ts";

// プロジェクトルート
const PROJECT_ROOT = Deno.cwd();

// samples/cinderella は .storyteller.json を持つサブプロジェクト
const CINDERELLA_PROJECT = join(PROJECT_ROOT, "samples/cinderella");

Deno.test("ProjectContextManager - loads entities for project", async () => {
  const manager = new ProjectContextManager();

  const context = await manager.getContext(CINDERELLA_PROJECT);

  assertExists(context);
  assertEquals(context.projectRoot, CINDERELLA_PROJECT);

  // cinderellaプロジェクトにはキャラクターが存在するはず
  const hasCharacters = context.entities.some((e) => e.kind === "character");
  assertEquals(hasCharacters, true, "Should have character entities");

  // cinderellaキャラクターが存在するはず
  const cinderella = context.entities.find((e) => e.id === "cinderella");
  assertExists(cinderella, "Should have cinderella character");
  assertEquals(cinderella.kind, "character");
  assertEquals(cinderella.name, "シンデレラ");
});

Deno.test("ProjectContextManager - builds entity info map", async () => {
  const manager = new ProjectContextManager();

  const context = await manager.getContext(CINDERELLA_PROJECT);

  assertExists(context.entityInfoMap);

  // cinderellaのEntityInfoが存在するはず
  const cinderellaInfo = context.entityInfoMap.get("cinderella");
  assertExists(cinderellaInfo, "Should have cinderella EntityInfo");
  assertEquals(cinderellaInfo.id, "cinderella");
  assertEquals(cinderellaInfo.kind, "character");
  assertEquals(cinderellaInfo.name, "シンデレラ");

  // summary, role, traitsが含まれているはず
  assertExists(cinderellaInfo.summary, "Should have summary");
  assertExists(cinderellaInfo.role, "Should have role");
});

Deno.test("ProjectContextManager - caches loaded contexts", async () => {
  const manager = new ProjectContextManager();

  // 1回目のロード
  const context1 = await manager.getContext(CINDERELLA_PROJECT);
  assertEquals(manager.getCacheSize(), 1);

  // 2回目（キャッシュから）
  const context2 = await manager.getContext(CINDERELLA_PROJECT);
  assertEquals(manager.getCacheSize(), 1); // キャッシュサイズは変わらない

  // 同じオブジェクトが返されるはず
  assertEquals(context1, context2);
});

Deno.test("ProjectContextManager - clears cache", async () => {
  const manager = new ProjectContextManager();

  await manager.getContext(CINDERELLA_PROJECT);
  assertEquals(manager.getCacheSize(), 1);

  manager.clearCache();
  assertEquals(manager.getCacheSize(), 0);

  // 再度ロード可能
  const context = await manager.getContext(CINDERELLA_PROJECT);
  assertExists(context);
  assertEquals(manager.getCacheSize(), 1);
});

Deno.test("ProjectContextManager - handles settings entities", async () => {
  const manager = new ProjectContextManager();

  const context = await manager.getContext(CINDERELLA_PROJECT);

  // 設定エンティティが存在するはず
  const settings = context.entities.filter((e) => e.kind === "setting");

  // cinderellaプロジェクトに設定がある場合
  if (settings.length > 0) {
    const settingId = settings[0].id;
    const settingInfo = context.entityInfoMap.get(settingId);
    assertExists(settingInfo, "Should have setting EntityInfo");
    assertEquals(settingInfo.kind, "setting");
  }
});

Deno.test("ProjectContextManager - handles foreshadowing entities", async () => {
  const manager = new ProjectContextManager();

  const context = await manager.getContext(CINDERELLA_PROJECT);

  // 伏線エンティティが存在するはず
  const foreshadowings = context.entities.filter(
    (e) => e.kind === "foreshadowing",
  );

  // cinderellaプロジェクトに伏線がある場合
  if (foreshadowings.length > 0) {
    const foreshadowingId = foreshadowings[0].id;
    const foreshadowingInfo = context.entityInfoMap.get(foreshadowingId);
    assertExists(foreshadowingInfo, "Should have foreshadowing EntityInfo");
    assertEquals(foreshadowingInfo.kind, "foreshadowing");
  }
});

Deno.test("ProjectContextManager - returns empty for non-existent project", async () => {
  const manager = new ProjectContextManager();

  const context = await manager.getContext("/non/existent/project");

  assertExists(context);
  assertEquals(context.entities.length, 0);
  assertEquals(context.entityInfoMap.size, 0);
});
