# title: Issue #8 MCPサーバー実装 - 自然言語コマンド実行

## 概要
- storytellerのCLIコマンドをMCP (Model Context Protocol) サーバーとして公開し、Claude Desktop等のMCPクライアントから自然言語でコマンドを実行できるようにする

### goal
- `storyteller mcp start --stdio` でMCPサーバーを起動し、Claude Desktopから「原稿のメタデータを生成して」等の自然言語でコマンドを実行できる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール
- Phase 1: `meta_check`と`meta_generate`の2つのToolをMCPとして公開し、Claude Desktopで動作確認
- Phase 2: 全CLIコマンドをMCP Toolsとして公開
- Phase 3: プロジェクト構造をMCP Resourcesとして公開
- Phase 4: 創作支援プロンプトをMCP Promptsとして公開

## 実装仕様

### 技術的決定事項

| 項目 | 決定 | 理由（調査根拠） |
|------|------|-----------------|
| SDK | `npm:@modelcontextprotocol/sdk@^1.0.1` | 公式SDK。MCP仕様が活発に更新中のため仕様追従が容易 |
| トランスポート | stdio | LSPと同方式。既存の`LspTransport`を60-70%再利用可能 |
| JSON-RPC | 既存LSP実装を再利用 | `src/lsp/protocol/json_rpc.ts`がそのまま使用可能（MCP/LSPともにJSON-RPC 2.0） |

### 調査結果による設計根拠

1. **CommandRegistry** (`src/cli/command_registry.ts:265行`)
   - 階層的コマンド管理、`resolve()`でハンドラー解決、`snapshot()`でツリー取得
   - MCPツール登録に直接マッピング可能

2. **LspServer** (`src/lsp/server/server.ts:363行`)
   - メッセージループ、状態管理（uninitialized/initialized）パターン
   - McpServerの設計ベースとして再利用

3. **LspTransport** (`src/lsp/protocol/transport.ts`)
   - Content-Length形式のJSON-RPC処理
   - MCPも同形式のためそのまま再利用可能

## 生成AIの学習用コンテキスト

### プロトコル実装の参照ファイル
- `/home/takets/repos/street-storyteller/src/lsp/protocol/json_rpc.ts`
  - JSON-RPC 2.0パーサー/シリアライザー、エラーコード定数（そのまま再利用）
- `/home/takets/repos/street-storyteller/src/lsp/protocol/types.ts`
  - JsonRpcRequest/Response型定義（MCP用に拡張）
- `/home/takets/repos/street-storyteller/src/lsp/protocol/transport.ts`
  - TransportReader/Writer抽象化、Content-Length処理

### サーバー実装の参照ファイル
- `/home/takets/repos/street-storyteller/src/lsp/server/server.ts`
  - LspServerクラス: メッセージループ、状態管理、ハンドラーディスパッチ
- `/home/takets/repos/street-storyteller/src/lsp/server/capabilities.ts`
  - サーバー能力定義パターン

### CLI実装の参照ファイル
- `/home/takets/repos/street-storyteller/src/cli/types.ts`
  - CommandHandler, CommandContext, CommandOptionDescriptor インターフェース
- `/home/takets/repos/street-storyteller/src/cli/command_registry.ts`
  - コマンド登録・解決パターン
- `/home/takets/repos/street-storyteller/src/cli/modules/lsp/start.ts`
  - LSP startコマンド実装（MCP startのベース）
- `/home/takets/repos/street-storyteller/src/cli/modules/meta/check.ts`
  - meta checkコマンド（Tool化対象）
- `/home/takets/repos/street-storyteller/src/cli/modules/meta/generate.ts`
  - meta generateコマンド（Tool化対象）

### テスト実装の参照ファイル
- `/home/takets/repos/street-storyteller/tests/integration/lsp_server_integration_test.ts`
  - LSP統合テストパターン（MCP統合テストのベース）

---

## Process

### process1 MCP型定義の作成
#### sub1 MCP固有の型定義を作成
@target: `src/mcp/protocol/types.ts`
@ref: `src/lsp/protocol/types.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/protocol/types_test.ts`
- [x] テストケースを作成（この時点で実装がないため失敗する）
  - McpToolの型が正しく定義されているか
  - McpResourceの型が正しく定義されているか
  - InitializeParams/InitializeResultの型が正しいか
  - Type Guards（isMcpRequest等）が機能するか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/protocol/types.ts` を作成
  - MCP InitializeParams/InitializeResult型
  - McpTool型（name, description, inputSchema）
  - McpResource型（uri, name, mimeType）
  - McpPrompt型（name, description, arguments）
  - MCP固有エラーコード定数
  - Type Guards（isMcpRequest, isMcpNotification）
- [x] LSPの`types.ts`から共通部分をコピー・拡張

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process2 MCPトランスポート層の作成
#### sub1 stdio用トランスポートを実装
@target: `src/mcp/protocol/transport.ts`
@ref: `src/lsp/protocol/transport.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/protocol/transport_test.ts`
- [x] テストケースを作成
  - readMessage()がJSON-RPCメッセージを正しく読み取るか
  - writeMessage()がContent-Length形式で正しく書き込むか
  - 不正なJSONでエラーを返すか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/protocol/transport.ts` を作成
  - LspTransportをベースにMcpTransportを実装
  - TransportReader/Writerインターフェースを再利用
  - Content-Length形式のメッセージ処理

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] LspTransportとの共通部分を抽出してリファクタリング検討
- [x] 再度テストを実行し、通過を確認

