PREFIX ?= $(HOME)/.local
BIN_DIR ?= $(PREFIX)/bin
MODULE_PKG := github.com/takets/street-storyteller/cmd/storyteller

.PHONY: build install test
.DEFAULT_GOAL := build

# Why: build also deploys, like doctrine-mcp, so PATH never serves a stale binary.
# tmp+mv avoids "Text file busy" when the binary is running (e.g. as an LSP/MCP server).
build:
	go build -trimpath -ldflags="-s -w" -o storyteller ./cmd/storyteller
	mkdir -p $(BIN_DIR)
	cp storyteller $(BIN_DIR)/.storyteller.tmp && mv -f $(BIN_DIR)/.storyteller.tmp $(BIN_DIR)/storyteller
	# Why: PATH may resolve to a copy outside BIN_DIR. Update it only when its build metadata
	# says it came from this module, and follow symlinks instead of replacing them.
	@set -eu; \
		active_bin="$$(command -v storyteller || true)"; \
		[ -n "$$active_bin" ] && [ -f "$$active_bin" ] || exit 0; \
		[ "$$(go version -m "$$active_bin" | awk '$$1 == "path" { print $$2 }')" = "$(MODULE_PKG)" ] || exit 0; \
		cmp -s storyteller "$$active_bin" && exit 0; \
		while [ -L "$$active_bin" ]; do \
			link_target="$$(readlink "$$active_bin")"; \
			case "$$link_target" in /*) active_bin="$$link_target";; *) active_bin="$$(dirname "$$active_bin")/$$link_target";; esac; \
		done; \
		install_tmp="$$(mktemp "$$active_bin.XXXXXX")"; \
		cp -p storyteller "$$install_tmp" && mv -f "$$install_tmp" "$$active_bin"; \
		printf 'Updated active storyteller: %s\n' "$$active_bin"

install: build

test:
	go test ./...
