# Process 100: Lint / Fmt / Vet ゲート

## Overview
Process 01-06 の修正に対し、リポジトリ標準の品質ゲート（go fmt / go vet / golangci-lint / deno fmt 影響範囲）を通過させる。CI で fail させないための最終整備。

## Affected Files
- 直接編集なし（既存コードへの自動修正のみ）
- 必要に応じて `.golangci.yml` の例外を追加

## Implementation Notes
- `go fmt ./...` と `goimports -w` を全 Go ファイルに適用
- `go vet ./...` をエラーなしで通過
- `golangci-lint run` をエラーなしで通過（既存 baseline からの差分のみ評価）
- `deno fmt --check` / `deno lint` は `samples/` `src/` 側のみ対象（このスコープでは触らない想定）
- `deno task test` も併走で確認（TypeScript 側にリグレッションが無いこと）

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] 現状で `golangci-lint run` を実行して new findings の一覧化
- [ ] 必要なら新規 finding を一覧化したコミットメッセージ草案を準備

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] `go fmt` / `goimports` を適用
- [ ] `go vet` のエラー潰し
- [ ] `golangci-lint run` の new findings 修正
- [ ] `go test ./...` でリグレッションが無いことを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] 変更が大きい場合、品質改善コミットを実装コミットと分離
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 06
- Blocks: 200
