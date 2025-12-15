/**
 * TimelinePlugin テスト（TDD Red Phase）
 *
 * TimelinePluginがElementPluginインターフェースを正しく実装していることを検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { TimelinePlugin } from "../../../../src/plugins/core/timeline/plugin.ts";
import type { Timeline, TimelineScope } from "../../../../src/type/v2/timeline.ts";

Deno.test("TimelinePlugin", async (t) => {
  const plugin = new TimelinePlugin();

  await t.step("PluginMetadataが正しく設定されていること", () => {
    assertExists(plugin.meta);
    assertEquals(plugin.meta.id, "storyteller.element.timeline");
    assertEquals(plugin.meta.version, "1.0.0");
    assertEquals(plugin.meta.name, "Timeline Element Plugin");
  });

  await t.step("elementTypeがtimelineであること", () => {
    assertEquals(plugin.elementType, "timeline");
  });

  await t.step("createElementFile()でタイムラインファイルを生成できること", async () => {
    const timeline: Timeline = {
      id: "main_story",
      name: "メインストーリー",
      scope: "story",
      summary: "物語の主要なタイムライン",
      events: [],
    };

    const result = await plugin.createElementFile(timeline);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.filePath, "src/timelines/main_story.ts");
      // 生成されたコンテンツにTimeline型インポートが含まれること
      assertEquals(
        result.value.content.includes('import type { Timeline }'),
        true
      );
      // エクスポートが含まれること
      assertEquals(
        result.value.content.includes("export const main_story"),
        true
      );
    }
  });

  await t.step("createElementFile()が必須フィールド欠落時にエラーを返すこと", async () => {
    const invalidTimeline = {
      id: "invalid",
      // name, scope, summary, events が欠落
    };

    const result = await plugin.createElementFile(invalidTimeline);

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.message.includes("Missing required fields"), true);
    }
  });

  await t.step("validateElement()がTimeline整合性チェックできること", () => {
    const validTimeline: Timeline = {
      id: "valid_timeline",
      name: "有効なタイムライン",
      scope: "story",
      summary: "有効な概要",
      events: [],
    };

    const result = plugin.validateElement(validTimeline);
    assertEquals(result.valid, true);
  });

  await t.step("validateElement()が無効なTimeline検出できること", () => {
    const invalidTimeline = {
      id: "",
      name: "無効なタイムライン",
    };

    const result = plugin.validateElement(invalidTimeline);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    assertEquals(result.errors.length > 0, true);
  });

  await t.step("validateElement()がscope検証できること", () => {
    const invalidScope = {
      id: "test",
      name: "テスト",
      scope: "invalid_scope", // 無効なスコープ
      summary: "概要",
      events: [],
    };

    const result = plugin.validateElement(invalidScope);
    assertEquals(result.valid, false);
    assertExists(result.errors);
    // scopeエラーが含まれることを確認
    const scopeError = result.errors.find((e: { field: string }) => e.field === "scope");
    assertExists(scopeError);
  });

  await t.step("exportElementSchema()がTimeline型スキーマを返すこと", () => {
    const schema = plugin.exportElementSchema();

    assertEquals(schema.type, "timeline");
    assertExists(schema.properties.id);
    assertExists(schema.properties.name);
    assertExists(schema.properties.scope);
    assertExists(schema.properties.summary);
    assertExists(schema.properties.events);
    assertEquals(schema.required?.includes("id"), true);
    assertEquals(schema.required?.includes("name"), true);
    assertEquals(schema.required?.includes("scope"), true);
    assertEquals(schema.required?.includes("summary"), true);
    assertEquals(schema.required?.includes("events"), true);
  });

  await t.step("getElementPath()が正しいファイルパスを返すこと", () => {
    const path = plugin.getElementPath("main_story", "/project");
    assertEquals(path, "/project/src/timelines/main_story.ts");
  });

  await t.step("getDetailsDir()が正しい詳細ディレクトリパスを返すこと", () => {
    const dir = plugin.getDetailsDir("main_story", "/project");
    assertEquals(dir, "/project/src/timelines/main_story/details");
  });

  await t.step("イベント付きタイムラインを生成できること", async () => {
    const timeline: Timeline = {
      id: "with_events",
      name: "イベント付きタイムライン",
      scope: "story",
      summary: "イベントを含むタイムライン",
      events: [
        {
          id: "event_1",
          title: "最初のイベント",
          category: "plot_point",
          time: { order: 1 },
          summary: "物語の始まり",
          characters: ["hero"],
          settings: ["village"],
          chapters: ["chapter_01"],
        },
        {
          id: "event_2",
          title: "二番目のイベント",
          category: "character_event",
          time: { order: 2 },
          summary: "キャラクターの出会い",
          characters: ["hero", "mentor"],
          settings: ["forest"],
          chapters: ["chapter_01"],
          causedBy: ["event_1"],
        },
      ],
    };

    const result = await plugin.createElementFile(timeline);

    assertEquals(result.ok, true);
    if (result.ok) {
      // イベントが含まれること
      assertEquals(result.value.content.includes("event_1"), true);
      assertEquals(result.value.content.includes("event_2"), true);
      assertEquals(result.value.content.includes("causedBy"), true);
    }
  });
});
