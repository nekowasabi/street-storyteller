export class ProjectContext {
  private readonly cache = new Map<string, unknown>();
  private readonly inflight = new Map<string, Promise<unknown>>();

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  async getOrLoad<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached as T;
    }

    const running = this.inflight.get(key);
    if (running) {
      return await running as T;
    }

    const promise = (async () => {
      const value = await loader();
      this.cache.set(key, value);
      return value;
    })();

    this.inflight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inflight.delete(key);
    }
  }

  clear(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}
