# Process 2: generate モジュールの assets 経由リファクタ

## Implementation Brief（コピペ用）

- **背景**: process-01 で `internal/assets` パッケージが整い、`DeploySkills` 共通 API が提供された。これにより `internal/cli/modules/generate/skill.go` の `installClaudeSkills` は重複ロジックとなり、二重 embed を生む。リファクタしなければ skills の配布パスが分岐し続け、Don'ts「重複ソース」違反となる。
- **目的**: `generate` モジュールから `installClaudeSkills` 関数と内部 embed を除去し、`assets.DeploySkills(root, DeployOptions{})` 呼び出しへ置換する。観測可能挙動（生成されるファイル一覧・テスト結果）は不変。
- **変更範囲**:
  - `internal/cli/modules/generate/skill.go`（削除 or 5 行程度の shim へ縮退）
  - `internal/cli/modules/generate/generate.go`（行 52 周辺 `installClaudeSkills` 呼び出しを `assets.DeploySkills` へ）
  - `internal/cli/modules/generate/assets/skills/`（削除：process-01 で新 destination に統合済み）
- **参照する定数**（PLAN-sync-skills.md ★ Constants 表）:
  - `SKILLS_DEPLOY_DIR`
- **禁止事項**（PLAN Don'ts より）:
  - generate モジュールから assets を介さず skills を直接配布する経路を残さない
  - generate の外部観測挙動を変更しない（`TestGenerateInstallsClaudeSkill` 緑維持）
- **出力順序**:
  1) generate.go を assets.DeploySkills 呼び出しへ書き換え
  2) skill.go 削除
  3) 旧 `internal/cli/modules/generate/assets/` ディレクトリ削除
  4) `go test ./internal/cli/modules/generate/...` で既存テスト緑を確認（後方互換ゲート）
  5) `go test ./...` 全体回帰確認

---

## Overview

skills 配布のロジック所有権を generate から assets パッケージへ完全に移譲する。`installClaudeSkills` 関数の削除と、それに依存するファイル群（旧 embed 用 assets ディレクトリ）の撤去を行う。`generate_test.go` の既存テストケースを **不変条件ゲート** として使い、観測挙動の維持を保証する。

## Affected Files

| パス | 種別 | 変更内容 |
|------|------|---------|
| `internal/cli/modules/generate/generate.go` | 修正 | 行 52 `installClaudeSkills(projectRoot)` → `_, err := assets.DeploySkills(projectRoot, assets.DeployOptions{})` |
| `internal/cli/modules/generate/skill.go` | 削除 | `installClaudeSkills` 関数と `//go:embed all:assets/skills` 宣言を撤去 |
| `internal/cli/modules/generate/assets/skills/` | 削除 | 旧 embed ミラー（process-01 で `internal/assets/skills/` に移管済み） |
| `internal/cli/modules/generate/generate_test.go` | 不変 | 観測挙動テスト（特に `TestGenerateInstallsClaudeSkill`）を変更せず緑維持 |

## Implementation Notes

### generate.go の置換箇所（既存）

調査済み: 行 52 周辺
```go
projectRoot := filepath.Join(opts.basePath, opts.name)
if err := createProject(projectRoot, opts.name, opts.templateName); err != nil {
    cctx.Presenter.ShowError(err.Error())
    return 1
}
if err := installClaudeSkills(projectRoot); err != nil {   // ← 置換対象
    cctx.Presenter.ShowError(err.Error())
    return 1
}
```

### 置換後

```go
if _, err := assets.DeploySkills(projectRoot, assets.DeployOptions{}); err != nil {
    cctx.Presenter.ShowError(err.Error())
    return 1
}
```

- import に `"github.com/takets/street-storyteller/internal/assets"` を追加
- `installClaudeSkills` の戻り値は元々 `error` のみだが、`DeploySkills` は `(DeployResult, error)` なので結果は破棄する（generate ではログ出力不要）

### Backward Compatibility Gate

`risk_flags: backwards_incompatible_guard` 対応セクション。

| 観測ポイント | 期待挙動 | 検証テスト |
|-------------|----------|-----------|
| 生成プロジェクトに `SKILLS_DEPLOY_DIR/storyteller/SKILL.md` が存在 | 維持 | `TestGenerateInstallsClaudeSkill` (generate_test.go:168-197) |
| SKILL.md の内容が embedded 正本と一致 | 維持 | 同上の内容アサーション |
| `--json` 出力スキーマ（path, template の 2 フィールド） | 不変 | `TestGenerate_JSONOutput` (generate_test.go:100-116) |
| `--template basic/novel/screenplay` の動作 | 不変 | `TestGenerate_AllTemplates` (generate_test.go:88-98) |

→ これら **全部緑のまま** で完了が Acceptance。

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] 本 Process では新規テストは追加せず、**既存テスト群を Red 起点として扱う**
- [ ] 一旦 `installClaudeSkills` の呼び出しをコメントアウトし `go test ./internal/cli/modules/generate/... -run TestGenerateInstallsClaudeSkill` を実行 → 失敗を確認（後方互換ゲートが機能していることの自己確認）
- [ ] コメントアウトを元に戻す

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] ブリーフィング確認
- [ ] `generate.go` の `installClaudeSkills` 呼び出しを `assets.DeploySkills` へ置換
- [ ] import 文に `"github.com/takets/street-storyteller/internal/assets"` を追加
- [ ] `generate/skill.go` を削除（`git rm`）
- [ ] 旧 `internal/cli/modules/generate/assets/skills/` ディレクトリを削除（`git rm -r`）
- [ ] `go build ./...` でビルド通過
- [ ] `go test ./internal/cli/modules/generate/... -count=1` で全テスト緑

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] generate.go から不要 import（`embed`, `io/fs` 等）の整理
- [ ] `gofmt -l internal/cli/modules/generate/` で diff ゼロ
- [ ] `go vet ./internal/cli/modules/generate/...` 警告ゼロ
- [ ] `go test ./... -count=1` で全体回帰確認

✅ **Phase Complete**

---

## Manual Verification（手動検証シナリオ）

1. `go run ./cmd/storyteller generate --name verify-after-refactor --path /tmp` を実行 → 生成された `/tmp/verify-after-refactor/.claude/skills/storyteller/SKILL.md` が `skills/storyteller/SKILL.md` と diff ゼロ
2. `go test ./internal/cli/modules/generate/... -v` を実行 → 全テスト PASS、特に `TestGenerateInstallsClaudeSkill` が緑

---

## Dependencies
- Requires: process-01
- Blocks: -（process-03 と並列実行可能だが、衝突回避のため逐次実行推奨）
