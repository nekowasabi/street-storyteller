/**
 * MCPサーバー能力定義
 * @see https://spec.modelcontextprotocol.io/specification/
 */

import type { McpServerCapabilities } from "../protocol/types.ts";

/**
 * サーバー能力の設定オプション
 */
export type McpServerCapabilitiesConfig = {
  /** ツール機能を有効化 */
  readonly tools?: boolean;
  /** リソース機能を有効化 */
  readonly resources?: boolean;
  /** プロンプト機能を有効化 */
  readonly prompts?: boolean;
  /** ロギング機能を有効化 */
  readonly logging?: boolean;
};

/**
 * MCPサーバー能力を取得
 * @param config 能力設定（デフォルトは全機能有効）
 * @returns サーバー能力オブジェクト
 */
export function getMcpServerCapabilities(
  config?: McpServerCapabilitiesConfig,
): McpServerCapabilities {
  // デフォルトは全機能有効
  const enableTools = config?.tools ?? true;
  const enableResources = config?.resources ?? true;
  const enablePrompts = config?.prompts ?? true;
  const enableLogging = config?.logging ?? false;

  return {
    ...(enableTools ? { tools: {} } : {}),
    ...(enableResources ? { resources: {} } : {}),
    ...(enablePrompts ? { prompts: {} } : {}),
    ...(enableLogging ? { logging: {} } : {}),
  };
}
