package meta

import (
	"reflect"
	"testing"
)

func TestShowMarkers(t *testing.T) {
	body := "a\n<!-- shows: loc:misled -->\nb <!--shows:loc:corrected--> c\n<!--   shows:   loc:misled   -->\n<!-- @foreshadowing:x -->\n"
	got := ShowMarkers(body)
	want := []string{"loc:misled", "loc:corrected", "loc:misled"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("ShowMarkers = %v, want %v", got, want)
	}
	if ShowMarkers("no markers") != nil {
		t.Error("want nil for no markers")
	}
}
