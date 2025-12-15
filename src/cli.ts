import { createPresenterFromArgs } from "./cli/output_presenter.ts";
import { createCommandRegistry } from "./cli/command_registry.ts";
import { registerCoreModules } from "./cli/modules/index.ts";
import type {
  CliDependencies,
  CommandContext,
  CommandHandler,
  ConfigurationManagerRef,
  OutputPresenter,
} from "./cli/types.ts";
import { parseCliArgs, type ParsedArguments } from "./cli/arg_parser.ts";
import { ConfigurationManager } from "./application/config/configuration_manager.ts";
import { LoggingService } from "./application/logging/logging_service.ts";
import {
  CliConfigurationProvider,
  type CliConfigurationProviderOptions,
  DefaultConfigurationProvider,
  EnvConfigurationProvider,
  FileConfigurationProvider,
} from "./infrastructure/config/providers.ts";
import type { Logger } from "./shared/logging/types.ts";
import { join } from "@std/path/join";

const aliasMap = new Map<string, string>([
  ["g", "generate"],
  ["h", "help"],
]);

export async function runCLI(deps: CliDependencies = {}): Promise<void> {
  const rawArgs = parseCliArgs(Deno.args);
  const presenter = deps.presenter ??
    createPresenterFromArgs({ json: rawArgs.json });

  const configurationManager = deps.createConfigurationManager?.() ??
    createDefaultConfigurationManager(rawArgs);

  const loggingService =
    deps.loggingServiceFactory?.({ configurationManager }) ??
      new LoggingService({ configurationManager });

  await loggingService.initialize();
  const rootLogger = loggingService.getLogger("cli");

  const registry = createCommandRegistry();
  registerCoreModules(registry);

  const validation = registry.validate();
  if (!validation.ok) {
    for (const issue of validation.error) {
      presenter.showError(issue.message);
      rootLogger.error("Command registry validation failed", { issue });
    }
    Deno.exit(1);
  }

  const positionals = Array.isArray(rawArgs._) ? rawArgs._ : [];
  const resolution = resolveCommand(registry, positionals, aliasMap);
  const handler = resolution?.handler;
  const commandName = resolution?.commandName ?? "help";
  const consumedArgs = resolution?.consumedArgs ?? 0;

  if (!handler) {
    const unknown = positionals.length > 0 ? positionals.join(" ") : "(none)";
    presenter.showError(`Unknown command: ${unknown}`);
    rootLogger.error("Unknown command", { command: unknown });
    await registry.resolve("help")?.execute(
      createContext(
        presenter,
        configurationManager,
        rawArgs,
        "help",
        0,
        rootLogger.withContext({ command: "help" }),
      ),
    );
    Deno.exit(1);
  }

  const commandLogger = rootLogger.withContext({ command: commandName });
  const context = createContext(
    presenter,
    configurationManager,
    rawArgs,
    commandName,
    consumedArgs,
    commandLogger,
  );

  rootLogger.debug("Executing command", { command: commandName });
  const result = await handler.execute(context);
  if (!result.ok) {
    presenter.showError(result.error.message);
    commandLogger.error("Command failed", { error: result.error });
    Deno.exit(1);
  }
}

function createContext(
  presenter: OutputPresenter,
  config: ConfigurationManagerRef,
  args: ParsedArguments,
  commandName: string,
  consumedArgs: number,
  logger: Logger,
): CommandContext {
  return {
    presenter,
    config,
    logger,
    args: normalizeArgs(args, commandName, consumedArgs),
  };
}

function normalizeArgs(
  args: ParsedArguments,
  commandName: string,
  consumedArgs: number,
): Record<string, unknown> {
  const positionals = Array.isArray(args._) ? [...args._] : [];
  const rest: Record<string, unknown> = { ...args };
  delete rest._;
  rest.command = commandName;
  if (positionals.length > consumedArgs) {
    rest.extra = positionals.slice(consumedArgs);
  }
  return rest;
}

function resolveCommand(
  registry: ReturnType<typeof createCommandRegistry>,
  positionals: readonly string[],
  aliases: Map<string, string>,
):
  | { handler: CommandHandler; commandName: string; consumedArgs: number }
  | undefined {
  if (positionals.length === 0) {
    const handler = registry.resolve("help");
    return handler
      ? { handler, commandName: "help", consumedArgs: 0 }
      : undefined;
  }

  const first = positionals[0];
  const alias = typeof first === "string" ? aliases.get(first) : undefined;
  const aliasSegments = alias ? alias.trim().split(/\s+/).filter(Boolean) : [];
  const effective = aliasSegments.length > 0
    ? [...aliasSegments, ...positionals.slice(1)]
    : [...positionals];

  for (let length = effective.length; length >= 1; length -= 1) {
    const candidate = effective.slice(0, length);
    const handler = registry.resolve(candidate);
    if (!handler) {
      continue;
    }

    const consumedArgs = aliasSegments.length > 0
      ? length <= aliasSegments.length ? 1 : 1 + (length - aliasSegments.length)
      : length;

    return {
      handler,
      commandName: candidate.join(" "),
      consumedArgs,
    };
  }

  return undefined;
}

function createDefaultConfigurationManager(
  args: ParsedArguments,
): ConfigurationManager {
  const searchPaths = collectConfigPaths(args);
  const providers = [
    new DefaultConfigurationProvider(),
    new EnvConfigurationProvider(),
    new FileConfigurationProvider({ searchPaths }),
    new CliConfigurationProvider(extractCliOverrides(args)),
  ];
  return new ConfigurationManager(providers);
}

function collectConfigPaths(args: ParsedArguments): readonly string[] {
  const paths = new Set<string>();
  const cwd = Deno.cwd();
  if (typeof args.config === "string") {
    paths.add(args.config);
  }
  paths.add(join(cwd, ".storyteller", "config.json"));
  paths.add(join(cwd, "storyteller.config.json"));
  return Array.from(paths);
}

function extractCliOverrides(
  args: ParsedArguments,
): CliConfigurationProviderOptions {
  let overrides: CliConfigurationProviderOptions = {};

  if (typeof args["log-level"] === "string") {
    overrides = { ...overrides, logLevel: args["log-level"] };
  }
  if (typeof args["log-format"] === "string") {
    overrides = { ...overrides, logFormat: args["log-format"] };
  }
  if (typeof args.environment === "string") {
    overrides = { ...overrides, environment: args.environment };
  }
  const cacheTtl = args["cache-ttl"];
  if (typeof cacheTtl === "string") {
    const parsed = Number(cacheTtl);
    if (!Number.isNaN(parsed)) {
      overrides = { ...overrides, cacheTtl: parsed };
    }
  } else if (typeof cacheTtl === "number") {
    overrides = { ...overrides, cacheTtl };
  }
  if (typeof args.provider === "string") {
    overrides = { ...overrides, provider: args.provider };
  }

  return overrides;
}