---

### process3 MCPサーバー能力定義
#### sub1 サーバー能力を定義
@target: `src/mcp/server/capabilities.ts`
@ref: `src/lsp/server/capabilities.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/server/capabilities_test.ts`
- [x] テストケースを作成
  - getServerCapabilities()がtools, resources, promptsを含むか
  - 能力オブジェクトがMCP仕様に準拠しているか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/server/capabilities.ts` を作成
  - ServerCapabilities型定義
  - getServerCapabilities()関数（tools: {}, resources: {}, prompts: {}を返す）

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process4 MCPサーバー本体の作成
#### sub1 McpServerクラスを実装
@target: `src/mcp/server/server.ts`
@ref: `src/lsp/server/server.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/server/server_test.ts`
- [x] テストケースを作成
  - initializeリクエストに正しく応答するか
  - 初期化前のリクエストを拒否するか
  - initializedで状態がinitializedに遷移するか
  - 未知のメソッドにエラーを返すか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/server/server.ts` を作成
  - McpServerクラス（LspServerパターンを参考）
  - 状態管理（uninitialized → initializing → initialized）
  - start()メソッド（メッセージループ）
  - handleMessage()メソッド（リクエスト/通知の分岐）
  - handleRequest()メソッド（initialize, shutdown, tools/*, resources/*等）
  - handleNotification()メソッド（initialized等）

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 必要に応じてリファクタリング
- [x] 再度テストを実行し、通過を確認

---

### process5 ツールレジストリの作成
#### sub1 ツール登録・検索機能を実装
@target: `src/mcp/tools/tool_registry.ts`
@ref: `src/cli/command_registry.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/tool_registry_test.ts`
- [x] テストケースを作成
  - register()でツールを登録できるか
  - get()で登録済みツールを取得できるか
  - listTools()で全ツール一覧を取得できるか
  - 未登録ツールでundefinedを返すか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/tools/tool_registry.ts` を作成
  - McpToolDefinition型
  - ToolRegistry クラス
    - register(tool: McpToolDefinition): void
    - get(name: string): McpToolDefinition | undefined
    - listTools(): McpToolDefinition[]

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process6 CLIアダプターの作成
#### sub1 CommandHandler→MCPツール変換を実装
@target: `src/mcp/tools/cli_adapter.ts`
@ref: `src/cli/types.ts`, `src/cli/base_command.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/cli_adapter_test.ts`
- [x] テストケースを作成
  - createMockContext()がCommandContextを正しく生成するか
  - executeCommand()がCommandHandlerを正しく実行するか
  - Result成功をMCP応答に変換できるか
  - Resultエラーをエラー応答に変換できるか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/tools/cli_adapter.ts` を作成
  - createMockContext(args): CommandContext
    - モックのOutputPresenter（出力をキャプチャ）
    - モックのConfigurationManagerRef
    - モックのLogger
  - executeCommand(handler, args): Promise<McpToolResult>
    - CommandHandlerのexecute()を呼び出し
    - Result型をMCP応答に変換

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process7 meta_checkツールの実装
#### sub1 meta checkコマンドをMCPツール化
@target: `src/mcp/tools/definitions/meta_check.ts`
@ref: `src/cli/modules/meta/check.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/definitions/meta_check_test.ts`
- [x] テストケースを作成
  - ツール定義がMCP仕様に準拠しているか
  - inputSchemaが正しく定義されているか
  - execute()がmeta checkコマンドを正しく呼び出すか
  - 成功時に適切なMCP応答を返すか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/tools/definitions/meta_check.ts` を作成
  ```typescript
  export const metaCheckTool: McpToolDefinition = {
    name: "meta_check",
    description: "原稿ファイルのメタデータ整合性を検証します",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "検証するMarkdownファイルパス" },
        dir: { type: "string", description: "検証するディレクトリ" },
        recursive: { type: "boolean", default: false },
        characters: { type: "array", items: { type: "string" } },
        settings: { type: "array", items: { type: "string" } }
      }
    },
    execute: async (args) => { /* CLI実行 */ }
  };
  ```

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process8 meta_generateツールの実装
#### sub1 meta generateコマンドをMCPツール化
@target: `src/mcp/tools/definitions/meta_generate.ts`
@ref: `src/cli/modules/meta/generate.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/definitions/meta_generate_test.ts`
- [x] テストケースを作成
  - ツール定義がMCP仕様に準拠しているか
  - inputSchemaが正しく定義されているか
  - execute()がmeta generateコマンドを正しく呼び出すか
  - preview/dryRunオプションが正しく動作するか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/tools/definitions/meta_generate.ts` を作成
  ```typescript
  export const metaGenerateTool: McpToolDefinition = {
    name: "meta_generate",
    description: "原稿からメタデータファイル(.meta.ts)を生成します",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "対象Markdownファイルパス" },
        preview: { type: "boolean", default: false },
        dryRun: { type: "boolean", default: false },
        force: { type: "boolean", default: false },
        update: { type: "boolean", default: false }
      },
      required: ["path"]
    },
    execute: async (args) => { /* CLI実行 */ }
  };
  ```

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process9 ツールハンドラーの実装
#### sub1 tools/list, tools/callハンドラーを実装
@target: `src/mcp/server/handlers/tools.ts`
@ref: `src/lsp/server/server.ts`（handleDefinition等を参考）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/server/handlers/tools_test.ts`
- [x] テストケースを作成
  - handleToolsList()が登録済みツール一覧を返すか
  - handleToolsCall()が指定ツールを実行するか
  - 存在しないツール名でエラーを返すか
  - 不正な引数でエラーを返すか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/mcp/server/handlers/tools.ts` を作成
  - handleToolsList(registry): JsonRpcResponse
  - handleToolsCall(registry, params): Promise<JsonRpcResponse>
