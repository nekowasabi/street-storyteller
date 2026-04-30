# Process 203: Skills 改訂

## Overview
.claude/skills/storyteller-writing と skills/storyteller の参照ファイルを新名に

## Affected Files
- .claude/skills/storyteller-writing/SKILL.md: tool 一覧・kind
- .claude/skills/storyteller-writing/references/entity-subplot.md → entity-plot.md（リネーム＋内容）
- .claude/skills/storyteller-writing/references/tool-map.md: tool 名
- .claude/skills/storyteller-writing/references/workflow-scene-draft.md: 該当箇所
- skills/storyteller/SKILL.md: サブプロット記述

## Implementation Notes
skill description の自動検出キーワードに "plot" を含める

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] grep で "subplot" "Subplot" を全 skills ファイルで検出
- [x] 対象ファイルを特定

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] .claude/skills/storyteller-writing/SKILL.md を更新
- [x] entity-subplot.md を読み込み、entity-plot.md で新規作成
- [x] entity-subplot.md を削除
- [x] tool-map.md を更新
- [x] workflow-scene-draft.md を更新
- [x] skills/storyteller/SKILL.md を更新
- [x] skill description に "plot" キーワードを追加
- [x] grep で "subplot" "Subplot" が許可リストのみになることを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] スキル説明の一貫性をチェック
- [x] キーワードが正しく検出されることを確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1-9
- Blocks: -
