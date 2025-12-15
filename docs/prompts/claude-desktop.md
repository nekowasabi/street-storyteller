# Street Storyteller - Claude Desktop プラットフォームプロンプト

このドキュメントは、Claude Desktop環境でStory
Directorを使用する際のプラットフォーム固有情報を定義します。 基盤として
`core.md` と `director.md` を参照します。

## プラットフォーム概要

Claude Desktopは、MCPサーバーを通じてStory Directorと連携します。

### 接続方式

```json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller",
      "args": ["mcp", "start", "--stdio", "--path", "/path/to/story-project"]
    }
  }
}
```

## MCP Tools 一覧

Claude Desktopから利用可能なMCPツールです。

### `meta_check`

原稿のメタデータ生成可能性を検証します。

| パラメータ  | 型      | 必須 | 説明             |
| ----------- | ------- | ---- | ---------------- |
| `path`      | string  | -    | 対象ファイルパス |
| `dir`       | string  | -    | 対象ディレクトリ |
| `recursive` | boolean | -    | 再帰的に処理     |
| `preset`    | string  | -    | プリセット名     |

**使用例:**

```
「原稿のチェックをして」
→ meta_check ツールが呼び出されます
```

### `meta_generate`

原稿から `.meta.ts` ファイルを生成します。

| パラメータ | 型      | 必須 | 説明             |
| ---------- | ------- | ---- | ---------------- |
| `path`     | string  | -    | 対象ファイルパス |
| `preview`  | boolean | -    | プレビューのみ   |
| `dryRun`   | boolean | -    | 実行せず確認     |
| `force`    | boolean | -    | 強制上書き       |

**使用例:**

```
「メタデータを生成して」
→ meta_generate ツールが呼び出されます
```

### `element_create`

物語要素（キャラクター、設定）を作成します。

| パラメータ    | 型                       | 必須 | 説明                     |
| ------------- | ------------------------ | ---- | ------------------------ |
| `type`        | "character" \| "setting" | Yes  | 要素タイプ               |
| `name`        | string                   | Yes  | 要素名                   |
| `role`        | string                   | -    | 役割（キャラクターのみ） |
| `summary`     | string                   | -    | 概要                     |
| `withDetails` | boolean                  | -    | 詳細情報付き             |

**使用例:**

```
「新しい主人公を作って」
→ element_create ツールが呼び出されます（type: character, role: protagonist）
```

### `view_browser`

プロジェクトをHTML形式で可視化します。

| パラメータ | 型      | 必須 | 説明         |
| ---------- | ------- | ---- | ------------ |
| `serve`    | boolean | -    | サーバー起動 |
| `port`     | number  | -    | ポート番号   |
| `watch`    | boolean | -    | ファイル監視 |

**使用例:**

```
「プロジェクトを可視化して」
→ view_browser ツールが呼び出されます
```

### `lsp_validate`

LSPスタイルの診断を実行します。

| パラメータ  | 型      | 必須 | 説明             |
| ----------- | ------- | ---- | ---------------- |
| `path`      | string  | -    | 対象ファイル     |
| `dir`       | string  | -    | 対象ディレクトリ |
| `recursive` | boolean | -    | 再帰処理         |

**使用例:**

```
「整合性をチェックして」
→ lsp_validate ツールが呼び出されます
```

### `lsp_find_references`

エンティティの参照箇所を検索します。

| パラメータ      | 型     | 必須 | 説明             |
| --------------- | ------ | ---- | ---------------- |
| `characterName` | string | -    | キャラクター名   |
| `settingName`   | string | -    | 設定名           |
| `dir`           | string | -    | 検索ディレクトリ |

**使用例:**

```
「勇者がどこで登場しているか教えて」
→ lsp_find_references ツールが呼び出されます（characterName: "hero"）
```

## MCP Resources 一覧

Claude Desktopから参照可能なリソースです。

### `storyteller://project`

プロジェクト全体の分析情報をJSON形式で提供します。

**含まれる情報:**

- プロジェクト名
- キャラクター数・設定数
- 原稿数
- 整合性状態

### `storyteller://characters`

キャラクター一覧をJSON形式で提供します。

**含まれる情報:**

- 各キャラクターのID、名前、役割、概要
- 関係性情報
- 登場章

### `storyteller://character/<id>`

特定キャラクターの詳細情報をJSON形式で提供します。

**使用例:**

```
storyteller://character/hero
```

### `storyteller://settings`

設定・世界観一覧をJSON形式で提供します。

**含まれる情報:**

- 各設定のID、名前、概要
- 関連キャラクター

### `storyteller://setting/<id>`

特定設定の詳細情報をJSON形式で提供します。

**使用例:**

```
storyteller://setting/royal_capital
```

## 対話パターン例

### プロジェクト情報の取得

```
ユーザー: プロジェクトの概要を教えて

Claude: [storyteller://project リソースを参照]

このプロジェクトには以下の要素があります：
- キャラクター: 5名
- 設定: 3箇所
- 原稿: 8章

現在の整合性チェック結果：すべてパス
```

### キャラクター作成

```
ユーザー: 新しい敵キャラを追加して

Claude: [element_create ツールを呼び出し]

element_create を実行しています...
- type: character
- role: antagonist

キャラクター「villain」を作成しました。
src/characters/villain.ts を確認してください。
```

### 整合性チェック

```
ユーザー: 原稿に問題ないか確認して

Claude: [lsp_validate ツールを呼び出し]

整合性チェックを実行しました。

結果：
- エラー: 0件
- 警告: 2件
  - chapter03.md:15 - 未定義キャラクター「魔女」の参照
  - chapter05.md:42 - 低信頼度の参照（信頼度: 65%）

修正が必要な場合はお知らせください。
```

## 注意事項

### レート制限

MCPツールの呼び出しには暗黙のレート制限があります。
短時間に大量のツール呼び出しを行うと、遅延が発生する場合があります。

### ファイルパス

MCPサーバー起動時に `--path` で指定したディレクトリが基準となります。
相対パスはこのディレクトリからの相対パスとして解釈されます。

### 日本語対応

すべてのツールとリソースは日本語入出力に対応しています。
キャラクター名や設定名に日本語を使用できます。

---

_このドキュメントはClaude
Desktop固有の情報です。他のプラットフォームについては各ドキュメントを参照してください。_
