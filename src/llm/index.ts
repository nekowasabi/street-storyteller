/**
 * LLM モジュール
 *
 * LLMプロバイダーと設定を公開
 */

// 型定義
export type {
  LLMCallOptions,
  LLMError,
  LLMMessage,
  LLMProvider,
  LLMResponse,
  MessageRole,
  StreamingLLMProvider,
} from "./providers/provider.ts";

export { isStreamingProvider } from "./providers/provider.ts";

// 設定
export type { LLMConfig, RetryConfig } from "./config/llm_config.ts";
export {
  DEFAULT_LLM_CONFIG,
  mergeWithDefaults,
  validateConfig,
} from "./config/llm_config.ts";

export type { ConfigLoaderError } from "./config/loader.ts";
export { createMockConfig, loadLLMConfig } from "./config/loader.ts";

// プロバイダー
export { OpenRouterProvider } from "./providers/openrouter.ts";
export { MockLLMProvider, type MockLLMProviderOptions } from "./providers/mock.ts";

// ファクトリー
export type { ProviderFactoryError } from "./providers/factory.ts";
export { createProvider } from "./providers/factory.ts";
