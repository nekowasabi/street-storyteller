/**
 * View Timeline Command
 *
 * storyteller view timelines / storyteller view timeline {id} コマンドの実装
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type { Timeline } from "@storyteller/types/v2/timeline.ts";

/**
 * ViewTimelineCommandクラス
 * タイムラインの表示コマンド
 */
export class ViewTimelineCommand extends BaseCliCommand {
  override readonly name = "view_timeline" as const;
  override readonly path = ["view", "timeline"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // プロジェクトルートを取得
    const config = await context.config.resolve();
    const projectRoot = (args.projectRoot as string) ||
      config.runtime.projectRoot || Deno.cwd();

    const timelinesDir = `${projectRoot}/src/timelines`;
    const format = args.format as string | undefined;
    const jsonOutput = args.json === true;

    // タイムラインを読み込む
    const timelines = await this.loadTimelines(timelinesDir);

    // 一覧表示モード
    if (args.list === true) {
      if (timelines.length === 0) {
        context.presenter.showInfo("No timelines found.");
        return ok(jsonOutput ? { timelines: [] } : undefined);
      }

      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(timelines, null, 2));
        return ok({ timelines });
      }

      const output = this.formatTimelineList(timelines);
      context.presenter.showInfo(output);
      return ok({ timelines });
    }

    // 特定タイムライン表示モード
    const timelineId = args.id as string | undefined;
    if (timelineId) {
      const timeline = timelines.find((t) => t.id === timelineId);
      if (!timeline) {
        return err({
          code: "timeline_not_found",
          message: `Timeline not found: ${timelineId}`,
        });
      }

      // Mermaid形式
      if (format === "mermaid") {
        const mermaid = this.generateMermaid(timeline);
        context.presenter.showInfo(mermaid);
        return ok({ timeline, mermaid });
      }

      // JSON形式
      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(timeline, null, 2));
        return ok({ timeline });
      }

      // テキスト形式
      const output = this.formatTimelineDetail(timeline);
      context.presenter.showInfo(output);
      return ok({ timeline });
    }

    // ヘルプ表示
    context.presenter.showInfo(this.renderHelp());
    return ok(undefined);
  }

  /**
   * タイムラインをロードする
   */
  private async loadTimelines(timelinesDir: string): Promise<Timeline[]> {
    const timelines: Timeline[] = [];

    try {
      for await (const entry of Deno.readDir(timelinesDir)) {
        if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

        const filePath = `${timelinesDir}/${entry.name}`;
        try {
          const content = await Deno.readTextFile(filePath);
          const timeline = this.parseTimelineFromFile(content);
          if (timeline) {
            timelines.push(timeline);
          }
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合
    }

    return timelines;
  }

  /**
   * ファイル内容からTimelineオブジェクトを解析する
   */
  private parseTimelineFromFile(content: string): Timeline | null {
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
   * タイムライン一覧をフォーマット
   */
  private formatTimelineList(timelines: Timeline[]): string {
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
   * タイムライン詳細をフォーマット
   */
  private formatTimelineDetail(timeline: Timeline): string {
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

  /**
   * Mermaid図を生成
   */
  private generateMermaid(timeline: Timeline): string {
    const lines: string[] = [
      "```mermaid",
      "flowchart TD",
      `  subgraph ${timeline.id}["${timeline.name}"]`,
    ];

    // イベントノードを追加
    for (const event of timeline.events) {
      const label = `${event.time.order}. ${event.title}`;
      lines.push(`    ${event.id}["${label}"]`);
    }

    // 因果関係のエッジを追加
    for (const event of timeline.events) {
      if (event.causedBy) {
        for (const causeId of event.causedBy) {
          lines.push(`    ${causeId} --> ${event.id}`);
        }
      }
    }

    lines.push("  end");
    lines.push("```");

    return lines.join("\n");
  }

  /**
   * ヘルプを生成
   */
  private renderHelp(): string {
    const lines: string[] = [];
    lines.push("view timeline - Display timeline information");
    lines.push("");
    lines.push("Usage:");
    lines.push(
      "  storyteller view timeline --list          # List all timelines",
    );
    lines.push(
      "  storyteller view timeline --id <id>       # Show timeline details",
    );
    lines.push(
      "  storyteller view timeline --id <id> --json         # JSON output",
    );
    lines.push(
      "  storyteller view timeline --id <id> --format mermaid  # Mermaid diagram",
    );
    lines.push("");
    lines.push("Options:");
    lines.push("  --list             List all timelines");
    lines.push("  --id <id>          Timeline ID to display");
    lines.push("  --json             Output in JSON format");
    lines.push("  --format <format>  Output format (text, mermaid)");
    return lines.join("\n");
  }
}
