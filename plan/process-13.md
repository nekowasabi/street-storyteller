# Process 13: element beat CLI テスト

## Overview
storyteller element beat コマンドのテスト。subplot ファイルへの beat 追加動作。既存サブプロットに新しいビートを追加し、前提条件の検証が正しく機能することを確認します。

## Affected Files
- 新規: tests/cli/modules/element/beat_test.ts
- 参考: tests/cli/modules/element/event_test.ts

## Implementation Notes
--subplot 必須、存在しない subplot でエラー。--title, --summary, --chapter, --structure-position 必須。--structure-position が valid (setup/rising/climax/falling/resolution) のみ。既存 subplot ファイルを読込→beats[] に append→書き戻すフロー。--precondition-beats で指定した beat IDs が同一 subplot 内に存在しなければエラー。同名 beat 重複エラー。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "rejects missing --subplot"
- [ ] "rejects nonexistent subplot file"
- [ ] "appends beat to existing subplot.beats[]"
- [ ] "rejects invalid --structure-position"
- [ ] "rejects --precondition-beats referring to nonexistent beat"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 13 (impl) を実装後、`deno test tests/cli/modules/element/beat_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 04
- Blocks: -
