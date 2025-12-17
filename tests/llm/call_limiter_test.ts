/**
 * LLM Call Limiter テスト
 *
 * API呼び出し回数の制限機能をテスト
 */
import { assert, assertEquals } from "@std/assert";
import { CallLimiter } from "../../src/llm/safety/call_limiter.ts";

Deno.test("CallLimiter - 基本動作", async (t) => {
  await t.step("上限内の呼び出しは許可される", () => {
    const limiter = new CallLimiter({ maxCalls: 5 });

    for (let i = 0; i < 5; i++) {
      const result = limiter.tryCall();
      assert(result.ok, `呼び出し ${i + 1} は許可されるべき`);
    }
  });

  await t.step("上限を超えた呼び出しは拒否される", () => {
    const limiter = new CallLimiter({ maxCalls: 3 });

    // 3回は成功
    for (let i = 0; i < 3; i++) {
      limiter.tryCall();
    }

    // 4回目は失敗
    const result = limiter.tryCall();
    assert(!result.ok, "上限を超えた呼び出しは拒否されるべき");
    if (!result.ok) {
      assertEquals(result.error.code, "call_limit_exceeded");
    }
  });

  await t.step("現在の呼び出し回数を取得できる", () => {
    const limiter = new CallLimiter({ maxCalls: 10 });

    assertEquals(limiter.getCurrentCount(), 0);

    limiter.tryCall();
    assertEquals(limiter.getCurrentCount(), 1);

    limiter.tryCall();
    assertEquals(limiter.getCurrentCount(), 2);
  });

  await t.step("残り呼び出し回数を取得できる", () => {
    const limiter = new CallLimiter({ maxCalls: 5 });

    assertEquals(limiter.getRemainingCalls(), 5);

    limiter.tryCall();
    assertEquals(limiter.getRemainingCalls(), 4);

    limiter.tryCall();
    limiter.tryCall();
    assertEquals(limiter.getRemainingCalls(), 2);
  });

  await t.step("リセットで呼び出し回数がクリアされる", () => {
    const limiter = new CallLimiter({ maxCalls: 3 });

    limiter.tryCall();
    limiter.tryCall();
    limiter.tryCall();

    assertEquals(limiter.getRemainingCalls(), 0);

    limiter.reset();

    assertEquals(limiter.getCurrentCount(), 0);
    assertEquals(limiter.getRemainingCalls(), 3);
  });
});

Deno.test("CallLimiter - 警告機能", async (t) => {
  await t.step("警告閾値に達したらコールバックが呼ばれる", () => {
    let warningCalled = false;
    let warningRemaining = 0;

    const limiter = new CallLimiter({
      maxCalls: 10,
      warningThreshold: 3, // 残り3回以下で警告
      onWarning: (remaining) => {
        warningCalled = true;
        warningRemaining = remaining;
      },
    });

    // 6回呼び出し（残り4回）- まだ警告なし
    for (let i = 0; i < 6; i++) {
      limiter.tryCall();
    }

    assert(!warningCalled, "残り4回ではまだ警告は呼ばれないべき");

    // 7回目（残り3回）で警告
    limiter.tryCall();

    assert(warningCalled, "残り3回で警告が呼ばれるべき");
    assertEquals(warningRemaining, 3);
  });
});

Deno.test("CallLimiter - 時間ベースの制限", async (t) => {
  await t.step("時間窓内の呼び出し制限", async () => {
    const limiter = new CallLimiter({
      maxCalls: 3,
      timeWindowMs: 100, // 100ms窓
    });

    // 3回は成功
    limiter.tryCall();
    limiter.tryCall();
    limiter.tryCall();

    // 4回目は失敗
    const result = limiter.tryCall();
    assert(!result.ok, "時間窓内で上限を超えた呼び出しは拒否されるべき");

    // 時間窓が過ぎるのを待つ
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 新しい窓では成功
    const newResult = limiter.tryCall();
    assert(newResult.ok, "新しい時間窓では呼び出しが許可されるべき");
  });
});

Deno.test("CallLimiter - 無制限モード", async (t) => {
  await t.step("maxCalls が 0 または undefined の場合は無制限", () => {
    const limiter = new CallLimiter({ maxCalls: 0 });

    // 大量の呼び出しも許可される
    for (let i = 0; i < 100; i++) {
      const result = limiter.tryCall();
      assert(result.ok, `無制限モードでは呼び出し ${i + 1} も許可されるべき`);
    }
  });
});
