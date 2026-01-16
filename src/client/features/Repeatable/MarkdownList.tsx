import { List } from '@mui/material';
import React from 'react';

type Props = {
  node?: unknown;
  className?: string;
  children?: React.ReactNode;
};

/**
 * Custom ul component for react-markdown that renders lists using MUI List.
 * Provides consistent styling with the rest of the application.
 */
export const MarkdownList = React.memo((props: Props) => {
  const { className, children, ...rest } = props;

  return (
    <List disablePadding className={className} {...rest}>
      {children}
    </List>
  );
});

MarkdownList.displayName = 'MarkdownList';
