package clock

import "time"

// fakeTimer は FakeClock.Advance に追従して fn を発火する Stopper 実装。
//
// Why: 標準 time.AfterFunc を使うと goroutine + 実時間が必要で flaky になる。
// FakeClock 主導で deterministic に発火制御する。
type fakeTimer struct {
	deadline time.Time
	fn       func()
	stopped  bool
	fired    bool
}

// stopLocked は呼び出し側で FakeClock.mu を取得済みの前提で内部状態を更新する。
//
// Why: fakeTimer 自身は lock を持たず、所属 FakeClock の mu で一貫性を保つ。
func (t *fakeTimer) stopLocked() bool {
	if t.fired || t.stopped {
		return false
	}
	t.stopped = true
	return true
}

// fakeTimerHandle は FakeClock 外部に渡す Stopper。
//
// Why: 利用側が *fakeTimer を直接持つと lock 規約を破る恐れがあるため、
// owner 経由で必ず mu を取得する handle を返す。
type fakeTimerHandle struct {
	owner *FakeClock
	timer *fakeTimer
}

// Stop は所属 FakeClock の mu を取得した上でキャンセルを試みる。
func (h *fakeTimerHandle) Stop() bool {
	h.owner.mu.Lock()
	defer h.owner.mu.Unlock()
	return h.timer.stopLocked()
}

// AfterFunc は FakeClock 上で d 経過後に fn を発火する Stopper を返す。
//
// Why: Advance(d) または Set(t) の呼び出し時に deadline ≤ now のタイマーを
// 発火する。0 / 負の duration は次の Advance(0 を含む) / Set 呼び出しで
// fire 対象になる。
func (f *FakeClock) AfterFunc(d time.Duration, fn func()) Stopper {
	f.mu.Lock()
	t := &fakeTimer{deadline: f.now.Add(d), fn: fn}
	f.pendingTimers = append(f.pendingTimers, t)
	f.mu.Unlock()
	return &fakeTimerHandle{owner: f, timer: t}
}

// fireDueTimers は f.now ≤ deadline のタイマーを発火する。
// f.mu は呼び出し側で取得済みであることが前提。
//
// Why: Advance/Set から呼ばれる internal helper。fn 実行中に AfterFunc が
// 呼ばれても整合性が崩れないよう、due timers を local に切り出してから
// lock を解放して fn を呼ぶ。fn 内で再帰的に Advance を呼ぶケースは
// 想定外（テスト用途のため）。
func (f *FakeClock) fireDueTimers() {
	due := []*fakeTimer{}
	remaining := f.pendingTimers[:0]
	for _, t := range f.pendingTimers {
		if t.stopped {
			continue
		}
		if !t.deadline.After(f.now) {
			t.fired = true
			due = append(due, t)
		} else {
			remaining = append(remaining, t)
		}
	}
	f.pendingTimers = remaining
	// fn は lock を解放してから呼ぶ
	f.mu.Unlock()
	for _, t := range due {
		t.fn()
	}
	f.mu.Lock()
}
