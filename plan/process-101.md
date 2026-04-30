# Process 101: deno check/tsc 確認

## Overview
TS authoring surface の型チェック緑化

## Affected Files
src/type/v2/plot.ts, src/, samples/

## Implementation Notes
- deno check src/**/*.ts
- deno check samples/**/*.ts
- 旧型名 Subplot を import している箇所がないこと

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] deno check src/**/*.ts を実行して現在の状態を記録
- [x] deno check samples/**/*.ts を実行して現在の状態を記録
- [x] grep で "Subplot" import を検出

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] 全 import を Subplot から Plot に修正
- [x] deno check src/**/*.ts が成功することを確認
- [x] deno check samples/**/*.ts が成功することを確認
- [x] "Subplot" import 残骸がないことを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] 型参照の一貫性を確認
- [x] テストが継続して成功することを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1, 7
- Blocks: -
