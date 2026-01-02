# textlint-storyteller 統合 要件定義書

## 1. 概要

### 1.1 背景と目的

**課題**:

- textlintをNeovimで使用する際、フォアグラウンド実行のためUIがブロッキングされる
- efm-langserver、ALE等の既存統合は同期的にtextlintを実行
- storytellerのエンティティ検証とtextlintの文法チェックが別々のLSPで分散

**解決策**: storyteller
LSP内でtextlintをバックグラウンドサブプロセスとして実行し、診断を統合する。

### 1.2 スコープ

| 機能                           | 含まれる |
| ------------------------------ | -------- |
| LSPバックグラウンドlint        | ✅       |
| CLIコマンド `storyteller lint` | ✅       |
| MCPツール `textlint_check/fix` | ✅       |
| Git hooks (pre-commit)         | ✅       |
| ドキュメント                   | ✅       |

### 1.3 前提条件

- textlint: npm/npx経由でインストール（グローバルまたはプロジェクトローカル）
- Node.js: v18以上
- 設定ファイル: `.textlintrc`（標準形式）をプロジェクトルートに配置
- 優先ルール: `textlint-rule-prh`（表記ゆれ検出）

---

## 2. 機能要件

### 2.1 F1: LSPバックグラウンドlint

#### 概要

`textDocument/didChange`イベント時にtextlintをバックグラウンドで実行し、診断を発行する。

#### 詳細仕様

| 項目         | 仕様                                           |
| ------------ | ---------------------------------------------- |
| トリガー     | `textDocument/didChange`（ドキュメント変更時） |
| デバウンス   | 500ms（設定可能）                              |
| 実行方式     | `Deno.Command`によるサブプロセス               |
| 入力方式     | `--stdin --stdin-filename <path>`              |
| 出力形式     | `--format json`                                |
| キャンセル   | 新リクエスト到着時に古いプロセスをSIGTERM      |
| タイムアウト | 30秒                                           |

#### 診断マージ

```
┌─────────────────────────────────────────┐
│        DiagnosticAggregator             │
├─────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐│
│  │Storyteller診断  │ │Textlint診断    ││
│  │(エンティティ)   │ │(文法・表記)    ││
│  └────────┬────────┘ └────────┬────────┘│
│           └──────────┬────────┘         │
│                      ▼                  │
│              統合診断リスト             │
│          (source フィールドで識別)      │
└─────────────────────────────────────────┘
```

#### 重要度マッピング

| textlint severity | LSP DiagnosticSeverity |
| ----------------- | ---------------------- |
| 2 (error)         | 1 (Error)              |
| 1 (warning)       | 2 (Warning)            |
| 3 (info)          | 3 (Information)        |

### 2.2 F2: CLIコマンド `storyteller lint`

#### コマンド仕様

```bash
# 基本使用法
storyteller lint                          # 全原稿をlint
storyteller lint manuscripts/chapter01.md # 特定ファイル
storyteller lint --dir manuscripts/       # ディレクトリ指定

# オプション
storyteller lint --fix                    # 自動修正を適用
storyteller lint --json                   # JSON形式で出力
storyteller lint --rule prh               # 特定ルールのみ実行
storyteller lint --config .textlintrc.custom  # カスタム設定
storyteller lint --severity error         # 重要度フィルタ
storyteller lint --with-entity-check      # storyteller診断も実行
```

#### オプション一覧

| オプション            | 型      | デフォルト   | 説明                                |
| --------------------- | ------- | ------------ | ----------------------------------- |
| `--path`              | string  | -            | 対象ファイルパス                    |
| `--dir`               | string  | manuscripts/ | 対象ディレクトリ                    |
| `--recursive`         | boolean | true         | サブディレクトリを再帰検索          |
| `--fix`               | boolean | false        | 自動修正を適用                      |
| `--json`              | boolean | false        | JSON形式で出力                      |
| `--rule`              | string  | -            | 実行するルール（カンマ区切り）      |
| `--config`            | string  | auto         | 設定ファイルパス                    |
| `--severity`          | string  | -            | 重要度フィルタ (error/warning/info) |
| `--with-entity-check` | boolean | false        | storyteller診断も実行               |

#### 出力形式

**Human readable**:

```
manuscripts/chapter01.md
  2:15  warning  表記ゆれ: "プログラム" -> "プログラム"  prh
  5:8   error    文末が「。」で終わっていません           ja-technical-writing/sentence-end-with-period

2 problems (1 error, 1 warning)
```

