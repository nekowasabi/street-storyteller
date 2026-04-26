package cli

import (
	"fmt"
	"strings"
)

// ParseGlobalOptions extracts the storyteller-wide flags (--json, --path,
// --verbose) from args and returns the remaining tokens for sub-command
// dispatch.
//
// Why: stdlib `flag` is positional-rigid (it stops at the first non-flag) and
// would refuse to skip over unknown flags meant for sub-commands. We hand-roll
// a tolerant pre-pass that recognises only the three globals and forwards
// everything else verbatim.
func ParseGlobalOptions(args []string) (GlobalOptions, []string, error) {
	var opts GlobalOptions
	rem := make([]string, 0, len(args))
	i := 0
	for i < len(args) {
		a := args[i]
		switch {
		case a == "--json":
			opts.JSON = true
			i++
		case a == "--verbose":
			opts.Verbose = true
			i++
		case a == "--path":
			if i+1 >= len(args) {
				return opts, nil, fmt.Errorf("--path requires a value")
			}
			opts.Path = args[i+1]
			i += 2
		case strings.HasPrefix(a, "--path="):
			opts.Path = strings.TrimPrefix(a, "--path=")
			i++
		default:
			// Unknown / non-global token: pass through to sub-command.
			rem = append(rem, a)
			i++
		}
	}
	return opts, rem, nil
}
