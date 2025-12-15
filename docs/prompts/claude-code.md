# Street Storyteller - Claude Code プラットフォームプロンプト

このドキュメントは、Claude Code環境でStory
Directorを使用する際のプラットフォーム固有情報を定義します。 基盤として
`core.md` と `director.md` を参照します。

## プラットフォーム概要

Claude Codeは、スラッシュコマンドとCLIを通じてStory Directorと連携します。
ターミナル操作とコード編集の両方に対応した環境で、開発者向けのワークフローを提供します。

### 特徴

- **CLI直接実行**: `storyteller` コマンドを直接実行可能
- **スラッシュコマンド**: `/story-*` 形式のカスタムコマンド
- **JSON出力**: `--json` フラグで構造化出力を取得
- **コード編集統合**: 型定義ファイルの直接編集サポート

## CLI コマンド一覧

storyteller CLIのコマンド一覧です。

### 基本コマンド

```bash
# プロジェクト初期化
storyteller init

# ヘルプ表示
storyteller --help
storyteller <command> --help

# バージョン確認
storyteller --version
```

### メタデータ操作

```bash
# メタデータチェック
storyteller meta check [path]
storyteller meta check manuscripts/chapter01.md
storyteller meta check --dir manuscripts --recursive

# メタデータ生成
storyteller meta generate [path]
storyteller meta generate --preview
storyteller meta generate --dry-run
storyteller meta generate --force

# ファイル監視
storyteller meta watch [path]
```

### 要素操作

```bash
# キャラクター作成
storyteller element character --name <name>
storyteller element character --name hero --role protagonist --summary "勇敢な青年"
storyteller element character --name hero --with-details

# 設定作成
storyteller element setting --name <name>
storyteller element setting --name royal_capital --summary "王国の首都"
```

### LSP/検証

```bash
# LSPサーバー起動
storyteller lsp start --stdio

# ワンショット検証
storyteller lsp validate [path]
storyteller lsp validate manuscripts/chapter01.md
storyteller lsp validate --dir manuscripts --recursive

# エディタ設定インストール
storyteller lsp install nvim
storyteller lsp install vscode
```

### ビューア

```bash
# HTMLビュー生成
storyteller view [path]
storyteller view --output ./dist

# 開発サーバー起動
storyteller view --serve
storyteller view --serve --port 3000 --watch
```

### MCP

```bash
# MCPサーバー起動
storyteller mcp start --stdio
storyteller mcp start --stdio --path /path/to/project
```

## JSON出力モード

`--json` フラグを追加することで、すべてのコマンド出力をJSON形式で取得できます。

### 使用方法

```bash
storyteller meta check --json
storyteller element character --name hero --json
storyteller lsp validate --json
```

### 出力フォーマット

**成功時:**

