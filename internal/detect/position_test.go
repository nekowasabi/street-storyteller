// Why: external test package (detect_test) を使って公開 API のみを検証する。
// 内部の lineEntry 構造は隠蔽したまま、Position / *PositionTable の往復契約のみ
// 確認する戦略。
package detect_test

import (
	stderrors "errors"
	"fmt"
	"testing"
	"unicode/utf8"

	"github.com/takets/street-storyteller/internal/detect"
	apperrors "github.com/takets/street-storyteller/internal/errors"
)

// roundTripCase は (line,char) ↔ byte の双方向期待値をまとめたテーブル。
type roundTripCase struct {
	line, char int
	wantByte   int
}

// runByteOffsetCases は ByteOffset の期待値検証を共通化する。
func runByteOffsetCases(t *testing.T, table *detect.PositionTable, cases []roundTripCase) {
	t.Helper()
	for _, c := range cases {
		got, err := table.ByteOffset(c.line, c.char)
		if err != nil {
			t.Fatalf("ByteOffset(%d,%d) err=%v", c.line, c.char, err)
		}
		if got != c.wantByte {
			t.Errorf("ByteOffset(%d,%d)=%d want %d", c.line, c.char, got, c.wantByte)
		}
	}
}

// runPositionAtCases は PositionAt の期待値検証を共通化する。
func runPositionAtCases(t *testing.T, table *detect.PositionTable, cases []roundTripCase) {
	t.Helper()
	for _, c := range cases {
		pos, err := table.PositionAt(c.wantByte)
		if err != nil {
			t.Fatalf("PositionAt(%d) err=%v", c.wantByte, err)
		}
		if pos.Line != c.line || pos.Character != c.char {
			t.Errorf("PositionAt(%d)=(%d,%d) want (%d,%d)", c.wantByte, pos.Line, pos.Character, c.line, c.char)
		}
	}
}

func TestPosition_ASCII(t *testing.T) {
	table := detect.NewPositionTable("hello\nworld")

	if got := table.LineCount(); got != 2 {
		t.Errorf("LineCount=%d want 2", got)
	}

	cases := []roundTripCase{
		{0, 0, 0},
		{0, 4, 4},
		{1, 0, 6},
		{1, 4, 10},
	}
	runByteOffsetCases(t, table, cases)
	runPositionAtCases(t, table, cases)
}

func TestPosition_BMP_Japanese(t *testing.T) {
	// "あいうえお": 5 BMP rune × 3-byte UTF-8 × 1 UTF-16 unit/rune
	table := detect.NewPositionTable("あいうえお")

	if got := table.LineCount(); got != 1 {
		t.Errorf("LineCount=%d want 1", got)
	}

	cases := []roundTripCase{
		{0, 0, 0},
		{0, 2, 6},  // う の先頭
		{0, 5, 15}, // 行末 (= 全長)
	}
	runByteOffsetCases(t, table, cases)
	runPositionAtCases(t, table, cases)
}

func TestPosition_Astral_Emoji(t *testing.T) {
	// "🎉hello": 🎉 = U+1F389, UTF-8 4byte, UTF-16 surrogate pair (2 unit)
	table := detect.NewPositionTable("🎉hello")

	if got := table.LineCount(); got != 1 {
		t.Errorf("LineCount=%d want 1", got)
	}

	cases := []roundTripCase{
		{0, 0, 0}, // 🎉 の先頭
		{0, 2, 4}, // 🎉 直後 = 'h' の先頭
		{0, 6, 8}, // 'o' の先頭 (🎉(2)+h+e+l+l = 6 UTF-16 units)
	}
	runByteOffsetCases(t, table, cases)
	runPositionAtCases(t, table, cases)

	// Why: surrogate pair の途中 (char=1) は LSP で valid な position ではないため、
	// 黙って rune 境界に丸めるのではなく明示的に Validation error にする契約を担保する。
	if _, err := table.ByteOffset(0, 1); err == nil {
		t.Errorf("ByteOffset(0,1) expected error for surrogate-pair-mid char")
	}

	// 🎉 の UTF-8 内側 byte (1,2,3) は rune 境界外なので PositionAt は error。
	for _, b := range []int{1, 2, 3} {
		if _, err := table.PositionAt(b); err == nil {
			t.Errorf("PositionAt(%d) expected error for mid-rune byte", b)
		}
	}
}

