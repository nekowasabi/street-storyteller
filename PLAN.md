# title: Issue #8 MCPサーバー実装 - Phase 2-5 詳細実装計画

## 概要
- storytellerのCLIコマンドをMCP (Model Context Protocol) サーバーとして公開し、Claude Desktop等のMCPクライアントから自然言語でコマンドを実行できるようにする
- Phase 1（MCP基盤）は完了済み。Phase 2-5で残りの機能を実装する

### goal
- `storyteller mcp start --stdio` でMCPサーバーを起動し、Claude Desktopから以下が可能になる：
  - 全CLIコマンドの自然言語実行（element_create, view_browser等）
  - プロジェクトリソースの参照（キャラクター一覧、設定一覧等）
  - 創作支援プロンプトの利用（キャラクターアイデア生成等）
  - 自然言語コマンドの解析と実行

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール
- Phase 2: 全CLIコマンドをMCP Toolsとして公開（6ツール追加）
- Phase 3: プロジェクト構造をMCP Resourcesとして公開
- Phase 4: 創作支援プロンプトをMCP Promptsとして公開
- Phase 5: 自然言語コマンド解析機能の実装

## 実装仕様

### 技術的決定事項（Phase 1で確立済み）

| 項目 | 決定 | 理由 |
|------|------|------|
| SDK | `npm:@modelcontextprotocol/sdk@^1.0.1` | 公式SDK |
| トランスポート | stdio | LSPと同方式 |
| ツール変換 | executeCliCommand アダプター | CLI→MCP統一変換 |
| LSP統合 | LSPサービス直接使用 | 高パフォーマンス |

### 調査結果による設計根拠

1. **CLI→MCPツール変換パターン**（`src/mcp/tools/cli_adapter.ts`）
   - `executeCliCommand()` でCLIコマンドをMCPツールにラップ
   - 引数マッピングはほぼ1対1（ケバブケース→キャメルケース変換のみ）
   - 既存パターン（meta_check, meta_generate）を踏襲

2. **LSPサービス層**（`src/lsp/`）
   - `DiagnosticsGenerator`: 診断生成（`src/lsp/diagnostics/diagnostics_generator.ts`）
   - `PositionedDetector`: エンティティ検出（`src/lsp/detection/positioned_detector.ts`）
   - `loadEntities()`: エンティティ動的ロード（`src/application/meta/reference_detector.ts`）

3. **プロジェクトデータ取得**（`src/application/view/project_analyzer.ts`）
   - `loadCharacters()`: キャラクター一覧取得
   - `loadSettings()`: 設定一覧取得
   - `analyzeManuscripts()`: 原稿解析

## 生成AIの学習用コンテキスト

### 実装済みMCPツールの参照ファイル
- `/home/takets/repos/street-storyteller/src/mcp/tools/definitions/meta_check.ts`
  - MCPツール定義のパターン（inputSchema, execute関数）
- `/home/takets/repos/street-storyteller/src/mcp/tools/definitions/meta_generate.ts`
  - executeCliCommand()の使用方法
- `/home/takets/repos/street-storyteller/src/mcp/tools/cli_adapter.ts`
  - CLI→MCP変換アダプター

### CLIコマンドの参照ファイル
- `/home/takets/repos/street-storyteller/src/cli/modules/element/character.ts`
  - ElementCharacterCommand（element_createの参照）
- `/home/takets/repos/street-storyteller/src/cli/modules/view.ts`
  - ViewCommand（view_browserの参照）

### LSPサービスの参照ファイル
- `/home/takets/repos/street-storyteller/src/lsp/diagnostics/diagnostics_generator.ts`
  - 診断生成ロジック
- `/home/takets/repos/street-storyteller/src/lsp/detection/positioned_detector.ts`
  - エンティティ検出ロジック

### MCP型定義の参照ファイル
- `/home/takets/repos/street-storyteller/src/mcp/protocol/types.ts`
  - McpResource, McpPrompt型定義

---

## Process

