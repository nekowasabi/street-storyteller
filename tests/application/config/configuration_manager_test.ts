import { assert, assertEquals } from "../../asserts.ts";
import type { ConfigurationProvider } from "@storyteller/shared/config/provider.ts";
import { ConfigurationManager } from "@storyteller/application/config/configuration_manager.ts";
import { ConfigurationError } from "@storyteller/application/config/configuration_manager.ts";

function providerWithLayer(
  id: string,
  priority: number,
  value: Record<string, unknown>,
  counters?: { loads: number },
): ConfigurationProvider {
  return {
    meta: { id, priority },
    async load() {
      if (counters) counters.loads += 1;
      return { meta: { id, priority }, value: value as any };
    },
  };
}

Deno.test("ConfigurationManager caches resolve() results", async () => {
  const counters = { loads: 0 };
  const providers = [
    providerWithLayer(
      "test",
      1,
      { logging: { level: "debug" } },
      counters,
    ),
  ];
  const manager = new ConfigurationManager(providers);

  const first = await manager.resolve();
  const second = await manager.resolve();

  assertEquals(counters.loads, 1);
  assertEquals(first, second);
});

Deno.test("ConfigurationManager refresh() reloads providers", async () => {
  const counters = { loads: 0 };
  const providers = [
    providerWithLayer(
      "test",
      1,
      { logging: { level: "debug" } },
      counters,
    ),
  ];
  const manager = new ConfigurationManager(providers);

  await manager.resolve();
  await manager.refresh();

  assertEquals(counters.loads, 2);
});

Deno.test("ConfigurationManager wraps provider errors", async () => {
  const failingProvider: ConfigurationProvider = {
    meta: { id: "bad", priority: 1 },
    async load() {
      throw new Error("boom");
    },
  };
  const manager = new ConfigurationManager([failingProvider]);

  let caught: unknown = null;
  try {
    await manager.resolve();
  } catch (error) {
    caught = error;
  }

  assert(caught instanceof ConfigurationError);
  assert(String(caught.message).includes("bad"));
  assert(caught.cause instanceof Error);
});

Deno.test("ConfigurationManager get() supports fallback and dotted paths", async () => {
  const manager = new ConfigurationManager([
    providerWithLayer("test", 1, { logging: { level: "debug" } }),
  ]);

  const level = await manager.get<string>("logging.level");
  assertEquals(level, "debug");

  const missing = await manager.get<string>("does.not.exist", "fallback");
  assertEquals(missing, "fallback");

  const nonObjectPath = await manager.get<string>(
    "logging.level.extra",
    "fallback",
  );
  assertEquals(nonObjectPath, "fallback");
});

Deno.test("ConfigurationManager require() throws when missing", async () => {
  const manager = new ConfigurationManager([
    providerWithLayer("test", 1, {}),
  ]);

  let threw = false;
  try {
    await manager.require("does.not.exist");
  } catch (error) {
    threw = error instanceof ConfigurationError;
  }

  assertEquals(threw, true);
});
