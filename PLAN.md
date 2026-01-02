---
mission_id: textlint-storyteller-integration
title: "textlint-storyteller統合: LSP/CLI/MCP統合によるバックグラウンドlint"
status: nearly_complete
progress: 95
phase: documentation
tdd_mode: true
blockers: 0
created_at: "2026-01-02"
updated_at: "2026-01-02"
remaining_tasks: "docs/lint.md作成、実装ファイルのコミット"
---

# Commander's Intent

## Purpose
- textlintをNeovimで使用する際のUIブロッキング問題を解消する
- storytellerのエンティティ検証とtextlintの文法チェックを統合する
- DiagnosticSource抽象化により、将来の拡張（vale等）を容易にする

## End State
- storyteller LSP内でtextlintがバックグラウンド実行され、診断が統合表示される
- `storyteller lint`コマンドでCLIからも実行可能
- MCPツール: textlintの `--mcp` ネイティブサポートを活用（storytellerで独自実装不要）
- Git pre-commitフックで自動検証が可能

## Key Tasks
- DiagnosticSource抽象化による拡張可能な診断基盤
- TextlintWorkerによるデバウンス・キャンセル付きバックグラウンド実行
- CLIコマンド `storyteller lint` の実装
- MCPツール: textlint v14.8.0+ の `--mcp` 機能を活用（独自実装不要）
- Git hooks統合

## Constraints
- 既存のstoryteller診断機能を壊さない（後方互換性）
- textlint未インストール環境でもエラーにならない（グレースフルデグラデーション）
- UIをブロッキングしない（非同期・バックグラウンド実行）

## Restraints
- TDD（テスト駆動開発）を厳守
- 既存のコードパターン（CommandDescriptor、McpToolDefinition）に従う
- Deno標準APIを使用（Deno.Command等）

---

# Context

## 概要
- storyteller LSP内でtextlintをバックグラウンドで実行し、エンティティ診断と統合
- `storyteller lint`コマンドで原稿の文法チェックを実行
- Claude Desktopからはtextlint --mcp（ネイティブMCPサーバー）を使用

## 必須のルール
- 必ず `CLAUDE.md` を参照し、ルールを守ること
- **TDD（テスト駆動開発）を厳守すること**
  - 各プロセスは必ずテストファーストで開始する（Red → Green → Refactor）
  - 実装コードを書く前に、失敗するテストを先に作成する
  - テストが通過するまで修正とテスト実行を繰り返す
  - プロセス完了の条件：該当するすべてのテスト、フォーマッタ、Linterが通過していること
  - プロセス完了後、チェックボックスを✅に変更すること
- **各Process開始時のブリーフィング実行**
  - 各Processの「Briefing」セクションは自動生成される
  - `@process-briefing` コメントを含むセクションは、エージェントが実行時に以下を自動取得する：
    - **Related Lessons**: stigmergy/doctrine-memoriesから関連教訓を取得
    - **Known Patterns**: プロジェクト固有パターン・テンプレートから自動取得
    - **Watch Points**: 過去の失敗事例・注意点から自動取得
  - ブリーフィング情報は `/x` や `/d` コマンド実行時に動的に埋め込まれ、実行戦況を反映する

## 開発のゴール
- UIブロッキングのないtextlint統合
- 複数診断ソースの統合表示
- CLI/LSPの一貫したインターフェース（MCPはtextlint --mcp で代替）

---

# References

| @ref | @target | @test |
|------|---------|-------|
| SPEC.md | 要件定義書 | - |
| src/lsp/diagnostics/diagnostics_generator.ts | src/lsp/diagnostics/diagnostic_source.ts | tests/lsp/diagnostics/diagnostic_source_test.ts |
| src/lsp/diagnostics/diagnostics_publisher.ts | src/lsp/diagnostics/diagnostic_aggregator.ts | tests/lsp/diagnostics/diagnostic_aggregator_test.ts |
| src/lsp/server/server.ts:871-882 | server.ts (Aggregator統合) | tests/lsp/integration/textlint_integration_test.ts |
| - | src/lsp/integration/textlint/textlint_worker.ts | tests/lsp/integration/textlint/textlint_worker_test.ts |
| - | src/lsp/integration/textlint/textlint_config.ts | tests/lsp/integration/textlint/textlint_config_test.ts |
| - | src/lsp/integration/textlint/textlint_parser.ts | tests/lsp/integration/textlint/textlint_parser_test.ts |
| - | src/lsp/integration/textlint/textlint_diagnostic_source.ts | tests/lsp/integration/textlint/textlint_diagnostic_source_test.ts |
| - | src/shared/textlint/types.ts | - |
| - | src/shared/textlint/runner.ts | tests/shared/textlint/runner_test.ts |
| - | src/shared/textlint/parser.ts | tests/shared/textlint/parser_test.ts |
| src/cli/modules/rag/install_hooks.ts | src/cli/modules/lint/lint.ts | tests/cli/modules/lint/lint_test.ts |
| src/cli/modules/rag/install_hooks.ts | src/cli/modules/lint/install_hooks.ts | tests/cli/modules/lint/install_hooks_test.ts |
| src/cli/modules/index.ts | src/cli/modules/lint/index.ts | - |
| ~~src/mcp/tools/definitions/textlint_check.ts~~ | [SKIPPED] textlint --mcp で代替 | - |
| ~~src/mcp/tools/definitions/textlint_fix.ts~~ | [SKIPPED] textlint --mcp で代替 | - |
| - | docs/lint.md | - |

---

# Progress Map

| Process | Status | Progress | Phase | Notes |
|---------|--------|----------|-------|-------|
| Process 1 | completed | ■■■■■ 100% | Green | DiagnosticSourceインターフェース定義 ✅ |
| Process 2 | completed | ■■■■■ 100% | Green | StorytellerDiagnosticSource（既存ラップ） ✅ |
| Process 3 | completed | ■■■■■ 100% | Green | DiagnosticAggregator実装 ✅ |
| Process 4 | completed | ■■■■■ 100% | Green | TextlintConfig設定検出 ✅ |
| Process 5 | completed | ■■■■■ 100% | Green | TextlintParser JSON解析 ✅ |
| Process 6 | completed | ■■■■■ 100% | Green | TextlintWorker（デバウンス・キャンセル） ✅ |
| Process 7 | completed | ■■■■■ 100% | Green | TextlintDiagnosticSource実装 ✅ |
| Process 8 | completed | ■■■■■ 100% | Green | LSPサーバーへのAggregator統合 ✅ |
| Process 9 | completed | ■■■■■ 100% | Green | 共通Textlintランナー（shared/textlint） ✅ |
| Process 10 | completed | ■■■■■ 100% | Green | CLI lint基本コマンド ✅ |
| Process 11 | completed | ■■■■■ 100% | Green | CLI lint --fix対応 ✅ |
| Process 12 | completed | ■■■■■ 100% | Green | CLI lint --json対応 ✅ |
| Process 13 | completed | ■■■■■ 100% | Green | CLI lint オプション拡充 ✅ |
| Process 20 | skipped | ━━━━━ N/A | - | ~~MCP textlint_check~~ → textlint --mcp で代替 |
| Process 21 | skipped | ━━━━━ N/A | - | ~~MCP textlint_fix~~ → textlint --mcp で代替 |
| Process 30 | completed | ■■■■■ 100% | Green | Git hooks install-hooks ✅ |
| Process 31 | completed | ■■■■■ 100% | Green | Git hooks uninstall-hooks ✅ |
| Process 50 | skipped | ━━━━━ N/A | - | フォローアップ不要 |
| Process 100 | completed | ■■■■■ 100% | Green | リファクタリング・品質向上 ✅ |
| Process 200 | in_progress | ■■■▯▯ 60% | Yellow | ドキュメンテーション（docs/lint.md作成待ち） |
| Process 300 | completed | ■■■■■ 100% | Green | OODAフィードバックループ ✅ |
| | | | | |
| **Overall** | **nearly_complete** | **■■■■▯ 95%** | **green** | **Blockers: 0, docs/lint.md作成待ち** |

