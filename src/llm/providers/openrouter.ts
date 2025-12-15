/**
 * OpenRouter LLM Provider
 *
 * OpenRouter API を使用してLLM呼び出しを行う
 * @see https://openrouter.ai/docs
 */

import { err, ok } from "../../shared/result.ts";
import type { Result } from "../../shared/result.ts";
import type { LLMConfig } from "../config/llm_config.ts";
import type {
  LLMCallOptions,
  LLMError,
  LLMMessage,
  LLMProvider,
  LLMResponse,
} from "./provider.ts";

/**
 * OpenRouter APIのベースURL
 */
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

/**
 * OpenRouter API レスポンスの型
 */
type OpenRouterResponse = {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
};

/**
 * OpenRouter API エラーの型
 */
type OpenRouterErrorResponse = {
  error: {
    message: string;
    type?: string;
    code?: string;
  };
};

/**
 * OpenRouter LLMプロバイダー
 */
export class OpenRouterProvider implements LLMProvider {
  readonly name = "openrouter";

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly providerOrder?: readonly string[];
  private readonly defaultTimeout: number;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error(
        "OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable or specify apiKey in config.",
      );
    }

    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl ?? OPENROUTER_BASE_URL;
    this.providerOrder = config.providerOrder;
    this.defaultTimeout = config.timeout ?? 30000;
  }

  async generate(
    messages: readonly LLMMessage[],
    options?: LLMCallOptions,
  ): Promise<Result<LLMResponse, LLMError>> {
    const timeout = options?.timeout ?? this.defaultTimeout;

    // リクエストボディを構築
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (options?.maxTokens) {
      body.max_tokens = options.maxTokens;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options?.stopSequences && options.stopSequences.length > 0) {
      body.stop = options.stopSequences;
    }
    if (this.providerOrder && this.providerOrder.length > 0) {
      body.provider = { order: this.providerOrder };
    }

    try {
      // タイムアウト付きでリクエスト
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://github.com/storyteller-cli/storyteller",
          "X-Title": "storyteller",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // エラーレスポンスのハンドリング
      if (!response.ok) {
        const errorBody = await response.json() as OpenRouterErrorResponse;
        return err({
          code: `http_${response.status}`,
          message: errorBody.error?.message ?? `HTTP ${response.status}`,
          details: errorBody,
        });
      }

      // 成功レスポンスのパース
      const data = await response.json() as OpenRouterResponse;

      if (!data.choices || data.choices.length === 0) {
        return err({
          code: "no_choices",
          message: "No choices returned from OpenRouter",
          details: data,
        });
      }

      const choice = data.choices[0];
      const finishReason = this.mapFinishReason(choice.finish_reason);

      const llmResponse: LLMResponse = {
        content: choice.message.content,
        usage: data.usage
          ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
          : undefined,
        model: data.model,
        finishReason,
      };

      return ok(llmResponse);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return err({
            code: "timeout",
            message: `Request timed out after ${timeout}ms`,
          });
        }
        return err({
          code: "network_error",
          message: error.message,
        });
      }
      return err({
        code: "unknown_error",
        message: String(error),
      });
    }
  }

  async isAvailable(): Promise<boolean> {
    // APIキーがあれば利用可能と見なす
    // 実際には /models エンドポイントを呼んで確認することも可能
    return !!this.apiKey;
  }

  /**
   * OpenRouterの終了理由をLLMResponseの形式にマップ
   */
  private mapFinishReason(
    reason: string,
  ): "stop" | "length" | "content_filter" | "error" {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return "stop";
    }
  }
}
