// Package textlint adapts the textlint CLI tool as a Worker that returns
// structured Messages. Process spawning is abstracted via testkit/process.Runner.
package textlint

import "context"

// Severity matches textlint output (0=info, 1=warning, 2=error).
type Severity int

const (
	SeverityInfo    Severity = 0
	SeverityWarning Severity = 1
	SeverityError   Severity = 2
)

// Message is the parsed form of a single textlint diagnostic.
type Message struct {
	RuleID   string   `json:"ruleId"`
	Severity Severity `json:"severity"`
	Message  string   `json:"message"`
	Line     int      `json:"line"`
	Column   int      `json:"column"`
	Index    int      `json:"index,omitempty"`
}

// Worker runs textlint on (filePath, content) and returns Messages.
// Implementation: worker.go (Wave-main WT-3).
type Worker interface {
	Lint(ctx context.Context, filePath string, content []byte) ([]Message, error)
}
