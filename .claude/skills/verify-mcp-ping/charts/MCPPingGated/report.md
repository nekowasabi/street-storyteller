# MCPPing

TLC reached 472 states and 884 steps. The chart draws 8 states and 15 arrows.
The chart does not draw 237 steps that stay in one chart state.
The view hides 246 steps, so the chart does not draw them.

## PingNeverRejected breaks
The shortest path has 2 steps:
0. Not initialized yet, stdin open
1. client sends ping: Not initialized yet, stdin open
2. server answers ping: A ping got an error, session still up

## EveryPingAnsweredBeforeExit breaks
The shortest path has 4 steps:
0. Not initialized yet, stdin open
1. client sends ping: Not initialized yet, stdin open
2. client closes stdin: Not initialized yet, stdin closed
3. server answers ping: A ping got an error, session still up
4. every line is read and stdin hits EOF: Ended with a ping unanswered

## Rules that hold
TypeOK, NoDeadlock
