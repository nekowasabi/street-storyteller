---
storyteller:
  chapter_id: chapter01
  title: "旅の始まり"
  order: 1
  characters:
    - hero
    - heroine
  settings:
    - kingdom
  summary: "勇者アレクスが故郷を離れ、運命の旅に出発する"
---

# 第1章：旅の始まり

## 朝の目覚め

勇者は朝日とともに目を覚ました。<!-- @hero:implicit confidence:0.9 -->
今日こそ、長い旅が始まる日だ。窓から差し込む光が、部屋に置かれた剣を照らしている。

「今日という日が、ついに来たか...」

アレクスは静かにつぶやいた。<!-- @hero:explicit confidence:0.95 -->
18年間過ごしたこの部屋とも、今日でお別れだ。

腰には愛剣「黎明」を佩いている。<!-- @legendary_sword:implicit confidence:0.9 -->
この剣は村の鍛冶屋から贈られたもので、特別な力はないが、彼にとっては何より大切な相棒である。

## 王都への道

王都の城門は、朝から多くの人で賑わっていた。<!-- @kingdom:implicit confidence:0.85 -->
商人たちの威勢の良い声、子供たちの笑い声、そして冒険者たちの足音が混ざり合う。

「ちょっと、そこの人！」

振り返ると、銀髪の少女が立っていた。エメラルドグリーンの瞳が、好奇心に輝いている。

「私はエリーゼ。魔法使いよ」<!-- @heroine:explicit confidence:1.0 -->

彼女の手には、高位の魔法使いしか持てないはずの杖が握られていた。

「あら、面白そうな依頼があるわね」

エリーゼは冒険者ギルドの掲示板を指差した。<!-- @adventurer_guild:implicit confidence:0.85 -->
そこには「魔王復活の兆候調査」という不穏な文字が。<!-- @demon_lord_title:implicit confidence:0.95 -->

## 運命の出会い

「あなた、勇者でしょう？」

エリーゼの問いかけに、勇者は驚いた。<!-- @hero:implicit confidence:0.9 @heroine:speaker -->
なぜ自分が勇者だと分かったのか。

「その剣...『黎明』でしょう？伝説の鍛冶屋が打った剣。それを持てるのは、選ばれし者だけ」

魔法使いは自信満々に説明した。<!-- @heroine:implicit confidence:0.85 -->

「君は一体...」

「私も旅に出るところなの。一緒に行きましょう？」

エリーゼの提案は突然だったが、アレクスは何か運命的なものを感じていた。

<!-- 検証コメント
@validate: hero.appearingChapters.includes('chapter01')
@validate: heroine.appearingChapters.includes('chapter01') 
@validate: kingdom.appearingChapters.includes('chapter01')
-->

## 冒険の始まり

二人は王都を出て、東の道を進み始めた。
目指すは魔法の森。そこに、魔王復活の手がかりがあるという。<!-- @magic_forest:foreshadow -->

道中、エリーゼは自分の身の上を話し始めた。

「私、実は貴族の出なの。でも、そんな生活は窮屈で...本当の自由を求めて家を出たわ」

彼女の言葉には、強い決意が込められていた。<!-- @heroine:characterization -->

「俺も似たようなものさ。村を守るため、そして...父の意志を継ぐために旅に出た」

勇者の返答に、エリーゼは優しく微笑んだ。<!-- @hero:characterization -->

「じゃあ、私たち、似た者同士ね」

夕日が地平線に沈もうとしている。
第一日目の旅は、順調に進んでいた。

明日、彼らは魔法の森へと足を踏み入れることになる。
そこで待ち受ける試練のことは、まだ二人は知らない。

---

*続く...*