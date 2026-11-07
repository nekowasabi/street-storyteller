package domain

import "testing"

func TestParseDisclosure(t *testing.T) {
	d, err := ParseDisclosure("loc:shown")
	if err != nil || d.PropositionID != "loc" || d.Stance != StanceShown {
		t.Fatalf("got %+v, %v", d, err)
	}
	for _, bad := range []string{"loc", "loc:believed", ":shown", "loc:", ""} {
		if _, err := ParseDisclosure(bad); err == nil {
			t.Errorf("%q: want error", bad)
		}
	}
}

func TestParseRequirement(t *testing.T) {
	r, err := ParseRequirement("hist")
	if err != nil || r.PropositionID != "hist" || r.Stance != nil {
		t.Fatalf("got %+v, %v", r, err)
	}
	r, err = ParseRequirement("loc:convinced")
	if err != nil || r.Stance == nil || *r.Stance != StanceConvinced {
		t.Fatalf("got %+v, %v", r, err)
	}
	for _, bad := range []string{"loc:believed", ":shown", "loc:", ""} {
		if _, err := ParseRequirement(bad); err == nil {
			t.Errorf("%q: want error", bad)
		}
	}
	if s := r.String(); s != "loc:convinced" {
		t.Errorf("String = %q", s)
	}
}
