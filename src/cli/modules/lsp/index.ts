/**
 * LSP コマンドグループ
 * `storyteller lsp` コマンドとそのサブコマンドを管理
 */
import { ok } from "../../../shared/result.ts";
import { BaseCliCommand } from "../../base_command.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";
import { renderHelp } from "../../help/renderer.ts";
import type { CommandRegistry } from "../../command_registry.ts";
import type { CommandContext, CommandDescriptor } from "../../types.ts";
import { lspStartCommandDescriptor } from "./start.ts";
import { lspInstallCommandDescriptor } from "./install.ts";

/**
 * LspCommand クラス
 * LSPコマンドグループのルートハンドラー
 */
class LspCommand extends BaseCliCommand {
  override readonly name = "lsp" as const;

  constructor(private readonly registry: CommandRegistry) {
    super([]);
  }

  protected handle(context: CommandContext) {
    const snapshot = this.registry.snapshot();
    const result = renderHelp(snapshot, ["lsp"]);
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
 * LSPコマンドグループのDescriptorを作成
 */
export function createLspDescriptor(
  registry: CommandRegistry,
): CommandDescriptor {
  const handler = new LspCommand(registry);
  return createLegacyCommandDescriptor(handler, {
    summary: "Language Server Protocol (LSP) integration for story validation.",
    usage: "storyteller lsp <subcommand> [options]",
    children: [
      lspStartCommandDescriptor,
      lspInstallCommandDescriptor,
    ],
    examples: [
      {
        summary: "Start the LSP server with stdio transport",
        command: "storyteller lsp start --stdio",
      },
      {
        summary: "Generate Neovim configuration",
        command: "storyteller lsp install nvim",
      },
    ],
  });
}
