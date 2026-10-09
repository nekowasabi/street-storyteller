package tsparse

import (
	"unicode/utf8"
)

// preprocessSource removes TS-only syntax that has no runtime value for the
// limited object-literal reader.
func preprocessSource(source []byte) []byte {
	withoutImports := stripImportDeclarations(source)
	return stripExportConstTypeAnnotation(withoutImports)
}

func stripImportDeclarations(source []byte) []byte {
	out := append([]byte(nil), source...)
	p := &parser{src: source}
	for {
		p.skipTrivia()
		start := p.pos
		if !p.consumeKeyword("import") {
			return out
		}
		if !skipImportDeclaration(p) {
			return out
		}
		blankSyntax(out, start, p.pos)
	}
}

// Only leading import declarations are removed. Scanning the whole file by
// line would also erase prose beginning with "import" inside template strings.
func skipImportDeclaration(p *parser) bool {
	depth := 0
	for !p.eof() {
		p.skipTrivia()
		switch p.peekByte() {
		case '\'', '"':
			if _, err := p.parseQuotedString(p.peekByte()); err != nil {
				return false
			}
			if depth == 0 {
				p.skipTrivia()
				p.consumeByte(';')
				return true
			}
		case '{':
			depth++
			p.pos++
		case '}':
			if depth == 0 {
				return false
			}
			depth--
			p.pos++
		case 0, ';', '=', '(':
			return false
		default:
			if p.consumeKeyword("export") {
				return false
			}
			p.pos++
		}
	}
	return false
}

// Retain newlines so diagnostics still refer to the original source lines.
func blankSyntax(source []byte, start, end int) {
	for i := start; i < end; i++ {
		if source[i] != '\n' && source[i] != '\r' {
			source[i] = ' '
		}
	}
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

	out := append([]byte(nil), source...)
	blankSyntax(out, colon, end)
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
