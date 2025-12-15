/**
 * MCPツールハンドラー
 * tools/list, tools/call リクエストの処理
 */

import { ToolRegistry } from "../../tools/tool_registry.ts";
import type {
  McpCallToolParams,
  McpCallToolResult,
  McpListToolsResult,
} from "../../protocol/types.ts";
import { metaCheckTool } from "../../tools/definitions/meta_check.ts";
import { metaGenerateTool } from "../../tools/definitions/meta_generate.ts";
import { elementCreateTool } from "../../tools/definitions/element_create.ts";
import { viewBrowserTool } from "../../tools/definitions/view_browser.ts";
import { lspValidateTool } from "../../tools/definitions/lsp_validate.ts";
import { lspFindReferencesTool } from "../../tools/definitions/lsp_find_references.ts";
import { timelineCreateTool } from "../../tools/definitions/timeline_create.ts";
import { eventCreateTool } from "../../tools/definitions/event_create.ts";
import { eventUpdateTool } from "../../tools/definitions/event_update.ts";
import { timelineViewTool } from "../../tools/definitions/timeline_view.ts";
import { timelineAnalyzeTool } from "../../tools/definitions/timeline_analyze.ts";

/**
 * tools/list リクエストを処理
 * 登録されているすべてのツールの情報を返す
 * @param registry ツールレジストリ
 * @returns ツール一覧
 */
export function handleToolsList(registry: ToolRegistry): McpListToolsResult {
  const tools = registry.toMcpTools();
  return { tools };
}

/**
 * tools/call リクエストを処理
 * 指定されたツールを実行して結果を返す
 * @param registry ツールレジストリ
 * @param params 呼び出しパラメータ
 * @returns ツール実行結果
 */
export async function handleToolsCall(
  registry: ToolRegistry,
  params: McpCallToolParams,
): Promise<McpCallToolResult> {
  const { name, arguments: args = {} } = params;
  return await registry.execute(name, args);
}

/**
 * デフォルトのツールレジストリを作成
 * meta_check, meta_generate ツールを登録済みで返す
 * @returns 設定済みのツールレジストリ
 */
export function createDefaultToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  // Phase 1 のツールを登録
  registry.register(metaCheckTool);
  registry.register(metaGenerateTool);

  // Phase 2 のツールを登録
  registry.register(elementCreateTool);
  registry.register(viewBrowserTool);
  registry.register(lspValidateTool);
  registry.register(lspFindReferencesTool);

  // Timeline ツールを登録
  registry.register(timelineCreateTool);
  registry.register(eventCreateTool);
  registry.register(eventUpdateTool);
  registry.register(timelineViewTool);
  registry.register(timelineAnalyzeTool);

  return registry;
}
