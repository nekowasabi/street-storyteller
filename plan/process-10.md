# Process 10: Phase 5 CI 整理（Go メイン / Deno は authoring のみ）

## Overview
.github/workflows/ci.yml を Go メイン構成に再編する。Why: src/ retire と E2E 削除の結果を CI に反映し、ビルド時間を削減する。

## Affected Files
- `.github/workflows/ci.yml` (既存 L1-79)
- `deno.json` (既存 L1-61): test task の対象を authoring に限定
- `scripts/go_coverage.sh` (既存): カバレッジ閾値 70% に設定

## Implementation Notes
- Why: E2E 削除 (Process 13) 完了後に CI を再構成しないと不要 job が残る
- ジョブ構成案:
  - **lint**: go vet / go fmt -l (差分0確認) / deno fmt --check (samples のみ)
  - **test-go**: go test ./... -count=1 -race
  - **test-go-integration**: go test -tags=integration（既存維持）
  - **test-deno-authoring**: deno test samples/ tests/authoring/（縮小）
  - **meta-check-sample**: storyteller meta check samples/cinderella/manuscripts
  - **coverage**: scripts/go_coverage.sh（閾値ゲート）
- 削除対象 job:
  - tests/cli_*, tests/lsp_*, tests/mcp_*, tests/rag_* を対象とする旧 deno test 行
  - Process 13 で削除済み E2E への参照
- 並列化: Go と Deno を並走、coverage のみ test-go の後

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] CI dry-run（act ローカル or PR draft）で旧 job が残っていないこと確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] ci.yml 再編
- [x] deno.json test task 縮小
- [x] PR を上げて全 job green 確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] cache 設定（go mod / go build / deno cache）
- [x] matrix（OS x Go version）の必要性検討

✅ **Phase Complete**

---

## Dependencies
- Requires: 13
- Blocks: 11
