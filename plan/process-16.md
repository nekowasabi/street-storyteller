# Process 16: validate 参照整合性テスト

## Overview
storyteller meta check の subplot 参照整合性検証テスト。ビートやインターセクションが存在しないエンティティを参照していないかを検証します。

## Affected Files
- 新規: tests/cli/modules/meta/check_subplot_refs_test.ts

## Implementation Notes
PlotBeat.timelineEventId が存在しない event を指す → エラー検出。PlotBeat.characters が未定義キャラを指す → エラー。PlotBeat.settings が未定義 setting を指す → エラー。PlotIntersection.targetSubplotId が存在しない subplot を指す → エラー。PlotIntersection.sourceBeatId が source subplot 内に存在しない → エラー。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "detects beat referencing nonexistent timelineEventId"
- [ ] "detects beat referencing nonexistent character"
- [ ] "detects intersection referencing nonexistent target subplot"
- [ ] "detects intersection referencing nonexistent source beat within source subplot"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 16 (impl) を実装後、`deno test tests/cli/modules/meta/check_subplot_refs_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 07
- Blocks: -
