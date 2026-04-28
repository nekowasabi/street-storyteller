# Process 04: capabilities と semanticTokens の整合修正

## Overview
`internal/lsp/server/capabilities.go:16-32` で `SemanticTokensProvider` を広告しているが、`server.go:76-86 RegisterStandardHandlers` には `textDocument/semanticTokens/full` ハンドラが未登録。Neovim クライアントが要求して空応答を受け、INVALID_SERVER_MESSAGE 等の不安定挙動の温床。Process 05 の本実装が入るまでの繋ぎとして、capabilities から `SemanticTokensProvider` を一時撤去し、嘘の広告を排除する。

## Affected Files
- `internal/lsp/server/capabilities.go` L16-32 （`SemanticTokensProvider` フィールド削除 or nil 化）
- `internal/lsp/server/server_test.go` L98-99 （`SemanticTokensProvider` 非 nil チェック削除/コメント化）
- `internal/lsp/server/testdata/initialize_response.json` （golden fixture から `semanticTokensProvider` キー削除）

## Implementation Notes
- `protocol.ServerCapabilities` 構造体の `SemanticTokensProvider` フィールドが `omitempty` の前提で nil 代入で OK（要確認）。omitempty が無ければビルド構造体側で省略。
- golden fixture 更新は手書き編集（diff レビューしやすいように）。
- 関連 docs（`docs/lsp.md` 等）に「semantic tokens は Process 05 で復活予定」とコメント追加（軽め）。

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] テストケースを作成（実装前に失敗確認）
  - 期待値: `InitializeResult.Capabilities.SemanticTokensProvider == nil`
  - 現状実装は非 nil → Red
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] `capabilities.go` から SemanticTokensProvider を nil/省略
- [ ] `server_test.go` の対応アサート修正
- [ ] `testdata/initialize_response.json` から該当キー削除
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] capabilities.go に「Process 05 で復活」コメント追加
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 03
- Blocks: 05
