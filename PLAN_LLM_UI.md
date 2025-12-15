# title: LLM UI/UX統合 - ディレクター機能と3プラットフォーム対応

## 概要
- street-storytellerプロジェクトに対して、ユーザーの質問や指示に応答するための統合UIを実現
- 「物語のディレクター」としてプロジェクト全体を把握し、創作的な観点から応答するLLM統合
- 3つのプラットフォーム（Claude Desktop、Claude Code、Neovim）での一貫した体験を提供

### goal
- Claude Desktopでstory_directorプロンプトを使い、プロジェクト全体について質問・指示できる
- Claude Codeでスラッシュコマンド（/story-director）を使い、同様の機能を利用できる
- NeovimでDenopsプラグインを通じて、執筆中にAI支援を受けられる

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテストが通過していること

## 開発のゴール
- プロジェクト全体を把握した「ディレクター役」のLLM応答機能
- Claude Desktop / Claude Code / Neovimでの統一されたUX
- システムプロンプトの管理をドキュメントベースで行う

## 実装仕様

### ディレクター機能の要件
1. **プロジェクト情報の動的取得**: キャラクター、設定、チャプター情報をコンテキストに含める
2. **創作的アドバイス**: 物語全体の俯瞰、伏線配置、キャラクターアーク等の提案
3. **技術的支援**: storyteller CLIコマンドの案内、型定義の活用方法

### プラットフォーム別実装
| プラットフォーム | 実装方式 | エントリポイント |
|----------------|---------|----------------|
| Claude Desktop | MCPプロンプト | `src/mcp/prompts/definitions/story_director.ts` |
| Claude Code | スラッシュコマンド | `.claude/commands/story-director.md` |
| Neovim | Denopsプラグイン | `~/.config/nvim/plugged/street-storyteller.vim/` |

## 生成AIの学習用コンテキスト

### 既存MCP実装（参照パターン）
- `src/mcp/prompts/prompt_registry.ts`
  - McpPromptDefinition型の定義
  - PromptRegistryクラスの実装パターン
- `src/mcp/prompts/definitions/character_brainstorm.ts`
  - 既存プロンプトの実装例（arguments, getMessages）
- `src/mcp/server/server.ts`
  - MCPサーバーでのプロンプト登録・呼び出しパターン

### 既存リソース実装
- `src/mcp/resources/project_resource_provider.ts`
  - `storyteller://project`リソースの実装
  - ProjectAnalyzerによるプロジェクト情報取得
- `src/mcp/resources/resource_registry.ts`
  - リソースレジストリのパターン

### CLI実装パターン
- `src/cli/command_registry.ts`
  - コマンド登録パターン
- `src/cli/modules/lsp/validate.ts`
  - 既存CLIコマンドの実装例

### 型定義
- `src/type/v2/character.ts`
  - Character型（displayNames, aliases等LSP用フィールド含む）
- `src/type/v2/setting.ts`
  - Setting型

---

## Process

### process1 システムプロンプトドキュメント作成

#### sub1 共通コアプロンプト作成
@target: `docs/prompts/core.md`
@ref: `CLAUDE.md`, `src/mcp/prompts/definitions/character_brainstorm.ts`

##### TDD Step 1: Red（失敗するテストを作成）
@test: `tests/docs/prompts_test.ts`
- [ ] プロンプトファイルの存在確認テスト
  - `docs/prompts/core.md`が存在すること
  - 必須セクション（コアバリュー、プロジェクト構造、参照システム）が含まれること

##### TDD Step 2: Green（テストを通過させる最小限の実装）
- [ ] `docs/prompts/core.md`を作成
  - SaC（StoryWriting as Code）コンセプトの説明
  - プロジェクト構造（src/characters/, src/settings/, manuscripts/）
  - 参照システム（@hero明示的参照、暗黙的参照、信頼度）
  - 応答原則（簡潔、構造的、日本語対応）

##### TDD Step 3: Refactor & Verify
- [ ] テストを実行し、通過することを確認
- [ ] 必要に応じてリファクタリング
- [ ] 再度テストを実行し、通過を確認

#### sub2 ディレクター用プロンプト作成
@target: `docs/prompts/director.md`
@ref: `docs/prompts/core.md`

##### TDD Step 1: Red
@test: `tests/docs/prompts_test.ts`
- [ ] `docs/prompts/director.md`が存在すること
- [ ] 必須セクション（役割、応答スタイル、回答フォーマット）が含まれること

