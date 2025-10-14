import { assertEquals, assertFalse } from "./asserts.ts";
import { createCommandRegistry } from "../src/cli/command_registry.ts";
import { CommandHandler, CommandContext } from "../src/cli/types.ts";

const noopContext: CommandContext = {
  presenter: {
    showInfo() {},
    showSuccess() {},
    showWarning() {},
    showError() {},
  },
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
