/**
 * HtmlGenerator テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assert } from "../../asserts.ts";
import { HtmlGenerator } from "../../../src/application/view/html_generator.ts";
import type { ProjectAnalysis } from "../../../src/application/view/project_analyzer.ts";

// テスト用のモックデータ
const mockAnalysis: ProjectAnalysis = {
  characters: [
    {
      id: "hero",
      name: "勇者",
      displayNames: ["勇者", "主人公"],
      role: "protagonist",
      summary: "物語の主人公",
      filePath: "src/characters/hero.ts",
    },
    {
      id: "heroine",
      name: "ヒロイン",
      displayNames: ["ヒロイン"],
      role: "supporting",
      summary: "勇者を助ける仲間",
      filePath: "src/characters/heroine.ts",
    },
  ],
  settings: [
    {
      id: "kingdom",
      name: "王国",
      displayNames: ["王国", "城下町"],
      summary: "物語の舞台となる王国",
      filePath: "src/settings/kingdom.ts",
    },
  ],
  timelines: [],
  foreshadowings: [],
  manuscripts: [
    {
      path: "manuscripts/chapter01.md",
      title: "第1章 旅立ち",
      referencedEntities: [
        { id: "hero", kind: "character", occurrences: 3 },
        { id: "kingdom", kind: "setting", occurrences: 1 },
      ],
    },
  ],
};

Deno.test("HtmlGenerator - 基本構造", async (t) => {
  await t.step("HtmlGeneratorクラスが存在する", () => {
    const generator = new HtmlGenerator();
    assert(generator, "HtmlGeneratorクラスが存在すべき");
  });

  await t.step("generateメソッドが存在する", () => {
    const generator = new HtmlGenerator();
    assert(
      typeof generator.generate === "function",
      "generateメソッドが存在すべき",
    );
  });
});

Deno.test("HtmlGenerator - HTML生成", async (t) => {
  await t.step("スタンドアロンHTMLを返す", () => {
    const generator = new HtmlGenerator();
    const html = generator.generate(mockAnalysis);

    assert(html.includes("<!DOCTYPE html>"), "DOCTYPE宣言が含まれるべき");
    assert(html.includes("<html"), "<html>タグが含まれるべき");
    assert(html.includes("</html>"), "閉じ</html>タグが含まれるべき");
  });

  await t.step("CSSが埋め込まれている", () => {
    const generator = new HtmlGenerator();
    const html = generator.generate(mockAnalysis);

    assert(html.includes("<style>"), "インラインスタイルが含まれるべき");
    // 外部CSSリンクがないことを確認
    assert(
      !html.includes("stylesheet"),
      "外部スタイルシートへの依存がないべき",
    );
  });

  await t.step("キャラクター一覧セクションが含まれる", () => {
    const generator = new HtmlGenerator();
    const html = generator.generate(mockAnalysis);

    assert(html.includes("勇者"), "キャラクター名が含まれるべき");
    assert(html.includes("ヒロイン"), "別のキャラクター名も含まれるべき");
    assert(html.includes("protagonist"), "ロールが含まれるべき");
  });

  await t.step("設定一覧セクションが含まれる", () => {
    const generator = new HtmlGenerator();
    const html = generator.generate(mockAnalysis);

    assert(html.includes("王国"), "設定名が含まれるべき");
    assert(html.includes("城下町"), "表示名が含まれるべき");
  });

  await t.step("原稿との関連表示が含まれる", () => {
    const generator = new HtmlGenerator();
    const html = generator.generate(mockAnalysis);

    assert(html.includes("chapter01"), "原稿パスが含まれるべき");
    assert(html.includes("第1章"), "原稿タイトルが含まれるべき");
  });
});

Deno.test("HtmlGenerator - 空のデータ対応", async (t) => {
  await t.step("空のanalysisでもHTMLを生成できる", () => {
    const generator = new HtmlGenerator();
    const emptyAnalysis: ProjectAnalysis = {
      characters: [],
      settings: [],
      timelines: [],
      foreshadowings: [],
      manuscripts: [],
    };

    const html = generator.generate(emptyAnalysis);
    assert(html.includes("<!DOCTYPE html>"), "空でもHTMLを生成すべき");
  });
});
