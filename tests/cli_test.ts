import { assert, assertEquals } from "./asserts.ts";
import { runCLI } from "../src/cli.ts";
import { createConsolePresenter } from "../src/cli/output_presenter.ts";
import type {
  ConfigurationManagerRef,
  LoggingServiceRef,
} from "../src/cli/types.ts";
import type { AppConfig } from "../src/shared/config/schema.ts";

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

Deno.test("CLI boot sequence resolves config before logging and command", async () => {
  setupMocks();

  try {
    mockArgs = ["help"];

    const operations: string[] = [];
    const presenter = createConsolePresenter();

    const config: AppConfig = {
      runtime: { environment: "test", paths: {} },
      logging: {
        level: "info",
        format: "human",
        color: false,
        timestamps: false,
      },
      features: {},
      cache: { defaultTtlSeconds: 900 },
      external: { providers: [] },
    };

    const configManager: ConfigurationManagerRef = {
      async resolve() {
        operations.push("config");
        return config;
      },
    };

    const loggingService: LoggingServiceRef & { initialized: boolean } = {
      initialized: false,
      async initialize() {
        await configManager.resolve();
        operations.push("logging");
        this.initialized = true;
      },
      getLogger(scope: string) {
        assert(this.initialized, "Logger requested before initialization");
        return {
          scope,
          log() {},
          trace() {},
          debug() {},
          info() {},
          warn() {},
          error() {},
          fatal() {},
          withContext() {
            return this;
          },
        };
      },
    };

    try {
      await runCLI({
        presenter,
        createConfigurationManager: () => configManager,
        loggingServiceFactory: () => loggingService,
      });
    } catch (_error) {
      assertEquals(mockExitCode, null);
    }

    const configIndex = operations.indexOf("config");
    const loggingIndex = operations.indexOf("logging");
    assert(configIndex !== -1);
    assert(loggingIndex !== -1);
    assert(configIndex < loggingIndex);
    assertEquals(loggingService.initialized, true);
  } finally {
    teardownMocks();
  }
});
