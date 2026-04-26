package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/cli"
)

// updateVersionCanonicalGolden controls whether TestGolden_VersionJSON_Canonical
// rewrites its expected file.
// Use `go test -update-canonical ./cmd/storyteller/...` to regenerate.
//
// Why: separate flag name avoids re-registering "update" which is already
// defined in golden_test.go, preventing flag redefinition panic at init time.
var updateVersionCanonicalGolden = flag.Bool("update-canonical", false, "update canonical golden files")

// runVersionCanonicalGolden runs the CLI in-process and returns (stdout, exitCode).
func runVersionCanonicalGolden(t *testing.T, args []string) (string, int) {
	t.Helper()
	var out, errBuf bytes.Buffer
	deps := cli.Deps{Stdout: &out, Stderr: &errBuf}
	code := runMain(context.Background(), args, deps)
	return out.String(), code
}

// readVersionCanonicalGolden reads a golden file from testdata/golden/.
func readVersionCanonicalGolden(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join("testdata", "golden", name)
	data, err := os.ReadFile(path)
	if err != nil {
		// Return empty string so first run with -update-canonical creates the file.
		return ""
	}
	return string(data)
}

// writeVersionCanonicalGolden writes content to testdata/golden/<name>.
func writeVersionCanonicalGolden(t *testing.T, name string, content string) {
	t.Helper()
	path := filepath.Join("testdata", "golden", name)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		t.Fatalf("writeVersionCanonicalGolden mkdir: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0644); err != nil {
		t.Fatalf("writeVersionCanonicalGolden write: %v", err)
	}
}

// canonicalizeJSON parses raw JSON, recursively sorts object keys, and
// re-marshals with 2-space indentation.
//
// Why: raw `version --json` output may have fields in any order depending on
// Go struct marshalling. Canonicalization makes golden comparison stable when
// field order changes in the future, catching only content changes.
func canonicalizeJSON(t *testing.T, raw string) string {
	t.Helper()
	var v any
	if err := json.Unmarshal([]byte(raw), &v); err != nil {
		t.Fatalf("canonicalize: invalid JSON: %v\n%s", err, raw)
	}
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	enc.SetIndent("", "  ")
	enc.SetEscapeHTML(false)
	if err := enc.Encode(sortKeys(v)); err != nil {
		t.Fatalf("canonicalize encode: %v", err)
	}
	return strings.TrimRight(buf.String(), "\n")
}

// sortKeys recursively rebuilds map[string]any with keys in alphabetical order.
//
// Why: encoding/json marshals map keys in sorted order already, but making the
// sort explicit here ensures the contract is documented and independent of any
// future Go runtime changes.
func sortKeys(v any) any {
	switch x := v.(type) {
	case map[string]any:
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		out := make(map[string]any, len(x))
		for _, k := range keys {
			out[k] = sortKeys(x[k])
		}
		return out
	case []any:
		for i, e := range x {
			x[i] = sortKeys(e)
		}
		return x
	default:
		return v
	}
}

func TestGolden_VersionJSON_Canonical(t *testing.T) {
	args := []string{"version", "--json"}
	stdout, exitCode := runVersionCanonicalGolden(t, args)
	canonical := canonicalizeJSON(t, strings.TrimSpace(stdout))

	want := readVersionCanonicalGolden(t, "version_json_canonical.json")
	if canonical != strings.TrimSpace(want) {
		if *updateVersionCanonicalGolden {
			writeVersionCanonicalGolden(t, "version_json_canonical.json", canonical+"\n")
			return
		}
		t.Fatalf("golden mismatch (%s)\n--- want ---\n%s\n--- got ---\n%s\n--- end ---",
			"version_json_canonical.json", strings.TrimSpace(want), canonical)
	}
	if exitCode != 0 {
		t.Errorf("expected exit 0, got %d", exitCode)
	}
}
