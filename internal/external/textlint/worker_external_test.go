//go:build external

package textlint_test

import (
	"os/exec"
	"testing"
)

// Why: Process-100 Wave-A N3.
//
//	Quality Commander Decision D3 — external job の skip は機械検出可能ログ
//	(EXTERNAL_SKIP_REASON= プレフィックス) を必ず stdout に出力すること。
//	silent skip は「動いていない」を「動いている」と誤認させるアンチパターン。
//
//	この placeholder テストは Process-100 段階では skip ロジックの契約のみ
//	担保する。実 textlint バイナリへの E2E assert は Process-101 以降で投入。
func TestTextlintWorker_ExternalDependency(t *testing.T) {
	if _, err := exec.LookPath("textlint"); err != nil {
		t.Logf("EXTERNAL_SKIP_REASON=textlint_not_installed err=%v", err)
		t.Skip("textlint バイナリ未インストール — external 環境でのみ実行")
	}
	t.Log("textlint 検出済み — Process-101 で worker.Run() の E2E を投入予定")
}
