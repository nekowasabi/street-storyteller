package review

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type runMap struct {
	Root        string `json:"root"`
	Path        string `json:"path"`
	Kind        Kind   `json:"kind"`
	Instruction string `json:"instruction,omitempty"`
	Run         string `json:"run"`
	ReadID      string `json:"read_id"`
}
type StepRecord struct {
	Step    int               `json:"step"`
	Kind    string            `json:"kind"`
	File    string            `json:"file"`
	Notes   string            `json:"notes,omitempty"`
	Answers map[string]string `json:"answers,omitempty"`
	At      time.Time         `json:"at"`
}
type launchRecord struct {
	Attempts int          `json:"attempts"`
	ID       string       `json:"id"`
	Handle   LaunchHandle `json:"handle"`
	At       time.Time    `json:"at"`
	State    string       `json:"state"`
}
type launchState map[string]*launchRecord

func defaults(d Deps) Deps {
	if d.Now == nil {
		d.Now = time.Now
	}
	if d.WorkRoot == "" {
		d.WorkRoot = filepath.Join(os.TempDir(), "storyteller-review")
	}
	if d.MapRoot == "" {
		dir, err := os.UserCacheDir()
		if err == nil {
			d.MapRoot = filepath.Join(dir, "storyteller", "review", "runs")
		}
	}
	return d
}
func reviewDir(root string) string   { return filepath.Join(root, ".storyteller", "review") }
func runDir(root, run string) string { return filepath.Join(reviewDir(root), "runs", run) }
func transcriptPath(root, run, agent string) string {
	return filepath.Join(runDir(root, run), agent+".jsonl")
}
func workDir(d Deps, run, agent string) string { return filepath.Join(d.WorkRoot, run+"-"+agent) }
func currentPath(root string, kind Kind) string {
	return filepath.Join(reviewDir(root), "current-"+string(kind)+".json")
}
func readJSON(path string, v any) error {
	b, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	return json.Unmarshal(b, v)
}
func writeJSON(path string, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	f, err := os.CreateTemp(filepath.Dir(path), ".review-*")
	if err != nil {
		return err
	}
	tmp := f.Name()
	defer os.Remove(tmp)
	if err := f.Chmod(0600); err != nil {
		f.Close()
		return err
	}
	if _, err := f.Write(append(b, '\n')); err != nil {
		f.Close()
		return err
	}
	if err := f.Close(); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}
func readRecords(path string) ([]StepRecord, error) {
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 4096), 8*1024*1024)
	var out []StepRecord
	for scanner.Scan() {
		var r StepRecord
		if err := json.Unmarshal(scanner.Bytes(), &r); err != nil {
			return nil, fmt.Errorf("読者の記録: %w", err)
		}
		if r.Step != len(out)+1 {
			return nil, fmt.Errorf("読者の記録の順番が不正です")
		}
		out = append(out, r)
	}
	return out, scanner.Err()
}
func appendRecord(path string, r StepRecord) error {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return err
	}
	b, err := json.Marshal(r)
	if err != nil {
		return err
	}
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if err != nil {
		return err
	}
	_, err = f.Write(append(b, '\n'))
	if err == nil {
		err = f.Sync()
	}
	closeErr := f.Close()
	if err != nil {
		return err
	}
	return closeErr
}
func readLaunch(root, run string) (launchState, error) {
	state := launchState{}
	err := readJSON(filepath.Join(runDir(root, run), "launch.json"), &state)
	if os.IsNotExist(err) {
		err = nil
	}
	return state, err
}
func saveLaunch(root, run string, state launchState) error {
	return writeJSON(filepath.Join(runDir(root, run), "launch.json"), state)
}
func readAnswers(p *reviewProject, run string) (Answers, error) {
	out := Answers{}
	for _, a := range p.spec.Agents {
		records, err := readRecords(transcriptPath(p.root, run, a.Agent))
		if err != nil {
			return nil, err
		}
		for _, r := range records {
			ref := AskRef
			if r.Kind == "reask" {
				ref = ReaskRef
			}
			for id, answer := range r.Answers {
				out[Cell{a.Agent, id, ref}] = answer
			}
		}
	}
	return out, nil
}
func acquireLock(path string, now time.Time) (func(), bool, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0700); err != nil {
		return nil, false, err
	}
	for i := 0; i < 2; i++ {
		f, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0600)
		if err == nil {
			if err := f.Close(); err != nil {
				os.Remove(path)
				return nil, false, err
			}
			if err := os.Chtimes(path, now, now); err != nil {
				os.Remove(path)
				return nil, false, err
			}
			info, err := os.Stat(path)
			if err != nil {
				return nil, false, err
			}
			return func() {
				current, err := os.Stat(path)
				if err == nil && os.SameFile(info, current) {
					os.Remove(path)
				}
			}, true, nil
		}
		if !os.IsExist(err) {
			return nil, false, err
		}
		info, err := os.Stat(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return nil, false, err
		}
		if now.Sub(info.ModTime()) <= 5*time.Minute {
			return nil, false, nil
		}
		if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
			return nil, false, err
		}
	}
	return nil, false, nil
}
func within(path, root string) bool {
	p, err := filepath.Abs(path)
	if err != nil {
		return true
	}
	r, err := filepath.Abs(root)
	if err != nil {
		return true
	}
	rel, err := filepath.Rel(r, p)
	return err != nil || (rel != ".." && !strings.HasPrefix(rel, ".."+string(filepath.Separator)))
}
func validateRoots(p *reviewProject, d Deps) error {
	if d.MapRoot == "" || within(d.WorkRoot, p.root) || within(d.MapRoot, d.WorkRoot) {
		return fmt.Errorf("作業ディレクトリは作品の外、対応表は作業ディレクトリとその親の外に置いてください")
	}
	return nil
}
