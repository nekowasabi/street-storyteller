package review_test

import (
	"context"
	"path/filepath"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/external/textlint"
	"github.com/takets/street-storyteller/internal/service/review"
)

// R11: review typo.

type fakeTextlint struct {
	byFile map[string][]textlint.Message
	files  []string
}

func (f *fakeTextlint) Lint(_ context.Context, path string, _ []byte) ([]textlint.Message, error) {
	f.files = append(f.files, filepath.Base(path))
	return f.byFile[filepath.Base(path)], nil
}

func typoDeps(available bool, worker textlint.Worker) review.Deps {
	return review.Deps{
		TextlintAvailable: func(context.Context) (bool, string) {
			if available {
				return true, ""
			}
			return false, "command not found"
		},
		Textlint: worker,
	}
}

func TestTypo_NoTextlintIsExit4(t *testing.T) {
	r := newRig(t)
	rep := review.Run(context.Background(), review.Request{Kind: review.Typo, Path: r.path}, typoDeps(false, &fakeTextlint{}))
	if rep.Verdict != review.Error || rep.ExitCode() != 4 || !strings.Contains(findingCodes(rep), "REV-404") {
		t.Errorf("verdict = %s exit=%d codes=%s", rep.Verdict, rep.ExitCode(), findingCodes(rep))
	}
}

func TestTypo_FindingsAreExit1WithFileLineAndQuote(t *testing.T) {
	r := newRig(t)
	w := &fakeTextlint{byFile: map[string][]textlint.Message{
		"chapter02.md": {{RuleID: "ja-no-redundant-expression", Severity: 2, Message: "冗長な表現です", Line: 13, Column: 1}},
	}}
	rep := review.Run(context.Background(), review.Request{Kind: review.Typo, Path: r.path}, typoDeps(true, w))
	if rep.Verdict != review.Edit || rep.ExitCode() != 1 {
		t.Fatalf("verdict = %s exit=%d", rep.Verdict, rep.ExitCode())
	}
	if len(rep.Findings) != 1 {
		t.Fatalf("findings = %+v", rep.Findings)
	}
	f := rep.Findings[0]
	if f.Code != "REV-501" || filepath.Base(f.File) != "chapter02.md" || f.Line != 13 || f.Quote != "鍵が無いと騒ぎになる。" {
		t.Errorf("finding = %+v", f)
	}
	if !strings.Contains(f.Message, "ja-no-redundant-expression") || !strings.Contains(f.Message, "冗長な表現です") {
		t.Errorf("message lacks rule or text: %q", f.Message)
	}
	if strings.Join(w.files, " ") != "chapter01.md chapter02.md chapter03.md chapter04.md" {
		t.Errorf("linted %v, want every chapter in order", w.files)
	}
}

func TestTypo_NoFindingsIsExit0(t *testing.T) {
	r := newRig(t)
	rep := review.Run(context.Background(), review.Request{Kind: review.Typo, Path: r.path}, typoDeps(true, &fakeTextlint{}))
	if rep.Verdict != review.Pass || rep.ExitCode() != 0 || len(rep.Findings) != 0 {
		t.Errorf("verdict = %s exit=%d findings=%+v", rep.Verdict, rep.ExitCode(), rep.Findings)
	}
}
