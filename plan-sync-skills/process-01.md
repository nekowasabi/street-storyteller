# Process 1: assets パッケージ抽出と DeploySkills 実装

## Implementation Brief（コピペ用）

> このセクションは別セッションで `/x @plan-sync-skills/process-01.md` を起動した際の自己完結ブリーフ。

- **背景**: 現状 skills の `go:embed` は `internal/cli/modules/generate/skill.go` 内に閉じ込められており、generate コマンド以外から再利用できない。`storyteller update --sync-skills` を実装するには共通パッケージ化が前提となる。
- **目的**: `ASSETS_PKG_PATH` に skills と WORKFLOW.md を集約し、`DeploySkills` / `DeployWorkflow` API を提供する。
- **変更範囲**:
  - `internal/assets/assets.go`（新規）— `go:embed` ディレクティブと公開 FS 変数
  - `internal/assets/deploy.go`（新規）— `DeploySkills`, `DeployWorkflow`, `DeployOptions`, `DeployResult`
  - `internal/assets/deploy_test.go`（新規）— 4 ケース TDD
  - `internal/assets/skills/storyteller/SKILL.md`（sync_skills.sh が配置）
  - `internal/assets/WORKFLOW.md`（sync_workflow.sh が配置）
  - `scripts/sync_skills.sh` — DST を `internal/assets/skills/` に変更
  - `scripts/sync_workflow.sh`（新規）— `WORKFLOW.md` → `internal/assets/WORKFLOW.md`
- **参照する定数**（数値・パスは PLAN-sync-skills.md の ★ Constants 表を参照）:
  - `ASSETS_PKG_PATH`
  - `SKILLS_EMBED_DIR`
  - `WORKFLOW_EMBED_FILE`
  - `SKILLS_DEPLOY_DIR`
  - `WORKFLOW_DEPLOY_FILE`
- **禁止事項**（PLAN.md Don'ts より該当抜粋）:
  - 数値・文字列リテラルを ★ Constants と二重定義しない
  - skills と無関係なテンプレを `ASSETS_PKG_PATH` に同梱しない
- **出力順序**:
  1) `scripts/sync_skills.sh` の DST 更新 + `sync_workflow.sh` 新規作成 → 実行して assets/ ディレクトリ作成
  2) Red: `deploy_test.go` を書いて失敗確認
  3) Green: `assets.go` + `deploy.go` 実装
  4) Refactor: API 簡潔化（DeployOptions は DryRun のみ）
  5) ドキュメント更新は process-200 へ委譲
  6) `deno task go:test` で品質ゲート

---

## Overview

skills の go:embed ロジックを generate モジュールから切り出し、`internal/assets` 共通パッケージへ昇格させる。同時に WORKFLOW.md の embed も追加する。`DeploySkills(projectRoot, opts)` / `DeployWorkflow(projectRoot, opts)` の 2 API を提供し、generate と update から共有利用できるようにする。

## Affected Files

| パス | 種別 | 変更内容 |
|------|------|---------|
| `internal/assets/assets.go` | 新規 | `//go:embed all:skills` と `//go:embed WORKFLOW.md` 宣言。`SkillFS embed.FS`, `WorkflowBytes []byte` を export |
| `internal/assets/deploy.go` | 新規 | `DeployOptions{DryRun bool}`, `DeployResult{Synced, Unchanged []string}`, `DeploySkills`, `DeployWorkflow` |
| `internal/assets/deploy_test.go` | 新規 | 4 ケース: 新規配置・上書き・dry-run・冪等（hash 一致時スキップ） |
| `internal/assets/skills/storyteller/SKILL.md` | 自動同期 | sync_skills.sh 経由でリポジトリルートの `skills/` から複製 |
| `internal/assets/WORKFLOW.md` | 自動同期 | sync_workflow.sh 経由でリポジトリルートの `WORKFLOW.md` から複製 |
| `scripts/sync_skills.sh` | 修正 | DST を `internal/assets/skills/` に変更（旧 `internal/cli/modules/generate/assets/skills/` から移行） |
| `scripts/sync_workflow.sh` | 新規 | SRC=`WORKFLOW.md`, DST=`internal/assets/WORKFLOW.md`、`--check` モード対応 |

## Implementation Notes

