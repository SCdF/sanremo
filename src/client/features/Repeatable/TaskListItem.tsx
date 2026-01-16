import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React, { useCallback } from 'react';
import { useCheckboxContext } from './CheckboxContext';

type Props = {
  node?: unknown;
  className?: string;
  children?: React.ReactNode;
  // Added by rehypeCheckboxIndex plugin for task list items
  dataCheckboxIndex?: number;
};

/**
 * Extracts checkbox element from children and returns [checkbox, remainingChildren].
 * In task list items from remark-gfm, the checkbox is always the first child.
 * This allows us to restructure the layout to match the original MUI styling.
 */
function extractCheckbox(children: React.ReactNode): [React.ReactNode, React.ReactNode[]] {
  const childArray = React.Children.toArray(children);

  // The checkbox (rendered by MarkdownTaskCheckbox) is always the first child
  const checkbox = childArray[0] ?? null;
  const remaining = childArray.slice(1);

  return [checkbox, remaining];
}

/**
 * Custom li component for react-markdown that renders task list items
 * using MUI components matching the original styling.
 *
 * Focus is managed imperatively via registerButton - when a button registers,
 * the parent checks if it should be focused and focuses it directly.
 * This avoids re-renders when focus changes.
 */
export const TaskListItem = React.memo((props: Props) => {
  const { className, children, dataCheckboxIndex, ...rest } = props;
  // Also check for kebab-case version that react-markdown might pass
  const idx =
    dataCheckboxIndex ?? (props['data-checkbox-index' as keyof Props] as number | undefined);
  const { onChange, disabled, registerButton } = useCheckboxContext();

  const isTaskListItem = idx !== undefined;

  // Register the button ref with the parent for focus management
  const buttonRefCallback = useCallback(
    (element: HTMLDivElement | null) => {
      if (idx !== undefined) {
        registerButton(idx, element);
      }
    },
    [idx, registerButton],
  );

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a link or other interactive element
    const target = e.target as HTMLElement;
    if (target.tagName === 'A' || target.closest('a')) {
      return;
    }

    if (onChange && !disabled && idx !== undefined) {
      onChange(idx);
    }
  };

  if (!isTaskListItem) {
    // Regular list item - use MUI ListItem
    return (
      <ListItem className={className} {...rest}>
        <ListItemText>{children}</ListItemText>
      </ListItem>
    );
  }

  // Task list item - extract checkbox and restructure to match original styling
  const [checkbox, remainingChildren] = extractCheckbox(children);

  return (
    <ListItem className={className} {...rest}>
      <ListItemButton ref={buttonRefCallback} onClick={handleClick} disabled={disabled}>
        <ListItemIcon>{checkbox}</ListItemIcon>
        <ListItemText>{remainingChildren}</ListItemText>
      </ListItemButton>
    </ListItem>
  );
});

TaskListItem.displayName = 'TaskListItem';
