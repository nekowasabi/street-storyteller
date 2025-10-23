# title: Issue #2 TypeScript型による物語要素の表現力向上 - 全Phase実装

## 概要
- プラグインベースアーキテクチャにより、物語要素（Character, Setting等）の段階的詳細化システムを実装
- ハイブリッド型管理（メタデータはTypeScript、長文詳細はMarkdown分離可能）
- v1→v2自動マイグレーション（Git統合、ロールバック対応）
- 詳細情報の完成度可視化とレポート機能

### goal
- 最低限から始めて段階的に詳細化できるストーリーテリング環境の実現
- 大規模プロジェクトでの詳細情報管理の効率化
- 既存v1プロジェクトを壊さずv2機能を提供
- チーム開発での詳細情報の分担作業とレビューの容易化

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- テスト戦略とリスク管理に特に重点を置くこと
- 既存コードベースの詳細調査を前提とすること（初見想定）
- 並列実行可能タスクを明示的に示すこと

## 開発のゴール

### Phase 1: 基本詳細追加機能（2-3週間）
- プラグインシステム基盤（`PluginRegistry`, `ElementPlugin`, `FeaturePlugin`）
- Character型のv2拡張（`src/type/v2/character.ts`）
- CharacterPlugin実装（要素作成、検証、スキーマエクスポート）
- DetailsPlugin実装（詳細スケルトン追加）
- `storyteller element character`コマンド群

**主要コマンド**:
```bash
storyteller element character --name "hero" --role "protagonist" --summary "概要"
storyteller element character --name "hero" --with-details
storyteller element character --name "hero" --add-details "backstory,development"
```

### Phase 2: プロジェクト更新機能（1-2週間）
- VersionManager実装（バージョン比較、互換性チェック）
- `.storyteller/config.json`の自動管理
- `storyteller version/update`コマンド

**主要コマンド**:
```bash
storyteller version --check
storyteller update --check
storyteller update --apply
```

### Phase 3: マイグレーションシステム（3-4週間）
- Migrationインターフェース、MigrationRegistry
- v1→v2マイグレーションスクリプト（Character, Setting, ProjectMetadata）
- インタラクティブウィザード、Git統合機能

**主要コマンド**:
```bash
storyteller migrate
storyteller migrate --git-safe
storyteller migrate --dry-run
```

### Phase 4: ファイル分離機能（2週間）
- DetailsPlugin拡張（`separateFiles()`メソッド）
- Markdownテンプレート生成機能
- ファイル参照整合性チェック

**主要コマンド**:
```bash
storyteller element character --separate-files backstory
storyteller element character --separate-files all
```

### Phase 5: 高度な管理機能（2週間）
- 詳細完成度分析エンジン
- `storyteller validate --completeness-report`コマンド
- 一括詳細追加機能、強制上書きオプション

**主要コマンド**:
```bash
storyteller validate --completeness-report
storyteller element character --add-details backstory --all
```

## 実装仕様

### 主要コンポーネント

#### 1. プラグインシステム（`src/core/plugin_system.ts`）

**インターフェース階層**:
```
StorytellerPlugin (基底)
├── ElementPlugin (要素型単位)
│   ├── CharacterPlugin
│   ├── SettingPlugin
│   └── ...
└── FeaturePlugin (機能レイヤー単位)
    ├── DetailsPlugin
    ├── MigrationPlugin
    └── ...
```

**主要型定義**:
```typescript
interface StorytellerPlugin {
  readonly meta: PluginMetadata;
  readonly dependencies?: string[];
  initialize?(context: PluginContext): Promise<void>;
}

interface ElementPlugin extends StorytellerPlugin {
  readonly elementType: string;
  createElementFile(options: CreateElementOptions): Promise<Result<ElementCreationResult, Error>>;
  validateElement(element: unknown): ValidationResult;
  exportElementSchema(): TypeSchema;
}

interface FeaturePlugin extends StorytellerPlugin {
  readonly featureId: string;
  extendCommands?(registry: CommandRegistry): void;
  registerMigrations?(migrationRegistry: MigrationRegistry): void;
}

class PluginRegistry {
  register(plugin: StorytellerPlugin): void;
  validate(): ValidationResult; // 依存関係検証、循環依存検出
  initializeAll(context: PluginContext): Promise<void>; // トポロジカルソート順
}
```

#### 2. バージョン管理（`src/core/version_manager.ts`）

