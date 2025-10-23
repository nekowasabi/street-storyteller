import { z } from "npm:zod";
import { LOG_LEVELS } from "../logging/types.ts";

export const RuntimeEnvironmentSchema = z.enum([
  "development",
  "test",
  "production",
]);

export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;

export const RuntimePathsSchema = z.object({
  configFile: z.string().optional(),
  dataDir: z.string().optional(),
  cacheDir: z.string().optional(),
});

export type RuntimePaths = z.infer<typeof RuntimePathsSchema>;

export const RuntimeConfigSchema = z.object({
  environment: RuntimeEnvironmentSchema.default("development"),
  projectRoot: z.string().optional(),
  paths: RuntimePathsSchema.default({}),
}).default({
  environment: "development",
  paths: {},
});

export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>;

export const LoggingFormatSchema = z.enum(["human", "json"]);

export type LoggingFormat = z.infer<typeof LoggingFormatSchema>;

export const LoggingConfigSchema = z.object({
  level: z.enum(LOG_LEVELS).default("info"),
  format: LoggingFormatSchema.default("human"),
  color: z.boolean().default(true),
  timestamps: z.boolean().default(true),
}).default({
  level: "info",
  format: "human",
  color: true,
  timestamps: true,
});

export type LoggingConfig = z.infer<typeof LoggingConfigSchema>;

export const CacheConfigSchema = z.object({
  directory: z.string().optional(),
  defaultTtlSeconds: z.number().int().positive().default(900),
  staleWhileRevalidateSeconds: z.number().int().nonnegative().optional(),
  maxEntries: z.number().int().positive().optional(),
}).default({
  defaultTtlSeconds: 900,
});

export type CacheConfig = z.infer<typeof CacheConfigSchema>;

export const ExternalProviderConfigSchema = z.object({
  id: z.string(),
  type: z.enum(["http", "mock"]),
  baseUrl: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  apiKeyEnv: z.string().optional(),
  timeoutMs: z.number().int().positive().optional(),
});

export type ExternalProviderConfig = z.infer<
  typeof ExternalProviderConfigSchema
>;

export const ExternalConfigSchema = z.object({
  defaultProvider: z.string().optional(),
  providers: z.array(ExternalProviderConfigSchema).default([]),
}).default({
  providers: [],
});

export type ExternalConfig = z.infer<typeof ExternalConfigSchema>;

export const FeatureFlagsSchema = z.object({}).catchall(z.boolean()).default({});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const AppConfigSchema = z.object({
  runtime: RuntimeConfigSchema.optional().default({
    environment: "development",
    paths: {},
  }),
  logging: LoggingConfigSchema.optional().default({
    level: "info",
    format: "human",
    color: true,
    timestamps: true,
  }),
  features: FeatureFlagsSchema.optional().default({}),
  cache: CacheConfigSchema.optional().default({
    defaultTtlSeconds: 900,
  }),
  external: ExternalConfigSchema.optional().default({
    providers: [],
  }),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type AppConfigInput = z.input<typeof AppConfigSchema>;

export function parseAppConfig(input: unknown): AppConfig {
  return AppConfigSchema.parse(input);
}

/**
 * プロジェクトメタデータスキーマ（Phase 2: バージョン管理）
 */

export const ProjectVersionSchema = z.object({
  version: z.string(),
  storytellerVersion: z.string(),
  created: z.coerce.date(),
  lastUpdated: z.coerce.date(),
});

export type ProjectVersion = z.infer<typeof ProjectVersionSchema>;

export const CompatibilityModeSchema = z.enum(["strict", "loose"]);

export type CompatibilityMode = z.infer<typeof CompatibilityModeSchema>;

export const ProjectFeaturesSchema = z.record(z.string(), z.boolean()).default({});

export type ProjectFeatures = z.infer<typeof ProjectFeaturesSchema>;

export const ProjectMetadataSchema = z.object({
  version: ProjectVersionSchema,
  features: ProjectFeaturesSchema,
  compatibility: CompatibilityModeSchema.default("strict"),
});

export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;

export function parseProjectMetadata(input: unknown): ProjectMetadata {
  return ProjectMetadataSchema.parse(input);
}
