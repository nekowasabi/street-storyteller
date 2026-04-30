# MCP (Model Context Protocol) Reference

`storyteller` は MCP サーバとして Claude Desktop / 他 MCP クライアントから利用できる。実装は Go (`internal/mcp/`)。

> 関連: [architecture.md](./architecture.md) / [cli.md](./cli.md) / [lsp.md](./lsp.md)

## 起動

```bash
storyteller mcp start --stdio
storyteller mcp start --stdio --path /path/to/story-project
```

`mcp init` は Claude Desktop 用設定スニペットを出力する:

```bash
storyteller mcp init
```

### Claude Desktop 設定例

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

textlint MCP は textlint v14.8.0+ のネイティブサポートを使う（storyteller 側に textlint MCP は無い）。

## アーキテクチャ

| パッケージ | 役割 |
|-----------|------|
| `internal/mcp/server` | JSON-RPC dispatcher / lifecycle |
| `internal/mcp/protocol` | MCP 型定義 |
| `internal/mcp/tools` | Tool 実装と registry |
| `internal/mcp/resources` | Resource プロバイダ |
| `internal/mcp/prompts` | Prompt 定義 |

サーバは `initialize`, `tools/list`, `tools/call`, `resources/list`, `resources/read`, `prompts/list` を実装する（`internal/mcp/server/server.go`）。

## Tools (18)

`internal/mcp/tools/` で実装。各 Tool は `Definition() protocol.Tool` と `Handle(ctx, params)` を持つ。

| Tool | 実装 | 概要 |
|------|------|------|
| `meta_check` | `meta_check.go` | manuscripts の YAML frontmatter 検証 |
| `meta_generate` | `meta_generate.go` | frontmatter テンプレ生成 |
| `element_create` | `element_create.go` | 物語要素作成 |
| `view_browser` | `view_browser.go` | HTML ビュー生成 |
| `lsp_validate` | `lsp_validate.go` | 原稿検証 |
| `lsp_find_references` | `lsp_find_references.go` | エンティティ参照検索 |
| `timeline_create` | `timeline_create.go` | タイムライン作成 |
| `event_create` | `event_create.go` | タイムラインイベント作成 |
| `event_update` | `event_update.go` | イベント更新 |
| `timeline_view` | `timeline_view.go` | タイムライン表示 |
| `timeline_analyze` | `timeline_analyze.go` | 因果関係・整合性分析 |
| `foreshadowing_create` | `foreshadowing_create.go` | 伏線作成 |
| `foreshadowing_view` | `foreshadowing_view.go` | 伏線表示 |
| `manuscript_binding` | `manuscript_binding.go` | 原稿 frontmatter のエンティティ紐付け |
| `plot_create` | `plot_create.go` | plot/sub 作成 |
| `plot_view` | `plot_view.go` | plot/sub 表示 |
| `beat_create` | `beat_create.go` | プロットビート作成 |
| `intersection_create` | `intersection_create.go` | plot/sub 間の交差作成 |

### Tool 入力スキーマ例

#### `meta_check`
```json
{ "type": "object", "properties": { "path": { "type": "string" } } }
```

#### `manuscript_binding`
```json
{
  "type": "object",
  "required": ["manuscript", "action", "entityType", "ids"],
  "properties": {
    "manuscript": { "type": "string" },
    "action": { "enum": ["add", "remove", "set"] },
    "entityType": {
      "enum": ["characters", "settings", "foreshadowings",
               "timeline_events", "phases", "timelines"]
    },
    "ids": { "type": "array", "items": { "type": "string" } },
    "validate": { "type": "boolean", "default": true }
  }
}
```

#### `timeline_create`
```json
{
  "type": "object",
  "required": ["name", "scope", "summary"],
  "properties": {
    "name": { "type": "string" },
    "scope": { "enum": ["story", "world", "character", "arc"] },
    "summary": { "type": "string" },
    "id": { "type": "string" }
  }
}
```

#### `foreshadowing_create`
```json
{
  "type": "object",
  "required": ["name", "type", "summary", "planting_chapter", "planting_description"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "type": { "enum": ["hint","prophecy","mystery","symbol","chekhov","red_herring"] },
    "summary": { "type": "string" },
    "planting_chapter": { "type": "string" },
    "planting_description": { "type": "string" },
    "importance": { "enum": ["major","minor","subtle"] },
    "planned_resolution_chapter": { "type": "string" }
  }
}
```

完全なスキーマは各 `internal/mcp/tools/*.go` の `Definition()` を参照。

## Resources

`internal/mcp/resources/resources.go` で登録される。

| URI | 概要 |
|-----|------|
| `storyteller://project` | プロジェクト全体メタデータ |
| `storyteller://characters` | キャラクター一覧 |
| `storyteller://character/<id>` | 個別キャラクター |
| `storyteller://settings` | 設定一覧 |
| `storyteller://setting/<id>` | 個別設定 |
| `storyteller://timelines` | タイムライン一覧 |
| `storyteller://timeline/<id>` | 個別タイムライン |
| `storyteller://foreshadowings` | 伏線一覧 |
| `storyteller://foreshadowing/<id>` | 個別伏線 |
| `storyteller://plots` | plot/sub 一覧 |
| `storyteller://plot/<id>` | 個別 plot/sub |

### クエリパラメータ

| パラメータ | 対応 URI | 効果 |
|-----------|----------|------|
| `?expand=details` | character / setting | `{ file: ... }` 参照を解決して長文展開 |

## Prompts

`internal/mcp/prompts/prompts.go` で登録。

| Name | 概要 |
|------|------|
| `character_brainstorm` | キャラクターのブレインストーム |
| `plot_suggestion` | プロット展開の提案 |
| `scene_improvement` | シーン改善 |
| `project_setup_wizard` | プロジェクト初期化支援 |
| `chapter_review` | チャプターレビュー |
| `consistency_fix` | 整合性修正 |
| `timeline_brainstorm` | タイムラインのブレインストーム |
| `event_detail_suggest` | イベント詳細の提案 |
| `causality_analysis` | 因果関係分析 |
| `timeline_consistency_check` | タイムライン整合性チェック |

## エラー応答

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "invalid params: missing 'name'",
    "data": { "tool": "timeline_create" }
  }
}
```

エラーコードは `internal/mcp/protocol/messages.go` を参照。

## 動作確認

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  | storyteller mcp start --stdio
```

統合テストは `internal/mcp/server/golden_wire_test.go`、各 Tool は `*_test.go` を参照。
