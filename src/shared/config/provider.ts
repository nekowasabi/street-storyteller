import type { AppConfig } from "@storyteller/shared/config/schema.ts";

export interface ConfigurationSourceMeta {
  readonly id: string;
  readonly priority: number;
  readonly description?: string;
}

export type ConfigurationValue = DeepPartial<AppConfig>;

export interface ConfigurationLayer {
  readonly meta: ConfigurationSourceMeta;
  readonly value: ConfigurationValue;
}

export interface ConfigurationProvider {
  readonly meta: ConfigurationSourceMeta;
  load(): Promise<ConfigurationLayer>;
}

export function mergeConfigurationLayers(
  layers: readonly ConfigurationLayer[],
): Partial<AppConfig> {
  const sorted = [...layers].sort((a, b) => a.meta.priority - b.meta.priority);

  return sorted.reduce<Record<string, unknown>>((acc, layer) => {
    return mergePartialConfig(acc, layer.value);
  }, {}) as Partial<AppConfig>;
}

function mergePartialConfig(
  target: Record<string, unknown>,
  source: ConfigurationValue,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };

  for (
    const [key, value] of Object.entries(source) as [
      keyof AppConfig,
      unknown,
    ][]
  ) {
    if (value === undefined) {
      continue;
    }

    const existing = result[key];

    if (isRecord(existing) && isRecord(value)) {
      result[key] = {
        ...existing,
        ...value,
      };
    } else {
      result[key] = value;
    }
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]>
    : T[K];
};
