---
title: "Subplot 機能実装"
status: planning
created: "2026-04-19"
---

# Commander's Intent

## Purpose
物語に並行サブプロットと合流点を型で表現可能にし、Timeline (時間軸) と分離した「展開構造」レイヤーを storyteller に追加する。Foreshadowing と同等のフル実装で CLI / MCP / HTML 可視化までカバー。

## End State
`storyteller element subplot/beat/intersection` で型インスタンス生成、`storyteller view subplot --list/--id/--format mermaid` で可視化、Claude Desktop から MCP ツール経由で操作、`storyteller meta check` で参照整合性 + 構造完全性を検証可能。既存プロジェクト (cinderella 等) は subplot ゼロでも完全動作。

## Key Tasks
- 新エンティティ Subplot/PlotBeat/PlotIntersection を `src/type/v2/subplot.ts` に定義し、Foreshadowing パターン踏襲の plugin/validator/CLI/MCP/HTML を実装
- manuscript_binding の entityType に `subplots` を追加し、原稿 FrontMatter から subplot を双方向参照
- validate に「subplot 配列が空ならスキップ」する完全オプショナル動作を実装

## Constraints
- 親セッションでは Read/Glob/Grep/Bash 直接実行禁止 (調査は executor 委譲)
- LSP 統合は除外 (subplot 名はメタ情報で文中検出不要)
- 時系列矛盾検出は除外 (Timeline 側責務との分離)
- 既存 cinderella サンプルの動作を破壊しない (後方互換性必須)

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 1 | Subplot 型定義 | ☐ planning | [→ plan/process-01.md](plan/process-01.md) |
| 2 | Subplot Plugin (plugin + validator) | ☐ planning | [→ plan/process-02.md](plan/process-02.md) |
| 3 | CLI element subplot | ☐ planning | [→ plan/process-03.md](plan/process-03.md) |
| 4 | CLI element beat | ☐ planning | [→ plan/process-04.md](plan/process-04.md) |
| 5 | CLI element intersection | ☐ planning | [→ plan/process-05.md](plan/process-05.md) |
| 6 | CLI view subplot | ☐ planning | [→ plan/process-06.md](plan/process-06.md) |
| 7 | validate 拡張 (subplot 検証統合) | ☐ planning | [→ plan/process-07.md](plan/process-07.md) |
| 8 | manuscript_binding 拡張 | ☐ planning | [→ plan/process-08.md](plan/process-08.md) |
| 9 | パーサー & ファイル生成器 | ☐ planning | [→ plan/process-09.md](plan/process-09.md) |
| 10 | 型定義テスト | ☐ planning | [→ plan/process-10.md](plan/process-10.md) |
| 11 | Plugin テスト | ☐ planning | [→ plan/process-11.md](plan/process-11.md) |
| 12 | element subplot CLI テスト | ☐ planning | [→ plan/process-12.md](plan/process-12.md) |
| 13 | element beat CLI テスト | ☐ planning | [→ plan/process-13.md](plan/process-13.md) |
| 14 | element intersection CLI テスト | ☐ planning | [→ plan/process-14.md](plan/process-14.md) |
| 15 | view subplot CLI テスト | ☐ planning | [→ plan/process-15.md](plan/process-15.md) |
| 16 | validate 参照整合性テスト | ☐ planning | [→ plan/process-16.md](plan/process-16.md) |
| 17 | validate 構造完全性テスト | ☐ planning | [→ plan/process-17.md](plan/process-17.md) |
| 18 | validate オプショナル動作テスト | ☐ planning | [→ plan/process-18.md](plan/process-18.md) |
| 19 | manuscript_binding テスト | ☐ planning | [→ plan/process-19.md](plan/process-19.md) |
| 50 | MCP tool subplot_create | ☐ planning | [→ plan/process-50.md](plan/process-50.md) |
| 51 | MCP tool subplot_view | ☐ planning | [→ plan/process-51.md](plan/process-51.md) |
| 52 | MCP tool beat_create | ☐ planning | [→ plan/process-52.md](plan/process-52.md) |
| 53 | MCP tool intersection_create | ☐ planning | [→ plan/process-53.md](plan/process-53.md) |
| 54 | MCP resource storyteller://subplots | ☐ planning | [→ plan/process-54.md](plan/process-54.md) |
| 55 | MCP prompts (3種) | ☐ planning | [→ plan/process-55.md](plan/process-55.md) |
| 56 | HTML graph builder | ☐ planning | [→ plan/process-56.md](plan/process-56.md) |
| 57 | HTML view browser 統合 | ☐ planning | [→ plan/process-57.md](plan/process-57.md) |
| 58 | RAG テンプレート | ☐ planning | [→ plan/process-58.md](plan/process-58.md) |
| 59 | MCP 統合テスト | ☐ planning | [→ plan/process-59.md](plan/process-59.md) |
| 100 | 後方互換性検証 (cinderella) | ☐ planning | [→ plan/process-100.md](plan/process-100.md) |
| 101 | パフォーマンステスト | ☐ planning | [→ plan/process-101.md](plan/process-101.md) |
| 200 | CLAUDE.md 更新 | ☐ planning | [→ plan/process-200.md](plan/process-200.md) |
| 201 | docs/subplot.md 新規 | ☐ planning | [→ plan/process-201.md](plan/process-201.md) |
| 202 | cinderella サンプル subplot 追加 | ☐ planning | [→ plan/process-202.md](plan/process-202.md) |
| 300 | OODA 振り返りと Phase 2+ 計画 | ☐ planning | [→ plan/process-300.md](plan/process-300.md) |

