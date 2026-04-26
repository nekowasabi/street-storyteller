# Process 101: 品質ゲート - テストカバレッジ（Go 70%+）

## Overview
Go 側のテストカバレッジを 70% 以上に保つゲートを CI に組み込む。Why: E2E 削除（Process 13）の代償として UT/golden の網羅性を担保する。

## Affected Files
- `scripts/go_coverage.sh` (既存): 閾値 70% に変更
- `.github/workflows/ci.yml`: coverage job が閾値未達で fail
- `docs/coverage-policy.md` (新規): 例外規則と免除パッケージ一覧

## Implementation Notes
- Why: E2E を削った分、UT で境界条件を厚くする責務が増す
- 計測: `go test ./... -coverprofile=coverage.out -covermode=atomic`
- 閾値:
  - 全体: 70%
  - internal/cli, internal/project, internal/meta: 80%（中核）
  - internal/lsp, internal/mcp: 60%（プロトコル層は外部依存多）
  - main package, generated code: 免除
- 免除リスト方針:
  - 免除する場合は理由を docs/coverage-policy.md に記録
- ツール: github.com/wadey/gocovmerge or 自前 awk 集計

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 現状カバレッジ計測 → ベースライン記録（64.2% / 4233 stmts、2026-04-26）
- [x] 閾値未達なら fail するゲート追加（scripts/go_coverage.sh を全体集計型に書き換え、THRESHOLD=70）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] 不足パッケージにテスト追加（element / generate / update / mcp / view / mcp/resources / mcp/prompts / cmd/storyteller/internal/testfixture）
- [x] CI で 70% gate 通過確認（最終 72.5% / +8.3pp、2026-04-26）

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] coverage badge を README に表示（後続 process-200 で対応）
- [ ] Codecov / Coveralls 連携検討（後続 process-200 で対応）

✅ **Phase Complete**

---

## Dependencies
- Requires: 12
- Blocks: 50
