/**
 * Safe LLM Provider
 *
 * 呼び出し制限機能付きのLLMプロバイダーラッパー
 */

import { err } from "../../shared/result.ts";
import type { Result } from "../../shared/result.ts";
import type {
  LLMCallOptions,
  LLMError,
  LLMMessage,
  LLMProvider,
  LLMResponse,
} from "../providers/provider.ts";
import type { SafetyConfig } from "../config/llm_config.ts";
import { CallLimiter, type CallLimitError } from "./call_limiter.ts";

/**
 * SafeLLMProviderのオプション
 */
export type SafeLLMProviderOptions = {
  /** 安全設定 */
  readonly safety: SafetyConfig;
  /** 警告時のコールバック */
  readonly onWarning?: (remainingCalls: number, message: string) => void;
  /** 制限到達時のコールバック */
  readonly onLimitReached?: (error: CallLimitError) => void;
};

/**
 * 呼び出し制限機能付きLLMプロバイダー
 *
 * 既存のLLMProviderをラップして、呼び出し回数を制限する
 */
export class SafeLLMProvider implements LLMProvider {
  readonly name: string;

  private readonly provider: LLMProvider;
  private readonly limiter: CallLimiter;
  private readonly options: SafeLLMProviderOptions;

  constructor(provider: LLMProvider, options: SafeLLMProviderOptions) {
    this.provider = provider;
    this.name = `safe(${provider.name})`;
    this.options = options;

    // CallLimiterを初期化
    this.limiter = new CallLimiter({
      maxCalls: options.safety.maxCallsPerSession,
      timeWindowMs: options.safety.maxCallsPerWindow
        ? options.safety.windowMs
        : undefined,
      warningThreshold: options.safety.warningThreshold,
      onWarning: (remaining) => {
        if (options.onWarning) {
          options.onWarning(
            remaining,
            `Warning: Only ${remaining} API calls remaining in this session.`,
          );
        }
      },
    });
  }

  async generate(
    messages: readonly LLMMessage[],
    options?: LLMCallOptions,
  ): Promise<Result<LLMResponse, LLMError>> {
    // 呼び出し制限をチェック
    const limitCheck = this.limiter.tryCall();

    if (!limitCheck.ok) {
      const limitError = limitCheck.error;

      // コールバックを呼び出し
      if (this.options.onLimitReached) {
        this.options.onLimitReached(limitError);
      }

      // LLMErrorに変換
      return err({
        code: limitError.code,
        message: limitError.message,
        details: {
          currentCount: limitError.currentCount,
          maxCalls: limitError.maxCalls,
        },
      });
    }

    // 内部プロバイダーを呼び出し
    return this.provider.generate(messages, options);
  }

  async isAvailable(): Promise<boolean> {
    // 制限に達していたら利用不可
    if (this.limiter.isLimitReached()) {
      return false;
    }
    return this.provider.isAvailable();
  }

  /**
   * 現在の呼び出し回数を取得
   */
  getCurrentCallCount(): number {
    return this.limiter.getCurrentCount();
  }

  /**
   * 残り呼び出し回数を取得
   */
  getRemainingCalls(): number {
    return this.limiter.getRemainingCalls();
  }

  /**
   * 制限に達しているかチェック
   */
  isLimitReached(): boolean {
    return this.limiter.isLimitReached();
  }

  /**
   * カウンターをリセット（新しいセッション開始時など）
   */
  resetCallCount(): void {
    this.limiter.reset();
  }

  /**
   * 内部プロバイダーを取得
   */
  getInnerProvider(): LLMProvider {
    return this.provider;
  }
}

/**
 * プロバイダーを安全ラッパーで包む
 */
export function wrapWithSafety(
  provider: LLMProvider,
  safety: SafetyConfig,
  callbacks?: {
    onWarning?: (remainingCalls: number, message: string) => void;
    onLimitReached?: (error: CallLimitError) => void;
  },
): SafeLLMProvider {
  return new SafeLLMProvider(provider, {
    safety,
    onWarning: callbacks?.onWarning,
    onLimitReached: callbacks?.onLimitReached,
  });
}
