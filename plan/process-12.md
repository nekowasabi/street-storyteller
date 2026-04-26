# Process 12: Phase 5c バイナリ検証（クロスコンパイル）

## Overview
go build によるクロスコンパイルを検証し、deno compile からの完全移行を確定する。Why: 配布フェーズ (50) の前提。

## Affected Files
- `scripts/build.sh` (新規): GOOS x GOARCH マトリクスでビルド
- `scripts/check_binary.sh` (新規): サイズ / 起動時間 / smoke test
- `Makefile` または `Taskfile.yml` (任意)
- `deno.json` tasks: cli:compile を deprecated 表示に

## Implementation Notes
- ターゲット:
  - linux/amd64, linux/arm64
  - darwin/amd64, darwin/arm64
  - windows/amd64
- ビルドフラグ:
  - `-ldflags="-s -w"` でバイナリ縮小
  - `-trimpath` で再現性向上
  - バージョン埋め込み: `-X main.version=$(git describe --tags)`
- サイズ目標: <50MB（CGO 不使用なら通常 10-20MB に収まる）
- smoke test: `./storyteller version` / `./storyteller meta check samples/cinderella`

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] build.sh 実行 → 全プラットフォーム成功

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] scripts/build.sh 実装
- [x] check_binary.sh で smoke test
- [x] 各バイナリ <50MB 確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] CI で nightly build job 追加検討
- [x] バイナリ署名（macOS notarization, Windows code signing）の方針

✅ **Phase Complete**

---

## Dependencies
- Requires: 11
- Blocks: 100, 101
