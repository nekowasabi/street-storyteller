# Process 50: エラーメッセージ精査

## Overview
"unknown subplot type" などの残存メッセージを "plot" に統一する。

## Affected Files
- `internal/project/entity/loader.go` ほか

## Implementation Notes
grep -RIn "subplot" で残存メッセージを抽出、ユーザー視認文言を全て plot に統一する。

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] "subplot" 文字列を含むエラーメッセージのテストで残存検出
- [x] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] 全エラーメッセージを "plot" に更新
- [x] grep -RIn "subplot" で用語が消えたことを確認
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] メッセージの表現を改善
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 4
- Blocks: -
