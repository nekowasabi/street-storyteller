---
task_id: "T-20260516-sync-skills"
title: "storyteller update --sync-skills / --sync-workflow 実装"
status: planning
created: "2026-05-16"
scope:
  - internal/assets/
  - internal/cli/modules/update/
  - internal/cli/modules/generate/
  - scripts/sync_skills.sh
  - scripts/sync_workflow.sh
  - docs/cli.md
  - CHANGELOG.md
  - CLAUDE.md
depends_on: []
risk_flags:
  - backwards_incompatible_guard
quality_gate:
  command: "deno task check"
  min_quality_score: "-"
commit_mode: manual
---

# Commander's Intent

## Purpose
embedded skills と WORKFLOW.md を既存プロジェクトへ再配布する手段を `storyteller update` に追加し、`generate` 時点でしか配布されなかった成果物を継続的に同期可能にする。

## End State
`storyteller update --sync-skills` / `--sync-workflow` が既存プロジェクトに対し冪等な再配布を行い、generate 後方互換を維持しつつ単一バイナリ配布 KPI を保つ。

## Key Tasks
- `internal/assets/` パッケージで skills + WORKFLOW.md を `go:embed` し、共通 `DeploySkills` / `DeployWorkflow` API を提供
- `generate` モジュールを assets パッケージ呼び出しへリファクタ（既存テスト緑保持）
- `update` モジュールに `--sync-skills`, `--sync-workflow`, `--check` を実装

---

# ★ Constants（唯一の正・他は定数名で参照）

| 定数名 | 値 | 単位 | 備考 |
|-------|-----|------|------|
| ASSETS_PKG_PATH | `internal/assets` | パス | 新規パッケージのリポジトリ相対パス |
| SKILLS_EMBED_DIR | `skills` | パス（パッケージ相対） | `//go:embed all:skills` 対象 |
| WORKFLOW_EMBED_FILE | `WORKFLOW.md` | パス（パッケージ相対） | `//go:embed WORKFLOW.md` 対象 |
| SKILLS_DEPLOY_DIR | `.claude/skills` | パス（プロジェクト相対） | 配布先 |
| WORKFLOW_DEPLOY_FILE | `WORKFLOW.md` | パス（プロジェクト相対） | 配布先 |
| MANIFEST_FILE | `.storyteller.json` | ファイル名 | update が検証する manifest |
| SENTINEL_FILE | `.storyteller-go-ready` | ファイル名 | update が作成する完了印 |

> このセクションが定数の単一ソース。process ファイルおよびコード・コメントではこの定数名のみを参照し、リテラル文字列を二重定義しない。

---

# Scope

**対象**:
- 新規パッケージ `ASSETS_PKG_PATH/`
- `internal/cli/modules/update/update.go` および `update_test.go` の拡張
- `internal/cli/modules/generate/{generate.go, skill.go, generate_test.go}` のリファクタ
- `scripts/sync_skills.sh` の destination 変更
- 新規 `scripts/sync_workflow.sh`
- 各種ドキュメント

**対象外（理由付き）**:
- バックアップ機能（`.bak-*` 退避） — ユーザー判断で「不要」確定（skills は go:embed で再生成可能）
- `--force` フラグ — デフォルトで上書きするため意味を持たない
- バックアップ自動削除 (prune) — バックアップ機能自体がないため
- skill 増分更新（部分上書き） — 全置換で十分、複雑度抑制
- samples/ などその他テンプレ同梱 — 範囲を skills と WORKFLOW.md に限定
- `--force` 以外の安全装置（confirm prompt 等） — `--check` で事前確認可能
- 旧 `installClaudeSkills` 関数の互換シム保持 — 内部 API のため不要

---

# Required Sections（risk_flags 連動）

| Flag | 必須セクション | 反映先 |
|------|---------------|--------|
| backwards_incompatible_guard | Backward Compatibility Gate | process-02, process-03 |
| security | — | 対象外: ローカル FS 操作のみ、認証境界なし |
| external_api | — | 対象外: 外部 API 呼び出しなし |
| multi_id | — | 対象外: ID 体系の変更なし |
| frontend | — | 対象外: CLI のみ |
| performance | — | 対象外: 軽量 FS 操作で計測対象なし |
| data_migration | — | 対象外: ユーザーデータ移行なし（embed 資産の配布のみ） |

