# Process 12: CLI element/view ゴールデン更新

## Overview
storyteller element plot, storyteller view --kind plots 等のゴールデン出力を再生成。

## Affected Files
- `cmd/storyteller/testdata/golden/*.txt`

## Implementation Notes
go test ./cmd/storyteller -test.update-golden で更新、git diff で破壊的差分を全件レビュー

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 既存ゴールデンファイルと新規出力との差分検出
- [x] 差分が期待通り（subplot → plot, subplotId → plotId）であることを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] go test ./cmd/storyteller -test.update-golden で再生成
- [x] git diff で破壊的差分がないことを全件レビュー
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 不要なヘルプ文言の整備（参考: Process 50）
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 5, 9
- Blocks: -
