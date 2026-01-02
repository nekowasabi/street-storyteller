# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## プロジェクト概要

**street-storyteller** は、SaC (StoryWriting as Code)
というコンセプトに基づいた物語作成支援ツールです。物語の構造をコードで定義し、検証可能にすることで、創作プロセスを支援します。

## 開発環境

- **ランタイム**: Deno v2.2.12
- **言語**: TypeScript
- **テストフレームワーク**: Deno標準テストランナー

## コマンド一覧

### 基本コマンド

```bash
# メインスクリプトの実行
deno run main.ts

# テストの実行
deno test

# 特定のテストファイルを実行
deno test tests/main_test.ts

# テスト名でフィルタリング
deno test --filter "test name"

# ファイル監視モードでテスト
deno test --watch

# カバレッジ付きテスト
deno test --coverage
```

## MCP (Claude Desktop) 統合

`storyteller` は MCP (Model Context Protocol)
サーバーとしても起動できます（stdio）。

```bash
storyteller mcp start --stdio
storyteller mcp start --stdio --path /path/to/story-project
```

MCPサーバーは以下を公開します：

- Tools: `meta_check`, `meta_generate`, `element_create`, `view_browser`,
  `lsp_validate`, `lsp_find_references`, `timeline_create`, `event_create`,
  `event_update`, `timeline_view`, `timeline_analyze`, `foreshadowing_create`,
  `foreshadowing_view`, `manuscript_binding`
- Resources: `storyteller://project`, `storyteller://characters`,
  `storyteller://character/<id>`, `storyteller://settings`,
  `storyteller://setting/<id>`, `storyteller://timelines`,
  `storyteller://timeline/<id>`, `storyteller://foreshadowings`,
  `storyteller://foreshadowing/<id>`
  - `?expand=details`クエリパラメータ:
    キャラクター/設定リソースでファイル参照を解決して返す
- Prompts: `character_brainstorm`, `plot_suggestion`, `scene_improvement`,
  `project_setup_wizard`, `chapter_review`, `consistency_fix`,
  `timeline_brainstorm`, `event_detail_suggest`, `causality_analysis`,
  `timeline_consistency_check`

詳細は `docs/mcp.md` を参照してください。

## アーキテクチャ概要

### 中心的なインターフェース

`StoryTeller`インターフェース（`src/storyteller_interface.ts`）が本プロジェクトの中核です：

- 物語の各要素（キャラクター、プロット、設定など）を型安全に管理
- `validate()`: 物語の整合性を検証
- `output()`: Markdown形式で物語を出力

### ディレクトリ構造

- `src/type/`: 物語の各要素の型定義
  - `purpose.ts`: 物語の目的
  - `character.ts`: キャラクター定義
  - `plot.ts`: プロット構造
  - `chapter.ts`: チャプター構成
  - `story_structure.ts`: 物語全体の構造
  - `timeline.ts`: 時系列管理
  - `fun.ts`: 面白さの要素
  - `setting.ts`: 世界観・設定
  - `theme.ts`: テーマ定義
- `tests/`: テストコード
- `main.ts`: エントリーポイント

### 重要な設計思想

1. **型安全性**: TypeScriptの型システムを活用し、物語の各要素を厳密に定義
2. **検証可能性**: 物語の構造的な整合性をプログラムで検証
3. **拡張性**: インターフェースベースの設計により、新しい物語要素の追加が容易

## 開発時の注意点

- 現在開発初期段階のため、多くの機能は未実装
- `main.ts`にはコメントアウトされたサンプルコードが含まれている
- 新機能追加時は、対応する型定義を`src/type/`に追加すること

### Neovim LSP設定の注意点（Deno/TypeScript開発）

このプロジェクトではDeno
LSP（denols）を使用しています。Neovimで開発する際の注意点：

#### LspSagaとdenolsの互換性問題

**問題**: LspSagaプラグインはdenolsと正しく連携できない場合があります。

- `,cd`（goto_definition）や`,ck`（hover）などのLspSagaコマンドがdenolsで動作しない
- `:lua vim.lsp.buf.definition()`等の直接呼び出しは正常に動作する

