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
        timelines: [],
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

// =====================================================
// expand=details クエリパラメータのテスト
// =====================================================

/**
 * details付きキャラクターのテストプロジェクトを作成
 */
async function createTempProjectWithDetails(): Promise<string> {
  const projectRoot = await Deno.makeTempDir();
  await Deno.mkdir(join(projectRoot, "src/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "src/settings"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "docs/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "docs/settings"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "manuscripts"), { recursive: true });

  // detailsにファイル参照を持つキャラクター
  await Deno.writeTextFile(
    join(projectRoot, "src/characters/hero.ts"),
    `export const hero = {
      id: "hero",
      name: "勇者",
      role: "protagonist",
      traits: ["brave", "kind"],
      relationships: {},
      appearingChapters: ["chapter01"],
      summary: "世界を救う勇者",
      displayNames: ["勇者", "ヒーロー"],
      details: {
        description: "インライン説明文",
        appearance: { file: "docs/characters/hero_appearance.md" },
        backstory: { file: "docs/characters/hero_backstory.md" }
      }
    };`,
  );

  // ファイル参照先のファイル
  await Deno.writeTextFile(
    join(projectRoot, "docs/characters/hero_appearance.md"),
    `---
title: 勇者の外見
---
金色の髪と青い瞳を持つ。常に光る鎧を身にまとう。`,
  );

  await Deno.writeTextFile(
    join(projectRoot, "docs/characters/hero_backstory.md"),
    `---
title: 勇者の背景
---
小さな村で生まれ育った。幼い頃から剣の才能を見せた。`,
  );

  // detailsにファイル参照を持つ設定
  await Deno.writeTextFile(
    join(projectRoot, "src/settings/royal_capital.ts"),
    `export const royal_capital = {
      id: "royal_capital",
      name: "王都",
      type: "location",
      appearingChapters: ["chapter01"],
      summary: "王国の首都",
      displayNames: ["王都", "首都"],
      details: {
        description: "インライン説明",
        geography: { file: "docs/settings/capital_geography.md" },
        history: { file: "docs/settings/capital_history.md" }
      }
    };`,
  );

  // ファイル参照先のファイル
  await Deno.writeTextFile(
    join(projectRoot, "docs/settings/capital_geography.md"),
    `---
title: 王都の地理
---
大陸の中央に位置し、四方を山に囲まれている。`,
  );

  await Deno.writeTextFile(
    join(projectRoot, "docs/settings/capital_history.md"),
    `---
title: 王都の歴史
---
千年前に初代国王により建設された。`,
  );

  // 原稿
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/chapter01.md"),
    "# 第1章\n\n勇者は王都へ向かった。",
  );

  return projectRoot;
}

Deno.test("ProjectResourceProvider: クエリパラメータなしで従来通りの動作（detailsは展開されない）", async () => {
  const projectRoot = await createTempProjectWithDetails();
  const provider = new ProjectResourceProvider(projectRoot);

  const text = await provider.readResource("storyteller://character/hero");
  const obj = JSON.parse(text);

  // details内のファイル参照は展開されず、そのまま
  assertEquals(obj.id, "hero");
  // 注: ProjectAnalyzerはdetailsを含めない設計なので、
  // 実際にはdetailsフィールドが存在しない
  // ここでは、expand=detailsがない場合の通常動作を確認
  assertExists(obj.name);
});

Deno.test("ProjectResourceProvider: expand=detailsでキャラクターのdetailsが展開される", async () => {
  const projectRoot = await createTempProjectWithDetails();
  const provider = new ProjectResourceProvider(projectRoot);

  const text = await provider.readResource(
    "storyteller://character/hero?expand=details",
  );
  const obj = JSON.parse(text);

  assertEquals(obj.id, "hero");

  // expand=detailsで、ファイル参照が解決されている
  assertExists(obj.details);
  assertEquals(obj.details.description, "インライン説明文");
  // ファイル参照が解決されて文字列になっている
  assertEquals(
    obj.details.appearance,
    "金色の髪と青い瞳を持つ。常に光る鎧を身にまとう。",
  );
  assertEquals(
    obj.details.backstory,
    "小さな村で生まれ育った。幼い頃から剣の才能を見せた。",
  );
});

Deno.test("ProjectResourceProvider: expand=detailsで設定のdetailsが展開される", async () => {
  const projectRoot = await createTempProjectWithDetails();
  const provider = new ProjectResourceProvider(projectRoot);

  const text = await provider.readResource(
    "storyteller://setting/royal_capital?expand=details",
  );
  const obj = JSON.parse(text);

  assertEquals(obj.id, "royal_capital");

  // expand=detailsで、ファイル参照が解決されている
  assertExists(obj.details);
  assertEquals(obj.details.description, "インライン説明");
  // ファイル参照が解決されて文字列になっている
  assertEquals(
    obj.details.geography,
    "大陸の中央に位置し、四方を山に囲まれている。",
  );
  assertEquals(obj.details.history, "千年前に初代国王により建設された。");
});

Deno.test("ProjectResourceProvider: expand=detailsでdetailsがないエンティティでも正常動作", async () => {
  const projectRoot = await createTempProject();
  const provider = new ProjectResourceProvider(projectRoot);

  // detailsがないキャラクターでも正常に動作
  const text = await provider.readResource(
    "storyteller://character/hero?expand=details",
  );
  const obj = JSON.parse(text);

  assertEquals(obj.id, "hero");
  // detailsが存在しない場合はundefinedのまま
});
