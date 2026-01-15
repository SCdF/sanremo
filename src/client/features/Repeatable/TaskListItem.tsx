import { ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import React, { useEffect, useRef } from 'react';
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
 * Focus is managed on the ListItemButton (not the checkbox) to match
 * the original behavior where shift-tab moves between list items.
 */
export const TaskListItem = React.memo((props: Props) => {
  const { className, children, dataCheckboxIndex, ...rest } = props;
  // Also check for kebab-case version that react-markdown might pass
  const idx =
    dataCheckboxIndex ?? (props['data-checkbox-index' as keyof Props] as number | undefined);
  const { onChange, disabled, focusedIdx } = useCheckboxContext();
  const buttonRef = useRef<HTMLDivElement>(null);

  const isTaskListItem = idx !== undefined;
  const shouldFocus = isTaskListItem && focusedIdx === idx;

  // Focus the ListItemButton when this item should be focused
  useEffect(() => {
    if (shouldFocus && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [shouldFocus]);

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking directly on the checkbox (it handles itself)
    // or if clicking on a link or other interactive element
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'A' ||
      target.closest('input') ||
      target.closest('a')
    ) {
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
      <ListItemButton ref={buttonRef} onClick={handleClick} disabled={disabled}>
        <ListItemIcon>{checkbox}</ListItemIcon>
        <ListItemText>{remainingChildren}</ListItemText>
      </ListItemButton>
    </ListItem>
  );
});

TaskListItem.displayName = 'TaskListItem';
