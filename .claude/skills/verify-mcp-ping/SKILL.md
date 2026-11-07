---
name: verify-mcp-ping
description: MCP stdio サーバー（storyteller mcp start --stdio）が、受け取った ping に初期化の前後・不正行の直後・stdin を閉じる直前のどこでも、同じ id で空の結果 {} を 1 回だけ返すことを TLA+ と Go の適合テストで検査する。internal/mcp/server/server.go の RegisterStandardHandlers・Server.Run、internal/mcp/server/dispatcher.go の Dispatch、internal/mcp/server/lifecycle.go、internal/mcp/protocol/jsonrpc.go の Read を変えたら、コミット前に使う。
---

# verify-mcp-ping

## 守る性質と、破れたときの害

- **ping は拒否しない（`PingNeverRejected`）**: ping には、セッションのどの状態でもエラーを返さない。initialize の前も含む。MCP の仕様では、ping は初期化の前でも送ってよい。
  害: クライアントが生存確認に失敗し、生きているサーバーを切断して作り直す。
- **終了前にすべての ping に答える（`EveryPingAnsweredBeforeExit`）**: 呼び出し側の取り消しを除き、セッションが終わるのは、受け取った ping のすべてに `{}` を返したあとだけ。
  害: 応答が来ないまま接続が切れ、クライアント側の ping がタイムアウトする。

## 道具と理由

TLA+ と TLC を使う。壊れるのは「どの順で何が届いたか」で決まる場面である。初期化の前か後か、不正行の後か、stdin を閉じた後に読み残しがあるか。小さなモデルで全ての順序を調べる模型検査が最も安い。結果はすべて pstack の `/statechart` スキルで読む。コマンドや置き場所はそのスキルの版に従い、ここには写さない。

モデルだけでは実コードを見ないので、モデルの反例経路の 1 本を Go のテスト `TestServer_PingAnsweredInEverySessionState`（`internal/mcp/server/server_test.go`）として実際の `Server.Run` で再生する。モデルと実コードを結ぶのはこのテストである。

## モデルが写しているもの

`MCPPing.tla` の 1 手は次のどれか 1 つ。

- クライアントが 1 行書く（ping / initialize / 不正行）
- `Server.Run` のループが 1 周する（`protocol.Read` で 1 行読み、`Dispatch` し、`protocol.Write` で書く）
- クライアントが stdin を閉じる
- 読み残しが無くなって EOF で終わる
- 呼び出し側が取り消す

読み取りは共有の `bufio.Reader` を使うため、行は書いた順に 1 行ずつ読まれる。このことは `.cursor/skills/verify-mcp-stdio` で検査している。

`Variant` は次の 4 つ。

| Variant | 対応するコード | 期待 |
|---|---|---|
| `registered` | 現行。`RegisterStandardHandlers` が `ping` に `struct{}{}` を返す | 全規則と NoDeadlock が成立（440 状態） |
| `missing` | ping を登録していない。`Dispatch` が -32601 を返す（f7f0562 以前） | 両規則が破れる |
| `gated` | ping ハンドラで `s.lifecycle.RequireInitialized()` を呼ぶ | 両規則が破れる。initialize 前の ping が拒否される |
| `stopOnMalformed` | 不正行で `Run` が終わる（ec8a5bd 以前） | `EveryPingAnsweredBeforeExit` が破れる |

範囲は、クライアントが書く行が最大 3 行（`MaxMessages = 3`）まで。モデルは JSON の中身、id の値、応答の順序、ping 以外のメソッドの結果、tools/call の所要時間を持たない。

## 走らせ方

1. Go の適合テスト（リポジトリのルートで実行）:

   ```sh
   go test ./internal/mcp/server/ -run Ping -count=1
   ```

   PASS が期待。

2. 形式検査: `/statechart` を読み、その手順どおりにリポジトリ外の作業フォルダへ `MCPPing.tla`、4 つの `.cfg`、`view.mjs` を写す。`--view view.mjs` を付けて、cfg ごとに走らせる。
   - `MCPPing.cfg`: `TypeOK`、`PingNeverRejected`、`EveryPingAnsweredBeforeExit`、NoDeadlock がすべて成立。
   - `MCPPingMissing.cfg` と `MCPPingGated.cfg`: `PingNeverRejected` が 2 手（client sends ping → server answers ping）で破れ、`EveryPingAnsweredBeforeExit` が 4 手で破れる。
   - `MCPPingStopOnMalformed.cfg`: `EveryPingAnsweredBeforeExit` だけが 3 手（不正行を送る → ping を送る → 不正行を読んで終了）で破れる。

   壊した 3 案が落ちることは、規則が検査できていることの確認であって、欠陥ではない。4 つとも数秒で終わる。