### process14 element_create ツールの実装
#### sub1 キャラクター・設定作成をMCPツール化
@target: `src/mcp/tools/definitions/element_create.ts`
@ref: `src/cli/modules/element/character.ts`, `src/mcp/tools/definitions/meta_check.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/definitions/element_create_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - ツール定義がMCP仕様に準拠しているか
  - inputSchemaが正しく定義されているか（type, name, role, summary等）
  - character typeで正常実行されるか
  - 必須パラメータ（type, name）不足でエラーを返すか
  - setting typeも将来対応可能な設計か

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/tools/definitions/element_create.ts` を作成
  ```typescript
  export const elementCreateTool: McpToolDefinition = {
    name: "element_create",
    description: "物語要素（キャラクター、設定等）を作成します",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["character", "setting"], description: "要素タイプ" },
        name: { type: "string", description: "要素名（ID）" },
        role: { type: "string", description: "キャラクターの役割" },
        summary: { type: "string", description: "概要説明" },
        traits: { type: "array", items: { type: "string" }, description: "特徴リスト" },
        withDetails: { type: "boolean", description: "詳細情報を含めるか" },
        force: { type: "boolean", description: "上書き許可" }
      },
      required: ["type", "name"]
    },
    execute: async (args) => {
      // ElementCharacterCommand を使用
    }
  };
  ```
- [ ] executeCliCommand() でCLIコマンドをラップ
- [ ] 引数変換ロジックを実装（MCP→CLI形式）

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process15 view_browser ツールの実装
#### sub1 HTML可視化をMCPツール化
@target: `src/mcp/tools/definitions/view_browser.ts`
@ref: `src/cli/modules/view.ts`, `src/mcp/tools/definitions/meta_check.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/definitions/view_browser_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - ツール定義がMCP仕様に準拠しているか
  - inputSchemaが正しく定義されているか（path, port, dryRun等）
  - dry-runモードで正常動作するか
  - サーバー起動の検証（モック使用）

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/tools/definitions/view_browser.ts` を作成
  ```typescript
  export const viewBrowserTool: McpToolDefinition = {
    name: "view_browser",
    description: "プロジェクト構造をHTML形式で可視化します",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "プロジェクトパス" },
        port: { type: "number", description: "サーバーポート" },
        dryRun: { type: "boolean", description: "プレビューのみ" }
      }
    },
    execute: async (args) => {
      // ViewCommand を使用
    }
  };
  ```

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process16 lsp_validate ツールの実装
#### sub1 原稿診断をMCPツール化（LSPサービス直接使用）
@target: `src/mcp/tools/definitions/lsp_validate.ts`
@ref: `src/lsp/diagnostics/diagnostics_generator.ts`, `src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/definitions/lsp_validate_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - ツール定義がMCP仕様に準拠しているか
  - 原稿ファイルパスで診断実行できるか
  - 診断結果がJSON形式で返却されるか
  - ファイル不在時にエラーを返すか
  - ディレクトリ指定で複数ファイル診断できるか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/tools/definitions/lsp_validate.ts` を作成
  ```typescript
  export const lspValidateTool: McpToolDefinition = {
    name: "lsp_validate",
    description: "原稿ファイルの整合性診断を実行します",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Markdownファイルパス" },
        dir: { type: "string", description: "ディレクトリパス" },
        recursive: { type: "boolean", description: "再帰検索" }
      }
    },
    execute: async (args) => {
      // DiagnosticsGenerator + PositionedDetector を直接使用
      const detector = new PositionedDetector(entities);
      const diagnostics = diagnosticsGenerator.generate(uri, content, projectPath);
      return { content: [{ type: "text", text: JSON.stringify(diagnostics) }] };
    }
  };
  ```
