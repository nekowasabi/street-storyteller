---
title: "storyteller LSP 実用化計画 (Go版サーバの修復)"
status: planning
created: "2026-04-28"
---

# Commander's Intent

## Purpose
Go移植中の storyteller LSP サーバが Neovim 上でハイライト・コードジャンプ・診断のすべてが機能しない根本原因 3 件（2秒強制終了 / 空 ServerOptions / capabilities と実装の乖離）を、TDD でひとつずつ潰し、Neovim での実用に耐える状態へ復帰させる。

## End State
- `storyteller lsp start --stdio` が EOF / `shutdown` 通知まで永続化する
- `textDocument/hover` `textDocument/definition` `publishDiagnostics` が Catalog/Lookup/Locator/Aggregator 経由で実エンティティを解決して応答する
- advertise している capabilities と RegisterStandardHandlers が一貫している（嘘の広告が無い）
- 既存テスト全 green、新規テストがリグレッションを防止する

## Key Tasks
- 致命バグ 3 種の最小修正（Process 01-04）
- semantic tokens の本実装（Process 05）と E2E ワイヤテスト（Process 06）
- 品質ゲート・ドキュメント・OODA 振り返り（Process 100/200/300）

## Constraints
- 親セッションでの Read/Grep/Glob 直接実行禁止（make-plan ルール）
- 既存 PLAN.md（completed）は触らない。本計画は PLAN-lsp-pragmatize.md として独立
- `internal/lsp/server/server_test.go` と `initialize_response.json` の golden fixture は Process 04 で同期更新する
- Catalog 構築の本実装が無い領域は Process 02 で graceful な fallback を必ず通す

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 01 | start.go の 2秒タイムアウト撤去 | ☐ planning | [→ plan-lsp-pragmatize/process-01.md](plan-lsp-pragmatize/process-01.md) |
| 02 | Provider Factory (NewServerOptions) 実装 | ☐ planning | [→ plan-lsp-pragmatize/process-02.md](plan-lsp-pragmatize/process-02.md) |
| 03 | start.go の ServerOptions wiring | ☐ planning | [→ plan-lsp-pragmatize/process-03.md](plan-lsp-pragmatize/process-03.md) |
| 04 | capabilities と semanticTokens の整合修正 | ☐ planning | [→ plan-lsp-pragmatize/process-04.md](plan-lsp-pragmatize/process-04.md) |
| 05 | semantic tokens プロバイダ実装 | ☐ planning | [→ plan-lsp-pragmatize/process-05.md](plan-lsp-pragmatize/process-05.md) |
| 06 | E2E ワイヤプロトコルテスト | ☐ planning | [→ plan-lsp-pragmatize/process-06.md](plan-lsp-pragmatize/process-06.md) |
| 100 | Lint / Fmt / Vet ゲート | ☐ planning | [→ plan-lsp-pragmatize/process-100.md](plan-lsp-pragmatize/process-100.md) |
| 200 | docs/lsp.md の Go 移植セクション更新 | ☐ planning | [→ plan-lsp-pragmatize/process-200.md](plan-lsp-pragmatize/process-200.md) |
| 300 | OODA 振り返り | ☐ planning | [→ plan-lsp-pragmatize/process-300.md](plan-lsp-pragmatize/process-300.md) |

**DAG**: `01→02→03→04→05→06→100→200→300`
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行、`|` = 独立した依存チェーン
**Overall**: ☐ 0/9 completed

---

# References

| @ref | @target | @test |
|------|---------|-------|
| internal/cli/modules/lsp/start.go:36-46 | 2秒タイムアウト + 空 ServerOptions | internal/cli/modules/lsp/start_test.go (新規) |
| internal/lsp/server/server.go:76-86 | RegisterStandardHandlers / capabilities 整合 | internal/lsp/server/server_test.go:62-100 |
| internal/lsp/server/capabilities.go:16-32 | SemanticTokensProvider 広告 | internal/lsp/server/testdata/initialize_response.json |
| internal/lsp/providers/hover.go:33,57-65 | EntityLookup / detect.Detect 呼び出し慣習 | internal/lsp/providers/hover_test.go |
| internal/lsp/providers/definition.go:12 | EntityLocator インターフェース | internal/lsp/providers/definition_test.go |
| internal/lsp/diagnostics/generator.go:41-75,116 | Aggregator / StorytellerSource | internal/lsp/diagnostics/generator_test.go |
| internal/detect/types.go:68 | EntityCatalog インターフェース | internal/detect/*_test.go |
| internal/service/lsp_validate.go:47-51 | 既存の Catalog: nil 慣習（fallback 参考） | internal/service/lsp_validate_test.go |

---

# Risks

| リスク | 対策 |
|--------|------|
| Catalog 構築失敗時、detect.Detect が短絡し全機能無効化 | Process 02 で `Catalog == nil` フォールバックを明記しテスト固定 |
| semanticTokens 広告の一時削除で Neovim 配色が出ない退行 | Process 04 で削除→Process 05 で再導入の順序を厳守、docs に明記 |
| golden fixture (initialize_response.json) の更新漏れで CI 失敗 | Process 04 のチェックリストで fixture 更新を必須化、PR 前に diff 確認 |
