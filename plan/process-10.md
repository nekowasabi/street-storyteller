# Process 10: domain plot テスト整備

## Overview
リネーム後の Plot 値オブジェクトに対する単体テスト追加。"sub" enum 動作と、後方非互換性（旧 "subplot" 値が validation error）を確認する。

## Affected Files
- `internal/domain/plot_test.go` (Process 2 で生成、ここで拡張)

## Implementation Notes
テーブルドリブンテストで type 全 4 値 (main/sub/parallel/background) を網羅。旧値 "subplot" が拒否されることを検証する。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 旧値 "subplot" 受理テストケースを作成
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] domain 層で旧値 "subplot" を拒否するロジック実装
- [x] テーブルドリブンテストで 4 値全て (main/sub/parallel/background) を実装
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] テストメッセージの明瞭化
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 2
- Blocks: -
