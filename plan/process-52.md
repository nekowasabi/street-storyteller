# Process 52: momotaro plots 整合

## Overview
samples/momotaro に plots/ ディレクトリがない場合、追加するか manifest 上 disable するか決定する。

## Affected Files
- `samples/momotaro/.storyteller.json`
- `samples/momotaro/src/plots/` (必要に応じて新規)

## Implementation Notes
momotaro は subplots を使わないなら manifest から外す。使うなら最低 1 ファイル追加する。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] meta check を実行して plots パス未定義エラーを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] manifest を整合化（disable or plots/ ディレクトリ追加）
- [x] meta check が成功することを確認
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] ファイル構造の整理
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 7
- Blocks: -