**プロジェクトメタデータ**:
```typescript
interface ProjectMetadata {
  version: {
    version: string;              // "2.0.0"
    storytellerVersion: string;   // "0.3.0"
    created: Date;
    lastUpdated: Date;
  };
  features: {
    character_details: boolean;
    migration_support: boolean;
    lsp_support: boolean;
  };
  compatibility: "strict" | "loose";
}
```

保存先: `.storyteller/config.json`

#### 3. マイグレーションフレームワーク（`src/plugins/features/migration/`）

**Migrationインターフェース**:
```typescript
interface Migration {
  readonly id: string;           // "character_v1_to_v2"
  readonly from: string;         // "1.0.0"
  readonly to: string;           // "2.0.0"
  readonly breaking: boolean;

  canMigrate(project: ProjectContext): Promise<MigrationCheck>;
  migrate(project: ProjectContext, options: MigrationOptions): Promise<MigrationResult>;
  rollback(backup: BackupContext): Promise<void>;
}

class MigrationRegistry {
  findPath(from: string, to: string): Migration[]; // グラフ探索（BFS）
  executeChain(...): Promise<Result<MigrationChainResult, Error>>;
}
```

#### 4. 型システム拡張（`src/type/v2/character.ts`）

**Character型（v2）**:
```typescript
export type Character = {
  // 必須メタデータ
  id: string;
  name: string;
  role: CharacterRole; // "protagonist" | "antagonist" | "supporting" | "guest"
  traits: string[];
  relationships: Record<string, RelationType>;
  appearingChapters: string[];
  summary: string;

  // オプショナル詳細情報（ハイブリッド）
  details?: {
    appearance?: string | { file: string };
    personality?: string | { file: string };
    backstory?: string | { file: string };
    development?: CharacterDevelopment;
  };

  // LSP用検出ヒント
  detectionHints?: DetectionHints;
};
```

**互換レイヤー（`src/type/compat.ts`）**:
```typescript
export function migrateCharacterV1toV2(char: V1.Character): V2.Character;
export function downgradeCharacterV2toV1(char: V2.Character): V1.Character;
```

## 生成AIの学習用コンテキスト

### 既存アーキテクチャ理解用ファイル

**CLI基盤**:
- `src/cli/command_registry.ts`
  - コマンドレジストリ（階層構造、依存関係検証）の参考
- `src/cli/base_command.ts`
  - 基底コマンドクラスの参考
- `src/cli/types.ts`
  - CLIインターフェース定義
- `src/cli/modules/generate.ts`
  - 既存コマンド実装例

**設定管理**:
- `src/shared/config/schema.ts`
  - Zodスキーマ定義の参考
- `src/application/config/configuration_manager.ts`
  - 設定マネージャーの参考

**ロギング**:
- `src/shared/logging/types.ts`
  - ロギング型定義
- `src/application/logging/logging_service.ts`
  - ロギングサービス

**型定義**:
- `src/type/character.ts`
  - 既存Character型（v1・最小限）
- `sample/src/types/character.ts`
  - 拡張Character型（参考実装）

**マイグレーション**:
- `src/application/migration_facilitator.ts`
  - 既存マイグレーション基盤

**テスト**:
- `tests/command_registry_test.ts`
  - コマンドレジストリテスト
- `tests/asserts.ts`
  - テストヘルパー（`createStubLogger()`, `createStubConfig()`パターン）

## Process

### process1: Phase 1実装（プラグインシステム基盤）

**期間**: 2-3週間
**目標**: 基本詳細追加機能の実装

#### sub1-1: プラグインシステム基盤
@target: `src/core/plugin_system.ts`
@ref: `src/cli/command_registry.ts` (依存関係管理の参考)

- [ ] `StorytellerPlugin`インターフェース定義
- [ ] `ElementPlugin`インターフェース定義
- [ ] `FeaturePlugin`インターフェース定義
- [ ] `PluginRegistry`クラス実装
  - [ ] 依存関係解決機能（トポロジカルソート）
  - [ ] 循環依存検出（深さ優先探索）
- [ ] テスト: `tests/core/plugin_system_test.ts`
  - [ ] プラグイン登録・解決テスト
  - [ ] 依存関係検証テスト
  - [ ] 循環依存検出テスト
  - [ ] 初期化順序テスト

