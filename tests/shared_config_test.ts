import { assert, assertEquals } from "./asserts.ts";
import {
  AppConfigSchema,
  parseAppConfig,
} from "../src/shared/config/schema.ts";
import {
  type ConfigurationLayer,
  mergeConfigurationLayers,
} from "../src/shared/config/provider.ts";

Deno.test("AppConfigSchema provides defaults and validates inputs", () => {
  const config = parseAppConfig({});
  assertEquals(config.logging.level, "info");
  assertEquals(config.logging.format, "human");
  assertEquals(config.runtime.environment, "development");

  let didThrow = false;
  try {
    AppConfigSchema.parse({
      logging: { level: "verbose" },
      runtime: { environment: "development" },
      features: {},
    });
  } catch {
    didThrow = true;
  }
  assert(didThrow, "Expected invalid log level to be rejected");
});

Deno.test("mergeConfigurationLayers applies shallow override precedence", () => {
  const layers: ConfigurationLayer[] = [
    {
      meta: { id: "default", priority: 0, description: "defaults" },
      value: {
        logging: { level: "info", format: "human" },
        runtime: { environment: "development" },
        features: {},
      },
    },
    {
      meta: { id: "env", priority: 1, description: "env" },
      value: {
        logging: { level: "debug" },
        runtime: { projectRoot: "/tmp/project" },
      },
    },
    {
      meta: { id: "cli", priority: 2, description: "cli flags" },
      value: {
        logging: { level: "error" },
      },
    },
  ];

  const merged = mergeConfigurationLayers(layers);
  const parsed = AppConfigSchema.parse(merged);

  assertEquals(parsed.logging.level, "error");
  assertEquals(parsed.logging.format, "human");
  assertEquals(parsed.runtime.environment, "development");
  assertEquals(parsed.runtime.projectRoot, "/tmp/project");
});
