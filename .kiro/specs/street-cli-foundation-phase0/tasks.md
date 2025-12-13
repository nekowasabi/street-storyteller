# Implementation Plan

-
  1. [ ] バイナリ配布ラインを構築する
  - `deno task build`で生成する成果物を検証し、実行権限と出力先を統一する
  - ビルドログや失敗理由を利用者が把握できるメッセージに整理する
  - `deno check main.ts`を実行し、エントリーポイントの型エラーがないことを確認する
  - `deno test --allow-read --allow-write tests/generate_test.ts`を実行し、既存スキャフォールドが成功することを確認する
  - _Requirements: 1.1_

- [ ] 1.1 インストールとアンインストール体験を整える
  - Denoランタイム検出とエラー通知を行うインストールフローを実装する
  - グローバル利用に必要なバイナリ配置とPATH案内、`storyteller.json`のカスタム出力先処理を追加する
  - アンインストール時に補完ファイル・バイナリ・`storyteller.json`を安全に削除し、手動クリーンアップ手順を提示する
  - `deno check install.sh` (deno task checkスクリプト化)
    を実行して静的解析を通す
  - `deno test --allow-run --allow-read tests/cli_generate_integration_test.ts`でインストール/アンインストールシナリオを検証する
  - _Requirements: 1.2, 1.3, 1.4_

-
  2. [ ] モジュール化されたコマンド登録を拡張する
  - Command
    Registry初期化時に設定コンテキスト注入と自己登録モジュールの検証を行う
  - 登録失敗や未定義コマンドへの案内をユーザー向けメッセージで統一する
  - `deno check src/cli.ts` を実行し、登録処理の型整合を確認する
  - `deno test --allow-read --allow-write tests/command_registry_test.ts`でバリデーションが失敗しないことを検証する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

-
  3. [ ] 補完エンジンを実装する
  - 静的補完スクリプトと`storyteller __complete`連携でトップレベル候補を返す
  - 動的情報（テンプレート識別子等）をコンテキストから取得し補完に反映する
  - 補完の再インストール時に上書きとリロード案内を提供する
  - `deno check src/cli/completion.ts` (仮ファイル)
    を通し、補完実装の型整合を確認する
  - `deno test --allow-run tests/cli_test.ts`で補完サブコマンドが候補を返すことを検証する
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

-
  4. [ ] ヘルプとエラーメッセージを強化する
  - コマンド一覧とサンプルを含む総合ヘルプ表示を提供する
  - サブコマンド別ヘルプと無効引数エラーをガイド付きで表示する
  - ファイル操作失敗時に原因と権限チェック手順を提示する
  - `deno check src/cli/help_presenter.ts` を実行し、出力整形ロジックを検証する
  - `deno test --allow-run tests/cli_test.ts --filter help`でヘルプ出力の回帰を確認する
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

-
  5. [ ] 設定リゾルバを導入する
  - グローバル設定ファイル（`~/storyteller.json`）とプロジェクト設定ファイル（`storyteller.json`）および環境変数の優先度を統一処理で解決する
  - 不正値を検知してデフォルトへフォールバックし、警告を出力する
  - 実際に使用した設定値をヘルプやログで確認できる仕組みを追加する
  - `deno check src/cli/config_resolver.ts` を通し、設定解決ロジックを検証する
  - `deno test --allow-read --allow-write tests/cli_test.ts --filter config`で設定フォールバックを確認する
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

-
  6. [ ] 品質保証を整える
  - ConfigResolver、補完エンジン、ヘルプ出力、インストールフローを対象にユニットテストを追加する
  - CLI統合テストで`help`、`__complete`、インストール→アンインストールのシナリオを検証する
  - 補完応答時間や設定フォールバックなどの性能・回帰をチェックする
  - `deno check` をルートで実行し、全ファイルの型整合を確認する
  - `deno test --allow-read --allow-write`をルートで実行し、ユニットと統合テストの回帰を確認する
  - _Requirements: 1.1, 1.4, 2.1, 2.3, 3.1, 4.3, 5.4_
