# Process 100: 品質ゲート - 性能ベンチマーク（LSP <2s / CLI <100ms）

## Overview
Go 移植の主動機である起動性能を計測し、目標達成を SLA として定着させる。Why: 性能を計測しなければ Go 化の正当性を検証できない。

## Affected Files
- `scripts/bench_startup.sh` (新規): CLI / LSP / MCP の起動時間計測
- `scripts/bench_memory.sh` (新規): RSS 計測（ps / /usr/bin/time -v）
- `docs/performance-report.md` (新規): 計測結果と Deno との比較
- `.github/workflows/bench.yml` (新規, 任意): 定期計測

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
- [ ] ブリーフィング確認
- [ ] スクリプト雛形作成、目標未達なら exit 1
- [ ] Deno 旧版の計測値を pre-ts-retire tag から取得

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] bench_startup.sh / bench_memory.sh 実装
- [ ] 計測実施、目標達成確認
- [ ] performance-report.md に表形式で記録

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] 未達の場合: lazy init / cache / 並列初期化で最適化
- [ ] CI に bench.yml 追加（週次）
- [ ] 結果を README にバッジ表示

✅ **Phase Complete**

---

## Dependencies
- Requires: 12
- Blocks: 50
