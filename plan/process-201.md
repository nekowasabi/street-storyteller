# Process 201: docs/subplot.md 新規作成

**Documentation** | N=201

## Overview

subplot 機能の独立ドキュメント。型構造、CLI使用例、MCP統合、ベストプラクティスをカバー（目安400行）。

## Affected

- 新規: `docs/subplot.md`
- 参考ドキュメント: `docs/lsp.md`, `docs/rag.md`, `docs/cli.md`, `docs/timeline.md`

## Implementation Notes

### セクション構成

#### 1. 概要と設計思想

```markdown
# Subplot Management

## 概要

Subplotは、複数の物語ラインを並列管理し、その交点（intersection）を通じて物語の絡み合いを表現する機能です。

## Timeline vs Subplot

- **Timeline**: 物語の「いつ」を管理（時系列、イベント順序）
- **Subplot**: 物語の「何」「どのように」を管理（複数の物語ライン、成長軸）

例：シンデレラ
- Timeline: 「魔法使いの登場」「舞踏会当日」のイベント時系列
- Subplot: 「シンデレラの成長」「王子の花嫁探し」という2本の物語ライン
```

#### 2. 型構造

```markdown
## 型定義

### Subplot型

[TypeScript コード例: Subplot, PlotBeat, PlotIntersection 型定義]
```

#### 3. CLI使用例

```markdown
## CLI使用例

### サブプロット作成

\`\`\`bash
storyteller element subplot --name "主人公成長" --type main --summary "...略..."

storyteller element subplot --name "王子の花嫁探し" --type subplot --summary "...略..."
\`\`\`

### ビート追加

\`\`\`bash
storyteller element beat --subplot main_plot \
  --title "シンデレラが舞踏会に行く" \
  --order 1 \
  --position climax
\`\`\`

### 交点作成

\`\`\`bash
storyteller element intersection \
  --subplots main_plot,side_plot \
  --beat main_plot:beat_001 \
  --description "王子とシンデレラが舞踏会で出会う"
\`\`\`

### 表示

\`\`\`bash
storyteller view subplot --list
storyteller view subplot --id main_plot
storyteller view subplot --id main_plot --format mermaid
storyteller view subplot --id main_plot --format html
\`\`\`
```

#### 4. MCP統合

```markdown
## MCP統合（Claude Desktop）

Claude Desktopの設定ファイル（claude_desktop_config.json）で以下を設定：

\`\`\`json
{
  "mcpServers": {
    "storyteller": {
      "command": "storyteller",
      "args": ["mcp", "start", "--stdio"]
    }
  }
}
\`\`\`

### MCPツール

- `subplot_create(name, type, summary)`: サブプロット作成
- `subplot_view(action, id, format)`: サブプロット表示
- `beat_create(subplot_id, title, order, position)`: ビート作成
- `intersection_create(subplot_ids, beat_id, description)`: 交点作成

### MCPリソース

- `storyteller://subplots`: サブプロット一覧
- `storyteller://subplot/{id}`: 特定サブプロット
```

#### 5. Validate動作

```markdown
## Validate動作

### 参照整合性チェック

- beat の subplot_id が存在するか確認
- intersection の subplot_ids、beat_id が存在するか確認
- 循環参照（beat が preconditionBeatIds で自分を参照）を検出

### 構造完全性チェック

- 各 subplot の beat 数が1以上（オプショナル警告）
- intersection が存在しない場合でも エラーではなく情報メッセージ

### オプショナル動作

- Subplot 全体が完全オプショナル
- プロジェクトに subplot がなくても validate は SUCCESS
```

#### 6. Foreshadowing.type="mystery" との使い分けガイド（リスク#2対策）

```markdown
## Foreshadowing.type="mystery" との使い分け

### Mystery（謎）

- **単一の謎と回収**: 「古びた剣」という謎が設置され、後で回収される（1対1）
- **点的な関係**: 謎の設置と回収の2つの点で成立
- **型の拡張性**: 複雑な謎でも、planting/resolution という2つの情報で十分

例：「ガラスの靴は誰のもの？」

### Subplot（サブプロット）

- **複数 beat による物語ライン**: 「シンデレラの成長」は setup → rising → climax → falling → resolution という5段階
- **線的な展開**: 複数イベントを通じた キャラクター/テーマの変化
- **intersection による関連付け**: 他のサブプロットとの交点で物語の深さを表現

例：「シンデレラが最初は従者として虐げられ、やがて自分の価値を認識し、王子と出会い、城に迎えられる」

### 使い分けの判断基準

| 観点 | Mystery | Subplot |
| - | - | - |
| 要素数 | 謎の設置・回収 (2点) | 複数 beat (5+点) |
| 焦点 | 「何が謎か」 | 「どのように変化するか」 |
| 他要素との関係 | 単独で成立 | 他サブプロットと交点 |
| 使用シーン | 秘密、仕掛け、トリック | キャラクター成長、テーマ展開 |
```

#### 7. ベストプラクティス

```markdown
## ベストプラクティス

### Subplot数の推奨

- 短編（1-5章）: 1-2 subplot
- 中編（6-15章）: 2-4 subplot
- 長編（16+章）: 3-6 subplot

### Focus Character 配分

- main subplot: 主人公 (weight: high)
- subplot: 主要脇役 (weight: medium)
- parallel: 異なるキャラ視点 (weight: low)

### Intersection 設計

- 最低でも main と1つの subplot 間に1交点
- 複数交点で物語の絡み合いを表現
- 交点が多すぎる場合は、サブプロット統合を検討
```

#### 8. トラブルシューティング

```markdown
## トラブルシューティング

### エラー: "subplot XXX not found"

- beat の subplot_id を確認
- `storyteller view subplot --list` で存在確認

### エラー: "beat XXX not found"

- intersection の beat_id を確認
- beat_id フォーマット: `{subplot_id}:{beat_id}`

### 警告: "No subplots found in project"

- エラーではなく情報メッセージ
- subplot 機能を使わないプロジェクトでは無視可能
```

## TDD: Red Phase

ドキュメント作成には Red Phase なし。

## TDD: Green Phase

### Implementation Checklist

- [ ] `docs/subplot.md` 作成（全セクション）
- [ ] TypeScript型定義コード例を追記
- [ ] CLI コマンド例の正確性確認
- [ ] MCP ツール・リソース一覧を確認
- [ ] Foreshadowing との使い分けガイド作成完了
- [ ] Markdown 構文確認

### Verification

```bash
# ファイル存在確認
ls -la docs/subplot.md
# Expected: file exists, ~400 lines

# Markdown 構文確認
wc -l docs/subplot.md
```

## TDD: Refactor Phase

- セクションの整理度確認（階層構造）
- 用語統一（Subplot vs subplot vs sub-plot）
- リンク・参照の一貫性

## Requires

- Process 100: 後方互換性検証完了

## Blocks

- Process 300: OODA 振り返り
