package cli

import (
	"reflect"
	"testing"
)

func TestParseGlobalOptions_JSON(t *testing.T) {
	opts, rem, err := ParseGlobalOptions([]string{"--json", "version"})
	if err != nil {
		t.Fatalf("ParseGlobalOptions: %v", err)
	}
	if !opts.JSON {
		t.Error("JSON should be true")
	}
	if !reflect.DeepEqual(rem, []string{"version"}) {
		t.Errorf("remaining = %v, want [version]", rem)
	}
}

func TestParseGlobalOptions_PathWithValue(t *testing.T) {
	opts, rem, err := ParseGlobalOptions([]string{"--path=/tmp/proj", "meta", "check"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if opts.Path != "/tmp/proj" {
		t.Errorf("Path = %q, want /tmp/proj", opts.Path)
	}
	if !reflect.DeepEqual(rem, []string{"meta", "check"}) {
		t.Errorf("rem = %v", rem)
	}

	opts2, rem2, err := ParseGlobalOptions([]string{"--path", "/var/x", "view", "character"})
	if err != nil {
		t.Fatalf("err2: %v", err)
	}
	if opts2.Path != "/var/x" {
		t.Errorf("Path = %q, want /var/x", opts2.Path)
	}
	if !reflect.DeepEqual(rem2, []string{"view", "character"}) {
		t.Errorf("rem2 = %v", rem2)
	}
}

func TestParseGlobalOptions_VerboseAndJSON(t *testing.T) {
	opts, rem, err := ParseGlobalOptions([]string{"--verbose", "--json", "help"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if !opts.Verbose {
		t.Error("Verbose should be true")
	}
	if !opts.JSON {
		t.Error("JSON should be true")
	}
	if !reflect.DeepEqual(rem, []string{"help"}) {
		t.Errorf("rem = %v", rem)
	}
}

func TestParseGlobalOptions_UnknownFlagPassedThrough(t *testing.T) {
	opts, rem, err := ParseGlobalOptions([]string{"--foo", "bar", "baz"})
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if opts.JSON || opts.Verbose || opts.Path != "" {
		t.Errorf("global options unexpectedly set: %+v", opts)
	}
	want := []string{"--foo", "bar", "baz"}
	if !reflect.DeepEqual(rem, want) {
		t.Errorf("rem = %v, want %v", rem, want)
	}
}

func TestParseGlobalOptions_NoArgs(t *testing.T) {
	opts, rem, err := ParseGlobalOptions(nil)
	if err != nil {
		t.Fatalf("err: %v", err)
	}
	if opts.JSON || opts.Verbose || opts.Path != "" {
		t.Errorf("expected zero opts, got %+v", opts)
	}
	if len(rem) != 0 {
		t.Errorf("expected empty rem, got %v", rem)
	}
}
