# Process 03: start.go の ServerOptions wiring

## Overview
Process 02 で作った `NewServerOptions` を `internal/cli/modules/lsp/start.go:32` の空 `ServerOptions{}` に差し替える。これにより hover / definition / publishDiagnostics が実エンティティで応答可能になる。

## Affected Files
- `internal/cli/modules/lsp/start.go` L31-32（`NewServer` 呼び出し直前で options を構築）
- `internal/cli/modules/lsp/start_test.go`（Process 01 で作成済の test に case 追加）

## Implementation Notes
- `rootURI` の取り方候補（順番に検討）:
  1. `cctx.Args` から `--root` フラグを追加で受け取る（明示的・推奨）
  2. CWD を `os.Getwd()` で取得して `file://` 化（フォールバック）
- LSP の `initialize` 受信前にプロセスを構築するため、initialize の `rootUri` を待つ設計は今回避ける（複雑化）。CWD ベース + フラグ上書きで開始
- `NewServerOptions` がエラーを返した場合は `Presenter.ShowError` で報告し exit 1
- 修正後の `Handle` 抜粋:
  ```go
  rootURI := resolveRootURI(cctx) // CWD or --root
  opts, err := factories.NewServerOptions(ctx, rootURI)
  if err != nil { ... return 1 }
  s := lspserver.NewServer(opts)
  s.RegisterStandardHandlers()
  ```

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] テストケースを作成（実装前に失敗確認）
  - 起動後に hover / definition リクエストを投げて nil ではないレスポンスが返ること（fixture プロジェクトを `testdata/` に用意）
  - 現状（空 options）ではすべて nil 応答 → Red
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] `start.go:Handle` で `NewServerOptions` を呼び出し ServerOptions を埋める
- [ ] `--root` フラグの引数解析を追加
- [ ] root 解決失敗時のエラーパスを実装
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] `resolveRootURI` ヘルパを別ファイルに抽出（可能なら）
- [ ] エラーメッセージをユーザフレンドリにする
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 02
- Blocks: 04
