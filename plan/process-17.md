# Process 17: validate 構造完全性テスト

## Overview
subplot の物語構造として必要な体裁 (setup/climax 存在、孤立 subplot 検出) のテスト。サブプロットが最小限の物語構造要件を満たしていることを確認します。

## Affected Files
- 新規: tests/cli/modules/meta/check_subplot_struct_test.ts

## Implementation Notes
subplot.beats に structurePosition="climax" が無い → エラー。subplot.beats に structurePosition="setup" が無い → エラー。subplot.type!="main" かつ intersections に source/target として一切現れない → 警告 (孤立 subplot)。structurePosition の順序逆転 (climax より後に setup) → 警告。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "detects subplot without climax beat"
- [ ] "detects subplot without setup beat"
- [ ] "warns subplot with no intersections (orphan)"
- [ ] "warns reversed structure position order"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 17 (impl) を実装後、`deno test tests/cli/modules/meta/check_subplot_struct_test.ts` で全テスト成功

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