**解決策**:
TypeScriptファイルでは、LspSagaではなく`vim.lsp.buf`を直接使用するキーマッピングを設定する。

```lua
-- ~/.config/nvim/rc/plugins/lsp.vim に追加
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "typescript", "typescriptreact", "javascript", "javascriptreact" },
  callback = function()
    local opts = { buffer = true, silent = true }
    vim.keymap.set("n", ",cd", vim.lsp.buf.definition, opts)
    vim.keymap.set("n", ",ck", vim.lsp.buf.hover, opts)
    -- ... 他のマッピング
  end,
})
```

#### リテラル型値のホバードキュメント

**制限事項**: denolsはUnion
Typeのリテラル値（例：`"protagonist"`）にカーソルを合わせてもドキュメントを表示しません。

- `CharacterRole`などの型名にカーソルを合わせればJSDocが表示される
- 個別のリテラル値（`"protagonist"`、`"antagonist"`等）ではドキュメントが表示されない
- これはdenolsの仕様であり、storyteller LSPの問題ではない

**補完時のドキュメント表示**: storyteller
LSPをTypeScriptファイルに有効化することで、補完候補選択時にドキュメントが表示されます。

### src/配下でのimport mapエイリアス使用

**新規ファイル作成時は、相対パスではなく`@storyteller/`エイリアスを使用してください。**

```typescript
// ❌ 相対パス（非推奨）
import { Result } from "../../shared/result.ts";
import type { Character } from "../../../type/v2/character.ts";

// ✅ import mapエイリアス（推奨）
import { Result } from "@storyteller/shared/result.ts";
import type { Character } from "@storyteller/types/v2/character.ts";
```

`deno.json`で定義されているエイリアス:

```json
{
  "imports": {
    "@storyteller/": "./src/",
    "@storyteller/types/": "./src/type/"
  }
}
```

### samples/プロジェクトでのimport map使用

`samples/`ディレクトリ内のプロジェクト（cinderella,
momotaroなど）では、**相対パスではなくimport mapを使用すること**。

```typescript
// ❌ 相対パス（コードジャンプが動作しない）
import type { Character } from "../../../../src/type/v2/character.ts";

// ✅ import map（推奨）
import type { Character } from "@storyteller/types/v2/character.ts";
```

各サンプルプロジェクトの`deno.json`で定義されているimport map:

```json
{
  "imports": {
    "@storyteller/types/": "../../src/type/",
    "@storyteller/": "../../src/"
  }
}
```

相対パスを使用するとDeno
LSPが`import-map-remap`警告を表示し、コードジャンプが正しく動作しません。

## アクティブな仕様

- street-architecture-tdd-ready:
  アーキテクチャ基盤をTDDで構築し、将来の機能追加や既存プロジェクトのマイグレーションを容易にする計画
- street-cli-foundation-phase0: storyteller
  CLI基盤を構築し、グローバルコマンド化と補完機能を整える計画

## 進行中の機能開発

### 1. 型システムの拡張 (Issue #2)

物語要素の型定義を拡張し、より表現力豊かなモデリングを実現する計画が進行中です。

#### ハイブリッド方式の採用

- **型定義**: 重要なメタデータ（名前、役割、関係性等）を型安全に管理
- **詳細情報**: 短文はインライン、長文はMarkdownファイルで分離可能
- **段階的詳細化**: 必要に応じて後から詳細情報を追加

#### Character型の拡張案

```typescript
export type Character = {
  // 必須メタデータ
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "guest";
  traits: string[];
  relationships: { [characterName: string]: RelationType };
  appearingChapters: string[];
  summary: string;

  // オプショナルな詳細情報（ハイブリッド）
  details?: {
    description?: string | { file: string }; // 長文説明（summaryを超える詳細）
    appearance?: string | { file: string };
    personality?: string | { file: string };
    backstory?: string | { file: string };
    development?: CharacterDevelopment;
  };

  // LSP用の検出ヒント
  displayNames?: string[]; // 原稿で使用される名前
  aliases?: string[]; // 別名・愛称
  detectionHints?: {
    commonPatterns: string[];
    excludePatterns: string[];
    confidence: number;
  };
};
```

#### Setting型の詳細情報

