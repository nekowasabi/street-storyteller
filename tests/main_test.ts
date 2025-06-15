import { testAaa } from "../main.ts";
import { assertEquals } from "jsr:@std/assert";
import { test } from "jsr:@denops/test";

Deno.test("hello world", () => {
  assertEquals(testAaa(), "ok");
});

let a = 1;

console.log("Tested!");
console.log("Tested!");
console.log("eeeeeeeeeeeeee");

a = 2;

console.log("Tested!");
console.log(a);

a = 3;

console.log(a);
