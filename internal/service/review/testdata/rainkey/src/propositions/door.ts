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
