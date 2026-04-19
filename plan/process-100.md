# Process 100: 後方互換性検証 (cinderella)

**Quality Assurance** | N=100

## Overview

subplot 機能導入後、samples/cinderella を含む既存プロジェクトが破壊されていないことを回帰テストで確認する。

## Affected

- 新規: `tests/regression/cinderella_subplot_compat_test.ts`
- 検証対象: `samples/cinderella/` 配下全ファイル
- 対象ツール: storyteller CLI (meta, view, lsp), MCP (manuscript_binding)

## Implementation Notes

### Regression Test Coverage

- cinderella で `storyteller meta check` 実行 → エラー/警告ゼロ確認
- cinderella で `storyteller view character/setting/foreshadowing/timeline --list` が全て成功
- cinderella で `storyteller view subplot --list` が "No subplots found" を返す (エラーではなく info)
- MCP サーバー起動して manuscript_binding 操作で subplots を追加→削除→ファイル状態が冪等
- 7つのサンプルプロジェクト (cinderella, momotaro 等) 全てで validate 成功

## TDD: Red Phase

```typescript
// tests/regression/cinderella_subplot_compat_test.ts

Deno.test("cinderella validate passes with no subplot warnings", async () => {
  // cinderella プロジェクトで meta check 実行
  // expect: エラー/警告 = 0
});

Deno.test("cinderella view character --list returns all characters", async () => {
  // expect: hero, heroine, prince, etc. が全て存在
});

Deno.test("cinderella view setting --list returns all settings", async () => {
  // expect: royal_capital, servant_quarters, forest, etc. が全て存在
});

Deno.test("cinderella view foreshadowing --list returns all foreshadowings", async () => {
  // expect: glass_slipper, pumpkin_carriage, etc. が全て存在
});

Deno.test("cinderella view timeline --list returns all timelines", async () => {
  // expect: main_story, character_arcs 等が全て存在
});

Deno.test("cinderella view subplot --list returns 'No subplots found' info", async () => {
  // expect: "No subplots found" メッセージ (エラーではなく通知)
  // exit code = 0
});

Deno.test("manuscript_binding round trip: add/remove subplots preserves file integrity", async () => {
  // cinderella manuscript に subplots フィールドを追加
  // -> 削除
  // expect: 元のファイル内容と一致
});

Deno.test("all 7 sample projects validate without errors", async () => {
  // samples/cinderella, momotaro, ... 各プロジェクト
  // expect: 全て validate 成功、参照整合性エラー = 0
});
```

## TDD: Green Phase

### Implementation Checklist

- [ ] `tests/regression/cinderella_subplot_compat_test.ts` 実装
- [ ] Cinderella プロジェクト整合性確認コマンド作成
- [ ] 7 sample projects の一括検証スクリプト
- [ ] manuscript_binding 冪等性テスト実装
- [ ] 全テスト実行 → PASS

### Verification

```bash
deno test tests/regression/cinderella_subplot_compat_test.ts
# Expected: all tests pass
```

## TDD: Refactor Phase

- テストのヘルパー関数化 (プロジェクト検証の共通ロジック)
- エラーメッセージの一貫性確認
- テスト実行時間最適化 (並列化)

## Requires

- Process 18: Subplot フレームワーク基盤実装完了
- Process 59: Subplot validate/view CLI コマンド実装完了

## Blocks

- Process 200: CLAUDE.md 更新
- Process 201: docs/subplot.md 新規
- Process 202: cinderella サンプル subplot 追加
- Process 300: OODA 振り返り
