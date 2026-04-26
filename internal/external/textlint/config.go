package textlint

import (
	"os"
	"path/filepath"
)

// Config describes the textlint configuration found in a project root.
type Config struct {
	// Path is the absolute path to the discovered config file.
	Path string
	// Format is "rc", "json", or "yaml".
	Format string
	// Exists is false when no config file was found (graceful degrade).
	Exists bool
}

// candidateFiles lists the filenames to probe in priority order.
// Why: .textlintrc is the canonical name; .json/.yml variants are common aliases.
var candidateFiles = []struct {
	name   string
	format string
}{
	{".textlintrc", "rc"},
	{".textlintrc.json", "json"},
	{".textlintrc.yml", "yaml"},
}

// LoadConfig searches root for a textlint configuration file and returns its
// metadata. Missing config is not an error — callers should check Config.Exists
// and degrade gracefully.
func LoadConfig(root string) (Config, error) {
	for _, c := range candidateFiles {
		p := filepath.Join(root, c.name)
		if _, err := os.Stat(p); err == nil {
			return Config{Path: p, Format: c.format, Exists: true}, nil
		}
	}
	return Config{Exists: false}, nil
}
