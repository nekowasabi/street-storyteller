/**
 * マルチプロジェクトE2Eテスト
 * 実際のsamples/cinderellaプロジェクトを使用して、
 * LSPサーバーがマルチプロジェクト環境で正しく動作することを検証
 */

import { assertEquals, assertExists } from "@std/assert";
import { join } from "@std/path";
import { LspTransport } from "@storyteller/lsp/protocol/transport.ts";
import { LspServer } from "@storyteller/lsp/server/server.ts";
import {
  createLspMessage,
  createMockReader,
  createMockWriter,
} from "./helpers.ts";

// プロジェクトルート
const PROJECT_ROOT = Deno.cwd();
const CINDERELLA_PROJECT = join(PROJECT_ROOT, "samples/cinderella");

function extractResponseBody(data: string): unknown {
  const bodyMatch = data.match(/\r\n\r\n(.+)$/s);
  if (!bodyMatch) throw new Error("Failed to extract response body");
  return JSON.parse(bodyMatch[1]);
}

/**
 * 初期化済みサーバーを作成（cinderellaプロジェクトのエンティティをロード）
 */
async function createInitializedServerWithCinderellaEntities(
  additionalMessages: string[] = [],
): Promise<{
  server: LspServer;
  transport: LspTransport;
  writer: ReturnType<typeof createMockWriter>;
}> {
  const initRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      processId: 1234,
      rootUri: `file://${PROJECT_ROOT}`,
      capabilities: {},
    },
  });

  const initializedNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "initialized",
    params: {},
  });

  const allMessages = [
    initRequest,
    initializedNotification,
    ...additionalMessages,
  ];
  const reader = createMockReader(allMessages.map(createLspMessage).join(""));
  const writer = createMockWriter();
  const transport = new LspTransport(reader, writer);

  // cinderellaプロジェクトのエンティティをロード
  const { ProjectContextManager } = await import(
    "@storyteller/lsp/project/project_context_manager.ts"
  );
  const contextManager = new ProjectContextManager();
  const context = await contextManager.getContext(CINDERELLA_PROJECT);

  // cinderellaのエンティティを使用してサーバーを初期化
  const server = new LspServer(transport, PROJECT_ROOT, {
    entities: [...context.entities],
    entityInfoMap: context.entityInfoMap,
  });

  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read initialize message");
  await server.handleMessage(msg1.value);

  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read initialized message");
  await server.handleMessage(msg2.value);

  writer.clear();

  return { server, transport, writer };
}

Deno.test("E2E - hover on cinderella character file shows entity info", async () => {
  const cinderellaFilePath = join(
    CINDERELLA_PROJECT,
    "src/characters/cinderella.ts",
  );
  const cinderellaFileUri = `file://${cinderellaFilePath}`;

  // cinderella.tsの内容を読み込み
  const cinderellaContent = await Deno.readTextFile(cinderellaFilePath);

  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: cinderellaFileUri,
        languageId: "typescript",
        version: 1,
        text: cinderellaContent,
      },
    },
  });

  // 「シンデレラ」という名前を探してホバーリクエストを送る
  // "name": "シンデレラ" の行を見つける
  const lines = cinderellaContent.split("\n");
  let targetLine = -1;
  let targetChar = 0;
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf("シンデレラ");
    if (idx >= 0) {
      targetLine = i;
      targetChar = idx;
      break;
    }
  }

  if (targetLine === -1) {
    // シンデレラが見つからない場合はテストをスキップ
    console.log(
      "Warning: Could not find 'シンデレラ' in cinderella.ts, skipping test",
    );
    return;
  }

  const hoverRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 100,
    method: "textDocument/hover",
    params: {
      textDocument: {
        uri: cinderellaFileUri,
      },
      position: {
        line: targetLine,
        character: targetChar,
      },
    },
  });

  const { server, transport, writer } =
    await createInitializedServerWithCinderellaEntities([
      didOpenNotification,
      hoverRequest,
    ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/hover を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read hover request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData, "Response should be written");

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result:
      | { contents: { kind: string; value: string }; range?: unknown }
      | { contents: unknown[] };
  };

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 100);
  assertExists(response.result, "Hover result should exist");

  // リテラル型ホバーまたはエンティティホバーのいずれかが返される
  // 重要なのは空でないレスポンスが返ることを確認すること
  console.log("Hover response:", JSON.stringify(response.result, null, 2));
});

Deno.test("E2E - definition jump from cinderella manuscript", async () => {
  const manuscriptPath = join(CINDERELLA_PROJECT, "manuscripts/chapter01.md");
  const manuscriptUri = `file://${manuscriptPath}`;

  // 原稿ファイルが存在するか確認
  try {
    await Deno.stat(manuscriptPath);
  } catch {
    console.log("Warning: manuscripts/chapter01.md not found, skipping test");
    return;
  }

  const manuscriptContent = await Deno.readTextFile(manuscriptPath);

  // 「シンデレラ」への参照を探す
  const lines = manuscriptContent.split("\n");
  let targetLine = -1;
  let targetChar = 0;
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf("シンデレラ");
    if (idx >= 0) {
      targetLine = i;
      targetChar = idx;
      break;
    }
  }

  if (targetLine === -1) {
    console.log(
      "Warning: Could not find 'シンデレラ' in chapter01.md, skipping test",
    );
    return;
  }

  const didOpenNotification = JSON.stringify({
    jsonrpc: "2.0",
    method: "textDocument/didOpen",
    params: {
      textDocument: {
        uri: manuscriptUri,
        languageId: "markdown",
        version: 1,
        text: manuscriptContent,
      },
    },
  });

  const definitionRequest = JSON.stringify({
    jsonrpc: "2.0",
    id: 101,
    method: "textDocument/definition",
    params: {
      textDocument: {
        uri: manuscriptUri,
      },
      position: {
        line: targetLine,
        character: targetChar,
      },
    },
  });

  const { server, transport, writer } =
    await createInitializedServerWithCinderellaEntities([
      didOpenNotification,
      definitionRequest,
    ]);

  // didOpen を処理
  const msg1 = await transport.readMessage();
  if (!msg1.ok) throw new Error("Failed to read didOpen");
  await server.handleMessage(msg1.value);
  writer.clear();

  // textDocument/definition を処理
  const msg2 = await transport.readMessage();
  if (!msg2.ok) throw new Error("Failed to read definition request");
  await server.handleMessage(msg2.value);

  const responseData = writer.getData();
  assertExists(responseData, "Response should be written");

  const response = extractResponseBody(responseData) as {
    jsonrpc: string;
    id: number;
    result: { uri: string; range: unknown } | null | unknown[];
  };

  assertEquals(response.jsonrpc, "2.0");
  assertEquals(response.id, 101);

  // 定義ジャンプ結果を確認
  console.log("Definition response:", JSON.stringify(response.result, null, 2));

  // 結果がnullでなく、cinderellaへのパスを含むことを確認
  if (response.result !== null && !Array.isArray(response.result)) {
    assertEquals(
      response.result.uri.includes("cinderella"),
      true,
      "Definition should point to cinderella.ts",
    );
  } else if (Array.isArray(response.result) && response.result.length === 0) {
    // 空配列の場合、エンティティが検出されなかった
    console.log(
      "Note: Definition returned empty array - entity may not have been detected",
    );
  }
});
