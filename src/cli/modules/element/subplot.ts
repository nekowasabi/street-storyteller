/**
 * Element Subplot Command (stub)
 *
 * storyteller element subplot コマンドの実装
 * Process 51-80で完全実装予定。現状はMCPツールからの委譲先として最小スタブを提供。
 */

import { err, ok } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";

/**
 * storyteller element subplot コマンド
 *
 * Subplot要素を作成する
 */
export class ElementSubplotCommand extends BaseCliCommand {
  override readonly name = "subplot" as const;
  override readonly path = ["element", "subplot"] as const;

  constructor() {
    super([]);
  }

  protected async handle(_context: CommandContext) {
    // Why: 最小スタブ。CLIコマンドの完全実装はProcess 51で行う。
    return err({
      code: "not_implemented",
      message: "ElementSubplotCommand is not yet implemented (Process 51)",
    });
  }
}
