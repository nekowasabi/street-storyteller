export const title = "雨夜の鍵 - 読者の前提の状態図 (原稿 frontmatter 方式)";

const chapters = {
  0: "開幕前",
  1: "ch-01 雨の夜",
  2: "ch-02 鍵の不在。所在を見せ、来歴は伏せる",
  3: "ch-03 店主への疑い。所在を確信、コートで誤信",
  4: "ch-04 荷物の底。所在の誤りが露見し訂正",
};

export const state = (v) => chapters[v.chapter];

export const step = (action, from, to) =>
  action === "ReadChapter" ? `読者が ${chapters[to.chapter].split(" ")[0]} を読む` : null;

export const group = (v) => (v.pos <= 2 ? "設置" : "回収");

export const colors = { 設置: "blue", 回収: "orange" };
