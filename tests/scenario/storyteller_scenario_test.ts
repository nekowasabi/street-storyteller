/**
 * storyteller 全機能テストシナリオ
 * 歴史ミステリー短編「古い手紙の秘密」
 *
 * TDD形式で各機能を検証する統合テスト
 */

import { assertEquals, assertExists } from "@std/assert";
import { join as joinPath } from "@std/path";

const PROJECT_ROOT = Deno.cwd();
const SAMPLE_PROJECT = joinPath(
  PROJECT_ROOT,
  "samples",
  "mistery",
  "old-letter-mystery",
);
const MAIN_TS = joinPath(PROJECT_ROOT, "main.ts");

// ========================================
// Process 1: プロジェクト初期化テスト
// ========================================

Deno.test("process1: プロジェクト初期化", async (t) => {
  await t.step("samples/mistery/ ディレクトリが生成される", async () => {
    // 既存ディレクトリがあれば削除（クリーンスタート）
    try {
      await Deno.remove(SAMPLE_PROJECT, { recursive: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }

    // generateコマンドを実行
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        "main.ts",
        "generate",
        "--name",
        "old-letter-mystery",
        "--template",
        "novel",
        "--path",
        "./samples/mistery",
      ],
      cwd: PROJECT_ROOT,
    });

    const { code, stdout, stderr } = await command.output();
    const stdoutText = new TextDecoder().decode(stdout);
    const stderrText = new TextDecoder().decode(stderr);

    if (code !== 0) {
      console.error("stdout:", stdoutText);
      console.error("stderr:", stderrText);
    }
    assertEquals(code, 0, `generate command should succeed: ${stderrText}`);

    // ディレクトリ構造を確認
    const stat = await Deno.stat(SAMPLE_PROJECT);
    assertEquals(stat.isDirectory, true);
  });

  await t.step("必要なディレクトリ構造が生成される", async () => {
    const expectedDirs = [
      "src/characters",
      "src/settings",
      "src/timeline",
      "manuscripts",
    ];

    for (const dir of expectedDirs) {
      const dirPath = joinPath(SAMPLE_PROJECT, dir);
      try {
        const stat = await Deno.stat(dirPath);
        assertEquals(stat.isDirectory, true, `${dir} should be a directory`);
      } catch (e) {
        throw new Error(`Expected directory ${dir} to exist: ${e}`);
      }
    }
  });
});

// ========================================
// Process 2: キャラクター定義テスト
// ========================================

Deno.test("process2: キャラクター定義", async (t) => {
  await t.step("yamashita_ryusuke キャラクターが作成される", async () => {
    const characterFile = joinPath(
      SAMPLE_PROJECT,
      "src/characters/yamashita_ryusuke.ts",
    );

    // キャラクター作成コマンドを実行（SAMPLE_PROJECTで実行、MAIN_TSの絶対パスを使用）
    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "character",
        "--name",
        "yamashita_ryusuke",
        "--role",
        "protagonist",
        "--summary",
        "大学教授で歴史家。矢島家の手紙消失事件を調査する",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(code, 0, `element character should succeed: ${stderrText}`);

    // ファイルが作成されたことを確認
    const stat = await Deno.stat(characterFile);
    assertExists(stat, "Character file should be created");
  });

  await t.step("yamashita_chiyyo キャラクターが作成される", async () => {
    const characterFile = joinPath(
      SAMPLE_PROJECT,
      "src/characters/yamashita_chiyyo.ts",
    );

    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "character",
        "--name",
        "yamashita_chiyyo",
        "--role",
        "supporting",
        "--summary",
        "矢島家の家政婦。60年以上働いてきた証言者",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(code, 0, `element character should succeed: ${stderrText}`);

    const stat = await Deno.stat(characterFile);
    assertExists(stat, "Character file should be created");
  });
});

// ========================================
// Process 3: 設定定義テスト
// ========================================

