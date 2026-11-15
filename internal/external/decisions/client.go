package decisions

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"github.com/takets/street-storyteller/internal/service/review"
)

const Endpoint = "https://openrouter.ai/api/alpha/decisions"

type Client struct {
	HTTPClient *http.Client
	URL        string
	APIKey     string
}

func New() *Client {
	return &Client{HTTPClient: &http.Client{Timeout: 60 * time.Second}, URL: Endpoint, APIKey: os.Getenv("OPENROUTER_API_KEY")}
}
func (c *Client) Decide(ctx context.Context, model string, qs []review.Query) ([]float64, error) {
	if c.APIKey == "" {
		return nil, fmt.Errorf("OPENROUTER_API_KEY がありません")
	}
	body, err := json.Marshal(review.BundleRequest(model, qs))
	if err != nil {
		return nil, err
	}
	endpoint := c.URL
	if endpoint == "" {
		endpoint = Endpoint
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	client := c.HTTPClient
	if client == nil {
		client = &http.Client{Timeout: 60 * time.Second}
	}
	res, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("判定モデルの応答が異常です: HTTP %d", res.StatusCode)
	}
	var result struct {
		Answers map[string]struct {
			Noul *float64 `json:"noul"`
		} `json:"answers"`
	}
	dec := json.NewDecoder(io.LimitReader(res.Body, 1024*1024))
	if err := dec.Decode(&result); err != nil {
		return nil, fmt.Errorf("判定モデルの応答を読めません: %w", err)
	}
	var extra any
	if err := dec.Decode(&extra); err != io.EOF {
		return nil, fmt.Errorf("判定モデルの応答が単一の JSON ではありません")
	}
	out := make([]float64, len(qs))
	for i := range qs {
		a, ok := result.Answers[review.QuestionName(i)]
		if !ok || a.Noul == nil || *a.Noul < 0 || *a.Noul > 1 {
			return nil, fmt.Errorf("判定モデルの応答に確率がありません")
		}
		out[i] = *a.Noul
	}
	return out, nil
}

var _ review.Decider = (*Client)(nil)
