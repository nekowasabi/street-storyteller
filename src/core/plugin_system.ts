/**
 * プラグインシステム基盤
 *
 * StorytellerPluginインターフェースを基底として、
 * ElementPlugin（要素型単位）とFeaturePlugin（機能レイヤー単位）を提供します。
 */

import { err, ok, type Result } from "../shared/result.ts";

export interface PluginMetadata {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description?: string;
}

/**
 * プラグインの基底インターフェース
 */
export interface StorytellerPlugin {
  readonly meta: PluginMetadata;
  readonly dependencies?: readonly string[];
  initialize?(context: PluginContext): Promise<void>;
}

/**
 * プラグイン初期化時に渡されるコンテキスト
 */
export interface PluginContext {
  // 将来的に設定やロガーなどを渡す
  readonly pluginId: string;
}

/**
 * 要素ファイル作成オプション
 */
export interface CreateElementOptions {
  readonly [key: string]: unknown;
}

/**
 * 要素ファイル作成結果
 */
export interface ElementCreationResult {
  readonly filePath: string;
  readonly content: string;
}

/**
 * 検証結果
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors?: readonly ValidationError[];
}

/**
 * 検証エラー
 */
export interface ValidationError {
  readonly field: string;
  readonly message: string;
}

/**
 * 型スキーマ
 */
export interface TypeSchema {
  readonly type: string;
  readonly properties: Record<string, SchemaProperty>;
  readonly required?: readonly string[];
}

/**
 * スキーマプロパティ
 */
export interface SchemaProperty {
  readonly type: string;
  readonly description?: string;
  readonly optional?: boolean;
}

/**
 * 要素型単位のプラグイン（Character, Setting等）
 */
export interface ElementPlugin extends StorytellerPlugin {
  readonly elementType: string;

  /**
   * 要素ファイルを作成する
   * @param options 要素作成オプション
   * @returns 作成結果（成功/失敗）
   */
  createElementFile(
    options: CreateElementOptions,
  ): Promise<Result<ElementCreationResult, Error>>;

  /**
   * 要素を検証する
   * @param element 検証対象の要素
   * @returns 検証結果
   */
  validateElement(element: unknown): ValidationResult;

  /**
   * 要素の型スキーマをエクスポートする
   * @returns 型スキーマ
   */
  exportElementSchema(): TypeSchema;

  /**
   * 要素のファイルパスを取得する
   * @param elementId 要素ID
   * @param projectRoot プロジェクトルート
   * @returns ファイルパス
   */
  getElementPath(elementId: string, projectRoot: string): string;

  /**
   * 要素の詳細ディレクトリパスを取得する
   * @param elementId 要素ID
   * @param projectRoot プロジェクトルート
   * @returns ディレクトリパス
   */
  getDetailsDir(elementId: string, projectRoot: string): string;
}

/**
 * 機能レイヤー単位のプラグイン（Details, Migration等）
 */
export interface FeaturePlugin extends StorytellerPlugin {
  readonly featureId: string;
  // extendCommands, registerMigrations等のメソッドは後で追加
}

/**
 * プラグイン検証エラー
 */
export interface PluginValidationError {
  readonly code: "missing_dependency" | "circular_dependency" | "duplicate_plugin";
  readonly message: string;
  readonly details: {
    readonly pluginId?: string;
    readonly dependency?: string;
    readonly cycle?: readonly string[];
  };
}

/**
 * プラグインレジストリインターフェース
 *
 * プラグインの登録、解決、検証、初期化を管理します。
 */
export interface PluginRegistry {
  /**
   * プラグインを登録する
   * @param plugin 登録するプラグイン
   */
  register(plugin: StorytellerPlugin): void;

  /**
   * プラグインIDからプラグインを解決する
   * @param pluginId プラグインID
   * @returns プラグイン（見つからない場合はundefined）
   */
  resolve(pluginId: string): StorytellerPlugin | undefined;

  /**
   * 全プラグインの依存関係を検証する
   * - 依存関係の欠損検出
   * - 循環依存の検出
   * @returns 検証結果（成功の場合はok、失敗の場合はエラーリスト）
   */
  validate(): Result<void, readonly PluginValidationError[]>;

