/**
 * MCP Init コマンド
 * .mcp.json を生成してMCPを簡単に使えるようにする
 */
import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
  CommandOptionDescriptor,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import {
  dirname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.224.0/path/mod.ts";

/**
 * .mcp.json のフォーマット
 */
interface McpConfig {
  mcpServers: {
    [name: string]: {
      command: string;
      args: string[];
      cwd?: string;
      env?: Record<string, string>;
    };
  };
}

/**
 * McpInitCommand クラス
 * `storyteller mcp init` コマンドを実装
 */
export class McpInitCommand extends BaseCliCommand {
  override readonly name = "init" as const;
  override readonly path = ["mcp", "init"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // ヘルプ表示
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderMcpInitHelp());
      return ok(undefined);
    }

    // 出力先ディレクトリ（デフォルト: カレントディレクトリ）
    const outputDir =
      typeof args.output === "string" && args.output.trim().length > 0
        ? args.output
        : Deno.cwd();

    // storytellerの実行パスを検出
    const storytellerPath = await this.detectStorytellerPath();

    // 設定を生成
    const config = this.generateConfig(storytellerPath, outputDir, args);

    // 出力ファイルパス
    const outputPath = join(outputDir, ".mcp.json");

    // 既存ファイルのチェック
    if (!args.force) {
      try {
        await Deno.stat(outputPath);
        return err({
          code: "file_exists",
          message:
            `.mcp.json already exists at ${outputPath}. Use --force to overwrite.`,
        });
      } catch {
        // ファイルが存在しない場合は続行
      }
    }

    // dry-runモード
    if (args["dry-run"] === true) {
      context.presenter.showInfo("[dry-run] Would create .mcp.json with:");
      context.presenter.showInfo(JSON.stringify(config, null, 2));
      return ok({ outputPath, config });
    }

    // ファイル書き込み
    try {
      await Deno.writeTextFile(
        outputPath,
        JSON.stringify(config, null, 2) + "\n",
      );
      context.presenter.showInfo(`✅ Created ${outputPath}`);
      context.presenter.showInfo("");
      context.presenter.showInfo("MCP is now configured for this project.");
      context.presenter.showInfo(
        "Claude Code will automatically detect and use this configuration.",
      );
      return ok({ outputPath, config });
    } catch (error) {
      return err({
        code: "write_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * storytellerの実行パスを検出
   */
  private async detectStorytellerPath(): Promise<string> {
    // 1. 環境変数からstorytellerのパスを取得
    const envPath = Deno.env.get("STORYTELLER_PATH");
    if (envPath) {
      return envPath;
    }

    // 2. main.tsの場所を基準に検出
    try {
      const mainModuleUrl = Deno.mainModule;
      if (mainModuleUrl.startsWith("file://")) {
        const mainPath = fromFileUrl(mainModuleUrl);
        const mainDir = dirname(mainPath);

        // storytellerスクリプトがあるか確認
        const storytellerScript = join(mainDir, "storyteller");
        try {
          await Deno.stat(storytellerScript);
          return storytellerScript;
        } catch {
          // storytellerスクリプトが見つからない場合はdenoコマンドを使用
          return `deno run -A ${mainPath}`;
        }
      }
    } catch {
      // 検出失敗
    }

    // 3. デフォルト: storytellerコマンドがPATHにあると仮定
    return "storyteller";
  }

  /**
   * MCP設定を生成
   */
  private generateConfig(
    storytellerPath: string,
    projectRoot: string,
    args: Record<string, unknown>,
  ): McpConfig {
    const env = this.generateEnvConfig(args);
    const hasEnv = Object.keys(env).length > 0;

    // storytellerPathがdenoコマンドの場合
    if (storytellerPath.startsWith("deno run")) {
      const parts = storytellerPath.split(" ");
      const serverConfig: McpConfig["mcpServers"][string] = {
        command: parts[0],
        args: [...parts.slice(1), "mcp", "start", "--stdio"],
        cwd: projectRoot,
      };
      if (hasEnv) {
        serverConfig.env = env;
      }
      return { mcpServers: { storyteller: serverConfig } };
    }

    // storytellerスクリプトの場合
    const serverConfig: McpConfig["mcpServers"][string] = {
      command: storytellerPath,
      args: ["mcp", "start", "--stdio", "--path", projectRoot],
    };
    if (hasEnv) {
      serverConfig.env = env;
    }
    return { mcpServers: { storyteller: serverConfig } };
  }

  /**
   * 環境変数設定を生成
   */
  private generateEnvConfig(
    args: Record<string, unknown>,
  ): Record<string, string> {
    const env: Record<string, string> = {};

    // OpenRouter APIキーの参照を追加（オプション）
    if (args["with-openrouter"] === true) {
      env["OPENROUTER_API_KEY"] = "${OPENROUTER_API_KEY}";
    }

    return env;
  }
}

/**
 * ヘルプを生成
 */
function renderMcpInitHelp(): string {
  const lines: string[] = [];
  lines.push("mcp init - Initialize MCP configuration for Claude Code");
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller mcp init [options]");
  lines.push("");
  lines.push("Options:");
  lines.push(
    "  --output <dir>      Output directory (default: current directory)",
  );
  lines.push("  --force             Overwrite existing .mcp.json");
  lines.push("  --with-openrouter   Include OpenRouter API key reference");
  lines.push("  --dry-run           Preview without creating file");
  lines.push("  --help, -h          Show this help message");
  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller mcp init");
  lines.push("  storyteller mcp init --output /path/to/project");
  lines.push("  storyteller mcp init --with-openrouter");
  lines.push("  storyteller mcp init --dry-run");
  lines.push("");
  lines.push("Description:");
  lines.push(
    "  This command creates a .mcp.json file in your project directory.",
  );
  lines.push(
    "  Claude Code will automatically detect this file and enable MCP",
  );
  lines.push("  integration with storyteller.");
  lines.push("");
  lines.push(
    "  After running this command, you can use storyteller tools directly",
  );
  lines.push("  from Claude Code without any additional configuration.");
  return lines.join("\n");
}

export const mcpInitCommandHandler = new McpInitCommand();

const MCP_INIT_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--output",
    summary: "Output directory for .mcp.json (default: current directory).",
    type: "string",
  },
  {
    name: "--force",
    summary: "Overwrite existing .mcp.json file.",
    type: "boolean",
  },
  {
    name: "--with-openrouter",
    summary: "Include OpenRouter API key environment variable reference.",
    type: "boolean",
  },
  {
    name: "--dry-run",
    summary: "Preview the configuration without creating the file.",
    type: "boolean",
  },
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
] as const;

export const mcpInitCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    mcpInitCommandHandler,
    {
      summary: "Initialize MCP configuration file for Claude Code integration.",
      usage: "storyteller mcp init [options]",
      options: MCP_INIT_OPTIONS,
      examples: [
        {
          summary: "Create .mcp.json in current directory",
          command: "storyteller mcp init",
        },
        {
          summary: "Create .mcp.json with OpenRouter API key",
          command: "storyteller mcp init --with-openrouter",
        },
        {
          summary: "Preview configuration without creating file",
          command: "storyteller mcp init --dry-run",
        },
      ],
    },
  );
