PREFIX ?= $(HOME)/.local

.PHONY: build install test

build:
	go build -trimpath -ldflags="-s -w" -o storyteller ./cmd/storyteller

install: build
	install -Dm755 storyteller $(PREFIX)/bin/storyteller

test:
	go test ./...
