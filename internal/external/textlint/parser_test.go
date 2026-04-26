package textlint

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParse_SingleFileMultipleMessages(t *testing.T) {
	body, err := os.ReadFile(filepath.Join("testdata", "textlint", "single_file.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	msgs, err := Parse(body)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if len(msgs) != 2 {
		t.Fatalf("len = %d, want 2", len(msgs))
	}
	if msgs[0].RuleID != "no-doubled-conjunction" {
		t.Errorf("ruleID = %q", msgs[0].RuleID)
	}
	if msgs[1].Severity != SeverityError {
		t.Errorf("severity = %d", msgs[1].Severity)
	}
}

func TestParse_EmptyArray(t *testing.T) {
	body, err := os.ReadFile(filepath.Join("testdata", "textlint", "empty.json"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	msgs, err := Parse(body)
	if err != nil {
		t.Fatalf("Parse: %v", err)
	}
	if len(msgs) != 0 {
		t.Errorf("len = %d", len(msgs))
	}
}

func TestParse_MalformedJSON_Errors(t *testing.T) {
	if _, err := Parse([]byte("not json")); err == nil {
		t.Fatal("expected error")
	}
}
