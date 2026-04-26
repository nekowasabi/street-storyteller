# Process 200: 移行ドキュメント更新

## Overview

要件整理、移行方針、契約テスト、未決事項を実装者が別セッションで追える形に整える。

## Affected Files

- `docs/migration/go-rearchitecture-requirements.md:1` - 要件整理本体
- `PLAN.md:1` - 軽量サマリー
- `plan/process-*.md` - 詳細手順
- `README.md:1` - Go版導入後の案内更新候補
- `docs/cli.md:1` - CLI差分更新候補
- `docs/lsp.md:1` - LSP差分更新候補
- `docs/mcp.md:1` - MCP差分更新候補
- `docs/rag.md:1` - RAG差分更新候補

## Implementation Notes

- `go-rearchitecture-requirements.md` は調査資料として残し、実装手順は `PLAN.md`
  と `plan/` を正にする。
- Ask User Questions の回答が得られたら、未決事項を決定事項へ移す。
- README/docs は Go版が実際に使える段階まで大きく書き換えない。

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] docs link check または markdown lint を設定
- [ ] 未決事項が残っている場合のチェック項目を作る
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] 要件整理にユーザー回答を反映
- [ ] PLAN/Process の進捗を更新
- [ ] CLI/LSP/MCP/RAG docs の変更タイミングを記録
- [ ] migration FAQ を追加
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] 重複説明を削減
- [ ] 参照リンクを絶対/相対で整理
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies

- Requires: 100
- Blocks: 300
