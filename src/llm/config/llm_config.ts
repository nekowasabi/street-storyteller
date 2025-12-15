/**
 * LLM設定の型定義
 *
 * storyteller.llm.json の形式を定義
 */

/**
 * リトライ設定
 */
export type RetryConfig = {
  /** 最大リトライ回数 */
  readonly maxRetries: number;
  /** 初期遅延（ミリ秒） */
  readonly initialDelay: number;
  /** 最大遅延（ミリ秒） */
  readonly maxDelay: number;
  /** バックオフ戦略 */
  readonly backoff: "linear" | "exponential";
};

/**
 * LLM設定
 */
export type LLMConfig = {
  /** プロバイダー名 */
  readonly provider: "openrouter" | "mock";
  /** モデルID */
  readonly model: string;
  /** OpenRouter用プロバイダー優先順位 */
  readonly providerOrder?: readonly string[];
  /** タイムアウト（ミリ秒） */
  readonly timeout?: number;
  /** リトライ設定 */
  readonly retry?: Partial<RetryConfig>;
  /** APIキー（環境変数名またはリテラル） */
  readonly apiKey?: string;
  /** ベースURL（オプション） */
  readonly baseUrl?: string;
};

/**
 * デフォルト設定
 */
export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "openrouter",
  model: "anthropic/claude-3-haiku",
  timeout: 30000,
  retry: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoff: "exponential",
  },
};

/**
 * 設定をマージしてデフォルト値を適用
 */
export function mergeWithDefaults(
  config: Partial<LLMConfig>,
): LLMConfig {
  return {
    ...DEFAULT_LLM_CONFIG,
    ...config,
    retry: {
      ...DEFAULT_LLM_CONFIG.retry,
      ...config.retry,
    },
  };
}

/**
 * 設定を検証
 */
export function validateConfig(
  config: unknown,
): config is LLMConfig {
  if (!config || typeof config !== "object") {
    return false;
  }

  const c = config as Record<string, unknown>;

  // provider は必須
  if (typeof c.provider !== "string") {
    return false;
  }

  // model は必須
  if (typeof c.model !== "string") {
    return false;
  }

  return true;
}
