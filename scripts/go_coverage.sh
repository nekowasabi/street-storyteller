#!/usr/bin/env bash
# Why: Process-100 Wave-A N3.
#      Go coverage 集計の本実装。Process-100 段階では internal/testkit/clock package
#      のみを 70% gate とし、他 package は warning-only に倒すことで段階的に閾値
#      を上げていく方針 (Quality Commander Decision D2)。
set -euo pipefail

COVER_FILE="$(mktemp)"
trap 'rm -f "$COVER_FILE"' EXIT

# Go default fast test (external tag は除外)
go test -coverprofile="$COVER_FILE" -covermode=atomic -count=1 ./...

GATED_PKG="github.com/takets/street-storyteller/internal/testkit/clock"
THRESHOLD=70.0

# Why: go tool cover -func 出力は関数単位 (ファイルパス + 関数名 + percent)。
#      gated package のみ抽出し平均を取って package カバレッジ近似値を算出。
pct="$(go tool cover -func="$COVER_FILE" | awk -v pkg="$GATED_PKG" '
  $1 ~ pkg { gsub(/%/, "", $3); sum += $3 + 0; n++ }
  END { if (n > 0) printf "%.1f", sum / n; else printf "0.0" }
')"

echo "GO_COVERAGE_GATED_PKG=$GATED_PKG pct=${pct}% threshold=${THRESHOLD}%"

# 閾値判定
if awk -v p="$pct" -v t="$THRESHOLD" 'BEGIN { exit !(p+0 >= t+0) }'; then
  echo "PASS: $GATED_PKG coverage ${pct}% >= ${THRESHOLD}%"
else
  echo "FAIL: $GATED_PKG coverage ${pct}% < ${THRESHOLD}%"
  exit 1
fi

echo "WARN-ONLY: その他 package の閾値はまだ未設定 (Process-101 以降で段階導入)"