- [ ] loadEntities() でエンティティを動的ロード
- [ ] DiagnosticsGenerator.generate() で診断実行
- [ ] 診断結果をJSON形式でフォーマット

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process17 lsp_find_references ツールの実装
#### sub1 参照検索をMCPツール化（LSPサービス直接使用）
@target: `src/mcp/tools/definitions/lsp_find_references.ts`
@ref: `src/lsp/detection/positioned_detector.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/tools/definitions/lsp_find_references_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - ツール定義がMCP仕様に準拠しているか
  - キャラクター名で参照検索できるか
  - 設定名で参照検索できるか
  - 位置情報（ファイル、行、列）を含む結果が返るか
  - 参照がない場合に空配列を返すか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/tools/definitions/lsp_find_references.ts` を作成
  ```typescript
  export const lspFindReferencesTool: McpToolDefinition = {
    name: "lsp_find_references",
    description: "指定エンティティへの参照箇所を検索します",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "検索対象パス" },
        characterName: { type: "string", description: "キャラクター名" },
        settingName: { type: "string", description: "設定名" }
      }
    },
    execute: async (args) => {
      // PositionedDetector.detectWithPositions() を使用
    }
  };
  ```
- [ ] PositionedDetector.detectWithPositions() で全マッチ取得
- [ ] フィルタリング（指定されたエンティティのみ）
- [ ] Location形式で結果を返却

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process18 ツールレジストリへの新規ツール登録
#### sub1 Phase 2で追加したツールをレジストリに登録
@target: `src/mcp/server/handlers/tools.ts`
@ref: `src/mcp/tools/tool_registry.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/server/handlers/tools_test.ts` （既存テストに追加）
- [ ] テストケースを追加
  - createDefaultToolRegistry() が新規ツールを含むか
  - element_create, view_browser, lsp_validate, lsp_find_references が登録されているか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/server/handlers/tools.ts` を修正
  - elementCreateTool をインポート・登録
  - viewBrowserTool をインポート・登録
  - lspValidateTool をインポート・登録
  - lspFindReferencesTool をインポート・登録

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process19 リソースプロバイダー基盤の実装
#### sub1 ResourceProviderインターフェースとURI解析を実装
@target: `src/mcp/resources/resource_provider.ts`, `src/mcp/resources/uri_parser.ts`
@ref: `src/mcp/protocol/types.ts`, `src/application/view/project_analyzer.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/resources/uri_parser_test.ts`, `tests/mcp/resources/resource_provider_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - URI解析が正しく動作するか
    - `storyteller://characters` → `{ type: "characters", id: null }`
    - `storyteller://character/hero` → `{ type: "character", id: "hero" }`
  - ResourceProviderインターフェースの型定義が正しいか
  - listResources() が全リソース返却するか
  - readResource() が正確なデータを返却するか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/resources/uri_parser.ts` を作成
  ```typescript
  export type ParsedUri = {
    type: "characters" | "character" | "settings" | "setting" | "chapters" | "manuscript" | "project";
    id?: string;
  };
  export function parseResourceUri(uri: string): ParsedUri;
  ```
- [ ] `src/mcp/resources/resource_provider.ts` を作成
  ```typescript
  export interface ResourceProvider {
    listResources(): Promise<McpResource[]>;
    readResource(uri: string): Promise<string>;
  }
  ```

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process20 ProjectResourceProviderの実装
#### sub1 プロジェクトデータをリソースとして公開
@target: `src/mcp/resources/project_resource_provider.ts`
@ref: `src/application/view/project_analyzer.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/resources/project_resource_provider_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - キャラクター一覧リソースが取得できるか
  - 設定一覧リソースが取得できるか
  - 個別キャラクターリソースが取得できるか
  - プロジェクト構造リソースが取得できるか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/resources/project_resource_provider.ts` を作成
  ```typescript
  export class ProjectResourceProvider implements ResourceProvider {
    constructor(private projectPath: string) {}

    async listResources(): Promise<McpResource[]> {
      // ProjectAnalyzer を使用してリソース一覧を生成
    }

    async readResource(uri: string): Promise<string> {
      const parsed = parseResourceUri(uri);
      // 種類に応じてデータを取得・JSON化
    }
  }
  ```
- [ ] loadCharacters(), loadSettings() でデータ取得
- [ ] JSON形式でシリアライズ

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process21 MCPサーバーにリソースハンドラー統合
#### sub1 resources/list, resources/read メソッドを追加
@target: `src/mcp/server/handlers/resources.ts`, `src/mcp/server/server.ts`
@ref: `src/mcp/server/handlers/tools.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/server/handlers/resources_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - handleResourcesList() が全リソースを返すか
  - handleResourcesRead() が指定リソースを返すか
  - 不正なURIでエラーを返すか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/server/handlers/resources.ts` を作成
  ```typescript
  export async function handleResourcesList(provider: ResourceProvider): Promise<McpResource[]>
  export async function handleResourcesRead(provider: ResourceProvider, uri: string): Promise<string>
  ```
- [ ] `src/mcp/server/server.ts` を修正
  - resources/list メソッドハンドラー追加
  - resources/read メソッドハンドラー追加
- [ ] `src/mcp/server/capabilities.ts` を修正
  - resources 機能を追加

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process22 プロンプトレジストリ基盤の実装
#### sub1 PromptRegistryとハンドラーを実装
@target: `src/mcp/prompts/prompt_registry.ts`, `src/mcp/server/handlers/prompts.ts`
@ref: `src/mcp/tools/tool_registry.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/prompts/prompt_registry_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - プロンプト登録ができるか
  - プロンプト取得ができるか
  - プロンプト一覧取得ができるか
  - getMessages() でメッセージ生成ができるか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/prompts/prompt_registry.ts` を作成
  ```typescript
  export type McpPromptDefinition = {
    name: string;
    description: string;
    arguments?: McpPromptArgument[];
    getMessages: (args: Record<string, string>) => McpPromptMessage[];
  };

  export class PromptRegistry {
    register(prompt: McpPromptDefinition): void;
    get(name: string): McpPromptDefinition | undefined;
    listPrompts(): McpPromptDefinition[];
  }
  ```
- [ ] `src/mcp/server/handlers/prompts.ts` を作成
  - handlePromptsList()
  - handlePromptsGet()

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process23 創作支援プロンプトの実装
#### sub1 character_brainstorm, plot_suggestion, scene_improvement を実装
@target: `src/mcp/prompts/definitions/`
@ref: なし（新規）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/prompts/definitions/creative_prompts_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - character_brainstorm がロール引数を受け取り適切なメッセージを生成するか
  - plot_suggestion がジャンル引数を受け取り適切なメッセージを生成するか
  - scene_improvement がシーン情報を受け取り適切なメッセージを生成するか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/prompts/definitions/character_brainstorm.ts` を作成
