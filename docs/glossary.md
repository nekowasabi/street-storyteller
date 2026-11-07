# 用語集

street-storyteller で使う物語要素と、Clarity（わかりやすさ）に関わる用語の定義。各項目は「どの問いに答えるか」「単位」「置き場所」で揃える。

「既存」はリポジトリに型と実装があるもの。「設計中」は `docs/designs/reader-prereq-sketch.ts` と `.claude/skills/verify-reader-prereq/` で設計を検討しているもので、まだコードに無い。

## 物語の側（作中で何が起きるか）

### Timeline / Event（既存）

- 問い: いつ、何が起きたか。世界の時間。
- 単位: Event（出来事）。`causes` / `causedBy` で因果を結ぶ。`time.order` が世界時間の順序。
- 置き場所: `src/timelines/`、`internal/domain/timeline.go`。
- 関係: Beat は `timelineEventId` で Event を指せる。

### Plot（既存）

- 問い: 物語の線がどう展開するか。
- 単位: 線。`type` は main / sub / parallel / background。
- 置き場所: `src/plots/`、`internal/domain/plot.go`。
- 関係: Beat の入れ物。Intersection で他の Plot と絡む。

### Beat（既存）

- 問い: その線の中で、何が起きるか。
- 単位: 出来事の一歩。必須は `id` / `title` / `summary` / `structurePosition`。任意に `chapter`、`timelineEventId`、`preconditionBeatIds`。
- 置き場所: `Plot.beats`。
- 関係: `preconditionBeatIds` は Beat 同士の順序の制約で、読者の知識ではない。Beat は作中の真実の単位であり、Clarity の検査対象ではない。

### Intersection（既存）

- 問い: 線と線がどこで絡むか。
- 単位: Beat 同士の接点。`influenceDirection` で向き。
- 置き場所: `Plot.intersections`。

### Character / Setting（既存）

- 問い: 誰が、どこで。
- 単位: 実体。`displayNames` / `aliases` で原稿中の表記を持つ。
- 置き場所: `src/characters/`、`src/settings/`。
- 関係: LSP の検出と原稿 frontmatter の紐付けの対象。

### Foreshadowing（既存）

- 問い: どの仕掛けを、どこで置き、どこで回収するか。
- 単位: 仕掛け。`type` は hint / prophecy / mystery / symbol / chekhov / red_herring。`planting` と `resolutions` に章を持つ。
- 置き場所: `src/foreshadowings/`。
- 関係: 仕掛けの配置であって、読者が何を信じているかではない。レッドヘリングを置いたこと（Foreshadowing）と、読者がそれで誤信したこと（Stance の `misled`）は別の層。

### Chapter / Manuscript（既存）

- 問い: 読者が実際に読む文章は何で、どの順に読むか。
- 単位: 章。frontmatter の `characters` / `settings` / `foreshadowings` / `timeline_events` / `phases` / `timelines` で上の要素に紐づく。
- 置き場所: `manuscripts/*.md`。`drafts/` は執筆中の原稿で、検査の対象外。
- 関係: 提示順（読者が受け取る順序）を持つのは Beat ではなく章。Clarity の検査はこの順序の上で行う。

## 読者の側（読者が何を受け取っているか）

### Clarity（設計中）

- 日本語: わかりやすさ。
- 問い: 各章を読むのに要る前提が、提示順でそれより前の章で読者に渡っているか。
- 定義: 面白い / つまらないより手前の性質。読者が場面を追うのに必要な事実や前提を、まだ受け取っていないか、受け取ったが結びつけられない状態を無くすこと。理解できなかった時点で面白さは評価されないので、Clarity は面白さの前提条件として扱う。
- 単位: 検査の結果。通る / 落ちる。
- 置き場所: `ReaderPrereqService`（設計中）。
- 範囲: 機械が確かめられるのは「宣言した前提が提示順で揃っている」ことまで。読者が実際に理解したかは人の読者でしか確かめられない。

### Proposition（設計中）

