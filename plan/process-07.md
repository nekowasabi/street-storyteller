# Process 07: Phase 3d RAG（廃止）

## Overview
RAG 機能は廃止する。Go 移植、CLI サブコマンド、CI job、Deno task は追加しない。

## Affected Files
- `src/rag/`: Process 09 で runtime TS として削除
- `internal/rag/`: 作成しない
- `internal/cli/modules/rag/`: 作成しない
- `deno.json`: RAG task を公開しない
- `.github/workflows/ci.yml`: RAG job を公開しない

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] RAG コマンドが registry に登録されないことを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] RAG Go 実装を追加しない
- [x] CLI/CI/deno task に RAG 経路を公開しない
- [x] go test ./... 全 green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] inventory で `src/rag` を retired として記録
- [x] Process 04-08 の移植順から RAG を除外

✅ **Phase Complete**

---

## Dependencies
- Requires: 03
- Blocks: 09
