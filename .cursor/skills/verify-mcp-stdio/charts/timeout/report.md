# MCPStdio

TLC reached 23 states and 40 steps. The chart draws 11 states and 24 arrows.
The view hides 16 steps, so the chart does not draw them.

## SessionHoldsWhileInputOpen breaks
The shortest path has 1 step:
0. Waiting with stdin open
1. two-second timer fires: Ended while stdin was still open

## Rules that hold
TypeOK, BufferedSecondMessageDispatched, NoDeadlock
