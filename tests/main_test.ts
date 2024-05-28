import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { test } from "../main.ts";

Deno.test("hello world", () => {
  assertEquals(test(), "ok");
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
