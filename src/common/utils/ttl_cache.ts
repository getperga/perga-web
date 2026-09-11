interface TtlCacheEntry<T> {
  value: T;
  updatedAt: number;
}

export class TtlCache<T> {
  static readonly DEFAULT_TTL_MS = 60 * 1000;

  private readonly entries = new Map<string, TtlCacheEntry<T>>();

  constructor(
    private readonly ttlMs: number = TtlCache.DEFAULT_TTL_MS,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      return undefined;
    }

    if (this.now() - entry.updatedAt > this.ttlMs) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { value, updatedAt: this.now() });
  }

  deleteAllExcept(key: string): void {
    for (const existingKey of this.entries.keys()) {
      if (existingKey !== key) {
        this.entries.delete(existingKey);
      }
    }
  }

  clear(): void {
    this.entries.clear();
  }
}
