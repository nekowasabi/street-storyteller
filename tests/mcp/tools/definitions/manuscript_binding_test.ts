/**
 * manuscript_binding MCPツール テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { manuscriptBindingTool } from "../../../../src/mcp/tools/definitions/manuscript_binding.ts";
import type { ToolExecutionContext } from "../../../../src/mcp/tools/tool_registry.ts";

// テスト用のプロジェクトパス（cinderellaサンプル）
const SAMPLE_PROJECT_PATH = join(Deno.cwd(), "samples/cinderella");

// テスト用のコンテキスト
const createContext = (projectRoot?: string): ToolExecutionContext => ({
  projectRoot: projectRoot ?? SAMPLE_PROJECT_PATH,
});

Deno.test("manuscript_binding MCPツール", async (t) => {
  // ========================================
  // process4 sub1: ツール定義と基本パラメータバリデーション
  // ========================================

  await t.step("ツール名と説明が定義されている", () => {
    assertEquals(manuscriptBindingTool.name, "manuscript_binding");
    assertEquals(typeof manuscriptBindingTool.description, "string");
    assertEquals((manuscriptBindingTool.description ?? "").length > 0, true);
  });

  await t.step("必須パラメータmanuscriptが欠落時にエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        action: "add",
        entityType: "characters",
        ids: ["hero"],
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(text.includes("manuscript"), true);
  });

  await t.step("必須パラメータactionが欠落時にエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        manuscript: "manuscripts/chapter01.md",
        entityType: "characters",
        ids: ["hero"],
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(text.includes("action"), true);
  });

  await t.step("必須パラメータentityTypeが欠落時にエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        manuscript: "manuscripts/chapter01.md",
        action: "add",
        ids: ["hero"],
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(text.includes("entityType"), true);
  });

  await t.step("必須パラメータidsが欠落時にエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        manuscript: "manuscripts/chapter01.md",
        action: "add",
        entityType: "characters",
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(text.includes("ids"), true);
  });

  await t.step("不正なaction値でエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        manuscript: "manuscripts/chapter01.md",
        action: "invalid_action",
        entityType: "characters",
        ids: ["hero"],
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(text.includes("action"), true);
  });

  await t.step("不正なentityType値でエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        manuscript: "manuscripts/chapter01.md",
        action: "add",
        entityType: "invalid_type",
        ids: ["hero"],
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(text.includes("entityType"), true);
  });

  // ========================================
  // process4 sub2: ファイル読み込みとバリデーション連携
  // ========================================

  await t.step("存在しない原稿ファイルでエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        manuscript: "manuscripts/nonexistent.md",
        action: "add",
        entityType: "characters",
        ids: ["hero"],
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(
      text.includes("not found") || text.includes("見つかりません") ||
        text.includes("存在しません"),
      true,
    );
  });

  await t.step("validate=trueで存在しないIDでエラー", async () => {
    const result = await manuscriptBindingTool.execute(
      {
        manuscript: "manuscripts/chapter02.md",
        action: "add",
        entityType: "characters",
        ids: ["nonexistent_character"],
        validate: true,
      },
      createContext(),
    );

    assertEquals(result.isError, true);
    const text = (result.content[0] as { text: string }).text;
    assertEquals(
      text.includes("nonexistent_character") || text.includes("invalid") ||
        text.includes("存在しません"),
      true,
    );
  });

  await t.step(
    "validate=falseで存在しないIDでも成功（実ファイルへの書き込みテストのためスキップ）",
    () => {
      // 実際のファイルを変更するテストは統合テストで行う
      // ここでは構造のみを確認
    },
  );

  // ========================================
  // process4 sub3: FrontmatterEditor連携（モック/統合テスト）
  // ========================================

  // 実際のファイル書き込みを伴う統合テストは
  // テスト用の一時ファイルを使用して別途実装
});

// 統合テスト（一時ファイルを使用）
Deno.test("manuscript_binding MCPツール 統合テスト", async (t) => {
  const tmpDir = join(Deno.cwd(), "tmp/claude/test_project");

  // テスト用ディレクトリ作成
  await Deno.mkdir(join(tmpDir, "manuscripts"), { recursive: true });
  await Deno.mkdir(join(tmpDir, "src/characters"), { recursive: true });

  // テスト用キャラクターファイル作成
  await Deno.writeTextFile(
    join(tmpDir, "src/characters/test_hero.ts"),
    `import type { Character } from "../../../../src/type/v2/character.ts";
export const test_hero: Character = {
  id: "test_hero",
  name: "テストヒーロー",
  role: "protagonist",
  traits: [],
  relationships: {},
  appearingChapters: [],
  summary: "テスト用キャラクター"
};
`,
  );

  // テスト用原稿ファイル作成
  const testManuscriptPath = join(tmpDir, "manuscripts/test_chapter.md");
  const originalContent = `---
storyteller:
  chapter_id: test_chapter
  title: "テストチャプター"
  order: 1
---

# テスト本文
`;
  await Deno.writeTextFile(testManuscriptPath, originalContent);

  try {
    await t.step("add操作でキャラクターを追加できる", async () => {
      const result = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/test_chapter.md",
          action: "add",
          entityType: "characters",
          ids: ["test_hero"],
          validate: false, // 動的インポートを避けるためバリデーションスキップ
        },
        createContext(tmpDir),
      );

      assertEquals(result.isError, false);

      // ファイル内容を確認
      const content = await Deno.readTextFile(testManuscriptPath);
      assertEquals(content.includes("test_hero"), true);
      assertEquals(content.includes("characters:"), true);
    });

    await t.step("remove操作でキャラクターを削除できる", async () => {
      const result = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/test_chapter.md",
          action: "remove",
          entityType: "characters",
          ids: ["test_hero"],
          validate: false,
        },
        createContext(tmpDir),
      );

      assertEquals(result.isError, false);

      // ファイル内容を確認
      const content = await Deno.readTextFile(testManuscriptPath);
      // test_hero が削除されている（ただし characters: [] は残る可能性）
      const lines = content.split("\n");
      const hasTestHero = lines.some((l: string) => l.trim() === "- test_hero");
      assertEquals(hasTestHero, false);
    });

    await t.step("set操作でリストを置換できる", async () => {
      // まず追加
      await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/test_chapter.md",
          action: "add",
          entityType: "characters",
          ids: ["char_a", "char_b"],
          validate: false,
        },
        createContext(tmpDir),
      );

      // setで置換
      const result = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/test_chapter.md",
          action: "set",
          entityType: "characters",
          ids: ["char_c"],
          validate: false,
        },
        createContext(tmpDir),
      );

      assertEquals(result.isError, false);

      // ファイル内容を確認
      const content = await Deno.readTextFile(testManuscriptPath);
      assertEquals(content.includes("char_c"), true);
      // char_a, char_b は削除されている
      const lines = content.split("\n");
      const hasCharA = lines.some((l: string) => l.trim() === "- char_a");
      const hasCharB = lines.some((l: string) => l.trim() === "- char_b");
      assertEquals(hasCharA, false);
      assertEquals(hasCharB, false);
    });

    await t.step("成功時に変更内容がレスポンスに含まれる", async () => {
      // リセット
      await Deno.writeTextFile(testManuscriptPath, originalContent);

      const result = await manuscriptBindingTool.execute(
        {
          manuscript: "manuscripts/test_chapter.md",
          action: "add",
          entityType: "timeline_events",
          ids: ["event_001"],
          validate: false,
        },
        createContext(tmpDir),
      );

      assertEquals(result.isError, false);
      const text = (result.content[0] as { text: string }).text;
      // 成功メッセージに追加されたIDが含まれる
      assertEquals(
        text.includes("event_001") || text.includes("success") ||
          text.includes("成功"),
        true,
      );
    });
  } finally {
    // クリーンアップ
    try {
      await Deno.remove(tmpDir, { recursive: true });
    } catch {
      // 無視
    }
  }
});
