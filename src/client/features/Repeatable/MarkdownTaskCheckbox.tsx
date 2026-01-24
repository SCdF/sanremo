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
  dataCheckboxId?: string;
};

/**
 * Custom input component for react-markdown that renders task list checkboxes.
 * Uses CheckboxContext to get state and callbacks.
 *
 * Click handling is done by the parent TaskListItem's ListItemButton,
 * not here on the checkbox itself. This matches the original behavior
 * where clicking anywhere on the row toggles the checkbox.
 */
export const MarkdownTaskCheckbox = React.memo((props: Props) => {
  // react-markdown passes data attributes with their camelCase names
  const idx =
    props.dataCheckboxIndex ?? (props['data-checkbox-index' as keyof Props] as number | undefined);
  const checkboxId =
    props.dataCheckboxId ?? (props['data-checkbox-id' as keyof Props] as string | undefined);
  const { values, disabled, getCheckboxId } = useCheckboxContext();

  if (idx === undefined) {
    // Fallback: render a standard input for non-task-list checkboxes
    return <input {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />;
  }

  // Determine checkbox state - use the ID if available, fall back to getting ID from index
  const id = checkboxId ?? getCheckboxId(idx);
  const isChecked = id ? (values[id] ?? false) : false;

  return (
    <Checkbox
      checked={isChecked}
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
