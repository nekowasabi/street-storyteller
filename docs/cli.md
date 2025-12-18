# CLI リファレンス

Street Storyteller
CLIは、物語プロジェクトを管理するためのコマンドラインツールです。

## インストール

```bash
# Denoでインストール
deno install -Afg --name storyteller main.ts

# または直接実行
deno run -A main.ts [command]
```

## グローバルオプション

すべてのコマンドで使用可能なオプションです。

| オプション  | 短縮形 | 説明                               |
| ----------- | ------ | ---------------------------------- |
| `--json`    | -      | 出力をJSON形式で表示（v1.0新機能） |
| `--help`    | `-h`   | ヘルプを表示                       |
| `--version` | `-v`   | バージョンを表示                   |
| `--verbose` | -      | 詳細な出力を表示                   |
| `--quiet`   | `-q`   | 出力を抑制                         |

## JSON出力（v1.0新機能）

`--json`フラグを使用すると、すべてのコマンド出力がJSON形式になります。
スクリプトやCI/CDパイプラインでの使用に適しています。

### 出力形式

```json
{
  "type": "success" | "info" | "warning" | "error",
  "message": "メッセージ内容",
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### 使用例

```bash
# メタデータチェックの結果をJSONで取得
storyteller meta check --json

# エラー処理付きスクリプト
result=$(storyteller meta check --json)
if echo "$result" | jq -e '.type == "error"' > /dev/null; then
  echo "エラーが発生しました"
fi
```

## コマンド一覧

### `storyteller generate`

新しい物語プロジェクトを生成します。

```bash
storyteller generate --name "my-story" --template basic
```

| オプション   | 短縮形 | 説明           | デフォルト           |
| ------------ | ------ | -------------- | -------------------- |
| `--name`     | `-n`   | プロジェクト名 | 必須                 |
| `--template` | `-t`   | テンプレート   | `basic`              |
| `--path`     | `-p`   | 出力先パス     | カレントディレクトリ |

### `storyteller meta`

メタデータ関連のサブコマンドを提供します。

#### `storyteller meta check`

原稿のメタデータ生成可能性をチェックします。

```bash
# 単一ファイル
storyteller meta check --path manuscripts/chapter01.md

# ディレクトリ（再帰的）
storyteller meta check --dir manuscripts/ --recursive

# JSON出力
storyteller meta check --path chapter01.md --json
```

| オプション     | 説明                         |
| -------------- | ---------------------------- |
| `--path`       | 対象ファイルパス             |
| `--dir`        | 対象ディレクトリ             |
| `--recursive`  | サブディレクトリも含める     |
| `--characters` | キャラクター定義ディレクトリ |
| `--settings`   | 設定定義ディレクトリ         |
| `--preset`     | プリセット名                 |

#### `storyteller meta generate`

原稿から`.meta.ts`ファイルを生成します。

```bash
storyteller meta generate --path manuscripts/chapter01.md
storyteller meta generate --dir manuscripts/ --recursive --preview
```

| オプション    | 説明                     |
| ------------- | ------------------------ |
| `--path`      | 対象ファイルパス         |
| `--dir`       | 対象ディレクトリ         |
| `--recursive` | サブディレクトリも含める |
| `--preview`   | プレビュー表示のみ       |
| `--dry-run`   | 実際には書き込まない     |
| `--force`     | 既存ファイルを上書き     |
| `--update`    | 既存ファイルを更新       |
| `--output`    | 出力先ディレクトリ       |

#### `storyteller meta watch`

ファイル変更を監視して自動的にメタデータを更新します。

```bash
storyteller meta watch --dir manuscripts/
```

### `storyteller element`

物語要素（キャラクター、設定など）を作成します。

#### `storyteller element character`

キャラクターを作成します。

```bash
storyteller element character --name "hero" --role protagonist --summary "主人公"
```

| オプション         | 説明                                            |
| ------------------ | ----------------------------------------------- |
| `--name`           | キャラクター名（必須）                          |
| `--id`             | 内部ID（省略時はnameを使用）                    |
| `--role`           | 役割（protagonist/antagonist/supporting/guest） |
| `--summary`        | 概要説明                                        |
| `--traits`         | 特徴（カンマ区切り）                            |
| `--with-details`   | 詳細情報付きで作成                              |
| `--add-details`    | 追加する詳細項目                                |
| `--separate-files` | ファイル分離する項目                            |
| `--force`          | 既存ファイルを上書き                            |

### `storyteller lsp`

LSPサーバー関連のサブコマンドを提供します。

#### `storyteller lsp start`

LSPサーバーを起動します。

```bash
storyteller lsp start --stdio
```

| オプション | 説明                     |
| ---------- | ------------------------ |
| `--stdio`  | 標準入出力モード（必須） |

#### `storyteller lsp install`

エディタ用の設定を生成します。

```bash
storyteller lsp install nvim
storyteller lsp install vscode
```

### `storyteller view`

プロジェクトをHTMLで可視化します。

```bash
# HTMLファイル生成
storyteller view --output ./output/