#### sub1-2: Character型のv2拡張
@target: `src/type/v2/character.ts`
@ref: `sample/src/types/character.ts` (拡張型の参考)

- [ ] `CharacterRole`, `RelationType`型定義
- [ ] `CharacterDetails`型定義（ハイブリッド方式）
- [ ] `CharacterDevelopment`型定義
- [ ] `DetectionHints`型定義
- [ ] メイン`Character`型定義
- [ ] `src/type/compat.ts`の実装
  - [ ] v1→v2変換関数
  - [ ] v2→v1変換関数（ダウングレード）
- [ ] テスト: `tests/type/character_v2_test.ts`

#### sub1-3: CharacterPlugin実装
@target: `src/plugins/core/character/plugin.ts`
@ref: `src/cli/modules/generate.ts` (コマンド実装の参考)

- [ ] `CharacterPlugin`クラス実装
  - [ ] `createElementFile()`メソッド
  - [ ] `validateElement()`メソッド
  - [ ] `exportElementSchema()`メソッド
  - [ ] `getElementPath()`, `getDetailsDir()`メソッド
- [ ] `src/plugins/core/character/validator.ts`の実装
- [ ] テスト: `tests/plugins/character_plugin_test.ts`

#### sub1-4: DetailsPlugin実装
@target: `src/plugins/features/details/plugin.ts`

- [ ] `DetailsPlugin`クラス実装
  - [ ] `addDetails()`メソッド（スケルトン追加）
  - [ ] テンプレート生成機能
- [ ] `src/plugins/features/details/templates.ts`の実装
- [ ] テスト: `tests/plugins/details_plugin_test.ts`

#### sub1-5: ElementService実装
@target: `src/application/element_service.ts`

- [ ] `createElement()`メソッド
- [ ] `addDetailsToElement()`メソッド
- [ ] プラグインレジストリ連携
- [ ] テスト: `tests/application/element_service_test.ts`

#### sub1-6: elementコマンド実装
@target: `src/cli/modules/element/character.ts`

- [ ] `ElementCharacterCommand`クラス実装
  - [ ] `--with-details`オプション処理
  - [ ] `--add-details`オプション処理
  - [ ] オプション解析ロジック
- [ ] `src/cli/modules/element/index.ts`の実装（コマンド登録）
- [ ] `src/cli/modules/index.ts`の拡張（elementコマンド群の登録）
- [ ] テスト: `tests/cli/element_command_test.ts`

#### sub1-7: 統合テスト
@target: `tests/integration/element_workflow_test.ts`

- [ ] 基本要素作成ワークフロー
- [ ] 詳細付き作成ワークフロー
- [ ] 既存要素への詳細追加ワークフロー
- [ ] エンドツーエンドテスト

**並列実行可能タスク（Phase 1）**:
- グループA: sub1-1, sub1-2（独立実装可能）
- グループB: sub1-3, sub1-4（グループA完了後）
- グループC: sub1-5, sub1-6（グループB完了後）

### process2: Phase 2実装（バージョン管理）

**期間**: 1-2週間
**目標**: プロジェクトメタデータ管理と更新チェック

#### sub2-1: VersionManager実装
@target: `src/core/version_manager.ts`
@ref: `src/application/migration_facilitator.ts` (バージョン管理の参考)

- [ ] `ProjectMetadata`, `ProjectVersion`, `FeatureFlags`型定義
- [ ] `loadProjectMetadata()`, `saveProjectMetadata()`メソッド
- [ ] `compareVersions()`メソッド（セマンティックバージョニング）
- [ ] `isCompatible()`, `checkUpdates()`メソッド
- [ ] テスト: `tests/core/version_manager_test.ts`

#### sub2-2: プロジェクトメタデータスキーマ定義
@target: `src/shared/config/schema.ts`

- [ ] `ProjectVersionSchema`, `ProjectMetadataSchema`の追加（Zod）

#### sub2-3: VersionService実装
@target: `src/application/version_service.ts`

- [ ] プロジェクトメタデータ管理
- [ ] バージョン互換性チェック
- [ ] 更新可能性判定
- [ ] テスト: `tests/application/version_service_test.ts`

#### sub2-4: versionコマンド実装
@target: `src/cli/modules/version/index.ts`

- [ ] `VersionCommand`クラス実装
- [ ] `--check`オプション（互換性チェック）
- [ ] バージョン情報表示
- [ ] テスト: `tests/cli/version_command_test.ts`

