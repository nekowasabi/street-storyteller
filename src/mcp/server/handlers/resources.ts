/**
 * MCPリソースハンドラー
 * resources/list, resources/read の処理
 */

import type { McpResource } from "../../protocol/types.ts";
import type { ResourceProvider } from "../../resources/resource_provider.ts";

/**
 * resources/list を処理
 */
export async function handleResourcesList(
  provider: ResourceProvider,
): Promise<McpResource[]> {
  return await provider.listResources();
}

/**
 * resources/read を処理
 */
export async function handleResourcesRead(
  provider: ResourceProvider,
  uri: string,
): Promise<string> {
  return await provider.readResource(uri);
}
