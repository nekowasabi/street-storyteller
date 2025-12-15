import type { OutputPresenter } from "./types.ts";

export interface PresenterOptions {
  readonly json?: boolean;
}

export function createPresenterFromArgs(options: PresenterOptions): OutputPresenter {
  if (options.json === true) {
    return createJsonOutputPresenter();
  }
  return createConsolePresenter();
}

export function createConsolePresenter(): OutputPresenter {
  return {
    showInfo(message: string) {
      console.log(message);
    },
    showSuccess(message: string) {
      console.log(message);
    },
    showWarning(message: string) {
      console.warn(message);
    },
    showError(message: string) {
      console.error(message);
    },
  };
}

export interface JsonOutput {
  readonly type: "info" | "success" | "warning" | "error";
  readonly message: string;
  readonly timestamp: string;
}

export function createJsonOutputPresenter(): OutputPresenter {
  const outputJson = (type: JsonOutput["type"], message: string): void => {
    const output: JsonOutput = {
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    console.log(JSON.stringify(output));
  };

  return {
    showInfo(message: string) {
      outputJson("info", message);
    },
    showSuccess(message: string) {
      outputJson("success", message);
    },
    showWarning(message: string) {
      outputJson("warning", message);
    },
    showError(message: string) {
      outputJson("error", message);
    },
  };
}
