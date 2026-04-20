# Process 11: Test JSON confidence/entityId 独立フィールド

## Overview
JSON 出力に `confidence: number` と `entityId?: string` が独立フィールドとして存在することを検証する TDD Red テスト。

## Affected Files
- @modify `tests/cli/lsp_validate_command_test.ts`
  - 新規 Deno.test: "validate --json emits confidence and entityId fields"

## Implementation Notes
- 既知のエンティティ（例: hero）をスタブで loadEntities に仕込む
- マニュスクリプトに "勇者は..." を含め Low confidence 参照を作成
- `args: {file, json: true}` で実行
- 期待値: JSON.parse(messages.info[0]) の diagnostics[0] に confidence: number / entityId: "hero"

## Red Phase
- [ ] 新規テスト追加 → Red 確認
✅ Phase Complete

## Green Phase
- [ ] Process 3, 4 実装後に Green 確認
✅ Phase Complete

## Refactor Phase
- [ ] テスト命名・期待値整形
✅ Phase Complete

## Dependencies
- Requires: 3, 4
- Blocks: 50
