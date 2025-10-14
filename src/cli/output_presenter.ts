import type { OutputPresenter } from "./types.ts";

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
