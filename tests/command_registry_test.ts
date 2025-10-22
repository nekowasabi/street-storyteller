import { assertEquals, assertFalse } from "./asserts.ts";
import { createCommandRegistry } from "../src/cli/command_registry.ts";
import { CommandHandler, CommandContext } from "../src/cli/types.ts";
import type { AppConfig } from "../src/shared/config/schema.ts";
import type { ConfigurationManagerRef } from "../src/cli/types.ts";

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
}; 

function makeHandler(name: string, dependencies: string[] = []): CommandHandler {
  return {
    name,
    dependencies,
    async execute(_context: CommandContext) {
      return { ok: true as const, value: undefined };
    },
  };
}

Deno.test("CommandRegistry resolves registered handler", async () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler("generate"));

  const handler = registry.resolve("generate");
  assertFalse(handler === undefined);
  const result = await handler!.execute(noopContext);
  assertEquals(result.ok, true);
});

Deno.test("CommandRegistry validate returns ok when handlers unique and dependencies satisfied", () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler("generate"));
  registry.register(makeHandler("help", ["generate"]));

  const result = registry.validate();
  assertEquals(result.ok, true);
});

Deno.test("CommandRegistry validate fails on duplicate command names", () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler("generate"));
  registry.register(makeHandler("generate"));

  const result = registry.validate();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error[0].code, "duplicate_command");
  }
});

Deno.test("CommandRegistry validate fails when dependency missing", () => {
  const registry = createCommandRegistry();
  registry.register(makeHandler("help", ["generate"]));

  const result = registry.validate();
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error[0].code, "missing_dependency");
  }
});