**JSON** (`--json`):

```json
{
  "type": "success",
  "totalFiles": 1,
  "totalIssues": 2,
  "errorCount": 1,
  "warningCount": 1,
  "infoCount": 0,
  "fixedCount": 0,
  "results": [
    {
      "path": "manuscripts/chapter01.md",
      "issues": [
        {
          "ruleId": "prh",
          "severity": "warning",
          "message": "表記ゆれ: \"プログラム\" -> \"プログラム\"",
          "line": 2,
          "column": 15,
          "source": "textlint"
        }
      ]
    }
  ],
  "timestamp": "2026-01-02T10:30:00.000Z"
}
```

### 2.3 F3: MCPツール

#### textlint_check

**概要**: 原稿ファイルに対してtextlintを実行し、問題を検出する。

**入力スキーマ**:

```json
{
  "type": "object",
  "properties": {
    "projectRoot": {
      "type": "string",
      "description": "プロジェクトルート（未指定時はカレントディレクトリ）"
    },
    "path": {
      "type": "string",
      "description": "対象Markdownファイルパス"
    },
    "dir": {
      "type": "string",
      "description": "対象ディレクトリ（.mdファイルを検索）"
    },
    "recursive": {
      "type": "boolean",
      "description": "サブディレクトリを再帰的に検索（デフォルト: true）"
    },
    "rules": {
      "type": "array",
      "items": { "type": "string" },
      "description": "実行するルールIDのリスト"
    },
    "severity": {
      "type": "string",
      "enum": ["error", "warning", "info"],
      "description": "重要度フィルタ"
    },
    "withEntityCheck": {
      "type": "boolean",
      "description": "storyteller LSP診断も含める（デフォルト: false）"
    }
  }
}
```

**出力例**:

```json
{
  "totalFiles": 3,
  "totalIssues": 5,
  "errorCount": 2,
  "warningCount": 3,
  "infoCount": 0,
  "results": [...]
}
```

#### textlint_fix

**概要**: textlintで検出された問題を自動修正する。

**入力スキーマ**:

```json
{
  "type": "object",
  "properties": {
    "projectRoot": {
      "type": "string",
      "description": "プロジェクトルート"
    },
    "path": {
      "type": "string",
      "description": "対象ファイルパス（必須）"
    },
    "rules": {
      "type": "array",
      "items": { "type": "string" },
      "description": "適用するルールIDのリスト"
    },
    "dryRun": {
      "type": "boolean",
      "description": "プレビューのみ（実際には修正しない）"
    }
  },
  "required": ["path"]
}
```

**出力例（実行時）**:

```json
{
  "fixed": true,
  "path": "manuscripts/chapter01.md",
  "fixedCount": 3
}
```

**出力例（dryRun時）**:

```json
{
  "dryRun": true,
  "path": "manuscripts/chapter01.md",
  "fixableCount": 3,
  "issues": [...]
}
```

### 2.4 F4: Git Hooks

#### コマンド仕様

```bash
# pre-commitフックをインストール
storyteller lint install-hooks

# strictモード（エラー時にコミットをブロック）
storyteller lint install-hooks --strict

# 強制上書き
storyteller lint install-hooks --force

# フックを削除
storyteller lint uninstall-hooks
```

#### フック動作フロー

```
pre-commit
    │
    ├── 1. ステージされた.mdファイルを取得
    │       git diff --cached --name-only --diff-filter=ACM | grep '\.md$'
    │
    ├── 2. textlint利用可能性チェック
    │       command -v npx && npx textlint --version
    │       (未インストール時はスキップして警告)
    │
    ├── 3. storyteller lint --json を実行
    │
    ├── 4. 結果を解析
    │       - エラー数、警告数を取得
    │
    └── 5. 終了コード決定
            - --strict: エラー時 exit 1
            - 通常: 警告のみ表示、exit 0
```

### 2.5 F5: 設定検出

#### 検出順序

textlint設定ファイルは以下の順序で検索される:

1. `.textlintrc` (no extension)
2. `.textlintrc.json`
3. `.textlintrc.yaml` / `.textlintrc.yml`
4. `.textlintrc.js` / `.textlintrc.cjs`
5. `package.json` の `textlint` フィールド

#### サンプル設定 (.textlintrc)

```json
{
  "rules": {
    "prh": {
      "rulePaths": ["./prh-rules.yml"]
    },
    "preset-ja-technical-writing": true
  }
}
```

#### prh-rules.yml サンプル

