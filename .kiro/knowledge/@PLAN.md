# title: Phase 0 CLI Command Framework

## 概要
- 階層化されたコマンドレジストリとメタデータ駆動のCLI基盤を構築し、ヘルプ、補完、パッケージングを統合管理できるようにする。

### goal
- 利用者が`storyteller`コマンドを使うとき、整理されたヘルプと補完、安定した実行環境で目的のコマンドへ素早く到達できる状態を目指す。

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- コマンドツリー、descriptor、ヘルプ・補完・パッケージングの各層を整備し、Phase1以降の拡張（型・LSP・マイグレーション）を受け止めるCLI土台を完成させる。

## 実装仕様
- 既存`src/cli/command_registry.ts`のフラット構造を置き換え、`CommandNode`ベースで階層解決・共通オプション継承・エイリアスを扱う。
- `src/cli/types.ts`にdescriptor向けの型を追加し、コマンド定義とプレゼンテーション層で共有する。
- ヘルプ出力はdescriptorを巡回する`src/cli/help/renderer.ts`で生成し、近似候補提示やエラーメッセージを一元管理する。
- `src/cli/completions/`でdescriptorからBash/Zsh補完ファイルを生成し、`deno task cli:completions`で再生成できるようにする。
- `scripts/build_cli.ts`とインストール導線（`scripts/install.sh`）を追加し、`deno compile`成果物とチェックサムをマニフェスト化する。
- 既存コマンド(`generate`,`help`)はdescriptor経由で登録し、レガシーハンドラを`legacy_adapter`で段階移行する。
- テンプレート調査結果:
  - `src/cli/command_registry.ts:7`は重複検知と単一解決のみで階層・共通フラグを扱えない。
  - `src/cli/base_command.ts:7`はメタデータを持たずヘルプ生成に利用できない。
  - `src/cli.ts:5`は固定エイリアスマップと静的ヘルプ呼び出しに依存している。
  - `src/cli/modules/generate.ts:5` / `help.ts:5`は独自に引数検証し、descriptorとの連携が無い。
  - `tests/command_registry_test.ts:5`と`tests/cli_test.ts:5`は現行フラット実装の挙動を前提としているため再設計に合わせ改修が必要。

## 生成AIの学習用コンテキスト
### 設計資料
- @ARCHITECT.md
  - Phase0のレイヤ構造・リスクを整理した計画書。
### 既存CLI実装
- src/cli.ts
  - 現在の起動フローとエイリアス処理の把握に利用。
- src/cli/command_registry.ts
  - 現行のフラットレジストリ実装。
- src/cli/base_command.ts
  - コマンド共通処理の現状確認。
- src/cli/modules/index.ts
  - コマンド登録のエントリポイント。
### テスト
- tests/cli_test.ts
  - CLI挙動を保証する既存ユニットテスト。
- tests/command_registry_test.ts
  - レジストリ仕様のテストカバレッジ。

## Process
### process1 コマンドレジストリ刷新
#### sub1 事前チェック
@target: .
@ref: deno.json
- [x] `deno check src/main.ts`を実行し現状の型整合性を確認する。
- [x] `deno test`を実行し既存テストのグリーンを確認する。

#### sub2 CommandNodeとツリー登録の実装
@target: src/cli/command_registry.ts
@ref: @ARCHITECT.md
- [x] `CommandNode`構造体を定義し、階層解決・エイリアス・依存検証を実装する。
- [x] 既存`CommandRegistry`テストを新仕様に合わせ更新し、失敗ケースを先に追加する。

#### sub3 事後チェック
@target: .
@ref: tests/command_registry_test.ts
- [x] `deno check src/main.ts`で新規型整合性を検証する。
- [x] `deno test tests/command_registry_test.ts`で更新テストを確認する。

### process2 Descriptor層とモジュール登録
#### sub1 事前チェック
@target: .
@ref: deno.json
- [x] `deno check src/main.ts`を再実行し前段の安定性を担保する。
- [x] `deno test`で回帰がないことを確認する。

