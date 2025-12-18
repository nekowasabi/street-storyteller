/**
 * manuscript_binding MCPツール シナリオテスト
 * 実際のファイル操作を通じて、一連のワークフローを検証する
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { manuscriptBindingTool } from "../../../../src/mcp/tools/definitions/manuscript_binding.ts";
import type { McpCallToolResult } from "../../../../src/mcp/protocol/types.ts";

/**
 * McpCallToolResultからテキストを取得するヘルパー
 */
function getResultText(result: McpCallToolResult): string {
  const content = result.content[0];
  if (content && "text" in content) {
    return content.text;
  }
  return "";
}

/**
 * テスト用プロジェクト構造を作成
 */
async function setupTestProject(
  baseDir: string,
): Promise<{ projectRoot: string; cleanup: () => Promise<void> }> {
  const projectRoot = await Deno.makeTempDir({
    dir: baseDir,
    prefix: "scenario_",
  });

  // ディレクトリ構造作成
  await Deno.mkdir(join(projectRoot, "src/characters"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "src/settings"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "src/foreshadowings"), {
    recursive: true,
  });
  await Deno.mkdir(join(projectRoot, "src/timelines"), { recursive: true });
  await Deno.mkdir(join(projectRoot, "manuscripts"), { recursive: true });

  // キャラクターファイル作成
  await Deno.writeTextFile(
    join(projectRoot, "src/characters/hero.ts"),
    `export const hero = {
  id: "hero",
  name: "勇者",
  role: "protagonist",
  traits: ["勇敢", "正義感"],
  relationships: {},
  appearingChapters: [],
  summary: "物語の主人公"
};`,
  );

  await Deno.writeTextFile(
    join(projectRoot, "src/characters/heroine.ts"),
    `export const heroine = {
  id: "heroine",
  name: "ヒロイン",
  role: "supporting",
  traits: ["優しい", "聡明"],
  relationships: {},
  appearingChapters: [],
  summary: "主人公を支える存在"
};`,
  );

  await Deno.writeTextFile(
    join(projectRoot, "src/characters/villain.ts"),
    `export const villain = {
  id: "villain",
  name: "悪役",
  role: "antagonist",
  traits: ["狡猾", "野心家"],
  relationships: {},
  appearingChapters: [],
  summary: "物語の敵対者"
};`,
  );

  // 設定ファイル作成
  await Deno.writeTextFile(
    join(projectRoot, "src/settings/castle.ts"),
    `export const castle = {
  id: "castle",
  name: "王城",
  type: "location",
  summary: "王国の中心にある城"
};`,
  );

  await Deno.writeTextFile(
    join(projectRoot, "src/settings/forest.ts"),
    `export const forest = {
  id: "forest",
  name: "深い森",
  type: "location",
  summary: "謎に満ちた森"
};`,
  );

  // 伏線ファイル作成
  await Deno.writeTextFile(
    join(projectRoot, "src/foreshadowings/ancient_sword.ts"),
    `export const ancient_sword = {
  id: "ancient_sword",
  name: "古びた剣",
  type: "chekhov",
  summary: "床板の下から見つかった剣",
  planting: { chapter: "chapter01", description: "発見される" },
  status: "planted"
};`,
  );

  // タイムラインファイル作成
  await Deno.writeTextFile(
    join(projectRoot, "src/timelines/main_story.ts"),
    `export const main_story = {
  id: "main_story",
  name: "メインストーリー",
  scope: "story",
  summary: "物語の主軸となるタイムライン",
  events: [
    { id: "evt_001", title: "旅立ち", category: "plot_point", time: { order: 1 }, summary: "冒険の始まり", characters: ["hero"], settings: ["castle"], chapters: [] },
    { id: "evt_002", title: "出会い", category: "plot_point", time: { order: 2 }, summary: "仲間との出会い", characters: ["hero", "heroine"], settings: ["forest"], chapters: [] }
  ]
};`,
  );

  // 原稿ファイル作成（基本）
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/chapter01.md"),
    `---
storyteller:
  chapter_id: chapter01
  title: "始まりの章"
  order: 1
---

# 第1章: 始まりの章

物語はここから始まる。
`,
  );

  // 原稿ファイル作成（既存のエンティティあり）
  await Deno.writeTextFile(
    join(projectRoot, "manuscripts/chapter02.md"),
    `---
storyteller:
  chapter_id: chapter02
  title: "出会いの章"
  order: 2
  characters:
    - hero
  settings:
    - castle
---

# 第2章: 出会いの章

勇者は城を出発した。
`,
  );

  const cleanup = async () => {
    try {
      await Deno.remove(projectRoot, { recursive: true });
    } catch {
      // ignore
    }
  };

  return { projectRoot, cleanup };
}