func TestPosition_CRLF(t *testing.T) {
	table := detect.NewPositionTable("a\r\nb")

	if got := table.LineCount(); got != 2 {
		t.Errorf("LineCount=%d want 2", got)
	}

	cases := []roundTripCase{
		{0, 1, 1}, // 'a' 直後 = 行末 (separator 直前)
		{1, 0, 3}, // 'b' の先頭
	}
	runByteOffsetCases(t, table, cases)
	runPositionAtCases(t, table, cases)

	// Why: \r 単独 / \n 単独 も LSP 仕様で line separator として認識される必要がある。
	// 3 つの改行種を同列に扱う契約を回帰テストで固定する。
	if got := detect.NewPositionTable("a\rb").LineCount(); got != 2 {
		t.Errorf("lone CR LineCount=%d want 2", got)
	}
	if got := detect.NewPositionTable("a\nb").LineCount(); got != 2 {
		t.Errorf("lone LF LineCount=%d want 2", got)
	}

	// "\r\n" は separator として 1 つに数えるため、char count に separator の byte が
	// 含まれないことを確認する (line0 の最大 char=1, line1 の最大 char=1)。
	if _, err := table.ByteOffset(0, 2); err == nil {
		t.Errorf("ByteOffset(0,2) expected error: separator must not be counted")
	}
}

func TestPosition_OutOfRange(t *testing.T) {
	table := detect.NewPositionTable("hello\nworld")

	cases := []struct {
		name       string
		line, char int
	}{
		{"negative line", -1, 0},
		{"line too large", 99, 0},
		{"negative char", 0, -1},
		{"char too large", 0, 100},
		{"line at LineCount", 2, 0}, // 0-based なので 2 は範囲外
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := table.ByteOffset(c.line, c.char)
			if err == nil {
				t.Fatalf("ByteOffset expected error")
			}
			var ae *apperrors.Error
			if !stderrors.As(err, &ae) {
				t.Fatalf("err is not *apperrors.Error: %T (%v)", err, err)
			}
			if ae.Code != apperrors.CodeValidation {
				t.Errorf("Code=%q want %q", ae.Code, apperrors.CodeValidation)
			}
		})
	}

	// PositionAt 範囲外
	for _, b := range []int{-1, 100, len("hello\nworld") + 1} {
		_, err := table.PositionAt(b)
		if err == nil {
			t.Errorf("PositionAt(%d) expected error", b)
			continue
		}
		var ae *apperrors.Error
		if !stderrors.As(err, &ae) {
			t.Errorf("PositionAt(%d) err is not *apperrors.Error: %T", b, err)
			continue
		}
		if ae.Code != apperrors.CodeValidation {
			t.Errorf("PositionAt(%d) Code=%q want %q", b, ae.Code, apperrors.CodeValidation)
		}
	}
}

func TestPosition_RoundTrip_Fuzz(t *testing.T) {
	// Why: 固定 fixture 群で「PositionAt が成功した byte は ByteOffset で必ず元に戻る」
	// 性質を網羅的に確認する。astral / BMP / ASCII / CRLF 混在で edge case を踏む。
	fixtures := []string{
		"",
		"hello",
		"hello\nworld",
		"あいうえお",
		"🎉hello",
		"a\r\nb",
		"line1\rline2\nline3\r\nline4",
		"🎉\n🎉",
		"ABC\nあい🎉\nXYZ",
		"trailing\n",
	}

	for _, fx := range fixtures {
		t.Run(fmt.Sprintf("%q", fx), func(t *testing.T) {
			table := detect.NewPositionTable(fx)
			// 全 byte を走査し、有効な位置 (rune 境界 / 行末 / 行頭) で往復検証する。
			for i := 0; i <= len(fx); i++ {
				pos, err := table.PositionAt(i)
				if err != nil {
					// rune 内部 / separator 内部は skip (契約上 invalid なので元から往復対象外)
					continue
				}
				got, err := table.ByteOffset(pos.Line, pos.Character)
				if err != nil {
					t.Fatalf("ByteOffset after PositionAt(%d)=(%d,%d) err=%v", i, pos.Line, pos.Character, err)
				}
				if got != i {
					t.Errorf("round-trip byte %d -> (%d,%d) -> %d mismatch", i, pos.Line, pos.Character, got)
				}
			}

			// rune 境界 byte をすべて検証カバーに含めることを担保 (separator は除外)。
			for i := 0; i < len(fx); {
				r, size := utf8.DecodeRuneInString(fx[i:])
				if r == '\r' || r == '\n' {
					i += size
					continue
				}
				if _, err := table.PositionAt(i); err != nil {
					t.Errorf("rune-start byte %d should be addressable, err=%v", i, err)
				}
				i += size
			}
		})
	}
}
