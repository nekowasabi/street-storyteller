// Package modules wires every concrete CLI sub-command into a registry.
//
// Why a dedicated package: internal/cli must not import its own modules (that
// would create an import cycle since each module imports internal/cli for the
// shared types). cmd/storyteller and golden tests live "above" both layers
// and call RegisterCore here to assemble the full command surface.
package modules

import (
	"github.com/takets/street-storyteller/internal/cli"
	helpmod "github.com/takets/street-storyteller/internal/cli/modules/help"
	lintmod "github.com/takets/street-storyteller/internal/cli/modules/lint"
	lspmod "github.com/takets/street-storyteller/internal/cli/modules/lsp"
	metamod "github.com/takets/street-storyteller/internal/cli/modules/meta"
	versionmod "github.com/takets/street-storyteller/internal/cli/modules/version"
	viewmod "github.com/takets/street-storyteller/internal/cli/modules/view"
)

// RegisterCore registers every built-in command into r.
func RegisterCore(r cli.Registry) error {
	if err := r.Register("version", versionmod.New()); err != nil {
		return err
	}
	if err := r.Register("help", helpmod.New(r)); err != nil {
		return err
	}
	if err := r.Register("meta check", metamod.New()); err != nil {
		return err
	}
	if err := r.Register("lint", lintmod.New()); err != nil {
		return err
	}
	if err := r.Register("lsp validate", lspmod.New()); err != nil {
		return err
	}
	if err := r.Register("view character", viewmod.New()); err != nil {
		return err
	}
	return nil
}
