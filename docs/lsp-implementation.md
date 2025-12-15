# LSP統合による原稿チェック機能 - 実装ドキュメント

## 概要

Issue #3で実装されたLanguage Server Protocol (LSP) 統合機能のドキュメントです。
原稿（Markdown）内のキャラクター・設定参照をリアルタイムで検出し、エディタに診断情報・ナビゲーション機能を提供します。

## アーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────────────────────┐
│                    LspServer (server.ts)                │
│                    メインループ・統合層                   │
├─────────────────────────────────────────────────────────┤
│  Providers              │  Diagnostics                  │
│  ├─ DefinitionProvider  │  ├─ DiagnosticsGenerator     │
│  ├─ HoverProvider       │  └─ DiagnosticsPublisher     │
│  └─ CodeActionProvider  │                              │
├─────────────────────────────────────────────────────────┤
│  Detection              │  Handlers                     │
│  ├─ PositionedDetector  │  └─ TextDocumentSyncHandler  │
│  └─ JapanesePattern     │                              │
│      Matcher            │                              │
├─────────────────────────────────────────────────────────┤
│  Document Management    │                              │
│  └─ DocumentManager     │                              │
├─────────────────────────────────────────────────────────┤
│  Protocol Layer                                         │
│  ├─ LspTransport (Content-Length処理)                   │
│  ├─ json_rpc.ts (パース・シリアライズ)                   │
│  └─ types.ts (JSON-RPC型定義)                           │
└─────────────────────────────────────────────────────────┘
```

### ディレクトリ構造

```
src/lsp/
├── protocol/           # LSPプロトコル基盤
│   ├── types.ts        # JSON-RPC 2.0メッセージ型定義
│   ├── json_rpc.ts     # パーサー・シリアライザー・エラーコード
│   └── transport.ts    # Content-Lengthベースのトランスポート
├── server/             # サーバーコア
│   ├── server.ts       # LspServerクラス（メインループ）
│   └── capabilities.ts # サーバーキャパビリティ定義
├── document/           # ドキュメント管理
│   └── document_manager.ts  # テキストドキュメント管理
├── handlers/           # LSPイベントハンドラ
│   └── text_document_sync.ts  # didOpen/didChange/didClose
├── detection/          # 参照検出エンジン
│   ├── positioned_detector.ts      # 位置追跡付き検出器
│   └── japanese_pattern_matcher.ts # 日本語パターンマッチャー
├── diagnostics/        # 診断機能
│   ├── diagnostics_generator.ts  # 診断生成
│   └── diagnostics_publisher.ts  # 診断発行（デバウンス付き）
└── providers/          # LSPプロバイダー
    ├── definition_provider.ts  # textDocument/definition
    ├── hover_provider.ts       # textDocument/hover
    └── code_action_provider.ts # textDocument/codeAction (v1.0新規)
