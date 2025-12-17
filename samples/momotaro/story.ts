import { StoryTeller } from "../src/storyteller_interface.ts";
import { Purpose } from "../src/type/purpose.ts";
import { Character } from "../src/type/character.ts";
import { Plot } from "../src/type/plot.ts";
import { Chapter } from "../src/type/chapter.ts";
import { Fun } from "../src/type/fun.ts";
import { Setting } from "../src/type/setting.ts";

export class MyStory implements StoryTeller {
  purpose: Purpose = {
    description: "Your story's main purpose here"
  };

  funs: Fun[] = [
    { description: "Main entertainment element" }
  ];

  charcters: Character[] = [
    { name: "Main character" }
  ];

  settings: Setting[] = [
    { description: "Main setting" }
  ];

  chapters: Chapter[] = [
    { description: "Chapter 1" }
  ];

  plots: Plot[] = [
    { description: "Main plot" }
  ];

  validate(): boolean {
    return true;
  }

  output(): void {
    console.log("Story structure output");
  }
}

const myStory = new MyStory();
console.log("Story validation:", myStory.validate());
myStory.output();