##### TDD Step 2: Green
- [ ] `docs/prompts/director.md`を作成
  - 物語ディレクターとしての役割定義
  - 全体像把握、創作的アドバイス、技術的支援の3軸
  - 分析質問/創作相談/技術質問への回答フォーマット

##### TDD Step 3: Refactor & Verify
- [ ] テスト実行・通過確認
- [ ] リファクタリング・再テスト

#### sub3 プラットフォーム別プロンプト作成
@target: `docs/prompts/claude-desktop.md`, `docs/prompts/claude-code.md`, `docs/prompts/neovim.md`

##### TDD Step 1: Red
@test: `tests/docs/prompts_test.ts`
- [ ] 各プラットフォーム用ファイルが存在すること
- [ ] プラットフォーム固有の情報（利用可能なツール/コマンド）が含まれること

##### TDD Step 2: Green
- [ ] `docs/prompts/claude-desktop.md`作成
  - MCPツール一覧（element_create, meta_check等）
  - MCPリソース一覧（storyteller://project等）
  - 対話パターン例
- [ ] `docs/prompts/claude-code.md`作成
  - CLIコマンド一覧
  - スラッシュコマンド一覧
  - JSON出力モードの説明
- [ ] `docs/prompts/neovim.md`作成
  - Denopsコマンド一覧
  - キーマッピング推奨設定
  - 簡潔応答モードの説明

##### TDD Step 3: Refactor & Verify
- [ ] テスト実行・通過確認
- [ ] リファクタリング・再テスト

---

### process2 MCPディレクタープロンプト実装

#### sub1 プロンプト定義作成
@target: `src/mcp/prompts/definitions/story_director.ts`
@ref: `src/mcp/prompts/definitions/character_brainstorm.ts`, `src/mcp/prompts/prompt_registry.ts`

##### TDD Step 1: Red
@test: `tests/mcp/prompts/story_director_test.ts`
- [ ] storyDirectorPromptがMcpPromptDefinition型に準拠すること
- [ ] name: "story_director"であること
- [ ] arguments: question(必須), focus(任意)を持つこと
- [ ] getMessages()が適切なsystem/userメッセージを返すこと

##### TDD Step 2: Green
- [ ] `src/mcp/prompts/definitions/story_director.ts`を作成
  ```typescript
  export const storyDirectorPrompt: McpPromptDefinition = {
    name: "story_director",
    description: "物語のディレクターとして、プロジェクト全体を把握し応答",
    arguments: [
      { name: "question", required: true, description: "質問または指示" },
      { name: "focus", required: false, description: "フォーカス領域" }
    ],
    getMessages: (args) => [
      { role: "system", content: DIRECTOR_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(args) }
    ]
  };
  ```

##### TDD Step 3: Refactor & Verify
- [ ] `deno test tests/mcp/prompts/story_director_test.ts`
- [ ] リファクタリング・再テスト

#### sub2 レジストリへの登録
@target: `src/mcp/server/server.ts`
@ref: `src/mcp/prompts/prompt_registry.ts`

##### TDD Step 1: Red
@test: `tests/mcp/server/prompts_integration_test.ts`
- [ ] MCPサーバーがstory_directorプロンプトをリスト表示すること
- [ ] prompts/getでstory_directorのメッセージを取得できること

##### TDD Step 2: Green
- [ ] `src/mcp/server/server.ts`でstoryDirectorPromptをregistryに登録
  ```typescript
  import { storyDirectorPrompt } from "../prompts/definitions/story_director.ts";
  promptRegistry.register(storyDirectorPrompt);
  ```

##### TDD Step 3: Refactor & Verify
- [ ] 統合テスト実行・通過確認
- [ ] MCPサーバー起動テスト（手動）

---

### process3 Claude Codeスラッシュコマンド作成

#### sub1 ディレクターコマンド
@target: `.claude/commands/story-director.md`

##### TDD Step 1: Red
@test: なし（ドキュメントファイルのため手動検証）
- [ ] ファイル存在確認
- [ ] Claude Code上で/story-directorが認識されること

##### TDD Step 2: Green
- [ ] `.claude/commands/story-director.md`を作成
  ```markdown
  物語のディレクターとして質問に回答します。

  ## コンテキスト収集
  storyteller://project リソースを参照
  storyteller://characters リソースを参照
  storyteller://settings リソースを参照

  ## 質問
  $ARGUMENTS
  ```

##### TDD Step 3: Refactor & Verify
- [ ] Claude Codeで`/story-director キャラクター構成を評価して`を実行
- [ ] 適切な応答が返ることを確認

