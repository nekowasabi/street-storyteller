# Process 06: Phase 3c MCP Go 移植（tools/resources/prompts）

## Overview
internal/mcp 部分実装の完成 + `storyteller mcp start --stdio`。Why: Claude Desktop / Code 統合のレスポンスタイム改善。

## Affected Files
- `internal/mcp/server/server.go` (既存): initialization / dispatcher
- `internal/mcp/tools/` (既存): meta_check, meta_generate, element_create, lsp_validate, lsp_find_references, view_browser, timeline_*, event_*, foreshadowing_*, manuscript_binding, subplot_*, beat_create, intersection_create
- `internal/mcp/resources/` (新規): project, characters, character/<id>, settings, setting/<id>, timelines, timeline/<id>, foreshadowings, foreshadowing/<id>, subplots, subplot/<id>
- `internal/mcp/prompts/` (新規): character_brainstorm, plot_suggestion, scene_improvement, project_setup_wizard, chapter_review, consistency_fix, timeline_brainstorm, event_detail_suggest, causality_analysis, timeline_consistency_check
- `internal/cli/modules/mcp/{init,start}.go` (新規)

## Implementation Notes
- 参照: src/mcp/{server, tools, resources, prompts}/
- Initialize レスポンスに capabilities (tools/resources/prompts) を必ず含める
- resources の `?expand=details` クエリ対応（character/setting）
- LSP 機能呼び出し: internal/lsp/providers を直接 import（プロセス内呼び出し）
- 既知教訓: `.serena/memories/lsp-mcp-protocol-error-method.md` のメソッド未実装エラー対策

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 各 tool の dispatcher テスト → 未実装で失敗
- [x] resource URI parse テスト → 失敗

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] tools 残実装（meta_generate, element_create, lsp_find_references, timeline/foreshadowing/subplot 系）
- [x] resources 全実装
- [x] prompts 全実装
- [x] mcp init / mcp start サブコマンド
- [x] go test ./internal/mcp/... 全 green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] tools の引数 schema 自動生成（reflection）
- [x] resources のキャッシュ層（project load を 1 回に）

✅ **Phase Complete**

---

## Dependencies
- Requires: 02, 03, 05
- Blocks: 09