```yaml
version: 1
rules:
  - expected: プログラム
    pattern: プログラム
  - expected: JavaScript
    patterns:
      - javascript
      - Javascript
  - expected: TypeScript
    patterns:
      - typescript
      - Typescript
```

---

## 3. 非機能要件

### 3.1 パフォーマンス

| 要件               | 仕様                                              |
| ------------------ | ------------------------------------------------- |
| UIブロッキング     | なし（バックグラウンド実行）                      |
| デバウンス         | 500ms（設定可能）                                 |
| タイムアウト       | 30秒                                              |
| プロセスキャンセル | 新リクエスト到着時に即座にキャンセル              |
| メモリ使用量       | 1プロセスのみ同時実行（前のプロセスはキャンセル） |

### 3.2 互換性

| 項目     | 要件       |
| -------- | ---------- |
| textlint | v12.x 以上 |
| Node.js  | v18 以上   |
| Neovim   | v0.9 以上  |
| Deno     | v2.x       |

### 3.3 エラーハンドリング

| シナリオ               | 対応                                         |
| ---------------------- | -------------------------------------------- |
| textlint未インストール | 警告ログ出力、空診断を返却、以後ソース無効化 |
| 設定ファイルなし       | textlintデフォルト設定で実行                 |
| JSONパースエラー       | エラーログ出力、空診断を返却                 |
| プロセスタイムアウト   | SIGTERMでkill、空診断を返却                  |
| 権限エラー             | ユーザーにエラーを返却                       |
| ファイル不存在         | ユーザーにエラーを返却                       |

### 3.4 設定可能項目

storyteller.json（または storyteller.config.ts）で設定可能:

```json
{
  "lint": {
    "enabled": true,
    "textlint": {
      "enabled": true,
      "debounceMs": 500,
      "timeoutMs": 30000,
      "configPath": ".textlintrc",
      "executablePath": "npx textlint"
    }
  }
}
```

---

## 4. アーキテクチャ設計

### 4.1 全体構成

```
┌─────────────────────────────────────────────────────────────────────┐
│                         storyteller                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   CLI        │  │   MCP        │  │   LSP        │              │
│  │   modules/   │  │   tools/     │  │   server/    │              │
│  │   lint/      │  │   textlint_* │  │              │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                 │                       │
│         └─────────────────┼─────────────────┘                       │
│                           │                                         │
│                           ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 共通コンポーネント                           │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │   │
│  │  │ TextlintRunner  │  │ TextlintParser  │                   │   │
│  │  │ (プロセス実行)  │  │ (JSON解析)      │                   │   │
│  │  └─────────────────┘  └─────────────────┘                   │   │
│  │  ┌─────────────────┐  ┌─────────────────┐                   │   │
│  │  │ TextlintConfig  │  │ TextlintWorker  │                   │   │
│  │  │ (設定検出)      │  │ (デバウンス+    │                   │   │
│  │  │                 │  │  キャンセル)    │                   │   │
│  │  └─────────────────┘  └─────────────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 ファイル構成

```
src/
├── lsp/
│   ├── diagnostics/
│   │   ├── diagnostic_source.ts          # [NEW] インターフェース定義
│   │   ├── diagnostic_aggregator.ts      # [NEW] 複数ソース統合
│   │   ├── storyteller_diagnostic_source.ts  # [NEW] 既存ロジックラップ
│   │   ├── diagnostics_generator.ts      # [MODIFY] リファクタリング
│   │   └── diagnostics_publisher.ts      # [EXISTING]
│   ├── integration/
│   │   └── textlint/
│   │       ├── textlint_worker.ts        # [NEW] バックグラウンド実行
│   │       ├── textlint_config.ts        # [NEW] 設定検出
│   │       ├── textlint_parser.ts        # [NEW] JSON解析
│   │       └── textlint_diagnostic_source.ts  # [NEW] DiagnosticSource実装
│   └── server/
│       └── server.ts                     # [MODIFY] Aggregator統合
│
├── cli/
│   └── modules/
│       ├── lint/
│       │   ├── index.ts                  # [NEW] モジュールエントリ
│       │   ├── lint.ts                   # [NEW] lintコマンド
│       │   ├── types.ts                  # [NEW] 型定義
│       │   ├── textlint_runner.ts        # [NEW] 実行ロジック
│       │   └── install_hooks.ts          # [NEW] Git hooks
│       └── index.ts                      # [MODIFY] lint登録
│
├── mcp/
│   ├── tools/
│   │   └── definitions/
│   │       ├── textlint_check.ts         # [NEW]
│   │       └── textlint_fix.ts           # [NEW]
│   └── server/
│       └── handlers/
│           └── tools.ts                  # [MODIFY] ツール登録
│
└── shared/
    └── textlint/
        ├── runner.ts                     # [NEW] 共通実行ロジック
        ├── parser.ts                     # [NEW] 共通パーサー
        └── types.ts                      # [NEW] 共通型定義
