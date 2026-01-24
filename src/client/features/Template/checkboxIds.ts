import { v4 as uuid } from 'uuid';

export interface CheckboxInfo {
  id: string;
  lineIndex: number;
}

// Regex to match checkbox ID comments: <!-- cb:id -->
// IDs can be alphanumeric with hyphens and underscores
const CHECKBOX_ID_REGEX = /<!--\s*cb:([a-zA-Z0-9_-]+)\s*-->/;
// Regex to match a checkbox in markdown: - [ ] or - [x] or * [ ] or * [x]
const CHECKBOX_LINE_REGEX = /^(\s*[-*]\s*\[[ xX]\])/;

/**
 * Parse markdown and extract checkbox IDs in document order.
 * Returns an array of { id, lineIndex } for checkboxes that have IDs.
 * Checkboxes without IDs are not included.
 */
export function parseCheckboxIds(markdown: string): CheckboxInfo[] {
  const lines = markdown.split('\n');
  const result: CheckboxInfo[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this line has a checkbox
    if (!CHECKBOX_LINE_REGEX.test(line)) {
      continue;
    }

    // Look for an ID comment on this line
    const idMatch = line.match(CHECKBOX_ID_REGEX);
    if (idMatch) {
      result.push({
        id: idMatch[1],
        lineIndex: i,
      });
    }
  }

  return result;
}

/**
 * Generate a short unique ID for checkboxes.
 * Uses first 8 characters of a UUID for brevity while maintaining uniqueness.
 */
export function generateCheckboxId(): string {
  // FIXME: make this more robust. Hash of markdown up to and including the checkbox line?
  return uuid().substring(0, 8);
}

/**
 * Insert IDs for any checkboxes that don't have them.
 * Preserves existing IDs. Returns the modified markdown.
 */
export function ensureCheckboxIds(markdown: string): string {
  const lines = markdown.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    // Check if this line has a checkbox
    if (!CHECKBOX_LINE_REGEX.test(line)) {
      result.push(line);
      continue;
    }

    // Check if it already has an ID
    if (CHECKBOX_ID_REGEX.test(line)) {
      result.push(line);
      continue;
    }

    // Add an ID to this checkbox
    const id = generateCheckboxId();
    // Insert the ID comment at the end of the line
    result.push(`${line} <!-- cb:${id} -->`);
  }

  return result.join('\n');
}

/**
 * Get the checkbox ID at a given document index (0-based).
 * This is used when rendering to map positional index to checkbox ID.
 */
export function getCheckboxIdAtIndex(markdown: string, index: number): string | undefined {
  const checkboxes = parseCheckboxIds(markdown);
  return checkboxes[index]?.id;
}

/**
 * Get all checkbox IDs from markdown in document order.
 * This returns just the IDs as an array for simpler iteration.
 */
export function getAllCheckboxIds(markdown: string): string[] {
  return parseCheckboxIds(markdown).map((info) => info.id);
}

/**
 * Count the number of checkboxes in the markdown.
 * This counts ALL checkboxes, regardless of whether they have IDs.
 */
export function countCheckboxes(markdown: string): number {
  const lines = markdown.split('\n');
  let count = 0;
  for (const line of lines) {
    if (CHECKBOX_LINE_REGEX.test(line)) {
      count++;
    }
  }
  return count;
}
