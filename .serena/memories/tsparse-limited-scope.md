# TS parser limited-scope 制約

## カテゴリ

既知制約

## 重要度

medium

## 作成日

2026-04-26

## ソース

mission-20260426-084012-2746861-005 (Process 04 CLI Go 移行), Process 02 由来

## 教訓内容

`internal/project/tsparse.ParseExportConst` は限定スコープの実装:

### 非対応項目

- `import` 文 **非対応** (skipTrivia は trivia のみで import を読まない)
- 型アノテーション `: T` **非対応** (`p.peekByte() == ':'` で reject)

### 制約の影響

- testdata fixture は `export const Name = { ... };` の純粋形にする必要あり
- samples/cinderella/ の TS ファイル
  (`import type { Character }; export const x: Character = ...`) は
  **そのままでは parse できない**

### ファイル参照

- `internal/project/tsparse/parser.go:35-58`
- `internal/project/tsparse/parser_test.go:130 (rejection cases)`

### 将来の改善計画

import + type annotation を skip する preprocessor を追加検討 (Process 04 後半
or 別 issue)

## 適用すべき場面

- tsparse を使う testdata fixture を作成するとき
- samples/ の TS ファイルを Go 側でパースしようとするとき

## 関連教訓

- wave-a3-pattern
