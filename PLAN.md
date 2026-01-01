---
mission_id: frontmatter-auto-sync-v1
title: "原稿メタデータ自動更新機能"
status: completed
progress: 100
phase: completed
tdd_mode: true
blockers: 0
created_at: "2026-01-01"
updated_at: "2026-01-01"
---

# Commander's Intent

## Purpose
- エディタでの保存時やCLIコマンド実行時に、原稿ファイル（Markdown）のFrontMatterメタデータを自動的に更新する
- LSPでの情報確認やLLMへの問い合わせ時にメタ情報を効果的に取得できるようにする
- 手動でのFrontMatter更新の手間を削減し、常に最新状態を維持する

## End State
- `storyteller meta sync` CLIコマンドが動作し、原稿のFrontMatterを自動更新できる
- LSP `textDocument/didSave` で自動的にFrontMatterが更新される
- MCP `manuscript_sync` ツールでLLMからFrontMatter同期を実行できる
- `storyteller meta watch --sync-frontmatter` でファイル監視時にFrontMatterも同時更新される

## Key Tasks
- FrontmatterSyncService の実装（コアサービス）
- CLI `meta sync` コマンドの実装
- LSP `didSave` ハンドラの実装
- MCP `manuscript_sync` ツールの実装
- `meta watch` への `--sync-frontmatter` オプション追加

## Constraints
- 既存のFrontMatter手動編集を破壊しない（add-onlyがデフォルト）
- 信頼度閾値以下のエンティティは自動追加しない（デフォルト0.85）
- 既存のテストを壊さない

## Restraints
- TDD（テスト駆動開発）を厳守すること
- 既存の `FrontmatterEditor`, `PositionedDetector`, `EntityValidator` を再利用すること
- Result型パターンでエラーハンドリングを行うこと

---

# Context

## 概要
- 原稿ファイル保存時に、検出されたキャラクター・設定・伏線等のエンティティをFrontMatterに自動追加
- CLI/LSP/MCP/meta watch の4つのトリガーポイントから統一的に呼び出せる設計
- 既存の検出ロジック（PositionedDetector）とFrontMatter編集（FrontmatterEditor）を統合

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテスト、フォーマッタ、Linterが通過していること
- **各Process開始時のブリーフィング実行**
  - 各Processの「Briefing」セクションは自動生成される
  - `@process-briefing` コメントを含むセクションは、エージェントが実行時に以下を自動取得する：
    - **Related Lessons**: stigmergy/doctrine-memoriesから関連教訓を取得
    - **Known Patterns**: プロジェクト固有パターン・テンプレートから自動取得
    - **Watch Points**: 過去の失敗事例・注意点から自動取得
  - ブリーフィング情報は `/x` や `/d` コマンド実行時に動的に埋め込まれ、実行戦況を反映する

## 開発のゴール
- 原稿ファイルのFrontMatterを自動的に最新状態に保つ機能を実装
- 4つのトリガーポイント（CLI/LSP/MCP/meta watch）から統一的に利用可能にする
- 既存コードを最大限再利用し、保守性の高い設計を実現

---

# References

| @ref | @target | @test |
|------|---------|-------|
| src/application/meta/frontmatter_editor.ts | src/application/meta/frontmatter_sync_service.ts | tests/application/meta/frontmatter_sync_service_test.ts |
| src/application/meta/frontmatter_parser.ts | src/application/meta/frontmatter_sync_service.ts | tests/application/meta/frontmatter_sync_service_test.ts |
| src/lsp/detection/positioned_detector.ts | src/application/meta/frontmatter_sync_service.ts | tests/application/meta/frontmatter_sync_service_test.ts |
| src/application/meta/entity_validator.ts | src/application/meta/frontmatter_sync_service.ts | tests/application/meta/frontmatter_sync_service_test.ts |
| src/mcp/tools/definitions/manuscript_binding.ts | src/mcp/tools/definitions/manuscript_sync.ts | tests/mcp/tools/definitions/manuscript_sync_test.ts |
| src/cli/modules/meta/watch.ts | src/cli/modules/meta/sync.ts | tests/cli/modules/meta/sync_test.ts |
| src/cli/modules/meta/generate.ts | src/cli/modules/meta/sync.ts | tests/cli/modules/meta/sync_test.ts |
| src/lsp/server/server.ts | src/lsp/server/server.ts (修正) | tests/lsp/server/server_did_save_test.ts |

---

# Progress Map

| Process | Status | Progress | Phase | Notes |
|---------|--------|----------|-------|-------|
| Process 1 | completed | ▮▮▮▮▮ 100% | Done | SyncOptions/SyncResult型定義 |
| Process 2 | completed | ▮▮▮▮▮ 100% | Done | FrontmatterSyncService基本構造 |
| Process 3 | completed | ▮▮▮▮▮ 100% | Done | sync()メソッド - add モード |
| Process 4 | completed | ▮▮▮▮▮ 100% | Done | sync()メソッド - sync モード |
| Process 5 | completed | ▮▮▮▮▮ 100% | Done | preview()メソッド（dryRun） |
| Process 6 | completed | ▮▮▮▮▮ 100% | Done | 信頼度閾値フィルタリング |
| Process 7 | completed | ▮▮▮▮▮ 100% | Done | 全エンティティタイプ対応 |
| Process 8 | completed | ▮▮▮▮▮ 100% | Done | CLI meta sync コマンド基本 |
| Process 9 | completed | ▮▮▮▮▮ 100% | Done | CLI meta sync オプション |
| Process 10 | completed | ▮▮▮▮▮ 100% | Done | ユニットテスト統合 |
| Process 11 | completed | ▮▮▮▮▮ 100% | Done | LSP didSave ハンドラ |
| Process 12 | completed | ▮▮▮▮▮ 100% | Done | LSP 設定読み込み |
| Process 13 | completed | ▮▮▮▮▮ 100% | Done | MCP manuscript_sync ツール |
| Process 14 | completed | ▮▮▮▮▮ 100% | Done | meta watch --sync-frontmatter |
| Process 50 | skipped | - | - | フォローアップ（予約） |
| Process 100 | completed | ▮▮▮▮▮ 100% | Done | リファクタリング・品質向上 |
| Process 200 | completed | ▮▮▮▮▮ 100% | Done | ドキュメンテーション |
| Process 300 | in_progress | ▮▮▮▯▯ 60% | Act | OODAフィードバックループ |
| | | | | |
| **Overall** | **completed** | **▮▮▮▮▮ 100%** | **Done** | **Blockers: 0** |

