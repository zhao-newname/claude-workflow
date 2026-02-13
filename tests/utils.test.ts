import { describe, it, expect } from 'vitest';
import { get, set, deepMerge } from '../src/utils/fs.js';

describe('Utility Functions', () => {
  describe('get', () => {
    it('should get nested value', () => {
      const obj = { a: { b: { c: 1 } } };
      expect(get(obj, 'a.b.c')).toBe(1);
    });

    it('should return undefined for non-existent path', () => {
      const obj = { a: { b: 1 } };
      expect(get(obj, 'a.c')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should set nested value', () => {
      const obj: Record<string, unknown> = {};
      set(obj, 'a.b.c', 1);
      expect(obj).toEqual({ a: { b: { c: 1 } } });
    });
  });

  describe('deepMerge', () => {
    it('should deep merge objects', () => {
      const target = { a: { b: 1, c: 2 } };
      const source = { a: { b: 3, d: 4 } };
      const result = deepMerge(target, source);
      expect(result).toEqual({ a: { b: 3, c: 2, d: 4 } });
    });
  });
});