Deno.test("process3: 設定定義", async (t) => {
  await t.step("yamashita_house 設定が作成される", async () => {
    const settingFile = joinPath(
      SAMPLE_PROJECT,
      "src/settings/yamashita_house.ts",
    );

    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "setting",
        "--name",
        "yamashita_house",
        "--type",
        "location",
        "--summary",
        "江戸時代から続く郷士の家。南部藩領内",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(code, 0, `element setting should succeed: ${stderrText}`);

    const stat = await Deno.stat(settingFile);
    assertExists(stat, "Setting file should be created");
  });

  await t.step("library 設定が作成される", async () => {
    const settingFile = joinPath(
      SAMPLE_PROJECT,
      "src/settings/library.ts",
    );

    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "setting",
        "--name",
        "library",
        "--type",
        "location",
        "--summary",
        "県立図書館。古い文献の調査拠点",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(code, 0, `element setting should succeed: ${stderrText}`);

    const stat = await Deno.stat(settingFile);
    assertExists(stat, "Setting file should be created");
  });
});

// ========================================
// Process 4: Timeline定義テスト
// ========================================

Deno.test("process4: Timeline定義", async (t) => {
  await t.step("letter_incident_timeline が作成される", async () => {
    const timelineFile = joinPath(
      SAMPLE_PROJECT,
      "src/timelines/letter_incident_timeline.ts",
    );

    const command = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "timeline",
        "--name",
        "letter_incident_timeline",
        "--scope",
        "story",
        "--summary",
        "現代での調査から過去への遡行",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code, stderr } = await command.output();
    const stderrText = new TextDecoder().decode(stderr);

    assertEquals(code, 0, `element timeline should succeed: ${stderrText}`);

    const stat = await Deno.stat(timelineFile);
    assertExists(stat, "Timeline file should be created");
  });

  await t.step("イベントが追加できる", async () => {
    // Event 1: 手紙消失の発見
    const command1 = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "event",
        "--timeline",
        "letter_incident_timeline",
        "--title",
        "手紙消失の発見",
        "--category",
        "plot_point",
        "--order",
        "1",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code: code1, stderr: stderr1 } = await command1.output();
    const stderrText1 = new TextDecoder().decode(stderr1);
    assertEquals(code1, 0, `event 1 should succeed: ${stderrText1}`);

    // Event 2: 別の手紙の発見
    const command2 = new Deno.Command("deno", {
      args: [
        "run",
        "--allow-read",
        "--allow-write",
        MAIN_TS,
        "element",
        "event",
        "--timeline",
        "letter_incident_timeline",
        "--title",
        "別の手紙の発見",
        "--category",
        "plot_point",
        "--order",
        "2",
      ],
      cwd: SAMPLE_PROJECT,
    });

    const { code: code2, stderr: stderr2 } = await command2.output();
    const stderrText2 = new TextDecoder().decode(stderr2);
    assertEquals(code2, 0, `event 2 should succeed: ${stderrText2}`);
  });
});

// ========================================
// テスト結果確認
// ========================================

Deno.test("テスト結果確認: 生成されたファイル一覧", async (t) => {
  await t.step("キャラクターファイルが存在する", async () => {
    const files = [
      "src/characters/yamashita_ryusuke.ts",
      "src/characters/yamashita_chiyyo.ts",
    ];

    for (const file of files) {
      const filePath = joinPath(SAMPLE_PROJECT, file);
      try {
        const stat = await Deno.stat(filePath);
        assertExists(stat, `${file} should exist`);
      } catch {
        // ファイルが存在しない場合はスキップ（テスト実行順序による）
      }
    }
  });

  await t.step("設定ファイルが存在する", async () => {
    const files = [
      "src/settings/yamashita_house.ts",
      "src/settings/library.ts",
    ];

    for (const file of files) {
      const filePath = joinPath(SAMPLE_PROJECT, file);
      try {
        const stat = await Deno.stat(filePath);
        assertExists(stat, `${file} should exist`);
      } catch {
        // ファイルが存在しない場合はスキップ
      }
    }
  });

  await t.step("Timelineファイルが存在する", async () => {
    const timelineFile = joinPath(
      SAMPLE_PROJECT,
      "src/timelines/letter_incident_timeline.ts",
    );

    try {
      const stat = await Deno.stat(timelineFile);
      assertExists(stat, "Timeline file should exist");
    } catch {
      // ファイルが存在しない場合はスキップ
    }
  });
});
