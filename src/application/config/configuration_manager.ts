import type { AppConfig } from "../../shared/config/schema.ts";
import {
  type ConfigurationLayer,
  type ConfigurationProvider,
  mergeConfigurationLayers,
} from "../../shared/config/provider.ts";
import { parseAppConfig } from "../../shared/config/schema.ts";

export class ConfigurationError extends Error {
  override cause?: unknown;

  constructor(message: string, options: { cause?: unknown } = {}) {
    if (options.cause !== undefined) {
      super(message, { cause: options.cause });
    } else {
      super(message);
    }
    this.name = "ConfigurationError";
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class ConfigurationManager {
  readonly #providers: readonly ConfigurationProvider[];
  #resolved?: AppConfig;

  constructor(providers: readonly ConfigurationProvider[]) {
    this.#providers = providers;
  }

  async resolve(): Promise<AppConfig> {
    if (this.#resolved) {
      return this.#resolved;
    }

    const layers: ConfigurationLayer[] = [];
    for (const provider of this.#providers) {
      try {
        const layer = await provider.load();
        layers.push(layer);
      } catch (error) {
        throw new ConfigurationError(
          `Failed to load configuration from provider: ${provider.meta.id}`,
          { cause: error },
        );
      }
    }

    const merged = mergeConfigurationLayers(layers);
    const config = parseAppConfig(merged);
    this.#resolved = config;
    return config;
  }

  async refresh(): Promise<AppConfig> {
    this.#resolved = undefined;
    return this.resolve();
  }

  async get<T>(path: string, fallback?: T): Promise<T | undefined> {
    const config = await this.resolve();
    const value = resolvePath(config, path);
    if (value === undefined || value === null) {
      return fallback;
    }
    return value as T;
  }

  async require<T>(path: string): Promise<T> {
    const value = await this.get<T>(path);
    if (value === undefined) {
      throw new ConfigurationError(`Configuration value missing: ${path}`);
    }
    return value;
  }
}

function resolvePath(config: AppConfig, path: string): unknown {
  const segments = path.split(".").filter(Boolean);
  let current: unknown = config;
  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }
    if (typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
