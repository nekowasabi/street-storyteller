# Subagent サンドボックス制約: go ツールチェーン拒否

## カテゴリ

ツール制約 / 落とし穴

## 重要度

high

## 作成日

2026-04-26

## ソース

mission-20260426-084012-2746861-005 (Process 04/05 TDD 実装)

## 教訓内容

doctrine-executor-heavy / executor-light は Bash サンドボックス上で
`go build`、`go test`、`go vet` などの go ツールチェーンが permission deny
されることがある。一方 `git -C` は許容される。

### 影響

- subagent は「ファイル書き込み + git ファイル操作」までしかできず、Green
  確認は親セッションで代行が必要
- TDD 規律 (Green 確認後 commit) を守るため subagent が commit
  を保留する判断は適切 (medium confidence)

### 対応戦略

- 親セッション側で `cd <worktree> && go test ./...` で検証 → commit する 2
  段階戦略を採る
- `.claude/settings.json` の `permissions.allow` に `Bash(go -C *)`
  を追加することで根本解決可能

## 適用すべき場面

- Go プロジェクトで subagent に TDD 実装を委譲するとき
- subagent が go ツールチェーン実行に失敗したとき

## 関連教訓

- wave-a3-pattern (worktree 並列戦略)
- inprocess-golden-test-strategy (sandbox 回避 alternative)
