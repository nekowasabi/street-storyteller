# Process 08: Phase 3e textlint adapter Go 移植

## Overview
src/lsp/integration/textlint/ (config / diagnostic_source / parser / worker) を Go に移植。Why: LSP 診断統合の最後のピース。

## Affected Files
- `internal/external/textlint/runner.go` (新規): os/exec で textlint 起動
- `internal/external/textlint/parser.go` (新規): textlint JSON 出力を Diagnostic に変換
- `internal/external/textlint/config.go` (新規): .textlintrc 検出・ロード
- `internal/external/textlint/availability.go` (新規): textlint バイナリ存在チェック
- `internal/lsp/diagnostics/textlint_source.go` (Process 05 と協調): DiagnosticSource 実装
- `internal/cli/modules/lint/lint.go` (新規): `storyteller lint` ワンショット
- `internal/cli/modules/lint/install_hooks.go` (新規): pre-commit hook 設置

## Implementation Notes
- 参照: src/lsp/integration/textlint/, src/cli/modules/lint/, docs/lint.md
- 外部依存: textlint v14.8.0+ （MCP は textlint 公式の `--mcp` を使うため Go 側は不要）
- グレースフルデグラデーション: textlint 不在時は availability=false → diagnostic source skip
- debounce/cancel/timeout は Process 05 の DiagnosticSource インタフェース準拠
- exec.CommandContext で context cancel を伝播

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] availability テスト（PATH に textlint があるかモック）→ 失敗
- [x] parser テスト（JSON fixture）→ 失敗

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] runner / parser / config / availability 実装
- [x] DiagnosticSource 実装
- [x] lint / install_hooks サブコマンド実装
- [x] go test ./internal/external/textlint/... 全 green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 30s timeout の設定可能化
- [x] cache: 同一内容に対する重複起動を抑止

✅ **Phase Complete**

---

## Dependencies
- Requires: 02, 03, 05
- Blocks: 09
