# Configuration Overview

Street Storyteller resolves configuration by merging several providers in
ascending priority:

1. **Default provider** – built-in baseline values (e.g.,
   `logging.level = "info"`).
2. **Environment provider** – reads `STORYTELLER_*` variables such as
   `STORYTELLER_LOG_LEVEL` or `STORYTELLER_CACHE_TTL`.
3. **File provider** – loads the first matching file from:
   - `[cwd]/.storyteller/config.json`
   - `[cwd]/storyteller.config.json`
   - custom path via `--config <path>`
4. **CLI provider** – command-line overrides (e.g., `--log-level`,
   `--provider`).

After merging, the configuration is validated with Zod to ensure type safety.

## Configuration Schema

```ts
interface AppConfig {
  runtime: {
    environment: "development" | "test" | "production";
    projectRoot?: string;
    paths: {
      configFile?: string;
      dataDir?: string;
      cacheDir?: string;
    };
  };
  logging: {
    level: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    format: "human" | "json";
    color: boolean;
    timestamps: boolean;
  };
  cache: {
    defaultTtlSeconds: number;
    staleWhileRevalidateSeconds?: number;
    maxEntries?: number;
    directory?: string;
  };
  external: {
    defaultProvider?: string;
    providers: Array<{
      id: string;
      type: "http" | "mock";
      baseUrl?: string;
      headers?: Record<string, string>;
      apiKeyEnv?: string;
      timeoutMs?: number;
    }>;
  };
  features: Record<string, boolean>;
}
```

## CLI Overrides

| Flag            | Description                    | Mapping                    |
| --------------- | ------------------------------ | -------------------------- |
| `--config`      | Custom configuration file path | File provider search path  |
| `--log-level`   | Override logging level         | `logging.level`            |
| `--log-format`  | `human` or `json` formatting   | `logging.format`           |
| `--environment` | Runtime environment            | `runtime.environment`      |
| `--cache-ttl`   | Default cache TTL in seconds   | `cache.defaultTtlSeconds`  |
| `--provider`    | Default external provider id   | `external.defaultProvider` |

## Environment Variables

- `STORYTELLER_LOG_LEVEL` – logging level override.
- `STORYTELLER_LOG_FORMAT` – `human` or `json`.
- `STORYTELLER_ENVIRONMENT` – runtime environment.
- `STORYTELLER_CACHE_TTL` – cache TTL in seconds.
- `STORYTELLER_PROVIDER` – default external provider.

> Environment values are applied before file and CLI overrides, so flags always
> win.