### assets.go の構造（参考スケッチ）

```go
package assets

import "embed"

//go:embed all:skills
var SkillFS embed.FS

//go:embed WORKFLOW.md
var WorkflowBytes []byte

const (
    SkillEmbedRoot   = "skills"
    SkillsDeployDir  = ".claude/skills"
    WorkflowDeployFile = "WORKFLOW.md"
)
```

> 定数値そのものは `PLAN-sync-skills.md` の ★ Constants 表が単一ソース。コード上は定数名定義のみ。

### deploy.go の API

```go
type DeployOptions struct { DryRun bool }
type DeployResult struct {
    Synced    []string // 書き込んだ相対パス
    Unchanged []string // hash 一致でスキップ
}

func DeploySkills(projectRoot string, opts DeployOptions) (DeployResult, error)
func DeployWorkflow(projectRoot string, opts DeployOptions) (DeployResult, error)
```

- 冪等性: 既存ファイルを Read → content hash 比較 → 一致なら `Unchanged` に追加、不一致なら上書きして `Synced` に追加
- `DryRun=true` の場合は書き込みせず Synced/Unchanged のみ生成
- バックアップ機能は **実装しない**（PLAN Don'ts より）

### sync_workflow.sh 雛形

```sh
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/WORKFLOW.md"
DST="${ROOT}/internal/assets/WORKFLOW.md"
mode="${1:-sync}"
if [ "${mode}" = "--check" ]; then
  diff "${SRC}" "${DST}" >/dev/null
  exit $?
fi
mkdir -p "$(dirname "${DST}")"
cp "${SRC}" "${DST}"
echo "synced: ${SRC} -> ${DST}"
```

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認（Implementation Brief 全項目）
- [ ] `internal/assets/deploy_test.go` を作成
  - 検証ケース 1: 空の projectRoot に DeploySkills → `Synced` に SKILL.md 相対パスが含まれる
  - 検証ケース 2: 既存ファイルが正本と一致 → `Unchanged` に分類、書き込みなし
  - 検証ケース 3: `DryRun=true` → ファイルシステム未変更を `t.TempDir()` 配下で確認
  - 検証ケース 4: 既存ファイルが正本と異なる → 上書きされ `Synced` に分類
- [ ] `go test ./internal/assets/...` で失敗を確認（パッケージ未実装エラー or テスト失敗）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] `scripts/sync_skills.sh` の DST を `internal/assets/skills/` へ更新
- [ ] `scripts/sync_workflow.sh` を新規作成（実行権限付与: `chmod +x`）
- [ ] 両スクリプトを実行して `internal/assets/skills/` と `internal/assets/WORKFLOW.md` を配置
- [ ] `internal/assets/assets.go` を実装（go:embed 宣言）
- [ ] `internal/assets/deploy.go` を実装（`DeploySkills`, `DeployWorkflow`, ヘルパ）
- [ ] `go test ./internal/assets/...` で全テスト緑を確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] 重複ロジック整理（`DeploySkills` と `DeployWorkflow` の共通部分を内部ヘルパへ）
- [ ] `DeployOptions` は `DryRun bool` のみであることを再確認（YAGNI）
- [ ] godoc コメントを各 public 関数に追加（特に「冪等性: hash 一致時は Unchanged」明記）
- [ ] `go vet ./internal/assets/...` で警告ゼロ
- [ ] `gofmt -l internal/assets/` で diff ゼロ
- [ ] `go test ./internal/assets/... -count=1` 再実行で緑維持

✅ **Phase Complete**

---

## Manual Verification（手動検証シナリオ）

1. `bash scripts/sync_skills.sh && bash scripts/sync_workflow.sh` を実行 → `internal/assets/skills/storyteller/SKILL.md` と `internal/assets/WORKFLOW.md` が存在することを `ls` で確認
2. `bash scripts/sync_skills.sh --check && bash scripts/sync_workflow.sh --check` を 2 回連続実行 → 終了コード 0（冪等性確認）
3. 仮の projectRoot を `t.TempDir()` 相当の手元ディレクトリで作り、`go test -run TestDeploySkills_Idempotent -v` を実行 → Unchanged に分類される

---

## Dependencies
- Requires: -
- Blocks: process-02, process-03
