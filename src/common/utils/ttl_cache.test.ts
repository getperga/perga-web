import { describe, expect, it } from 'vitest';

import { TtlCache } from './ttl_cache';

describe('TtlCache', () => {
  it('uses a one-minute TTL by default', () => {
    let now = 1_000;
    const cache = new TtlCache<string>(undefined, () => now);

    cache.set('key', 'value');
    now += TtlCache.DEFAULT_TTL_MS;
    expect(cache.get('key')).toBe('value');

    now += 1;
    expect(cache.get('key')).toBeUndefined();
  });

  it('returns a value until its TTL expires', () => {
    let now = 1_000;
    const cache = new TtlCache<string>(60_000, () => now);

    cache.set('key', 'value');
    now += 60_000;
    expect(cache.get('key')).toBe('value');

    now += 1;
    expect(cache.get('key')).toBeUndefined();
  });

  it('can invalidate every entry except the active one', () => {
    const cache = new TtlCache<number>(60_000);
    cache.set('active', 1);
    cache.set('stale', 2);

    cache.deleteAllExcept('active');

    expect(cache.get('active')).toBe(1);
    expect(cache.get('stale')).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = new TtlCache<number>(60_000);
    cache.set('first', 1);
    cache.set('second', 2);

    cache.clear();

    expect(cache.get('first')).toBeUndefined();
    expect(cache.get('second')).toBeUndefined();
  });
});