```typescript
export type SettingDetails = {
  description?: string | { file: string }; // 長文説明（summaryを超える詳細）
  geography?: string | { file: string };
  history?: string | { file: string };
  culture?: string | { file: string };
  politics?: string | { file: string };
  economy?: string | { file: string };
  inhabitants?: string | { file: string };
  landmarks?: string | { file: string };
};
```

#### storytellerコマンドの拡張予定

```bash
# キャラクター作成（基本）
storyteller element character --name "hero" --role "protagonist" --summary "概要"

# 詳細情報付きで作成
storyteller element character --name "hero" --with-details

# 既存要素に詳細追加
storyteller element character --name "hero" --add-details "backstory,development"

# ファイル分離
storyteller element character --name "hero" --separate-files "backstory"
```

#### 詳細情報の表示（--detailsオプション） - 実装済み

キャラクターや設定の詳細情報を表示する際、`--details`オプションでファイル参照を解決して表示できます。

```bash
# キャラクター詳細表示（ファイル参照を解決）
storyteller view character --id hero --details

# 設定詳細表示（ファイル参照を解決）
storyteller view setting --id royal_capital --details

# 設定一覧表示
storyteller view setting --list
storyteller view setting --list --type location  # タイプでフィルタ
```

### 2. LSP統合による原稿チェック機能 (Issue #3) - 実装済み

Language Server Protocol統合により、リアルタイムで物語要素の整合性を検証します。

#### 実装済み機能

1. **@なしキャラクター検出**: 日本語の自然な文章でキャラクター参照を検出
2. **コードジャンプ**:
   原稿から型定義へのナビゲーション（`textDocument/definition`）
3. **ホバー情報**: カーソル位置のエンティティ情報表示（`textDocument/hover`）
4. **リアルタイム検証**: 執筆中の整合性チェック（診断機能）
5. **Code Action**:
   低信頼度参照の明示的参照への変換提案（`textDocument/codeAction`）
6. **信頼度システム**: 曖昧な参照の可視化と改善提案

#### storyteller lspコマンド

```bash
# LSPサーバー起動
storyteller lsp start --stdio

# ワンショット検証
storyteller lsp validate manuscripts/chapter01.md

# エディタ設定自動生成
storyteller lsp install nvim
storyteller lsp install vscode
```

#### 検出可能な参照パターン

```markdown
勇者は剣を抜いた。 → src/characters/hero.ts (confidence: 90%)
@勇者は剣を抜いた。 → src/characters/hero.ts (confidence: 100%)
王都の城門前で待ち合わせた。 → src/settings/royal_capital.ts (confidence: 85%)
```

#### Code Action機能（v1.0新機能）

低信頼度（85%以下）の参照に対して、明示的参照への変換を提案します：

- `勇者` → `@hero` への変換提案
- Quick Fix形式でエディタから直接適用可能

#### セマンティックトークン機能（v1.1新機能）

キャラクター名・設定名をエディタ上でハイライト表示します：

- `character`トークン: キャラクター名（name, displayNames, aliases）
- `setting`トークン: 設定名（name, displayNames）
- 信頼度に応じた3段階のモディファイア（highConfidence, mediumConfidence,
  lowConfidence）

詳細は `docs/lsp.md` を参照してください。

### 3. CLI構造化出力 (Issue #6) - 実装済み

`--json`フラグにより、すべてのコマンド出力をJSON形式で取得できます。

```bash
# JSON出力を有効化
storyteller meta check --json
storyteller element character --name "hero" --json
```

#### JSON出力形式

```json
{
  "type": "success",
  "message": "メタデータチェック完了",
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

詳細は `docs/cli.md` を参照してください。

### 4. 実装フェーズ

1. **Phase 1**: Character型の基本拡張とstorytellerコマンドの基本実装 - 完了
2. **Phase 2**: @なしキャラクター検出エンジンの実装 - 完了
3. **Phase 3**: LSPサーバーの基本機能実装 - 完了
4. **Phase 4**: エディタ統合（neovim/VSCode） - 完了
5. **Phase 5**: 高度な検証機能と支援機能 - 完了（v1.0）

### 5. Timeline機能 - 実装済み

物語の時系列管理機能（Timeline）が実装されました。

#### Timeline型

```typescript
export type Timeline = {
  id: string;
  name: string;
  scope: "story" | "world" | "character" | "arc";
  summary: string;
  events: TimelineEvent[];
  parentTimeline?: string;
  childTimelines?: string[];
  relatedCharacter?: string;
  displayNames?: string[];
  detectionHints?: TimelineDetectionHints;
};

