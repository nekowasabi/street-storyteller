package detect_test

import (
	"strings"
	"testing"

	"github.com/takets/street-storyteller/internal/detect"
)

func BenchmarkPositionAtDenseLine(b *testing.B) {
	table := detect.NewPositionTable(strings.Repeat("😀勇者 ", 10000))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for n := 0; n < 10000; n++ {
			pos, err := table.PositionAt(n * 11)
			if err != nil || pos.Character != n*5 {
				b.Fatalf("wrong position: %+v, %v", pos, err)
			}
		}
	}
}

func BenchmarkByteOffsetDenseLine(b *testing.B) {
	table := detect.NewPositionTable(strings.Repeat("😀勇者 ", 10000))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		for n := 0; n < 10000; n++ {
			offset, err := table.ByteOffset(0, n*5)
			if err != nil || offset != n*11 {
				b.Fatalf("wrong offset: %v, %v", offset, err)
			}
		}
	}
}