- 日本語: 命題。
- 問い: 読者に信じさせたい、または伏せたい事実は何か。作中で真か偽か。最後にどう扱うか。
- 単位: 文 1 つ。`propositionId`、`statement`、`authorTruth`（true / false / null）、`resolutionPolicy`。
- `resolutionPolicy` の値: `must-correct-if-false`（偽なら最後までに訂正する）、`may-remain-misled`（誤信のまま終えてよい）、`may-remain-withheld`（伏せたまま終えてよい）。
- 置き場所: 新しい要素種別 `src/propositions/`（案）。
- 関係: Beat や Event から「読者に持たせる考え」を取り出したもの。作中で偽の命題（誤信させる文）も持てる。Beat や Event への参照は任意。

### Disclosure / Shows（設計中）

- 日本語: 開示。
- 問い: この章で、どの命題を読者にどう見せたか。
- 単位: 章ごとの、Proposition と Stance の組の列。列の順は章内の提示順。
- 置き場所: 原稿 frontmatter `reader_shows`。書式は文字列 `命題ID:態度` のリスト（例 `["loc:shown", "hist:withheld"]`）。
- 関係: Proposition を章に結ぶ。同じ命題を複数の章で再提示できる。

### Requires（設計中）

- 日本語: 前提。
- 問い: この章を読むのに、読者が何を持っていなければならないか。
- 単位: 章ごとの、Proposition と Stance の組の集合。Stance は null にできる。null は、その命題が何らかの態度（`withheld` を含む）で開示されていればよいという意味で、脇役の動機のように態度を問わない前提に使う。
- 置き場所: 原稿 frontmatter `reader_requires`。書式は文字列のリストで、`命題ID:態度` か、態度を問わないなら `命題ID` だけ（例 `["loc:shown", "hist"]`）。
- 関係: 章が Disclosure に寄りかかる向きを書く。Clarity の検査はこれを提示順で突き合わせる。

### Stance（設計中）

- 日本語: 態度。
- 問い: その時点で読者はその命題をどう持っているか。
- 値: `shown`（見せた）、`inferring`（推論中）、`convinced`（確信）、`misled`（誤信）、`corrected`（訂正済み）、`withheld`（意図して伏せた）。初期値は未提示。
- 置き場所: Disclosure と Requires の中の値。
- 関係: 命題ごとに独立に持つ。読者全体が 1 つの状態になるのではなく、命題ごとの態度の集合。

### Presentation order（設計中）

- 日本語: 提示順。
- 問い: 読者はどの順に章を読むか。
- 定義: `manuscripts/` のファイル名順。同じ章の中は `reader_shows` の列の順で、列の中の順序も検査する。世界時間（Event の `time.order`）とは別で、回想で入れ替わってよい。複数 plot は章の順にしか影響しない。

## Clarity の検査（設計中）

設計比較文書の診断名に対応させる。

| 名前 | 規則 | 落ちる例 |
|---|---|---|
| RDR-102 前提 | `reader_requires` の各組が、提示順でより前の章の `reader_shows` に在る。Stance が null なら態度を問わない | 鍵の所在を見せる章の前に、所在を確信している章を置く |
| RDR-103 訂正 | `corrected` は、同じ命題の `misled` が提示順でより前に在る。同じ章の列の中の順も見る | 誤信させていない命題を訂正する。1 つの章で訂正を誤信より先に書く |
| RDR-104 方針 | `must-correct-if-false` の命題は、最終章で `corrected` | 偽の命題を訂正せずに終える |

意図した謎（`withheld`）と意図した誤信（`may-remain-misled`）は欠陥にしない。宣言の無い未開示だけが落ちる。

## 一語ずつの言い換え

| 用語 | 言い換え |
|---|---|
| Beat | 起きたこと |
| Event | いつ起きたか |
| Proposition | 読者に持たせる考え |
| Disclosure | 見せた |
| Requires | 見せてあるはず |
| Stance | 読者の受け取り方 |
| Foreshadowing | 仕掛け |
| Clarity | 前提が順に揃っていること |
