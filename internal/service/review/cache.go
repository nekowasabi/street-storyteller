package review

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"sync"
)

type Cache struct {
	Path               string
	Decider            Decider
	Hits, Calls, Bytes int
	mu                 sync.Mutex
	values             map[string]float64
}

func NewCache(path string, decider Decider) *Cache { return &Cache{Path: path, Decider: decider} }
func (c *Cache) lookup(key string) (float64, bool, error) {
	if c.values != nil {
		v, ok := c.values[key]
		return v, ok, nil
	}
	f, err := os.Open(c.Path)
	if os.IsNotExist(err) {
		c.values = map[string]float64{}
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 4096), 1024*1024)
	values := map[string]float64{}
	for scanner.Scan() {
		if len(scanner.Bytes()) == 0 {
			continue
		}
		var e struct {
			Key   string   `json:"key"`
			Value *float64 `json:"value"`
		}
		if err := json.Unmarshal(scanner.Bytes(), &e); err != nil {
			return 0, false, fmt.Errorf("判定キャッシュ: %w", err)
		}
		if e.Value == nil || !validValue(*e.Value) {
			return 0, false, fmt.Errorf("判定キャッシュの値が不正です")
		}
		values[e.Key] = *e.Value
	}
	if err := scanner.Err(); err != nil {
		return 0, false, err
	}
	c.values = values
	v, ok := values[key]
	return v, ok, nil
}
func validValue(v float64) bool { return !math.IsNaN(v) && !math.IsInf(v, 0) && v >= 0 && v <= 1 }
func (c *Cache) Decide(ctx context.Context, model string, q Query) (float64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	key := q.Key(model)
	v, ok, err := c.lookup(key)
	if err != nil {
		return 0, err
	}
	if ok {
		c.Hits++
		return v, nil
	}
	if c.Decider == nil {
		return 0, fmt.Errorf("判定キャッシュに値がありません（オフライン）")
	}
	c.Calls++
	body, _ := json.Marshal(q.Request(model))
	c.Bytes += len(body)
	v, err = c.Decider.Decide(ctx, model, q)
	if err != nil {
		return 0, err
	}
	if !validValue(v) {
		return 0, fmt.Errorf("判定の値が不正です")
	}
	if err := os.MkdirAll(filepath.Dir(c.Path), 0700); err != nil {
		return 0, err
	}
	f, err := os.OpenFile(c.Path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return 0, err
	}
	err = json.NewEncoder(f).Encode(struct {
		Key   string  `json:"key"`
		Value float64 `json:"value"`
	}{key, v})
	closeErr := f.Close()
	if err != nil {
		return 0, err
	}
	if closeErr != nil {
		return 0, closeErr
	}
	c.values[key] = v
	return v, nil
}