#### sub2-5: updateコマンド実装
@target: `src/cli/modules/update/index.ts`

- [ ] `UpdateCommand`クラス実装
- [ ] `--check`, `--apply`, `--add-feature`オプション
- [ ] テスト: `tests/cli/update_command_test.ts`

#### sub2-6: 統合テスト
@target: `tests/integration/version_workflow_test.ts`

- [ ] プロジェクト作成→バージョン確認→更新フロー

### process3: Phase 3実装（マイグレーション）

**期間**: 3-4週間
**目標**: v1→v2の自動マイグレーションとロールバック

#### sub3-1: Migrationインターフェース定義
@target: `src/migrations/registry.ts`

- [ ] `Migration`インターフェース定義
- [ ] `MigrationCheck`, `MigrationResult`, `MigrationOptions`型定義
- [ ] テスト: `tests/migrations/migration_interface_test.ts`

#### sub3-2: MigrationRegistry実装
@target: `src/migrations/registry.ts`

- [ ] マイグレーション登録機能
- [ ] `findPath()`メソッド（バージョン間パス探索・BFS）
- [ ] `executeChain()`メソッド（段階的マイグレーション）
- [ ] テスト: `tests/migrations/migration_registry_test.ts`

#### sub3-3: MigrationPlugin実装
@target: `src/plugins/features/migration/plugin.ts`

- [ ] `MigrationPlugin`クラス実装
- [ ] マイグレーション実行エンジン
- [ ] バックアップ機能、ロールバック機能
- [ ] テスト: `tests/plugins/migration_plugin_test.ts`

#### sub3-4: v1→v2マイグレーションスクリプト
@target: `migrations/v1_to_v2/character_migration.ts`, `setting_migration.ts`, `project_metadata_migration.ts`

- [ ] `character_migration.ts`実装（`canMigrate()`, `migrate()`, `rollback()`）
- [ ] `setting_migration.ts`実装
- [ ] `project_metadata_migration.ts`実装
- [ ] テスト: `tests/migrations/v1_to_v2_test.ts`

#### sub3-5: インタラクティブウィザード
@target: `src/plugins/features/migration/wizard.ts`

- [ ] マイグレーション分析
- [ ] ユーザー選択（自動/インタラクティブ/ドライラン）
- [ ] 進捗表示
- [ ] テスト: `tests/plugins/migration_wizard_test.ts`

#### sub3-6: Git統合機能
@target: `src/plugins/features/migration/git_integration.ts`

- [ ] マイグレーションブランチ作成
- [ ] ステップごとのコミット
- [ ] ロールバック用の履歴管理
- [ ] テスト: `tests/plugins/migration_git_test.ts`

#### sub3-7: migrateコマンド実装
@target: `src/cli/modules/migrate/index.ts`

- [ ] `MigrateCommand`クラス実装
- [ ] `--git-safe`, `--dry-run`, `--interactive`, `--force`オプション
- [ ] テスト: `tests/cli/migrate_command_test.ts`

#### sub3-8: 統合テスト
@target: `tests/integration/migration_workflow_test.ts`

- [ ] v1プロジェクト作成→v2マイグレーション→検証フロー
- [ ] Git統合フロー、ロールバックフロー

**並列実行可能タスク（Phase 3）**:
- グループA: sub3-1, sub3-2（基盤）
- グループB: sub3-3, sub3-4（グループA完了後）
- グループC: sub3-5, sub3-6, sub3-7（グループB完了後）

### process4: Phase 4実装（ファイル分離）

**期間**: 2週間
**目標**: インライン詳細をMarkdownファイルに分離

#### sub4-1: DetailsPlugin拡張（ファイル分離）
@target: `src/plugins/features/details/plugin.ts`

- [ ] `separateFiles()`メソッド実装
- [ ] インライン→ファイル参照変換ロジック
- [ ] テスト: `tests/plugins/details_separate_test.ts`

#### sub4-2: Markdownテンプレート生成
@target: `src/plugins/features/details/templates.ts`

- [ ] 各詳細フィールドのMarkdownテンプレート
- [ ] フロントマター対応（メタデータ埋め込み）
- [ ] テスト: `tests/plugins/details_templates_test.ts`

#### sub4-3: ファイル参照整合性チェック
@target: `src/plugins/features/details/validator.ts`

