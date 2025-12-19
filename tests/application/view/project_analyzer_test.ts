/**
 * ProjectAnalyzer テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assert, assertEquals } from "../../asserts.ts";
import { ProjectAnalyzer } from "@storyteller/application/view/project_analyzer.ts";

Deno.test("ProjectAnalyzer - 基本構造", async (t) => {
  await t.step("ProjectAnalyzerクラスが存在する", () => {
    const analyzer = new ProjectAnalyzer();
    assert(analyzer, "ProjectAnalyzerクラスが存在すべき");
  });

  await t.step("analyzeProjectメソッドが存在する", () => {
    const analyzer = new ProjectAnalyzer();
    assert(
      typeof analyzer.analyzeProject === "function",
      "analyzeProjectメソッドが存在すべき",
    );
  });
});

Deno.test("ProjectAnalyzer - プロジェクト解析", async (t) => {
  // テスト用の一時プロジェクトを作成
  const tmpDir = await Deno.makeTempDir();

  // 基本的なプロジェクト構造を作成
  await Deno.mkdir(`${tmpDir}/src/characters`, { recursive: true });
  await Deno.mkdir(`${tmpDir}/src/settings`, { recursive: true });
  await Deno.mkdir(`${tmpDir}/manuscripts`, { recursive: true });

  // キャラクターファイルを作成
  await Deno.writeTextFile(
    `${tmpDir}/src/characters/hero.ts`,
    `
export const hero = {
  id: "hero",
  name: "勇者",
  displayNames: ["勇者", "主人公"],
  role: "protagonist",
  summary: "物語の主人公",
};
`,
  );

  await Deno.writeTextFile(
    `${tmpDir}/src/characters/heroine.ts`,
    `
export const heroine = {
  id: "heroine",
  name: "ヒロイン",
  displayNames: ["ヒロイン"],
  role: "supporting",
  summary: "勇者を助ける仲間",
};
`,
  );

  // 設定ファイルを作成
  await Deno.writeTextFile(
    `${tmpDir}/src/settings/kingdom.ts`,
    `
export const kingdom = {
  id: "kingdom",
  name: "王国",
  displayNames: ["王国", "城下町"],
  summary: "物語の舞台となる王国",
};
`,
  );

  // 原稿ファイルを作成
  await Deno.writeTextFile(
    `${tmpDir}/manuscripts/chapter01.md`,
    `---
title: 第1章 旅立ち
characters:
  - hero
settings:
  - kingdom
---

# 第1章 旅立ち

勇者は王国の城門から旅立った。ヒロインは勇者の後を追いかけた。
`,
  );

  await t.step("キャラクター一覧を取得できる", async () => {
    const analyzer = new ProjectAnalyzer();
    const result = await analyzer.analyzeProject(tmpDir);

    assert(
      result.ok,
      `解析が成功すべき: ${!result.ok ? JSON.stringify(result.error) : ""}`,
    );
    if (!result.ok) return;

    assert(result.value.characters, "charactersが存在すべき");
    assertEquals(
      result.value.characters.length,
      2,
      "2人のキャラクターが検出されるべき",
    );

    const heroChar = result.value.characters.find((c) => c.id === "hero");
    assert(heroChar, "heroキャラクターが見つかるべき");
    assertEquals(heroChar.name, "勇者");
  });

  await t.step("設定一覧を取得できる", async () => {
    const analyzer = new ProjectAnalyzer();
    const result = await analyzer.analyzeProject(tmpDir);

    assert(result.ok);
    if (!result.ok) return;

    assert(result.value.settings, "settingsが存在すべき");
    assertEquals(result.value.settings.length, 1, "1つの設定が検出されるべき");

    const kingdomSetting = result.value.settings.find((s) =>
      s.id === "kingdom"
    );
    assert(kingdomSetting, "kingdom設定が見つかるべき");
    assertEquals(kingdomSetting.name, "王国");
  });

  await t.step("原稿ファイル一覧を取得できる", async () => {
    const analyzer = new ProjectAnalyzer();
    const result = await analyzer.analyzeProject(tmpDir);

    assert(result.ok);
    if (!result.ok) return;

    assert(result.value.manuscripts, "manuscriptsが存在すべき");
    assert(
      result.value.manuscripts.length >= 1,
      "最低1つの原稿が検出されるべき",
    );

    const chapter01 = result.value.manuscripts.find((m) =>
      m.path.includes("chapter01")
    );
    assert(chapter01, "chapter01.mdが見つかるべき");
  });

  await t.step("各原稿に含まれるエンティティ参照を解析できる", async () => {
    const analyzer = new ProjectAnalyzer();
    const result = await analyzer.analyzeProject(tmpDir);

    assert(result.ok);
    if (!result.ok) return;

    const chapter01 = result.value.manuscripts.find((m) =>
      m.path.includes("chapter01")
    );
    assert(chapter01, "chapter01.mdが見つかるべき");
    assert(chapter01.referencedEntities, "referencedEntitiesが存在すべき");

    // 勇者への参照があるか確認
    const heroRef = chapter01.referencedEntities.find((r) => r.id === "hero");
    assert(heroRef, "勇者への参照が検出されるべき");
  });

  // クリーンアップ
  await Deno.remove(tmpDir, { recursive: true });
});

Deno.test("ProjectAnalyzer - エラーハンドリング", async (t) => {
  await t.step("存在しないディレクトリでエラーを返す", async () => {
    const analyzer = new ProjectAnalyzer();
    const result = await analyzer.analyzeProject("/nonexistent/path");

    // 存在しないパスの場合、空の結果またはエラーを返す
    if (result.ok) {
      // 空の結果として処理される場合
      assertEquals(result.value.characters.length, 0);
      assertEquals(result.value.settings.length, 0);
    }
    // エラーが返される場合も許容
  });
});
