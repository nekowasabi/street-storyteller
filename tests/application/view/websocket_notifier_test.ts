/**
 * WebSocket Notifier テスト
 * LocalViewServerのnotify機能をテスト
 */
import { assert } from "../../asserts.ts";
import { LocalViewServer } from "../../../src/application/view/local_server.ts";

Deno.test("WebSocket通知 - 基本機能", async (t) => {
  await t.step("WebSocket接続を受け付ける", async () => {
    const server = new LocalViewServer();
    server.setContent("<html></html>");

    const port = 49000 + Math.floor(Math.random() * 1000);
    await server.start(port);

    try {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("WebSocket connection timeout"));
        }, 2000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve();
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

  await t.step("notify()で全クライアントにメッセージ送信できる", async () => {
    const server = new LocalViewServer();
    server.setContent("<html></html>");

    const port = 49000 + Math.floor(Math.random() * 1000);
    await server.start(port);

    try {
      // 複数のWebSocket接続を確立
      const receivedMessages: string[][] = [[], []];
      const connections: WebSocket[] = [];

      for (let i = 0; i < 2; i++) {
        const ws = new WebSocket(`ws://localhost:${port}/ws`);
        connections.push(ws);

        ws.onmessage = (event) => {
          receivedMessages[i].push(event.data);
        };

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Connection timeout")),
            2000,
          );
          ws.onopen = () => {
            clearTimeout(timeout);
            resolve();
          };
          ws.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
          };
        });
      }

      // メッセージを送信
      server.notify("reload");

      // メッセージ受信を待機
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 両方のクライアントがメッセージを受信したか確認
      assert(
        receivedMessages[0].includes("reload"),
        "クライアント1がメッセージを受信すべき",
      );
      assert(
        receivedMessages[1].includes("reload"),
        "クライアント2がメッセージを受信すべき",
      );

      // クリーンアップ
      for (const ws of connections) {
        ws.close();
      }
    } finally {
      await server.stop();
    }
  });

  await t.step("クライアント切断を処理できる", async () => {
    const server = new LocalViewServer();
    server.setContent("<html></html>");

    const port = 49000 + Math.floor(Math.random() * 1000);
    await server.start(port);

    try {
      const ws = new WebSocket(`ws://localhost:${port}/ws`);

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Connection timeout")),
          2000,
        );
        ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };
        ws.onerror = (e) => {
          clearTimeout(timeout);
          reject(e);
        };
      });

      // 接続を閉じる
      ws.close();

      // 待機
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 切断後のnotifyでエラーが発生しないことを確認
      server.notify("test");

      // エラーが発生しなければ成功
      assert(true, "クライアント切断後もnotifyが正常に動作すべき");
    } finally {
      await server.stop();
    }
  });
});