---

# Progress Map

| Process | Title | Status | File |
|---------|-------|--------|------|
| 01 | assets パッケージ抽出と DeploySkills 実装 | ☐ planning | [→ plan-sync-skills/process-01.md](plan-sync-skills/process-01.md) |
| 02 | generate モジュールの assets 経由リファクタ | ☐ planning | [→ plan-sync-skills/process-02.md](plan-sync-skills/process-02.md) |
| 03 | update --sync-skills / --sync-workflow 実装 | ☐ planning | [→ plan-sync-skills/process-03.md](plan-sync-skills/process-03.md) |
| 200 | ドキュメント整備と E2E 検証 | ☐ planning | [→ plan-sync-skills/process-200.md](plan-sync-skills/process-200.md) |
| 300 | OODA レトロスペクティブと知見の永続化 | ☐ planning | [→ plan-sync-skills/process-300.md](plan-sync-skills/process-300.md) |

**DAG**: `01→{02,03}→200→300`
**DAG凡例**: `{A,B}` = 並列実行可能、`A→B` = A完了後にB実行
**Overall**: ☐ 0/5 completed

---

# Acceptance Criteria（要約）

**機能要件**:
- `update --sync-skills` で既存プロジェクトの `SKILLS_DEPLOY_DIR` 配下が embedded 正本と一致
- `update --sync-workflow` で `WORKFLOW_DEPLOY_FILE` が embedded 正本と一致
- `--check` 単独またはサブフラグ併用時に書き込みなし
- `--json` で `{synced: [], unchanged: [], target: "skills"|"workflow"}` を返却
- 既存 `update`（フラグなし）の挙動が不変（後方互換）
- `generate` コマンド観測挙動が不変（特に `TestGenerateInstallsClaudeSkill`）

**品質・安全**:
- 全 Go テスト緑（`go test ./...`）
- `scripts/sync_skills.sh --check` が CI で通る
- 単一バイナリ配布 KPI 維持（外部ファイル依存ゼロ）

**ドキュメント**: Docs to Update の全エントリ完了

---

# Docs to Update

| パス | 更新内容 | 必須条件 |
|------|---------|----------|
| docs/cli.md | `update` セクションを `--sync-skills`/`--sync-workflow`/`--check`/`--json` 仕様で拡張 | 機能リリース時 必須 |
| CHANGELOG.md | Unreleased に Features エントリ追加（2件） | リリース時 必須 |
| CLAUDE.md | 「進行中の機能開発」に skills/WORKFLOW 同期機能を追記 | 機能追加時 必須 |
| README.md | Commands at a glance に `update --sync-*` を追記 | 任意（条件: CLI コマンド表に変更があれば） |

---

# Don'ts（禁止事項）

- 数値・文字列リテラルを ★ Constants と二重定義しない
- generate モジュールから assets を介さず skills を直接配布する経路を残さない（重複ソース禁止）
- バックアップ機能・`--force` を再導入しない（決定事項）
- skills と無関係なテンプレ（samples/ 等）を `ASSETS_PKG_PATH` に同梱しない
- 既存 `update` フラグなし挙動を変更しない
- generate モジュールの外部観測挙動（生成ファイル一覧）を変更しない

---

# Risks

| リスク | 対策 |
|--------|------|
| skills 配置先変更で sync_skills.sh CI 失敗 | process-01 で sync_skills.sh を同 PR 内更新、`--check` を Acceptance に組み込む |
| 既存カスタマイズ `.claude/skills/*` が上書きで消失 | コマンド実行時に警告表示、`--check` 事前確認、ドキュメントに明記 |
| バイナリサイズ +41KB (WORKFLOW.md) | 受容（ユーザー判断）、`go:embed` のため lazy load 不可 |

---

# Verification

**Manual**: 詳細は各 process の Manual Verification を参照
**Automated**: `deno task check` （`fmt:check && lint && test:authoring && go:test`）
