/**
 * Foreshadowing MCP Resourceテスト（TDD Red Phase）
 */

import { assertEquals, assertExists } from "@std/assert";
import { parseResourceUri } from "@storyteller/mcp/resources/uri_parser.ts";
import { ProjectResourceProvider } from "@storyteller/mcp/resources/project_resource_provider.ts";
import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

Deno.test("parseResourceUri: foreshadowings一覧URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://foreshadowings");
  assertEquals(parsed.type, "foreshadowings");
  assertEquals(parsed.id, undefined);
});

Deno.test("parseResourceUri: 個別foreshadowing URIを解析できる", () => {
  const parsed = parseResourceUri("storyteller://foreshadowing/sword");
  assertEquals(parsed.type, "foreshadowing");
  assertEquals(parsed.id, "sword");
});

Deno.test("ProjectResourceProvider: foreshadowings一覧リソースを含む", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    // 伏線ディレクトリを作成
    const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
    await Deno.mkdir(foreshadowingsDir, { recursive: true });

    const foreshadowing: Foreshadowing = {
      id: "ancient_sword",
      name: "古びた剣",
      type: "chekhov",
      summary: "床板の下から発見される剣",
      planting: {
        chapter: "chapter_01",
        description: "剣を発見する",
      },
      status: "planted",
    };

    await Deno.writeTextFile(
      `${foreshadowingsDir}/ancient_sword.ts`,
      `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

export const ancient_sword: Foreshadowing = ${
        JSON.stringify(foreshadowing, null, 2)
      };`,
    );

    const provider = new ProjectResourceProvider(tempDir);
    const resources = await provider.listResources();

    // foreshadowings一覧リソースが含まれること
    const foreshadowingsResource = resources.find(
      (r) => r.uri === "storyteller://foreshadowings",
    );
    assertExists(
      foreshadowingsResource,
      "foreshadowings resource should exist",
    );

    // 個別foreshadowingリソースが含まれること
    const foreshadowingResource = resources.find(
      (r) => r.uri === "storyteller://foreshadowing/ancient_sword",
    );
    assertExists(
      foreshadowingResource,
      "individual foreshadowing resource should exist",
    );
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ProjectResourceProvider: foreshadowings一覧を読み取れる", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
    await Deno.mkdir(foreshadowingsDir, { recursive: true });

    const foreshadowing: Foreshadowing = {
      id: "test_foreshadowing",
      name: "テスト伏線",
      type: "mystery",
      summary: "テスト用伏線",
      planting: {
        chapter: "chapter_01",
        description: "伏線を設置",
      },
      status: "planted",
    };

    await Deno.writeTextFile(
      `${foreshadowingsDir}/test_foreshadowing.ts`,
      `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

export const test_foreshadowing: Foreshadowing = ${
        JSON.stringify(foreshadowing, null, 2)
      };`,
    );

    const provider = new ProjectResourceProvider(tempDir);
    const content = await provider.readResource("storyteller://foreshadowings");
    const foreshadowings = JSON.parse(content);

    assertEquals(Array.isArray(foreshadowings), true);
    assertEquals(foreshadowings.length >= 1, true);
    assertEquals(foreshadowings[0].id, "test_foreshadowing");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("ProjectResourceProvider: 個別foreshadowingを読み取れる", async () => {
  const tempDir = await Deno.makeTempDir();

  try {
    const foreshadowingsDir = `${tempDir}/src/foreshadowings`;
    await Deno.mkdir(foreshadowingsDir, { recursive: true });

    const foreshadowing: Foreshadowing = {
      id: "main_foreshadowing",
      name: "メイン伏線",
      type: "prophecy",
      summary: "物語の重要な伏線",
      planting: {
        chapter: "chapter_02",
        description: "予言が告げられる",
      },
      status: "resolved",
      resolutions: [
        {
          chapter: "chapter_10",
          description: "予言が成就",
          completeness: 1.0,
        },
      ],
    };

    await Deno.writeTextFile(
      `${foreshadowingsDir}/main_foreshadowing.ts`,
      `import type { Foreshadowing } from "@storyteller/types/v2/foreshadowing.ts";

export const main_foreshadowing: Foreshadowing = ${
        JSON.stringify(foreshadowing, null, 2)
      };`,
    );

    const provider = new ProjectResourceProvider(tempDir);
    const content = await provider.readResource(
      "storyteller://foreshadowing/main_foreshadowing",
    );
    const result = JSON.parse(content);

    assertEquals(result.id, "main_foreshadowing");
    assertEquals(result.name, "メイン伏線");
    assertEquals(result.status, "resolved");
    assertExists(result.resolutions);
    assertEquals(result.resolutions.length, 1);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test(
  "ProjectResourceProvider: 存在しないforeshadowingでエラーを返す",
  async () => {
    const tempDir = await Deno.makeTempDir();

    try {
      const provider = new ProjectResourceProvider(tempDir);

      let threw = false;
      try {
        await provider.readResource("storyteller://foreshadowing/nonexistent");
      } catch (e) {
        threw = true;
        assertEquals((e as Error).message.includes("not found"), true);
      }

      assertEquals(threw, true, "expected to throw");
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  },
);
