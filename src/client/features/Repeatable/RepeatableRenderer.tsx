import { List } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { PluggableList } from 'unified';
import { debugClient } from '../../globals';
import { CheckboxContext } from './CheckboxContext';
import { MarkdownList } from './MarkdownList';
import { MarkdownTaskCheckbox } from './MarkdownTaskCheckbox';
import { rehypeCheckboxIndex } from './rehypeCheckboxIndex';
import { TaskListItem } from './TaskListItem';

const debug = debugClient('repeatable', 'render');
const debugFocus = debugClient('repeatable', 'focus');

export type RepeatableProps = {
  markdown: string;
  values: boolean[];
  onChange?: (idx: number) => void;
  /** whether the auto focus is inside the markdown document. Will never be called if takesFocus is false */
  hasFocus?: (hasFocus: boolean) => void;
  /** whether we are in focus grabbing mode. Default false */
  takesFocus?: boolean;
};

/**
 * Calculate the initial focus index based on the values array.
 * Focus goes to the first unchecked checkbox, or past the end if all are checked.
 */
function calculateInitialFocusIndex(values: boolean[]): number {
  // Find the last checked checkbox and focus on the one after it
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i]) {
      return i + 1;
    }
  }
  return 0;
}

function RepeatableRenderer(props: RepeatableProps) {
  const { markdown, values, onChange: changeValue, hasFocus: hasFocusCb, takesFocus } = props;

  debug('markdown render start');

  // Ref-based focus management - stores button elements by index
  const buttonRefs = useRef<Map<number, HTMLElement>>(new Map());
  // Track whether we've initialized focus (to avoid re-initializing on every render)
  const hasInitializedFocus = useRef(false);
  // Track which index should be focused (stored in ref to avoid re-renders)
  const focusedIdxRef = useRef<number | null>(null);

  // Caching this value internally to detect changes
  const [hasFocus, setHasFocus] = useState(true);

  // Checkbox count is determined by the rehype plugin during rendering.
  // We use a ref to capture the count synchronously during the render phase,
  // avoiding the "setState during render" warning.
  const checkboxCountRef = useRef(0);

  // Memoize the rehype plugins array to maintain referential stability
  const rehypePlugins: PluggableList = useMemo(
    () => [
      [
        rehypeCheckboxIndex,
        (count: number) => {
          checkboxCountRef.current = count;
        },
      ],
    ],
    [],
  );

  // Initialize focus index on mount or when takesFocus becomes true
  // Using a ref to track initialization so we don't need values in the dep array
  if (takesFocus && !hasInitializedFocus.current) {
    hasInitializedFocus.current = true;
    const initialIdx = calculateInitialFocusIndex(values);
    focusedIdxRef.current = initialIdx;
  } else if (!takesFocus && hasInitializedFocus.current) {
    hasInitializedFocus.current = false;
    focusedIdxRef.current = null;
  }

  // Focus the initial button after mount and notify parent if focus is outside checkboxes
  useEffect(() => {
    if (takesFocus && focusedIdxRef.current !== null) {
      debugFocus(
        'useEffect: focusedIdxRef=%d, activeElement=%o',
        focusedIdxRef.current,
        document.activeElement,
      );
      const button = buttonRefs.current.get(focusedIdxRef.current);
      if (button) {
        debugFocus('useEffect: focusing button %d', focusedIdxRef.current);
        button.focus();
        debugFocus('useEffect: after focus, activeElement=%o', document.activeElement);
      }

      // Notify parent when initial focus is beyond the last checkbox (all checked)
      if (hasFocusCb) {
        const maxIdx = checkboxCountRef.current;
        const newHasFocus = focusedIdxRef.current < maxIdx;
        if (newHasFocus !== hasFocus) {
          hasFocusCb(newHasFocus);
          setHasFocus(newHasFocus);
        }
      }
    }
  }, [takesFocus, hasFocusCb, hasFocus]);

  // Register button refs from TaskListItem components
  const registerButton = useCallback((idx: number, element: HTMLElement | null) => {
    if (element) {
      debugFocus(
        'registerButton: idx=%d, focusedIdxRef=%d, activeElement=%o',
        idx,
        focusedIdxRef.current,
        document.activeElement,
      );
      buttonRefs.current.set(idx, element);
      // If this button should be focused, focus it now
      if (focusedIdxRef.current === idx) {
        debugFocus('registerButton: focusing button %d', idx);
        element.focus();
        debugFocus('registerButton: after focus, activeElement=%o', document.activeElement);
      }
    } else {
      debugFocus('registerButton: unregistering idx=%d', idx);
      buttonRefs.current.delete(idx);
    }
  }, []);

  // Focus a specific index imperatively (called after checkbox toggle)
  const focusIndex = useCallback((idx: number) => {
    debugFocus('focusIndex: idx=%d, activeElement=%o', idx, document.activeElement);
    focusedIdxRef.current = idx;
    const button = buttonRefs.current.get(idx);
    if (button) {
      debugFocus('focusIndex: focusing button %d', idx);
      button.focus();
      debugFocus('focusIndex: after focus, activeElement=%o', document.activeElement);
    } else {
      debugFocus('focusIndex: no button found for idx=%d', idx);
    }
  }, []);

  const handleChange = useCallback(
    (idx: number) => {
      if (changeValue) {
        changeValue(idx);
        // Advance focus if checking (value was false, now true)
        // Stay on same checkbox if unchecking (value was true, now false)
        const wasChecked = values[idx];
        const nextFocusIdx = wasChecked ? idx : idx + 1;

        if (takesFocus) {
          focusIndex(nextFocusIdx);

          // Notify parent when focus exits checkboxes
          if (hasFocusCb) {
            const maxIdx = checkboxCountRef.current;
            const newHasFocus = nextFocusIdx < maxIdx;
            if (newHasFocus !== hasFocus) {
              hasFocusCb(newHasFocus);
              setHasFocus(newHasFocus);
            }
          }
        }
      }
    },
    [changeValue, values, takesFocus, focusIndex, hasFocusCb, hasFocus],
  );

  // Context value for checkbox components - no focusedIdx, uses registerButton instead
  const contextValue = useMemo(
    () => ({
      values,
      onChange: handleChange,
      disabled: !changeValue,
      registerButton,
    }),
    [values, handleChange, changeValue, registerButton],
  );

  const renderedMarkdown = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={rehypePlugins}
      components={{
        // Map markdown elements to MUI components
        ul: MarkdownList,
        li: TaskListItem,
        input: MarkdownTaskCheckbox,
      }}
    >
      {markdown || ''}
    </ReactMarkdown>
  );

  debug('markdown render end');

  return (
    <CheckboxContext.Provider value={contextValue}>
      <List disablePadding sx={{ '& > *': { px: 2 } }}>
        {renderedMarkdown}
      </List>
    </CheckboxContext.Provider>
  );
}

export default RepeatableRenderer;
