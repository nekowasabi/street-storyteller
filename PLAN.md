---
title: "Go 全面移植（処理エンジン層）+ TypeScript authoring surface 維持"
status: completed
created: "2026-04-26"
completed: "2026-04-27"
---

# Commander's Intent

## Purpose
LSP 起動時間（現行 3-5s → 目標 <2s）と CLI レイテンシ（Deno 100-300ms → Go 5-20ms）を改善し、単一バイナリで配布可能にする。同時に TypeScript authoring surface（src/type/, samples/*/src/）は不変条件として維持し、SaC（StoryWriting as Code）の中核価値を保つ。

## End State
`storyteller` 単一バイナリ（<50MB）で全機能（generate/meta/lint/lsp/mcp/rag/view）を提供。Deno は authoring 型検証のみ。E2E テストはミニマルから開始し必要発生時に追加。

## Key Tasks
- 二層構造憲章化 + tsparse 実 samples/*.ts 対応化
- CLI/LSP/MCP/RAG/lint adapter を Go へ並列移植 → src/ retire
- E2E テスト棚卸し・削除 → CI を Go メインに整理 → 単一バイナリ配布

## Constraints
- README.md L318 "Story elements can be expressed in TypeScript types" は不変
- src/type/, src/characters/, src/settings/, src/timelines/, src/foreshadowings/, samples/ は保持
- テスト戦略: UT 中心。E2E は YAGNI（必要発生時に都度追加）
- 各 Phase は TDD（Red→Green→Refactor）で進行

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 01 | Phase 0 憲章化（Go/TS 二層構造 + E2E 最小主義） | ☑ completed | [→ plan/process-01.md](plan/process-01.md) |
| 02 | Phase 1 tsparse 拡張（import / 型注釈 スキップ） | ☑ completed | [→ plan/process-02.md](plan/process-02.md) |
| 03 | Phase 2 未移植モジュール棚卸し | ☑ completed | [→ plan/process-03.md](plan/process-03.md) |
| 04 | Phase 3a CLI Go 移植（generate/element/update/view 等） | ☑ completed | [→ plan/process-04.md](plan/process-04.md) |
| 05 | Phase 3b LSP Go 移植（server/providers/diagnostics） | ☑ completed | [→ plan/process-05.md](plan/process-05.md) |
| 06 | Phase 3c MCP Go 移植（tools/resources/prompts） | ☑ completed | [→ plan/process-06.md](plan/process-06.md) |
| 07 | Phase 3d RAG Go 移植（export/update/hooks） | ☑ retired | [→ plan/process-07.md](plan/process-07.md) |
| 08 | Phase 3e textlint adapter Go 移植 | ☑ completed | [→ plan/process-08.md](plan/process-08.md) |
| 09 | Phase 4 TS src/ retire（authoring 以外削除） | ☑ completed | [→ plan/process-09.md](plan/process-09.md) |
| 10 | Phase 5 CI 整理（Go メイン / Deno は authoring のみ） | ☑ completed | [→ plan/process-10.md](plan/process-10.md) |
| 11 | Phase 5b go.mod 整理・vendoring 検討 | ☑ completed | [→ plan/process-11.md](plan/process-11.md) |
| 12 | Phase 5c バイナリ検証（クロスコンパイル） | ☑ completed | [→ plan/process-12.md](plan/process-12.md) |
| 13 | E2E テスト棚卸し・削除（YAGNI 原則） | ☑ completed | [→ plan/process-13.md](plan/process-13.md) |
| 50 | Phase 6 配布（single binary / install.sh / homebrew） | ☑ completed | [→ plan/process-50.md](plan/process-50.md) |
| 100 | 品質ゲート: 性能ベンチマーク（LSP <2s / CLI <100ms） | ☑ completed | [→ plan/process-100.md](plan/process-100.md) |
| 101 | 品質ゲート: テストカバレッジ（Go 70%+） | ☑ completed | [→ plan/process-101.md](plan/process-101.md) |
| 200 | README 更新（インストール・アーキテクチャ図） | ☑ completed | [→ plan/process-200.md](plan/process-200.md) |
| 201 | docs 個別更新（cli/lsp/mcp/rag/lint/architecture） | ☑ completed | [→ plan/process-201.md](plan/process-201.md) |
| 300 | OODA 振り返り（達成度評価・教訓記録） | ☑ completed | [→ plan/process-300.md](plan/process-300.md) |

**DAG**: `01→02→03→{04,05,06,07,08}→09→13→10→11→12→{100,101}→50→{200,201}→300`
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行
**Overall**: ☑ 19/19 completed（2026-04-27 達成 — 振り返り: docs/go-migration-retrospective.md）

---

# References

| @ref | @target | @test |
|------|---------|-------|
| Charter | CLAUDE.md / docs/architecture.md | - |
| TS Parser | internal/project/tsparse/parser.go | internal/project/tsparse/parser_test.go |
| CLI | internal/cli/modules/** | internal/cli/registry_test.go |
| LSP | internal/lsp/{server,providers,diagnostics,protocol} | internal/lsp/providers/*_test.go |
| MCP | internal/mcp/{server,tools,protocol} | internal/mcp/**/*_test.go |
| RAG | internal/rag/** (新規) | internal/rag/*_test.go |
| Textlint | internal/external/textlint/** (新規) | internal/external/textlint/*_test.go |
| Authoring (preserve) | src/type/, src/characters/, samples/*/src/ | samples/*/tests/ |
| CI | .github/workflows/ci.yml | - |
| Distribution | scripts/install.sh, scripts/release.sh | - |

---

# Risks

| リスク | 対策 |
|--------|------|
| LSP/MCP 性能改善が目標未達（<2s） | Process 100 でベンチ計測、未達なら起動パス見直し（lazy init / cache） |
| 二層構造による保守性低下（Go + TS の二重実装感） | 憲章 (01) に「新規コマンド = Go のみ」明記、samples/ で authoring デモ維持 |
| tsparse 拡張が samples 全形式をカバーできない | tree-sitter-typescript / tsc subprocess を Phase 1 内で代替検討 |
| E2E 削除しすぎてリグレッション検出力低下 | golden test を厚く、UT で境界条件を網羅、必要時に E2E 都度追加 |
