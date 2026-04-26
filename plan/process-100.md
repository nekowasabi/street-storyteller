# Process 100: 品質ゲート - 性能ベンチマーク（LSP <2s / CLI <100ms）

## Overview
Go 移植の主動機である起動性能を計測し、目標達成を SLA として定着させる。Why: 性能を計測しなければ Go 化の正当性を検証できない。

## Affected Files
- `scripts/bench/bench_cli.sh` (新規): CLI 起動時間計測（version/help/meta check/view --help）
- `scripts/bench/bench_lsp.sh` + `scripts/bench/lsp_client.go` (新規): LSP initialize ラウンドトリップ計測
- `docs/benchmarks.md` (新規): 計測方法・環境・結果・再現手順
- `.github/workflows/ci.yml`: `bench` job 追加（`workflow_dispatch` 限定）

> 当初案の `bench_memory.sh` / `performance-report.md` / MCP 計測 / RSS 計測は YAGNI で見送り。
> 現時点の主目的は LSP <2s / CLI <100ms ゲート確認のみ。必要発生時に追加する。

## Implementation Notes
- 計測指標:
  - CLI: `time storyteller version`、`time storyteller meta check samples/cinderella` の中央値（5 回）
  - LSP: stdio に initialize → initialized → exit を送って完了までの時間
  - MCP: 同上
  - メモリ: 常駐 LSP の RSS（30 秒アイドル時）
- 目標:
  - CLI: < 100ms
  - LSP startup: < 2s
  - MCP startup: < 1.5s
  - LSP RSS: < 50MB
- 比較: Deno 実装の同等計測値を旧 git tag から取得し対比表に
- 環境依存性: GitHub Actions runner（ubuntu-latest）固定で再現性確保

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] スクリプト雛形作成、目標未達なら exit 1（bench_cli.sh / bench_lsp.sh とも `mean > TARGET_MS` で非ゼロ終了）
- [x] Deno 旧版との比較は docs/benchmarks.md に既知値（CLI 100–300ms / LSP 3–5s）として記載。実測再現は YAGNI で見送り

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] bench_cli.sh / bench_lsp.sh + lsp_client.go 実装
- [x] 計測実施、目標達成確認（CLI: 約 1.6–1.9 ms / <100 ms、LSP initialize: 約 1 ms / <2000 ms — いずれも PASS）
- [x] docs/benchmarks.md に表形式で記録

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 未達ケースなしのため最適化はスキップ（lazy init / cache 等は現時点で不要）
- [x] CI に bench job を `workflow_dispatch` 限定で追加（共有 runner の数値ばらつきが PR ゲートに耐えないため定期実行ではなく手動）
- [x] README バッジは見送り（数値ばらつきが大きく誤解を招くため、docs/benchmarks.md からのリンクに留める）

✅ **Phase Complete**

---

## Dependencies
- Requires: 12
- Blocks: 50
