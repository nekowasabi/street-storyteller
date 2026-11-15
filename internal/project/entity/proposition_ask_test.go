package entity_test

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/domain"
	apperrors "github.com/takets/street-storyteller/internal/errors"
	"github.com/takets/street-storyteller/internal/project/entity"
)

// R1: the rainkey sample in internal/service/review/testdata is the contract's
// own example, so the loader is checked against those files, not a restatement.
func rainkeyProposition(t *testing.T, name string) *domain.Proposition {
	t.Helper()
	path := filepath.Join("..", "..", "service", "review", "testdata", "rainkey", "src", "propositions", name)
	f, err := os.Open(path)
	if err != nil {
		t.Fatalf("open %s: %v", path, err)
	}
	defer f.Close()
	p, err := entity.LoadProposition(f)
	if err != nil {
		t.Fatalf("LoadProposition(%s): %v", name, err)
	}
	return p
}

func TestLoadProposition_AskFromRainkeyDoor(t *testing.T) {
	p := rainkeyProposition(t, "door.ts")
	if p.Ask == nil {
		t.Fatal("door.ts has ask, got nil")
	}
	if !p.Ask.Main {
		t.Errorf("Main = false, want true")
	}
	if p.Ask.Question != "宿の裏口は、夜のあいだどうなっているか。" {
		t.Errorf("Question = %q", p.Ask.Question)
	}
	if len(p.Ask.Answer.Must) != 1 || p.Ask.Answer.Must[0] != "裏口は夜通し開いている" {
		t.Errorf("Must = %q", p.Ask.Answer.Must)
	}
	if p.Ask.Answer.Extra != "" {
		t.Errorf("Extra = %q, want empty", p.Ask.Answer.Extra)
	}
	if p.Ask.Reask != domain.ReaskNow {
		t.Errorf("Reask = %q, want now", p.Ask.Reask)
	}
}

func TestLoadProposition_AskFromRainkeyLoc(t *testing.T) {
	p := rainkeyProposition(t, "loc.ts")
	if p.Ask == nil {
		t.Fatal("loc.ts has ask, got nil")
	}
	want := []string{"鍵は店主が隠している", "旅人は店主を疑っている"}
	if strings.Join(p.Ask.Answer.Must, "|") != strings.Join(want, "|") {
		t.Errorf("Must = %q, want %q", p.Ask.Answer.Must, want)
	}
	if p.Ask.Answer.Extra != "まだ確かめてはいない" {
		t.Errorf("Extra = %q", p.Ask.Answer.Extra)
	}
	if p.Ask.Reask != domain.ReaskAtDeadline {
		t.Errorf("Reask = %q, want at-deadline", p.Ask.Reask)
	}
}

func TestLoadProposition_WithoutAskIsNil(t *testing.T) {
	for _, name := range []string{"coat.ts", "hist.ts"} {
		if p := rainkeyProposition(t, name); p.Ask != nil {
			t.Errorf("%s: Ask = %+v, want nil", name, p.Ask)
		}
	}
}

func TestLoadProposition_AskDefaultsMainFalseAndReaskEmpty(t *testing.T) {
	src := `export const x = {
		id: "x", statement: "s", authorTruth: true, resolutionPolicy: "may-remain-misled",
		ask: { question: "q", answer: { must: ["a"] } },
	};`
	p, err := entity.LoadProposition(strings.NewReader(src))
	if err != nil {
		t.Fatalf("LoadProposition: %v", err)
	}
	if p.Ask == nil || p.Ask.Main || p.Ask.Reask != "" {
		t.Errorf("Ask = %+v, want main=false reask=\"\"", p.Ask)
	}
}

func wantValidation(t *testing.T, src string) {
	t.Helper()
	_, err := entity.LoadProposition(strings.NewReader(src))
	var ae *apperrors.Error
	if !errors.As(err, &ae) || ae.Code != apperrors.CodeValidation {
		t.Fatalf("want validation error, got %v", err)
	}
}

func TestLoadProposition_AskRejectsUnknownReask(t *testing.T) {
	wantValidation(t, `export const x = {
		id: "x", statement: "s", authorTruth: true, resolutionPolicy: "may-remain-misled",
		ask: { question: "q", answer: { must: ["a"] }, reask: "later" },
	};`)
}

func TestLoadProposition_AskRequiresQuestion(t *testing.T) {
	wantValidation(t, `export const x = {
		id: "x", statement: "s", authorTruth: true, resolutionPolicy: "may-remain-misled",
		ask: { answer: { must: ["a"] } },
	};`)
}

func TestLoadProposition_AskRequiresNonEmptyMust(t *testing.T) {
	wantValidation(t, `export const x = {
		id: "x", statement: "s", authorTruth: true, resolutionPolicy: "may-remain-misled",
		ask: { question: "q", answer: { must: [] } },
	};`)
	wantValidation(t, `export const x = {
		id: "x", statement: "s", authorTruth: true, resolutionPolicy: "may-remain-misled",
		ask: { question: "q", answer: { must: ["a", ""] } },
	};`)
	wantValidation(t, `export const x = {
		id: "x", statement: "s", authorTruth: true, resolutionPolicy: "may-remain-misled",
		ask: { main: true, question: "q" },
	};`)
}

// A non-main ask is asked but not judged, so it may omit the answer key.
func TestLoadProposition_NonMainAskMayOmitAnswer(t *testing.T) {
	p, err := entity.LoadProposition(strings.NewReader(`export const x = {
		id: "x", statement: "s", authorTruth: true, resolutionPolicy: "may-remain-misled",
		ask: { question: "q" },
	};`))
	if err != nil {
		t.Fatalf("LoadProposition: %v", err)
	}
	if p.Ask == nil || p.Ask.Question != "q" || len(p.Ask.Answer.Must) != 0 {
		t.Fatalf("Ask = %+v", p.Ask)
	}
}
