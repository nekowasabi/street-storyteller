import type { Logger } from "../src/shared/logging/types.ts";

export function assert(
  condition: unknown,
  message = "Assertion failed",
): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals<T>(
  actual: T,
  expected: T,
  message?: string,
): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected} but received ${actual}`);
  }
}

export function assertFalse(condition: unknown, message?: string): void {
  if (condition) {
    throw new Error(message ?? "Expected condition to be false");
  }
}

/**
 * テスト用のスタブロガーを作成
 */
export function createStubLogger(): Logger {
  const noop = () => {};
  const logger: Logger = {
    scope: "test",
    log: noop,
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    withContext: () => logger,
  };
  return logger;
}

/**
 * テスト用のスタブプレゼンターを作成
 */
export function createStubPresenter() {
  const noop = () => {};
  return {
    showInfo: noop,
    showSuccess: noop,
    showWarning: noop,
    showError: noop,
  };
}

/**
 * テスト用のスタブConfigを作成
 */
export function createStubConfig() {
  return {
    resolve: async () => ({
      runtime: {
        environment: "test" as const,
        paths: {},
        projectRoot: Deno.cwd(),
      },
      logging: {
        level: "info" as const,
        format: "human" as const,
        color: true,
        timestamps: true,
      },
      features: {},
      cache: {
        defaultTtlSeconds: 900,
      },
      external: {
        providers: [],
      },
    }),
  };
}
