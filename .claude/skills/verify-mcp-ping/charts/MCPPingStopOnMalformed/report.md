# MCPPing

TLC reached 386 states and 694 steps. The chart draws 7 states and 17 arrows.
The chart does not draw 130 steps that stay in one chart state.
The view hides 222 steps, so the chart does not draw them.

## EveryPingAnsweredBeforeExit breaks
The shortest path has 3 steps:
0. Not initialized yet, stdin open
1. client sends a malformed line: Not initialized yet, stdin open
2. client sends ping: Not initialized yet, stdin open
3. server reads the malformed line: Ended with a ping unanswered

## Rules that hold
TypeOK, PingNeverRejected, NoDeadlock
