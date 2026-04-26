package generate

import (
	"embed"
	"io/fs"
	"os"
	"path/filepath"
)

//go:embed all:assets/skills
var skillFS embed.FS

const skillSourceDir = "assets/skills"

// installClaudeSkills copies the embedded storyteller skill into
// ${projectRoot}/.claude/skills so that Claude Code recognises it as a
// project-scoped skill.
//
// Why: 実行時のファイル参照を避けるため go:embed でバイナリに同梱する。
// 単一バイナリ配布 (Process 12 の KPI) を破らずに skill を配布できる。
func installClaudeSkills(projectRoot string) error {
	return fs.WalkDir(skillFS, skillSourceDir, func(srcPath string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			return nil
		}
		rel, err := filepath.Rel(skillSourceDir, srcPath)
		if err != nil {
			return err
		}
		dst := filepath.Join(projectRoot, ".claude", "skills", rel)
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return err
		}
		body, err := skillFS.ReadFile(srcPath)
		if err != nil {
			return err
		}
		return os.WriteFile(dst, body, 0o644)
	})
}