---

# Processes

## Process 1: SyncOptions/SyncResult型定義

<!--@process-briefing
category: implementation
tags: [types, core, frontmatter]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
FrontmatterSyncServiceで使用する型定義を作成する。

### 修正対象ファイル
- **新規作成**: `src/application/meta/frontmatter_sync_service.ts`
- **テスト**: `tests/application/meta/frontmatter_sync_service_test.ts`

### 詳細仕様

#### SyncOptions型
```typescript
// src/application/meta/frontmatter_sync_service.ts

import type { BindableEntityType } from "@storyteller/application/meta/frontmatter_editor.ts";

/**
 * FrontMatter同期オプション
 */
export interface SyncOptions {
  /** 同期モード: add=追加のみ, sync=検出結果で置換 */
  mode: "add" | "sync";
  /** 対象エンティティタイプ */
  entityTypes: BindableEntityType[];
  /** 自動追加する信頼度閾値 (0.0-1.0) */
  confidenceThreshold: number;
  /** プレビューモード（ファイル更新なし） */
  dryRun: boolean;
}

/**
 * デフォルトオプション
 */
export const DEFAULT_SYNC_OPTIONS: Readonly<SyncOptions> = {
  mode: "add",
  entityTypes: ["characters", "settings", "foreshadowings", "timelines", "timeline_events", "phases"],
  confidenceThreshold: 0.85,
  dryRun: false,
};
```

#### SyncResult型
```typescript
/**
 * エンティティタイプ別の変更情報
 */
export interface EntityChange {
  type: BindableEntityType;
  ids: string[];
}

/**
 * FrontMatter同期結果
 */
export interface SyncResult {
  /** 原稿ファイルパス */
  path: string;
  /** 変更があったかどうか */
  changed: boolean;
  /** 追加されたエンティティ */
  added: EntityChange[];
  /** 削除されたエンティティ（syncモード時のみ） */
  removed: EntityChange[];
  /** 変更なしのエンティティ */
  unchanged: EntityChange[];
  /** 処理にかかった時間（ミリ秒） */
  durationMs: number;
}
```

### Red Phase: テスト作成と失敗確認
- [ ] テストファイル `tests/application/meta/frontmatter_sync_service_test.ts` を作成
  - SyncOptions型のプロパティが正しく定義されているか
  - DEFAULT_SYNC_OPTIONSのデフォルト値が正しいか
  - SyncResult型のプロパティが正しく定義されているか
- [ ] テストを実行して失敗することを確認（モジュールが存在しない）

```typescript
// tests/application/meta/frontmatter_sync_service_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  DEFAULT_SYNC_OPTIONS,
  type SyncOptions,
  type SyncResult,
} from "@storyteller/application/meta/frontmatter_sync_service.ts";

describe("FrontmatterSyncService Types", () => {
  describe("DEFAULT_SYNC_OPTIONS", () => {
    it("should have correct default values", () => {
      assertEquals(DEFAULT_SYNC_OPTIONS.mode, "add");
      assertEquals(DEFAULT_SYNC_OPTIONS.confidenceThreshold, 0.85);
      assertEquals(DEFAULT_SYNC_OPTIONS.dryRun, false);
      assertEquals(DEFAULT_SYNC_OPTIONS.entityTypes.length, 6);
    });
  });

  describe("SyncOptions", () => {
    it("should accept valid options", () => {
      const options: SyncOptions = {
        mode: "sync",
        entityTypes: ["characters", "settings"],
        confidenceThreshold: 0.9,
        dryRun: true,
      };
      assertExists(options);
    });
  });

  describe("SyncResult", () => {
    it("should accept valid result", () => {
      const result: SyncResult = {
        path: "manuscripts/chapter01.md",
        changed: true,
        added: [{ type: "characters", ids: ["hero"] }],
        removed: [],
        unchanged: [{ type: "settings", ids: ["kingdom"] }],
        durationMs: 150,
      };
      assertExists(result);
      assertEquals(result.changed, true);
    });
  });
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] `src/application/meta/frontmatter_sync_service.ts` に型定義を追加
- [ ] SyncOptions, SyncResult, EntityChange, DEFAULT_SYNC_OPTIONS をエクスポート
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] 型定義のJSDocコメントを追加
- [ ] `deno fmt` と `deno lint` を実行
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 2: FrontmatterSyncService基本構造

<!--@process-briefing
category: implementation
tags: [service, core, frontmatter]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
FrontmatterSyncServiceクラスの基本構造（コンストラクタ、依存関係注入）を実装する。

### 修正対象ファイル
- **修正**: `src/application/meta/frontmatter_sync_service.ts`
- **テスト**: `tests/application/meta/frontmatter_sync_service_test.ts`

### 詳細仕様

#### クラス構造
```typescript
import { type Result, ok, err } from "@storyteller/shared/result.ts";
import { FrontmatterEditor, type BindableEntityType } from "@storyteller/application/meta/frontmatter_editor.ts";
import { EntityValidator } from "@storyteller/application/meta/entity_validator.ts";
import { PositionedDetector, type DetectableEntity, type PositionedMatch } from "@storyteller/lsp/detection/positioned_detector.ts";

/**
 * 同期エラー型
 */
export type SyncError =
  | { type: "file_not_found"; message: string; path: string }
  | { type: "read_error"; message: string; cause?: unknown }
  | { type: "write_error"; message: string; cause?: unknown }
  | { type: "frontmatter_error"; message: string; cause?: unknown }
  | { type: "detection_error"; message: string; cause?: unknown };

/**
 * FrontMatter同期サービス
 *
 * 原稿ファイル内のエンティティ参照を検出し、FrontMatterに自動追加/同期する。
 *
 * 依存関係:
 * - PositionedDetector: エンティティ参照の検出
 * - FrontmatterEditor: FrontMatterの編集
 * - EntityValidator: エンティティIDの存在確認
 */
