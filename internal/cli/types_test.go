package cli

import "testing"

// dummyCmd implements Command but NOT CommandWithUsage.
// This verifies that CommandWithUsage is truly optional.
type dummyCmd struct{}

func (d *dummyCmd) Name() string                    { return "dummy" }
func (d *dummyCmd) Description() string             { return "dummy description" }
func (d *dummyCmd) Handle(_ CommandContext) int     { return 0 }

// dummyCmdWithUsage implements both Command and CommandWithUsage.
type dummyCmdWithUsage struct{}

func (d *dummyCmdWithUsage) Name() string                { return "dummy-with-usage" }
func (d *dummyCmdWithUsage) Description() string         { return "dummy with usage" }
func (d *dummyCmdWithUsage) Handle(_ CommandContext) int { return 0 }
func (d *dummyCmdWithUsage) Usage() string               { return "dummy-with-usage [flags]" }

// Compile-time assertion: dummyCmdWithUsage must satisfy CommandWithUsage.
var _ CommandWithUsage = (*dummyCmdWithUsage)(nil)

// Compile-time assertion: dummyCmdWithUsage also satisfies Command (base interface).
var _ Command = (*dummyCmdWithUsage)(nil)

// TestCommandWithUsageIsOptional verifies that a type implementing Command
// but not CommandWithUsage compiles and is detectable at runtime.
func TestCommandWithUsageIsOptional(t *testing.T) {
	// dummyCmd implements Command only — should NOT satisfy CommandWithUsage.
	var cmd Command = &dummyCmd{}
	if _, ok := cmd.(CommandWithUsage); ok {
		t.Error("dummyCmd should not implement CommandWithUsage")
	}

	// dummyCmdWithUsage implements both — should satisfy CommandWithUsage.
	var cmdFull Command = &dummyCmdWithUsage{}
	cwu, ok := cmdFull.(CommandWithUsage)
	if !ok {
		t.Error("dummyCmdWithUsage should implement CommandWithUsage")
	}
	if got := cwu.Usage(); got == "" {
		t.Error("Usage() should return non-empty string")
	}
}
