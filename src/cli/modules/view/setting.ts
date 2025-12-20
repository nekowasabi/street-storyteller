/**
 * View Setting Command
 *
 * storyteller view setting / storyteller view setting --id {id} コマンドの実装
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import type { Setting, SettingType } from "@storyteller/types/v2/setting.ts";
import {
  FileContentReader,
  type HybridFieldValue,
} from "@storyteller/plugins/features/details/file_content_reader.ts";

/**
 * 設定ローダーインターフェース
 */
export interface SettingLoader {
  loadAllSettings(): Promise<Setting[]>;
  loadSetting(id: string): Promise<Setting | null>;
}

/**
 * デフォルトの設定ローダー
 * src/settings/ ディレクトリから設定を読み込む
 */
export class DefaultSettingLoader implements SettingLoader {
  constructor(private readonly projectRoot: string) {}

  async loadAllSettings(): Promise<Setting[]> {
    const settingsDir = `${this.projectRoot}/src/settings`;
    const settings: Setting[] = [];

    try {
      for await (const entry of Deno.readDir(settingsDir)) {
        if (!entry.isFile || !entry.name.endsWith(".ts")) continue;

        const filePath = `${settingsDir}/${entry.name}`;
        try {
          const content = await Deno.readTextFile(filePath);
          const setting = this.parseSettingFromFile(content);
          if (setting) {
            settings.push(setting);
          }
        } catch {
          // スキップ
        }
      }
    } catch {
      // ディレクトリが存在しない場合
    }

    return settings;
  }

  async loadSetting(id: string): Promise<Setting | null> {
    const settings = await this.loadAllSettings();
    return settings.find((s) => s.id === id) ?? null;
  }

  private parseSettingFromFile(content: string): Setting | null {
    try {
      // 日本語変数名にも対応するため、[^\s:]+ を使用
      const match = content.match(
        /export\s+const\s+[^\s:]+\s*:\s*Setting\s*=\s*(\{[\s\S]*?\});?\s*$/,
      );
      if (!match) {
        return null;
      }

      return JSON.parse(match[1]) as Setting;
    } catch {
      return null;
    }
  }
}

/**
 * view setting コマンドの結果型
 */
export interface ViewSettingResult {
  settings?: Setting[];
  setting?: Setting;
  resolvedDetails?: Record<string, string | undefined>;
}

/**
 * ViewSettingCommandクラス
 * 設定情報の表示コマンド
 */
export class ViewSettingCommand extends BaseCliCommand {
  override readonly name = "view_setting" as const;
  override readonly path = ["view", "setting"] as const;

  private readonly loader?: SettingLoader;

  constructor(loader?: SettingLoader) {
    super([]);
    this.loader = loader;
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // プロジェクトルートを取得
    const config = await context.config.resolve();
    const projectRoot = (args.path as string) ||
      (args.projectRoot as string) ||
      config.runtime.projectRoot || Deno.cwd();

    const loader = this.loader ?? new DefaultSettingLoader(projectRoot);
    const jsonOutput = args.json === true;
    const showDetails = args.details === true;
    const typeFilter = args.type as SettingType | undefined;

    // 一覧表示モード
    if (args.list === true) {
      let settings = await loader.loadAllSettings();

      // タイプフィルタ
      if (typeFilter) {
        settings = settings.filter((s) => s.type === typeFilter);
      }

      if (settings.length === 0) {
        context.presenter.showInfo("No settings found.");
        return ok({ settings: [] });
      }

      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(settings, null, 2));
        return ok({ settings });
      }

