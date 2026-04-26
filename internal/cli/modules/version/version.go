// Package version implements the `storyteller version` command.
package version

import (
	"github.com/takets/street-storyteller/internal/cli"
)

// VersionString is the canonical Go-migration version banner. Bumped on each
// release; kept as a package constant so other tooling (build info, MCP
// banner) can re-export the same value.
const VersionString = "0.1.0-go-migration"

type versionCommand struct{}

// New returns the version command.
func New() cli.Command {
	return &versionCommand{}
}

func (c *versionCommand) Name() string        { return "version" }
func (c *versionCommand) Description() string { return "Show storyteller version" }

func (c *versionCommand) Handle(cctx cli.CommandContext) int {
	if cctx.GlobalOpts.JSON {
		// Why: an anonymous struct keeps the JSON shape obvious at the call
		// site and avoids exporting a type used only here.
		_ = cctx.Presenter.WriteJSON(struct {
			Version string `json:"version"`
		}{Version: VersionString})
		return 0
	}
	cctx.Presenter.ShowInfo("storyteller v" + VersionString)
	return 0
}
