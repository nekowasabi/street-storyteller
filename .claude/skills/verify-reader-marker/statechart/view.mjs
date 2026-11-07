export const title = "本文の印と frontmatter の突き合わせ - 検査と読者の食い違い";

const chapter = (v) => (v.pos === 0 ? "開幕前" : `ch-0${v.pos} まで読んだ`);
const verdict = (v) =>
  v.pos < 2
    ? ""
    : v.chkFail
      ? v.rdrFail ? " / 検査も読者も不合格" : " / 検査だけ不合格"
      : v.rdrFail ? " / 検査は合格だが読者は不合格" : " / 検査も読者も合格";

export const state = (v) => chapter(v) + verdict(v);

export const step = (action, from, to) =>
  action === "ReadChapter" ? `読者が ch-0${to.pos} を読む` : null;

export const group = (v) => (v.pos < 2 ? "途中" : v.chkFail === v.rdrFail ? "一致" : "食い違い");

export const colors = { 途中: "blue", 一致: "teal", 食い違い: "orange" };
