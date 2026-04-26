import { join } from "@std/path";
import { toFileUrl } from "@std/path";

Deno.test("import debug", async () => {
  const absPath = join(
    Deno.cwd(),
    "samples/cinderella/src/foreshadowings/ガラスの靴の伏線.ts",
  );
  const url = toFileUrl(absPath).href;
  console.log("URL:", url);
  try {
    const mod = await import(url);
    console.log("import OK, keys:", Object.keys(mod));
    for (const [k, v] of Object.entries(mod)) {
      console.log(" key:", k, "value:", JSON.stringify(v).substring(0, 100));
    }
  } catch (e) {
    console.log("import FAILED:", e);
  }
});
