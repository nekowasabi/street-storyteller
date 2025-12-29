/**
 * タイムラインドキュメントテンプレート
 * Process 20: 全要素タイプ対応
 */
import type {
  Timeline,
  TimelineEvent,
} from "@storyteller/types/v2/timeline.ts";
import type { RagDocument } from "../types.ts";

/**
 * タイムラインからRAGドキュメントを生成
 */
export function generateTimelineDocument(timeline: Timeline): RagDocument {
  const tags = buildTimelineTags(timeline);
  const content = buildTimelineContent(timeline);
  const date = new Date().toISOString().split("T")[0];

  return {
    id: `timeline_${timeline.id}`,
    title: `Timeline: ${timeline.name} ${date}`,
    date,
    tags,
    content,
    sourcePath: `src/timelines/${timeline.id}.ts`,
  };
}

/**
 * タイムラインイベントからRAGドキュメントを生成
 */
export function generateTimelineEventDocument(
  event: TimelineEvent,
  timelineId: string,
): RagDocument {
  const tags = buildEventTags(event, timelineId);
  const content = buildEventContent(event, timelineId);
  const date = new Date().toISOString().split("T")[0];

  return {
    id: `event_${event.id}`,
    title: `Event: ${event.title} ${date}`,
    date,
    tags,
    content,
    sourcePath: `src/timelines/${timelineId}/events/${event.id}.ts`,
  };
}

/**
 * タイムラインタグを構築
 */
function buildTimelineTags(timeline: Timeline): string[] {
  const tags: string[] = ["timeline", timeline.scope];

  // displayNames
  if (timeline.displayNames) {
    tags.push(...timeline.displayNames.slice(0, 3));
  }

  // 関連キャラクター
  if (timeline.relatedCharacter) {
    tags.push(timeline.relatedCharacter);
  }

  return tags;
}

/**
 * タイムラインコンテンツを構築
 */
function buildTimelineContent(timeline: Timeline): string {
  const sections: string[] = [];

  // 基本情報
  const basicInfo = [
    `- ID: ${timeline.id}`,
    `- 名前: ${timeline.name}`,
    `- スコープ: ${timeline.scope}`,
  ];
  if (timeline.relatedCharacter) {
    basicInfo.push(`- 関連キャラクター: ${timeline.relatedCharacter}`);
  }
  if (timeline.parentTimeline) {
    basicInfo.push(`- 親タイムライン: ${timeline.parentTimeline}`);
  }
  sections.push(`## 基本情報
${basicInfo.join("\n")}`);

  // 概要
  sections.push(`## 概要
${timeline.summary}`);

  // 子タイムライン
  if (timeline.childTimelines && timeline.childTimelines.length > 0) {
    sections.push(`## 子タイムライン
${timeline.childTimelines.map((c) => `- ${c}`).join("\n")}`);
  }

  // イベント一覧
  if (timeline.events.length > 0) {
    const eventLines = timeline.events
      .sort((a, b) => a.time.order - b.time.order)
      .map((e) => `- [${e.time.order}] ${e.title}: ${e.summary}`);
    sections.push(`## イベント一覧
${eventLines.join("\n")}`);
  }

  return sections.join("\n\n");
}

/**
 * イベントタグを構築
 */
function buildEventTags(event: TimelineEvent, timelineId: string): string[] {
  const tags: string[] = ["event", event.category, timelineId];

  // 重要度
  if (event.importance) {
    tags.push(event.importance);
  }

  // チャプター
  tags.push(...event.chapters);

  // displayNames
  if (event.displayNames) {
    tags.push(...event.displayNames.slice(0, 3));
  }

  return tags;
}

/**
 * イベントコンテンツを構築
 */
function buildEventContent(event: TimelineEvent, timelineId: string): string {
  const sections: string[] = [];

  // 基本情報
  sections.push(`## 基本情報
- ID: ${event.id}
- タイトル: ${event.title}
- カテゴリ: ${event.category}
- 順序: ${event.time.order}
- 重要度: ${event.importance || "（未設定）"}
- タイムライン: ${timelineId}`);

  // 概要
  sections.push(`## 概要
${event.summary}`);

  // 関連キャラクター
  if (event.characters.length > 0) {
    sections.push(`## 関連キャラクター
${event.characters.map((c) => `- ${c}`).join("\n")}`);
  }

  // 関連設定
  if (event.settings.length > 0) {
    sections.push(`## 関連設定
${event.settings.map((s) => `- ${s}`).join("\n")}`);
  }

  // 関連チャプター
  if (event.chapters.length > 0) {
    sections.push(`## 関連チャプター
${event.chapters.map((ch) => `- ${ch}`).join("\n")}`);
  }

  // 因果関係
  const hasCausedBy = event.causedBy && event.causedBy.length > 0;
  const hasCauses = event.causes && event.causes.length > 0;
  if (hasCausedBy || hasCauses) {
    const causalItems: string[] = [];
    if (hasCausedBy) {
      causalItems.push(`- 原因: ${event.causedBy!.join(", ")}`);
    }
    if (hasCauses) {
      causalItems.push(`- 結果: ${event.causes!.join(", ")}`);
    }
    sections.push(`## 因果関係
${causalItems.join("\n")}`);
  }

  return sections.join("\n\n");
}
