# Wave-A3 パターン: 共有契約 pre-commit + 3-way worktree 並列実装

## カテゴリ

戦略パターン

## 重要度

high

## 作成日

2026-04-26

## ソース

mission-20260426-084012-2746861-005 (Process 04/05 TDD 実装)

## 教訓内容

共通契約 (types.go / protocol.go) を main の `wave-pre` commit (b65edf1)
に先入れし、3 つの disjoint scope (CLI / LSP / MCP+textlint) の worktree
でファイル衝突ゼロの並列 TDD 実装を実現する。

### ステップ

1. `wave-pre` commit に shared contract ファイルを先に main へコミット
2. 3 worktree を同じ base commit から作成 (全 WT で base 一致)
3. 各 WT で disjoint scope のパッケージを実装 (cross-WT import 禁止)
4. sequential merge with `--no-ff` で依存順にマージ (CLI → LSP → MCP)

### 重要な補足

- 共有契約のバグ (Error() メソッド漏れ等) は各 WT で個別修正しても sequential
  merge で透過的に吸収できる
- worktree のパッケージ境界を厳格に分離することで 3-way merge の base
  が一致し衝突ゼロを保証

## 適用すべき場面

- 3 つ以上の disjoint scope が並列実装可能なとき
- 共有契約 (types/protocol) が事前に確定しているとき

## 適用を避けるべき場面

- scope が線形に依存する場合
- 共有契約が確定していない場合

## 関連教訓

- lsp-mcp-protocol-error-method (wave-pre checklist)
- subagent-sandbox-go-deny (go ツールチェーン制約)
