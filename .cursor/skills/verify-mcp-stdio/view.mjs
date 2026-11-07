export const title = "MCP stdio session";

export const state = (v) => {
  if (v.phase === "exited" && v.exitReason === "timeout" && v.stdinOpen) {
    return "Ended while stdin was still open";
  }
  if (v.phase === "exited" && v.exitReason === "timeout") {
    return "Timer fired after stdin had closed";
  }
  if (v.phase === "exited" && v.exitReason === "cancel") {
    return "Ended because the caller cancelled";
  }
  if (v.phase === "exited" && v.exitReason === "eof") {
    if (v.dropped > 0 || (v.written && v.delivered < 2)) {
      return "Ended after dropping the second message";
    }
    return "Ended because stdin closed";
  }
  if (!v.written && v.stdinOpen) return "Waiting with stdin open";
  if (v.dropped > 0 && v.pending === 0 && v.stdinOpen) {
    return "Second message dropped, still waiting";
  }
  if (v.pending === 2 && v.stdinOpen) return "Both messages are buffered";
  if (v.pending === 1 && v.stdinOpen) return "One message is still buffered";
  if (v.pending === 2 && !v.stdinOpen) return "Stdin closed with both messages left";
  if (v.pending === 1 && !v.stdinOpen) return "Stdin closed with one message left";
  if (v.stdinOpen) return "Answered and still listening";
  return "Finishing after stdin closed";
};

export const step = (action) => {
  switch (action) {
    case "ClientWritesBurst":
      return "client writes initialize and tools/call together";
    case "ReadOne":
      return "server reads one message and answers";
    case "CloseStdin":
      return "client closes stdin";
    case "DrainExit":
      return "buffer is empty and the session ends";
    case "Cancel":
      return "caller cancels";
    case "TimerExit":
      return "two-second timer fires";
    case "Done":
      return null;
    default:
      return null;
  }
};

export const group = (v) => {
  if (v.exitReason === "timeout" || v.dropped > 0) return "broken";
  if (v.phase === "exited") return "done";
  return "open";
};

export const colors = {
  open: "blue",
  done: "teal",
  broken: "orange",
};