export class FrontmatterSyncService {
  private readonly projectRoot: string;
  private readonly detector: PositionedDetector;
  private readonly editor: FrontmatterEditor;
  private readonly validator: EntityValidator;

  constructor(
    projectRoot: string,
    entities: DetectableEntity[],
    options?: {
      detector?: PositionedDetector;
      editor?: FrontmatterEditor;
      validator?: EntityValidator;
    }
  ) {
    this.projectRoot = projectRoot;
    this.detector = options?.detector ?? new PositionedDetector(entities);
    this.editor = options?.editor ?? new FrontmatterEditor();
    this.validator = options?.validator ?? new EntityValidator(projectRoot);
  }

  /**
   * FrontMatterを同期する（メインAPI）
   */
  async sync(path: string, options: Partial<SyncOptions> = {}): Promise<Result<SyncResult, SyncError>> {
    // Process 3-4で実装
    throw new Error("Not implemented");
  }

  /**
   * 変更内容をプレビューする（ファイル更新なし）
   */
  async preview(path: string, options: Partial<SyncOptions> = {}): Promise<Result<SyncResult, SyncError>> {
    // Process 5で実装
    throw new Error("Not implemented");
  }
}
```

### Red Phase: テスト作成と失敗確認
- [ ] コンストラクタのテストケースを作成
  - projectRootを受け取ること
  - entitiesを受け取ること
  - オプションで依存関係を注入できること
- [ ] テストを実行して失敗することを確認

```typescript
describe("FrontmatterSyncService", () => {
  describe("constructor", () => {
    it("should create instance with project root and entities", () => {
      const entities: DetectableEntity[] = [
        { kind: "character", id: "hero", name: "Hero", filePath: "src/characters/hero.ts" },
      ];
      const service = new FrontmatterSyncService("/path/to/project", entities);
      assertExists(service);
    });

    it("should accept custom dependencies", () => {
      const mockDetector = new PositionedDetector([]);
      const mockEditor = new FrontmatterEditor();
      const mockValidator = new EntityValidator("/path/to/project");

      const service = new FrontmatterSyncService("/path/to/project", [], {
        detector: mockDetector,
        editor: mockEditor,
        validator: mockValidator,
      });
      assertExists(service);
    });
  });
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] FrontmatterSyncServiceクラスを実装
- [ ] コンストラクタで依存関係を初期化
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] JSDocコメントを追加
- [ ] `deno fmt` と `deno lint` を実行
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 3: sync()メソッド - add モード

<!--@process-briefing
category: implementation
tags: [service, core, sync, add-mode]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
sync()メソッドのaddモード（既存エンティティを保持しつつ新規追加）を実装する。

### 修正対象ファイル
- **修正**: `src/application/meta/frontmatter_sync_service.ts`
- **テスト**: `tests/application/meta/frontmatter_sync_service_test.ts`

### 詳細仕様

#### sync()メソッドの処理フロー（addモード）
```typescript
async sync(path: string, options: Partial<SyncOptions> = {}): Promise<Result<SyncResult, SyncError>> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_SYNC_OPTIONS, ...options };

  // 1. ファイル読み込み
  const absolutePath = isAbsolute(path) ? path : join(this.projectRoot, path);
  let content: string;
  try {
    content = await Deno.readTextFile(absolutePath);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return err({ type: "file_not_found", message: `ファイルが見つかりません: ${path}`, path });
    }
    return err({ type: "read_error", message: "ファイル読み込みエラー", cause: error });
  }

  // 2. エンティティ検出
  const matches = this.detector.detectWithPositions(content);

  // 3. 信頼度閾値でフィルタリング
  const filteredMatches = matches.filter(m => m.confidence >= opts.confidenceThreshold);

  // 4. エンティティタイプ別にグループ化
  const byType = this.groupMatchesByType(filteredMatches, opts.entityTypes);

  // 5. FrontMatter編集
  let newContent = content;
  const added: EntityChange[] = [];
  const unchanged: EntityChange[] = [];

  for (const entityType of opts.entityTypes) {
    const ids = byType.get(entityType) ?? [];
    if (ids.length === 0) {
      unchanged.push({ type: entityType, ids: [] });
      continue;
    }

    const result = this.editor.addEntities(newContent, entityType, ids);
    if (!result.ok) {
      // FrontMatterがない場合はスキップ（エラーにしない）
      continue;
    }

    newContent = result.value.content;
    if (result.value.addedIds.length > 0) {
      added.push({ type: entityType, ids: result.value.addedIds });
    }
    if (ids.length > result.value.addedIds.length) {
      const existingIds = ids.filter(id => !result.value.addedIds.includes(id));
      unchanged.push({ type: entityType, ids: existingIds });
    }
  }

  // 6. ファイル書き込み（dryRunでない場合）
  if (!opts.dryRun && newContent !== content) {
    try {
      await Deno.writeTextFile(absolutePath, newContent);
    } catch (error) {
      return err({ type: "write_error", message: "ファイル書き込みエラー", cause: error });
    }
  }

  return ok({
    path,
    changed: added.length > 0,
    added,
    removed: [],
    unchanged,
    durationMs: Date.now() - startTime,
  });
}

private groupMatchesByType(
  matches: PositionedMatch[],
  targetTypes: BindableEntityType[]
): Map<BindableEntityType, string[]> {
  const result = new Map<BindableEntityType, string[]>();

  for (const match of matches) {
    const entityType = this.kindToEntityType(match.kind);
    if (!entityType || !targetTypes.includes(entityType)) continue;

    const ids = result.get(entityType) ?? [];
    if (!ids.includes(match.id)) {
      ids.push(match.id);
    }
    result.set(entityType, ids);
  }

  return result;
}

private kindToEntityType(kind: "character" | "setting" | "foreshadowing"): BindableEntityType | null {
  switch (kind) {
    case "character": return "characters";
    case "setting": return "settings";
    case "foreshadowing": return "foreshadowings";
    default: return null;
  }
}
```

