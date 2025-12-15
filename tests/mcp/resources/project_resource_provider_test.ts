/**
 * ProjectResourceProviderのテスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { ProjectResourceProvider } from "../../../src/mcp/resources/project_resource_provider.ts";
import { ok } from "../../../src/shared/result.ts";

async function createTempProject(): Promise<string> {
  const projectRoot = await Deno.makeTempDir();
  await Deno.mkdir(join(projectRoot, "src/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "src/settings"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "manuscripts"), { recursive: true });

  await Deno.writeTextFile(
    join(projectRoot, "src/characters/hero.ts"),
    `export const hero = { id: "hero", name: "勇者", displayNames: ["勇者"], summary: "概要" };`,
  );
  await Deno.writeTextFile(
    join(projectRoot, "src/settings/city.ts"),
    `export const city = { id: "city", name: "王都", displayNames: ["王都"], summary: "概要" };`,
  );
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/chapter01.md"),
    "# chapter01\n\n勇者は王都へ。",
  );

  return projectRoot;
}

Deno.test("ProjectResourceProvider: listResourcesでキャラクター/設定リソースが含まれる", async () => {
  const projectRoot = await createTempProject();
  const provider = new ProjectResourceProvider(projectRoot);

  const resources = await provider.listResources();
  const uris = resources.map((r) => r.uri);

  assertEquals(uris.includes("storyteller://characters"), true);
  assertEquals(uris.includes("storyteller://settings"), true);
  assertEquals(uris.includes("storyteller://character/hero"), true);
  assertEquals(uris.includes("storyteller://setting/city"), true);
  assertEquals(uris.includes("storyteller://project"), true);
  assertEquals(uris.includes("storyteller://project/structure"), true);
});

Deno.test("ProjectResourceProvider: characters一覧を取得できる", async () => {
  const projectRoot = await createTempProject();
  const provider = new ProjectResourceProvider(projectRoot);

  const text = await provider.readResource("storyteller://characters");
  const list = JSON.parse(text) as Array<{ id: string }>;
  assertEquals(Array.isArray(list), true);
  assertEquals(list.some((c) => c.id === "hero"), true);
});

Deno.test("ProjectResourceProvider: 個別キャラクターを取得できる", async () => {
  const projectRoot = await createTempProject();
  const provider = new ProjectResourceProvider(projectRoot);

  const text = await provider.readResource("storyteller://character/hero");
  const obj = JSON.parse(text) as { id: string; name: string };
  assertEquals(obj.id, "hero");
  assertExists(obj.name);
});

Deno.test("ProjectResourceProvider: project構造を取得できる", async () => {
  const projectRoot = await createTempProject();
  const provider = new ProjectResourceProvider(projectRoot);

  const text = await provider.readResource("storyteller://project");
  const proj = JSON.parse(text) as {
    characters: unknown[];
    settings: unknown[];
  };
  assertEquals(Array.isArray(proj.characters), true);
  assertEquals(Array.isArray(proj.settings), true);
});

Deno.test("ProjectResourceProvider: project/structure を取得できる", async () => {
  const projectRoot = await createTempProject();
  const provider = new ProjectResourceProvider(projectRoot);

  const text = await provider.readResource("storyteller://project/structure");
  const proj = JSON.parse(text) as {
    characters: unknown[];
    settings: unknown[];
  };
  assertEquals(Array.isArray(proj.characters), true);
  assertEquals(Array.isArray(proj.settings), true);
});

Deno.test("ProjectResourceProvider: analyzeProject結果をキャッシュできる（MVP）", async () => {
  let calls = 0;
  const analyzer = {
    analyzeProject: async (_projectPath: string) => {
      calls++;
      return ok({
        characters: [{
          id: "hero",
          name: "勇者",
          displayNames: ["勇者"],
          filePath: "src/characters/hero.ts",
        }],
        settings: [],
        manuscripts: [],
      });
    },
  };

  const provider = new ProjectResourceProvider(
    "/tmp/does-not-matter",
    analyzer as any,
  );
  await provider.listResources();
  await provider.listResources();

  assertEquals(calls, 1);
});
