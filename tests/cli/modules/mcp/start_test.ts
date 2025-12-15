/**
 * mcp startコマンドのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  mcpStartCommandDescriptor,
  mcpStartCommandHandler,
} from "../../../../src/cli/modules/mcp/start.ts";
import type {
  CommandContext,
  OutputPresenter,
} from "../../../../src/cli/types.ts";
import type {
  LogContext,
  Logger,
  LogLevel,
  LogMetadata,
} from "../../../../src/shared/logging/types.ts";
import type { AppConfig } from "../../../../src/shared/config/schema.ts";

/**
 * テスト用のモックPresenter
 */
class MockPresenter implements OutputPresenter {
  messages: string[] = [];

  showInfo(message: string): void {
    this.messages.push(`[INFO] ${message}`);
  }

  showSuccess(message: string): void {
    this.messages.push(`[SUCCESS] ${message}`);
  }

  showWarning(message: string): void {
    this.messages.push(`[WARNING] ${message}`);
  }

  showError(message: string): void {
    this.messages.push(`[ERROR] ${message}`);
  }
}

/**
 * テスト用のモックContext
 */
function createTestContext(args: Record<string, unknown> = {}): CommandContext {
  const presenter = new MockPresenter();

  const mockLogger: Logger = {
    scope: "test",
    log: (
      _level: LogLevel,
      _message: string,
      _metadata?: LogMetadata,
    ): void => {},
    trace: (_message: string, _metadata?: LogMetadata): void => {},
    debug: (_message: string, _metadata?: LogMetadata): void => {},
    info: (_message: string, _metadata?: LogMetadata): void => {},
    warn: (_message: string, _metadata?: LogMetadata): void => {},
    error: (_message: string, _metadata?: LogMetadata): void => {},
    fatal: (_message: string, _metadata?: LogMetadata): void => {},
    withContext: (_context: LogContext): Logger => mockLogger,
  };

  return {
    args,
    presenter,
    config: {
      resolve: async (): Promise<AppConfig> => ({
        runtime: { environment: "test", paths: {} },
        logging: {
          level: "info",
          format: "human",
          color: true,
          timestamps: true,
        },
        features: {},
        cache: { defaultTtlSeconds: 900 },
        external: { providers: [] },
      }),
    },
    logger: mockLogger,
  };
}

Deno.test("mcpStartCommandHandler: nameがstartである", () => {
  assertEquals(mcpStartCommandHandler.name, "start");
});

Deno.test("mcpStartCommandHandler: pathがmcp,startである", () => {
  assertExists(mcpStartCommandHandler.path);
  assertEquals(mcpStartCommandHandler.path, ["mcp", "start"]);
});

Deno.test("mcpStartCommandHandler: --stdioオプションなしでエラーを返す", async () => {
  const context = createTestContext({});
  const result = await mcpStartCommandHandler.execute(context);

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, "invalid_arguments");
    assertEquals(result.error.message.includes("--stdio"), true);
  }
});

Deno.test("mcpStartCommandHandler: --helpでヘルプを表示する", async () => {
  const context = createTestContext({ help: true });
  const result = await mcpStartCommandHandler.execute(context);

  assertEquals(result.ok, true);
  const presenter = context.presenter as MockPresenter;
  assertEquals(presenter.messages.length > 0, true);
  assertEquals(presenter.messages[0].includes("mcp start"), true);
});

Deno.test("mcpStartCommandHandler: --dry-runでサーバーを起動せずに検証する", async () => {
  const context = createTestContext({ stdio: true, "dry-run": true });
  const result = await mcpStartCommandHandler.execute(context);

  assertEquals(result.ok, true);
  if (result.ok) {
    const value = result.value as { mode: string };
    assertEquals(value.mode, "stdio");
  }
  const presenter = context.presenter as MockPresenter;
  assertEquals(presenter.messages.some((m) => m.includes("[dry-run]")), true);
});

Deno.test("mcpStartCommandDescriptor: 正しいサマリーを持つ", () => {
  assertExists(mcpStartCommandDescriptor);
  assertExists(mcpStartCommandDescriptor.summary);
  assertEquals(mcpStartCommandDescriptor.summary.includes("MCP"), true);
});

Deno.test("mcpStartCommandDescriptor: --stdioオプションが定義されている", () => {
  assertExists(mcpStartCommandDescriptor.options);
  const stdioOption = mcpStartCommandDescriptor.options.find(
    (o) => o.name === "--stdio",
  );
  assertExists(stdioOption);
  assertEquals(stdioOption.type, "boolean");
});

Deno.test("mcpStartCommandDescriptor: --pathオプションが定義されている", () => {
  assertExists(mcpStartCommandDescriptor.options);
  const pathOption = mcpStartCommandDescriptor.options.find(
    (o) => o.name === "--path",
  );
  assertExists(pathOption);
  assertEquals(pathOption.type, "string");
});

Deno.test("mcpStartCommandDescriptor: --dry-runオプションが定義されている", () => {
  assertExists(mcpStartCommandDescriptor.options);
  const dryRunOption = mcpStartCommandDescriptor.options.find(
    (o) => o.name === "--dry-run",
  );
  assertExists(dryRunOption);
  assertEquals(dryRunOption.type, "boolean");
});
