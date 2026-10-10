package detect_test

import (
	"testing"
	"unicode/utf8"

	"github.com/takets/street-storyteller/internal/detect"
)

func FuzzPositionTableRoundTrip(f *testing.F) {
	for _, s := range []string{"", "勇者😀\r\n次の行\r終わり\n", "\r\n\r\n", "a\xffb"} {
		f.Add([]byte(s))
	}
	f.Fuzz(func(t *testing.T, data []byte) {
		if len(data) > 2048 {
			t.Skip()
		}
		want := map[int]detect.Position{}
		var invalid []detect.Position
		var line, character int
		want[0] = detect.Position{}
		for i := 0; i < len(data); {
			if data[i] == '\r' || data[i] == '\n' {
				step := 1
				if data[i] == '\r' && i+1 < len(data) && data[i+1] == '\n' {
					step = 2
				}
				i += step
				line++
				character = 0
			} else {
				r, n := utf8.DecodeRune(data[i:])
				i += n
				character++
				if r > 0xffff {
					invalid = append(invalid, detect.Position{Line: line, Character: character})
					character++
				}
			}
			want[i] = detect.Position{Line: line, Character: character}
		}
		table := detect.NewPositionTable(string(data))
		for _, pos := range invalid {
			if _, err := table.ByteOffset(pos.Line, pos.Character); err == nil {
				t.Fatalf("surrogate interior accepted: %+v", pos)
			}
		}
		for offset := 0; offset <= len(data); offset++ {
			got, err := table.PositionAt(offset)
			pos, valid := want[offset]
			if !valid {
				if err == nil {
					t.Fatalf("interior byte %d accepted as %+v", offset, got)
				}
				continue
			}
			if err != nil || got != pos {
				t.Fatalf("offset %d: got %+v/%v, want %+v", offset, got, err, pos)
			}
			back, err := table.ByteOffset(pos.Line, pos.Character)
			if err != nil || back != offset {
				t.Fatalf("position %+v: got %d/%v, want %d", pos, back, err, offset)
			}
		}
	})
}