  /**
   * 全プラグインを依存関係順序（トポロジカルソート）で初期化する
   * @param context プラグイン初期化コンテキスト
   */
  initializeAll(context: PluginContext): Promise<void>;
}

/**
 * プラグインレジストリを作成する
 */
export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, StorytellerPlugin>();

  return {
    register(plugin: StorytellerPlugin): void {
      plugins.set(plugin.meta.id, plugin);
    },

    resolve(pluginId: string): StorytellerPlugin | undefined {
      return plugins.get(pluginId);
    },

    validate(): Result<void, readonly PluginValidationError[]> {
      const errors: PluginValidationError[] = [];

      // 依存関係の検証
      for (const [pluginId, plugin] of plugins) {
        if (!plugin.dependencies) {
          continue;
        }

        for (const dependency of plugin.dependencies) {
          if (!plugins.has(dependency)) {
            errors.push({
              code: "missing_dependency",
              message: `Plugin "${pluginId}" requires missing dependency "${dependency}"`,
              details: {
                pluginId,
                dependency,
              },
            });
          }
        }
      }

      // 循環依存の検出（DFS）
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const detectCycle = (
        pluginId: string,
        path: string[],
      ): string[] | null => {
        if (recursionStack.has(pluginId)) {
          // 循環を発見
          const cycleStart = path.indexOf(pluginId);
          return [...path.slice(cycleStart), pluginId];
        }

        if (visited.has(pluginId)) {
          return null;
        }

        visited.add(pluginId);
        recursionStack.add(pluginId);

        const plugin = plugins.get(pluginId);
        if (plugin?.dependencies) {
          for (const dependency of plugin.dependencies) {
            if (!plugins.has(dependency)) {
              continue; // 欠損依存関係は別のエラーで報告済み
            }

            const cycle = detectCycle(dependency, [...path, pluginId]);
            if (cycle) {
              return cycle;
            }
          }
        }

        recursionStack.delete(pluginId);
        return null;
      };

      for (const pluginId of plugins.keys()) {
        if (!visited.has(pluginId)) {
          const cycle = detectCycle(pluginId, []);
          if (cycle) {
            errors.push({
              code: "circular_dependency",
              message: `Circular dependency detected: ${cycle.join(" -> ")}`,
              details: {
                cycle,
              },
            });
            break; // 最初の循環依存を報告
          }
        }
      }

      if (errors.length > 0) {
        return err(errors);
      }

      return ok(undefined);
    },

    async initializeAll(context: PluginContext): Promise<void> {
      // トポロジカルソートで初期化順序を決定
      const sorted = topologicalSort(plugins);

      // 順番に初期化
      for (const pluginId of sorted) {
        const plugin = plugins.get(pluginId);
        if (plugin?.initialize) {
          await plugin.initialize({ ...context, pluginId });
        }
      }
    },
  };
}

/**
 * トポロジカルソート（Kahn's algorithm）
 *
 * プラグインの依存関係を解決し、初期化可能な順序でプラグインIDのリストを返します。
 * 依存関係のないプラグインが先に、依存関係のあるプラグインが後になります。
 *
 * @param plugins プラグインのMap
 * @returns 依存関係順に並べたプラグインIDのリスト
 */
function topologicalSort(
  plugins: Map<string, StorytellerPlugin>,
): string[] {
  const result: string[] = [];
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // 初期化: すべてのプラグインの入次数を0に設定
  for (const pluginId of plugins.keys()) {
    inDegree.set(pluginId, 0);
    adjList.set(pluginId, []);
  }

  // 隣接リストと入次数を構築
  for (const [pluginId, plugin] of plugins) {
    if (plugin.dependencies) {
      for (const dependency of plugin.dependencies) {
        if (plugins.has(dependency)) {
          adjList.get(dependency)!.push(pluginId);
          inDegree.set(pluginId, (inDegree.get(pluginId) || 0) + 1);
        }
      }
    }
  }

  // 入次数が0のノードをキューに追加
  const queue: string[] = [];
  for (const [pluginId, degree] of inDegree) {
    if (degree === 0) {
      queue.push(pluginId);
    }
  }

  // BFS処理
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);

    for (const neighbor of adjList.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}
