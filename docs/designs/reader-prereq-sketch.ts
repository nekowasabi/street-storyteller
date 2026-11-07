// Clarity の設計スケッチ（実装前）。用語は docs/glossary.md、経緯は docs/clarity.md。
//
// 構造:
//   Proposition は新しい要素種別（src/propositions/）。
//   Disclosure と Requires は原稿 frontmatter（reader_shows / reader_requires）。
//   PlotBeat は変えない。
//
// 提示順（2026-11-07 決定）:
//   章の順は manuscripts/ のファイル名順。同じ章の中は reader_shows の列の順。
//   列の中の順序も検査する。回想（世界時間と提示順のずれ）と複数 plot は範囲内で、
//   どちらも章の順にしか影響しないので Clarity の検査には plot も Event も要らない。
//
// 検査（ReaderPrereqService、将来 internal/service/ に置く）:
//   RDR-102 前提: reader_requires の各組が、提示順でより前の章の reader_shows に在る。
//                 stance が null なら、その命題が何らかの態度で開示されていればよい（withheld も含む）
//   RDR-103 訂正: corrected は、同じ命題の misled が提示順でより前に在る（同じ章の列の中の順も見る）
//   RDR-104 方針: must-correct-if-false の命題は、最終章で corrected
//
// この設計を TLA+ で検査したモデル: .claude/skills/verify-reader-prereq/statechart/
// 物語は設計比較文書の「雨夜の鍵」。

export type Stance =
  | "shown"
  | "inferring"
  | "convinced"
  | "misled"
  | "corrected"
  | "withheld";

export type ResolutionPolicy =
  | "must-correct-if-false"
  | "may-remain-misled"
  | "may-remain-withheld";

export type Proposition = {
  propositionId: string;
  statement: string;
  authorTruth: boolean | null;
  resolutionPolicy: ResolutionPolicy;
};

export type Disclosure = {
  propositionId: string;
  stance: Stance;
};

export type Requirement = {
  propositionId: string;
  stance: Stance | null; // null は、何らかの態度で開示済みならよい。脇役の動機のように、態度を問わない前提に使う
};

// 原稿 frontmatter のうち、Clarity に関わる欄だけを写したもの。
// 既存の characters / settings / foreshadowings / timeline_events と同じ並びに置く。
export type ManuscriptClarityFrontMatter = {
  chapter: string;
  reader_shows?: Disclosure[];
  reader_requires?: Requirement[];
};

export const propositions: Proposition[] = [
  { propositionId: "loc",  statement: "鍵は店主が隠している",     authorTruth: false, resolutionPolicy: "must-correct-if-false" },
  { propositionId: "hist", statement: "鍵の来歴は語られない",     authorTruth: null,  resolutionPolicy: "may-remain-withheld" },
  { propositionId: "coat", statement: "濡れたコートが犯行を示す", authorTruth: false, resolutionPolicy: "may-remain-misled" },
];

// manuscripts/chapter01.md .. chapter04.md の frontmatter。配列の順が提示順。
export const manuscripts: ManuscriptClarityFrontMatter[] = [
  { chapter: "ch-01" },
  {
    chapter: "ch-02",
    reader_shows: [
      { propositionId: "loc", stance: "shown" },
      { propositionId: "loc", stance: "inferring" },
      { propositionId: "hist", stance: "withheld" },
    ],
  },
  {
    chapter: "ch-03",
    reader_requires: [
      { propositionId: "loc", stance: "shown" },
      { propositionId: "hist", stance: null }, // 来歴は伏せたままでよいが、伏せたと宣言してあること
    ],
    reader_shows: [
      { propositionId: "loc", stance: "convinced" },
      { propositionId: "coat", stance: "misled" },
    ],
  },
  {
    chapter: "ch-04",
    reader_requires: [{ propositionId: "loc", stance: "convinced" }],
    reader_shows: [
      { propositionId: "loc", stance: "misled" },
      { propositionId: "loc", stance: "corrected" },
    ],
  },
];
