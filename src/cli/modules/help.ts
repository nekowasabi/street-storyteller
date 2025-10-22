import { ok } from "../../shared/result.ts";
import { BaseCliCommand } from "../base_command.ts";
import { createLegacyCommandDescriptor } from "../legacy_adapter.ts";
import { renderHelp } from "../help/renderer.ts";
import type { CommandRegistry } from "../command_registry.ts";
import type { CommandContext, CommandDescriptor } from "../types.ts";

class HelpCommand extends BaseCliCommand {
  readonly name = "help" as const;

  constructor(private readonly registry: CommandRegistry) {
    super([]);
  }

  protected async handle(context: CommandContext) {
    const targetPath = extractTargetPath(context);
    const snapshot = this.registry.snapshot();
    const result = renderHelp(snapshot, targetPath);

    if (result.kind === "error") {
      context.presenter.showError(result.message);
      if (result.suggestions.length > 0) {
        const messages = result.suggestions.length === 1
          ? `Did you mean "${result.suggestions[0]}"?`
          : `Did you mean: ${
            result.suggestions.map((suggestion) => `"${suggestion}"`).join(", ")
          }?`;
        context.presenter.showInfo(messages);
      }
      context.presenter.showInfo(result.fallback);
      return ok(undefined);
    }

    context.presenter.showInfo(result.content);
    return ok(undefined);
  }
}

function extractTargetPath(context: CommandContext): string[] {
  const args = context.args;
  if (!args) {
    return [];
  }
  const extra = args.extra;
  if (Array.isArray(extra)) {
    return extra.map((value) => String(value));
  }
  if (typeof extra === "string" && extra.length > 0) {
    return extra.split(/\s+/);
  }
  return [];
}

export function createHelpDescriptor(registry: CommandRegistry): CommandDescriptor {
  const handler = new HelpCommand(registry);
  return createLegacyCommandDescriptor(handler, {
    summary: "Show help information for storyteller commands.",
    usage: "storyteller help [command]",
    aliases: ["h"],
    examples: [
      {
        summary: "Show the general help overview",
        command: "storyteller help",
      },
      {
        summary: "Show detailed help for the generate command",
        command: "storyteller help generate",
      },
    ],
  });
}
