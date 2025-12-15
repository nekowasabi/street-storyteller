/**
 * MCPツールレジストリ
 * ツールの登録・検索・実行を管理
 */

import type {
  McpCallToolResult,
  McpInputSchema,
  McpTool,
  McpToolResultContent,
} from "../protocol/types.ts";

/**
 * ツール実行関数の型
 */
export type ToolExecuteFunction = (
  args: Record<string, unknown>,
) => Promise<McpCallToolResult>;

/**
 * MCPツール定義（実行関数を含む）
 */
export type McpToolDefinition = {
  /** ツール名 */
  readonly name: string;
  /** ツールの説明 */
  readonly description?: string;
  /** 入力パラメータのJSONスキーマ */
  readonly inputSchema: McpInputSchema;
  /** ツール実行関数 */
  readonly execute: ToolExecuteFunction;
};

/**
 * ツールレジストリクラス
 * ツールの登録・検索・実行を管理する
 */
export class ToolRegistry {
  private readonly tools: Map<string, McpToolDefinition> = new Map();

  /**
   * ツールを登録する
   * @param tool 登録するツール定義
   */
  register(tool: McpToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * ツールを取得する
   * @param name ツール名
   * @returns ツール定義、未登録の場合はundefined
   */
  get(name: string): McpToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * すべてのツール定義を取得する
   * @returns ツール定義の配列
   */
  listTools(): McpToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * ツールを実行する
   * @param name ツール名
   * @param args ツールに渡す引数
   * @returns 実行結果
   */
  async execute(
    name: string,
    args: Record<string, unknown>,
  ): Promise<McpCallToolResult> {
    const tool = this.tools.get(name);

    if (!tool) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Tool not found: ${name}`,
          } as McpToolResultContent,
        ],
        isError: true,
      };
    }

    try {
      return await tool.execute(args);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error executing tool ${name}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          } as McpToolResultContent,
        ],
        isError: true,
      };
    }
  }

  /**
   * MCP形式のツール配列に変換する
   * execute関数を除外したMcpTool[]を返す
   * @returns MCP形式のツール配列
   */
  toMcpTools(): McpTool[] {
    return this.listTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }
}
