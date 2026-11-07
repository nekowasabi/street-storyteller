package project_test

import (
	"path/filepath"
	"testing"

	"github.com/takets/street-storyteller/internal/project"
)

func TestLoad_PropositionsDir(t *testing.T) {
	root := makeMinimalProject(t)
	writeFile(t, filepath.Join(root, "src", "propositions", "loc.ts"), `export const loc = {
  id: "loc",
  statement: "鍵は店主が隠している",
  authorTruth: false,
  resolutionPolicy: "must-correct-if-false"
};`)

	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got := len(p.Store.AllPropositions()); got != 1 {
		t.Fatalf("AllPropositions len = %d, want 1", got)
	}
	if _, err := p.Store.Proposition("loc"); err != nil {
		t.Errorf("Proposition(loc): %v", err)
	}
}

func TestLoad_PropositionsDirAbsentIsNotError(t *testing.T) {
	root := makeMinimalProject(t)
	p, err := project.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got := len(p.Store.AllPropositions()); got != 0 {
		t.Errorf("AllPropositions len = %d, want 0", got)
	}
}
