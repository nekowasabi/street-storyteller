package review

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

func Resolve(ctx context.Context, req ResolveRequest, deps Deps) Report {
	r := baseReport(Clarity)
	if req.Accept == req.Reject || strings.TrimSpace(req.Why) == "" || strings.ContainsAny(req.Why, "\t\r\n") {
		return failReport(r, Usage, "judge", "", "--accept または --reject の一方と、1 行の --why が必要です")
	}
	p, err := loadProject(req.Path)
	if err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	if err := p.prepare(Clarity); err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	var current runMap
	if err := readJSON(currentPath(p.root, Clarity), &current); err != nil {
		return failReport(r, Usage, "judge", "", "今の読者の記録がありません")
	}
	if current.ReadID != p.readID(Clarity, "") {
		return failReport(r, Usage, "judge", "", "今の本文の読者の記録がありません")
	}
	answers, err := readAnswers(p, current.Run)
	if err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	declared := false
	for _, c := range p.spec.Cells() {
		if c == req.Cell {
			declared = true
		}
	}
	answer, exists := answers[req.Cell]
	if !declared || !exists {
		return failReport(r, Usage, "judge", "", "今の記録に無いセルです")
	}
	f, _ := p.spec.fact(req.Cell.Fact)
	decision := "reject"
	if req.Accept {
		decision = "accept"
	}
	resolution := Resolution{Agent: req.Cell.Agent, Fact: req.Cell.Fact, Ref: req.Cell.Ref, AnswerSHA: AnswerSHA(answer), KeySHA: KeySHA(f.Ask.Question, f.Ask.Answer), Decision: decision, Reason: req.Why}
	path := filepath.Join(p.root, "src", "reviews", "resolved.tsv")
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	d := defaults(deps)
	unlock, ok, err := acquireLock(path+".lock", d.Now())
	if err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	if !ok {
		return failReport(r, Error, "judge", "", "著者の記録を更新中です")
	}
	defer unlock()
	if err := ctx.Err(); err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	line := fmt.Sprintf("%s\t%s\t%s\t%s\t%s\t%s\t%s\n", resolution.Agent, resolution.Fact, resolution.Ref, resolution.AnswerSHA, resolution.KeySHA, resolution.Decision, resolution.Reason)
	out, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
	if err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	_, err = out.WriteString(line)
	if err == nil {
		err = out.Sync()
	}
	closeErr := out.Close()
	if err == nil {
		err = closeErr
	}
	if err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	if err := p.resolutions(answers); err != nil {
		return failReport(r, Error, "judge", "", err.Error())
	}
	r.Verdict = Done
	r.Stage = "judge"
	r.Criteria = p.spec.Criteria()
	r.Run = current.Run
	r.Findings = append(r.Findings, Finding{Severity: "info", Message: "src/reviews/resolved.tsv に記録しました。止まる条件が変わったので /goal を張り直してください"})
	return r
}
