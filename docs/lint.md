# textlint統合ドキュメント

Street Storytellerは、textlintと統合することで、原稿（Markdown）の文法・表記ゆれを検出・修正する機能を提供します。

## 概要

### textlint統合の目的

- **執筆品質の向上**: 文法ミス、表記ゆれ、スタイルの不統一を自動検出
- **エディタ統合**: LSPサーバー内でバックグラウンド実行、UIブロッキングなし
- **CI/CD統合**: Git hooksやCLIコマンドで自動チェック
- **拡張可能な診断基盤**: DiagnosticSource抽象化により、将来の拡張（vale等）が容易

### DiagnosticSource抽象化

storyteller LSPは、複数の診断ソース（storytellerエンティティ検証、textlint文法チェック等）を統合して表示する仕組みを提供します。

```
┌─────────────────────────────────┐
│   DiagnosticAggregator          │
│  ┌───────────────────────────┐  │
│  │ StorytellerDiagnosticSource│ │ ← キャラクター・設定参照の検証
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ TextlintDiagnosticSource   │ │ ← 文法・表記ゆれの検証
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ (Future: ValeSource)       │ │ ← 将来の拡張
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

各診断ソースは以下のインターフェースを実装します：

```typescript
interface DiagnosticSource {
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generate(uri: string, content: string, projectRoot: string): Promise<Diagnostic[]>;
  cancel?(): void;
  dispose?(): void;
}
```

これにより、以下の利点があります：

- **並列実行**: 複数の診断ソースを並列で実行し、結果をマージ
- **部分的な失敗への対応**: 一つのソースがエラーでも、他のソースは正常動作
- **グレースフルデグラデーション**: textlint未インストール環境でもstoryteller診断は動作

## LSP統合

### バックグラウンド実行

storyteller LSPサーバー内で、textlintがバックグラウンドで実行されます。

**特徴：**

- **デバウンス処理**: 500msのデバウンスで、タイピング中の過剰な実行を防止
- **キャンセル機能**: 新しいリクエストが来たら前のリクエストを自動キャンセル
- **タイムアウト**: 30秒のタイムアウトで、長時間の実行を回避
- **UIブロッキングなし**: 非同期実行により、エディタ操作を妨げない

**実装パターン（参考）:**

```typescript
class TextlintWorker {
  async lint(content: string, filePath: string): Promise<TextlintResult> {
    // 既存のリクエストをキャンセル
    this.cancel();

    // デバウンス
    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        const result = await this.execute(content, filePath);
        resolve(result);
      }, this.debounceMs);
    });
  }
}
```

### storytellerエンティティ診断との統合

storytellerのエンティティ検証とtextlintの文法チェックが、同じエディタ内で統合表示されます。

**診断の種類：**

| 診断ソース | 内容                                 | sourceフィールド |
|------------|--------------------------------------|------------------|
| storyteller| キャラクター・設定参照の検証         | `storyteller`    |
| textlint   | 文法・表記ゆれ・スタイルの検証       | `textlint`       |

**表示例（neovim/VSCode）:**

```
manuscripts/chapter01.md:
  1:10  warning  [storyteller] 未定義のキャラクター: 勇者 (信頼度: 85%)
  2:5   error    [textlint/prh] 表記ゆれ: 「うまい」→「美味い」
  3:20  warning  [textlint/ja-technical-writing] 一文が長すぎます
