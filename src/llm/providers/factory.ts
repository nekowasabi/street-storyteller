/**
 * LLM Provider Factory
 *
 * 設定に基づいてLLMプロバイダーを作成
 */

import type { Result } from "@storyteller/shared/result.ts";
import { err, ok } from "@storyteller/shared/result.ts";
import type { LLMConfig } from "@storyteller/llm/config/llm_config.ts";
import { DEFAULT_SAFETY_CONFIG } from "@storyteller/llm/config/llm_config.ts";
import type { LLMProvider } from "@storyteller/llm/providers/provider.ts";
import { OpenRouterProvider } from "@storyteller/llm/providers/openrouter.ts";
import { MockLLMProvider } from "@storyteller/llm/providers/mock.ts";
import {
  type SafeLLMProvider,
  wrapWithSafety,
} from "@storyteller/llm/safety/safe_provider.ts";
import type { CallLimitError } from "@storyteller/llm/safety/call_limiter.ts";

/**
 * ファクトリーエラー
 */
export type ProviderFactoryError = {
  readonly code: "unknown_provider" | "provider_init_failed";
  readonly message: string;
};

/**
 * 安全プロバイダー作成時のコールバック
 */
export type SafeProviderCallbacks = {
  readonly onWarning?: (remainingCalls: number, message: string) => void;
  readonly onLimitReached?: (error: CallLimitError) => void;
};

/**
 * LLMプロバイダーを作成
 *
 * @param config LLM設定
 * @returns LLMプロバイダー
 */
export function createProvider(
  config: LLMConfig,
): Result<LLMProvider, ProviderFactoryError> {
  try {
    switch (config.provider) {
      case "openrouter":
        return ok(new OpenRouterProvider(config));

      case "mock":
        return ok(new MockLLMProvider());

      default:
        return err({
          code: "unknown_provider",
          message: `Unknown provider: ${config.provider}`,
        });
    }
  } catch (error) {
    return err({
      code: "provider_init_failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 安全機能付きLLMプロバイダーを作成
 *
 * @param config LLM設定
 * @param callbacks コールバック関数
 * @returns 安全機能付きLLMプロバイダー
 */
export function createSafeProvider(
  config: LLMConfig,
  callbacks?: SafeProviderCallbacks,
): Result<SafeLLMProvider, ProviderFactoryError> {
  const providerResult = createProvider(config);

  if (!providerResult.ok) {
    return providerResult;
  }

  const safety = {
    ...DEFAULT_SAFETY_CONFIG,
    ...config.safety,
  };

  const safeProvider = wrapWithSafety(providerResult.value, safety, callbacks);

  return ok(safeProvider);
}
