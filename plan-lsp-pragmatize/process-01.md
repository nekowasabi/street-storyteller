# Process 01: start.go の 2秒タイムアウト撤去

## Overview
`internal/cli/modules/lsp/start.go` の `Handle` 内で `select { ... case <-time.After(2 * time.Second): cancel(); return 0 }` により LSP プロセスが起動 2 秒で強制終了されている。これを撤去し、`s.Run` が EOF / shutdown / ctx キャンセルで自然終了するまで永続化させる。最小修正で「サーバが死なない」状態を確保する。

## Affected Files
- `internal/cli/modules/lsp/start.go` L31-46 (`Handle` 内の select ブロック)
- `internal/cli/modules/lsp/start_test.go` (新規作成)

## Implementation Notes
- 修正後の流れ: `s.Run(ctx, stdin, stdout)` をゴルーチンで回し、`<-done` または `<-ctx.Done()` を select する。`time.After` は撤去。
- `cctx.Ctx` は CLI 上位から流れる context。SIGINT/SIGTERM のハンドリングは `cli.DefaultDeps()` 側で構成されている前提（要確認）。
- `Run` の戻り値（nil = 正常 EOF / err = プロトコル違反）をそのまま終了コードに反映。nil → 0、err → 1。
- 並列ゴルーチンは継続。`done <- s.Run(...)` のチャネル受信を主軸に。

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] テストケースを作成（実装前に失敗確認）
  - `io.Pipe` で stdin/stdout を結線し、initialize→initialized→didOpen→shutdown→exit のシーケンスを送って 2 秒以上経過しても `Handle` が動き続け、`exit` 通知でのみ戻ること
  - 2 秒未満で意図せず戻る現状実装ではこのテストが失敗する
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] `select` の `case <-time.After(2 * time.Second)` 分岐を削除
- [ ] `done` チャネル受信のみで戻り値を決定
- [ ] `time` パッケージ import が他で不要なら削除（goimports）
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] `Handle` のドックコメントに「EOF / shutdown / ctx キャンセルまで永続」と明記
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: -
- Blocks: 02
