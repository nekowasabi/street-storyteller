export const title = "雨夜の鍵 - 読者の前提 (原稿 frontmatter 方式) 本編と回想順の別案";

const chapters = {
  1: "ch-01 雨の夜",
  2: "ch-02 鍵の不在。所在を見せ、来歴は伏せる",
  3: "ch-03 店主への疑い。所在を確信、コートで誤信",
  4: "ch-04 荷物の底。所在の誤りが露見し訂正",
};

export const state = (v) => {
  if (v.pos === 0) return "開幕前";
  if (v.order === "flashback" && v.pos === 2) return "ch-03 店主への疑い [別案: ch-02 より前に置く]";
  if (v.order === "flashback" && v.pos === 3) return "ch-02 鍵の不在 [別案: ch-03 のあと]";
  if (v.order === "flashback" && v.pos === 4) return "ch-04 荷物の底 [別案]";
  return chapters[v.chapter];
};

export const step = (action, from, to) => {
  if (action === "Done") return null;
  const n = `ch-${String(to.chapter).padStart(2, "0")}`;
  return action === "ReadFlashback" && to.pos === 2
    ? `読者が ${n} を読む [別案]`
    : `読者が ${n} を読む`;
};

export const group = (v) => (v.order === "flashback" && v.pos >= 2 ? "別案" : v.pos <= 2 ? "設置" : "回収");

export const colors = { 設置: "blue", 回収: "orange", 別案: "purple" };
