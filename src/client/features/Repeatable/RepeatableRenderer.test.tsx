import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '../../test-utils';
import RepeatableRenderer from './RepeatableRenderer';

const NOOP = () => {};

describe('Repeatable Renderer', () => {
  describe('basic rendering', () => {
    it('renders nothing at all', async () => {
      render(<RepeatableRenderer hasFocus={NOOP} markdown={''} values={[]} />);

      const list = await screen.findByRole('list');
      expect(list.innerText).toBeUndefined();
    });

    it('renders a block of markdown', async () => {
      render(<RepeatableRenderer hasFocus={NOOP} markdown={'hello there'} values={[]} />);

      await screen.findByText('hello there');
    });

    it('renders only markdown with no checkboxes', async () => {
      const markdown = `# Heading

This is a paragraph with **bold** and *italic* text.

- Regular list item 1
- Regular list item 2`;

      render(<RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={[]} />);

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
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={[]} onChange={NOOP} />,
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
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={[false, false]}
          onChange={NOOP}
        />,
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
        <RepeatableRenderer hasFocus={NOOP} markdown={markdown} values={[]} onChange={NOOP} />,
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
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={[false, false]}
          onChange={NOOP}
        />,
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
          values={[]}
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
          markdown={'- [ ] check me'}
          values={[true]}
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
          markdown={'- [ ] check me'}
          values={[]}
          onChange={onChange}
        />,
      );

      const cb: HTMLInputElement = (await screen.findByRole('checkbox')) as HTMLInputElement;

      fireEvent.click(cb);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(0);
    });

    it('onChange fires to the right checkbox when it is clicked', async () => {
      const onChange = vi.fn();
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] do not check me\n- [ ] check me instead'}
          values={[]}
          onChange={onChange}
        />,
      );

      const cbs: HTMLInputElement[] = (await screen.findAllByRole(
        'checkbox',
      )) as HTMLInputElement[];

      fireEvent.click(cbs[1]);

      expect(onChange).toBeCalledTimes(1);
      expect(onChange).toBeCalledWith(1);
    });

    it('renders multiple checkboxes with correct indices and labels', async () => {
      const onChange = vi.fn();
      const markdown = `- [ ] first
- [ ] second
- [ ] third
- [ ] fourth`;

      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={[true, false, true, false]}
          onChange={onChange}
        />,
      );

      const checkboxes = (await screen.findAllByRole('checkbox')) as HTMLInputElement[];
      expect(checkboxes).toHaveLength(4);

      // Verify checked states match values array
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

      // Click checkboxes and verify correct index is passed to onChange
      fireEvent.click(checkboxes[2]);
      expect(onChange).toBeCalledWith(2);

      fireEvent.click(checkboxes[0]);
      expect(onChange).toBeCalledWith(0);
    });

    it('renders checkbox with markdown formatting in label', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] check **bold** and *italic* text'}
          values={[]}
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
          values={[false]}
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
          values={[]} // Empty array, all should be unchecked
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
          markdown={'- [ ] one\n- [ ] two\n- [ ] three'}
          values={[true, false, true]}
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
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] x'}
          values={[false]}
          onChange={NOOP}
        />,
      );

      const checkbox = await screen.findByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      await screen.findByText('x');
    });
  });

  describe('focus behavior', () => {
    // Helper to get the actual input elements (MUI Checkbox wraps input in a span)
    const getCheckboxInputs = (container: HTMLElement) =>
      Array.from(container.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];

    it('initially focuses on first unchecked checkbox when takesFocus is true', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second'}
          values={[false, false]}
          onChange={NOOP}
          takesFocus={true}
        />,
      );

      await waitFor(() => {
        const inputs = getCheckboxInputs(container);
        // First checkbox input should have focus
        expect(inputs[0]).toHaveFocus();
      });
    });

    it('focuses on first unchecked checkbox after checked ones', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second\n- [ ] third'}
          values={[true, true, false]}
          onChange={NOOP}
          takesFocus={true}
        />,
      );

      await waitFor(() => {
        const inputs = getCheckboxInputs(container);
        // Third checkbox input (index 2) should have focus
        expect(inputs[2]).toHaveFocus();
      });
    });

    it('does not auto-focus when takesFocus is false', async () => {
      const { container } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second'}
          values={[false, false]}
          onChange={NOOP}
          takesFocus={false}
        />,
      );

      await screen.findAllByRole('checkbox');

      // No checkbox input should have focus
      const inputs = getCheckboxInputs(container);
      inputs.forEach((input) => {
        expect(input).not.toHaveFocus();
      });
    });

    it('advances focus after checking a checkbox', async () => {
      // Note: This component is controlled - clicking a checkbox calls onChange but
      // doesn't update the values prop. The parent is responsible for updating values.
      // We use rerender to simulate the parent updating state after onChange fires.
      const onChange = vi.fn();
      const { container, rerender } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second\n- [ ] third'}
          values={[false, false, false]}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Wait for initial focus on first checkbox
      await waitFor(() => {
        const inputs = getCheckboxInputs(container);
        expect(inputs[0]).toHaveFocus();
      });

      // Click the first checkbox - this calls onChange(0) but doesn't update values
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Simulate parent updating state by rerendering with new values
      rerender(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second\n- [ ] third'}
          values={[true, false, false]}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Focus should advance to second checkbox
      await waitFor(() => {
        const inputs = getCheckboxInputs(container);
        expect(inputs[1]).toHaveFocus();
      });
    });

    it('stays on same checkbox when unchecking', async () => {
      const onChange = vi.fn();
      const { container, rerender } = render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second'}
          values={[true, false]}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Initial focus should be on second (first unchecked)
      await waitFor(() => {
        const inputs = getCheckboxInputs(container);
        expect(inputs[1]).toHaveFocus();
      });

      // Click the first checkbox to uncheck it
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Rerender with updated values
      rerender(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'- [ ] first\n- [ ] second'}
          values={[false, false]}
          onChange={onChange}
          takesFocus={true}
        />,
      );

      // Focus should stay on first checkbox (the one we just unchecked)
      await waitFor(() => {
        const inputs = getCheckboxInputs(container);
        expect(inputs[0]).toHaveFocus();
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
          values={[false, false]}
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
          markdown={'- [ ] first\n- [ ] second'}
          values={[true, true]}
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

      const { rerender } = render(
        <RepeatableRenderer
          hasFocus={hasFocusCb}
          markdown={'- [ ] only one'}
          values={[false]}
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
          markdown={'- [ ] only one'}
          values={[true]}
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
          values={[false]}
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
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={markdown}
          values={[false, false]}
          onChange={NOOP}
        />,
      );

      const checkboxes = await screen.findAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('handles checkbox at very end of markdown without newline', async () => {
      render(
        <RepeatableRenderer
          hasFocus={NOOP}
          markdown={'Some text\n- [ ] final checkbox'}
          values={[false]}
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
          values={[false]}
          onChange={NOOP}
        />,
      );

      await screen.findByText('first checkbox');
      await screen.findByText('Some text after');
    });
  });
});
