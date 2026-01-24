import type { TemplateDoc } from '../../../shared/types';
import { parseCheckboxIds } from '../Template/checkboxIds';

/**
 * Migrate a repeatable's values to a new template version.
 *
 * When a template is edited, checkboxes may be:
 * - Unchanged: Keep the existing value
 * - Added: Use the template's default value
 * - Removed: Value is dropped (not included in result)
 * - Reordered: Values follow their IDs, not positions
 *
 * @param currentValues - The repeatable's current checkbox values
 * @param newTemplate - The new template version to migrate to
 * @returns New values Record for the updated template
 */
export function migrateRepeatableValues(
  currentValues: Record<string, boolean>,
  newTemplate: TemplateDoc,
): Record<string, boolean> {
  const newValues: Record<string, boolean> = {};

  // Get checkbox IDs from new template's markdown
  const newCheckboxIds = parseCheckboxIds(newTemplate.markdown);

  for (const { id } of newCheckboxIds) {
    if (id in currentValues) {
      // Checkbox exists in both - preserve state
      newValues[id] = currentValues[id];
    } else {
      // New checkbox - use template default
      const defaultValue = newTemplate.values.find((v) => v.id === id);
      newValues[id] = defaultValue?.default ?? false;
    }
  }

  // Checkboxes in currentValues but not in newTemplate are dropped
  // (they were removed from the template)

  return newValues;
}
