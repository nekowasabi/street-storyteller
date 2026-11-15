export const loc = {
  id: "loc",
  statement: "鍵は店主が隠している",
  authorTruth: false,
  resolutionPolicy: "must-correct-if-false",
  ask: {
    main: true,
    question: "旅人は、鍵がどこにあると考えているか。",
    answer: { must: ["鍵は店主が隠している", "旅人は店主を疑っている"], extra: "まだ確かめてはいない" },
    reask: "at-deadline"
  }
};
