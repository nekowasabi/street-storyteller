# CLI Reference

`storyteller` CLI は Go 単一バイナリで実装されている (`cmd/storyteller`)。本ドキュメントは `internal/cli/modules/` に登録された全コマンドの正準リファレンスである。

> 関連: [architecture.md](./architecture.md) / [lsp.md](./lsp.md) / [mcp.md](./mcp.md) / [lint.md](./lint.md)

## インストール

```bash
go install github.com/takets/street-storyteller/cmd/storyteller@latest
storyteller --version
```

ビルド済みバイナリは Releases から取得可能。Deno は CLI / LSP / MCP の実行には不要。

## グローバルオプション

| Option | 説明 |
|--------|------|
| `--json` | 出力を JSON 形式で返す（多くのコマンドが対応） |
| `--help`, `-h` | 該当コマンドのヘルプを表示 |
| `--version`, `-v` | バージョン情報 |
| `--quiet`, `-q` | 出力抑制 |
| `--verbose` | 詳細出力 |

## コマンド一覧

`internal/cli/modules/index.go::RegisterCore` で登録されるコマンド集合。

| Command | 実装 | 概要 |
|---------|------|------|
| `version` | `modules/version` | バージョン表示 |
| `help` | `modules/help` | ヘルプ表示 |
| `generate` | `modules/generate` | 新規プロジェクト雛形生成 |
| `element <kind>` | `modules/element` | 物語要素の追加 |
| `update` | `modules/update` | TypeScript authoring サブセットの更新検査・適用 |
| `meta check` | `modules/meta` | 原稿 frontmatter 検証 |
| `lint` | `modules/lint` | textlint + storyteller 診断 |
| `lint install-hooks` | `modules/lint` | Git pre-commit hook 配置 |
| `lsp start` | `modules/lsp` | LSP サーバ起動 (stdio) |
| `lsp validate` | `modules/lsp` | ワンショット検証 |
| `lsp install` | `modules/lsp` | エディタ設定の生成 |
| `mcp start` | `modules/mcp` | MCP サーバ起動 (stdio) |
| `mcp init` | `modules/mcp` | Claude Desktop 設定の初期化 |
| `view character` | `modules/view` | キャラクター表示 |
| `view list` | `modules/view` | 全要素一覧 |
| `view <setting\|timeline\|foreshadowing\|plot>` | `modules/view` | 各エンティティ表示 |

---

## `storyteller generate`

新規 storyteller プロジェクトの雛形を生成する。

```bash
storyteller generate --path my-story
```

| Flag | 説明 |
|------|------|
| `--path <dir>` | 生成先ディレクトリ |
| `--json` | 結果を JSON で返す |

実装: `internal/cli/modules/generate/generate.go`

---

## `storyteller element <kind>`

物語要素を追加する。`<kind>` は以下のいずれか:

```
character | setting | timeline | foreshadowing | plot | beat | event | intersection | phase
```

### 共通フラグ

| Flag | 説明 |
|------|------|
| `--name <string>` | 要素名 |
| `--id <string>` | エンティティ ID（省略時は name から派生） |
| `--summary <string>` | 概要 |
| `--json` | JSON 出力 |

### Kind 固有フラグ（抜粋）

| Kind | 主要フラグ |
|------|----------|
| `character` | `--role protagonist\|antagonist\|supporting\|guest` |
| `setting` | `--type location\|culture\|...` |
| `timeline` | `--scope story\|world\|character\|arc` |
| `event` | `--timeline <id>` `--title` `--category` `--order` |
| `foreshadowing` | `--type chekhov\|prophecy\|hint\|symbol\|mystery\|red_herring` `--planting-chapter` `--planting-description` `--importance major\|minor\|subtle` `--planned-resolution-chapter` |
| `plot` | `--type main\|sub\|parallel\|background` |
| `beat` | `--plot <id>` `--title` `--summary` `--structure-position setup\|...` |
| `intersection` | `--source-plot` `--source-beat` `--target-plot` `--target-beat` `--summary` `--influence-direction forward\|backward` |

