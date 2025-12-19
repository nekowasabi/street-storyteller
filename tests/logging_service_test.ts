import { assertEquals } from "./asserts.ts";
import type { AppConfig } from "@storyteller/shared/config/schema.ts";
import { LoggingService } from "@storyteller/application/logging/logging_service.ts";
import { MemoryLoggerFactory } from "@storyteller/infrastructure/logging/memory_logger.ts";

class StubConfigurationManager {
  constructor(private readonly config: AppConfig) {}

  async resolve(): Promise<AppConfig> {
    return this.config;
  }
}

Deno.test("LoggingService initializes LogManager using configuration", async () => {
  const config: AppConfig = {
    runtime: {
      environment: "test",
      paths: {},
    },
    logging: {
      level: "warn",
      format: "human",
      color: false,
      timestamps: false,
    },
    features: {},
    cache: {
      defaultTtlSeconds: 900,
    },
    external: { providers: [] },
  };

  const configManager = new StubConfigurationManager(config);
  const memoryFactory = new MemoryLoggerFactory();
  const service = new LoggingService({
    configurationManager: configManager,
    factoryResolver: () => memoryFactory,
  });

  await service.initialize();
  const logger = service.getLogger("cli.generate");
  logger.info("ignored");
  logger.error("visible");

  const events = memoryFactory.events;
  assertEquals(events.length, 1);
  assertEquals(events[0].level, "error");
  assertEquals(events[0].scope, "cli.generate");
});
