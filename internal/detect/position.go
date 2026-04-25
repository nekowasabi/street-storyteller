package detect

import (
	"fmt"
	"unicode/utf8"

	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// PositionTable は LSP UTF-16 仕様準拠の双方向 byte ↔ Position 変換テーブル。
//
// Why: TS 側 (positioned_detector.ts) は JS string index = UTF-16 直接使用で
// 済むが、Go の string は UTF-8 byte 列・rune 反復は CodePoint 単位なので、
// astral plane (1 rune = 2 UTF-16 code unit, surrogate pair) を正しく扱うには
// 行ごとに rune 開始 byte と UTF-16 長を保持する独自テーブルが要る。
// 代替の「全 rune を UTF-16 配列に展開して保持」は astral 比率次第で 2 倍以上
// メモリを使うため、line + per-rune の薄いインデックスのみを採用した。
type PositionTable struct {
	lines []lineEntry
	raw   string
}

// lineEntry は 1 行ぶんの byte 範囲と rune 位置情報を保持する。
//
// Why: byteStart / byteEnd は line separator を含まない範囲。runeStarts と
// utf16Lengths を別 slice にすることで、ByteOffset / PositionAt の双方で
// シンプルなインデックス操作だけで往復変換ができる。
type lineEntry struct {
	byteStart    int   // 行先頭 byte offset (separator 直後)
	byteEnd      int   // 行終端 byte offset (separator 直前 or EOF)
	runeStarts   []int // 各 rune の line-relative byte offset
	utf16Lengths []int // 各 rune の UTF-16 code unit 数 (1 or 2)
}

// NewPositionTable は content を一度だけ走査して PositionTable を構築する。
//
// Why: 改行は LSP 準拠で "\n" / "\r\n" / "\r" の 3 種すべてを 1 separator として
// 扱う。\r を見たら次が \n かを peek し、CRLF を 1 つにまとめる。char count に
// separator は含めない (line0 char=N が separator 直前を指す)。
func NewPositionTable(content string) *PositionTable {
	t := &PositionTable{raw: content}

	line := lineEntry{byteStart: 0}

	i := 0
	for i < len(content) {
		b := content[i]
		if b == '\n' || b == '\r' {
			line.byteEnd = i
			t.lines = append(t.lines, line)
			// CRLF は 2 byte を 1 separator として消費する。それ以外は 1 byte。
			if b == '\r' && i+1 < len(content) && content[i+1] == '\n' {
				i += 2
			} else {
				i++
			}
			line = lineEntry{byteStart: i}
			continue
		}
		r, size := utf8.DecodeRuneInString(content[i:])
		line.runeStarts = append(line.runeStarts, i-line.byteStart)
		line.utf16Lengths = append(line.utf16Lengths, utf16Width(r))
		i += size
	}
	// EOF または末尾改行直後でも常に最終行 (空行を含む) を 1 つ確定させる。
	line.byteEnd = len(content)
	t.lines = append(t.lines, line)

	return t
}

// utf16Width は r の UTF-16 code unit 長 (BMP=1, astral=2) を返す。
//
// Why: unicode/utf16.RuneLen を呼ぶ代わりに直接コードポイント比較する。
// utf8.DecodeRuneInString は無効バイトを utf8.RuneError (=U+FFFD, BMP) に
// 落とすため、ここに来る rune は常に有効 BMP / astral のいずれかで -1 が
// 返ってくる経路は無い。1 import 減らして責任範囲を明確化した。
func utf16Width(r rune) int {
	if r >= 0x10000 {
		return 2
	}
	return 1
}

// LineCount は 0-based line 数の上限 +1 (= 行数) を返す。
func (t *PositionTable) LineCount() int {
	return len(t.lines)
}

// ByteOffset は (line, charUTF16) を絶対 byte offset に変換する。
// charUTF16 は 0-based の UTF-16 code unit offset (LSP 準拠)。
//
// Why: surrogate pair の途中 (charUTF16 が high surrogate と low surrogate の
// 間) は LSP では invalid な position なので silent に丸めず Validation error。
// 末尾 char (= 行 UTF-16 長) は line separator 直前 (byteEnd) を指す。
func (t *PositionTable) ByteOffset(line, charUTF16 int) (int, error) {
	if line < 0 || line >= len(t.lines) {
		return 0, apperrors.New(apperrors.CodeValidation,
			fmt.Sprintf("line %d out of range [0,%d)", line, len(t.lines)))
	}
	if charUTF16 < 0 {
		return 0, apperrors.New(apperrors.CodeValidation,
			fmt.Sprintf("character %d is negative", charUTF16))
	}

	L := t.lines[line]
	cum := 0
	for i, ulen := range L.utf16Lengths {
		if cum == charUTF16 {
			return L.byteStart + L.runeStarts[i], nil
		}
		// surrogate pair の中央位置 (cum < charUTF16 < cum+ulen) は invalid。
		if charUTF16 < cum+ulen {
			return 0, apperrors.New(apperrors.CodeValidation,
				fmt.Sprintf("character %d falls in middle of surrogate pair on line %d", charUTF16, line))
		}
		cum += ulen
	}
	if cum == charUTF16 {
		return L.byteEnd, nil
	}
	return 0, apperrors.New(apperrors.CodeValidation,
		fmt.Sprintf("character %d out of range [0,%d] on line %d", charUTF16, cum, line))
}

// PositionAt は絶対 byte offset を Position に変換する。
//
// Why: rune 内部 byte (UTF-8 multi-byte の 2 byte 目以降) や line separator の
// 内部 byte は LSP 上 invalid な位置なので、丸めずに Validation error を返す。
// 行末 byte (separator 直前) は (line, lineUTF16Length) として明示的に返却する。
func (t *PositionTable) PositionAt(byteOffset int) (Position, error) {
	if byteOffset < 0 || byteOffset > len(t.raw) {
		return Position{}, apperrors.New(apperrors.CodeValidation,
			fmt.Sprintf("byte offset %d out of range [0,%d]", byteOffset, len(t.raw)))
	}

	for li, L := range t.lines {
		if byteOffset < L.byteStart || byteOffset > L.byteEnd {
			continue
		}
		local := byteOffset - L.byteStart
		cum := 0
		for i, rs := range L.runeStarts {
			if rs == local {
				return Position{Line: li, Character: cum}, nil
			}
			if rs > local {
				return Position{}, apperrors.New(apperrors.CodeValidation,
					fmt.Sprintf("byte offset %d falls in middle of rune on line %d", byteOffset, li))
			}
			cum += L.utf16Lengths[i]
		}
		// 全 rune を超えた行末位置 (separator 直前 / EOF) は (line, cum) を返す。
		if local == L.byteEnd-L.byteStart {
			return Position{Line: li, Character: cum}, nil
		}
		return Position{}, apperrors.New(apperrors.CodeValidation,
			fmt.Sprintf("byte offset %d unreachable on line %d", byteOffset, li))
	}
	return Position{}, apperrors.New(apperrors.CodeValidation,
		fmt.Sprintf("byte offset %d falls inside line separator", byteOffset))
}
