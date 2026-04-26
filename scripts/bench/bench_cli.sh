#!/usr/bin/env bash
# Bench: CLI startup latency.
# Why: Process 100 quality gate — verify CLI commands run in <100ms.
# Uses ns-precision timing via `date +%s%N` (sub-ms accuracy on Linux);
# /usr/bin/time -f %e was tried but only has 10ms resolution.

set -eu

ROOT="$(cd -- "$(dirname -- "$0")/../.." && pwd)"
cd "$ROOT"

BIN="${STORYTELLER_BIN:-$ROOT/dist/storyteller}"
RUNS="${RUNS:-10}"
SAMPLE_PROJECT="${SAMPLE_PROJECT:-$ROOT/samples/cinderella}"
FORMAT="${FORMAT:-tsv}"   # tsv|json
TARGET_MS="${TARGET_MS:-100}"

if [ ! -x "$BIN" ]; then
  echo "binary not found: $BIN" >&2
  echo "build it first: go build -trimpath -ldflags='-s -w' -o dist/storyteller ./cmd/storyteller" >&2
  exit 2
fi

# Each entry: "label|command-args"
# Why: storyteller has subcommand 'version' (no --version flag); 'help' alone
# prints registry usage. 'meta check' against a real sample exercises tsparse.
TARGETS=(
  "version|version"
  "help|help"
  "meta_check|meta check --path $SAMPLE_PROJECT"
  "view_help|view --help"
)

# Measure single command in milliseconds (integer, ns→ms).
measure_ms() {
  local cmd="$1"
  local s e
  s=$(date +%s%N)
  $BIN $cmd >/dev/null 2>&1 || true
  e=$(date +%s%N)
  echo $(( (e - s) / 1000000 ))
}

stats() {
  # stdin: one ms value per line (integer). Prints: mean median p95
  awk '
    {a[NR]=$1; s+=$1}
    END{
      if (NR==0){print "0 0 0"; exit}
      n=NR
      # sort ascending (insertion sort, n<=runs <=100)
      for (i=2;i<=n;i++){k=a[i]; j=i-1; while(j>=1 && a[j]>k){a[j+1]=a[j]; j--}; a[j+1]=k}
      mean=s/n
      med=(n%2==1)?a[(n+1)/2]:(a[n/2]+a[n/2+1])/2.0
      idx=int(0.95*(n-1)+0.5)+1; if (idx<1) idx=1; if (idx>n) idx=n
      p95=a[idx]
      printf "%.1f %.1f %d", mean, med, p95
    }'
}

echo "# storyteller CLI bench"
echo "# binary : $BIN"
echo "# runs   : $RUNS"
echo "# target : <${TARGET_MS}ms"
echo "# date   : $(date -Iseconds)"
echo

if [ "$FORMAT" = "json" ]; then
  echo "{"
  echo "  \"binary\": \"$BIN\","
  echo "  \"runs\": $RUNS,"
  echo "  \"target_ms\": $TARGET_MS,"
  echo "  \"results\": ["
fi

if [ "$FORMAT" = "tsv" ]; then
  printf "label\truns\tmean_ms\tmedian_ms\tp95_ms\ttarget_ms\tstatus\n"
fi

overall_pass=0
first=1
for spec in "${TARGETS[@]}"; do
  label="${spec%%|*}"
  args="${spec#*|}"
  # Warmup once (page cache, dynamic linker) — not counted.
  $BIN $args >/dev/null 2>&1 || true

  samples_file=$(mktemp)
  for i in $(seq 1 "$RUNS"); do
    measure_ms "$args" >> "$samples_file"
  done

  read -r mean median p95 <<<"$(stats < "$samples_file")"
  rm -f "$samples_file"

  status="PASS"
  ng=$(awk -v m="$mean" -v t="$TARGET_MS" 'BEGIN{print (m<=t)?0:1}')
  if [ "$ng" = "1" ]; then
    status="FAIL"
    overall_pass=1
  fi

  if [ "$FORMAT" = "tsv" ]; then
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "$label" "$RUNS" "$mean" "$median" "$p95" "$TARGET_MS" "$status"
  else
    [ $first -eq 0 ] && echo "    ,"
    first=0
    cat <<EOF
    {"label": "$label", "runs": $RUNS, "mean_ms": $mean, "median_ms": $median, "p95_ms": $p95, "status": "$status"}
EOF
  fi
done

if [ "$FORMAT" = "json" ]; then
  echo "  ]"
  echo "}"
fi

exit $overall_pass
