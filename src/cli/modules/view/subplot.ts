/**
 * View Subplot Command
 *
 * storyteller view subplot コマンドの実装
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type {
  PlotType,
  Subplot,
  SubplotStatus,
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
    const statusFilter = args.status as SubplotStatus | undefined;
    const format = args.format as string | undefined;
    const jsonOutput = args.json === true;

    // サブプロットを読み込む
    let subplots = await this.loadSubplots(subplotsDir);

    // タイプフィルタ
    if (typeFilter) {
      subplots = subplots.filter((s) => s.type === typeFilter);
    }

    // ステータスフィルタ
    if (statusFilter) {
      subplots = subplots.filter((s) => s.status === statusFilter);
    }

    // 一覧表示モード
    if (args.list === true) {
      if (subplots.length === 0) {
        context.presenter.showInfo("No subplots found.");
        return ok(jsonOutput ? { subplots: [] } : { subplots: [] });
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
      // フィルタ済みリストからでなく全リストから検索
      const allSubplots = await this.loadSubplots(subplotsDir);
      const subplot = allSubplots.find((s) => s.id === subplotId);
      if (!subplot) {
        return err({
          code: "subplot_not_found",
          message: `Subplot not found: ${subplotId}`,
        });
      }

      // Mermaid形式
      if (format === "mermaid") {
        const mermaid = this.generateMermaid(subplot);
        context.presenter.showInfo(mermaid);
        return ok({ subplot, mermaid });
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
  private async loadSubplots(subplotsDir: string): Promise<Subplot[]> {
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
    lines.push(`- Main: ${stats.main}`);
    lines.push(`- Subplot: ${stats.subplot}`);
    lines.push(`- Parallel: ${stats.parallel}`);
    lines.push(`- Background: ${stats.background}`);
    lines.push("");

    // 一覧
    for (const subplot of subplots) {
      lines.push(`## ${subplot.name} (${subplot.id})`);
      lines.push(`- Type: ${subplot.type}`);
      if (subplot.status) {
        lines.push(`- Status: ${subplot.status}`);
      }
      lines.push(`- Summary: ${subplot.summary}`);
      lines.push(`- Beats: ${subplot.beats.length}`);
      if (subplot.importance) {
        lines.push(`- Importance: ${subplot.importance}`);
      }
      const focusNames = subplot.focusCharacters.map((fc) => fc.characterId);
      if (focusNames.length > 0) {
        lines.push(`- Focus Characters: ${focusNames.join(", ")}`);
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
    ];

    if (subplot.status) {
      lines.push(`**Status:** ${subplot.status}`);
    }

    lines.push(`**Summary:** ${subplot.summary}`);

    if (subplot.importance) {
      lines.push(`**Importance:** ${subplot.importance}`);
    }

    if (subplot.parentPlotId) {
      lines.push(`**Parent Plot:** ${subplot.parentPlotId}`);
    }

    if (subplot.themes && subplot.themes.length > 0) {
      lines.push(`**Themes:** ${subplot.themes.join(", ")}`);
    }

    // フォーカスキャラクター
    lines.push("");
    lines.push("## Focus Characters");
    for (const fc of subplot.focusCharacters) {
      lines.push(`- **${fc.characterId}**: ${fc.weight}`);
    }

    // ビート一覧
    lines.push("");
    lines.push("## Beats");
    lines.push("");

    if (subplot.beats.length === 0) {
      lines.push("No beats defined.");
    } else {
      for (const beat of subplot.beats) {
        lines.push(`### ${beat.title}`);
        lines.push(`- **ID:** ${beat.id}`);
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
            `- **Precondition Beats:** ${beat.preconditionBeatIds.join(", ")}`,
          );
        }
        lines.push("");
      }
    }

    if (subplot.displayNames && subplot.displayNames.length > 0) {
      lines.push("");
      lines.push(`**Display Names:** ${subplot.displayNames.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 統計情報を計算
   */
  private calculateStats(subplots: Subplot[]) {
    const stats = {
      total: subplots.length,
      main: 0,
      subplot: 0,
      parallel: 0,
      background: 0,
    };

    for (const s of subplots) {
      switch (s.type) {
        case "main":
          stats.main++;
          break;
        case "subplot":
          stats.subplot++;
          break;
        case "parallel":
          stats.parallel++;
          break;
        case "background":
          stats.background++;
          break;
      }
    }

    return stats;
  }

  /**
   * Mermaid図を生成
   */
  private generateMermaid(subplot: Subplot): string {
    const lines: string[] = [
      "```mermaid",
      "flowchart TD",
      `  subgraph ${subplot.id}["${subplot.name}"]`,
    ];

    // ビートノードを追加
    for (const beat of subplot.beats) {
      lines.push(`    ${beat.id}["${beat.title}"]`);
    }

    // 因果関係のエッジを追加
    for (const beat of subplot.beats) {
      if (beat.preconditionBeatIds) {
        for (const preconditionId of beat.preconditionBeatIds) {
          lines.push(`    ${preconditionId} --> ${beat.id}`);
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
      "  storyteller view subplot --list --status active  # Filter by status",
    );
    lines.push(
      "  storyteller view subplot --id <id>               # Show subplot details",
    );
    lines.push(
      "  storyteller view subplot --id <id> --format mermaid  # Mermaid diagram",
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
      "  --status <status>  Filter by status (planned, active, completed)",
    );
    lines.push("  --format <format>  Output format (text, mermaid)");
    lines.push("  --json             Output in JSON format");
    return lines.join("\n");
  }
}
