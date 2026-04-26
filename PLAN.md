---
title: "Go移行・リアーキテクチャ実装計画"
status: planning
created: "2026-04-25"
---

# Commander's Intent

## Purpose
現行 TypeScript/Deno 版の機能契約とテスト保証を維持しつつ、複雑化した実装境界と長時間化するテストを分離できる Go ベースの移行基盤を作る。

## End State
CLI/Domain/Project Loader/LSP/MCP/RAG/View を明確な境界に分け、既存サンプルと契約テストで互換性を検証しながら Go 実装へ段階移行できる状態。

## Key Tasks
- 既存機能の契約を Golden/fixture として固定する
- Go の domain/project/meta/detect 基盤を先に作り、CLI/LSP/MCP は adapter として段階移行する
- 遅い LSP/textlint/file watching テストを unit/integration/external に分離する

## Constraints
- 現行の TypeScript `export const` データ形式を読む方針を先に決める
- `PLAN.md` は軽量サマリーに留め、詳細は `plan/process-*.md` に置く
- 外部コマンド依存は通常ユニットテストから外す

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 1 | 契約固定とデータ形式決定 | ✅ done | [→ plan/process-01.md](plan/process-01.md) |
| 2 | GoドメインとProject Loader基盤 | ✅ done | [→ plan/process-02.md](plan/process-02.md) |
| 3 | Meta/Reference検出基盤 | ✅ done (frontmatter/position/reference + emitter + preset + 共通コア整備) | [→ plan/process-03.md](plan/process-03.md) |
| 4 | CLI段階移行 | ✅ done | [→ plan/process-04.md](plan/process-04.md) |
| 5 | LSP/MCP adapter分離 | ✅ done | [→ plan/process-05.md](plan/process-05.md) |
| 10 | 契約・回帰テスト整備 | ☐ planning | [→ plan/process-10.md](plan/process-10.md) |
| 11 | 遅いテストの隔離とtestkit整備 | 🟡 testkit done (clock/process/transport/test tag/exec) / lint guard 未着手 | [→ plan/process-11.md](plan/process-11.md) |
| 100 | 品質ゲートとCI設計 | ☐ planning | [→ plan/process-100.md](plan/process-100.md) |
| 200 | 移行ドキュメント更新 | ☐ planning | [→ plan/process-200.md](plan/process-200.md) |
| 300 | OODA実行管理 | ☐ planning | [→ plan/process-300.md](plan/process-300.md) |

**DAG**: 1→{2,10} | 2→3→4→5 | {10,11}→100→200→300
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行、`|` = 独立した依存チェーン
**Overall**: ✅ 5/10 completed (+ 1 partial)

---

# References

| @ref | @target | @test |
|------|---------|-------|
| [requirements](/home/takets/repos/street-storyteller/docs/migration/go-rearchitecture-requirements.md:1) | Go移行要件整理 | docs review |
| [cli modules](/home/takets/repos/street-storyteller/src/cli/modules/index.ts:12) | CLI登録境界 | tests/command_registry_test.ts |
| [lsp server](/home/takets/repos/street-storyteller/src/lsp/server/server.ts:149) | LSP責務分離 | tests/lsp/server_* |
| [textlint worker](/home/takets/repos/street-storyteller/src/lsp/integration/textlint/textlint_worker.ts:48) | 外部プロセス隔離 | tests/lsp/integration/textlint/* |
| [character type](/home/takets/repos/street-storyteller/src/type/v2/character.ts:95) | Go domain model | tests/type/* |
| [subplot parser](/home/takets/repos/street-storyteller/src/application/subplot/subplot_file_parser.ts:71) | TSデータ読取互換 | tests/application/subplot/* |

---

# Risks

| リスク | 対策 |
|--------|------|
| TypeScriptデータ形式をGoで安全に読めない | 先に互換パーサ/中立形式/抽出サブプロセスの方針を決め、fixtureで固定する |
| LSPと外部プロセス境界が再び密結合する | clock/process/transportをinterface化し、testkitで差し替える |
| 移行範囲が広く完了判定が曖昧になる | CLI→Domain→Meta→LSP/MCPの順に契約テストで段階ゲートを置く |
