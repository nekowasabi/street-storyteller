package tsparse

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"unicode"
	"unicode/utf8"
)

// Value は TS object literal をパースした結果の汎用値。
// 型は string / float64 / bool / nil / []Value / map[string]Value のいずれか。
//
// Why: domain 層の具体型 (Character, Setting 等) には依存しない。limited-scope
// の reader として中立的な generic 値を返し、上位層 (Wave-A2-main で導入予定の
// reader/converter) が domain 型へ写像する。
type Value any

// ParseResult は ParseExportConst の戻り値。
type ParseResult struct {
	Name  string
	Value Value
}

// ParseExportConst は "export const NAME = { ... }" 形式の TS source から
// NAME と value を抽出する。
//
// サポート範囲・非サポート範囲は package doc / parser_test.go を参照。
//
// Why: 自前 tokenizer + recursive descent を採用。text/scanner も検討したが、
// (1) 日本語文字列リテラルの取扱いを fully control したい、(2) backtick 内の
// `${` 検出を独自に行いたい、(3) 依存ゼロを維持したい、という 3 点で
// 内製した方が読みやすく安全なため。
func ParseExportConst(source []byte) (*ParseResult, error) {
	p := &parser{src: preprocessSource(source)}
	p.skipTrivia()

	if !p.consumeKeyword("export") {
		return nil, p.errorf("expected 'export' keyword at start of declaration")
	}
	p.skipTrivia()

	if !p.consumeKeyword("const") {
		return nil, p.errorf("expected 'const' keyword after 'export'")
	}
	p.skipTrivia()

	name, err := p.readIdentifier()
	if err != nil {
		return nil, p.wrapError(fmt.Errorf("expected identifier after 'export const': %w", err))
	}
	p.skipTrivia()

	// Optional type annotation `: T` is not supported in limited scope.
	if p.peekByte() == ':' {
		return nil, p.errorf("type annotations are not supported in limited-scope parser")
	}

	if !p.consumeByte('=') {
		return nil, p.errorf("expected '=' after const name")
	}
	p.skipTrivia()

	value, err := p.parseValue()
	if err != nil {
		return nil, p.wrapError(err)
	}
	p.skipTrivia()

	// Why: TS の `as const` / `satisfies T` / `as T` はランタイム値ではなく型情報なので、
	// 値を JSON 同等として扱う本パーサのスコープから外す。誤って silently 受け入れて
	// しまうと「型の主張が無視される」というデータロスが起きるため明示エラーで reject。
	if p.consumeKeyword("as") {
		p.skipTrivia()
		if p.consumeKeyword("const") {
			return nil, p.errorf("'as const' assertion is not supported in limited-scope parser")
		}
		return nil, p.errorf("'as <Type>' type assertion is not supported in limited-scope parser")
	}
	if p.consumeKeyword("satisfies") {
		return nil, p.errorf("'satisfies' clause is not supported in limited-scope parser")
	}

	// Optional trailing semicolon.
	if p.peekByte() == ';' {
		p.pos++
	}
	p.skipTrivia()
	// Trailing content beyond a single declaration is tolerated (file may have more).

	return &ParseResult{Name: name, Value: value}, nil
}

func ParseExportConstFile(path string) (*ParseResult, error) {
	source, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	result, err := ParseExportConst(source)
	if err != nil {
		return nil, fmt.Errorf("%s: %w", path, err)
	}
	return result, nil
}

// --- internal parser ---------------------------------------------------------

type parser struct {
	src []byte
	pos int
}

func (p *parser) errorf(format string, args ...any) error {
	return p.wrapError(fmt.Errorf(format, args...))
}

func (p *parser) wrapError(err error) error {
	line, column := p.lineColumn()
	return fmt.Errorf("line %d, column %d: %w", line, column, err)
}

func (p *parser) lineColumn() (int, int) {
	line := 1
	column := 1
	limit := p.pos
	if limit > len(p.src) {
		limit = len(p.src)
	}
	for i := 0; i < limit; {
		r, size := utf8.DecodeRune(p.src[i:])
		if r == '\n' {
			line++
			column = 1
		} else {
			column++
		}
		i += size
	}
	return line, column
}

func (p *parser) eof() bool { return p.pos >= len(p.src) }

func (p *parser) peekByte() byte {
	if p.eof() {
		return 0
	}
	return p.src[p.pos]
}

