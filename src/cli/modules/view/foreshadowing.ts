/**
 * View Foreshadowing Command
 *
 * storyteller view foreshadowing / storyteller view foreshadowing --id {id} コマンドの実装
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type {
  Foreshadowing,
  ForeshadowingStatus,
} from "@storyteller/types/v2/foreshadowing.ts";

/**
 * ViewForeshadowingCommandクラス
 * 伏線の表示コマンド
 */
export class ViewForeshadowingCommand extends BaseCliCommand {
  override readonly name = "view_foreshadowing" as const;
  override readonly path = ["view", "foreshadowing"] as const;

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

    const foreshadowingsDir = `${projectRoot}/src/foreshadowings`;
    const statusFilter = args.status as ForeshadowingStatus | undefined;
    const jsonOutput = args.json === true;

    // 伏線を読み込む
    let foreshadowings = await this.loadForeshadowings(foreshadowingsDir);

    // ステータスフィルタ
    if (statusFilter) {
      foreshadowings = foreshadowings.filter((f) => f.status === statusFilter);
    }

    // 一覧表示モード
    if (args.list === true) {
      if (foreshadowings.length === 0) {
        context.presenter.showInfo("No foreshadowings found.");
        return ok(jsonOutput ? { foreshadowings: [] } : { foreshadowings: [] });
      }

      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(foreshadowings, null, 2));
        return ok({ foreshadowings });
      }

      const output = this.formatForeshadowingList(foreshadowings);
      context.presenter.showInfo(output);
      return ok({ foreshadowings });
    }

    // 特定伏線表示モード
    const foreshadowingId = args.id as string | undefined;
    if (foreshadowingId) {
      const foreshadowing = foreshadowings.find((f) =>
        f.id === foreshadowingId
      );
      if (!foreshadowing) {
        return err({
          code: "foreshadowing_not_found",
          message: `Foreshadowing not found: ${foreshadowingId}`,
        });
      }

      // JSON形式
      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(foreshadowing, null, 2));
        return ok({ foreshadowing });
      }

      // テキスト形式
      const output = this.formatForeshadowingDetail(foreshadowing);
      context.presenter.showInfo(output);
      return ok({ foreshadowing });
    }

    // ヘルプ表示
    context.presenter.showInfo(this.renderHelp());
    return ok(undefined);
  }

  /**
   * 伏線をロードする
   */
  private async loadForeshadowings(
    foreshadowingsDir: string,
  ): Promise<Foreshadowing[]> {
    const foreshadowings: Foreshadowing[] = [];

    try {
      for await (const entry of Deno.readDir(foreshadowingsDir)) {
        if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

        const filePath = `${foreshadowingsDir}/${entry.name}`;
        try {
          const content = await Deno.readTextFile(filePath);
          const foreshadowing = this.parseForeshadowingFromFile(content);
          if (foreshadowing) {
            foreshadowings.push(foreshadowing);
          }
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合
    }

    return foreshadowings;
  }

  /**
   * ファイル内容からForeshadowingオブジェクトを解析する
   */
  private parseForeshadowingFromFile(content: string): Foreshadowing | null {
    try {
      // 日本語変数名にも対応するため、[^\s:]+ を使用
      const match = content.match(
        /export\s+const\s+[^\s:]+\s*:\s*Foreshadowing\s*=\s*(\{[\s\S]*?\});?\s*$/,
      );
      if (!match) {
        return null;
      }

      return JSON.parse(match[1]) as Foreshadowing;
    } catch {
      return null;
    }
  }

  /**
   * 伏線一覧をフォーマット
   */
  private formatForeshadowingList(foreshadowings: Foreshadowing[]): string {
    const lines: string[] = ["# Foreshadowings", ""];

    // 統計情報
    const stats = this.calculateStats(foreshadowings);
    lines.push(`## Statistics`);
    lines.push(`- Total: ${stats.total}`);
    lines.push(`- Planted: ${stats.planted}`);
    lines.push(`- Partially Resolved: ${stats.partiallyResolved}`);
    lines.push(`- Resolved: ${stats.resolved}`);
    lines.push(`- Abandoned: ${stats.abandoned}`);
    lines.push(`- Resolution Rate: ${stats.resolutionRate.toFixed(1)}%`);
    lines.push("");

    // 一覧
    for (const foreshadowing of foreshadowings) {
      lines.push(`## ${foreshadowing.name} (${foreshadowing.id})`);
      lines.push(`- Type: ${foreshadowing.type}`);
      lines.push(`- Status: ${foreshadowing.status}`);
      lines.push(`- Summary: ${foreshadowing.summary}`);
      lines.push(`- Planted in: ${foreshadowing.planting.chapter}`);
      if (foreshadowing.importance) {
        lines.push(`- Importance: ${foreshadowing.importance}`);
      }
      if (foreshadowing.resolutions && foreshadowing.resolutions.length > 0) {
        const latestResolution =
          foreshadowing.resolutions[foreshadowing.resolutions.length - 1];
        lines.push(
          `- Latest Resolution: ${latestResolution.chapter} (${
            (latestResolution.completeness * 100).toFixed(0)
          }%)`,
        );
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * 伏線詳細をフォーマット
   */
  private formatForeshadowingDetail(foreshadowing: Foreshadowing): string {
    const lines: string[] = [
      `# ${foreshadowing.name}`,
      "",
      `**ID:** ${foreshadowing.id}`,
      `**Type:** ${foreshadowing.type}`,
      `**Status:** ${foreshadowing.status}`,
      `**Summary:** ${foreshadowing.summary}`,
    ];

    if (foreshadowing.importance) {
      lines.push(`**Importance:** ${foreshadowing.importance}`);
    }

    lines.push("");
    lines.push("## Planting");
    lines.push(`- **Chapter:** ${foreshadowing.planting.chapter}`);
    lines.push(`- **Description:** ${foreshadowing.planting.description}`);
    if (foreshadowing.planting.excerpt) {
      const excerpt = typeof foreshadowing.planting.excerpt === "string"
        ? foreshadowing.planting.excerpt
        : `(file: ${foreshadowing.planting.excerpt.file})`;
      lines.push(`- **Excerpt:** ${excerpt}`);
    }
    if (foreshadowing.planting.eventId) {
      lines.push(`- **Event ID:** ${foreshadowing.planting.eventId}`);
    }

    if (foreshadowing.resolutions && foreshadowing.resolutions.length > 0) {
      lines.push("");
      lines.push("## Resolutions");
      for (let i = 0; i < foreshadowing.resolutions.length; i++) {
        const resolution = foreshadowing.resolutions[i];
        lines.push(`### Resolution ${i + 1}`);
        lines.push(`- **Chapter:** ${resolution.chapter}`);
        lines.push(`- **Description:** ${resolution.description}`);
        lines.push(
          `- **Completeness:** ${(resolution.completeness * 100).toFixed(0)}%`,
        );
        if (resolution.excerpt) {
          const excerpt = typeof resolution.excerpt === "string"
            ? resolution.excerpt
            : `(file: ${resolution.excerpt.file})`;
          lines.push(`- **Excerpt:** ${excerpt}`);
        }
        if (resolution.eventId) {
          lines.push(`- **Event ID:** ${resolution.eventId}`);
        }
      }
    }

    if (foreshadowing.plannedResolutionChapter) {
      lines.push("");
      lines.push(
        `**Planned Resolution Chapter:** ${foreshadowing.plannedResolutionChapter}`,
      );
    }

    if (foreshadowing.relations) {
      lines.push("");
      lines.push("## Relations");
      if (foreshadowing.relations.characters.length > 0) {
        lines.push(
          `- **Characters:** ${foreshadowing.relations.characters.join(", ")}`,
        );
      }
      if (foreshadowing.relations.settings.length > 0) {
        lines.push(
          `- **Settings:** ${foreshadowing.relations.settings.join(", ")}`,
        );
      }
      if (
        foreshadowing.relations.relatedForeshadowings &&
        foreshadowing.relations.relatedForeshadowings.length > 0
      ) {
        lines.push(
          `- **Related Foreshadowings:** ${
            foreshadowing.relations.relatedForeshadowings.join(", ")
          }`,
        );
      }
    }

    if (foreshadowing.displayNames && foreshadowing.displayNames.length > 0) {
      lines.push("");
      lines.push(`**Display Names:** ${foreshadowing.displayNames.join(", ")}`);
    }

    return lines.join("\n");
  }

  /**
   * 統計情報を計算
   */
  private calculateStats(foreshadowings: Foreshadowing[]) {
    const stats = {
      total: foreshadowings.length,
      planted: 0,
      partiallyResolved: 0,
      resolved: 0,
      abandoned: 0,
      resolutionRate: 0,
    };

    for (const f of foreshadowings) {
      switch (f.status) {
        case "planted":
          stats.planted++;
          break;
        case "partially_resolved":
          stats.partiallyResolved++;
          break;
        case "resolved":
          stats.resolved++;
          break;
        case "abandoned":
          stats.abandoned++;
          break;
      }
    }

    if (stats.total > 0) {
      stats.resolutionRate =
        ((stats.resolved + stats.partiallyResolved * 0.5) / stats.total) * 100;
    }

    return stats;
  }

  /**
   * ヘルプを生成
   */
  private renderHelp(): string {
    const lines: string[] = [];
    lines.push("view foreshadowing - Display foreshadowing information");
    lines.push("");
    lines.push("Usage:");
    lines.push(
      "  storyteller view foreshadowing --list                  # List all foreshadowings",
    );
    lines.push(
      "  storyteller view foreshadowing --list --status planted # Filter by status",
    );
    lines.push(
      "  storyteller view foreshadowing --id <id>               # Show foreshadowing details",
    );
    lines.push(
      "  storyteller view foreshadowing --list --json           # JSON output",
    );
    lines.push("");
    lines.push("Options:");
    lines.push("  --list             List all foreshadowings");
    lines.push("  --id <id>          Foreshadowing ID to display");
    lines.push(
      "  --status <status>  Filter by status (planted, partially_resolved, resolved, abandoned)",
    );
    lines.push("  --json             Output in JSON format");
    return lines.join("\n");
  }
}
