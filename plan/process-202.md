# Process 202: docs/plot.md 新設

## Overview
docs/subplot.md を docs/plot.md にリネームし内容を新名で書き直す。docs/cli.md, docs/mcp.md, docs/architecture.md, docs/migration/*.md も追従

## Affected Files
- docs/subplot.md → docs/plot.md（リネーム＋内容書換）
- docs/cli.md: コマンド名・kind
- docs/mcp.md: tool 名・URI・enum
- docs/architecture.md: subplot 言及部
- docs/migration/entity-type-mapping.md: mapping 表
- docs/migration/go-rearchitecture-requirements.md: 言及更新

## Implementation Notes
4 値表（main/sub/parallel/background）の説明を再構成

---

## Red Phase: テスト作成と失敗確認
- [x] ブリーフィング確認
- [x] grep で "subplot" "Subplot" を全 docs ファイルで検出
- [x] 対象ファイルを特定

✅ **Phase Complete**

---

## Green Phase: 最小実装と成功確認
- [x] ブリーフィング確認
- [x] docs/subplot.md を読み込み、内容を確認
- [x] docs/plot.md を新規作成（内容は新名に書き換え）
- [x] docs/subplot.md を削除
- [x] docs/cli.md を更新
- [x] docs/mcp.md を更新
- [x] docs/architecture.md を更新
- [x] docs/migration/*.md を更新
- [x] grep で "subplot" "Subplot" が許可リストのみになることを確認

✅ **Phase Complete**

---

## Refactor Phase: 品質改善
- [x] ドキュメント品質をチェック
- [x] クロスリファレンスの一貫性を確認

✅ **Phase Complete**

---

## Dependencies
- Requires: 1-9
- Blocks: -