// consumeByte advances if the next byte matches b.
func (p *parser) consumeByte(b byte) bool {
	if p.peekByte() == b {
		p.pos++
		return true
	}
	return false
}

// skipTrivia skips whitespace and // ... / /* ... */ comments.
func (p *parser) skipTrivia() {
	for !p.eof() {
		c := p.src[p.pos]
		switch {
		case c == ' ' || c == '\t' || c == '\n' || c == '\r':
			p.pos++
		case c == '/' && p.pos+1 < len(p.src) && p.src[p.pos+1] == '/':
			for !p.eof() && p.src[p.pos] != '\n' {
				p.pos++
			}
		case c == '/' && p.pos+1 < len(p.src) && p.src[p.pos+1] == '*':
			p.pos += 2
			for !p.eof() {
				if p.pos+1 < len(p.src) && p.src[p.pos] == '*' && p.src[p.pos+1] == '/' {
					p.pos += 2
					break
				}
				p.pos++
			}
		default:
			return
		}
	}
}

// consumeKeyword consumes an exact keyword if present at the current position
// and the following byte is a non-identifier character (or EOF).
func (p *parser) consumeKeyword(kw string) bool {
	if p.pos+len(kw) > len(p.src) {
		return false
	}
	if string(p.src[p.pos:p.pos+len(kw)]) != kw {
		return false
	}
	// Boundary check.
	if p.pos+len(kw) < len(p.src) {
		next := p.src[p.pos+len(kw)]
		if isIdentRune(rune(next)) {
			return false
		}
	}
	p.pos += len(kw)
	return true
}

func isIdentStart(r rune) bool {
	return r == '_' || r == '$' || unicode.IsLetter(r)
}

func isIdentRune(r rune) bool {
	return isIdentStart(r) || unicode.IsDigit(r)
}

// readIdentifier reads a JS identifier (ASCII-friendly + Unicode letters).
func (p *parser) readIdentifier() (string, error) {
	if p.eof() {
		return "", errors.New("unexpected end of input while reading identifier")
	}
	r, size := utf8.DecodeRune(p.src[p.pos:])
	if !isIdentStart(r) {
		return "", fmt.Errorf("expected identifier, got %q", string(r))
	}
	start := p.pos
	p.pos += size
	for !p.eof() {
		r, size = utf8.DecodeRune(p.src[p.pos:])
		if !isIdentRune(r) {
			break
		}
		p.pos += size
	}
	return string(p.src[start:p.pos]), nil
}

// parseValue dispatches to a literal parser based on the leading byte.
func (p *parser) parseValue() (Value, error) {
	p.skipTrivia()
	if p.eof() {
		return nil, errors.New("unexpected end of input while reading value")
	}
	c := p.src[p.pos]
	switch {
	case c == '{':
		return p.parseObject()
	case c == '[':
		return p.parseArray()
	case c == '"' || c == '\'':
		return p.parseQuotedString(c)
	case c == '`':
		return p.parseBacktickString()
	case c == '-' || (c >= '0' && c <= '9'):
		return p.parseNumber()
	case c == '.':
		// e.g. `.5` — uncommon in TS but accept.
		return p.parseNumber()
	case isIdentStart(rune(c)):
		return p.parseIdentValue()
	}
	return nil, fmt.Errorf("unexpected character %q while reading value", string(c))
}

// parseIdentValue handles identifier-shaped values: only true/false/null are
// accepted; bare identifiers are rejected because they would be variable refs.
func (p *parser) parseIdentValue() (Value, error) {
	start := p.pos
	ident, err := p.readIdentifier()
	if err != nil {
		return nil, err
	}
	switch ident {
	case "true":
		return true, nil
	case "false":
		return false, nil
	case "null", "undefined":
		return nil, nil
	}
	// Detect call expression: ident(...).
	saved := p.pos
	p.skipTrivia()
	if p.peekByte() == '(' {
		return nil, fmt.Errorf("function call %q is not supported (limited-scope parser)", ident)
	}
	p.pos = saved
	return nil, fmt.Errorf("bare identifier %q at offset %d is not a literal value (variable references are not supported)", ident, start)
}

