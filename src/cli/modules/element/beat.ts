/**
 * Element Beat Command (stub)
 *
 * storyteller element beat コマンドの実装
 * Process 51-80で完全実装予定。現状はMCPツールからの委譲先として最小スタブを提供。
 */

import { err } from "@storyteller/shared/result.ts";
import type {
  CommandContext,
  CommandExecutionError,
} from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";

/**
 * storyteller element beat コマンド
 *
 * PlotBeat要素を作成する
 */
export class ElementBeatCommand extends BaseCliCommand {
  override readonly name = "beat" as const;
  override readonly path = ["element", "beat"] as const;

  constructor() {
    super([]);
  }

  protected async handle(_context: CommandContext) {
    // Why: 最小スタブ。CLIコマンドの完全実装はProcess 53で行う。
    return err({
      code: "not_implemented",
      message: "ElementBeatCommand is not yet implemented (Process 53)",
    });
  }
}
