# 原稿のレビュー

`storyteller review` は原稿を章の順に確認する。合否を出すのは `clarity` と `typo`。`interest` と `consult` は読者の返答を並べる。

```sh
storyteller review typo --path manuscripts --json
storyteller review clarity --path manuscripts --dry-run --json
storyteller review clarity --path manuscripts --json
storyteller review clarity --path manuscripts --team --json
storyteller review interest --path manuscripts "離脱したくなる場面を知りたい"
storyteller review consult --path manuscripts "山場で削れる場面を相談したい"
```

原稿のディレクトリ直下の `.md` をファイル名順に読む。`clarity` は構造検査、本文の判定、模擬読者、答えの判定の順で進む。`lint` と `reader check` は診断用として残る。読者の観測 TSV を使った `reader check` の結果を、レビューの合格の代わりにはしない。

## 設定

作品の `.storyteller.json` に送信先を設定する。

```json
{
  "version": "1.0.0",
  "review": {
    "judge": "openrouter:google/gemini-decision-1",
    "launcher": {"ateam": "~/.agents/skills/ateam/scripts/ateam.sh"},
    "stallMinutes": 60,
    "agents": [
      {"agent": "P1", "runtime": "claude-code", "model": "claude-fable-5-1", "effort": "medium"},
      {"agent": "P2", "runtime": "codex", "model": "gpt-6.1-sol", "effort": "medium"},
      {"agent": "P3", "runtime": "grok-build", "model": "grok-4.7", "effort": "medium"}
    ]
  }
}
```

判定モデルには `OPENROUTER_API_KEY` が必要。設定が無ければ本文を送らず著者に返す。モデルは `review.judge` の `openrouter:<モデル>` で差し替えられる。問いの組み立て方と閾値は `google/gemini-decision-1` で測った組のままで、設定から変更できない。別のモデルでは閾値を測っていない。モデルを差し替えると `criteria` が変わり、判定は取り直しになる。キャッシュに無い判定だけを外部へ送る。同じ文に対する問い（1 つの答えへの「全体」と必須項目ごとの問い）は、1 回の送信にまとめる。値は 1 問ずつ送ったときと同じである。

`clarity` の AI エージェントを起動するのは `--team` を付けたときだけ。`interest` と `consult` は起動を目的とするので `--team` は不要。`consult` は利用者の指示が必要で、ハーネスの種類ごとに名簿の最初の 1 体を使う。`interest` は名簿の全員を使う。`clarity` と `typo` に指示は渡せない。

判定モデルには期限章までの本文と事実の文、または読者の答えと模範解答を送る。AI エージェントには原稿と問いを渡す。Claude Code、Codex、Grok Build はそれぞれ設定されたサービスへ内容を送る。`--dry-run` で送る予定を確認できる。`--wait` は今回待つ秒数で、既定は 90 秒。

`typo` は既存の textlint を使う。textlint が無ければ終了コード 4 にする。指摘はファイル、行、その行の文、規則名と説明を含む。

## 問いを命題に書く

```ts
export const door = {
  id: "door",
  statement: "宿の裏口は夜通し開いている",
  authorTruth: true,
  resolutionPolicy: "may-remain-withheld",
  ask: {
    main: true,
    question: "宿の裏口は、夜のあいだどうなっているか。",
    answer: { must: ["裏口は夜通し開いている"] },
    reask: "now"
  }
};
```

期限章は本文の `<!-- shows: door:shown -->` が最初に出る章から求める。本筋の `ask` には shown の印、問い、必須項目、再問の時点が必要。`reask: "at-deadline"` は最終章のあとで期限章の時点を指定して聞き直す。`main: false` の問いも読者に渡すが、合否には入れない。

## 読者の進め方

読者ごとに作品の外の一時ディレクトリを作る。既定は一時ディレクトリ配下の `storyteller-review/<run>-<agent>`。起動前に `README.md` と最初の章だけを置く。読者が次のコマンドで記録を返すと、次のファイルを置く。

```sh
storyteller review turn --run r-12345678 --agent P1 --step 1 --notes - <<'NOTES'
この章の記録。
NOTES
```

問いのステップは `--answers -` を使い、`door. 答え` の形で全問に答える。再問は `door（再）. 答え` と書ける。先のステップ、空の返答、問いの欠けた答えは受け取らない。済んだステップを出し直しても、前の答えは変わらない。出力の先頭が `DONE` なら読了。

`clarity` の写しは frontmatter と HTML コメントを同じ数の改行に置き換える。行の位置は元の原稿と同じ。`interest` と `consult` は元の原稿をそのまま全章置く。

読者が読んでいる間は同じ `review` コマンドを打ち直す。本文を変えると run が変わるので、読んでいる間は本文を変えない。記録が進まない時間が `stallMinutes` に達すると読者を閉じて終了コード 4 を返す。次の `--team` で再起動できるのは 2 回まで。

## 保留を解く

```sh
storyteller review resolve --path manuscripts P2:door:reask --accept --why "内容は合っている"
storyteller review resolve --path manuscripts P2:door:reask --reject --why "根拠が違う"
```

判断は答えと模範解答のハッシュが一致するときだけ効く。答えや模範解答が変われば古い判断は効かない。不明と答えたセルは本文の修正へ、判定が閾値に届かないセルは著者の保留へ戻る。

`criteria` は本文を除いた止まる条件の指紋。`--criteria <指紋>` を付けると、問い、印、名簿、指示文、効いている著者の判断などが変わったときに終了コード 3 で止まる。保留を解いたら `/goal` の条件を張り直す。著者の判断だけが変わった場合も実行番号は変わる。読者に渡す内容が同じで全員が読了済みなら、読了記録を引き継いで判定だけをやり直す。

## 終了コード

| コード | 結果 | 次の操作 |
|---|---|---|
| 0 | `pass` / `done` | 合格、または全員の返答がそろった |
| 1 | `edit` | 本文を直す |
| 2 | `usage` | 呼び出しを直す |
| 3 | `author` | 著者が保留や設定を確認する |
| 4 | `error` | 判定や起動などの実行環境を確認する |
| 5 | `reading` | 本文を変えず同じ行を打ち直す |

`--json` は結果を JSON 1 個で出す。通常のテキスト出力は末尾の `RESULT <VERDICT> exit=<N>` で結果を確認する。`turn` の通常出力は `STEP <次の番号>/<全体>` と次のファイル名、または `DONE`。

## 保存先

- 命題と模範解答は `src/propositions/`。
- 著者の判断は `src/reviews/resolved.tsv`。
- 作品ごとの指示文は `src/reviews/prompts/`。同梱ファイルと同名なら上書きする。
- 判定キャッシュは `.storyteller/review/judge-cache.jsonl`。同じ鍵の後の行を使う。
- 読者の記録と起動の記録は `.storyteller/review/runs/<run>/`。
- 種類ごとの現在の実行は `.storyteller/review/current-<kind>.json`。
- run と作品の対応は `os.UserCacheDir()` 配下の `storyteller/review/runs/<run>.json`。

`.storyteller/review/` の生成物は Git に追加しない。読者はシェルを持つため、先の原稿を自分で探して開かないことは指示に依存する。レビューは人間の読者実験の代わりにはならない。
