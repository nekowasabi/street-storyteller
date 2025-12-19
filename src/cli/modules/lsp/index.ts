/**
 * LSP コマンドグループ
 * `storyteller lsp` コマンドとそのサブコマンドを管理
 */
import { ok } from "@storyteller/shared/result.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import { renderHelp } from "@storyteller/cli/help/renderer.ts";
import type { CommandRegistry } from "@storyteller/cli/command_registry.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "@storyteller/cli/types.ts";
import { lspStartCommandDescriptor } from "@storyteller/cli/modules/lsp/start.ts";
import { lspInstallCommandDescriptor } from "@storyteller/cli/modules/lsp/install.ts";
import { lspValidateCommandDescriptor } from "@storyteller/cli/modules/lsp/validate.ts";

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
      lspValidateCommandDescriptor,
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
