/**
 * View Subplot Command
 *
 * storyteller view subplot / storyteller view subplot --id {id} コマンドの実装
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import type {
  PlotBeat,
  PlotIntersection,
  PlotType,
  Subplot,
} from "@storyteller/types/v2/subplot.ts";

/**
 * ViewSubplotCommandクラス
 * サブプロットの表示コマンド
 */
export class ViewSubplotCommand extends BaseCliCommand {
  override readonly name = "view_subplot" as const;
  override readonly path = ["view", "subplot"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // プロジェクトルートを取得
    const config = await context.config.resolve();
    const projectRoot = (args.path as string) ||
      (args.projectRoot as string) ||
      config.runtime.projectRoot || Deno.cwd();

    const subplotsDir = `${projectRoot}/src/subplots`;
    const typeFilter = args.type as PlotType | undefined;
    const statusFilter = args.status as string | undefined;
    const jsonOutput = args.json === true;
    const format = args.format as string | undefined;

    // サブプロットを読み込む
    let subplots = await this.loadSubplots(subplotsDir);

    // タイプフィルタ
    if (typeFilter) {
      subplots = subplots.filter((s) => s.type === typeFilter);
    }

    // ステータスフィルタ
    // Why: ビートのcustomStatusではなく、テーマベースやimportanceベースのフィルタ
    if (statusFilter) {
      subplots = subplots.filter((s) =>
        s.importance === statusFilter ||
        s.beats.some((b) => b.customStatus === statusFilter)
      );
    }

    // --list モード
    if (args.list === true) {
      if (subplots.length === 0) {
        context.presenter.showInfo("No subplots found.");
        return ok(jsonOutput ? { subplots: [] } : { subplots: [] });
      }

      // Mermaid形式
      if (format === "mermaid") {
        const output = this.formatMermaid(subplots);
        if (jsonOutput) {
          context.presenter.showInfo(
            JSON.stringify({ mermaid: output }, null, 2),
          );
          return ok({ subplots, format: "mermaid" });
        }
        context.presenter.showInfo(output);
        return ok({ subplots, format: "mermaid" });
      }

      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(subplots, null, 2));
        return ok({ subplots });
      }

