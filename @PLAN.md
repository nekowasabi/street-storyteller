# title: Phase 1 Logging & Configuration Foundations

## 概要
- CLI とアプリケーション層に統一的なロギング基盤と設定管理を導入し、後続フェーズでの機能拡張に備える。

### goal
- 利用者が `storyteller` コマンドを実行した際に、設定ファイル・環境変数・CLI フラグに基づく適切なログ出力と挙動が保証される状態を実現する。

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること

## 開発のゴール
- Logging/Configuration の抽象とアダプタを整備し、CLI 起動時に構成を解決してからロギングを初期化するフローを確立する。

## 実装仕様
- ロギング抽象 (`Logger`, `LoggerFactory`, `LogManager`) を shared 層に定義し、Console/Mem アダプタを infrastructure 層に実装する。
- 設定スキーマとプロバイダ（default/env/file/cli）を通じて設定を合成し、`ConfigurationManager` が単一の取得ポイントを提供する。
- CLI 起動 (`src/cli.ts`) で設定 → ロギングの順に初期化し、`CommandContext` に `config` と `logger` を注入する。
- CLI フラグ（`--log-level`, `--verbose`, `--quiet`, `--log-format`, `--config`）を設定プロバイダにマッピングする。
- 既存コマンドは新しい `BaseCliCommand` を基底に採用し、ログと Presenter の責務を分離する。

## 生成AIの学習用コンテキスト
### 設計
- @ARCHITECT.md
  - Phase 1 の構成要素・フォルダ構成・リスクを整理した設計書。
### プロジェクトルール
- CLAUDE.md
  - 作業時の行動規範。
### CLI 実装
- src/cli.ts
  - CLI ブートストラップの現行フローを把握するため。
### 既存共有ユーティリティ
- src/shared/result.ts
  - 既存の shared 層スタイル参照。

## Process
### process1 共有抽象の整備
#### sub1 ロギング抽象の追加
@target: src/shared/logging/types.ts
@ref: @ARCHITECT.md
- [ ] ログレベル・イベント・ロガーインターフェースを定義する。

#### sub2 LogManager の実装
@target: src/shared/logging/log_manager.ts
@ref: @ARCHITECT.md
- [ ] LoggerFactory を用いてスコープ付きロガーを生成し、レベルフィルタとコンテキスト結合を実装する。

#### sub3 設定スキーマの定義
@target: src/shared/config/schema.ts
@ref: @ARCHITECT.md
- [ ] Zod 等で AppConfig/LoggingConfig/RuntimeConfig/FeatureFlags の型と検証を定義する。

#### sub4 プロバイダインターフェースの追加
@target: src/shared/config/provider.ts
@ref: @ARCHITECT.md
- [ ] `ConfigurationProvider` / `ConfigurationSourceMeta` を定義し、マージ契約を明確化する。

### process2 設定マネージャとプロバイダ実装
#### sub1 Default/Env プロバイダ実装
@target: src/infrastructure/config/default_provider.ts
@ref: @ARCHITECT.md
- [ ] 既定値と環境変数読み込みを提供する 2 種類のプロバイダを実装する。

#### sub2 File/Cli プロバイダ実装
@target: src/infrastructure/config/file_provider.ts
@ref: @ARCHITECT.md
- [ ] 設定ファイル探索・パース、CLI フラグからのマッピングを実装する。

#### sub3 ConfigurationManager 実装
@target: src/application/config/configuration_manager.ts
@ref: @ARCHITECT.md
- [ ] プロバイダチェーンの合成、スキーマ検証、エラー処理、`get/require` API を実装する。

### process3 ロギングサービスとアダプタ実装
#### sub1 Console/Mem アダプタ実装
@target: src/infrastructure/logging/console_logger.ts
@ref: @ARCHITECT.md
- [ ] Console 出力整形とテスト用メモリアダプタを実装する。

#### sub2 LoggingService 実装
@target: src/application/logging/logging_service.ts
@ref: @ARCHITECT.md
- [ ] 設定を読み込み、LogManager を初期化するサービスを実装する。

### process4 CLI ブートストラップ統合
#### sub1 CommandContext 拡張
@target: src/cli/types.ts
@ref: src/cli.ts
- [ ] `config` / `logger` プロパティを追加し、型を更新する。

#### sub2 CLI エントリ更新
@target: src/cli.ts
@ref: @ARCHITECT.md
- [ ] 設定解決 → ロギング初期化 → プレゼンター生成 → コマンド実行の順序へ書き換える。

#### sub3 BaseCliCommand 導入
@target: src/cli/base_command.ts
@ref: @ARCHITECT.md
- [ ] 共通ロギング・エラーハンドリングを実装し、既存コマンドで採用する。

### process5 既存コマンドのロギング適用
#### sub1 generate コマンド
@target: src/cli/modules/generate.ts
@ref: src/cli/base_command.ts
- [ ] 新しい BaseCliCommand を利用し、ロギング呼び出しを追加する。

#### sub2 help コマンド
@target: src/cli/modules/help.ts
@ref: src/cli/base_command.ts
- [ ] 必要に応じてロギング・設定参照を組み込む。

### process10 ユニットテスト
- [ ] shared/config/logging の単体テストを追加し、プロバイダ優先度とフィルタリングを検証する。
- [ ] CLI 起動のスモークテストを追加し、`--log-level` 等の挙動を確認する。

### process50 フォローアップ
{{実装後に仕様変更などが発生した場合は、ここにProcessを追加する}}

### process100 リファクタリング
- [ ] アプリケーションサービスやドメイン層へのロガー適用を、後続フェーズのエピックとして切り出す。

### process200 ドキュメンテーション
- [ ] `docs/runtime/configuration.md` と `docs/runtime/logging.md` を新規作成し、使用例を記載する。
- [ ] `README.md` に新しい CLI フラグと設定ファイルサンプルを追記する。
