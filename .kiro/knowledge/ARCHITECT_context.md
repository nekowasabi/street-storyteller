# Phase 1 — Logging & Configuration Foundations

設計対象は Phase 1 の成果物として「ロギングシステム」と「設定管理システム」を導入し、CLI およびアプリケーション層から統一的に利用できる基盤を整備すること。ドメイン層の構造や永続化アダプタへの適用は後続フェーズで実施する。

---

## 1. スコープと原則
- **対象範囲**: CLI 起動フロー、アプリケーションサービス、共有ユーティリティ。ドメインロジックと既存ファイル生成機能は非改変。
- **目標**:
  - 透過的に差し替え可能なロギング抽象化。
  - 複数ソースをマージする設定管理とスキーマ検証。
  - Hexagonal + Layered アーキテクチャの境界を維持（shared→domain/application→infrastructure）。
- **非目標**: 永続化リポジトリ刷新、プラグイン/マイグレーション導入、DI コンテナ本格導入、LSP 連携。

---

## 2. ロギングシステム設計

### 2.1 主要構成
```
src/
├── shared/logging/
│   ├── types.ts            // LogLevel, LogEvent, Logger, LoggerFactory 等の抽象
│   └── log_manager.ts      // LogManager / LoggingContext の実装
├── application/logging/
│   └── logging_service.ts  // アプリ層向けファサード
└── infrastructure/logging/
    ├── console_logger.ts   // 標準出力/エラー出力アダプタ
    └── memory_logger.ts    // テスト用 in-memory アダプタ
```

### 2.2 インターフェース
- `LogLevel`: `trace | debug | info | warn | error | fatal`
- `LogEvent`: `level`, `message`, `timestamp`, `context`, `metadata`, `error`
- `Logger`: `log(event)`, ショートカットメソッド (`info()`, `error()` 等)
- `LoggerFactory`: `createLogger(scope, baseContext?)`

### 2.3 LogManager
- 初期化時に `LoggerFactory` を保持し、レベルフィルタリング・メタデータ付与を担当。
- `createLogger(scope)` でスコープ付きロガーを返却。子ロガーは `context` 追記。
- 例外発生時は `error` レベルで標準化したペイロードを出力。
- フォーマット/シンクはアダプタ側（Phase 1 では Console と Memory）。

### 2.4 ConsoleLogger (Infrastructure)
- `stderr` へ `warn` 以上、`stdout` へ `info` 以下を出力。
- デフォルトは人間向け整形（タイムスタンプ + レベル + スコープ + メッセージ）。
- `logging.format=json` で JSON 出力に切替。カラー表示は `logging.color` で制御。

### 2.5 LoggingService (Application)
- 遅延初期化: `ConfigurationManager` から設定読込後に LogManager を構築。
- `getLogger(scope)` のハンドオフ、および `logOperation(scope, meta, fn)` のような実行ラッパを提供。
- CLI コマンドやアプリサービスはこのサービス経由でロガーを取得。

### 2.6 CLI 統合
- `runCLI` で `ConfigurationManager` → `LoggingService` の順に初期化し、`CommandContext` に `logger` を注入。
- `CommandContext` と `OutputPresenter` の役割整理:
  - `OutputPresenter`: ユーザ向けメッセージ（成功/失敗/ヘルプ）。
  - `logger`: 開発者/運用向けイベント。
- `BaseCliCommand`（新規）を用意し、`execute(context)` 内で共通前処理・例外ロギングを行う。

### 2.7 テスト支援
- `MemoryLogger` で発生イベントを格納し、`assertLogContains(level, message)` などのヘルパを提供。
- CLI 統合テストでは `--log-level=debug` 指定時の出力を検証。

---

## 3. 設定管理システム設計

### 3.1 主要構成
```
src/
├── shared/config/
│   ├── schema.ts              // Zod などで AppConfig スキーマ定義
│   ├── provider.ts            // ConfigurationProvider インターフェース
│   └── keys.ts                // 設定パスの列挙
├── application/config/
│   └── configuration_manager.ts
└── infrastructure/config/
    ├── default_provider.ts
    ├── env_provider.ts
    ├── file_provider.ts
    └── cli_provider.ts
```

