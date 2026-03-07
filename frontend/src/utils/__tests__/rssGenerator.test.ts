// frontend/src/utils/__tests__/rssGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generateAtomFeed, generateJSONFeed } from '../rssGenerator';
import type { CompactPaper, CompactTopic } from '../../types/rss';

describe('rssGenerator', () => {
  const mockPaper: CompactPaper = {
    i: '2503.12345',
    t: 'Test Paper Title',
    a: ['Alice', 'Bob'],
    c: 'AI',
    p: '250307',
    g: [5, 12],
  };

  const mockTopics: Record<string, CompactTopic> = {
    '5': { n: 'Test Topic', k: ['test'], l: 3, p: 'AI' },
  };

  it('generateAtomFeed creates valid XML', () => {
    const feed = generateAtomFeed([mockPaper], mockTopics);

    expect(feed).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(feed).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(feed).toContain('Test Paper Title');
    expect(feed).toContain('2503.12345');
  });

  it('generateJSONFeed creates valid JSON', () => {
    const feed = generateJSONFeed([mockPaper], mockTopics);
    const parsed = JSON.parse(feed);

    expect(parsed.version).toBe('https://jsonfeed.org/version/1.1');
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].title).toBe('Test Paper Title');
  });
});
