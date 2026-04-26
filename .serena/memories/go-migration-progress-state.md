# Go 移行 process 進捗 (as of 2026-04-26)

## 完了

- ✅ process-01: 契約固定とデータ形式決定
- ✅ process-02: Go domain + Project Loader 基盤 (T2-1〜T2-12 全完)
- ✅ process-03: Meta/Reference 検出基盤 (Wave-A3 完了:
  frontmatter/position/reference + emitter + preset + 共通コア整備)

## 部分完了

- 🟡 process-11: testkit (clock/process/transport) 完了。lint guard / test tag /
  長時間テスト一覧は未着手

## 未着手 (DAG 上 unblocked)

- process-04: CLI 段階移行 (process-03 完了で解放)
- process-10: 契約・回帰テスト整備 (process-01 完了で解放)

## 未着手 (依存待ち)

- process-05 (← process-04)
- process-100 (← process-10/11)
- process-200 (← process-100)
- process-300 (← process-200)

## Wave-A3 commit hash 一覧

- **Wave-A3-pre**: 693fdb0 (共有契約: internal/detect/types.go,
  internal/meta/doc.go)
- **Wave-A3-main** (3 並列 worktree merge):
  - 70a929c Merge wt-A3-main-1 (FrontMatter Parser & Editor) ← 72e0fd2
  - 43b48e2 Merge wt-A3-main-2 (UTF-16 PositionTable) ← f728e99
  - bf9b554 Merge wt-A3-main-3 (Reference Detection & Confidence) ← 9dc0e50
- **Cycle 2**: 4fd5e7c (SourceLocation を PositionTable
  経由に正規化、TestDetect_MultilineLocation 追加)
- **Wave-A3-post**:
  - ed335a8 Merge emitter ← cce38d3 (.meta.ts emitter Golden test 8 PASS)
  - 9b0a63e Merge preset ← 3576240 (validation preset 読み込み口、4 種固定 +
    ListPresets)
- **Refactor**: 3b8b3b5 (internal/{detect,meta}/doc.go 整備 + apperrors.Code*
  統一 + CodeMalformedFile 追加)

## 既知のブロッカー

1. tsparse 拡張: real sample (.ts) は型注釈付きで現状 parse 不能。process-04
   で拡張 or migrate-data 経由 JSON 化を判断
2. StringOrFileRef MarshalJSON/UnmarshalJSON: TS round-trip 用に未実装
3. ForeshadowingDetectionHints / SubplotDetectionHints: domain 構造体未追加
4. CharacterPhase 階層走査: src/characters/<id>/phases/ は v1 で対象外

## ブランチ状態

- main HEAD: 3b8b3b5 (refactor: 共通コアの doc.go 整備とエラーコード統一)
- backup-pre-A2main-recovery: 不要なら削除可
- worktree-agent-ad9f2b68: main 到達済みの古い残骸 (削除可)
