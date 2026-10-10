package providers

import (
	"context"
	"strconv"
	"strings"
	"testing"
)

func BenchmarkRepeatedSemanticTokens(b *testing.B) {
	for _, n := range []int{1000, 10000} {
		b.Run(strconv.Itoa(n), func(b *testing.B) {
			cat := repeatedReferenceCatalog()
			doc := fakeDoc{uri: "file:///chapter.md", content: strings.Repeat("勇者 ", n)}
			b.ResetTimer()
			for i := 0; i < b.N; i++ {
				tokens, err := SemanticTokens(context.Background(), doc, cat)
				if err != nil || len(tokens.Data) != 5*n {
					b.Fatalf("wrong tokens: %v", err)
				}
			}
		})
	}
}
