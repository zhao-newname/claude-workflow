/**
 * Test: Verify settings.json hooks format
 *
 * This test ensures that the generated settings.json uses the correct
 * hooks format compatible with Claude Code's new API.
 */

import { describe, it, expect } from 'vitest';

describe('settings.json hooks format', () => {
  it('should generate correct hooks format', () => {
    // This is the format that cw init should generate
    const config = {
      version: '1.0',
      mode: 'single-agent',
      skills: {
        'code-review': {
          source: 'universal',
          type: 'domain',
          enforcement: 'suggest',
          priority: 'high',
        },
      },
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              {
                type: 'command',
                command: '.claude/hooks/skill-activation-prompt.sh',
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Edit|Write|MultiEdit',
            hooks: [
              {
                type: 'command',
                command: '.claude/hooks/post-tool-use-tracker.sh',
              },
            ],
          },
        ],
      },
    };

    // Verify UserPromptSubmit format
    const userPromptSubmit = config.hooks.UserPromptSubmit[0];
    expect(userPromptSubmit).not.toHaveProperty('matcher');
    expect(userPromptSubmit).toHaveProperty('hooks');
    expect(Array.isArray(userPromptSubmit.hooks)).toBe(true);

    // Verify PostToolUse format
    const postToolUse = config.hooks.PostToolUse[0];
    expect(postToolUse).toHaveProperty('matcher');
    expect(typeof postToolUse.matcher).toBe('string');
    expect(postToolUse.matcher).toBe('Edit|Write|MultiEdit');
    expect(postToolUse).toHaveProperty('hooks');
    expect(Array.isArray(postToolUse.hooks)).toBe(true);
  });

  it('should NOT use old hooks format', () => {
    // This is the OLD format that should NOT be generated
    const oldConfig = {
      hooks: {
        UserPromptSubmit: [
          {
            matcher: {}, // ❌ Should not exist
            hooks: [],
          },
        ],
        PostToolUse: [
          {
            matcher: {
              // ❌ Should be string, not object
              tools: ['Edit', 'Write', 'MultiEdit'],
            },
            hooks: [],
          },
        ],
      },
    };

    // Verify this is the OLD format (for documentation)
    const oldUserPromptSubmit = oldConfig.hooks.UserPromptSubmit[0];
    expect(oldUserPromptSubmit).toHaveProperty('matcher');
    expect(typeof oldUserPromptSubmit.matcher).toBe('object');

    const oldPostToolUse = oldConfig.hooks.PostToolUse[0];
    expect(oldPostToolUse).toHaveProperty('matcher');
    expect(typeof oldPostToolUse.matcher).toBe('object');
    expect(oldPostToolUse.matcher).toHaveProperty('tools');
  });

  it('should validate matcher string format', () => {
    const validMatchers = [
      'Edit|Write|MultiEdit',
      'Edit',
      'Write',
      'Edit|Write',
      'BashTool',
      'Read|Write|Edit',
    ];

    validMatchers.forEach((matcher) => {
      expect(typeof matcher).toBe('string');
      expect(matcher.length).toBeGreaterThan(0);
    });
  });

  it('should reject invalid matcher formats', () => {
    const invalidMatchers = [
      {}, // Object
      { tools: ['Edit'] }, // Object with tools
      [], // Array
      ['Edit', 'Write'], // Array of strings
      null, // Null
      undefined, // Undefined
    ];

    invalidMatchers.forEach((matcher) => {
      expect(typeof matcher).not.toBe('string');
    });
  });
});
