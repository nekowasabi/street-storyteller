# Process 3: update --sync-skills / --sync-workflow 実装

## Implementation Brief（コピペ用）

- **背景**: `internal/cli/modules/update/update.go` は manifest 検証 + sentinel 作成のみ（フラグは `--path` と `--check`）。process-01 で `internal/assets.DeploySkills` / `DeployWorkflow` が提供されたため、これを呼び出す新フラグ `--sync-skills` / `--sync-workflow` を追加できる。
- **目的**: `storyteller update --sync-skills [--check] [--json]` および `--sync-workflow` を実装し、既存 update 挙動を完全後方互換で保持しつつ拡張する。
- **変更範囲**:
  - `internal/cli/modules/update/update.go` — フラグ解析 + 分岐 + JSON スキーマ拡張
  - `internal/cli/modules/update/update_test.go` — Red テスト追加
- **参照する定数**（PLAN-sync-skills.md ★ Constants 表）:
  - `MANIFEST_FILE`
  - `SENTINEL_FILE`
  - `SKILLS_DEPLOY_DIR`
  - `WORKFLOW_DEPLOY_FILE`
- **禁止事項**（PLAN Don'ts より）:
  - 既存 update フラグなし挙動の変更
  - `--force` の追加（決定事項）
  - バックアップ機能の追加
- **出力順序**:
  1) Red: 新フラグ向けテストケースを追加して失敗確認
  2) Green: フラグ解析と DeploySkills/DeployWorkflow 呼び出し実装
  3) JSON スキーマ拡張（既存 OK/Path に Synced/Unchanged/Target を omitempty で追加）
  4) Usage / Description 更新
  5) Refactor: 共通分岐ヘルパへの整理
  6) `deno task go:test` で品質ゲート

---

## Overview

`update` コマンドに 2 つの同期フラグを追加する。既存挙動（フラグなし＝manifest 検証 + sentinel）は不変。新フラグは manifest 検証を維持しつつ `assets.DeploySkills` / `assets.DeployWorkflow` を呼び出し、JSON 出力では新フィールド `synced`, `unchanged`, `target` を返す。

## Affected Files

| パス | 種別 | 変更内容 |
|------|------|---------|
| `internal/cli/modules/update/update.go` | 修正 | フラグ解析（行 24-39 周辺）に `--sync-skills`, `--sync-workflow` を追加、Handle ロジック分岐、JSON 構造体拡張、Usage 更新 |
| `internal/cli/modules/update/update_test.go` | 修正 | 新テストケース追加（最低 6 件）、既存テスト 6 件は不変維持 |

## Implementation Notes

### フラグ解析の拡張（既存 `--path`/`--check` と同パターン）

```go
type updateOptions struct {
    path         string
    check        bool
    syncSkills   bool
    syncWorkflow bool
}
```

`--sync-skills` / `--sync-workflow` は bool フラグ。`--check` は既存と共用（書き込みなしモード）。

### 分岐ロジック

```text
1. manifest 検証（MANIFEST_FILE 存在チェック）— 全モード共通
2. opts.syncSkills が真:
     result, err := assets.DeploySkills(root, assets.DeployOptions{DryRun: opts.check})
     → JSON: {target: "skills", synced, unchanged}
3. opts.syncWorkflow が真:
     result, err := assets.DeployWorkflow(root, assets.DeployOptions{DryRun: opts.check})
     → JSON: {target: "workflow", synced, unchanged}
4. どちらも偽:
     既存挙動（--check 以外は SENTINEL_FILE 作成）
5. 同時指定（--sync-skills かつ --sync-workflow）: skills → workflow の順で実行、結果を配列で返却
```

### JSON スキーマ拡張

```go
type updateResult struct {
    OK        bool     `json:"ok"`
    Path      string   `json:"path"`
    Target    string   `json:"target,omitempty"`     // "skills" or "workflow"
    Synced    []string `json:"synced,omitempty"`
    Unchanged []string `json:"unchanged,omitempty"`
}
```

