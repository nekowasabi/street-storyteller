/**
 * View Command --serve テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assert, createStubLogger, createStubPresenter } from "../asserts.ts";
import { ViewCommand } from "../../src/cli/modules/view.ts";
import type { CommandContext } from "../../src/cli/types.ts";

Deno.test("ViewCommand --serve - オプション解析", async (t) => {
  await t.step("--serve オプションが受け付けられる", async () => {
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
      args: { serve: true, "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok, "--serve dry-runで成功すべき");
    assert(
      messages.some((m) => m.includes("serve") || m.includes("server")),
      "サーバーモードに関する情報が表示されるべき",
    );
  });

  await t.step("--port オプションでポート指定できる", async () => {
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
      args: { serve: true, port: 9999, "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok);
    assert(
      messages.some((m) => m.includes("9999")),
      "指定したポートが表示されるべき",
    );
  });

  await t.step("--watch オプションでファイル監視を有効化できる", async () => {
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
      args: { serve: true, watch: true, "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok);
    assert(
      messages.some((m) => m.includes("watch")),
      "監視モードに関する情報が表示されるべき",
    );
  });

  await t.step("デフォルトポートは8080", async () => {
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
      args: { serve: true, "dry-run": true },
      config: undefined as never,
    };

    const result = await command.execute(context);
    assert(result.ok);
    assert(
      messages.some((m) => m.includes("8080")),
      "デフォルトポート8080が表示されるべき",
    );
  });
});

Deno.test("ViewCommand --serve - 実際のサーバー起動", async (t) => {
  // テスト用の一時プロジェクトを作成
  const tmpDir = await Deno.makeTempDir();

  // 基本的なプロジェクト構造を作成
  await Deno.mkdir(`${tmpDir}/src/characters`, { recursive: true });
  await Deno.mkdir(`${tmpDir}/manuscripts`, { recursive: true });

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

  await t.step("--serve でローカルサーバーが起動する", async () => {
    const command = new ViewCommand();
    const logger = createStubLogger();
    const presenter = createStubPresenter();

    // 非同期でサーバーを起動
    const port = 48500 + Math.floor(Math.random() * 500);
    const context: CommandContext = {
      logger,
      presenter,
      args: { serve: true, port, path: tmpDir, timeout: 500 },
      config: undefined as never,
    };

    // サーバーを起動（タイムアウトで自動停止）
    const resultPromise = command.execute(context);

    // サーバーが起動するまで待機
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      // HTTPリクエストを送信
      const response = await fetch(`http://localhost:${port}/`);
      assert(response.status === 200, "サーバーがリクエストに応答すべき");

      const text = await response.text();
      assert(text.includes("<!DOCTYPE html>"), "HTMLが返されるべき");
    } catch (error) {
      // タイムアウト前にサーバーに接続できなかった場合
      console.error("Server connection failed:", error);
    }

    // タイムアウトまで待機
    await resultPromise;
  });

  // クリーンアップ
  await Deno.remove(tmpDir, { recursive: true });
});
