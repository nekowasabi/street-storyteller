import { assertEquals } from "jsr:@std/assert";
import { runCLI } from "../src/cli.ts";

// Mock Deno.args and Deno.exit for testing
let mockArgs: string[] = [];
let mockExitCode: number | null = null;

// Store original functions
const originalArgs = Deno.args;
const originalExit = Deno.exit;

function setupMocks() {
  // Mock Deno.args
  Object.defineProperty(Deno, "args", {
    get: () => mockArgs,
    configurable: true,
  });

  // Mock Deno.exit
  Deno.exit = (code?: number) => {
    mockExitCode = code ?? 0;
    throw new Error(`Process exit with code ${mockExitCode}`);
  };
}

function teardownMocks() {
  // Restore original functions
  Object.defineProperty(Deno, "args", {
    value: originalArgs,
    configurable: true,
  });
  Deno.exit = originalExit;

  // Reset mock state
  mockArgs = [];
  mockExitCode = null;
}

Deno.test("CLI - help command works", async () => {
  setupMocks();

  try {
    mockArgs = ["help"];

    // Capture console output
    const originalLog = console.log;
    let logOutput = "";
    console.log = (message: string) => {
      logOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      // Expected to throw due to mocked exit
      assertEquals(mockExitCode, null); // help doesn't exit with error
    }

    // Restore console.log
    console.log = originalLog;

    // Test help output contains expected content
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

    // Capture console output
    const originalError = console.error;
    let errorOutput = "";
    console.error = (message: string) => {
      errorOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      // Expected to throw due to mocked exit
      assertEquals(mockExitCode, 1);
    }

    // Restore console.error
    console.error = originalError;

    // Test error message
    assertEquals(errorOutput.includes("Project name is required"), true);
  } finally {
    teardownMocks();
  }
});

Deno.test("CLI - generate with invalid template fails", async () => {
  setupMocks();

  try {
    mockArgs = ["generate", "--name", "test", "--template", "invalid"];

    // Capture console output
    const originalError = console.error;
    let errorOutput = "";
    console.error = (message: string) => {
      errorOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      // Expected to throw due to mocked exit
      assertEquals(mockExitCode, 1);
    }

    // Restore console.error
    console.error = originalError;

    // Test error message
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

    // Capture console output
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
      // Expected to throw due to mocked exit
      assertEquals(mockExitCode, 1);
    }

    // Restore console functions
    console.error = originalError;
    console.log = originalLog;

    // Test that unknown command error is shown and help is displayed
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

    // Capture console output
    const originalLog = console.log;
    let logOutput = "";
    console.log = (message: string) => {
      logOutput += message;
    };

    try {
      await runCLI();
    } catch (_error) {
      // Expected to throw due to mocked exit, but not with error code
    }

    // Restore console.log
    console.log = originalLog;

    // Test help output contains expected content
    assertEquals(logOutput.includes("Street Storyteller"), true);
  } finally {
    teardownMocks();
  }
});
