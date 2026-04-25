package clock

import (
	"sync"
	"time"
)

// Clock は決定論的テストのために now() を抽象化するインタフェース。
// Why: time.Now を直接呼ぶ実装は long-running test や時刻依存ロジックで flaky に
// なりがちなため、production では RealClock、test では FakeClock を注入できる
// よう Now() のみを露出する最小インタフェースとした。
type Clock interface {
	Now() time.Time
}

// RealClock は time.Now() を返す実環境用の Clock 実装。
// Why: 値レシーバ + フィールド無しにすることでアロケーション無し・並行安全に保つ。
type RealClock struct{}

// Now は標準ライブラリの time.Now() に委譲する。
func (RealClock) Now() time.Time { return time.Now() }

// FakeClock は手動で時刻を制御できるテスト用 Clock。
// Why: 並行 test や goroutine から共有されるユースケースを想定し、
// sync.Mutex で now を保護する。チャネルや atomic 操作ではなく Mutex を選択した
// のは、Now/Advance/Set すべてが短い critical section で済み、
// time.Time の atomic 化が困難（複数ワード）なためシンプルさを優先した。
type FakeClock struct {
	mu  sync.Mutex
	now time.Time
}

// NewFakeClock は initial を初期時刻とする FakeClock を生成する。
// Why: zero-value でも安全に使えるが、テストの可読性のために明示的な
// コンストラクタを提供する。ポインタを返すのは sync.Mutex を含むため
// 値コピーを禁止する go vet ルールに従うため。
func NewFakeClock(initial time.Time) *FakeClock {
	return &FakeClock{now: initial}
}

// Now は現在保持している仮想時刻を返す。
func (f *FakeClock) Now() time.Time {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.now
}

// Advance は仮想時刻を d だけ進める。負の d は仮想的な巻き戻しとして許容する。
// Why: テストでは「タイムアウト境界の前後」を行き来するシナリオがあるため、
// 負値を弾かずシンプルな加算に留める。
func (f *FakeClock) Advance(d time.Duration) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.now = f.now.Add(d)
}

// Set は仮想時刻を t に置き換える。
func (f *FakeClock) Set(t time.Time) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.now = t
}
