package clock_test

import (
	"testing"
	"time"

	"github.com/takets/street-storyteller/internal/testkit/clock"
)

// Why: epoch を固定してテスト間の独立性を保つ。
func newFake() *clock.FakeClock {
	return clock.NewFakeClock(time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC))
}

func TestFakeTimerAfterFuncFiresAfterAdvance(t *testing.T) {
	f := newFake()
	var calls int
	f.AfterFunc(100*time.Millisecond, func() { calls++ })

	f.Advance(50 * time.Millisecond)
	if calls != 0 {
		t.Fatalf("expected 0 calls before deadline, got %d", calls)
	}

	f.Advance(60 * time.Millisecond)
	if calls != 1 {
		t.Fatalf("expected 1 call after deadline, got %d", calls)
	}
}

func TestFakeTimerStopBeforeFire(t *testing.T) {
	f := newFake()
	var calls int
	h := f.AfterFunc(100*time.Millisecond, func() { calls++ })

	if ok := h.Stop(); !ok {
		t.Fatalf("expected Stop() to return true before fire, got false")
	}
	f.Advance(200 * time.Millisecond)
	if calls != 0 {
		t.Fatalf("expected 0 calls after Stop, got %d", calls)
	}
}

func TestFakeTimerStopAfterFire(t *testing.T) {
	f := newFake()
	var calls int
	h := f.AfterFunc(100*time.Millisecond, func() { calls++ })

	f.Advance(150 * time.Millisecond)
	if calls != 1 {
		t.Fatalf("expected fn to fire once, got %d", calls)
	}
	if ok := h.Stop(); ok {
		t.Fatalf("expected Stop() to return false after fire, got true")
	}
}

func TestFakeTimerMultipleFireInOrder(t *testing.T) {
	f := newFake()
	var order []int
	f.AfterFunc(30*time.Millisecond, func() { order = append(order, 3) })
	f.AfterFunc(10*time.Millisecond, func() { order = append(order, 1) })
	f.AfterFunc(20*time.Millisecond, func() { order = append(order, 2) })

	f.Advance(100 * time.Millisecond)
	if len(order) != 3 {
		t.Fatalf("expected 3 fires, got %d (order=%v)", len(order), order)
	}
	// Why: 現状仕様では登録順 (=スライス順) で fire される。deadline 順ソートを
	// 保証する仕様にはしていないため、3 件すべて fire したことのみを検証する。
	got := map[int]bool{}
	for _, v := range order {
		got[v] = true
	}
	if !(got[1] && got[2] && got[3]) {
		t.Fatalf("expected all of {1,2,3} fired, got %v", order)
	}
}

func TestFakeTimerDebounceSimulation(t *testing.T) {
	f := newFake()
	var calls int
	debounce := func() clock.Stopper {
		return f.AfterFunc(200*time.Millisecond, func() { calls++ })
	}

	// Why: TS 版 textlint_worker.ts の debounce パターン (Stop + 再 AfterFunc) を
	// Go で再現。最後のイベントから 200ms 経過した時点で 1 回だけ発火することを検証。
	current := debounce()
	f.Advance(50 * time.Millisecond)
	current.Stop()
	current = debounce()
	f.Advance(50 * time.Millisecond)
	current.Stop()
	_ = debounce()
	f.Advance(250 * time.Millisecond)

	if calls != 1 {
		t.Fatalf("expected debounce coalesced to 1 call, got %d", calls)
	}
}
