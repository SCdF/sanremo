import { describe, expect, it } from 'vitest';
import {
  countCheckboxes,
  ensureCheckboxIds,
  getAllCheckboxIds,
  getCheckboxIdAtIndex,
  parseCheckboxIds,
} from './checkboxIds';

describe('parseCheckboxIds', () => {
  it('extracts IDs from HTML comments', () => {
    const markdown = `- [ ] Task 1 <!-- cb:abc123 -->
- [ ] Task 2 <!-- cb:def456 -->`;

    const result = parseCheckboxIds(markdown);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'abc123', lineIndex: 0 });
    expect(result[1]).toEqual({ id: 'def456', lineIndex: 1 });
  });

  it('returns IDs in document order', () => {
    const markdown = `- [ ] First <!-- cb:first -->
Some text
- [ ] Second <!-- cb:second -->
- [ ] Third <!-- cb:third -->`;

    const result = parseCheckboxIds(markdown);

    expect(result.map((r) => r.id)).toEqual(['first', 'second', 'third']);
    expect(result.map((r) => r.lineIndex)).toEqual([0, 2, 3]);
  });

  it('handles checkboxes without IDs (not included)', () => {
    const markdown = `- [ ] Has ID <!-- cb:abc123 -->
- [ ] No ID
- [ ] Also has ID <!-- cb:def456 -->`;

    const result = parseCheckboxIds(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('abc123');
    expect(result[1].id).toBe('def456');
  });

  it('handles nested checkboxes', () => {
    const markdown = `- [ ] Parent <!-- cb:parent -->
  - [ ] Child 1 <!-- cb:child1 -->
  - [ ] Child 2 <!-- cb:child2 -->
- [ ] Sibling <!-- cb:sibling -->`;

    const result = parseCheckboxIds(markdown);

    expect(result).toHaveLength(4);
    expect(result.map((r) => r.id)).toEqual(['parent', 'child1', 'child2', 'sibling']);
  });

  it('handles * style checkboxes', () => {
    const markdown = `* [ ] Task 1 <!-- cb:abc123 -->
* [x] Task 2 <!-- cb:def456 -->`;

    const result = parseCheckboxIds(markdown);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('abc123');
    expect(result[1].id).toBe('def456');
  });

  it('handles checked checkboxes', () => {
    const markdown = `- [x] Checked <!-- cb:checked -->
- [X] Also checked <!-- cb:also -->
- [ ] Unchecked <!-- cb:unchecked -->`;

    const result = parseCheckboxIds(markdown);

    expect(result).toHaveLength(3);
  });

  it('handles empty markdown', () => {
    const result = parseCheckboxIds('');
    expect(result).toHaveLength(0);
  });

  it('handles markdown with no checkboxes', () => {
    const markdown = `# Header
Some text
- Regular list item`;

    const result = parseCheckboxIds(markdown);
    expect(result).toHaveLength(0);
  });

  it('handles various ID formats', () => {
    const markdown = `- [ ] Task <!-- cb:a1b2c3d4 -->
- [ ] Task <!-- cb:12345678 -->
- [ ] Task <!-- cb:abcdefab -->`;

    const result = parseCheckboxIds(markdown);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('a1b2c3d4');
    expect(result[1].id).toBe('12345678');
    expect(result[2].id).toBe('abcdefab');
  });

  it('handles whitespace in comments', () => {
    const markdown = `- [ ] Task <!--cb:nospace-->
- [ ] Task <!-- cb:withspace -->
- [ ] Task <!--  cb:extraspace  -->`;

    const result = parseCheckboxIds(markdown);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('nospace');
    expect(result[1].id).toBe('withspace');
    expect(result[2].id).toBe('extraspace');
  });
});

