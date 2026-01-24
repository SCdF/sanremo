import { describe, expect, it } from 'vitest';
import { type LegacyRepeatableDoc, SlugType, type TemplateDoc } from '../../../shared/types';
import { isLegacyRepeatable, migrateRepeatable } from './migrateRepeatable';

function createLegacyRepeatable(overrides: Partial<LegacyRepeatableDoc> = {}): LegacyRepeatableDoc {
  return {
    _id: 'repeatable:instance:test-uuid',
    template: 'repeatable:template:tmpl-uuid:1',
    slug: Date.now(),
    created: Date.now(),
    updated: Date.now(),
    values: [true, false, true],
    ...overrides,
  };
}

function createMigratedTemplate(
  markdown: string,
  values: Array<{ id: string; default: boolean }>,
): TemplateDoc {
  return {
    _id: 'repeatable:template:tmpl-uuid:1',
    title: 'Test Template',
    slug: { type: SlugType.Timestamp },
    markdown,
    created: Date.now(),
    updated: Date.now(),
    versioned: Date.now(),
    values,
    schemaVersion: 2,
  };
}

describe('isLegacyRepeatable', () => {
  it('returns true for legacy repeatable', () => {
    const repeatable = createLegacyRepeatable();
    expect(isLegacyRepeatable(repeatable)).toBe(true);
  });

  it('returns false for migrated repeatable', () => {
    const repeatable = {
      ...createLegacyRepeatable(),
      schemaVersion: 2,
      values: { abc: true, def: false },
    };
    expect(isLegacyRepeatable(repeatable)).toBe(false);
  });

  it('returns false for non-repeatable documents', () => {
    expect(isLegacyRepeatable(null)).toBe(false);
    expect(isLegacyRepeatable(undefined)).toBe(false);
    expect(isLegacyRepeatable({ _id: 'repeatable:template:test:1' })).toBe(false);
    expect(isLegacyRepeatable({ _id: 'other:document' })).toBe(false);
  });

  it('returns true for repeatable with empty values array', () => {
    const repeatable = createLegacyRepeatable({ values: [] });
    expect(isLegacyRepeatable(repeatable)).toBe(true);
  });
});

describe('migrateRepeatable', () => {
  it('maps positional values to checkbox IDs', () => {
    const template = createMigratedTemplate(
      '- [ ] Task 1 <!-- cb:abc -->\n- [ ] Task 2 <!-- cb:def -->\n- [ ] Task 3 <!-- cb:ghi -->',
      [
        { id: 'abc', default: false },
        { id: 'def', default: false },
        { id: 'ghi', default: false },
      ],
    );

    const repeatable = createLegacyRepeatable({
      values: [true, false, true],
    });

    const migrated = migrateRepeatable(repeatable, template);

    expect(migrated.values).toEqual({
      abc: true,
      def: false,
      ghi: true,
    });
  });

  it('handles mismatched value count (fewer values than checkboxes)', () => {
    const template = createMigratedTemplate(
      '- [ ] Task 1 <!-- cb:abc -->\n- [ ] Task 2 <!-- cb:def -->\n- [ ] Task 3 <!-- cb:ghi -->',
      [
        { id: 'abc', default: false },
        { id: 'def', default: true },
        { id: 'ghi', default: false },
      ],
    );

    const repeatable = createLegacyRepeatable({
      values: [true], // Only one value
    });

    const migrated = migrateRepeatable(repeatable, template);

    expect(migrated.values).toEqual({
      abc: true, // From repeatable
      def: true, // From template default
      ghi: false, // From template default
    });
  });

  it('handles mismatched value count (more values than checkboxes)', () => {
    const template = createMigratedTemplate('- [ ] Task 1 <!-- cb:abc -->', [
      { id: 'abc', default: false },
    ]);

    const repeatable = createLegacyRepeatable({
      values: [true, false, true], // 3 values for 1 checkbox
    });

    const migrated = migrateRepeatable(repeatable, template);

    expect(migrated.values).toEqual({
      abc: true,
    });
  });

  it('preserves checked state during migration', () => {
    const template = createMigratedTemplate(
      '- [ ] A <!-- cb:a -->\n- [ ] B <!-- cb:b -->\n- [ ] C <!-- cb:c -->\n- [ ] D <!-- cb:d -->',
      [
        { id: 'a', default: false },
        { id: 'b', default: false },
        { id: 'c', default: false },
        { id: 'd', default: false },
      ],
    );

    const repeatable = createLegacyRepeatable({
      values: [true, true, false, false],
    });

    const migrated = migrateRepeatable(repeatable, template);

    expect(migrated.values.a).toBe(true);
    expect(migrated.values.b).toBe(true);
    expect(migrated.values.c).toBe(false);
    expect(migrated.values.d).toBe(false);
  });

  it('sets schemaVersion to 2', () => {
    const template = createMigratedTemplate('- [ ] Task <!-- cb:abc -->', [
      { id: 'abc', default: false },
    ]);

    const repeatable = createLegacyRepeatable({ values: [true] });
    const migrated = migrateRepeatable(repeatable, template);

    expect(migrated.schemaVersion).toBe(2);
  });

  it('preserves other repeatable properties', () => {
    const template = createMigratedTemplate('- [ ] Task <!-- cb:abc -->', [
      { id: 'abc', default: false },
    ]);

    const repeatable = createLegacyRepeatable({
      _id: 'repeatable:instance:my-uuid',
      _rev: '5-xyz789',
      template: 'repeatable:template:tmpl:3',
      slug: 'my-slug',
      created: 1111111111,
      updated: 2222222222,
      completed: 3333333333,
      values: [true],
    });

    const migrated = migrateRepeatable(repeatable, template);

    expect(migrated._id).toBe('repeatable:instance:my-uuid');
    expect(migrated._rev).toBe('5-xyz789');
    expect(migrated.template).toBe('repeatable:template:tmpl:3');
    expect(migrated.slug).toBe('my-slug');
    expect(migrated.created).toBe(1111111111);
    expect(migrated.updated).toBe(2222222222);
    expect(migrated.completed).toBe(3333333333);
  });

  it('handles empty values array', () => {
    const template = createMigratedTemplate('# No checkboxes', []);

    const repeatable = createLegacyRepeatable({ values: [] });
    const migrated = migrateRepeatable(repeatable, template);

    expect(migrated.values).toEqual({});
  });
});
