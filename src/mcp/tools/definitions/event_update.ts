/**
 * event_updateツール定義
 * 既存のイベントを更新するMCPツール
 */

import type { McpToolDefinition, ToolExecutionContext } from "../tool_registry.ts";
import type { Timeline, TimelineEvent } from "../../../type/v2/timeline.ts";

export const eventUpdateTool: McpToolDefinition = {
  name: "event_update",
  description:
    "既存のタイムラインイベントを更新します。タイトル、概要、因果関係などを変更できます。",
  inputSchema: {
    type: "object",
    properties: {
      timelineId: {
        type: "string",
        description: "イベントが含まれるタイムラインのID",
      },
      eventId: {
        type: "string",
        description: "更新するイベントのID",
      },
      title: {
        type: "string",
        description: "新しいイベントタイトル",
      },
      summary: {
        type: "string",
        description: "新しいイベント概要",
      },
      category: {
        type: "string",
        enum: ["plot_point", "character_event", "world_event", "backstory", "foreshadow", "climax", "resolution"],
        description: "新しいイベントカテゴリ",
      },
      order: {
        type: "number",
        description: "新しい順序番号",
      },
      characters: {
        type: "array",
        items: { type: "string" },
        description: "関連するキャラクターIDのリスト（上書き）",
      },
      settings: {
        type: "array",
        items: { type: "string" },
        description: "関連する設定IDのリスト（上書き）",
      },
      chapters: {
        type: "array",
        items: { type: "string" },
        description: "関連するチャプターIDのリスト（上書き）",
      },
      causedBy: {
        type: "array",
        items: { type: "string" },
        description: "原因となるイベントIDのリスト（上書き）",
      },
      causes: {
        type: "array",
        items: { type: "string" },
        description: "引き起こすイベントIDのリスト（上書き）",
      },
      importance: {
        type: "string",
        enum: ["major", "minor", "background"],
        description: "新しい重要度",
      },
    },
    required: ["timelineId", "eventId"],
  },
  execute: async (args: Record<string, unknown>, context?: ToolExecutionContext) => {
    const timelineId = args.timelineId as string | undefined;
    const eventId = args.eventId as string | undefined;
    const projectRoot = context?.projectRoot ?? Deno.cwd();

    // 必須パラメータのチェック
    if (!timelineId || typeof timelineId !== "string" || timelineId.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'timelineId' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Error: 'eventId' parameter is required.",
          },
        ],
        isError: true,
      };
    }

    // タイムラインファイルのパス
    const timelineFilePath = `${projectRoot}/src/timelines/${timelineId}.ts`;

    // タイムラインファイルが存在するか確認
    try {
      await Deno.stat(timelineFilePath);
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Timeline file not found: ${timelineFilePath}`,
          },
        ],
        isError: true,
      };
    }

    // タイムラインファイルを読み込む
    const fileContent = await Deno.readTextFile(timelineFilePath);

    // Timelineオブジェクトを解析
    const timeline = parseTimelineFromFile(fileContent, timelineId);
    if (!timeline) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Failed to parse timeline from file: ${timelineFilePath}`,
          },
        ],
        isError: true,
      };
    }

    // イベントを検索
    const eventIndex = timeline.events.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: Event not found: ${eventId}`,
          },
        ],
        isError: true,
      };
    }

    // イベントを更新
    const existingEvent = timeline.events[eventIndex];
    const updatedEvent: TimelineEvent = {
      ...existingEvent,
      ...(typeof args.title === "string" && { title: args.title }),
      ...(typeof args.summary === "string" && { summary: args.summary }),
      ...(typeof args.category === "string" && { category: args.category as TimelineEvent["category"] }),
      ...(typeof args.order === "number" && { time: { ...existingEvent.time, order: args.order } }),
      ...(Array.isArray(args.characters) && { characters: args.characters.filter((c): c is string => typeof c === "string") }),
      ...(Array.isArray(args.settings) && { settings: args.settings.filter((s): s is string => typeof s === "string") }),
      ...(Array.isArray(args.chapters) && { chapters: args.chapters.filter((c): c is string => typeof c === "string") }),
      ...(Array.isArray(args.causedBy) && { causedBy: args.causedBy.filter((c): c is string => typeof c === "string") }),
      ...(Array.isArray(args.causes) && { causes: args.causes.filter((c): c is string => typeof c === "string") }),
      ...(typeof args.importance === "string" && { importance: args.importance as TimelineEvent["importance"] }),
    };

    timeline.events[eventIndex] = updatedEvent;

    // イベントをorderでソート
    timeline.events.sort((a, b) => a.time.order - b.time.order);

    // 更新されたファイルを生成
    const updatedContent = generateTimelineFile(timeline);

    // ファイルを書き込む
    await Deno.writeTextFile(timelineFilePath, updatedContent);

    return {
      content: [
        {
          type: "text" as const,
          text: `Successfully updated event '${eventId}' in timeline '${timelineId}'`,
        },
      ],
      isError: false,
    };
  },
};

/**
 * ファイル内容からTimelineオブジェクトを解析する
 */
function parseTimelineFromFile(
  content: string,
  timelineId: string,
): (Omit<Timeline, "events"> & { events: TimelineEvent[] }) | null {
  try {
    // JSON部分を抽出（export const xxx: Timeline = {...}; の形式）
    const match = content.match(
      /export\s+const\s+\w+\s*:\s*Timeline\s*=\s*(\{[\s\S]*?\});?\s*$/,
    );
    if (!match) {
      return null;
    }

    const jsonStr = match[1];
    const timeline = JSON.parse(jsonStr) as Timeline;

    // IDを確認
    if (timeline.id !== timelineId) {
      (timeline as { id: string }).id = timelineId;
    }

    // eventsを可変配列として返す
    return {
      ...timeline,
      events: [...timeline.events],
    };
  } catch {
    return null;
  }
}

/**
 * TimelineオブジェクトからTypeScriptファイルを生成する
 */
function generateTimelineFile(timeline: Timeline): string {
  const timelineJson = JSON.stringify(timeline, null, 2);

  return `import type { Timeline } from "@storyteller/types/v2/timeline.ts";

/**
 * ${timeline.name}
 * ${timeline.summary}
 */
export const ${timeline.id}: Timeline = ${timelineJson};
`;
}
