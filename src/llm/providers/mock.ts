/**
 * Mock LLM Provider
 *
 * テスト用のモックLLMプロバイダー
 */

import { ok } from "../../shared/result.ts";
import type { Result } from "../../shared/result.ts";
import type {
  LLMCallOptions,
  LLMError,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  StreamingLLMProvider,
} from "./provider.ts";

/**
 * MockLLMProviderのオプション
 */
export type MockLLMProviderOptions = {
  /** 固定のレスポンス内容 */
  readonly response?: string;
  /** レスポンス生成関数 */
  readonly responseGenerator?: (messages: readonly LLMMessage[]) => string;
  /** 遅延（ミリ秒） */
  readonly delay?: number;
  /** エラーをスローする */
  readonly shouldFail?: boolean;
  /** エラー内容 */
  readonly error?: LLMError;
  /** 利用可能かどうか */
  readonly available?: boolean;
};

/**
 * テスト用のモックLLMプロバイダー
 */
export class MockLLMProvider implements StreamingLLMProvider {
  readonly name = "mock";

  private readonly options: MockLLMProviderOptions;
  private callCount = 0;
  private readonly callHistory: Array<{
    messages: readonly LLMMessage[];
    options?: LLMCallOptions;
  }> = [];

  constructor(options: MockLLMProviderOptions = {}) {
    this.options = {
      response: "This is a mock response.",
      available: true,
      ...options,
    };
  }

  async generate(
    messages: readonly LLMMessage[],
    options?: LLMCallOptions,
  ): Promise<Result<LLMResponse, LLMError>> {
    // 呼び出し履歴を記録
    this.callCount++;
    this.callHistory.push({ messages, options });

    // 遅延をシミュレート
    if (this.options.delay && this.options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }

    // エラーをシミュレート
    if (this.options.shouldFail) {
      return {
        ok: false,
        error: this.options.error ?? {
          code: "mock_error",
          message: "Mock error occurred",
        },
      };
    }

    // レスポンスを生成
    const content = this.options.responseGenerator
      ? this.options.responseGenerator(messages)
      : this.options.response ?? "This is a mock response.";

    const response: LLMResponse = {
      content,
      usage: {
        promptTokens: messages.reduce(
          (sum, m) => sum + m.content.length / 4,
          0,
        ),
        completionTokens: content.length / 4,
        totalTokens:
          messages.reduce((sum, m) => sum + m.content.length / 4, 0) +
          content.length / 4,
      },
      model: "mock-model",
      finishReason: "stop",
    };

    return ok(response);
  }

  async *generateStream(
    messages: readonly LLMMessage[],
    options?: LLMCallOptions,
  ): AsyncGenerator<string, void, unknown> {
    // 呼び出し履歴を記録
    this.callCount++;
    this.callHistory.push({ messages, options });

    // 遅延をシミュレート
    const delay = this.options.delay;
    if (delay && delay > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, delay / 2)
      );
    }

    // エラーをシミュレート
    if (this.options.shouldFail) {
      throw new Error(this.options.error?.message ?? "Mock error occurred");
    }

    // レスポンスを生成
    const content = this.options.responseGenerator
      ? this.options.responseGenerator(messages)
      : this.options.response ?? "This is a mock response.";

    // チャンクに分割して返す
    const chunks = content.split(/(?<=\s)/);
    for (const chunk of chunks) {
      yield chunk;
      // 少し遅延を入れる
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  async isAvailable(): Promise<boolean> {
    return this.options.available ?? true;
  }

  /**
   * 呼び出し回数を取得
   */
  getCallCount(): number {
    return this.callCount;
  }

  /**
   * 呼び出し履歴を取得
   */
  getCallHistory(): Array<{
    messages: readonly LLMMessage[];
    options?: LLMCallOptions;
  }> {
    return [...this.callHistory];
  }

  /**
   * 呼び出し履歴をリセット
   */
  reset(): void {
    this.callCount = 0;
    this.callHistory.length = 0;
  }
}
