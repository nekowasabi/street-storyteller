export const title = "MCP ping over stdio";

export const state = (v) => {
  if (v.phase === "exited") {
    if (v.exitReason === "cancel") return "Ended because the caller cancelled";
    if (v.pingsOk < v.pingsSent) return "Ended with a ping unanswered";
    return "Ended after stdin closed";
  }
  if (v.pingsRejected > 0) return "A ping got an error, session still up";
  const life = v.initialized ? "Initialized" : "Not initialized yet";
  return v.stdinOpen ? `${life}, stdin open` : `${life}, stdin closed`;
};

const sent = {
  ping: "client sends ping",
  initialize: "client sends initialize",
  malformed: "client sends a malformed line",
};

export const step = (action, from, to) => {
  switch (action) {
    case "ClientWrites":
      return sent[to.queue[Object.keys(to.queue).length]];
    case "ServerAnswersPing":
      return "server answers ping";
    case "ServerAnswersInitialize":
      return "server answers initialize";
    case "ServerReadsMalformed":
      return "server reads the malformed line";
    case "CloseStdin":
      return "client closes stdin";
    case "ReadEOF":
      return "every line is read and stdin hits EOF";
    case "Cancel":
      return "caller cancels";
    default:
      return null;
  }
};

export const group = (v) => {
  if (v.pingsRejected > 0) return "broken";
  if (v.phase === "exited" && v.exitReason !== "cancel" && v.pingsOk < v.pingsSent) return "broken";
  if (v.phase === "exited") return "done";
  return "open";
};

export const colors = { open: "blue", done: "teal", broken: "orange" };