3. 出てきた `chart.mmd` と `report.md` を、`charts/<cfg 名>/` の同名ファイルと diff する。差があれば、モデルとビューのどちらが変わったかを読む。

## 落ちたとき: 実コードの欠陥か、モデルのずれか

- Go テストが落ち、メッセージが `ping id N = ... want result {}` → ping がエラーを返している。-32601 なら登録が消えた。`lifecycle: server not initialized` なら初期化前の ping を拒否している。これは `gated` の反例と同じ欠陥なので、ハンドラから状態の検査を外す。テストは弱めない。
- Go テストが `Run: ... malformed message` で落ちる → `Run` が不正行で終わっている。`stopOnMalformed` の反例と同じ。`Server.Run` の `protocol.ErrMalformed` の分岐を戻す。
- `MCPPing.cfg` が落ちて Go テストが通る → モデルがコードからずれた。最短経路の各手を `Server.Run` の 1 周と照らし合わせ、モデルのほうを直してから再検査する。
- `MCPPing.cfg` が通って Go テストが落ちる → モデルが実際の手順を 1 つ落としている。その手順をモデルに足す。テストは消さない。
- 意図して振る舞いを変える（例: ping に何か値を返す）ときは、この節と性質の節、モデル、テストを一緒に直し、理由を書く。

## 落ちる検証を見た記録（2026-11-07）

実コードに 2 つの壊し方を入れ、Go の適合テストが捕まえることを確かめた。確かめたあと、どちらも戻した。

| 壊し方（`internal/mcp/server/server.go`） | Go テストの結果 | 対応する Variant |
|---|---|---|
| ping ハンドラに `s.lifecycle.RequireInitialized()` を足す | id 1 と id 2 が `-32603 lifecycle: server not initialized` で FAIL。initialize 後の id 4 は通る | `gated` |
| `ErrMalformed` の分岐で `return err` する | `Run: Parse: mcp: unmarshal message: mcp: malformed message` で FAIL | `stopOnMalformed` |

ping の登録前（`missing` に当たる）は、id 1・2・4 がすべて `-32601 method not found: ping` で FAIL した。実バイナリでは `{"id":"a","method":"ping"}` に `{"jsonrpc":"2.0","id":"a","result":{}}` が返り、stdin を閉じると exit 0 で終わることを確かめた。

## カバレッジと同期コミット

対象:

- `internal/mcp/server/server.go` の `RegisterStandardHandlers`（`ping` の登録）と `Server.Run`
- `internal/mcp/server/dispatcher.go` の `Dispatch`
- `internal/mcp/server/lifecycle.go` の `RequireInitialized`（現在は ping から呼ばない）
- `internal/mcp/protocol/jsonrpc.go` の `Read` と `ErrMalformed`
- `internal/mcp/server/server_test.go` の `TestServer_PingAnsweredInEverySessionState`

同期コミット: `SYNC_COMMIT_PENDING`。対象のファイルがこのコミットより後に変わったら、検査を走らせたうえで、モデルの 1 手が `Server.Run` の 1 周を写しているかを読んで確かめる。確かめてから同期コミットを進める。検査が通っただけでは進めない。検査をせずに対象が変わってしまったときは `/maintain-formal-verification-skill` を使う。

## 範囲外

- 応答の速さ。`Run` は 1 行ずつ順に処理するため、時間のかかる tools/call の後ろに届いた ping は、その処理が終わるまで待つ。2026-11-07 時点で `internal/mcp/tools` は外部プロセスを起動しないが、所要時間は測っていない（未検証）。
- サーバーからクライアントへ送る ping。サーバーはクライアントに要求を送らない。
- 応答の順序と、標準出力への書き込みの並行性。書き込みは `Run` のループからしか行わない。

## ファイル

- `MCPPing.tla` モデル
- `MCPPing.cfg`（現行）、`MCPPingMissing.cfg`、`MCPPingGated.cfg`、`MCPPingStopOnMalformed.cfg`
- `view.mjs` 状態と遷移のラベル。TLC は `ClientWrites(k)` を `ClientWrites` という 1 つの名前で渡すので、書いた行の種類は遷移後の `queue` の末尾から読む。
- `charts/<cfg 名>/chart.mmd` と `report.md` 最新の出力
