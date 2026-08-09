# Process 200: ドキュメント整備と E2E 検証

## Implementation Brief（コピペ用）

- **背景**: process-01〜03 で実装が完了したが、ユーザー観測面（CLI ドキュメント・CHANGELOG・プロジェクトガイド）が未追従。pilot プロジェクトでの E2E 検証も未実施で、本番相当の動作確認が必要。
- **目的**: 公開ドキュメントを実装に追従させ、pilot プロジェクトで E2E 動作確認を完了する。`scripts/sync_skills.sh --check` の CI 推奨を README に明示する。
- **変更範囲**:
  - `docs/cli.md` — update セクション（行 113-124 周辺）を新仕様で拡張
  - `CHANGELOG.md` — Unreleased セクションに Features 追加
  - `CLAUDE.md` — 「進行中の機能開発」に skills/workflow 同期機能を追記
  - `README.md` — Commands at a glance（行 145-160 周辺）に `update --sync-*` 追記（条件付き必須）
  - `~/words/transporter/pilot` — E2E 確認実環境（リポジトリには含めない秘匿対象）
- **参照する定数**（PLAN-sync-skills.md ★ Constants 表）:
  - `SKILLS_DEPLOY_DIR`
  - `WORKFLOW_DEPLOY_FILE`
- **禁止事項**（PLAN Don'ts より）:
  - 数値・文字列リテラルを ★ Constants と二重定義しない（ドキュメントでも極力 PLAN への参照とする）
- **出力順序**:
  1) `deno task build` で最新バイナリ生成
  2) pilot で E2E 検証（成功条件を満たすことを確認）
  3) `docs/cli.md` 更新
  4) `CHANGELOG.md` Unreleased セクション更新
  5) `CLAUDE.md` の「進行中の機能開発」更新
  6) `README.md` Commands at a glance 更新（任意条件成立時のみ）
  7) `deno task check` 実行で品質ゲート

---

## Overview

ドキュメント整備フェーズ。新フラグの仕様・JSON スキーマ・後方互換性・CI 推奨手順をユーザー向けドキュメントに反映する。並行して pilot プロジェクトで E2E 検証を実施し、本機能のリリース準備を完了する。

## Affected Files

| パス | 種別 | 変更内容 |
|------|------|---------|
| `docs/cli.md` | 修正 | `update` セクションを 30〜50 行程度拡張、JSON サンプル付きで `--sync-skills` / `--sync-workflow` / `--check` 仕様を記述 |
| `CHANGELOG.md` | 修正 | Unreleased に `### Features` 追加（2 エントリ: skills 同期、workflow 同期） |
| `CLAUDE.md` | 修正 | 「進行中の機能開発」または「アクティブな仕様」セクションに「skills/workflow 配布更新機能」を追加 |
| `README.md` | 修正（条件付き） | Commands at a glance に `update --sync-skills` / `--sync-workflow` を 1〜2 行で追加 |
| `~/words/transporter/pilot/` | 検証用 | E2E 実行先（リポジトリには含めない） |

## Implementation Notes

### docs/cli.md 追記例（雛形）