#### sub2 Descriptor定義とレガシーアダプタ
@target: src/cli/types.ts
@ref: src/cli/modules/index.ts
- [x] コマンドdescriptor型・オプション定義・例示データ構造を追加する。
- [x] 既存モジュールをdescriptor登録へ移行し、旧ハンドラを`legacy_adapter`で包む。

#### sub3 事後チェック
@target: .
@ref: tests/cli_test.ts
- [x] `deno check src/main.ts`でdescriptor導入後の型を確認する。
- [x] `deno test tests/cli_test.ts`でCLI全体の回帰を検証する。

### process3 ヘルプレンダラーとエラーハンドリング
#### sub1 事前チェック
@target: .
@ref: deno.json
- [x] `deno check src/main.ts`を実行し基盤が安定していることを確認する。
- [x] `deno test`を実行し回帰がないことを確認する。

#### sub2 ヘルプ出力の再設計
@target: src/cli/help/renderer.ts
@ref: src/cli/types.ts
- [x] descriptorからヘルプを生成するレンダラーとテンプレートを実装する。
- [x] 未知コマンド時の近似候補提示テストを追加し、`tests/cli_test.ts`を更新する。

#### sub3 事後チェック
@target: .
@ref: tests/cli_test.ts
- [x] `deno check src/main.ts`で型整合性を再確認する。
- [x] `deno test tests/cli_test.ts`でヘルプ改修のユースケースを通す。

### process4 補完ジェネレータとFSアダプタ
#### sub1 事前チェック
@target: .
@ref: deno.json
- [x] `deno check src/main.ts`を実行し現状維持を確認する。
- [x] `deno test`を実行し既存カバレッジのグリーンを確認する。

#### sub2 補完生成ロジック
@target: src/cli/completions/generator.ts
@ref: @ARCHITECT.md
- [x] Bash/Zsh補完の生成コードとスナップショットテストを実装する。
- [x] `infrastructure/cli/completion_fs_adapter.ts`で出力先管理とI/Oテストを追加する。

#### sub3 事後チェック
@target: .
@ref: tests/cli_test.ts
- [x] `deno check src/main.ts`で補完導入後の型確認を行う。
- [x] `deno test tests/cli_test.ts tests/command_registry_test.ts`で全体回帰を確認する。

### process5 パッケージングとインストール導線
#### sub1 事前チェック
@target: .
@ref: deno.json
- [x] `deno check src/main.ts`で最新状態を確認する。
- [x] `deno test`で既存テストを実行しベースラインを取る。

#### sub2 ビルドスクリプトとマニフェスト
@target: scripts/build_cli.ts
@ref: @ARCHITECT.md
- [x] `deno compile`ラッパー、チェックサム生成、マニフェスト出力を実装する。
- [x] `deno.json`に`cli:build`/`cli:completions`/`cli:package`タスクを追加しテストを整備する。
- [x] `scripts/install.sh`の骨格とE2Eテスト（ダミーFS）を追加する。

#### sub3 事後チェック
@target: .
@ref: tests/cli_generate_integration_test.ts
- [x] `deno check src/main.ts`で最終型チェックを実施する。
- [x] `deno test`をフル実行し成果物の健全性を確認する。

### process10 ユニットテスト
- [x] 新レジストリ・ヘルプ・補完・ビルドそれぞれにTDDで追加したテストが`deno test`でグリーンであることを日次確認する。

### process50 フォローアップ
{{実装後に仕様変更などが発生した場合は、ここにProcessを追加する}}

### process100 リファクタリング
- [ ] `src/cli/modules/`下の各コマンドをdescriptor駆動へ完全移行した後、`legacy_adapter`を削除する。

### process200 ドキュメンテーション
- [ ] `docs/cli/architecture.md`を新設し、コマンドツリー・descriptor・補完/ヘルプ生成手順を記載する。
- [ ] `README.md`に新しい`deno task`とインストール手順、ヘルプの使用例を追記する。
