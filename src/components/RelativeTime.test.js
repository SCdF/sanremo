import { render, screen, waitFor } from '@testing-library/react';

import RelativeTime from './RelativeTime';

test('renders without crashing', async () => {
  render(<RelativeTime date={Date.now()}/>);

  expect(screen.getByText('less than a minute ago')).toBeInTheDocument();
});

test('updates as now changes', async () => {
  render(<RelativeTime date={Date.now() - (1000 * 29)} />);

  expect(screen.getByText('less than a minute ago')).toBeInTheDocument();

  await waitFor(() => screen.getByText('1 minute ago'), {timeout: 2000});

  expect(screen.getByText('1 minute ago')).toBeInTheDocument();
});
