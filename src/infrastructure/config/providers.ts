import {
  type ConfigurationLayer,
  type ConfigurationProvider,
  type ConfigurationValue,
} from "../../shared/config/provider.ts";
import type { AppConfig } from "../../shared/config/schema.ts";

export class DefaultConfigurationProvider implements ConfigurationProvider {
  readonly meta = {
    id: "default",
    priority: 0,
    description: "Built-in defaults",
  } as const;

  async load(): Promise<ConfigurationLayer> {
    return {
      meta: this.meta,
      value: {},
    };
  }
}

export interface EnvConfigurationProviderOptions {
  readonly env?: Record<string, string>;
  readonly prefix?: string;
}

export class EnvConfigurationProvider implements ConfigurationProvider {
  readonly meta = {
    id: "env",
    priority: 10,
    description: "Environment variables",
  } as const;

  readonly #env: Record<string, string>;
  readonly #prefix: string;

  constructor(options: EnvConfigurationProviderOptions = {}) {
    this.#prefix = options.prefix ?? "STORYTELLER_";
    this.#env = options.env ?? readEnvironment();
  }

  async load(): Promise<ConfigurationLayer> {
    const value: ConfigurationValue = {};

    const loggingLevel = this.#env[`${this.#prefix}LOG_LEVEL`];
    if (loggingLevel) {
      value.logging = {
        ...(value.logging ?? {}),
        level: loggingLevel as AppConfig["logging"]["level"],
      };
    }

    const loggingFormat = this.#env[`${this.#prefix}LOG_FORMAT`];
    if (loggingFormat) {
      value.logging = {
        ...(value.logging ?? {}),
        format: loggingFormat as AppConfig["logging"]["format"],
      };
    }

    const envName = this.#env[`${this.#prefix}ENVIRONMENT`];
    if (envName) {
      value.runtime = {
        ...(value.runtime ?? {}),
        environment: envName as AppConfig["runtime"]["environment"],
      };
    }

    const cacheTtl = this.#env[`${this.#prefix}CACHE_TTL`];
    if (cacheTtl !== undefined) {
      const parsed = Number(cacheTtl);
      if (!Number.isNaN(parsed) && parsed > 0) {
        value.cache = {
          ...(value.cache ?? {}),
          defaultTtlSeconds: parsed,
        };
      }
    }

    const defaultProvider = this.#env[`${this.#prefix}PROVIDER`];
    if (defaultProvider) {
      value.external = {
        ...(value.external ?? {}),
        defaultProvider,
      };
    }

    return {
      meta: this.meta,
      value,
    };
  }
}

function readEnvironment(): Record<string, string> {
  try {
    return Deno.env.toObject();
  } catch {
    return {};
  }
}

export interface FileConfigurationProviderOptions {
  readonly searchPaths: readonly string[];
  readonly fs?: {
    readTextFile(path: string): Promise<string>;
    stat(path: string): Promise<Deno.FileInfo>;
  };
}

type FileSystemAdapter = {
  readTextFile(path: string): Promise<string>;
  stat(path: string): Promise<Deno.FileInfo>;
};

export class FileConfigurationProvider implements ConfigurationProvider {
  readonly meta = {
    id: "file",
    priority: 20,
    description: "Configuration files",
  } as const;

  readonly #paths: readonly string[];
  readonly #fs: FileSystemAdapter;

  constructor(options: FileConfigurationProviderOptions) {
    if (!options?.searchPaths?.length) {
      throw new Error("FileConfigurationProvider requires searchPaths");
    }
    this.#paths = options.searchPaths;
    this.#fs = options.fs ?? {
      readTextFile: (path) => Deno.readTextFile(path),
      stat: (path) => Deno.stat(path),
    };
  }

  async load(): Promise<ConfigurationLayer> {
    for (const path of this.#paths) {
      try {
        const info = await this.#fs.stat(path);
        if (!info.isFile) {
          continue;
        }
        const text = await this.#fs.readTextFile(path);
        const parsed = JSON.parse(text) as ConfigurationValue;
        return {
          meta: this.meta,
          value: parsed,
        };
      } catch (error) {
        // Ignore missing files, throw on malformed JSON
        if (error instanceof Deno.errors.NotFound) {
          continue;
        }
        if (error instanceof SyntaxError) {
          throw new Error(`Invalid configuration file: ${path}`);
        }
        throw error;
      }
    }

    return {
      meta: this.meta,
      value: {},
    };
  }
}

export interface CliConfigurationProviderOptions {
  readonly logLevel?: string;
  readonly logFormat?: string;
  readonly environment?: string;
  readonly cacheTtl?: number;
  readonly provider?: string;
}

export class CliConfigurationProvider implements ConfigurationProvider {
  readonly meta = {
    id: "cli",
    priority: 30,
    description: "CLI flags",
  } as const;

  readonly #options: CliConfigurationProviderOptions;

  constructor(options: CliConfigurationProviderOptions = {}) {
    this.#options = options;
  }

  async load(): Promise<ConfigurationLayer> {
    const value: ConfigurationValue = {};

    if (this.#options.logLevel) {
      value.logging = {
        ...(value.logging ?? {}),
        level: this.#options.logLevel as AppConfig["logging"]["level"],
      };
    }

    if (this.#options.logFormat) {
      value.logging = {
        ...(value.logging ?? {}),
        format: this.#options.logFormat as AppConfig["logging"]["format"],
      };
    }

    if (this.#options.environment) {
      value.runtime = {
        ...(value.runtime ?? {}),
        environment: this.#options
          .environment as AppConfig["runtime"]["environment"],
      };
    }

    if (this.#options.cacheTtl !== undefined) {
      value.cache = {
        ...(value.cache ?? {}),
        defaultTtlSeconds: this.#options.cacheTtl,
      };
    }

    if (this.#options.provider) {
      value.external = {
        ...(value.external ?? {}),
        defaultProvider: this.#options.provider,
      };
    }

    return {
      meta: this.meta,
      value,
    };
  }
}
