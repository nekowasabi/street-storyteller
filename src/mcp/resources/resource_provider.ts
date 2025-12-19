/**
 * ResourceProvider
 * MCP Resources を提供するためのインターフェース
 */

import type { McpResource } from "@storyteller/mcp/protocol/types.ts";

export interface ResourceProvider {
  listResources(): Promise<McpResource[]>;
  readResource(uri: string): Promise<string>;
}
