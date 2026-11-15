package manifest_test

import (
	stderrors "errors"
	"os"
	"path/filepath"
	"testing"

	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project/manifest"
)

// R2: the sample project's .storyteller.json is the contract's own example.
func TestLoadReview_RainkeySample(t *testing.T) {
	root := filepath.Join("..", "..", "service", "review", "testdata", "rainkey")
	if _, err := os.Stat(filepath.Join(root, manifest.ManifestFileName)); err != nil {
		t.Fatalf("sample manifest: %v", err)
	}
	m, err := manifest.Load(root)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	r := m.Review
	if r == nil {
		t.Fatal("Review = nil, want the sample's review section")
	}
	if r.Judge != "openrouter:google/gemini-decision-1" {
		t.Errorf("Judge = %q", r.Judge)
	}
	if r.Launcher.Ateam != "ateam.sh" {
		t.Errorf("Launcher.Ateam = %q", r.Launcher.Ateam)
	}
	if r.StallMinutes != 60 {
		t.Errorf("StallMinutes = %d, want 60", r.StallMinutes)
	}
	want := []manifest.ReviewAgent{
		{Agent: "P1", Runtime: "claude-code", Model: "claude-fable-5-1", Effort: "medium"},
		{Agent: "P2", Runtime: "codex", Model: "gpt-6.1-sol", Effort: "medium"},
		{Agent: "P3", Runtime: "grok-build", Model: "grok-4.7", Effort: "medium"},
	}
	if len(r.Agents) != len(want) {
		t.Fatalf("Agents = %+v, want %+v", r.Agents, want)
	}
	for i := range want {
		if r.Agents[i] != want[i] {
			t.Errorf("Agents[%d] = %+v, want %+v", i, r.Agents[i], want[i])
		}
	}
}

func TestLoadReview_AbsentIsNil(t *testing.T) {
	m, err := manifest.LoadFromBytes([]byte(`{"version":"1.0.0"}`))
	if err != nil {
		t.Fatalf("LoadFromBytes: %v", err)
	}
	if m.Review != nil {
		t.Errorf("Review = %+v, want nil", m.Review)
	}
}

func TestLoadReview_StallMinutesDefaultsTo60(t *testing.T) {
	m, err := manifest.LoadFromBytes([]byte(`{"version":"1.0.0","review":{"judge":"j","agents":[{"agent":"P1","runtime":"codex"}]}}`))
	if err != nil {
		t.Fatalf("LoadFromBytes: %v", err)
	}
	if m.Review == nil || m.Review.StallMinutes != 60 {
		t.Errorf("Review = %+v, want StallMinutes 60", m.Review)
	}
}

func wantManifestInvalid(t *testing.T, src string) {
	t.Helper()
	_, err := manifest.LoadFromBytes([]byte(src))
	var ae *apperrors.Error
	if !stderrors.As(err, &ae) || ae.Code != apperrors.CodeManifestInvalid {
		t.Fatalf("want ManifestInvalid, got %v", err)
	}
}

func TestLoadReview_RejectsLocalRuntime(t *testing.T) {
	wantManifestInvalid(t, `{"version":"1.0.0","review":{"agents":[{"agent":"P3","runtime":"local"}]}}`)
}

func TestLoadReview_RejectsDuplicateAgent(t *testing.T) {
	wantManifestInvalid(t, `{"version":"1.0.0","review":{"agents":[{"agent":"P1","runtime":"codex"},{"agent":"P1","runtime":"claude-code"}]}}`)
}

func TestLoadReview_RejectsBadAgentName(t *testing.T) {
	wantManifestInvalid(t, `{"version":"1.0.0","review":{"agents":[{"agent":"P 1","runtime":"codex"}]}}`)
	wantManifestInvalid(t, `{"version":"1.0.0","review":{"agents":[{"agent":"","runtime":"codex"}]}}`)
}

func TestLoadReview_RejectsNegativeStallMinutes(t *testing.T) {
	wantManifestInvalid(t, `{"version":"1.0.0","review":{"stallMinutes":-1}}`)
}
