import { StoryTeller } from "./src/storyteller_interface.ts";
import { Purpose } from "./src/type/purpose.ts";

export function test() {
  return "ok";
}

// MEMO: 実用になるものを意識して作成する
// これが面白いお話を作るためになるものではない——おもしろい話をこしらえるつまづきを見つけるためのもの

// インタフェースを定義する（interface）

// 『何を語りたいのか』を定義する（モデリング）

// 人間を定義する（type）

// 物語構造を定義する（モデリング）

// 時系列（プロット）を定義する

// 伏線を定義する（type）
// MEMO: あまり本質ではないかも

// 各定義に対するユニットテストを書く

// 時系列ごとに通過すべきチェックテストを書く

// 最終的な構造やステータスをmarkdownで出力する
// MEMO: AIに読み込ませてコンテキストにすることも目的とする

// class ClockShortStory implements StoryTeller {
//   purpose: Purpose = {
//     description: "7時の朝",
//   };
//
//   test() {
//     console.log("7時の朝");
//   }
// }
//
// const clockShortStory = new ClockShortStory();
// clockShortStory.test();
