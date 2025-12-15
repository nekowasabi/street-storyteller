/**
 * timeline_analyzeツール定義
 * タイムラインの整合性を分析するMCPツール
 */

import type { McpToolDefinition, ToolExecutionContext } from "../tool_registry.ts";
import type { Timeline, TimelineEvent } from "../../../type/v2/timeline.ts";

interface AnalysisIssue {
  type: "warning" | "error";
  eventId?: string;
  message: string;
}

interface TimelineStats {
  eventCount: number;
  categoryBreakdown: Record<string, number>;
  characterMentions: Record<string, number>;
  settingMentions: Record<string, number>;
  chapterMentions: Record<string, number>;
  causalLinks: number;
}

interface TimelineAnalysis {
  timelineId: string;
  timelineName: string;
  stats: TimelineStats;
  issues: AnalysisIssue[];
}

export const timelineAnalyzeTool: McpToolDefinition = {
  name: "timeline_analyze",
  description:
    "タイムラインの整合性を分析します。因果関係の整合性チェック、イベント順序の検証、統計情報の提供を行います。",
  inputSchema: {
    type: "object",
    properties: {
      timelineId: {
        type: "string",
        description: "分析するタイムラインのID（省略時は全タイムラインを分析）",
      },
    },
    required: [],
  },
  execute: async (args: Record<string, unknown>, context?: ToolExecutionContext) => {
    const timelineId = args.timelineId as string | undefined;
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

    if (!timelinesExist) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No timelines found to analyze.",
          },
        ],
        isError: false,
      };
    }

    // タイムラインを収集
    const timelines: Timeline[] = [];

    if (timelineId) {
      // 特定のタイムラインを分析
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

      const content = await Deno.readTextFile(timelineFilePath);
      const timeline = parseTimelineFromFile(content);

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

      timelines.push(timeline);
    } else {
      // 全タイムラインを分析
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
    }

    if (timelines.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No timelines found to analyze.",
          },
        ],
        isError: false,
      };
    }

    // 分析を実行
    const analyses: TimelineAnalysis[] = timelines.map((tl) => analyzeTimeline(tl, timelines));

    // 結果をフォーマット
    const text = formatAnalysisResults(analyses);

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
 * タイムラインを分析する
 */
function analyzeTimeline(timeline: Timeline, allTimelines: Timeline[]): TimelineAnalysis {
  const issues: AnalysisIssue[] = [];
  const stats: TimelineStats = {
    eventCount: timeline.events.length,
    categoryBreakdown: {},
    characterMentions: {},
    settingMentions: {},
    chapterMentions: {},
    causalLinks: 0,
  };

  // 全タイムラインのイベントIDマップを作成
  const allEventIds = new Set<string>();
  for (const tl of allTimelines) {
    for (const event of tl.events) {
      allEventIds.add(event.id);
    }
  }

  // イベントIDマップを作成（現在のタイムライン内）
  const eventMap = new Map<string, TimelineEvent>();
  for (const event of timeline.events) {
    eventMap.set(event.id, event);
  }

  // 各イベントを分析
  for (const event of timeline.events) {
    // カテゴリ統計
    stats.categoryBreakdown[event.category] = (stats.categoryBreakdown[event.category] || 0) + 1;

    // キャラクター統計
    for (const char of event.characters) {
      stats.characterMentions[char] = (stats.characterMentions[char] || 0) + 1;
    }

    // 設定統計
    for (const setting of event.settings) {
      stats.settingMentions[setting] = (stats.settingMentions[setting] || 0) + 1;
    }

    // チャプター統計
    for (const chapter of event.chapters) {
      stats.chapterMentions[chapter] = (stats.chapterMentions[chapter] || 0) + 1;
    }

    // 因果関係チェック
    if (event.causedBy) {
      stats.causalLinks += event.causedBy.length;

      for (const causeId of event.causedBy) {
        // 存在しないイベントへの参照
        if (!allEventIds.has(causeId)) {
          issues.push({
            type: "warning",
            eventId: event.id,
            message: `Event '${event.id}' references nonexistent cause event '${causeId}'`,
          });
        } else {
          // 順序チェック（同じタイムライン内のみ）
          const causeEvent = eventMap.get(causeId);
          if (causeEvent && causeEvent.time.order >= event.time.order) {
            issues.push({
              type: "warning",
              eventId: event.id,
              message: `Event '${event.id}' (order ${event.time.order}) is caused by '${causeId}' (order ${causeEvent.time.order}) which comes after or at the same position`,
            });
          }
        }
      }
    }

    if (event.causes) {
      stats.causalLinks += event.causes.length;

      for (const effectId of event.causes) {
        // 存在しないイベントへの参照
        if (!allEventIds.has(effectId)) {
          issues.push({
            type: "warning",
            eventId: event.id,
            message: `Event '${event.id}' references nonexistent effect event '${effectId}'`,
          });
        } else {
          // 順序チェック（同じタイムライン内のみ）
          const effectEvent = eventMap.get(effectId);
          if (effectEvent && effectEvent.time.order <= event.time.order) {
            issues.push({
              type: "warning",
              eventId: event.id,
              message: `Event '${event.id}' (order ${event.time.order}) causes '${effectId}' (order ${effectEvent.time.order}) which comes before or at the same position`,
            });
          }
        }
      }
    }
  }

  return {
    timelineId: timeline.id,
    timelineName: timeline.name,
    stats,
    issues,
  };
}

/**
 * 分析結果をテキスト形式でフォーマット
 */
function formatAnalysisResults(analyses: TimelineAnalysis[]): string {
  const lines: string[] = ["# Timeline Analysis Results", ""];

  for (const analysis of analyses) {
    lines.push(`## ${analysis.timelineName} (${analysis.timelineId})`);
    lines.push("");

    // 統計情報
    lines.push("### Statistics");
    lines.push(`- Total Events: ${analysis.stats.eventCount}`);
    lines.push(`- Causal Links: ${analysis.stats.causalLinks}`);

    if (Object.keys(analysis.stats.categoryBreakdown).length > 0) {
      lines.push("- Category Breakdown:");
      for (const [category, count] of Object.entries(analysis.stats.categoryBreakdown)) {
        lines.push(`  - ${category}: ${count}`);
      }
    }

    if (Object.keys(analysis.stats.characterMentions).length > 0) {
      lines.push("- Character Mentions:");
      for (const [character, count] of Object.entries(analysis.stats.characterMentions)) {
        lines.push(`  - ${character}: ${count}`);
      }
    }

    lines.push("");

    // 問題点
    lines.push("### Issues");
    if (analysis.issues.length === 0) {
      lines.push("No issues found.");
    } else {
      for (const issue of analysis.issues) {
        const icon = issue.type === "error" ? "[ERROR]" : "[Warning]";
        lines.push(`- ${icon} ${issue.message}`);
      }
    }

    lines.push("");
  }

  return lines.join("\n");
}