```

## 実装済み機能

### 0. CLI統合

| 機能             | コマンド                        | 状態    |
| ---------------- | ------------------------------- | ------- |
| LSPサーバー起動  | `storyteller lsp start --stdio` | ✅ 完了 |
| エディタ設定生成 | `storyteller lsp install nvim   | vscode` |

### 1. LSPプロトコル基盤

| 機能                     | ファイル       | 状態    |
| ------------------------ | -------------- | ------- |
| JSON-RPC 2.0パース       | `json_rpc.ts`  | ✅ 完了 |
| JSON-RPC 2.0シリアライズ | `json_rpc.ts`  | ✅ 完了 |
| バッチリクエスト         | `json_rpc.ts`  | ✅ 完了 |
| Content-Lengthヘッダ処理 | `transport.ts` | ✅ 完了 |
| UTF-8エンコーディング    | `transport.ts` | ✅ 完了 |

### 2. サーバー機能

| 機能                    | メソッド             | 状態           |
| ----------------------- | -------------------- | -------------- |
| initialize              | `handleInitialize()` | ✅ 完了        |
| initialized             | 通知処理             | ✅ 完了        |
| shutdown                | `handleShutdown()`   | ✅ 完了        |
| textDocument/didOpen    | `handleDidOpen()`    | ✅ 完了        |
| textDocument/didChange  | `handleDidChange()`  | ✅ 完了        |
| textDocument/didClose   | `handleDidClose()`   | ✅ 完了        |
| textDocument/definition | `handleDefinition()` | ✅ 完了        |
| textDocument/hover      | `handleHover()`      | ✅ 完了        |
| textDocument/codeAction | `handleCodeAction()` | ✅ 完了 (v1.0) |

### 3. 検出機能

| 機能                       | 説明                                | 状態    |
| -------------------------- | ----------------------------------- | ------- |
| 名前検出（name）           | 内部ID名での検出（信頼度: 1.0）     | ✅ 完了 |
| 表示名検出（displayNames） | 原稿で使用される名前（信頼度: 0.9） | ✅ 完了 |
| 別名検出（aliases）        | 別名・愛称（信頼度: 0.8）           | ✅ 完了 |
| 助詞パターン               | は/が/を/に/の/と/で/へ の8種類     | ✅ 完了 |
| 除外パターン               | 概念的使用の除外                    | ✅ 完了 |
| 位置追跡                   | 行・列位置の計算（UTF-16単位）      | ✅ 完了 |

### 4. 診断機能

| 機能           | 説明                                  | 状態    |
| -------------- | ------------------------------------- | ------- |
| 未定義参照警告 | 定義されていないエンティティの警告    | ✅ 完了 |
| 低信頼度ヒント | 信頼度0.7未満でWarning、0.9未満でHint | ✅ 完了 |
| デバウンス     | 連続編集時の発行間引き                | ✅ 完了 |

## 未実装機能

### 中優先度

| 機能                | 説明                         | 関連Issue |
| ------------------- | ---------------------------- | --------- |
| 代名詞解決          | 「彼」「彼女」等の代名詞検出 | #3        |
| References Provider | 参照箇所検索                 | #3        |
| 補完機能            | textDocument/completion      | #3        |
| ファイル監視        | storyteller lsp watch        | #3        |

### 低優先度

| 機能       | 説明                             | 関連Issue |
| ---------- | -------------------------------- | --------- |
| VSCode拡張 | VSCode Language Server Extension | #3        |
| AI文脈解析 | LLMによる高度な文脈解析          | #3        |

## 信頼度システム

### 信頼度の算出

```typescript
// 検出方法による基本信頼度
const BASE_CONFIDENCE = {
  name: 1.0, // 内部ID名での完全一致
  displayNames: 0.9, // 表示名での一致
  aliases: 0.8, // 別名での一致
};

// 文脈による補正
// - 助詞パターンがある場合: +0.1
// - 除外パターンに該当: 検出対象外
```

### 診断の閾値

```typescript
const CONFIDENCE_THRESHOLD = {
  WARNING: 0.7, // これ未満でWarning
  HINT: 0.9, // これ未満でHint（WARNING以上）
};
```

### 診断メッセージ例

```
Warning: 「勇者」は定義されていますが、信頼度が低いです (70%)。
         @heroを使用すると明確になります。

Hint: 「英雄」は「hero」として検出されました (85%)。
      確実にするには@heroを使用してください。
```

## 主要な型定義

### DetectableEntity（検出対象エンティティ）

```typescript
interface DetectableEntity {
  kind: "character" | "setting"; // エンティティ種別
  id: string; // 内部ID
  filePath: string; // 定義ファイルパス
  patterns: PatternDefinition[]; // 検出パターン
}

interface PatternDefinition {
  pattern: string; // 正規表現パターン
  confidence: number; // 基本信頼度
}
```

### PositionedMatch（位置付きマッチ結果）

```typescript
interface PositionedMatch {
  kind: "character" | "setting";
  id: string;
  filePath: string;
  matchedPattern: string; // マッチしたパターン
  positions: Position[]; // 出現位置リスト
  confidence: number; // 信頼度
}

interface Position {
  line: number; // 0-indexed
  character: number; // UTF-16コードユニット
}
```

### EntityInfo（エンティティ詳細情報）

```typescript
interface EntityInfo {
  id: string;
  name: string;
  kind: "character" | "setting";
  role?: string; // protagonist, antagonist等
  summary?: string;
  traits?: string[];
  relationships?: Record<string, string>;
}
```

## テスト構造

```
tests/lsp/
├── json_rpc_parser_test.ts           # JSON-RPCパーサーテスト
├── transport_test.ts                  # トランスポート層テスト
├── server_initialization_test.ts     # サーバー初期化テスト
├── document_manager_test.ts          # ドキュメント管理テスト
├── text_document_sync_test.ts        # テキスト同期テスト
├── positioned_detector_test.ts       # 位置追跡検出テスト
├── japanese_pattern_matcher_test.ts  # 日本語パターンテスト
├── diagnostics_generator_test.ts     # 診断生成テスト
├── diagnostics_publisher_test.ts     # 診断発行テスト
├── definition_provider_test.ts       # 定義ジャンプテスト
├── hover_provider_test.ts            # ホバー情報テスト
├── server_integration_test.ts        # 統合テスト
├── edge_cases_test.ts                # エッジケーステスト
└── helpers.ts                        # テストヘルパー
```

## 実装パターン

### 1. LspServerへの新機能追加

```typescript
// 1. プロバイダークラスを作成
// src/lsp/providers/new_provider.ts
export class NewProvider {
  constructor(private detector: PositionedDetector) {}

