# Process 1: listMarkdownFiles 共有化 (utils 複製)

## Overview

MCP 側 `src/mcp/tools/lsp_shared.ts:90-118` に実装されている
`listMarkdownFiles(projectRoot, {path, dir, recursive})` を
`src/lsp/utils/markdown_files.ts` に複製し、CLI / LSP / MCP
から共通利用可能にする。MCP 側は削除せず維持（段階的統一）。

## Affected Files

- @new `src/lsp/utils/markdown_files.ts` — listMarkdownFiles 関数本体、walk()
  利用、.md 固定フィルタ、`recursive:true` 時のサブディレクトリ走査
- @new `tests/lsp/utils/markdown_files_test.ts` — 単体テスト（dir 指定 /
  recursive 有無 / 拡張子フィルタ）
- 参照元: `src/mcp/tools/lsp_shared.ts:90-118` （変更しない）

## Implementation Notes

- `@std/fs` の `walk()` を利用（既存 lsp_shared.ts と同じ）
- シグネチャ:
  `async function listMarkdownFiles(projectRoot: string, opts: { path?: string; dir?: string; recursive?: boolean }): Promise<string[]>`
- 戻り値は絶対パスの string 配列
- `path` 優先（単一ファイル指定時は [projectRoot+path] を返す）、なければ `dir`
  を走査
- `recursive: false` 時は直下のみ
- TODO コメント:
  `// TODO: 段階的に src/mcp/tools/lsp_shared.ts の listMarkdownFiles を本ファイルに統一する`

---

## Red Phase: テスト作成と失敗確認

- [x] ブリーフィング確認
- [x] tests/lsp/utils/markdown_files_test.ts を作成
  - dir 指定 + recursive:true で複数 .md を返す
  - recursive:false で直下のみ返す
  - path 指定で単一ファイルを返す
  - .txt や .ts は除外される
- [x] deno test で失敗確認（ファイル未作成のため import エラー）

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認

- [x] ブリーフィング確認
- [x] src/lsp/utils/markdown_files.ts を作成
- [x] lsp_shared.ts:90-118 の実装をコピー
- [x] TODO コメント追加
- [x] deno test で成功確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善

- [x] 型注釈の整合性確認
- [x] JSDoc 追加（用途と lsp_shared.ts との関係を明記）
- [x] deno fmt / deno lint
- [x] テスト継続成功

✅ **Phase Complete**

---

## Dependencies

- Requires: -
- Blocks: 4
