import type { Element, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import { rehypeCheckboxIndex } from './rehypeCheckboxIndex';

/**
 * Helper to create a checkbox input element
 */
function checkbox(props: Record<string, unknown> = {}): Element {
  return {
    type: 'element',
    tagName: 'input',
    properties: { type: 'checkbox', ...props },
    children: [],
  };
}

/**
 * Helper to create a list item element
 */
function li(children: Element[]): Element {
  return {
    type: 'element',
    tagName: 'li',
    properties: {},
    children,
  };
}

/**
 * Helper to create an unordered list element
 */
function ul(children: Element[]): Element {
  return {
    type: 'element',
    tagName: 'ul',
    properties: {},
    children,
  };
}

describe('rehypeCheckboxIndex', () => {
  it('adds index to a single checkbox', () => {
    const tree: Root = {
      type: 'root',
      children: [checkbox()],
    };

    rehypeCheckboxIndex()(tree);

    const input = tree.children[0] as Element;
    expect(input.properties?.dataCheckboxIndex).toBe(0);
  });

  it('adds sequential indices to multiple checkboxes', () => {
    const tree: Root = {
      type: 'root',
      children: [ul([li([checkbox()]), li([checkbox()]), li([checkbox()])])],
    };

    rehypeCheckboxIndex()(tree);

    const list = tree.children[0] as Element;
    const items = list.children as Element[];

    expect((items[0].children[0] as Element).properties?.dataCheckboxIndex).toBe(0);
    expect((items[1].children[0] as Element).properties?.dataCheckboxIndex).toBe(1);
    expect((items[2].children[0] as Element).properties?.dataCheckboxIndex).toBe(2);
  });

  it('adds index to parent li elements for clickable labels', () => {
    const tree: Root = {
      type: 'root',
      children: [ul([li([checkbox()]), li([checkbox()])])],
    };

    rehypeCheckboxIndex()(tree);

    const list = tree.children[0] as Element;
    const items = list.children as Element[];

    // Both the checkbox and its parent li should have the index
    expect(items[0].properties?.dataCheckboxIndex).toBe(0);
    expect(items[1].properties?.dataCheckboxIndex).toBe(1);
    expect((items[0].children[0] as Element).properties?.dataCheckboxIndex).toBe(0);
    expect((items[1].children[0] as Element).properties?.dataCheckboxIndex).toBe(1);
  });

  it('indexes nested checkboxes in document order', () => {
    // Simulates:
    // - [ ] Task 1
    //   - [ ] Subtask 1.1
    //   - [ ] Subtask 1.2
    // - [ ] Task 2
    const tree: Root = {
      type: 'root',
      children: [
        ul([
          li([
            checkbox(), // Task 1 - index 0
            ul([
              li([checkbox()]), // Subtask 1.1 - index 1
              li([checkbox()]), // Subtask 1.2 - index 2
            ]),
          ]),
          li([checkbox()]), // Task 2 - index 3
        ]),
      ],
    };

    rehypeCheckboxIndex()(tree);

    const list = tree.children[0] as Element;
    const item1 = list.children[0] as Element;
    const item2 = list.children[1] as Element;
    const nestedList = item1.children[1] as Element;

    expect((item1.children[0] as Element).properties?.dataCheckboxIndex).toBe(0);
    expect(
      ((nestedList.children[0] as Element).children[0] as Element).properties?.dataCheckboxIndex,
    ).toBe(1);
    expect(
      ((nestedList.children[1] as Element).children[0] as Element).properties?.dataCheckboxIndex,
    ).toBe(2);
    expect((item2.children[0] as Element).properties?.dataCheckboxIndex).toBe(3);
  });

  it('ignores non-checkbox inputs', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'input',
          properties: { type: 'text' },
          children: [],
        },
        checkbox(),
        {
          type: 'element',
          tagName: 'input',
          properties: { type: 'radio' },
          children: [],
        },
      ],
    };

    rehypeCheckboxIndex()(tree);

    const [textInput, checkboxInput, radioInput] = tree.children as Element[];

    expect(textInput.properties?.dataCheckboxIndex).toBeUndefined();
    expect(checkboxInput.properties?.dataCheckboxIndex).toBe(0);
    expect(radioInput.properties?.dataCheckboxIndex).toBeUndefined();
  });

  it('ignores non-input elements', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [],
        },
        checkbox(),
        {
          type: 'element',
          tagName: 'span',
          properties: {},
          children: [],
        },
      ],
    };

    rehypeCheckboxIndex()(tree);

    const [div, input, span] = tree.children as Element[];

    expect(div.properties?.dataCheckboxIndex).toBeUndefined();
    expect(input.properties?.dataCheckboxIndex).toBe(0);
    expect(span.properties?.dataCheckboxIndex).toBeUndefined();
  });

  it('handles empty tree', () => {
    const tree: Root = {
      type: 'root',
      children: [],
    };

    // Should not throw
    expect(() => rehypeCheckboxIndex()(tree)).not.toThrow();
  });

  it('handles tree with no checkboxes', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: {},
          children: [],
        },
      ],
    };

    // Should not throw
    expect(() => rehypeCheckboxIndex()(tree)).not.toThrow();
  });

  it('preserves existing properties on checkbox', () => {
    const tree: Root = {
      type: 'root',
      children: [checkbox({ checked: true, disabled: true, className: 'my-checkbox' })],
    };

    rehypeCheckboxIndex()(tree);

    const input = tree.children[0] as Element;
    expect(input.properties?.dataCheckboxIndex).toBe(0);
    expect(input.properties?.checked).toBe(true);
    expect(input.properties?.disabled).toBe(true);
    expect(input.properties?.className).toBe('my-checkbox');
  });

  it('extracts checkbox ID from comment sibling', () => {
    const tree: Root = {
      type: 'root',
      children: [
        ul([
          {
            type: 'element',
            tagName: 'li',
            properties: {},
            children: [
              checkbox(),
              { type: 'text', value: ' ' },
              { type: 'comment', value: ' cb:abc123 ' },
            ],
          } as Element,
        ]),
      ],
    };

    let capturedIds: string[] = [];
    rehypeCheckboxIndex((ids) => {
      capturedIds = ids;
    })(tree);

    const list = tree.children[0] as Element;
    const item = list.children[0] as Element;
    const input = item.children[0] as Element;

    expect(input.properties?.dataCheckboxId).toBe('abc123');
    expect(capturedIds).toEqual(['abc123']);
  });

  it('passes empty string for checkbox without ID comment', () => {
    const tree: Root = {
      type: 'root',
      children: [checkbox()],
    };

    let capturedIds: string[] = [];
    rehypeCheckboxIndex((ids) => {
      capturedIds = ids;
    })(tree);

    expect(capturedIds).toEqual(['']);
  });
});
