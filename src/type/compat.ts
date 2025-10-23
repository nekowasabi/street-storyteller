/**
 * 型バージョン間の互換性レイヤー
 *
 * v1とv2のCharacter型を相互変換
 */

import type { Character as CharacterV1 } from "./character.ts";
import type { Character as CharacterV2 } from "./v2/character.ts";

/**
 * v1のCharacter型をv2に変換
 *
 * @param v1Char v1のCharacter
 * @returns v2のCharacter
 */
export function migrateCharacterV1toV2(v1Char: CharacterV1): CharacterV2 {
  return {
    // v1にはnameのみ存在
    id: v1Char.name, // nameをIDとして使用
    name: v1Char.name,

    // デフォルト値で埋める
    role: "supporting", // 役割不明な場合はサポートキャラとする
    traits: [],
    relationships: {},
    appearingChapters: [],
    summary: `${v1Char.name}の概要（要追加）`,
  };
}

/**
 * v2のCharacter型をv1にダウングレード
 *
 * @param v2Char v2のCharacter
 * @returns v1のCharacter
 */
export function downgradeCharacterV2toV1(v2Char: CharacterV2): CharacterV1 {
  // v1にはnameのみ存在するため、nameだけ返す
  return {
    name: v2Char.name,
  };
}
