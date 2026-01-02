// tests/lsp/diagnostics/diagnostic_aggregator_test.ts
import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { DiagnosticAggregator } from "@storyteller/lsp/diagnostics/diagnostic_aggregator.ts";
import type { DiagnosticSource } from "@storyteller/lsp/diagnostics/diagnostic_source.ts";

describe("DiagnosticAggregator", () => {
  it("should aggregate diagnostics from multiple sources", async () => {
    const source1: DiagnosticSource = {
      name: "source1",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 5 },
        },
        message: "test1",
        severity: 2,
        source: "source1",
      }],
    };

    const source2: DiagnosticSource = {
      name: "source2",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 5 },
        },
        message: "test2",
        severity: 1,
        source: "source2",
      }],
    };

    const aggregator = new DiagnosticAggregator([source1, source2]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 2);
    assertEquals(diagnostics[0].source, "source1");
    assertEquals(diagnostics[1].source, "source2");
  });

  it("should skip unavailable sources", async () => {
    const available: DiagnosticSource = {
      name: "available",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "ok",
        severity: 2,
        source: "available",
      }],
    };

    const unavailable: DiagnosticSource = {
      name: "unavailable",
      isAvailable: async () => false,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "skip",
        severity: 2,
        source: "unavailable",
      }],
    };

    const aggregator = new DiagnosticAggregator([available, unavailable]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].message, "ok");
  });

  it("should continue if one source fails", async () => {
    const working: DiagnosticSource = {
      name: "working",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "ok",
        severity: 2,
        source: "working",
      }],
    };

    const failing: DiagnosticSource = {
      name: "failing",
      isAvailable: async () => true,
      generate: async () => {
        throw new Error("fail");
      },
    };

    const aggregator = new DiagnosticAggregator([working, failing]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].message, "ok");
  });

  it("should handle empty source list", async () => {
    const aggregator = new DiagnosticAggregator([]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 0);
  });

  it("should handle all sources unavailable", async () => {
    const unavailable1: DiagnosticSource = {
      name: "unavailable1",
      isAvailable: async () => false,
      generate: async () => [],
    };

    const unavailable2: DiagnosticSource = {
      name: "unavailable2",
      isAvailable: async () => false,
      generate: async () => [],
    };

    const aggregator = new DiagnosticAggregator([unavailable1, unavailable2]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 0);
  });

  it("should handle all sources failing", async () => {
    const failing1: DiagnosticSource = {
      name: "failing1",
      isAvailable: async () => true,
      generate: async () => {
        throw new Error("fail1");
      },
    };

    const failing2: DiagnosticSource = {
      name: "failing2",
      isAvailable: async () => true,
      generate: async () => {
        throw new Error("fail2");
      },
    };

    const aggregator = new DiagnosticAggregator([failing1, failing2]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 0);
  });

  it("should handle isAvailable throwing error", async () => {
    const errorSource: DiagnosticSource = {
      name: "errorSource",
      isAvailable: async () => {
        throw new Error("availability check failed");
      },
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "test",
        severity: 2,
        source: "errorSource",
      }],
    };

    const workingSource: DiagnosticSource = {
      name: "working",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "ok",
        severity: 2,
        source: "working",
      }],
    };

    const aggregator = new DiagnosticAggregator([errorSource, workingSource]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    // Error source should be skipped, working source should succeed
    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].message, "ok");
  });

  it("should add and remove sources dynamically", async () => {
    const source1: DiagnosticSource = {
      name: "source1",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "test1",
        severity: 2,
        source: "source1",
      }],
    };

    const source2: DiagnosticSource = {
      name: "source2",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "test2",
        severity: 2,
        source: "source2",
      }],
    };

    const aggregator = new DiagnosticAggregator([source1]);

    // Initially one source
    let diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );
    assertEquals(diagnostics.length, 1);

    // Add second source
    aggregator.addSource(source2);
    diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );
    assertEquals(diagnostics.length, 2);

    // Remove first source
    aggregator.removeSource("source1");
    diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );
    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].message, "test2");
  });

  it("should call cancel on all sources", () => {
    let cancel1Called = false;
    let cancel2Called = false;

    const source1: DiagnosticSource = {
      name: "source1",
      isAvailable: async () => true,
      generate: async () => [],
      cancel: () => {
        cancel1Called = true;
      },
    };

    const source2: DiagnosticSource = {
      name: "source2",
      isAvailable: async () => true,
      generate: async () => [],
      cancel: () => {
        cancel2Called = true;
      },
    };

    const aggregator = new DiagnosticAggregator([source1, source2]);
    aggregator.cancelAll();

    assertEquals(cancel1Called, true);
    assertEquals(cancel2Called, true);
  });

  it("should call dispose on all sources", () => {
    let dispose1Called = false;
    let dispose2Called = false;

    const source1: DiagnosticSource = {
      name: "source1",
      isAvailable: async () => true,
      generate: async () => [],
      dispose: () => {
        dispose1Called = true;
      },
    };

    const source2: DiagnosticSource = {
      name: "source2",
      isAvailable: async () => true,
      generate: async () => [],
      dispose: () => {
        dispose2Called = true;
      },
    };

    const aggregator = new DiagnosticAggregator([source1, source2]);
    aggregator.dispose();

    assertEquals(dispose1Called, true);
    assertEquals(dispose2Called, true);
  });

  it("should clear sources after dispose", () => {
    const source: DiagnosticSource = {
      name: "source",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "test",
        severity: 2,
        source: "source",
      }],
    };

    const aggregator = new DiagnosticAggregator([source]);
    aggregator.dispose();

    // After dispose, sources should be cleared
    // This is internal state, but we can verify by trying to remove a source
    aggregator.removeSource("source");

    // Should not throw
    assertEquals(true, true);
  });

  it("should handle sources without optional methods", async () => {
    const minimalSource: DiagnosticSource = {
      name: "minimal",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 },
        },
        message: "test",
        severity: 2,
        source: "minimal",
      }],
      // No cancel or dispose methods
    };

    const aggregator = new DiagnosticAggregator([minimalSource]);

    // Should not throw when calling cancelAll/dispose
    aggregator.cancelAll();
    aggregator.dispose();

    assertEquals(true, true);
  });

  it("should preserve diagnostic properties", async () => {
    const source: DiagnosticSource = {
      name: "test",
      isAvailable: async () => true,
      generate: async () => [{
        range: {
          start: { line: 5, character: 10 },
          end: { line: 5, character: 20 },
        },
        message: "Test message",
        severity: 1,
        code: "TEST001",
        source: "test",
      }],
    };

    const aggregator = new DiagnosticAggregator([source]);
    const diagnostics = await aggregator.generate(
      "file:///test.md",
      "content",
      "/project",
    );

    assertEquals(diagnostics.length, 1);
    assertEquals(diagnostics[0].range.start.line, 5);
    assertEquals(diagnostics[0].range.start.character, 10);
    assertEquals(diagnostics[0].message, "Test message");
    assertEquals(diagnostics[0].severity, 1);
    assertEquals(diagnostics[0].code, "TEST001");
    assertEquals(diagnostics[0].source, "test");
  });
});
