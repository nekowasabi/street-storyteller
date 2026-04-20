/**
 * LSP Validate Command テスト
 * TDD: ワンショット検証コマンドのテスト
 */
import { assert, assertEquals, createStubLogger } from "../asserts.ts";
import { assertExists } from "@std/assert";
import type { CommandContext } from "@storyteller/cli/types.ts";
import { LspValidateCommand } from "@storyteller/cli/modules/lsp/validate.ts";
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

Deno.test("LspValidateCommand - --dir によるディレクトリ走査", async (t) => {
  await t.step(
    "--dir 指定時にディレクトリ内の .md ファイルを走査する",
    async () => {
      const testEntities: DetectableEntity[] = [
        {
          kind: "character",
          id: "hero",
          name: "勇者",
          displayNames: ["勇者"],
          filePath: "src/characters/hero.ts",
        },
      ];

      // テスト用の一時ディレクトリ構造を作成
      const testDir = await Deno.makeTempDir({ prefix: "storyteller_dir_" });
      const subDir = `${testDir}/manuscripts`;
      await Deno.mkdir(subDir);
      await Deno.writeTextFile(`${subDir}/ch01.md`, "勇者が剣を抜いた。");
      await Deno.writeTextFile(`${subDir}/ch02.md`, "勇者が旅立った。");
      await Deno.writeTextFile(`${subDir}/notes.txt`, "this is not markdown");

      try {
        const command = new LspValidateCommand({
          loadEntities: async () => testEntities,
          listMarkdownFiles: async () => [
            `${subDir}/ch01.md`,
            `${subDir}/ch02.md`,
          ],
        });

        const messages = {
          info: [] as string[],
          error: [] as string[],
          success: [] as string[],
        };
        const context = createTestContext({ dir: subDir }, messages);

        const result = await command.execute(context);
        assert(result.ok, "ディレクトリ検証は成功すべき");

        if (result.ok) {
          const value = result.value as {
            results: Array<{ filePath: string; diagnostics: unknown[] }>;
          };
          assertExists(value.results, "results が返されるべき");
          assertEquals(
            value.results.length,
            2,
            "2つの .md ファイルが走査されるべき",
          );
          // 各ファイルのパスが含まれていること
          const paths = value.results.map((r) => r.filePath);
          assert(paths.includes(`${subDir}/ch01.md`), "ch01.md が含まれるべき");
          assert(paths.includes(`${subDir}/ch02.md`), "ch02.md が含まれるべき");
        }
      } finally {
        await Deno.remove(testDir, { recursive: true });
      }
    },
  );

  await t.step("--dir --recursive でサブディレクトリ内も走査する", async () => {
    const testEntities: DetectableEntity[] = [];

    const testDir = await Deno.makeTempDir({ prefix: "storyteller_recur_" });
    const subDir = `${testDir}/manuscripts`;
    const nestedDir = `${subDir}/volume1`;
    await Deno.mkdir(nestedDir, { recursive: true });
    await Deno.writeTextFile(`${subDir}/ch01.md`, "テスト");
    await Deno.writeTextFile(`${nestedDir}/ch02.md`, "テスト");

    try {
      const command = new LspValidateCommand({
        loadEntities: async () => testEntities,
        listMarkdownFiles: async () => [
          `${subDir}/ch01.md`,
          `${nestedDir}/ch02.md`,
        ],
      });

      const messages = {
        info: [] as string[],
        error: [] as string[],
        success: [] as string[],
      };
      const context = createTestContext(
        { dir: subDir, recursive: true },
        messages,
      );

      const result = await command.execute(context);
      assert(result.ok, "再帰的検証は成功すべき");

      if (result.ok) {
        const value = result.value as {
          results: Array<{ filePath: string; diagnostics: unknown[] }>;
        };
        assertEquals(
          value.results.length,
          2,
          "サブディレクトリ含めて2ファイル走査されるべき",
        );
      }
    } finally {
      await Deno.remove(testDir, { recursive: true });
    }
  });

  await t.step("--dir 未指定時は従来通り --file 単一ファイル動作", async () => {
    const testEntities: DetectableEntity[] = [];

    const testDir = await Deno.makeTempDir({ prefix: "storyteller_nodir_" });
    const testFile = `${testDir}/single.md`;
    await Deno.writeTextFile(testFile, "テスト");

    try {
      const command = new LspValidateCommand({
        loadEntities: async () => testEntities,
      });

      const context = createTestContext({ file: testFile });
      const result = await command.execute(context);
      assert(result.ok, "単一ファイル検証は成功すべき");

      if (result.ok) {
        const value = result.value as {
          filePath: string;
          diagnostics: unknown[];
        };
        assertEquals(value.filePath, testFile, "ファイルパスが返されるべき");
      }
    } finally {
      await Deno.remove(testDir, { recursive: true });
    }
  });

  await t.step("--dir と --file 両方指定時は --dir を優先する", async () => {
    const testEntities: DetectableEntity[] = [];

    const testDir = await Deno.makeTempDir({ prefix: "storyteller_both_" });
    const subDir = `${testDir}/manuscripts`;
    await Deno.mkdir(subDir);
    await Deno.writeTextFile(`${subDir}/ch01.md`, "テスト");

    try {
      const command = new LspValidateCommand({
        loadEntities: async () => testEntities,
        listMarkdownFiles: async () => [`${subDir}/ch01.md`],
      });

      const context = createTestContext({
        dir: subDir,
        file: "/ignored/file.md",
      });
      const result = await command.execute(context);
      assert(result.ok, "--dir 優先で成功すべき");

      if (result.ok) {
        const value = result.value as {
          results: Array<{ filePath: string; diagnostics: unknown[] }>;
        };
        assertExists(value.results, "--dir 優先で results が返されるべき");
        assertEquals(
          value.results.length,
          1,
          "ディレクトリのファイルのみ走査されるべき",
        );
      }
    } finally {
      await Deno.remove(testDir, { recursive: true });
    }
  });

  await t.step(
    "--dir でディレクトリが存在しない場合はエラーを返す",
    async () => {
      const command = new LspValidateCommand({
        loadEntities: async () => [],
      });

      const context = createTestContext({ dir: "/nonexistent/directory" });
      const result = await command.execute(context);
      assert(!result.ok, "存在しないディレクトリではエラーを返すべき");
      if (!result.ok) {
        assertEquals(result.error.code, "dir_not_found");
      }
    },
  );
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