#### sub2 補助コマンド群
@target: `.claude/commands/story-check.md`, `.claude/commands/story-char.md`, `.claude/commands/story-view.md`

##### TDD Step 1: Red
- [ ] 各ファイル存在確認

##### TDD Step 2: Green
- [ ] `story-check.md`: `storyteller lsp validate --dir manuscripts --recursive`呼び出し
- [ ] `story-char.md`: `storyteller element character`呼び出し
- [ ] `story-view.md`: `storyteller view --serve`呼び出し

##### TDD Step 3: Refactor & Verify
- [ ] 各コマンドの動作確認

---

### process4 Neovim Denopsプラグイン作成

#### sub1 プラグイン基本構造
@target: `~/.config/nvim/plugged/street-storyteller.vim/`

##### TDD Step 1: Red
@test: `tests/denops/structure_test.ts`
- [ ] 必須ファイルの存在確認
  - `plugin/storyteller.vim`
  - `denops/storyteller/main.ts`
  - `denops/storyteller/deps.ts`

##### TDD Step 2: Green
- [ ] `plugin/storyteller.vim`作成（Vimスクリプトエントリ）
  ```vim
  if exists('g:loaded_storyteller')
    finish
  endif
  let g:loaded_storyteller = 1
  let g:storyteller_openrouter_key = get(g:, 'storyteller_openrouter_key', $OPENROUTER_API_KEY)
  ```
- [ ] `denops/storyteller/deps.ts`作成（依存関係）
  ```typescript
  export { Denops } from "https://deno.land/x/denops_std@v6.0.0/mod.ts";
  export * as fn from "https://deno.land/x/denops_std@v6.0.0/function/mod.ts";
  export * as vars from "https://deno.land/x/denops_std@v6.0.0/variable/mod.ts";
  ```
- [ ] `denops/storyteller/main.ts`作成（エントリポイント）

##### TDD Step 3: Refactor & Verify
- [ ] Neovimで`:Denops storyteller`が読み込まれることを確認

#### sub2 Openrouter API統合
@target: `denops/storyteller/api/openrouter.ts`

##### TDD Step 1: Red
@test: `tests/denops/api/openrouter_test.ts`
- [ ] callOpenrouter関数が存在すること
- [ ] APIキー、モデル、プロンプトを受け取ること
- [ ] レスポンスを返すこと

##### TDD Step 2: Green
- [ ] `openrouter.ts`実装
  ```typescript
  export interface OpenrouterRequest {
    apiKey: string;
    model: string;
    systemPrompt: string;
    userPrompt: string;
  }

  export async function callOpenrouter(req: OpenrouterRequest): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${req.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: req.model,
        messages: [
          { role: "system", content: req.systemPrompt },
          { role: "user", content: req.userPrompt },
        ],
      }),
    });
    const data = await response.json();
    return data.choices[0].message.content;
  }
  ```

##### TDD Step 3: Refactor & Verify
- [ ] テスト実行（モック使用）
- [ ] 実際のAPI呼び出しテスト（手動）

#### sub3 コンテキスト収集
@target: `denops/storyteller/context/collector.ts`

##### TDD Step 1: Red
@test: `tests/denops/context/collector_test.ts`
- [ ] collectContext関数が存在すること
- [ ] バッファ情報を返すこと
- [ ] storyteller CLIからプロジェクト情報を取得すること

##### TDD Step 2: Green
- [ ] `collector.ts`実装
  - Neovimバッファからカーソル位置、ファイル名、内容を取得
  - `storyteller meta check --json`でプロジェクト情報取得
  - LSP診断情報を取得（vim.diagnostic.get相当）

##### TDD Step 3: Refactor & Verify
- [ ] テスト実行
- [ ] Neovim上での動作確認

#### sub4 ディレクターコマンド実装
@target: `denops/storyteller/commands/director.ts`

##### TDD Step 1: Red
@test: `tests/denops/commands/director_test.ts`
- [ ] executeDirector関数が存在すること
- [ ] コンテキストを収集してOpenrouter APIを呼び出すこと
- [ ] 結果をフローティングウィンドウに表示すること

##### TDD Step 2: Green
- [ ] `director.ts`実装
  ```typescript
  export async function executeDirector(denops: Denops): Promise<void> {
    const context = await collectContext(denops);
    const apiKey = await vars.g.get(denops, "storyteller_openrouter_key");
    const response = await callOpenrouter({
      apiKey,
      model: "anthropic/claude-3.5-sonnet",
      systemPrompt: DIRECTOR_SYSTEM_PROMPT,
      userPrompt: buildPrompt(context),
    });
    await showFloatWindow(denops, response);
  }
  ```