export type TimelineEvent = {
  id: string;
  title: string;
  category: EventCategory;
  time: TimePoint;
  summary: string;
  characters: string[];
  settings: string[];
  chapters: string[];
  causedBy?: string[]; // 因果関係：原因イベント
  causes?: string[]; // 因果関係：結果イベント
  importance?: EventImportance;
};
```

#### CLIコマンド

```bash
# タイムライン作成
storyteller element timeline --name "メインストーリー" --scope story --summary "概要"

# イベント追加
storyteller element event --timeline main_story --title "物語の始まり" --category plot_point --order 1

# タイムライン表示
storyteller view timeline --list
storyteller view timeline --id main_story
storyteller view timeline --id main_story --format mermaid
storyteller view timeline --id main_story --json
```

#### MCPツール

- `timeline_create`: タイムライン作成
- `event_create`: イベント作成
- `event_update`: イベント更新
- `timeline_view`: タイムライン表示
- `timeline_analyze`: 因果関係・整合性分析

#### MCPリソース

- `storyteller://timelines`: タイムライン一覧
- `storyteller://timeline/{id}`: 特定タイムライン

#### MCPプロンプト

- `timeline_brainstorm`: タイムラインのブレインストーミング
- `event_detail_suggest`: イベント詳細の提案
- `causality_analysis`: 因果関係の分析
- `timeline_consistency_check`: 整合性チェック

### 6. Foreshadowing（伏線管理）機能 - 実装済み

物語の伏線を管理し、設置・回収状態を追跡する機能が実装されました。

#### Foreshadowing型

```typescript
export type ForeshadowingStatus =
  | "planted"
  | "partially_resolved"
  | "resolved"
  | "abandoned";
export type ForeshadowingType =
  | "hint"
  | "prophecy"
  | "mystery"
  | "symbol"
  | "chekhov"
  | "red_herring";
export type ForeshadowingImportance = "major" | "minor" | "subtle";

export type PlantingInfo = {
  chapter: string;
  description: string;
  excerpt?: string | { file: string };
  eventId?: string;
};

export type ResolutionInfo = {
  chapter: string;
  description: string;
  excerpt?: string | { file: string };
  eventId?: string;
  completeness: number; // 0.0 - 1.0
};

export type Foreshadowing = {
  id: string;
  name: string;
  type: ForeshadowingType;
  summary: string;
  planting: PlantingInfo;
  status: ForeshadowingStatus;
  importance?: ForeshadowingImportance;
  resolutions?: ResolutionInfo[];
  plannedResolutionChapter?: string;
  relations?: {
    characters: string[];
    settings: string[];
    relatedForeshadowings?: string[];
  };
  displayNames?: string[];
};
```

#### CLIコマンド

```bash
# 伏線作成
storyteller element foreshadowing --name "古びた剣" --type chekhov --planting-chapter chapter_01 --planting-description "床板の下から発見"

# 伏線作成（詳細オプション付き）
storyteller element foreshadowing --name "予言" --type prophecy \
  --planting-chapter chapter_02 --planting-description "予言が告げられる" \
  --importance major --planned-resolution-chapter chapter_10 \
  --related-characters hero,mentor --related-settings temple

# 伏線一覧表示
storyteller view foreshadowing --list

# 特定の伏線表示
storyteller view foreshadowing --id ancient_sword

# ステータスでフィルタ
storyteller view foreshadowing --list --status planted    # 未回収のみ
storyteller view foreshadowing --list --status resolved   # 回収済みのみ

# JSON形式出力
storyteller view foreshadowing --list --json
```

#### MCPツール

- `foreshadowing_create`: 伏線作成
- `foreshadowing_view`: 伏線表示（一覧/個別/フィルタ）

#### MCPリソース

- `storyteller://foreshadowings`: 伏線一覧
- `storyteller://foreshadowing/{id}`: 特定の伏線

