/**
 * LLM Provider Factory
 *
 * 設定に基づいてLLMプロバイダーを作成
 */

import type { Result } from "../../shared/result.ts";
import { err, ok } from "../../shared/result.ts";
import type { LLMConfig } from "../config/llm_config.ts";
import type { LLMProvider } from "./provider.ts";
import { OpenRouterProvider } from "./openrouter.ts";
import { MockLLMProvider } from "./mock.ts";

/**
 * ファクトリーエラー
 */
export type ProviderFactoryError = {
  readonly code: "unknown_provider" | "provider_init_failed";
  readonly message: string;
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
