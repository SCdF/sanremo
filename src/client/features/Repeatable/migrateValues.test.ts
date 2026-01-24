import { describe, expect, it } from 'vitest';
import { SlugType, type TemplateDoc } from '../../../shared/types';
import { migrateRepeatableValues } from './migrateValues';

function createTemplate(
  markdown: string,
  values: Array<{ id: string; default: boolean }>,
): TemplateDoc {
  return {
    _id: 'repeatable:template:test:1',
    title: 'Test',
    slug: { type: SlugType.Timestamp },
    markdown,
    created: Date.now(),
    updated: Date.now(),
    versioned: Date.now(),
    values,
    schemaVersion: 2,
  };
}

describe('migrateRepeatableValues', () => {
  it('preserves values for unchanged checkboxes', () => {
    const currentValues = {
      abc: true,
      def: false,
      ghi: true,
    };

    const newTemplate = createTemplate(
      '- [ ] Task 1 <!-- cb:abc -->\n- [ ] Task 2 <!-- cb:def -->\n- [ ] Task 3 <!-- cb:ghi -->',
      [
        { id: 'abc', default: false },
        { id: 'def', default: false },
        { id: 'ghi', default: false },
      ],
    );

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({
      abc: true,
      def: false,
      ghi: true,
    });
  });

  it('uses defaults for newly added checkboxes', () => {
    const currentValues = {
      abc: true,
    };

    const newTemplate = createTemplate(
      '- [ ] Task 1 <!-- cb:abc -->\n- [ ] New Task <!-- cb:new -->\n- [ ] Another New <!-- cb:another -->',
      [
        { id: 'abc', default: false },
        { id: 'new', default: true },
        { id: 'another', default: false },
      ],
    );

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({
      abc: true, // Preserved
      new: true, // From template default
      another: false, // From template default
    });
  });

  it('drops values for removed checkboxes', () => {
    const currentValues = {
      abc: true,
      def: false,
      ghi: true,
      removed: true,
    };

    const newTemplate = createTemplate(
      '- [ ] Task 1 <!-- cb:abc -->\n- [ ] Task 3 <!-- cb:ghi -->',
      [
        { id: 'abc', default: false },
        { id: 'ghi', default: false },
      ],
    );

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({
      abc: true,
      ghi: true,
    });
    expect(result).not.toHaveProperty('def');
    expect(result).not.toHaveProperty('removed');
  });

  it('handles complete checkbox replacement', () => {
    const currentValues = {
      old1: true,
      old2: false,
    };

    const newTemplate = createTemplate(
      '- [ ] New 1 <!-- cb:new1 -->\n- [ ] New 2 <!-- cb:new2 -->',
      [
        { id: 'new1', default: true },
        { id: 'new2', default: false },
      ],
    );

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({
      new1: true,
      new2: false,
    });
  });

  it('handles reordered checkboxes (IDs stay same, order changes)', () => {
    const currentValues = {
      first: true,
      second: false,
      third: true,
    };

    // Same IDs but in different order in the template
    const newTemplate = createTemplate(
      '- [ ] Third <!-- cb:third -->\n- [ ] First <!-- cb:first -->\n- [ ] Second <!-- cb:second -->',
      [
        { id: 'third', default: false },
        { id: 'first', default: false },
        { id: 'second', default: false },
      ],
    );

    const result = migrateRepeatableValues(currentValues, newTemplate);

    // Values should be preserved by ID, not position
    expect(result).toEqual({
      third: true,
      first: true,
      second: false,
    });
  });

  it('handles empty current values', () => {
    const currentValues = {};

    const newTemplate = createTemplate(
      '- [ ] Task 1 <!-- cb:abc -->\n- [ ] Task 2 <!-- cb:def -->',
      [
        { id: 'abc', default: true },
        { id: 'def', default: false },
      ],
    );

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({
      abc: true,
      def: false,
    });
  });

  it('handles template with no checkboxes', () => {
    const currentValues = {
      abc: true,
      def: false,
    };

    const newTemplate = createTemplate('# No checkboxes anymore', []);

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({});
  });

  it('defaults to false when checkbox has no template default', () => {
    const currentValues = {};

    // Markdown has checkbox but values array doesn't include its default
    const newTemplate = createTemplate('- [ ] Task <!-- cb:orphan -->', []);

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({
      orphan: false,
    });
  });

  it('handles mixed scenario: some preserved, some new, some removed', () => {
    const currentValues = {
      kept1: true,
      kept2: false,
      removed1: true,
      removed2: false,
    };

    const newTemplate = createTemplate(
      '- [ ] Kept 1 <!-- cb:kept1 -->\n- [ ] New 1 <!-- cb:new1 -->\n- [ ] Kept 2 <!-- cb:kept2 -->\n- [ ] New 2 <!-- cb:new2 -->',
      [
        { id: 'kept1', default: false },
        { id: 'new1', default: true },
        { id: 'kept2', default: false },
        { id: 'new2', default: false },
      ],
    );

    const result = migrateRepeatableValues(currentValues, newTemplate);

    expect(result).toEqual({
      kept1: true, // Preserved
      new1: true, // New with default true
      kept2: false, // Preserved
      new2: false, // New with default false
    });
  });
});