#### HTML可視化

`storyteller view browser`コマンドで、伏線の以下の情報がビジュアル表示されます：

- **統計情報**: 総数、設置済み、回収済み、回収率
- **伏線カード**: 名前、タイプ、ステータス、重要度、概要
- **ステータス色分け**:
  planted（オレンジ）、partially_resolved（黄）、resolved（緑）、abandoned（グレー）
- **回収情報**: チャプター、説明、完了度（%）
- **関連エンティティ**: キャラクター、設定

#### 伏線タイプの説明

| タイプ        | 説明                         | 例                         |
| ------------- | ---------------------------- | -------------------------- |
| `hint`        | 後の展開を示唆するヒント     | 不吉な予感、意味深な会話   |
| `prophecy`    | 予言・予告                   | 王の予言、神託             |
| `mystery`     | 謎・疑問                     | 消えた遺産、正体不明の人物 |
| `symbol`      | 象徴的な要素                 | 繰り返し登場するモチーフ   |
| `chekhov`     | チェーホフの銃（物理的伏線） | 壁に掛かった剣、古い地図   |
| `red_herring` | レッドヘリング（ミスリード） | 意図的な誤誘導             |

### 7. manuscript_binding機能（原稿エンティティ紐付け） - 実装済み

原稿ファイル（Markdown）のFrontMatterにエンティティ（キャラクター、設定、伏線など）を紐付け・編集・削除する機能が実装されました。

#### MCPツール: `manuscript_binding`

```typescript
// 入力スキーマ
{
  manuscript: string;      // 原稿ファイルパス（必須）
  action: "add" | "remove" | "set";  // 操作タイプ（必須）
  entityType: "characters" | "settings" | "foreshadowings"
            | "timeline_events" | "phases" | "timelines";  // エンティティタイプ（必須）
  ids: string[];           // エンティティIDリスト（必須）
  validate?: boolean;      // ID存在確認（デフォルト: true）
}
```

#### 操作タイプ

| action | 動作                                     |
| ------ | ---------------------------------------- |
| add    | 既存リストに追加（重複無視）             |
| remove | 既存リストから削除（存在しないIDは無視） |
| set    | リストを完全置換                         |

#### 対応FrontMatterフィールド

- `characters` - キャラクターID
- `settings` - 設定ID
- `foreshadowings` - 伏線ID
- `timeline_events` - タイムラインイベントID
- `phases` - キャラクターフェーズID
- `timelines` - タイムラインID

#### 使用例（MCP経由）

```json
// キャラクター追加
{
  "manuscript": "manuscripts/chapter01.md",
  "action": "add",
  "entityType": "characters",
  "ids": ["hero", "heroine"]
}

// タイムラインイベント設定
{
  "manuscript": "manuscripts/chapter02.md",
  "action": "set",
  "entityType": "timeline_events",
  "ids": ["event_001", "event_002"]
}
```

### 8. RAG (Retrieval-Augmented Generation) 機能 - 実装済み

物語プロジェクトの全要素をAIが検索可能なドキュメントに変換し、執筆支援の品質を向上させる機能が実装されました。

#### 概要

- **コンテキスト準備の自動化**: キャラクター、設定、伏線等の情報を自動収集
- **関連情報取得の高精度化**: セマンティック検索による関連性の高い情報取得
- **リアルタイム更新**: Git hooks による自動同期

#### storyteller ragコマンド

```bash
# RAGドキュメントをエクスポート
storyteller rag export

# 変更ファイルのみエクスポート
storyteller rag export --incremental

# シーン単位チャンキングで出力
storyteller rag export --chunking scene

# RAGドキュメント + digragインデックスを一括更新
storyteller rag update

# フル再構築
storyteller rag update --force

# Git hooksをインストール（自動更新）
storyteller rag install-hooks
```

#### 生成されるドキュメント

| 要素タイプ   | ドキュメント形式        | 出力先       |
| ------------ | ----------------------- | ------------ |
| キャラクター | `character_{id}.md`     | `.rag-docs/` |
| 設定         | `setting_{id}.md`       | `.rag-docs/` |
| 伏線         | `foreshadowing_{id}.md` | `.rag-docs/` |
| タイムライン | `timeline_{id}.md`      | `.rag-docs/` |

