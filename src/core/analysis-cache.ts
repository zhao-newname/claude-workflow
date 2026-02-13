/**
 * AnalysisCache - LRU cache for file analysis results with mtime-based invalidation
 *
 * Features:
 * - LRU (Least Recently Used) eviction policy
 * - File modification time-based invalidation
 * - Configurable size limits
 * - Cache statistics and monitoring
 * - Memory-efficient storage
 */

import { promises as fs } from 'fs';

export interface AnalysisCacheOptions {
  maxSize?: number;
  maxMemoryMB?: number;
  ttl?: number;
  checkMtime?: boolean;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  mtime?: number;
  size: number;
  createdAt: number;
  lastAccessed: number;
  accessCount: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  memoryUsageMB: number;
  oldestEntry?: number;
  newestEntry?: number;
}

/**
 * AnalysisCache provides high-performance caching with intelligent invalidation
 */
export class AnalysisCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  private readonly defaultOptions: Required<AnalysisCacheOptions> = {
    maxSize: 1000,
    maxMemoryMB: 100,
    ttl: 3600000, // 1 hour
    checkMtime: true
  };

  constructor(private options: AnalysisCacheOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Get a value from cache
   * @param key - Cache key
   * @param filePath - Optional file path for mtime validation
   * @returns Cached value or undefined
   */
  async get(key: string, filePath?: string): Promise<T | undefined> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Check if file has been modified
    if (filePath && this.options.checkMtime) {
      const isValid = await this.validateMtime(entry, filePath);
      if (!isValid) {
        this.delete(key);
        this.stats.misses++;
        return undefined;
      }
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.updateAccessOrder(key);

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param filePath - Optional file path for mtime tracking
   */
  async set(key: string, value: T, filePath?: string): Promise<void> {
    // Get file mtime if provided
    let mtime: number | undefined;
    if (filePath && this.options.checkMtime) {
      try {
        const stats = await fs.stat(filePath);
        mtime = stats.mtimeMs;
      } catch {
        // File doesn't exist or can't be accessed
      }
    }

    // Calculate entry size (rough estimate)
    const size = this.estimateSize(value);

    // Check if we need to evict entries
    await this.ensureCapacity(size);

    // Create cache entry
    const entry: CacheEntry<T> = {
      key,
      value,
      mtime,
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 1
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @returns True if key exists and is valid
   */
  async has(key: string, filePath?: string): Promise<boolean> {
    const value = await this.get(key, filePath);
    return value !== undefined;
  }

  /**
   * Delete a key from cache
   * @param key - Cache key
   * @returns True if key was deleted
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    return true;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Invalidate entries for a specific file
   * @param filePath - File path to invalidate
   * @returns Number of entries invalidated
   */
  async invalidateFile(filePath: string): Promise<number> {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (key.includes(filePath)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate expired entries
   * @returns Number of entries invalidated
   */
  invalidateExpired(): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalMemory = entries.reduce((sum, entry) => sum + entry.size, 0);

    const hitRate = this.stats.hits + this.stats.misses > 0
      ? this.stats.hits / (this.stats.hits + this.stats.misses)
      : 0;

    const timestamps = entries.map(e => e.createdAt);

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate,
      memoryUsageMB: totalMemory / (1024 * 1024),
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined
    };
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get entries sorted by access frequency
   */
  getHotEntries(limit: number = 10): Array<{ key: string; accessCount: number }> {
    return Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);
  }

  /**
   * Check if entry has expired
   * @private
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.createdAt;
    return age > this.options.ttl!;
  }

  /**
   * Validate entry mtime against file
   * @private
   */
  private async validateMtime(entry: CacheEntry<T>, filePath: string): Promise<boolean> {
    if (!entry.mtime) {
      return true; // No mtime to validate
    }

    try {
      const stats = await fs.stat(filePath);
      return stats.mtimeMs === entry.mtime;
    } catch {
      return false; // File doesn't exist or can't be accessed
    }
  }

  /**
   * Update access order for LRU
   * @private
   */
  private updateAccessOrder(key: string): void {
    // Remove key from current position
    this.accessOrder = this.accessOrder.filter(k => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Ensure cache has capacity for new entry
   * @private
   */
  private async ensureCapacity(newEntrySize: number): Promise<void> {
    // Check size limit
    while (this.cache.size >= this.options.maxSize!) {
      this.evictLRU();
    }

    // Check memory limit
    const currentMemory = this.getCurrentMemoryUsage();
    const maxMemoryBytes = this.options.maxMemoryMB! * 1024 * 1024;

    while (currentMemory + newEntrySize > maxMemoryBytes && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   * @private
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const lruKey = this.accessOrder[0];
    this.delete(lruKey);
    this.stats.evictions++;
  }

  /**
   * Get current memory usage in bytes
   * @private
   */
  private getCurrentMemoryUsage(): number {
    return Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);
  }

  /**
   * Estimate size of value in bytes
   * @private
   */
  private estimateSize(value: T): number {
    try {
      const json = JSON.stringify(value);
      return json.length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1024; // Default estimate if can't serialize
    }
  }

  /**
   * Create a cache key from components
   */
  static createKey(...components: string[]): string {
    return components.join(':');
  }

  /**
   * Create a cache with preset configuration for file analysis
   */
  static forFileAnalysis(options: Partial<AnalysisCacheOptions> = {}): AnalysisCache {
    return new AnalysisCache({
      maxSize: 500,
      maxMemoryMB: 50,
      ttl: 1800000, // 30 minutes
      checkMtime: true,
      ...options
    });
  }

  /**
   * Create a cache with preset configuration for pattern matching
   */
  static forPatternMatching(options: Partial<AnalysisCacheOptions> = {}): AnalysisCache {
    return new AnalysisCache({
      maxSize: 1000,
      maxMemoryMB: 20,
      ttl: 3600000, // 1 hour
      checkMtime: false, // Patterns don't change
      ...options
    });
  }
}

export default AnalysisCache;