#!/usr/bin/env bash
# Why: Process-101. Go coverage gate を全パッケージ集計の閾値方式に切替。
#      旧 Process-100 では internal/testkit/clock のみを 70% gate にしていたが、
#      E2E 削除（Process-13）の代償として UT 網羅性を担保するため、全体 70%
#      gate へ昇格。閾値は環境変数 THRESHOLD で上書き可能。
set -euo pipefail

OUT_DIR="${OUT:-./coverage}"
THRESHOLD="${THRESHOLD:-70}"

mkdir -p "$OUT_DIR"
COVER_FILE="$OUT_DIR/coverage.out"

# Why: -count=1 で test cache を無効化し常に最新の結果を計測する。
#      external タグはネットワーク依存のため default に混ぜない。
go test -coverprofile="$COVER_FILE" -covermode=atomic -count=1 ./...

# 全体カバレッジ（go tool cover -func の "total:" 行を抽出）
total="$(go tool cover -func="$COVER_FILE" | awk '/^total:/ { gsub(/%/, "", $3); print $3 + 0 }')"
echo "GO_COVERAGE_TOTAL=${total}% threshold=${THRESHOLD}%"

# HTML レポート（人間レビュー用、CI では artifact にできる）
go tool cover -html="$COVER_FILE" -o "$OUT_DIR/coverage.html"

if awk -v p="$total" -v t="$THRESHOLD" 'BEGIN { exit !(p+0 >= t+0) }'; then
  echo "PASS: total coverage ${total}% >= ${THRESHOLD}%"
else
  echo "FAIL: total coverage ${total}% < ${THRESHOLD}%"
  exit 1
fi
