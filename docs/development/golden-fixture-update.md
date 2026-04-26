# Golden Fixture 更新手順

## 概要

### Process 10 で導入した Golden 契約テストの位置づけ

Process 10 では、Go 移行後に既存機能を壊さないことを保証するため、CLI/LSP/MCP の
入出力を Golden ファイルとして固定する「契約テスト」を導入した。

これらのテストは TDD の Red → Green サイクルで作成しており、**現状の挙動を pin する**
ことを最初の目的としている。

### 「現状の挙動を pin する」テストとしての役割

Golden テストは「正しい挙動を定義する」テストではなく、
「今この瞬間の挙動を記録し、意図しない変化を検知する」テストである。

- exit code、stdout/stderr の内容をファイルとして保存
- CI で実行のたびに実際の出力と比較
- 差分が生じたら「意図した変更か？」を人間がレビューする

### 意図的な仕様変更時にゴールデンを更新するワークフロー

実装を変更した結果として Golden の期待値を更新する場合、
`-update` フラグ（またはテストごとの専用フラグ）を使って Golden を再生成する。

---

## 対象テスト一覧

| ファイル | パッケージ | -update フラグ | 役割 |
|---------|-----------|---------------|------|
| cmd/storyteller/golden_test.go | main | -update | help/version/no_args 等 CLI 基本契約 |
| cmd/storyteller/golden_meta_check_test.go | main | -update | meta check の cinderella minimal fixture 出力 |
| cmd/storyteller/golden_view_character_test.go | main | -update | view character の現状契約（現在 exit 1）|
| cmd/storyteller/golden_version_canonical_test.go | main | -update-canonical | version JSON の canonicalize 比較 |
| internal/lsp/server/golden_wire_test.go | server | (既存 testdata 流用) | LSP initialize/hover wire-protocol |
| internal/mcp/server/golden_wire_test.go | server | -update | MCP initialize/tools_list/tools_call_meta_check wire-protocol |

---

## 更新ワークフロー

### 1. 期待される変更（実装の意図的な変化）の場合

1. 該当テストを `-update` 付きで実行

   ```bash
   # 例: cmd/storyteller 配下の全 Golden を更新
   go test ./cmd/storyteller/... -run TestGolden -update

   # version JSON canonical のみ更新
   go test ./cmd/storyteller/... -run TestVersionCanonical -update-canonical

   # MCP wire-protocol Golden を更新
   go test ./internal/mcp/server/... -run TestGoldenWire -update
   ```

2. `testdata/golden/` または `testdata/<pkg>/` 配下のファイル差分を確認

   ```bash
   git diff testdata/
   ```

3. 差分が意図と一致するか目視レビュー
4. 一致すれば `git add testdata/` して commit に同梱

### 2. 想定外の変更（regression）の場合

1. `-update` を使わずに失敗内容を確認

   ```bash
   go test ./cmd/storyteller/... -run TestGolden -v
   ```

2. 実装側の不具合を修正
3. テストが PASS することを確認

---

## canonicalize 戦略

- **JSON**: `json.Unmarshal → MarshalIndent("", "  ")` で key 順序とインデント正規化
- **TempDir パス**: `strings.ReplaceAll(stdout, root, "[TMPDIR]")` で実行毎差分を吸収
- **時刻**: `internal/testkit/clock` の FakeClock を使用してタイムスタンプ固定

---

## 知られている契約 flip 候補（Refactor フェーズ予定）

- **view character の exit 1 → exit 0**: TS character loader 実装後に Golden を更新予定
- **meta check の "0 files validated" → 実 fixture チェック結果**: manuscripts loader 拡張後
- **RAG document fixture**: Process 10 second wave で追加予定

---

## 関連ファイル

- `cmd/storyteller/internal/testfixture/cinderella.go`: 共有 minimal fixture materializer
- `internal/testkit/clock`: 時刻固定
- `plan/process-10.md`: ミッション詳細チェックリスト