- [x] McpServerにハンドラーを統合

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process10 CLIコマンド mcp start の実装
#### sub1 mcp startコマンドを実装
@target: `src/cli/modules/mcp/start.ts`
@ref: `src/cli/modules/lsp/start.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/modules/mcp/start_test.ts`
- [x] テストケースを作成
  - --stdio オプションが必須か
  - --path オプションでプロジェクトルートを指定できるか
  - --dry-run でサーバーを起動せずに検証できるか
  - --help でヘルプが表示されるか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/cli/modules/mcp/start.ts` を作成
  - McpStartCommand クラス（BaseCliCommand継承）
  - handle()メソッド
    - stdin/stdoutアダプタ作成
    - McpServer起動
  - オプション定義（--stdio, --path, --dry-run, --help）
  - コマンドディスクリプタ

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process11 mcpコマンドグループの登録
#### sub1 mcpコマンドグループを作成し登録
@target: `src/cli/modules/mcp/index.ts`, `src/cli/modules/index.ts`
@ref: `src/cli/modules/lsp/index.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/cli/modules/mcp/index_test.ts`
- [x] テストケースを作成
  - createMcpDescriptor()がコマンドグループを返すか
  - 子コマンド（start）が含まれているか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `src/cli/modules/mcp/index.ts` を作成
  - McpCommand クラス（グループ親コマンド）
  - createMcpDescriptor(registry): CommandDescriptor
- [x] `src/cli/modules/index.ts` を修正
  - mcpコマンドグループを登録

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 再度テストを実行し、通過を確認

---

### process12 deno.json依存関係の追加
#### sub1 MCP SDKの依存関係を追加
@target: `deno.json`

##### TDD Step 1: Red（失敗するテストを作成）
- [x] MCP SDKのインポートが解決できることを確認するテスト

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] `deno.json` に追加
  ```json
  {
    "imports": {
      "@modelcontextprotocol/sdk": "npm:@modelcontextprotocol/sdk@^1.0.1"
    }
  }
  ```

##### TDD Step 3: Refactor & Verify
- [x] `deno check` でインポートが解決されることを確認
- [x] 再度テストを実行し、通過を確認

---

### process13 統合テスト
#### sub1 MCPサーバー統合テストを作成
@target: `tests/mcp/integration/mcp_server_integration_test.ts`
@ref: `tests/integration/lsp_server_integration_test.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/integration/mcp_server_integration_test.ts`
- [x] テストケースを作成
  - initialize → initialized フローが成功するか
  - tools/list で meta_check, meta_generate が返るか
  - tools/call で meta_check が正常実行されるか
  - tools/call で meta_generate が正常実行されるか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [x] モックトランスポートを使用した統合テストを作成
- [x] E2Eフローの検証

##### TDD Step 3: Refactor & Verify
- [x] テストを実行し、通過することを確認
- [x] 全体のテストスイートを実行
- [x] 再度テストを実行し、通過を確認

---

### process50 フォローアップ
- [ ] Phase 2: 全CLIコマンドのTool化（generate, view, element, lsp, meta watch）
- [ ] Phase 3: Resources実装（project/structure, characters, settings, chapters）
- [ ] Phase 4: Prompts実装（character_creation, manuscript_review）

---

### process100 リファクタリング
- [ ] LspTransportとMcpTransportの共通部分を抽出
- [ ] ツール定義のボイラープレートを削減
- [ ] エラーハンドリングの統一

---

### process200 ドキュメンテーション
- [ ] README.mdにMCPサーバーの使用方法を追記
- [ ] Claude Desktop設定例を追加
- [ ] CLAUDE.mdにMCP関連の情報を追加
- [ ] Issue #8にMCPサーバー実装完了のコメントを追加

