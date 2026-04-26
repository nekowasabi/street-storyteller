# Process 11: Phase 5b go.mod 整理・vendoring 検討

## Overview
Go 依存関係を最終確定する。Why: Process 02-08 で追加された依存（あれば）を整理し、再現可能ビルドを保証する。

## Affected Files
- `go.mod` (既存): require / replace の整理
- `go.sum` (既存/再生成): go mod tidy
- `vendor/` (任意): vendoring 採用時のみ
- `.github/workflows/ci.yml`: vendoring 採用時はキャッシュ戦略変更

## Implementation Notes
- Why: 移植完了後にまとめて整理する方が、フェーズ中の依存追加判断を妨げない
- 現状: go.mod は stdlib のみ（go 1.25.0）
- 判断ポイント:
  - tree-sitter-typescript 採用なら CGO 依存追加（Process 02 の結果次第）
  - JSON-RPC 自前 vs ライブラリ（go-jsonrpc 等）
  - LSP プロトコル: 自前 vs `go.lsp.dev/protocol`（ただし依存重い）
- vendoring の判断:
  - 採用利点: ネット切断環境ビルド可、依存上書き対策
  - 不採用利点: リポジトリサイズ削減、CI 単純化
  - 推奨: 依存数 < 10 なら vendoring 不要

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 依存リスト棚卸し（go list -m all）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] go mod tidy
- [x] go mod verify
- [x] go build ./... 成功確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] govulncheck 未導入を確認（外部依存なし、go mod verify で代替）
- [x] go.work（マルチモジュール）の必要性評価

✅ **Phase Complete**

---

## Dependencies
- Requires: 10
- Blocks: 12