// parseObject reads `{ key: value, ... }`.
func (p *parser) parseObject() (Value, error) {
	if !p.consumeByte('{') {
		return nil, errors.New("expected '{' to start object")
	}
	out := map[string]Value{}
	for {
		p.skipTrivia()
		if p.eof() {
			return nil, errors.New("unexpected end of input, expected '}' to close object")
		}
		if p.peekByte() == '}' {
			p.pos++
			return out, nil
		}

		// Why: spread `...x` は variable reference を畳み込む構文で、limited-scope
		// reader では値を確定できない (どの const 由来かを resolve しない方針) ので reject。
		if p.pos+2 < len(p.src) && p.src[p.pos] == '.' && p.src[p.pos+1] == '.' && p.src[p.pos+2] == '.' {
			return nil, errors.New("spread '...' operator is not supported (limited-scope parser)")
		}

		key, err := p.parseKey()
		if err != nil {
			return nil, err
		}
		p.skipTrivia()
		if !p.consumeByte(':') {
			return nil, fmt.Errorf("expected ':' after object key %q", key)
		}
		p.skipTrivia()
		val, err := p.parseValue()
		if err != nil {
			return nil, err
		}
		out[key] = val

		p.skipTrivia()
		if p.consumeByte(',') {
			continue
		}
		p.skipTrivia()
		if p.peekByte() == '}' {
			p.pos++
			return out, nil
		}
		return nil, errors.New("expected ',' or '}' in object")
	}
}

// parseKey reads either an identifier key or a quoted-string key.
func (p *parser) parseKey() (string, error) {
	c := p.peekByte()
	if c == '"' || c == '\'' {
		s, err := p.parseQuotedString(c)
		if err != nil {
			return "", err
		}
		return s.(string), nil
	}
	if isIdentStart(rune(c)) {
		return p.readIdentifier()
	}
	return "", fmt.Errorf("expected object key (identifier or quoted string), got %q", string(c))
}

// parseArray reads `[ value, ... ]`.
func (p *parser) parseArray() (Value, error) {
	if !p.consumeByte('[') {
		return nil, errors.New("expected '[' to start array")
	}
	out := []Value{}
	for {
		p.skipTrivia()
		if p.eof() {
			return nil, errors.New("unexpected end of input, expected ']' to close array")
		}
		if p.peekByte() == ']' {
			p.pos++
			return out, nil
		}
		if p.pos+2 < len(p.src) && p.src[p.pos] == '.' && p.src[p.pos+1] == '.' && p.src[p.pos+2] == '.' {
			return nil, errors.New("spread '...' operator is not supported (limited-scope parser)")
		}
		val, err := p.parseValue()
		if err != nil {
			return nil, err
		}
		out = append(out, val)

		p.skipTrivia()
		if p.consumeByte(',') {
			continue
		}
		p.skipTrivia()
		if p.peekByte() == ']' {
			p.pos++
			return out, nil
		}
		return nil, errors.New("expected ',' or ']' in array")
	}
}

// parseQuotedString reads a "..." or '...' string literal with JS-style escapes.
func (p *parser) parseQuotedString(quote byte) (Value, error) {
	if !p.consumeByte(quote) {
		return nil, fmt.Errorf("expected %q to start string", string(quote))
	}
	var b strings.Builder
	for {
		if p.eof() {
			return nil, fmt.Errorf("unterminated string literal (missing closing %q)", string(quote))
		}
		c := p.src[p.pos]
		if c == '\n' {
			return nil, errors.New("unterminated string literal (newline before closing quote)")
		}
		if c == quote {
			p.pos++
			return b.String(), nil
		}
		if c == '\\' {
			esc, err := p.readEscape()
			if err != nil {
				return nil, err
			}
			b.WriteString(esc)
			continue
		}
		// Pass-through for multi-byte UTF-8.
		r, size := utf8.DecodeRune(p.src[p.pos:])
		b.WriteRune(r)
		p.pos += size
	}
}

