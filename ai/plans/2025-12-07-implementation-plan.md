# メタデータ自動生成機能 実装計画書

## 概要
- **Issue**: [#4 メタデータ自動生成機能の実装](https://github.com/nekowasabi/street-storyteller/issues/4)
- **対象スコープ**: Phase 1〜3
- **作成日**: 2025-12-07

## 実装スコープ

### Phase 1: 基本的な自動生成（MVP）
- [ ] `storyteller meta generate` コマンドの実装
- [ ] Frontmatterからの基本情報抽出
- [ ] キャラクター・設定の自動検出（完全一致）
- [ ] 基本的な検証ルール生成
- [ ] TypeScriptファイル出力

### Phase 2: 高度な検出機能
- [ ] displayNames/aliasesを使った検出
- [ ] 文脈を考慮した参照検出
- [ ] binding.yamlファイルとの連携
- [ ] 信頼度ベースの参照マッピング
- [ ] プリセット機能（battle-scene, romance-scene等）

### Phase 3: インタラクティブモード
- [ ] 曖昧な参照の確認プロンプト
- [ ] 検出結果のプレビュー表示
- [ ] 差分更新機能（既存メタデータの更新）
- [ ] バッチ処理（複数章を一括生成）

---

## アーキテクチャ設計

### 新規ファイル構成

```
src/
├── application/
│   └── meta/
│       ├── meta_generator_service.ts      # メタデータ生成サービス
│       ├── frontmatter_parser.ts          # Frontmatter解析
│       ├── reference_detector.ts          # 参照検出エンジン
│       ├── validation_generator.ts        # 検証ルール生成
│       └── typescript_emitter.ts          # TypeScriptファイル出力
├── cli/
│   └── modules/
│       └── meta/
│           ├── index.ts                   # meta サブコマンド登録
│           └── generate.ts                # meta generate コマンド
├── domain/
│   └── meta/
│       ├── detection_result.ts            # 検出結果型定義
│       ├── reference_map.ts               # 参照マッピング型
│       └── preset_templates.ts            # プリセットテンプレート
└── plugins/
    └── features/
        └── meta/
            └── plugin.ts                  # MetaPlugin（オプション）
```

### 依存関係

```
CLI (meta generate)
    ↓
MetaGeneratorService
    ├── FrontmatterParser
    ├── ReferenceDetector
    │   ├── CharacterDetector
    │   └── SettingDetector
    ├── ValidationGenerator
    └── TypeScriptEmitter
```

---

## Phase 1: MVP 実装詳細

### 1.1 CLIコマンド実装

**ファイル**: `src/cli/modules/meta/generate.ts`

```typescript
// コマンド構造
storyteller meta generate <markdown-path> [options]

// オプション
--characters <ids>     # 明示的にキャラクターを指定
--settings <ids>       # 明示的に設定を指定
--output <path>        # 出力先パス（デフォルト: 同ディレクトリに .meta.ts）
--dry-run              # 実際には出力せずプレビューのみ
--force                # 既存ファイルを上書き
```

**実装パターン**: 既存の `element character` コマンドを参考に `BaseCliCommand` を継承

### 1.2 Frontmatter解析

**ファイル**: `src/application/meta/frontmatter_parser.ts`

```typescript
interface FrontmatterData {
  chapter_id: string;
  title: string;
  order: number;
  characters?: string[];   // キャラクターID配列
  settings?: string[];     // 設定ID配列
  summary?: string;
}

export class FrontmatterParser {
  parse(markdownContent: string): Result<FrontmatterData, ParseError>;
}
```

**使用ライブラリ**: `@std/yaml` でYAML部分を解析

### 1.3 キャラクター・設定の検出（完全一致）

**ファイル**: `src/application/meta/reference_detector.ts`

```typescript
interface DetectionResult {
  characters: DetectedEntity[];
  settings: DetectedEntity[];
  confidence: number;
}

interface DetectedEntity {
  id: string;
  matchedPatterns: string[];
  occurrences: number;
  confidence: number;
}

export class ReferenceDetector {
  // ハイブリッド検出: Frontmatter + 本文解析
  async detect(
    content: string,
    frontmatter: FrontmatterData,
    projectPath: string
  ): Promise<DetectionResult>;
}
```

**検出アルゴリズム**:
1. Frontmatter の characters/settings 配列を優先的に採用
2. 本文を走査し、各キャラクター/設定の `detectionHints.commonPatterns` でマッチング
3. `excludePatterns` で誤検出を除外
4. 信頼度スコアを計算

### 1.4 検証ルール生成

**ファイル**: `src/application/meta/validation_generator.ts`

```typescript
export class ValidationGenerator {
  // 基本的な検証ルールを自動生成
  generate(detected: DetectionResult): ValidationRule[];
}
```

**生成される検証ルール**:
- `character_presence`: 主要キャラクターの出現確認
- `setting_consistency`: 設定の一貫性チェック
- `plot_advancement`: プロット進行の確認（空テンプレート）

### 1.5 TypeScriptファイル出力

**ファイル**: `src/application/meta/typescript_emitter.ts`

```typescript
export class TypeScriptEmitter {
  emit(meta: ChapterMeta, outputPath: string): Promise<Result<void, EmitError>>;
}
```

**出力形式**:
```typescript
// 自動生成: storyteller meta generate
// 生成日時: 2025-12-07 12:00:00

import type { ChapterMeta } from "../src/types/chapter.ts";
import { hero } from "../src/characters/hero.ts";
// ... 他のインポート

export const chapter01Meta: ChapterMeta = {
  id: "chapter01",
  title: "旅の始まり",
  order: 1,
  characters: [hero, heroine],
  settings: [kingdom],
  validations: [...],
  references: {...}
};
```

---

## Phase 2: 高度な検出機能

### 2.1 displayNames/aliases による検出

**拡張**: `ReferenceDetector` クラス

```typescript
// キャラクター定義の displayNames と aliases を使用
const hero = {
  displayNames: ["勇者", "アレクス", "勇者アレクス"],
  aliases: ["勇", "主人公"],
  pronouns: ["彼"]
};
```

**実装**:
- キャラクター/設定定義ファイルを読み込み
- `displayNames`, `aliases`, `pronouns` を検出パターンとして使用

### 2.2 信頼度ベースの参照マッピング

```typescript
interface ReferenceMapping {
  word: string;           // 検出されたワード
  entityId: string;       // 対応するエンティティID
  confidence: number;     // 0.0〜1.0
  context?: string;       // 文脈情報
}
```

**信頼度計算**:
- 完全一致: 1.0
- displayNames マッチ: 0.9
- aliases マッチ: 0.8
- pronouns マッチ: 0.6（文脈依存のため低め）

### 2.3 プリセット機能

**ファイル**: `src/domain/meta/preset_templates.ts`

```typescript
type PresetType = "battle-scene" | "romance-scene" | "dialogue" | "exposition";

interface Preset {
  name: PresetType;
  validations: ValidationRule[];
  suggestedCharacterRoles?: CharacterRole[];
}
```

**使用方法**:
```bash
storyteller meta generate chapter01.md --preset battle-scene
```

---

## Phase 3: インタラクティブモード

### 3.1 曖昧な参照の確認プロンプト

```bash
storyteller meta generate chapter01.md --interactive

# 出力例:
? 「彼」は以下のどのキャラクターを指しますか？
  ❯ hero (勇者アレクス) [confidence: 0.6]
    mentor (賢者マーリン) [confidence: 0.4]
    スキップ（参照マッピングに含めない）
```

**実装**: Deno の `@std/io` または `cliffy/prompt` を使用

### 3.2 検出結果のプレビュー

```bash
storyteller meta generate chapter01.md --dry-run --preview

# 出力例:
╔═══════════════════════════════════════════════════════════╗
║ メタデータ生成プレビュー: chapter01.md                      ║
╠═══════════════════════════════════════════════════════════╣
║ 章ID: chapter01                                           ║
║ タイトル: 旅の始まり                                       ║
║ 順序: 1                                                   ║
╠═══════════════════════════════════════════════════════════╣
║ 検出キャラクター:                                          ║
║   ✓ hero (勇者アレクス) - 12回出現 [confidence: 0.95]      ║
║   ✓ heroine (エリーゼ) - 8回出現 [confidence: 0.92]        ║
╠═══════════════════════════════════════════════════════════╣
║ 検出設定:                                                  ║
║   ✓ kingdom (エルフィード王国) - 5回出現 [confidence: 0.88]║
╚═══════════════════════════════════════════════════════════╝
```

### 3.3 差分更新機能

```bash
storyteller meta generate chapter01.md --update

# 既存の .meta.ts を読み込み、変更部分のみ更新
```

**実装**:
- 既存ファイルをパース
- 新規検出結果と比較
- 差分のみ更新（手動編集部分は保持）

### 3.4 バッチ処理

```bash
# 複数ファイルを一括処理
storyteller meta generate manuscripts/*.md --batch

# ディレクトリ指定
storyteller meta generate --dir manuscripts/ --recursive
```

---

## 実装順序

### ステップ 1: 基盤構築（Phase 1 前半）
1. `FrontmatterParser` クラスの実装
2. `TypeScriptEmitter` クラスの実装
3. `meta generate` コマンドの基本フレーム

### ステップ 2: 検出エンジン（Phase 1 後半）
4. `ReferenceDetector` クラスの実装（完全一致のみ）
5. `ValidationGenerator` クラスの実装
6. `MetaGeneratorService` の統合

### ステップ 3: 高度な検出（Phase 2）
7. displayNames/aliases 対応の追加
8. 信頼度計算アルゴリズムの実装
9. プリセット機能の追加

### ステップ 4: インタラクティブ機能（Phase 3）
10. `--interactive` オプションの実装
11. `--preview` / `--dry-run` の強化
12. 差分更新機能の実装
13. バッチ処理の実装

---

## テスト計画

### ユニットテスト
- `tests/frontmatter_parser_test.ts`
- `tests/reference_detector_test.ts`
- `tests/validation_generator_test.ts`
- `tests/typescript_emitter_test.ts`

### 統合テスト
- `tests/meta_generate_command_test.ts`
- サンプルMarkdownを使用したE2Eテスト

### テストデータ
- `sample/manuscripts/chapter01.md` を使用
- 期待される出力: `sample/manuscripts/chapter01.meta.ts` と比較

---

## 関連ファイル（既存）

### 参照すべきファイル
- `src/cli/base_command.ts` - コマンド基底クラス
- `src/cli/modules/element/character.ts` - ネストコマンドの実装例
- `src/cli/command_registry.ts` - コマンド登録
- `sample/manuscripts/chapter01.md` - サンプルMarkdown
- `sample/manuscripts/chapter01.meta.ts` - 期待される出力形式
- `sample/src/characters/hero.ts` - キャラクター定義例
- `sample/src/settings/kingdom.ts` - 設定定義例

### 型定義参照
- `src/type/v2/character.ts` - detectionHints の定義
- `sample/src/types/chapter.ts` - ChapterMeta 型

---

## 想定される課題と対策

### 課題 1: 代名詞の曖昧性
- **問題**: 「彼」「彼女」が複数キャラクターに該当する可能性
- **対策**: Phase 3 のインタラクティブモードで確認、または低信頼度でマッピング

### 課題 2: binding.yaml の不整備
- **問題**: hero 以外のキャラクターには binding.yaml が存在しない
- **対策**: detectionHints を優先的に使用、binding.yaml はオプショナル

### 課題 3: インポートパスの解決
- **問題**: 生成されるファイルからのインポートパス
- **対策**: プロジェクトルートからの相対パスを計算、設定ファイルでカスタマイズ可能に

---

## 成功基準

### Phase 1 完了条件
- [ ] `storyteller meta generate chapter01.md` が正常に動作
- [ ] 生成された `.meta.ts` が型チェックを通過
- [ ] 基本的な検証ルールが含まれている

### Phase 2 完了条件
- [ ] displayNames による検出が動作
- [ ] 信頼度スコアが出力に含まれる
- [ ] プリセットが適用可能

### Phase 3 完了条件
- [ ] インタラクティブモードで曖昧な参照を解決可能
- [ ] バッチ処理で複数ファイルを一括生成可能
- [ ] 差分更新で手動編集部分が保持される

---

## 見積もり

| フェーズ | 作業内容 | 見積もり |
|---------|---------|---------|
| Phase 1 | MVP実装 | 3-4日 |
| Phase 2 | 高度な検出 | 2-3日 |
| Phase 3 | インタラクティブ | 2-3日 |
| テスト | ユニット・統合 | 1-2日 |
| **合計** | | **8-12日** |
