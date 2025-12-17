/**
 * CharacterPhaseResolver
 *
 * キャラクターの成長フェーズを解決し、特定時点のスナップショットを生成するサービス
 * 差分管理方式により、initialStateから順次フェーズの差分を適用してスナップショットを構築
 */

import type { Character, RelationType } from "../type/v2/character.ts";
import type {
  ArrayDelta,
  CharacterInitialState,
  CharacterPhase,
  CharacterStateDelta,
  RelationshipsDelta,
  StatusDelta,
} from "../type/v2/character_phase.ts";
import type {
  CharacterStateSnapshot,
  PhaseDiffResult,
  PhaseTimelineEntry,
} from "../type/v2/character_state.ts";

/**
 * キャラクターフェーズリゾルバ
 */
export class CharacterPhaseResolver {
  /**
   * キャラクターの初期状態を取得
   */
  resolveInitialState(character: Character): CharacterStateSnapshot {
    const initialState = this.getInitialState(character);

    return {
      characterId: character.id,
      phaseId: null,
      phaseName: "初期状態",
      resolvedAt: new Date().toISOString(),
      traits: [...initialState.traits],
      beliefs: [...(initialState.beliefs ?? [])],
      abilities: [...(initialState.abilities ?? [])],
      relationships: { ...(initialState.relationships ?? {}) },
      appearance: [...(initialState.appearance ?? [])],
      status: { ...(initialState.status ?? {}) },
      goals: [...(initialState.goals ?? [])],
      summary: character.summary,
      baseCharacter: {
        id: character.id,
        name: character.name,
        role: character.role,
      },
    };
  }

  /**
   * 指定されたフェーズIDの状態を解決
   */
  resolveAtPhase(
    character: Character,
    phaseId: string,
  ): CharacterStateSnapshot {
    const phases = character.phases;
    if (!phases || phases.length === 0) {
      throw new Error("Character has no phases");
    }

    const targetPhase = phases.find((p) => p.id === phaseId);
    if (!targetPhase) {
      throw new Error(`Phase not found: ${phaseId}`);
    }

    // フェーズをorder順にソート
    const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

    // 初期状態から開始
    let snapshot = this.resolveInitialState(character);

    // targetPhaseのorderまでのフェーズを順次適用
    for (const phase of sortedPhases) {
      if (phase.order > targetPhase.order) break;
      snapshot = this.applyPhaseDelta(snapshot, phase);
    }

    return snapshot;
  }

  /**
   * 現在のフェーズの状態を解決
   */
  resolveCurrentPhase(character: Character): CharacterStateSnapshot {
    if (!character.currentPhaseId) {
      return this.resolveInitialState(character);
    }
    return this.resolveAtPhase(character, character.currentPhaseId);
  }

  /**
   * すべてのフェーズのスナップショットを取得
   */
  resolveAllPhases(character: Character): CharacterStateSnapshot[] {
    const snapshots: CharacterStateSnapshot[] = [];

    // 初期状態
    snapshots.push(this.resolveInitialState(character));

    if (!character.phases || character.phases.length === 0) {
      return snapshots;
    }

    // フェーズをorder順にソート
    const sortedPhases = [...character.phases].sort((a, b) =>
      a.order - b.order
    );

    // 各フェーズのスナップショットを生成
    let currentSnapshot = snapshots[0];
    for (const phase of sortedPhases) {
      currentSnapshot = this.applyPhaseDelta({ ...currentSnapshot }, phase);
      snapshots.push(currentSnapshot);
    }

    return snapshots;
  }