##### TDD Step 3: Refactor & Verify
- [ ] テスト実行
- [ ] Neovimで`:StoryDirector`実行確認

#### sub5 フローティングウィンドウUI
@target: `denops/storyteller/ui/float_window.ts`

##### TDD Step 1: Red
@test: `tests/denops/ui/float_window_test.ts`
- [ ] showFloatWindow関数が存在すること
- [ ] 指定されたテキストを表示すること

##### TDD Step 2: Green
- [ ] `float_window.ts`実装
  ```typescript
  export async function showFloatWindow(denops: Denops, content: string): Promise<void> {
    const bufnr = await fn.nvim_create_buf(denops, false, true);
    const lines = content.split('\n');
    await fn.nvim_buf_set_lines(denops, bufnr, 0, -1, false, lines);
    await fn.nvim_open_win(denops, bufnr, true, {
      relative: 'cursor',
      width: 60,
      height: Math.min(lines.length, 20),
      row: 1,
      col: 0,
      style: 'minimal',
      border: 'rounded',
    });
  }
  ```

##### TDD Step 3: Refactor & Verify
- [ ] テスト実行
- [ ] Neovim上での表示確認

#### sub6 main.tsへの統合
@target: `denops/storyteller/main.ts`

##### TDD Step 1: Red
@test: `tests/denops/main_test.ts`
- [ ] dispatcherにdirector, improve, ask, validateが登録されていること
- [ ] コマンドが定義されていること

##### TDD Step 2: Green
- [ ] `main.ts`でdispatcherを設定
  ```typescript
  export async function main(denops: Denops): Promise<void> {
    denops.dispatcher = {
      director: () => executeDirector(denops),
      improve: () => executeImprove(denops),
      ask: (question: unknown) => executeAsk(denops, String(question)),
      validate: () => executeValidate(denops),
    };
    await denops.cmd(`command! StoryDirector call denops#request('storyteller', 'director', [])`);
    await denops.cmd(`command! -range StoryImprove call denops#request('storyteller', 'improve', [])`);
    await denops.cmd(`command! -nargs=+ StoryAsk call denops#request('storyteller', 'ask', [<q-args>])`);
    await denops.cmd(`command! StoryValidate call denops#request('storyteller', 'validate', [])`);
  }
  ```

##### TDD Step 3: Refactor & Verify
- [ ] 全コマンドの動作確認

---

### process10 ユニットテスト（追加・統合テスト）

- [ ] MCPサーバー統合テスト: story_directorプロンプトのE2Eテスト
- [ ] Denopsプラグイン統合テスト: 全コマンドの連携テスト
- [ ] コンテキスト収集の境界値テスト（大きなファイル、空のプロジェクト等）

---

### process50 フォローアップ
（実装後に仕様変更などが発生した場合は、ここにProcessを追加する）

---

### process100 リファクタリング

- [ ] システムプロンプトの共通部分をモジュール化
- [ ] Denopsプラグインのエラーハンドリング強化
- [ ] APIレート制限への対応

---

### process200 ドキュメンテーション

- [ ] `docs/ui-guide.md`: 各UI別利用ガイド作成
- [ ] Neovimプラグイン `README.md`: インストール・設定方法
- [ ] `CLAUDE.md`更新: storyteller UI統合セクション追加
- [ ] `docs/mcp.md`更新: story_directorプロンプトの追加

---

## 調査結果サマリー（根拠）

### 既存MCP実装パターン
```
src/mcp/prompts/
├── prompt_registry.ts      # McpPromptDefinition型、PromptRegistryクラス
└── definitions/
    ├── character_brainstorm.ts  # 参照パターン
    ├── plot_suggestion.ts
    ├── scene_improvement.ts
    ├── project_setup_wizard.ts
    ├── chapter_review.ts
    └── consistency_fix.ts
```

### MCPリソース実装
```
src/mcp/resources/
├── project_resource_provider.ts  # storyteller://project実装
└── resource_registry.ts
```

### LSP/検証機能
```
src/lsp/
├── detection/positioned_detector.ts  # エンティティ検出
├── diagnostics/diagnostics_generator.ts
└── providers/code_action_provider.ts
```

### CLI構造
```
src/cli/
├── command_registry.ts
└── modules/
    ├── lsp/validate.ts
    ├── element/character.ts
    └── mcp/start.ts
```

### 型定義
```
src/type/v2/
├── character.ts  # displayNames, aliases, detectionHints
└── setting.ts
```
