import { Checkbox } from '@mui/material';
import React, { useEffect, useRef } from 'react';
import { useCheckboxContext } from './CheckboxContext';

type Props = {
  node?: unknown;
  checked?: boolean;
  disabled?: boolean;
  type?: string;
  // Added by rehypeCheckboxIndex plugin
  dataCheckboxIndex?: number;
};

/**
 * Custom input component for react-markdown that renders task list checkboxes.
 * Uses CheckboxContext to get state and callbacks.
 *
 * Renders as inline elements to avoid <div> inside <p> hydration errors.
 */
export const MarkdownTaskCheckbox = React.memo((props: Props) => {
  // react-markdown passes data attributes with their camelCase names
  const idx =
    props.dataCheckboxIndex ?? (props['data-checkbox-index' as keyof Props] as number | undefined);
  const { values, onChange, disabled, focusedIdx } = useCheckboxContext();
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if this checkbox should be focused
  const isValidCheckbox = idx !== undefined;
  const isChecked = isValidCheckbox ? (values[idx] ?? false) : false;
  const isFocused = isValidCheckbox ? focusedIdx === idx : false;

  // Focus management - must be called before any early returns
  useEffect(() => {
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  // Only handle checkbox inputs with an index from our rehype plugin
  if (!isValidCheckbox) {
    // Fallback: render a standard input for non-task-list checkboxes
    return <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />;
  }

  const handleChange = () => {
    if (onChange && !disabled) {
      onChange(idx);
    }
  };

  return (
    <Checkbox
      inputRef={inputRef}
      checked={isChecked}
      onChange={handleChange}
      disabled={disabled}
      size="small"
      sx={{ p: 0, mr: 1 }}
      inputProps={{
        'aria-label': `Task ${idx + 1}`,
      }}
    />
  );
});

MarkdownTaskCheckbox.displayName = 'MarkdownTaskCheckbox';
