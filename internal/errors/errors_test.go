// Why: テストは external test package (errors_test) に置く。Go stdlib の
// "errors" パッケージと名前衝突しないよう、本体は package errors のままで
// 標準 errors を `stderrors` 別名で取り込んで利用する。
package errors_test

import (
	stderrors "errors"
	"fmt"
	"strings"
	"testing"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

func TestNew_SetsCodeAndMessage(t *testing.T) {
	err := apperrors.New(apperrors.CodeValidation, "name is required")

	if err.Code != apperrors.CodeValidation {
		t.Errorf("Code = %q, want %q", err.Code, apperrors.CodeValidation)
	}
	if err.Message != "name is required" {
		t.Errorf("Message = %q, want %q", err.Message, "name is required")
	}
	if err.Cause != nil {
		t.Errorf("Cause = %v, want nil", err.Cause)
	}
	if len(err.Hints) != 0 {
		t.Errorf("Hints len = %d, want 0", len(err.Hints))
	}
}

func TestError_FormatWithoutCause(t *testing.T) {
	err := apperrors.New(apperrors.CodeValidation, "name is required")
	got := err.Error()
	want := "Validation: name is required"
	if got != want {
		t.Errorf("Error() = %q, want %q", got, want)
	}
}

func TestError_FormatWithCause(t *testing.T) {
	cause := fmt.Errorf("disk full")
	err := apperrors.Wrap(cause, apperrors.CodeIO, "failed to write")

	got := err.Error()
	want := "IO: failed to write: disk full"
	if got != want {
		t.Errorf("Error() = %q, want %q", got, want)
	}
}

func TestWrap_PreservesCause(t *testing.T) {
	cause := fmt.Errorf("underlying boom")
	err := apperrors.Wrap(cause, apperrors.CodeParse, "could not parse manifest")

	if err.Cause != cause {
		t.Errorf("Cause = %v, want %v", err.Cause, cause)
	}
	// Unwrap chain compatibility
	if got := stderrors.Unwrap(err); got != cause {
		t.Errorf("stderrors.Unwrap = %v, want %v", got, cause)
	}
}

func TestErrorsIs_MatchesByCode(t *testing.T) {
	err := apperrors.New(apperrors.CodeNotFound, "character not found")
	sentinel := apperrors.New(apperrors.CodeNotFound, "")

	if !stderrors.Is(err, sentinel) {
		t.Errorf("stderrors.Is(err, sentinel) = false, want true (same Code)")
	}

	mismatch := apperrors.New(apperrors.CodeValidation, "")
	if stderrors.Is(err, mismatch) {
		t.Errorf("stderrors.Is(err, mismatch) = true, want false (different Code)")
	}
}

func TestErrorsIs_AcrossWrap(t *testing.T) {
	cause := apperrors.New(apperrors.CodeNotFound, "missing")
	wrapped := fmt.Errorf("outer: %w", cause)

	sentinel := apperrors.New(apperrors.CodeNotFound, "")
	if !stderrors.Is(wrapped, sentinel) {
		t.Errorf("stderrors.Is(wrapped, sentinel) = false, want true")
	}
}

func TestErrorsAs_ExtractsApperror(t *testing.T) {
	cause := fmt.Errorf("io fault")
	original := apperrors.Wrap(cause, apperrors.CodeIO, "open failed")
	wrapped := fmt.Errorf("context: %w", original)

	var target *apperrors.Error
	if !stderrors.As(wrapped, &target) {
		t.Fatalf("stderrors.As did not find *apperrors.Error in chain")
	}
	if target.Code != apperrors.CodeIO {
		t.Errorf("target.Code = %q, want %q", target.Code, apperrors.CodeIO)
	}
}

func TestWithHints_ChainsHints(t *testing.T) {
	err := apperrors.
		New(apperrors.CodeManifestInvalid, "manifest broken").
		WithHints("check schema").
		WithHints("see docs/manifest.md", "run validate")

	want := []string{"check schema", "see docs/manifest.md", "run validate"}
	if len(err.Hints) != len(want) {
		t.Fatalf("Hints len = %d, want %d", len(err.Hints), len(want))
	}
	for i, h := range want {
		if err.Hints[i] != h {
			t.Errorf("Hints[%d] = %q, want %q", i, err.Hints[i], h)
		}
	}
}

func TestWithHints_ReturnsSameReceiver(t *testing.T) {
	// Why: chain method はレシーバ自身を返す契約 (mutate-and-return) なので
	// ポインタ同一性を確認する。新規 allocation するとチェーン途中の参照が
	// 旧オブジェクトに残るバグを誘発するため。
	err := apperrors.New(apperrors.CodeEntityConflict, "duplicate id")
	returned := err.WithHints("rename one of them")
	if returned != err {
		t.Errorf("WithHints returned %p, want same receiver %p", returned, err)
	}
}

func TestCodeConstants_StringValues(t *testing.T) {
	cases := map[apperrors.Code]string{
		apperrors.CodeNotFound:          "NotFound",
		apperrors.CodeValidation:        "Validation",
		apperrors.CodeParse:             "Parse",
		apperrors.CodeIO:                "IO",
		apperrors.CodeManifestInvalid:   "ManifestInvalid",
		apperrors.CodeEntityConflict:    "EntityConflict",
		apperrors.CodeUnsupportedFormat: "UnsupportedFormat",
	}
	for code, want := range cases {
		if string(code) != want {
			t.Errorf("Code value = %q, want %q", string(code), want)
		}
	}
}

func TestError_ImplementsErrorInterface(t *testing.T) {
	// 静的にも error として扱えることを確認 (compile-time check + runtime sanity)
	var _ error = apperrors.New(apperrors.CodeIO, "boom")
	err := apperrors.New(apperrors.CodeIO, "boom")
	if !strings.Contains(err.Error(), "boom") {
		t.Errorf("Error() = %q, want to contain %q", err.Error(), "boom")
	}
}
