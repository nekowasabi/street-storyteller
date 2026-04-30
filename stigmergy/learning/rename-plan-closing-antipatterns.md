---
created: 2026-04-30
mission: subplot-to-plot-rename
tags: [rename, migration, closing-checklist, ci-guard, grep-pitfall, street-storyteller]
---

# Rename Plan Closing Antipatterns

大規模リネーム計画クロージング時のアンチパターンと対策（subplot → plot 事例）

## 背景

PLAN.md の Process 1〜300 で subplot 型を plot 型に統合・リネームする計画を実行し、最終クロージングフェーズで以下の取り残しが発見された。これらは将来の同種リネーム計画（例: Setting → Location, Foreshadowing → Hint など）でも再発しうる典型パターン。

## 教訓 1: PLAN.md frontmatter と Progress Map の二重管理問題

- **症状**: Progress Map のチェックボックスは `☑ done` 全完了だが、frontmatter `status: planning` のまま放置
- **原因**: 両者が独立管理になっており、Progress Map トグルだけで「完了感」が出るため frontmatter が忘れられる
- **対策**: 最終検証 Process（例: Process 300）の完了条件に「frontmatter status を `completed` に更新」を明記する。CI で `status: planning` かつ Progress Map 全完了の状態を warning として検出する仕組みを検討

## 教訓 2: 単語境界なし grep 置換の副作用

- **症状**: WORKFLOW.md L786 で本来 `main / sub / parallel / background` であるべき enum 値リストが `main / plot / parallel / background` に化けた
- **原因**: `subplot` を含む文字列を `plot` に一括置換した際、`sub` 単独の語までは `plot` に変わらないが、文書構成上 `subplot/sub/parallel/...` のような並列列挙があると、リネーム前段階で `sub` を指していた行が後続編集で `plot` へ二重置換される
- **対策**: リネーム時は `\bsubplot\b` のような単語境界 grep を使用する。一括置換後に「型値リスト・enum リテラルを列挙している箇所」を必ず人間レビューする（型定義ファイル `*.go` `*.ts` の literal type, テーブル構造のドキュメントなど）

## 教訓 3: 日本語訳語の取り残し

- **症状**: 識別子 `subplot` は残骸ゼロでも、訳語「副筋」「サブプロット」が放置される
- **原因**: CI grep チェック（Process 51）が英語識別子のみ対象だった
- **対策**: リネーム CI チェックには訳語も含める。ただし正当な使用（例: `sub` タイプの説明文で「副筋」を使う）もあるため、ホワイトリスト方式で許可行を明示する設計が必要

## 教訓 4: ディレクトリ構造の意図しない重複

- **症状**: WORKFLOW.md でディレクトリ一覧に `plots/` が 2 度登場（旧 `subplots/` が `plots/` になり、もともと別物として存在した `plots/` と重複）
- **原因**: リネーム前は別物だったディレクトリが同名化することへの考慮不足
- **対策**: リネーム計画段階で「リネーム後に同名衝突するエンティティ・ディレクトリ・ファイル」を事前洗い出しする Process を追加する

## 教訓 5: クロージング Phase の標準チェックリスト

リネーム計画完了時には以下を必ず実施:

1. frontmatter `status` を `completed` に更新
2. 識別子 + 訳語の両方で grep 残骸チェック
3. 型値リスト・enum リテラル列挙箇所の目視レビュー
4. 同名衝突するディレクトリ・ファイルの確認
5. ビルド・テスト全パス確認
6. PLAN.md → archive 移送（/archive-plan コマンド使用）
