/**
 * リソースハンドラーのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertRejects } from "@std/assert";
import {
  handleResourcesList,
  handleResourcesRead,
} from "@storyteller/mcp/server/handlers/resources.ts";
import type { ResourceProvider } from "@storyteller/mcp/resources/resource_provider.ts";
import type { McpResource } from "@storyteller/mcp/protocol/types.ts";

class InMemoryResourceProvider implements ResourceProvider {
  constructor(
    private readonly resources: readonly McpResource[],
    private readonly byUri: ReadonlyMap<string, string>,
  ) {}

  async listResources(): Promise<McpResource[]> {
    return [...this.resources];
  }

  async readResource(uri: string): Promise<string> {
    const text = this.byUri.get(uri);
    if (text === undefined) {
      throw new Error(`Invalid URI: ${uri}`);
    }
    return text;
  }
}

Deno.test("handleResourcesList: 全リソースを返す", async () => {
  const provider = new InMemoryResourceProvider(
    [{ uri: "storyteller://characters", name: "Characters" }],
    new Map([["storyteller://characters", "[]"]]),
  );

  const resources = await handleResourcesList(provider);
  assertEquals(resources.length, 1);
  assertEquals(resources[0].uri, "storyteller://characters");
});

Deno.test("handleResourcesRead: 指定リソースを返す", async () => {
  const provider = new InMemoryResourceProvider(
    [{ uri: "storyteller://characters", name: "Characters" }],
    new Map([["storyteller://characters", '[{"id":"hero"}]']]),
  );

  const text = await handleResourcesRead(provider, "storyteller://characters");
  assertEquals(text.includes("hero"), true);
});

Deno.test("handleResourcesRead: 不正なURIでエラーを返す", async () => {
  const provider = new InMemoryResourceProvider([], new Map());

  await assertRejects(
    () => handleResourcesRead(provider, "storyteller://unknown"),
  );
});