### 3.2 コンフィグスキーマ
- `RuntimeConfig`: `environment`, `projectRoot`, `paths` 等
- `LoggingConfig`: `level`, `format`, `color`, `timestamps`
- `FeatureFlags`: Phase 1 では空/予約、後続フェーズで拡張
- スキーマ検証失敗時は警告をロギングし、既定値にフォールバック。

### 3.3 Provider チェーン（優先度低→高）
1. **Default**: コード内のデフォルト値。
2. **Env**: `STORYTELLER_*` 環境変数（例 `STORYTELLER_LOG_LEVEL`）。
3. **File**: `.storyteller/config.json` または `storyteller.config.ts`。プロジェクトルート探索（親ディレクトリを遡る）。
4. **CLI**: 解析後のフラグ（例 `--log-level`, `--config`）。

### 3.4 ConfigurationManager
- `resolve()` で全プロバイダから `Partial<AppConfig>` を取得しマージ。
- マージポリシー:
  - オブジェクトはシャローに上書き。
  - 配列/プリミティブは完全上書き。
  - 未知キーはロギング警告（デバッグ用）。
- `validate()` でスキーマ検証 → 成功ならキャッシュ、失敗ならデフォルトにフォールバック。
- 公開 API:
  - `get<T>(path: ConfigKey, fallback?)`
  - `require<T>(path: ConfigKey)`（存在しない場合は `ConfigurationError`）
  - `onResolved()` フック（Phase 2 以降でホットリロード対応予定）

### 3.5 CLI 連携
- `parseCliArgs` 後に CLI プロバイダを生成し、`ConfigurationManager` に注入。
- `CommandContext` に `config` を追加し、各コマンドから参照可能にする。
- 既存の `generate` コマンド等は設定値が必要な部分のみ差し替え（Phase 1 ではロギング設定利用が中心）。

### 3.6 エラーハンドリング
- 設定読み込み障害（ファイルなし/パース失敗）は警告ログを出し、デフォルトにフォールバック。
- CLI から `--config` でパス指定した場合、読み込み失敗を `presenter.showError` で通知し exit 1。

---

## 4. スタートアップ・シーケンス
```
parseCliArgs(Deno.args)
        ↓
createConfigurationManager(providers)
        ↓ resolve() + validate()
createLoggingService(config.logging)
        ↓
initialize Presenter / CommandRegistry
        ↓
CommandContext { presenter, args, command, config, logger }
        ↓
handler.execute(context)
```

---

## 5. 実装手順（推奨順）
1. **Shared 層の抽象作成**  
   - logging/types.ts, config/provider.ts, config/schema.ts を作成し、単体テストを追加。
2. **ConfigurationManager + Providers**  
   - インフラ層の各プロバイダを実装し、優先度チェーンを構築。  
   - CLI 起動コードを更新して `ConfigurationManager` を統合。
3. **LoggingService + ConsoleLogger**  
   - LogManager/ConsoleLogger を実装し、`runCLI` と各コマンドをロギング対応。  
   - CLI フラグ `--log-level`, `--quiet`, `--verbose` を設定にマップ。
4. **テスト & ドキュメント**  
   - `tests/shared/logging_test.ts`, `tests/application/config_manager_test.ts`, `tests/cli/bootstrap_logging_config_test.ts` を追加。  
   - `docs/runtime/configuration.md`, `docs/runtime/logging.md` を作成。

---

## 6. リスクと対策
- **設定フォールバックの不透明化**  
  - ログに「落とし込んだソースと理由」を必ず出力。
- **ログ過多による可読性低下**  
  - デフォルトレベルを `info` に設定し、`--verbose` で `debug` へ切替。
- **CLI とユースケースの責務混在**  
  - Presenter（ユーザ向け）と Logger（開発者向け）を峻別。
- **将来の DI / プラグイン対応を阻害**  
  - すべてのコンポーネントをコンストラクタ注入・インターフェース経由で取得する方針を維持。

---

## 7. フォローアップ（Phase 2+ で対応）
- アプリケーション/ドメインサービスへのロギング適用拡大。
- 設定項目のバージョニングと互換性チェック。
- DI コンテナ導入とコンポーネント登録の整理。
- LSP / マイグレーション等、他フェーズへの設定・ロギング連携。
