package domain

// StringOrFileRef は TS 側の `string | { file: string }` union を Go で表現する共通型。
//
// Why: pointer ペア (`*string` + `*FileRef`) より struct の排他制約のほうが zero value が
// 「inline 空文字列」として自然に扱え、JSON unmarshaler 拡張時の分岐が単純化される。
// File が空でなければ外部ファイル参照、それ以外は Value を inline 値として扱う。
//
// Why: Wave-A1 では各 worktree が個別に anonymous struct / TextOrFileRef / ExcerptValue
// など異なる表現を採用していた。Wave-A2-pre で本型に集約し、entity 横断の重複を解消する。
type StringOrFileRef struct {
	Value string
	File  string
}

// IsFile はこの値が外部ファイル参照かどうかを返す。
func (s StringOrFileRef) IsFile() bool { return s.File != "" }

// IsEmpty は inline 値もファイル参照も持たない zero 値かどうかを返す。
func (s StringOrFileRef) IsEmpty() bool { return s.Value == "" && s.File == "" }
