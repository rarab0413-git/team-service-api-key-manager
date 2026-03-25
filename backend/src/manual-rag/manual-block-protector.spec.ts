import {
  protectBlocks,
  restorePlaceholders,
  protectFencedBlocks,
} from './manual-block-protector';

describe('manual-block-protector', () => {
  it('protects and restores fenced code', () => {
    const md = 'before\n```ts\nconst x = 1;\n```\nafter';
    const { text, allPlaceholders } = protectBlocks(md);
    expect(text).not.toContain('const x');
    const restored = restorePlaceholders(text, allPlaceholders);
    expect(restored).toContain('const x = 1');
  });

  it('does not split fence tokens when restoring', () => {
    const { text, placeholders } = protectFencedBlocks('```\na\n```');
    expect(placeholders.size).toBe(1);
    const r = restorePlaceholders(text, placeholders);
    expect(r.trim()).toMatch(/^```\s*\na\n```$/m);
  });
});