```json
{
  "type": "success",
  "message": "メタデータチェック完了",
  "data": {
    "errors": 0,
    "warnings": 2
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

**エラー時:**

```json
{
  "type": "error",
  "message": "ファイルが見つかりません",
  "error": {
    "code": "FILE_NOT_FOUND",
    "path": "manuscripts/missing.md"
  },
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

### 活用例

```bash
# 結果をjqでパース
storyteller meta check --json | jq '.data.warnings'

# 変数に格納
RESULT=$(storyteller lsp validate --json)
```

## スラッシュコマンド一覧

Claude Code用のスラッシュコマンドです。 `.claude/commands/`
ディレクトリに配置されています。

### `/story-director`

物語のディレクターとして質問に回答します。

**使用方法:**

```
/story-director キャラクター構成を評価して
/story-director この章の問題点を指摘して
/story-director 次の展開のアイデアが欲しい
```

**内部動作:**

1. `storyteller://project` リソースを参照
2. `storyteller://characters` リソースを参照
3. `storyteller://settings` リソースを参照
4. ユーザーの質問に基づいて回答を生成

### `/story-check`

原稿の整合性を一括チェックします。

**使用方法:**

```
/story-check
/story-check manuscripts/chapter01.md
```

**内部動作:**

```bash
storyteller lsp validate --dir manuscripts --recursive
```

### `/story-char`

キャラクター操作を行います。

**使用方法:**

```
/story-char hero
/story-char --create sage
```

**内部動作:**

```bash
storyteller element character --name <name>
```

### `/story-view`

プロジェクトビューアを起動します。

**使用方法:**

```
/story-view
```

**内部動作:**

```bash
storyteller view --serve
```

## 対話パターン例

### パターン1: プロジェクト分析

```
ユーザー: /story-director このプロジェクトの状態を教えて

Claude Code: プロジェクト情報を取得しています...

[storyteller lsp validate --json 実行]

## プロジェクト分析結果

### 概要
- キャラクター: 5名定義済み
- 設定: 3箇所定義済み
- 原稿: 8章

### 整合性チェック
- エラー: 0件
- 警告: 2件

### 警告詳細
1. manuscripts/chapter03.md:15 - 未定義参照「魔女」
2. manuscripts/chapter05.md:42 - 低信頼度参照（65%）

### 推奨アクション
\`\`\`bash
# 「魔女」キャラクターを追加
storyteller element character --name witch --role supporting

# または明示的参照に変換
# chapter03.md の「魔女」を「@witch」に変更
\`\`\`
```

### パターン2: キャラクター追加

```
ユーザー: 新しいキャラクターを追加したい

Claude Code: キャラクター追加の方法を説明します。

## コマンド

\`\`\`bash
# 基本的な追加
storyteller element character --name <name> --role <role> --summary "<summary>"

# 例
storyteller element character --name sage --role supporting --summary "主人公を導く賢者"
\`\`\`

## ロール一覧
- `protagonist`: 主人公
- `antagonist`: 敵役
- `supporting`: 脇役
- `guest`: ゲスト

実行しますか？
```

### パターン3: 整合性修正

```
ユーザー: /story-check

Claude Code: 整合性チェックを実行します...

\`\`\`bash
storyteller lsp validate --dir manuscripts --recursive --json
\`\`\`

## 結果

### 検出された問題

| ファイル | 行 | 種別 | 内容 |
|---------|-----|------|------|
| chapter03.md | 15 | error | 未定義キャラクター「魔女」 |
| chapter05.md | 42 | warning | 低信頼度参照（65%） |

### 修正方法

1. **chapter03.md の修正**
   - キャラクター定義を追加: `storyteller element character --name witch`
   - または明示的参照に変更: 「魔女」→「@witch」

2. **chapter05.md の修正**
   - 低信頼度参照を確認して明示的参照に変換

修正を自動で行いますか？
```

## ワークフロー例

### 新規プロジェクト開始

```bash
# 1. プロジェクト初期化
storyteller init

# 2. キャラクター作成
storyteller element character --name hero --role protagonist --with-details
storyteller element character --name heroine --role protagonist --with-details

# 3. 設定作成
storyteller element setting --name hometown --summary "主人公の故郷"

# 4. 原稿作成（手動でMarkdownを編集）
# manuscripts/chapter01.md

# 5. 整合性チェック
storyteller lsp validate

# 6. メタデータ生成
storyteller meta generate
```

### 継続開発

```bash
# 整合性チェック
storyteller lsp validate --dir manuscripts --recursive

# 問題があれば修正
# ...

# メタデータ更新
storyteller meta generate --update
```

## 注意事項

### パス指定

Claude Code環境では、プロジェクトルートからの相対パスを使用します。

```bash
# 正しい
storyteller meta check manuscripts/chapter01.md

# 間違い（絶対パスは避ける）
storyteller meta check /Users/.../manuscripts/chapter01.md
```

### JSON出力のパース

JSON出力を使用する場合、エラーハンドリングを適切に行ってください。

```bash
RESULT=$(storyteller lsp validate --json 2>&1)
if echo "$RESULT" | jq -e '.type == "error"' > /dev/null; then
  echo "エラーが発生しました"
fi
```

---

_このドキュメントはClaude
Code固有の情報です。他のプラットフォームについては各ドキュメントを参照してください。_
