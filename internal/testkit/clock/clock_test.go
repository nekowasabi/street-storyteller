package clock_test

import (
	"testing"

	"github.com/takets/street-storyteller/internal/testkit/clock"
)

func TestPackageBootstrapped(t *testing.T) {
	t.Helper()
	_ = clock.Sentinel
}