```markdown
### storyteller update

`storyteller update [--path <dir>] [--check] [--json] [--sync-skills] [--sync-workflow]`

プロジェクトの manifest (`.storyteller.json`) を検証し、必要に応じて
embedded skills や WORKFLOW.md を再配布します。

#### サブコマンド

| フラグ | 効果 |
|--------|------|
| (なし) | manifest 検証 + `.storyteller-go-ready` sentinel 作成（既存挙動） |
| `--sync-skills` | `.claude/skills/` 配下に embedded skills を再配布（既存ファイルは無条件上書き） |
| `--sync-workflow` | `WORKFLOW.md` を embedded 正本で上書き |
| `--check` | 書き込みなしで差分を列挙（dry-run）。任意のフラグと併用可 |
| `--json` | 機械可読出力（後述スキーマ） |

#### JSON スキーマ

フラグなし時（後方互換）:
\`\`\`json
{"ok": true, "path": "/path/to/project"}
\`\`\`

`--sync-skills` 単独:
\`\`\`json
{"ok": true, "path": "...", "target": "skills",
 "synced": [".claude/skills/storyteller/SKILL.md"],
 "unchanged": []}
\`\`\`

`--sync-skills --sync-workflow` 同時:
\`\`\`json
{"ok": true, "path": "...", "results": [
    {"target": "skills", "synced": [...], "unchanged": [...]},
    {"target": "workflow", "synced": [...], "unchanged": [...]}]}
\`\`\`

#### 注意

- 既存の `.claude/skills/*` カスタマイズは **上書きで失われます**。事前に
  `--check` で差分を確認してください。
- バックアップ機能は意図的に提供していません（embedded 正本から再生成可能）。
```

### CHANGELOG.md 追記例

```markdown
## Unreleased

### Features
- `storyteller update --sync-skills`: embedded skills を既存プロジェクトの
  `.claude/skills/` に再配布できるようになりました。
- `storyteller update --sync-workflow`: embedded WORKFLOW.md をプロジェクト
  ルートに再配布できるようになりました。
- 内部リファクタ: `internal/assets/` パッケージを新設し、skills と WORKFLOW.md
  の `go:embed` 所有権を共通化しました（generate も同パッケージを参照）。
```

### CLAUDE.md 追記例

「進行中の機能開発」配下に新セクション:

```markdown
### N. update --sync-skills / --sync-workflow（embedded アセット同期） - 実装済み

generate 後の既存プロジェクトに対しても embedded skills と WORKFLOW.md を
再配布できる機能。
- `storyteller update --sync-skills` で `.claude/skills/` を再同期
- `storyteller update --sync-workflow` で `WORKFLOW.md` を再配布
- `--check` で書き込みなしの dry-run、`--json` で機械可読出力
詳細は `docs/cli.md` を参照。
```

### pilot E2E チェックリスト

1. `deno task build` で全プラットフォーム ビルド成功
2. `~/words/transporter/pilot` の現状 SKILL.md と embedded 正本の差分を `--check --json` で確認
3. `./dist/darwin_arm64/storyteller update --path ~/words/transporter/pilot --sync-skills --json` 実行
4. `~/words/transporter/pilot/.claude/skills/storyteller/SKILL.md` が `skills/storyteller/SKILL.md` と diff ゼロ
5. `./dist/darwin_arm64/storyteller update --path ~/words/transporter/pilot --sync-workflow` 実行
6. `~/words/transporter/pilot/WORKFLOW.md` が `WORKFLOW.md` と diff ゼロ
7. 連続再実行で `unchanged` 分類に切り替わることを確認（冪等性）

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] 本 Process はドキュメント中心のため、新規ユニットテストは追加しない
- [ ] 代わりに **pilot E2E チェックリスト** をテストプロトコルとして扱い、各項目で期待値との差分を Red ⇒ Green で確認する

✅ **Phase Complete**

---

## Green Phase: 実施と確認

- [ ] ブリーフィング確認
- [ ] `deno task build` 実行 → 5 プラットフォーム分のバイナリ生成成功
- [ ] pilot E2E チェックリスト全項目 PASS
- [ ] `docs/cli.md` の `update` セクション更新
- [ ] `CHANGELOG.md` Unreleased セクション更新
- [ ] `CLAUDE.md` の進行中機能セクション更新
- [ ] `README.md` Commands at a glance 更新（任意条件: コマンド表が更新されているなら必須）
- [ ] `deno task check` 全項目緑

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] ドキュメント内で `★ Constants` の値を直接ハードコードしている箇所がないか確認（パス文字列は許容、数値リテラルは要参照）
- [ ] 文言を簡潔に（冗長な説明を圧縮）
- [ ] サンプル JSON が実際の出力と一致するか手動検証で確認

✅ **Phase Complete**

---

## Manual Verification（手動検証シナリオ）

1. ドキュメント差分プレビュー: `git diff docs/cli.md CHANGELOG.md CLAUDE.md README.md` を実行 → 差分が意図したセクションのみに局所化
2. pilot E2E 全 7 項目完了
3. `deno task check` を実行 → 全フェーズ緑

---

## Dependencies
- Requires: process-03（実装完了後でないと E2E できない）
- Blocks: process-300
