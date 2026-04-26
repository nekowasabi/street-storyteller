# Process 05: Phase 3b LSP Go 移植（server/providers/diagnostics）

## Overview
internal/lsp 部分実装の完成 + `storyteller lsp start --stdio` を Go 化する。Why: LSP 起動時間が最大の動機。Deno cold start 3-5s → Go <2s。

## Affected Files
- `internal/lsp/server/server.go` (既存): lifecycle / dispatcher / textsync 完成
- `internal/lsp/server/handlers.go` (既存/新規): didOpen, didChange, didClose, completion, codeAction, semanticTokens
- `internal/lsp/providers/{definition,hover}.go` (既存): 拡張
- `internal/lsp/providers/{diagnostics,code_action,semantic_tokens}.go` (新規)
- `internal/lsp/diagnostics/` (既存): DiagnosticSource 抽象 + storyteller source
- `internal/lsp/diagnostics/textlint_source.go` (新規): Process 08 で実装する adapter を取り込む
- `internal/cli/modules/lsp/start.go` (新規): stdio エントリ
- `internal/cli/modules/lsp/install.go` (新規): nvim / vscode 設定生成

## Implementation Notes
- 参照: src/lsp/{server, handlers, providers, integration}/
- Protocol JSON-RPC: internal/lsp/protocol/jsonrpc.go (既存)
- 既知教訓: `.serena/memories/lsp-mcp-protocol-error-method.md` 参照
- DiagnosticSource インタフェース:
  ```go
  type DiagnosticSource interface {
      Name() string
      Available(ctx context.Context) bool
      Generate(ctx context.Context, uri string, content []byte, projectRoot string) ([]Diagnostic, error)
  }
  ```
- debounce: time.AfterFunc + sync.Mutex で 500ms
- cancel: context.Context 伝播
- timeout: context.WithTimeout(30s)
- 既存教訓: `.serena/memories/inprocess-golden-test-strategy.md` を golden test に活用

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] hover / definition / diagnostics の golden test 拡充 → 未実装で失敗
- [x] start サブコマンドの起動時間ベンチ作成（< 2s 期待）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] handlers 実装（didOpen/didChange/didClose）
- [x] diagnostics provider 実装
- [x] codeAction / semanticTokens provider 実装
- [x] start / install サブコマンド実装
- [x] go test ./internal/lsp/... 全 green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] textsync の差分計算を rope or piece-table 化（性能向上）
- [x] providers 共通化リファクタ
- [x] semanticTokens のキャッシュ

✅ **Phase Complete**

---

## Dependencies
- Requires: 02, 03
- Blocks: 06 (MCP が LSP 機能を呼ぶため), 09
