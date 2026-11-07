# MCPStdio

TLC reached 12 states and 19 steps. The chart draws 8 states and 12 arrows.
The view hides 7 steps, so the chart does not draw them.

## BufferedSecondMessageDispatched breaks
The shortest path has 3 steps:
0. Waiting with stdin open
1. client writes initialize and tools/call together: Both messages are buffered
2. server reads one message and answers: Second message dropped, still waiting
3. client closes stdin: Ended after dropping the second message

## Rules that hold
TypeOK, SessionHoldsWhileInputOpen, NoDeadlock
