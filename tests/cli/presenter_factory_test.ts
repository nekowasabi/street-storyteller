/**
 * PresenterFactoryテスト
 * Process100 Sub2: OutputPresenterのファクトリパターンのテスト
 *
 * TDD Red Phase: ファクトリパターンのテスト
 */

import { assertEquals, assertExists } from "@std/assert";
import type { OutputPresenter } from "../../src/cli/types.ts";

// ===== ファクトリ関数テスト =====

Deno.test("PresenterFactory - createPresenter returns console presenter by default", async () => {
  const { PresenterFactory } = await import(
    "../../src/cli/presenter_factory.ts"
  );

  const factory = new PresenterFactory();
  const presenter = factory.createPresenter({});

  assertExists(presenter);
  assertExists(presenter.showInfo);
  assertExists(presenter.showSuccess);
  assertExists(presenter.showWarning);
  assertExists(presenter.showError);
});

Deno.test("PresenterFactory - createPresenter returns json presenter when json option is true", async () => {
  const { PresenterFactory } = await import(
    "../../src/cli/presenter_factory.ts"
  );

  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const factory = new PresenterFactory();
    const presenter = factory.createPresenter({ json: true });

    presenter.showInfo("test message");
    assertEquals(logs.length, 1);

    // JSON形式で出力されることを確認
    const parsed = JSON.parse(logs[0]);
    assertEquals(parsed.type, "info");
    assertEquals(parsed.message, "test message");
  } finally {
    console.log = originalLog;
  }
});

Deno.test("PresenterFactory - createPresenter returns console presenter when json option is false", async () => {
  const { PresenterFactory } = await import(
    "../../src/cli/presenter_factory.ts"
  );

  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => logs.push(msg);

  try {
    const factory = new PresenterFactory();
    const presenter = factory.createPresenter({ json: false });

    presenter.showInfo("test message");
    assertEquals(logs.length, 1);

    // プレーンテキストで出力されることを確認
    assertEquals(logs[0], "test message");
  } finally {
    console.log = originalLog;
  }
});

// ===== デフォルトファクトリテスト =====

Deno.test("getDefaultPresenterFactory - returns singleton instance", async () => {
  const { getDefaultPresenterFactory } = await import(
    "../../src/cli/presenter_factory.ts"
  );

  const factory1 = getDefaultPresenterFactory();
  const factory2 = getDefaultPresenterFactory();

  assertEquals(factory1, factory2);
});

// ===== PresenterType列挙テスト =====

Deno.test("PresenterType - has console and json types", async () => {
  const { PresenterType } = await import(
    "../../src/cli/presenter_factory.ts"
  );

  assertExists(PresenterType.CONSOLE);
  assertExists(PresenterType.JSON);
});

Deno.test("PresenterFactory - createPresenterByType returns correct presenter", async () => {
  const { PresenterFactory, PresenterType } = await import(
    "../../src/cli/presenter_factory.ts"
  );

  const factory = new PresenterFactory();

  const consolePresenter = factory.createPresenterByType(PresenterType.CONSOLE);
  assertExists(consolePresenter);

  const jsonPresenter = factory.createPresenterByType(PresenterType.JSON);
  assertExists(jsonPresenter);
});

// ===== 後方互換性テスト =====

Deno.test("createPresenterFromArgs - remains available for backward compatibility", async () => {
  const { createPresenterFromArgs } = await import(
    "../../src/cli/output_presenter.ts"
  );

  // 既存の関数がまだ使用可能であることを確認
  const presenter = createPresenterFromArgs({ json: false });
  assertExists(presenter);
  assertExists(presenter.showInfo);
});
