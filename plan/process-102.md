# Process 102: 後方互換アサーション禁止

## Overview
旧 "subplot" 値・旧キー名を受理しないことを fuzz/プロパティテストで確認

## Affected Files
internal/project/entity/loader_test.go, internal/domain/plot_test.go

## Implementation Notes
- "subplot" type 値を含む YAML/TS fixture を作成し、validation error が返ることを assert
- sourceSubplotId 等の旧キー名を含む fixture でも同様
- エラーメッセージに「Did you mean 'sub'?」「Did you mean 'sourcePlotId'?」のヒントを含める（任意）

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] "subplot" type 値を含む fixture を作成
- [x] sourceSubplotId 等の旧キー名を含む fixture を作成
- [x] テストを実行して現在は受理されることを確認（失敗を期待）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] "subplot" 値の validation を実装（拒否）
- [x] 旧キー名の validation を実装（拒否）
- [x] エラーメッセージにヒントを追加（任意）
- [x] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] エラーハンドリングの品質改善
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 11
- Blocks: -
