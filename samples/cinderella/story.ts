import { Purpose } from "@storyteller/types/purpose.ts";
import { Character } from "@storyteller/types/character.ts";
import { Plot } from "@storyteller/types/plot.ts";
import { Chapter } from "@storyteller/types/chapter.ts";
import { Fun } from "@storyteller/types/fun.ts";
import { Setting } from "@storyteller/types/setting.ts";

interface StoryTeller {
  validate(): boolean;
  output(): void;
}

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
