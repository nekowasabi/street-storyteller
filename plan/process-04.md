# Process 4: CLI段階移行

## Overview
Go版 CLI を `storyteller-go` として段階的に実装し、現行 Deno CLI の出力契約と exit code を比較しながら置き換える。

## Affected Files
- `src/cli.ts:25` - 現行CLIの起動・設定・ログ初期化
- `src/cli/modules/index.ts:12` - CLI command registry
- `src/cli/output_presenter.ts:9` - console/json presenter
- `src/cli/modules/generate.ts` - generate の参考
- `src/cli/modules/meta/index.ts` - meta group の参考
- `src/cli/modules/lsp/validate.ts` - lsp validate の参考
- `src/cli/modules/rag/index.ts` - RAG CLI の登録判断対象
- `src/cli/modules/migrate/index.ts` - migrate CLI の登録判断対象

## Implementation Notes
- 初期対象は `version`, `meta check`, `lsp validate`, `view character --json` のような副作用が小さいコマンドから始める。
- JSON出力は script/CI 契約なので先に固定する。
- Go CLI は domain/project/meta service を呼び、直接 parser を持たない。
- `rag` と `migrate` は Process 1 の決定に従って登録対象を確定する。

---

## Red Phase: テスト作成と失敗確認

- [ ] ブリーフィング確認
- [ ] CLI Golden Test を作成
  - stdout/stderr
  - exit code
  - JSON output
  - unknown command/help
- [ ] 現行 Deno CLI と Go CLI の差分比較テストを作る
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [ ] `cmd/storyteller` に Cobra等を使わない薄い command registry を実装
- [ ] global option と config/logging の最小実装
- [ ] `version`, `meta check`, `lsp validate` の順で実装
- [ ] JSON presenter を実装
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [ ] CLI handler から I/O を注入可能にする
- [ ] command descriptor と help 生成を整理
- [ ] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 2, 3, 10
- Blocks: 100
