# Process 201: docs 個別更新（cli/lsp/mcp/rag/lint/architecture）

## Overview
docs/ 配下の各仕様書に Go 実装の事実を反映する。Why: README だけでは深いユースケースをカバーできない。

## Affected Files
- `docs/cli.md` (既存 L1-330): Go コマンド一覧と実装場所、性能改善メモ
- `docs/lsp.md` (既存 L1-754): Go 実装の起動シーケンス、providers 一覧、textsync 詳細
- `docs/mcp.md` (既存 L1-259): tools/resources/prompts の Go 実装一覧
- `docs/rag.md` (既存 L1-416): exporter/chunker/indexer の Go 実装、incremental の挙動
- `docs/lint.md` (既存 L1-749): textlint adapter の Go 実装、availability 挙動
- `docs/architecture.md` (Process 01 / 200 と整合)

## Implementation Notes
- 各ドキュメントに `## Go Implementation` セクションを追加
- ファイルパスは internal/* を明示（読者がコードへ飛べるように）
- 互換性: TS 時代の API シグネチャと Go 実装の差分を表で示す（破壊的変更あれば明記）
- 削除: 廃止された TS 固有手順（deno compile, src/cli からの直接実行 等）

---

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] docs 内の古いパス参照（src/cli/modules/...）を grep 抽出

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] cli.md / lsp.md / mcp.md / rag.md / lint.md 更新
- [ ] architecture.md と整合性チェック
- [ ] markdown lint pass

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] 各ドキュメントに目次 / 相互リンク
- [ ] サンプル実行例の動作確認スクリプト化

✅ **Phase Complete**

---

## Dependencies
- Requires: 50, 200
- Blocks: 300
