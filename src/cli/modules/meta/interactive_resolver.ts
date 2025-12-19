import type { DetectedEntity } from "@storyteller/application/meta/reference_detector.ts";

export interface InteractiveIo {
  write(message: string): void;
  prompt(message: string): Promise<string | null>;
}

export interface ResolveOptions {
  readonly threshold?: number;
}

export type ReferenceValue = {
  readonly kind: "character" | "setting";
  readonly id: string;
  readonly exportName: string;
  readonly filePath: string;
};

type Candidate = {
  readonly entity: ReferenceValue;
  readonly confidence: number;
  readonly occurrences: number;
};

export class InteractiveResolver {
  constructor(private readonly io: InteractiveIo = createDefaultIo()) {}

  async resolve(
    entities: readonly DetectedEntity[],
    options: ResolveOptions = {},
  ): Promise<Record<string, ReferenceValue>> {
    const threshold = options.threshold ?? 0.8;
    const candidatesByWord = collectCandidates(entities);

    const resolved: Record<string, ReferenceValue> = {};

    const words = Array.from(candidatesByWord.keys()).sort((a, b) =>
      a.localeCompare(b)
    );

    for (const word of words) {
      const candidates = candidatesByWord.get(word) ?? [];
      if (candidates.length === 0) {
        continue;
      }

      const sorted = [...candidates].sort((a, b) =>
        b.confidence === a.confidence
          ? b.occurrences === a.occurrences
            ? a.entity.id.localeCompare(b.entity.id)
            : b.occurrences - a.occurrences
          : b.confidence - a.confidence
      );

      const top = sorted[0];
      const needsConfirmation = sorted.length > 1 || top.confidence < threshold;

      if (!needsConfirmation) {
        resolved[word] = top.entity;
        continue;
      }

      const selection = await this.askUser(word, sorted);
      if (!selection) {
        continue;
      }
      resolved[word] = selection;
    }

    return resolved;
  }

  private async askUser(
    word: string,
    candidates: readonly Candidate[],
  ): Promise<ReferenceValue | null> {
    this.io.write(`? 「${word}」は以下のどれを指しますか？`);
    this.io.write("  0) スキップ（参照マッピングに含めない）");
    candidates.forEach((candidate, index) => {
      const confidencePct = Math.round(candidate.confidence * 100);
      this.io.write(
        `  ${
          index + 1
        }) ${candidate.entity.id} (${candidate.entity.exportName}) [confidence: ${confidencePct}%]`,
      );
    });

    const answer = await this.io.prompt(`Select [0-${candidates.length}]: `);
    if (!answer) {
      return null;
    }
    const selected = Number(answer);
    if (
      Number.isNaN(selected) || selected < 0 || selected > candidates.length
    ) {
      return null;
    }
    if (selected === 0) {
      return null;
    }
    return candidates[selected - 1]?.entity ?? null;
  }
}

function collectCandidates(
  entities: readonly DetectedEntity[],
): Map<string, Candidate[]> {
  const candidatesByWord = new Map<string, Candidate[]>();

  for (const entity of entities) {
    const patternMatches = entity.patternMatches ?? {};
    for (const [word, match] of Object.entries(patternMatches)) {
      const list = candidatesByWord.get(word) ?? [];
      list.push({
        entity: {
          kind: entity.kind,
          id: entity.id,
          exportName: entity.exportName,
          filePath: entity.filePath,
        },
        confidence: match.confidence,
        occurrences: match.occurrences,
      });
      candidatesByWord.set(word, list);
    }
  }

  return candidatesByWord;
}

function createDefaultIo(): InteractiveIo {
  return {
    write: (message) => console.log(message),
    prompt: (message) => Promise.resolve(prompt(message)),
  };
}
