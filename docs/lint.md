# Lint (textlint Adapter)

`storyteller lint` は原稿 Markdown の表記ゆれ・文法チェックを行う。実装は Go (`internal/external/textlint/` および `internal/lsp/diagnostics/`)。

> 関連: [architecture.md](./architecture.md) / [cli.md](./cli.md) / [lsp.md](./lsp.md)

## 概要

- **DiagnosticSource 抽象**: 複数の診断ソース（storyteller / textlint / 将来の Vale 等）を統合する基盤
- **CLI**: `storyteller lint`、`storyteller lint install-hooks`
- **LSP 統合**: LSP サーバ内で textlint をバックグラウンド実行し診断を統合
- **グレースフルデグラデーション**: textlint 未インストール環境でも storyteller 診断は動作

## CLI

```bash
storyteller lint
storyteller lint --path manuscripts/chapter01.md
storyteller lint --path manuscripts/chapter01.md --fix
storyteller lint --json
storyteller lint --severity error      # error 以上のみ表示
storyteller lint install-hooks         # pre-commit hook を配置
storyteller lint install-hooks --strict
```

| Flag | 説明 |
|------|------|
| `--path <file/dir>` | 対象。省略時は `manuscripts/` 全体 |
| `--fix` | textlint の autofix を適用 |
| `--severity error\|warning\|info` | 最低 severity フィルタ |
| `--json` | JSON 出力 |

実装: `internal/cli/modules/lint/lint.go`

## DiagnosticSource 抽象化

複数診断ソースを統一インターフェースで扱う。

```go
// internal/lsp/diagnostics
type Source interface {
    Name() string
    Available(ctx context.Context) bool
    Generate(ctx context.Context, uri, content, projectRoot string) ([]Diagnostic, error)
}
```

| 実装 | 検証内容 |
|------|---------|
| `StorytellerDiagnosticSource` | キャラ・設定・伏線の参照整合性 |
| `TextlintDiagnosticSource` | 文法・表記ゆれ（外部 textlint プロセス連携） |

将来の拡張候補: `ValeSource`、プロジェクト固有のカスタムルール。

## textlint 連携

`internal/external/textlint/` が textlint プロセスを起動・キャッシュ・診断パースする。

| ファイル | 役割 |
|---------|------|
| `availability.go` | `npx textlint --version` で導入可否判定 |
| `config.go` | `.textlintrc(.json/.yml/.js)` のロード |
| `worker.go` | textlint プロセス管理（spawn / cancel / timeout） |
| `cache.go` | 同一入力のキャッシュ |
| `parser.go` | textlint JSON 出力のパース |
| `types.go` | 共通型 |

### 動作仕様

- **デバウンス**: 500ms（過剰実行防止）
- **キャンセル**: 新リクエストで前リクエストを自動キャンセル
- **タイムアウト**: 30s
- **非同期**: UI ブロッキングなし
- **未インストール時**: `Available()` が false → storyteller 診断のみで動作（exit 0、warning ログ）

## LSP 統合

`internal/lsp/diagnostics/generator.go` が複数の DiagnosticSource を統合し、`textDocument/publishDiagnostics` として配信する。textlint と storyteller 由来の診断は `source` フィールドで識別可能。

```json
{
  "method": "textDocument/publishDiagnostics",
  "params": {
    "uri": "file:///.../chapter01.md",
    "diagnostics": [
      { "severity": 2, "source": "textlint", "message": "「ですます」と「である」が混在" },
      { "severity": 1, "source": "storyteller", "message": "未定義のキャラ参照: 勇者" }
    ]
  }
}
```

詳細は [lsp.md](./lsp.md)。

## Git Hooks

```bash
storyteller lint install-hooks
storyteller lint install-hooks --strict   # warning も exit 非ゼロ
```

`.git/hooks/pre-commit` に lint 実行スクリプトを配置する。

## 設定ファイル

| ファイル | 用途 |
|---------|------|
| `.textlintrc.example` | textlint ルール設定サンプル |
| `prh-rules.yml.example` | prh（表記ゆれ）ルールサンプル |

リポジトリ直下に配置。プロジェクトで使う場合は拡張子から `.example` を外して利用する。

## MCP

storyteller は textlint MCP を独自実装していない。textlint v14.8.0+ のネイティブ MCP サーバ（`npx textlint --mcp`）を Claude Desktop に直接登録する。例は [mcp.md](./mcp.md) を参照。

## トラブルシューティング

| 症状 | 原因 / 対処 |
|------|------------|
| textlint 診断が出ない | `npx textlint --version` で導入確認、`.textlintrc` が存在するか確認 |
| 起動が遅い | textlint 依存パッケージのインストール確認、cache クリア |
| 同じ警告が繰り返し出る | デバウンス前のリクエストが流れている可能性。LSP 再起動を試す |