  /**
   * 2つのフェーズ間の差分を比較
   */
  comparePhaseDiff(
    character: Character,
    fromPhaseId: string | null,
    toPhaseId: string,
  ): PhaseDiffResult {
    const fromSnapshot = fromPhaseId
      ? this.resolveAtPhase(character, fromPhaseId)
      : this.resolveInitialState(character);
    const toSnapshot = this.resolveAtPhase(character, toPhaseId);

    return {
      fromPhaseId,
      toPhaseId,
      fromPhaseName: fromSnapshot.phaseName,
      toPhaseName: toSnapshot.phaseName,
      changes: {
        traits: {
          added: toSnapshot.traits.filter((t) =>
            !fromSnapshot.traits.includes(t)
          ),
          removed: fromSnapshot.traits.filter((t) =>
            !toSnapshot.traits.includes(t)
          ),
        },
        beliefs: {
          added: toSnapshot.beliefs.filter((b) =>
            !fromSnapshot.beliefs.includes(b)
          ),
          removed: fromSnapshot.beliefs.filter((b) =>
            !toSnapshot.beliefs.includes(b)
          ),
        },
        abilities: {
          added: toSnapshot.abilities.filter((a) =>
            !fromSnapshot.abilities.includes(a)
          ),
          removed: fromSnapshot.abilities.filter((a) =>
            !toSnapshot.abilities.includes(a)
          ),
        },
        relationships: this.compareRelationships(
          fromSnapshot.relationships,
          toSnapshot.relationships,
        ),
        appearance: {
          added: toSnapshot.appearance.filter((a) =>
            !fromSnapshot.appearance.includes(a)
          ),
          removed: fromSnapshot.appearance.filter((a) =>
            !toSnapshot.appearance.includes(a)
          ),
        },
        status: this.compareStatus(fromSnapshot.status, toSnapshot.status),
        goals: {
          added: toSnapshot.goals.filter((g) =>
            !fromSnapshot.goals.includes(g)
          ),
          removed: fromSnapshot.goals.filter((g) =>
            !toSnapshot.goals.includes(g)
          ),
        },
        summary: fromSnapshot.summary !== toSnapshot.summary
          ? { from: fromSnapshot.summary, to: toSnapshot.summary }
          : undefined,
      },
    };
  }

  /**
   * フェーズタイムラインを取得
   */
  getPhaseTimeline(character: Character): PhaseTimelineEntry[] {
    const timeline: PhaseTimelineEntry[] = [];

    // 初期状態
    timeline.push({
      phaseId: null,
      phaseName: "初期状態",
      order: 0,
      summary: character.summary,
      keyChanges: [],
    });

    if (!character.phases || character.phases.length === 0) {
      return timeline;
    }

    // フェーズをorder順にソート
    const sortedPhases = [...character.phases].sort((a, b) =>
      a.order - b.order
    );

    let previousPhaseId: string | null = null;
    for (const phase of sortedPhases) {
      const keyChanges = this.extractKeyChanges(phase.delta);
      timeline.push({
        phaseId: phase.id,
        phaseName: phase.name,
        order: phase.order,
        summary: phase.summary,
        transitionType: phase.transitionType,
        importance: phase.importance,
        startChapter: phase.startChapter,
        triggerEventId: phase.triggerEventId,
        keyChanges,
      });
      previousPhaseId = phase.id;
    }

    return timeline;
  }

  // ========================================
  // Private Methods
  // ========================================

  /**
   * キャラクターの初期状態を取得（initialStateがない場合は推論）
   */
  private getInitialState(character: Character): CharacterInitialState {
    if (character.initialState) {
      return character.initialState;
    }

    // initialStateがない場合、基本フィールドから推論
    return {
      traits: [...character.traits],
      beliefs: [],
      abilities: [],
      relationships: { ...character.relationships },
      appearance: [],
      goals: [],
    };
  }

  /**
   * スナップショットにフェーズの差分を適用
   */
  private applyPhaseDelta(
    snapshot: CharacterStateSnapshot,
    phase: CharacterPhase,
  ): CharacterStateSnapshot {
    const delta = phase.delta;
    const newSnapshot: CharacterStateSnapshot = {
      ...snapshot,
      phaseId: phase.id,
      phaseName: phase.name,
      resolvedAt: new Date().toISOString(),
    };

    // traits
    if (delta.traits) {
      newSnapshot.traits = this.applyArrayDelta(snapshot.traits, delta.traits);
    }

    // beliefs
    if (delta.beliefs) {
      newSnapshot.beliefs = this.applyArrayDelta(
        snapshot.beliefs,
        delta.beliefs,
      );
    }

    // abilities (improve/degradeは現時点では追加として扱う)
    if (delta.abilities) {
      let abilities = [...snapshot.abilities];
      const abilitiesDelta = delta.abilities;
      if (abilitiesDelta.add) {
        abilities = [...abilities, ...abilitiesDelta.add];
      }
      if (abilitiesDelta.remove) {
        abilities = abilities.filter((a) =>
          !abilitiesDelta.remove!.includes(a)
        );
      }
      newSnapshot.abilities = abilities;
    }

    // relationships
    if (delta.relationships) {
      newSnapshot.relationships = this.applyRelationshipsDelta(
        snapshot.relationships,
        delta.relationships,
      );
    }

    // appearance
    if (delta.appearance) {
      newSnapshot.appearance = this.applyArrayDelta(
        snapshot.appearance,
        delta.appearance,
      );
    }

    // status
    if (delta.status) {
      newSnapshot.status = {
        ...snapshot.status,
        ...delta.status,
      };
    }

    // goals
    if (delta.goals) {
      newSnapshot.goals = this.applyArrayDelta(snapshot.goals, delta.goals);
    }

    // summary
    if (delta.summary) {
      newSnapshot.summary = delta.summary;
    }

    return newSnapshot;
  }

