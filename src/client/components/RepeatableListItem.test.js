import { render, screen } from '@testing-library/react';

import RepeatableListItem from './RepeatableListItem';

test('renders without crashing', async () => {
  // TODO: test for slug
  render(<RepeatableListItem checklistStub={{
    _id: 'abc',
    title: 'Checklist ListItem',
    updated: Date.now(),
  }}/>);

  expect(screen.getByText('Checklist ListItem')).toBeInTheDocument();
  expect(screen.getByText('less than a minute ago')).toBeInTheDocument();

  expect(screen.getByRole('link')).toHaveAttribute('href', '/checklist/abc');
});
