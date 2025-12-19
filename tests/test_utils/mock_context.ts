/**
 * テスト用モックコンテキスト
 *
 * CLIコマンドのテスト用にモックされたCommandContextを提供
 */

import type {
  CommandContext,
  ConfigurationManagerRef,
  OutputPresenter,
} from "@storyteller/cli/types.ts";
import type {
  LogContext,
  Logger,
  LogLevel,
  LogMetadata,
} from "@storyteller/shared/logging/types.ts";
import type { AppConfig } from "@storyteller/shared/config/schema.ts";

/**
 * モックプレゼンター
 */
export function createMockPresenter(): OutputPresenter & { logs: string[] } {
  const logs: string[] = [];
  return {
    logs,
    showInfo(message: string): void {
      logs.push(`[INFO] ${message}`);
    },
    showSuccess(message: string): void {
      logs.push(`[SUCCESS] ${message}`);
    },
    showWarning(message: string): void {
      logs.push(`[WARNING] ${message}`);
    },
    showError(message: string): void {
      logs.push(`[ERROR] ${message}`);
    },
  };
}

/**
 * モックロガー
 */
export function createMockLogger(): Logger {
  const scope = "test";
  const logger: Logger = {
    scope,
    log(_level: LogLevel, _message: string, _metadata?: LogMetadata): void {},
    trace(_message: string, _metadata?: LogMetadata): void {},
    debug(_message: string, _metadata?: LogMetadata): void {},
    info(_message: string, _metadata?: LogMetadata): void {},
    warn(_message: string, _metadata?: LogMetadata): void {},
    error(_message: string, _metadata?: LogMetadata): void {},
    fatal(_message: string, _metadata?: LogMetadata): void {},
    withContext(_context: LogContext): Logger {
      return logger;
    },
  };
  return logger;
}

/**
 * モック設定マネージャー
 */
export function createMockConfigManager(
  projectRoot?: string,
): ConfigurationManagerRef {
  return {
    async resolve(): Promise<AppConfig> {
      return {
        runtime: {
          environment: "test",
          projectRoot: projectRoot ?? Deno.cwd(),
          paths: {},
        },
        logging: {
          level: "info",
          format: "human",
          color: false,
          timestamps: true,
        },
        features: {},
        cache: {
          defaultTtlSeconds: 900,
        },
        external: {
          providers: [],
        },
      };
    },
  };
}

/**
 * モックコンテキストのオプション
 */
export interface MockContextOptions {
  args?: Record<string, unknown>;
  projectRoot?: string;
}

/**
 * モックコンテキストを作成
 */
export function createMockContext(
  options: MockContextOptions = {},
): CommandContext {
  const projectRoot = options.args?.projectRoot as string | undefined ??
    options.projectRoot;

  return {
    args: options.args,
    presenter: createMockPresenter(),
    config: createMockConfigManager(projectRoot),
    logger: createMockLogger(),
  };
}
