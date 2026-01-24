import type { LegacyRepeatableDoc, RepeatableDoc, TemplateDoc } from '../../../shared/types';
import { parseCheckboxIds } from '../Template/checkboxIds';

/**
 * Check if a document is a legacy repeatable (schema version 1).
 */
export function isLegacyRepeatable(doc: unknown): doc is LegacyRepeatableDoc {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as Record<string, unknown>;
  return (
    typeof d._id === 'string' &&
    d._id.startsWith('repeatable:instance:') &&
    d.schemaVersion === undefined &&
    Array.isArray(d.values) &&
    (d.values.length === 0 || typeof d.values[0] === 'boolean')
  );
}

/**
 * Migrate a legacy repeatable to the new schema.
 *
 * 1. Get checkbox IDs from template (in document order)
 * 2. Map positional values to ID-keyed record
 * 3. Set schemaVersion: 2
 *
 * @param repeatable - The legacy repeatable to migrate
 * @param template - The already-migrated template this repeatable references
 */
export function migrateRepeatable(
  repeatable: LegacyRepeatableDoc,
  template: TemplateDoc,
): RepeatableDoc {
  // Get checkbox IDs from the migrated template's markdown
  const checkboxInfos = parseCheckboxIds(template.markdown);

  // Convert boolean[] to Record<string, boolean>
  // Map positional values to the checkbox IDs
  const migratedValues: Record<string, boolean> = {};

  for (let i = 0; i < checkboxInfos.length; i++) {
    const info = checkboxInfos[i];
    // Use the positional value if available, otherwise use template default
    if (i < repeatable.values.length) {
      migratedValues[info.id] = repeatable.values[i];
    } else {
      // Find the template default for this checkbox
      const templateValue = template.values.find((v) => v.id === info.id);
      migratedValues[info.id] = templateValue?.default ?? false;
    }
  }

  return {
    ...repeatable,
    values: migratedValues,
    schemaVersion: 2,
  };
}