  /**
   * 配列差分を適用
   */
  private applyArrayDelta(arr: string[], delta: ArrayDelta): string[] {
    let result = [...arr];

    // remove
    if (delta.remove) {
      result = result.filter((item) => !delta.remove!.includes(item));
    }

    // add
    if (delta.add) {
      result = [...result, ...delta.add];
    }

    // modify
    if (delta.modify) {
      for (const [oldVal, newVal] of Object.entries(delta.modify)) {
        const idx = result.indexOf(oldVal);
        if (idx !== -1) {
          result[idx] = newVal;
        }
      }
    }

    return result;
  }

  /**
   * 関係性差分を適用
   */
  private applyRelationshipsDelta(
    relationships: Record<string, RelationType>,
    delta: RelationshipsDelta,
  ): Record<string, RelationType> {
    const result = { ...relationships };

    // remove
    if (delta.remove) {
      for (const key of delta.remove) {
        delete result[key];
      }
    }

    // add
    if (delta.add) {
      Object.assign(result, delta.add);
    }

    // change
    if (delta.change) {
      Object.assign(result, delta.change);
    }

    return result;
  }

  /**
   * 関係性の差分を比較
   */
  private compareRelationships(
    from: Record<string, RelationType>,
    to: Record<string, RelationType>,
  ): PhaseDiffResult["changes"]["relationships"] {
    const added: Record<string, RelationType> = {};
    const removed: string[] = [];
    const changed: Record<string, { from: RelationType; to: RelationType }> =
      {};

    // 追加・変更をチェック
    for (const [key, toValue] of Object.entries(to)) {
      if (!(key in from)) {
        added[key] = toValue;
      } else if (from[key] !== toValue) {
        changed[key] = { from: from[key], to: toValue };
      }
    }

    // 削除をチェック
    for (const key of Object.keys(from)) {
      if (!(key in to)) {
        removed.push(key);
      }
    }

    return { added, removed, changed };
  }

  /**
   * ステータスの差分を比較
   */
  private compareStatus(
    from: StatusDelta,
    to: StatusDelta,
  ): PhaseDiffResult["changes"]["status"] {
    const result: PhaseDiffResult["changes"]["status"] = {};

    if (from.physical !== to.physical) {
      result.physical = { from: from.physical, to: to.physical };
    }
    if (from.mental !== to.mental) {
      result.mental = { from: from.mental, to: to.mental };
    }
    if (from.social !== to.social) {
      result.social = { from: from.social, to: to.social };
    }

    return result;
  }

  /**
   * 差分から主要な変化を抽出
   */
  private extractKeyChanges(delta: CharacterStateDelta): string[] {
    const changes: string[] = [];

    // traits
    if (delta.traits?.add) {
      changes.push(...delta.traits.add.map((t) => `+特性: ${t}`));
    }
    if (delta.traits?.remove) {
      changes.push(...delta.traits.remove.map((t) => `-特性: ${t}`));
    }

    // abilities
    if (delta.abilities?.add) {
      changes.push(...delta.abilities.add.map((a) => `+能力: ${a}`));
    }
    if (delta.abilities?.remove) {
      changes.push(...delta.abilities.remove.map((a) => `-能力: ${a}`));
    }

    // relationships
    if (delta.relationships?.add) {
      for (const [key, value] of Object.entries(delta.relationships.add)) {
        changes.push(`+関係: ${key}(${value})`);
      }
    }

    // status
    if (delta.status?.mental) {
      changes.push(`精神: ${delta.status.mental}`);
    }
    if (delta.status?.physical) {
      changes.push(`身体: ${delta.status.physical}`);
    }

    // goals
    if (delta.goals?.add) {
      changes.push(...delta.goals.add.map((g) => `+目標: ${g}`));
    }
    if (delta.goals?.remove) {
      changes.push(...delta.goals.remove.map((g) => `-目標: ${g}`));
    }

    return changes;
  }
}
