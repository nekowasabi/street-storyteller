/**
 * LSP Validate Command テスト
 * TDD: ワンショット検証コマンドのテスト
 */
import { assert, assertEquals, createStubLogger } from "../asserts.ts";
import { assertExists } from "@std/assert";
import type { CommandContext } from "@storyteller/cli/types.ts";
import {
  computeConfidenceSummary,
  LspValidateCommand,
} from "@storyteller/cli/modules/lsp/validate.ts";
import type {
  ConfidenceSummary,
  DiagnosticOutput,
} from "@storyteller/cli/modules/lsp/validate.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type { DetectableEntity } from "@storyteller/lsp/detection/positioned_detector.ts";

function createTestContext(
  args: Record<string, unknown>,
  messages: { info: string[]; error: string[]; success: string[] } = {
    info: [],
    error: [],
    success: [],
  },
): CommandContext {
  return {
    args,
    logger: createStubLogger(),
    presenter: {
      showInfo: (msg: string) => messages.info.push(msg),
      showSuccess: (msg: string) => messages.success.push(msg),
      showWarning: () => {},
      showError: (msg: string) => messages.error.push(msg),
    },
    config: {
      resolve: async () => ({
        runtime: { environment: "test", paths: {} },
        logging: {
          level: "info",
          format: "human",
          color: false,
          timestamps: false,
        },
        features: {},
        cache: { defaultTtlSeconds: 900 },
        external: { providers: [] },
      }),
    },
  };
}

Deno.test("LspValidateCommand - 基本構造", async (t) => {
  await t.step("LspValidateCommandはBaseCliCommandを継承している", () => {
    const command = new LspValidateCommand();
    assert(
      command instanceof BaseCliCommand,
      "LspValidateCommandはBaseCliCommandを継承すべき",
    );
  });

  await t.step("name = 'validate' である", () => {
    const command = new LspValidateCommand();
    assertEquals(command.name, "validate");
  });

  await t.step("path = ['lsp', 'validate'] である", () => {
    const command = new LspValidateCommand();
    assertEquals(
      JSON.stringify(command.path),
      JSON.stringify(["lsp", "validate"]),
    );
  });
});

Deno.test("LspValidateCommand - ヘルプ表示", async (t) => {
  await t.step("--help オプションでヘルプを表示する", async () => {
    const command = new LspValidateCommand();
    const messages = {
      info: [] as string[],
      error: [] as string[],
      success: [] as string[],
    };
    const context = createTestContext({ help: true }, messages);

    const result = await command.execute(context);
    assert(result.ok, "helpオプションでは成功すべき");
    assert(messages.info.length > 0, "ヘルプメッセージが表示されるべき");
    assert(
      messages.info.some((m) => m.includes("validate")),
      "ヘルプには'validate'が含まれるべき",
    );
  });
});

Deno.test("LspValidateCommand - エラーハンドリング", async (t) => {
  await t.step("ファイル指定なしではエラーを返す", async () => {
    const command = new LspValidateCommand();
    const context = createTestContext({});

    const result = await command.execute(context);
    assert(!result.ok, "ファイル指定なしではエラーを返すべき");
    if (!result.ok) {
      assert(
        result.error.message.includes("file"),
        "エラーメッセージにファイルについて言及すべき",
      );
    }
  });
});

Deno.test("LspValidateCommand - 検証実行", async (t) => {
  await t.step("指定ファイルを検証して結果を返す", async () => {
    const testEntities: DetectableEntity[] = [
      {
        kind: "character",
        id: "hero",
        name: "勇者",
        displayNames: ["勇者", "主人公"],
        filePath: "src/characters/hero.ts",
      },
    ];

    // テスト用の一時ファイルを作成
    const testDir = await Deno.makeTempDir({ prefix: "storyteller_validate_" });
    const testFile = `${testDir}/test_manuscript.md`;
    await Deno.writeTextFile(
      testFile,
      "勇者が剣を抜いた。知らない人が現れた。",
    );

    try {
      const command = new LspValidateCommand({
        loadEntities: async () => testEntities,
      });

      const messages = {
        info: [] as string[],
        error: [] as string[],
        success: [] as string[],
      };
      const context = createTestContext({ file: testFile }, messages);

      const result = await command.execute(context);
      assert(result.ok, "検証は成功すべき");

      if (result.ok) {
        const value = result.value as {
          diagnostics: unknown[];
          filePath: string;
        };
        assertExists(value.diagnostics, "診断結果が返されるべき");
        assertEquals(value.filePath, testFile, "ファイルパスが返されるべき");
      }
    } finally {
      await Deno.remove(testDir, { recursive: true });
    }
  });

  await t.step("存在しないファイルを指定するとエラーを返す", async () => {
    const command = new LspValidateCommand();
    const context = createTestContext({ file: "/nonexistent/file.md" });

    const result = await command.execute(context);
    assert(!result.ok, "存在しないファイルではエラーを返すべき");
    if (!result.ok) {
      assertEquals(result.error.code, "file_not_found");
    }
  });
});