# ローカルサーバーで表示
storyteller view --serve --port 8080

# ファイル監視モード
storyteller view --serve --watch
```

| オプション  | 説明                   |
| ----------- | ---------------------- |
| `--path`    | プロジェクトパス       |
| `--output`  | 出力先ディレクトリ     |
| `--serve`   | ローカルサーバーを起動 |
| `--port`    | サーバーポート番号     |
| `--watch`   | ファイル監視モード     |
| `--timeout` | タイムアウト（秒）     |
| `--dry-run` | プレビューのみ         |

#### `storyteller view character`

キャラクター情報を表示します。

```bash
# 基本情報を表示
storyteller view character --id hero

# 詳細情報を展開表示（ファイル参照を解決）
storyteller view character --id hero --details

# 特定フェーズのスナップショット
storyteller view character --id hero --phase awakening

# 全フェーズタイムライン
storyteller view character --id hero --all-phases

# フェーズ間差分
storyteller view character --id hero --diff --to awakening
storyteller view character --id hero --diff --from initial --to awakening

# JSON形式で出力
storyteller view character --id hero --json
```

| オプション     | 説明                                   |
| -------------- | -------------------------------------- |
| `--id`         | キャラクターID（必須）                 |
| `--details`    | 詳細情報を展開（ファイル参照を解決）   |
| `--phase`      | 特定フェーズのスナップショット表示     |
| `--all-phases` | 全フェーズのタイムライン表示           |
| `--diff`       | フェーズ間の差分表示                   |
| `--from`       | 差分の開始フェーズ（省略時: 初期状態） |
| `--to`         | 差分の終了フェーズ（`--diff`時に必須） |
| `--json`       | JSON形式で出力                         |

#### `storyteller view setting`

設定情報を表示します。

```bash
# 設定一覧を表示
storyteller view setting --list

# タイプでフィルタリング
storyteller view setting --list --type location
storyteller view setting --list --type world
storyteller view setting --list --type culture
storyteller view setting --list --type organization

# 特定設定を表示
storyteller view setting --id royal_capital

# 詳細情報を展開表示（ファイル参照を解決）
storyteller view setting --id royal_capital --details

# JSON形式で出力
storyteller view setting --list --json
storyteller view setting --id royal_capital --json
```

| オプション  | 説明                                                    |
| ----------- | ------------------------------------------------------- |
| `--list`    | 設定一覧を表示                                          |
| `--id`      | 設定IDを指定して詳細表示                                |
| `--type`    | タイプでフィルタ（location/world/culture/organization） |
| `--details` | 詳細情報を展開（ファイル参照を解決）                    |
| `--json`    | JSON形式で出力                                          |

### `storyteller mcp`

MCPサーバー関連のサブコマンドを提供します。

#### `storyteller mcp start`

MCPサーバーを起動します。

```bash
storyteller mcp start --stdio
storyteller mcp start --stdio --path /path/to/project
```

| オプション | 説明                     |
| ---------- | ------------------------ |
| `--stdio`  | 標準入出力モード（必須） |
| `--path`   | プロジェクトパス         |

### `storyteller help`

ヘルプを表示します。

```bash
storyteller help
storyteller help meta
storyteller help meta check
```

### `storyteller version`

バージョン情報を表示します。

```bash
storyteller version
```

## 終了コード

| コード | 説明                     |
| ------ | ------------------------ |
| 0      | 成功                     |
| 1      | 一般的なエラー           |
| 2      | コマンドライン引数エラー |

## 環境変数

| 変数                    | 説明                                |
| ----------------------- | ----------------------------------- |
| `STORYTELLER_CONFIG`    | 設定ファイルのパス                  |
| `STORYTELLER_LOG_LEVEL` | ログレベル（debug/info/warn/error） |

## 関連ドキュメント

- [lsp.md](./lsp.md) - LSP機能詳細
- [mcp.md](./mcp.md) - MCPサーバー詳細
- [meta-generate.md](./meta-generate.md) - メタデータ生成

---

_Last updated: 2025-12-18 (v1.1)_
