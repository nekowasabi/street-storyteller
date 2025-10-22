import { createConsolePresenter } from "./cli/output_presenter.ts";
import { createCommandRegistry } from "./cli/command_registry.ts";
import { registerCoreModules } from "./cli/modules/index.ts";
import type {
  CliDependencies,
  CommandContext,
  ConfigurationManagerRef,
  OutputPresenter,
} from "./cli/types.ts";
import { parseCliArgs, type ParsedArguments } from "./cli/arg_parser.ts";
import { ConfigurationManager } from "./application/config/configuration_manager.ts";
import { LoggingService } from "./application/logging/logging_service.ts";
import {
  DefaultConfigurationProvider,
  EnvConfigurationProvider,
  FileConfigurationProvider,
  CliConfigurationProvider,
  type CliConfigurationProviderOptions,
} from "./infrastructure/config/providers.ts";
import type { Logger } from "./shared/logging/types.ts";
import { join } from "@std/path/join";

const aliasMap = new Map<string, string>([
  ["g", "generate"],
  ["h", "help"],
]);

export async function runCLI(deps: CliDependencies = {}): Promise<void> {
  const rawArgs = parseCliArgs(Deno.args);
  const presenter = deps.presenter ?? createConsolePresenter();

  const configurationManager = deps.createConfigurationManager?.() ??
    createDefaultConfigurationManager(rawArgs);

  const loggingService = deps.loggingServiceFactory?.({ configurationManager }) ??
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

  const rawCommand = (rawArgs._[0] as string | undefined) ?? "help";
  const commandName = aliasMap.get(rawCommand) ?? rawCommand;
  const handler = registry.resolve(commandName);

  if (!handler) {
    presenter.showError(`Unknown command: ${rawCommand}`);
    rootLogger.error("Unknown command", { command: rawCommand });
    await registry.resolve("help")?.execute(
      createContext(
        presenter,
        configurationManager,
        rawArgs,
        "help",
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
  logger: Logger,
): CommandContext {
  return {
    presenter,
    config,
    logger,
    args: normalizeArgs(args, commandName),
  };
}

function normalizeArgs(
  args: ParsedArguments,
  commandName: string,
): Record<string, unknown> {
  const positionals = Array.isArray(args._) ? [...args._] : [];
  const rest: Record<string, unknown> = { ...args };
  delete rest._;
  rest.command = commandName;
  if (positionals.length > 1) {
    rest.extra = positionals.slice(1);
  }
  return rest;
}

function createDefaultConfigurationManager(args: ParsedArguments): ConfigurationManager {
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

function extractCliOverrides(args: ParsedArguments): CliConfigurationProviderOptions {
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
