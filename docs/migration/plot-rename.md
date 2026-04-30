# Migration Guide: `subplot` → `plot/sub`

既存プロジェクトで旧表記 `subplot` を使っている場合に、現行の `plot` コマンドと `type: "sub"` へ移行するためのガイドです。

## 対象読者

- 旧仕様 (`subplot`, `--type plot`) で作成された storyteller プロジェクトを継続運用しているユーザー
- ドキュメントや運用手順を現行表記へそろえたいユーザー

## 手順

1. 作業ツリーをクリーンにする

```bash
git status
git add -A && git commit -m "chore: checkpoint before plot rename"
# もしくは git stash -u
```

2. dry-run で差分を確認する

```bash
storyteller migrate plot-rename --dry-run
```

3. 出力された差分をレビューする

- `src/plots/**/*.ts` の `type: "plot"` が `type: "sub"` へ変わるか
- コマンド例や運用ドキュメントの旧 `subplot` 表記が更新対象になっているか

4. 移行を適用する

```bash
storyteller migrate plot-rename --apply
```

5. 検証して migration 専用コミットを作る

```bash
storyteller meta check
go test ./...
git add -A
git commit -m "chore: migrate subplot naming to plot/sub"
```

## 値マッピング

| 旧 | 新 |
|---|---|
| `subplot` (用語) | `plot/sub` |
| `storyteller element subplot ...` | `storyteller element plot ...` |
| `--type plot` | `--type sub` |
| `type: "plot"` | `type: "sub"` |
| `docs/subplot.md` | `docs/plot.md` |

`main` / `parallel` / `background` は変更しません。

## フィールド/識別子マッピング

| 旧 | 新 | 備考 |
|---|---|---|
| `subplots` | `plots` | コレクション名の統一 |
| `subplotId` | `plotId` | 参照キーの統一 |
| `subplot_create` | `plot_create` | MCP Tool 名 |
| `storyteller://subplots` | `storyteller://plots` | MCP Resource URI |

## トラブルシュート

- `type: "plot"` が残る:
  自動移行の対象外テンプレートや手書きファイルの可能性があります。`rg -n 'type:\\s*"plot"' src docs` で特定し、`"sub"` へ手動置換してください。
- `storyteller element subplot` が CI スクリプトに残る:
  `storyteller element plot` に変更し、必要に応じて `--type sub` を明示してください。
- 想定外の差分が出た:
  いったん `git restore --source=HEAD -- .` ではなく、対象ファイル単位で差分を戻し、`--dry-run` の結果を再確認してください。
