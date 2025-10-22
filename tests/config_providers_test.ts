import { assert, assertEquals } from "./asserts.ts";
import { join } from "@std/path/join";
import { ensureDir } from "@std/fs/ensure-dir";
import { parseAppConfig } from "../src/shared/config/schema.ts";
import type { AppConfig } from "../src/shared/config/schema.ts";
import {
  DefaultConfigurationProvider,
  EnvConfigurationProvider,
  FileConfigurationProvider,
  CliConfigurationProvider,
} from "../src/infrastructure/config/providers.ts";
import { ConfigurationManager } from "../src/application/config/configuration_manager.ts";

function normalize(config: AppConfig) {
  return {
    logging: config.logging,
    runtime: config.runtime,
    features: config.features,
  };
}

Deno.test("DefaultConfigurationProvider supplies baseline values", async () => {
  const provider = new DefaultConfigurationProvider();
  const layer = await provider.load();

  assertEquals(layer.meta.id, "default");
  const config = parseAppConfig(layer.value);
  assertEquals(config.logging.level, "info");
  assertEquals(config.runtime.environment, "development");
});

Deno.test("EnvConfigurationProvider maps storyteller-prefixed variables", async () => {
  const provider = new EnvConfigurationProvider({
    env: {
      STORYTELLER_LOG_LEVEL: "debug",
      STORYTELLER_LOG_FORMAT: "json",
      STORYTELLER_ENVIRONMENT: "test",
    },
  });
  const layer = await provider.load();

  const config = parseAppConfig(layer.value);
  assertEquals(config.logging.level, "debug");
  assertEquals(config.logging.format, "json");
  assertEquals(config.runtime.environment, "test");
});

Deno.test("FileConfigurationProvider loads JSON configuration", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "config-file-provider-" });
  const configPath = join(tempDir, "storyteller.config.json");
  await ensureDir(tempDir);
  await Deno.writeTextFile(
    configPath,
    JSON.stringify({
      logging: { level: "warn", format: "human" },
      runtime: { environment: "production" },
    }),
  );

  const provider = new FileConfigurationProvider({
    searchPaths: [configPath],
  });
  const layer = await provider.load();
  assert(layer.value.logging?.level === "warn");
  assert(layer.value.runtime?.environment === "production");
});

Deno.test("CliConfigurationProvider maps CLI flags to config overrides", async () => {
  const provider = new CliConfigurationProvider({
    logLevel: "error",
    logFormat: "json",
    environment: "production",
    cacheTtl: 120,
  });

  const layer = await provider.load();
  assertEquals(layer.value.logging?.level, "error");
  assertEquals(layer.value.logging?.format, "json");
  assertEquals(layer.value.runtime?.environment, "production");
  assertEquals(layer.value.cache?.defaultTtlSeconds, 120);
});

Deno.test("ConfigurationManager merges providers in priority order", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "config-manager-" });
  const configPath = join(tempDir, "storyteller.config.json");
  await ensureDir(tempDir);
  await Deno.writeTextFile(
    configPath,
    JSON.stringify({
      logging: { level: "info", format: "human" },
      cache: { defaultTtlSeconds: 300 },
    }),
  );

  const providers = [
    new DefaultConfigurationProvider(),
    new EnvConfigurationProvider({
      env: {
        STORYTELLER_LOG_LEVEL: "debug",
        STORYTELLER_CACHE_TTL: "180",
      },
    }),
    new FileConfigurationProvider({ searchPaths: [configPath] }),
    new CliConfigurationProvider({
      logLevel: "error",
      cacheTtl: 60,
      provider: "mock",
    }),
  ];

  const manager = new ConfigurationManager(providers);
  const config = await manager.resolve();
  const normalized = normalize(config);

  assertEquals(normalized.logging.level, "error");
  assertEquals(normalized.logging.format, "human");
  assertEquals(normalized.runtime.environment, "development");
  assertEquals(config.cache?.defaultTtlSeconds, 60);
  assertEquals(config.external?.defaultProvider, "mock");
});