### Red Phase: テスト作成と失敗確認
- [ ] sync() addモードのテストケースを作成
  - ファイルが存在しない場合のエラー
  - 検出されたエンティティがFrontMatterに追加されること
  - 既存のエンティティは保持されること
  - 信頼度閾値以下のエンティティは追加されないこと
- [ ] テストを実行して失敗することを確認

```typescript
describe("sync() - add mode", () => {
  it("should return file_not_found error when file does not exist", async () => {
    const service = new FrontmatterSyncService("/tmp/test", []);
    const result = await service.sync("nonexistent.md");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.type, "file_not_found");
    }
  });

  it("should add detected entities to frontmatter", async () => {
    // テスト用の一時ファイルを作成
    const tempDir = await Deno.makeTempDir();
    const testFile = join(tempDir, "chapter01.md");
    await Deno.writeTextFile(testFile, `---
storyteller:
  chapter_id: chapter_01
  title: "テスト章"
  order: 1
  characters: []
---

勇者は剣を抜いた。
`);

    const entities: DetectableEntity[] = [
      { kind: "character", id: "hero", name: "勇者", filePath: "src/characters/hero.ts" },
    ];
    const service = new FrontmatterSyncService(tempDir, entities);

    const result = await service.sync("chapter01.md");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.changed, true);
      assertEquals(result.value.added[0].ids, ["hero"]);
    }

    await Deno.remove(tempDir, { recursive: true });
  });
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] sync()メソッドのaddモードを実装
- [ ] groupMatchesByType()ヘルパーメソッドを実装
- [ ] kindToEntityType()ヘルパーメソッドを実装
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] エラーメッセージを日本語で統一
- [ ] `deno fmt` と `deno lint` を実行
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 4: sync()メソッド - sync モード

<!--@process-briefing
category: implementation
tags: [service, core, sync, sync-mode]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
sync()メソッドのsyncモード（検出結果で既存エンティティを置換）を実装する。

### 修正対象ファイル
- **修正**: `src/application/meta/frontmatter_sync_service.ts`
- **テスト**: `tests/application/meta/frontmatter_sync_service_test.ts`

### 詳細仕様

#### syncモードの追加処理
```typescript
// sync()メソッド内のモード分岐
if (opts.mode === "sync") {
  // setEntities で既存を完全置換
  const result = this.editor.setEntities(newContent, entityType, ids);
  if (!result.ok) continue;

  newContent = result.value.content;
  if (result.value.addedIds.length > 0) {
    added.push({ type: entityType, ids: result.value.addedIds });
  }
  if (result.value.removedIds.length > 0) {
    removed.push({ type: entityType, ids: result.value.removedIds });
  }
} else {
  // 既存のaddモード処理
}
```

### Red Phase: テスト作成と失敗確認
- [ ] sync() syncモードのテストケースを作成
  - 検出されなくなったエンティティが削除されること
  - 新規エンティティが追加されること
  - removedにIDが含まれること
- [ ] テストを実行して失敗することを確認

```typescript
describe("sync() - sync mode", () => {
  it("should replace frontmatter entities with detected ones", async () => {
    const tempDir = await Deno.makeTempDir();
    const testFile = join(tempDir, "chapter01.md");
    await Deno.writeTextFile(testFile, `---
storyteller:
  chapter_id: chapter_01
  title: "テスト章"
  order: 1
  characters:
    - old_character
---

勇者は剣を抜いた。
`);

    const entities: DetectableEntity[] = [
      { kind: "character", id: "hero", name: "勇者", filePath: "src/characters/hero.ts" },
    ];
    const service = new FrontmatterSyncService(tempDir, entities);

    const result = await service.sync("chapter01.md", { mode: "sync" });
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.changed, true);
      assertEquals(result.value.added[0].ids, ["hero"]);
      assertEquals(result.value.removed[0].ids, ["old_character"]);
    }

    await Deno.remove(tempDir, { recursive: true });
  });
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] sync()メソッドにモード分岐を追加
- [ ] syncモードでsetEntitiesを使用するよう実装
- [ ] removedの記録を追加
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] モード分岐をprivateメソッドに切り出し
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 5: preview()メソッド（dryRun）

<!--@process-briefing
category: implementation
tags: [service, core, preview]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
preview()メソッド（ファイル更新なしで変更内容を返す）を実装する。

### 修正対象ファイル
- **修正**: `src/application/meta/frontmatter_sync_service.ts`
- **テスト**: `tests/application/meta/frontmatter_sync_service_test.ts`

### 詳細仕様

#### preview()メソッド
```typescript
/**
 * 変更内容をプレビューする（ファイル更新なし）
 */
async preview(path: string, options: Partial<SyncOptions> = {}): Promise<Result<SyncResult, SyncError>> {
  return this.sync(path, { ...options, dryRun: true });
}
```

### Red Phase: テスト作成と失敗確認
- [ ] preview()のテストケースを作成
  - ファイルが更新されないこと
  - 変更内容が正しく返されること
- [ ] テストを実行して失敗することを確認

```typescript
describe("preview()", () => {
  it("should not modify file", async () => {
    const tempDir = await Deno.makeTempDir();
    const testFile = join(tempDir, "chapter01.md");
    const originalContent = `---
storyteller:
  chapter_id: chapter_01
  title: "テスト章"
  order: 1
  characters: []
---

