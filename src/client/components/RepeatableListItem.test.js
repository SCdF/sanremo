import { render, screen } from '@testing-library/react';

import RepeatableListItem from './RepeatableListItem';

test('renders without crashing', async () => {
  const params = {
    _id: 'abc',
    timestamp: Date.now(),
    slug: 'http://example.com',
    template: {
      title: 'Checklist ListItem',
      slug: {
        type: 'url',
        label: 'For'
      }
    }
  };

  render(<RepeatableListItem {...params} />);

  expect(screen.getByText('Checklist ListItem')).toBeInTheDocument();
  expect(screen.getByText('less than a minute ago')).toBeInTheDocument();

  expect(screen.getByRole('link')).toHaveAttribute('href', '/repeatable/abc');

  // TODO: test for slug
});
