import React from 'react';
import { useCheckboxContext } from './CheckboxContext';

type Props = {
  node?: unknown;
  className?: string;
  children?: React.ReactNode;
  // Added by rehypeCheckboxIndex plugin for task list items
  dataCheckboxIndex?: number;
};

/**
 * Custom li component for react-markdown that makes task list items clickable.
 * When the li has a data-checkbox-index (added by rehypeCheckboxIndex plugin),
 * clicking anywhere on the item toggles the associated checkbox.
 */
export const TaskListItem = React.memo((props: Props) => {
  const { className, children, dataCheckboxIndex, ...rest } = props;
  // Also check for kebab-case version that react-markdown might pass
  const idx =
    dataCheckboxIndex ?? (props['data-checkbox-index' as keyof Props] as number | undefined);
  const { onChange, disabled } = useCheckboxContext();

  const isTaskListItem = idx !== undefined;

  const handleToggle = () => {
    if (onChange && !disabled && idx !== undefined) {
      onChange(idx);
    }
  };

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
    handleToggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't trigger if the event originated from an interactive element
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'A') {
      return;
    }
    // Toggle on Enter or Space
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  if (!isTaskListItem) {
    // Regular list item - render normally
    return (
      <li className={className} {...rest}>
        {children}
      </li>
    );
  }

  // Task list item - make it clickable
  return (
    <li
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={{ cursor: disabled ? 'default' : 'pointer' }}
      {...rest}
    >
      {children}
    </li>
  );
});

TaskListItem.displayName = 'TaskListItem';
