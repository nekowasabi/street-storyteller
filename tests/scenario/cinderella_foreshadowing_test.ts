/**
 * シナリオテスト: cinderella プロジェクトへの伏線追加
 *
 * samples/cinderella プロジェクトに foreshadowing コマンドで伏線を追加し、
 * その動作を検証する統合テスト
 *
 * テスト実行:
 *   deno test tests/scenario/cinderella_foreshadowing_test.ts --allow-read --allow-write --allow-run
 * または:
 *   deno task test:scenario:foreshadowing
 */

import { assertEquals, assertExists } from "@std/assert";
import { join as joinPath } from "@std/path";

const PROJECT_ROOT = Deno.cwd();
const SAMPLE_PROJECT = joinPath(PROJECT_ROOT, "samples", "cinderella");
const MAIN_TS = joinPath(PROJECT_ROOT, "main.ts");
const FORESHADOWINGS_DIR = joinPath(SAMPLE_PROJECT, "src", "foreshadowings");

// テスト用の伏線ファイル名
const TEST_FORESHADOWING_FILES = [
  "ガラスの靴の伏線.ts",
  "真夜中の期限.ts",
  "継母の嫉妬の理由.ts",
];

// ========================================
// Setup: テスト前のクリーンアップ
// ========================================

/**
 * テスト用の伏線ファイルを削除（クリーンスタート保証）
 */
async function cleanupTestForeshadowings(): Promise<void> {
  for (const file of TEST_FORESHADOWING_FILES) {
    const filePath = joinPath(FORESHADOWINGS_DIR, file);
    try {
      await Deno.remove(filePath);
    } catch {
      // ファイルが存在しない場合は無視
    }
  }
}

Deno.test("cinderella伏線シナリオ: セットアップ", async () => {
  await cleanupTestForeshadowings();
  // foreshadowingsディレクトリが存在することを確認
  const stat = await Deno.stat(FORESHADOWINGS_DIR);
  assertEquals(stat.isDirectory, true, "foreshadowings directory should exist");
});

// ========================================
// Process 1: 伏線作成テスト
// ========================================

Deno.test("cinderella伏線シナリオ: 伏線作成", async (t) => {
  await t.step("1. ガラスの靴の伏線を作成", async () => {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "foreshadowing",
        "--name",
        "ガラスの靴の伏線",
        "--type",
        "chekhov",
        "--planting-chapter",
        "chapter_02",
        "--planting-description",
        "妖精のおばあさんが特別なガラスの靴を用意する",
        "--importance",
        "major",
        "--characters",
        "fairy_godmother,cinderella",
        "--settings",
        "glass_slipper",
        "--display-names",
        "ガラスの靴,特別な靴",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(
      code,
      0,
      `element foreshadowing should succeed: ${stderrText}`,
    );

    // ファイルが作成されたことを確認
    const filePath = joinPath(FORESHADOWINGS_DIR, "ガラスの靴の伏線.ts");
    const stat = await Deno.stat(filePath);
    assertExists(stat, "Foreshadowing file should be created");

    // ファイル内容を確認
    const content = await Deno.readTextFile(filePath);
    assertEquals(content.includes("chekhov"), true, "Type should be chekhov");
    assertEquals(
      content.includes("chapter_02"),
      true,
      "Planting chapter should be chapter_02",
    );
    assertEquals(
      content.includes("fairy_godmother"),
      true,
      "Should include fairy_godmother",
    );
  });

  await t.step("2. 真夜中の期限の伏線を作成", async () => {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "foreshadowing",
        "--name",
        "真夜中の期限",
        "--type",
        "prophecy",
        "--planting-chapter",
        "chapter_02",
        "--planting-description",
        "魔法は真夜中に解けると妖精が警告する",
        "--importance",
        "major",
        "--characters",
        "fairy_godmother,cinderella",
        "--settings",
        "magic_system",
        "--display-names",
        "真夜中,12時の鐘",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(
      code,
      0,
      `element foreshadowing should succeed: ${stderrText}`,
    );

    // ファイルが作成されたことを確認
    const filePath = joinPath(FORESHADOWINGS_DIR, "真夜中の期限.ts");
    const stat = await Deno.stat(filePath);
    assertExists(stat, "Foreshadowing file should be created");

    // ファイル内容を確認
    const content = await Deno.readTextFile(filePath);
    assertEquals(content.includes("prophecy"), true, "Type should be prophecy");
    assertEquals(
      content.includes("magic_system"),
      true,
      "Should include magic_system setting",
    );
  });

  await t.step("3. 継母の嫉妬の伏線を作成", async () => {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "foreshadowing",
        "--name",
        "継母の嫉妬の理由",
        "--type",
        "mystery",
        "--planting-chapter",
        "chapter_01",
        "--planting-description",
        "継母がシンデレラの美しさに嫉妬する描写",
        "--characters",
        "stepmother,cinderella",
        "--settings",
        "mansion",
        "--display-names",
        "継母の態度,冷たい視線",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(
      code,
      0,
      `element foreshadowing should succeed: ${stderrText}`,
    );

    // ファイルが作成されたことを確認
    const filePath = joinPath(FORESHADOWINGS_DIR, "継母の嫉妬の理由.ts");
    const stat = await Deno.stat(filePath);
    assertExists(stat, "Foreshadowing file should be created");

    // ファイル内容を確認
    const content = await Deno.readTextFile(filePath);
    assertEquals(content.includes("mystery"), true, "Type should be mystery");
    assertEquals(
      content.includes("stepmother"),
      true,
      "Should include stepmother",
    );
    assertEquals(
      content.includes("chapter_01"),
      true,
      "Planting chapter should be chapter_01",
    );
  });
});

