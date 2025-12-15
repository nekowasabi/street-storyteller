/**
 * ResourceProviderのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import type { ResourceProvider } from "../../../src/mcp/resources/resource_provider.ts";
import type { McpResource } from "../../../src/mcp/protocol/types.ts";

class InMemoryResourceProvider implements ResourceProvider {
  constructor(
    private readonly resources: readonly McpResource[],
    private readonly byUri: ReadonlyMap<string, string>,
  ) {}

  async listResources(): Promise<McpResource[]> {
    return [...this.resources];
  }

  async readResource(uri: string): Promise<string> {
    const value = this.byUri.get(uri);
    if (value === undefined) {
      throw new Error(`Not found: ${uri}`);
    }
    return value;
  }
}

Deno.test("ResourceProvider: listResources()が全リソースを返す", async () => {
  const provider = new InMemoryResourceProvider(
    [
      { uri: "storyteller://characters", name: "Characters" },
      { uri: "storyteller://settings", name: "Settings" },
    ],
    new Map(),
  );

  const resources = await provider.listResources();
  assertEquals(resources.length, 2);
});

Deno.test("ResourceProvider: readResource()が指定URIの内容を返す", async () => {
  const byUri = new Map<string, string>([
    ["storyteller://characters", '[{"id":"hero"}]'],
  ]);
  const provider = new InMemoryResourceProvider(
    [{ uri: "storyteller://characters", name: "Characters" }],
    byUri,
  );

  const text = await provider.readResource("storyteller://characters");
  assertExists(text);
  assertEquals(text.includes("hero"), true);
});