> `omitempty` で既存 `{ok, path}` 出力を不変に保つ。フラグなし呼び出し時は新フィールドが省略される。

### 同時指定時の JSON

`--sync-skills --sync-workflow` 同時指定時は配列形式に切り替え:

```json
{"ok": true, "path": "/...", "results": [
    {"target": "skills", "synced": [...], "unchanged": [...]},
    {"target": "workflow", "synced": [...], "unchanged": [...]}
]}
```

### Usage 文言（更新後）

```
storyteller update [--path <dir>] [--check] [--json]
                    [--sync-skills] [--sync-workflow]

Validate the project manifest and optionally re-deploy embedded skills /
WORKFLOW.md. Without sync flags, only the manifest check + sentinel write
runs.
```

### Backward Compatibility Gate

| 観測ポイント | 期待挙動 |
|-------------|---------|
| `update`（フラグなし） | manifest 検証 + sentinel 作成（既存挙動完全維持） |
| `update --check` | 検証のみ、sentinel なし（既存挙動維持） |
| `update --path <dir>` | path 経由でも既存挙動維持 |
| `update --json`（フラグなし） | `{ok: true, path: "..."}` 出力（既存スキーマ維持、新フィールドは omitempty） |

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] update_test.go に以下のテストを追加:
  - `TestUpdate_SyncSkills_NewProject` — `--sync-skills` で `SKILLS_DEPLOY_DIR/...` が配置される
  - `TestUpdate_SyncSkills_Check` — `--sync-skills --check` で書き込みなし
  - `TestUpdate_SyncWorkflow_NewProject` — `--sync-workflow` で `WORKFLOW_DEPLOY_FILE` が配置される
  - `TestUpdate_SyncBoth` — 両フラグ同時指定で 2 段階 deploy
  - `TestUpdate_SyncSkills_JSON` — JSON 出力に `target`, `synced`, `unchanged` が含まれる
  - `TestUpdate_NoFlags_JSON_BackwardCompat` — フラグなし時の JSON が既存 `{ok, path}` 形式を維持（追加フィールドが omitempty で省略）
- [ ] `go test ./internal/cli/modules/update/...` で失敗を確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] `updateOptions` 構造体に `syncSkills`, `syncWorkflow` フィールド追加
- [ ] フラグ解析ループに `--sync-skills` / `--sync-workflow` の case 追加
- [ ] Handle 関数に分岐ロジック実装（上記 5 ステップ）
- [ ] `updateResult` 構造体を JSON omitempty 付きで拡張（または同時指定時は別構造体 `updateResultMulti` を使用）
- [ ] import に `"github.com/takets/street-storyteller/internal/assets"` 追加
- [ ] `go test ./internal/cli/modules/update/... -count=1` で全テスト緑

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] 分岐ロジックを `runSyncSkills` / `runSyncWorkflow` のヘルパへ抽出
- [ ] Usage / Description 文言を最終化
- [ ] godoc コメント追加（特に「フラグなし時は既存挙動」を明記）
- [ ] `gofmt -l internal/cli/modules/update/` で diff ゼロ
- [ ] `go vet ./internal/cli/modules/update/...` 警告ゼロ
- [ ] `go test ./... -count=1` で全体回帰

✅ **Phase Complete**

---

## Manual Verification（手動検証シナリオ）

1. **pilot E2E**: `deno task build` → `./dist/darwin_arm64/storyteller update --path ~/words/transporter/pilot --sync-skills` 実行 → SKILL.md が embed 正本と一致、`.storyteller-go-ready` 更新
2. **--check モード**: `./dist/darwin_arm64/storyteller update --path ~/words/transporter/pilot --sync-skills --check --json` 実行 → JSON 出力のみ、ファイル書き換えなし
3. **後方互換**: 既存 `update --path /tmp/dummy-project`（manifest あり）が緑、`{ok: true, path: "..."}` のみが返る
4. **同時指定**: `--sync-skills --sync-workflow --json` 実行 → `results` 配列に 2 件

---

## Dependencies
- Requires: process-01
- Blocks: process-200
