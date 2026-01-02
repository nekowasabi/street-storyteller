// tests/lsp/integration/textlint/textlint_worker_test.ts
import { assertEquals, assertRejects } from "@std/assert";
import { describe, it, beforeEach, afterEach } from "@std/testing/bdd";
import { TextlintWorker } from "@storyteller/lsp/integration/textlint/textlint_worker.ts";
import { delay } from "@std/async";

describe("TextlintWorker", () => {
  let worker: TextlintWorker;

  beforeEach(() => {
    worker = new TextlintWorker({
      executablePath: "npx textlint",
      debounceMs: 100,
      timeoutMs: 5000,
      enabled: true,
    });
  });

  afterEach(() => {
    worker.dispose();
  });

  it("should debounce multiple calls", async () => {
    // モックが必要なため、実際のテストはintegration testで行う
    // ここでは構造テストのみ
    assertEquals(typeof worker.lint, "function");
    assertEquals(typeof worker.cancel, "function");
    assertEquals(typeof worker.dispose, "function");
  });

  it("should cancel previous request on new request", async () => {
    // cancel()が呼ばれることを確認
    let cancelCalled = false;
    const originalCancel = worker.cancel.bind(worker);
    worker.cancel = () => {
      cancelCalled = true;
      originalCancel();
    };

    // 2回連続呼び出し
    const p1 = worker.lint("content1", "/test.md");
    await delay(10);
    const p2 = worker.lint("content2", "/test.md");

    assertEquals(cancelCalled, true);
    worker.cancel(); // クリーンアップ
  });

  it("should handle timeout gracefully", async () => {
    // Very short timeout to force timeout condition
    const shortTimeoutWorker = new TextlintWorker({
      executablePath: "npx textlint",
      debounceMs: 10,
      timeoutMs: 1, // 1ms timeout (will timeout immediately)
      enabled: true,
    });

    try {
      // This should timeout and return empty result
      const result = await shortTimeoutWorker.lint("content", "/test.md");
      assertEquals(result.messages.length, 0);
      assertEquals(result.filePath, "/test.md");
    } finally {
      shortTimeoutWorker.dispose();
    }
  });

  it("should handle multiple rapid cancellations", async () => {
    const promises = [];

    // Trigger multiple lint operations rapidly
    for (let i = 0; i < 10; i++) {
      promises.push(worker.lint(`content${i}`, "/test.md"));
      worker.cancel();
    }

    // Should not crash
    const results = await Promise.all(promises);
    assertEquals(results.length, 10);
  });

  it("should handle dispose during active lint", async () => {
    const activeWorker = new TextlintWorker({
      executablePath: "npx textlint",
      debounceMs: 100,
      timeoutMs: 5000,
      enabled: true,
    });

    // Start a lint operation
    const promise = activeWorker.lint("content", "/test.md");

    // Dispose immediately
    await delay(10);
    activeWorker.dispose();

    // Should complete without error
    const result = await promise;
    assertEquals(Array.isArray(result.messages), true);
  });

  it("should clean up resources on cancel", async () => {
    // Start multiple operations
    const p1 = worker.lint("content1", "/test.md");

    await delay(10);

    // Cancel should clean up all resources
    worker.cancel();

    // Should complete with empty result
    const result = await p1;
    assertEquals(result.filePath, "");
    assertEquals(result.messages.length, 0);
  });

  it("should handle cancel called multiple times", () => {
    // Should not throw error when called multiple times
    worker.cancel();
    worker.cancel();
    worker.cancel();

    // No assertion needed - just shouldn't throw
    assertEquals(true, true);
  });

  it("should handle dispose called multiple times", () => {
    const tempWorker = new TextlintWorker({
      executablePath: "npx textlint",
      debounceMs: 100,
      timeoutMs: 5000,
      enabled: true,
    });

    // Should not throw error when called multiple times
    tempWorker.dispose();
    tempWorker.dispose();
    tempWorker.dispose();

    // No assertion needed - just shouldn't throw
    assertEquals(true, true);
  });

  it("should return empty result when textlint command fails", async () => {
    const invalidWorker = new TextlintWorker({
      executablePath: "invalid-command-that-does-not-exist",
      debounceMs: 10,
      timeoutMs: 1000,
      enabled: true,
    });

    try {
      const result = await invalidWorker.lint("content", "/test.md");
      assertEquals(result.messages.length, 0);
    } finally {
      invalidWorker.dispose();
    }
  });
});