describe('ensureCheckboxIds', () => {
  it('adds IDs to checkboxes without them', () => {
    const markdown = `- [ ] Task 1
- [ ] Task 2`;

    const result = ensureCheckboxIds(markdown);

    // Should have added ID comments
    expect(result).toMatch(/- \[ \] Task 1 <!-- cb:[a-f0-9-]+ -->/);
    expect(result).toMatch(/- \[ \] Task 2 <!-- cb:[a-f0-9-]+ -->/);
  });

  it('preserves existing IDs', () => {
    const markdown = `- [ ] Task 1 <!-- cb:existing -->
- [ ] Task 2`;

    const result = ensureCheckboxIds(markdown);

    expect(result).toContain('<!-- cb:existing -->');
    // Task 2 should have a new ID
    const lines = result.split('\n');
    expect(lines[1]).toMatch(/<!-- cb:[a-f0-9-]+ -->/);
  });

  it('generates unique IDs', () => {
    const markdown = `- [ ] Task 1
- [ ] Task 2
- [ ] Task 3`;

    const result = ensureCheckboxIds(markdown);
    const ids = getAllCheckboxIds(result);

    expect(ids).toHaveLength(3);
    // All IDs should be unique
    expect(new Set(ids).size).toBe(3);
  });

  it('handles mixed checkboxes', () => {
    const markdown = `- [ ] Has ID <!-- cb:abc123 -->
- [ ] No ID
- [x] Checked no ID`;

    const result = ensureCheckboxIds(markdown);
    const ids = getAllCheckboxIds(result);

    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe('abc123');
    expect(ids[1]).not.toBe('abc123');
    expect(ids[2]).not.toBe('abc123');
  });

  it('preserves non-checkbox content', () => {
    const markdown = `# Header
- [ ] Task <!-- cb:abc123 -->
Some paragraph text.
- Regular list item`;

    const result = ensureCheckboxIds(markdown);

    expect(result).toContain('# Header');
    expect(result).toContain('Some paragraph text.');
    expect(result).toContain('- Regular list item');
  });

  it('is idempotent', () => {
    const markdown = `- [ ] Task 1
- [ ] Task 2`;

    const firstPass = ensureCheckboxIds(markdown);
    const secondPass = ensureCheckboxIds(firstPass);

    // Should be identical after second pass
    expect(secondPass).toBe(firstPass);
  });
});

describe('getCheckboxIdAtIndex', () => {
  it('returns ID at given index', () => {
    const markdown = `- [ ] Task 1 <!-- cb:first -->
- [ ] Task 2 <!-- cb:second -->
- [ ] Task 3 <!-- cb:third -->`;

    expect(getCheckboxIdAtIndex(markdown, 0)).toBe('first');
    expect(getCheckboxIdAtIndex(markdown, 1)).toBe('second');
    expect(getCheckboxIdAtIndex(markdown, 2)).toBe('third');
  });

  it('returns undefined for out of bounds index', () => {
    const markdown = `- [ ] Task 1 <!-- cb:first -->`;

    expect(getCheckboxIdAtIndex(markdown, 1)).toBeUndefined();
    expect(getCheckboxIdAtIndex(markdown, -1)).toBeUndefined();
  });

  it('returns undefined for empty markdown', () => {
    expect(getCheckboxIdAtIndex('', 0)).toBeUndefined();
  });
});

describe('getAllCheckboxIds', () => {
  it('returns all IDs in order', () => {
    const markdown = `- [ ] Task 1 <!-- cb:a -->
- [ ] Task 2 <!-- cb:b -->
- [ ] Task 3 <!-- cb:c -->`;

    const ids = getAllCheckboxIds(markdown);

    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for no checkboxes', () => {
    const ids = getAllCheckboxIds('# Just a header');
    expect(ids).toEqual([]);
  });
});

describe('countCheckboxes', () => {
  it('counts all checkboxes regardless of IDs', () => {
    const markdown = `- [ ] Has ID <!-- cb:abc -->
- [ ] No ID
- [x] Checked`;

    expect(countCheckboxes(markdown)).toBe(3);
  });

  it('returns 0 for no checkboxes', () => {
    expect(countCheckboxes('# Header\nSome text')).toBe(0);
  });

  it('counts nested checkboxes', () => {
    const markdown = `- [ ] Parent
  - [ ] Child 1
  - [ ] Child 2
- [ ] Sibling`;

    expect(countCheckboxes(markdown)).toBe(4);
  });
});
