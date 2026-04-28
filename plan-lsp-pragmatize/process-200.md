# Process 200: docs/lsp.md の Go 移植セクション更新

## Overview
storyteller LSP の Go 移植版が「使える」状態になったことをドキュメントに反映する。Provider 構成、起動フロー、Neovim での `,cd` `,ck` 等の動作確認手順を追加する。

## Affected Files
- `docs/lsp.md` （Go 移植セクション追加 or 既存セクション差し替え）
- `docs/architecture.md` （二層構造の現在地を簡潔に追記、必要なら）
- `CLAUDE.md`（プロジェクトルート）の「LSP統合機能」節に Go 移植が完了した旨を 1-2 行追記

## Implementation Notes
- 追加ブロック例:
  - 「Server Options の構築フロー（CWD or --root → NewServerOptions → Catalog/Lookup/Locator/Aggregator）」
  - 「Neovim での確認手順（`samples/cinderella/manuscripts/chapter01.md` を開き、`シンデレラ` にカーソルを合わせて `,cd` でコードジャンプ）」
  - 「semantic tokens の token types / modifiers 一覧」
- Process 04 で残した「Process 05 で復活予定」コメントは Process 05 完了後なので削除

## Red Phase: テスト作成と失敗確認
- [ ] ブリーフィング確認
- [ ] チェックリスト: 期待される確認手順がすべて再現可能であること（手動 walkthrough）
- [ ] 期待される項目をリストアップ

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [ ] ブリーフィング確認
- [ ] `docs/lsp.md` の Go 移植セクション更新
- [ ] CLAUDE.md の関連節 1-2 行追記
- [ ] 手動 walkthrough で記述どおりに動くか確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [ ] 文体・用語ゆれを修正（textlint 通過）
- [ ] 関連 docs からのリンク追加

✅ **Phase Complete**

---

## Dependencies
- Requires: 100
- Blocks: 300
