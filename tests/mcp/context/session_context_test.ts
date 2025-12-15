import { assertEquals } from "@std/assert";
import { SessionContext } from "../../../src/mcp/context/session_context.ts";

Deno.test("SessionContext - addMessage stores messages with timestamp", () => {
  const ctx = new SessionContext();

  const before = Date.now();
  ctx.addMessage("user", "Hello");
  const after = Date.now();

  const history = ctx.getHistory();
  assertEquals(history.length, 1);
  assertEquals(history[0].role, "user");
  assertEquals(history[0].content, "Hello");
  assertEquals(history[0].timestamp >= before, true);
  assertEquals(history[0].timestamp <= after, true);
});

Deno.test("SessionContext - getHistory returns all messages", () => {
  const ctx = new SessionContext();

  ctx.addMessage("system", "You are a helpful assistant");
  ctx.addMessage("user", "What is 2+2?");
  ctx.addMessage("assistant", "4");

  const history = ctx.getHistory();
  assertEquals(history.length, 3);
  assertEquals(history[0].role, "system");
  assertEquals(history[1].role, "user");
  assertEquals(history[2].role, "assistant");
});

Deno.test("SessionContext - clear removes all messages", () => {
  const ctx = new SessionContext();

  ctx.addMessage("user", "Message 1");
  ctx.addMessage("assistant", "Response 1");
  assertEquals(ctx.getHistory().length, 2);

  ctx.clear();
  assertEquals(ctx.getHistory().length, 0);
});
