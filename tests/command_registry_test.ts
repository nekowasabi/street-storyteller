import { assertEquals, assertFalse } from "./asserts.ts";
import { createCommandRegistry } from "@storyteller/cli/command_registry.ts";
import { registerCoreModules } from "@storyteller/cli/modules/index.ts";
import {
  type CommandContext,
  type CommandHandler,
} from "@storyteller/cli/types.ts";
import type { AppConfig } from "@storyteller/shared/config/schema.ts";
import type { ConfigurationManagerRef } from "@storyteller/cli/types.ts";

function createStubLogger() {
  return {
    scope: "test",
    log() {},
    trace() {},
    debug() {},
    info() {},
    warn() {},
    error() {},
    fatal() {},
    withContext() {
      return this;
    },
  };
}

function createStubConfig(): ConfigurationManagerRef {
  const config: AppConfig = {
    runtime: { environment: "test", paths: {} },
    logging: {
      level: "info",
      format: "human",
      color: false,
      timestamps: false,
    },
    features: {},
    cache: { defaultTtlSeconds: 900 },
    external: { providers: [] },
  };
  return {
    async resolve() {
      return config;
    },
  };
}

const noopContext: CommandContext = {
  presenter: {
    showInfo() {},
    showSuccess() {},
    showWarning() {},
    showError() {},
  },
  config: createStubConfig(),
  logger: createStubLogger(),
  args: {},
};

function makeHandler(
  path: readonly string[],
  options: {
    dependencies?: readonly string[];
    aliases?: readonly string[];
  } = {},
): CommandHandler {
  const [name] = [...path].slice(-1);
  return {
    name,
    path,
    dependencies: options.dependencies,
    aliases: options.aliases,
    async execute(_context: CommandContext) {
      return { ok: true as const, value: undefined };
    },
  };
}

Deno.test("CommandRegistry resolves registered handler by path tokens", async () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler(["generate"]));

  const handler = registry.resolve(["generate"]);
  assertFalse(handler === undefined);
  const result = await handler!.execute(noopContext);
  assertEquals(result.ok, true);
});

Deno.test("CommandRegistry resolves nested handler and aliases", async () => {
  const registry = createCommandRegistry();
  registry.register(
    makeHandler(["element", "character"], { aliases: ["char"] }),
  );

  const handler = registry.resolve(["element", "char"]);
  assertFalse(handler === undefined);
  const result = await handler!.execute(noopContext);
  assertEquals(result.ok, true);
});

Deno.test("CommandRegistry validate returns ok when handlers unique and dependencies satisfied", () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler(["generate"]));
  registry.register(makeHandler(["help"], { dependencies: ["generate"] }));

  const result = registry.validate();
  assertEquals(result.ok, true);
});

Deno.test("CommandRegistry validate fails on duplicate command names", () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler(["generate"]));
  registry.register(makeHandler(["generate"]));

  const result = registry.validate();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error[0].code, "duplicate_command");
  }
});

Deno.test("CommandRegistry validate fails when dependency missing", () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler(["help"], { dependencies: ["tools convert"] }));

  const result = registry.validate();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error[0].code, "missing_dependency");
  }
});

Deno.test("registerCoreModules wires core commands with aliases", () => {
  const registry = createCommandRegistry();
  registerCoreModules(registry);

  const generate = registry.resolve(["generate"]);
  const generateAlias = registry.resolve(["g"]);
  const help = registry.resolve(["help"]);
  const helpAlias = registry.resolve(["h"]);

  assertFalse(generate === undefined);
  assertFalse(generateAlias === undefined);
  assertFalse(help === undefined);
  assertFalse(helpAlias === undefined);
});
