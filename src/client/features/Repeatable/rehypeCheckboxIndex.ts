import type { Comment, Element, Parent, Root } from 'hast';
import { visit } from 'unist-util-visit';

export type CheckboxInfo = {
  index: number;
  id: string | undefined;
};

export type CheckboxIdsCallback = (checkboxIds: string[]) => void;

// Regex to extract checkbox ID from HTML comment: <!-- cb:id -->
// IDs can be alphanumeric with hyphens and underscores
const CHECKBOX_ID_REGEX = /^\s*cb:([a-zA-Z0-9_-]+)\s*$/;

/**
 * Find checkbox ID from a comment node that follows a checkbox.
 */
function extractCheckboxIdFromComment(comment: Comment): string | undefined {
  const match = comment.value.match(CHECKBOX_ID_REGEX);
  return match ? match[1] : undefined;
}

/**
 * Rehype plugin that adds data-checkbox-index and data-checkbox-id attributes
 * to task list checkboxes and their parent li elements.
 *
 * Checkboxes are indexed in document order, including nested checkboxes.
 * The index is used for focus management, while the ID is used for value lookup.
 *
 * Checkbox IDs are extracted from HTML comments that follow checkboxes:
 *   - [ ] Task 1 <!-- cb:a1b2c3 -->
 *
 * Example: A markdown like:
 *   - [ ] Task 1 <!-- cb:abc123 -->
 *     - [ ] Subtask 1.1 <!-- cb:def456 -->
 *   - [ ] Task 2 <!-- cb:ghi789 -->
 *
 * Will produce checkboxes with:
 *   data-checkbox-index="0" data-checkbox-id="abc123" for Task 1
 *   data-checkbox-index="1" data-checkbox-id="def456" for Subtask 1.1
 *   data-checkbox-index="2" data-checkbox-id="ghi789" for Task 2
 *
 * @param onCheckboxIds - Optional callback that receives the checkbox IDs after traversal
 */
export function rehypeCheckboxIndex(onCheckboxIds?: CheckboxIdsCallback) {
  return (tree: Root) => {
    let index = 0;
    const checkboxIds: string[] = [];

    visit(tree, 'element', (node: Element, nodeIdx, parent: Parent | undefined) => {
      if (node.tagName === 'input' && node.properties?.type === 'checkbox') {
        node.properties.dataCheckboxIndex = index;

        // Look for checkbox ID in the parent's children (comment following the checkbox)
        let checkboxId: string | undefined;
        if (parent && 'children' in parent && typeof nodeIdx === 'number') {
          // Search for a comment node after this checkbox in the parent
          for (let i = nodeIdx + 1; i < parent.children.length; i++) {
            const sibling = parent.children[i];
            if (sibling.type === 'comment') {
              checkboxId = extractCheckboxIdFromComment(sibling);
              break;
            }
            // Stop searching if we hit another element (not text/whitespace)
            if (sibling.type === 'element') {
              break;
            }
          }
        }

        if (checkboxId) {
          node.properties.dataCheckboxId = checkboxId;
        }
        checkboxIds.push(checkboxId ?? '');

        // Also add attributes to parent li for clickable labels
        if (parent && 'tagName' in parent && parent.tagName === 'li') {
          (parent as Element).properties = (parent as Element).properties || {};
          (parent as Element).properties.dataCheckboxIndex = index;
          if (checkboxId) {
            (parent as Element).properties.dataCheckboxId = checkboxId;
          }
        }
        index++;
      }
    });
    onCheckboxIds?.(checkboxIds);
  };
}
