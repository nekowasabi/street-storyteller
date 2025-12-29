/**
 * 設定ドキュメントテンプレートテスト
 * Process 3: 設定ドキュメントテンプレート
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { generateSettingDocument } from "@storyteller/rag/templates/setting.ts";
import type { Setting } from "@storyteller/types/v2/setting.ts";

Deno.test("generateSettingDocument - 場所設定", () => {
  const setting: Setting = {
    id: "kingdom",
    name: "フェアリーテイル王国",
    type: "location",
    summary: "古き良き伝統と魔法が共存する王国",
    appearingChapters: ["chapter01", "chapter02"],
    displayNames: ["王国", "フェアリーテイル", "王都"],
    relatedSettings: ["castle", "mansion"],
  };

  const doc = generateSettingDocument(setting);

  // タイトル確認
  assertStringIncludes(doc.title, "Setting:");
  assertStringIncludes(doc.title, "フェアリーテイル王国");

  // ID確認
  assertEquals(doc.id, "setting_kingdom");

  // タグ確認
  assertEquals(doc.tags.includes("setting"), true);
  assertEquals(doc.tags.includes("location"), true);
  assertEquals(doc.tags.includes("chapter01"), true);
  assertEquals(doc.tags.includes("chapter02"), true);

  // コンテンツ確認
  assertStringIncludes(doc.content, "## 基本情報");
  assertStringIncludes(doc.content, "タイプ: location");
  assertStringIncludes(doc.content, "## 概要");
  assertStringIncludes(doc.content, "古き良き伝統と魔法が共存する王国");
  assertStringIncludes(doc.content, "## 関連設定");
  assertStringIncludes(doc.content, "castle");
  assertStringIncludes(doc.content, "mansion");
});

Deno.test("generateSettingDocument - 世界観設定", () => {
  const setting: Setting = {
    id: "fairy_world",
    name: "妖精の世界",
    type: "world",
    summary: "妖精たちが住む魔法の領域",
    appearingChapters: ["chapter02"],
  };

  const doc = generateSettingDocument(setting);

  assertEquals(doc.tags.includes("world"), true);
  assertStringIncludes(doc.content, "タイプ: world");
});

Deno.test("generateSettingDocument - 文化設定", () => {
  const setting: Setting = {
    id: "royal_custom",
    name: "王室の慣習",
    type: "culture",
    summary: "王室における舞踏会の伝統",
    appearingChapters: ["chapter02"],
  };

  const doc = generateSettingDocument(setting);

  assertEquals(doc.tags.includes("culture"), true);
});

Deno.test("generateSettingDocument - 組織設定", () => {
  const setting: Setting = {
    id: "royal_guards",
    name: "王宮警護隊",
    type: "organization",
    summary: "王宮を護る精鋭部隊",
    appearingChapters: ["chapter03"],
  };

  const doc = generateSettingDocument(setting);

  assertEquals(doc.tags.includes("organization"), true);
});

Deno.test("generateSettingDocument - displayNames付き設定", () => {
  const setting: Setting = {
    id: "royal_palace",
    name: "王宮",
    type: "location",
    summary: "王家の住居",
    appearingChapters: ["chapter02"],
    displayNames: ["城", "宮殿", "王城"],
  };

  const doc = generateSettingDocument(setting);

  // displayNamesがタグに含まれること（最大3つ）
  assertEquals(doc.tags.includes("城"), true);
  assertEquals(doc.tags.includes("宮殿"), true);
  assertEquals(doc.tags.includes("王城"), true);

  // コンテンツにdisplayNamesが含まれること
  assertStringIncludes(doc.content, "別名:");
  assertStringIncludes(doc.content, "城");
});

Deno.test("generateSettingDocument - 関連設定なし", () => {
  const setting: Setting = {
    id: "standalone",
    name: "独立した設定",
    type: "location",
    summary: "関連設定のない場所",
    appearingChapters: ["chapter01"],
  };

  const doc = generateSettingDocument(setting);

  // 関連設定セクションがないこと
  assertEquals(doc.content.includes("## 関連設定"), false);
});

Deno.test("generateSettingDocument - 日付形式確認", () => {
  const setting: Setting = {
    id: "test",
    name: "テスト",
    type: "location",
    summary: "テスト用",
    appearingChapters: [],
  };

  const doc = generateSettingDocument(setting);

  // 日付がYYYY-MM-DD形式であること
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  assertEquals(datePattern.test(doc.date), true);
});

Deno.test("generateSettingDocument - ソースパス確認", () => {
  const setting: Setting = {
    id: "test_setting",
    name: "テスト設定",
    type: "location",
    summary: "テスト用",
    appearingChapters: [],
  };

  const doc = generateSettingDocument(setting);

  assertStringIncludes(doc.sourcePath, "settings/test_setting");
});
