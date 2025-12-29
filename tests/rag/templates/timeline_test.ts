/**
 * タイムラインドキュメントテンプレートテスト
 * Process 20: 全要素タイプ対応
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  generateTimelineDocument,
  generateTimelineEventDocument,
} from "@storyteller/rag/templates/timeline.ts";
import type {
  Timeline,
  TimelineEvent,
} from "@storyteller/types/v2/timeline.ts";

Deno.test("generateTimelineDocument - 基本タイムライン", () => {
  const timeline: Timeline = {
    id: "main_story",
    name: "メインストーリー",
    scope: "story",
    summary: "物語全体のタイムライン",
    events: [
      {
        id: "event01",
        title: "物語の始まり",
        category: "plot_point",
        time: { order: 1 },
        summary: "物語が始まる",
        characters: ["cinderella"],
        settings: ["home"],
        chapters: ["chapter01"],
      },
    ],
  };

  const doc = generateTimelineDocument(timeline);

  // タイトル確認
  assertStringIncludes(doc.title, "Timeline:");
  assertStringIncludes(doc.title, "メインストーリー");

  // ID確認
  assertEquals(doc.id, "timeline_main_story");

  // タグ確認
  assertEquals(doc.tags.includes("timeline"), true);
  assertEquals(doc.tags.includes("story"), true);

  // コンテンツ確認
  assertStringIncludes(doc.content, "## 基本情報");
  assertStringIncludes(doc.content, "スコープ: story");
  assertStringIncludes(doc.content, "## イベント一覧");
  assertStringIncludes(doc.content, "物語の始まり");
});

Deno.test("generateTimelineDocument - キャラクタータイムライン", () => {
  const timeline: Timeline = {
    id: "cinderella_timeline",
    name: "シンデレラの物語",
    scope: "character",
    summary: "シンデレラの成長を追うタイムライン",
    events: [],
    relatedCharacter: "cinderella",
  };

  const doc = generateTimelineDocument(timeline);

  assertEquals(doc.tags.includes("character"), true);
  assertStringIncludes(doc.content, "関連キャラクター: cinderella");
});

Deno.test("generateTimelineDocument - 階層タイムライン", () => {
  const timeline: Timeline = {
    id: "act1",
    name: "第一幕",
    scope: "arc",
    summary: "第一幕のタイムライン",
    events: [],
    parentTimeline: "main_story",
    childTimelines: ["scene1", "scene2"],
  };

  const doc = generateTimelineDocument(timeline);

  assertStringIncludes(doc.content, "親タイムライン: main_story");
  assertStringIncludes(doc.content, "子タイムライン");
  assertStringIncludes(doc.content, "scene1");
});

Deno.test("generateTimelineEventDocument - 基本イベント", () => {
  const event: TimelineEvent = {
    id: "event01",
    title: "舞踏会への招待",
    category: "plot_point",
    time: { order: 5 },
    summary: "王宮から舞踏会への招待状が届く",
    characters: ["cinderella", "stepmother"],
    settings: ["home"],
    chapters: ["chapter02"],
    importance: "major",
  };

  const doc = generateTimelineEventDocument(event, "main_story");

  // タイトル確認
  assertStringIncludes(doc.title, "Event:");
  assertStringIncludes(doc.title, "舞踏会への招待");

  // ID確認
  assertEquals(doc.id, "event_event01");

  // タグ確認
  assertEquals(doc.tags.includes("event"), true);
  assertEquals(doc.tags.includes("plot_point"), true);
  assertEquals(doc.tags.includes("major"), true);
  assertEquals(doc.tags.includes("chapter02"), true);

  // コンテンツ確認
  assertStringIncludes(doc.content, "## 基本情報");
  assertStringIncludes(doc.content, "カテゴリ: plot_point");
  assertStringIncludes(doc.content, "## 関連キャラクター");
  assertStringIncludes(doc.content, "cinderella");
  assertStringIncludes(doc.content, "## 関連設定");
  assertStringIncludes(doc.content, "home");
});

Deno.test("generateTimelineEventDocument - 因果関係付きイベント", () => {
  const event: TimelineEvent = {
    id: "event02",
    title: "妖精のおばあさん登場",
    category: "character_event",
    time: { order: 6 },
    summary: "妖精のおばあさんが現れる",
    characters: ["fairy_godmother", "cinderella"],
    settings: ["garden"],
    chapters: ["chapter02"],
    causedBy: ["event01"],
    causes: ["event03"],
  };

  const doc = generateTimelineEventDocument(event, "main_story");

  assertStringIncludes(doc.content, "## 因果関係");
  assertStringIncludes(doc.content, "原因: event01");
  assertStringIncludes(doc.content, "結果: event03");
});

Deno.test("generateTimelineEventDocument - 日付形式確認", () => {
  const event: TimelineEvent = {
    id: "test",
    title: "テスト",
    category: "resolution",
    time: { order: 1 },
    summary: "テスト用",
    characters: [],
    settings: [],
    chapters: [],
  };

  const doc = generateTimelineEventDocument(event, "test_timeline");

  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  assertEquals(datePattern.test(doc.date), true);
});