      const output = this.formatSettingList(settings);
      context.presenter.showInfo(output);
      return ok({ settings });
    }

    // 特定設定表示モード
    const settingId = args.id as string | undefined;
    if (settingId) {
      const setting = await loader.loadSetting(settingId);
      if (!setting) {
        return err({
          code: "setting_not_found",
          message: `Setting not found: ${settingId}`,
        });
      }

      // --details オプション: ファイル参照を解決
      if (showDetails && setting.details) {
        const fileContentReader = new FileContentReader(projectRoot);
        // ソースファイルパスを構築（設定ファイルの標準的な場所）
        const settingSourcePath = `src/settings/${settingId}.ts`;
        const resolvedDetails = await this.resolveDetails(
          setting,
          fileContentReader,
          settingSourcePath,
        );

        if (jsonOutput) {
          context.presenter.showInfo(
            JSON.stringify({ setting, resolvedDetails }, null, 2),
          );
          return ok({ setting, resolvedDetails });
        }

        const output = this.formatSettingWithDetails(setting, resolvedDetails);
        context.presenter.showInfo(output);
        return ok({ setting, resolvedDetails });
      }

      // JSON形式
      if (jsonOutput) {
        context.presenter.showInfo(JSON.stringify(setting, null, 2));
        return ok({ setting });
      }

      // テキスト形式
      const output = this.formatSettingBasic(setting);
      context.presenter.showInfo(output);
      return ok({ setting });
    }

    // ヘルプ表示
    context.presenter.showInfo(this.renderHelp());
    return ok(undefined);
  }

  /**
   * 詳細情報を解決する
   * @param setting 設定
   * @param reader ファイル内容リーダー
   * @param sourceFilePath ファイル参照の基準となるソースファイルのパス（プロジェクトルートからの相対パス）
   */
  private async resolveDetails(
    setting: Setting,
    reader: FileContentReader,
    sourceFilePath?: string,
  ): Promise<Record<string, string | undefined>> {
    const resolved: Record<string, string | undefined> = {};

    if (!setting.details) {
      return resolved;
    }

    const detailsKeys = [
      "description",
      "geography",
      "history",
      "culture",
      "politics",
      "economy",
      "inhabitants",
      "landmarks",
    ] as const;

    for (const key of detailsKeys) {
      const value = setting.details[key] as HybridFieldValue;
      if (value === undefined) continue;

      const result = await reader.resolveHybridField(value, sourceFilePath);
      if (result.ok) {
        resolved[key] = result.value;
      } else {
        // エラーの場合はファイルパスを表示
        resolved[key] = `(Error: ${result.error.message})`;
      }
    }

    return resolved;
  }

  /**
   * 設定一覧をフォーマット
   */
  private formatSettingList(settings: Setting[]): string {
    const lines: string[] = ["# Settings", ""];

    // タイプ別に統計
    const stats = {
      location: 0,
      world: 0,
      culture: 0,
      organization: 0,
    };

    for (const s of settings) {
      stats[s.type]++;
    }

    lines.push("## Statistics");
    lines.push(`- Total: ${settings.length}`);
    lines.push(`- Location: ${stats.location}`);
    lines.push(`- World: ${stats.world}`);
    lines.push(`- Culture: ${stats.culture}`);
    lines.push(`- Organization: ${stats.organization}`);
    lines.push("");

    // 一覧
    for (const setting of settings) {
      lines.push(`## ${setting.name} (${setting.id})`);
      lines.push(`- Type: ${setting.type}`);
      lines.push(`- Summary: ${setting.summary}`);
      if (setting.appearingChapters.length > 0) {
        lines.push(`- Chapters: ${setting.appearingChapters.join(", ")}`);
      }
      if (setting.displayNames && setting.displayNames.length > 0) {
        lines.push(`- Display Names: ${setting.displayNames.join(", ")}`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * 設定基本情報をフォーマット
   */
  private formatSettingBasic(setting: Setting): string {
    const lines: string[] = [
      `# ${setting.name}`,
      "",
      `**ID:** ${setting.id}`,
      `**Type:** ${setting.type}`,
      `**Summary:** ${setting.summary}`,
    ];

    if (setting.appearingChapters.length > 0) {
      lines.push(`**Chapters:** ${setting.appearingChapters.join(", ")}`);
    }

    if (setting.displayNames && setting.displayNames.length > 0) {
      lines.push(`**Display Names:** ${setting.displayNames.join(", ")}`);
    }

    if (setting.relatedSettings && setting.relatedSettings.length > 0) {
      lines.push(`**Related Settings:** ${setting.relatedSettings.join(", ")}`);
    }

    if (setting.details) {
      lines.push("");
      lines.push("## Details");
      for (const [key, value] of Object.entries(setting.details)) {
        if (value === undefined) continue;
        if (typeof value === "string") {
          lines.push(`- **${key}:** ${value}`);
        } else {
          lines.push(`- **${key}:** (file: ${value.file})`);
        }
      }
    }

    if (setting.detectionHints) {
      lines.push("");
      lines.push("## Detection Hints");
      if (setting.detectionHints.commonPatterns.length > 0) {
        lines.push(
          `- **Common Patterns:** ${
            setting.detectionHints.commonPatterns.join(", ")
          }`,
        );
      }
      if (setting.detectionHints.excludePatterns.length > 0) {
        lines.push(
          `- **Exclude Patterns:** ${
            setting.detectionHints.excludePatterns.join(", ")
          }`,
        );
      }
      lines.push(`- **Confidence:** ${setting.detectionHints.confidence}`);
    }

    return lines.join("\n");
  }

  /**
   * 詳細解決済み設定情報をフォーマット
   */
  private formatSettingWithDetails(
    setting: Setting,
    resolvedDetails: Record<string, string | undefined>,
  ): string {
    const lines: string[] = [
      `# ${setting.name}`,
      "",
      `**ID:** ${setting.id}`,
      `**Type:** ${setting.type}`,
      `**Summary:** ${setting.summary}`,
    ];

    if (setting.appearingChapters.length > 0) {
      lines.push(`**Chapters:** ${setting.appearingChapters.join(", ")}`);
    }

    if (setting.displayNames && setting.displayNames.length > 0) {
      lines.push(`**Display Names:** ${setting.displayNames.join(", ")}`);
    }

    lines.push("");
    lines.push("## Details (Resolved)");

    for (const [key, value] of Object.entries(resolvedDetails)) {
      if (value === undefined) continue;
      lines.push("");
      lines.push(`### ${key.charAt(0).toUpperCase() + key.slice(1)}`);
      lines.push(value);
    }

    return lines.join("\n");
  }

  /**
   * ヘルプを生成
   */
  private renderHelp(): string {
    const lines: string[] = [];
    lines.push("view setting - Display setting information");
    lines.push("");
    lines.push("Usage:");
    lines.push(
      "  storyteller view setting --list                  # List all settings",
    );
    lines.push(
      "  storyteller view setting --list --type location  # Filter by type",
    );
    lines.push(
      "  storyteller view setting --id <id>               # Show setting details",
    );
    lines.push(
      "  storyteller view setting --id <id> --details     # Resolve file references",
    );
    lines.push(
      "  storyteller view setting --list --json           # JSON output",
    );
    lines.push("");
    lines.push("Options:");
    lines.push("  --list             List all settings");
    lines.push("  --id <id>          Setting ID to display");
    lines.push(
      "  --type <type>      Filter by type (location, world, culture, organization)",
    );
    lines.push("  --details          Resolve file references in details");
    lines.push("  --json             Output in JSON format");
    return lines.join("\n");
  }
}

/**
 * view setting コマンドのハンドラー
 */
export const viewSettingHandler = new ViewSettingCommand();

/**
 * view setting コマンドの Descriptor
 */
export const viewSettingCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(viewSettingHandler, {
    summary: "Display setting information.",
    usage:
      "storyteller view setting --list | --id <id> [--details] [--type <type>] [--json]",
    path: ["view", "setting"],
    options: [
      {
        name: "--list",
        summary: "List all settings",
        type: "boolean",
      },
      {
        name: "--id",
        summary: "Setting ID to display",
        type: "string",
      },
      {
        name: "--type",
        summary: "Filter by type (location, world, culture, organization)",
        type: "string",
      },
      {
        name: "--details",
        summary: "Resolve file references in details",
        type: "boolean",
      },
      {
        name: "--json",
        summary: "Output in JSON format",
        type: "boolean",
      },
    ],
    examples: [
      {
        summary: "List all settings",
        command: "storyteller view setting --list",
      },
      {
        summary: "Show specific setting",
        command: 'storyteller view setting --id "royal_capital"',
      },
      {
        summary: "Show setting with resolved details",
        command: 'storyteller view setting --id "royal_capital" --details',
      },
      {
        summary: "List locations only",
        command: "storyteller view setting --list --type location",
      },
    ],
  });
