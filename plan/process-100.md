# Process 100: 品質ゲートとCI設計

## Overview
Go移行後の品質ゲートを設計し、速いユニットテストと遅い統合/外部依存テストを明確に分ける。

## Affected Files
- `deno.json:5` - 現行 task と品質ゲート
- `.github/workflows/*` - CI が存在する場合の更新対象
- `scripts/coverage_threshold.ts` - 現行 coverage gate の参考
- `docs/migration/go-rearchitecture-requirements.md:195` - 推奨テスト階層
- `PLAN.md` - Overall 進捗更新対象

## Implementation Notes
- CI は最小でも次を分ける。
  - `go test ./...` default fast tests
  - `go test -tags=integration ./...`
  - `go test -tags=external ./...` は手動/夜間/明示条件
  - `deno task test` は移行期間の互換ゲートとして残すが、長時間群を分離する
- coverage は Go と Deno で別集計にする。

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] CI定義が存在しない/古い場合に失敗するチェックを作る
- [ ] default test で external tag が混入したら失敗するチェックを作る
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] Go用 test/lint/build task を追加
- [ ] integration/external test の実行経路を分離
- [ ] coverage の閾値方針を決める
- [ ] CI workflow を更新
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] ローカル開発用の短いコマンド名を追加
- [ ] CI失敗時のログを読みやすくする
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 4, 5, 10, 11
- Blocks: 200