```

### エディタでの表示方法

#### Neovim（nvim-lspconfig）

storyteller LSPを起動すると、自動的にtextlint診断も実行されます。

```lua
-- ~/.config/nvim/lua/lsp/storyteller.lua
require'lspconfig'.storyteller.setup{
  cmd = { "storyteller", "lsp", "start", "--stdio" },
  filetypes = { "markdown" },
  root_dir = require'lspconfig'.util.root_pattern(".storyteller", ".git"),
}
```

診断の表示：

- `:Telescope diagnostics` - 全診断を一覧表示
- `vim.diagnostic.open_float()` - カーソル位置の診断をポップアップ表示
- `]d`, `[d` - 次/前の診断へジャンプ

#### VSCode

VSCode拡張設定で、textlint診断が自動的に表示されます。

```json
// .vscode/settings.json
{
  "storyteller.lsp.textlint.enabled": true,
  "storyteller.lsp.textlint.debounceMs": 500
}
```

## CLIコマンド

### `storyteller lint`

原稿の文法チェックを実行します。

#### 基本的な使い方

```bash
# manuscripts/配下を再帰的にチェック（デフォルト）
storyteller lint

# 特定ファイルをチェック
storyteller lint --path manuscripts/chapter01.md

# ディレクトリを再帰的にチェック
storyteller lint --dir manuscripts --recursive
```

#### オプション一覧

| オプション           | 説明                                    | デフォルト    |
|----------------------|-----------------------------------------|---------------|
| `--path <file>`      | 対象ファイルパス                        | -             |
| `--dir <directory>`  | 対象ディレクトリ                        | manuscripts   |
| `--recursive`        | サブディレクトリも含める                | true          |
| `--fix`              | 自動修正を実行（--path必須）            | false         |
| `--json`             | JSON形式で出力                          | false         |
| `--severity <level>` | 表示する重要度（error/warning/info）    | すべて        |
| `--rule <rules>`     | 特定ルールのみ有効化（カンマ区切り）    | すべて        |
| `--config <file>`    | 設定ファイルパス                        | 自動検出      |
| `--with-entity-check`| storytellerエンティティチェックも実行   | false         |

#### 使用例

**1. 基本的なチェック**

```bash
storyteller lint
```

出力例：

```
Found 3 issues in 2 files:
  Errors: 1
  Warnings: 2
  Info: 0

manuscripts/chapter01.md:
  ✗ ERROR [prh] 表記ゆれ: 「うまい」→「美味い」 (2:5)
  ⚠ WARNING [ja-technical-writing] 一文が長すぎます (3:20)

manuscripts/chapter02.md:
  ⚠ WARNING [ja-spacing] 半角カタカナが使用されています (5:12)
```

**2. 自動修正**

```bash
storyteller lint --path manuscripts/chapter01.md --fix
```

出力例：

```
✓ Fixed 1 file:
  manuscripts/chapter01.md (2 issues fixed)
```

**3. エラーのみ表示**

```bash
storyteller lint --severity error
```

**4. 特定ルールのみ実行**

```bash
storyteller lint --rule prh,ja-technical-writing
```

**5. JSON形式で出力（CI/CD向け）**

```bash
storyteller lint --json
```

出力例：

```json
{
  "totalFiles": 2,
  "totalIssues": 3,
  "errorCount": 1,
  "warningCount": 2,
  "infoCount": 0,
  "results": [
    {
      "path": "manuscripts/chapter01.md",
      "issues": [
        {
          "ruleId": "prh",
          "severity": "error",
          "message": "表記ゆれ: 「うまい」→「美味い」",
          "line": 2,
          "column": 5,
          "source": "textlint"
        }
      ]
    }
  ]
}
```

**6. storytellerエンティティチェックも実行**

```bash
storyteller lint --with-entity-check
```

storytellerのキャラクター・設定参照検証とtextlintの文法チェックを同時に実行します。

## MCPツール

storytellerは独自のMCP textlintツールを**実装していません**。
代わりに、textlint v14.8.0+が提供するネイティブMCPサーバー機能（`--mcp`フラグ）を使用します。

### textlint --mcp の使用方法

textlintが提供するMCPツール：

| ツール名                    | 説明                         |
|-----------------------------|------------------------------|
| `lintFile`                  | ファイルのlint実行           |
| `lintText`                  | テキスト直接lint             |
| `getLintFixedFileContent`   | ファイルのfix結果取得        |
| `getLintFixedTextContent`   | テキストのfix結果取得        |

### Claude Desktop設定例

Claude Desktopの設定ファイル（`claude_desktop_config.json`）に、textlint MCPサーバーを追加します。

#### macOS/Linux

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

#### Windows

```json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller.exe",
      "args": ["mcp", "start", "--stdio"]
    },
    "textlint": {
      "command": "npx.cmd",
      "args": ["textlint", "--mcp"],
      "cwd": "C:\\path\\to\\your\\story-project"
    }
  }
}
```

### 使用例（Claude Desktop）

textlint MCPツールをClaude Desktopから使用する例：

```
User: manuscripts/chapter01.mdをチェックして

