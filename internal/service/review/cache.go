package review

import (
	"bufio"
	"bytes"
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
	planned            map[string][]Query
	failed             map[string]error
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

// Plan は、このあと引く問いを先に知らせる。外れに当たったとき、同じ state で
// まだ値の無い問いを同じ送信に載せるために使う。
func (c *Cache) Plan(qs []Query) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.planned == nil {
		c.planned = map[string][]Query{}
	}
	for _, q := range qs {
		c.planned[q.KeyState] = append(c.planned[q.KeyState], q)
	}
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
	if err, ok := c.failed[key]; ok {
		return 0, err
	}
	if c.Decider == nil {
		return 0, fmt.Errorf("判定キャッシュに値がありません（オフライン）")
	}
	group, keys := []Query{q}, []string{key}
	seen := map[string]bool{key: true}
	for _, p := range c.planned[q.KeyState] {
		k := p.Key(model)
		if _, cached := c.values[k]; cached || seen[k] {
			continue
		}
		seen[k] = true
		group, keys = append(group, p), append(keys, k)
	}
	c.Calls++
	body, _ := json.Marshal(BundleRequest(model, group))
	c.Bytes += len(body)
	vs, err := c.Decider.Decide(ctx, model, group)
	if err == nil && len(vs) != len(group) {
		err = fmt.Errorf("判定の値の数が問いの数と合いません")
	}
	var lines bytes.Buffer
	for i := 0; err == nil && i < len(vs); i++ {
		if !validValue(vs[i]) {
			err = fmt.Errorf("判定の値が不正です")
			break
		}
		err = json.NewEncoder(&lines).Encode(struct {
			Key   string  `json:"key"`
			Value float64 `json:"value"`
		}{keys[i], vs[i]})
	}
	if err == nil {
		err = c.append(lines.Bytes())
	}
	if err != nil {
		// 1 つでも欠けたら、その送信の値は 1 つも使わない。同じ実行では送り直さない。
		if c.failed == nil {
			c.failed = map[string]error{}
		}
		for _, k := range keys {
			c.failed[k] = err
		}
		return 0, err
	}
	for i, k := range keys {
		c.values[k] = vs[i]
	}
	return vs[0], nil
}
func (c *Cache) append(lines []byte) error {
	if err := os.MkdirAll(filepath.Dir(c.Path), 0700); err != nil {
		return err
	}
	f, err := os.OpenFile(c.Path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err != nil {
		return err
	}
	_, err = f.Write(lines)
	if closeErr := f.Close(); err == nil {
		err = closeErr
	}
	return err
}
