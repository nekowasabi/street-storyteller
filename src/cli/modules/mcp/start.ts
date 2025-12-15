/**
 * MCP Start コマンド
 * MCPサーバーをCLIから起動する
 */
import { err, ok } from "../../../shared/result.ts";
import type {
  CommandContext,
  CommandDescriptor,
  CommandOptionDescriptor,
} from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";

/**
 * McpStartCommandクラス
 * `storyteller mcp start --stdio` コマンドを実装
 */
export class McpStartCommand extends BaseCliCommand {
  override readonly name = "start" as const;
  override readonly path = ["mcp", "start"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // ヘルプ表示
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderMcpStartHelp());
      return ok(undefined);
    }

    // --stdio オプションが必須
    if (!args.stdio) {
      return err({
        code: "invalid_arguments",
        message: "MCP server requires --stdio option to specify transport mode",
      });
    }

    // プロジェクトパスの解決
    const projectRoot =
      typeof args.path === "string" && args.path.trim().length > 0
        ? args.path
        : Deno.cwd();

    // dry-runモードの場合はサーバーを起動せずに成功を返す
    if (args["dry-run"] === true) {
      context.presenter.showInfo(
        `[dry-run] MCP server would start with project root: ${projectRoot}`,
      );
      return ok({ projectRoot, mode: "stdio" });
    }

    // MCPサーバーを起動
    try {
      const { McpServer } = await import("../../../mcp/server/server.ts");
      const { McpTransport } = await import(
        "../../../mcp/protocol/transport.ts"
      );
      const { createDefaultToolRegistry } = await import(
        "../../../mcp/server/handlers/tools.ts"
      );
      const { createDefaultPromptRegistry } = await import(
        "../../../mcp/server/handlers/prompts.ts"
      );
      const { ProjectResourceProvider } = await import(
        "../../../mcp/resources/project_resource_provider.ts"
      );

      // ツールレジストリを作成してプロジェクトルートを設定
      const toolRegistry = createDefaultToolRegistry();
      toolRegistry.setProjectRoot(projectRoot);
      const tools = toolRegistry.toMcpTools();
      const resourceProvider = new ProjectResourceProvider(projectRoot);
      const promptRegistry = createDefaultPromptRegistry();

      // stdin/stdoutをトランスポートに変換するアダプタを作成
      const stdinReader = createStdinReader();
      const stdoutWriter = createStdoutWriter();
      const transport = new McpTransport(stdinReader, stdoutWriter);

      // MCPサーバーを作成して起動
      const server = new McpServer(transport, {
        tools,
        toolRegistry,
        resourceProvider,
        promptRegistry,
      });
      await server.start();

      return ok(undefined);
    } catch (error) {
      return err({
        code: "mcp_start_failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * stdin用のReaderアダプタを作成
 */
function createStdinReader(): { read(p: Uint8Array): Promise<number | null> } {
  return {
    read: async (p: Uint8Array): Promise<number | null> => {
      return await Deno.stdin.read(p);
    },
  };
}

/**
 * stdout用のWriterアダプタを作成
 */
function createStdoutWriter(): { write(p: Uint8Array): Promise<number> } {
  return {
    write: async (p: Uint8Array): Promise<number> => {
      return await Deno.stdout.write(p);
    },
  };
}

/**
 * ヘルプを生成
 */
function renderMcpStartHelp(): string {
  const lines: string[] = [];
  lines.push(
    "mcp start - Start the MCP server for Claude Desktop integration.",
  );
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller mcp start --stdio [options]");
  lines.push("");
  lines.push("Options:");
  lines.push(
    "  --stdio       Start MCP server with stdio transport (required)",
  );
  lines.push(
    "  --path <dir>  Project root directory (default: current directory)",
  );
  lines.push("  --dry-run     Validate options without starting server");
  lines.push("  --help, -h    Show this help message");
  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller mcp start --stdio");
  lines.push("  storyteller mcp start --stdio --path /path/to/project");
  lines.push("");
  lines.push("Claude Desktop Configuration:");
  lines.push("  Add the following to claude_desktop_config.json:");
  lines.push("  {");
  lines.push('    "mcpServers": {');
  lines.push('      "storyteller": {');
  lines.push('        "command": "storyteller",');
  lines.push('        "args": ["mcp", "start", "--stdio"]');
  lines.push("      }");
  lines.push("    }");
  lines.push("  }");
  return lines.join("\n");
}

export const mcpStartCommandHandler = new McpStartCommand();

const MCP_START_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--stdio",
    summary: "Start MCP server with stdio transport (required).",
    type: "boolean",
  },
  {
    name: "--path",
    summary: "Project root directory (default: current directory).",
    type: "string",
  },
  {
    name: "--dry-run",
    summary: "Validate options without starting server.",
    type: "boolean",
  },
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
] as const;

export const mcpStartCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    mcpStartCommandHandler,
    {
      summary: "Start the MCP server for Claude Desktop integration.",
      usage: "storyteller mcp start --stdio [options]",
      options: MCP_START_OPTIONS,
      examples: [
        {
          summary: "Start MCP server with stdio",
          command: "storyteller mcp start --stdio",
        },
        {
          summary: "Start MCP server with custom project path",
          command: "storyteller mcp start --stdio --path /path/to/project",
        },
      ],
    },
  );