- [ ] ファイル参照の存在確認
- [ ] 循環参照の検出
- [ ] 壊れたリンクの警告
- [ ] テスト: `tests/plugins/details_validator_test.ts`

#### sub4-4: elementコマンド拡張
@target: `src/cli/modules/element/character.ts`

- [ ] `--separate-files`オプション実装
- [ ] `--separate-files all`オプション（全フィールド分離）
- [ ] テスト: `tests/cli/element_separate_files_test.ts`

#### sub4-5: 統合テスト
@target: `tests/integration/separate_files_workflow_test.ts`

- [ ] インライン作成→ファイル分離→整合性検証フロー

**並列実行可能タスク（Phase 4）**:
- sub4-1, sub4-2, sub4-3（並列実装可能）
- sub4-4（sub4-1完了後）

### process5: Phase 5実装（高度管理）

**期間**: 2週間
**目標**: 完成度レポート、一括処理、強制上書き

#### sub5-1: 詳細完成度分析
@target: `src/application/completeness_analyzer.ts`

- [ ] 要素ごとの詳細完成度計算
- [ ] 必須フィールドの充足率
- [ ] TODOマーカーの検出
- [ ] テスト: `tests/application/completeness_analyzer_test.ts`

#### sub5-2: validateコマンド拡張
@target: `src/cli/modules/validate/index.ts`

- [ ] `--completeness-report`オプション実装
- [ ] レポート形式の出力（テーブル、グラフ）
- [ ] フィルタリング機能（`--role`, `--chapter`）
- [ ] テスト: `tests/cli/validate_completeness_test.ts`

#### sub5-3: 一括詳細追加機能
@target: `src/application/batch_operations.ts`

- [ ] 複数要素への一括詳細追加
- [ ] フィルタリング機能（役割別、チャプター別）
- [ ] テスト: `tests/application/batch_operations_test.ts`

#### sub5-4: 強制上書き機能
@target: `src/cli/modules/element/character.ts`

- [ ] `--force`オプションの実装
- [ ] 既存詳細の上書き確認
- [ ] テスト: `tests/cli/force_option_test.ts`

#### sub5-5: 統合テスト
@target: `tests/integration/advanced_management_test.ts`

- [ ] 完成度分析→一括処理→検証フロー

**並列実行可能タスク（Phase 5）**:
- sub5-1, sub5-2, sub5-3, sub5-4（並列実装可能）

### process10: ユニットテスト戦略

**並行実施**: 各Phaseの実装と同時

- [ ] すべてのユニットテストを実装（上記sub項目に含む）
- [ ] カバレッジ目標達成
  - [ ] コアシステム: 90%以上
  - [ ] プラグイン: 85%以上
  - [ ] CLIコマンド: 80%以上
  - [ ] アプリケーション層: 85%以上

**テスト実行コマンド**:
```bash
# 全テスト実行
deno test

# カバレッジ付き
deno test --coverage=coverage/
deno coverage coverage/

# Phase別テスト
deno test --filter "Phase1"
```

**モック・スタブ戦略**（既存パターンを活用）:
```typescript
// tests/asserts.ts または tests/test_helpers.ts に共通化
function createStubLogger(): Logger { /* ... */ }
function createStubConfig(): ConfigurationManagerRef { /* ... */ }
function createStubFileSystem(): FileSystemGateway { /* ... */ }
```

### process100: リファクタリング計画

**Phase 3完了後に実施**

- [ ] TypeScriptファイル操作のAST化検討
  - [ ] Deno TypeScript APIの調査
  - [ ] ts-morphの導入検討
  - [ ] パフォーマンス測定
- [ ] プラグインシステムの最適化
  - [ ] 初期化順序の最適化
  - [ ] 並列初期化の検討
- [ ] コードレビュー
  - [ ] 型定義の一貫性チェック
  - [ ] エラーハンドリングの統一
  - [ ] ロギングの適切性確認

### process200: ドキュメンテーション

**Phase 5完了後に実施**

- [ ] README.md更新
  - [ ] 新機能の説明
  - [ ] コマンド一覧
  - [ ] 使用例
- [ ] ARCHITECTURE.mdの最終更新
  - [ ] 実装結果の反映
  - [ ] 設計決定の記録
- [ ] チュートリアル作成
  - [ ] 基本的な使い方
  - [ ] マイグレーション手順
  - [ ] トラブルシューティング
- [ ] APIドキュメント生成
  - [ ] プラグインインターフェース
  - [ ] 型定義

