export function assert(condition: unknown, message = "Assertion failed"): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEquals<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message ?? `Expected ${expected} but received ${actual}`);
  }
}

export function assertFalse(condition: unknown, message?: string): void {
  if (condition) {
    throw new Error(message ?? "Expected condition to be false");
  }
}
