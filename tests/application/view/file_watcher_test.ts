/**
 * FileWatcher テスト
 * TDD Step 1: Red - 失敗するテストを作成
 */
import { assert, assertEquals } from "../../asserts.ts";
import { FileWatcher } from "../../../src/application/view/file_watcher.ts";

Deno.test("FileWatcher - 基本構造", async (t) => {
  await t.step("FileWatcherクラスが存在する", () => {
    const watcher = new FileWatcher("/tmp", {
      onChange: () => {},
      debounceMs: 100,
    });
    assert(watcher, "FileWatcherクラスが存在すべき");
  });

  await t.step("startメソッドが存在する", () => {
    const watcher = new FileWatcher("/tmp", {
      onChange: () => {},
      debounceMs: 100,
    });
    assert(typeof watcher.start === "function", "startメソッドが存在すべき");
  });

  await t.step("stopメソッドが存在する", () => {
    const watcher = new FileWatcher("/tmp", {
      onChange: () => {},
      debounceMs: 100,
    });
    assert(typeof watcher.stop === "function", "stopメソッドが存在すべき");
  });
});

Deno.test("FileWatcher - ファイル監視機能", async (t) => {
  await t.step("指定ディレクトリの変更を検出できる", async () => {
    const tmpDir = await Deno.makeTempDir();
    let changeDetected = false;

    const watcher = new FileWatcher(tmpDir, {
      onChange: () => {
        changeDetected = true;
      },
      debounceMs: 50,
    });

    await watcher.start();

    // ファイルを作成して変更を発生させる
    await Deno.writeTextFile(`${tmpDir}/test.txt`, "Hello");

    // 変更が検出されるまで待機（デバウンス時間 + 余裕）
    await new Promise((resolve) => setTimeout(resolve, 200));

    watcher.stop();

    assert(changeDetected, "ファイル変更が検出されるべき");

    // クリーンアップ
    await Deno.remove(tmpDir, { recursive: true });
  });

  await t.step("変更時にコールバックを呼び出す", async () => {
    const tmpDir = await Deno.makeTempDir();
    let callbackCount = 0;
    const changedPaths: string[] = [];

    const watcher = new FileWatcher(tmpDir, {
      onChange: (paths) => {
        callbackCount++;
        changedPaths.push(...paths);
      },
      debounceMs: 50,
    });

    await watcher.start();

    // ファイルを作成
    await Deno.writeTextFile(`${tmpDir}/callback-test.txt`, "Test content");

    // 変更が検出されるまで待機
    await new Promise((resolve) => setTimeout(resolve, 200));

    watcher.stop();

    assert(callbackCount >= 1, "コールバックが呼び出されるべき");
    assert(
      changedPaths.some((p) => p.includes("callback-test.txt")),
      "変更されたパスが渡されるべき",
    );

    // クリーンアップ
    await Deno.remove(tmpDir, { recursive: true });
  });

  await t.step("デバウンス処理が動作する", async () => {
    const tmpDir = await Deno.makeTempDir();
    let callbackCount = 0;

    const watcher = new FileWatcher(tmpDir, {
      onChange: () => {
        callbackCount++;
      },
      debounceMs: 100,
    });

    await watcher.start();

    // 複数のファイルを素早く連続で作成
    await Deno.writeTextFile(`${tmpDir}/debounce1.txt`, "1");
    await Deno.writeTextFile(`${tmpDir}/debounce2.txt`, "2");
    await Deno.writeTextFile(`${tmpDir}/debounce3.txt`, "3");

    // デバウンス時間 + 余裕を待つ
    await new Promise((resolve) => setTimeout(resolve, 300));

    watcher.stop();

    // デバウンスにより、複数の変更が1回のコールバックにまとめられるべき
    // ただし、タイミングによっては複数回呼ばれる可能性もある
    assert(
      callbackCount >= 1 && callbackCount <= 3,
      `コールバック回数が適切であるべき (実際: ${callbackCount})`,
    );

    // クリーンアップ
    await Deno.remove(tmpDir, { recursive: true });
  });

  await t.step("stopで監視を停止できる", async () => {
    const tmpDir = await Deno.makeTempDir();
    let callbackCount = 0;

    const watcher = new FileWatcher(tmpDir, {
      onChange: () => {
        callbackCount++;
      },
      debounceMs: 50,
    });

    await watcher.start();
    watcher.stop();

    // 停止後にファイルを作成
    await Deno.writeTextFile(`${tmpDir}/after-stop.txt`, "After stop");

    // 待機
    await new Promise((resolve) => setTimeout(resolve, 200));

    assertEquals(callbackCount, 0, "停止後はコールバックが呼び出されないべき");

    // クリーンアップ
    await Deno.remove(tmpDir, { recursive: true });
  });
});