- [ ] `src/mcp/prompts/definitions/plot_suggestion.ts` を作成
- [ ] `src/mcp/prompts/definitions/scene_improvement.ts` を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process24 ワークフロープロンプトの実装
#### sub1 project_setup_wizard, chapter_review, consistency_fix を実装
@target: `src/mcp/prompts/definitions/`
@ref: なし（新規）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/prompts/definitions/workflow_prompts_test.ts`
- [ ] テストケースを作成
  - 各プロンプトが適切な引数を受け取りメッセージを生成するか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/prompts/definitions/project_setup_wizard.ts` を作成
- [ ] `src/mcp/prompts/definitions/chapter_review.ts` を作成
- [ ] `src/mcp/prompts/definitions/consistency_fix.ts` を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process25 インテント解析の実装
#### sub1 自然言語からインテントを抽出
@target: `src/mcp/nlp/intent_analyzer.ts`
@ref: なし（新規）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/nlp/intent_analyzer_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - 「キャラクターを作って」→ element_create インテント
  - 「メタデータをチェックして」→ meta_check インテント
  - 「原稿の整合性を確認」→ lsp_validate インテント
  - 信頼度スコアが0.0-1.0の範囲で返るか
  - パラメータが正しく抽出されるか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/nlp/intent_analyzer.ts` を作成
  ```typescript
  export type Intent = {
    action: string;
    params: Record<string, unknown>;
    confidence: number;
  };

  export class IntentAnalyzer {
    analyze(input: string): Intent;
  }
  ```
- [ ] パターンマッチング（正規表現ベース）で実装
- [ ] キーワード辞書を定義

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

---

### process26 コマンドマッピングの実装
#### sub1 インテントをMCPツール名にマッピング
@target: `src/mcp/nlp/command_mapper.ts`
@ref: `src/mcp/tools/tool_registry.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/nlp/command_mapper_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - element_create インテント → "element_create" ツール名
  - 未知のインテント → null
  - パラメータの正規化が正しいか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/nlp/command_mapper.ts` を作成
  ```typescript
  export class CommandMapper {
    mapToTool(intent: Intent): string | null;
    normalizeParams(intent: Intent): Record<string, unknown>;
  }
  ```

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process27 コンテキスト管理の実装
#### sub1 セッションとプロジェクトコンテキストを管理
@target: `src/mcp/context/session_context.ts`, `src/mcp/context/project_context.ts`
@ref: なし（新規）

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/mcp/context/context_test.ts`
- [ ] テストケースを作成（この時点で実装がないため失敗する）
  - SessionContext が履歴を保持するか
  - ProjectContext がエンティティをキャッシュするか

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `src/mcp/context/session_context.ts` を作成
- [ ] `src/mcp/context/project_context.ts` を作成

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 再度テストを実行し、通過を確認

