/**
 * LSP Install コマンド
 * エディタ用のLSP設定ファイルを生成する
 */
import { err, ok } from "../../../shared/result.ts";
import type { CommandContext, CommandDescriptor, CommandOptionDescriptor } from "../../types.ts";
import { BaseCliCommand } from "../../base_command.ts";
import { createLegacyCommandDescriptor } from "../../legacy_adapter.ts";

/**
 * 対応エディタ
 */
type SupportedEditor = "nvim" | "vscode";

/**
 * LspInstallCommandクラス
 * `storyteller lsp install <editor>` コマンドを実装
 */
export class LspInstallCommand extends BaseCliCommand {
  override readonly name = "install" as const;
  override readonly path = ["lsp", "install"] as const;

  constructor() {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};

    // ヘルプ表示
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderLspInstallHelp());
      return ok(undefined);
    }

    // エディタ名を取得
    const editor = extractEditor(args.extra);
    if (!editor) {
      return err({
        code: "invalid_arguments",
        message: "Editor name is required (e.g., storyteller lsp install nvim)",
      });
    }

    // 対応エディタか確認
    if (!isSupportedEditor(editor)) {
      return err({
        code: "invalid_arguments",
        message: `Unsupported editor: ${editor}. Supported editors: nvim, vscode`,
      });
    }

    // 設定テンプレートを生成
    const config = generateEditorConfig(editor);

    // dry-runモードの場合は出力せずに表示
    if (args["dry-run"] === true) {
      context.presenter.showInfo(`[dry-run] Generated ${editor} configuration:\n\n${config}`);
      return ok({ editor, config });
    }

    // 出力先が指定されている場合はファイルに書き込み
    const outputPath = typeof args.output === "string" && args.output.trim().length > 0
      ? args.output
      : null;

    if (outputPath) {
      await Deno.writeTextFile(outputPath, config);
      context.presenter.showSuccess?.(`Configuration written to: ${outputPath}`);
      return ok({ editor, outputPath });
    }

    // 出力先が指定されていない場合は標準出力に表示
    context.presenter.showInfo(config);
    return ok({ editor, config });
  }
}

/**
 * 引数からエディタ名を抽出
 */
function extractEditor(extra: unknown): string | null {
  if (Array.isArray(extra) && extra.length > 0) {
    return String(extra[0]).trim();
  }
  if (typeof extra === "string" && extra.trim().length > 0) {
    return extra.trim();
  }
  return null;
}

/**
 * 対応エディタかどうか確認
 */
function isSupportedEditor(editor: string): editor is SupportedEditor {
  return editor === "nvim" || editor === "vscode";
}

/**
 * エディタ用の設定を生成
 */
function generateEditorConfig(editor: SupportedEditor): string {
  switch (editor) {
    case "nvim":
      return generateNvimConfig();
    case "vscode":
      return generateVscodeConfig();
  }
}

/**
 * Neovim用のLua設定を生成
 */
function generateNvimConfig(): string {
  return `-- storyteller LSP configuration for nvim-lspconfig
-- Add this to your Neovim configuration (e.g., ~/.config/nvim/lua/storyteller.lua)

local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

-- Register storyteller as a custom LSP server
if not configs.storyteller then
  configs.storyteller = {
    default_config = {
      cmd = { 'storyteller', 'lsp', 'start', '--stdio' },
      filetypes = { 'markdown' },
      root_dir = lspconfig.util.root_pattern('storyteller.json', 'deno.json', '.git'),
      settings = {},
    },
  }
end

-- Setup the LSP server
lspconfig.storyteller.setup({
  on_attach = function(client, bufnr)
    -- Enable completion triggered by <c-x><c-o>
    vim.bo[bufnr].omnifunc = 'v:lua.vim.lsp.omnifunc'

    -- Buffer local mappings
    local opts = { buffer = bufnr }
    vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
    vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
    vim.keymap.set('n', '<leader>rn', vim.lsp.buf.rename, opts)
  end,
})
`;
}

/**
 * VSCode用の設定を生成
 */
function generateVscodeConfig(): string {
  return `{
  // storyteller LSP configuration for VSCode
  // Add this to your .vscode/settings.json

  "languageServerStoryteller.enable": true,
  "languageServerStoryteller.path": "storyteller",
  "languageServerStoryteller.args": ["lsp", "start", "--stdio"],

  // Note: You may need a VSCode extension to load custom LSP servers.
  // Consider using the "LSP" extension or creating a custom extension.
}
`;
}

/**
 * ヘルプを生成
 */
function renderLspInstallHelp(): string {
  const lines: string[] = [];
  lines.push("lsp install — Generate editor configuration for the storyteller LSP server.");
  lines.push("");
  lines.push("Usage:");
  lines.push("  storyteller lsp install <editor> [options]");
  lines.push("");
  lines.push("Supported editors:");
  lines.push("  nvim       Generate nvim-lspconfig Lua configuration");
  lines.push("  vscode     Generate VSCode settings.json snippet");
  lines.push("");
  lines.push("Options:");
  lines.push("  --output <file>  Write configuration to file instead of stdout");
  lines.push("  --dry-run        Show configuration without writing");
  lines.push("  --help, -h       Show this help message");
  lines.push("");
  lines.push("Examples:");
  lines.push("  storyteller lsp install nvim");
  lines.push("  storyteller lsp install nvim --output ~/.config/nvim/lua/storyteller.lua");
  lines.push("  storyteller lsp install vscode --output .vscode/settings.json");
  return lines.join("\n");
}

export const lspInstallCommandHandler = new LspInstallCommand();

const LSP_INSTALL_OPTIONS: readonly CommandOptionDescriptor[] = [
  {
    name: "--output",
    summary: "Write configuration to file instead of stdout.",
    type: "string",
  },
  {
    name: "--dry-run",
    summary: "Show configuration without writing.",
    type: "boolean",
  },
  {
    name: "--help",
    aliases: ["-h"],
    summary: "Show help for this command.",
    type: "boolean",
  },
] as const;

export const lspInstallCommandDescriptor: CommandDescriptor =
  createLegacyCommandDescriptor(
    lspInstallCommandHandler,
    {
      summary: "Generate editor configuration for the storyteller LSP server.",
      usage: "storyteller lsp install <editor> [options]",
      options: LSP_INSTALL_OPTIONS,
      examples: [
        {
          summary: "Generate Neovim configuration",
          command: "storyteller lsp install nvim",
        },
        {
          summary: "Generate and save Neovim configuration",
          command: "storyteller lsp install nvim --output ~/.config/nvim/lua/storyteller.lua",
        },
        {
          summary: "Generate VSCode configuration",
          command: "storyteller lsp install vscode",
        },
      ],
    },
  );
