/**
 * LocalViewServer テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assert, assertEquals } from "../../asserts.ts";
import { LocalViewServer } from "@storyteller/application/view/local_server.ts";

Deno.test("LocalViewServer - 基本構造", async (t) => {
  await t.step("LocalViewServerクラスが存在する", () => {
    const server = new LocalViewServer();
    assert(server, "LocalViewServerクラスが存在すべき");
  });

  await t.step("setContentメソッドが存在する", () => {
    const server = new LocalViewServer();
    assert(
      typeof server.setContent === "function",
      "setContentメソッドが存在すべき",
    );
  });

  await t.step("startメソッドが存在する", () => {
    const server = new LocalViewServer();
    assert(typeof server.start === "function", "startメソッドが存在すべき");
  });

  await t.step("stopメソッドが存在する", () => {
    const server = new LocalViewServer();
    assert(typeof server.stop === "function", "stopメソッドが存在すべき");
  });
});

Deno.test("LocalViewServer - HTTPサーバー機能", async (t) => {
  await t.step("サーバーを起動・停止できる", async () => {
    const server = new LocalViewServer();
    server.setContent("<html><body>Test</body></html>");

    // より広いポート範囲でランダム選択（衝突回避）
    const port = 40000 + Math.floor(Math.random() * 5000);
    await server.start(port);

    // サーバーが起動していることを確認
    try {
      const response = await fetch(`http://localhost:${port}/`);
      assertEquals(response.status, 200, "200ステータスを返すべき");
      const text = await response.text();
      assert(text.includes("Test"), "コンテンツが返されるべき");
    } finally {
      await server.stop();
    }
  });

  await t.step("/ にアクセスするとHTMLが返る", async () => {
    const server = new LocalViewServer();
    const htmlContent = "<!DOCTYPE html><html><body>Hello World</body></html>";
    server.setContent(htmlContent);

    const port = 42000 + Math.floor(Math.random() * 5000);
    await server.start(port);

    try {
      const response = await fetch(`http://localhost:${port}/`);
      assertEquals(response.status, 200);

      const contentType = response.headers.get("content-type");
      assert(
        contentType?.includes("text/html"),
        "Content-Typeがtext/htmlであるべき",
      );

      const text = await response.text();
      assert(text.includes("Hello World"), "HTMLコンテンツが返されるべき");
    } finally {
      await server.stop();
    }
  });

  await t.step("WebSocketエンドポイント /ws が存在する", async () => {
    const server = new LocalViewServer();
    server.setContent("<html></html>");

    const port = 43000 + Math.floor(Math.random() * 5000);
    await server.start(port);

    try {
      // WebSocket接続を試行
      const ws = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("WebSocket connection timeout"));
        }, 2000);

        ws.onopen = () => {
          clearTimeout(timeout);
          // oncloseの完了を待つ
          ws.onclose = () => resolve();
          ws.close();
        };

        ws.onerror = (e) => {
          clearTimeout(timeout);
          reject(e);
        };
      });
    } finally {
      await server.stop();
    }
  });
});

Deno.test("LocalViewServer - コンテンツ更新", async (t) => {
  await t.step("setContentでコンテンツを更新できる", async () => {
    const server = new LocalViewServer();
    server.setContent("<html><body>Initial</body></html>");

    const port = 44000 + Math.floor(Math.random() * 5000);
    await server.start(port);

    try {
      // 初期コンテンツを確認
      let response = await fetch(`http://localhost:${port}/`);
      let text = await response.text();
      assert(text.includes("Initial"), "初期コンテンツが返されるべき");

      // コンテンツを更新
      server.setContent("<html><body>Updated</body></html>");

      // 更新後のコンテンツを確認
      response = await fetch(`http://localhost:${port}/`);
      text = await response.text();
      assert(text.includes("Updated"), "更新されたコンテンツが返されるべき");
    } finally {
      await server.stop();
    }
  });
});
