# Process 06: E2E ワイヤプロトコルテスト

## Overview
ここまでの修正が「実際の Neovim クライアント風シーケンス」で破綻しないことを golden_wire_test に統合する。initialize → initialized → didOpen → hover → definition → publishDiagnostics → semanticTokens/full → shutdown → exit の一連を検証する。

## Affected Files
- `internal/lsp/server/golden_wire_test.go` （追記。既存ファイルがあれば追記、無ければ新規）
- `internal/lsp/server/testdata/wire/` 配下に request/response の固定 JSON を追加

## Implementation Notes
- `io.Pipe` で stdin/stdout を結線し、`server.Run` をゴルーチンで起動
- 各リクエストの Content-Length 付きフレームを送り、応答を順番にデコード
- 期待値は `testdata/wire/expected_*.json` で golden 比較
- 注意: 2秒タイムアウトが撤去されている前提（Process 01）。テスト側は `context.WithTimeout(..., 5*time.Second)` で fail-safe を仕込む
- `samples/cinderella/manuscripts/chapter01.md` の縮小版を fixture として配置

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] テストケースを作成（実装前に失敗確認）
  - シーケンス全体を流して `publishDiagnostics` が空でないこと、`semanticTokens/full` が data 配列を返すこと、最後に `exit` でクリーンに終了すること
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] testdata/wire/ の fixture 整備
- [ ] golden_wire_test の各ステップ実装
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] フレーム送受信を helper に抽出
- [ ] 失敗時の diff 表示を見やすくする
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 05
- Blocks: 100