**DAG**: `01→02→{03,06,07,08,09}` | `03→{04,05}` | `{01→10,02→11,03→12,04→13,05→14,06→15,07→{16,17,18},08→19}` | `{03,04,05}→{50,52,53}` | `06→51` | `{50,51,52,53}→{54,55}` | `{09,54,55}→{56,57,58}` | `{56,57,58,10-19}→59` | `59→{100,101}` | `100→{200,201,202}` | `{200,201,202,101}→300`
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行、`|` = 独立した依存チェーン
**Overall**: ☐ 0/35 completed

---

# References

| @ref | @target | @test |
|------|---------|-------|
| @new | src/type/v2/subplot.ts | tests/type/v2/subplot_test.ts |
| @new | src/plugins/core/subplot/plugin.ts | tests/plugins/core/subplot/plugin_test.ts |
| @new | src/plugins/core/subplot/validator.ts | tests/plugins/core/subplot/validator_test.ts |
| @new | src/cli/modules/element/subplot.ts | tests/cli/modules/element/subplot_test.ts |
| @new | src/cli/modules/element/beat.ts | tests/cli/modules/element/beat_test.ts |
| @new | src/cli/modules/element/intersection.ts | tests/cli/modules/element/intersection_test.ts |
| @new | src/cli/modules/view/subplot.ts | tests/cli/modules/view/subplot_test.ts |
| @modify src/cli/modules/element/index.ts:446 | descriptor 追加 | - |
| @modify src/cli/modules/meta/check.ts | subplot 検証統合 + skip 条件 | tests/cli/modules/meta/check_subplot_test.ts |
| @modify src/mcp/tools/definitions/manuscript_binding.ts:29-36 | "subplots" 追加 | tests/mcp/tools/definitions/manuscript_binding_subplot_test.ts |
| @new | src/mcp/tools/definitions/subplot_create.ts | tests/mcp/tools/definitions/subplot_create_test.ts |
| @new | src/mcp/tools/definitions/subplot_view.ts | tests/mcp/tools/definitions/subplot_view_test.ts |
| @new | src/application/view/graph/subplot_graph_builder.ts | tests/application/view/graph/subplot_graph_builder_test.ts |
| @new | src/rag/templates/subplot.ts | tests/rag/templates/subplot_test.ts |
| @new | samples/cinderella/src/subplots/*.ts | - |
| @modify CLAUDE.md | subplot セクション追加 | - |
| @new | docs/subplot.md | - |

---

# Risks

| リスク | 対策 |
|--------|------|
| 既存 cinderella サンプルが subplot 検証で警告を出す | Process 18 で「subplots 配列空ならスキップ」を実装し Process 100 で回帰テスト |
| Foreshadowing.type="mystery" との概念的重複でユーザー混乱 | Process 201 で docs/subplot.md に明確な使い分けガイドを記載 (mystery=点、subplot=線) |
| preconditionBeatIds の循環参照を検出漏れ | Process 02 (validator) で循環検出ロジック必須、Process 11 で循環テストケース追加 |
