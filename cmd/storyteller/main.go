package main

import (
	"context"
	"fmt"
	"os"

	"github.com/takets/street-storyteller/internal/cli"
)

func main() {
	ctx := context.Background()
	deps := cli.DefaultDeps()
	exitCode := cli.Run(ctx, os.Args[1:], deps)
	if exitCode != 0 {
		fmt.Fprintln(os.Stderr, "storyteller exited with code", exitCode)
	}
	os.Exit(exitCode)
}
