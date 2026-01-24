import { describe, expect, it } from 'vitest';
import { type LegacyTemplateDoc, SlugType } from '../../../shared/types';
import { isLegacyTemplate, migrateTemplate } from './migrateTemplate';

function createLegacyTemplate(overrides: Partial<LegacyTemplateDoc> = {}): LegacyTemplateDoc {
  return {
    _id: 'repeatable:template:test-uuid:1',
    title: 'Test Template',
    slug: { type: SlugType.Timestamp },
    markdown: '- [ ] Task 1\n- [ ] Task 2',
    created: Date.now(),
    updated: Date.now(),
    versioned: Date.now(),
    values: [false, true],
    ...overrides,
  };
}

describe('isLegacyTemplate', () => {
  it('returns true for legacy template', () => {
    const template = createLegacyTemplate();
    expect(isLegacyTemplate(template)).toBe(true);
  });

  it('returns false for migrated template', () => {
    const template = {
      ...createLegacyTemplate(),
      schemaVersion: 2,
      values: [{ id: 'abc', default: false }],
    };
    expect(isLegacyTemplate(template)).toBe(false);
  });

  it('returns false for non-template documents', () => {
    expect(isLegacyTemplate(null)).toBe(false);
    expect(isLegacyTemplate(undefined)).toBe(false);
    expect(isLegacyTemplate({ _id: 'repeatable:instance:test' })).toBe(false);
    expect(isLegacyTemplate({ _id: 'other:document' })).toBe(false);
  });

  it('returns true for template with empty values array', () => {
    const template = createLegacyTemplate({ values: [] });
    expect(isLegacyTemplate(template)).toBe(true);
  });

  it('returns true for template with no values property (like 0.0.4 template)', () => {
    // The original 0.0.4 template had no values property at all
    const template = {
      _id: 'repeatable:template:0.0.4:2',
      title: 'Click Me First',
      slug: { type: 'date' },
      created: Date.now(),
      markdown: '- [ ] here is a checkbox you can check!',
      // No values property
      // No schemaVersion
    };
    expect(isLegacyTemplate(template)).toBe(true);
  });
});

describe('migrateTemplate', () => {
  it('assigns unique IDs to each checkbox', () => {
    const template = createLegacyTemplate({
      markdown: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3',
      values: [false, true, false],
    });

    const migrated = migrateTemplate(template);

    // Should have 3 checkbox values with unique IDs
    expect(migrated.values).toHaveLength(3);
    const ids = migrated.values.map((v) => v.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('preserves default values during migration', () => {
    const template = createLegacyTemplate({
      markdown: '- [ ] Unchecked\n- [x] Checked\n- [ ] Also unchecked',
      values: [false, true, false],
    });

    const migrated = migrateTemplate(template);

    expect(migrated.values[0].default).toBe(false);
    expect(migrated.values[1].default).toBe(true);
    expect(migrated.values[2].default).toBe(false);
  });

  it('handles nested checkboxes', () => {
    const template = createLegacyTemplate({
      markdown: '- [ ] Parent\n  - [ ] Child 1\n  - [ ] Child 2',
      values: [true, false, true],
    });

    const migrated = migrateTemplate(template);

    expect(migrated.values).toHaveLength(3);
    expect(migrated.values[0].default).toBe(true);
    expect(migrated.values[1].default).toBe(false);
    expect(migrated.values[2].default).toBe(true);
  });

  it('handles templates with no checkboxes', () => {
    const template = createLegacyTemplate({
      markdown: '# Just a header\nSome text',
      values: [],
    });

    const migrated = migrateTemplate(template);

    expect(migrated.values).toHaveLength(0);
    expect(migrated.schemaVersion).toBe(2);
  });

  it('is idempotent (migrating twice produces same result)', () => {
    const template = createLegacyTemplate({
      markdown: '- [ ] Task 1\n- [ ] Task 2',
      values: [false, true],
    });

    const firstMigration = migrateTemplate(template);

    // Create a "legacy" version from the first migration by removing schemaVersion
    const pseudoLegacy = {
      ...firstMigration,
      schemaVersion: undefined,
      values: firstMigration.values.map((v) => v.default),
    } as unknown as LegacyTemplateDoc;

    const secondMigration = migrateTemplate(pseudoLegacy);

    // The markdown should be identical (IDs preserved)
    expect(secondMigration.markdown).toBe(firstMigration.markdown);
  });

  it('sets schemaVersion to 2', () => {
    const template = createLegacyTemplate();
    const migrated = migrateTemplate(template);

    expect(migrated.schemaVersion).toBe(2);
  });

  it('embeds IDs in markdown as HTML comments', () => {
    const template = createLegacyTemplate({
      markdown: '- [ ] Task 1\n- [ ] Task 2',
      values: [false, false],
    });

    const migrated = migrateTemplate(template);

    // Markdown should contain checkbox ID comments
    expect(migrated.markdown).toMatch(/<!-- cb:[a-f0-9-]+ -->/);
    // Should have 2 ID comments
    const matches = migrated.markdown.match(/<!-- cb:[a-f0-9-]+ -->/g);
    expect(matches).toHaveLength(2);
  });

  it('preserves other template properties', () => {
    const template = createLegacyTemplate({
      _id: 'repeatable:template:my-uuid:5',
      _rev: '3-abc123',
      title: 'My Special Template',
      slug: { type: SlugType.String, placeholder: 'Enter name' },
      created: 1234567890,
      updated: 1234567899,
      versioned: 1234567895,
    });

    const migrated = migrateTemplate(template);

    expect(migrated._id).toBe('repeatable:template:my-uuid:5');
    expect(migrated._rev).toBe('3-abc123');
    expect(migrated.title).toBe('My Special Template');
    expect(migrated.slug).toEqual({ type: SlugType.String, placeholder: 'Enter name' });
    expect(migrated.created).toBe(1234567890);
    expect(migrated.updated).toBe(1234567899);
    expect(migrated.versioned).toBe(1234567895);
  });

  it('handles mismatched values count (fewer values than checkboxes)', () => {
    const template = createLegacyTemplate({
      markdown: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3',
      values: [true], // Only one value for 3 checkboxes
    });

    const migrated = migrateTemplate(template);

    expect(migrated.values).toHaveLength(3);
    expect(migrated.values[0].default).toBe(true);
    expect(migrated.values[1].default).toBe(false); // Defaults to false
    expect(migrated.values[2].default).toBe(false);
  });

  it('handles mismatched values count (more values than checkboxes)', () => {
    const template = createLegacyTemplate({
      markdown: '- [ ] Task 1',
      values: [true, false, true], // 3 values for 1 checkbox
    });

    const migrated = migrateTemplate(template);

    expect(migrated.values).toHaveLength(1);
    expect(migrated.values[0].default).toBe(true);
  });

  it('handles templates with no values property (like 0.0.4 template)', () => {
    // The original 0.0.4 template had no values property at all
    const template = {
      _id: 'repeatable:template:0.0.4:2',
      title: 'Click Me First',
      slug: { type: 'date' },
      created: Date.now(),
      updated: Date.now(),
      versioned: Date.now(),
      markdown: '- [ ] here is a checkbox you can check!',
      // No values property - this is the key difference
    } as unknown as LegacyTemplateDoc;

    const migrated = migrateTemplate(template);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.values).toHaveLength(1);
    expect(migrated.values[0].default).toBe(false); // Defaults to false when no value exists
    expect(migrated.markdown).toMatch(/<!-- cb:[a-f0-9-]+ -->/);
  });
});
