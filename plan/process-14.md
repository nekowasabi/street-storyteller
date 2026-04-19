# Process 14: element intersection CLI テスト

## Overview
storyteller element intersection コマンドのテスト。複数サブプロット間の交差関係を作成する機能。交差点が正しく作成され、影響方向と影響レベルが適切に設定されることを確認します。

## Affected Files
- 新規: tests/cli/modules/element/intersection_test.ts

## Implementation Notes
--source-subplot, --source-beat, --target-subplot, --target-beat, --summary 必須。source/target subplot のファイル存在検証。target subplot 内に target beat が存在するか検証。--influence-direction default "forward"。source subplot ファイルの intersections[] にのみ追加されることを確認 (target 側は変更されない)。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "rejects nonexistent source-subplot"
- [ ] "rejects nonexistent target-beat in target-subplot"
- [ ] "appends intersection to source subplot only (not target)"
- [ ] "defaults influence-direction to forward"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 14 (impl) を実装後、`deno test tests/cli/modules/element/intersection_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 05
- Blocks: -
