/**
 * LLM設定ローダー
 *
 * storyteller.llm.json からLLM設定を読み込む
 */

import type { Result } from "../../shared/result.ts";
import { err, ok } from "../../shared/result.ts";
import {
  type LLMConfig,
  mergeWithDefaults,
  validateConfig,
} from "./llm_config.ts";
import { join } from "@std/path";

/**
 * 設定ローダーエラー
 */
export type ConfigLoaderError = {
  readonly code: "config_not_found" | "config_invalid" | "config_parse_error";
  readonly message: string;
};

/**
 * 設定ファイル名
 */
const CONFIG_FILE_NAMES = [
  "storyteller.llm.json",
  ".storyteller.llm.json",
] as const;

/**
 * LLM設定をロード
 *
 * @param projectRoot プロジェクトルート
 * @returns LLM設定
 */
export async function loadLLMConfig(
  projectRoot: string,
): Promise<Result<LLMConfig, ConfigLoaderError>> {
  // 設定ファイルを探す
  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = join(projectRoot, fileName);

    try {
      const stat = await Deno.stat(configPath);
      if (!stat.isFile) continue;

      // ファイルを読み込む
      const content = await Deno.readTextFile(configPath);
      const parsed = JSON.parse(content);

      // 検証
      if (!validateConfig(parsed)) {
        return err({
          code: "config_invalid",
          message: `Invalid LLM config in ${configPath}. Required fields: provider, model`,
        });
      }

      // デフォルト値をマージ
      const config = mergeWithDefaults(parsed);

      // APIキーを環境変数から取得
      const resolvedConfig = await resolveApiKey(config);

      return ok(resolvedConfig);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        continue;
      }
      if (error instanceof SyntaxError) {
        return err({
          code: "config_parse_error",
          message: `Failed to parse ${configPath}: ${error.message}`,
        });
      }
      throw error;
    }
  }

  return err({
    code: "config_not_found",
    message:
      `LLM config not found. Create ${CONFIG_FILE_NAMES[0]} in project root.`,
  });
}

/**
 * APIキーを環境変数から解決
 */
async function resolveApiKey(config: LLMConfig): Promise<LLMConfig> {
  let apiKey = config.apiKey;

  // 環境変数名が指定されている場合は環境変数から取得
  if (apiKey && apiKey.startsWith("$")) {
    const envName = apiKey.slice(1);
    apiKey = Deno.env.get(envName);
  }

  // デフォルトの環境変数を試す
  if (!apiKey && config.provider === "openrouter") {
    apiKey = Deno.env.get("OPENROUTER_API_KEY");
  }

  return {
    ...config,
    apiKey,
  };
}

/**
 * デフォルト設定でモック設定を作成
 */
export function createMockConfig(): LLMConfig {
  return {
    provider: "mock",
    model: "mock-model",
    timeout: 5000,
  };
}
