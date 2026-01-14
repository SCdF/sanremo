import type { Element, Parent, Root } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Rehype plugin that adds data-checkbox-index attribute to task list checkboxes
 * and their parent li elements.
 *
 * Checkboxes are indexed in document order, including nested checkboxes.
 * This allows mapping each checkbox to its position in the values array.
 * The index is also added to parent li elements to enable clickable labels.
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
 *
 * And the parent li elements will also have the same data-checkbox-index.
 */
export function rehypeCheckboxIndex() {
  return (tree: Root) => {
    let index = 0;
    visit(tree, 'element', (node: Element, _idx, parent: Parent | undefined) => {
      if (node.tagName === 'input' && node.properties?.type === 'checkbox') {
        node.properties.dataCheckboxIndex = index;
        // Also add index to parent li for clickable labels
        if (parent && 'tagName' in parent && parent.tagName === 'li') {
          (parent as Element).properties = (parent as Element).properties || {};
          (parent as Element).properties.dataCheckboxIndex = index;
        }
        index++;
      }
    });
  };
}
