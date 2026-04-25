package clock_test

import (
	"sync"
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/testkit/clock"
)

// TestRealClockNowWithinObservedRange は RealClock.Now() が time.Now() の直前直後で
// サンドイッチした時刻範囲内の値を返すことを検証する。
// Why: RealClock は本番経路で time.Now() を委譲するだけだが、間違って固定値を返す
// 実装に退化していないことを実時刻基準で確認する。
func TestRealClockNowWithinObservedRange(t *testing.T) {
	var c clock.Clock = clock.RealClock{}

	before := time.Now()
	got := c.Now()
	after := time.Now()

	if got.Before(before) || got.After(after) {
		t.Fatalf("RealClock.Now() = %v, want within [%v, %v]", got, before, after)
	}
}

// TestFakeClockZeroValueNow は zero-init された FakeClock の Now() が
// time.Time のゼロ値を返すことを確認する。
// Why: NewFakeClock を使わずに var c FakeClock 宣言された場合でも安全に
// 振る舞えることを保証する（panic しない、初期値が決定論的）。
func TestFakeClockZeroValueNow(t *testing.T) {
	var f clock.FakeClock

	if got := f.Now(); !got.IsZero() {
		t.Fatalf("zero-value FakeClock.Now() = %v, want zero time.Time", got)
	}
}

// TestNewFakeClockInitialNow は NewFakeClock(initial) で生成した clock の
// Now() が initial と一致することを検証する。
func TestNewFakeClockInitialNow(t *testing.T) {
	initial := time.Date(2025, 1, 2, 3, 4, 5, 0, time.UTC)
	f := clock.NewFakeClock(initial)

	if got := f.Now(); !got.Equal(initial) {
		t.Fatalf("NewFakeClock(%v).Now() = %v, want %v", initial, got, initial)
	}
}

// TestFakeClockAdvance は Advance(d) で Now() が d だけ進むことを検証する。
func TestFakeClockAdvance(t *testing.T) {
	initial := time.Date(2025, 1, 2, 3, 4, 5, 0, time.UTC)
	f := clock.NewFakeClock(initial)

	delta := 90 * time.Minute
	f.Advance(delta)

	want := initial.Add(delta)
	if got := f.Now(); !got.Equal(want) {
		t.Fatalf("FakeClock.Now() after Advance(%v) = %v, want %v", delta, got, want)
	}
}

// TestFakeClockSet は Set(t) で Now() が新時刻に置き換わることを検証する。
func TestFakeClockSet(t *testing.T) {
	initial := time.Date(2025, 1, 2, 3, 4, 5, 0, time.UTC)
	f := clock.NewFakeClock(initial)

	target := time.Date(2030, 12, 31, 23, 59, 59, 0, time.UTC)
	f.Set(target)

	if got := f.Now(); !got.Equal(target) {
		t.Fatalf("FakeClock.Now() after Set(%v) = %v, want %v", target, got, target)
	}
}

// TestFakeClockConcurrentAdvance は複数 goroutine から同時に Advance を呼んでも
// race condition なく合計値が一致することを検証する。
// Why: テスト並列化（t.Parallel）で fake clock を共有するシナリオを想定。
// `go test -race` でデータ競合を検出する。
func TestFakeClockConcurrentAdvance(t *testing.T) {
	initial := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	f := clock.NewFakeClock(initial)

	const goroutines = 50
	const perGoroutine = 100
	step := time.Millisecond

	var wg sync.WaitGroup
	wg.Add(goroutines)
	for i := 0; i < goroutines; i++ {
		go func() {
			defer wg.Done()
			for j := 0; j < perGoroutine; j++ {
				f.Advance(step)
			}
		}()
	}
	wg.Wait()

	want := initial.Add(time.Duration(goroutines*perGoroutine) * step)
	if got := f.Now(); !got.Equal(want) {
		t.Fatalf("FakeClock.Now() after concurrent Advance = %v, want %v", got, want)
	}
}
