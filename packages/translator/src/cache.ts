import type { TranslationEngine } from "@transflow/core";

/**
 * Options controlling {@link TranslationCache} behaviour.
 *
 *  - `maxEntries` bounds the cache by number of entries. When the limit is
 *    reached, the least-recently-used entry is evicted.
 *  - `ttlMs` is the time-to-live (in milliseconds) after which a cached
 *    entry is considered stale and will be discarded on read.
 */
export interface TranslationCacheOptions {
  maxEntries: number;
  ttlMs: number;
}

/** Input identifying a cacheable translation result. */
export interface TranslationCacheKey {
  engine: TranslationEngine;
  sourceLang: string;
  targetLang: string;
  text: string;
}

interface CacheEntry {
  value: string;
  expiresAt: number;
}

/** Minimum permitted values; smaller values effectively disable the cache. */
const MIN_MAX_ENTRIES = 1;
const MIN_TTL_MS = 1;

/**
 * In-memory LRU cache for translation results with per-entry TTL.
 *
 * Implementation notes:
 *   - Uses the insertion-order guarantee of `Map`. On every read / write,
 *     the entry is re-inserted to move it to the most-recently-used end.
 *   - TTL is enforced lazily on read; expired entries are removed when
 *     they are next looked up. A single cache instance is shared across
 *     all engines — {@link TranslationCacheKey.engine} is part of the key.
 *
 * The cache lives only in the service-worker memory; it is intentionally
 * not persisted, so cached entries vanish when the worker is suspended.
 * This is the desired behaviour for a short-lived translation cache.
 */
export class TranslationCache {
  private readonly entries = new Map<string, CacheEntry>();
  private maxEntries: number;
  private ttlMs: number;

  constructor(options: TranslationCacheOptions) {
    this.maxEntries = Math.max(MIN_MAX_ENTRIES, Math.floor(options.maxEntries));
    this.ttlMs = Math.max(MIN_TTL_MS, Math.floor(options.ttlMs));
  }

  /**
   * Update the cache options at runtime. If `maxEntries` shrinks below the
   * current size, the oldest entries are evicted until the new limit is
   * satisfied. Changing `ttlMs` only affects entries inserted afterwards —
   * existing entries keep their original expiry.
   */
  configure(options: Partial<TranslationCacheOptions>): void {
    if (options.maxEntries !== undefined) {
      this.maxEntries = Math.max(MIN_MAX_ENTRIES, Math.floor(options.maxEntries));
      this.evictToMaxSize();
    }
    if (options.ttlMs !== undefined) {
      this.ttlMs = Math.max(MIN_TTL_MS, Math.floor(options.ttlMs));
    }
  }

  get size(): number {
    return this.entries.size;
  }

  /**
   * Retrieve a cached translation. Returns `undefined` for cache miss or
   * expired entries (expired entries are deleted as a side effect).
   * On hit, the entry is marked most-recently-used.
   */
  get(key: TranslationCacheKey): string | undefined {
    const id = cacheKey(key);
    const entry = this.entries.get(id);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(id);
      return undefined;
    }
    // Refresh LRU position.
    this.entries.delete(id);
    this.entries.set(id, entry);
    return entry.value;
  }

  /** Store a translation result, evicting the oldest entry if full. */
  set(key: TranslationCacheKey, value: string): void {
    const id = cacheKey(key);
    if (this.entries.has(id)) this.entries.delete(id);
    this.entries.set(id, { value, expiresAt: Date.now() + this.ttlMs });
    this.evictToMaxSize();
  }

  /** Remove all cached entries. */
  clear(): void {
    this.entries.clear();
  }

  private evictToMaxSize(): void {
    while (this.entries.size > this.maxEntries) {
      // `Map` iterates in insertion order, so the first key is the LRU.
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

/**
 * Build a canonical cache id. The separator (`\u0000`) is chosen because
 * it cannot appear inside a language code or engine id, so the three
 * metadata fields are unambiguously delimited from the (potentially
 * multi-line) translated text.
 */
function cacheKey(key: TranslationCacheKey): string {
  return `${key.engine}\u0000${key.sourceLang}\u0000${key.targetLang}\u0000${key.text}`;
}
