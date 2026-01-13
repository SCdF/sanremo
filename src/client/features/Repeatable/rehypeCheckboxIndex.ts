import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that adds data-checkbox-index attribute to task list checkboxes.
 * Checkboxes are indexed in document order, including nested checkboxes.
 * This allows mapping each checkbox to its position in the values array.
 *
 * Example: A markdown like:
 *   - [ ] Task 1
 *     - [ ] Subtask 1.1
 *   - [ ] Task 2
 *
 * Will produce checkboxes with:
 *   data-checkbox-index="0" for Task 1
 *   data-checkbox-index="1" for Subtask 1.1
 *   data-checkbox-index="2" for Task 2
 */
export function rehypeCheckboxIndex() {
  return (tree: Root) => {
    let index = 0;
    visit(tree, 'element', (node: Element) => {
      if (node.tagName === 'input' && node.properties?.type === 'checkbox') {
        node.properties.dataCheckboxIndex = index;
        index++;
      }
    });
  };
}
