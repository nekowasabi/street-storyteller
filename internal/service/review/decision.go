package review

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func AnswerSHA(answer string) string { return hash(answer)[:12] }
func KeySHA(question string, key Key) string {
	b, _ := json.Marshal(struct {
		Question string   `json:"question"`
		Must     []string `json:"must"`
		Extra    string   `json:"extra"`
	}{question, key.Must, key.Extra})
	return hash(string(b))[:12]
}
func ReadResolutions(path string) ([]Resolution, error) {
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var out []Resolution
	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 4096), 1024*1024)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.TrimSpace(line) == "" || strings.HasPrefix(line, "#") {
			continue
		}
		cols := strings.Split(line, "\t")
		if line == "agent\tfact\tref\tanswer_sha\tkey_sha\tdecision\treason" {
			continue
		}
		if len(cols) != 7 || (cols[5] != "accept" && cols[5] != "reject") || (cols[2] != "ask" && cols[2] != "reask") {
			return nil, fmt.Errorf("resolved.tsv の行が不正です")
		}
		out = append(out, Resolution{cols[0], cols[1], Ref(cols[2]), cols[3], cols[4], cols[5], cols[6]})
	}
	return out, scanner.Err()
}
func EffectiveResolutions(spec Spec, answers Answers, records []Resolution) []Resolution {
	latest := map[Cell]Resolution{}
	for _, r := range records {
		c := Cell{r.Agent, r.Fact, r.Ref}
		f, exists := spec.fact(r.Fact)
		answer, has := answers[c]
		if exists && has && r.AnswerSHA == AnswerSHA(answer) && r.KeySHA == KeySHA(f.Ask.Question, f.Ask.Answer) {
			latest[c] = r
		}
	}
	var out []Resolution
	for _, c := range spec.Cells() {
		if r, ok := latest[c]; ok {
			out = append(out, r)
		}
	}
	return out
}
func Decide(spec Spec, answers Answers, values Values, resolved []Resolution) Matrix {
	m := Matrix{Verdict: Pass}
	effective := EffectiveResolutions(spec, answers, resolved)
	byCell := map[Cell]Resolution{}
	for _, r := range effective {
		byCell[Cell{r.Agent, r.Fact, r.Ref}] = r
	}
	failed := false
	for _, c := range spec.Cells() {
		m.Tally.Declared++
		f, _ := spec.fact(c.Fact)
		answer, exists := answers[c]
		d := CellDecision{Cell: c, Status: "hold"}
		if !exists || strings.TrimSpace(answer) == "" {
			d.Status = "missing"
			m.Tally.Missing++
			failed = true
			m.Cells = append(m.Cells, d)
			continue
		}
		qs := AnswerQueries(spec, f, c.Ref, answer)
		complete := true
		stated := true
		for i, q := range qs {
			v, ok := values[q.Key(spec.profile().JudgeModel)]
			if !ok || !validValue(v) {
				complete = false
			}
			if i == 0 {
				d.Whole = v
				stated = stated && ok && v >= spec.profile().WholeMin
			} else {
				d.Items = append(d.Items, v)
				stated = stated && ok && v >= spec.profile().ItemMin
			}
		}
		if !complete {
			failed = true
		}
		if r, ok := byCell[c]; ok {
			d.Resolved = true
			m.Tally.Resolved++
			if r.Decision == "accept" {
				d.Status = "stated"
			} else {
				d.Status = "unknown"
			}
		} else if complete && stated {
			d.Status = "stated"
		} else if complete && strings.HasPrefix(strings.TrimSpace(answer), "不明") {
			d.Status = "unknown"
		}
		switch d.Status {
		case "stated":
			m.Tally.Stated++
		case "unknown":
			m.Tally.Unknown++
		default:
			m.Tally.Hold++
			m.Holds = append(m.Holds, Hold{c, spec.Question(f, c.Ref), answer, f.Ask.Answer, d.Whole, d.Items})
		}
		m.Cells = append(m.Cells, d)
	}
	if failed {
		m.Verdict = Error
	} else if m.Tally.Unknown > 0 {
		m.Verdict = Edit
	} else if m.Tally.Hold > 0 {
		m.Verdict = Author
	}
	return m
}
func (p *reviewProject) resolutions(answers Answers) error {
	records, err := ReadResolutions(filepath.Join(p.root, "src", "reviews", "resolved.tsv"))
	if err != nil {
		return err
	}
	p.spec.Resolved = EffectiveResolutions(p.spec, answers, records)
	return nil
}
