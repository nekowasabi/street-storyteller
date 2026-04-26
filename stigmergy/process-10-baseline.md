# Process 10 Baseline (2026-04-26)

## Wave-A3 並列実行記録

5 disjoint scope で並列 worktrees を確立し、共通 pre-1 commit に依存する形で Golden test 群を導入完了。

| WT | スコープ | コミット | Status |
|----|---------|----------|--------|
| pre-1 | cmd/storyteller/internal/testfixture/cinderella.go | 922927a | ✅ |
| wt-1a | cmd/storyteller/golden_meta_check_test.go + golden | b004d8b → (Green に至るまで) | ✅ |
| wt-1b | cmd/storyteller/golden_view_character_test.go + golden | 2ec32b6 + 8564bd4 | ✅ |
| wt-1c | cmd/storyteller/golden_version_canonical_test.go + golden | c809b99 | ✅ |
| wt-2a | internal/lsp/server/golden_wire_test.go (既存 testdata 流用) | cb31fd4 | ✅ |
| wt-2b | internal/mcp/server/golden_wire_test.go + 3 fixtures | a6444b4 + b258218 | ✅ |

## 残課題（非ブロッキング）

- **Refactor Phase**: process-10.md の Refactor チェックリスト未消化（fixture 更新手順明文化、差分表示改善、共通 helper 抽出）
- **canonicalize helper の重複**: wt-1c, wt-2a, wt-2b で `canonicalizeJSON` 同等関数を各々定義。`internal/testkit/golden` パッケージへの集約余地あり
- **assertOrUpdateGolden ヘルパーの統一**: wt-1a/1b は `assertGolden` (golden_test.go), wt-2b は `assertOrUpdateGolden` (golden_wire_test.go)。命名規約とフラグ名 (`-update` vs `-update-canonical`) も整合させる余地あり

## 教訓

- Wave-A3 + 共通 pre-1 commit パターンは disjoint scope さえ守れれば 5並列で `--no-ff` merge 可能
- subagent は go コマンド sandbox deny のため、Red phase コード生成 → 親で go test 確認 → 必要なら subagent に修正委譲、のループが効率的
- Golden test の真価は「現状の挙動を凍結 → 意図的変更を可視化」にあり、wt-1b の exit 1 pin はこの典型例

## 参照

- plan/process-10.md
- docs/development/golden-fixture-update.md
- .serena/memories/wave-a3-pattern.md
- .serena/memories/inprocess-golden-test-strategy.md
- .serena/memories/subagent-sandbox-go-deny.md

---

## Cycle 2 (Refactor Phase) 完了記録

- 実施日: 2026-04-26
- 範囲: docs ランブック追記 + 4 golden アサーションの diff フォーマット統一
- 編集ファイル:
  - docs/development/golden-fixture-update.md (LSP 手動更新節 2.5 追加)
  - cmd/storyteller/golden_test.go (assertGolden を Errorf→Fatalf 統一)
  - cmd/storyteller/golden_version_canonical_test.go (want/got 順序統一)
  - internal/mcp/server/golden_wire_test.go (--- end --- マーカー追加)
  - internal/lsp/server/golden_wire_test.go (initialize/hover フォーマット統一)
- 検証: go test ./... 全 31 パッケージ ok / go vet ./... 警告 0
- スコープ外確認: RAG document fixture（Go 側未移行のため Process 10 外、TS 側継続運用）
