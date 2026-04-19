# Process 19: manuscript_binding テスト

## Overview
manuscript_binding ツールに subplots entityType を追加した動作テスト。原稿ファイルの FrontMatter にサブプロット参照を追加・更新・削除できることを確認します。

## Affected Files
- 新規: tests/mcp/tools/definitions/manuscript_binding_subplot_test.ts

## Implementation Notes
action="add" entityType="subplots" ids=["love_story"] で chapter.md FrontMatter に subplots: [love_story] が追加されること。action="set" で完全置換。action="remove" で削除。validate=true 時、存在しない subplot ID でエラー。既存 entityType (characters 等) の動作に影響しないこと。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "adds subplot ID to manuscript FrontMatter"
- [ ] "sets subplot list with action=set"
- [ ] "removes subplot from list with action=remove"
- [ ] "rejects nonexistent subplot ID when validate=true"
- [ ] "preserves other entityType behavior (characters)"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 19 (impl) を実装後、`deno test tests/mcp/tools/definitions/manuscript_binding_subplot_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 08
- Blocks: -