#### チャンキング戦略

| 戦略       | 説明             | 適用条件                      |
| ---------- | ---------------- | ----------------------------- |
| `document` | ドキュメント単位 | 小サイズ（〜3,000文字）       |
| `scene`    | シーン単位分割   | 中サイズ（3,000〜15,000文字） |
| `auto`     | 自動選択         | デフォルト                    |

詳細は `docs/rag.md` を参照してください。

### 9. textlint統合機能 - 実装済み

原稿（Markdown）の文法・表記ゆれを検出・修正する機能が実装されました。

#### 概要

- **LSP統合**: storyteller
  LSP内でtextlintをバックグラウンド実行し、診断を統合表示
- **DiagnosticSource抽象化**:
  複数の診断ソース（storyteller、textlint等）を統合する拡張可能な基盤
- **CLIコマンド**: `storyteller lint` コマンドによるワンショット検証・修正
- **Git Hooks**: pre-commit hookによる自動チェック
- **グレースフルデグラデーション**:
  textlint未インストール環境でもstoryteller診断は動作

#### CLIコマンド

```bash
# 基本的なチェック
storyteller lint

# 特定ファイルをチェック
storyteller lint --path manuscripts/chapter01.md

# 自動修正
storyteller lint --path manuscripts/chapter01.md --fix

# JSON形式で出力
storyteller lint --json

# エラーのみ表示
storyteller lint --severity error

# Git hooks インストール
storyteller lint install-hooks
storyteller lint install-hooks --strict  # strictモード
```

#### DiagnosticSource抽象化

複数の診断ソースを統合する設計：

```typescript
interface DiagnosticSource {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]>;
  cancel?(): void;
  dispose?(): void;
}
```

実装済み診断ソース：

- **StorytellerDiagnosticSource**: キャラクター・設定参照の検証
- **TextlintDiagnosticSource**: 文法・表記ゆれの検証

将来の拡張：

- **ValeSource**: 技術文書スタイルガイドの検証
- **カスタムルール**: プロジェクト固有の検証ルール

#### textlintの特徴

- **デバウンス処理**: 500msのデバウンスで過剰な実行を防止
- **キャンセル機能**: 新しいリクエストが来たら前のリクエストを自動キャンセル
- **タイムアウト**: 30秒のタイムアウトで長時間実行を回避
- **UIブロッキングなし**: 非同期実行によりエディタ操作を妨げない

#### MCPツール

storytellerは独自のMCP textlintツールを実装していません。 textlint
v14.8.0+のネイティブMCPサーバー（`--mcp`フラグ）を使用します。

Claude Desktop設定例：

```json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller",
      "args": ["mcp", "start", "--stdio"]
    },
    "textlint": {
      "command": "npx",
      "args": ["textlint", "--mcp"],
      "cwd": "/path/to/your/story-project"
    }
  }
}
```

#### サンプル設定ファイル

- `.textlintrc.example` - textlint設定のサンプル
- `prh-rules.yml.example` - 表記ゆれルールのサンプル

詳細は `docs/lint.md` を参照してください。

## 技術的な考慮事項

- **文脈解析**: 日本語の文法パターン（助詞、動詞活用）を考慮した検出
- **信頼度計算**: 文脈、頻度、近接性に基づく信頼度算出
- **段階的詳細化**: 既存ファイルを破壊せずに機能追加
- **ファイル参照**: インラインとファイル分離の柔軟な選択

---

## LLM UI/UX統合（計画中）

プロジェクトの内容を分析し、ユーザーの質問や指示に応答するためのUI統合を計画しています。
詳細な実装計画は `PLAN_LLM_UI.md` を参照してください。

### 対応プラットフォーム

| プラットフォーム | 実装方式           | 主要機能                                   |
| ---------------- | ------------------ | ------------------------------------------ |
| Claude Desktop   | MCPプロンプト      | `story_director`プロンプトによる対話的支援 |
| Claude Code      | スラッシュコマンド | `/story-director`等のコマンド統合          |
| Neovim           | Denopsプラグイン   | 執筆中のリアルタイムAI支援                 |

### ディレクター機能