```

### 4.3 DiagnosticSource インターフェース

```typescript
// src/lsp/diagnostics/diagnostic_source.ts

import { Diagnostic } from "../protocol/types.ts";

/**
 * 診断ソースインターフェース
 * 複数の診断プロバイダーを統合するための抽象化
 */
export interface DiagnosticSource {
  /** ソース識別子 (e.g., "storyteller", "textlint") */
  readonly name: string;

  /** ソースが利用可能かどうか */
  isAvailable(): Promise<boolean>;

  /** 診断を生成 */
  generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]>;

  /** 進行中の操作をキャンセル（オプショナル） */
  cancel?(): void;

  /** リソースを解放（オプショナル） */
  dispose?(): void;
}
```

### 4.4 TextlintWorker クラス

```typescript
// src/lsp/integration/textlint/textlint_worker.ts

export class TextlintWorker {
  private process: Deno.ChildProcess | null = null;
  private debounceTimer: number | null = null;
  private pendingResolve: ((result: TextlintResult) => void) | null = null;

  constructor(
    private config: TextlintConfig,
    private debounceMs: number = 500,
    private timeoutMs: number = 30000,
  ) {}

  /**
   * textlintを実行（デバウンス・キャンセル付き）
   */
  async lint(content: string, filePath: string): Promise<TextlintResult> {
    // 1. 既存のタイマー/プロセスをキャンセル
    this.cancel();

    // 2. デバウンス
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.debounceTimer = setTimeout(async () => {
        const result = await this.execute(content, filePath);
        resolve(result);
      }, this.debounceMs);
    });
  }

  /**
   * 実際の実行
   */
  private async execute(
    content: string,
    filePath: string,
  ): Promise<TextlintResult> {
    const args = [
      "textlint",
      "--stdin",
      "--stdin-filename",
      filePath,
      "--format",
      "json",
    ];

    if (this.config.configPath) {
      args.push("--config", this.config.configPath);
    }

    const command = new Deno.Command("npx", {
      args,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    this.process = command.spawn();

    // stdinに内容を書き込み
    const writer = this.process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(content));
    await writer.close();

    // タイムアウト付きで待機
    const result = await Promise.race([
      this.process.output(),
      this.timeout(),
    ]);

    if (!result) {
      // タイムアウト
      this.process.kill("SIGTERM");
      return { messages: [], filePath };
    }

    const output = new TextDecoder().decode(result.stdout);
    return parseTextlintOutput(output, filePath);
  }

  /**
   * キャンセル
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.process) {
      try {
        this.process.kill("SIGTERM");
      } catch {
        // プロセスが既に終了している場合は無視
      }
      this.process = null;
    }
    if (this.pendingResolve) {
      this.pendingResolve({ messages: [], filePath: "" });
      this.pendingResolve = null;
    }
  }

  dispose(): void {
    this.cancel();
  }

  private timeout(): Promise<null> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(null), this.timeoutMs);
    });
  }
}
```

---

## 5. 実装計画

### 5.1 フェーズ分割

| フェーズ | 内容                   | 工数    | 成果物                       |
| -------- | ---------------------- | ------- | ---------------------------- |
| Phase 1  | DiagnosticSource抽象化 | 1日     | インターフェース、Aggregator |
| Phase 2  | TextlintWorker         | 2日     | バックグラウンド実行基盤     |
| Phase 3  | CLIコマンド            | 1日     | `storyteller lint`           |
| Phase 4  | MCPツール              | 1日     | `textlint_check/fix`         |
| Phase 5  | Git Hooks              | 0.5日   | pre-commitフック             |
| Phase 6  | ドキュメント           | 0.5日   | docs/lint.md                 |
| **合計** |                        | **6日** |                              |

### 5.2 Phase 1: DiagnosticSource抽象化

**目標**: 複数の診断ソースを統合するための基盤を構築

**タスク**:

1. `DiagnosticSource`インターフェース定義
2. `DiagnosticAggregator`実装（並列実行・マージ）
3. 既存の`DiagnosticsGenerator`を`StorytellerDiagnosticSource`にラップ
4. `LspServer`をAggregator使用に変更

**完了条件**:

- 既存のstoryteller診断が動作する
- テストが通る

### 5.3 Phase 2: TextlintWorker

**目標**: textlintをバックグラウンドで実行する基盤を構築

**タスク**:

1. `TextlintConfig`: 設定ファイル検出
2. `TextlintParser`: JSON出力パース
3. `TextlintWorker`: デバウンス・キャンセル付き実行
4. `TextlintDiagnosticSource`: DiagnosticSource実装
5. LSPサーバーへの統合

**完了条件**:

- Neovimでtextlint診断が表示される
- UIブロッキングがない
- textlint未インストール時に警告のみ

### 5.4 Phase 3: CLIコマンド

**目標**: `storyteller lint`コマンドを実装

**タスク**:

1. コマンドディスクリプタ定義
2. ファイル収集ロジック
3. textlint実行・結果表示
4. `--fix`オプション対応
5. `--json`出力対応

**完了条件**:

- `storyteller lint`が動作する
- `--fix`で自動修正される
- `--json`でJSON出力される

### 5.5 Phase 4: MCPツール

**目標**: MCPツール `textlint_check/fix`を実装

**タスク**:

1. `textlint_check`ツール定義
2. `textlint_fix`ツール定義
3. ツールレジストリへの登録

**完了条件**:

- Claude Desktopから`textlint_check`が実行できる
- `textlint_fix`で修正できる

### 5.6 Phase 5: Git Hooks

**目標**: pre-commitフックを実装

**タスク**:

1. フックスクリプト生成
2. `storyteller lint install-hooks`コマンド
3. `--strict`オプション対応

**完了条件**:

- `git commit`時にlintが実行される
- エラー時にコミットがブロックされる（strictモード）

### 5.7 Phase 6: ドキュメント

**目標**: 使用方法のドキュメントを作成

**タスク**:

1. `docs/lint.md`作成
2. サンプル`.textlintrc`
3. サンプル`prh-rules.yml`

**完了条件**:

- ドキュメントが完成している

---

## 6. テスト計画

### 6.1 ユニットテスト

| テスト対象           | テストケース                     |
| -------------------- | -------------------------------- |
| TextlintParser       | JSON正常パース、不正JSON、空出力 |
| TextlintConfig       | 各設定ファイル形式の検出         |
| DiagnosticAggregator | 複数ソースのマージ、キャンセル   |
| 重要度マッピング     | textlint severity → LSP severity |

### 6.2 統合テスト

| テスト対象     | テストケース                               |
| -------------- | ------------------------------------------ |
| TextlintWorker | サブプロセス実行、タイムアウト、キャンセル |
| LSP統合        | didChange → 診断発行                       |
| CLIコマンド    | lint実行、fix実行、JSON出力                |
| Git Hooks      | pre-commitフック動作                       |

### 6.3 モック戦略

- `Deno.Command`をモックしてユニットテスト
- テストフィクスチャでtextlint JSON出力を用意
- 実際のtextlintを使う統合テストは別途

---

## 7. リスクと対策

| リスク                           | 影響度 | 対策                                           |
| -------------------------------- | ------ | ---------------------------------------------- |
| textlintバージョン互換性         | 中     | サポートバージョン明確化、フォールバック       |
| プロセス管理の複雑化             | 中     | 堅牢なエラーハンドリング、タイムアウト         |
| 大規模ファイルでのパフォーマンス | 低     | タイムアウト設定、将来的にインクリメンタルlint |
| Windows環境での動作              | 低     | npx経由で互換性確保                            |

---

## 8. 将来拡張

| 機能                 | 説明                                   | 優先度 |
| -------------------- | -------------------------------------- | ------ |
| vale統合             | 別のlinterをDiagnosticSourceとして追加 | 中     |
| インクリメンタルlint | 変更行のみを検証                       | 低     |
| AI修正提案           | textlint + LLMによる修正提案           | 低     |
| ルール推奨           | プロジェクトに適したルールをAIが提案   | 低     |

---

## 9. 参考資料

- [textlint公式ドキュメント](https://textlint.github.io/)
- [textlint-rule-prh](https://github.com/textlint-rule/textlint-rule-prh)
- [textlint-rule-preset-ja-technical-writing](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing)
- [efm-langserver](https://github.com/mattn/efm-langserver)

---

## 10. 変更履歴

| 日付       | バージョン | 変更内容 |
| ---------- | ---------- | -------- |
| 2026-01-02 | 0.1        | 初版作成 |
