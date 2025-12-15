/**
 * CLIアダプター
 * CommandHandlerをMCPツールとして実行するためのアダプター
 */

import type {
  CommandContext,
  CommandHandler,
  ConfigurationManagerRef,
  OutputPresenter,
} from "../../cli/types.ts";
import type {
  LogContext,
  Logger,
  LogLevel,
  LogMetadata,
} from "../../shared/logging/types.ts";
import type { AppConfig } from "../../shared/config/schema.ts";
import type {
  McpCallToolResult,
  McpToolResultContent,
} from "../protocol/types.ts";

/**
 * 出力をキャプチャするモックPresenter
 */
class CapturePresenter implements OutputPresenter {
  private messages: string[] = [];

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

  getOutput(): string {
    return this.messages.join("\n");
  }
}

/**
 * モックConfigurationManager
 */
const mockConfigManager: ConfigurationManagerRef = {
  resolve: async (): Promise<AppConfig> => ({
    runtime: {
      environment: "development",
      paths: {},
    },
    logging: {
      level: "info",
      format: "human",
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

/**
 * モックLogger
 */
const mockLogger: Logger = {
  scope: "mcp",
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

/**
 * モックのCommandContextを作成する
 * @param args コマンド引数
 * @returns CommandContext
 */
export function createMockContext(
  args?: Record<string, unknown>,
): CommandContext & { presenter: CapturePresenter } {
  const presenter = new CapturePresenter();

  return {
    args,
    presenter,
    config: mockConfigManager,
    logger: mockLogger,
  };
}

/**
 * CommandHandlerをMCPツールとして実行する
 * @param handler 実行するコマンドハンドラー
 * @param args ツール引数
 * @param projectRoot プロジェクトルートディレクトリ（省略時はDeno.cwd()）
 * @returns MCP形式の実行結果
 */
export async function executeCliCommand(
  handler: CommandHandler,
  args: Record<string, unknown>,
  projectRoot?: string,
): Promise<McpCallToolResult> {
  // projectRootが指定されていれば引数に追加
  const argsWithProjectRoot = projectRoot ? { ...args, projectRoot } : args;
  const context = createMockContext(argsWithProjectRoot);

  try {
    const result = await handler.execute(context);

    if (result.ok) {
      // 成功時: presenterの出力と結果を含める
      const output = context.presenter.getOutput();
      const resultJson = JSON.stringify(result.value, null, 2);
      const text = output
        ? `${output}\n\nResult:\n${resultJson}`
        : `Result:\n${resultJson}`;

      return {
        content: [
          { type: "text", text } as McpToolResultContent,
        ],
        isError: false,
      };
    } else {
      // エラー時: エラー情報を含める
      const output = context.presenter.getOutput();
      const errorText = `Error [${result.error.code}]: ${result.error.message}`;
      const text = output ? `${output}\n\n${errorText}` : errorText;

      return {
        content: [
          { type: "text", text } as McpToolResultContent,
        ],
        isError: true,
      };
    }
  } catch (error) {
    // 例外時: エラーメッセージを含める
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Execution error: ${message}`,
        } as McpToolResultContent,
      ],
      isError: true,
    };
  }
}
