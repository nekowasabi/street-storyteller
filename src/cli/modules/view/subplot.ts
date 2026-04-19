/**
 * View Subplot Command (stub)
 *
 * storyteller view subplot コマンドの実装
 * Process 51-80で完全実装予定。現状はMCPツールからの委譲先として最小スタブを提供。
 */

import { err } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";

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

  protected async handle(_context: CommandContext) {
    // Why: 最小スタブ。CLIコマンドの完全実装はProcess 55で行う。
    return err({
      code: "not_implemented",
      message: "ViewSubplotCommand is not yet implemented",
    } as CommandExecutionError);
  }
}