実装: `internal/cli/modules/element/element.go`、ドメイン検証は `internal/domain/`。

### 例

```bash
storyteller element character --name hero --role protagonist --summary "勇者"
storyteller element foreshadowing --name "古びた剣" --type chekhov \
  --planting-chapter chapter_01 --planting-description "床板の下から発見"
```

---

## `storyteller update`

TypeScript authoring サブセットへの追従検査。

```bash
storyteller update get      # リモートの最新サブセット取得
storyteller update check    # ローカル乖離検査
storyteller update apply    # 適用
```

実装: `internal/cli/modules/update/update.go`

---

## `storyteller meta check`

`manuscripts/*.md` の YAML frontmatter（characters / settings / timeline_events 等）を検証する。

```bash
storyteller meta check
storyteller meta check --json
storyteller meta check --path manuscripts/chapter01.md
```

JSON 出力例:

```json
{
  "type": "success",
  "checked": 12,
  "errors": []
}
```

実装: `internal/cli/modules/meta/check.go`、ロジックは `internal/service.MetaCheckService.Run`。

---

## `storyteller view <kind>`

物語要素を整形表示する。

```bash
storyteller view list                          # 全要素サマリ
storyteller view character --id hero           # 特定キャラ
storyteller view character --id hero --details # ファイル参照を解決して詳細展開
storyteller view setting --list --type location
storyteller view timeline --id main_story --format mermaid
storyteller view foreshadowing --list --status planted
storyteller view plot --id love_story --json
```

| Flag | 説明 |
|------|------|
| `--id <id>` | 単体表示 |
| `--list` | 一覧表示 |
| `--details` | 長文の `{ file: ... }` 参照を解決して展開 |
| `--format mermaid\|text\|json` | 出力形式 |
| `--status <status>` | 伏線などのステータスフィルタ |
| `--type <type>` | 種別フィルタ |
| `--json` | JSON 出力 |

実装: `internal/cli/modules/view/`

---

## `storyteller lint`

textlint と storyteller 診断ソースを統合実行する。詳細は [docs/lint.md](./lint.md) を参照。

```bash
storyteller lint
storyteller lint --path manuscripts/chapter01.md --fix
storyteller lint --json --severity error
storyteller lint install-hooks --strict
```

実装: `internal/cli/modules/lint/lint.go`

---

## `storyteller lsp ...`

LSP サーバ関連。詳細は [docs/lsp.md](./lsp.md)。

```bash
storyteller lsp start --stdio
storyteller lsp validate manuscripts/chapter01.md
storyteller lsp install nvim
storyteller lsp install vscode
```

実装: `internal/cli/modules/lsp/{start,validate,install}.go`

---

## `storyteller mcp ...`

MCP サーバ関連。詳細は [docs/mcp.md](./mcp.md)。

```bash
storyteller mcp start --stdio
storyteller mcp init   # Claude Desktop 設定スニペットを出力
```

実装: `internal/cli/modules/mcp/mcp.go`

---

## JSON 出力規約

全モジュールは `--json` 指定時に以下のいずれかの shape を返す（`internal/cli/presenter.go`）。

成功:
```json
{ "type": "success", "message": "...", "data": {...} }
```

失敗:
```json
{ "type": "error", "code": "validation_failed", "message": "...", "details": [...] }
```

非ゼロ exit code は失敗時のみ。golden test は `cmd/storyteller/golden_test.go` を参照。

## エラーケース

| 状況 | exit code | メッセージ例 |
|------|-----------|-----------|
| 引数欠落 | 2 | `missing required flag: --name` |
| ID 重複 | 1 | `entity already exists: <id>` |
| 不正な enum 値 | 1 | `invalid value for --role: ...` |
| プロジェクト未検出 | 1 | `not a storyteller project: <path>` |

実装: `internal/errors/` の wrapping を経由する。
