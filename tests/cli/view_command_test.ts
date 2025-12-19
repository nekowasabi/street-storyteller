/**
 * View Command テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import {
  assert,
  assertEquals,
  createStubLogger,
  createStubPresenter,
} from "../asserts.ts";
import { ViewCommand } from "@storyteller/cli/modules/view.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import type { CommandContext } from "@storyteller/cli/types.ts";

Deno.test("ViewCommand - 基本構造", async (t) => {
  await t.step("ViewCommandはBaseCliCommandを継承している", () => {
    const command = new ViewCommand();
    assert(
      command instanceof BaseCliCommand,
      "ViewCommandはBaseCliCommandを継承すべき",
    );
  });

  await t.step("name = 'view' である", () => {
    const command = new ViewCommand();
    assertEquals(command.name, "view");
  });

  await t.step("path = ['view'] である", () => {
    const command = new ViewCommand();
    assertEquals(JSON.stringify(command.path), JSON.stringify(["view"]));
  });
});

Deno.test("ViewCommand - オプション解析", async (t) => {
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
  displayNames: ["勇者"],
  role: "protagonist",
};
`,
  );

  await t.step("デフォルトでindex.htmlにHTML出力する", async () => {
    const command = new ViewCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const outputPath = `${tmpDir}/index.html`;

    const context: CommandContext = {
      logger,
      presenter,
      args: { path: tmpDir, output: outputPath },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(
      result.ok,
      `コマンドが成功すべき: ${!result.ok ? JSON.stringify(result.error) : ""}`,
    );

    // ファイルが作成されたか確認
    const content = await Deno.readTextFile(outputPath);
    assert(content.includes("<!DOCTYPE html>"), "HTMLファイルが作成されるべき");
    assert(content.includes("勇者"), "キャラクター情報が含まれるべき");
  });

  await t.step("--output オプションで出力先を指定できる", async () => {
    const command = new ViewCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const customOutput = `${tmpDir}/custom-output.html`;

    const context: CommandContext = {
      logger,
      presenter,
      args: { path: tmpDir, output: customOutput },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok);

    // ファイルが作成されたか確認
    const exists = await Deno.stat(customOutput).then(() => true).catch(() =>
      false
    );
    assert(exists, "カスタム出力先にファイルが作成されるべき");
  });

  await t.step("--path オプションでプロジェクトパスを指定できる", async () => {
    const command = new ViewCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    const outputPath = `${tmpDir}/path-test.html`;

    const context: CommandContext = {
      logger,
      presenter,
      args: { path: tmpDir, output: outputPath },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "pathオプション指定時も成功すべき");
  });

  await t.step("--help オプションでヘルプを表示する", async () => {
    const command = new ViewCommand();
    const logger = createStubLogger();
    const messages: string[] = [];
    const presenter = {
      showInfo: (msg: string) => messages.push(msg),
      showSuccess: () => {},
      showWarning: () => {},
      showError: () => {},
    };

    const context: CommandContext = {
      logger,
      presenter,
      args: { help: true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "helpオプションでは成功すべき");
    assert(messages.length > 0, "ヘルプメッセージが表示されるべき");
    assert(
      messages.some((m) => m.includes("--output")),
      "ヘルプには--outputオプションが含まれるべき",
    );
  });

  // クリーンアップ
  await Deno.remove(tmpDir, { recursive: true });
});