勇者は剣を抜いた。
`;
    await Deno.writeTextFile(testFile, originalContent);

    const entities: DetectableEntity[] = [
      { kind: "character", id: "hero", name: "勇者", filePath: "src/characters/hero.ts" },
    ];
    const service = new FrontmatterSyncService(tempDir, entities);

    const result = await service.preview("chapter01.md");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.changed, true);
    }

    // ファイルが変更されていないことを確認
    const currentContent = await Deno.readTextFile(testFile);
    assertEquals(currentContent, originalContent);

    await Deno.remove(tempDir, { recursive: true });
  });
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] preview()メソッドを実装（dryRun: trueでsyncを呼び出す）
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] JSDocコメントを追加
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 6: 信頼度閾値フィルタリング

<!--@process-briefing
category: implementation
tags: [service, filter, confidence]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
信頼度閾値によるフィルタリングが正しく動作することを確認する。

### 修正対象ファイル
- **テスト**: `tests/application/meta/frontmatter_sync_service_test.ts`

### 詳細仕様
- confidenceThreshold以上の信頼度を持つエンティティのみが追加される
- デフォルト閾値は0.85

### Red Phase: テスト作成と失敗確認
- [ ] 信頼度フィルタリングのテストケースを作成
  - 閾値以上のエンティティは追加される
  - 閾値未満のエンティティは追加されない
  - 閾値を変更した場合の動作
- [ ] テストを実行して成功することを確認

```typescript
describe("confidence threshold filtering", () => {
  it("should filter entities below threshold", async () => {
    // モックのPositionedDetectorを作成し、異なる信頼度を返すように設定
    const mockDetector = {
      detectWithPositions: () => [
        { kind: "character", id: "hero", filePath: "...", matchedPattern: "勇者", positions: [], confidence: 0.9 },
        { kind: "character", id: "villager", filePath: "...", matchedPattern: "村人", positions: [], confidence: 0.7 },
      ],
    } as unknown as PositionedDetector;

    const service = new FrontmatterSyncService(tempDir, [], { detector: mockDetector });

    const result = await service.sync("chapter01.md", { confidenceThreshold: 0.85 });
    // heroのみが追加され、villagerは追加されないことを確認
  });
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] 既存のsync()メソッドで信頼度フィルタリングが動作することを確認
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 7: 全エンティティタイプ対応

<!--@process-briefing
category: implementation
tags: [service, entity-types]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
characters, settings, foreshadowings以外のエンティティタイプ（timelines, timeline_events, phases）の対応を確認する。

### 修正対象ファイル
- **テスト**: `tests/application/meta/frontmatter_sync_service_test.ts`

### 詳細仕様
- timelines, timeline_events, phasesは現在PositionedDetectorでは検出されない
- entityTypesオプションで指定された場合のみ処理対象となる
- 将来的にPositionedDetectorを拡張する際に備えた設計

### Red Phase: テスト作成と失敗確認
- [ ] entityTypesオプションのテストケースを作成
  - 指定したエンティティタイプのみ処理されること
  - 未指定のエンティティタイプは処理されないこと
- [ ] テストを実行して成功することを確認

```typescript
describe("entityTypes option", () => {
  it("should only process specified entity types", async () => {
    const service = new FrontmatterSyncService(tempDir, entities);

    const result = await service.sync("chapter01.md", {
      entityTypes: ["characters"],
    });

    // charactersのみ処理されること
  });
});
```

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 8: CLI meta sync コマンド基本

<!--@process-briefing
category: implementation
tags: [cli, command, sync]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
`storyteller meta sync` CLIコマンドの基本構造を実装する。

### 修正対象ファイル
- **新規作成**: `src/cli/modules/meta/sync.ts`
- **修正**: `src/cli/command_registry.ts` または登録箇所
- **テスト**: `tests/cli/modules/meta/sync_test.ts`

### 詳細仕様

#### コマンド構造
```typescript
// src/cli/modules/meta/sync.ts
import { err, ok } from "@storyteller/shared/result.ts";
import type { CommandContext, CommandExecutionError } from "@storyteller/cli/types.ts";
import type { CommandDescriptor, CommandOptionDescriptor } from "@storyteller/cli/types.ts";
import { BaseCliCommand } from "@storyteller/cli/base_command.ts";
import { createLegacyCommandDescriptor } from "@storyteller/cli/legacy_adapter.ts";
import { FrontmatterSyncService, type SyncOptions } from "@storyteller/application/meta/frontmatter_sync_service.ts";
import { loadEntitiesForLsp } from "@storyteller/cli/modules/lsp/start.ts";

interface MetaSyncOptions {
  readonly targetPath?: string;
  readonly dir?: string;
  readonly recursive?: boolean;
  readonly preview?: boolean;
  readonly force?: boolean;
  readonly types?: string[];
  readonly confidence?: number;
}

export class MetaSyncCommand extends BaseCliCommand {
  override readonly name = "sync" as const;
  override readonly path = ["meta", "sync"] as const;

  protected async handle(context: CommandContext) {
    const args = context.args ?? {};
    if (args.help === true || args.h === true) {
      context.presenter.showInfo(renderMetaSyncHelp());
      return ok(undefined);
    }

    const parsed = parseMetaSyncOptions(context);
    if ("code" in parsed) return err(parsed);

    const projectRoot = context.projectRoot ?? Deno.cwd();
    const entities = await loadEntitiesForLsp(projectRoot);
    const service = new FrontmatterSyncService(projectRoot, entities);

    const syncOptions: Partial<SyncOptions> = {
      mode: parsed.force ? "sync" : "add",
      dryRun: parsed.preview ?? false,
      confidenceThreshold: parsed.confidence ?? 0.85,
    };

    if (parsed.types) {
      syncOptions.entityTypes = parsed.types as any[];
    }

    // 単一ファイルまたはディレクトリ処理
    const targets = await resolveTargets(parsed);

    for (const target of targets) {
      const result = await service.sync(target, syncOptions);
      if (!result.ok) {
        context.presenter.showError(`${target}: ${result.error.message}`);
        continue;
      }

      if (parsed.preview) {
        renderPreview(context.presenter, target, result.value);
      } else if (result.value.changed) {
        context.presenter.showSuccess(`[sync] ${target}: 更新完了`);
      } else {
        context.presenter.showInfo(`[sync] ${target}: 変更なし`);
      }
    }

    return ok(undefined);
  }
}
```

### Red Phase: テスト作成と失敗確認
- [ ] テストファイル `tests/cli/modules/meta/sync_test.ts` を作成
  - コマンドが実行できること
  - 単一ファイル処理ができること
  - --help が表示されること
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] MetaSyncCommandクラスを実装
- [ ] コマンドレジストリに登録
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] ヘルプテキストを追加
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 9: CLI meta sync オプション

<!--@process-briefing
category: implementation
tags: [cli, command, options]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
`storyteller meta sync` のオプションを実装する。

