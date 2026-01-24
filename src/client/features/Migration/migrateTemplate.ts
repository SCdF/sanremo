import type { CheckboxValue, LegacyTemplateDoc, TemplateDoc } from '../../../shared/types';
import { ensureCheckboxIds, parseCheckboxIds } from '../Template/checkboxIds';

/**
 * Check if a document is a legacy template (schema version 1).
 *
 * Legacy templates have:
 * - No schemaVersion field
 * - Either no values field, or values as boolean[] instead of CheckboxValue[]
 */
export function isLegacyTemplate(doc: unknown): doc is LegacyTemplateDoc {
  if (!doc || typeof doc !== 'object') return false;
  const d = doc as Record<string, unknown>;

  // Must be a template document without schema version
  if (typeof d._id !== 'string' || !d._id.startsWith('repeatable:template:')) return false;
  if (d.schemaVersion !== undefined) return false;

  // Legacy if values is missing/undefined
  if (d.values === undefined) return true;

  // Legacy if values is boolean[] (empty array or first element is boolean)
  if (Array.isArray(d.values)) {
    return d.values.length === 0 || typeof d.values[0] === 'boolean';
  }

  return false;
}

/**
 * Migrate a legacy template to the new schema.
 *
 * 1. Parse markdown to find checkboxes
 * 2. Assign UUID to each checkbox (via HTML comments)
 * 3. Convert values array to CheckboxValue[]
 * 4. Set schemaVersion: 2
 */
export function migrateTemplate(template: LegacyTemplateDoc): TemplateDoc {
  // Ensure all checkboxes have IDs embedded in the markdown
  const migratedMarkdown = ensureCheckboxIds(template.markdown);

  // Parse the checkbox IDs from the updated markdown
  const checkboxInfos = parseCheckboxIds(migratedMarkdown);

  // Convert boolean[] to CheckboxValue[]
  // Map positional values to the checkbox IDs
  // Use optional chaining since legacy templates may have no values array
  const migratedValues: CheckboxValue[] = checkboxInfos.map((info, index) => ({
    id: info.id,
    default: template.values?.[index] ?? false,
  }));

  return {
    ...template,
    markdown: migratedMarkdown,
    values: migratedValues,
    schemaVersion: 2,
  };
}
