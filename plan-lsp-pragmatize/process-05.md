# Process 05: semantic tokens プロバイダ実装

## Overview
Process 04 で広告から外した `SemanticTokensProvider` を本実装し、Neovim 上で character / setting / foreshadowing をハイライトできるようにする。providers/semantic_tokens.go を新規追加し、server.go にハンドラ登録、capabilities にフィールドを再追加する。

## Affected Files
- `internal/lsp/providers/semantic_tokens.go` （新規）
- `internal/lsp/providers/semantic_tokens_test.go` （新規）
- `internal/lsp/server/server.go` L76-86 （`textDocument/semanticTokens/full` ハンドラ登録）
- `internal/lsp/server/server.go` （`handleSemanticTokens` メソッド追加）
- `internal/lsp/server/capabilities.go` L16-32 （`SemanticTokensProvider` 復活: tokenTypes / tokenModifiers / full=true）
- `internal/lsp/server/testdata/initialize_response.json` （Process 04 で削った key を復活）

## Implementation Notes
- token types: `["character", "setting", "foreshadowing"]`
- token modifiers: `["highConfidence", "mediumConfidence", "lowConfidence", "planted", "resolved"]`
- positioned_detector（既存の `internal/lsp/detection/positioned_detector.go`）を再利用してエンティティ位置を取得
- LSP 仕様に従い `data` は連続した int 配列（[deltaLine, deltaStart, length, tokenType, tokenModifier] × N）
- Provider 関数案: `func SemanticTokens(ctx context.Context, doc DocumentSnapshot, catalog detect.EntityCatalog) (*protocol.SemanticTokens, error)`
- ハンドラは `params.TextDocument.URI` から content を取り、上記関数を呼んで応答

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] テストケースを作成（実装前に失敗確認）
  - 単一行に `cinderella` キャラ参照を含む markdown を入力 → tokens.data の length=5 で character タイプが含まれる
  - 信頼度に応じたモディファイアが正しく付く
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] `providers/semantic_tokens.go` で `SemanticTokens` 関数実装
- [ ] `server.go` に `handleSemanticTokens` 追加
- [ ] `RegisterStandardHandlers` に `Register("textDocument/semanticTokens/full", s.handleSemanticTokens)` 追加
- [ ] `capabilities.go` で `SemanticTokensProvider` 復活
- [ ] `testdata/initialize_response.json` を更新
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] data 配列構築の純粋関数を切り出し
- [ ] 重複ロジックを detection パッケージに寄せる
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 04
- Blocks: 06
