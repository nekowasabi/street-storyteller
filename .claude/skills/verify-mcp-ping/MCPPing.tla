---- MODULE MCPPing ----
EXTENDS Integers, Sequences

\* "registered" is RegisterStandardHandlers with the ping handler.
\* "missing" has no ping handler, so Dispatch answers CodeMethodNotFound.
\* "gated" checks s.lifecycle.RequireInitialized before ping.
\* "stopOnMalformed" is Run before ec8a5bd: a malformed line ends the session.
CONSTANTS Variant, MaxMessages
ASSUME Variant \in {"registered", "missing", "gated", "stopOnMalformed"}

Kinds == {"ping", "initialize", "malformed"}

VARIABLES phase, exitReason, stdinOpen, initialized, queue, written,
          pingsSent, pingsOk, pingsRejected
vars == <<phase, exitReason, stdinOpen, initialized, queue, written,
          pingsSent, pingsOk, pingsRejected>>

Init ==
  /\ phase = "serving"
  /\ exitReason = "none"
  /\ stdinOpen = TRUE
  /\ initialized = FALSE
  /\ queue = <<>>
  /\ written = 0
  /\ pingsSent = 0
  /\ pingsOk = 0
  /\ pingsRejected = 0

\* The client writes one line to stdin. Lines wait in the shared bufio.Reader.
ClientWrites(k) ==
  /\ phase = "serving"
  /\ stdinOpen
  /\ written < MaxMessages
  /\ queue' = Append(queue, k)
  /\ written' = written + 1
  /\ pingsSent' = pingsSent + (IF k = "ping" THEN 1 ELSE 0)
  /\ UNCHANGED <<phase, exitReason, stdinOpen, initialized, pingsOk, pingsRejected>>

ClientWritesPing == ClientWrites("ping")
ClientWritesInitialize == ClientWrites("initialize")
ClientWritesMalformed == ClientWrites("malformed")

PingRejected == Variant = "missing" \/ (Variant = "gated" /\ ~initialized)

\* One turn of the Run loop: protocol.Read, Dispatch, protocol.Write.
ServerAnswersPing ==
  /\ phase = "serving"
  /\ queue /= <<>> /\ Head(queue) = "ping"
  /\ queue' = Tail(queue)
  /\ IF PingRejected
     THEN /\ pingsRejected' = pingsRejected + 1 /\ UNCHANGED pingsOk
     ELSE /\ pingsOk' = pingsOk + 1 /\ UNCHANGED pingsRejected
  /\ UNCHANGED <<phase, exitReason, stdinOpen, initialized, written, pingsSent>>

ServerAnswersInitialize ==
  /\ phase = "serving"
  /\ queue /= <<>> /\ Head(queue) = "initialize"
  /\ queue' = Tail(queue)
  /\ initialized' = TRUE
  /\ UNCHANGED <<phase, exitReason, stdinOpen, written, pingsSent, pingsOk, pingsRejected>>

ServerReadsMalformed ==
  /\ phase = "serving"
  /\ queue /= <<>> /\ Head(queue) = "malformed"
  /\ queue' = Tail(queue)
  /\ IF Variant = "stopOnMalformed"
     THEN /\ phase' = "exited" /\ exitReason' = "malformed"
     ELSE UNCHANGED <<phase, exitReason>>
  /\ UNCHANGED <<stdinOpen, initialized, written, pingsSent, pingsOk, pingsRejected>>

CloseStdin ==
  /\ phase = "serving"
  /\ stdinOpen
  /\ stdinOpen' = FALSE
  /\ UNCHANGED <<phase, exitReason, initialized, queue, written, pingsSent, pingsOk, pingsRejected>>

\* protocol.Read returns io.EOF only after every buffered line was read.
ReadEOF ==
  /\ phase = "serving"
  /\ ~stdinOpen
  /\ queue = <<>>
  /\ phase' = "exited"
  /\ exitReason' = "eof"
  /\ UNCHANGED <<stdinOpen, initialized, queue, written, pingsSent, pingsOk, pingsRejected>>

Cancel ==
  /\ phase = "serving"
  /\ phase' = "exited"
  /\ exitReason' = "cancel"
  /\ UNCHANGED <<stdinOpen, initialized, queue, written, pingsSent, pingsOk, pingsRejected>>

Done ==
  /\ phase = "exited"
  /\ UNCHANGED vars

Next ==
  \/ ClientWritesPing
  \/ ClientWritesInitialize
  \/ ClientWritesMalformed
  \/ ServerAnswersPing
  \/ ServerAnswersInitialize
  \/ ServerReadsMalformed
  \/ CloseStdin
  \/ ReadEOF
  \/ Cancel
  \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ phase \in {"serving", "exited"}
  /\ exitReason \in {"none", "eof", "cancel", "malformed"}
  /\ queue \in Seq(Kinds)
  /\ pingsOk + pingsRejected <= pingsSent

\* A ping is never answered with an error, in any lifecycle state.
PingNeverRejected == pingsRejected = 0

\* Unless the caller cancels, the session ends only after every ping it received got {}.
EveryPingAnsweredBeforeExit ==
  (phase = "exited" /\ exitReason /= "cancel") => pingsOk = pingsSent

====