  async getResult(
    uri: string,
    content: string,
    position: Position,
    projectPath: string
  ): Promise<Result | null> {
    // 実装
  }
}

// 2. LspServerにプロバイダーを追加
// src/lsp/server/server.ts
private newProvider: NewProvider;

constructor(...) {
  this.newProvider = new NewProvider(this.detector);
}

// 3. handleRequest()にケースを追加
case "textDocument/newFeature":
  return this.handleNewFeature(message.params);
```

### 2. 新しい検出パターンの追加

```typescript
// JapanesePatternMatcherに新しいパターンを追加
// 例: 動詞パターンの追加

// BASIC_PARTICLESに追加するか、
// 新しいパターングループを作成
const VERB_PATTERNS = ["は言った", "が答えた", "を見た"];

// findMatchesWithConfidence()を拡張して
// 新しいパターンに対応
```

### 3. 診断の拡張

```typescript
// DiagnosticsGeneratorに新しい診断タイプを追加

private createNewDiagnostic(match: PositionedMatch): Diagnostic {
  return {
    range: { start: position, end: endPosition },
    severity: DiagnosticSeverity.Information,
    message: "新しい診断メッセージ",
    source: "storyteller",
    code: "new-diagnostic-code",
  };
}
```

## 既存コードとの統合

### Character型との連携

```typescript
// src/type/v2/character.ts の Character型を参照
// LSPで使用する場合は DetectableEntity に変換

function characterToEntity(
  char: Character,
  filePath: string,
): DetectableEntity {
  const patterns: PatternDefinition[] = [];

  // name（信頼度1.0）
  patterns.push({ pattern: char.name, confidence: 1.0 });

  // displayNames（信頼度0.9）
  char.displayNames?.forEach((name) => {
    patterns.push({ pattern: name, confidence: 0.9 });
  });

  // aliases（信頼度0.8）
  char.aliases?.forEach((alias) => {
    patterns.push({ pattern: alias, confidence: 0.8 });
  });

  return {
    kind: "character",
    id: char.name,
    filePath,
    patterns,
  };
}
```

### ReferenceDetectorとの関係

`src/application/meta/reference_detector.ts` の既存実装を参考に、
`PositionedDetector` は位置情報を追加した拡張版として実装されています。

- 既存: `ReferenceDetector` - 参照の存在確認のみ
- LSP: `PositionedDetector` - 位置情報付きの検出

## 今後の実装で注意すべき点

### 1. マルチバイト文字の位置計算

LSPの位置はUTF-16コードユニット単位です。
日本語文字は通常1文字=1コードユニットですが、
絵文字等のサロゲートペアは2コードユニットになります。

```typescript
// 正しい位置計算
function calculateColumn(line: string, byteOffset: number): number {
  // UTF-16コードユニット数を返す
  return [...line.slice(0, byteOffset)].length;
}
```

### 2. デバウンス処理

診断発行はデバウンスされています。 連続編集時にパフォーマンスを維持するため、
`DiagnosticsPublisher.publishDebounced()` を使用してください。

### 3. テストデータの準備

テストでは `DetectableEntity` 配列を直接渡すことで、
実際のファイルシステムに依存しないテストが可能です。

```typescript
const entities: DetectableEntity[] = [
  {
    kind: "character",
    id: "hero",
    filePath: "/path/to/characters/hero.ts",
    patterns: [
      { pattern: "勇者", confidence: 0.9 },
      { pattern: "hero", confidence: 1.0 },
    ],
  },
];

const server = new LspServer(transport, projectRoot, { entities });
```

## 関連ドキュメント

- [PLAN.md](../PLAN.md) - 実装計画（process1-10）
- [Issue #3](https://github.com/nekowasabi/street-storyteller/issues/3) - GitHub
  Issue
- [meta-generate.md](./meta-generate.md) - メタデータ生成機能

## 変更履歴

| 日付       | 内容                        |
| ---------- | --------------------------- |
| 2024-12-14 | 初版作成（MVP実装完了時点） |
| 2025-12-15 | Phase 5 完了時点の更新      |