Deno.test("LspValidateCommand - JSON出力", async (t) => {
  await t.step("--json オプションでJSON形式の結果を返す", async () => {
    const testEntities: DetectableEntity[] = [];

    const testDir = await Deno.makeTempDir({ prefix: "storyteller_validate_" });
    const testFile = `${testDir}/test.md`;
    await Deno.writeTextFile(testFile, "テスト文書");

    try {
      const command = new LspValidateCommand({
        loadEntities: async () => testEntities,
      });

      const messages = {
        info: [] as string[],
        error: [] as string[],
        success: [] as string[],
      };
      const context = createTestContext(
        { file: testFile, json: true },
        messages,
      );

      const result = await command.execute(context);
      assert(result.ok, "JSON出力モードでも成功すべき");

      if (result.ok) {
        const value = result.value as {
          diagnostics: unknown[];
          filePath: string;
        };
        assertExists(value.diagnostics);
      }
    } finally {
      await Deno.remove(testDir, { recursive: true });
    }
  });
});

Deno.test("computeConfidenceSummary - 信頼度別サマリー集計", async (t) => {
  await t.step("High/Medium/Low のカウントが正しい", () => {
    const diagnostics: DiagnosticOutput[] = [
      {
        line: 1,
        character: 1,
        endCharacter: 3,
        severity: "hint",
        message: "test",
        source: "s",
        confidence: 0.90,
        entityId: "a",
      },
      {
        line: 2,
        character: 1,
        endCharacter: 4,
        severity: "hint",
        message: "test",
        source: "s",
        confidence: 0.85,
        entityId: "b",
      },
      {
        line: 3,
        character: 1,
        endCharacter: 3,
        severity: "warning",
        message: "test",
        source: "s",
        confidence: 0.70,
        entityId: "c",
      },
      {
        line: 4,
        character: 1,
        endCharacter: 5,
        severity: "warning",
        message: "test",
        source: "s",
        confidence: 0.50,
        entityId: "d",
      },
      {
        line: 5,
        character: 1,
        endCharacter: 3,
        severity: "warning",
        message: "test",
        source: "s",
        confidence: 0.30,
        entityId: "e",
      },
    ];

    const summary = computeConfidenceSummary(diagnostics);
    assertEquals(summary.high, 2, "confidence >= 0.85 は High");
    assertEquals(summary.medium, 2, "0.50 <= confidence < 0.85 は Medium");
    assertEquals(summary.low, 1, "confidence < 0.50 は Low");
    assertEquals(summary.total, 5, "total は診断の総数");
  });

  await t.step("診断が0件の場合は全カウント0", () => {
    const summary = computeConfidenceSummary([]);
    assertEquals(summary.high, 0);
    assertEquals(summary.medium, 0);
    assertEquals(summary.low, 0);
    assertEquals(summary.total, 0);
  });

  await t.step("confidence が未定義の診断は Low 扱い", () => {
    const diagnostics: DiagnosticOutput[] = [
      {
        line: 1,
        character: 1,
        endCharacter: 3,
        severity: "warning",
        message: "test",
        source: "s",
      },
    ];
    const summary = computeConfidenceSummary(diagnostics);
    assertEquals(summary.low, 1, "confidence なしは Low");
    assertEquals(summary.total, 1);
  });
});