### 修正対象ファイル
- **修正**: `src/cli/modules/meta/sync.ts`
- **テスト**: `tests/cli/modules/meta/sync_test.ts`

### 詳細仕様

#### オプション一覧
```typescript
const META_SYNC_OPTIONS: readonly CommandOptionDescriptor[] = [
  { name: "--help", aliases: ["-h"], summary: "ヘルプを表示", type: "boolean" },
  { name: "--dir", summary: "ディレクトリ内のファイルを処理", type: "string" },
  { name: "--recursive", aliases: ["-r"], summary: "再帰的にファイルを検索", type: "boolean" },
  { name: "--preview", summary: "変更内容をプレビュー（ファイル更新なし）", type: "boolean" },
  { name: "--force", summary: "既存エンティティを検出結果で置換", type: "boolean" },
  { name: "--types", summary: "対象エンティティタイプ（カンマ区切り）", type: "string" },
  { name: "--confidence", summary: "信頼度閾値（デフォルト: 0.85）", type: "number" },
  { name: "--backup", summary: "更新前にバックアップを作成", type: "boolean" },
  { name: "--json", summary: "JSON形式で出力", type: "boolean" },
];
```

### Red Phase: テスト作成と失敗確認
- [ ] 各オプションのテストケースを作成
  - --preview オプション
  - --force オプション
  - --types オプション
  - --confidence オプション
  - --dir --recursive オプション
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] 各オプションの処理を実装
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 10: ユニットテスト（追加・統合テスト）

<!--@process-briefing
category: testing
tags: [test, integration]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase
- [ ] Process 1-9 で作成したテストを統合実行
- [ ] エッジケースのテストを追加
  - 空のFrontMatter
  - FrontMatterがないファイル
  - 不正なYAML

✅ **Phase Complete**

### Green Phase
- [ ] テストが通過するまで実装を調整

✅ **Phase Complete**

### Refactor Phase
- [ ] テスト継続実行確認

✅ **Phase Complete**

---

## Process 11: LSP didSave ハンドラ

<!--@process-briefing
category: implementation
tags: [lsp, handler, did-save]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
LSPサーバーに `textDocument/didSave` ハンドラを追加し、保存時にFrontMatterを自動更新する。

### 修正対象ファイル
- **修正**: `src/lsp/server/server.ts`
- **新規作成**: `tests/lsp/server/server_did_save_test.ts`

### 詳細仕様

#### server.ts への追加
```typescript
// src/lsp/server/server.ts

// 既存のインポートに追加
import { FrontmatterSyncService } from "@storyteller/application/meta/frontmatter_sync_service.ts";

// クラスメンバーに追加
private frontmatterSyncService: FrontmatterSyncService | null = null;
private autoSyncConfig = {
  enabled: true,
  confidenceThreshold: 0.85,
  entityTypes: ["characters", "settings", "foreshadowings"] as const,
};

// handleNotification に didSave を追加
case "textDocument/didSave":
  await this.handleDidSave(notification.params as DidSaveTextDocumentParams);
  break;

// ハンドラメソッドを追加
/**
 * textDocument/didSave を処理
 * 原稿ファイル保存時にFrontMatterを自動更新
 */
private async handleDidSave(params: DidSaveTextDocumentParams): Promise<void> {
  if (!this.autoSyncConfig.enabled) return;

  const uri = params.textDocument.uri;
  if (!this.isManuscriptFile(uri)) return;

  // 遅延初期化
  if (!this.frontmatterSyncService) {
    const context = await this.getProjectContext(uri);
    this.frontmatterSyncService = new FrontmatterSyncService(
      this.projectRoot,
      [...context.entities]
    );
  }

  try {
    const filePath = this.uriToFilePath(uri);
    await this.frontmatterSyncService.sync(filePath, {
      mode: "add",
      confidenceThreshold: this.autoSyncConfig.confidenceThreshold,
      entityTypes: [...this.autoSyncConfig.entityTypes],
      dryRun: false,
    });
  } catch (error) {
    // エラーはログに記録するが、クライアントには通知しない
    console.error(`[didSave] FrontMatter sync failed: ${error}`);
  }
}

/**
 * URIが原稿ファイルかどうかを判定
 */
private isManuscriptFile(uri: string): boolean {
  return uri.endsWith(".md") && uri.includes("/manuscripts/");
}

/**
 * file:// URIをファイルパスに変換
 */
private uriToFilePath(uri: string): string {
  return decodeURIComponent(uri.replace(/^file:\/\//, ""));
}
```

#### DidSaveTextDocumentParams型（追加が必要な場合）
```typescript
// src/lsp/handlers/text_document_sync.ts に追加、または新規型定義
export type DidSaveTextDocumentParams = {
  textDocument: {
    uri: string;
  };
  text?: string;
};
```

### Red Phase: テスト作成と失敗確認
- [ ] テストファイル `tests/lsp/server/server_did_save_test.ts` を作成
  - 原稿ファイル保存時にFrontMatterが更新されること
  - 非原稿ファイル保存時は処理されないこと
  - autoSyncConfig.enabled=false の場合は処理されないこと
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] handleDidSaveメソッドを実装
- [ ] isManuscriptFile, uriToFilePath ヘルパーを実装
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] エラーハンドリングを改善
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 12: LSP 設定読み込み

<!--@process-briefing
category: implementation
tags: [lsp, config]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
LSPサーバーがプロジェクト設定から自動同期オプションを読み込む機能を実装する。

### 修正対象ファイル
- **修正**: `src/lsp/server/server.ts`
- **新規作成**: `src/lsp/config/config_loader.ts`（オプション）
- **テスト**: `tests/lsp/config/config_loader_test.ts`

### 詳細仕様

#### 設定ファイル構造（.storyteller.json または deno.json）
```json
{
  "storyteller": {
    "frontmatter": {
      "autoSync": {
        "enabled": true,
        "onSave": true,
        "confidenceThreshold": 0.85,
        "entityTypes": ["characters", "settings"],
        "mode": "add"
      }
    }
  }
}
```

