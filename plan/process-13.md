# Process 13: E2E テスト棚卸し・削除（YAGNI 原則）

## Overview
時間のかかる E2E テストを全削除し、ミニマルなテストセットから再出発する。Why: Go 移植中のフィードバックループを最短化し、authoring 表現の変化に追従しやすくするため。E2E は性能・配布など必要が発生した場合のみ Process 100 等で都度追加する。

## Affected Files
- `tests/` 配下 TS E2E テスト群（cli_*, lsp_*, mcp_*, rag_* の長時間ケース）
- `cmd/storyteller/golden_test.go`: golden test は維持（高速・回帰検出力高）
- `internal/**/*_test.go`: ユニットテストは維持
- `.github/workflows/ci.yml`: E2E job 削除（あれば）
- `deno.json`: 削除済みテストへの参照を除去

## Implementation Notes
- 残すテストの基準:
  - 実行時間 < 1s/case のユニットテスト
  - golden test (cmd/storyteller/golden_test.go 等)
  - 境界・契約テスト（parser, registry, presenter 等）
- 削除対象の特定方法:
  - `deno test --report=junit` で実行時間を計測 → 上位（>5s/case）を候補化
  - Go 側も `go test -v ./... | grep -E "[0-9]+\.[0-9]+s"` で抽出
- 削除前に `git mv tests/legacy/` でバックアップ → 1 リリース後に削除（履歴保全）
- 削除後の補完戦略:
  - 「E2E が無くて検出できなかったバグ」が発生したら、その回帰テスト 1 件を都度追加
  - 「golden で十分」なケースは golden へ移行

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] テスト実行時間ベースラインを計測（before）
- [x] 削除対象リスト（>5s/case）を docs/test-cleanup-list.md に記録

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] 削除対象を git rm で削除
- [x] CI を実行 → 残存テストがすべて green 確認
- [x] テスト実行時間 after を計測 → before と比較

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] CONTRIBUTING.md または CLAUDE.md に「E2E 追加ポリシー（YAGNI）」を明文化
- [x] テスト pyramid 図を docs に追加
- [x] 削除した E2E が検出していたケースで重要なものは golden に移植

✅ **Phase Complete**

---

## Dependencies
- Requires: 09
- Blocks: 10