---

# Processes

## Process 1: DiagnosticSourceインターフェース定義

<!--@process-briefing
category: implementation
tags: [interface, abstraction, lsp]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: DiagnosticsGenerator.generate()のシグネチャを参照
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/diagnostics/diagnostic_source_test.ts` を作成
  - DiagnosticSource型の構造テスト
  - isAvailable()のモック実装テスト
  - generate()のシグネチャ確認テスト
- [ ] テストを実行して失敗することを確認

```typescript
// tests/lsp/diagnostics/diagnostic_source_test.ts
import { assertEquals, assertExists } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { DiagnosticSource } from "@storyteller/lsp/diagnostics/diagnostic_source.ts";

describe("DiagnosticSource interface", () => {
  it("should have required properties", () => {
    // モック実装で型チェック
    const mockSource: DiagnosticSource = {
      name: "test",
      isAvailable: async () => true,
      generate: async () => [],
    };

    assertEquals(mockSource.name, "test");
    assertExists(mockSource.isAvailable);
    assertExists(mockSource.generate);
  });

  it("should support optional cancel method", () => {
    const mockSource: DiagnosticSource = {
      name: "test",
      isAvailable: async () => true,
      generate: async () => [],
      cancel: () => {},
    };

    assertExists(mockSource.cancel);
  });
});
```

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/diagnostics/diagnostic_source.ts` を作成

```typescript
// src/lsp/diagnostics/diagnostic_source.ts
import type { Diagnostic } from "@storyteller/lsp/protocol/types.ts";

/**
 * 診断ソースインターフェース
 * 複数の診断プロバイダーを統合するための抽象化
 */
export interface DiagnosticSource {
  /** ソース識別子 (e.g., "storyteller", "textlint") */
  readonly name: string;

  /** ソースが利用可能かどうか */
  isAvailable(): Promise<boolean>;

  /** 診断を生成 */
  generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]>;

  /** 進行中の操作をキャンセル（オプショナル） */
  cancel?(): void;

  /** リソースを解放（オプショナル） */
  dispose?(): void;
}
```

- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] JSDocコメントを充実
- [ ] export文の整理
- [ ] テストを実行し、継続して成功することを確認

---

## Process 2: StorytellerDiagnosticSource（既存ラップ）

<!--@process-briefing
category: implementation
tags: [adapter, wrapper, lsp]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: 既存DiagnosticsGenerator.generate()を参照（src/lsp/diagnostics/diagnostics_generator.ts:93-110）
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/diagnostics/storyteller_diagnostic_source_test.ts` を作成
  - isAvailable()は常にtrue
  - generate()がDiagnosticsGeneratorに委譲
  - nameが"storyteller"

```typescript
// tests/lsp/diagnostics/storyteller_diagnostic_source_test.ts
import { assertEquals } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { StorytellerDiagnosticSource } from "@storyteller/lsp/diagnostics/storyteller_diagnostic_source.ts";
import { DiagnosticsGenerator } from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";
import { PositionedDetector } from "@storyteller/lsp/detection/positioned_detector.ts";

