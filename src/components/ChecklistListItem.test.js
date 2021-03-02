import { render, screen } from '@testing-library/react';

import ChecklistListItem from './ChecklistListItem';

test('renders without crashing', async () => {
  render(<ChecklistListItem checklistStub={{
    _id: 'abc',
    title: 'Checklist ListItem',
    updated: Date.now()
  }}/>);

  expect(screen.getByText('Checklist ListItem')).toBeInTheDocument();
  expect(screen.getByText('less than a minute ago')).toBeInTheDocument();

  expect(screen.getByRole('link')).toHaveAttribute('href', '/checklist/abc');
});
