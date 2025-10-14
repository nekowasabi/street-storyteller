import { createConsolePresenter } from "./cli/output_presenter.ts";
import { createCommandRegistry } from "./cli/command_registry.ts";
import { registerCoreModules } from "./cli/modules/index.ts";
import type { CommandContext, OutputPresenter } from "./cli/types.ts";
import { parseCliArgs } from "./cli/arg_parser.ts";

const aliasMap = new Map<string, string>([
  ["g", "generate"],
  ["h", "help"],
]);

export async function runCLI(): Promise<void> {
  const presenter = createConsolePresenter();
  const args = parseCliArgs(Deno.args);

  const registry = createCommandRegistry();
  registerCoreModules(registry);

  const validation = registry.validate();
  if (!validation.ok) {
    for (const issue of validation.error) {
      presenter.showError(issue.message);
    }
    Deno.exit(1);
  }

  const rawCommand = (args._[0] as string | undefined) ?? "help";
  const commandName = aliasMap.get(rawCommand) ?? rawCommand;
  const handler = registry.resolve(commandName);

  if (!handler) {
    presenter.showError(`Unknown command: ${rawCommand}`);
    await registry.resolve("help")?.execute(createContext(presenter, args));
    Deno.exit(1);
  }

  const context = createContext(presenter, args, commandName);
  const result = await handler.execute(context);
  if (!result.ok) {
    presenter.showError(result.error.message);
    Deno.exit(1);
  }
}

function createContext(
  presenter: OutputPresenter,
  args: Record<string, unknown>,
  commandName?: string,
): CommandContext {
  return {
    presenter,
    args: normalizeArgs(args, commandName),
  };
}

function normalizeArgs(
  args: Record<string, unknown>,
  commandName?: string,
): Record<string, unknown> {
  const positionals = Array.isArray(args._) ? args._ : [];
  const rest: Record<string, unknown> = { ...args };
  delete rest._;
  if (commandName !== undefined) {
    rest.command = commandName;
  }
  if (positionals.length > 1) {
    rest.extra = positionals.slice(1);
  }
  return rest;
}
