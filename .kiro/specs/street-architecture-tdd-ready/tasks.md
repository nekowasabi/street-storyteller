# Implementation Plan

- [x] 1. コマンド登録基盤を構築する
  - 新しいCommandRegistryとCommandModuleの契約を整備し、重複登録や未登録依存を検出する初期化検証を用意する
  - CLIエントリーポイントでレジストリ初期化とハンドラ解決を統一し、例外系をResult型で扱う流れを整理する
  - 登録失敗やスタブ未提供を検出するユニットテストを追加し、CIで即時に異常を検知できるようにする
  - _Requirements: 1.1, 1.3, 2.2_
  - deno test -A

- [x] 1.1 自己登録型コマンドモジュールを導入する
  - 既存のgenerate系モジュールをCommandModule化し、activate経由で自己登録するパターンを実装する
  - 登録順序や競合ケースをモックレジストリで検証し、拡張時の安全性を確認する
  - _Requirements: 1.1, 1.3_
  - deno test -A

- [x] 1.2 CLI出力プレゼンターを整備する
  - コマンド実行結果を統一フォーマットで整形するプレゼンターを導入し、成功・警告・エラーのハンドリングを分離する
  - Result型と連携させ、CLIの標準出力／標準エラーを用途別に制御する
  - _Requirements: 2.2, 2.3_
  - deno test -A

- [x] 2. アプリケーションサービスを分離しテンプレート生成を制御する
  - ProjectScaffoldingServiceを新設し、テンプレート解決・ファイル計画・実行を単一のフローにまとめる
  - Domainサービスとの通信を抽象化し、I/O層とロジック層の境界を明確にする
  - _Requirements: 1.2, 1.3_
  - deno test -A

- [x] 2.1 テンプレート生成フローを実装する
  - GenerateOptionsを受け取り、テンプレート識別・Blueprint作成・ファイル生成命令の構築までをResult型で連結する
  - 正常系と異常系をユニットテストでカバーし、テンプレート不正時のエラー報告を確認する
  - _Requirements: 1.2, 3.1_
  - deno test -A

- [x] 2.2 FileSystemGatewayを実装する
  - ensureDir、writeFile、exists、readFileなどの操作をPromise<Result>で統一し、副作用を一箇所に隔離する
  - モックゲートウェイを利用したテストでファイルシステム依存を排除し、CIで安定的に検証できるようにする
  - _Requirements: 2.3_
  - deno test -A

- [x] 2.3 MigrationFacilitatorと連携するフックを追加する
  - ProjectScaffoldingService内に移行前診断と移行後レポートの呼び出しポイントを設ける
  - CLI出力プレゼンターを通じて移行結果と警告をユーザーに提示する
  - _Requirements: 3.1, 3.3_
  - deno test -A

- [x] 3. ドメインテンプレートと検証ポリシーを整える
  - TemplateCatalogを再編し、テンプレート種別ごとにBlueprintデータを提供する
  - ValidationPolicyでStory型との整合ルールを定義し、Blueprint検証を自動化する
  - _Requirements: 1.2, 1.4_
  - deno test -A

- [x] 3.1 テンプレートカタログを再構築する
  - テンプレートIDからBlueprintを解決し、サンプル実装と同一の拡張ポイントを参照できるようにする
  - 追加テンプレート向けの拡張用スタブを用意し、将来の拡張を見越した設計とする
  - _Requirements: 1.4_
  - deno test -A

- [x] 3.2 検証ポリシーとStoryDomainServiceを拡張する
  - Blueprintに含まれるディレクトリ・ファイル定義をStory型と突き合わせ、欠落や整合性違反を検出する
  - ドメインロジックのユニットテストを追加し、異常系のバリエーションを網羅する
  - _Requirements: 1.2_
  - deno test -A

- [x] 4. 既存プロジェクトの移行支援を実装する
  - MigrationFacilitatorで旧構成の判定・バージョン差分抽出・追加ファイル計画を行う
  - MigrationPolicyと連携し、互換性制約と回避策を明示する
  - _Requirements: 3.1, 3.2, 3.4_
  - deno test -A

- [x] 4.1 プロジェクト診断と移行計画立案を実装する
  - 旧構成の特徴となるファイル群を検出し、MigrationPlanとして不足ファイルや推奨アクションをまとめる
  - 旧構成のバージョンタグを解析し、差分に応じたステップをResultで返却する
  - _Requirements: 3.1, 3.2, 3.3_
  - deno test -A

- [x] 4.2 移行レポートとガイド出力を整備する
  - MigrationReportをCLI出力プレゼンター経由で表示し、Warningと次のアクションを階層表示する
  - DocumentationEmitterで後方互換性の制約と回避策を組み込んだメッセージを生成する
  - _Requirements: 3.3, 3.4_
  - deno test -A

- [x] 5. TDD支援とテストスイートを整備する
  - コマンド層・アプリケーション層・インフラ層のテストを独立実行できる構成を構築する
  - テストサイクルのサンプルシナリオを準備し、TDDガイド出力機能と連携させる
  - _Requirements: 2.1, 2.4_
  - deno test -A

- [x] 5.1 テストスイート分離とCI設定を実装する
  - レイヤごとのテストエントリポイントを作成し、`deno test`で個別実行できるように設定する
  - CommandRegistry検証をCI必須テストに組み込み、未登録モジュールを即座に検知する
  - _Requirements: 2.1, 2.2_
  - deno test -A

- [x] 5.2 TDDガイド出力機能を実装する
  - DocumentationEmitterに赤→緑→リファクタの手順を生成する処理を追加する
  - サンプルプロジェクトに対してガイド出力が自動付与される統合テストを作成する
  - _Requirements: 2.4_
  - deno test -A

- [x] 6. 統合検証と最終調整を行う
  - CLIからのプロジェクト生成を通し、テンプレート生成・移行診断・ガイド出力が連携することを確認する
  - サンプルディレクトリの拡張例を更新し、新アーキテクチャの拡張ポイントを参照する実例を揃える
  - deno test -A
  - _Requirements: 1.4, 3.1, 3.4_
