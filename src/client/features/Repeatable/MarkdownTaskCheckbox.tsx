import { Checkbox, ListItemButton, ListItemIcon } from '@mui/material';
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
 */
export const MarkdownTaskCheckbox = React.memo((props: Props) => {
  const { dataCheckboxIndex: idx, type } = props;
  const { values, onChange, disabled, focusedIdx } = useCheckboxContext();
  const buttonRef = useRef<HTMLDivElement>(null);

  // Determine if this checkbox should be focused
  const isValidCheckbox = type === 'checkbox' && idx !== undefined;
  const isChecked = isValidCheckbox ? (values[idx] ?? false) : false;
  const isFocused = isValidCheckbox ? focusedIdx === idx : false;

  // Focus management - must be called before any early returns
  useEffect(() => {
    if (isFocused && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [isFocused]);

  // Only handle checkbox inputs with an index from our rehype plugin
  if (!isValidCheckbox) {
    return null;
  }

  const handleClick = () => {
    if (onChange && !disabled) {
      onChange(idx);
    }
  };

  return (
    <ListItemButton
      ref={buttonRef}
      onClick={handleClick}
      disabled={disabled}
      disableGutters
      sx={{ p: 0, minHeight: 'auto', display: 'inline-flex', width: 'auto' }}
    >
      <ListItemIcon sx={{ minWidth: 'auto' }}>
        <Checkbox
          checked={isChecked}
          edge="start"
          tabIndex={-1}
          disableRipple
          inputProps={{
            'aria-label': `Task ${idx + 1}`,
          }}
        />
      </ListItemIcon>
    </ListItemButton>
  );
});

MarkdownTaskCheckbox.displayName = 'MarkdownTaskCheckbox';
