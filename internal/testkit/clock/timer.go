package clock

import "time"

// Stopper は AfterFunc 等で登録された遅延処理をキャンセルするための interface。
//
// Why: 標準ライブラリの time.Timer は Stop() bool を持つが、interface 化されて
// いないため fake 実装で差し替えできない。最小契約のみ抽出して将来 RealTimer
// 実装も追加可能にする。
type Stopper interface {
	// Stop はまだ実行されていなければキャンセルして true を返す。
	// 既に実行済 / 既に Stop 済なら false。
	Stop() bool
}

// Timer は遅延実行 (debounce/timeout) を抽象化する interface。
//
// Why: setTimeout/clearTimeout 相当の機能を Clock とは分離した interface に
// 切り出す。debounce ロジックは Now() ベースの elapsed 判定よりも AfterFunc +
// Stop パターンの方が TS 版 (server.ts:772) と意味論が一致するため。
type Timer interface {
	// AfterFunc は d 経過後に fn を 1 度だけ呼び出す Stopper を返す。
	AfterFunc(d time.Duration, fn func()) Stopper
}
