/**
 * LLM Provider インターフェース
 *
 * LLMプロバイダーの共通インターフェースを定義
 */

import type { Result } from "@storyteller/shared/result.ts";

/**
 * LLMメッセージの役割
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * LLMメッセージ
 */
export type LLMMessage = {
  readonly role: MessageRole;
  readonly content: string;
};

/**
 * LLM呼び出しオプション
 */
export type LLMCallOptions = {
  /** 最大トークン数 */
  readonly maxTokens?: number;
  /** 温度（0-1） */
  readonly temperature?: number;
  /** タイムアウト（ミリ秒） */
  readonly timeout?: number;
  /** ストップシーケンス */
  readonly stopSequences?: readonly string[];
};

/**
 * LLM応答
 */
export type LLMResponse = {
  /** 生成されたテキスト */
  readonly content: string;
  /** 使用トークン数 */
  readonly usage?: {
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  };
  /** モデル情報 */
  readonly model?: string;
  /** 終了理由 */
  readonly finishReason?: "stop" | "length" | "content_filter" | "error";
};

/**
 * LLMエラー
 */
export type LLMError = {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
};

/**
 * LLMプロバイダーのインターフェース
 */
export interface LLMProvider {
  /** プロバイダー名 */
  readonly name: string;

  /**
   * テキスト生成を実行
   * @param messages メッセージ配列
   * @param options オプション
   * @returns 生成結果
   */
  generate(
    messages: readonly LLMMessage[],
    options?: LLMCallOptions,
  ): Promise<Result<LLMResponse, LLMError>>;

  /**
   * 利用可能かチェック
   * @returns 利用可能な場合true
   */
  isAvailable(): Promise<boolean>;
}

/**
 * ストリーミング対応LLMプロバイダーのインターフェース
 */
export interface StreamingLLMProvider extends LLMProvider {
  /**
   * ストリーミングテキスト生成を実行
   * @param messages メッセージ配列
   * @param options オプション
   * @returns ストリーム
   */
  generateStream(
    messages: readonly LLMMessage[],
    options?: LLMCallOptions,
  ): AsyncGenerator<string, void, unknown>;
}

/**
 * プロバイダーがストリーミング対応かチェック
 */
export function isStreamingProvider(
  provider: LLMProvider,
): provider is StreamingLLMProvider {
  return "generateStream" in provider &&
    typeof (provider as StreamingLLMProvider).generateStream === "function";
}
