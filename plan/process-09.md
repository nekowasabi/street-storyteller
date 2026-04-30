# Process 9: help/golden 反映

## Overview
ゴールデンファイル（help.txt, no_args.txt）を更新。"element subplot" → "element plot" 等。migrate コマンドも追加します。

## Affected Files
- cmd/storyteller/testdata/golden/help.txt (L9,25,27)
- cmd/storyteller/testdata/golden/no_args.txt (L9,25,27)

## Implementation Notes
-test.update-golden で再生成。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] -test.update-golden なしで golden test 失敗を期待
- [x] go test ./cmd/storyteller で失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] ゴールデン再生成（-test.update-golden フラグ使用）
- [x] go test ./cmd/storyteller で成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] git diff でゴールデンファイルの変更を検証
- [x] "element plot"・"migrate" が正しく表示されていることを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 5, 8
- Blocks: 12, 51
