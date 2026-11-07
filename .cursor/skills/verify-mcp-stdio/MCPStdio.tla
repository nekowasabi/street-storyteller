---- MODULE MCPStdio ----
EXTENDS Integers

\* Behavior is the reader the session actually uses.
\* "shared" matches Server.Run: one bufio.Reader for the whole loop.
\* "fresh" matches the issue 19 failure: each Read buffers ahead and drops the rest.
\* "timeout" matches the removed Handle select: exit while stdin is still open.
CONSTANT Behavior
ASSUME Behavior \in {"shared", "fresh", "timeout"}

VARIABLES phase, exitReason, stdinOpen, cancelled, written, pending, dropped, delivered
vars == <<phase, exitReason, stdinOpen, cancelled, written, pending, dropped, delivered>>

Init ==
  /\ phase = "serving"
  /\ exitReason = "none"
  /\ stdinOpen = TRUE
  /\ cancelled = FALSE
  /\ written = FALSE
  /\ pending = 0
  /\ dropped = 0
  /\ delivered = 0

TypeOK ==
  /\ phase \in {"serving", "exited"}
  /\ exitReason \in {"none", "eof", "cancel", "timeout"}
  /\ stdinOpen \in BOOLEAN
  /\ cancelled \in BOOLEAN
  /\ written \in BOOLEAN
  /\ pending \in 0..2
  /\ dropped \in 0..1
  /\ delivered \in 0..2

\* The client writes initialize and tools/call before the server reads either.
ClientWritesBurst ==
  /\ phase = "serving"
  /\ ~written
  /\ stdinOpen
  /\ written' = TRUE
  /\ pending' = 2
  /\ UNCHANGED <<phase, exitReason, stdinOpen, cancelled, dropped, delivered>>

\* One protocol.Read. A shared reader keeps every later line. A fresh reader
\* returns the first line and discards the bytes it already buffered.
ReadOne ==
  /\ phase = "serving"
  /\ pending > 0
  /\ delivered' = delivered + 1
  /\ IF Behavior = "fresh" /\ pending > 1
     THEN /\ pending' = 0
          /\ dropped' = dropped + (pending - 1)
     ELSE /\ pending' = pending - 1
          /\ UNCHANGED dropped
  /\ UNCHANGED <<phase, exitReason, stdinOpen, cancelled, written>>

CloseStdin ==
  /\ phase = "serving"
  /\ stdinOpen
  /\ stdinOpen' = FALSE
  /\ IF pending = 0
     THEN /\ phase' = "exited"
          /\ exitReason' = "eof"
     ELSE UNCHANGED <<phase, exitReason>>
  /\ UNCHANGED <<cancelled, written, pending, dropped, delivered>>

\* Lines still in the shared buffer are read after the writer closes.
\* When the buffer is empty, EOF ends the session.
DrainExit ==
  /\ phase = "serving"
  /\ ~stdinOpen
  /\ pending = 0
  /\ ~cancelled
  /\ phase' = "exited"
  /\ exitReason' = "eof"
  /\ UNCHANGED <<stdinOpen, cancelled, written, pending, dropped, delivered>>

Cancel ==
  /\ phase = "serving"
  /\ ~cancelled
  /\ cancelled' = TRUE
  /\ phase' = "exited"
  /\ exitReason' = "cancel"
  /\ UNCHANGED <<stdinOpen, written, pending, dropped, delivered>>

\* The 2 second select. Only the timeout behavior enables it.
TimerExit ==
  /\ Behavior = "timeout"
  /\ phase = "serving"
  /\ phase' = "exited"
  /\ exitReason' = "timeout"
  /\ UNCHANGED <<stdinOpen, cancelled, written, pending, dropped, delivered>>

Done ==
  /\ phase = "exited"
  /\ UNCHANGED vars

Next ==
  \/ ClientWritesBurst
  \/ ReadOne
  \/ CloseStdin
  \/ DrainExit
  \/ Cancel
  \/ TimerExit
  \/ Done

Spec == Init /\ [][Next]_vars

\* Serving ends because stdin closed or the caller cancelled.
\* The idle timer exits while stdin is still open, so it breaks this rule.
SessionHoldsWhileInputOpen ==
  phase = "exited" => ~stdinOpen \/ cancelled

\* Clean EOF after the two-message burst has dispatched both messages.
BufferedSecondMessageDispatched ==
  (phase = "exited" /\ exitReason = "eof" /\ written) =>
    delivered = 2 /\ dropped = 0

====
