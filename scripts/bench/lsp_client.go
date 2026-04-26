// Bench helper: measures the time from spawning `storyteller lsp start --stdio`
// to receiving the `initialize` response.
//
// Why: Process 100 quality gate target is LSP startup <2s. We measure
// process spawn → JSON-RPC initialize roundtrip, which captures the user-
// observable cold-start latency (binary load + handler registration +
// first request handling). Subsequent steady-state latency is not in scope
// for this gate.
//
// Usage:
//
//	go run scripts/bench/lsp_client.go --bin ./dist/storyteller --runs 10
//
// Output (TSV to stdout):
//
//	run	ms
//	1	35
//	...
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"sort"
	"strconv"
	"strings"
	"time"
)

func main() {
	bin := flag.String("bin", "./dist/storyteller", "path to storyteller binary")
	runs := flag.Int("runs", 10, "number of measurement runs")
	timeoutSec := flag.Int("timeout", 10, "per-run timeout in seconds")
	targetMs := flag.Int("target", 2000, "target threshold in ms (informational)")
	flag.Parse()

	if _, err := os.Stat(*bin); err != nil {
		fmt.Fprintf(os.Stderr, "binary not found: %s\n", *bin)
		os.Exit(2)
	}

	fmt.Printf("# storyteller LSP bench\n")
	fmt.Printf("# binary : %s\n", *bin)
	fmt.Printf("# runs   : %d\n", *runs)
	fmt.Printf("# target : <%dms\n", *targetMs)
	fmt.Printf("# date   : %s\n\n", time.Now().Format(time.RFC3339))
	fmt.Printf("run\tms\n")

	samples := make([]int64, 0, *runs)
	// Warmup: not counted.
	if ms, err := measureOnce(*bin, time.Duration(*timeoutSec)*time.Second); err != nil {
		fmt.Fprintf(os.Stderr, "warmup failed: %v\n", err)
	} else {
		_ = ms
	}

	for i := 1; i <= *runs; i++ {
		ms, err := measureOnce(*bin, time.Duration(*timeoutSec)*time.Second)
		if err != nil {
			fmt.Fprintf(os.Stderr, "run %d failed: %v\n", i, err)
			os.Exit(1)
		}
		samples = append(samples, ms)
		fmt.Printf("%d\t%d\n", i, ms)
	}

	sort.Slice(samples, func(i, j int) bool { return samples[i] < samples[j] })
	var sum int64
	for _, s := range samples {
		sum += s
	}
	mean := float64(sum) / float64(len(samples))
	median := samples[len(samples)/2]
	idx := int(0.95*float64(len(samples)-1) + 0.5)
	if idx >= len(samples) {
		idx = len(samples) - 1
	}
	p95 := samples[idx]

	status := "PASS"
	if int(mean) > *targetMs {
		status = "FAIL"
	}
	fmt.Printf("\n# summary\n")
	fmt.Printf("mean_ms\tmedian_ms\tp95_ms\ttarget_ms\tstatus\n")
	fmt.Printf("%.1f\t%d\t%d\t%d\t%s\n", mean, median, p95, *targetMs, status)

	if status == "FAIL" {
		os.Exit(1)
	}
}

// measureOnce spawns the LSP, sends an `initialize` request via JSON-RPC over
// stdio, waits for the response, then sends `shutdown`/`exit` to terminate.
// Returns elapsed time from process Start() to receipt of the initialize
// response in milliseconds.
func measureOnce(bin string, timeout time.Duration) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, bin, "lsp", "start", "--stdio")
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return 0, err
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return 0, err
	}
	cmd.Stderr = io.Discard

	start := time.Now()
	if err := cmd.Start(); err != nil {
		return 0, fmt.Errorf("start: %w", err)
	}
	defer func() {
		_ = stdin.Close()
		_ = cmd.Process.Kill()
		_ = cmd.Wait()
	}()

	initReq := map[string]any{
		"jsonrpc": "2.0",
		"id":      1,
		"method":  "initialize",
		"params": map[string]any{
			"processId":    nil,
			"rootUri":      nil,
			"capabilities": map[string]any{},
		},
	}
	if err := writeMessage(stdin, initReq); err != nil {
		return 0, fmt.Errorf("write initialize: %w", err)
	}

	resp, err := readMessage(stdout)
	if err != nil {
		return 0, fmt.Errorf("read initialize response: %w", err)
	}
	elapsed := time.Since(start).Milliseconds()

	// Sanity: ensure response has id=1 (initialize response, not a notification).
	if id, ok := resp["id"]; ok {
		switch v := id.(type) {
		case float64:
			if int(v) != 1 {
				return 0, fmt.Errorf("unexpected response id=%v", id)
			}
		case int:
			if v != 1 {
				return 0, fmt.Errorf("unexpected response id=%v", id)
			}
		}
	} else {
		return 0, fmt.Errorf("no id in response: %v", resp)
	}

	return elapsed, nil
}

func writeMessage(w io.Writer, msg map[string]any) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	header := fmt.Sprintf("Content-Length: %d\r\n\r\n", len(body))
	if _, err := io.WriteString(w, header); err != nil {
		return err
	}
	_, err = w.Write(body)
	return err
}

func readMessage(r io.Reader) (map[string]any, error) {
	br := bufio.NewReader(r)
	var contentLength int
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			return nil, err
		}
		line = strings.TrimRight(line, "\r\n")
		if line == "" {
			break
		}
		if strings.HasPrefix(strings.ToLower(line), "content-length:") {
			v := strings.TrimSpace(line[len("Content-Length:"):])
			n, err := strconv.Atoi(v)
			if err != nil {
				return nil, fmt.Errorf("bad content-length: %q", v)
			}
			contentLength = n
		}
	}
	if contentLength <= 0 {
		return nil, fmt.Errorf("missing content-length")
	}
	body := make([]byte, contentLength)
	if _, err := io.ReadFull(br, body); err != nil {
		return nil, err
	}
	var msg map[string]any
	if err := json.Unmarshal(body, &msg); err != nil {
		return nil, err
	}
	return msg, nil
}
