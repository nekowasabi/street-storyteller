package tsparse

import (
	"bytes"
	"unicode"
	"unicode/utf8"
)

// preprocessSource removes TS-only syntax that has no runtime value for the
// limited object-literal reader.
func preprocessSource(source []byte) []byte {
	withoutImports := stripImportDeclarations(source)
	return stripExportConstTypeAnnotation(withoutImports)
}

func stripImportDeclarations(source []byte) []byte {
	var out bytes.Buffer
	for i := 0; i < len(source); {
		lineStart := i
		for i < len(source) && (source[i] == ' ' || source[i] == '\t') {
			i++
		}
		if hasKeywordAt(source, i, "import") {
			for i < len(source) {
				c := source[i]
				i++
				if c == ';' {
					break
				}
				if c == '\n' {
					break
				}
			}
			if i < len(source) && source[i] == '\n' {
				i++
			}
			continue
		}
		i = lineStart
		for i < len(source) {
			c := source[i]
			out.WriteByte(c)
			i++
			if c == '\n' {
				break
			}
		}
	}
	return out.Bytes()
}

func stripExportConstTypeAnnotation(source []byte) []byte {
	p := &parser{src: source}
	p.skipTrivia()
	if !p.consumeKeyword("export") {
		return source
	}
	p.skipTrivia()
	if !p.consumeKeyword("const") {
		return source
	}
	p.skipTrivia()
	if _, err := p.readIdentifier(); err != nil {
		return source
	}
	p.skipTrivia()
	if p.peekByte() != ':' {
		return source
	}

	colon := p.pos
	end := findTypeAnnotationEnd(source, colon+1)
	if end < 0 {
		return source
	}

	out := make([]byte, 0, len(source)-(end-colon))
	out = append(out, source[:colon]...)
	out = append(out, source[end:]...)
	return out
}

func findTypeAnnotationEnd(source []byte, start int) int {
	depthAngle := 0
	depthParen := 0
	depthBracket := 0
	for i := start; i < len(source); {
		r, size := utf8.DecodeRune(source[i:])
		switch r {
		case '<':
			depthAngle++
		case '>':
			if depthAngle > 0 {
				depthAngle--
			}
		case '(':
			depthParen++
		case ')':
			if depthParen > 0 {
				depthParen--
			}
		case '[':
			depthBracket++
		case ']':
			if depthBracket > 0 {
				depthBracket--
			}
		case '=':
			if depthAngle == 0 && depthParen == 0 && depthBracket == 0 {
				return i
			}
		}
		i += size
	}
	return -1
}

func hasKeywordAt(source []byte, pos int, keyword string) bool {
	if pos+len(keyword) > len(source) {
		return false
	}
	if string(source[pos:pos+len(keyword)]) != keyword {
		return false
	}
	beforeOK := pos == 0 || !isIdentRuneForPreprocess(rune(source[pos-1]))
	after := pos + len(keyword)
	afterOK := after >= len(source) || !isIdentRuneForPreprocess(rune(source[after]))
	return beforeOK && afterOK
}

func isIdentRuneForPreprocess(r rune) bool {
	return r == '_' || r == '$' || unicode.IsLetter(r) || unicode.IsDigit(r)
}