Claude: textlintで確認します。
[MCPツール: lintFile を実行]
...結果表示...

User: 表記ゆれを修正して

Claude: textlintで修正します。
[MCPツール: getLintFixedFileContent を実行]
...修正内容を表示...
```

## Git Hooks

### install-hooks

Git pre-commit hookをインストールして、コミット時に自動的にlintチェックを実行します。

#### 基本的なインストール

```bash
storyteller lint install-hooks
```

このコマンドは以下を実行します：

1. `.git/hooks/pre-commit` にフックスクリプトを配置
2. 実行権限を付与（`chmod 755`）
3. 既存のフックがある場合はバックアップ（`.git/hooks/pre-commit.backup`）

#### strictモード

```bash
storyteller lint install-hooks --strict
```

**通常モード（デフォルト）:**

- lint失敗してもコミットは許可
- 警告のみ表示

**strictモード（`--strict`）:**

- lint失敗時にコミットを拒否（exit code 1）
- 強制的に修正を要求

#### pre-commitの動作

フックスクリプトの実行フロー：

```bash
#!/bin/sh
# .git/hooks/pre-commit (storyteller lint)

set -e

echo "[storyteller] Running lint checks..."

# Run storyteller lint on manuscripts
storyteller lint --dir manuscripts 2>/dev/null || LINT_EXIT_CODE=$?

if [ -z "$LINT_EXIT_CODE" ]; then
    LINT_EXIT_CODE=0
fi

if [ $LINT_EXIT_CODE -ne 0 ]; then
    echo "[storyteller] Lint found issues (exit code: $LINT_EXIT_CODE)"
else
    echo "[storyteller] Lint checks passed"
fi

# strictモードの場合のみ
if [ $LINT_EXIT_CODE -ne 0 ]; then
    echo "[storyteller] Lint errors found. Commit rejected in strict mode."
    exit 1
fi
```

実行例：

```
$ git commit -m "章を追加"
[storyteller] Running lint checks...

Found 2 issues in 1 file:
  Errors: 1
  Warnings: 1
  Info: 0

manuscripts/chapter01.md:
  ✗ ERROR [prh] 表記ゆれ: 「うまい」→「美味い」 (2:5)
  ⚠ WARNING [ja-technical-writing] 一文が長すぎます (3:20)

[storyteller] Lint found issues (exit code: 1)
[storyteller] Lint errors found. Commit rejected in strict mode.
```

### uninstall-hooks

Git pre-commit hookをアンインストールします。

```bash
storyteller lint uninstall-hooks
```

このコマンドは以下を実行します：

1. `.git/hooks/pre-commit` がstorytellerによって作成されたものか確認
2. 確認できた場合のみ削除
3. storyteller以外が作成したフックは削除を拒否（安全性確保）

## セットアップ

### textlintのインストール

storytellerとは別に、textlintとルールをインストールする必要があります。

#### npm/pnpm/yarn経由

```bash
# textlint本体
npm install --save-dev textlint

# 推奨ルール
npm install --save-dev \
  textlint-rule-preset-ja-technical-writing \
  textlint-rule-prh \
  textlint-rule-preset-ja-spacing

# オプション（英語チェック）
npm install --save-dev \
  textlint-rule-alex \
  textlint-rule-write-good