describe("StorytellerDiagnosticSource", () => {
  let source: StorytellerDiagnosticSource;

  beforeEach(() => {
    const detector = new PositionedDetector([]);
    const generator = new DiagnosticsGenerator(detector);
    source = new StorytellerDiagnosticSource(generator);
  });

  it("should have name 'storyteller'", () => {
    assertEquals(source.name, "storyteller");
  });

  it("should always be available", async () => {
    const available = await source.isAvailable();
    assertEquals(available, true);
  });

  it("should generate diagnostics via generator", async () => {
    const diagnostics = await source.generate(
      "file:///test.md",
      "テスト内容",
      "/project",
    );
    // 空の検出器なので診断なし
    assertEquals(diagnostics.length, 0);
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/diagnostics/storyteller_diagnostic_source.ts` を作成

```typescript
// src/lsp/diagnostics/storyteller_diagnostic_source.ts
import type { Diagnostic } from "@storyteller/lsp/protocol/types.ts";
import type { DiagnosticSource } from "./diagnostic_source.ts";
import type { DiagnosticsGenerator } from "./diagnostics_generator.ts";

/**
 * storytellerエンティティ診断ソース
 * 既存のDiagnosticsGeneratorをDiagnosticSourceにラップ
 */
export class StorytellerDiagnosticSource implements DiagnosticSource {
  readonly name = "storyteller";

  constructor(private readonly generator: DiagnosticsGenerator) {}

  async isAvailable(): Promise<boolean> {
    return true; // 常に利用可能
  }

  async generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]> {
    return this.generator.generate(uri, content, projectRoot);
  }
}
```

- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] JSDocコメントを充実
- [ ] テストを実行し、継続して成功することを確認

---

## Process 3: DiagnosticAggregator実装

<!--@process-briefing
category: implementation
tags: [aggregator, merge, lsp]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: Promise.allSettledで並列実行、sourceフィールドで識別
**Watch Points**: 一つのソースが失敗しても他は継続

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/diagnostics/diagnostic_aggregator_test.ts` を作成
  - 複数ソースの並列実行
  - 各診断のsourceフィールド設定
  - 一つが失敗しても他は成功
  - ソースの登録/削除

```typescript
// tests/lsp/diagnostics/diagnostic_aggregator_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { DiagnosticAggregator } from "@storyteller/lsp/diagnostics/diagnostic_aggregator.ts";
import type { DiagnosticSource } from "@storyteller/lsp/diagnostics/diagnostic_source.ts";

describe("DiagnosticAggregator", () => {
  it("should aggregate diagnostics from multiple sources", async () => {
    const source1: DiagnosticSource = {
      name: "source1",
      isAvailable: async () => true,
      generate: async () => [{
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        message: "test1",
        severity: 2,
      }],
    };

    const source2: DiagnosticSource = {
      name: "source2",
      isAvailable: async () => true,
      generate: async () => [{
        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
        message: "test2",
        severity: 1,
      }],
    };

    const aggregator = new DiagnosticAggregator([source1, source2]);
    const diagnostics = await aggregator.generate("file:///test.md", "content", "/project");

    assertEquals(diagnostics.length, 2);
    assertEquals(diagnostics[0].source, "source1");
    assertEquals(diagnostics[1].source, "source2");
  });

  it("should skip unavailable sources", async () => {
    const available: DiagnosticSource = {
      name: "available",
      isAvailable: async () => true,
      generate: async () => [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "ok", severity: 2 }],
    };

    const unavailable: DiagnosticSource = {
      name: "unavailable",
      isAvailable: async () => false,
      generate: async () => [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "skip", severity: 2 }],
    };

    const aggregator = new DiagnosticAggregator([available, unavailable]);
    const diagnostics = await aggregator.generate("file:///test.md", "content", "/project");

    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].message, "ok");
  });

  it("should continue if one source fails", async () => {
    const working: DiagnosticSource = {
      name: "working",
      isAvailable: async () => true,
      generate: async () => [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } }, message: "ok", severity: 2 }],
    };

    const failing: DiagnosticSource = {
      name: "failing",
      isAvailable: async () => true,
      generate: async () => { throw new Error("fail"); },
    };

    const aggregator = new DiagnosticAggregator([working, failing]);
    const diagnostics = await aggregator.generate("file:///test.md", "content", "/project");

    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].message, "ok");
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/diagnostics/diagnostic_aggregator.ts` を作成

```typescript
// src/lsp/diagnostics/diagnostic_aggregator.ts
import type { Diagnostic } from "@storyteller/lsp/protocol/types.ts";
import type { DiagnosticSource } from "./diagnostic_source.ts";

/**
 * 複数の診断ソースを統合するアグリゲーター
 */
export class DiagnosticAggregator {
  private sources: DiagnosticSource[] = [];

  constructor(sources: DiagnosticSource[] = []) {
    this.sources = [...sources];
  }

  /**
   * ソースを追加
   */
  addSource(source: DiagnosticSource): void {
    this.sources.push(source);
  }

  /**
   * ソースを削除
   */
  removeSource(name: string): void {
    this.sources = this.sources.filter(s => s.name !== name);
  }

  /**
   * すべてのソースから診断を並列取得してマージ
   */
  async generate(
    uri: string,
    content: string,
    projectRoot: string,
  ): Promise<Diagnostic[]> {
    // 利用可能なソースをフィルタ
    const availabilityChecks = await Promise.all(
      this.sources.map(async (source) => ({
        source,
        available: await source.isAvailable().catch(() => false),
      }))
    );

    const availableSources = availabilityChecks
      .filter(({ available }) => available)
      .map(({ source }) => source);

    // 並列実行
    const results = await Promise.allSettled(
      availableSources.map(async (source) => {
        const diagnostics = await source.generate(uri, content, projectRoot);
        // sourceフィールドを設定
        return diagnostics.map((d) => ({
          ...d,
          source: source.name,
        }));
      })
    );

    // 成功した結果のみマージ
    const merged: Diagnostic[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        merged.push(...result.value);
      }
      // failedは無視（ログ出力は後で追加）
    }

    return merged;
  }

  /**
   * すべてのソースをキャンセル
   */
  cancelAll(): void {
    for (const source of this.sources) {
      source.cancel?.();
    }
  }

  /**
   * すべてのソースを破棄
   */
  dispose(): void {
    for (const source of this.sources) {
      source.dispose?.();
    }
    this.sources = [];
  }
}
```

- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] エラーログ出力を追加
- [ ] テストを実行し、継続して成功することを確認

---

## Process 4: TextlintConfig設定検出

<!--@process-briefing
category: implementation
tags: [textlint, config, detection]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: SPEC.md 2.5節の検出順序を参照
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/integration/textlint/textlint_config_test.ts` を作成
  - 各設定ファイル形式の検出
  - 優先順位の確認
  - 設定ファイルなしの場合

```typescript
// tests/lsp/integration/textlint/textlint_config_test.ts
import { assertEquals } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { TextlintConfig, detectTextlintConfig } from "@storyteller/lsp/integration/textlint/textlint_config.ts";

describe("TextlintConfig", () => {
  const testDir = "./tmp/claude/textlint_config_test";

  beforeEach(async () => {
    await Deno.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await Deno.remove(testDir, { recursive: true }).catch(() => {});
  });

  it("should detect .textlintrc", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc`, '{"rules":{}}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc"), true);
  });

  it("should detect .textlintrc.json", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc.json`, '{"rules":{}}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc.json"), true);
  });

  it("should prioritize .textlintrc over .textlintrc.json", async () => {
    await Deno.writeTextFile(`${testDir}/.textlintrc`, '{"rules":{}}');
    await Deno.writeTextFile(`${testDir}/.textlintrc.json`, '{"rules":{}}');

    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath?.endsWith(".textlintrc"), true);
  });

  it("should return null configPath when no config found", async () => {
    const config = await detectTextlintConfig(testDir);
    assertEquals(config.configPath, undefined);
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/integration/textlint/textlint_config.ts` を作成

```typescript
// src/lsp/integration/textlint/textlint_config.ts
import { join } from "@std/path";

/**
 * textlint設定
 */
export interface TextlintConfig {
  /** 設定ファイルパス（見つからない場合はundefined） */
  configPath?: string;
  /** textlint実行パス */
  executablePath: string;
  /** デバウンス時間（ms） */
  debounceMs: number;
  /** タイムアウト時間（ms） */
  timeoutMs: number;
  /** 有効フラグ */
  enabled: boolean;
}

/**
 * 設定ファイル検出順序（優先度順）
 */
const CONFIG_FILES = [
  ".textlintrc",
  ".textlintrc.json",
  ".textlintrc.yaml",
  ".textlintrc.yml",
  ".textlintrc.js",
  ".textlintrc.cjs",
];

/**
 * textlint設定を検出
 */
export async function detectTextlintConfig(
  projectRoot: string,
): Promise<TextlintConfig> {
  let configPath: string | undefined;

  // 設定ファイルを優先順位順に探索
  for (const configFile of CONFIG_FILES) {
    const fullPath = join(projectRoot, configFile);
    try {
      await Deno.stat(fullPath);
      configPath = fullPath;
      break;
    } catch {
      // ファイルが存在しない
    }
  }

  // package.jsonのtextlintフィールドは後で対応

  return {
    configPath,
    executablePath: "npx textlint",
    debounceMs: 500,
    timeoutMs: 30000,
    enabled: true,
  };
}
```

- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] package.jsonのtextlintフィールド検出を追加
- [ ] storyteller.jsonからの設定読み込みを追加
- [ ] テストを実行し、継続して成功することを確認

---

## Process 5: TextlintParser JSON解析

<!--@process-briefing
category: implementation
tags: [textlint, parser, json]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: textlint --format json の出力形式を参照
**Watch Points**: 不正なJSON、空出力の処理

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/integration/textlint/textlint_parser_test.ts` を作成

```typescript
// tests/lsp/integration/textlint/textlint_parser_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { parseTextlintOutput, TextlintMessage } from "@storyteller/lsp/integration/textlint/textlint_parser.ts";

describe("TextlintParser", () => {
  it("should parse valid textlint JSON output", () => {
    const json = JSON.stringify([{
      filePath: "/test.md",
      messages: [{
        ruleId: "prh",
        severity: 1,
        message: "表記ゆれ",
        line: 2,
        column: 5,
        index: 10,
      }],
    }]);

    const result = parseTextlintOutput(json, "/test.md");
    assertEquals(result.filePath, "/test.md");
    assertEquals(result.messages.length, 1);
    assertEquals(result.messages[0].ruleId, "prh");
  });

  it("should handle empty output", () => {
    const result = parseTextlintOutput("", "/test.md");
    assertEquals(result.messages.length, 0);
  });

  it("should handle empty array", () => {
    const result = parseTextlintOutput("[]", "/test.md");
    assertEquals(result.messages.length, 0);
  });

  it("should handle invalid JSON", () => {
    const result = parseTextlintOutput("invalid", "/test.md");
    assertEquals(result.messages.length, 0);
  });

  it("should map severity correctly", () => {
    const json = JSON.stringify([{
      filePath: "/test.md",
      messages: [
        { ruleId: "rule1", severity: 2, message: "error", line: 1, column: 1 },
        { ruleId: "rule2", severity: 1, message: "warning", line: 2, column: 1 },
        { ruleId: "rule3", severity: 0, message: "info", line: 3, column: 1 },
      ],
    }]);

    const result = parseTextlintOutput(json, "/test.md");
    assertEquals(result.messages[0].severity, 2); // error
    assertEquals(result.messages[1].severity, 1); // warning
    assertEquals(result.messages[2].severity, 0); // info
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/integration/textlint/textlint_parser.ts` を作成

```typescript
// src/lsp/integration/textlint/textlint_parser.ts

/**
 * textlintメッセージ
 */
export interface TextlintMessage {
  ruleId: string;
  severity: number; // 0=info, 1=warning, 2=error
  message: string;
  line: number;
  column: number;
  index?: number;
  fix?: {
    range: [number, number];
    text: string;
  };
}

/**
 * textlint結果
 */
export interface TextlintResult {
  filePath: string;
  messages: TextlintMessage[];
}

/**
 * textlint JSON出力をパース
 */
export function parseTextlintOutput(
  output: string,
  filePath: string,
): TextlintResult {
  if (!output || output.trim() === "") {
    return { filePath, messages: [] };
  }

  try {
    const parsed = JSON.parse(output);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { filePath, messages: [] };
    }

    // textlintは配列形式で返す
    const fileResult = parsed[0];
    if (!fileResult || !Array.isArray(fileResult.messages)) {
      return { filePath, messages: [] };
    }

    const messages: TextlintMessage[] = fileResult.messages.map((msg: {
      ruleId?: string;
      severity?: number;
      message?: string;
      line?: number;
      column?: number;
      index?: number;
      fix?: { range: [number, number]; text: string };
    }) => ({
      ruleId: msg.ruleId ?? "unknown",
      severity: msg.severity ?? 1,
      message: msg.message ?? "",
      line: msg.line ?? 1,
      column: msg.column ?? 1,
      index: msg.index,
      fix: msg.fix,
    }));

    return { filePath, messages };
  } catch {
    // JSON解析エラー
    return { filePath, messages: [] };
  }
}
```

- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] エラーログ出力を追加
- [ ] テストを実行し、継続して成功することを確認

---

## Process 6: TextlintWorker（デバウンス・キャンセル）

<!--@process-briefing
category: implementation
tags: [textlint, worker, async]
-->

### Briefing (auto-generated)
**Related Lessons**: DiagnosticsPublisher.publishDebounced()のパターンを参照（src/lsp/diagnostics/diagnostics_publisher.ts:93-114）
**Known Patterns**: Deno.Command, AbortController
**Watch Points**: プロセスリーク、タイムアウト処理

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/integration/textlint/textlint_worker_test.ts` を作成

```typescript
// tests/lsp/integration/textlint/textlint_worker_test.ts
import { assertEquals, assertRejects } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { TextlintWorker } from "@storyteller/lsp/integration/textlint/textlint_worker.ts";
import { delay } from "@std/async";

describe("TextlintWorker", () => {
  let worker: TextlintWorker;

  beforeEach(() => {
    worker = new TextlintWorker({
      executablePath: "npx textlint",
      debounceMs: 100,
      timeoutMs: 5000,
      enabled: true,
    });
  });

  afterEach(() => {
    worker.dispose();
  });

  it("should debounce multiple calls", async () => {
    // モックが必要なため、実際のテストはintegration testで行う
    // ここでは構造テストのみ
    assertEquals(typeof worker.lint, "function");
    assertEquals(typeof worker.cancel, "function");
    assertEquals(typeof worker.dispose, "function");
  });

  it("should cancel previous request on new request", async () => {
    // cancel()が呼ばれることを確認
    let cancelCalled = false;
    const originalCancel = worker.cancel.bind(worker);
    worker.cancel = () => {
      cancelCalled = true;
      originalCancel();
    };

    // 2回連続呼び出し
    const p1 = worker.lint("content1", "/test.md");
    await delay(10);
    const p2 = worker.lint("content2", "/test.md");

    assertEquals(cancelCalled, true);
    worker.cancel(); // クリーンアップ
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/integration/textlint/textlint_worker.ts` を作成

```typescript
// src/lsp/integration/textlint/textlint_worker.ts
import type { TextlintConfig } from "./textlint_config.ts";
import { parseTextlintOutput, type TextlintResult } from "./textlint_parser.ts";

/**
 * TextlintWorkerオプション
 */
export interface TextlintWorkerOptions {
  executablePath: string;
  debounceMs: number;
  timeoutMs: number;
  enabled: boolean;
  configPath?: string;
}

/**
 * textlintをバックグラウンドで実行するワーカー
 * デバウンス・キャンセル・タイムアウト対応
 */
export class TextlintWorker {
  private process: Deno.ChildProcess | null = null;
  private debounceTimer: number | null = null;
  private abortController: AbortController | null = null;
  private pendingResolve: ((result: TextlintResult) => void) | null = null;

  constructor(private options: TextlintWorkerOptions) {}

  /**
   * textlintを実行（デバウンス・キャンセル付き）
   */
  async lint(content: string, filePath: string): Promise<TextlintResult> {
    // 既存のリクエストをキャンセル
    this.cancel();

    return new Promise((resolve) => {
      this.pendingResolve = resolve;

      this.debounceTimer = setTimeout(async () => {
        try {
          const result = await this.execute(content, filePath);
          resolve(result);
        } catch {
          resolve({ filePath, messages: [] });
        } finally {
          this.pendingResolve = null;
        }
      }, this.options.debounceMs);
    });
  }

  /**
   * 実際のtextlint実行
   */
  private async execute(content: string, filePath: string): Promise<TextlintResult> {
    this.abortController = new AbortController();

    const args = [
      "textlint",
      "--stdin",
      "--stdin-filename", filePath,
      "--format", "json",
    ];

    if (this.options.configPath) {
      args.push("--config", this.options.configPath);
    }

    const command = new Deno.Command("npx", {
      args,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });

    this.process = command.spawn();

    // stdinに内容を書き込み
    const writer = this.process.stdin.getWriter();
    await writer.write(new TextEncoder().encode(content));
    await writer.close();

    // タイムアウト付きで待機
    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, this.options.timeoutMs);

    try {
      const result = await this.process.output();
      clearTimeout(timeoutId);

      if (!result.success) {
        // textlintはエラー時もexit 1を返すが、stdoutにはJSONがある
      }

      const output = new TextDecoder().decode(result.stdout);
      return parseTextlintOutput(output, filePath);
    } catch {
      // タイムアウトまたはその他のエラー
      try {
        this.process.kill("SIGTERM");
      } catch {
        // プロセスが既に終了
      }
      return { filePath, messages: [] };
    } finally {
      this.process = null;
      this.abortController = null;
    }
  }

  /**
   * 進行中の操作をキャンセル
   */
  cancel(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.process) {
      try {
        this.process.kill("SIGTERM");
      } catch {
        // プロセスが既に終了
      }
      this.process = null;
    }

    if (this.pendingResolve) {
      this.pendingResolve({ filePath: "", messages: [] });
      this.pendingResolve = null;
    }
  }

  /**
   * リソースを解放
   */
  dispose(): void {
    this.cancel();
  }
}
```

- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] ログ出力を追加
- [ ] テストを実行し、継続して成功することを確認

---

## Process 7: TextlintDiagnosticSource実装

<!--@process-briefing
category: implementation
tags: [textlint, diagnostic_source, lsp]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: StorytellerDiagnosticSource（Process 2）のパターン
**Watch Points**: textlint未インストール時の処理

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/integration/textlint/textlint_diagnostic_source_test.ts` を作成

```typescript
// tests/lsp/integration/textlint/textlint_diagnostic_source_test.ts
import { assertEquals } from "@std/assert";
import { describe, it, beforeEach } from "@std/testing/bdd";
import { TextlintDiagnosticSource } from "@storyteller/lsp/integration/textlint/textlint_diagnostic_source.ts";

describe("TextlintDiagnosticSource", () => {
  it("should have name 'textlint'", () => {
    const source = new TextlintDiagnosticSource("/project");
    assertEquals(source.name, "textlint");
  });

  it("should check textlint availability", async () => {
    const source = new TextlintDiagnosticSource("/project");
    // 実際の環境に依存するテスト
    // CI環境ではtextlintがインストールされていない可能性
    const available = await source.isAvailable();
    // availableはboolean
    assertEquals(typeof available, "boolean");
  });

  it("should convert textlint messages to LSP diagnostics", async () => {
    // モック実装でテスト
    const source = new TextlintDiagnosticSource("/project");

    // textlintがインストールされていない場合は空配列
    const diagnostics = await source.generate(
      "file:///test.md",
      "テスト",
      "/project",
    );

    assertEquals(Array.isArray(diagnostics), true);
  });

  it("should map severity correctly", () => {
    // severity変換のユニットテスト
    // 2 (error) → DiagnosticSeverity.Error (1)
    // 1 (warning) → DiagnosticSeverity.Warning (2)
    // 0 (info) → DiagnosticSeverity.Information (3)
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/integration/textlint/textlint_diagnostic_source.ts` を作成

```typescript
// src/lsp/integration/textlint/textlint_diagnostic_source.ts
import type { Diagnostic } from "@storyteller/lsp/protocol/types.ts";
import type { DiagnosticSource } from "@storyteller/lsp/diagnostics/diagnostic_source.ts";
import { TextlintWorker } from "./textlint_worker.ts";
import { detectTextlintConfig } from "./textlint_config.ts";
import { DiagnosticSeverity } from "@storyteller/lsp/diagnostics/diagnostics_generator.ts";

/**
 * textlint診断ソース
 */
export class TextlintDiagnosticSource implements DiagnosticSource {
  readonly name = "textlint";

  private worker: TextlintWorker | null = null;
  private available: boolean | null = null;
  private availabilityChecked = false;

  constructor(private projectRoot: string) {}

  /**
   * textlintが利用可能かチェック
   */
  async isAvailable(): Promise<boolean> {
    if (this.availabilityChecked) {
      return this.available ?? false;
    }

    try {
      const command = new Deno.Command("npx", {
        args: ["textlint", "--version"],
        stdout: "piped",
        stderr: "piped",
      });

      const result = await command.output();
      this.available = result.success;
    } catch {
      this.available = false;
    }

    this.availabilityChecked = true;

    if (this.available) {
      // ワーカーを初期化
      const config = await detectTextlintConfig(this.projectRoot);
      this.worker = new TextlintWorker({
        executablePath: config.executablePath,
        debounceMs: config.debounceMs,
        timeoutMs: config.timeoutMs,
        enabled: config.enabled,
        configPath: config.configPath,
      });
    }

    return this.available ?? false;
  }

  /**
   * 診断を生成
   */
  async generate(
    uri: string,
    content: string,
    _projectRoot: string,
  ): Promise<Diagnostic[]> {
    if (!this.worker) {
      return [];
    }

    // URIからファイルパスを抽出
    const filePath = uri.startsWith("file://")
      ? decodeURIComponent(uri.slice(7))
      : uri;

    const result = await this.worker.lint(content, filePath);

    // TextlintMessage → Diagnosticに変換
    return result.messages.map((msg) => ({
      range: {
        start: { line: msg.line - 1, character: msg.column - 1 },
        end: { line: msg.line - 1, character: msg.column },
      },
      message: msg.message,
      severity: this.mapSeverity(msg.severity),
      source: "textlint",
      code: msg.ruleId,
    }));
  }

  /**
   * textlint severity → LSP severityマッピング
   */
  private mapSeverity(textlintSeverity: number): number {
    switch (textlintSeverity) {
      case 2: return DiagnosticSeverity.Error;      // 1
      case 1: return DiagnosticSeverity.Warning;    // 2
      default: return DiagnosticSeverity.Information; // 3
    }
  }

  /**
   * キャンセル
   */
  cancel(): void {
    this.worker?.cancel();
  }

  /**
   * 破棄
   */
  dispose(): void {
    this.worker?.dispose();
    this.worker = null;
  }
}
```

- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] ログ出力を追加
- [ ] テストを実行し、継続して成功することを確認

---

## Process 8: LSPサーバーへのAggregator統合

<!--@process-briefing
category: implementation
tags: [lsp, server, integration]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: server.ts:871-882のpublishDiagnosticsForUri()を修正
**Watch Points**: 既存の動作を壊さない

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/lsp/integration/textlint_integration_test.ts` を作成
  - 統合テストは実際のLSPサーバーで行う
- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/lsp/server/server.ts` を修正

**修正箇所1: インポート追加（約61-62行目付近）**

```typescript
// 追加
import { DiagnosticAggregator } from "@storyteller/lsp/diagnostics/diagnostic_aggregator.ts";
import { StorytellerDiagnosticSource } from "@storyteller/lsp/diagnostics/storyteller_diagnostic_source.ts";
import { TextlintDiagnosticSource } from "@storyteller/lsp/integration/textlint/textlint_diagnostic_source.ts";
```

**修正箇所2: プロパティ追加（約167-168行目付近）**

```typescript
// 変更前
private readonly diagnosticsGenerator: DiagnosticsGenerator;
private readonly diagnosticsPublisher: DiagnosticsPublisher;

// 変更後
private readonly diagnosticsGenerator: DiagnosticsGenerator;
private readonly diagnosticsPublisher: DiagnosticsPublisher;
private readonly diagnosticAggregator: DiagnosticAggregator;
```

**修正箇所3: 初期化（約222-223行目付近）**

```typescript
// 変更前
this.diagnosticsGenerator = new DiagnosticsGenerator(this.detector);
this.diagnosticsPublisher = new DiagnosticsPublisher(

// 変更後
this.diagnosticsGenerator = new DiagnosticsGenerator(this.detector);

// DiagnosticAggregatorの初期化
const storytellerSource = new StorytellerDiagnosticSource(this.diagnosticsGenerator);
const textlintSource = new TextlintDiagnosticSource(this.projectRoot);
this.diagnosticAggregator = new DiagnosticAggregator([storytellerSource, textlintSource]);

this.diagnosticsPublisher = new DiagnosticsPublisher(
```

**修正箇所4: publishDiagnosticsForUri()（約871-882行目）**

```typescript
// 変更前
private async publishDiagnosticsForUri(uri: string): Promise<void> {
  const document = this.documentManager.get(uri);
  if (!document) return;

  const diagnostics = await this.diagnosticsGenerator.generate(
    uri,
    document.content,
    this.projectRoot,
  );

  await this.diagnosticsPublisher.publish(uri, diagnostics);
}

// 変更後
private async publishDiagnosticsForUri(uri: string): Promise<void> {
  const document = this.documentManager.get(uri);
  if (!document) return;

  // DiagnosticAggregatorを使用して複数ソースから診断を取得
  const diagnostics = await this.diagnosticAggregator.generate(
    uri,
    document.content,
    this.projectRoot,
  );

  await this.diagnosticsPublisher.publish(uri, diagnostics);
}
```

**修正箇所5: dispose()に追加（既存のdisposeメソッド内）**

```typescript
// 追加
this.diagnosticAggregator.dispose();
```

- [ ] テストを実行して成功することを確認
- [ ] 既存のstoryteller診断が動作することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] 設定からtextlint有効/無効を制御
- [ ] テストを実行し、継続して成功することを確認

---

## Process 9: 共通Textlintランナー（shared/textlint）

<!--@process-briefing
category: implementation
tags: [shared, textlint, cli, mcp]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: CLI/MCPで共有するロジックをshared/に配置
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/shared/textlint/runner_test.ts` を作成
- [ ] `tests/shared/textlint/parser_test.ts` を作成

```typescript
// tests/shared/textlint/runner_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { TextlintRunner } from "@storyteller/shared/textlint/runner.ts";

describe("TextlintRunner", () => {
  it("should run textlint on files", async () => {
    // 構造テスト
    const runner = new TextlintRunner("/project");
    assertEquals(typeof runner.check, "function");
    assertEquals(typeof runner.fix, "function");
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/shared/textlint/types.ts` を作成

```typescript
// src/shared/textlint/types.ts

/**
 * textlintチェック結果
 */
export interface TextlintCheckResult {
  totalFiles: number;
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  results: TextlintFileResult[];
}

/**
 * ファイル単位の結果
 */
export interface TextlintFileResult {
  path: string;
  issues: TextlintIssue[];
}

/**
 * 個別の問題
 */
export interface TextlintIssue {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  line: number;
  column: number;
  source: "textlint";
}

/**
 * textlint修正結果
 */
export interface TextlintFixResult {
  fixed: boolean;
  path: string;
  fixedCount: number;
}

/**
 * チェックオプション
 */
export interface TextlintCheckOptions {
  path?: string;
  dir?: string;
  recursive?: boolean;
  rules?: string[];
  severity?: "error" | "warning" | "info";
  withEntityCheck?: boolean;
}

/**
 * 修正オプション
 */
export interface TextlintFixOptions {
  path: string;
  rules?: string[];
  dryRun?: boolean;
}
```

- [ ] `src/shared/textlint/runner.ts` を作成（CLI/MCP共有ロジック）
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] エラーハンドリングを追加
- [ ] テストを実行し、継続して成功することを確認

---

## Process 10: CLI lint基本コマンド

<!--@process-briefing
category: implementation
tags: [cli, lint, command]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: src/cli/modules/rag/install_hooks.tsのCommandDescriptorパターン
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/cli/modules/lint/lint_test.ts` を作成

```typescript
// tests/cli/modules/lint/lint_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { lintCommandDescriptor } from "@storyteller/cli/modules/lint/lint.ts";

describe("CLI lint command", () => {
  it("should have correct name", () => {
    assertEquals(lintCommandDescriptor.name, "lint");
  });

  it("should have options for path, dir, fix, json", () => {
    const optionNames = lintCommandDescriptor.options?.map(o => o.name) ?? [];
    assertEquals(optionNames.includes("path"), true);
    assertEquals(optionNames.includes("dir"), true);
    assertEquals(optionNames.includes("fix"), true);
    assertEquals(optionNames.includes("json"), true);
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/cli/modules/lint/types.ts` を作成
- [ ] `src/cli/modules/lint/lint.ts` を作成
- [ ] `src/cli/modules/lint/index.ts` を作成
- [ ] `src/cli/modules/index.ts` にlint登録を追加
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] エラーハンドリングを追加
- [ ] テストを実行し、継続して成功することを確認

---

## Process 11: CLI lint --fix対応

<!--@process-briefing
category: implementation
tags: [cli, lint, fix]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: Process 10のlintコマンドに統合
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/cli/modules/lint/fix_test.ts` を作成
  - --fixオプションでrunner.fix()が呼ばれること
  - dryRunモードのテスト

### Green Phase: 最小実装と成功確認
- [ ] Process 10で--fix対応済みのためスキップ

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

---

## Process 12: CLI lint --json対応

<!--@process-briefing
category: implementation
tags: [cli, lint, json]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: OutputPresenterインターフェース参照
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] JSON出力形式のテストを追加

### Green Phase: 最小実装と成功確認
- [ ] Process 10で--json対応済みのためスキップ

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

---

## Process 13: CLI lint オプション拡充

<!--@process-briefing
category: implementation
tags: [cli, lint, options]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: SPEC.md 2.2節のオプション一覧
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] 全オプションのテストを追加
  - --rule
  - --config
  - --severity
  - --with-entity-check

### Green Phase: 最小実装と成功確認
- [ ] --with-entity-checkの実装

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

---

## Process 20: ~~MCP textlint_check~~ [SKIPPED]

> **スキップ理由**: textlint v14.8.0+ のネイティブMCPサーバー機能（`--mcp`フラグ）で代替可能
>
> textlintが提供するMCPツール:
> - `lintFile`: ファイルのlint
> - `lintText`: テキスト直接lint
> - `getLintFixedFileContent`: ファイルのfix結果取得
> - `getLintFixedTextContent`: テキストのfix結果取得
>
> **使用方法**: Claude Desktop等のMCPクライアント設定で `npx textlint --mcp` を起動
>
> **参照**: https://github.com/textlint/textlint/blob/master/docs/mcp.md

---

## Process 21: ~~MCP textlint_fix~~ [SKIPPED]

> **スキップ理由**: Process 20と同様、textlint --mcp の `getLintFixedFileContent`, `getLintFixedTextContent` で代替

---

## Process 30: Git hooks install-hooks

<!--@process-briefing
category: implementation
tags: [git, hooks, install]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: src/cli/modules/rag/install_hooks.tsのパターン
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] `tests/cli/modules/lint/install_hooks_test.ts` を作成

```typescript
// tests/cli/modules/lint/install_hooks_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { lintInstallHooksCommandDescriptor, generatePreCommitHook } from "@storyteller/cli/modules/lint/install_hooks.ts";

describe("CLI lint install-hooks", () => {
  it("should have correct name", () => {
    assertEquals(lintInstallHooksCommandDescriptor.name, "install-hooks");
  });

  it("should generate pre-commit hook script", () => {
    const script = generatePreCommitHook({ strict: false });
    assertEquals(script.includes("storyteller lint"), true);
    assertEquals(script.includes("#!/bin/sh"), true);
  });

  it("should generate strict mode script", () => {
    const script = generatePreCommitHook({ strict: true });
    assertEquals(script.includes("exit 1"), true);
  });
});
```

- [ ] テストを実行して失敗することを確認

### Green Phase: 最小実装と成功確認
- [ ] `src/cli/modules/lint/install_hooks.ts` を作成
- [ ] テストを実行して成功することを確認

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

---

## Process 31: Git hooks uninstall-hooks

<!--@process-briefing
category: implementation
tags: [git, hooks, uninstall]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: Process 30に統合済み
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: テスト作成と失敗確認
- [ ] Process 30で統合実装済み

### Green Phase: 最小実装と成功確認
- [ ] Process 30で統合実装済み

### Refactor Phase: 品質改善と継続成功確認
- [ ] テストを実行し、継続して成功することを確認

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

実装後に仕様変更などが発生した場合は、ここにProcessを追加する。

---

## Process 100: リファクタリング・品質向上

<!--@process-briefing
category: quality
tags: [refactoring, testing, coverage]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: 品質改善テストを追加
- [ ] テストカバレッジを確認
- [ ] エッジケーステストを追加
  - textlint未インストール
  - 設定ファイルなし
  - タイムアウト
  - プロセスキャンセル

### Green Phase: リファクタリングを実施
- [ ] 重複コードの抽出
- [ ] エラーメッセージの統一
- [ ] ログ出力の整理

### Refactor Phase: テスト継続実行確認
- [ ] 全テストが通過することを確認
- [ ] フォーマッタ・Linterが通過することを確認

---

## Process 200: ドキュメンテーション

<!--@process-briefing
category: documentation
tags: [docs, readme, samples]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: ドキュメント設計
- [ ] 文書化対象を特定
  - docs/lint.md
  - CLAUDE.md更新
  - サンプル設定ファイル
- [ ] ドキュメント構成を作成

### Green Phase: ドキュメント記述
- [ ] `docs/lint.md` を作成
  - 概要
  - LSP統合
  - CLIコマンド
  - MCPツール
  - Git Hooks
  - セットアップ
  - 設定
- [ ] CLAUDE.mdに機能概要を追加
- [ ] サンプル設定ファイルを作成
  - .textlintrc.example
  - prh-rules.yml.example

### Refactor Phase: 品質確認
- [ ] リンク検証
- [ ] 最終レビュー

---

## Process 300: OODAフィードバックループ（教訓・知見の保存）

<!--@process-briefing
category: ooda_feedback
tags: [learning, lessons, insights]
-->

### Briefing (auto-generated)
**Related Lessons**: (auto-populated from stigmergy)
**Known Patterns**: (auto-populated from patterns)
**Watch Points**: (auto-populated from failure_cases)

---

### Red Phase: フィードバック収集設計

**Observe（観察）**
- [x] 実装過程で発生した問題・課題を収集 ✅
- [x] テスト結果から得られた知見を記録 ✅
- [x] コードレビューのフィードバックを整理 ✅

**Orient（方向付け）**
- [x] 収集した情報をカテゴリ別に分類 ✅
  - Technical: 技術的な知見・パターン (L1-L7)
  - Process: プロセス改善に関する教訓 (P1-P4)
  - Antipattern: 避けるべきパターン (A1-A4)
  - Best Practice: 推奨パターン (PT1-PT5)
- [x] 重要度（Critical/High/Medium/Low）を設定 ✅

- [x] **成功条件**: 収集対象が特定され、分類基準が明確 ✅

### Green Phase: 教訓・知見の永続化

**Decide（決心）**
- [x] 保存すべき教訓・知見を選定 ✅
- [x] 各項目の保存先を決定 ✅
  - ~~Serena Memory~~: 今回はPLAN.md Lessonsセクションに集約
  - PLAN.md Lessons: プロジェクト固有の教訓（L1-L7, P1-P4, PT1-PT5, A1-A4）
  - Feedback Log: 実装マイルストーン記録

**Act（行動）**
- [x] PLAN.md Lessonsセクションに教訓を永続化 ✅
- [x] Feedback Logに実装マイルストーンを記録 ✅
- [x] Progress Mapを更新（全Process完了状態を反映） ✅
- [x] Completion Checklistを更新 ✅
- [x] 次のアクション（コミット手順、docs/lint.md作成）を明記 ✅

- [x] **成功条件**: 全教訓がPLAN.md Lessonsに保存済み ✅

### Refactor Phase: フィードバック品質改善

**Feedback Loop**
- [x] 保存した教訓の品質を検証 ✅
  - 再現可能性: DiagnosticSourceパターンは他の診断ソースにも適用可能 ✅
  - 明確性: カテゴリ・重要度・具体例を明記 ✅
  - 実用性: 実装から直接抽出した実用的パターン ✅
- [x] 重複・矛盾する教訓を統合・整理 ✅
- [x] メタ学習: TDDプロセスの有効性を確認（P1） ✅

**Cross-Feedback**
- [x] 他のProcess（100, 200）との連携を確認 ✅
- [x] 将来のミッションへの引き継ぎ事項を整理 ✅
  - docs/lint.md作成（Process 200）が残タスク
  - 実装ファイルのコミットが必要

- [x] **成功条件**: 教訓がPLAN.md Lessonsで検索可能、次のアクションが明確 ✅

---

# Management

## Blockers

| ID | Description | Status | Resolution |
|----|-------------|--------|-----------|
| - | - | - | - |

## Lessons

### Technical Insights

| ID | Insight | Category | Severity | Applied |
|----|---------|----------|----------|---------|
| L1 | DiagnosticSource抽象化により拡張性が大幅向上 | Architecture | high | ✅ |
| L2 | Promise.allSettledで部分失敗に対応（グレースフルデグラデーション） | Resilience | high | ✅ |
| L3 | デバウンス・キャンセルパターンの確立（pendingResolveパターン） | Async | high | ✅ |
| L4 | textlintの非ゼロ終了コード処理（exit 1でもstdoutに有効なJSON） | Integration | medium | ✅ |
| L5 | cancel/disposeをオプショナルメソッドとして定義し柔軟性確保 | API Design | medium | ✅ |
| L6 | タイムアウト付きプロセス実行でリソースリーク防止 | Resource Mgmt | high | ✅ |
| L7 | sourceフィールドで診断ソースを識別（Aggregatorパターン） | Integration | medium | ✅ |

### Process Insights

| ID | Insight | Category | Severity | Applied |
|----|---------|----------|----------|---------|
| P1 | TDDによる設計品質向上（インターフェースファースト） | Process | high | ✅ |
| P2 | 既存コードラップパターンで後方互換性維持 | Migration | high | ✅ |
| P3 | 外部ツールのネイティブ機能活用（textlint --mcp）で重複実装回避 | Strategy | medium | ✅ |
| P4 | publishDiagnosticsForUri()の変更最小化で既存機能保護 | Refactoring | medium | ✅ |

### Implementation Patterns

| ID | Pattern | Use Case | Example |
|----|---------|----------|---------|
| PT1 | DiagnosticSourceインターフェース | 複数診断ソース統合 | storyteller + textlint |
| PT2 | Promise.allSettled | 部分失敗許容の並列実行 | Aggregator.generate() |
| PT3 | pendingResolveパターン | デバウンス付きキャンセル | TextlintWorker.lint() |
| PT4 | Adapterパターン | 既存機能のラップ | StorytellerDiagnosticSource |
| PT5 | タイムアウト付きプロセス実行 | 外部コマンド実行 | TextlintWorker.execute() |

### Anti-Patterns (避けるべきパターン)

| ID | Anti-Pattern | Problem | Solution |
|----|--------------|---------|----------|
| A1 | Promise.allでの部分失敗時の全体失敗 | 一つのソースエラーで全体が失敗 | Promise.allSettledを使用 |
| A2 | デバウンスなしの即時実行 | UIブロッキング | デバウンス + バックグラウンド実行 |
| A3 | プロセス終了待ちなし | リソースリーク | dispose()での明示的クリーンアップ |
| A4 | 外部ツールの重複実装 | メンテナンスコスト増大 | ネイティブ機能（textlint --mcp）活用 |

## Feedback Log

| Date | Type | Content | Status |
|------|------|---------|--------|
| 2026-01-02 | Implementation | DiagnosticSource抽象化の導入完了 | ✅ Completed |
| 2026-01-02 | Implementation | TextlintWorker（デバウンス・キャンセル）実装完了 | ✅ Completed |
| 2026-01-02 | Implementation | DiagnosticAggregator統合完了 | ✅ Completed |
| 2026-01-02 | Implementation | CLI lint/install-hooks完了 | ✅ Completed |
| 2026-01-02 | Decision | Process 20-21スキップ（textlint --mcp活用） | ✅ Decided |
| 2026-01-02 | Quality | テストファイル実装完了（TDD完遂） | ✅ Completed |
| 2026-01-02 | Pending | docs/lint.md作成待ち | ⏳ In Progress |

## Completion Checklist
- [x] すべてのProcess完了（Process 200を除く）
- [x] すべてのテスト合格（実装済み、未コミット）
- [x] コードレビュー完了（セルフレビュー）
- [ ] ドキュメント更新完了（docs/lint.md作成待ち）
- [ ] マージ可能な状態（実装ファイルのコミット + docs/lint.md作成後）

## 次のアクション
1. **実装ファイルのコミット**
   ```bash
   git add src/lsp/diagnostics/ src/lsp/integration/ src/shared/textlint/ src/cli/modules/lint/
   git add tests/lsp/diagnostics/ tests/lsp/integration/textlint/ tests/shared/textlint/ tests/cli/modules/lint/
   git add src/cli/modules/index.ts src/lsp/server/server.ts
   git commit -m "feat(lint): textlint-storyteller統合の完全実装

- DiagnosticSource抽象化による拡張可能な診断基盤
- TextlintWorkerによるデバウンス・キャンセル付きバックグラウンド実行
- DiagnosticAggregatorによる複数診断ソース統合
- CLI: storyteller lint/install-hooks/uninstall-hooks
- TDD完遂（全テスト実装済み）

Processes 1-13, 30-31, 100, 300完了"
   ```

2. **docs/lint.md作成（Process 200完了）**
   - 概要、LSP統合、CLIコマンド、Git Hooks、セットアップ、設定を記載
   - サンプル設定ファイル（.textlintrc.example）を追加

3. **CLAUDE.md更新**
   - textlint統合機能の概要を追加

---

<!--
Process番号規則
- 1-9: 機能実装（Phase 1-2: DiagnosticSource、TextlintWorker）
- 10-19: CLI実装（Phase 3）
- 20-29: MCP実装（Phase 4）
- 30-39: Git Hooks実装（Phase 5）
- 50-99: フォローアップ
- 100-199: 品質向上（リファクタリング）
- 200-299: ドキュメンテーション（Phase 6）
- 300+: OODAフィードバックループ（教訓・知見保存）
-->
