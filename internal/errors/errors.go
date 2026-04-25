package errors

// Code はアプリケーションエラーの分類タグ。
//
// Why: int+iota ではなく string ベースの型を採用。理由は (1) JSON / ログ /
// CLI 出力で値そのものが人間可読、(2) gRPC や HTTP マッピングなど将来の
// 外部境界でも値の意味が安定して再利用可能、(3) 新コードの追加が単なる
// 文字列定数追加で済み、序数の固定や互換性破壊の懸念が無い。
type Code string

// 代表的なエラー Code 群。
//
// Why: 値そのものを Code 名から派生させた "PascalCase" 文字列にしている。
// `fmt.Errorf` でのフォーマット時にそのまま読みやすく、TS 側の既存 Result
// タグ命名との往復翻訳もしやすい。
const (
	CodeNotFound          Code = "NotFound"
	CodeValidation        Code = "Validation"
	CodeParse             Code = "Parse"
	CodeIO                Code = "IO"
	CodeManifestInvalid   Code = "ManifestInvalid"
	CodeEntityConflict    Code = "EntityConflict"
	CodeUnsupportedFormat Code = "UnsupportedFormat"
	CodeMalformedFile     Code = "MalformedFile"
)

// Error はストーリーテラー全体で共有する典型エラー型。
//
// Why: 単一の `error` インターフェースに加えて Code / Hints を持たせるため、
// fmt.Errorf("%w", ...) と stdlib `errors.Is/As/Unwrap` の互換を維持しつつ、
// 呼び出し側が type assertion なしに分類と改善ヒントへアクセスできる。
type Error struct {
	Code    Code
	Message string
	Cause   error
	// Why: Hints は slice。改善提案は 0 件 / 1 件 / 複数件のいずれもあり得て、
	// nil 許容かつ append で逐次追加できる API が呼び出し側に最も自然なため
	// (map や struct ではなく) slice を採用した。
	Hints []string
}

// New は与えられた Code と Message から新しい *Error を生成する。
func New(code Code, message string) *Error {
	return &Error{Code: code, Message: message}
}

// Wrap は既存 error を Cause として包んだ *Error を生成する。
//
// Why: コンストラクタを New / Wrap に分けたのは、Wrap だけ Cause が必須に
// なる契約を型シグネチャで強制するため。`New(code, msg).WithCause(err)` の
// ような可変フローよりも誤用 (Cause 渡し忘れ) を減らせる。
func Wrap(err error, code Code, message string) *Error {
	return &Error{Code: code, Message: message, Cause: err}
}

// WithHints は改善ヒントを末尾に追加し、レシーバ自身を返すチェーンメソッド。
//
// Why: 新しい *Error を返すと、`err := New(...).WithHints(...)` の中間で
// 別変数に保持された参照が古い (hints 0 件) インスタンスを指してしまう。
// レシーバを mutate して同じポインタを返すことで、利用者は順序を意識せず
// chain を組める。
func (e *Error) WithHints(hints ...string) *Error {
	e.Hints = append(e.Hints, hints...)
	return e
}

// Error は error インターフェース実装。
//
// 形式:
//   - Cause なし: "{Code}: {Message}"
//   - Cause あり: "{Code}: {Message}: {cause}"
func (e *Error) Error() string {
	if e.Cause != nil {
		return string(e.Code) + ": " + e.Message + ": " + e.Cause.Error()
	}
	return string(e.Code) + ": " + e.Message
}

// Unwrap は stdlib `errors.Unwrap` 互換のため Cause を返す。
func (e *Error) Unwrap() error {
	return e.Cause
}

// Is は stdlib `errors.Is` 互換。Code が一致すれば同種エラーとみなす。
//
// Why: sentinel error をパッケージ変数として固定するのではなく、Code 比較で
// 同種判定する。これにより呼び出し側は `errors.Is(err, apperrors.New(CodeX, ""))`
// あるいは将来導入する `apperrors.IsCode(err, CodeX)` ヘルパでチェックでき、
// メッセージ差分に依存しない。
func (e *Error) Is(target error) bool {
	other, ok := target.(*Error)
	if !ok {
		return false
	}
	return e.Code == other.Code
}
