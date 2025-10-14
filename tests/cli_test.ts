import { assertEquals } from "./asserts.ts";
import { runCLI } from "../src/cli.ts";

// Mock Deno.args and Deno.exit for testing
let mockArgs: string[] = [];
let mockExitCode: number | null = null;

// Store original functions
const originalArgs = Deno.args;
const originalExit = Deno.exit;

function setupMocks() {
  Object.defineProperty(Deno, "args", {
    get: () => mockArgs,
    configurable: true,
  });

  Deno.exit = (code?: number) => {
    mockExitCode = code ?? 0;
    throw new Error(`Process exit with code ${mockExitCode}`);
  };
}

function teardownMocks() {
  Object.defineProperty(Deno, "args", {
    value: originalArgs,
    configurable: true,
  });
  Deno.exit = originalExit;
  mockArgs = [];
  mockExitCode = null;
}

Deno.test("CLI - help command works", async () => {
  setupMocks();

  try {
    mockArgs = ["help"];

    const originalLog = console.log;
    let logOutput = "";
    console.log = (message: string) => {
      logOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      assertEquals(mockExitCode, null);
    }

    console.log = originalLog;

    assertEquals(logOutput.includes("Street Storyteller"), true);
    assertEquals(logOutput.includes("USAGE:"), true);
    assertEquals(logOutput.includes("COMMANDS:"), true);
  } finally {
    teardownMocks();
  }
});

Deno.test("CLI - generate without name fails", async () => {
  setupMocks();

  try {
    mockArgs = ["generate"];

    const originalError = console.error;
    let errorOutput = "";
    console.error = (message: string) => {
      errorOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      assertEquals(mockExitCode, 1);
    }

    console.error = originalError;
    assertEquals(errorOutput.includes("Project name is required"), true);
  } finally {
    teardownMocks();
  }
});

Deno.test("CLI - generate with invalid template fails", async () => {
  setupMocks();

  try {
    mockArgs = ["generate", "--name", "test", "--template", "invalid"];

    const originalError = console.error;
    let errorOutput = "";
    console.error = (message: string) => {
      errorOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      assertEquals(mockExitCode, 1);
    }

    console.error = originalError;
    assertEquals(errorOutput.includes("Invalid template"), true);
    assertEquals(errorOutput.includes("invalid"), true);
  } finally {
    teardownMocks();
  }
});

Deno.test("CLI - unknown command shows help", async () => {
  setupMocks();

  try {
    mockArgs = ["unknown"];

    const originalError = console.error;
    const originalLog = console.log;
    let errorOutput = "";
    let logOutput = "";

    console.error = (message: string) => {
      errorOutput += message;
    };
    console.log = (message: string) => {
      logOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      assertEquals(mockExitCode, 1);
    }

    console.error = originalError;
    console.log = originalLog;
    assertEquals(errorOutput.includes("Unknown command"), true);
    assertEquals(logOutput.includes("USAGE:"), true);
  } finally {
    teardownMocks();
  }
});

Deno.test("CLI - short commands work", async () => {
  setupMocks();

  try {
    mockArgs = ["h"]; // short for help

    const originalLog = console.log;
    let logOutput = "";
    console.log = (message: string) => {
      logOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      // Help should not exit with error
      assertEquals(mockExitCode, null);
    }

    console.log = originalLog;
    assertEquals(logOutput.includes("Street Storyteller"), true);
  } finally {
    teardownMocks();
  }
});
