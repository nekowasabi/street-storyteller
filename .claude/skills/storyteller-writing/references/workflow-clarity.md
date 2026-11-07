# Clarity 検査ワークフロー

読者が各章を追えるか（面白いかより手前の「分かるか」）を、宣言と検査で守る。用語は `docs/glossary.md`、設計は `docs/clarity.md`。

## 3 つの宣言

| 宣言 | 置き場所 | 書式 |
|---|---|---|
| Proposition（読者に持たせる考え） | `src/propositions/<id>.ts` | `id` / `statement` / `authorTruth`（true / false / null） / `resolutionPolicy`（`must-correct-if-false` / `may-remain-misled` / `may-remain-withheld`） |
| reader_shows（この章で見せた） | 原稿 frontmatter | `["loc:shown", "hist:withheld"]`。列の順が章内の提示順 |
| reader_requires（この章を読むのに要る） | 原稿 frontmatter | `["loc:shown", "hist"]`。態度なしは何らかの開示があればよい |

態度は `shown` / `inferring` / `convinced` / `misled` / `corrected` / `withheld`。伏せたい命題は `withheld` と宣言する。宣言の無い未開示だけが落ちる。

## 手順

1. **命題を確認**: `src/propositions/` を読む。無ければ、ユーザー承認のうえ CLI（`storyteller element` には未対応。`.ts` を `samples/cinderella/src/propositions/glass_slipper_fit.ts` の形で書く）で作る。
2. **frontmatter に宣言**: `manuscript_binding` で `entityType: "reader_shows"` / `"reader_requires"`。`ids` は `"命題ID:態度"`。態度の綴りが違えばツールが拒否する。
3. **検査**: `meta_check`（CLI は `storyteller meta check`）。違反は `ファイル:行 RDR-10x 説明` の形。
4. **提出**: `storyteller manuscript build`。`drafts/` を検査し、通ったときだけ `manuscripts/` に写す。

## 違反の直し方

| コード | 意味 | 直し方 |
|---|---|---|
| RDR-101 | 命題 ID が無い、態度の綴りが違う | ID と綴りを直す |
| RDR-102 | 前提が前の章で開示されていない | 前の章の `reader_shows` に足す。意図して伏せるなら `withheld` を宣言。章の順を変える |
| RDR-103 | 誤信させる前に訂正している | `misled` を先に置く。同じ章なら列の順を直す |
| RDR-104 | 正すと決めた命題が最後まで訂正されていない | 最終章までに `corrected` を置く。誤信のままでよいなら `resolutionPolicy` を `may-remain-misled` に |

規則を弱めて通さない。`resolutionPolicy` を変えるのは作者の判断なので、必ず確認する。

## 範囲

検査が保証するのは「宣言した前提が提示順で揃っている」ことまで。読者が実際に理解したかは人の読者でしか分からない。