/**
 * 原稿ファイルの内容を読み取る
 */
async function readManuscript(
  projectRoot: string,
  filename: string,
): Promise<string> {
  return await Deno.readTextFile(join(projectRoot, "manuscripts", filename));
}

// =============================================================================
// シナリオテスト
// =============================================================================

Deno.test("manuscript_binding シナリオテスト", async (t) => {
  // tmp/claude ディレクトリを使用
  const tmpBase = "./tmp/claude";
  await Deno.mkdir(tmpBase, { recursive: true });

  await t.step(
    "シナリオ1: 新規原稿にキャラクターを追加するワークフロー",
    async () => {
      const { projectRoot, cleanup } = await setupTestProject(tmpBase);

      try {
        // Step 1: 空の原稿にキャラクターを追加
        // Note: テンポラリプロジェクトではTypeScript動的インポートが機能しないため、validate=falseを使用
        const result1 = await manuscriptBindingTool.execute(
          {
            manuscript: "manuscripts/chapter01.md",
            action: "add",
            entityType: "characters",
            ids: ["hero", "heroine"],
            validate: false,
          },
          { projectRoot },
        );

        assertEquals(result1.isError, false);
        assertStringIncludes(getResultText(result1), "hero");
        assertStringIncludes(getResultText(result1), "heroine");

        // ファイル内容を確認
        const content1 = await readManuscript(projectRoot, "chapter01.md");
        assertStringIncludes(content1, "characters:");
        assertStringIncludes(content1, "- hero");
        assertStringIncludes(content1, "- heroine");

        // Step 2: さらにキャラクターを追加（重複するheroも含む）
        const result2 = await manuscriptBindingTool.execute(
          {
            manuscript: "manuscripts/chapter01.md",
            action: "add",
            entityType: "characters",
            ids: ["hero", "villain"],
            validate: false,
          },
          { projectRoot },
        );

        assertEquals(result2.isError, false);

        // ファイル内容を確認（heroは重複しない）
        const content2 = await readManuscript(projectRoot, "chapter01.md");
        const heroMatches = content2.match(/- hero\n/g) || [];
        assertEquals(heroMatches.length, 1, "heroは1回だけ出現すべき");
        assertStringIncludes(content2, "- villain");

        // Step 3: 設定を追加
        const result3 = await manuscriptBindingTool.execute(
          {
            manuscript: "manuscripts/chapter01.md",
            action: "add",
            entityType: "settings",
            ids: ["castle", "forest"],
            validate: false,
          },
          { projectRoot },
        );

        assertEquals(result3.isError, false);

        const content3 = await readManuscript(projectRoot, "chapter01.md");
        assertStringIncludes(content3, "settings:");
        assertStringIncludes(content3, "- castle");
        assertStringIncludes(content3, "- forest");

        // Step 4: 伏線を追加
        const result4 = await manuscriptBindingTool.execute(
          {
            manuscript: "manuscripts/chapter01.md",
            action: "add",
            entityType: "foreshadowings",
            ids: ["ancient_sword"],
            validate: false,
          },
          { projectRoot },
        );

        assertEquals(result4.isError, false);

        const content4 = await readManuscript(projectRoot, "chapter01.md");
        assertStringIncludes(content4, "foreshadowings:");
        assertStringIncludes(content4, "- ancient_sword");
      } finally {
        await cleanup();
      }
    },
  );

  await t.step("シナリオ2: 既存エンティティの削除ワークフロー", async () => {
    const { projectRoot, cleanup } = await setupTestProject(tmpBase);

    try {
      // chapter02には既にheroとcastleがある
      const initialContent = await readManuscript(projectRoot, "chapter02.md");
      assertStringIncludes(initialContent, "- hero");
      assertStringIncludes(initialContent, "- castle");

      // Step 1: キャラクターを削除
      // Note: removeはvalidate不要（存在しないIDは無視される）
      const result1 = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter02.md",
          action: "remove",
          entityType: "characters",
          ids: ["hero"],
          validate: false,
        },
        { projectRoot },
      );

      assertEquals(result1.isError, false);

      const content1 = await readManuscript(projectRoot, "chapter02.md");
      assertEquals(content1.includes("- hero"), false, "heroは削除されるべき");

      // Step 2: 設定を削除
      const result2 = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter02.md",
          action: "remove",
          entityType: "settings",
          ids: ["castle"],
          validate: false,
        },
        { projectRoot },
      );

      assertEquals(result2.isError, false);

      const content2 = await readManuscript(projectRoot, "chapter02.md");
      assertEquals(
        content2.includes("- castle"),
        false,
        "castleは削除されるべき",
      );
    } finally {
      await cleanup();
    }
  });

  await t.step("シナリオ3: リスト完全置換ワークフロー", async () => {
    const { projectRoot, cleanup } = await setupTestProject(tmpBase);

    try {
      // chapter02には既にheroがある
      // Step 1: キャラクターを完全に置換
      const result1 = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter02.md",
          action: "set",
          entityType: "characters",
          ids: ["heroine", "villain"],
          validate: false,
        },
        { projectRoot },
      );

      assertEquals(result1.isError, false);

      const content1 = await readManuscript(projectRoot, "chapter02.md");
      // "- hero"は"- heroine"にも含まれるため、正確にマッチさせる
      const heroLineMatch = content1.match(/^\s+-\s+hero$/m);
      assertEquals(heroLineMatch, null, "heroは置換で削除されるべき");
      assertStringIncludes(content1, "- heroine");
      assertStringIncludes(content1, "- villain");
    } finally {
      await cleanup();
    }
  });

  await t.step("シナリオ4: timeline_eventsの操作", async () => {
    const { projectRoot, cleanup } = await setupTestProject(tmpBase);

    try {
      // Step 1: タイムラインイベントを追加
      const result1 = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter01.md",
          action: "add",
          entityType: "timeline_events",
          ids: ["evt_001", "evt_002"],
          validate: false,
        },
        { projectRoot },
      );

      assertEquals(result1.isError, false);

      const content1 = await readManuscript(projectRoot, "chapter01.md");
      assertStringIncludes(content1, "timeline_events:");
      assertStringIncludes(content1, "- evt_001");
      assertStringIncludes(content1, "- evt_002");

      // Step 2: 一部を削除
      const result2 = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter01.md",
          action: "remove",
          entityType: "timeline_events",
          ids: ["evt_001"],
          validate: false,
        },
        { projectRoot },
      );

      assertEquals(result2.isError, false);

      const content2 = await readManuscript(projectRoot, "chapter01.md");
      assertEquals(content2.includes("- evt_001"), false);
      assertStringIncludes(content2, "- evt_002");
    } finally {
      await cleanup();
    }
  });

  await t.step("シナリオ5: バリデーションエラーのハンドリング", async () => {
    const { projectRoot, cleanup } = await setupTestProject(tmpBase);

    try {
      // 存在しないキャラクターIDを追加しようとする（validate=true）
      const result1 = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter01.md",
          action: "add",
          entityType: "characters",
          ids: ["nonexistent_character"],
          validate: true,
        },
        { projectRoot },
      );

      assertEquals(result1.isError, true);
      assertStringIncludes(getResultText(result1), "nonexistent_character");

      // ファイルは変更されていないことを確認
      const content1 = await readManuscript(projectRoot, "chapter01.md");
      assertEquals(
        content1.includes("nonexistent_character"),
        false,
        "エラー時はファイルが変更されないべき",
      );

      // validate=falseなら追加される
      const result2 = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter01.md",
          action: "add",
          entityType: "characters",
          ids: ["custom_character"],
          validate: false,
        },
        { projectRoot },
      );

      assertEquals(result2.isError, false);

      const content2 = await readManuscript(projectRoot, "chapter01.md");
      assertStringIncludes(content2, "- custom_character");
    } finally {
      await cleanup();
    }
  });

  await t.step("シナリオ6: 複数エンティティタイプの連続操作", async () => {
    const { projectRoot, cleanup } = await setupTestProject(tmpBase);

    try {
      // 一連の操作を連続で実行
      const operations = [
        { entityType: "characters", ids: ["hero", "heroine"] },
        { entityType: "settings", ids: ["castle"] },
        { entityType: "foreshadowings", ids: ["ancient_sword"] },
        { entityType: "timeline_events", ids: ["evt_001"] },
        { entityType: "timelines", ids: ["main_story"] },
      ] as const;

      for (const op of operations) {
        const result = await manuscriptBindingTool.execute(
          {
            manuscript: "manuscripts/chapter01.md",
            action: "add",
            entityType: op.entityType,
            ids: [...op.ids],
            validate: false,
          },
          { projectRoot },
        );
        assertEquals(result.isError, false, `${op.entityType}の追加に失敗`);
      }

      // 全てのフィールドが存在することを確認
      const content = await readManuscript(projectRoot, "chapter01.md");
      assertStringIncludes(content, "characters:");
      assertStringIncludes(content, "- hero");
      assertStringIncludes(content, "- heroine");
      assertStringIncludes(content, "settings:");
      assertStringIncludes(content, "- castle");
      assertStringIncludes(content, "foreshadowings:");
      assertStringIncludes(content, "- ancient_sword");
      assertStringIncludes(content, "timeline_events:");
      assertStringIncludes(content, "- evt_001");
      assertStringIncludes(content, "timelines:");
      assertStringIncludes(content, "- main_story");
    } finally {
      await cleanup();
    }
  });

  await t.step("シナリオ7: 存在しないファイルへの操作", async () => {
    const { projectRoot, cleanup } = await setupTestProject(tmpBase);

    try {
      const result = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/nonexistent.md",
          action: "add",
          entityType: "characters",
          ids: ["hero"],
          validate: false,
        },
        { projectRoot },
      );

      assertEquals(result.isError, true);
      // 日本語エラーメッセージを期待
      assertStringIncludes(getResultText(result), "見つかりません");
    } finally {
      await cleanup();
    }
  });

  await t.step("シナリオ8: 本文が維持されることの確認", async () => {
    const { projectRoot, cleanup } = await setupTestProject(tmpBase);

    try {
      // 操作前の本文を確認
      const beforeContent = await readManuscript(projectRoot, "chapter01.md");
      assertStringIncludes(beforeContent, "# 第1章: 始まりの章");
      assertStringIncludes(beforeContent, "物語はここから始まる。");

      // キャラクターを追加
      await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/chapter01.md",
          action: "add",
          entityType: "characters",
          ids: ["hero"],
          validate: false,
        },
        { projectRoot },
      );

      // 本文が維持されていることを確認
      const afterContent = await readManuscript(projectRoot, "chapter01.md");
      assertStringIncludes(afterContent, "# 第1章: 始まりの章");
      assertStringIncludes(afterContent, "物語はここから始まる。");
      assertStringIncludes(afterContent, "- hero");
    } finally {
      await cleanup();
    }
  });
});
