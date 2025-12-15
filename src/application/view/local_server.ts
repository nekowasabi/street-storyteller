/**
 * ローカルHTTPサーバー
 * HTML可視化のためのローカルサーバーとWebSocket通知機能を提供
 */

/**
 * ローカル表示用サーバー
 */
export class LocalViewServer {
  private content: string = "";
  private server: Deno.HttpServer | null = null;
  private abortController: AbortController | null = null;
  private webSocketClients: Set<WebSocket> = new Set();

  /**
   * 表示するHTMLコンテンツを設定
   */
  setContent(html: string): void {
    this.content = html;
  }

  /**
   * サーバーを起動
   */
  async start(port: number): Promise<void> {
    this.abortController = new AbortController();

    this.server = Deno.serve({
      port,
      signal: this.abortController.signal,
      onListen: () => {
        // サーバー起動完了
      },
    }, (request) => this.handleRequest(request));

    // サーバーが起動するまで少し待機
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  /**
   * サーバーを停止
   */
  async stop(): Promise<void> {
    // WebSocketクライアントをすべて閉じる
    for (const ws of this.webSocketClients) {
      try {
        ws.close();
      } catch {
        // 無視
      }
    }
    this.webSocketClients.clear();

    // サーバーを停止
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.server) {
      try {
        await this.server.finished;
      } catch {
        // AbortErrorは無視
      }
      this.server = null;
    }
  }

  /**
   * 接続中のWebSocketクライアントにメッセージを送信
   */
  notify(message: string): void {
    for (const ws of this.webSocketClients) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      } catch {
        // エラーは無視
      }
    }
  }

  /**
   * リクエストを処理
   */
  private handleRequest(request: Request): Response {
    const url = new URL(request.url);

    // WebSocketアップグレード
    if (url.pathname === "/ws") {
      return this.handleWebSocket(request);
    }

    // ルートパス: HTMLを返す
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(this.content, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // 404
    return new Response("Not Found", {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  /**
   * WebSocketアップグレードを処理
   */
  private handleWebSocket(request: Request): Response {
    const { socket, response } = Deno.upgradeWebSocket(request);

    socket.onopen = () => {
      this.webSocketClients.add(socket);
    };

    socket.onclose = () => {
      this.webSocketClients.delete(socket);
    };

    socket.onerror = () => {
      this.webSocketClients.delete(socket);
    };

    return response;
  }
}