---

### process50 フォローアップ
- [ ] 複合操作ツールの追加検討（rename_character, analyze_consistency, export_summary）
- [ ] リソース購読（resources/subscribe）の実装検討
- [ ] LLM連携によるインテント解析の精度向上

---

### process100 リファクタリング
- [ ] LspTransportとMcpTransportの共通部分を抽出
- [ ] ツール定義のボイラープレートを削減
- [ ] エラーハンドリングの統一
- [ ] リソースプロバイダーのキャッシング最適化

---

### process200 ドキュメンテーション
- [ ] README.mdにMCPサーバーの使用方法を追記
- [ ] Claude Desktop設定例を追加
- [ ] CLAUDE.mdにMCP関連の情報を追加
- [ ] Issue #8にMCPサーバー実装完了のコメントを追加
- [ ] 各MCPツール/リソース/プロンプトのAPIドキュメント

---

## ファイル作成一覧

### Phase 2: MCPツール追加
```
src/mcp/tools/definitions/
├── element_create.ts
├── view_browser.ts
├── lsp_validate.ts
└── lsp_find_references.ts

tests/mcp/tools/definitions/
├── element_create_test.ts
├── view_browser_test.ts
├── lsp_validate_test.ts
└── lsp_find_references_test.ts
```

### Phase 3: MCPリソース
```
src/mcp/resources/
├── resource_provider.ts
├── project_resource_provider.ts
└── uri_parser.ts

src/mcp/server/handlers/
└── resources.ts

tests/mcp/resources/
├── resource_provider_test.ts
├── project_resource_provider_test.ts
└── uri_parser_test.ts

tests/mcp/server/handlers/
└── resources_test.ts
```

### Phase 4: MCPプロンプト
```
src/mcp/prompts/
├── prompt_registry.ts
└── definitions/
    ├── character_brainstorm.ts
    ├── plot_suggestion.ts
    ├── scene_improvement.ts
    ├── project_setup_wizard.ts
    ├── chapter_review.ts
    └── consistency_fix.ts

src/mcp/server/handlers/
└── prompts.ts

tests/mcp/prompts/
├── prompt_registry_test.ts
└── definitions/
    ├── creative_prompts_test.ts
    └── workflow_prompts_test.ts
```

### Phase 5: NLP
```
src/mcp/nlp/
├── intent_analyzer.ts
├── command_mapper.ts
└── param_extractor.ts

src/mcp/context/
├── session_context.ts
└── project_context.ts

tests/mcp/nlp/
├── intent_analyzer_test.ts
├── command_mapper_test.ts
└── param_extractor_test.ts

tests/mcp/context/
└── context_test.ts
```

### 修正対象
```
src/mcp/server/server.ts          - リソース/プロンプトハンドラー追加
src/mcp/server/capabilities.ts    - resources, prompts機能追加
src/mcp/server/handlers/tools.ts  - 新規ツール登録
```

---

## 成功指標

- [ ] 全新規ツール（4つ）がClaude Desktopから実行可能
- [ ] 全リソースがMCPクライアントで参照可能
- [ ] 全プロンプト（6つ）が利用可能
- [ ] 自然言語解析の基本動作確認
- [ ] 全テストがパス
- [ ] Issue #8のチェックボックスが全て更新される

