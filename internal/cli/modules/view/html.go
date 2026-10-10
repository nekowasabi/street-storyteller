package view

import (
	"html/template"
	"io"
)

// htmlItem is one card in the HTML view (timeline event, plot beat, ...).
type htmlItem struct {
	Title   string
	Meta    string
	Summary string
}

// Why: kind ごとにテンプレートを持たず、(title, meta, summary) のカード列へ
// 正規化して 1 枚のテンプレートで描画する。html/template が全値をエスケープする。
var entityHTML = template.Must(template.New("entity").Parse(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>{{.Name}}</title>
<style>
body{font-family:sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#222}
.kind{color:#888;font-size:.85rem}
ol{list-style:none;padding:0;border-left:3px solid #ccc;margin-left:.5rem}
li{margin:0 0 1rem 1rem;padding:.5rem .75rem;background:#f6f6f6;border-radius:4px}
.meta{color:#666;font-size:.85rem}
</style></head><body>
<p class="kind">{{.Kind}} / {{.ID}}</p>
<h1>{{.Name}}</h1>
<p>{{.Summary}}</p>
{{if .Items}}<ol>
{{range .Items}}<li><strong>{{.Title}}</strong>{{if .Meta}} <span class="meta">{{.Meta}}</span>{{end}}{{if .Summary}}<br>{{.Summary}}{{end}}</li>
{{end}}</ol>{{end}}
</body></html>
`))

type htmlPage struct {
	Kind, ID, Name, Summary string
	Items                   []htmlItem
}

func writeEntityHTML(w io.Writer, kind string, row summaryRow) error {
	return entityHTML.Execute(w, htmlPage{Kind: kind, ID: row.ID, Name: row.Name, Summary: row.Summary, Items: row.items})
}
