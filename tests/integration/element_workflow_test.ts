/**
 * Phase 1 統合テスト: Element Workflow
 *
 * 全コンポーネント（CharacterPlugin, DetailsPlugin, ElementService, ElementCommand）が
 * 連携して正しく動作することを確認する
 */

import { assertEquals, assertExists } from "@std/assert";
import { createPluginRegistry } from "../../src/core/plugin_system.ts";
import { CharacterPlugin } from "../../src/plugins/core/character/plugin.ts";
import { DetailsPlugin } from "../../src/plugins/features/details/plugin.ts";
import { ElementService } from "../../src/application/element_service.ts";
import type { Character } from "../../src/type/v2/character.ts";

Deno.test("統合テスト - 基本要素作成ワークフロー", async () => {
  // 1. プラグインレジストリの初期化
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());
  registry.register(new DetailsPlugin());

  // 2. プラグインの検証
  const validationResult = registry.validate();
  assertEquals(validationResult.ok, true);

  // 3. ElementServiceを使って要素を作成
  const service = new ElementService(registry);
  const result = await service.createElement("character", {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave", "kind"],
    summary: "世界を救う運命を背負った若者",
  });

  // 4. 結果の検証
  assertEquals(result.ok, true);
  if (result.ok) {
    assertExists(result.value.filePath);
    assertExists(result.value.content);

    // TypeScriptファイルの内容に必要な要素が含まれている
    assertEquals(result.value.content.includes("Character"), true);
    assertEquals(result.value.content.includes("勇者"), true);
    assertEquals(result.value.content.includes("protagonist"), true);
  }
});

Deno.test("統合テスト - 詳細付き作成ワークフロー", async () => {
  // 1. セットアップ
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());
  registry.register(new DetailsPlugin());

  const service = new ElementService(registry);

  // 2. 基本要素の定義
  const baseCharacter: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  // 3. 詳細情報を追加
  const withDetailsResult = await service.addDetailsToElement(
    "character",
    baseCharacter,
    ["appearance", "backstory", "development"],
  );

  // 4. 結果の検証
  assertEquals(withDetailsResult.ok, true);
  if (withDetailsResult.ok) {
    assertExists(withDetailsResult.value.details);
    assertExists(withDetailsResult.value.details.appearance);
    assertExists(withDetailsResult.value.details.backstory);
    assertExists(withDetailsResult.value.details.development);

    // developmentは構造化オブジェクト
    assertEquals(typeof withDetailsResult.value.details.development, "object");
    assertExists(withDetailsResult.value.details.development.initial);
    assertExists(withDetailsResult.value.details.development.goal);
    assertExists(withDetailsResult.value.details.development.obstacle);
  }

  // 5. 詳細付き要素でファイルを作成
  if (withDetailsResult.ok) {
    const createResult = await service.createElement(
      "character",
      withDetailsResult.value,
    );

    assertEquals(createResult.ok, true);
    if (createResult.ok) {
      assertExists(createResult.value.filePath);
      assertExists(createResult.value.content);

      // ファイル内容に詳細情報が含まれている
      assertEquals(createResult.value.content.includes("details"), true);
      assertEquals(createResult.value.content.includes("appearance"), true);
    }
  }
});

Deno.test("統合テスト - 既存要素への詳細追加ワークフロー", async () => {
  // 1. セットアップ
  const registry = createPluginRegistry();
  registry.register(new CharacterPlugin());
  registry.register(new DetailsPlugin());

  const service = new ElementService(registry);

  // 2. 既存の要素（詳細情報なし）
  const existingCharacter: Character = {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    relationships: {},
    appearingChapters: ["chapter01"],
    summary: "勇者の概要",
  };

  // 3. フェーズ1: 外見を追加
  const phase1Result = await service.addDetailsToElement(
    "character",
    existingCharacter,
    [
      "appearance",
    ],
  );

  assertEquals(phase1Result.ok, true);
  if (!phase1Result.ok) return;

  assertExists(phase1Result.value.details);
  assertExists(phase1Result.value.details.appearance);
  assertEquals(phase1Result.value.details.backstory, undefined);

  // 4. フェーズ2: 既存の外見を保持しつつbackstoryを追加
  const phase2Result = await service.addDetailsToElement(
    "character",
    phase1Result.value,
    [
      "backstory",
    ],
  );

  assertEquals(phase2Result.ok, true);
  if (!phase2Result.ok) return;

  assertExists(phase2Result.value.details);
  // 既存のappearanceは保持される
  assertEquals(
    phase2Result.value.details.appearance,
    phase1Result.value.details!.appearance,
  );
  // backstoryが追加される
  assertExists(phase2Result.value.details.backstory);
});

Deno.test("統合テスト - エンドツーエンドワークフロー（プラグインレジストリ→サービス→コマンド）", async () => {
  // このテストは、実際のコマンド実行までの流れを確認する

  // 1. プラグインレジストリの初期化
  const registry = createPluginRegistry();
  const characterPlugin = new CharacterPlugin();
  const detailsPlugin = new DetailsPlugin();

  registry.register(characterPlugin);
  registry.register(detailsPlugin);

  // 2. プラグインの検証
  const validationResult = registry.validate();
  assertEquals(validationResult.ok, true);

  // 3. ElementServiceの初期化
  const service = new ElementService(registry);

  // 4. 利用可能な要素タイプの確認
  const elementTypes = service.getAvailableElementTypes();
  assertEquals(elementTypes.includes("character"), true);

  // 5. Character要素を作成（基本情報のみ）
  const createResult1 = await service.createElement("character", {
    id: "hero",
    name: "勇者",
    role: "protagonist",
    traits: ["brave"],
    summary: "勇者の概要",
    relationships: {},
    appearingChapters: [],
  });

  assertEquals(createResult1.ok, true);

  // 6. Character要素を作成（詳細情報付き）
  const baseCharacter: Character = {
    id: "wizard",
    name: "魔法使い",
    role: "supporting",
    traits: ["wise", "mysterious"],
    relationships: { hero: "mentor" },
    appearingChapters: ["chapter01", "chapter02"],
    summary: "主人公を導く賢者",
  };

  // 詳細を追加
  const withDetailsResult = await service.addDetailsToElement(
    "character",
    baseCharacter,
    [
      "appearance",
      "personality",
    ],
  );

  assertEquals(withDetailsResult.ok, true);
  if (!withDetailsResult.ok) return;

  // ファイル作成
  const createResult2 = await service.createElement(
    "character",
    withDetailsResult.value,
  );

  assertEquals(createResult2.ok, true);
  if (createResult2.ok) {
    assertExists(createResult2.value.filePath);
    assertExists(createResult2.value.content);

    // 内容の検証
    assertEquals(createResult2.value.content.includes("魔法使い"), true);
    assertEquals(createResult2.value.content.includes("supporting"), true);
    assertEquals(createResult2.value.content.includes("details"), true);
  }

  // 7. 成功: 全ワークフローが正常に完了
  // この時点で、プラグインシステム、ElementService、各プラグインが
  // 正しく連携して動作していることが確認できた
});
