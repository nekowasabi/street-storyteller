# Worktree Merge Conflict Pattern

## Problem

When multiple sequential processes (P4→P5) modify the same file via separate
worktrees, the later worktree doesn't include the earlier worktree's changes.
This causes 3-way merge conflicts.

## Root Cause

- Worktree isolation: each worktree branches from the same base commit
- Sequential DAG: P5 depends on P4, but P5's worktree was created before P4 was
  merged to main

## Solution Pattern

1. **Sequential merge strategy**: Merge each worktree into main BEFORE spawning
   the next dependent worktree
   - P3 worktree → merge to main → P4 worktree (sees P3 changes) → merge → P5
     worktree (sees P4 changes)
2. **Conflict resolution**: When conflicts occur, use a subagent to integrate
   both change sets rather than `git checkout --theirs`
3. **Import path verification**: Always verify import paths after merge
   resolution (P5 may have reverted to old import)

## Anti-Pattern

- Spawning P4 and P5 worktrees simultaneously when they modify the same file
- Using `git checkout --theirs` blindly (loses HEAD changes)
