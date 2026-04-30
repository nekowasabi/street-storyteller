---
title: "subplot → plot リネーム（破壊的変更）と migrate コマンド提供"
status: completed
created: "2026-04-30"
---

# Commander's Intent

## Purpose
`subplot` という型名が「総称」と「特定サブカテゴリ」を兼任する命名上の認知不一致を解消し、`plot` を上位概念に据えて Go/TS 二層・MCP・CLI・docs を統一する。初学者の認知負荷を下げ、API 命名規則を他エンティティ（character.role, foreshadowing.type）と整合させる。

## End State
Go/TS 双方で `Plot/plot` 命名に統一され、`storyteller migrate plot-rename` で既存プロジェクトが自動移行可能。docs・samples・golden 全てが新名に追従し、リリースノート以外で `grep -ri subplot` が残らない状態。

## Key Tasks
- Phase 1: 型リネーム（TS Process 1 → Go domain/store/loader Process 2-4）を atomic に置換
- Phase 2: CLI/MCP コマンド・リソース URI を `plot_*` / `storyteller://plot[s]` に切替（Process 5-6, 9）
- Phase 3-4: `migrate plot-rename` コマンドと移行ガイド（Process 8, 14, 204）で既存ユーザー保護

## Constraints
- Phase 1 内の Go 4 Process（2,3,4）は同 PR で atomic 置換（パッケージ単位の破壊的影響を最小化）
- migrate コマンドは新コードベースに立脚するため先行リリース不可（新バイナリ同梱）
- ゴールデンファイル更新は Process 5,6,9 完了後に Process 12 で一括
- CI に `grep -RIn "subplot\|Subplot"` 残骸チェックを Process 51 で導入

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 1 | TS 型ファイルリネーム | ☑ done | [→ plan/process-01.md](plan/process-01.md) |
| 2 | Go domain リネーム | ☑ done | [→ plan/process-02.md](plan/process-02.md) |
| 3 | Go store/manifest/project リネーム | ☑ done | [→ plan/process-03.md](plan/process-03.md) |
| 4 | Go entity loader リネーム | ☑ done | [→ plan/process-04.md](plan/process-04.md) |
| 5 | CLI モジュールリネーム | ☑ done | [→ plan/process-05.md](plan/process-05.md) |
| 6 | MCP tools リネーム | ☑ done | [→ plan/process-06.md](plan/process-06.md) |
| 7 | サンプルプロジェクトリネーム | ☑ done | [→ plan/process-07.md](plan/process-07.md) |
| 8 | migrate コマンド実装 | ☑ done | [→ plan/process-08.md](plan/process-08.md) |
| 9 | help/golden 反映 | ☑ done | [→ plan/process-09.md](plan/process-09.md) |
| 10 | domain plot テスト整備 | ☑ done | [→ plan/process-10.md](plan/process-10.md) |
| 11 | loader plot 互換テスト | ☑ done | [→ plan/process-11.md](plan/process-11.md) |
| 12 | CLI element/view ゴールデン更新 | ☑ done | [→ plan/process-12.md](plan/process-12.md) |
| 13 | MCP tools E2E 名寄せ | ☑ done | [→ plan/process-13.md](plan/process-13.md) |
| 14 | migrate dry-run/実行テスト | ☑ done | [→ plan/process-14.md](plan/process-14.md) |
| 15 | サンプル統合テスト | ☑ done | [→ plan/process-15.md](plan/process-15.md) |
| 50 | エラーメッセージ精査 | ☑ done | [→ plan/process-50.md](plan/process-50.md) |
| 51 | 旧名残骸 CI チェック | ☑ done | [→ plan/process-51.md](plan/process-51.md) |
| 52 | momotaro plots 整合 | ☑ done | [→ plan/process-52.md](plan/process-52.md) |
| 100 | go vet/staticcheck 緑化 | ☑ done | [→ plan/process-100.md](plan/process-100.md) |
| 101 | deno check/tsc 確認 | ☑ done | [→ plan/process-101.md](plan/process-101.md) |
| 102 | 後方互換アサーション禁止 | ☑ done | [→ plan/process-102.md](plan/process-102.md) |
| 200 | CLAUDE.md §8 改訂 | ☑ done | [→ plan/process-200.md](plan/process-200.md) |
| 201 | README.md 改訂 | ☑ done | [→ plan/process-201.md](plan/process-201.md) |
| 202 | docs/plot.md 新設 | ☑ done | [→ plan/process-202.md](plan/process-202.md) |
| 203 | Skills 改訂 | ☑ done | [→ plan/process-203.md](plan/process-203.md) |
| 204 | migration ガイド執筆 | ☑ done | [→ plan/process-204.md](plan/process-204.md) |
| 300 | 全体検証 OODA | ☑ done | [→ plan/process-300.md](plan/process-300.md) |

**DAG**: `{1,2}→3→4→{5,6}→7→8→9 | 10←2 | 11←4 | 12←{5,9} | 13←6 | 14←8 | 15←{5,7} | 50←4 | 51←{1..7} | 52←7 | 100←{1..7} | 101←{1,7} | 102←11 | {200,201,202,203}←{1..9} | 204←8 | 300←{1..204}`
**DAG凡例**: `{A,B}` = 並列、`A→B` = A完了後B、`A←B` = AはBに依存、`|` = 独立チェーン
**Overall**: ☑ 27/27 completed

---

# References

| @ref | @target | @test |
|------|---------|-------|
| TS 型 | src/type/v2/subplot.ts → plot.ts | tests/authoring/ |
| Go domain | internal/domain/subplot.go → plot.go | internal/domain/plot_test.go |
| Go store | internal/project/store/store.go (L23,64,75,259-,262,274,277) | store_test.go |
| Go manifest | internal/project/manifest/manifest.go (L33,65,91,183,206-207) | loader_test.go |
| Go loader | internal/project/entity/loader.go (L54-60,739-862,915-921,1256-1278) | loader_test.go |
| CLI element | internal/cli/modules/element/element.go (L155-156,169) | element_test.go |
| CLI view | internal/cli/modules/view/{list,entity}.go | list_entity_test.go |
| MCP tools | internal/mcp/tools/{subplot_create,subplot_view,beat_create,intersection_create,element_create}.go | 各 _test.go |
| MCP resources | internal/mcp/resources/resources.go (L17) | - |
| Samples | samples/cinderella/src/subplots/*.ts → src/plots/ | golden test |
| Migrate (新規) | internal/cli/modules/migrate/migrate.go | migrate_test.go |
| Golden | cmd/storyteller/testdata/golden/{help,no_args}.txt | golden tests |
| Docs | CLAUDE.md (L56,62-63,635-705), README.md, docs/{subplot→plot}.md, docs/{cli,mcp,architecture}.md | - |
| Skills | .claude/skills/storyteller-writing/references/entity-{subplot→plot}.md | - |

---

# Risks

| リスク | 対策 |
|--------|------|
| 既存ユーザーの物語プロジェクトが migrate 失敗で毀損 | --dry-run デフォルト、--apply 必須、git status クリーン必須、Process 14 で不整合状態テスト |
| TS authoring と Go loader のキー名不整合で silent ビルド成功＋runtime 失敗 | Process 1 と Process 4 を同 PR、samples リアル fixture テスト、旧キー受理時 validation error |
| 文字列 "subplot" 残骸の見落とし（テスト・docs・golden） | Process 51 で grep CI チェック化、Process 300 で最終確認 |
