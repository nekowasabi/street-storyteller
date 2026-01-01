import { ok } from "@storyteller/shared/result.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import { renderHelp } from "@storyteller/cli/help/renderer.ts";
import type { CommandRegistry } from "@storyteller/cli/command_registry.ts";
import type {
  CommandContext,
  CommandDescriptor,
} from "@storyteller/cli/types.ts";
import { metaCheckCommandDescriptor } from "@storyteller/cli/modules/meta/check.ts";
import { metaGenerateCommandDescriptor } from "@storyteller/cli/modules/meta/generate.ts";
import { metaWatchCommandDescriptor } from "@storyteller/cli/modules/meta/watch.ts";
import { metaSyncCommandDescriptor } from "@storyteller/cli/modules/meta/sync.ts";

class MetaCommand extends BaseCliCommand {
  override readonly name = "meta" as const;

  constructor(private readonly registry: CommandRegistry) {
    super([]);
  }

  protected handle(context: CommandContext) {
    const snapshot = this.registry.snapshot();
    const result = renderHelp(snapshot, ["meta"]);
    if (result.kind === "error") {
      context.presenter.showError(result.message);
      context.presenter.showInfo(result.fallback);
      return Promise.resolve(ok(undefined));
    }

    context.presenter.showInfo(result.content);
    return Promise.resolve(ok(undefined));
  }
}

export function createMetaDescriptor(
  registry: CommandRegistry,
): CommandDescriptor {
  const handler = new MetaCommand(registry);
  return createLegacyCommandDescriptor(handler, {
    summary: "Generate and manage chapter metadata (.meta.ts).",
    usage: "storyteller meta <subcommand> [options]",
    children: [
      metaGenerateCommandDescriptor,
      metaWatchCommandDescriptor,
      metaCheckCommandDescriptor,
      metaSyncCommandDescriptor,
    ],
    examples: [
      {
        summary: "Generate chapter metadata from a Markdown manuscript",
        command: "storyteller meta generate manuscripts/chapter01.md",
      },
    ],
  });
}