      const output = this.formatSubplotList(subplots);
      context.presenter.showInfo(output);
      return ok({ subplots });
    }

    // 特定サブプロット表示モード
    const subplotId = args.id as string | undefined;
    if (subplotId) {
      const subplot = subplots.find((s) => s.id === subplotId);
      if (!subplot) {
        return err({
          code: "subplot_not_found",
          message: `Subplot not found: ${subplotId}`,
        });
      }

      // Mermaid形式
      if (format === "mermaid") {
        const output = this.formatMermaid([subplot]);
        if (jsonOutput) {
          context.presenter.showInfo(
            JSON.stringify({ subplot, mermaid: output }, null, 2),
          );
          return ok({ subplot, format: "mermaid" });
        }
        context.presenter.showInfo(output);
        return ok({ subplot, format: "mermaid" });
      }

      // JSON形式
      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(subplot, null, 2));
        return ok({ subplot });
      }

      // テキスト形式
      const output = this.formatSubplotDetail(subplot);
      context.presenter.showInfo(output);
      return ok({ subplot });
    }

    // ヘルプ表示
    context.presenter.showInfo(this.renderHelp());
    return ok(undefined);
  }

  /**
   * サブプロットをロードする
   */
  private async loadSubplots(
    subplotsDir: string,
  ): Promise<Subplot[]> {
    const subplots: Subplot[] = [];

    try {
      for await (const entry of Deno.readDir(subplotsDir)) {
        if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

        const filePath = `${subplotsDir}/${entry.name}`;
        try {
          const content = await Deno.readTextFile(filePath);
          const subplot = this.parseSubplotFromFile(content);
          if (subplot) {
            subplots.push(subplot);
          }
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合
    }

    return subplots;
  }

  /**
   * ファイル内容からSubplotオブジェクトを解析する
   */
  private parseSubplotFromFile(content: string): Subplot | null {
    try {
      // 日本語変数名にも対応するため、[^\s:]+ を使用
      const match = content.match(
        /export\s+const\s+[^\s:]+\s*:\s*Subplot\s*=\s*(\{[\s\S]*?\});?\s*$/,
      );
      if (!match) {
        return null;
      }

      return JSON.parse(match[1]) as Subplot;
    } catch {
      return null;
    }
  }

  /**
   * サブプロット一覧をフォーマット
   */
  private formatSubplotList(subplots: Subplot[]): string {
    const lines: string[] = ["# Subplots", ""];

    // 統計情報
    const stats = this.calculateStats(subplots);
    lines.push("## Statistics");
    lines.push(`- Total: ${stats.total}`);
    lines.push(`- Main: ${stats.perType.main ?? 0}`);
    lines.push(`- Subplot: ${stats.perType.subplot ?? 0}`);
    lines.push(`- Parallel: ${stats.perType.parallel ?? 0}`);
    lines.push(`- Background: ${stats.perType.background ?? 0}`);
    lines.push(`- Total Beats: ${stats.totalBeats}`);
    lines.push("");

    // 一覧
    for (const subplot of subplots) {
      lines.push(`## ${subplot.name} (${subplot.id})`);
      lines.push(`- Type: ${subplot.type}`);
      lines.push(`- Summary: ${subplot.summary}`);
      lines.push(`- Beats: ${subplot.beats.length}`);
      if (subplot.importance) {
        lines.push(`- Importance: ${subplot.importance}`);
      }
      if (subplot.focusCharacters.length > 0) {
        const charList = subplot.focusCharacters
          .map((fc) => `${fc.characterId}(${fc.weight})`)
          .join(", ");
        lines.push(`- Focus Characters: ${charList}`);
      }
      if (subplot.themes && subplot.themes.length > 0) {
        lines.push(`- Themes: ${subplot.themes.join(", ")}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * サブプロット詳細をフォーマット
   */
  private formatSubplotDetail(subplot: Subplot): string {
    const lines: string[] = [
      `# ${subplot.name}`,
      "",
      `**ID:** ${subplot.id}`,
      `**Type:** ${subplot.type}`,
      `**Summary:** ${subplot.summary}`,
    ];

    if (subplot.importance) {
      lines.push(`**Importance:** ${subplot.importance}`);
    }

    // フォーカスキャラクター
    if (subplot.focusCharacters.length > 0) {
      lines.push("");
      lines.push("## Focus Characters");
      for (const fc of subplot.focusCharacters) {
        lines.push(`- **${fc.characterId}** (${fc.weight})`);
      }
    }

    // 関連キャラクター
    if (subplot.relatedCharacters && subplot.relatedCharacters.length > 0) {
      lines.push("");
      lines.push(
        `**Related Characters:** ${subplot.relatedCharacters.join(", ")}`,
      );
    }

    // テーマ
    if (subplot.themes && subplot.themes.length > 0) {
      lines.push("");
      lines.push(`**Themes:** ${subplot.themes.join(", ")}`);
    }

    // 親プロット
    if (subplot.parentPlotId) {
      lines.push("");
      lines.push(`**Parent Plot:** ${subplot.parentPlotId}`);
    }

    // 子プロット
    if (subplot.childPlotIds && subplot.childPlotIds.length > 0) {
      lines.push("");
      lines.push(`**Child Plots:** ${subplot.childPlotIds.join(", ")}`);
    }

    // ビート一覧
    if (subplot.beats.length > 0) {
      lines.push("");
      lines.push("## Beats");
      for (const beat of subplot.beats) {
        lines.push(`### ${beat.title} (${beat.id})`);
        lines.push(`- **Chapter:** ${beat.chapter}`);
        lines.push(`- **Summary:** ${beat.summary}`);
        if (beat.structurePosition) {
          lines.push(`- **Structure Position:** ${beat.structurePosition}`);
        }
        if (beat.characters.length > 0) {
          lines.push(`- **Characters:** ${beat.characters.join(", ")}`);
        }
        if (beat.settings.length > 0) {
          lines.push(`- **Settings:** ${beat.settings.join(", ")}`);
        }
        if (beat.preconditionBeatIds && beat.preconditionBeatIds.length > 0) {
          lines.push(
            `- **Preconditions:** ${beat.preconditionBeatIds.join(", ")}`,
          );
        }
        if (beat.timelineEventId) {
          lines.push(`- **Timeline Event:** ${beat.timelineEventId}`);
        }
        if (beat.customStatus) {
          lines.push(`- **Status:** ${beat.customStatus}`);
        }
        lines.push("");
      }
    }

    // 詳細情報
    if (subplot.details) {
      lines.push("## Details");
      if (subplot.details.description) {
        const desc = typeof subplot.details.description === "string"
          ? subplot.details.description
          : `(file: ${subplot.details.description.file})`;
        lines.push(`- **Description:** ${desc}`);
      }
      if (subplot.details.motivation) {
        const mot = typeof subplot.details.motivation === "string"
          ? subplot.details.motivation
          : `(file: ${subplot.details.motivation.file})`;
        lines.push(`- **Motivation:** ${mot}`);
      }
      if (subplot.details.resolution) {
        const res = typeof subplot.details.resolution === "string"
          ? subplot.details.resolution
          : `(file: ${subplot.details.resolution.file})`;
        lines.push(`- **Resolution:** ${res}`);
      }
    }

    // 表示名
    if (subplot.displayNames && subplot.displayNames.length > 0) {
      lines.push("");
      lines.push(`**Display Names:** ${subplot.displayNames.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * Mermaidダイアグラムを生成
   * graph TD with beats as nodes, intersections as dotted edges
   */
  private formatMermaid(subplots: Subplot[]): string {
    const lines: string[] = ["graph TD"];

    if (subplots.length === 0) {
      lines.push('  empty["No subplots found"]');
      return lines.join("\n");
    }

    // 各サブプロットをサブグラフとして描画
    for (const subplot of subplots) {
      // Why: Mermaidのsubgraph構文を使用し、プロット毎にグループ化 -- フラットな表示では関係性が分かりにくいため
      const safeId = this.sanitizeMermaidId(subplot.id);
      lines.push(`  subgraph ${safeId}["${subplot.name} (${subplot.type})"]`);

      // ビートをノードとして描画
      for (const beat of subplot.beats) {
        const beatId = this.sanitizeMermaidId(beat.id);
        const position = beat.structurePosition
          ? ` [${beat.structurePosition}]`
          : "";
        lines.push(`    ${beatId}["${beat.title}${position}"]`);
      }

      // ビート間の因果関係（実線）
      for (const beat of subplot.beats) {
        if (beat.preconditionBeatIds) {
          for (const preconditionId of beat.preconditionBeatIds) {
            const preId = this.sanitizeMermaidId(preconditionId);
            const beatId = this.sanitizeMermaidId(beat.id);
            lines.push(`    ${preId} --> ${beatId}`);
          }
        }
      }

      lines.push("  end");
    }

    // 交差関係（点線）を収集して描画
    // Why: intersectionsは別ファイルに保存される可能性があるが、
    // subplots内のbeats間の関係性から推測可能な交差も表示
    const drawnIntersections = new Set<string>();
    for (const subplot of subplots) {
      for (const beat of subplot.beats) {
        // キャラクターが共通するビート間に点線を引く
        for (const otherSubplot of subplots) {
          if (otherSubplot.id === subplot.id) continue;
          for (const otherBeat of otherSubplot.beats) {
            const sharedChars = beat.characters.filter((c) =>
              otherBeat.characters.includes(c)
            );
            if (sharedChars.length > 0) {
              const key = [beat.id, otherBeat.id].sort().join("-");
              if (!drawnIntersections.has(key)) {
                drawnIntersections.add(key);
                const b1 = this.sanitizeMermaidId(beat.id);
                const b2 = this.sanitizeMermaidId(otherBeat.id);
                lines.push(
                  `  ${b1} -.->|"shared: ${sharedChars.join(",")}"| ${b2}`,
                );
              }
            }
          }
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Mermaid IDに使用できない文字を置換
   */
  private sanitizeMermaidId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, "_");
  }

  /**
   * 統計情報を計算
   */
  private calculateStats(subplots: Subplot[]) {
    const perType: Record<string, number> = {};
    const perImportance: Record<string, number> = {};
    let totalBeats = 0;

    for (const s of subplots) {
      // タイプ別集計
      perType[s.type] = (perType[s.type] ?? 0) + 1;

      // 重要度別集計
      if (s.importance) {
        perImportance[s.importance] = (perImportance[s.importance] ?? 0) + 1;
      }

      totalBeats += s.beats.length;
    }

    return {
      total: subplots.length,
      totalBeats,
      perType,
      perImportance,
    };
  }

  /**
   * ヘルプを生成
   */
  private renderHelp(): string {
    const lines: string[] = [];
    lines.push("view subplot - Display subplot information");
    lines.push("");
    lines.push("Usage:");
    lines.push(
      "  storyteller view subplot --list                  # List all subplots",
    );
    lines.push(
      "  storyteller view subplot --list --type subplot   # Filter by type",
    );
    lines.push(
      "  storyteller view subplot --id <id>               # Show subplot details",
    );
    lines.push(
      "  storyteller view subplot --list --format mermaid # Mermaid diagram",
    );
    lines.push(
      "  storyteller view subplot --list --json           # JSON output",
    );
    lines.push("");
    lines.push("Options:");
    lines.push("  --list             List all subplots");
    lines.push("  --id <id>          Subplot ID to display");
    lines.push(
      "  --type <type>      Filter by type (main, subplot, parallel, background)",
    );
    lines.push(
      "  --status <status>  Filter by importance or beat customStatus",
    );
    lines.push(
      "  --format <format>  Output format (text, mermaid, json)",
    );
    lines.push("  --json             Output in JSON format");
    lines.push("  --path <dir>       Project root directory");
    return lines.join("\n");
  }
}

/**
 * view subplot サブコマンドのハンドラー
 */
export const viewSubplotHandler = new ViewSubplotCommand();

/**
 * view subplot サブコマンドの Descriptor
 */
export const viewSubplotCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(viewSubplotHandler, {
    summary: "Display subplot information.",
    usage:
      "storyteller view subplot [--list | --id <id>] [--type <type>] [--format <format>] [options]",
    path: ["view", "subplot"],
    options: [
      {
        name: "--list",
        summary: "List all subplots",
        type: "boolean",
      },
      {
        name: "--id",
        summary: "Subplot ID to display",
        type: "string",
      },
      {
        name: "--type",
        summary: "Filter by type: main, subplot, parallel, background",
        type: "string",
      },
      {
        name: "--status",
        summary: "Filter by importance or beat customStatus",
        type: "string",
      },
      {
        name: "--format",
        summary: "Output format: text, mermaid, json",
        type: "string",
      },
      {
        name: "--json",
        summary: "Output in JSON format",
        type: "boolean",
      },
      {
        name: "--path",
        summary: "Project root directory (default: current directory)",
        type: "string",
      },
    ],
    examples: [
      {
        summary: "List all subplots",
        command: "storyteller view subplot --list",
      },
      {
        summary: "Show specific subplot",
        command: 'storyteller view subplot --id "prince_story"',
      },
      {
        summary: "List subplots with Mermaid diagram",
        command: "storyteller view subplot --list --format mermaid",
      },
      {
        summary: "Filter by type in JSON",
        command: "storyteller view subplot --list --type subplot --json",
      },
    ],
  });
