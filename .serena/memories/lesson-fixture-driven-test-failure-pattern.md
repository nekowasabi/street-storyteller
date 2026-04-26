# fixture 駆動シナリオテストの典型的失敗パターン

## 発生経緯

- 2026-04-19 のユニットテスト修正ミッションで 253件失敗 → 実質 2件の typo
  が原因と判明
- 失敗の 99.2% (251/253) は `deno test` 直実行による権限不足で偽失敗
- 真の失敗 2件は `tests/scenario/cinderella_foreshadowing_test.ts` の期待値 typo

## パターン定義

「fixture の `name` フィールドをテストの assertion
文字列にハードコード」した結果、 fixture 側の `name`
が変更されてもテストが追従せず、`html.includes(...)` が false になる。

## 検出の着眼点

1. 失敗メッセージが `AssertionError: false != true` で assertion 側が includes /
   contains
2. 該当 assertion 引数が日本語文字列リテラル
3. 対応する fixture ファイル（samples/*/src/ 配下）の `name:`
   フィールドと照合すると不一致

## 修正原則

- **fixture が真の仕様**: プロダクトコードの出力に fixture の name
  が入るのが正しい
- テスト側の期待値を fixture の name に合わせる（プロダクトコード・fixture
  は変更しない）
- 「テスト期待値をいじって通す」が例外的に正当化される数少ないケース

## 再発防止のチェックリスト

- fixture の `name` 変更時は `grep -rn "旧name" tests/` で参照箇所を洗い出す
- シナリオテストは `includes(fixture.name)`
  のように直接参照するとtypo発生を防げる
- `deno test` は必ず `deno task test` 経由で実行（権限フラグ込み）

## 類似プロジェクトへの適用

- street-storyteller 固有でなく、「宣言的 fixture + HTML/文字列生成 + includes
  assertion」の構造を持つ任意のプロジェクトに適用可
- 特に Subplot / Foreshadowing / Timeline
  等の新機能追加でシナリオテスト拡張する際に要注意

## 参照箇所

- 修正例: tests/scenario/cinderella_foreshadowing_test.ts:583,592
- fixture例: samples/cinderella/src/foreshadowings/glass_slipper.ts (name:
  "ガラスの靴")
