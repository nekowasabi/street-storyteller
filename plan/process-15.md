# Process 15: view subplot CLI テスト

## Overview
storyteller view subplot --list/--id/--format mermaid/--json のテスト。サブプロットの一覧表示、個別詳細表示、Mermaid グラフ出力、JSON 形式出力が正しく動作することを確認します。

## Affected Files
- 新規: tests/cli/modules/view/subplot_test.ts
- 参考: tests/cli/modules/view/foreshadowing_test.ts

## Implementation Notes
--list で全 subplot 一覧、空時の "No subplots found" メッセージ。--id で個別表示。--type フィルタ、--status フィルタ。--format mermaid で graph TD 出力、beats/intersections を含む。--json で JSON 構造出力。

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] "lists all subplots with --list"
- [ ] "shows empty message when no subplots"
- [ ] "displays specific subplot detail with --id"
- [ ] "outputs valid mermaid graph syntax with --format mermaid"
- [ ] "outputs valid JSON with --json"
- [ ] テストを実行して失敗確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] 対応する Process 15 (impl) を実装後、`deno test tests/cli/modules/view/subplot_test.ts` で全テスト成功

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] テストの命名・構造を改善
- [ ] テストヘルパー関数を抽出

✅ **Phase Complete**

---

## Dependencies
- Requires: 06
- Blocks: -