Deno.test("LspValidateCommand - サマリー付きJSON出力", async (t) => {
  await t.step("--json 出力に summary オブジェクトが含まれる", async () => {
    const testEntities: DetectableEntity[] = [
      {
        kind: "character",
        id: "hero",
        name: "勇者",
        displayNames: ["勇者"],
        aliases: ["主人公"],
        filePath: "src/characters/hero.ts",
      },
    ];

    const testDir = await Deno.makeTempDir({ prefix: "storyteller_validate_" });
    const testFile = `${testDir}/test.md`;
    // Why: alias "主人公" は confidence 0.8 で診断が生成される
    await Deno.writeTextFile(
      testFile,
      "主人公が剣を抜いた。謎の人物が現れた。",
    );

    try {
      const command = new LspValidateCommand({
        loadEntities: async () => testEntities,
      });

      const messages = {
        info: [] as string[],
        error: [] as string[],
        success: [] as string[],
      };
      const context = createTestContext(
        { file: testFile, json: true },
        messages,
      );

      const result = await command.execute(context);
      assert(result.ok, "JSON出力モードでは成功すべき");

      if (result.ok) {
        const value = result.value as {
          diagnostics: DiagnosticOutput[];
          filePath: string;
          summary?: ConfidenceSummary;
        };
        assertExists(value.summary, "summary が含まれるべき");
        assertEquals(typeof value.summary.high, "number");
        assertEquals(typeof value.summary.medium, "number");
        assertEquals(typeof value.summary.low, "number");
        assertEquals(
          value.summary.total,
          value.diagnostics.length,
          "total は diagnostics の長さと一致すべき",
        );

        // JSON出力にも summary が含まれることを確認
        const jsonOutput = messages.info.join("\n");
        const parsed = JSON.parse(jsonOutput);
        assertExists(parsed.summary, "JSON出力に summary が含まれるべき");
      }
    } finally {
      await Deno.remove(testDir, { recursive: true });
    }
  });
});

Deno.test("LspValidateCommand - サマリー付きHuman-readable出力", async (t) => {
  await t.step("診断ありの場合、Summary行が表示される", async () => {
    const testEntities: DetectableEntity[] = [
      {
        kind: "character",
        id: "hero",
        name: "勇者",
        displayNames: ["勇者"],
        aliases: ["主人公"],
        filePath: "src/characters/hero.ts",
      },
    ];

    const testDir = await Deno.makeTempDir({ prefix: "storyteller_validate_" });
    const testFile = `${testDir}/test.md`;
    // Why: alias "主人公" は confidence 0.8 となり、>= 0.9 のフィルタを通過して診断が生成される
    await Deno.writeTextFile(testFile, "主人公が剣を抜いた。");

    try {
      const command = new LspValidateCommand({
        loadEntities: async () => testEntities,
      });

      const messages = {
        info: [] as string[],
        error: [] as string[],
        success: [] as string[],
      };
      const context = createTestContext({ file: testFile }, messages);

      const result = await command.execute(context);
      assert(result.ok, "検証は成功すべき");

      if (result.ok && messages.info.length > 0) {
        const output = messages.info.join("\n");
        assert(
          output.includes("Summary:"),
          "Human-readable出力に Summary行が含まれるべき",
        );
      }
    } finally {
      await Deno.remove(testDir, { recursive: true });
    }
  });

  await t.step(
    "診断0件の場合は Summary行が表示されず No issues found となる",
    async () => {
      const testEntities: DetectableEntity[] = [];
      const testDir = await Deno.makeTempDir({
        prefix: "storyteller_validate_",
      });
      const testFile = `${testDir}/test.md`;
      await Deno.writeTextFile(testFile, "テスト文書。エンティティ参照なし。");

      try {
        const command = new LspValidateCommand({
          loadEntities: async () => testEntities,
        });

        const messages = {
          info: [] as string[],
          error: [] as string[],
          success: [] as string[],
        };
        const context = createTestContext({ file: testFile }, messages);

        const result = await command.execute(context);
        assert(result.ok, "検証は成功すべき");

        assert(
          messages.success.some((m) => m.includes("No issues found")),
          "診断0件の場合は No issues found が表示されるべき",
        );
      } finally {
        await Deno.remove(testDir, { recursive: true });
      }
    },
  );
});