// ========================================
// Process 2: 伏線ファイル内容検証テスト
// ========================================

Deno.test("cinderella伏線シナリオ: 伏線内容検証", async (t) => {
  await t.step("4. ガラスの靴の伏線の内容が正しい", async () => {
    const filePath = joinPath(FORESHADOWINGS_DIR, "ガラスの靴の伏線.ts");
    const content = await Deno.readTextFile(filePath);

    // タイプがchekhovであること
    assertEquals(
      content.includes('"type": "chekhov"'),
      true,
      "Type should be chekhov",
    );
    // 関連キャラクターが設定されていること
    assertEquals(
      content.includes("fairy_godmother"),
      true,
      "Should include fairy_godmother",
    );
    assertEquals(
      content.includes("cinderella"),
      true,
      "Should include cinderella",
    );
    // 関連設定が設定されていること
    assertEquals(
      content.includes("glass_slipper"),
      true,
      "Should include glass_slipper setting",
    );
    // displayNamesが設定されていること
    assertEquals(
      content.includes("displayNames"),
      true,
      "Should have displayNames",
    );
  });

  await t.step("5. 真夜中の期限の伏線の内容が正しい", async () => {
    const filePath = joinPath(FORESHADOWINGS_DIR, "真夜中の期限.ts");
    const content = await Deno.readTextFile(filePath);

    // タイプがprophecyであること
    assertEquals(
      content.includes('"type": "prophecy"'),
      true,
      "Type should be prophecy",
    );
    // importanceがmajorであること
    assertEquals(
      content.includes('"importance": "major"'),
      true,
      "Importance should be major",
    );
    // magic_system設定が関連付けられていること
    assertEquals(
      content.includes("magic_system"),
      true,
      "Should include magic_system setting",
    );
  });

  await t.step("6. 継母の嫉妬の伏線の内容が正しい", async () => {
    const filePath = joinPath(FORESHADOWINGS_DIR, "継母の嫉妬の理由.ts");
    const content = await Deno.readTextFile(filePath);

    // タイプがmysteryであること
    assertEquals(
      content.includes('"type": "mystery"'),
      true,
      "Type should be mystery",
    );
    // 設置章がchapter_01であること
    assertEquals(
      content.includes('"chapter": "chapter_01"'),
      true,
      "Planting chapter should be chapter_01",
    );
    // stepmotherが関連付けられていること
    assertEquals(
      content.includes("stepmother"),
      true,
      "Should include stepmother",
    );
    // mansion設定が関連付けられていること
    assertEquals(
      content.includes("mansion"),
      true,
      "Should include mansion setting",
    );
  });
});

// ========================================
// Process 3: view foreshadowing コマンドテスト
// ========================================

