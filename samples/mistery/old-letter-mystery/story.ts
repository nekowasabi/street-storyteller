import { StoryTeller } from "@storyteller/src/storyteller_interface.ts";
import { Purpose } from "@storyteller/src/type/purpose.ts";
import { Character } from "@storyteller/src/type/character.ts";
import { Plot } from "@storyteller/src/type/plot.ts";
import { Chapter } from "@storyteller/src/type/chapter.ts";
import { Fun } from "@storyteller/src/type/fun.ts";
import { Setting } from "@storyteller/src/type/setting.ts";

export class MyStory implements StoryTeller {
  purpose: Purpose = {
    description: "Your story's main purpose here",
  };

  funs: Fun[] = [
    { description: "Main entertainment element" },
  ];

  charcters: Character[] = [
    { name: "Main character" },
  ];

  settings: Setting[] = [
    { description: "Main setting" },
  ];

  chapters: Chapter[] = [
    { description: "Chapter 1" },
  ];

  plots: Plot[] = [
    { description: "Main plot" },
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