// parseBacktickString reads a `...` template string. Interpolation `${...}` is
// rejected because resolving it would require an expression engine.
//
// Why: `${expr}` を許すと expr 内の variable reference / function call /
// arithmetic を解決する必要が生じ、limited-scope の境界を超える。fixture を
// migrate する用途では interpolation 不要なので明示 reject で十分。
func (p *parser) parseBacktickString() (Value, error) {
	if !p.consumeByte('`') {
		return nil, errors.New("expected '`' to start template literal")
	}
	var b strings.Builder
	for {
		if p.eof() {
			return nil, errors.New("unterminated template literal (missing closing backtick)")
		}
		c := p.src[p.pos]
		if c == '`' {
			p.pos++
			return b.String(), nil
		}
		if c == '$' && p.pos+1 < len(p.src) && p.src[p.pos+1] == '{' {
			return nil, errors.New("template literal interpolation '${...}' is not supported (limited-scope parser)")
		}
		if c == '\\' {
			esc, err := p.readEscape()
			if err != nil {
				return nil, err
			}
			b.WriteString(esc)
			continue
		}
		r, size := utf8.DecodeRune(p.src[p.pos:])
		b.WriteRune(r)
		p.pos += size
	}
}

// readEscape consumes a backslash escape sequence and returns the decoded text.
func (p *parser) readEscape() (string, error) {
	if p.peekByte() != '\\' {
		return "", errors.New("expected escape sequence")
	}
	p.pos++
	if p.eof() {
		return "", errors.New("dangling backslash in string literal")
	}
	c := p.src[p.pos]
	p.pos++
	switch c {
	case '\\', '\'', '"', '`':
		return string(c), nil
	case 'n':
		return "\n", nil
	case 't':
		return "\t", nil
	case 'r':
		return "\r", nil
	case 'b':
		return "\b", nil
	case 'f':
		return "\f", nil
	case '0':
		return "\x00", nil
	case '$':
		return "$", nil
	case '/':
		return "/", nil
	case 'x':
		if p.pos+2 > len(p.src) {
			return "", errors.New("invalid \\x escape: not enough hex digits")
		}
		hex := string(p.src[p.pos : p.pos+2])
		p.pos += 2
		n, err := strconv.ParseUint(hex, 16, 32)
		if err != nil {
			return "", fmt.Errorf("invalid \\x escape %q", hex)
		}
		return string(rune(n)), nil
	case 'u':
		// Either \uXXXX or \u{XXXXXX}.
		if p.peekByte() == '{' {
			p.pos++
			start := p.pos
			for !p.eof() && p.src[p.pos] != '}' {
				p.pos++
			}
			if p.eof() {
				return "", errors.New("invalid \\u{...} escape: missing '}'")
			}
			hex := string(p.src[start:p.pos])
			p.pos++ // consume '}'
			n, err := strconv.ParseUint(hex, 16, 32)
			if err != nil {
				return "", fmt.Errorf("invalid \\u{} escape %q", hex)
			}
			return string(rune(n)), nil
		}
		if p.pos+4 > len(p.src) {
			return "", errors.New("invalid \\u escape: not enough hex digits")
		}
		hex := string(p.src[p.pos : p.pos+4])
		p.pos += 4
		n, err := strconv.ParseUint(hex, 16, 32)
		if err != nil {
			return "", fmt.Errorf("invalid \\u escape %q", hex)
		}
		return string(rune(n)), nil
	}
	// Unknown escape: per JS spec, becomes the literal character.
	return string(c), nil
}

// parseNumber reads an integer or float literal (possibly negative).
func (p *parser) parseNumber() (Value, error) {
	start := p.pos
	if p.peekByte() == '-' || p.peekByte() == '+' {
		p.pos++
	}
	hasDigit := false
	for !p.eof() && p.src[p.pos] >= '0' && p.src[p.pos] <= '9' {
		p.pos++
		hasDigit = true
	}
	if !p.eof() && p.src[p.pos] == '.' {
		p.pos++
		for !p.eof() && p.src[p.pos] >= '0' && p.src[p.pos] <= '9' {
			p.pos++
			hasDigit = true
		}
	}
	// Optional exponent.
	if !p.eof() && (p.src[p.pos] == 'e' || p.src[p.pos] == 'E') {
		p.pos++
		if !p.eof() && (p.src[p.pos] == '+' || p.src[p.pos] == '-') {
			p.pos++
		}
		for !p.eof() && p.src[p.pos] >= '0' && p.src[p.pos] <= '9' {
			p.pos++
			hasDigit = true
		}
	}
	if !hasDigit {
		return nil, fmt.Errorf("invalid number literal at offset %d", start)
	}
	lit := string(p.src[start:p.pos])
	f, err := strconv.ParseFloat(lit, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid number literal %q: %w", lit, err)
	}
	return f, nil
}
