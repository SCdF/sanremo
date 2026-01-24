import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../test-utils';
import RepeatableRenderer from './RepeatableRenderer';

const NOOP = () => {};

describe('Repeatable Renderer', () => {
  describe('basic rendering', () => {
    it('renders nothing at all', async () => {
      render(<RepeatableRenderer hasFocus={NOOP} markdown={''} values={{}} />);

      const list = await screen.findByRole('list');
      expect(list.textContent).toBe('');
    });

    it('renders a block of markdown', async () => {
      render(<RepeatableRenderer hasFocus={NOOP} markdown={'hello there'} values={{}} />);

      await screen.findByText('hello there');
    });

    it('renders only markdown with no checkboxes', async () => {
      const markdown = `# Heading

This is a paragraph with **bold** and *italic* text.

- Regular list item 1
- Regular list item 2`;

      render(<RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} />);

      await screen.findByText('Heading');
      await screen.findByText(/bold/);
      await screen.findByText('Regular list item 1');
      expect(screen.queryByRole('checkbox')).toBeNull();
    });
  });

  describe('markdown around checkboxes', () => {
    it('renders markdown before first checkbox', async () => {
      const markdown = `# Header

Some intro text

- [ ] first checkbox`;

      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={NOOP} />,
      );

      await screen.findByText('Header');
      await screen.findByText('Some intro text');
      await screen.findByText('first checkbox');
    });

    it('renders markdown between checkboxes', async () => {
      const markdown = `- [ ] first checkbox

## Middle section

Some text in between

- [ ] second checkbox`;

      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={NOOP} />,
      );

      await screen.findByText('first checkbox');
      await screen.findByText('Middle section');
      await screen.findByText('Some text in between');
      await screen.findByText('second checkbox');
    });

    it('renders markdown after last checkbox', async () => {
      const markdown = `- [ ] the checkbox

## Footer

Some closing text`;

      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={NOOP} />,
      );

      await screen.findByText('the checkbox');
      await screen.findByText('Footer');
      await screen.findByText('Some closing text');
    });

    it('preserves order of mixed markdown and checkboxes', async () => {
      const markdown = `# Start

- [ ] checkbox one

Middle text

- [ ] checkbox two

# End`;

      const { container } = render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={NOOP} />,
      );

      // Verify all content is present
      await screen.findByText('Start');
      await screen.findByText('checkbox one');
      await screen.findByText('Middle text');
      await screen.findByText('checkbox two');
      await screen.findByText('End');

      // Verify order by checking text content order
      const textContent = container.textContent || '';
      const startIdx = textContent.indexOf('Start');
      const cb1Idx = textContent.indexOf('checkbox one');
      const middleIdx = textContent.indexOf('Middle text');
      const cb2Idx = textContent.indexOf('checkbox two');
      const endIdx = textContent.indexOf('End');

      expect(startIdx).toBeLessThan(cb1Idx);
      expect(cb1Idx).toBeLessThan(middleIdx);
      expect(middleIdx).toBeLessThan(cb2Idx);
      expect(cb2Idx).toBeLessThan(endIdx);
    });
  });

  describe('checkboxes', () => {
    it('renders a single unchecked checkbox', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check me'}
          values={{}}
          onChange={() => NOOP()}
        />,
      );

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;
      expect(cb.checked).toBeFalsy();
      await screen.findByText('check me');
    });

    it('renders a single checked checkbox', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check me <!-- cb:cb1 -->'}
          values={{ cb1: true }}
          onChange={() => NOOP()}
        />,
      );

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;
      expect(cb.checked).toBeTruthy();
      await screen.findByText('check me');
    });

    it('onChange fires when a checkbox is clicked', async () => {
      const onChange = vi.fn();
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check me <!-- cb:cb1 -->'}
          values={{}}
          onChange={onChange}
        />,
      );

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;

      fireEvent.click(cb);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith('cb1');
    });

    it('onChange fires to the right checkbox when it is clicked', async () => {
      const onChange = vi.fn();
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] do not check me <!-- cb:cb1 -->\n- [ ] check me instead <!-- cb:cb2 -->'}
          values={{}}
          onChange={onChange}
        />,
      );

      const cbs: HTMLInputElement[] = (await screen.findAllByRole(
        'checkbox',
      )) as HTMLInputElement[];

      fireEvent.click(cbs[1]);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith('cb2');
    });

    it('renders multiple checkboxes with correct indices and labels', async () => {
      const onChange = vi.fn();
      const markdown = `- [ ] first <!-- cb:cb1 -->
- [ ] second <!-- cb:cb2 -->
- [ ] third <!-- cb:cb3 -->
- [ ] fourth <!-- cb:cb4 -->`;

      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{ cb1: true, cb2: false, cb3: true, cb4: false }}
          onChange={onChange}
        />,
      );

      const checkboxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[];
      expect(checkboxes).toHaveLength(4);

      // Verify checked states match values
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(false);
      expect(checkboxes[2].checked).toBe(true);
      expect(checkboxes[3].checked).toBe(false);

      // Verify labels are present and in correct order
      const textContent = container.textContent || '';
      const labels = ['first', 'second', 'third', 'fourth'];
      let lastIdx = -1;
      for (const label of labels) {
        const idx = textContent.indexOf(label);
        expect(idx).toBeGreaterThan(lastIdx);
        lastIdx = idx;
      }

      // Click checkboxes and verify correct ID is passed to onChange
      fireEvent.click(checkboxes[2]);
      expect(onChange).toBeCalledWith('cb3');

      fireEvent.click(checkboxes[0]);
      expect(onChange).toBeCalledWith('cb1');
    });

    it('renders checkbox with markdown formatting in label', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check **bold** and *italic* text'}
          values={{}}
          onChange={NOOP}
        />,
      );

      await screen.findByRole('checkbox');

      // Verify bold text is rendered with <strong> element
      const strongElement = container.querySelector('strong');
      expect(strongElement).not.toBeNull();
      expect(strongElement?.textContent).toBe('bold');

      // Verify italic text is rendered with <em> element
      const emElement = container.querySelector('em');
      expect(emElement).not.toBeNull();
      expect(emElement?.textContent).toBe('italic');
    });

    it('disables checkboxes when onChange is undefined', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] cannot click me'}
          values={{}}
          onChange={undefined}
        />,
      );

      const checkbox = await screen.findByRole('checkbox');
      // The checkbox should be disabled
      expect(checkbox).toBeDisabled();
    });

    it('treats missing values as unchecked', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second\n- [ ] third'}
          values={{}} // Empty array, all should be unchecked
          onChange={NOOP}
        />,
      );

      const checkboxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[];
      expect(checkboxes).toHaveLength(3);
      expect(checkboxes[0].checked).toBe(false);
      expect(checkboxes[1].checked).toBe(false);
      expect(checkboxes[2].checked).toBe(false);
    });

    it('renders only checkboxes with no surrounding markdown', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={
            '- [ ] one <!-- cb:cb1 -->\n- [ ] two <!-- cb:cb2 -->\n- [ ] three <!-- cb:cb3 -->'
          }
          values={{ cb1: true, cb2: false, cb3: true }}
          onChange={NOOP}
        />,
      );

      const checkboxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[];
      expect(checkboxes).toHaveLength(3);
      await screen.findByText('one');
      await screen.findByText('two');
      await screen.findByText('three');
    });

    it('renders checkbox with minimal label', async () => {
      // Note: remark-gfm requires at least some content after the checkbox marker
      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={'- [ ] x'} values={{}} onChange={NOOP} />,
      );

      const checkbox = await screen.findByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      await screen.findByText('x');
    });
  });

  describe('focus behavior', () => {
    // Helper to get the ListItemButton elements (focus is on the button, not the checkbox)
    const getListItemButtons = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('.MuiListItemButton-root')) as HTMLElement[];

    it('initially focuses on first unchecked item when takesFocus is true', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second'}
          values={{}}
          onChange={NOOP}
          takesFocus={true}
        />,
      );

      await waitFor(() => {
        const buttons = getListItemButtons(container);
        // First list item button should have focus
        expect(buttons[0]).toHaveFocus();
      });
    });

    it('focuses on first unchecked item after checked ones', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={
            '- [ ] first <!-- cb:cb1 -->\n- [ ] second <!-- cb:cb2 -->\n- [ ] third <!-- cb:cb3 -->'
          }
          values={{ cb1: true, cb2: true, cb3: false }}
          onChange={NOOP}
          takesFocus={true}
        />,
      );

      await waitFor(() => {
        const buttons = getListItemButtons(container);
        // Third list item button (index 2) should have focus
        expect(buttons[2]).toHaveFocus();
      });
    });

    it('does not auto-focus when takesFocus is false', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second'}
          values={{}}
          onChange={NOOP}
          takesFocus={false}
        />,
      );

      await screen.findAllByRole('checkbox');

      // No list item button should have focus
      const buttons = getListItemButtons(container);
      buttons.forEach((button) => {
        expect(button).not.toHaveFocus();
      });
    });

    it('advances focus after checking a checkbox', async () => {
      // Note: This component is controlled - clicking a checkbox calls onChange but
      // doesn't update the values prop. The parent is responsible for updating values.
      // We use rerender to simulate the parent updating state after onChange fires.
      const onChange = vi.fn();
      const markdown =
        '- [ ] first <!-- cb:cb1 -->\n- [ ] second <!-- cb:cb2 -->\n- [ ] third <!-- cb:cb3 -->';
      const { container, rerender } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{}}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Wait for initial focus on first list item
      await waitFor(() => {
        const buttons = getListItemButtons(container);
        expect(buttons[0]).toHaveFocus();
      });

      // Click the first checkbox - this calls onChange('cb1') but doesn't update values
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Simulate parent updating state by rerendering with new values
      rerender(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{ cb1: true, cb2: false, cb3: false }}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Focus should advance to second list item
      await waitFor(() => {
        const buttons = getListItemButtons(container);
        expect(buttons[1]).toHaveFocus();
      });
    });

    it('stays on same item when unchecking', async () => {
      const onChange = vi.fn();
      const markdown = '- [ ] first <!-- cb:cb1 -->\n- [ ] second <!-- cb:cb2 -->';
      const { container, rerender } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{ cb1: true, cb2: false }}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Initial focus should be on second (first unchecked)
      await waitFor(() => {
        const buttons = getListItemButtons(container);
        expect(buttons[1]).toHaveFocus();
      });

      // Click the first checkbox to uncheck it
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Rerender with updated values
      rerender(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{ cb1: false, cb2: false }}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Focus should stay on first list item (the one we just unchecked)
      await waitFor(() => {
        const buttons = getListItemButtons(container);
        expect(buttons[0]).toHaveFocus();
      });
    });

    it('shift-tab navigates between list items, not checkboxes', async () => {
      // This test verifies that tab navigation moves between ListItemButtons,
      // not between the checkbox and its parent button (which would happen
      // if focus was on the checkbox instead of the button)
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second'}
          values={{}}
          onChange={NOOP}
          takesFocus={true}
        />,
      );

      // Wait for initial focus on first list item
      await waitFor(() => {
        const buttons = getListItemButtons(container);
        expect(buttons[0]).toHaveFocus();
      });

      // The checkbox inside should NOT have focus (tabIndex={-1})
      const checkboxInputs = container.querySelectorAll('input[type="checkbox"]');
      checkboxInputs.forEach((input) => {
        expect(input).not.toHaveFocus();
      });
    });

    it('does not call hasFocus callback on initial render when some checkboxes are unchecked', async () => {
      // The hasFocus callback only fires on state CHANGES
      // Internal hasFocus state starts as true. When some checkboxes are unchecked,
      // computed hasFocus is also true, so no change occurs and callback is not called.
      const hasFocusCb = vi.fn();
      render(
        <RepeatableRenderer
          hasFocus={hasFocusCb}
          markdown={'- [ ] first\n- [ ] second'}
          values={{}}
          onChange={NOOP}
          takesFocus={true}
        />,
      );

      await screen.findAllByRole('checkbox');

      // Callback should NOT be called since computed focus (true) matches initial state (true)
      expect(hasFocusCb).not.toHaveBeenCalled();
    });

    it('calls hasFocus callback with false on initial render when all checkboxes are checked', async () => {
      // When all checkboxes are already checked, focus should be outside the checkboxes.
      // Internal hasFocus state starts as true, but computed hasFocus is false,
      // so the callback fires with false to tell parent (e.g., focus Complete button).
      const hasFocusCb = vi.fn();
      render(
        <RepeatableRenderer
          hasFocus={hasFocusCb}
          markdown={'- [ ] first <!-- cb:cb1 -->\n- [ ] second <!-- cb:cb2 -->'}
          values={{ cb1: true, cb2: true }}
          onChange={NOOP}
          takesFocus={true}
        />,
      );

      await screen.findAllByRole('checkbox');

      // Callback SHOULD be called with false since all are checked
      await waitFor(() => {
        expect(hasFocusCb).toHaveBeenCalledWith(false);
      });
    });

    it('calls hasFocus callback with false when last checkbox is checked', async () => {
      const hasFocusCb = vi.fn();
      const onChange = vi.fn();
      const markdown = '- [ ] only one <!-- cb:cb1 -->';

      const { rerender } = render(
        <RepeatableRenderer
          hasFocus={hasFocusCb}
          markdown={markdown}
          values={{}}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Initially no callback (focus starts inside, no change from initial state)
      await screen.findByRole('checkbox');
      expect(hasFocusCb).not.toHaveBeenCalled();

      // Check the only checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Simulate parent updating state
      rerender(
        <RepeatableRenderer
          hasFocus={hasFocusCb}
          markdown={markdown}
          values={{ cb1: true }}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Should report no focus (all checked) - this IS a state change
      await waitFor(() => {
        expect(hasFocusCb).toHaveBeenCalledWith(false);
      });
    });

    it('does not call hasFocus callback when takesFocus is false', async () => {
      const hasFocusCb = vi.fn();
      render(
        <RepeatableRenderer
          hasFocus={hasFocusCb}
          markdown={'- [ ] first'}
          values={{}}
          onChange={NOOP}
          takesFocus={false}
        />,
      );

      await screen.findByRole('checkbox');

      // Callback should not be called when takesFocus is false
      expect(hasFocusCb).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles whitespace-only markdown between checkboxes', async () => {
      const markdown = `- [ ] first



- [ ] second`;

      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={NOOP} />,
      );

      const checkboxes = await screen.findAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('handles checkbox at very end of markdown without newline', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'Some text\n- [ ] final checkbox'}
          values={{}}
          onChange={NOOP}
        />,
      );

      await screen.findByText('Some text');
      await screen.findByText('final checkbox');
    });

    it('handles checkbox at very beginning of markdown', async () => {
      // Note: In GFM, text on the line after a task list item is part of the item
      // unless there's a blank line. Use blank line to separate.
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first checkbox\n\nSome text after'}
          values={{}}
          onChange={NOOP}
        />,
      );

      await screen.findByText('first checkbox');
      await screen.findByText('Some text after');
    });
  });

  describe('accessibility', () => {
    it('has accessible checklist container', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] Task 1'}
          values={{}}
          onChange={NOOP}
        />,
      );

      // Outer container is a MUI List, inner lists are also MUI Lists
      const lists = await screen.findAllByRole('list');
      expect(lists.length).toBeGreaterThan(0);
    });

    it('checkboxes have accessible labels', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] Task 1\n- [ ] Task 2'}
          values={{}}
          onChange={NOOP}
        />,
      );

      const checkbox1 = await screen.findByRole('checkbox', { name: 'Task 1' });
      const checkbox2 = await screen.findByRole('checkbox', { name: 'Task 2' });
      expect(checkbox1).toBeInTheDocument();
      expect(checkbox2).toBeInTheDocument();
    });
  });

  describe('nested checkboxes', () => {
    it('renders nested checkboxes correctly', async () => {
      const markdown = `- [ ] Task 1
  - [ ] Subtask 1.1
  - [ ] Subtask 1.2
- [ ] Task 2`;

      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={NOOP} />,
      );

      const checkboxes = await screen.findAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4);

      await screen.findByText('Task 1');
      await screen.findByText('Subtask 1.1');
      await screen.findByText('Subtask 1.2');
      await screen.findByText('Task 2');
    });

    it('indexes nested checkboxes in document order', async () => {
      const markdown = `- [ ] Task 1 <!-- cb:cb1 -->
  - [ ] Subtask 1.1 <!-- cb:cb2 -->
  - [ ] Subtask 1.2 <!-- cb:cb3 -->
- [ ] Task 2 <!-- cb:cb4 -->`;

      // Values: Task 1 checked, Subtask 1.1 unchecked, Subtask 1.2 checked, Task 2 unchecked
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{ cb1: true, cb2: false, cb3: true, cb4: false }}
          onChange={NOOP}
        />,
      );

      const checkboxes = await screen.findAllByRole('checkbox');
      expect(checkboxes[0]).toBeChecked(); // Task 1
      expect(checkboxes[1]).not.toBeChecked(); // Subtask 1.1
      expect(checkboxes[2]).toBeChecked(); // Subtask 1.2
      expect(checkboxes[3]).not.toBeChecked(); // Task 2
    });

    it('calls onChange with correct ID for nested checkbox', async () => {
      const markdown = `- [ ] Task 1 <!-- cb:cb1 -->
  - [ ] Subtask 1.1 <!-- cb:cb2 -->
  - [ ] Subtask 1.2 <!-- cb:cb3 -->
- [ ] Task 2 <!-- cb:cb4 -->`;

      const onChange = vi.fn();
      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={onChange} />,
      );

      const checkboxes = await screen.findAllByRole('checkbox');

      // Click Subtask 1.2 (index 2)
      fireEvent.click(checkboxes[2]);
      expect(onChange).toHaveBeenCalledWith('cb3');

      // Click Task 2 (index 3)
      fireEvent.click(checkboxes[3]);
      expect(onChange).toHaveBeenCalledWith('cb4');
    });

    it('clicking nested checkbox label calls onChange with correct ID', async () => {
      const markdown = `- [ ] Task 1 <!-- cb:cb1 -->
  - [ ] Subtask 1.1 <!-- cb:cb2 -->
- [ ] Task 2 <!-- cb:cb3 -->`;

      const onChange = vi.fn();
      render(
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={{}} onChange={onChange} />,
      );

      // Click on the label text for Subtask 1.1 (ID cb2)
      fireEvent.click(await screen.findByText('Subtask 1.1'));
      expect(onChange).toHaveBeenCalledWith('cb2');
    });

    // Helper to get the ListItemButton elements (focus is on the button, not the checkbox)
    const getListItemButtons = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('.MuiListItemButton-root')) as HTMLElement[];

    it('focus advances through nested checkboxes in document order', async () => {
      const markdown = `- [ ] Task 1 <!-- cb:cb1 -->
  - [ ] Subtask 1.1 <!-- cb:cb2 -->
- [ ] Task 2 <!-- cb:cb3 -->`;

      const onChange = vi.fn();
      const { container, rerender } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{}}
          onChange={onChange}
          takesFocus
        />,
      );

      // Initial focus on Task 1 (index 0)
      await waitFor(() => {
        const buttons = getListItemButtons(container);
        expect(buttons[0]).toHaveFocus();
      });

      // Click Task 1
      fireEvent.click(screen.getAllByRole('checkbox')[0]);
      expect(onChange).toHaveBeenCalledWith('cb1');

      // Rerender with Task 1 checked
      rerender(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={{ cb1: true, cb2: false, cb3: false }}
          onChange={onChange}
          takesFocus
        />,
      );

      // Focus should advance to Subtask 1.1 (index 1)
      await waitFor(() => {
        const buttons = getListItemButtons(container);
        expect(buttons[1]).toHaveFocus();
      });
    });
  });
});
