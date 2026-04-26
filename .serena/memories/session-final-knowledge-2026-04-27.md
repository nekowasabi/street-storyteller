# 2026-04-27 セッション総括: Process 50-300 完遂と知見

## セッション概要
- 期間: 2026-04-26 ～ 2026-04-27
- スコープ: Process 50 (配布) / 100 (bench) / 101 (coverage) / 200 (README) / 201 (docs) / 300 (振り返り)
- 実行モード: --use-dag --worktree --multi-llm --strict-cycle で並列ウェーブ実行
- 結果: PLAN.md 19/19 completed 達成

## 主要パターン

### 1. 4分割論理コミット戦略 (Process 300 で確立)
振り返り系成果物は次の順で 4 コミットに分割：
1. retrospective 本体 (docs/)
2. memory 系永続化 (.serena/memories + ai/knowledge)
3. stigmergy ナレッジ追記
4. PLAN/RESULT のステータス確定

理由: `git log --oneline` 読了だけで構造が把握でき、後の cherry-pick も独立実行可能。

### 2. deno fmt の Markdown 除外パターン
deno は TS/JSON 専用ツール。CI で deno fmt が Markdown に介入すると
日本語版 Markdown のフォーマットが破壊される。

対策: `deno.json` の `fmt.exclude` に `**/*.md` と `.kiro/` を追加。
これで CI の deno fmt は authoring TypeScript のみを対象とする。

### 3. バイナリ命名のディレクトリベース化
- Before: `storyteller_linux_amd64`, `storyteller.exe` 等のフラット命名
- After: `${OUT_DIR}/${OS}_${ARCH}/storyteller(.exe)` のディレクトリ構造

理由: Homebrew / install.sh から相対参照しやすく、
将来の checksums.txt 管理も簡潔になる。

### 4. coverage 70% gating の段階的引き上げ計画
Wave 1 (Process 101) で 64.2% → 72.5% に引き上げ、
70% 閾値を CI で強制。次フェーズで 75 → 80% に段階引き上げる。

理由: 一気に 80% を強制すると新規実装ブロッカーになるため、
quality gate は段階導入が現実的。

## 委譲・並列実行で得た教訓

### Wave 並列における CI conflict 回避
Wave 1 で Process 100 (bench job) と Process 101 (THRESHOLD env)
が両方 .github/workflows/ci.yml を編集 → コンフリクト発生。

対策: 同一ファイルを編集する Process は別 Wave に分け、
あるいは parent でマージ責任を負う。

### docs/architecture.md の anchor 必須要件
Process 200 が docs/architecture.md を全面書き換え → 既存 guard test 破壊。
Process 201 で正規 anchor (Layer 1: Go Processing Engine /
Layer 2: TypeScript Authoring Surface / E2E Minimalism) を復元。

教訓: アーキテクチャドキュメントには guard test が紐付くため、
書き換え前に必ず `architecture_guard_test` の expectation を確認する。

## 配布チャネル設計 (Process 50)
4 経路を並列確立：
1. curl pipe → install.sh
2. Homebrew → Formula/storyteller.rb (placeholder sha256 を最初のリリースで埋める)
3. Manual → GitHub Releases tar.gz/zip + sha256 checksums
4. Source → go install / scripts/build.sh

## 次セッションへの引き継ぎ
- Homebrew tap repo の公開 (中期)
- scripts/uninstall.sh 実装 (短期)
- bench 自動回帰検出を CI に組み込み (中期)
- coverage 75% → 80% 段階引き上げ (中期)
