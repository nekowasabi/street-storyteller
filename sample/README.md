# Street Storyteller - サンプルアーキテクチャ

このディレクトリは、TypeScript型定義とMarkdown原稿を効果的に連携させる**コンパニオンファイル方式**の実装例です。

## 🏗️ アーキテクチャ概要

```
┌─────────────────────────────────────────┐
│         検証・変換層                    │
│    (validate.ts / LSPサーバー)          │
├─────────────────────────────────────────┤
│         連携層                          │
│    (binding.yaml / meta.ts)             │
├─────────────────────────────────────────┤
│         コンテンツ層                    │
│  TypeScript（型定義） | Markdown（原稿）│
└─────────────────────────────────────────┘
```

## 📁 ディレクトリ構造

```
sample/
├── src/
│   ├── types/              # 型定義
│   │   ├── character.ts    # キャラクター型（拡張版）
│   │   ├── setting.ts      # 設定型（拡張版）
│   │   └── chapter.ts      # 章メタデータ型
│   ├── characters/         # キャラクター定義
│   │   ├── hero.ts         # 勇者の型定義
│   │   ├── hero.details.md # 勇者の詳細設定
│   │   ├── hero.binding.yaml # 連携定義
│   │   ├── heroine.ts      # ヒロインの型定義
│   │   └── mentor.ts       # 師匠の型定義
│   └── settings/           # 設定定義
│       ├── kingdom.ts      # 王国の型定義
│       └── magic_forest.ts # 魔法の森の型定義
├── manuscripts/            # 原稿
│   ├── chapter01.md        # 第1章の原稿
│   ├── chapter01.meta.ts   # 第1章のメタデータ
│   ├── chapter02.md        # 第2章の原稿
│   └── chapter02.meta.ts   # 第2章のメタデータ
└── validate.ts             # 検証スクリプト
```

## 🔑 主要コンポーネント

### 1. TypeScript型定義（型安全性）
- **Character型**: キャラクターの構造化データ
  - 必須メタデータ（name, role, traits等）
  - ハイブリッド詳細（インラインまたはファイル参照）
  - LSP用検出ヒント

### 2. Markdown詳細（自然な執筆）
- 長文の設定情報
- 構造化された見出し
- 純粋なMarkdownで記述

### 3. Binding YAML（連携定義）
- 参照パターンと信頼度
- 検証ルール
- スタイルガイド

### 4. Chapter Meta（章管理）
- 章固有の検証ルール
- 参照マッピング
- プロット追跡

## 🚀 使い方

### 検証スクリプトの実行

```bash
# Denoで検証スクリプトを実行
deno run --allow-read validate.ts
```

### CLIテンプレート生成の統合フロー

```bash
# ルートでCLIを実行し、新しいプロジェクトを生成
deno run --allow-read --allow-write main.ts generate \
  --name demo-story \
  --template novel \
  --path ./generated

# 生成後、.storyteller.json が自動作成され、
# マイグレーションガイドとTDDガイドが標準出力へ表示されます
```

生成された `.storyteller.json` にはスキーマバージョンが記録され、
旧構成プロジェクトをアップグレードする際は CLI のマイグレーションガイドに従います。

### 期待される出力

```
🚀 Starting Storyteller Validation System
==================================================

📖 Validating Chapter: 旅の始まり
   File: ./manuscripts/chapter01.md

  🎭 Character Validation:
    ✅ 勇者アレクス is present
    ✅ 魔法使いエリーゼ is present

  🏰 Setting Validation:
    ✅ エルフィード王国 is present

  🔍 Custom Validations:
    ✅ character_presence passed
    ✅ setting_consistency passed
    ✅ plot_advancement passed

  🔗 Reference Mapping:
    📊 Total references defined: 15
    📊 References used in content: 12/15
```

## 💡 アーキテクチャの利点

### 完全な型安全性
- TypeScriptファイルは100%純粋なTypeScript
- 完全なLSP/Linter機能
- 型チェックとIntelliSense

### 自然なMarkdown執筆
- Markdownの構造化機能を完全活用
- 見出し、リスト、リンクなど
- 既存のMarkdownツールと互換

### 柔軟な連携
- YAMLによる明示的な連携定義
- 信頼度ベースの参照解決
- 段階的な導入が可能

### 強力な検証
- カスタム検証ルール
- リアルタイム整合性チェック
- 双方向ナビゲーション（LSP実装時）

## 📝 Markdown内の参照パターン

```markdown
勇者は立ち上がった。        <!-- 暗示的参照（信頼度: 0.9） -->
@勇者は立ち上がった。        <!-- 明示的参照（信頼度: 1.0） -->
エリーゼが魔法を唱えた。     <!-- 表示名参照（信頼度: 0.95） -->
師匠の言葉が響いた。         <!-- 別名参照（信頼度: 0.88） -->
彼は考えた。                <!-- 代名詞参照（文脈依存、信頼度: 0.5-0.7） -->
```

## 🤖 LLMベース自然言語テスト

### 概要
従来の文字列マッチングでは検証できない、物語の意味的・感情的整合性をLLMで検証します。

### テスト実行

```bash
# LLMテストを実行（モックプロバイダー使用）
cd sample
deno run --allow-read tests/llm/run-llm-test.ts
```

### テスト定義例

```yaml
# tests/llm/chapter01.llm-test.yaml
character_tests:
  - name: "勇者の性格描写の一貫性"
    assertion: |
      勇者アレクスは「正義感が強いが、やや天然」
      という性格設定に沿って描写されているか
    expected: true
    severity: error
```

### 実装ファイル

- `tests/llm/chapter01.llm-test.yaml` - テスト定義
- `tests/llm/llm-test-runner.ts` - テストランナー
- `tests/llm/mock-llm-provider.ts` - モックLLMプロバイダー
- `tests/llm/run-llm-test.ts` - 実行スクリプト

### 本番環境での使用

モックプロバイダーを実際のLLM APIに置き換えてください：

```typescript
// OpenAI APIを使用する例
import { OpenAIProvider } from "./openai-provider.ts";
const llmProvider = new OpenAIProvider(apiKey);
```

## 🔮 将来の拡張

1. **LSPサーバー実装**
   - リアルタイム検証
   - ホバー情報表示
   - 定義ジャンプ

2. **AI統合**
   - 文脈解析
   - 自動補完
   - 整合性提案

3. **ビジュアルエディタ**
   - キャラクター関係図
   - タイムライン表示
   - プロット管理

## 📚 関連ドキュメント

- [SOLUTION.md](../SOLUTION.md) - アーキテクチャの詳細説明
- [MEMO.md](../MEMO.md) - プロジェクト調査結果
- [GitHub Issues](https://github.com/nekowasabi/street-storyteller/issues) - 機能要望と議論
