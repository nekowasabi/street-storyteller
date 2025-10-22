# Logging Overview

Street Storyteller bootstraps logging through the `LoggingService`:

1. Resolve the merged application configuration.
2. Instantiate a `LogManager` with the selected level, format, and color/timestamp settings.
3. Provide scoped loggers to CLI commands and application services.

## Log Levels

| Level  | Description                                   |
|--------|-----------------------------------------------|
| trace  | Extremely verbose diagnostic output           |
| debug  | Detailed debugging information                |
| info   | High-level lifecycle events (default minimum) |
| warn   | Recoverable issues requiring attention         |
| error  | Failures that caused the current operation to abort |
| fatal  | Process-threatening or unrecoverable errors   |

The threshold is controlled via configuration (`logging.level`), environment (`STORYTELLER_LOG_LEVEL`), or CLI flag (`--log-level`).

## Console Output Modes

- **Human** (`logging.format = "human"`): colorized (when enabled) lines like  
  `2025-10-22T10:28:10.213Z [INFO] cli Project generated {"name":"cli-story"} {"environment":"development","command":"generate"}`
- **JSON** (`logging.format = "json"`): machine-friendly single-line JSON objects.

Warnings and errors are written to stderr; lower levels go to stdout.

## Writing Logs in Commands

The `CommandContext` supplies a scoped logger. Example:

```ts
context.logger.info("Generating project", {
  name: options.name,
  template: options.template,
});
```

Use `withContext` to add persistent metadata:

```ts
const logger = context.logger.withContext({ requestId });
logger.warn("Retrying operation", { attempt });
```

## Testing with the Memory Logger

`MemoryLoggerFactory` captures log events for assertions:

```ts
const factory = new MemoryLoggerFactory();
const manager = new LogManager({ level: "debug", factory });
const logger = manager.createLogger("cli.generate");

logger.error("failure", { reason: "boom" });
assertEquals(factory.events[0].metadata?.reason, "boom");
```

This is helpful when writing unit tests for commands or services that emit logs.