```

#### Deno環境

Denoプロジェクトでもnpx経由でtextlintを使用できます（インストール不要）。

```bash
npx textlint --version
```

### 設定ファイルの配置

プロジェクトルートに `.textlintrc` ファイルを配置します。

**サンプル（`.textlintrc.example`）を参照:**

```bash
cp .textlintrc.example .textlintrc
```

### ルールの設定

`.textlintrc` で有効化するルールを設定します。

**推奨設定:**

```json
{
  "filters": {},
  "rules": {
    "preset-ja-technical-writing": {
      "ja-no-weak-phrase": false,
      "ja-no-mixed-period": false,
      "max-kanji-continuous-len": {
        "max": 6
      }
    },
    "prh": {
      "rulePaths": ["./prh-rules.yml"]
    },
    "preset-ja-spacing": {
      "ja-space-between-half-and-full-width": {
        "space": "never"
      }
    }
  }
}
```

## 設定

### .textlintrc の例

プロジェクトルートに配置する設定ファイルです。

**基本的な設定:**

```json
{
  "filters": {},
  "rules": {
    "preset-ja-technical-writing": true,
    "prh": {
      "rulePaths": ["./prh-rules.yml"]
    }
  }
}
```

**詳細な設定:**

```json
{
  "filters": {
    "comments": true
  },
  "rules": {
    "preset-ja-technical-writing": {
      "sentence-length": {
        "max": 120
      },
      "max-kanji-continuous-len": {
        "max": 6
      },
      "ja-no-weak-phrase": false,
      "ja-no-mixed-period": {
        "periodMark": "。"
      },
      "no-exclamation-question-mark": false
    },
    "prh": {
      "rulePaths": ["./prh-rules.yml"]
    },
    "preset-ja-spacing": {
      "ja-space-between-half-and-full-width": {
        "space": "never"
      },
      "ja-space-around-code": {
        "before": true,
        "after": true
      }
    }
  }
}
```

**サンプルファイル:** `.textlintrc.example` を参照

### prh-rules.yml の例

表記ゆれを統一するためのルールファイルです。

**基本的なルール:**

```yaml
version: 1
rules:
  - expected: 美味しい
    patterns:
      - おいしい
      - うまい
  - expected: 綺麗
    patterns:
      - きれい
      - キレイ
  - expected: ください
    pattern: 下さい
```

**詳細なルール:**

```yaml
version: 1
rules:
  # 表記ゆれ統一
  - expected: 美味しい
    patterns:
      - おいしい
      - うまい

  - expected: 綺麗
    patterns:
      - きれい
      - キレイ

  - expected: ください
    pattern: 下さい

  # 技術用語
  - expected: JavaScript
    patterns:
      - javascript
      - java script
      - JS
    specs:
      - from: TypeScript
        to: JavaScript

  # 固有名詞
  - expected: GitHub
    patterns:
      - Github
      - github

  # 半角・全角の統一
  - expected: "！"
    pattern: "!"

  - expected: "？"
    pattern: "?"
```

**サンプルファイル:** `prh-rules.yml.example` を参照

### storyteller.jsonからの設定（将来予定）

将来的には、storyteller.jsonでtextlint設定を管理できるようにする予定です。

**将来の設定例:**

```json
{
  "lint": {
    "textlint": {
      "enabled": true,
      "configPath": ".textlintrc",
      "debounceMs": 500,
      "timeoutMs": 30000,
      "rules": {
        "preset-ja-technical-writing": true,
        "prh": {
          "rulePaths": ["./prh-rules.yml"]
        }
      }
    }
  }
}
```

現在は `.textlintrc` による設定のみサポートしています。

## トラブルシューティング

### textlintが見つからない

**症状:**

```
textlint execution failed: Command not found
```

**解決策:**

1. textlintをインストール:

```bash
npm install -g textlint
# または
npm install --save-dev textlint
```

2. npx経由で実行（インストール不要）:

storyteller lintは自動的に`npx textlint`を使用します。

### LSPでtextlint診断が表示されない

**症状:**

storyteller診断は表示されるが、textlint診断が表示されない。

**解決策:**

1. textlintが利用可能か確認:

```bash
npx textlint --version
```

2. .textlintrcが存在するか確認:

```bash
ls -la .textlintrc
```

3. LSPサーバーを再起動:

```vim
:LspRestart
```

### Git hookが実行されない

**症状:**

git commitしてもlintが実行されない。

**解決策:**

1. フックファイルの実行権限を確認:

```bash
ls -l .git/hooks/pre-commit
```

2. 実行権限がない場合は付与:

```bash
chmod 755 .git/hooks/pre-commit
```

3. フックを再インストール:

```bash
storyteller lint uninstall-hooks
storyteller lint install-hooks
```

## 参考リンク

- [textlint公式ドキュメント](https://textlint.github.io/)
- [textlint MCP機能](https://github.com/textlint/textlint/blob/master/docs/mcp.md)
- [textlint-rule-preset-ja-technical-writing](https://github.com/textlint-ja/textlint-rule-preset-ja-technical-writing)
- [prh（表記ゆれ検出ツール）](https://github.com/prh/prh)
- [storyteller LSPドキュメント](./lsp.md)
- [storyteller CLIリファレンス](./cli.md)
