/**
 * timeline_viewツール定義
 * タイムラインの一覧または詳細を表示するMCPツール
 */

import type {
  McpToolDefinition,
  ToolExecutionContext,
} from "../tool_registry.ts";
import type { Timeline } from "../../../type/v2/timeline.ts";

export const timelineViewTool: McpToolDefinition = {
  name: "timeline_view",
  description:
    "タイムラインの一覧を表示するか、特定のタイムラインの詳細（イベント一覧含む）を表示します。",
  inputSchema: {
    type: "object",
    properties: {
      timelineId: {
        type: "string",
        description: "表示するタイムラインのID（省略時は一覧を表示）",
      },
      format: {
        type: "string",
        enum: ["text", "json"],
        description: "出力形式（デフォルト: text）",
      },
    },
    required: [],
  },
  execute: async (
    args: Record<string, unknown>,
    context?: ToolExecutionContext,
  ) => {
    const timelineId = args.timelineId as string | undefined;
    const format = (args.format as string | undefined) ?? "text";
    const projectRoot = context?.projectRoot ?? Deno.cwd();

    const timelinesDir = `${projectRoot}/src/timelines`;

    // タイムラインディレクトリが存在するか確認
    let timelinesExist = false;
    try {
      await Deno.stat(timelinesDir);
      timelinesExist = true;
    } catch {
      timelinesExist = false;
    }

    // 特定のタイムラインを表示
    if (timelineId) {
      if (!timelinesExist) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Timeline not found: ${timelineId}`,
            },
          ],
          isError: true,
        };
      }

      const timelineFilePath = `${timelinesDir}/${timelineId}.ts`;

      try {
        await Deno.stat(timelineFilePath);
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Timeline not found: ${timelineId}`,
            },
          ],
          isError: true,
        };
      }

      const fileContent = await Deno.readTextFile(timelineFilePath);
      const timeline = parseTimelineFromFile(fileContent);

      if (!timeline) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Failed to parse timeline: ${timelineId}`,
            },
          ],
          isError: true,
        };
      }

      if (format === "json") {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(timeline, null, 2),
            },
          ],
          isError: false,
        };
      }

      // テキスト形式で詳細表示
      const text = formatTimelineDetail(timeline);
      return {
        content: [
          {
            type: "text" as const,
            text,
          },
        ],
        isError: false,
      };
    }

    // タイムライン一覧を表示
    if (!timelinesExist) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No timelines found.",
          },
        ],
        isError: false,
      };
    }

    const timelines: Timeline[] = [];

    for await (const entry of Deno.readDir(timelinesDir)) {
      if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

      const filePath = `${timelinesDir}/${entry.name}`;
      try {
        const content = await Deno.readTextFile(filePath);
        const timeline = parseTimelineFromFile(content);
        if (timeline) {
          timelines.push(timeline);
        }
      } catch {
        // スキップ
      }
    }

    if (timelines.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No timelines found.",
          },
        ],
        isError: false,
      };
    }

    if (format === "json") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(timelines, null, 2),
          },
        ],
        isError: false,
      };
    }

    // テキスト形式で一覧表示
    const text = formatTimelineList(timelines);
    return {
      content: [
        {
          type: "text" as const,
          text,
        },
      ],
      isError: false,
    };
  },
};

/**
 * ファイル内容からTimelineオブジェクトを解析する
 */
function parseTimelineFromFile(content: string): Timeline | null {
  try {
    const match = content.match(
      /export\s+const\s+\w+\s*:\s*Timeline\s*=\s*(\{[\s\S]*?\});?\s*$/,
    );
    if (!match) {
      return null;
    }

    return JSON.parse(match[1]) as Timeline;
  } catch {
    return null;
  }
}

/**
 * タイムライン一覧をテキスト形式でフォーマット
 */
function formatTimelineList(timelines: Timeline[]): string {
  const lines: string[] = ["# Timelines", ""];

  for (const timeline of timelines) {
    lines.push(`## ${timeline.name} (${timeline.id})`);
    lines.push(`- Scope: ${timeline.scope}`);
    lines.push(`- Summary: ${timeline.summary}`);
    lines.push(`- Events: ${timeline.events.length}`);
    if (timeline.parentTimeline) {
      lines.push(`- Parent: ${timeline.parentTimeline}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * タイムライン詳細をテキスト形式でフォーマット
 */
function formatTimelineDetail(timeline: Timeline): string {
  const lines: string[] = [
    `# ${timeline.name}`,
    "",
    `**ID:** ${timeline.id}`,
    `**Scope:** ${timeline.scope}`,
    `**Summary:** ${timeline.summary}`,
  ];

  if (timeline.parentTimeline) {
    lines.push(`**Parent Timeline:** ${timeline.parentTimeline}`);
  }

  if (timeline.relatedCharacter) {
    lines.push(`**Related Character:** ${timeline.relatedCharacter}`);
  }

  lines.push("");
  lines.push("## Events");
  lines.push("");

  if (timeline.events.length === 0) {
    lines.push("No events.");
  } else {
    for (const event of timeline.events) {
      lines.push(`### ${event.time.order}. ${event.title}`);
      lines.push(`- **ID:** ${event.id}`);
      lines.push(`- **Category:** ${event.category}`);
      lines.push(`- **Summary:** ${event.summary}`);

      if (event.characters.length > 0) {
        lines.push(`- **Characters:** ${event.characters.join(", ")}`);
      }

      if (event.settings.length > 0) {
        lines.push(`- **Settings:** ${event.settings.join(", ")}`);
      }

      if (event.chapters.length > 0) {
        lines.push(`- **Chapters:** ${event.chapters.join(", ")}`);
      }

      if (event.causedBy && event.causedBy.length > 0) {
        lines.push(`- **Caused By:** ${event.causedBy.join(", ")}`);
      }

      if (event.causes && event.causes.length > 0) {
        lines.push(`- **Causes:** ${event.causes.join(", ")}`);
      }

      lines.push("");
    }
  }

  return lines.join("\n");
}
