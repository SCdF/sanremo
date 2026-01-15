import { Checkbox } from '@mui/material';
import React from 'react';
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
 * Focus is NOT managed here - it's handled by TaskListItem on the ListItemButton
 * to match the original behavior where tab navigation moves between list items,
 * not between checkboxes.
 */
export const MarkdownTaskCheckbox = React.memo((props: Props) => {
  // react-markdown passes data attributes with their camelCase names
  const idx =
    props.dataCheckboxIndex ?? (props['data-checkbox-index' as keyof Props] as number | undefined);
  const { values, onChange, disabled } = useCheckboxContext();

  // Determine checkbox state
  const isValidCheckbox = idx !== undefined;
  const isChecked = isValidCheckbox ? (values[idx] ?? false) : false;

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
      checked={isChecked}
      onChange={handleChange}
      disabled={disabled}
      edge="start"
      tabIndex={-1}
      inputProps={{
        'aria-label': `Task ${idx + 1}`,
      }}
    />
  );
});

MarkdownTaskCheckbox.displayName = 'MarkdownTaskCheckbox';
