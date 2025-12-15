/**
 * MCP コマンドグループ
 * `storyteller mcp` コマンドとそのサブコマンドを管理
 */
import { ok } from "../../../shared/result.ts";
import { BaseCliCommand } from "../../base_command.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";
import { renderHelp } from "../../help/renderer.ts";
import type { CommandRegistry } from "../../command_registry.ts";
import type { CommandContext, CommandDescriptor } from "../../types.ts";
import { mcpStartCommandDescriptor } from "./start.ts";
import { mcpInitCommandDescriptor } from "./init.ts";

/**
 * McpCommand クラス
 * MCPコマンドグループのルートハンドラー
 */
class McpCommand extends BaseCliCommand {
  override readonly name = "mcp" as const;

  constructor(private readonly registry: CommandRegistry) {
    super([]);
  }

  protected handle(context: CommandContext) {
    const snapshot = this.registry.snapshot();
    const result = renderHelp(snapshot, ["mcp"]);
    if (result.kind === "error") {
      context.presenter.showError(result.message);
      context.presenter.showInfo(result.fallback);
      return Promise.resolve(ok(undefined));
    }

    context.presenter.showInfo(result.content);
    return Promise.resolve(ok(undefined));
  }
}

/**
 * MCPコマンドグループのDescriptorを作成
 * @param registry コマンドレジストリ
 * @returns コマンドディスクリプタ
 */
export function createMcpDescriptor(
  registry: CommandRegistry,
): CommandDescriptor {
  const handler = new McpCommand(registry);
  return createLegacyCommandDescriptor(handler, {
    summary:
      "MCP (Model Context Protocol) server for Claude Desktop/Code integration.",
    usage: "storyteller mcp <subcommand> [options]",
    children: [
      mcpInitCommandDescriptor,
      mcpStartCommandDescriptor,
    ],
    examples: [
      {
        summary: "Initialize MCP configuration for Claude Code",
        command: "storyteller mcp init",
      },
      {
        summary: "Start the MCP server with stdio transport",
        command: "storyteller mcp start --stdio",
      },
      {
        summary: "Start MCP server with custom project path",
        command: "storyteller mcp start --stdio --path /path/to/project",
      },
    ],
  });
}
