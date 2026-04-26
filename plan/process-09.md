# Process 09: Phase 4 TS src/ retire（authoring 以外削除）

## Overview
Go 移植が完了したモジュール（src/cli/modules, src/lsp, src/mcp, src/rag）を src/ から削除する。Why: 二重実装の削減と保守性向上。authoring surface（src/type 等）は不変で残す。

## Affected Files
### 削除対象
- `src/cli/modules/**` (~43 files)
- `src/cli.ts` （エントリ。代わりに cmd/storyteller/main.go）
- `src/lsp/**` (~41 files)
- `src/mcp/**` (~58 files)
- `src/rag/**` (~15 files)
- `src/application/**`, `src/infrastructure/**`, `src/plugins/**`（Go へ吸収済み部分）
- 対応する `tests/` 配下 TS テスト

### 保持対象（不変）
- `src/type/**`
- `src/characters/**`, `src/settings/**`, `src/timelines/**`, `src/foreshadowings/**`
- `src/domain/`（authoring に必要な型のみ。実装ロジックは Go へ移行済み）
- `src/shared/`（authoring 補助の小ユーティリティのみ）
- `samples/**/src/**`

### 更新対象
- `deno.json`: imports / exclude / tasks の整理
- `.gitignore`, `.gitattributes` 必要に応じて

## Implementation Notes
- Why: 早期に削除しないと Go 側が常に TS と整合性確認を要求され進捗が鈍化する
- 削除前安全策:
  - 全 Process 04-08 が完了し go test ./... 全 green が前提
  - git tag `pre-ts-retire` を打って退避
  - 削除コミットは 1 つにまとめ、PR レビュー必須
- 削除後検証:
  - `go test ./...` 全 green
  - `deno test` が authoring 部分のみで成功
  - cmd/storyteller の golden test が green
- 段階削除推奨:
  1. src/rag/ 削除（独立性高）
  2. src/cli/modules/ 削除
  3. src/mcp/ 削除
  4. src/lsp/ 削除
  5. src/application/ src/infrastructure/ 削除（authoring 依存だけ src/shared に避難）

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] 削除前ベースライン: `go test ./... && deno test` の green を記録
- [x] 削除後を仮想して go.mod / deno.json の整合性チェッカ追加

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] git tag pre-ts-retire
- [x] 段階的に rm -rf 実行（5 段階）
- [x] deno.json / .gitignore 更新
- [x] go test ./... 全 green
- [x] deno test (authoring) 全 green

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] src/shared/ から authoring に不要なファイルを抽出して削除
- [x] import map (deno.json) を最小化
- [x] ディレクトリ構造をドキュメントに反映

✅ **Phase Complete**

---

## Dependencies
- Requires: 04, 05, 06, 07, 08
- Blocks: 13