## リスク管理

### リスク1: 既存プロジェクトとの互換性
**影響度**: 高 | **発生確率**: 中

**対策**:
1. v1型定義の保持（`src/type/v1/`）
2. 互換レイヤー（`src/type/compat.ts`）
3. バックアップ必須（`.storyteller/backup/`）
4. ドライランモード（`--dry-run`）
5. ロールバック機能

**検証**: `tests/integration/migration_workflow_test.ts`で包括的テスト

### リスク2: プラグイン依存関係の複雑化
**影響度**: 中 | **発生確率**: 中

**対策**:
1. 依存関係検証（`PluginRegistry.validate()`）
2. 循環依存検出（DFS）
3. トポロジカルソートによる初期化順序決定
4. 最小限の依存設計（コアプラグインは依存なし）

**検証**: `tests/core/plugin_system_test.ts`で循環依存テスト

### リスク3: マイグレーション失敗時のデータ損失
**影響度**: 高 | **発生確率**: 低

**対策**:
1. Git統合（`--git-safe`オプション）
2. ステップごとのバックアップ
3. トランザクション的実行
4. インタラクティブ確認
5. ドライラン検証

**緊急対応**: バックアップディレクトリからの手動復元、Git履歴からの復元

### リスク4: TypeScriptファイルのAST解析・編集の複雑性
**影響度**: 中 | **発生確率**: 高

**対策**:
1. 段階的実装（Phase 1-2はテンプレート生成）
2. Deno標準API活用
3. ts-morph検討（Phase 3以降）
4. `deno fmt`でフォーマット保持

**実装方針**:
```typescript
// Phase 1-2: シンプルなテンプレート生成
function generateCharacterFile(character: V2.Character): string {
  return `import type { Character } from "@storyteller/types/v2";

export const ${character.id}: Character = ${JSON.stringify(character, null, 2)};
`;
}
```

### リスク5: パフォーマンス問題
**影響度**: 低 | **発生確率**: 中

**対策**:
1. 並列処理（`Promise.all()`）
2. キャッシング
3. 進捗表示
4. 段階的初期化
5. ベンチマーク実施

### リスク6: ドキュメント不足によるユーザー混乱
**影響度**: 中 | **発生確率**: 中

**対策**:
1. 包括的ドキュメント（README, ARCHITECTURE.md）
2. チュートリアル（process200）
3. 充実したエラーメッセージ
4. ヘルプコマンド
5. サンプルプロジェクト

## 並列実行可能タスク

### Phase 1並列化（開発者2名）
- **グループA**: sub1-1（プラグインシステム）, sub1-2（Character型v2）
- **グループB**: sub1-3（CharacterPlugin）, sub1-4（DetailsPlugin）
- **グループC**: sub1-5（ElementService）, sub1-6（elementコマンド）

### Phase 2並列化（開発者1-2名）
- 並列: sub2-1（VersionManager）, sub2-2（スキーマ定義）
- 順次: sub2-3→sub2-4/sub2-5→sub2-6

### Phase 3並列化（開発者3名）
- **グループA**: sub3-1, sub3-2（基盤）
- **グループB**: sub3-3（MigrationPlugin）, sub3-4（マイグレーションスクリプト）
- **グループC**: sub3-5（ウィザード）, sub3-6（Git統合）, sub3-7（migrateコマンド）

### Phase 4並列化（開発者2-3名）
- 並列: sub4-1, sub4-2, sub4-3
- 順次: sub4-4（sub4-1完了後）

### Phase 5並列化（開発者4名）
- 並列: sub5-1, sub5-2, sub5-3, sub5-4

## 実装計画メタ情報

**Planning Agent**: Claude Code (Orchestrator)
**Target**: Phase 1-5 全体実装
**Estimated Duration**: 10-13週間
**Planning Date**: 2025-10-23
**Task ID**: planning-20251023-194000

**詳細調査結果**:
- 読み込みファイル数: 9ファイル
- 調査フェーズ: Phase 0-3（planning-expert直接実行）
- 総実装ステップ数: 117チェックボックス（8プロセス）

**次のステップ**:
1. Phase 1の実装開始（sub1-1: プラグインシステム基盤）
2. ブランチ作成: `feature/phase-1-plugin-system`
3. 最初のPR: sub1-1完了後、プラグインシステム基盤のレビュー依頼
