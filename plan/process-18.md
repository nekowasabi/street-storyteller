# Process 18: validate オプショナル動作テスト

## Overview
subplot ゼロのプロジェクトで validate が完全スキップする後方互換性テスト。既存プロジェクト（サブプロット機能を使用していない）で新しい検証が実行されないことを確認します。

## Affected Files
- 新規: tests/cli/modules/meta/check_subplot_optional_test.ts

## Implementation Notes
src/subplots/ ディレクトリが存在しない → スキップ (エラーなし)。src/subplots/ が空ディレクトリ → スキップ。1つでも subplot 存在 → 通常検証実行。cinderella サンプル (現状 subplot ゼロ) で validate が通ることを確認。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "skips subplot validation when no subplots directory"
- [ ] "skips subplot validation when subplots directory is empty"
- [ ] "runs validation when at least one subplot exists"
- [ ] "cinderella sample passes validate without warnings"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 18 (impl) を実装後、`deno test tests/cli/modules/meta/check_subplot_optional_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 07
- Blocks: 100
