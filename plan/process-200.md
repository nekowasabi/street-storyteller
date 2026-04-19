# Process 200: CLAUDE.md 更新

**Documentation** | N=200

## Overview

CLAUDE.md に subplot 機能の実装済みセクションを追加し、プロジェクト利用者に機能を紹介する。

## Affected

- 修正: `/home/takets/repos/street-storyteller/CLAUDE.md`
- 対象セクション: 「### 6. Foreshadowing(伏線管理)機能 - 実装済み」の後に「### 9. Subplot(サブプロット)機能 - 実装済み」を追加

## Implementation Notes

### 追加セクション内容

1. **Subplot機能の説明**
   - 複数の物語ラインを並列管理
   - 交点（intersection）で物語の絡み合いを表現

2. **型定義** (TypeScript コード例)
   - Subplot, PlotBeat, PlotIntersection の型構造

3. **CLIコマンド**
   ```bash
   storyteller element subplot --name "..." --type main --summary "..."
   storyteller element beat --subplot main_plot --title "..." --order 1
   storyteller element intersection --subplots main_plot,side_plot --beat main_plot:beat_001
   storyteller view subplot --list
   storyteller view subplot --id main_plot
   storyteller view subplot --id main_plot --format mermaid
   ```

4. **MCPツール一覧**
   - `subplot_create`: サブプロット作成
   - `subplot_view`: サブプロット表示
   - `beat_create`: ビート作成
   - `intersection_create`: 交点作成

5. **MCPリソース**
   - `storyteller://subplots`: サブプロット一覧
   - `storyteller://subplot/{id}`: 特定サブプロット

6. **MCPプロンプト**
   - `subplot_brainstorm`: サブプロット構成のブレインストーミング
   - `subplot_structure_suggestion`: サブプロット構造の提案
   - `subplot_intersection_analysis`: 交点分析

7. **HTML可視化説明**
   - vis-network によるグラフ表示
   - ノード（subplot/beat）とエッジ（intersection）の表示

8. **subplot_type 説明テーブル**
   | タイプ | 説明 |
   | - | - |
   | `main` | メインプロット（主軸） |
   | `subplot` | サブプロット（脇筋） |
   | `parallel` | 並行プロット（同時進行） |
   | `background` | バックグラウンド（背景） |

9. **structurePosition 説明テーブル**
   | 位置 | 説明 |
   | - | - |
   | `setup` | 設定・導入 |
   | `rising_action` | 盛り上がり |
   | `climax` | 頂点 |
   | `falling_action` | 下降 |
   | `resolution` | 解決 |

### MCPサーバーリスト更新

line 27-50 付近の「MCPサーバーは以下を公開します」セクションを以下のように更新：

```markdown
- Tools: `meta_check`, `meta_generate`, `element_create`, `view_browser`,
  `lsp_validate`, `lsp_find_references`, `timeline_create`, `event_create`,
  `event_update`, `timeline_view`, `timeline_analyze`, `foreshadowing_create`,
  `foreshadowing_view`, `subplot_create`, `subplot_view`, `beat_create`,
  `intersection_create`, `manuscript_binding`
```

### アクティブな仕様更新

「## アクティブな仕様」セクションに以下を追加：

```markdown
- street-subplot-foundation:
  サブプロット管理機能を実装し、複数の物語ラインを並列管理・可視化する計画
```

## TDD: Red Phase

ドキュメント更新には Red Phase なし。

## TDD: Green Phase

### Implementation Checklist

- [ ] CLAUDE.md の「### 6. Foreshadowing」セクション位置を確認
- [ ] 「### 9. Subplot」セクション全文を作成・挿入
- [ ] MCPサーバーリスト（Tools部分）を更新
- [ ] アクティブな仕様にエントリを追加
- [ ] ファイル構文確認（Markdown 有効性）

### Verification

```bash
# CLAUDE.md の Markdown 構文確認
head -100 CLAUDE.md | grep "### 9"
# Expected: "### 9. Subplot(サブプロット)機能 - 実装済み"
```

## TDD: Refactor Phase

- ドキュメントの一貫性確認（語調、用語統一）
- リンク・参照の有効性確認（ある場合）
- 行長・フォーマット統一

## Requires

- Process 100: 後方互換性検証完了

## Blocks

- Process 300: OODA 振り返り
