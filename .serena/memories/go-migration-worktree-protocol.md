# Worktree 並列実行 protocol (失敗から学んだ知見)

## 起動時 prompt 必須項目

agent spawn の prompt 末尾に以下を必ず含める:

- "全作業を worktree 内 cwd で実施し、main repo を変更しないこと"
- 開始時に `pwd` + `git rev-parse --abbrev-ref HEAD` + `git status` で位置確認
- 完了時は worktree branch に必ず commit (commit 無し worktree は merge 不能)

## ファイルスコープ分離

- 各 worktree が触るファイル集合を disjoint にする (新規ディレクトリ単位で割当)
- 共通 refactor は別 wave (例: Wave-A2-pre WT-A2p-6) にまとめる

## Base 同期

- 起動時の worktree branch HEAD が古い base を指していたら agent 側で
  `git reset --hard main` を許可
- merge 時に merge-base を確認。古い base のままだと逆方向の差分が出る →
  必要なら rebase main → merge --no-ff

## Merge protocol

- 順次 `--no-ff` merge、各段階で `go build ./...` を必ず通す
- 失敗即停止、`reset --hard HEAD~1` で局所 revert

## Recovery (isolation 破綻時)

1. main 上に直接 commit が積まれた場合:
   - safety branch を切る (例: `backup-pre-A2main-recovery`)
   - 各 commit を recovery branch 化 (`git branch wt-X-recovery <hash>`)
   - main を base に reset --hard
   - recovery branch を順次 --no-ff merge し直す → graph 一貫性回復
2. main 側に leak した untracked ファイルが worktree branch tip
   と完全一致するなら削除して OK

## Cleanup

- `git worktree unlock` → `git worktree remove --force` →
  `git branch -D <wt-branch>`
- safety branch は次サイクル後まで保持

---

## Wave-A3 で得た新知見

### Sandbox 制約 → 親セッション検証フロー

- subagent 環境では `go test`, `go vet`, `go build` が **sandbox
  によりブロックされる**ことが Wave-A3-main で判明
- 対処: subagent は実装と worktree commit
  までを担当し、**ビルド/テスト検証は親セッションで実行**するフローを確立
- subagent prompt には「最終 `go test ./...` は親側で行う前提で commit
  せよ」を明示
- これにより subagent
  失敗時でも親が同一コードを再検証でき、原因切り分けが容易になる

### disjoint files 戦略の実例 (Wave-A3-main 3-way 並列)

- WT-A3-main-1: `internal/meta/frontmatter*.go` (FrontMatter Parser/Editor)
- WT-A3-main-2: `internal/detect/position*.go` (UTF-16 PositionTable)
- WT-A3-main-3: `internal/detect/reference*.go` (Reference Detection /
  Confidence)
- 共有契約は **Wave-A3-pre (693fdb0) で先行確定** (`internal/detect/types.go` +
  各 doc.go)
- 結果: 3 worktree が同時進行しても merge conflict ゼロ、`--no-ff` 順次 merge で
  graph 一貫性維持

### 統合コア確立後の後続正規化 refactor (Cycle 2 / Wave-A3-post / Refactor)

- Wave-A3-main で確立した **`Detect()` 4-stage pipeline
  契約**は壊さず、後続で以下の正規化が安全に追加できた:
  - Cycle 2 (4fd5e7c): SourceLocation を PositionTable 経由に統一、speculative
    field 廃止
  - Wave-A3-post (cce38d3, 3576240): emitter Golden test、validation preset
    読み込み口
  - Refactor (3b8b3b5): doc.go で「meta→detect
    一方向依存」を契約宣言、apperrors.Code* 統一
- 教訓: **共有契約 (types.go + doc.go) を pre フェーズで先に commit
  する**ことで、後続の正規化・Refactor
  が「契約変更」ではなく「契約遵守の補強」として実施できる
