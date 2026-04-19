# Process 3: CLI element subplot

## Overview
storyteller element subplot コマンドを実装。引数パース、subplot ファイル生成、descriptor 登録までを行う。

## Affected Files
- **新規**: src/cli/modules/element/subplot.ts (~270行目安)
- **修正**: src/cli/modules/element/index.ts:446 (children 配列に追加)
- **参考**: src/cli/modules/element/foreshadowing.ts (267行) を全面コピー
- **参考**: src/cli/modules/element/index.ts:255-341 (descriptor 登録パターン)

## Implementation Notes
**subplot.ts**:
- クラス名: `ElementSubplotCommand extends BaseCliCommand`
- 必須引数: `--name`, `--type`, `--summary`
- オプショナル: `--importance`, `--parent-subplot`, `--focus-characters` (CSV: `hero:primary,heroine:secondary`)
- `parseOptions()`: name 必須/type は valid types 内/focusCharacters CSV パース
- `handle()`: ElementService.createElement("subplot", options) で生成
- ファイル書込: `src/subplots/{id}.ts`
- `generateIdFromName()`: foreshadowing と同じスネークケース変換

**index.ts 修正箇所**:
- Line 19付近: `import { ElementSubplotCommand } from "./subplot.ts";`
- Line 446付近の children 配列に `elementSubplotCommandDescriptor` 追加 (foreshadowing と setting の間)
- 新規 descriptor: `elementSubplotCommandDescriptor` をファイル末尾に追加

---

## Red Phase
- [ ] ブリーフィング確認
- [ ] tests/cli/modules/element/subplot_test.ts は Process 12 で作成

✅ **Phase Complete**

---

## Green Phase
- [ ] foreshadowing.ts をコピーし subplot 用に修正
- [ ] CLI options 定義を Subplot 型に合わせて再構成
- [ ] index.ts に descriptor 登録
- [ ] `storyteller element subplot --help` で usage 表示確認
- [ ] `storyteller element subplot --name "test" --type subplot --summary "test summary"` で src/subplots/test.ts 生成確認

✅ **Phase Complete**

---

## Refactor Phase
- [ ] エラーメッセージの一貫性確認
- [ ] usage 例の充実

✅ **Phase Complete**

---

## Dependencies
- Requires: 01, 02
- Blocks: 04, 05, 12, 50