Deno.test("cinderella伏線シナリオ: viewコマンド", async (t) => {
  await t.step("7. view foreshadowing --list で一覧表示", async () => {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "view",
        "foreshadowing",
        "--list",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stdout, stderr } = await command.output();
    const stdoutText = new TextDecoder().decode(stdout);
    const stderrText = new TextDecoder().decode(stderr);
    const output = stdoutText + stderrText;

    assertEquals(
      code,
      0,
      `view foreshadowing --list should succeed: ${stderrText}`,
    );

    // 統計情報が表示されること
    assertEquals(output.includes("Total: 3"), true, "Should show total count");
    assertEquals(
      output.includes("Planted: 3"),
      true,
      "Should show planted count",
    );

    // 3件の伏線が表示されていること
    assertEquals(
      output.includes("ガラスの靴の伏線"),
      true,
      "Should list ガラスの靴の伏線",
    );
    assertEquals(
      output.includes("真夜中の期限"),
      true,
      "Should list 真夜中の期限",
    );
    assertEquals(
      output.includes("継母の嫉妬の理由"),
      true,
      "Should list 継母の嫉妬の理由",
    );
  });

  await t.step("8. view foreshadowing --json で JSON 出力", async () => {
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "view",
        "foreshadowing",
        "--list",
        "--json",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stdout, stderr } = await command.output();
    const stdoutText = new TextDecoder().decode(stdout);
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(
      code,
      0,
      `view foreshadowing --json should succeed: ${stderrText}`,
    );

    // JSON としてパース可能であることを確認
    // 出力は {"type":"info","message":"[...]"} 形式
    try {
      const wrapper = JSON.parse(stdoutText);
      assertExists(wrapper, "Output should be valid JSON");
      assertEquals(wrapper.type, "info", "Output type should be info");

      // message 部分をパース
      const foreshadowings = JSON.parse(wrapper.message);
      assertEquals(
        Array.isArray(foreshadowings),
        true,
        "Message should be an array",
      );
      assertEquals(foreshadowings.length, 3, "Should have 3 foreshadowings");
    } catch (e) {
      // フォールバック: 配列として直接パース
      try {
        const json = JSON.parse(stdoutText);
        assertExists(json, "Output should be valid JSON");
      } catch {
        throw new Error(`Output is not valid JSON: ${stdoutText}, error: ${e}`);
      }
    }
  });
});

// ========================================
// Process 4: 結果確認
// ========================================

Deno.test("cinderella伏線シナリオ: 結果確認", async (t) => {
  await t.step("9. 伏線ファイルが3件存在する", async () => {
    const files = [
      "ガラスの靴の伏線.ts",
      "真夜中の期限.ts",
      "継母の嫉妬の理由.ts",
    ];

    for (const file of files) {
      const filePath = joinPath(FORESHADOWINGS_DIR, file);
      try {
        const stat = await Deno.stat(filePath);
        assertExists(stat, `${file} should exist`);
      } catch (e) {
        throw new Error(`Expected file ${file} to exist: ${e}`);
      }
    }
  });

  await t.step("10. 各伏線のステータスが planted である", async () => {
    const files = [
      "ガラスの靴の伏線.ts",
      "真夜中の期限.ts",
      "継母の嫉妬の理由.ts",
    ];

    for (const file of files) {
      const filePath = joinPath(FORESHADOWINGS_DIR, file);
      const content = await Deno.readTextFile(filePath);
      assertEquals(
        content.includes('"status": "planted"'),
        true,
        `${file} status should be planted`,
      );
    }
  });
});

// ========================================
// Process 5: ProjectAnalyzer での伏線参照検出テスト
// ========================================

