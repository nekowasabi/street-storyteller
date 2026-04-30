# Process 100: go vet/staticcheck 緑化

## Overview
リネーム後の Go コードベース全体で go vet と staticcheck が緑になることを確認

## Affected Files
全 Go ファイル（cmd/*, internal/*）

## Implementation Notes
- go vet ./... が exit 0
- staticcheck ./... で警告なし（または既存警告と同数）
- go test ./... が緑
- リネーム残骸（旧 Subplot 型参照など）による linter 警告の排除

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] go vet ./... を実行して現在の状態を記録
- [x] staticcheck ./... を実行して現在の状態を記録
- [x] 既存リネームミスに由来する警告を特定

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] 残存リネームミス（旧 Subplot 型、旧フィールド名など）をグローバル検索で修正
- [x] go vet ./... が exit 0 になることを確認
- [x] staticcheck ./... が警告なしになることを確認
- [x] go test ./... が緑であることを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] コード品質チェック（未使用インポートなど）
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 2, 3, 4, 5, 6, 7
- Blocks: -
