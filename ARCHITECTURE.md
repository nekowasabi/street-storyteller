# street-storyteller Architecture Document

**Version**: 2.0.0
**Date**: 2025-10-23
**Target**: Issue #2 - TypeScript型による物語要素の表現力向上

---

## 目次

1. [プロジェクト現状調査結果](#1-プロジェクト現状調査結果)
2. [アーキテクチャ設計方針](#2-アーキテクチャ設計方針)
3. [主要コンポーネント設計](#3-主要コンポーネント設計)
4. [新規ディレクトリ構造](#4-新規ディレクトリ構造)
5. [実装戦略](#5-実装戦略)
6. [テスト戦略](#6-テスト戦略)
7. [リスクと対策](#7-リスクと対策)

---

## 1. プロジェクト現状調査結果

### 1.1 ディレクトリ構造概観

現在のstreet-storytellerプロジェクトは、以下の層状アーキテクチャで構成されています：

```
street-storyteller/
├── src/
│   ├── type/                          # 物語要素の型定義層（現在: 最小限）
│   ├── cli/                           # CLI基盤層（階層的コマンドレジストリ）
│   ├── application/                   # アプリケーション層
│   ├── domain/                        # ドメイン層
│   ├── infrastructure/                # インフラ層
│   ├── shared/                        # 共有レイヤー
│   ├── storyteller_interface.ts       # メインインターフェース
│   └── cli.ts                         # CLIエントリーポイント
├── tests/                             # テストスイート（19ファイル）
├── sample/                            # サンプルプロジェクト（拡張型の実装例）
├── .kiro/                             # 仕様・計画・知識ベース
└── deno.json                          # Deno設定＋タスク定義
```

### 1.2 既存CLI基盤の詳細

#### コマンドレジストリ（`src/cli/command_registry.ts`）

**特徴**: 樹状構造による階層的コマンド管理

```typescript
interface RegistryNode {
  readonly name: string;
  readonly path: CommandPath;  // ["element", "character"] など
  handler?: CommandHandler;
  readonly children: Map<string, RegistryNode>;
  readonly aliasChildren: Map<string, RegistryNode>;
  readonly aliases: Set<string>;
  metadata?: CommandHelpMetadata;
}
```

**主要機能**:
- `registerHandler()`: ハンドラーを登録し、自動的に樹状ノードを構築
- `registerDescriptor()`: メタデータ付き登録（親パスサポート）
- `resolve()`: コマンドパスまたは文字列からハンドラーを解決
- `validate()`: 重複登録・依存関係の検証

#### コマンドハンドラー型定義（`src/cli/types.ts`）

```typescript
interface CommandHandler {
  readonly name: string;
  path?: readonly string[];
  aliases?: readonly string[];
  readonly dependencies?: readonly string[];
  execute(context: CommandContext): Promise<Result<unknown, CommandExecutionError>>;
}

interface CommandContext {
  readonly args?: Record<string, unknown>;
  readonly presenter: OutputPresenter;
  readonly config: ConfigurationManagerRef;
  readonly logger: Logger;
}
```

#### 基底コマンドクラス（`src/cli/base_command.ts`）

```typescript
abstract class BaseCliCommand implements CommandHandler {
  async execute(context: CommandContext): Promise<Result<...>> {
    const scopedLogger = context.logger.withContext({ command: this.name });
    try {
      return await this.handle(scopedContext);
    } catch (error) {
      return err({ code: "unexpected_error", message: ... });
    }
  }

  protected abstract handle(context: CommandContext): Promise<Result<...>>;
}
```

**現在のコマンド構成**:

| コマンド | パス | エイリアス | 機能 |
|---------|------|-----------|------|
| generate | `["generate"]` | `["g"]` | プロジェクトスカフォルディング |
| help | `["help"]` | `["h"]` | ヘルプ表示 |

### 1.3 型定義システムの現状

#### 現在の型定義（`src/type/`）

すべての型が最小限の定義（スケルトン状態）：

```typescript
// src/type/character.ts
export type Character = { name: string };

// src/type/setting.ts
export type Setting = { description: string };

// その他の型も同様
```

**特徴**:
- 関係性やメタデータは未定義
- 拡張に向けた基盤は整っている
- サンプルプロジェクト（`sample/`）に拡張版の実装例あり

#### サンプルプロジェクトの拡張型（`sample/src/types/character.ts`）

```typescript
export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "guest";
export type RelationType = "ally" | "enemy" | "neutral" | "romantic";

export type Character = {
  id: string;
  name: string;
  displayNames?: string[];
  aliases?: string[];
  role: CharacterRole;
  traits: string[];
  relationships: { [characterId: string]: RelationType };
  appearingChapters: string[];
  summary: string;

  // ハイブリッド詳細情報
  details?: {
    appearance?: string | { $ref: string };
    personality?: string | { $ref: string };
    backstory?: string | { $ref: string };
    development?: CharacterDevelopment;
  };

  // LSP用検出ヒント
  detectionHints?: DetectionHints;
};
```

### 1.4 StoryTellerインターフェース（`src/storyteller_interface.ts`）

```typescript
export interface StoryTeller {
  purpose: Purpose;
  funs: Fun[];
  themes?: Theme[];
  storyStructures?: StoryStructure[];
  timelines?: TimeLine[];
  charcters: Character[];  // [注: typo]
  settings: Setting[];
  chapters: Chapter[];
  plots: Plot[];

  validate(): boolean;
  output(): void;
}
```

**現状**: インターフェース定義のみ、実装なし

### 1.5 設定管理システム

#### Zodスキーマ定義（`src/shared/config/schema.ts`）

```typescript
const AppConfigSchema = z.object({
  runtime: RuntimeConfigSchema.optional().default({...}),
  logging: LoggingConfigSchema.optional().default({...}),
  features: FeatureFlagsSchema.optional().default({}),
  cache: CacheConfigSchema.optional().default({...}),
  external: ExternalConfigSchema.optional().default({...}),
});
```

#### 設定プロバイダーチェーン

優先度順:
1. `DefaultConfigurationProvider` (priority: 0) - デフォルト値
2. `EnvConfigurationProvider` (priority: 10) - 環境変数（`STORYTELLER_*`）
3. `FileConfigurationProvider` (priority: 20) - ファイル（`storyteller.json`）
4. `CliConfigurationProvider` (priority: 30) - CLI引数オーバーライド

#### 設定ファイル探索パス

```typescript
// src/cli.ts
function collectConfigPaths(args: ParsedArguments): readonly string[] {
  return [
    args.config,  // 明示的指定
    join(cwd, ".storyteller", "config.json"),
    join(cwd, "storyteller.config.json"),
  ];
}
```

### 1.6 ロギングシステム

#### ロギング型定義（`src/shared/logging/types.ts`）

```typescript
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

interface Logger {
  readonly scope: string;
  log(level: LogLevel, message: string, metadata?: LogMetadata): void;
  trace(message: string, metadata?: LogMetadata): void;
  // ... 各レベル
  withContext(context: LogContext): Logger;
}
```

#### LoggingService（`src/application/logging/logging_service.ts`）

```typescript
class LoggingService {
  constructor(options: LoggingServiceOptions) {
    this.configurationManager = options.configurationManager;
    this.factoryResolver = options.factoryResolver;
    this.globalContextResolver = options.globalContext;
  }

  getLogger(scope: string, context?: LogContext): Logger
}
```

**特徴**:
- スコープベースのコンテキスト管理
- プラグイン可能なロガーファクトリー
- グローバルコンテキストの自動付与

### 1.7 テスト構成

#### テスト分類（19ファイル）

| カテゴリ | ファイル数 | 主要テスト |
|---------|----------|-----------|
| CLI | 3 | `cli_test.ts`, `command_registry_test.ts` |
| コマンドシステム | 2 | `build_cli_manifest_test.ts` |
| 設定管理 | 2 | `config_providers_test.ts` |
| ロギング | 3 | `logging_service_test.ts` |
| ドメイン | 2 | `story_domain_service_test.ts` |
| アプリケーション | 3 | `project_scaffolding_service_test.ts` |
| その他 | 3 | `completion_fs_adapter_test.ts` |

**実行方法**:
```bash
deno test                          # 全テスト
deno test --filter "test name"     # フィルタリング
deno test --watch                  # ウォッチモード
```

### 1.8 既存の拡張ポイント

#### CLI基盤の拡張

新しいコマンドを `src/cli/modules/` に追加し、`registerCoreModules()`で登録：

```typescript
// src/cli/modules/index.ts
export function registerCoreModules(registry: CommandRegistry): void {
  registerCommandDescriptor(registry, generateCommandDescriptor);
  registerCommandDescriptor(registry, helpDescriptor);
  // 新規コマンドをここに追加
}
```

#### 設定システムの拡張

カスタムプロバイダーを追加：

```typescript
class CustomConfigurationProvider implements ConfigurationProvider {
  readonly meta = { id: "custom", priority: 25 };
  async load(): Promise<ConfigurationLayer> { ... }
}
```

#### ロギングシステムの拡張

カスタムロガーファクトリーを実装：

```typescript
class FileLoggerFactory implements LoggerFactory {
  create(scope: string, baseContext?: LogContext): LogWriter { ... }
}
```

### 1.9 既存マイグレーション関連実装

- `src/application/migration_facilitator.ts`: マイグレーション基盤
- `tests/migration_facilitator_test.ts`: テスト
- 設定ファイル名の変更履歴: `.storytellerrc` → `storyteller.json`

### 1.10 強みと制約

**強み**:
1. **層状アーキテクチャ**: CLI → Application → Domain → Infrastructure の明確な分離
2. **拡張性**: CommandRegistry、ConfigurationProvider のプラグイン可能設計
3. **テストカバレッジ**: 19ファイル、統合テスト＋ユニットテスト並行実施
4. **型安全性**: Zodスキーマ、TypeScript型システムの活用
5. **ロギング基盤**: スコープ・コンテキスト管理、プラグイン可能

**制約**:
1. 型定義が最小限（拡張が必要）
2. StoryTellerインターフェースの実装なし
3. プラグインシステムの未整備
4. バージョン管理機能の不足

---

## 2. アーキテクチャ設計方針

### 2.1 設計決定サマリー

ユーザー要件に基づき、以下の方針を採用：

| 観点 | 決定事項 |
|------|---------|
| **実装範囲** | Phase 1-5 全体を対象 |
| **CLI統合** | 既存コマンドレジストリ基盤を最大限活用 |
| **プラグイン設計** | ハイブリッド方式（コア機能は要素型単位、拡張機能は機能レイヤー単位） |
| **バージョン管理** | プロジェクト全体で単一バージョン |
| **マイグレーション** | 中央管理（`migrations/`ディレクトリで一元管理） |
| **型定義** | storytellerパッケージ内で提供 |

### 2.2 プラグインアーキテクチャ（ハイブリッド方式）

#### コアプラグイン（要素型単位）

物語の各要素ごとに独立したプラグイン：

- **CharacterPlugin**: キャラクター管理
- **SettingPlugin**: 設定・世界観管理
- **PlotPlugin**: プロット管理
- **ChapterPlugin**: チャプター管理
- その他の物語要素...

**責務**:
- 要素型の作成・編集・削除
- 要素型の検証
- 要素型スキーマのエクスポート

#### 機能プラグイン（機能レイヤー単位）

横断的な機能を提供するプラグイン：

- **DetailsPlugin**: 詳細情報追加機能
- **MigrationPlugin**: マイグレーション機能
- **LSPPlugin**: Language Server Protocol統合（将来）
- **ValidationPlugin**: 高度な検証機能（将来）

**責務**:
- 複数の要素型に対する横断的機能
- コマンドの拡張
- 型システムの拡張

### 2.3 バージョン管理方針

#### プロジェクト全体で単一バージョン

```json
{
  "version": "2.0.0",
  "storytellerVersion": "0.3.0"
}
```

**利点**:
- シンプルな管理
- マイグレーションパスの明確化
- ユーザーにとって理解しやすい

**メタデータ保存先**: `.storyteller/config.json`

### 2.4 マイグレーション方針

#### 中央管理方式

すべてのマイグレーションスクリプトを`migrations/`ディレクトリで一元管理：

```
migrations/
├── registry.ts           # マイグレーション登録
├── v1_to_v2/
│   ├── index.ts
│   ├── character_migration.ts
│   └── project_metadata_migration.ts
└── v2_to_v3/
    └── ...
```

**利点**:
- 全マイグレーションの可視性
- バージョン間のパスが明確
- テスト・検証が容易

### 2.5 型定義管理方針

#### storytellerパッケージ内提供

storyteller本体が拡張型定義を提供：

```typescript
// ユーザーのプロジェクト
import type { Character } from "@storyteller/types/v2";
```

**利点**:
- 型定義の一貫性
- バージョン管理が容易
- ユーザーは型定義を書かずに利用可能

**互換性レイヤー**:
- `src/type/v1/`: v1型定義（既存プロジェクト向け）
- `src/type/v2/`: v2型定義（新機能）
- `src/type/compat.ts`: v1↔v2変換

---

## 3. 主要コンポーネント設計

### 3.1 プラグインシステム（`src/core/plugin_system.ts`）

#### 3.1.1 プラグインインターフェース

```typescript
// 基本プラグインインターフェース
interface StorytellerPlugin {
  readonly meta: PluginMetadata;
  readonly dependencies?: string[];  // 他プラグインへの依存

  // ライフサイクルフック
  initialize?(context: PluginContext): Promise<void>;
  activate?(): Promise<void>;
  deactivate?(): Promise<void>;
}

interface PluginMetadata {
  readonly id: string;              // "core:character", "feature:details"
  readonly name: string;
  readonly version: string;
  readonly description: string;
}

interface PluginContext {
  readonly pluginRegistry: PluginRegistry;
  readonly fileSystem: FileSystemGateway;
  readonly logger: Logger;
  readonly config: ConfigurationManagerRef;
}
```

#### 3.1.2 ElementPlugin（要素型単位）

```typescript
interface ElementPlugin extends StorytellerPlugin {
  readonly elementType: string;  // "character", "setting", ...

  // 要素型ごとの機能
  createElementFile(options: CreateElementOptions): Promise<Result<ElementCreationResult, Error>>;
  validateElement(element: unknown): ValidationResult;
  exportElementSchema(): TypeSchema;
  getElementPath(name: string): string;
  getDetailsDir(): string;
}

interface CreateElementOptions {
  name: string;
  [key: string]: unknown;  // 各要素型固有のオプション
}

interface ElementCreationResult {
  filePath: string;
  element: unknown;
}
```

#### 3.1.3 FeaturePlugin（機能レイヤー単位）

```typescript
interface FeaturePlugin extends StorytellerPlugin {
  readonly featureId: string;  // "details", "migration", "lsp", ...

  // 機能ごとのフック
  extendCommands?(registry: CommandRegistry): void;
  extendTypes?(typeRegistry: TypeRegistry): void;
  registerMigrations?(migrationRegistry: MigrationRegistry): void;
}
```

#### 3.1.4 PluginRegistry

```typescript
class PluginRegistry {
  private plugins: Map<string, StorytellerPlugin> = new Map();
  private initialized: Set<string> = new Set();

  // プラグイン登録
  register(plugin: StorytellerPlugin): void {
    if (this.plugins.has(plugin.meta.id)) {
      throw new Error(`Plugin already registered: ${plugin.meta.id}`);
    }
    this.plugins.set(plugin.meta.id, plugin);
  }

  // プラグイン解決
  resolve(id: string): StorytellerPlugin | undefined {
    return this.plugins.get(id);
  }

  // 依存関係検証
  validate(): ValidationResult {
    const errors: string[] = [];

    for (const plugin of this.plugins.values()) {
      if (plugin.dependencies) {
        for (const depId of plugin.dependencies) {
          if (!this.plugins.has(depId)) {
            errors.push(`Plugin ${plugin.meta.id} depends on missing plugin: ${depId}`);
          }
        }
      }
    }

    // 循環依存チェック
    const cycles = this.detectCycles();
    if (cycles.length > 0) {
      errors.push(`Circular dependencies detected: ${cycles.join(", ")}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // 初期化（依存関係順）
  async initializeAll(context: PluginContext): Promise<void> {
    const order = this.resolveInitializationOrder();

    for (const id of order) {
      const plugin = this.plugins.get(id)!;
      if (plugin.initialize) {
        await plugin.initialize(context);
      }
      this.initialized.add(id);
    }
  }

  // プラグインタイプ別取得
  getElementPlugins(): ElementPlugin[] {
    return Array.from(this.plugins.values())
      .filter((p): p is ElementPlugin => 'elementType' in p);
  }

  getFeaturePlugins(): FeaturePlugin[] {
    return Array.from(this.plugins.values())
      .filter((p): p is FeaturePlugin => 'featureId' in p);
  }

  // ヘルパーメソッド
  resolveElementPlugin(elementType: string): ElementPlugin | undefined {
    return this.getElementPlugins().find(p => p.elementType === elementType);
  }

  private resolveInitializationOrder(): string[] {
    // トポロジカルソートで依存関係順に並べる
    // 実装省略
    return [];
  }

  private detectCycles(): string[][] {
    // 循環依存検出アルゴリズム
    // 実装省略
    return [];
  }
}
```

### 3.2 バージョン管理（`src/core/version_manager.ts`）

#### 3.2.1 プロジェクトメタデータ

```typescript
interface ProjectVersion {
  readonly version: string;              // プロジェクトバージョン e.g., "2.0.0"
  readonly storytellerVersion: string;   // storyteller本体バージョン
  readonly created: Date;
  readonly lastUpdated: Date;
}

interface FeatureFlags {
  character_details: boolean;
  migration_support: boolean;
  lsp_support: boolean;
  [key: string]: boolean;
}

interface ProjectMetadata {
  version: ProjectVersion;
  template: string;                      // "novel", "screenplay", ...
  features: FeatureFlags;
  compatibility: "strict" | "loose";
}
```

#### 3.2.2 VersionManager

```typescript
class VersionManager {
  constructor(
    private fileSystem: FileSystemGateway,
    private logger: Logger,
  ) {}

  // メタデータの読み込み
  async loadProjectMetadata(projectRoot: string): Promise<Result<ProjectMetadata, Error>> {
    const configPath = join(projectRoot, ".storyteller", "config.json");

    try {
      const content = await this.fileSystem.read(configPath);
      const metadata = JSON.parse(content) as ProjectMetadata;
      return ok(metadata);
    } catch (error) {
      return err(new Error(`Failed to load project metadata: ${error}`));
    }
  }

  // メタデータの保存
  async saveProjectMetadata(
    projectRoot: string,
    metadata: ProjectMetadata,
  ): Promise<Result<void, Error>> {
    const configPath = join(projectRoot, ".storyteller", "config.json");

    try {
      const content = JSON.stringify(metadata, null, 2);
      await this.fileSystem.write(configPath, content);
      return ok(undefined);
    } catch (error) {
      return err(new Error(`Failed to save project metadata: ${error}`));
    }
  }

  // バージョン比較（セマンティックバージョニング）
  compareVersions(a: string, b: string): -1 | 0 | 1 {
    const [aMajor, aMinor, aPatch] = a.split(".").map(Number);
    const [bMajor, bMinor, bPatch] = b.split(".").map(Number);

    if (aMajor !== bMajor) return aMajor < bMajor ? -1 : 1;
    if (aMinor !== bMinor) return aMinor < bMinor ? -1 : 1;
    if (aPatch !== bPatch) return aPatch < bPatch ? -1 : 1;
    return 0;
  }

  // 互換性チェック
  isCompatible(projectVersion: string, storytellerVersion: string): boolean {
    const [pMajor] = projectVersion.split(".").map(Number);
    const [sMajor] = storytellerVersion.split(".").map(Number);

    // メジャーバージョンが一致すれば互換性あり
    return pMajor === sMajor;
  }

  // 利用可能な更新チェック
  async checkUpdates(currentVersion: string): Promise<AvailableUpdate[]> {
    // storyteller本体の最新バージョンを確認
    // 実装省略（リリース情報APIなどから取得）
    return [];
  }
}

interface AvailableUpdate {
  version: string;
  releaseDate: Date;
  breaking: boolean;
  features: string[];
  migrationRequired: boolean;
}
```

### 3.3 マイグレーションフレームワーク（`src/plugins/features/migration/`）

#### 3.3.1 Migration インターフェース

```typescript
interface Migration {
  readonly id: string;                   // "character_v1_to_v2"
  readonly from: string;                 // "1.0.0"
  readonly to: string;                   // "2.0.0"
  readonly description: string;
  readonly breaking: boolean;

  // マイグレーション可否チェック
  canMigrate(project: ProjectContext): Promise<MigrationCheck>;

  // マイグレーション実行
  migrate(project: ProjectContext, options: MigrationOptions): Promise<MigrationResult>;

  // ロールバック
  rollback(backup: BackupContext): Promise<void>;
}

interface ProjectContext {
  readonly root: string;
  readonly metadata: ProjectMetadata;
  readonly fileSystem: FileSystemGateway;
  readonly logger: Logger;
}

interface MigrationCheck {
  canMigrate: boolean;
  issues: MigrationIssue[];
  warnings: string[];
}

interface MigrationIssue {
  severity: "error" | "warning";
  message: string;
  file?: string;
}

interface MigrationOptions {
  dryRun?: boolean;
  gitSafe?: boolean;
  interactive?: boolean;
  force?: boolean;
}

interface MigrationResult {
  success: boolean;
  filesChanged: FileChangeInfo[];
  warnings: MigrationWarning[];
  errors: MigrationError[];
  backup: BackupInfo;
}

interface FileChangeInfo {
  file: string;
  status: "created" | "updated" | "deleted";
}

interface BackupInfo {
  path: string;
  timestamp: Date;
  files: string[];
}
```

#### 3.3.2 MigrationRegistry

```typescript
class MigrationRegistry {
  private migrations: Map<string, Migration> = new Map();

  // マイグレーション登録
  register(migration: Migration): void {
    this.migrations.set(migration.id, migration);
  }

  // バージョン間のマイグレーションパスを検索
  findPath(from: string, to: string): Migration[] {
    // グラフ探索でバージョン間のパスを見つける
    // 例: 1.0.0 → 1.5.0 → 2.0.0
    const path: Migration[] = [];

    // 実装省略（幅優先探索またはダイクストラ法）

    return path;
  }

  // 段階的マイグレーション実行
  async executeChain(
    from: string,
    to: string,
    project: ProjectContext,
    options: MigrationOptions = {},
  ): Promise<Result<MigrationChainResult, Error>> {
    const path = this.findPath(from, to);

    if (path.length === 0) {
      return err(new Error(`No migration path found from ${from} to ${to}`));
    }

    const results: MigrationResult[] = [];
    let currentBackup: BackupInfo | undefined;

    for (const migration of path) {
      // マイグレーション可否チェック
      const check = await migration.canMigrate(project);
      if (!check.canMigrate && !options.force) {
        return err(new Error(`Migration ${migration.id} cannot be applied: ${check.issues.join(", ")}`));
      }

      // マイグレーション実行
      const result = await migration.migrate(project, options);
      results.push(result);

      if (!result.success) {
        // 失敗した場合、ロールバック
        if (currentBackup) {
          await migration.rollback(currentBackup);
        }
        return err(new Error(`Migration ${migration.id} failed`));
      }

      currentBackup = result.backup;
    }

    return ok({ results, finalVersion: to });
  }
}

interface MigrationChainResult {
  results: MigrationResult[];
  finalVersion: string;
}
```

#### 3.3.3 マイグレーション実装例

```typescript
// migrations/v1_to_v2/character_migration.ts
export const characterMigration: Migration = {
  id: "character_v1_to_v2",
  from: "1.0.0",
  to: "2.0.0",
  description: "Character型をv1からv2に移行",
  breaking: true,

  async canMigrate(project: ProjectContext): Promise<MigrationCheck> {
    const issues: MigrationIssue[] = [];
    const warnings: string[] = [];

    // src/type/character.ts の存在確認
    const charTypePath = join(project.root, "src", "type", "character.ts");
    const exists = await project.fileSystem.exists(charTypePath);

    if (!exists) {
      warnings.push("No character.ts found, will be created");
    }

    // キャラクターファイルの検索
    const charFiles = await findCharacterFiles(project);
    if (charFiles.length === 0) {
      warnings.push("No character files found");
    }

    return {
      canMigrate: true,
      issues,
      warnings,
    };
  },

  async migrate(
    project: ProjectContext,
    options: MigrationOptions,
  ): Promise<MigrationResult> {
    const filesChanged: FileChangeInfo[] = [];
    const warnings: MigrationWarning[] = [];
    const errors: MigrationError[] = [];

    // 1. バックアップ作成
    const backup = await createBackup(project);

    if (options.dryRun) {
      project.logger.info("Dry-run mode: no changes will be made");
      return { success: true, filesChanged: [], warnings, errors, backup };
    }

    try {
      // 2. Character型定義をv2に更新
      const typeResult = await migrateCharacterType(project);
      filesChanged.push(...typeResult.filesChanged);

      // 3. 既存のキャラクターファイルを変換
      const charFiles = await findCharacterFiles(project);

      for (const file of charFiles) {
        const v1Char = await parseV1Character(file, project.fileSystem);
        const v2Char = convertToV2Character(v1Char);
        await writeV2Character(file, v2Char, project.fileSystem);

        filesChanged.push({ file, status: "updated" });
      }

      // 4. プロジェクトメタデータの更新
      const metadata = project.metadata;
      metadata.version.version = "2.0.0";
      metadata.version.lastUpdated = new Date();
      metadata.features.character_details = true;

      const versionManager = new VersionManager(project.fileSystem, project.logger);
      await versionManager.saveProjectMetadata(project.root, metadata);

      filesChanged.push({
        file: ".storyteller/config.json",
        status: "updated",
      });

      return { success: true, filesChanged, warnings, errors, backup };

    } catch (error) {
      errors.push({
        code: "migration_failed",
        message: error instanceof Error ? error.message : String(error),
      });

      return { success: false, filesChanged, warnings, errors, backup };
    }
  },

  async rollback(backup: BackupContext): Promise<void> {
    await restoreBackup(backup);
  },
};

// ヘルパー関数
function convertToV2Character(v1Char: V1.Character): V2.Character {
  return {
    id: generateId(v1Char.name),
    name: v1Char.name,
    role: "supporting",  // デフォルト
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: v1Char.description || "",
  };
}
```

### 3.4 型システムの拡張（`src/type/v2/`）

#### 3.4.1 Character型（v2）

```typescript
// src/type/v2/character.ts

// 基本型定義
export type CharacterRole = "protagonist" | "antagonist" | "supporting" | "guest";
export type RelationType = "ally" | "enemy" | "neutral" | "romantic";

// 詳細情報型（ハイブリッド方式）
export type CharacterDetails = {
  appearance?: string | { file: string };
  personality?: string | { file: string };
  backstory?: string | { file: string };
  relationships_detail?: string | { file: string };
  goals?: string | { file: string };
  development?: CharacterDevelopment;
};

export type CharacterDevelopment = {
  initial: string;                       // 初期状態
  goal: string;                          // 目標
  obstacle: string;                      // 障害
  resolution?: string;                   // 解決
  arc_notes?: string | { file: string }; // アーク詳細
};

// LSP統合用の検出ヒント
export type DetectionHints = {
  commonPatterns: string[];              // ["勇者は", "勇者が"]
  excludePatterns: string[];             // ["勇者ではない"]
  requiresContext: boolean;              // 文脈が必要かどうか
  confidence: number;                    // 信頼度 0.0 - 1.0
};

// メインCharacter型（v2）
export type Character = {
  // 必須メタデータ（型安全性重視）
  id: string;
  name: string;
  displayNames?: string[];               // 原稿内での表記バリエーション
  aliases?: string[];                    // 別名・愛称
  pronouns?: string[];                   // 代名詞（"彼"、"彼女"など）
  role: CharacterRole;
  traits: string[];                      // 特性
  relationships: Record<string, RelationType>;
  appearingChapters: string[];           // 登場チャプター
  summary: string;                       // 1-2行の概要

  // オプショナル詳細情報（ハイブリッド方式）
  details?: CharacterDetails;

  // LSP用検出ヒント
  detectionHints?: DetectionHints;
};
```

#### 3.4.2 v1互換レイヤー（`src/type/compat.ts`）

```typescript
import * as V1 from "./v1/character.ts";
import * as V2 from "./v2/character.ts";

// v1 → v2 変換
export function migrateCharacterV1toV2(char: V1.Character): V2.Character {
  return {
    id: generateId(char.name),
    name: char.name,
    role: "supporting",
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: char.description || "",
  };
}

// v2 → v1 変換（ダウングレード）
export function downgradeCharacterV2toV1(char: V2.Character): V1.Character {
  return {
    name: char.name,
    description: char.summary,
  };
}

// ID生成ヘルパー
function generateId(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "_");
}
```

### 3.5 CLIコマンド体系

#### 3.5.1 elementコマンド（`src/cli/modules/element/`）

```typescript
// src/cli/modules/element/character.ts
class ElementCharacterCommand extends BaseCliCommand {
  readonly name = "character";
  readonly path = ["element", "character"];
  readonly aliases = ["char"];

  protected async handle(context: CommandContext): Promise<Result<unknown, CommandExecutionError>> {
    const { args, logger } = context;

    // プラグインシステムから CharacterPlugin を取得
    const pluginRegistry = context.pluginRegistry as PluginRegistry;
    const characterPlugin = pluginRegistry.resolveElementPlugin("character") as CharacterPlugin | undefined;

    if (!characterPlugin) {
      return err({
        code: "plugin_not_found",
        message: "CharacterPlugin not found",
      });
    }

    // オプション解析
    const options = this.parseOptions(args);

    logger.info("Creating character element", { name: options.name });

    // コマンド実行
    if (options.withDetails) {
      return await this.createWithDetails(characterPlugin, options, context);
    } else if (options.addDetails) {
      return await this.addDetailsToExisting(characterPlugin, options, context);
    } else if (options.separateFiles) {
      return await this.separateFiles(characterPlugin, options, context);
    } else {
      return await this.createBasic(characterPlugin, options, context);
    }
  }

  private async createBasic(
    plugin: CharacterPlugin,
    options: CreateCharacterOptions,
    context: CommandContext,
  ): Promise<Result<unknown, CommandExecutionError>> {
    const result = await plugin.createElementFile(options);

    if (result.ok) {
      context.presenter.success(`Created character: ${options.name}`);
      context.presenter.info(`File: ${result.value.filePath}`);
      return ok(result.value);
    } else {
      return err({
        code: "creation_failed",
        message: result.error.message,
      });
    }
  }

  private async createWithDetails(
    plugin: CharacterPlugin,
    options: CreateCharacterOptions,
    context: CommandContext,
  ): Promise<Result<unknown, CommandExecutionError>> {
    // DetailsPlugin を取得
    const detailsPlugin = context.pluginRegistry.resolve("feature:details") as DetailsPlugin;

    // 基本要素を作成
    const createResult = await plugin.createElementFile(options);
    if (!createResult.ok) {
      return err({ code: "creation_failed", message: createResult.error.message });
    }

    // 詳細スケルトンを追加
    const detailsResult = await detailsPlugin.addDetails(
      plugin,
      options.name,
      ["appearance", "personality", "backstory", "development"],
    );

    if (detailsResult.ok) {
      context.presenter.success(`Created character with details: ${options.name}`);
      return ok(createResult.value);
    } else {
      return err({ code: "details_failed", message: detailsResult.error.message });
    }
  }

  private async addDetailsToExisting(
    plugin: CharacterPlugin,
    options: CreateCharacterOptions,
    context: CommandContext,
  ): Promise<Result<unknown, CommandExecutionError>> {
    const detailsPlugin = context.pluginRegistry.resolve("feature:details") as DetailsPlugin;

    const result = await detailsPlugin.addDetails(
      plugin,
      options.name,
      options.addDetails || [],
    );

    if (result.ok) {
      context.presenter.success(`Added details to character: ${options.name}`);
      return ok(undefined);
    } else {
      return err({ code: "add_details_failed", message: result.error.message });
    }
  }

  private async separateFiles(
    plugin: CharacterPlugin,
    options: CreateCharacterOptions,
    context: CommandContext,
  ): Promise<Result<unknown, CommandExecutionError>> {
    const detailsPlugin = context.pluginRegistry.resolve("feature:details") as DetailsPlugin;

    const fieldsToSeparate = options.separateFiles === true
      ? ["appearance", "personality", "backstory"]  // デフォルト
      : options.separateFiles as string[];

    const result = await detailsPlugin.separateFiles(
      plugin,
      options.name,
      fieldsToSeparate,
    );

    if (result.ok) {
      context.presenter.success(`Separated files for character: ${options.name}`);
      return ok(undefined);
    } else {
      return err({ code: "separate_files_failed", message: result.error.message });
    }
  }

  private parseOptions(args: Record<string, unknown>): CreateCharacterOptions {
    return {
      name: args.name as string,
      role: (args.role as CharacterRole) || "supporting",
      summary: (args.summary as string) || "",
      traits: (args.traits as string[]) || [],
      withDetails: !!args.withDetails,
      addDetails: args.addDetails as string[] | undefined,
      separateFiles: args.separateFiles as string[] | boolean | undefined,
    };
  }
}

interface CreateCharacterOptions extends CreateElementOptions {
  name: string;
  role?: CharacterRole;
  summary?: string;
  traits?: string[];
  withDetails?: boolean;
  addDetails?: string[];
  separateFiles?: string[] | boolean;
}
```

#### 3.5.2 コマンド一覧（Phase 1-5全体）

| コマンド | パス | 機能 | Phase |
|---------|------|------|-------|
| `storyteller element character` | `["element", "character"]` | キャラクター作成 | 1 |
| `storyteller element character --with-details` | 同上 | 詳細情報付き作成 | 1 |
| `storyteller element character --add-details backstory` | 同上 | 特定詳細追加 | 4 |
| `storyteller element character --separate-files backstory` | 同上 | ファイル分離 | 4 |
| `storyteller element setting` | `["element", "setting"]` | 設定作成 | 1 |
| `storyteller version` | `["version"]` | バージョン表示 | 2 |
| `storyteller version --check` | `["version"]` | バージョン確認 | 2 |
| `storyteller update --check` | `["update"]` | 利用可能更新確認 | 2 |
| `storyteller update --apply` | `["update"]` | 更新適用 | 2 |
| `storyteller migrate` | `["migrate"]` | インタラクティブ移行 | 3 |
| `storyteller migrate --git-safe` | `["migrate"]` | Git統合移行 | 3 |
| `storyteller migrate --dry-run` | `["migrate"]` | マイグレーションプレビュー | 3 |
| `storyteller validate --completeness-report` | `["validate"]` | 完成度レポート | 5 |

### 3.6 物語要素サービス（`src/application/element_service.ts`）

```typescript
class ElementService {
  constructor(
    private pluginRegistry: PluginRegistry,
    private fileSystem: FileSystemGateway,
    private logger: Logger,
  ) {}

  // 要素作成
  async createElement(
    elementType: string,
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>> {
    const plugin = this.pluginRegistry.resolveElementPlugin(elementType);

    if (!plugin) {
      return err(new Error(`Element plugin not found: ${elementType}`));
    }

    this.logger.info(`Creating ${elementType} element`, { name: options.name });

    return await plugin.createElementFile(options);
  }

  // 詳細情報追加
  async addDetailsToElement(
    elementType: string,
    elementName: string,
    detailsToAdd: string[],
  ): Promise<Result<void, Error>> {
    const elementPlugin = this.pluginRegistry.resolveElementPlugin(elementType);
    const detailsPlugin = this.pluginRegistry.resolve("feature:details") as DetailsPlugin | undefined;

    if (!elementPlugin) {
      return err(new Error(`Element plugin not found: ${elementType}`));
    }

    if (!detailsPlugin) {
      return err(new Error("DetailsPlugin not found"));
    }

    return await detailsPlugin.addDetails(elementPlugin, elementName, detailsToAdd);
  }

  // ファイル分離
  async separateFiles(
    elementType: string,
    elementName: string,
    fieldsToSeparate: string[],
  ): Promise<Result<void, Error>> {
    const elementPlugin = this.pluginRegistry.resolveElementPlugin(elementType);
    const detailsPlugin = this.pluginRegistry.resolve("feature:details") as DetailsPlugin | undefined;

    if (!elementPlugin || !detailsPlugin) {
      return err(new Error("Required plugins not found"));
    }

    return await detailsPlugin.separateFiles(elementPlugin, elementName, fieldsToSeparate);
  }

  // 要素検証
  async validateElement(
    elementType: string,
    element: unknown,
  ): Promise<ValidationResult> {
    const plugin = this.pluginRegistry.resolveElementPlugin(elementType);

    if (!plugin) {
      return { valid: false, errors: [`Unknown element type: ${elementType}`] };
    }

    return plugin.validateElement(element);
  }
}
```

### 3.7 プラグイン実装例

#### 3.7.1 CharacterPlugin（`src/plugins/core/character/plugin.ts`）

```typescript
export class CharacterPlugin implements ElementPlugin {
  readonly meta: PluginMetadata = {
    id: "core:character",
    name: "Character Plugin",
    version: "2.0.0",
    description: "キャラクター管理プラグイン",
  };

  readonly elementType = "character";
  readonly dependencies: string[] = [];

  private context!: PluginContext;
  private logger!: Logger;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.logger = context.logger.withContext({ plugin: this.meta.id });
    this.logger.info("CharacterPlugin initialized");
  }

  async createElementFile(options: CreateElementOptions): Promise<Result<ElementCreationResult, Error>> {
    const charOptions = options as CreateCharacterOptions;

    const character: V2.Character = {
      id: this.generateId(charOptions.name),
      name: charOptions.name,
      role: charOptions.role || "supporting",
      traits: charOptions.traits || [],
      relationships: {},
      appearingChapters: [],
      summary: charOptions.summary || "",
    };

    const filePath = this.getElementPath(charOptions.name);
    const content = this.generateTypeScriptContent(character);

    try {
      await this.context.fileSystem.write(filePath, content);
      this.logger.info(`Created character file`, { filePath });

      return ok({ filePath, element: character });
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  validateElement(element: unknown): ValidationResult {
    const errors: string[] = [];

    if (typeof element !== "object" || element === null) {
      return { valid: false, errors: ["Element must be an object"] };
    }

    const char = element as Partial<V2.Character>;

    if (!char.id) errors.push("Missing required field: id");
    if (!char.name) errors.push("Missing required field: name");
    if (!char.role) errors.push("Missing required field: role");
    if (!char.summary) errors.push("Missing required field: summary");

    return { valid: errors.length === 0, errors };
  }

  exportElementSchema(): TypeSchema {
    return {
      type: "Character",
      version: "2.0.0",
      required: ["id", "name", "role", "summary"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        role: { type: "CharacterRole", enum: ["protagonist", "antagonist", "supporting", "guest"] },
        summary: { type: "string" },
        // ... その他のプロパティ
      },
    };
  }

  getElementPath(name: string): string {
    const id = this.generateId(name);
    return `src/characters/${id}.ts`;
  }

  getDetailsDir(): string {
    return "src/characters/details";
  }

  private generateId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "_");
  }

  private generateTypeScriptContent(character: V2.Character): string {
    return `import type { Character } from "@storyteller/types/v2";

export const ${character.id}: Character = ${JSON.stringify(character, null, 2)};
`;
  }
}
```

#### 3.7.2 DetailsPlugin（`src/plugins/features/details/plugin.ts`）

```typescript
export class DetailsPlugin implements FeaturePlugin {
  readonly meta: PluginMetadata = {
    id: "feature:details",
    name: "Details Plugin",
    version: "2.0.0",
    description: "要素への段階的詳細追加機能",
  };

  readonly featureId = "details";
  readonly dependencies: string[] = [];

  private context!: PluginContext;
  private logger!: Logger;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    this.logger = context.logger.withContext({ plugin: this.meta.id });
    this.logger.info("DetailsPlugin initialized");
  }

  async addDetails(
    elementPlugin: ElementPlugin,
    elementName: string,
    detailsToAdd: string[],
  ): Promise<Result<void, Error>> {
    const filePath = elementPlugin.getElementPath(elementName);

    try {
      // 1. 既存要素ファイルを読み込み
      const content = await this.context.fileSystem.read(filePath);
      const element = this.parseElement(content);

      // 2. detailsスケルトンを追加
      const updatedElement = this.addDetailsSkeleton(element, detailsToAdd);

      // 3. ファイルを更新
      const updatedContent = this.generateUpdatedContent(updatedElement);
      await this.context.fileSystem.write(filePath, updatedContent);

      this.logger.info(`Added details to element`, { elementName, detailsToAdd });

      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async separateFiles(
    elementPlugin: ElementPlugin,
    elementName: string,
    fieldsToSeparate: string[],
  ): Promise<Result<void, Error>> {
    const filePath = elementPlugin.getElementPath(elementName);
    const detailsDir = elementPlugin.getDetailsDir();

    try {
      // 1. 要素ファイルを読み込み
      const content = await this.context.fileSystem.read(filePath);
      const element = this.parseElement(content);

      // 2. 詳細ディレクトリを作成
      await this.context.fileSystem.ensureDir(detailsDir);

      // 3. 各フィールドをMarkdownファイルに分離
      for (const field of fieldsToSeparate) {
        const detailContent = element.details?.[field];

        if (typeof detailContent === "string") {
          const mdPath = join(detailsDir, `${elementName}-${field}.md`);
          await this.context.fileSystem.write(mdPath, detailContent);

          // 要素ファイル内はファイル参照に変更
          if (!element.details) element.details = {};
          element.details[field] = { file: mdPath };

          this.logger.info(`Separated field to file`, { field, mdPath });
        }
      }

      // 4. 要素ファイルを更新
      const updatedContent = this.generateUpdatedContent(element);
      await this.context.fileSystem.write(filePath, updatedContent);

      return ok(undefined);
    } catch (error) {
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private parseElement(content: string): any {
    // TypeScriptファイルからオブジェクトを抽出
    // 簡易実装: JSON.parseを想定（実際はts-morphなどを使用）
    const match = content.match(/=\s*({[\s\S]*?});/);
    if (match) {
      return JSON.parse(match[1]);
    }
    throw new Error("Failed to parse element file");
  }

  private addDetailsSkeleton(element: any, detailsToAdd: string[]): any {
    if (!element.details) {
      element.details = {};
    }

    for (const detail of detailsToAdd) {
      if (!element.details[detail]) {
        element.details[detail] = `TODO: ${detail}の説明を記述`;
      }
    }

    return element;
  }

  private generateUpdatedContent(element: any): string {
    // TypeScriptファイルを再生成
    return `import type { Character } from "@storyteller/types/v2";

export const ${element.id}: Character = ${JSON.stringify(element, null, 2)};
`;
  }
}
```

---

## 4. 新規ディレクトリ構造

### 4.1 storyteller本体（プロジェクトルート）

```
street-storyteller/
├── src/
│   ├── core/                              # 新規: コアシステム
│   │   ├── plugin_system.ts               # プラグインレジストリとライフサイクル
│   │   ├── version_manager.ts             # バージョン管理
│   │   └── element_registry.ts            # 物語要素の統一レジストリ
│   │
│   ├── plugins/                           # 新規: プラグインシステム
│   │   ├── core/                          # コアプラグイン（要素型単位）
│   │   │   ├── character/
│   │   │   │   ├── plugin.ts              # CharacterPlugin実装
│   │   │   │   ├── types.ts               # Character型拡張定義
│   │   │   │   ├── validator.ts           # Character検証ロジック
│   │   │   │   └── commands.ts            # Characterコマンドハンドラー
│   │   │   ├── setting/                   # SettingPlugin
│   │   │   ├── plot/                      # PlotPlugin
│   │   │   ├── chapter/                   # ChapterPlugin
│   │   │   └── ...                        # その他の物語要素
│   │   │
│   │   └── features/                      # 機能プラグイン（機能レイヤー単位）
│   │       ├── details/
│   │       │   ├── plugin.ts              # DetailsPlugin実装
│   │       │   ├── handler.ts             # 詳細情報追加ロジック
│   │       │   └── templates.ts           # スケルトンテンプレート
│   │       ├── migration/
│   │       │   ├── plugin.ts              # MigrationPlugin実装
│   │       │   ├── executor.ts            # マイグレーション実行エンジン
│   │       │   └── wizard.ts              # インタラクティブウィザード
│   │       ├── lsp/                       # 将来: LSPPlugin
│   │       └── validation/                # 将来: ValidationPlugin
│   │
│   ├── type/                              # 拡張: 型定義
│   │   ├── v2/                            # 新規: v2型定義
│   │   │   ├── character.ts               # 拡張Character型
│   │   │   ├── setting.ts                 # 拡張Setting型
│   │   │   ├── plot.ts                    # 拡張Plot型
│   │   │   └── ...
│   │   ├── v1/                            # 既存: v1型定義（互換性維持）
│   │   │   ├── character.ts
│   │   │   └── ...
│   │   └── compat.ts                      # 新規: v1↔v2変換レイヤー
│   │
│   ├── migrations/                        # 新規: マイグレーションスクリプト
│   │   ├── registry.ts                    # マイグレーションレジストリ
│   │   ├── v1_to_v2/
│   │   │   ├── index.ts                   # マイグレーション定義
│   │   │   ├── character_migration.ts
│   │   │   ├── setting_migration.ts
│   │   │   └── project_metadata_migration.ts
│   │   └── ...
│   │
│   ├── cli/                               # 拡張: CLI基盤
│   │   ├── modules/
│   │   │   ├── element/                   # 新規: elementコマンド
│   │   │   │   ├── index.ts
│   │   │   │   ├── character.ts
│   │   │   │   ├── setting.ts
│   │   │   │   └── ...
│   │   │   ├── update/                    # 新規: updateコマンド
│   │   │   │   └── index.ts
│   │   │   ├── migrate/                   # 新規: migrateコマンド
│   │   │   │   └── index.ts
│   │   │   ├── version/                   # 新規: versionコマンド
│   │   │   │   └── index.ts
│   │   │   ├── generate.ts                # 既存
│   │   │   ├── help.ts                    # 既存
│   │   │   └── index.ts                   # 拡張
│   │   └── ...
│   │
│   ├── application/                       # 拡張
│   │   ├── element_service.ts             # 新規: 物語要素管理サービス
│   │   ├── migration_service.ts           # 拡張: マイグレーションサービス
│   │   ├── version_service.ts             # 新規: バージョン管理サービス
│   │   └── ...
│   │
│   └── ...                                # 既存ファイル
│
├── tests/                                 # 拡張: テストスイート
│   ├── core/                              # 新規
│   │   ├── plugin_system_test.ts
│   │   └── version_manager_test.ts
│   ├── plugins/                           # 新規
│   │   ├── character_plugin_test.ts
│   │   ├── details_plugin_test.ts
│   │   └── migration_plugin_test.ts
│   ├── integration/                       # 新規
│   │   ├── element_workflow_test.ts
│   │   ├── migration_workflow_test.ts
│   │   └── cli_element_test.ts
│   └── ...                                # 既存テスト
│
└── ...
```

### 4.2 ユーザープロジェクト側

storytellerで生成されたプロジェクトの構造：

```
my-story/
├── .storyteller/                          # プロジェクトメタデータ
│   ├── config.json                        # プロジェクト設定
│   ├── version.json                       # バージョン情報（廃止予定: config.jsonに統合）
│   ├── migration-status.json              # マイグレーション進捗
│   └── backup/                            # バックアップディレクトリ
│       └── 2025-01-20T10-00-00/
│
├── src/
│   ├── characters/                        # キャラクターファイル
│   │   ├── hero.ts
│   │   ├── villain.ts
│   │   └── details/                       # 詳細情報（Markdown）
│   │       ├── hero-backstory.md
│   │       ├── hero-development.md
│   │       └── ...
│   ├── settings/                          # 設定・世界観
│   │   ├── royal_capital.ts
│   │   └── ...
│   ├── plots/                             # プロット
│   ├── chapters/                          # チャプター
│   └── ...
│
├── manuscripts/                           # 原稿（LSP統合用）
│   ├── chapter01.md
│   ├── chapter02.md
│   └── ...
│
├── storyteller.json                       # storyteller設定（オプション）
└── validate.ts                            # 検証スクリプト
```

---

## 5. 実装戦略

### 5.1 Phase 1: 基本詳細追加機能

**目標**: 既存要素に詳細情報スケルトンを追加できるようにする

**実装順序**:

1. **プラグインシステムの基盤実装** (`src/core/plugin_system.ts`)
   - `StorytellerPlugin` インターフェース定義
   - `ElementPlugin` インターフェース定義
   - `FeaturePlugin` インターフェース定義
   - `PluginRegistry` クラス実装
   - 依存関係解決・検証機能
   - テスト: `tests/core/plugin_system_test.ts`

2. **Character型のv2拡張** (`src/type/v2/character.ts`)
   - `CharacterRole`, `RelationType` 型定義
   - `CharacterDetails` 型定義（ハイブリッド方式）
   - `CharacterDevelopment` 型定義
   - `DetectionHints` 型定義
   - メイン `Character` 型定義
   - v1互換レイヤー実装 (`src/type/compat.ts`)
   - テスト: `tests/type/character_v2_test.ts`

3. **CharacterPlugin実装** (`src/plugins/core/character/`)
   - `CharacterPlugin` クラス実装
   - `createElementFile()` メソッド
   - `validateElement()` メソッド
   - `exportElementSchema()` メソッド
   - テスト: `tests/plugins/character_plugin_test.ts`

4. **DetailsPlugin実装** (`src/plugins/features/details/`)
   - `DetailsPlugin` クラス実装
   - `addDetails()` メソッド（スケルトン追加）
   - テンプレート生成機能
   - テスト: `tests/plugins/details_plugin_test.ts`

5. **ElementService実装** (`src/application/element_service.ts`)
   - `createElement()` メソッド
   - `addDetailsToElement()` メソッド
   - テスト: `tests/application/element_service_test.ts`

6. **elementコマンド実装** (`src/cli/modules/element/`)
   - `ElementCharacterCommand` クラス実装
   - `--with-details` オプション処理
   - `--add-details` オプション処理
   - コマンド登録（`src/cli/modules/index.ts`）
   - テスト: `tests/cli/element_command_test.ts`

7. **統合テスト**
   - `tests/integration/element_workflow_test.ts`
   - エンドツーエンドのワークフローテスト

**成果物**:
- `storyteller element character --name "hero" --role "protagonist" --summary "概要"` の実装
- `storyteller element character --name "hero" --with-details` の実装
- `storyteller element character --name "hero" --add-details "backstory,development"` の実装

**推定工数**: 2-3週間

---

### 5.2 Phase 2: プロジェクト更新機能

**目標**: プロジェクトメタデータ管理と更新チェック

**実装順序**:

1. **VersionManager実装** (`src/core/version_manager.ts`)
   - `ProjectMetadata` 型定義
   - `ProjectVersion` 型定義
   - `FeatureFlags` 型定義
   - `loadProjectMetadata()` メソッド
   - `saveProjectMetadata()` メソッド
   - `compareVersions()` メソッド
   - `isCompatible()` メソッド
   - `checkUpdates()` メソッド
   - テスト: `tests/core/version_manager_test.ts`

2. **プロジェクトメタデータスキーマ定義**
   - Zod スキーマ定義（`src/shared/config/schema.ts` 拡張）
   - `.storyteller/config.json` 形式の定義
   - デフォルト値の設定

3. **VersionService実装** (`src/application/version_service.ts`)
   - プロジェクトメタデータの管理
   - バージョン互換性チェック
   - 更新可能性の判定
   - テスト: `tests/application/version_service_test.ts`

4. **versionコマンド実装** (`src/cli/modules/version/`)
   - `VersionCommand` クラス実装
   - `--check` オプション（互換性チェック）
   - バージョン情報表示
   - テスト: `tests/cli/version_command_test.ts`

5. **updateコマンド実装** (`src/cli/modules/update/`)
   - `UpdateCommand` クラス実装
   - `--check` オプション（利用可能更新確認）
   - `--apply` オプション（更新適用）
   - `--add-feature <feature>` オプション（機能追加）
   - テスト: `tests/cli/update_command_test.ts`

6. **統合テスト**
   - `tests/integration/version_workflow_test.ts`
   - プロジェクト作成 → バージョン確認 → 更新のフロー

**成果物**:
- `.storyteller/config.json` の自動管理
- `storyteller version --check` の実装
- `storyteller update --check` の実装
- `storyteller update --apply` の実装

**推定工数**: 1-2週間

---

### 5.3 Phase 3: マイグレーションシステム

**目標**: v1→v2の自動マイグレーションとロールバック

**実装順序**:

1. **Migration インターフェース定義** (`src/migrations/registry.ts`)
   - `Migration` インターフェース
   - `MigrationCheck` 型定義
   - `MigrationResult` 型定義
   - `MigrationOptions` 型定義
   - テスト: `tests/migrations/migration_interface_test.ts`

2. **MigrationRegistry実装** (`src/migrations/registry.ts`)
   - マイグレーション登録機能
   - `findPath()` メソッド（バージョン間パス探索）
   - `executeChain()` メソッド（段階的マイグレーション）
   - テスト: `tests/migrations/migration_registry_test.ts`

3. **MigrationPlugin実装** (`src/plugins/features/migration/`)
   - `MigrationPlugin` クラス実装
   - マイグレーション実行エンジン
   - バックアップ機能
   - ロールバック機能
   - テスト: `tests/plugins/migration_plugin_test.ts`

4. **v1→v2マイグレーションスクリプト** (`migrations/v1_to_v2/`)
   - `character_migration.ts` 実装
   - `setting_migration.ts` 実装
   - `project_metadata_migration.ts` 実装
   - テスト: `tests/migrations/v1_to_v2_test.ts`

5. **インタラクティブウィザード** (`src/plugins/features/migration/wizard.ts`)
   - マイグレーション分析
   - ユーザー選択（自動/インタラクティブ/ドライラン）
   - 進捗表示
   - テスト: `tests/plugins/migration_wizard_test.ts`

6. **Git統合機能** (`src/plugins/features/migration/git_integration.ts`)
   - マイグレーションブランチ作成
   - ステップごとのコミット
   - ロールバック用の履歴管理
   - テスト: `tests/plugins/migration_git_test.ts`

7. **migrateコマンド実装** (`src/cli/modules/migrate/`)
   - `MigrateCommand` クラス実装
   - `--git-safe` オプション
   - `--dry-run` オプション
   - `--interactive` オプション
   - テスト: `tests/cli/migrate_command_test.ts`

8. **統合テスト**
   - `tests/integration/migration_workflow_test.ts`
   - v1プロジェクト作成 → v2マイグレーション → 検証

**成果物**:
- `storyteller migrate` インタラクティブウィザード
- `storyteller migrate --git-safe` の実装
- `storyteller migrate --dry-run` の実装
- バックアップ・ロールバック機能
- v1→v2マイグレーションの完全実装

**推定工数**: 3-4週間

---

### 5.4 Phase 4: ファイル分離機能

**目標**: インライン詳細をMarkdownファイルに分離

**実装順序**:

1. **DetailsPlugin拡張（ファイル分離）** (`src/plugins/features/details/`)
   - `separateFiles()` メソッド実装
   - インライン→ファイル参照変換ロジック
   - テスト: `tests/plugins/details_separate_test.ts`

2. **Markdownテンプレート生成** (`src/plugins/features/details/templates.ts`)
   - 各詳細フィールドのMarkdownテンプレート
   - フロントマター対応（メタデータ埋め込み）
   - テスト: `tests/plugins/details_templates_test.ts`

3. **ファイル参照整合性チェック** (`src/plugins/features/details/validator.ts`)
   - ファイル参照の存在確認
   - 循環参照の検出
   - 壊れたリンクの警告
   - テスト: `tests/plugins/details_validator_test.ts`

4. **elementコマンド拡張**
   - `--separate-files <fields>` オプション実装
   - `--separate-files all` オプション（全フィールド分離）
   - テスト: `tests/cli/element_separate_files_test.ts`

5. **統合テスト**
   - `tests/integration/separate_files_workflow_test.ts`
   - インライン作成 → ファイル分離 → 整合性検証

**成果物**:
- `storyteller element character --separate-files backstory` の実装
- `storyteller element character --separate-files all` の実装
- 自動Markdownファイル生成
- インライン⇔ファイル参照の双方向変換

**推定工数**: 2週間

---

### 5.5 Phase 5: 高度な管理機能

**目標**: 完成度レポート、一括処理、強制上書き

**実装順序**:

1. **詳細完成度分析** (`src/application/completeness_analyzer.ts`)
   - 要素ごとの詳細完成度計算
   - 必須フィールドの充足率
   - TODOマーカーの検出
   - テスト: `tests/application/completeness_analyzer_test.ts`

2. **validateコマンド拡張** (`src/cli/modules/validate/`)
   - `--completeness-report` オプション実装
   - レポート形式の出力（テーブル、グラフ）
   - テスト: `tests/cli/validate_completeness_test.ts`

3. **一括詳細追加機能** (`src/application/batch_operations.ts`)
   - 複数要素への一括詳細追加
   - フィルタリング機能（役割別、チャプター別）
   - テスト: `tests/application/batch_operations_test.ts`

4. **強制上書き機能**
   - `--force` オプションの実装
   - 既存詳細の上書き確認
   - テスト: `tests/cli/force_option_test.ts`

5. **統合テスト**
   - `tests/integration/advanced_management_test.ts`
   - 完成度分析 → 一括処理 → 検証のフロー

**成果物**:
- `storyteller validate --completeness-report` の実装
- 詳細情報の完成度可視化
- 複数要素への一括操作
- `--force` オプションによる上書き・強制更新

**推定工数**: 2週間

---

### 5.6 全Phase合計推定工数

| Phase | 機能 | 工数 |
|-------|------|------|
| Phase 1 | 基本詳細追加機能 | 2-3週間 |
| Phase 2 | プロジェクト更新機能 | 1-2週間 |
| Phase 3 | マイグレーションシステム | 3-4週間 |
| Phase 4 | ファイル分離機能 | 2週間 |
| Phase 5 | 高度な管理機能 | 2週間 |
| **合計** | | **10-13週間** |

---

## 6. テスト戦略

### 6.1 テストレベル

#### 6.1.1 ユニットテスト

各コンポーネントの単体テスト：

```typescript
// tests/core/plugin_system_test.ts
Deno.test("PluginRegistry - register and resolve", () => {
  const registry = new PluginRegistry();
  const plugin: StorytellerPlugin = {
    meta: { id: "test:plugin", name: "Test", version: "1.0.0", description: "" },
  };

  registry.register(plugin);
  const resolved = registry.resolve("test:plugin");

  assertEquals(resolved, plugin);
});

Deno.test("PluginRegistry - dependency validation", () => {
  const registry = new PluginRegistry();

  const pluginA: StorytellerPlugin = {
    meta: { id: "test:a", name: "A", version: "1.0.0", description: "" },
    dependencies: ["test:b"],
  };

  registry.register(pluginA);

  const result = registry.validate();
  assertFalse(result.valid);
  assertEquals(result.errors.length, 1);
  assert(result.errors[0].includes("missing plugin: test:b"));
});
```

**対象**:
- `src/core/plugin_system.ts`
- `src/core/version_manager.ts`
- `src/plugins/core/character/plugin.ts`
- `src/plugins/features/details/plugin.ts`
- `src/plugins/features/migration/plugin.ts`
- `src/type/compat.ts`

#### 6.1.2 統合テスト

複数コンポーネントの連携テスト：

```typescript
// tests/integration/element_workflow_test.ts
Deno.test("Element workflow - create character with details", async () => {
  // セットアップ
  const tempDir = await Deno.makeTempDir();
  const context = createTestContext(tempDir);

  // プラグイン初期化
  const pluginRegistry = new PluginRegistry();
  const characterPlugin = new CharacterPlugin();
  const detailsPlugin = new DetailsPlugin();

  pluginRegistry.register(characterPlugin);
  pluginRegistry.register(detailsPlugin);
  await pluginRegistry.initializeAll(context);

  // ElementService経由で要素作成
  const elementService = new ElementService(pluginRegistry, context.fileSystem, context.logger);

  const createResult = await elementService.createElement("character", {
    name: "hero",
    role: "protagonist",
    summary: "The main character",
  });

  assert(createResult.ok);

  // 詳細追加
  const detailsResult = await elementService.addDetailsToElement(
    "character",
    "hero",
    ["backstory", "development"],
  );

  assert(detailsResult.ok);

  // ファイルの検証
  const filePath = join(tempDir, "src/characters/hero.ts");
  const content = await Deno.readTextFile(filePath);

  assert(content.includes("backstory"));
  assert(content.includes("TODO: backstoryの説明を記述"));

  // クリーンアップ
  await Deno.remove(tempDir, { recursive: true });
});
```

**対象**:
- 要素作成ワークフロー
- マイグレーションワークフロー
- ファイル分離ワークフロー

#### 6.1.3 E2Eテスト

CLIコマンドを含むエンドツーエンドテスト：

```typescript
// tests/e2e/create_character_with_details_test.ts
Deno.test("E2E - storyteller element character --with-details", async () => {
  const tempDir = await Deno.makeTempDir();

  // プロジェクト初期化
  await runCLI(["generate", "my-story"], { cwd: tempDir });

  const projectDir = join(tempDir, "my-story");

  // キャラクター作成（詳細付き）
  const result = await runCLI([
    "element",
    "character",
    "--name", "hero",
    "--role", "protagonist",
    "--summary", "The brave hero",
    "--with-details",
  ], { cwd: projectDir });

  assertEquals(result.exitCode, 0);
  assert(result.stdout.includes("Created character with details: hero"));

  // ファイルの検証
  const charFile = join(projectDir, "src/characters/hero.ts");
  const content = await Deno.readTextFile(charFile);

  assert(content.includes("appearance"));
  assert(content.includes("personality"));
  assert(content.includes("backstory"));

  // クリーンアップ
  await Deno.remove(tempDir, { recursive: true });
});
```

**対象**:
- `storyteller element character --with-details`
- `storyteller migrate --git-safe`
- `storyteller element character --separate-files`

### 6.2 テストカバレッジ目標

| カテゴリ | 目標カバレッジ |
|---------|--------------|
| コアシステム (`src/core/`) | 90%以上 |
| プラグイン (`src/plugins/`) | 85%以上 |
| CLIコマンド (`src/cli/modules/`) | 80%以上 |
| アプリケーション層 (`src/application/`) | 85%以上 |
| 型定義・ユーティリティ | 75%以上 |

### 6.3 テスト実行コマンド

```bash
# 全テスト実行
deno test

# ユニットテストのみ
deno test tests/core/ tests/plugins/ tests/type/

# 統合テストのみ
deno test tests/integration/

# E2Eテストのみ
deno test tests/e2e/

# カバレッジ付き
deno test --coverage=coverage/
deno coverage coverage/

# ウォッチモード
deno test --watch

# 特定のテストをフィルタリング
deno test --filter "CharacterPlugin"
```

---

## 7. リスクと対策

### 7.1 リスク1: 既存プロジェクトとの互換性

**リスク内容**:
- v1型定義を使用している既存プロジェクトが動作しなくなる
- マイグレーション失敗時にデータが壊れる

**対策**:
1. **v1型定義の保持**: `src/type/v1/` で v1 型定義を維持し、既存プロジェクトが引き続き動作
2. **互換レイヤー**: `src/type/compat.ts` で v1↔v2 の自動変換を提供
3. **バックアップ必須**: マイグレーション実行前に必ず `.storyteller/backup/` にバックアップ
4. **ドライランモード**: `--dry-run` で変更内容をプレビュー可能
5. **ロールバック機能**: マイグレーション失敗時は自動的にバックアップから復元

**検証方法**:
- 既存のv1プロジェクトでの動作テスト
- マイグレーション前後の比較テスト
- ロールバックの動作確認テスト

---

### 7.2 リスク2: プラグイン依存関係の複雑化

**リスク内容**:
- プラグイン間の依存関係が複雑になり、初期化順序の問題が発生
- 循環依存が発生してシステムが起動しない

**対策**:
1. **依存関係検証**: `PluginRegistry.validate()` で登録時に依存関係をチェック
2. **循環依存検出**: グラフ探索アルゴリズムで循環依存を検出し、エラーを報告
3. **明確な初期化順序**: トポロジカルソートで依存関係順に初期化
4. **依存関係の文書化**: 各プラグインの依存関係をREADMEに明記
5. **最小限の依存**: コアプラグインは他プラグインに依存しない設計

**検証方法**:
- 依存関係グラフの可視化
- 循環依存のユニットテスト
- 初期化順序のログ出力と検証

---

### 7.3 リスク3: マイグレーション失敗時のデータ損失

**リスク内容**:
- マイグレーション中のエラーでデータが部分的に壊れる
- ロールバック失敗でバックアップも復元できない

**対策**:
1. **Git統合**: `--git-safe` オプションでGitブランチ＋コミット単位の管理
2. **ステップごとのバックアップ**: 各マイグレーションステップ前にバックアップ作成
3. **トランザクション的実行**: 失敗時は即座にロールバック
4. **ユーザー確認**: インタラクティブモードで変更内容を確認してから実行
5. **テスト環境での事前検証**: ドライランモードで問題を事前検出

**検証方法**:
- マイグレーション失敗シナリオのテスト
- ロールバック機能の動作確認
- Git統合のE2Eテスト

---

### 7.4 リスク4: TypeScriptファイルのAST解析・編集の複雑性

**リスク内容**:
- TypeScriptファイルの解析・編集が複雑で、バグが発生しやすい
- 既存のコードフォーマットが壊れる

**対策**:
1. **段階的実装**: 最初は単純なテンプレート生成から開始
2. **Deno標準API活用**: Deno の TypeScript API を利用
3. **ts-morph検討**: 必要に応じて `ts-morph` ライブラリの導入を検討
4. **フォーマット保持**: 既存のインデント・改行を可能な限り保持
5. **Prettierとの統合**: 編集後に Prettier でフォーマット

**検証方法**:
- 様々なTypeScript構文でのパーステスト
- フォーマット前後の比較テスト
- 既存ファイル編集の回帰テスト

---

### 7.5 リスク5: パフォーマンス問題

**リスク内容**:
- 大規模プロジェクトでマイグレーションが遅い
- 多数のプラグイン初期化に時間がかかる

**対策**:
1. **並列処理**: 独立したファイルの処理を並列化
2. **キャッシング**: 解析結果をキャッシュして再利用
3. **進捗表示**: 長時間かかる処理では進捗バーを表示
4. **段階的初期化**: 必要なプラグインのみを初期化
5. **ベンチマーク**: 定期的にパフォーマンステストを実施

**検証方法**:
- 大規模プロジェクトでのベンチマークテスト
- プラグイン初期化時間の測定
- メモリ使用量のモニタリング

---

### 7.6 リスク6: ドキュメント不足によるユーザー混乱

**リスク内容**:
- 新機能の使い方がわからない
- マイグレーション手順が不明確

**対策**:
1. **包括的なドキュメント**: README、ARCHITECTURE.md、各プラグインのドキュメント
2. **チュートリアル**: ステップバイステップのチュートリアル作成
3. **エラーメッセージの充実**: エラー時に具体的な解決策を提示
4. **ヘルプコマンド**: `storyteller help` で詳細なヘルプを表示
5. **サンプルプロジェクト**: 各機能を使ったサンプルを提供

**検証方法**:
- ユーザビリティテスト
- ドキュメントのレビュー
- サンプルプロジェクトの動作確認

---

## まとめ

このアーキテクチャ設計書は、Issue #2「TypeScript型による物語要素の表現力向上」を実現するための包括的な実装計画を提供します。

### 主要な特徴

1. **既存基盤の最大活用**: CommandRegistry、ConfigurationProvider、LoggingServiceなどの既存システムを継承・拡張
2. **プラグインベース設計**: コア機能（要素型単位）と拡張機能（機能レイヤー単位）を明確に分離
3. **バージョン管理とマイグレーション**: プロジェクト全体のバージョン管理と安全な移行機構
4. **ハイブリッド型システム**: TypeScriptでメタデータ管理、詳細情報はインライン/ファイル分離選択可能
5. **段階的実装**: Phase 1-5の明確なマイルストーンで、各段階で実用的な機能を提供

### 期待される効果

- **段階的開発**: 最低限から始めて段階的に詳細化
- **非破壊的拡張**: 既存作業を無駄にしない追加機能
- **柔軟な選択**: インライン/ファイル分離の後からの変更
- **進捗管理**: 詳細情報の完成度を可視化
- **チーム開発**: 分担作業とレビューの効率化
- **保守性**: 大規模プロジェクトでの管理性向上
- **継続的アップデート**: 既存プロジェクトも新機能を享受

### 次のステップ

1. Phase 1の実装開始（プラグインシステム基盤）
2. CharacterPlugin とDetailsPluginの実装
3. element characterコマンドの実装
4. Phase 1の統合テスト
5. Phase 2以降への展開

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-23
**Author**: Claude Code (Planning Agent)
