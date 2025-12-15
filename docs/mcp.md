# MCP API (Street Storyteller)

MCPサーバーはClaude Desktop等のMCPクライアントと連携し、
自然言語での物語プロジェクト管理を可能にします。

## 起動方法

```bash
storyteller mcp start --stdio
storyteller mcp start --stdio --path /path/to/story-project
```

## Tools

### `meta_check`

原稿のメタデータ生成可能性を検証します。

- Args: `path?: string`, `dir?: string`, `recursive?: boolean`,
  `characters?: string`, `settings?: string`, `preset?: string`

### `meta_generate`

原稿から`.meta.ts`ファイルを生成します。

- Args: `path?: string`, `dir?: string`, `recursive?: boolean`,
  `preview?: boolean`, `dryRun?: boolean`, `force?: boolean`,
  `update?: boolean`, `output?: string`, `characters?: string`,
  `settings?: string`, `preset?: string`

### `element_create`

物語要素（キャラクター、設定）を作成します。

- Args: `type: "character"|"setting"`, `name: string`, `id?: string`,
  `role?: string`, `summary?: string`, `traits?: string[]`,
  `withDetails?: boolean`, `addDetails?: string`, `separateFiles?: string`,
  `force?: boolean`

### `view_browser`

プロジェクトをHTML形式で可視化します。

- Args: `path?: string`, `output?: string`, `serve?: boolean`, `port?: number`,
  `watch?: boolean`, `timeout?: number`, `dryRun?: boolean`

### `lsp_validate`

LSPスタイルの診断を実行します。

- Args: `projectRoot?: string`, `path?: string`, `dir?: string`,
  `recursive?: boolean`
- Returns: JSON text (`Diagnostic[]` for single file, or `{path, diagnostics}[]`
  for directory)

### `lsp_find_references`

エンティティ参照を検索します。

- Args: `projectRoot?: string`, `path?: string`, `dir?: string`,
  `recursive?: boolean`, `characterName?: string`, `settingName?: string`
- Returns: JSON text (`ReferenceLocation[]`)

## Resources

`storyteller://`スキームでリソースを提供します。

| URI                            | 説明                 |
| ------------------------------ | -------------------- |
| `storyteller://project`        | プロジェクト分析JSON |
| `storyteller://characters`     | キャラクター一覧JSON |
| `storyteller://character/<id>` | 単一キャラクターJSON |
| `storyteller://settings`       | 設定一覧JSON         |
| `storyteller://setting/<id>`   | 単一設定JSON         |

## Prompts

### Creative（創作支援）

| プロンプト             | 必須引数 | オプション引数 |
| ---------------------- | -------- | -------------- |
| `character_brainstorm` | `role`   | `genre`        |
| `plot_suggestion`      | `genre`  | `logline`      |
| `scene_improvement`    | `scene`  | `goal`         |

### Workflow（ワークフロー支援）

| プロンプト             | 必須引数  | オプション引数 |
| ---------------------- | --------- | -------------- |
| `project_setup_wizard` | `name`    | `template`     |
| `chapter_review`       | `chapter` | `text`         |
| `consistency_fix`      | `issue`   | `context`      |

## 自然言語インテント解析（v1.0拡張）

MCPサーバーは自然言語入力から適切なツールを推論します。
v1.0で対応パターンが3個から21個に拡張されました。

### 対応パターン一覧

#### ビュー/表示（4パターン）

| 入力例                 | 解析結果       | 信頼度 |
| ---------------------- | -------------- | ------ |
| 「一覧を表示して」     | `view_browser` | 90%    |
| 「プロジェクトを表示」 | `view_browser` | 88%    |
| 「ビューを開いて」     | `view_browser` | 85%    |
| 「可視化して」         | `view_browser` | 85%    |

#### キャラクター作成（4パターン）

| 入力例                 | 解析結果         | 信頼度 |
| ---------------------- | ---------------- | ------ |
| 「キャラクターを作成」 | `element_create` | 90%    |
| 「主人公を追加」       | `element_create` | 88%    |
| 「キャラを作って」     | `element_create` | 85%    |
| 「新しいキャラクター」 | `element_create` | 85%    |

#### 設定作成（1パターン）

| 入力例           | 解析結果                         | 信頼度 |
| ---------------- | -------------------------------- | ------ |
| 「世界観を作成」 | `element_create` (type: setting) | 88%    |

#### メタデータ（3パターン）

| 入力例                   | 解析結果     | 信頼度 |
| ------------------------ | ------------ | ------ |
| 「メタデータをチェック」 | `meta_check` | 90%    |
| 「章情報を確認」         | `meta_check` | 85%    |
| 「設定を確認」           | `meta_check` | 85%    |

#### LSP/検証（3パターン）

| 入力例                     | 解析結果       | 信頼度 |
| -------------------------- | -------------- | ------ |
| 「原稿の整合性をチェック」 | `lsp_validate` | 88%    |
| 「検証を実行」             | `lsp_validate` | 85%    |
| 「整合性を確認」           | `lsp_validate` | 85%    |

#### 参照検索（2パターン）

| 入力例                   | 解析結果              | 信頼度 |
| ------------------------ | --------------------- | ------ |
| 「参照を検索」           | `lsp_find_references` | 88%    |
| 「どこで使われている？」 | `lsp_find_references` | 85%    |

#### プロジェクト管理（3パターン）

| 入力例                   | 解析結果        | 信頼度 |
| ------------------------ | --------------- | ------ |
| 「プロジェクトを初期化」 | `meta_generate` | 90%    |
| 「初期化して」           | `meta_generate` | 85%    |
| 「設定ファイルを生成」   | `meta_generate` | 85%    |

### Claude Desktopでの使用例

```
ユーザー: 「新しい主人公を作って」

Claude: element_createツールを呼び出しています...
        キャラクター「hero」を作成しました。
```

## 関連ドキュメント

- [lsp.md](./lsp.md) - LSP機能詳細
- [cli.md](./cli.md) - CLIリファレンス

---

_Last updated: 2025-12-15 (v1.0)_
