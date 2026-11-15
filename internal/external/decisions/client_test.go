package decisions_test

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/takets/street-storyteller/internal/external/decisions"
	"github.com/takets/street-storyteller/internal/service/review"
)

// R14: the request to the decision model must equal the golden request, and
// every failure shape must be an error.

type goldenCell struct {
	Model string `json:"model"`
	Judge []struct {
		Question string   `json:"question"`
		Must     []string `json:"must"`
		Extra    string   `json:"extra"`
		Answer   string   `json:"answer"`
		Queries  []struct {
			Instructions string          `json:"instructions"`
			Request      json.RawMessage `json:"request"`
		} `json:"queries"`
	} `json:"judge"`
}

// goldenQuery rebuilds the first judge query of the golden file without going
// through the proposition loader.
func goldenQuery(t *testing.T) (review.Query, string, json.RawMessage) {
	t.Helper()
	b, err := os.ReadFile(filepath.Join("..", "..", "service", "review", "testdata", "rainkey", "golden-queries.json"))
	if err != nil {
		t.Fatal(err)
	}
	var g goldenCell
	if err := json.Unmarshal(b, &g); err != nil {
		t.Fatal(err)
	}
	c := g.Judge[0]
	q := review.Query{Name: "f", State: c.Answer, KeyState: c.Answer, Instructions: c.Queries[0].Instructions}
	return q, g.Model, c.Queries[0].Request
}

func canonical(t *testing.T, b []byte) any {
	t.Helper()
	var v any
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatalf("not JSON: %v\n%s", err, b)
	}
	return v
}

type capture struct {
	auth, contentType string
	body              []byte
	method, path      string
	calls             int
}

func server(t *testing.T, status int, response string, c *capture) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		c.calls++
		c.auth = r.Header.Get("Authorization")
		c.contentType = r.Header.Get("Content-Type")
		c.method, c.path = r.Method, r.URL.Path
		c.body, _ = io.ReadAll(r.Body)
		w.WriteHeader(status)
		io.WriteString(w, response)
	}))
	t.Cleanup(srv.Close)
	return srv
}

func TestDecisions_SendsGoldenRequestWithBearerAndReadsNoul(t *testing.T) {
	q, model, want := goldenQuery(t)
	var c capture
	srv := server(t, 200, `{"answers":{"f":{"noul":0.731}}}`, &c)
	client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "sk-test"}
	v, err := client.Decide(context.Background(), model, q)
	if err != nil || v != 0.731 {
		t.Fatalf("Decide = %v, %v", v, err)
	}
	if c.method != http.MethodPost || c.auth != "Bearer sk-test" || c.contentType != "application/json" {
		t.Errorf("method %s auth %q content-type %q", c.method, c.auth, c.contentType)
	}
	if !reflect.DeepEqual(canonical(t, c.body), canonical(t, want)) {
		t.Errorf("body differs\n got: %s\nwant: %s", c.body, want)
	}
}

func TestDecisions_NoKeyIsErrorWithoutRequest(t *testing.T) {
	q, model, _ := goldenQuery(t)
	var c capture
	srv := server(t, 200, `{"answers":{"f":{"noul":0.5}}}`, &c)
	client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: ""}
	if _, err := client.Decide(context.Background(), model, q); err == nil {
		t.Fatal("no key accepted")
	}
	if c.calls != 0 {
		t.Errorf("request sent without a key")
	}
}

func TestDecisions_Non200IsError(t *testing.T) {
	q, model, _ := goldenQuery(t)
	for _, status := range []int{401, 429, 500} {
		var c capture
		srv := server(t, status, `{"answers":{"f":{"noul":0.5}}}`, &c)
		client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "k"}
		if _, err := client.Decide(context.Background(), model, q); err == nil {
			t.Errorf("HTTP %d accepted", status)
		}
	}
}

func TestDecisions_WrongShapeIsError(t *testing.T) {
	q, model, _ := goldenQuery(t)
	for _, body := range []string{
		`not json`,
		`{}`,
		`{"answers":{}}`,
		`{"answers":{"fact":{"noul":0.5}}}`,
		`{"answers":{"f":{"noul":"0.5"}}}`,
		`{"answers":{"f":{"noul":1.5}}}`,
		`{"answers":{"f":{}}}`,
	} {
		var c capture
		srv := server(t, 200, body, &c)
		client := &decisions.Client{HTTPClient: srv.Client(), URL: srv.URL, APIKey: "k"}
		if _, err := client.Decide(context.Background(), model, q); err == nil {
			t.Errorf("accepted %s", body)
		}
	}
}

func TestDecisions_DefaultEndpointAndEnvKey(t *testing.T) {
	t.Setenv("OPENROUTER_API_KEY", "from-env")
	c := decisions.New()
	if c.APIKey != "from-env" || c.URL != "https://openrouter.ai/api/alpha/decisions" {
		t.Errorf("New() = key %q url %q", c.APIKey, c.URL)
	}
}
