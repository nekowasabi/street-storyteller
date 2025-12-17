/**
 * element phase コマンドのテスト
 * TDD Red-Green-Refactor サイクルに従って作成
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  ElementPhaseCommand,
  elementPhaseCommandDescriptor,
} from "../../../../src/cli/modules/element/phase.ts";
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
function createTestContext(
  args: Record<string, unknown> = {},
  projectRoot?: string,
): CommandContext {
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
        runtime: {
          environment: "test",
          paths: {},
          projectRoot: projectRoot ?? "/tmp/test-project",
        },
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

Deno.test("ElementPhaseCommand", async (t) => {
  await t.step(
    "コマンドディスクリプタが正しく定義されている",
    () => {
      assertExists(elementPhaseCommandDescriptor);
      assertEquals(elementPhaseCommandDescriptor.path, ["element", "phase"]);
      assertExists(elementPhaseCommandDescriptor.summary);
      assertExists(elementPhaseCommandDescriptor.options);
    },
  );

  await t.step(
    "必須パラメータが不足している場合エラーを返す",
    async () => {
      const command = new ElementPhaseCommand();
      const context = createTestContext({});

      const result = await command.execute(context);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "invalid_arguments");
      }
    },
  );

  await t.step(
    "--character のみ指定した場合エラーを返す",
    async () => {
      const command = new ElementPhaseCommand();
      const context = createTestContext({ character: "hero" });

      const result = await command.execute(context);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "invalid_arguments");
      }
    },
  );

  await t.step(
    "無効なtransition-typeでエラーを返す",
    async () => {
      const command = new ElementPhaseCommand();
      const context = createTestContext({
        character: "hero",
        id: "awakening",
        name: "覚醒期",
        order: 1,
        summary: "真実を知り、力に目覚める",
        "transition-type": "invalid_type",
      });

      const result = await command.execute(context);

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "invalid_arguments");
      }
    },
  );

  await t.step(
    "有効なオプションがパースエラーにならない",
    async () => {
      const command = new ElementPhaseCommand();
      // キャラクターファイルが存在しないため、character_not_foundエラーになることを確認
      const context = createTestContext(
        {
          character: "hero",
          id: "awakening",
          name: "覚醒期",
          order: 1,
          summary: "真実を知り、力に目覚める",
          "transition-type": "turning_point",
          "trigger-event": "discovery_of_truth",
          importance: "major",
          "add-trait": "勇敢",
          "remove-trait": "臆病",
          "add-ability": "魔法",
        },
        "/nonexistent-path",
      );

      const result = await command.execute(context);

      // パースは成功するが、キャラクターファイルが見つからないエラー
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "character_not_found");
      }
    },
  );

  await t.step(
    "すべてのdelta差分オプションが受け入れられる",
    async () => {
      const command = new ElementPhaseCommand();
      const context = createTestContext(
        {
          character: "hero",
          id: "awakening",
          name: "覚醒期",
          order: 1,
          summary: "覚醒",
          "transition-type": "turning_point",
          "add-trait": "勇敢,強い",
          "remove-trait": "臆病",
          "add-ability": "魔法,剣術",
          "add-relationship": "companion:ally",
          "status-mental": "覚悟を決めた",
        },
        "/nonexistent-path",
      );

      const result = await command.execute(context);
      // パースは成功するが、ファイルが見つからないエラー
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.code, "character_not_found");
      }
    },
  );
});
