import { assert } from "@storyteller/test_utils/assert.ts";
import { MyStory } from "@storyteller/story.ts";

Deno.test("Story validation", () => {
  const story = new MyStory();
  assert(story.validate(), "Story should validate");
});

Deno.test("Story has required elements", () => {
  const story = new MyStory();
  assert(story.purpose.description.length > 0, "Purpose should be described");
  assert(story.funs.length > 0, "At least one fun element expected");
  assert(story.charcters.length > 0, "At least one character expected");
});
