import { LogManager } from "../../shared/logging/log_manager.ts";
import type {
  LogContext,
  Logger,
  LoggerFactory,
} from "../../shared/logging/types.ts";
import type { AppConfig } from "../../shared/config/schema.ts";
import { ConsoleLoggerFactory } from "../../infrastructure/logging/console_logger.ts";

export interface ConfigurationManagerLike {
  resolve(): Promise<AppConfig>;
}

export interface LoggingServiceOptions {
  readonly configurationManager: ConfigurationManagerLike;
  readonly factoryResolver?: (config: AppConfig) => LoggerFactory;
  readonly globalContext?: (config: AppConfig) => LogContext;
}

export class LoggingService {
  readonly #configurationManager: ConfigurationManagerLike;
  readonly #factoryResolver?: (config: AppConfig) => LoggerFactory;
  readonly #globalContextResolver?: (config: AppConfig) => LogContext;
  #manager?: LogManager;
  #config?: AppConfig;

  constructor(options: LoggingServiceOptions) {
    this.#configurationManager = options.configurationManager;
    this.#factoryResolver = options.factoryResolver;
    this.#globalContextResolver = options.globalContext;
  }

  async initialize(): Promise<void> {
    if (this.#manager) {
      return;
    }

    this.#config = await this.#configurationManager.resolve();
    const factory = this.#factoryResolver
      ? this.#factoryResolver(this.#config)
      : this.#createDefaultFactory(this.#config);

    this.#manager = new LogManager({
      level: this.#config.logging.level,
      factory,
      globalContext: this.#resolveGlobalContext(this.#config),
    });
  }

  getLogger(scope: string, context?: LogContext): Logger {
    this.#ensureInitialized();
    return this.#manager!.createLogger(scope, context);
  }

  get logManager(): LogManager {
    this.#ensureInitialized();
    return this.#manager!;
  }

  get config(): AppConfig {
    this.#ensureInitialized();
    return this.#config!;
  }

  #ensureInitialized(): void {
    if (!this.#manager || !this.#config) {
      throw new Error("LoggingService has not been initialized");
    }
  }

  #createDefaultFactory(config: AppConfig): LoggerFactory {
    return new ConsoleLoggerFactory({
      format: config.logging.format,
      color: config.logging.color,
      timestamps: config.logging.timestamps,
    });
  }

  #resolveGlobalContext(config: AppConfig): LogContext {
    if (this.#globalContextResolver) {
      return this.#globalContextResolver(config);
    }
    return {
      environment: config.runtime.environment,
    };
  }
}
