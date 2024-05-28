import { Purpose } from "./type/purpose.ts";
import { Character } from "./type/character.ts";
import { Plot } from "./type/plot.ts";
import { Chapter } from "./type/chapter.ts";
import { StoryStructure } from "./type/story_structure.ts";
import { TimeLine } from "./type/timeline.ts";
import { Fun } from "./type/fun.ts";
import { Setting } from "./type/setting.ts";
import { Theme } from "./type/theme.ts";

// MEMO: 登場人物が思惑を超えて動き出したときにどう対応できるか？

// MEMO: 妥協の要素を入れる
// MEMO: 整合性の要素を入れる（あるシーンでは整合性取れているけど、あるシーンでは取れなくなるのを防ぐには？ユニットテストとして実現したい）

export interface StoryTeller {
  // 表現したいことは1つだけに絞る
  purpose: Purpose;

  // メインの面白さは1つだが、サブの面白さは複数ある
  funs: Fun[];

  // テーマは複数ある（ない場合もある）
  themes?: Theme[];

  // 配列ではあるけど順不同を許容（サイドストーリーとか）
  storyStructures?: StoryStructure[];

  // チャプターと時系列が関連付けられるか検証する
  timelines?: TimeLine[];

  // 全体を通した登場人物と、チャプターごとの登場人物を区別する必要はあるか？
  // Guest型にする？
  charcters: Character[];

  settings: Setting[];

  // チャプターに複数のプロットが紐付く
  chapters: Chapter[];

  // プロットにはサブプロットがありうる
  plots: Plot[];

  // 検証: お話が定義した要素を満たしているか
  validate(): boolean;

  // markdownで出力するのを想定
  output(): void;
}
