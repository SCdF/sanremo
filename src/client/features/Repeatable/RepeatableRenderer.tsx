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

  // Used for auto-focus (hammer spacebar to tick everything and close)
  const [nextIdx, setNextIdx] = useState(() => calculateInitialFocusIndex(values));

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

  const handleChange = useCallback(
    (idx: number) => {
      if (changeValue) {
        changeValue(idx);
        // Advance focus if checking (value was false, now true)
        // Stay on same checkbox if unchecking (value was true, now false)
        const wasChecked = values[idx];
        setNextIdx(wasChecked ? idx : idx + 1);
      }
    },
    [changeValue, values],
  );

  // Notify parent when focus exits checkboxes
  // Uses checkboxCountRef directly since it's updated during ReactMarkdown render
  useEffect(() => {
    const maxIdx = checkboxCountRef.current;
    if (takesFocus && hasFocusCb && nextIdx !== undefined && maxIdx !== undefined) {
      const newHasFocus = nextIdx < maxIdx;
      if (newHasFocus !== hasFocus) {
        hasFocusCb(newHasFocus);
        setHasFocus(newHasFocus);
      }
    }
  }, [hasFocus, hasFocusCb, nextIdx, takesFocus]);

  // Context value for checkbox components
  const contextValue = useMemo(
    () => ({
      values,
      onChange: handleChange,
      disabled: !changeValue,
      focusedIdx: takesFocus ? nextIdx : null,
    }),
    [values, handleChange, changeValue, takesFocus, nextIdx],
  );

  debug('markdown render end');

  return (
    <CheckboxContext.Provider value={contextValue}>
      <List disablePadding sx={{ '& > *': { px: 2 } }}>
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
      </List>
    </CheckboxContext.Provider>
  );
}

export default RepeatableRenderer;
