package cli

import (
	"fmt"
	"sort"
	"strings"
)

// defaultRegistry is a hierarchical command registry resolving longest-prefix
// space-separated paths (e.g. "meta check" beats "meta").
//
// Why: a flat map keyed by full path is sufficient for the current scale
// (handful of commands) and avoids introducing a tree node type. Resolve walks
// from the longest possible prefix down, which is O(N) on path length — acceptable.
type defaultRegistry struct {
	commands map[string]Command
}

// NewRegistry constructs an empty Registry.
func NewRegistry() Registry {
	return &defaultRegistry{commands: make(map[string]Command)}
}

func (r *defaultRegistry) Register(path string, cmd Command) error {
	path = strings.TrimSpace(path)
	if path == "" {
		return fmt.Errorf("registry: empty path")
	}
	if _, dup := r.commands[path]; dup {
		return fmt.Errorf("registry: duplicate path %q", path)
	}
	r.commands[path] = cmd
	return nil
}

func (r *defaultRegistry) Resolve(args []string) (Command, []string, bool) {
	// Why: longest-prefix wins. We try args[:n], args[:n-1], ... down to args[:1].
	for n := len(args); n >= 1; n-- {
		key := strings.Join(args[:n], " ")
		if cmd, ok := r.commands[key]; ok {
			return cmd, args[n:], true
		}
	}
	return nil, nil, false
}

func (r *defaultRegistry) List() []string {
	out := make([]string, 0, len(r.commands))
	for p := range r.commands {
		out = append(out, p)
	}
	sort.Strings(out)
	return out
}
