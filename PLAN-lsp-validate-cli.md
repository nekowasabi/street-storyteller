---
title: "storyteller lsp validate CLI コマンド実装 (Issue #12)"
status: planning
created: "2026-04-20"
---

# Commander's Intent

## Purpose

GitHub Issue #12 を解決する。既存
`src/cli/modules/lsp/validate.ts`（単一ファイル+--json
のみ動作）を拡張し、`--dir --recursive` / High-Medium-Low サマリー / `--strict`
/ 拡張 DiagnosticOutput を実装することで、原稿のエンティティ参照検証を CI /
pre-commit から利用可能にする。

## End State

`storyteller lsp validate --dir manuscripts --recursive --strict --json`
が動作し、全 .md ファイルを走査、信頼度別サマリーと拡張フィールド（confidence,
entityId）付き JSON を出力し、Low confidence 検出時に exit 1
を返す。既存5テストは全てパス、新規テスト5件以上が追加されている。

## Key Tasks

- listMarkdownFiles を src/lsp/utils/markdown_files.ts に複製し CLI 共用化
- DiagnosticsGenerator.detectAll() を新設し suppress 前の全マッチ取得 API を提供
- validate.ts に --dir/--recursive/--strict 追加、サマリー集計、DiagnosticOutput
  拡張

## Constraints

- 親セッションで Read/Grep/Glob/Bash を直接実行しない（subagent 委譲）
- 既存 5 テスト（tests/cli/lsp_validate_command_test.ts）を破壊しない（unknown[]
  扱いで後方互換）
- cli.ts:93-98 の Deno.exit(1) ハードコードは改修しない（複数 exit code は別
  Issue）
- listMarkdownFiles は **複製**（MCP 側は維持、段階的統一）
- DiagnosticsGenerator.generate() の現行動作を変えず detectAll() を並置
- methodology: Red-Green-Refactor (TDD 必須)

---

# Progress Map

| Process | Title                                            | Status      | File                                                                           |
| ------- | ------------------------------------------------ | ----------- | ------------------------------------------------------------------------------ |
| 1       | listMarkdownFiles 共有化 (utils 複製)            | ☑ completed | [→ plan-lsp-validate-cli/process-01.md](plan-lsp-validate-cli/process-01.md)   |
| 2       | DiagnosticsGenerator.detectAll() 新設            | ☑ completed | [→ plan-lsp-validate-cli/process-02.md](plan-lsp-validate-cli/process-02.md)   |
| 3       | DiagnosticOutput 型拡張 (confidence/entityId)    | ☑ completed | [→ plan-lsp-validate-cli/process-03.md](plan-lsp-validate-cli/process-03.md)   |
| 4       | validate.ts: --dir/--recursive 引数と走査        | ☑ completed | [→ plan-lsp-validate-cli/process-04.md](plan-lsp-validate-cli/process-04.md)   |
| 5       | validate.ts: High/Medium/Low サマリー集計        | ☑ completed | [→ plan-lsp-validate-cli/process-05.md](plan-lsp-validate-cli/process-05.md)   |
| 6       | validate.ts: --strict フラグと err() 返却        | ☑ completed | [→ plan-lsp-validate-cli/process-06.md](plan-lsp-validate-cli/process-06.md)   |
| 10      | Test: --dir --recursive 複数 .md 走査            | ☑ completed | [→ plan-lsp-validate-cli/process-10.md](plan-lsp-validate-cli/process-10.md)   |
| 11      | Test: JSON に confidence/entityId 独立フィールド | ☑ completed | [→ plan-lsp-validate-cli/process-11.md](plan-lsp-validate-cli/process-11.md)   |
| 12      | Test: --strict で Low 検出時 exit error          | ☑ completed | [→ plan-lsp-validate-cli/process-12.md](plan-lsp-validate-cli/process-12.md)   |
| 13      | Test: High/Medium/Low サマリー出力               | ☑ completed | [→ plan-lsp-validate-cli/process-13.md](plan-lsp-validate-cli/process-13.md)   |
| 14      | Test: 既存5テスト回帰確認                        | ☑ completed | [→ plan-lsp-validate-cli/process-14.md](plan-lsp-validate-cli/process-14.md)   |
| 50      | MCP lsp_validate ツール整合性確認                | ☑ completed | [→ plan-lsp-validate-cli/process-50.md](plan-lsp-validate-cli/process-50.md)   |
| 100     | deno test 全体実行・カバレッジ確認               | ☑ completed | [→ plan-lsp-validate-cli/process-100.md](plan-lsp-validate-cli/process-100.md) |
| 101     | deno fmt / lint 適用                             | ☑ completed | [→ plan-lsp-validate-cli/process-101.md](plan-lsp-validate-cli/process-101.md) |
| 200     | docs/lsp.md に validate コマンドセクション追加   | ☑ completed | [→ plan-lsp-validate-cli/process-200.md](plan-lsp-validate-cli/process-200.md) |
| 201     | docs/requirements/lsp-validate-cli.md 作成       | ☑ completed | [→ plan-lsp-validate-cli/process-201.md](plan-lsp-validate-cli/process-201.md) |
| 300     | 振り返り・教訓抽出 (OODA Learning)               | ☑ completed | [→ plan-lsp-validate-cli/process-300.md](plan-lsp-validate-cli/process-300.md) |

**DAG**: `{1,2,3}→4→5→6→{10,11,12,13,14}→50→{100,101}→{200,201}→300`
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行、`|` =
独立した依存チェーン **Overall**: ☑ 17/17 completed

---

# References

| @ref                               | @target                                      | @test                                               |
| ---------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| Issue #12                          | src/cli/modules/lsp/validate.ts              | tests/cli/lsp_validate_command_test.ts              |
| -                                  | src/lsp/utils/markdown_files.ts (@new)       | tests/lsp/utils/markdown_files_test.ts (@new)       |
| -                                  | src/lsp/diagnostics/diagnostics_generator.ts | tests/lsp/diagnostics/diagnostics_generator_test.ts |
| src/mcp/tools/lsp_shared.ts:90-118 | - (参照元・維持)                             | -                                                   |
| src/cli.ts:93-98                   | - (制約源・改修せず)                         | -                                                   |
| -                                  | docs/lsp.md                                  | -                                                   |
| -                                  | docs/requirements/lsp-validate-cli.md (@new) | -                                                   |

---

# Risks

| リスク                                     | 対策                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| 既存5テスト破壊                            | DiagnosticOutput の新フィールドは optional で追加、Process 14 で回帰確認 |
| DiagnosticsGenerator の現行診断動作変更    | detectAll() を新関数として並置、generate() は一切変更しない              |
| listMarkdownFiles の複製による将来的な乖離 | Process 50 で MCP 側との挙動一致を確認、TODO コメントで統一予定を明記    |