### Red Phase: テスト作成と失敗確認
- [ ] 設定読み込みのテストケースを作成
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] 設定ファイル読み込みロジックを実装
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 13: MCP manuscript_sync ツール

<!--@process-briefing
category: implementation
tags: [mcp, tool, sync]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
MCPから原稿のFrontMatter同期を実行できる `manuscript_sync` ツールを実装する。

### 修正対象ファイル
- **新規作成**: `src/mcp/tools/definitions/manuscript_sync.ts`
- **修正**: `src/mcp/mcp_server.ts`（ツール登録）
- **テスト**: `tests/mcp/tools/definitions/manuscript_sync_test.ts`

### 詳細仕様

#### ツール定義
```typescript
// src/mcp/tools/definitions/manuscript_sync.ts
import { isAbsolute, join } from "@std/path";
import type { McpToolDefinition, ToolExecutionContext } from "@storyteller/mcp/tools/tool_registry.ts";
import { FrontmatterSyncService } from "@storyteller/application/meta/frontmatter_sync_service.ts";
import { loadEntitiesForLsp } from "@storyteller/cli/modules/lsp/start.ts";

export const manuscriptSyncTool: McpToolDefinition = {
  name: "manuscript_sync",
  description: "原稿ファイルのFrontMatterを検出されたエンティティと同期します。",
  inputSchema: {
    type: "object",
    properties: {
      manuscript: {
        type: "string",
        description: "原稿ファイルパス（相対または絶対パス）",
      },
      mode: {
        type: "string",
        enum: ["add", "sync", "preview"],
        description: "モード: add=追加のみ, sync=置換, preview=プレビュー（デフォルト: add）",
      },
      entityTypes: {
        type: "array",
        items: { type: "string" },
        description: "対象エンティティタイプ（デフォルト: 全タイプ）",
      },
      confidenceThreshold: {
        type: "number",
        description: "信頼度閾値（デフォルト: 0.85）",
      },
    },
    required: ["manuscript"],
  },
  execute: async (args: Record<string, unknown>, context?: ToolExecutionContext) => {
    const projectRoot = context?.projectRoot ?? Deno.cwd();

    const manuscript = args.manuscript as string;
    const mode = (args.mode as "add" | "sync" | "preview") ?? "add";
    const entityTypes = args.entityTypes as string[] | undefined;
    const confidenceThreshold = (args.confidenceThreshold as number) ?? 0.85;

    // エンティティロード
    const entities = await loadEntitiesForLsp(projectRoot);
    const service = new FrontmatterSyncService(projectRoot, entities);

    const isPreview = mode === "preview";
    const syncMode = mode === "sync" ? "sync" : "add";

    const result = await service.sync(manuscript, {
      mode: syncMode,
      dryRun: isPreview,
      confidenceThreshold,
      entityTypes: entityTypes as any[],
    });

    if (!result.ok) {
      return {
        content: [{ type: "text" as const, text: `Error: ${result.error.message}` }],
        isError: true,
      };
    }

    const { value } = result;
    const addedInfo = value.added.map(a => `${a.type}: ${a.ids.join(", ")}`).join("\n");
    const removedInfo = value.removed.map(r => `${r.type}: ${r.ids.join(", ")}`).join("\n");

    return {
      content: [{
        type: "text" as const,
        text: isPreview
          ? `プレビュー: ${manuscript}\n追加予定:\n${addedInfo}\n削除予定:\n${removedInfo}`
          : `同期完了: ${manuscript}\n追加: ${addedInfo}\n削除: ${removedInfo}`,
      }],
      isError: false,
    };
  },
};
```

### Red Phase: テスト作成と失敗確認
- [ ] テストファイル `tests/mcp/tools/definitions/manuscript_sync_test.ts` を作成
  - ツールが正しく登録されること
  - addモードで動作すること
  - syncモードで動作すること
  - previewモードでファイルが更新されないこと
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] manuscript_syncツールを実装
- [ ] MCPサーバーに登録
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] エラーメッセージを改善
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 14: meta watch --sync-frontmatter

<!--@process-briefing
category: implementation
tags: [cli, watch, sync-frontmatter]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### 目標
`storyteller meta watch` コマンドに `--sync-frontmatter` オプションを追加する。

### 修正対象ファイル
- **修正**: `src/cli/modules/meta/watch.ts`
- **テスト**: `tests/cli/modules/meta/watch_test.ts`

### 詳細仕様

#### watch.ts への追加
```typescript
// WatchOptions型に追加
type WatchOptions = {
  // 既存のオプション...
  readonly syncFrontmatter?: boolean;
};

// オプション定義に追加
{
  name: "--sync-frontmatter",
  summary: "ファイル変更時にFrontMatterも自動更新",
  type: "boolean",
},

// flush()関数内に追加
const flush = async () => {
  // 既存の.meta.ts生成処理...

  // --sync-frontmatter が有効な場合
  if (parsed.syncFrontmatter && !parsed.syncFrontmatterService) {
    parsed.syncFrontmatterService = new FrontmatterSyncService(projectRoot, entities);
  }

  if (parsed.syncFrontmatter && parsed.syncFrontmatterService) {
    for (const markdownPath of paths) {
      try {
        await parsed.syncFrontmatterService.sync(markdownPath, { mode: "add" });
        context.presenter.showSuccess(`[sync-frontmatter] ${markdownPath}`);
      } catch (error) {
        context.presenter.showError(`[sync-frontmatter] ${markdownPath}: ${error}`);
      }
    }
  }
};
```

### Red Phase: テスト作成と失敗確認
- [ ] --sync-frontmatter オプションのテストケースを作成
  - オプションが認識されること
  - ファイル変更時にFrontMatterが更新されること
- [ ] テストを実行して失敗することを確認

✅ **Phase Complete**

### Green Phase: 最小実装と成功確認
- [ ] WatchOptionsに syncFrontmatter を追加
- [ ] オプション定義を追加
- [ ] flush()にFrontMatter同期処理を追加
- [ ] テストを実行して成功することを確認

✅ **Phase Complete**

### Refactor Phase: 品質改善と継続成功確認
- [ ] FrontmatterSyncServiceの初期化を遅延化
- [ ] テストを実行し、継続して成功することを確認