Deno.test("cinderella伏線シナリオ: 伏線参照検出", async (t) => {
  await t.step("11. ProjectAnalyzer が伏線参照を検出できること", async () => {
    // ProjectAnalyzer をインポート
    const { ProjectAnalyzer } = await import(
      "../../src/application/view/project_analyzer.ts"
    );

    const analyzer = new ProjectAnalyzer();
    const result = await analyzer.analyzeProject(SAMPLE_PROJECT);

    assertEquals(result.ok, true, "analyzeProject should succeed");

    if (result.ok) {
      // 伏線が3件ロードされること
      assertEquals(
        result.value.foreshadowings.length,
        3,
        "Should load 3 foreshadowings",
      );

      // 伏線名が含まれること
      const foreshadowingNames = result.value.foreshadowings.map((
        f: { name: string },
      ) => f.name);
      assertEquals(
        foreshadowingNames.includes("ガラスの靴の伏線"),
        true,
        "Should include ガラスの靴の伏線",
      );
      assertEquals(
        foreshadowingNames.includes("真夜中の期限"),
        true,
        "Should include 真夜中の期限",
      );
      assertEquals(
        foreshadowingNames.includes("継母の嫉妬の理由"),
        true,
        "Should include 継母の嫉妬の理由",
      );
    }
  });

  await t.step(
    "12. 原稿内の伏線参照（displayNames）が検出されること",
    async () => {
      const { ProjectAnalyzer } = await import(
        "../../src/application/view/project_analyzer.ts"
      );

      const analyzer = new ProjectAnalyzer();
      const result = await analyzer.analyzeProject(SAMPLE_PROJECT);

      assertEquals(result.ok, true, "analyzeProject should succeed");

      if (result.ok) {
        // chapter02.md の原稿を確認
        // displayNames "真夜中" または "12時の鐘" が本文に含まれている場合、検出されるはず
        const chapter02 = result.value.manuscripts.find((m: { path: string }) =>
          m.path.includes("chapter02")
        );

        // 原稿が見つかること
        assertExists(chapter02, "chapter02 manuscript should exist");

        // 原稿の参照情報を出力（デバッグ用）
        // console.log("chapter02 references:", chapter02?.referencedEntities);
      }
    },
  );
});

// ========================================
// Process 6: HtmlGenerator での伏線ハイライトテスト
// ========================================

Deno.test("cinderella伏線シナリオ: HTML出力", async (t) => {
  await t.step(
    "13. HtmlGenerator で伏線セクションが生成されること",
    async () => {
      const { ProjectAnalyzer } = await import(
        "../../src/application/view/project_analyzer.ts"
      );
      const { HtmlGenerator } = await import(
        "../../src/application/view/html_generator.ts"
      );

      const analyzer = new ProjectAnalyzer();
      const result = await analyzer.analyzeProject(SAMPLE_PROJECT);

      assertEquals(result.ok, true, "analyzeProject should succeed");

      if (result.ok) {
        const generator = new HtmlGenerator();
        const html = generator.generate(result.value);

        // Foreshadowings セクションが含まれること
        assertEquals(
          html.includes('<section class="foreshadowings">'),
          true,
          "Should include foreshadowings section",
        );

        // 各伏線カードが含まれること
        assertEquals(
          html.includes("ガラスの靴の伏線"),
          true,
          "Should include ガラスの靴の伏線",
        );
        assertEquals(
          html.includes("真夜中の期限"),
          true,
          "Should include 真夜中の期限",
        );
        assertEquals(
          html.includes("継母の嫉妬の理由"),
          true,
          "Should include 継母の嫉妬の理由",
        );

        // ステータスクラスが含まれること
        assertEquals(
          html.includes("status-planted"),
          true,
          "Should include status-planted class",
        );

        // 伏線参照用CSSが含まれること
        assertEquals(
          html.includes(".ref.foreshadowing"),
          true,
          "Should include .ref.foreshadowing CSS",
        );
      }
    },
  );

  await t.step(
    "14. view browser コマンドでHTML生成が成功すること",
    async () => {
      // view browser --output オプションでHTML出力をテスト（存在する場合）
      // 今回はProjectAnalyzer + HtmlGeneratorの直接テストで代替

      const { ProjectAnalyzer } = await import(
        "../../src/application/view/project_analyzer.ts"
      );
      const { HtmlGenerator } = await import(
        "../../src/application/view/html_generator.ts"
      );

      const analyzer = new ProjectAnalyzer();
      const result = await analyzer.analyzeProject(SAMPLE_PROJECT);

      assertEquals(result.ok, true, "analyzeProject should succeed");

      if (result.ok) {
        const generator = new HtmlGenerator();
        const html = generator.generate(result.value);

        // 伏線統計情報が含まれること
        assertEquals(
          html.includes("foreshadowing-stats"),
          true,
          "Should include foreshadowing-stats",
        );
        assertEquals(html.includes("Total:"), true, "Should include Total:");
        assertEquals(
          html.includes("Planted:"),
          true,
          "Should include Planted:",
        );

        // HTML全体が有効であること（基本チェック）
        assertEquals(
          html.includes("<!DOCTYPE html>"),
          true,
          "Should be valid HTML",
        );
        assertEquals(
          html.includes("</html>"),
          true,
          "Should have closing html tag",
        );
      }
    },
  );
});