「物語のディレクター」として、プロジェクト全体を俯瞰し、創作的・技術的アドバイスを提供する中核機能です。

#### 役割

1. **全体像の把握**: キャラクター関係、世界観一貫性、プロット構造の分析
2. **創作的アドバイス**: 伏線配置、キャラクターアーク、読者体験の最適化
3. **技術的支援**: storyteller CLIコマンド案内、型定義活用方法

#### MCPプロンプト仕様（計画）

```typescript
// src/mcp/prompts/definitions/story_director.ts
export const storyDirectorPrompt: McpPromptDefinition = {
  name: "story_director",
  description: "物語のディレクターとして、プロジェクト全体を把握し応答",
  arguments: [
    { name: "question", required: true, description: "質問または指示" },
    {
      name: "focus",
      required: false,
      description: "フォーカス領域（character/setting/plot/style/all）",
    },
  ],
  getMessages: (args) => [/* ... */],
};
```

### Neovim Denopsプラグイン

Denoベースの技術スタック統一のため、Denopsを使用したNeovimプラグインを計画しています。

#### 配置先

```
~/.config/nvim/plugged/street-storyteller.vim/
├── plugin/storyteller.vim      # Vimスクリプトエントリ
├── denops/storyteller/
│   ├── main.ts                 # Denopsエントリポイント
│   ├── deps.ts                 # 依存関係
│   ├── api/openrouter.ts       # Openrouter API統合
│   ├── context/collector.ts    # コンテキスト収集
│   ├── commands/               # コマンド実装
│   └── ui/float_window.ts      # UI要素
└── README.md
```

#### コマンド一覧（計画）

| コマンド               | キーマップ   | 説明                           |
| ---------------------- | ------------ | ------------------------------ |
| `:StoryDirector`       | `<leader>sd` | プロジェクト全体を把握した応答 |
| `:StoryImprove`        | `<leader>si` | 選択範囲の改善提案             |
| `:StoryAsk {question}` | `<leader>sa` | コンテキスト付き質問           |
| `:StoryValidate`       | `<leader>sv` | LSP診断 + AI解説               |

#### 設定例

```vim
" ~/.vimrc または init.vim
let g:storyteller_openrouter_key = $OPENROUTER_API_KEY
let g:storyteller_model = 'anthropic/claude-3.5-sonnet'
```

### Claude Codeスラッシュコマンド（計画）

```
.claude/commands/
├── story-director.md    # ディレクターに質問
├── story-check.md       # 整合性チェック
├── story-char.md        # キャラクター追加
└── story-view.md        # 可視化
```

### システムプロンプト管理

システムプロンプトはドキュメントとして管理し、各プラットフォームで参照します。

```
docs/prompts/
├── core.md              # 共通コアプロンプト（SaCコンセプト、参照システム）
├── director.md          # ディレクター用システムプロンプト
├── claude-desktop.md    # Claude Desktop専用（MCPツール/リソース説明）
├── claude-code.md       # Claude Code専用（CLIコマンド説明）
└── neovim.md            # Neovim専用（簡潔な執筆支援モード）
```

### 実装ファイル参照（既存パターン）

#### MCP実装

- `src/mcp/prompts/prompt_registry.ts`:
  McpPromptDefinition型、PromptRegistryクラス
- `src/mcp/prompts/definitions/character_brainstorm.ts`: プロンプト実装例
- `src/mcp/resources/project_resource_provider.ts`:
  storyteller://projectリソース

#### LSP実装

- `src/lsp/detection/positioned_detector.ts`: エンティティ検出
- `src/lsp/diagnostics/diagnostics_generator.ts`: 診断生成

#### CLI実装

- `src/cli/command_registry.ts`: コマンドレジストリ
- `src/cli/modules/lsp/validate.ts`: 検証コマンド例

### 技術的考慮事項（LLM統合）

- **コンテキスト収集**: バッファ内容、LSP診断、プロジェクト情報を効率的に収集
- **トークン節約**: 大規模プロジェクトでは要約モードを使用
- **APIキー管理**: 環境変数 `$OPENROUTER_API_KEY` を推奨
- **LSP連携**: Denopsプラグインからstoryteller LSP診断を取得しAI解説を追加