✅ **Phase Complete**

---

## Process 50: フォローアップ

<!--@process-briefing
category: followup
tags: []
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

実装後に仕様変更や追加要件が発生した場合は、ここにProcessを追加する。

---

## Process 100: リファクタリング・品質向上

<!--@process-briefing
category: quality
tags: []
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase
- [ ] コードカバレッジを確認
- [ ] 品質改善テストを追加

✅ **Phase Complete**

### Green Phase
- [ ] 重複コードの抽出・共通化
- [ ] エラーハンドリングの統一
- [ ] パフォーマンス最適化（キャッシュ活用）

✅ **Phase Complete**

### Refactor Phase
- [ ] テスト継続実行確認
- [ ] Linter/Formatter確認

✅ **Phase Complete**

---

## Process 200: ドキュメンテーション

<!--@process-briefing
category: documentation
tags: []
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

<!--
@agent-definition: ~/.claude/stigmergy/process-definitions/process-200-documentation.json
@template: ~/.claude/stigmergy/process-templates/documentation-template.md
@stigmergy-config:
  progress_path: ~/.claude/stigmergy/doc-progress/{mission_id}.json
  artifacts_path: ~/.claude/stigmergy/doc-artifacts/{mission_id}/
  lessons_path: ~/.claude/stigmergy/doc-lessons/{mission_id}.json
-->

### Red Phase: ドキュメント設計
- [ ] 文書化対象を特定
  - CLAUDE.md の更新（機能説明追加）
  - docs/cli.md の更新（meta sync コマンド）
  - docs/mcp.md の更新（manuscript_sync ツール）
  - docs/lsp.md の更新（didSave自動更新）
- [ ] ドキュメント構成を作成

✅ **Phase Complete**

### Green Phase: ドキュメント記述
- [ ] CLAUDE.md に FrontMatter自動更新機能セクションを追加
- [ ] docs/cli.md に meta sync コマンドを追加
- [ ] docs/mcp.md に manuscript_sync ツールを追加
- [ ] docs/lsp.md に didSave 自動更新を追加
- [ ] コード例を追加

✅ **Phase Complete**

### Refactor Phase: 品質確認
- [ ] 一貫性チェック
- [ ] リンク検証

✅ **Phase Complete**

---

## Process 300: OODAフィードバックループ（教訓・知見の保存）

<!--@process-briefing
category: ooda_feedback
tags: []
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

<!--
@agent-definition: ~/.claude/stigmergy/process-definitions/process-300-ooda-feedback.json
@template: ~/.claude/stigmergy/process-templates/ooda-feedback-template.md
@stigmergy-config:
  progress_path: ~/.claude/stigmergy/ooda-progress/{mission_id}.json
  lessons_path: ~/.claude/stigmergy/lessons/{mission_id}/
  insights_path: ~/.claude/stigmergy/code-insights/{mission_id}/
  memory_integration: serena-v4
-->

### Red Phase: フィードバック収集設計

**Observe（観察）**
- [ ] 実装過程で発生した問題・課題を収集
- [ ] テスト結果から得られた知見を記録
- [ ] コードレビューのフィードバックを整理

**Orient（方向付け）**
- [ ] 収集した情報をカテゴリ別に分類
  - Technical: 技術的な知見・パターン
  - Process: プロセス改善に関する教訓
  - Antipattern: 避けるべきパターン
  - Best Practice: 推奨パターン
- [ ] 重要度（Critical/High/Medium/Low）を設定

- [ ] **成功条件**: 収集対象が特定され、分類基準が明確

✅ **Phase Complete**

### Green Phase: 教訓・知見の永続化

**Decide（決心）**
- [ ] 保存すべき教訓・知見を選定
- [ ] 各項目の保存先を決定
  - Serena Memory: 組織的な知見
  - stigmergy/lessons: プロジェクト固有の教訓
  - stigmergy/code-insights: コードパターン・実装知見

**Act（行動）**
- [ ] serena-v4のmcp__serena__write_memoryで教訓を永続化
- [ ] コードに関する知見をMarkdownで記録
- [ ] 関連するコード箇所にコメントを追加（必要に応じて）

- [ ] **成功条件**: 全教訓がSerena Memoryまたはstigmergyに保存済み

✅ **Phase Complete**

### Refactor Phase: フィードバック品質改善

**Feedback Loop**
- [ ] 保存した教訓の品質を検証
  - 再現可能性: 他のプロジェクトで適用可能か
  - 明確性: 内容が明確で理解しやすいか
  - 実用性: 実際に役立つ情報か
- [ ] 重複・矛盾する教訓を統合・整理
- [ ] メタ学習: OODAプロセス自体の改善点を記録

**Cross-Feedback**
- [ ] 他のProcess（100, 200）との連携を確認
- [ ] 将来のミッションへの引き継ぎ事項を整理

- [ ] **成功条件**: 教訓がSerena Memoryで検索可能、insights文書が整備済み

✅ **Phase Complete**

---

# Management

## Blockers

| ID | Description | Status | Resolution |
|----|-------------|--------|-----------|
| - | 現在ブロッカーなし | - | - |

## Lessons

| ID | Insight | Severity | Applied |
|----|---------|----------|---------|
| L1 | FrontmatterEditorはstorytellerキーがないとエラーを返す | medium | ☐ |
| L2 | PositionedDetectorはforeshadowing以外のタイムライン系を検出しない | medium | ☐ |

## Feedback Log

| Date | Type | Content | Status |
|------|------|---------|--------|
| - | - | - | - |

## Completion Checklist
- [ ] すべてのProcess完了
- [ ] すべてのテスト合格
- [ ] コードレビュー完了
- [ ] ドキュメント更新完了
- [ ] マージ可能な状態

---

<!--
Process番号規則
- 1-9: 機能実装（コアサービス）
- 10-49: テスト拡充・統合テスト
- 50-99: フォローアップ
- 100-199: 品質向上（リファクタリング）
- 200-299: ドキュメンテーション
- 300+: OODAフィードバックループ（教訓・知見保存）
-->

