# Process 300: OODA実行管理

## Overview
長期移行を小さな観察・判断・実装・検証サイクルで管理し、計画が実装実態から乖離しないようにする。

## Affected Files
- `PLAN.md:1` - Progress Map 更新
- `plan/process-*.md` - Process 完了状態更新
- `docs/migration/go-rearchitecture-requirements.md:1` - 調査・決定事項更新
- `tests/*` - 互換性と回帰の観測対象
- `samples/*` - ユーザー視点の動作確認対象

## Implementation Notes
- 各 Process 完了時に次を更新する。
  - PLAN の Status と Overall
  - 実行したコマンド
  - 残ったリスク
  - 次の Process の前提
- OODA の判断基準:
  - 契約テストが増えているか
  - 外部依存が通常テストから外れているか
  - Go実装が既存 TS 実装と差分比較できているか

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] Process 完了時の更新漏れを検出するチェックを作る
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] 完了チェックリストを運用
- [ ] 実装差分と契約テスト結果を記録
- [ ] 次サイクルの優先順位を更新
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] 計画と実装の差分を整理
- [ ] 不要になった Process を archive 候補にする
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 200
- Blocks: -
